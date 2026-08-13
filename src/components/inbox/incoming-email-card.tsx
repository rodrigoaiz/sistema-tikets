"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABEL } from "@/lib/constants";
import {
  convertEmailToTicket,
  discardEmail,
  replyToIncomingEmail,
} from "@/lib/actions/incoming-emails";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ticket as TicketIcon, Reply, Archive, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Priority } from "@prisma/client";

type Category = { id: string; label: string };

export function IncomingEmailCard({
  email,
  categories,
}: {
  email: {
    id: string;
    fromEmail: string;
    fromName: string | null;
    subject: string;
    bodyText: string;
    receivedAt: Date;
  };
  categories: Category[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [replying, setReplying] = useState(false);
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
        setReplying(false);
        toast.success("Respuesta enviada, sin crear ticket.");
      }
    });
  }

  function handleDiscard() {
    startTransition(async () => {
      const result = await discardEmail(email.id);
      if (!result.ok) toast.error(result.error);
      else toast("Correo descartado.");
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

      {expanded ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-3">
          <Select value={priority} onValueChange={(v) => v && setPriority(v as Priority)}>
            <SelectTrigger size="sm" className="w-32">
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
            <SelectTrigger size="sm" className="w-44">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleConvert} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
            Cancelar
          </Button>
        </div>
      ) : replying ? (
        <div className="mt-3 rounded-md bg-muted/50 p-3">
          <textarea
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={4}
            placeholder="Escribe una respuesta breve para el alumno…"
            className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleReply} disabled={isPending || !replyBody.trim()}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Enviar respuesta
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={() => setExpanded(true)} disabled={isPending}>
            <TicketIcon className="size-3.5" />
            Convertir en ticket
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReplying(true)} disabled={isPending}>
            <Reply className="size-3.5" />
            Responder sin ticket
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={isPending}>
            <Archive className="size-3.5" />
            Descartar
          </Button>
        </div>
      )}
    </div>
  );
}
