/**
 * Revisa el buzón configurado en Ajustes y guarda los correos nuevos como
 * IncomingEmail (pendientes de triage en /inbox). No crea tickets
 * automáticamente — eso lo decide el agente desde la Bandeja de entrada.
 *
 * Uso:
 *   npx tsx scripts/poll-mailbox.ts
 *
 * Pensado para ejecutarse periódicamente vía cron o un systemd timer, por
 * ejemplo cada 2-5 minutos. Ver README.md, sección "Conectar el correo".
 */
import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import { fetchUnseenEmails } from "../src/lib/mail/imap";
import { saveAttachmentFile, isAllowedAttachmentType } from "../src/lib/uploads";

const prisma = new PrismaClient();

async function main() {
  const mailbox = await prisma.mailboxConfig.findFirst();

  if (!mailbox || !mailbox.enabled) {
    console.log("Buzón no configurado o desactivado. Nada que hacer.");
    return;
  }

  const emails = await fetchUnseenEmails({
    imapHost: mailbox.imapHost,
    imapPort: mailbox.imapPort,
    imapUser: mailbox.imapUser,
    imapPassword: decryptSecret(mailbox.imapPasswordEncrypted),
    imapUseTls: mailbox.imapUseTls,
  });

  let created = 0;

  for (const email of emails) {
    if (email.messageId) {
      const existing = await prisma.incomingEmail.findUnique({
        where: { messageId: email.messageId },
      });
      if (existing) continue;
    }

    const incomingEmail = await prisma.incomingEmail.create({
      data: {
        messageId: email.messageId,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        receivedAt: email.receivedAt,
      },
    });

    for (const attachment of email.attachments) {
      if (!isAllowedAttachmentType(attachment.mimeType)) continue;
      const file = new File([new Uint8Array(attachment.content)], attachment.filename, {
        type: attachment.mimeType,
      });
      const { storedFilename, size } = await saveAttachmentFile(file);
      await prisma.attachment.create({
        data: {
          incomingEmailId: incomingEmail.id,
          filename: attachment.filename,
          storedFilename,
          mimeType: attachment.mimeType,
          size,
        },
      });
    }

    created += 1;
  }

  await prisma.mailboxConfig.update({
    where: { id: mailbox.id },
    data: { lastPolledAt: new Date() },
  });

  console.log(`Listo: ${created} correo(s) nuevo(s) guardado(s) en la bandeja de entrada.`);
}

main()
  .catch((err) => {
    console.error("Error revisando el buzón:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
