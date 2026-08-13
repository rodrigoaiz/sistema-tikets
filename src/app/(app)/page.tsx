import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { PageHeader } from "@/components/page-header";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { StatusDonutChart } from "@/components/dashboard/status-donut-chart";
import { PriorityBadge, StatusBadge } from "@/components/ticket-badges";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { kpis, categoryChartData, trendData, statusChartData, recentTickets } =
    await getDashboardData();

  return (
    <div>
      <PageHeader
        title="Inicio"
        description="Panorama general de soporte técnico del curso."
        actions={
          <Button size="sm" render={<Link href="/tickets/new" />}>
            <Plus className="size-4" />
            Nuevo ticket
          </Button>
        }
      />

      <KpiStrip
        items={[
          { label: "Abiertos", value: kpis.openCount },
          { label: "En progreso", value: kpis.inProgressCount },
          { label: "Resueltos hoy", value: kpis.closedTodayCount },
          {
            label: "Alta prioridad pendiente",
            value: kpis.highPendingCount,
            tone: "urgent",
          },
        ]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border border-border p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-medium">Tickets creados — últimos 14 días</h2>
          <TrendChart data={trendData} />
        </div>
        <div className="rounded-lg border border-border p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium">Distribución por estado</h2>
          <StatusDonutChart data={statusChartData} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border border-border p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium">Categorías con más tickets activos</h2>
          <CategoryChart data={categoryChartData} />
        </div>

        <div className="rounded-lg border border-border lg:col-span-3">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-medium">Tickets recientes</h2>
            <Link
              href="/tickets"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todos
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Aún no hay tickets. Crea el primero manualmente mientras se conecta el correo.
            </p>
          ) : (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Folio</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead className="w-28">Prioridad</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer">
                    <TableCell className="p-0">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="block px-4 py-2.5 font-mono text-xs text-muted-foreground"
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
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
