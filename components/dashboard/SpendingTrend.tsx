"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatINR, type MonthPoint } from "@/lib/mock-data";

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; dataKey?: string | number }>;
  label?: string | number;
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.dataKey === "income");
  const spending = payload.find((p) => p.dataKey === "spending");
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-stone-900">{label}</p>
      {income && (
        <p className="flex items-center gap-1.5 text-stone-500 tabular-nums">
          <span className="h-2 w-2 rounded-full bg-stone-300" />
          Income {formatINR(Number(income.value ?? 0))}
        </p>
      )}
      {spending && (
        <p className="flex items-center gap-1.5 text-stone-500 tabular-nums">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Spent {formatINR(Number(spending.value ?? 0))}
        </p>
      )}
    </div>
  );
}

function axisTick(value: number): string {
  return `₹${Math.round(value / 1000)}k`;
}

export function SpendingTrend({ trend }: { trend: MonthPoint[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <CardTitle>Spending Over Time</CardTitle>
            <CardDescription>
              Income vs. spending, last 6 months
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-4 pt-1 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-300" />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Spending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e7e5e4" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#78716c" }}
                dy={6}
              />
              <YAxis
                tickFormatter={axisTick}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#78716c" }}
                width={48}
              />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#a8a29e"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="#a8a29e"
                fillOpacity={0.08}
              />
              <Area
                type="monotone"
                dataKey="spending"
                stroke="#047857"
                strokeWidth={2.5}
                fill="#047857"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Partial first/last months reflect only the days present in your file.
        </p>
      </CardContent>
    </Card>
  );
}
