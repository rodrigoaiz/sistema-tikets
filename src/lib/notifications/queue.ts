import type { Prisma } from "@prisma/client";

type NotificationDb = Prisma.TransactionClient;

function appUrl(path: string) {
  const baseUrl = process.env.AUTH_URL?.trim();
  if (!baseUrl) return path;

  try {
    return new URL(path, `${baseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return path;
  }
}

function snippet(value: string, maxLength = 500) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

export async function queueStudentReplyNotification(
  db: NotificationDb,
  input: {
    replyId: string;
    ticketId: string;
    ticketNumber: number;
    subject: string;
    studentName: string | null;
    studentEmail: string;
    body: string;
  }
) {
  const users = await db.user.findMany({
    where: {
      telegramNotificationsEnabled: true,
      telegramChatId: { not: null },
      telegramNotifyStudentReplies: true,
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  const message = [
    "Nueva respuesta de alumno",
    `Ticket #${input.ticketNumber}: ${snippet(input.subject, 180)}`,
    `Alumno: ${input.studentName || input.studentEmail}`,
    "",
    snippet(input.body),
    "",
    `Abrir ticket: ${appUrl(`/tickets/${input.ticketId}`)}`,
  ].join("\n");

  await db.telegramNotification.createMany({
    data: users.map((user) => ({
      dedupeKey: `student-reply:${input.replyId}:${user.id}`,
      kind: "STUDENT_REPLY" as const,
      message,
      userId: user.id,
      ticketId: input.ticketId,
    })),
    skipDuplicates: true,
  });
}

export async function queueIncomingEmailNotification(
  db: NotificationDb,
  input: {
    incomingEmailId: string;
    subject: string;
    fromName: string | null;
    fromEmail: string;
    body: string;
  }
) {
  const users = await db.user.findMany({
    where: {
      telegramNotificationsEnabled: true,
      telegramChatId: { not: null },
      telegramNotifyInboxEmails: true,
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  const message = [
    "Nuevo correo en la bandeja",
    `Asunto: ${snippet(input.subject || "(sin asunto)", 180)}`,
    `De: ${input.fromName || input.fromEmail}`,
    "",
    snippet(input.body),
    "",
    `Abrir bandeja: ${appUrl("/inbox")}`,
  ].join("\n");

  await db.telegramNotification.createMany({
    data: users.map((user) => ({
      dedupeKey: `incoming-email:${input.incomingEmailId}:${user.id}`,
      kind: "INCOMING_EMAIL" as const,
      message,
      userId: user.id,
      incomingEmailId: input.incomingEmailId,
    })),
    skipDuplicates: true,
  });
}
