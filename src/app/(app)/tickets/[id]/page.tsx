import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveCategories } from "@/lib/tickets";
import { PriorityBadge, StatusBadge } from "@/components/ticket-badges";
import { TicketControls } from "@/components/tickets/ticket-controls";
import { AttachmentList } from "@/components/tickets/attachment-list";
import { TicketThread } from "@/components/tickets/ticket-thread";
import { TicketReplyForm } from "@/components/tickets/ticket-reply-form";
import { SOURCE_LABEL } from "@/lib/constants";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ticket, categories] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        attachments: true,
        replies: {
          include: { author: true, attachments: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getActiveCategories(),
  ]);

  if (!ticket) {
    notFound();
  }

  const categoryOptions = ticket.category && !categories.some((category) => category.id === ticket.categoryId)
    ? [ticket.category, ...categories]
    : categories;

  return (
    <div className="max-w-3xl">
      <Link
        href="/tickets"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Tickets
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>#{ticket.number}</span>
            <span>·</span>
            <span>{SOURCE_LABEL[ticket.source]}</span>
            <span>·</span>
            <span>{format(ticket.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="mb-5 grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Alumno</span>
          <p className="text-sm">{ticket.studentName || "—"}</p>
          <p className="text-sm text-muted-foreground">{ticket.studentEmail}</p>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Categoría</span>
          <p className="text-sm">{ticket.category?.label ?? "Sin categoría"}</p>
        </div>
      </div>

      <div className="mb-5">
        <TicketControls
          ticketId={ticket.id}
          status={ticket.status}
          priority={ticket.priority}
          categoryId={ticket.categoryId}
          categories={categoryOptions.map((c) => ({ id: c.id, label: c.label }))}
        />
      </div>

      <div className="mb-6 rounded-lg border border-border p-4">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">
          Descripción del problema
        </span>
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
        <AttachmentList attachments={ticket.attachments} className="mt-3" />
      </div>

      <h2 className="mb-3 text-sm font-medium">Conversación</h2>
      <div className="mb-4">
        <TicketThread replies={ticket.replies} />
      </div>

      <TicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
