"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AI_RESULT_KEY,
  ANALYSIS_STORAGE_KEY,
  analyzeCsv,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * One-click demo: fetches the bundled fictional statement, runs the real
 * analysis pipeline, and lands on the dashboard with live results.
 */
export function DemoButton({
  size = "lg",
  variant = "outline",
  className,
  label = "Try Demo Data",
}: {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "secondary" | "outline" | "ghost";
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDemo() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-csv");
      if (!res.ok) throw new Error("Could not load the demo statement.");
      const text = await res.text();
      const file = new File([text], "sample-transactions.csv", {
        type: "text/csv",
      });
      const result = await analyzeCsv(file);
      sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(result));
      sessionStorage.removeItem(AI_RESULT_KEY);
      router.push("/dashboard");
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} Start the backend first — see README.`
          : "Demo failed. Start the backend first — see README.",
      );
      setRunning(false);
    }
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-2", className)}>
      <Button
        size={size}
        variant={variant}
        onClick={runDemo}
        disabled={running}
        className="w-full sm:w-auto"
      >
        {running ? "Running demo investigation..." : label}
      </Button>
      {error && (
        <p role="alert" className="max-w-sm text-center text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
