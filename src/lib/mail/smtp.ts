import nodemailer from "nodemailer";

export type SmtpCredentials = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpUseTls: boolean;
  fromAddress: string;
};

function buildTransport(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpUseTls,
    auth: { user: creds.smtpUser, pass: creds.smtpPassword },
  });
}

/** Verifica credenciales/conexión SMTP sin enviar correo. Lanza si falla. */
export async function testSmtpConnection(creds: SmtpCredentials): Promise<void> {
  const transport = buildTransport(creds);
  await transport.verify();
}

/**
 * Envía una respuesta a un alumno. Se usa `fromAddress` como remitente y
 * nunca se pasan rutas de archivo ni contenido "raw" arbitrario: los
 * adjuntos siempre son buffers ya validados por nuestro propio flujo de
 * subida (ver src/lib/uploads.ts), nunca rutas o URLs controladas por el
 * usuario, para evitar el vector de la advisory de nodemailer sobre
 * `raw`/`path`.
 */
export async function sendReplyEmail(
  creds: SmtpCredentials,
  input: {
    to: string;
    subject: string;
    text: string;
    replyToMessageId?: string;
    messageId?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  }
): Promise<string | null> {
  const transport = buildTransport(creds);
  const info = await transport.sendMail({
    from: creds.fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.text,
    inReplyTo: input.replyToMessageId,
    references: input.replyToMessageId,
    messageId: input.messageId,
    attachments: input.attachments,
  });

  return typeof info.messageId === "string" ? info.messageId : null;
}

export async function sendCampaignEmail(
  creds: SmtpCredentials,
  input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    messageId: string;
    image: { filename: string; content: Buffer; contentType: string; cid: string };
  }
): Promise<string | null> {
  const transport = buildTransport(creds);
  const info = await transport.sendMail({
    from: creds.fromAddress,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    messageId: input.messageId,
    attachments: [
      {
        filename: input.image.filename,
        content: input.image.content,
        contentType: input.image.contentType,
        cid: input.image.cid,
      },
    ],
  });

  return typeof info.messageId === "string" ? info.messageId : null;
}
