import "server-only";
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

/** Prueba la conexión IMAP sin descargar correos. Lanza si falla. */
export async function testImapConnection(creds: MailboxCredentials): Promise<void> {
  const client = buildClient(creds);
  await client.connect();
  await client.logout();
}

/**
 * Descarga los correos no leídos del INBOX y los marca como leídos.
 * Pensado para correr periódicamente (cron / systemd timer), ver
 * scripts/poll-mailbox.ts.
 */
export async function fetchUnseenEmails(creds: MailboxCredentials): Promise<FetchedEmail[]> {
  const client = buildClient(creds);
  const results: FetchedEmail[] = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      for await (const message of client.fetch(
        { seen: false },
        { source: true, envelope: true }
      )) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);

        const fromAddress = parsed.from?.value?.[0];

        results.push({
          messageId: parsed.messageId ?? null,
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

  return results;
}
