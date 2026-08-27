"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { sendReplyEmail } from "@/lib/mail/smtp";
import { deleteAttachmentFile, readAttachmentFile } from "@/lib/uploads";
import {
  createTicketSchema,
  addReplySchema,
  updateTicketSchema,
} from "@/lib/validators/ticket";
import type { Priority, TicketStatus } from "@prisma/client";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export async function createTicket(input: {
  subject: string;
  description: string;
  studentEmail: string;
  studentName?: string;
  priority: Priority;
  categoryId?: string;
}): Promise<ActionResult<{ ticketId: string; number: number }>> {
  await requireSession();

  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { subject, description, studentEmail, studentName, priority, categoryId } = parsed.data;

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      description,
      studentEmail: studentEmail.toLowerCase().trim(),
      studentName: studentName || null,
      priority,
      categoryId: categoryId || null,
      source: "MANUAL",
      status: "OPEN",
    },
  });

  revalidatePath("/tickets");
  revalidatePath("/");

  return { ok: true, data: { ticketId: ticket.id, number: ticket.number } };
}

export async function updateTicket(input: {
  ticketId: string;
  status?: TicketStatus;
  priority?: Priority;
  categoryId?: string | null;
}): Promise<ActionResult> {
  await requireSession();

  const parsed = updateTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { ticketId, status, priority, categoryId } = parsed.data;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(status ? { status, closedAt: status === "CLOSED" ? new Date() : null } : {}),
      ...(priority ? { priority } : {}),
      ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
    },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/");

  return { ok: true, data: undefined };
}

export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    return { ok: false, error: "Solo un administrador puede eliminar tickets." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      attachments: { select: { storedFilename: true } },
      replies: {
        select: { attachments: { select: { storedFilename: true } } },
      },
    },
  });

  if (!ticket) return { ok: false, error: "Ticket no encontrado." };

  const storedFilenames = [
    ...ticket.attachments.map((attachment) => attachment.storedFilename),
    ...ticket.replies.flatMap((reply) =>
      reply.attachments.map((attachment) => attachment.storedFilename)
    ),
  ];

  await prisma.ticket.delete({ where: { id: ticket.id } });
  await Promise.all(storedFilenames.map((storedFilename) => deleteAttachmentFile(storedFilename)));

  revalidatePath("/tickets");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function markTicketMessagesRead(
  ticketId: string
): Promise<ActionResult<{ marked: number }>> {
  await requireSession();

  const result = await prisma.ticketReply.updateMany({
    where: { ticketId, isFromStudent: true, readAt: null },
    data: { readAt: new Date() },
  });

  if (result.count > 0) {
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
  }

  return { ok: true, data: { marked: result.count } };
}

export async function addTicketReply(input: {
  ticketId: string;
  body: string;
  isInternalNote: boolean;
}): Promise<ActionResult<{ replyId: string }>> {
  const session = await requireSession();

  const parsed = addReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { ticketId, body, isInternalNote } = parsed.data;

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId,
      body,
      isInternalNote,
      authorId: session.user.id,
    },
  });

  // Toda respuesta pública del agente deja el ticket listo para seguimiento.
  if (!isInternalNote) {
    await prisma.ticket.updateMany({
      where: { id: ticketId, status: { in: ["OPEN", "CLOSED"] } },
      data: { status: "IN_PROGRESS", closedAt: null },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");

  return { ok: true, data: { replyId: reply.id } };
}

export async function sendTicketReplyEmail(replyId: string): Promise<ActionResult> {
  await requireSession();

  const [reply, mailbox] = await Promise.all([
    prisma.ticketReply.findUnique({
      where: { id: replyId },
      include: {
        attachments: true,
        ticket: {
          include: {
            incomingEmails: {
              where: { messageId: { not: null } },
              orderBy: { receivedAt: "desc" },
              take: 1,
              select: { messageId: true },
            },
          },
        },
      },
    }),
    prisma.mailboxConfig.findFirst({ where: { enabled: true } }),
  ]);

  if (!reply) return { ok: false, error: "Respuesta no encontrada." };
  if (reply.isInternalNote) {
    return { ok: false, error: "Las notas internas no se envían por correo." };
  }
  if (reply.sentViaEmail) {
    return { ok: true, data: undefined };
  }
  if (!mailbox) {
    return { ok: false, error: "Configura y activa el buzón SMTP antes de enviar." };
  }

  try {
    const attachments = await Promise.all(
      reply.attachments.map(async (attachment) => ({
        filename: attachment.filename,
        content: await readAttachmentFile(attachment.storedFilename),
        contentType: attachment.mimeType,
      }))
    );

    const outgoingMessageId = await sendReplyEmail(
      {
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
        smtpUser: mailbox.smtpUser,
        smtpPassword: decryptSecret(mailbox.smtpPasswordEncrypted),
        smtpUseTls: mailbox.smtpUseTls,
        fromAddress: mailbox.fromAddress,
      },
      {
        to: reply.ticket.studentEmail,
        subject: reply.ticket.subject.toLowerCase().startsWith("re:")
          ? reply.ticket.subject
          : `Re: ${reply.ticket.subject}`,
        text: reply.body,
        replyToMessageId: reply.ticket.incomingEmails[0]?.messageId ?? undefined,
        attachments,
      }
    );

    await prisma.ticketReply.update({
      where: { id: reply.id },
      data: { sentViaEmail: true, sentAt: new Date(), outgoingMessageId },
    });
  } catch (error) {
    return {
      ok: false,
      error: `No se pudo enviar el correo: ${error instanceof Error ? error.message : "error desconocido"}`,
    };
  }

  revalidatePath(`/tickets/${reply.ticketId}`);
  return { ok: true, data: undefined };
}
