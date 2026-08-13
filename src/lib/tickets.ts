import "server-only";
import { prisma } from "@/lib/prisma";
import type { Priority, TicketStatus } from "@prisma/client";

export type TicketFilters = {
  status?: TicketStatus | "ALL";
  priority?: Priority | "ALL";
  categoryId?: string | "ALL";
  q?: string;
};

export async function getFilteredTickets(filters: TicketFilters) {
  const where: Record<string, unknown> = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }
  if (filters.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }
  if (filters.categoryId && filters.categoryId !== "ALL") {
    where.categoryId = filters.categoryId;
  }
  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim();
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { studentEmail: { contains: q, mode: "insensitive" } },
      { studentName: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.ticket.findMany({
    where,
    include: { category: true, assignedTo: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getActiveCategories() {
  return prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } });
}
