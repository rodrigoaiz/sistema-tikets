-- CreateEnum
CREATE TYPE "TelegramNotificationKind" AS ENUM ('STUDENT_REPLY', 'INCOMING_EMAIL');

-- CreateEnum
CREATE TYPE "TelegramNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "telegramNotifyStudentReplies" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "telegramNotifyInboxEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "telegramLinkCodeHash" TEXT,
ADD COLUMN "telegramLinkCodeExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "telegram_notifications" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" "TelegramNotificationKind" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TelegramNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "incomingEmailId" TEXT,

    CONSTRAINT "telegram_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bot_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "updateOffset" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_bot_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_telegramLinkCodeHash_idx" ON "users"("telegramLinkCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_notifications_dedupeKey_key" ON "telegram_notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "telegram_notifications_status_nextAttemptAt_idx" ON "telegram_notifications"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "telegram_notifications_userId_createdAt_idx" ON "telegram_notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "telegram_notifications" ADD CONSTRAINT "telegram_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_notifications" ADD CONSTRAINT "telegram_notifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_notifications" ADD CONSTRAINT "telegram_notifications_incomingEmailId_fkey" FOREIGN KEY ("incomingEmailId") REFERENCES "incoming_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;
