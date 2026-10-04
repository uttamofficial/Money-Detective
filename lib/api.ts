/**
 * Client for the Money Detective FastAPI backend.
 * Upload a CSV -> get structured analysis -> adapt it to the dashboard shape.
 */

import type { DashboardData } from "@/lib/mock-data";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const ANALYSIS_STORAGE_KEY = "money-detective:analysis";

export interface CategoryDatum {
  name: string;
  total: number;
  count: number;
  percentage: number;
  average: number;
}

export interface MerchantDatum {
  name: string;
  total: number;
  count: number;
  average: number;
}

export interface MonthDatum {
  month: string;
  label: string;
  spending: number;
  income: number;
}

export interface Pattern {
  id: string;
  title: string;
  detail: string;
  tag: string;
  tone: "alert" | "watch" | "good";
}

export interface NextMove {
  id: string;
  title: string;
  detail: string;
  saving: string;
}

export interface AnalysisResponse {
  summary: {
    total_income: number;
    total_spending: number;
    net_balance: number;
    transaction_count: number;
    average_transaction: number;
    savings_rate: number;
    period: { start: string; end: string; days: number };
  };
  categories: CategoryDatum[];
  merchants: MerchantDatum[];
  timeline: { monthly: MonthDatum[] };
  patterns: Pattern[];
  next_moves: NextMove[];
}

const CATEGORY_PALETTE = [
  "#047857",
  "#d97706",
  "#7c3aed",
  "#0284c7",
  "#57534e",
  "#e11d48",
  "#0d9488",
  "#65a30d",
  "#c026d3",
  "#ea580c",
  "#4f46e5",
];

export async function analyzeCsv(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error(
      "Could not reach the analysis server. Make sure the backend is running on port 8000.",
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(
      body?.detail ?? `Analysis failed (server returned ${res.status}).`,
    );
  }

  return (await res.json()) as AnalysisResponse;
}

export interface AiStatus {
  available: boolean;
  model: string;
  model_present: boolean;
  setup: string | null;
}

export type AiSeverity = "high" | "medium" | "low";

export interface AiFinding {
  severity: AiSeverity;
  title: string;
  description: string;
  amount: number | null;
  percentage: number | null;
}

export interface AiRecommendation {
  title: string;
  description: string;
  potential_reduction: number | null;
}

export interface InvestigationResult {
  headline: string;
  findings: AiFinding[];
  recommendations: AiRecommendation[];
  model: string;
}

export const AI_RESULT_KEY = "money-detective:ai-result";

async function readError(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => null)) as {
    detail?: string;
  } | null;
  return new Error(body?.detail ?? `${fallback} (server returned ${res.status}).`);
}

export async function getAiStatus(): Promise<AiStatus> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/ai-status`);
  } catch {
    throw new Error(
      "Could not reach the analysis server. Make sure the backend is running on port 8000.",
    );
  }
  if (!res.ok) throw await readError(res, "Could not check AI status");
  return (await res.json()) as AiStatus;
}

export async function runInvestigation(
  analysis: AnalysisResponse,
): Promise<InvestigationResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/investigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
  } catch {
    throw new Error(
      "Could not reach the analysis server. Make sure the backend is running on port 8000.",
    );
  }
  if (!res.ok) throw await readError(res, "The AI investigation failed");
  return (await res.json()) as InvestigationResult;
}

function formatDayMonth(iso: string, withYear: boolean): string {
  const d = new Date(`${iso}T00:00:00`);
  const dayMonth = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return withYear ? `${dayMonth} ${d.getFullYear()}` : dayMonth;
}

/** Convert a backend analysis into the dashboard's data shape. */
export function analysisToDashboard(a: AnalysisResponse): DashboardData {
  const { summary, categories, timeline, patterns, next_moves } = a;
  const sameYear =
    summary.period.start.slice(0, 4) === summary.period.end.slice(0, 4);

  return {
    caseId: `MD-${summary.period.end.replaceAll("-", "")}`,
    periodLabel: `${formatDayMonth(summary.period.start, !sameYear)} – ${formatDayMonth(summary.period.end, true)} · ${summary.transaction_count} transactions`,
    transactionCount: summary.transaction_count,
    totalIncome: summary.total_income,
    totalSpending: summary.total_spending,
    remaining: summary.net_balance,
    averageTransaction: summary.average_transaction,
    savingsRate: Math.round(summary.savings_rate),
    categories: categories.map((c, i) => ({
      name: c.name,
      value: c.total,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    })),
    trend: timeline.monthly.slice(-6).map((m) => ({
      month: `${m.label} ’${m.month.slice(2, 4)}`,
      income: m.income,
      spending: m.spending,
    })),
    findings: patterns.map((p) => ({
      id: p.id,
      title: p.title,
      detail: p.detail,
      tag: p.tag,
      tone: p.tone,
    })),
    recommendations: next_moves.map((m) => ({
      id: m.id,
      title: m.title,
      detail: m.detail,
      saving: m.saving,
    })),
  };
}
