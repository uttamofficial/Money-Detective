"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { answerQuestion } from "@/lib/ask";
import type { DashboardData } from "@/lib/mock-data";

const suggestions = [
  "Where did my money go?",
  "Am I spending too much on food?",
  "How can I save more next month?",
];

export function AskDetective({ data }: { data: DashboardData }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    setAsked(trimmed);
    setAnswer(answerQuestion(trimmed, data));
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Ask the Detective</CardTitle>
        <CardDescription>
          Interrogate your own spending — answers cite your data
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="cursor-pointer rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-emerald-600/40 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Why did I overspend last weekend?"
            aria-label="Ask the detective a question"
            className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
          />
          <Button type="submit" disabled={!question.trim()}>
            Ask
          </Button>
        </form>

        {answer && asked ? (
          <div className="mt-4 flex-1 rounded-lg border border-emerald-700/20 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              Detective&apos;s answer
            </p>
            <p className="mt-1 text-xs text-stone-500 italic">
              Asked: “{asked}”
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
              {answer}
            </p>
          </div>
        ) : (
          <p className="mt-4 flex-1 rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-4 text-sm text-stone-400">
            Your answer will appear here, computed from the numbers on this
            page — food, weekends, subscriptions, savings, and more.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
