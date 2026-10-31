import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import { readAttachmentFile } from "../src/lib/uploads";
import { buildCampaignHtml, renderCampaignTemplate } from "../src/lib/mail/campaign";
import { sendCampaignEmail } from "../src/lib/mail/smtp";

const prisma = new PrismaClient();
const MAX_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 30 * 60 * 1000;
const SEND_INTERVAL_MS = 2_000;

function buildMessageId(recipientId: string, fromAddress: string) {
  const domain = fromAddress.split("@")[1]?.trim().replace(/[^a-zA-Z0-9.-]/g, "") || "helpdesk.local";
  return `<campaign-${recipientId}@${domain}>`;
}

async function recoverStaleRecipients() {
  await prisma.emailCampaignRecipient.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS) } },
    data: { status: "PENDING", nextAttemptAt: new Date(), lastError: "El intento anterior no terminó; se reintentará automáticamente." },
  });
}

async function processRecipient(recipientId: string) {
  const claim = await prisma.emailCampaignRecipient.updateMany({
    where: { id: recipientId, status: "PENDING", nextAttemptAt: { lte: new Date() } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
  });
  if (claim.count === 0) return "skipped";

  const [recipient, mailbox] = await Promise.all([
    prisma.emailCampaignRecipient.findUnique({
      where: { id: recipientId },
      include: { campaign: true },
    }),
    prisma.mailboxConfig.findFirst({ where: { enabled: true } }),
  ]);
  if (!recipient) return "skipped";
  if (!mailbox) {
    await prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "PENDING", nextAttemptAt: new Date(Date.now() + 60_000), lastError: "El buzón SMTP está desactivado." },
    });
    return "skipped";
  }

  try {
    const image = await readAttachmentFile(recipient.campaign.imageStoredFilename);
    const cid = `campaign-image-${recipient.campaign.id}`;
    const subject = renderCampaignTemplate(recipient.campaign.subject, recipient.name);
    const bodyText = renderCampaignTemplate(recipient.campaign.bodyText, recipient.name);
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
        to: recipient.email,
        subject,
        text: bodyText,
        html: buildCampaignHtml(bodyText, cid),
        messageId: buildMessageId(recipient.id, mailbox.fromAddress),
        image: {
          filename: recipient.campaign.imageFilename,
          content: image,
          contentType: recipient.campaign.imageMimeType,
          cid,
        },
      }
    );
    await prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "SENT", sentAt: new Date(), lastError: null },
    });
    return "sent";
  } catch (error) {
    const retry = recipient.attempts < MAX_ATTEMPTS;
    await prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: retry ? "PENDING" : "FAILED",
        nextAttemptAt: new Date(Date.now() + Math.min(15 * 60 * 1000, 30_000 * 2 ** (recipient.attempts - 1))),
        lastError: error instanceof Error ? error.message : "Error desconocido al enviar el correo.",
      },
    });
    console.error(`No se pudo enviar la campaña a ${recipient.email}:`, error);
    return "failed";
  }
}

async function completeFinishedCampaigns() {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { status: { in: ["QUEUED", "SENDING"] } },
    select: { id: true },
  });
  for (const campaign of campaigns) {
    const pending = await prisma.emailCampaignRecipient.count({
      where: { campaignId: campaign.id, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (pending === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
  }
}

async function main() {
  await recoverStaleRecipients();
  const candidates = await prisma.emailCampaignRecipient.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() }, campaign: { status: { in: ["QUEUED", "SENDING"] } } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, campaignId: true },
  });
  for (const candidate of candidates) {
    await prisma.emailCampaign.updateMany({
      where: { id: candidate.campaignId, status: "QUEUED" },
      data: { status: "SENDING" },
    });
    await processRecipient(candidate.id);
    await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
  }
  await completeFinishedCampaigns();
}

main()
  .catch((error) => {
    console.error("Error procesando campañas de correo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
