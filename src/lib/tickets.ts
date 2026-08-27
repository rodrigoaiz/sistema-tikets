import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, Priority, TicketStatus } from "@prisma/client";

export type TicketSort = "newest" | "oldest" | "updated" | "status" | "category" | "priority";

export type TicketFilters = {
  status?: TicketStatus | "ALL";
  priority?: Priority | "ALL";
  categoryId?: string | "ALL";
  q?: string;
  sort?: TicketSort;
};

function getTicketOrderBy(sort: TicketSort = "newest"): Prisma.TicketOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "updated":
      return [{ updatedAt: "desc" }];
    case "status":
      return [{ status: "asc" }, { updatedAt: "desc" }];
    case "category":
      return [{ category: { label: "asc" } }, { updatedAt: "desc" }];
    case "priority":
      return [{ priority: "desc" }, { updatedAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

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
    include: {
      category: true,
      assignedTo: true,
      _count: {
        select: {
          replies: { where: { isFromStudent: true, readAt: null } },
        },
      },
    },
    orderBy: getTicketOrderBy(filters.sort),
  });
}

export async function getActiveCategories() {
  return prisma.category.findMany({ where: { active: true }, orderBy: { order: "asc" } });
}
