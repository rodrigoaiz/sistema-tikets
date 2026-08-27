import { createHash, randomBytes } from "node:crypto";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number | string };
  };
};

export function telegramBotConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

function getTelegramApiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("Falta TELEGRAM_BOT_TOKEN en las variables de entorno.");
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(getTelegramApiUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null;

    if (!response.ok || !data?.ok) {
      throw new Error(data?.description ?? `Telegram respondió con HTTP ${response.status}.`);
    }

    return data.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function hashTelegramLinkCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function createTelegramLinkCode() {
  const code = randomBytes(8).toString("hex").toUpperCase();
  return {
    code,
    hash: hashTelegramLinkCode(code),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
}

export function extractTelegramLinkCode(text: string) {
  const match = text.trim().match(/^\/(?:start|vincular)(?:@[a-zA-Z0-9_]+)?\s+([A-Z0-9]{16})$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function getTelegramUpdates(offset: number) {
  return telegramRequest<TelegramUpdate[]>("getUpdates", {
    offset,
    limit: 100,
    timeout: 0,
    allowed_updates: ["message"],
  });
}
