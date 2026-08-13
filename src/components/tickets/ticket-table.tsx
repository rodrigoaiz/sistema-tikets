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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Ticket, Category, User } from "@prisma/client";

type TicketRow = Ticket & { category: Category | null; assignedTo: User | null };

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
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Folio</TableHead>
            <TableHead>Asunto</TableHead>
            <TableHead className="w-44">Alumno</TableHead>
            <TableHead className="w-44">Categoría</TableHead>
            <TableHead className="w-28">Prioridad</TableHead>
            <TableHead className="w-32">Estado</TableHead>
            <TableHead className="w-28">Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} className="group">
              <TableCell className="p-0">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="block px-4 py-2.5 font-mono text-xs text-muted-foreground group-hover:text-foreground"
                >
                  #{ticket.number}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="block truncate px-4 py-2.5 text-sm font-medium"
                >
                  {ticket.subject}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="block truncate px-4 py-2.5 text-xs text-muted-foreground"
                >
                  {ticket.studentEmail}
                </Link>
              </TableCell>
              <TableCell className="p-0">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="block truncate px-4 py-2.5 text-xs text-muted-foreground"
                >
                  {ticket.category?.label ?? "—"}
                </Link>
              </TableCell>
              <TableCell>
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(ticket.createdAt, "d MMM", { locale: es })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
