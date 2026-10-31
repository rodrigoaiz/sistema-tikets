"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  deleteAttachmentFile,
  isAllowedAttachmentType,
  MAX_ATTACHMENT_SIZE_BYTES,
  saveAttachmentFile,
} from "@/lib/uploads";
import { buildCampaignHtml, renderCampaignTemplate } from "@/lib/mail/campaign";
import { sendCampaignEmail } from "@/lib/mail/smtp";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_CAMPAIGN_IMAGE_SIZE = Math.min(MAX_ATTACHMENT_SIZE_BYTES, 900 * 1024);
const CAMPAIGN_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const CAMPAIGN_CONFIRMATION = "ENVIAR CAMPANA";
const emailSchema = z.string().trim().email();

const campaignInputSchema = z.object({
  title: z.string().trim().min(2, "Escribe un nombre para la campaña.").max(120),
  subject: z.string().trim().min(1, "Escribe el asunto.").max(250),
  bodyText: z.string().trim().min(1, "Escribe el mensaje.").max(5_000),
  recipients: z.array(z.object({
    email: z.string().trim().email(),
    name: z.string().trim().max(120).optional(),
  })).min(1).max(5_000),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.role !== "ADMIN") throw new Error("No tienes permisos para enviar campañas.");
  return session;
}

function normalizeRecipients(
  values: Array<{ email: string; name?: string }>,
  fromAddress: string
) {
  const sender = fromAddress.trim().toLowerCase();
  const recipients = new Map<string, string | null>();
  for (const value of values) {
    const parsed = emailSchema.safeParse(value.email.toLowerCase());
    if (parsed.success && parsed.data !== sender && !recipients.has(parsed.data)) {
      recipients.set(parsed.data, value.name?.trim() || null);
    }
  }
  return [...recipients].map(([email, name]) => ({ email, name }));
}

function validateCampaignImage(image: File) {
  if (!CAMPAIGN_IMAGE_TYPES.has(image.type) || !isAllowedAttachmentType(image.type)) {
    return "La imagen debe ser PNG, JPG, WEBP o GIF.";
  }
  if (image.size === 0 || image.size > MAX_CAMPAIGN_IMAGE_SIZE) {
    return "La imagen debe pesar menos de 900 KB.";
  }
  return null;
}

export async function createCampaign(
  image: File,
  input: unknown
): Promise<ActionResult<{ campaignId: string; recipientCount: number }>> {
  const session = await requireAdmin();
  const mailbox = await prisma.mailboxConfig.findFirst({ where: { enabled: true } });
  if (!mailbox) return { ok: false, error: "Activa el buzón SMTP antes de crear la campaña." };
  const imageError = validateCampaignImage(image);
  if (imageError) return { ok: false, error: imageError };

  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const recipients = normalizeRecipients(parsed.data.recipients, mailbox.fromAddress);
  if (recipients.length === 0) {
    return { ok: false, error: "No hay destinatarios válidos después de quitar duplicados y el remitente." };
  }

  const uploaded = await saveAttachmentFile(image);
  try {
    const campaign = await prisma.emailCampaign.create({
      data: {
        title: parsed.data.title,
        subject: parsed.data.subject,
        bodyText: parsed.data.bodyText,
        imageFilename: image.name,
        imageStoredFilename: uploaded.storedFilename,
        imageMimeType: image.type,
        imageSize: uploaded.size,
        createdById: session.user.id,
        recipients: { createMany: { data: recipients } },
      },
      select: { id: true },
    });
    revalidatePath("/campaigns");
    return { ok: true, data: { campaignId: campaign.id, recipientCount: recipients.length } };
  } catch (error) {
    await deleteAttachmentFile(uploaded.storedFilename);
    return { ok: false, error: `No se pudo crear la campaña: ${error instanceof Error ? error.message : "error desconocido"}` };
  }
}

export async function sendCampaignTestEmail(
  image: File,
  input: unknown
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({
    recipientEmail: z.string().trim().email("Escribe un correo de prueba válido."),
    recipientName: z.string().trim().max(120).optional(),
    subject: z.string().trim().min(1, "Escribe el asunto.").max(250),
    bodyText: z.string().trim().min(1, "Escribe el mensaje.").max(5_000),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const imageError = validateCampaignImage(image);
  if (imageError) return { ok: false, error: imageError };

  const mailbox = await prisma.mailboxConfig.findFirst({ where: { enabled: true } });
  if (!mailbox) return { ok: false, error: "Activa el buzón SMTP antes de enviar la prueba." };

  try {
    const cid = `campaign-test-${randomUUID()}`;
    const domain = mailbox.fromAddress.split("@")[1]?.replace(/[^a-zA-Z0-9.-]/g, "") || "helpdesk.local";
    await sendCampaignEmail(
      {
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
        smtpUser: mailbox.smtpUser,
        smtpPassword: decryptSecret(mailbox.smtpPasswordEncrypted),
        smtpUseTls: mailbox.smtpUseTls,
        fromAddress: mailbox.fromAddress,
      },
      {
        to: parsed.data.recipientEmail,
        subject: renderCampaignTemplate(parsed.data.subject, parsed.data.recipientName ?? null),
        text: renderCampaignTemplate(parsed.data.bodyText, parsed.data.recipientName ?? null),
        html: buildCampaignHtml(renderCampaignTemplate(parsed.data.bodyText, parsed.data.recipientName ?? null), cid),
        messageId: `<campaign-test-${randomUUID()}@${domain}>`,
        image: {
          filename: image.name,
          content: Buffer.from(await image.arrayBuffer()),
          contentType: image.type,
          cid,
        },
      }
    );
  } catch (error) {
    return { ok: false, error: `No se pudo enviar la prueba: ${error instanceof Error ? error.message : "error desconocido"}` };
  }

  return { ok: true, data: undefined };
}

export async function queueHalloweenCampaign(
  campaignId: string,
  confirmation: string
): Promise<ActionResult> {
  await requireAdmin();
  if (confirmation.trim().toUpperCase() !== CAMPAIGN_CONFIRMATION) {
    return { ok: false, error: `Escribe exactamente “${CAMPAIGN_CONFIRMATION}” para confirmar.` };
  }

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { status: true, _count: { select: { recipients: true } } },
  });
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  if (campaign.status !== "DRAFT") return { ok: false, error: "Esta campaña ya fue programada." };
  if (campaign._count.recipients === 0) return { ok: false, error: "La campaña no tiene destinatarios." };

  const mailbox = await prisma.mailboxConfig.findFirst({ where: { enabled: true }, select: { id: true } });
  if (!mailbox) return { ok: false, error: "Activa el buzón SMTP antes de iniciar el envío." };

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "QUEUED", startedAt: new Date() },
  });
  revalidatePath("/campaigns");
  return { ok: true, data: undefined };
}
