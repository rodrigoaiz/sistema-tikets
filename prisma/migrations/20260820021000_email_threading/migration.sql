ALTER TABLE "ticket_replies"
ADD COLUMN "isFromStudent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "outgoingMessageId" TEXT;

CREATE UNIQUE INDEX "ticket_replies_outgoingMessageId_key"
ON "ticket_replies"("outgoingMessageId");
