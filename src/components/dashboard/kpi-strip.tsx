import { cn } from "@/lib/utils";

export function KpiStrip({
  items,
}: {
  items: Array<{ label: string; value: number; hint?: string; tone?: "default" | "urgent" }>;
}) {
  return (
    <div className="grid grid-cols-2 divide-y divide-border rounded-lg border border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          <span
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums tracking-tight",
              item.tone === "urgent" && item.value > 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {item.value}
          </span>
          {item.hint ? (
            <span className="text-[11px] text-muted-foreground">{item.hint}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
