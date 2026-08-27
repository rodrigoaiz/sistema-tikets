"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addTicketReply, sendTicketReplyEmail } from "@/lib/actions/tickets";
import { uploadReplyAttachment } from "@/lib/actions/attachments";
import { Loader2, Paperclip, X, StickyNote, Mail } from "lucide-react";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (body.trim().length === 0) return;

    startTransition(async () => {
      const result = await addTicketReply({
        ticketId,
        body,
        isInternalNote: mode === "note",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      let attachmentFailed = false;
      for (const file of files) {
        const uploadResult = await uploadReplyAttachment(ticketId, result.data.replyId, file);
        if (!uploadResult.ok) {
          attachmentFailed = true;
          toast.error(`No se pudo adjuntar "${file.name}": ${uploadResult.error}`);
        }
      }

      setBody("");
      setFiles([]);

      if (mode === "note") {
        toast.success("Nota interna agregada.");
        return;
      }

      if (attachmentFailed) {
        toast.error("La respuesta se guardó, pero no se envió porque falló un adjunto.");
        return;
      }

      const sendResult = await sendTicketReplyEmail(result.data.replyId);
      if (!sendResult.ok) {
        toast.error(`La respuesta se guardó, pero no se envió. ${sendResult.error}`);
        return;
      }

      toast.success("Respuesta enviada por correo.");
    });
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "reply" | "note")}>
        <TabsList>
          <TabsTrigger value="reply">
            <Mail className="size-3.5" />
            Respuesta
          </TabsTrigger>
          <TabsTrigger value="note">
            <StickyNote className="size-3.5" />
            Nota interna
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          mode === "note"
            ? "Nota interna — no se envía al alumno. Útil para dejar contexto a otros agentes."
            : "Escribe la respuesta que se enviará al correo del alumno."
        }
        rows={4}
        className="mt-3"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Paperclip className="size-3.5" />
          Adjuntar
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
            className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
        </label>

        <Button size="sm" onClick={handleSubmit} disabled={isPending || body.trim().length === 0}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "note" ? "Guardar nota" : "Enviar respuesta"}
        </Button>
      </div>

      {files.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-1 text-xs"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
