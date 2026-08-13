"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { sendReplyEmail } from "@/lib/mail/smtp";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export async function convertEmailToTicket(input: {
  incomingEmailId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  categoryId?: string | null;
}): Promise<ActionResult<{ ticketId: string; number: number }>> {
  await requireSession();

  const email = await prisma.incomingEmail.findUnique({ where: { id: input.incomingEmailId } });
  if (!email) {
    return { ok: false, error: "Correo no encontrado." };
  }
  if (email.status !== "PENDING") {
    return { ok: false, error: "Este correo ya fue procesado." };
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        subject: email.subject || "(sin asunto)",
        description: email.bodyText,
        studentEmail: email.fromEmail,
        studentName: email.fromName,
        priority: input.priority,
        categoryId: input.categoryId || null,
        source: "EMAIL",
        status: "OPEN",
      },
    });

    await tx.incomingEmail.update({
      where: { id: email.id },
      data: { status: "CONVERTED", ticketId: created.id },
    });

    await tx.attachment.updateMany({
      where: { incomingEmailId: email.id },
      data: { ticketId: created.id },
    });

    return created;
  });

  revalidatePath("/inbox");
  revalidatePath("/tickets");
  revalidatePath("/");

  return { ok: true, data: { ticketId: ticket.id, number: ticket.number } };
}

export async function markEmailReplied(incomingEmailId: string): Promise<ActionResult> {
  await requireSession();

  await prisma.incomingEmail.update({
    where: { id: incomingEmailId },
    data: { status: "REPLIED" },
  });

  revalidatePath("/inbox");
  return { ok: true, data: undefined };
}

export async function replyToIncomingEmail(input: {
  incomingEmailId: string;
  body: string;
}): Promise<ActionResult> {
  await requireSession();

  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Escribe una respuesta antes de enviarla." };
  }

  const [email, mailbox] = await Promise.all([
    prisma.incomingEmail.findUnique({ where: { id: input.incomingEmailId } }),
    prisma.mailboxConfig.findFirst({ where: { enabled: true } }),
  ]);

  if (!email) return { ok: false, error: "Correo no encontrado." };
  if (email.status !== "PENDING") return { ok: false, error: "Este correo ya fue procesado." };
  if (!mailbox) {
    return { ok: false, error: "Configura y activa el buzón SMTP desde Ajustes antes de responder." };
  }

  try {
    await sendReplyEmail(
      {
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
        smtpUser: mailbox.smtpUser,
        smtpPassword: decryptSecret(mailbox.smtpPasswordEncrypted),
        smtpUseTls: mailbox.smtpUseTls,
        fromAddress: mailbox.fromAddress,
      },
      {
        to: email.fromEmail,
        subject: email.subject.toLowerCase().startsWith("re:")
          ? email.subject
          : `Re: ${email.subject || "Consulta de soporte"}`,
        text: body,
      }
    );
  } catch (error) {
    return {
      ok: false,
      error: `No se pudo enviar la respuesta: ${error instanceof Error ? error.message : "error desconocido"}`,
    };
  }

  await prisma.incomingEmail.updateMany({
    where: { id: email.id, status: "PENDING" },
    data: { status: "REPLIED" },
  });

  revalidatePath("/inbox");
  return { ok: true, data: undefined };
}

export async function discardEmail(incomingEmailId: string): Promise<ActionResult> {
  await requireSession();

  await prisma.incomingEmail.update({
    where: { id: incomingEmailId },
    data: { status: "DISCARDED" },
  });

  revalidatePath("/inbox");
  return { ok: true, data: undefined };
}
