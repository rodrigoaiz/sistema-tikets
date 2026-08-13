import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, formatISO } from "date-fns";

export async function getDashboardData() {
  const now = new Date();
  const trendStart = startOfDay(subDays(now, 13));

  const [
    openCount,
    inProgressCount,
    closedTodayCount,
    highPendingCount,
    byCategory,
    recentTickets,
    trendTickets,
    totalActive,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({
      where: { status: "CLOSED", closedAt: { gte: startOfDay(now) } },
    }),
    prisma.ticket.count({
      where: { priority: "HIGH", status: { not: "CLOSED" } },
    }),
    prisma.ticket.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      where: { status: { not: "CLOSED" } },
    }),
    prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { category: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
    prisma.ticket.count({ where: { status: { not: "CLOSED" } } }),
  ]);

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  const categoryMap = new Map(categories.map((c) => [c.id, c.label]));

  const categoryChartData = byCategory
    .map((row) => ({
      category: row.categoryId ? categoryMap.get(row.categoryId) ?? "Otro" : "Sin categoría",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  // Tendencia: tickets creados por día en los últimos 14 días.
  const trendMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const day = formatISO(subDays(now, 13 - i), { representation: "date" });
    trendMap.set(day, 0);
  }
  for (const t of trendTickets) {
    const day = formatISO(t.createdAt, { representation: "date" });
    if (trendMap.has(day)) {
      trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
    }
  }
  const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

  const statusChartData = [
    { status: "Abierto", count: openCount },
    { status: "En progreso", count: inProgressCount },
    { status: "Cerrado", count: await prisma.ticket.count({ where: { status: "CLOSED" } }) },
  ];

  return {
    kpis: {
      openCount,
      inProgressCount,
      closedTodayCount,
      highPendingCount,
      totalActive,
    },
    categoryChartData,
    trendData,
    statusChartData,
    recentTickets,
  };
}
