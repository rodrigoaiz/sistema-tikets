"use client";

import { startTransition, useEffect } from "react";
import { markTicketMessagesRead } from "@/lib/actions/tickets";

export function MarkTicketRead({
  ticketId,
  unreadCount,
}: {
  ticketId: string;
  unreadCount: number;
}) {
  useEffect(() => {
    if (unreadCount === 0) return;

    startTransition(async () => {
      await markTicketMessagesRead(ticketId);
    });
  }, [ticketId, unreadCount]);

  return null;
}
