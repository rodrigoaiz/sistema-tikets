import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketTable } from "@/components/tickets/ticket-table";
import { TicketKanban, type KanbanTicket } from "@/components/tickets/ticket-kanban";
import {
  getFilteredTickets,
  getActiveCategories,
  type TicketSort,
} from "@/lib/tickets";
import type { Priority, TicketStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  priority?: string;
  categoryId?: string;
  q?: string;
  view?: string;
  sort?: string;
};

const TICKET_SORTS: TicketSort[] = [
  "newest",
  "oldest",
  "updated",
  "status",
  "category",
  "priority",
];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sort = TICKET_SORTS.includes(params.sort as TicketSort)
    ? (params.sort as TicketSort)
    : "newest";

  const [tickets, categories] = await Promise.all([
    getFilteredTickets({
      status: (params.status as TicketStatus) ?? "ALL",
      priority: (params.priority as Priority) ?? "ALL",
      categoryId: params.categoryId ?? "ALL",
      q: params.q,
      sort,
    }),
    getActiveCategories(),
  ]);

  const view = params.view === "kanban" ? "kanban" : "table";

  return (
    <div>
      <PageHeader
        title="Tickets"
        description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"} con estos filtros.`}
        actions={
          <Button size="sm" render={<Link href="/tickets/new" />}>
            <Plus className="size-4" />
            Nuevo ticket
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <Suspense>
          <TicketFilters categories={categories} />
        </Suspense>
        <Suspense>
          <ViewToggle />
        </Suspense>
      </div>

      {view === "kanban" ? (
        <TicketKanban
          tickets={tickets.map((ticket): KanbanTicket => ({
            id: ticket.id,
            number: ticket.number,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            categoryLabel: ticket.category?.label ?? null,
            updatedAt: ticket.updatedAt.toISOString(),
            unreadCount: ticket._count.replies,
          }))}
        />
      ) : (
        <TicketTable tickets={tickets} />
      )}
    </div>
  );
}
