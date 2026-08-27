ALTER TABLE "ticket_replies" ADD COLUMN "readAt" TIMESTAMP(3);

UPDATE "ticket_replies"
SET "readAt" = CURRENT_TIMESTAMP
WHERE "isFromStudent" = true;

CREATE INDEX "ticket_replies_ticketId_isFromStudent_readAt_idx"
ON "ticket_replies"("ticketId", "isFromStudent", "readAt");
