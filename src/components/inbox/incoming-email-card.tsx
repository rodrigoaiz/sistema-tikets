"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AttachmentList } from "@/components/tickets/attachment-list";
import { PRIORITY_LABEL } from "@/lib/constants";
import {
  convertEmailToTicket,
  discardEmail,
  replyToIncomingEmail,
  restoreDiscardedEmail,
} from "@/lib/actions/incoming-emails";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Ticket as TicketIcon,
  Reply,
  Archive,
  Loader2,
  Send,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Priority } from "@prisma/client";

type Category = { id: string; label: string };
type EmailAttachment = { id: string; filename: string; mimeType: string; size: number };

export function IncomingEmailCard({
  email,
  categories,
  archived = false,
}: {
  email: {
    id: string;
    fromEmail: string;
    fromName: string | null;
    subject: string;
    bodyText: string;
    receivedAt: Date;
    attachments: EmailAttachment[];
  };
  categories: Category[];
  archived?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "reply" | "convert">("idle");
  const [replyBody, setReplyBody] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function handleConvert() {
    startTransition(async () => {
      const result = await convertEmailToTicket({
        incomingEmailId: email.id,
        priority,
        categoryId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Ticket #${result.data.number} creado.`);
      setOpen(false);
      router.push(`/tickets/${result.data.ticketId}`);
    });
  }

  function handleReply() {
    startTransition(async () => {
      const result = await replyToIncomingEmail({
        incomingEmailId: email.id,
        body: replyBody,
      });
      if (!result.ok) toast.error(result.error);
      else {
        setReplyBody("");
        setMode("idle");
        setOpen(false);
        toast.success("Respuesta enviada, sin crear ticket.");
      }
    });
  }

  function handleDiscard() {
    startTransition(async () => {
      const result = await discardEmail(email.id);
      if (!result.ok) toast.error(result.error);
      else {
        setOpen(false);
        toast("Correo descartado.");
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreDiscardedEmail(email.id);
      if (!result.ok) toast.error(result.error);
      else {
        setOpen(false);
        toast.success("Correo restaurado en la bandeja de entrada.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{email.subject || "(sin asunto)"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {email.fromName ? `${email.fromName} · ` : ""}
            {email.fromEmail}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(email.receivedAt, "d MMM, HH:mm", { locale: es })}
        </span>
      </div>

      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{email.bodyText}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setMode("idle");
          }}
        >
          <DialogTrigger
            render={<Button size="sm" variant="outline" disabled={isPending} />}
          >
            <Eye className="size-3.5" />
            Ver mensaje completo
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
              <DialogTitle className="truncate pr-2">
                {email.subject || "(sin asunto)"}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>{email.fromName || "Remitente desconocido"}</span>
                <span aria-hidden="true">·</span>
                <span>{email.fromEmail}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={email.receivedAt.toISOString()}>
                  {format(email.receivedAt, "d MMM yyyy, HH:mm", { locale: es })}
                </time>
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <article className="rounded-lg border border-border bg-background/60 p-4 sm:p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                  {email.bodyText || "Este correo no contiene texto visible."}
                </p>
                <AttachmentList attachments={email.attachments} className="mt-5" />
              </article>
            </div>

            {mode === "reply" && !archived ? (
              <div className="shrink-0 border-t bg-muted/30 px-5 py-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Responder sin crear ticket
                </p>
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={4}
                  placeholder="Escribe una respuesta para el alumno…"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleReply} disabled={isPending || !replyBody.trim()}>
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Enviar respuesta
                  </Button>
                </div>
              </div>
            ) : mode === "convert" && !archived ? (
              <div className="shrink-0 border-t bg-muted/30 px-5 py-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Configura el ticket antes de crearlo
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={priority} onValueChange={(v) => v && setPriority(v as Priority)}>
                    <SelectTrigger size="sm" className="w-full sm:w-32">
                      <SelectValue>
                        {(value: string | null) =>
                          value ? PRIORITY_LABEL[value as Priority] ?? value : "Prioridad"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? undefined)}>
                    <SelectTrigger size="sm" className="w-full sm:w-44">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2 sm:ml-auto">
                    <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleConvert} disabled={isPending}>
                      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Crear ticket
                    </Button>
                  </div>
                </div>
              </div>
            ) : archived ? (
              <div className="flex shrink-0 justify-end border-t bg-muted/30 px-5 py-4">
                <Button size="sm" onClick={handleRestore} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  Restaurar en bandeja
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={isPending}>
                  <Archive className="size-3.5" />
                  Descartar
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMode("reply")}
                    disabled={isPending}
                  >
                    <Reply className="size-3.5" />
                    Responder sin ticket
                  </Button>
                  <Button size="sm" onClick={() => setMode("convert")} disabled={isPending}>
                    <TicketIcon className="size-3.5" />
                    Convertir en ticket
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {archived ? (
          <Button size="sm" variant="ghost" onClick={handleRestore} disabled={isPending}>
            <RotateCcw className="size-3.5" />
            Restaurar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={isPending}>
            <Archive className="size-3.5" />
            Descartar
          </Button>
        )}
      </div>
    </div>
  );
}
