import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type MailboxCredentials = {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapUseTls: boolean;
};

export type FetchedEmail = {
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
  attachments: Array<{ filename: string; mimeType: string; content: Buffer }>;
};

function buildClient(creds: MailboxCredentials) {
  return new ImapFlow({
    host: creds.imapHost,
    port: creds.imapPort,
    secure: creds.imapUseTls,
    auth: { user: creds.imapUser, pass: creds.imapPassword },
    logger: false,
  });
}

/** Verifica autenticación y acceso de lectura al INBOX. */
export async function testImapConnection(creds: MailboxCredentials): Promise<void> {
  const client = buildClient(creds);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
  } finally {
    await client.logout().catch(() => undefined);
  }
}

/**
 * Procesa los correos no leídos y marca cada uno como leído únicamente cuando
 * el callback termina correctamente.
 */
export async function processUnseenEmails(
  creds: MailboxCredentials,
  processEmail: (email: FetchedEmail) => Promise<void>
): Promise<void> {
  const client = buildClient(creds);

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const messages = await client.fetchAll(
        { seen: false },
        { source: true, envelope: true }
      );

      for (const message of messages) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        const fromAddress = parsed.from?.value?.[0];

        await processEmail({
          messageId: parsed.messageId ?? null,
          inReplyTo: parsed.inReplyTo ?? null,
          references: Array.isArray(parsed.references)
            ? parsed.references
            : parsed.references
              ? [parsed.references]
              : [],
          fromEmail: fromAddress?.address ?? "desconocido@correo.com",
          fromName: fromAddress?.name ?? null,
          subject: parsed.subject ?? "(sin asunto)",
          bodyText: parsed.text ?? "",
          bodyHtml: typeof parsed.html === "string" ? parsed.html : null,
          receivedAt: parsed.date ?? new Date(),
          attachments: (parsed.attachments ?? []).map((att) => ({
            filename: att.filename ?? "adjunto",
            mimeType: att.contentType,
            content: att.content,
          })),
        });

        await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}
