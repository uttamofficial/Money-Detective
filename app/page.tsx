import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoButton } from "@/components/upload/DemoButton";
import { formatINR } from "@/lib/mock-data";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const previewBars = [38, 52, 44, 61, 48, 70, 57, 66, 74, 62, 81, 90];
const previewStats = [
  { label: "Total spending", value: formatINR(46280) },
  { label: "Biggest leak", value: "Dining · " + formatINR(12400) },
  { label: "Saved", value: formatINR(36120) },
];

const steps = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in a bank or UPI statement export. No account, no signup — just the file. Or try the one-click demo.",
  },
  {
    n: "02",
    title: "Analyze",
    body: "Transactions are parsed, categorized, and crunched by a Pandas engine — totals, trends, merchants, rhythms.",
  },
  {
    n: "03",
    title: "Investigate",
    body: "A local open-weight model reads the analysis and writes up the clues it finds — in plain language.",
  },
  {
    n: "04",
    title: "Ask",
    body: "Interrogate your own spending. Every answer is computed from your numbers — never guessed.",
  },
];

const assurances = [
  {
    title: "Stays on your machine",
    body: "Analysis runs on your own local backend and model — never sent to a third-party cloud or AI API.",
  },
  {
    title: "No account needed",
    body: "No email, no phone number, no tracking. Open the page and start.",
  },
  {
    title: "Open by design",
    body: "Built on open-source models and open code you can inspect yourself.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="neutral" className="mb-6">
            Built with open-source AI + local inference
          </Badge>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
            Money Detective
          </h1>
          <p className="font-display mt-4 text-2xl text-stone-600 italic sm:text-3xl">
            Your spending has clues. We investigate them.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-500 sm:text-lg">
            Upload your transaction history and discover the habits, patterns,
            and spending leaks hiding in your data.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/upload" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Start Investigation
              </Button>
            </Link>
            <DemoButton className="w-full sm:w-auto" />
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-stone-500">
            <LockIcon />
            Your financial data stays local.
          </p>
        </div>

        {/* Product preview */}
        <div className="mx-auto mt-14 max-w-3xl sm:mt-20">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
                  Case file · September 2026
                </p>
                <p className="mt-0.5 text-sm font-medium text-stone-900">
                  128 transactions investigated
                </p>
              </div>
              <Badge>4 findings</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
              {previewStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <p className="text-xs text-stone-500">{s.label}</p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-stone-900 tabular-nums">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="flex h-28 items-end gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
                {previewBars.map((h, i) => (
                  <div
                    key={i}
                    className={
                      i === previewBars.length - 1
                        ? "flex-1 rounded-sm bg-emerald-700"
                        : "flex-1 rounded-sm bg-emerald-700/25"
                    }
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Weekly spending · September 2026 (sample)
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase">
            How it works
          </p>
          <h2 className="font-display mx-auto mt-3 max-w-xl text-center text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            From CSV to clarity in four steps
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <Card key={step.n} className="p-6">
                <p className="font-display text-sm font-semibold text-emerald-700">
                  {step.n}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-stone-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {step.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Private by architecture
          </h2>
          <p className="mt-3 text-base text-stone-500">
            Bank statements are sensitive. Money Detective treats them that
            way — from the first upload to the final insight.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {assurances.map((a) => (
            <div
              key={a.title}
              className="rounded-xl border border-stone-200 bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h3 className="text-sm font-semibold text-stone-900">
                {a.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                {a.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/upload">
            <Button size="lg">Start Investigation</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
