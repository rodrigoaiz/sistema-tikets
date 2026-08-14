"use client";

import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const STATUS_COLORS: Record<string, string> = {
  Abierto: "var(--chart-1)",
  "En progreso": "var(--chart-2)",
  Cerrado: "var(--chart-5)",
};

const chartConfig = {
  count: { label: "Tickets" },
} satisfies ChartConfig;

export function StatusDonutChart({
  data,
}: {
  data: Array<{ status: string; count: number }>;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <ChartContainer config={chartConfig} className="aspect-square h-32 w-32 shrink-0 sm:h-40 sm:w-40">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={44}
            outerRadius={68}
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "var(--chart-5)"} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="flex w-full min-w-0 flex-1 flex-col gap-2.5 sm:w-auto">
        {data.map((entry) => (
          <li key={entry.status} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "var(--chart-5)" }}
              />
              {entry.status}
            </span>
            <span className="font-mono tabular-nums">
              {entry.count}
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
