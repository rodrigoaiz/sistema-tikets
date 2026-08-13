import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint ligero para notificaciones en el navegador. El cliente hace
 * polling cada cierto tiempo pasando `since` (ISO date) y recibe los tickets
 * creados después de esa fecha, para poder disparar una notificación local.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60_000);

  const [newTickets, pendingEmails] = await Promise.all([
    prisma.ticket.findMany({
      where: { createdAt: { gt: sinceDate } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, number: true, subject: true, priority: true, studentEmail: true },
    }),
    prisma.incomingEmail.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    newTickets,
    pendingEmailsCount: pendingEmails,
  });
}
