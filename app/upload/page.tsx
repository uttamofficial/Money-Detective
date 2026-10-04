import Link from "next/link";
import { CSVUploader } from "@/components/upload/CSVUploader";
import { DemoButton } from "@/components/upload/DemoButton";
import { Card, CardContent } from "@/components/ui/card";

const expectedColumns = ["Date", "Description", "Amount"];

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
          Upload → Analyze → Investigate → Ask
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Upload your transaction history
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-stone-500 sm:text-lg">
          CSV files only. Your data never leaves your machine — analysis runs
          on your local backend, not a third-party cloud.
        </p>
      </div>

      <Card className="mt-10">
        <CardContent className="p-6 sm:p-8">
          <CSVUploader />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-stone-900">
            What we look for
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
            {expectedColumns.map((col, i) => (
              <span key={col} className="flex items-center gap-2">
                <span className="rounded-md bg-stone-100 px-2.5 py-1.5 font-medium text-stone-700 ring-1 ring-stone-200 ring-inset">
                  {col}
                </span>
                {i < expectedColumns.length - 1 && (
                  <span className="text-stone-300">|</span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            Exact column names don&apos;t matter — Money Detective detects
            dates, descriptions, and amounts automatically, even in bank
            exports with different headers.
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-stone-900">
            What happens next
          </p>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-stone-500">
            <li>
              <span className="font-semibold text-stone-700">1. Analyze.</span>{" "}
              Every transaction is categorized and your case file is built.
            </li>
            <li>
              <span className="font-semibold text-stone-700">2. Investigate.</span>{" "}
              Findings, trends, and next moves — plus an AI write-up if Ollama
              is running.
            </li>
            <li>
              <span className="font-semibold text-stone-700">3. Ask.</span>{" "}
              Interrogate your numbers. The backend stores nothing — close the
              tab and your data is gone from this browser.
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-stone-500">
          No statement handy? Run the full pipeline on fictional demo data:
        </p>
        <DemoButton size="default" className="mx-auto mt-3 max-w-xs" />
        <p className="mt-6 text-sm text-stone-500">
          Just looking around?{" "}
          <Link
            href="/dashboard"
            className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            Explore a sample case file
          </Link>
        </p>
      </div>
    </div>
  );
}
