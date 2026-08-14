"use client";

import { Line, LineChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const chartConfig = {
  count: {
    label: "Tickets creados",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function TrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 min-w-0 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => format(parseISO(value), "d MMM", { locale: es })}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => format(parseISO(String(value)), "d 'de' MMMM", { locale: es })}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
