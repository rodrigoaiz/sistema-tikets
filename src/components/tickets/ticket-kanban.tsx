"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicket } from "@/lib/actions/tickets";
import { EditableKanbanCard } from "@/components/tickets/editable-kanban-card";
import { Button } from "@/components/ui/button";
import type { Priority, TicketStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export type KanbanTicket = {
  id: string;
  number: number;
  subject: string;
  priority: Priority;
  status: TicketStatus;
  categoryLabel: string | null;
  updatedAt: string;
  unreadCount: number;
};

const COLUMNS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

const COLUMN_ACCENT: Record<TicketStatus, string> = {
  OPEN: "bg-sky-500",
  IN_PROGRESS: "bg-amber-500",
  CLOSED: "bg-muted-foreground/40",
};

const CLOSED_PREVIEW_LIMIT = 4;

export function TicketKanban({ tickets }: { tickets: KanbanTicket[] }) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TicketStatus | null>(null);
  const [showAllClosed, setShowAllClosed] = useState(false);
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
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {COLUMNS.map((status) => {
        const allColumnTickets = visibleTickets
          .filter((ticket) => ticket.status === status)
          .sort((a, b) =>
            status === "CLOSED" ? b.updatedAt.localeCompare(a.updatedAt) : 0
          );
        const hasHiddenClosed =
          status === "CLOSED" && allColumnTickets.length > CLOSED_PREVIEW_LIMIT;
        const columnTickets =
          hasHiddenClosed && !showAllClosed
            ? allColumnTickets.slice(0, CLOSED_PREVIEW_LIMIT)
            : allColumnTickets;
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
              status === "CLOSED" && "bg-muted/15 lg:col-span-2 xl:col-span-1",
              overColumn === status && "border-primary/60 bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className={cn("size-2 rounded-full", COLUMN_ACCENT[status])} />
              <span className="text-sm font-medium">{STATUS_LABEL[status]}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                 {allColumnTickets.length}
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
              {hasHiddenClosed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllClosed((current) => !current)}
                  className="mt-1 w-full text-muted-foreground"
                >
                  {showAllClosed ? <ChevronUp /> : <ChevronDown />}
                  {showAllClosed
                    ? `Mostrar solo los ${CLOSED_PREVIEW_LIMIT} más recientes`
                    : `Ver ${allColumnTickets.length - CLOSED_PREVIEW_LIMIT} cerrados anteriores`}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
