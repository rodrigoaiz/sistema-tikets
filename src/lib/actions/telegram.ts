"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createTelegramLinkCode,
  sendTelegramMessage,
  telegramBotConfigured,
} from "@/lib/notifications/telegram";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session;
}

export async function getTelegramConnectionStatus(): Promise<
  ActionResult<{ linked: boolean; enabled: boolean; notifyStudentReplies: boolean; notifyInboxEmails: boolean }>
> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramChatId: true,
      telegramNotificationsEnabled: true,
      telegramNotifyStudentReplies: true,
      telegramNotifyInboxEmails: true,
    },
  });

  if (!user) return { ok: false, error: "Usuario no encontrado." };

  return {
    ok: true,
    data: {
      linked: Boolean(user.telegramChatId),
      enabled: user.telegramNotificationsEnabled,
      notifyStudentReplies: user.telegramNotifyStudentReplies,
      notifyInboxEmails: user.telegramNotifyInboxEmails,
    },
  };
}

export async function startTelegramPairing(): Promise<
  ActionResult<{ code: string; expiresAt: string }>
> {
  const session = await requireSession();
  if (!telegramBotConfigured()) {
    return { ok: false, error: "El bot de Telegram aún no está configurado en el servidor." };
  }

  const pairing = createTelegramLinkCode();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramLinkCodeHash: pairing.hash,
      telegramLinkCodeExpiresAt: pairing.expiresAt,
    },
  });

  return { ok: true, data: { code: pairing.code, expiresAt: pairing.expiresAt.toISOString() } };
}

export async function updateTelegramPreferences(input: {
  enabled: boolean;
  notifyStudentReplies: boolean;
  notifyInboxEmails: boolean;
}): Promise<ActionResult> {
  const session = await requireSession();

  if (
    typeof input.enabled !== "boolean" ||
    typeof input.notifyStudentReplies !== "boolean" ||
    typeof input.notifyInboxEmails !== "boolean"
  ) {
    return { ok: false, error: "Preferencias de Telegram inválidas." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true },
  });

  if (input.enabled && !user?.telegramChatId) {
    return { ok: false, error: "Vincula primero tu cuenta de Telegram." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramNotificationsEnabled: input.enabled,
      telegramNotifyStudentReplies: input.notifyStudentReplies,
      telegramNotifyInboxEmails: input.notifyInboxEmails,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

export async function disconnectTelegram(): Promise<ActionResult> {
  const session = await requireSession();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramChatId: null,
      telegramNotificationsEnabled: false,
      telegramLinkCodeHash: null,
      telegramLinkCodeExpiresAt: null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

export async function sendTelegramTest(): Promise<ActionResult> {
  const session = await requireSession();
  if (!telegramBotConfigured()) {
    return { ok: false, error: "El bot de Telegram aún no está configurado en el servidor." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true },
  });

  if (!user?.telegramChatId) {
    return { ok: false, error: "Vincula primero tu cuenta de Telegram." };
  }

  try {
    await sendTelegramMessage(
      user.telegramChatId,
      "Prueba de notificaciones del Help Desk SEP. La conexión con Telegram funciona."
    );
  } catch (error) {
    return {
      ok: false,
      error: `No se pudo enviar la prueba: ${error instanceof Error ? error.message : "error desconocido"}`,
    };
  }

  return { ok: true, data: undefined };
}
