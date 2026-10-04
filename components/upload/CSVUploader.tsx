"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ANALYSIS_STORAGE_KEY, AI_RESULT_KEY, analyzeCsv } from "@/lib/api";

const SAMPLE_CSV = `Date,Description,Amount
2026-09-01,Salary Credit - Acme Pvt Ltd,82400
2026-09-02,Rent - HSR Layout Bengaluru,-15000
2026-09-03,Swiggy - Dinner,-486
2026-09-05,BESCOM Electricity Bill,-1240
2026-09-07,Zomato - Weekend Lunch,-912
2026-09-09,Uber - Airport Drop,-640
2026-09-12,Amazon - Kitchen Essentials,-2310
2026-09-15,Netflix Subscription,-649
2026-09-18,DMart Grocery Run,-2874
2026-09-21,BookMyShow - Movie Night,-1100
2026-09-25,UPI - Friend Dinner Split,-750
2026-09-28,Jio Prepaid Recharge,-399
`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 animate-spin text-emerald-700"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={3}
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-emerald-700"
      aria-hidden="true"
    >
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-5-5z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function CSVUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pickFile(candidate: File | undefined) {
    setError(null);
    if (!candidate) return;
    const isCsv =
      candidate.name.toLowerCase().endsWith(".csv") ||
      candidate.type.includes("csv");
    if (!isCsv) {
      setError("That doesn't look like a CSV. Please choose a .csv file.");
      return;
    }
    setFile(candidate);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeCsv(file);
      sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(result));
      sessionStorage.removeItem(AI_RESULT_KEY); // stale AI report from a previous file
      router.push("/dashboard");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-white/90 backdrop-blur-[2px]"
        >
          <Spinner />
          <div className="text-center">
            <p className="text-base font-semibold text-stone-900">
              Investigating your spending...
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Parsing, categorizing and crunching the numbers.
            </p>
          </div>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a CSV file here or click to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16",
          dragging
            ? "border-emerald-600 bg-emerald-50/60"
            : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100/60",
        )}
      >
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            dragging
              ? "bg-emerald-700 text-white"
              : "bg-white text-stone-500 ring-1 ring-stone-200",
          )}
        >
          <UploadIcon />
        </span>
        <p className="mt-4 text-base font-semibold text-stone-900">
          {dragging ? "Drop it — we'll take it from here" : "Drag & drop your CSV here"}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          or <span className="font-medium text-emerald-700 underline">browse your files</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <FileIcon />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">
              {file.name}
            </p>
            <p className="text-xs text-stone-500">
              {formatFileSize(file.size)} · ready for investigation
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? "Investigating..." : "Upload CSV"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="flex-1"
          disabled={loading}
          onClick={downloadSample}
        >
          Download Sample CSV
        </Button>
      </div>
    </div>
  );
}
