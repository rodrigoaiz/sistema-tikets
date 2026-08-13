"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTicket } from "@/lib/actions/tickets";
import {
  PRIORITY_BADGE_CLASS,
  PRIORITY_DOT_CLASS,
  PRIORITY_LABEL,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Priority } from "@prisma/client";

/**
 * El select nativo es intencional: conserva el pill visual, pero evita que un
 * menú compuesto interfiera con el drag-and-drop de la tarjeta.
 */
export function EditablePriorityBadge({
  priority,
  ticketId,
}: {
  priority: Priority;
  ticketId: string;
}) {
  const [currentPriority, setCurrentPriority] = useState(priority);
  const [isPending, startTransition] = useTransition();

  function changePriority(nextValue: string) {
    const nextPriority = nextValue as Priority;
    if (nextPriority === currentPriority) return;

    const previousPriority = currentPriority;
    setCurrentPriority(nextPriority);

    startTransition(async () => {
      const result = await updateTicket({ ticketId, priority: nextPriority });
      if (!result.ok) {
        setCurrentPriority(previousPriority);
        toast.error(result.error);
        return;
      }
      toast.success("Prioridad actualizada.");
    });
  }

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
        PRIORITY_BADGE_CLASS[currentPriority],
        isPending && "opacity-60"
      )}
    >
      <span className={cn("size-1.5 rounded-full", PRIORITY_DOT_CLASS[currentPriority])} />
      {PRIORITY_LABEL[currentPriority]}
      <select
        value={currentPriority}
        onChange={(event) => changePriority(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onDragStart={(event) => event.stopPropagation()}
        disabled={isPending}
        aria-label={`Prioridad ${PRIORITY_LABEL[currentPriority]}. Selecciona para cambiarla.`}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-wait"
      >
        {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </span>
  );
}
