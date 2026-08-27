import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge, StatusBadge } from "@/components/ticket-badges";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Ticket, Category, User } from "@prisma/client";

type TicketRow = Ticket & {
  category: Category | null;
  assignedTo: User | null;
  _count: { replies: number };
};

export function TicketTable({ tickets }: { tickets: TicketRow[] }) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No hay tickets que coincidan con estos filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border lg:hidden">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="flex min-w-0 flex-col gap-2.5 p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-muted-foreground">#{ticket.number}</span>
              <div className="flex items-center gap-2">
                {ticket._count.replies > 0 ? (
                  <Badge variant="destructive">
                    <Mail />
                    {ticket._count.replies} {ticket._count.replies === 1 ? "nuevo" : "nuevos"}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {format(ticket.updatedAt, "d MMM", { locale: es })}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{ticket.subject}</p>
              <p className="truncate text-xs text-muted-foreground">{ticket.studentEmail}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {ticket.category?.label ?? "Sin categoría"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-18 pl-3">Folio</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead className="w-[18%]">Categoría</TableHead>
              <TableHead className="w-26">Prioridad</TableHead>
              <TableHead className="w-30">Estado</TableHead>
              <TableHead className="w-24">Actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} className="group">
                <TableCell className="p-0">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="block px-3 py-3 font-mono text-xs text-muted-foreground group-hover:text-foreground"
                  >
                    #{ticket.number}
                  </Link>
                </TableCell>
                <TableCell className="min-w-0 p-0">
                  <Link href={`/tickets/${ticket.id}`} className="block min-w-0 px-2 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold">{ticket.subject}</span>
                      {ticket._count.replies > 0 ? (
                        <Badge variant="destructive" className="shrink-0">
                          <Mail />
                          {ticket._count.replies} {ticket._count.replies === 1 ? "nuevo" : "nuevos"}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ticket.studentEmail}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="block truncate px-2 py-3 text-xs text-muted-foreground"
                  >
                    {ticket.category?.label ?? "Sin categoría"}
                  </Link>
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(ticket.updatedAt, "d MMM", { locale: es })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
