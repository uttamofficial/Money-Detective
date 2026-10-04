import { Card } from "@/components/ui/card";
import { formatINR, type DashboardData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function IncomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 4v16m0 0l-5-5m5 5l5-5" />
    </svg>
  );
}

function SpendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 20V4m0 0L7 9m5-5l5 5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M20 7H5a1 1 0 0 1-1-1 1 1 0 0 1 1-1h13v3" />
      <path d="M20 7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
      <circle cx="17.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function KpiCards({ data }: { data: DashboardData }) {
  const kpis = [
    {
      label: "Total Income",
      value: formatINR(data.totalIncome),
      sub: `${data.transactionCount} transactions · Sept`,
      icon: <IncomeIcon />,
      iconClass: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total Spending",
      value: formatINR(data.totalSpending),
      sub: `${100 - data.savingsRate}% of income spent`,
      icon: <SpendingIcon />,
      iconClass: "bg-rose-50 text-rose-600",
    },
    {
      label: "Remaining",
      value: formatINR(data.remaining),
      sub: `Saved ${data.savingsRate}% of income`,
      icon: <WalletIcon />,
      iconClass: "bg-sky-50 text-sky-700",
    },
    {
      label: "Average Transaction",
      value: formatINR(data.averageTransaction),
      sub: "Per transaction, all categories",
      icon: <ReceiptIcon />,
      iconClass: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-500">{kpi.label}</p>
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                kpi.iconClass,
              )}
            >
              {kpi.icon}
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 tabular-nums sm:text-[1.7rem]">
            {kpi.value}
          </p>
          <p className="mt-1 text-xs text-stone-400">{kpi.sub}</p>
        </Card>
      ))}
    </div>
  );
}
