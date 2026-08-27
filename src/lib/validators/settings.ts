import { z } from "zod";

export const mailboxConfigSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Bandeja principal"),
  imapHost: z.string().trim().min(1, "Requerido"),
  imapPort: z.coerce.number().int().min(1).max(65535),
  imapUser: z.string().trim().min(1, "Requerido"),
  imapPassword: z.string().trim().min(1, "Requerido"),
  imapUseTls: z.boolean().default(true),
  smtpHost: z.string().trim().min(1, "Requerido"),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().trim().min(1, "Requerido"),
  smtpPassword: z.string().trim().min(1, "Requerido"),
  smtpUseTls: z.boolean().default(true),
  fromAddress: z.string().trim().email("Correo remitente inválido."),
  enabled: z.boolean().default(false),
  autoCloseEnabled: z.boolean().default(false),
  autoCloseAfterHours: z.coerce.number().int().min(1).max(720).default(48),
});

export type MailboxConfigInput = z.infer<typeof mailboxConfigSchema>;

export const categoryInputSchema = z.object({
  label: z.string().trim().min(2, "Muy corto").max(100),
});

export const profileInputSchema = z.object({
  name: z.string().trim().min(2, "Muy corto").max(100),
});

export const passwordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerido"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
  });
