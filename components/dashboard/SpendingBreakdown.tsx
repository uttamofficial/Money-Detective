"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatINR, type CategorySlice } from "@/lib/mock-data";

interface SliceTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: CategorySlice;
  }>;
}

function SliceTooltip({ active, payload }: SliceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0];
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-stone-900">{slice.name}</p>
      <p className="text-stone-500 tabular-nums">
        {formatINR(Number(slice.value ?? 0))}
      </p>
    </div>
  );
}

export function SpendingBreakdown({
  categories,
}: {
  categories: CategorySlice[];
}) {
  const total = categories.reduce((sum, c) => sum + c.value, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Spending Breakdown</CardTitle>
        <CardDescription>Where September&apos;s money went</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="relative h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<SliceTooltip />} />
              <Pie
                data={categories}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {categories.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-stone-400">Total spent</p>
            <p className="text-xl font-semibold tracking-tight text-stone-900 tabular-nums">
              {formatINR(total)}
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5">
          {categories.map((c) => (
            <li key={c.name} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span className="flex-1 truncate text-stone-600">{c.name}</span>
              <span className="font-medium text-stone-900 tabular-nums">
                {formatINR(c.value)}
              </span>
              <span className="w-11 text-right text-xs text-stone-400 tabular-nums">
                {Math.round((c.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
