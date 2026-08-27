"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { EditablePriorityBadge } from "@/components/tickets/editable-priority-badge";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import type { Priority, TicketStatus } from "@prisma/client";

export function EditableKanbanCard({
  ticket,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  ticket: {
    id: string;
    number: number;
    subject: string;
    priority: Priority;
    status: TicketStatus;
    categoryLabel: string | null;
    unreadCount: number;
  };
  isDragging: boolean;
  onDragStart: (ticketId: string) => void;
  onDragEnd: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", ticket.id);
        onDragStart(ticket.id);
      }}
      onDragEnd={onDragEnd}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border border-border bg-card p-3 transition-[opacity,box-shadow,border-color] active:cursor-grabbing hover:border-ring",
        isDragging && "opacity-45 shadow-lg",
        isFocused && "ring-2 ring-ring/30"
      )}
      aria-label={`Ticket #${ticket.number}: ${ticket.subject}. Arrastra para cambiar su estado.`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tickets/${ticket.id}`}
          className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          #{ticket.number}
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {ticket.unreadCount > 0 ? (
            <Badge variant="destructive" title="Mensajes nuevos del alumno">
              <Mail />
              {ticket.unreadCount} {ticket.unreadCount === 1 ? "nuevo" : "nuevos"}
            </Badge>
          ) : null}
          <EditablePriorityBadge priority={ticket.priority} ticketId={ticket.id} />
        </div>
      </div>

      <Link
        href={`/tickets/${ticket.id}`}
        className="line-clamp-2 text-sm font-medium"
        onClick={(event) => event.stopPropagation()}
      >
        {ticket.subject}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {ticket.categoryLabel ?? "Sin categoría"}
      </p>
    </article>
  );
}
