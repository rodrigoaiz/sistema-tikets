import { PrismaClient } from "@prisma/client";
import {
  extractTelegramLinkCode,
  getTelegramUpdates,
  hashTelegramLinkCode,
  sendTelegramMessage,
  telegramBotConfigured,
} from "../src/lib/notifications/telegram";

const prisma = new PrismaClient();
const MAX_ATTEMPTS = 5;

async function processTelegramUpdates() {
  const state = await prisma.telegramBotState.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  const updates = await getTelegramUpdates(state.updateOffset);
  if (updates.length === 0) return;

  let nextOffset = state.updateOffset;

  for (const update of updates) {
    nextOffset = Math.max(nextOffset, update.update_id + 1);

    const text = update.message?.text;
    const chatId = update.message?.chat?.id;
    if (!text || chatId === undefined) continue;

    const code = extractTelegramLinkCode(text);
    if (!code) continue;

    const user = await prisma.user.findFirst({
      where: {
        telegramLinkCodeHash: hashTelegramLinkCode(code),
        telegramLinkCodeExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: String(chatId),
        telegramNotificationsEnabled: true,
        telegramLinkCodeHash: null,
        telegramLinkCodeExpiresAt: null,
      },
    });

    try {
      await sendTelegramMessage(
        String(chatId),
        "Telegram quedó conectado al Help Desk SEP. Recibirás aquí las nuevas respuestas de alumnos."
      );
    } catch (error) {
      console.error("No se pudo enviar la confirmación de Telegram:", error);
    }
  }

  await prisma.telegramBotState.update({
    where: { id: "default" },
    data: { updateOffset: nextOffset },
  });
}

async function processPendingNotifications() {
  const now = new Date();
  const staleProcessingAt = new Date(now.getTime() - 10 * 60 * 1000);

  await prisma.telegramNotification.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleProcessingAt } },
    data: { status: "PENDING", nextAttemptAt: now },
  });

  const pending = await prisma.telegramNotification.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: { id: true },
  });

  for (const item of pending) {
    const claim = await prisma.telegramNotification.updateMany({
      where: { id: item.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;

    const notification = await prisma.telegramNotification.findUnique({
      where: { id: item.id },
      select: {
        id: true,
        message: true,
        attempts: true,
        user: { select: { telegramChatId: true, telegramNotificationsEnabled: true } },
      },
    });

    if (!notification) continue;

    if (!notification.user.telegramChatId || !notification.user.telegramNotificationsEnabled) {
      await prisma.telegramNotification.update({
        where: { id: notification.id },
        data: { status: "FAILED", lastError: "Telegram no está vinculado o está desactivado." },
      });
      continue;
    }

    try {
      await sendTelegramMessage(notification.user.telegramChatId, notification.message);
      await prisma.telegramNotification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
    } catch (error) {
      const failedPermanently = notification.attempts >= MAX_ATTEMPTS;
      const retryDelayMs = Math.min(15 * 60 * 1000, 30_000 * 2 ** (notification.attempts - 1));

      await prisma.telegramNotification.update({
        where: { id: notification.id },
        data: {
          status: failedPermanently ? "FAILED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + retryDelayMs),
          lastError: error instanceof Error ? error.message : "Error desconocido",
        },
      });
    }
  }
}

async function main() {
  if (!telegramBotConfigured()) {
    console.log("Telegram no configurado. Define TELEGRAM_BOT_TOKEN para activar los avisos.");
    return;
  }

  await processTelegramUpdates();
  await processPendingNotifications();
}

main()
  .catch((error) => {
    console.error("Error procesando notificaciones de Telegram:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
