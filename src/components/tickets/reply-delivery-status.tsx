"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTicketReplyEmail } from "@/lib/actions/tickets";

export function ReplyDeliveryStatus({ replyId }: { replyId: string }) {
  const [isPending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      const result = await sendTicketReplyEmail(replyId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Respuesta enviada por correo.");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={retry}
      disabled={isPending}
      className="ml-auto text-amber-700 dark:text-amber-400"
    >
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      No enviado. Reintentar
    </Button>
  );
}
