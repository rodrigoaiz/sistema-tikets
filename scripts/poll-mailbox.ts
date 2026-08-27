/**
 * Revisa el buzón configurado en Ajustes y guarda los correos nuevos como
 * IncomingEmail (pendientes de triage en /inbox). No crea tickets
 * automáticamente — eso lo decide el agente desde la Bandeja de entrada.
 *
 * Uso:
 *   npm run mail:poll
 *
 * En producción lo ejecuta el servicio mail-worker de Docker Compose.
 */
import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import { processUnseenEmails } from "../src/lib/mail/imap-client";
import {
  queueIncomingEmailNotification,
  queueStudentReplyNotification,
} from "../src/lib/notifications/queue";
import {
  saveAttachmentFile,
  isAllowedAttachmentType,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../src/lib/uploads";

const prisma = new PrismaClient();

async function main() {
  const mailbox = await prisma.mailboxConfig.findFirst();

  if (!mailbox || !mailbox.enabled) {
    console.log("Buzón no configurado o desactivado. Nada que hacer.");
    return;
  }

  let created = 0;
  let appended = 0;

  await processUnseenEmails(
    {
      imapHost: mailbox.imapHost,
      imapPort: mailbox.imapPort,
      imapUser: mailbox.imapUser,
      imapPassword: decryptSecret(mailbox.imapPasswordEncrypted),
      imapUseTls: mailbox.imapUseTls,
    },
    async (email) => {
      if (email.messageId) {
        const existing = await prisma.incomingEmail.findUnique({
          where: { messageId: email.messageId },
        });
        if (existing) return;
      }

      const threadMessageIds = Array.from(
        new Set(
          [email.inReplyTo, ...email.references].filter(
            (messageId): messageId is string => Boolean(messageId)
          )
        )
      );

      let ticketId: string | null = null;
      if (threadMessageIds.length > 0) {
        const [threadEmail, threadReply] = await Promise.all([
          prisma.incomingEmail.findFirst({
            where: {
              messageId: { in: threadMessageIds },
              ticketId: { not: null },
              ticket: {
                studentEmail: { equals: email.fromEmail, mode: "insensitive" },
              },
            },
            orderBy: { receivedAt: "desc" },
            select: { ticketId: true },
          }),
          prisma.ticketReply.findFirst({
            where: {
              outgoingMessageId: { in: threadMessageIds },
              ticket: {
                studentEmail: { equals: email.fromEmail, mode: "insensitive" },
              },
            },
            orderBy: { createdAt: "desc" },
            select: { ticketId: true },
          }),
        ]);

        ticketId = threadReply?.ticketId ?? threadEmail?.ticketId ?? null;
      }

      const { incomingEmail, ticketReplyId } = await prisma.$transaction(async (tx) => {
        const incoming = await tx.incomingEmail.create({
          data: {
            messageId: email.messageId,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            subject: email.subject,
            bodyText: email.bodyText,
            bodyHtml: email.bodyHtml,
            receivedAt: email.receivedAt,
            status: ticketId ? "CONVERTED" : "PENDING",
            ticketId,
          },
        });

        if (!ticketId) {
          await queueIncomingEmailNotification(tx, {
            incomingEmailId: incoming.id,
            subject: email.subject,
            fromName: email.fromName,
            fromEmail: email.fromEmail,
            body: email.bodyText,
          });
          return { incomingEmail: incoming, ticketReplyId: null };
        }

        const reply = await tx.ticketReply.create({
          data: {
            ticketId,
            body: email.bodyText,
            isFromStudent: true,
            createdAt: email.receivedAt,
          },
        });

        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: "OPEN", closedAt: null },
        });

        const ticket = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: {
            number: true,
            subject: true,
            studentName: true,
            studentEmail: true,
          },
        });

        if (ticket) {
          await queueStudentReplyNotification(tx, {
            replyId: reply.id,
            ticketId,
            ticketNumber: ticket.number,
            subject: ticket.subject,
            studentName: ticket.studentName,
            studentEmail: ticket.studentEmail,
            body: email.bodyText,
          });
        }

        return { incomingEmail: incoming, ticketReplyId: reply.id };
      });

      for (const attachment of email.attachments) {
        if (!isAllowedAttachmentType(attachment.mimeType)) continue;
        if (attachment.content.byteLength > MAX_ATTACHMENT_SIZE_BYTES) continue;
        const file = new File([new Uint8Array(attachment.content)], attachment.filename, {
          type: attachment.mimeType,
        });
        const { storedFilename, size } = await saveAttachmentFile(file);
        await prisma.attachment.create({
          data: {
            incomingEmailId: incomingEmail.id,
            ticketReplyId,
            filename: attachment.filename,
            storedFilename,
            mimeType: attachment.mimeType,
            size,
          },
        });
      }

      created += 1;
      if (ticketId) appended += 1;
    }
  );

  await prisma.mailboxConfig.update({
    where: { id: mailbox.id },
    data: { lastPolledAt: new Date() },
  });

  console.log(
    `Listo: ${created} correo(s) importado(s); ${appended} agregado(s) a tickets existentes.`
  );
}

main()
  .catch((err) => {
    console.error("Error revisando el buzón:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
