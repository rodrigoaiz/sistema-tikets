"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  // Si el ticket estaba abierto y se responde al alumno, lo pasamos a "en progreso".
  if (!isInternalNote) {
    await prisma.ticket.updateMany({
      where: { id: ticketId, status: "OPEN" },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");

  return { ok: true, data: { replyId: reply.id } };
}
