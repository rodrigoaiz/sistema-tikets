import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import { sendReplyEmail } from "../src/lib/mail/smtp";

const prisma = new PrismaClient();
const DEFAULT_AUTO_CLOSE_HOURS = 48;
const RETRY_DELAY_MS = 5 * 60 * 1000;
const PROCESSING_TIMEOUT_MS = 30 * 60 * 1000;

type Mailbox = Awaited<ReturnType<typeof prisma.mailboxConfig.findFirst>>;

async function findEligibleTickets(cutoff: Date, ticketId?: string) {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: "IN_PROGRESS",
      ...(ticketId ? { id: ticketId } : {}),
    },
    select: {
      id: true,
      number: true,
      subject: true,
      studentEmail: true,
      studentName: true,
      replies: {
        where: { isInternalNote: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          authorId: true,
          isFromStudent: true,
          isAutoCloseNotice: true,
          sentViaEmail: true,
          sentAt: true,
          outgoingMessageId: true,
          createdAt: true,
        },
      },
    },
  });

  return tickets.flatMap((ticket) => {
    const latestReply = ticket.replies[0];
    if (
      !latestReply ||
      latestReply.isFromStudent ||
      latestReply.isAutoCloseNotice ||
      !latestReply.authorId ||
      !latestReply.sentViaEmail ||
      (latestReply.sentAt ?? latestReply.createdAt) > cutoff
    ) {
      return [];
    }

    return [{
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      studentEmail: ticket.studentEmail,
      studentName: ticket.studentName,
      agentReply: latestReply,
    }];
  });
}

async function recoverStaleAttempts() {
  const staleBefore = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  const result = await prisma.ticketAutoCloseAttempt.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: staleBefore },
    },
    data: {
      status: "FAILED",
      nextAttemptAt: new Date(),
      lastError: "El intento anterior no terminó; se reintentará automáticamente.",
    },
  });

  return result.count;
}

async function claimAttempt(ticketId: string, agentReplyId: string) {
  const now = new Date();
  const attempt = await prisma.ticketAutoCloseAttempt.upsert({
    where: {
      ticketId_agentReplyId: { ticketId, agentReplyId },
    },
    create: { ticketId, agentReplyId },
    update: {},
  });

  if (attempt.status === "SENT" || attempt.status === "PROCESSING") return null;
  if (attempt.nextAttemptAt > now) return null;

  const claimed = await prisma.ticketAutoCloseAttempt.updateMany({
    where: {
      id: attempt.id,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  return claimed.count === 1 ? attempt.id : null;
}

async function markAttemptFailed(attemptId: string, error: unknown) {
  await prisma.ticketAutoCloseAttempt.updateMany({
    where: { id: attemptId, status: "PROCESSING" },
    data: {
      status: "FAILED",
      nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
      lastError: error instanceof Error ? error.message : "Error desconocido al enviar el correo.",
    },
  });
}

function buildSubject(subject: string) {
  const normalizedSubject = subject.trim() || "Consulta de soporte";
  return normalizedSubject.toLowerCase().startsWith("re:")
    ? normalizedSubject
    : `Re: ${normalizedSubject}`;
}

function buildMessage(ticket: {
  number: number;
  subject: string;
  studentName: string | null;
}, hours: number) {
  const greeting = ticket.studentName?.trim() ? `Hola ${ticket.studentName.trim()},` : "Hola,";

  return [
    greeting,
    "",
    `Te informamos que el ticket #${ticket.number} sobre \"${ticket.subject}\" se cerró automáticamente porque no recibimos una respuesta durante ${hours} horas después de nuestra última respuesta.`,
    "",
    "Si aún tienes dudas o necesitas continuar con la atención, responde a este mismo correo. El ticket se reabrirá automáticamente y podremos ayudarte.",
    "",
    "Saludos,",
    "Equipo de soporte",
  ].join("\n");
}

function buildMessageId(ticketId: string, agentReplyId: string, fromAddress: string) {
  const domain = fromAddress.split("@")[1]?.trim().replace(/[^a-zA-Z0-9.-]/g, "") || "helpdesk.local";
  return `<auto-close-${ticketId}-${agentReplyId}@${domain}>`;
}

async function finalizeAttempt(input: {
  attemptId: string;
  ticketId: string;
  agentReplyId: string;
  body: string;
  outgoingMessageId: string;
}) {
  const sentAt = new Date();

  return prisma.$transaction(async (tx) => {
    const currentTicket = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      select: {
        status: true,
        replies: {
          where: { isInternalNote: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });
    const canClose =
      currentTicket?.status === "IN_PROGRESS" && currentTicket.replies[0]?.id === input.agentReplyId;

    const existingNotice = await tx.ticketReply.findUnique({
      where: { outgoingMessageId: input.outgoingMessageId },
      select: { id: true },
    });

    if (!existingNotice) {
      await tx.ticketReply.create({
        data: {
          ticketId: input.ticketId,
          body: input.body,
          isAutoCloseNotice: true,
          sentViaEmail: true,
          sentAt,
          outgoingMessageId: input.outgoingMessageId,
          createdAt: sentAt,
        },
      });
    }

    await tx.ticketAutoCloseAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "SENT",
        sentAt,
        lastError: canClose ? null : "El correo se envió, pero el ticket recibió actividad antes del cierre.",
      },
    });

    if (canClose) {
      await tx.ticket.update({
        where: { id: input.ticketId },
        data: { status: "CLOSED", closedAt: sentAt },
      });
    }

    return { closed: canClose };
  });
}

async function processCandidate(
  candidate: Awaited<ReturnType<typeof findEligibleTickets>>[number],
  mailbox: NonNullable<Mailbox>,
  hours: number
) {
  const attemptId = await claimAttempt(candidate.id, candidate.agentReply.id);
  if (!attemptId) return "skipped" as const;

  const freshCandidate = (await findEligibleTickets(new Date(), candidate.id))[0];
  if (!freshCandidate || freshCandidate.agentReply.id !== candidate.agentReply.id) {
    await prisma.ticketAutoCloseAttempt.deleteMany({
      where: { id: attemptId, status: "PROCESSING" },
    });
    return "skipped" as const;
  }

  const body = buildMessage(freshCandidate, hours);
  const outgoingMessageId = buildMessageId(
    freshCandidate.id,
    freshCandidate.agentReply.id,
    mailbox.fromAddress
  );

  try {
    const sentMessageId = await sendReplyEmail(
      {
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
        smtpUser: mailbox.smtpUser,
        smtpPassword: decryptSecret(mailbox.smtpPasswordEncrypted),
        smtpUseTls: mailbox.smtpUseTls,
        fromAddress: mailbox.fromAddress,
      },
      {
        to: freshCandidate.studentEmail,
        subject: buildSubject(freshCandidate.subject),
        text: body,
        replyToMessageId: freshCandidate.agentReply.outgoingMessageId ?? undefined,
        messageId: outgoingMessageId,
      }
    );

    const result = await finalizeAttempt({
      attemptId,
      ticketId: freshCandidate.id,
      agentReplyId: freshCandidate.agentReply.id,
      body,
      outgoingMessageId: sentMessageId ?? outgoingMessageId,
    });

    return result.closed ? ("closed" as const) : ("sent" as const);
  } catch (error) {
    await markAttemptFailed(attemptId, error);
    console.error(`No se pudo cerrar automáticamente el ticket #${candidate.number}:`, error);
    return "failed" as const;
  }
}

async function main() {
  const mailbox = await prisma.mailboxConfig.findFirst({
    where: { enabled: true, autoCloseEnabled: true },
  });

  if (!mailbox) {
    console.log("Cierre automático desactivado o buzón no configurado. Nada que hacer.");
    return;
  }

  const recovered = await recoverStaleAttempts();
  const hours = mailbox.autoCloseAfterHours || DEFAULT_AUTO_CLOSE_HOURS;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const candidates = await findEligibleTickets(cutoff);
  const results = { closed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const candidate of candidates) {
    const result = await processCandidate(candidate, mailbox, hours);
    results[result] += 1;
  }

  console.log(
    `Autocierre: ${results.closed} cerrado(s), ${results.sent} correo(s) enviado(s) sin cierre, ${results.failed} fallo(s), ${results.skipped} omitido(s). Candidatos: ${candidates.length}. Intentos recuperados: ${recovered}.`
  );
}

main()
  .catch((error) => {
    console.error("Error ejecutando el cierre automático:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
