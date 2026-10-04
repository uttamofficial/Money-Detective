"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Finding, FindingTone } from "@/lib/mock-data";
import { formatINR } from "@/lib/mock-data";
import {
  AI_RESULT_KEY,
  getAiStatus,
  runInvestigation,
  type AiFinding,
  type AiSeverity,
  type AiStatus,
  type AnalysisResponse,
  type InvestigationResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const toneBadge: Record<FindingTone, "danger" | "warning" | "success"> = {
  alert: "danger",
  watch: "warning",
  good: "success",
};

const toneDot: Record<FindingTone, string> = {
  alert: "bg-rose-500",
  watch: "bg-amber-500",
  good: "bg-emerald-500",
};

const severityMeta: Record<
  AiSeverity,
  { badge: "danger" | "warning" | "success"; dot: string; label: string }
> = {
  high: { badge: "danger", dot: "bg-rose-500", label: "High" },
  medium: { badge: "warning", dot: "bg-amber-500", label: "Medium" },
  low: { badge: "success", dot: "bg-emerald-500", label: "Low" },
};

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6 animate-spin text-emerald-700", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity={0.2} strokeWidth={3} />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

type AiPhase =
  | { name: "idle" }
  | { name: "checking" }
  | { name: "ready"; status: AiStatus }
  | { name: "running" }
  | { name: "done"; result: InvestigationResult }
  | { name: "unavailable"; setup: string; model: string }
  | { name: "error"; message: string };

function RuleBasedList({ findings }: { findings: Finding[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {findings.map((finding) => (
        <li
          key={finding.id}
          className="rounded-lg border border-stone-200 bg-stone-50/60 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", toneDot[finding.tone])}
              />
              {finding.title}
            </p>
            <Badge tone={toneBadge[finding.tone]} className="shrink-0">
              {finding.tag}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            {finding.detail}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AiFindingCard({ finding }: { finding: AiFinding }) {
  const meta = severityMeta[finding.severity];
  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
          {finding.title}
        </p>
        <Badge tone={meta.badge} className="shrink-0">
          {meta.label} severity
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {finding.description}
      </p>
      {(finding.amount != null || finding.percentage != null) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {finding.amount != null && (
            <span className="rounded-md bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
              {formatINR(finding.amount)}
            </span>
          )}
          {finding.percentage != null && (
            <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200 ring-inset tabular-nums">
              {finding.percentage.toFixed(1)}% of spending
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export function InvestigationCard({
  findings,
  analysis,
}: {
  findings: Finding[];
  analysis: AnalysisResponse | null;
}) {
  const [phase, setPhase] = useState<AiPhase>({ name: "idle" });

  useEffect(() => {
    if (!analysis) return;
    let cancelled = false;
    // Both setPhase calls below sync client-only browser storage into
    // state — the sanctioned exception to set-state-in-effect (no SSR
    // equivalent exists for sessionStorage / backend status).
    try {
      const cached = sessionStorage.getItem(AI_RESULT_KEY);
      if (cached) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase({ name: "done", result: JSON.parse(cached) });
        return;
      }
    } catch {
      sessionStorage.removeItem(AI_RESULT_KEY);
    }
    setPhase({ name: "checking" });
    getAiStatus()
      .then((status) => {
        if (cancelled) return;
        setPhase(
          status.available && status.model_present
            ? { name: "ready", status }
            : {
                name: "unavailable",
                setup: status.setup ?? "Ollama is not available.",
                model: status.model,
              },
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPhase({
          name: "error",
          message: e instanceof Error ? e.message : "Could not reach the backend.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [analysis]);

  async function run() {
    if (!analysis) return;
    setPhase({ name: "running" });
    try {
      const result = await runInvestigation(analysis);
      sessionStorage.setItem(AI_RESULT_KEY, JSON.stringify(result));
      setPhase({ name: "done", result });
    } catch (e: unknown) {
      setPhase({
        name: "error",
        message:
          e instanceof Error ? e.message : "The AI investigation failed. Please try again.",
      });
    }
  }

  const aiDone = phase.name === "done";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>What I Found</CardTitle>
            <CardDescription>
              {aiDone
                ? "AI investigation grounded in your numbers"
                : "Patterns and leaks detected in this case file"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success" className="gap-1">
              <LockIcon className="h-3 w-3" />
              Local AI
            </Badge>
            <Badge tone="neutral">
              {aiDone ? phase.result.findings.length : findings.length} clues
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase.name === "done" ? (
          <div>
            <p className="font-display text-xl leading-snug font-medium text-stone-900 sm:text-2xl">
              {phase.result.headline}
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {phase.result.findings.map((finding, i) => (
                <AiFindingCard key={`${finding.title}-${i}`} finding={finding} />
              ))}
            </ul>
            {phase.result.recommendations.length > 0 && (
              <div className="mt-4 rounded-lg border border-emerald-700/20 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                  Detective suggests
                </p>
                <ul className="mt-2 space-y-2.5">
                  {phase.result.recommendations.map((rec, i) => (
                    <li key={`${rec.title}-${i}`} className="text-sm">
                      <span className="font-semibold text-stone-900">
                        {rec.title}
                      </span>
                      {rec.potential_reduction != null && (
                        <span className="ml-2 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-700/20 ring-inset tabular-nums">
                          could save ≈ {formatINR(rec.potential_reduction)}/mo
                        </span>
                      )}
                      <p className="mt-0.5 leading-relaxed text-stone-600">
                        {rec.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone-400">
                Generated locally by {phase.result.model} — your data never left
                this machine.
              </p>
              <Button variant="outline" size="sm" onClick={run}>
                Re-run investigation
              </Button>
            </div>
            <details className="mt-4 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-stone-600 hover:text-stone-900">
                Rule-based clues (no AI needed)
              </summary>
              <div className="pt-3">
                <RuleBasedList findings={findings} />
              </div>
            </details>
          </div>
        ) : (
          <div>
            <RuleBasedList findings={findings} />
            {analysis ? (
              <div className="mt-4">
                {phase.name === "running" ? (
                  <div
                    role="status"
                    className="flex items-center gap-3 rounded-lg border border-emerald-700/20 bg-emerald-50/50 px-4 py-3.5"
                  >
                    <Spinner />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        AI is investigating your spending...
                      </p>
                      <p className="text-xs text-stone-500">
                        Running on your machine — this can take a minute on
                        first run while the model loads.
                      </p>
                    </div>
                  </div>
                ) : phase.name === "unavailable" ? (
                  <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3.5">
                    <p className="text-sm font-semibold text-stone-900">
                      Local AI is not set up yet
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-stone-600">
                      {phase.setup}
                    </p>
                    <p className="mt-2 font-mono text-xs text-stone-700">
                      ollama pull {phase.model}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      Everything above — analytics, charts, patterns — works
                      without it. Only this natural-language investigation needs
                      Ollama.
                    </p>
                  </div>
                ) : phase.name === "error" ? (
                  <div className="rounded-lg border border-rose-300/60 bg-rose-50 px-4 py-3.5">
                    <p className="text-sm font-semibold text-stone-900">
                      The investigation hit a snag
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-stone-600">
                      {phase.message}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={run}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-600">
                      <span className="font-semibold text-stone-900">
                        Want the detective&apos;s own words?
                      </span>{" "}
                      A local open-weight model will read this analysis and
                      write up its findings.
                    </p>
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={run}
                      disabled={phase.name === "checking"}
                    >
                      {phase.name === "checking"
                        ? "Checking local AI..."
                        : "Investigate with local AI"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-stone-400">
                Upload a CSV to unlock the AI investigator on your own data.
              </p>
            )}
          </div>
        )}

        <details className="rounded-lg border border-stone-200 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-stone-700 hover:text-stone-900">
            Why open-source AI?
          </summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-500">
            <li>
              Your financial data stays local — analysis and inference run on
              your machine, never sent to a third-party AI provider.
            </li>
            <li>
              The model can be swapped — set{" "}
              <code className="rounded bg-stone-100 px-1 font-mono text-xs text-stone-700">
                OLLAMA_MODEL
              </code>{" "}
              to any compatible open-weight model.
            </li>
            <li>
              No dependency on a proprietary AI API — no keys, no per-request
              billing.
            </li>
            <li>
              Inference works offline once the model is downloaded — only the
              one-time model download needs the internet.
            </li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
