import { cn } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  PRIORITY_BADGE_CLASS,
  PRIORITY_DOT_CLASS,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
} from "@/lib/constants";
import type { Priority, TicketStatus } from "@prisma/client";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        PRIORITY_BADGE_CLASS[priority],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", PRIORITY_DOT_CLASS[priority])} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_BADGE_CLASS[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
