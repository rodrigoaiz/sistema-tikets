"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTicket } from "@/lib/actions/tickets";

export function DeleteTicketButton({ ticketNumber, ticketId }: { ticketNumber: number; ticketId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTicket(ticketId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`Ticket #${ticketNumber} eliminado.`);
      setOpen(false);
      router.push("/tickets");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" disabled={isPending} />}>
        <Trash2 className="size-3.5" />
        Eliminar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar el ticket #{ticketNumber}?</DialogTitle>
          <DialogDescription>
            Esta acción es permanente. Se eliminarán el ticket, sus respuestas y sus archivos adjuntos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Eliminar permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
