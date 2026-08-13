"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  mailboxConfigSchema,
  categoryInputSchema,
  profileInputSchema,
} from "@/lib/validators/settings";
import { testImapConnection } from "@/lib/mail/imap";
import { testSmtpConnection } from "@/lib/mail/smtp";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export type MailboxFormInput = {
  name: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string; // vacío = mantener la actual
  imapUseTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string; // vacío = mantener la actual
  smtpUseTls: boolean;
  fromAddress: string;
  enabled: boolean;
};

async function resolvePasswords(input: MailboxFormInput) {
  const existing = await prisma.mailboxConfig.findFirst();

  const imapPassword =
    input.imapPassword.trim().length > 0
      ? input.imapPassword
      : existing
        ? decryptSecret(existing.imapPasswordEncrypted)
        : "";

  const smtpPassword =
    input.smtpPassword.trim().length > 0
      ? input.smtpPassword
      : existing
        ? decryptSecret(existing.smtpPasswordEncrypted)
        : "";

  return { existing, imapPassword, smtpPassword };
}

export async function testMailboxConnection(
  input: MailboxFormInput
): Promise<ActionResult<{ imapOk: boolean; smtpOk: boolean }>> {
  await requireSession();

  const { imapPassword, smtpPassword } = await resolvePasswords(input);

  let imapOk = false;
  let smtpOk = false;
  const errors: string[] = [];

  try {
    await testImapConnection({
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapUser: input.imapUser,
      imapPassword,
      imapUseTls: input.imapUseTls,
    });
    imapOk = true;
  } catch (err) {
    errors.push(`IMAP: ${err instanceof Error ? err.message : "error desconocido"}`);
  }

  try {
    await testSmtpConnection({
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpUser: input.smtpUser,
      smtpPassword,
      smtpUseTls: input.smtpUseTls,
      fromAddress: input.fromAddress,
    });
    smtpOk = true;
  } catch (err) {
    errors.push(`SMTP: ${err instanceof Error ? err.message : "error desconocido"}`);
  }

  if (!imapOk || !smtpOk) {
    return { ok: false, error: errors.join(" · ") };
  }

  return { ok: true, data: { imapOk, smtpOk } };
}

export async function saveMailboxConfig(input: MailboxFormInput): Promise<ActionResult> {
  await requireSession();

  const { existing, imapPassword, smtpPassword } = await resolvePasswords(input);

  const parsed = mailboxConfigSchema.safeParse({ ...input, imapPassword, smtpPassword });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const data = {
    name: parsed.data.name,
    imapHost: parsed.data.imapHost,
    imapPort: parsed.data.imapPort,
    imapUser: parsed.data.imapUser,
    imapPasswordEncrypted: encryptSecret(parsed.data.imapPassword),
    imapUseTls: parsed.data.imapUseTls,
    smtpHost: parsed.data.smtpHost,
    smtpPort: parsed.data.smtpPort,
    smtpUser: parsed.data.smtpUser,
    smtpPasswordEncrypted: encryptSecret(parsed.data.smtpPassword),
    smtpUseTls: parsed.data.smtpUseTls,
    fromAddress: parsed.data.fromAddress,
    enabled: parsed.data.enabled,
  };

  if (existing) {
    await prisma.mailboxConfig.update({ where: { id: existing.id }, data });
  } else {
    await prisma.mailboxConfig.create({ data });
  }

  revalidatePath("/settings");
  revalidatePath("/inbox");

  return { ok: true, data: undefined };
}

export async function createCategory(label: string): Promise<ActionResult> {
  await requireSession();

  const parsed = categoryInputSchema.safeParse({ label });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const key = parsed.data.label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });

  await prisma.category.create({
    data: {
      key: `${key}_${Date.now().toString(36)}`,
      label: parsed.data.label,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function toggleCategoryActive(
  categoryId: string,
  active: boolean
): Promise<ActionResult> {
  await requireSession();
  await prisma.category.update({ where: { id: categoryId }, data: { active } });
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function updateProfileName(name: string): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = profileInputSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const session = await requireSession();

  if (input.newPassword.length < 8) {
    return { ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isValid) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true, data: undefined };
}
