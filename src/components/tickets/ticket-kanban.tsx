"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicket } from "@/lib/actions/tickets";
import { EditableKanbanCard } from "@/components/tickets/editable-kanban-card";
import type { Priority, TicketStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type KanbanTicket = {
  id: string;
  number: number;
  subject: string;
  priority: Priority;
  status: TicketStatus;
  categoryLabel: string | null;
};

const COLUMNS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

const COLUMN_ACCENT: Record<TicketStatus, string> = {
  OPEN: "bg-sky-500",
  IN_PROGRESS: "bg-amber-500",
  CLOSED: "bg-muted-foreground/40",
};

export function TicketKanban({ tickets }: { tickets: KanbanTicket[] }) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TicketStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleTickets, moveTicket] = useOptimistic(
    tickets,
    (currentTickets: KanbanTicket[], action: { ticketId: string; status: TicketStatus }) =>
      currentTickets.map((ticket) =>
        ticket.id === action.ticketId ? { ...ticket, status: action.status } : ticket
      )
  );

  function handleDrop(status: TicketStatus, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const ticketId = event.dataTransfer.getData("text/plain");
    const ticket = visibleTickets.find((item) => item.id === ticketId);
    setOverColumn(null);
    setDraggingId(null);

    if (!ticket || ticket.status === status) return;

    startTransition(async () => {
      moveTicket({ ticketId, status });
      const result = await updateTicket({ ticketId, status });
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      toast.success(`Ticket movido a ${STATUS_LABEL[status].toLowerCase()}.`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((status) => {
        const columnTickets = visibleTickets.filter((ticket) => ticket.status === status);
        return (
          <div
            key={status}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOverColumn(status);
            }}
            onDragLeave={() => setOverColumn((current) => (current === status ? null : current))}
            onDrop={(event) => handleDrop(status, event)}
            className={cn(
              "flex min-h-64 flex-col rounded-lg border border-border transition-colors",
              overColumn === status && "border-primary/60 bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className={cn("size-2 rounded-full", COLUMN_ACCENT[status])} />
              <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {columnTickets.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {columnTickets.map((ticket) => (
                <EditableKanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  isDragging={draggingId === ticket.id || isPending && draggingId === ticket.id}
                  onDragStart={setDraggingId}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverColumn(null);
                  }}
                />
              ))}
              {columnTickets.length === 0 ? (
                <p className="flex min-h-24 flex-1 items-center justify-center px-2 py-6 text-center text-xs text-muted-foreground">
                  {overColumn === status ? "Suelta aquí" : "Sin tickets"}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
