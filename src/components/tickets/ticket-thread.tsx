import { StickyNote, Mail } from "lucide-react";
import { AttachmentList } from "@/components/tickets/attachment-list";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TicketReply, User, Attachment } from "@prisma/client";

type ReplyItem = TicketReply & { author: User | null; attachments: Attachment[] };

export function TicketThread({ replies }: { replies: ReplyItem[] }) {
  if (replies.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Aún no hay respuestas ni notas en este ticket.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {replies.map((reply) => (
        <li
          key={reply.id}
          className={cn(
            "rounded-lg border p-4",
            reply.isInternalNote
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-border bg-card"
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {reply.isInternalNote ? (
              <StickyNote className="size-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Mail className="size-3.5" />
            )}
            <span className="font-medium text-foreground">
              {reply.author?.name ?? "Sistema"}
            </span>
            <span>·</span>
            <span>{format(reply.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</span>
            {reply.isInternalNote ? (
              <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Nota interna
              </span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm">{reply.body}</p>
          <AttachmentList attachments={reply.attachments} className="mt-3" />
        </li>
      ))}
    </ol>
  );
}
