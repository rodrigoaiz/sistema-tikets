-- CreateEnum
CREATE TYPE "TicketAutoCloseAttemptStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "ticket_replies"
ADD COLUMN "isAutoCloseNotice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mailbox_configs"
ADD COLUMN "autoCloseEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoCloseAfterHours" INTEGER NOT NULL DEFAULT 48;

-- CreateTable
CREATE TABLE "ticket_auto_close_attempts" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "agentReplyId" TEXT NOT NULL,
    "status" "TicketAutoCloseAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_auto_close_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_auto_close_attempts_ticketId_agentReplyId_key"
ON "ticket_auto_close_attempts"("ticketId", "agentReplyId");

-- CreateIndex
CREATE INDEX "ticket_auto_close_attempts_status_nextAttemptAt_idx"
ON "ticket_auto_close_attempts"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "ticket_auto_close_attempts"
ADD CONSTRAINT "ticket_auto_close_attempts_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_auto_close_attempts"
ADD CONSTRAINT "ticket_auto_close_attempts_agentReplyId_fkey"
FOREIGN KEY ("agentReplyId") REFERENCES "ticket_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
