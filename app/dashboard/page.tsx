"use client";

import { useEffect, useState } from "react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { SpendingBreakdown } from "@/components/dashboard/SpendingBreakdown";
import { SpendingTrend } from "@/components/dashboard/SpendingTrend";
import { InvestigationCard } from "@/components/dashboard/InvestigationCard";
import { AskDetective } from "@/components/dashboard/AskDetective";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { Badge } from "@/components/ui/badge";
import { getMockDashboard, type DashboardData } from "@/lib/mock-data";
import {
  ANALYSIS_STORAGE_KEY,
  analysisToDashboard,
  type AnalysisResponse,
} from "@/lib/api";

function DashboardSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6 sm:py-10"
      aria-label="Loading case file"
    >
      <div className="h-4 w-40 rounded bg-stone-200" />
      <div className="mt-2 h-9 w-72 rounded bg-stone-200" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="mt-4 h-80 rounded-xl border border-stone-200 bg-white" />
    </div>
  );
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<{
    data: DashboardData;
    live: boolean;
    raw: AnalysisResponse | null;
  } | null>(null);

  useEffect(() => {
    let next: { data: DashboardData; live: boolean; raw: AnalysisResponse | null };
    try {
      const stored = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AnalysisResponse;
        next = { data: analysisToDashboard(parsed), live: true, raw: parsed };
      } else {
        next = { data: getMockDashboard(), live: false, raw: null };
      }
    } catch {
      // Corrupt payload — fall back to the sample case file.
      sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      next = { data: getMockDashboard(), live: false, raw: null };
    }
    // Syncing client-only browser storage into state: the sanctioned
    // exception to the set-state-in-effect rule (no SSR equivalent exists).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(next);
  }, []);

  if (!snapshot) return <DashboardSkeleton />;
  const { data, live, raw } = snapshot;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Case file header */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
            Case file {data.caseId}
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            {live ? "Your Investigation" : "The September Investigation"}
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">{data.periodLabel}</p>
        </div>
        {live ? (
          <Badge tone="success" className="w-fit">
            Live analysis · {data.transactionCount} transactions
          </Badge>
        ) : (
          <Badge tone="warning" className="w-fit">
            Sample data — upload a CSV for live analysis
          </Badge>
        )}
      </div>

      <KpiCards data={data} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SpendingBreakdown categories={data.categories} />
        </div>
        <div className="lg:col-span-2">
          <SpendingTrend trend={data.trend} />
        </div>
      </div>

      <div className="mt-4">
        <InvestigationCard findings={data.findings} analysis={raw} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AskDetective data={data} />
        <RecommendationCard recommendations={data.recommendations} />
      </div>
    </div>
  );
}
