import { Headphones, MailCheck, StickyNote, UserRound } from "lucide-react";
import { AttachmentList } from "@/components/tickets/attachment-list";
import { ReplyDeliveryStatus } from "@/components/tickets/reply-delivery-status";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TicketReply, User, Attachment } from "@prisma/client";

type ReplyItem = TicketReply & { author: User | null; attachments: Attachment[] };

type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  sender: string;
  kind: "student" | "agent" | "note";
  attachments: Attachment[];
  receivedViaEmail?: boolean;
  sentViaEmail?: boolean;
  isAutoCloseNotice?: boolean;
  replyId?: string;
};

export function TicketThread({
  initialMessage,
  replies,
}: {
  initialMessage: {
    body: string;
    createdAt: Date;
    studentName: string | null;
    attachments: Attachment[];
    receivedViaEmail: boolean;
  };
  replies: ReplyItem[];
}) {
  const studentName = initialMessage.studentName || "Alumno";
  const messages: ChatMessage[] = [
    {
      id: "initial-message",
      body: initialMessage.body,
      createdAt: initialMessage.createdAt,
      sender: studentName,
      kind: "student",
      attachments: initialMessage.attachments,
      receivedViaEmail: initialMessage.receivedViaEmail,
    },
    ...replies.map((reply): ChatMessage => ({
      id: reply.id,
      body: reply.body,
      createdAt: reply.createdAt,
      sender: reply.isFromStudent
        ? studentName
        : reply.isAutoCloseNotice
          ? "Cierre automático"
          : (reply.author?.name ?? "Equipo de soporte"),
      kind: reply.isInternalNote ? "note" : reply.isFromStudent ? "student" : "agent",
      attachments: reply.attachments,
      sentViaEmail: reply.sentViaEmail,
      isAutoCloseNotice: reply.isAutoCloseNotice,
      replyId: reply.id,
      receivedViaEmail: reply.isFromStudent,
    })),
  ];

  return (
    <ol className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-3 sm:p-5">
      {messages.map((message) => {
        const isStudent = message.kind === "student";
        const isNote = message.kind === "note";
        const isSentAgent = message.kind === "agent" && message.sentViaEmail;

        if (isNote) {
          return (
            <li key={message.id} className="mx-auto w-full max-w-[85%] sm:max-w-[70%]">
              <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-3 text-amber-950 dark:text-amber-100">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5 text-xs text-amber-800/75 dark:text-amber-200/70">
                  <StickyNote className="size-3.5" />
                  <span className="font-medium">Nota interna de {message.sender}</span>
                  <span aria-hidden="true">·</span>
                  <time>{format(message.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                <AttachmentList attachments={message.attachments} className="mt-3 justify-center" />
              </div>
            </li>
          );
        }

        return (
          <li
            key={message.id}
            className={cn("flex w-full items-end gap-2.5", isStudent ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border",
                isStudent
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "order-2 border-primary/20 bg-primary/10 text-primary"
              )}
              aria-hidden="true"
            >
              {isStudent ? <UserRound className="size-4" /> : <Headphones className="size-4" />}
            </div>

            <div
              className={cn(
                "min-w-0 max-w-[82%] rounded-2xl border px-4 py-3 sm:max-w-[72%]",
                isStudent
                  ? "rounded-bl-sm border-blue-500/20 bg-blue-500/8"
                  : isSentAgent
                    ? "rounded-br-sm border-primary bg-primary text-primary-foreground"
                    : "rounded-br-sm border-amber-500/25 bg-amber-500/8"
              )}
            >
              <div
                className={cn(
                  "mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs",
                  isSentAgent ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                <span className={cn("font-semibold", isSentAgent && "text-primary-foreground")}>
                  {message.sender}
                </span>
                <span aria-hidden="true">·</span>
                <time>{format(message.createdAt, "d MMM yyyy, HH:mm", { locale: es })}</time>
                {isStudent ? (
                  <span className="ml-auto text-blue-700 dark:text-blue-300">
                    {message.receivedViaEmail ? "Recibido por correo" : "Mensaje inicial"}
                  </span>
                ) : message.sentViaEmail ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-primary-foreground/80">
                    <MailCheck className="size-3.5" />
                    Enviado
                  </span>
                ) : message.replyId ? (
                  <ReplyDeliveryStatus replyId={message.replyId} />
                ) : null}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
              <AttachmentList
                attachments={message.attachments}
                className="mt-3"
                tone={isSentAgent ? "inverse" : "default"}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
