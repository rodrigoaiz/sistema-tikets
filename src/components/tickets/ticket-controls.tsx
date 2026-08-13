"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTicket } from "@/lib/actions/tickets";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/constants";
import type { Priority, TicketStatus } from "@prisma/client";

type Category = { id: string; label: string };

export function TicketControls({
  ticketId,
  status,
  priority,
  categoryId,
  categories,
}: {
  ticketId: string;
  status: TicketStatus;
  priority: Priority;
  categoryId: string | null;
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleUpdate(payload: {
    status?: TicketStatus;
    priority?: Priority;
    categoryId?: string | null;
  }) {
    startTransition(async () => {
      const result = await updateTicket({ ticketId, ...payload });
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Estado</span>
        <Select
          value={status}
          disabled={isPending}
          onValueChange={(v) => handleUpdate({ status: v as TicketStatus })}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string | null) =>
                value ? STATUS_LABEL[value as TicketStatus] ?? value : "Estado"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Prioridad</span>
        <Select
          value={priority}
          disabled={isPending}
          onValueChange={(v) => handleUpdate({ priority: v as Priority })}
        >
          <SelectTrigger className="w-full">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Categoría</span>
        <Select
          value={categoryId ?? "NONE"}
          disabled={isPending}
          onValueChange={(v) => handleUpdate({ categoryId: v === "NONE" ? null : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string | null) => {
                if (!value || value === "NONE") return "Sin categoría";
                return categories.find((category) => category.id === value)?.label ?? "Categoría";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Sin categoría</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
