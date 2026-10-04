/**
 * Grounded Q&A over dashboard numbers — no LLM, no guessing.
 * Every answer is computed from the DashboardData on screen.
 */

import { formatINR, type DashboardData } from "./mock-data";

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function findCategory(data: DashboardData, ...needles: string[]) {
  const lower = data.categories.map((c) => ({ ...c, key: c.name.toLowerCase() }));
  for (const needle of needles) {
    const hit = lower.find((c) => c.key.includes(needle));
    if (hit) return hit;
  }
  return null;
}

function categoryLine(
  data: DashboardData,
  name: string,
  extra?: string,
): string {
  const cat = findCategory(
    data,
    ...name.toLowerCase().split(/[^a-z]+/).filter(Boolean),
  );
  if (!cat) return `I don't see a ${name} category in this case file.`;
  const line =
    `${cat.name} came to ${formatINR(cat.value)} — ${pct(cat.value, data.totalSpending)} ` +
    `of your ${formatINR(data.totalSpending)} total spending.`;
  return extra ? `${line} ${extra}` : line;
}

function topMoves(data: DashboardData, n: number): string {
  return data.recommendations
    .slice(0, n)
    .map((r) => `${r.title} (${r.saving})`)
    .join("; ");
}

/** Answer a free-text question using only the numbers in `data`. */
export function answerQuestion(question: string, data: DashboardData): string {
  const q = question.toLowerCase();

  if (/(weekend|saturday|sunday)/.test(q)) {
    const clue =
      data.findings.find((f) => /weekend|saturday|sunday/i.test(f.title)) ??
      data.findings.find((f) => /weekend|saturday|sunday/i.test(f.detail));
    if (clue) return `${clue.title}: ${clue.detail}`;
    return "I don't see a strong weekend pattern in this case file — spending looks evenly spread.";
  }
  if (
    /(food|dining|dinners?|eating|lunch|breakfast|brunch|swiggy|zomato|restaurant|coffee|cafe|bakery|biryani|pizza|burger)/.test(
      q,
    )
  ) {
    return categoryLine(data, "Food", "Check What I Found for the weekend dining pattern behind it.");
  }
  if (/(save|savings|saved|10000|1000)/.test(q)) {
    return (
      `You kept ${formatINR(data.remaining)} unspent — a ${data.savingsRate}% savings rate. ` +
      `The fastest levers: ${topMoves(data, 2)}.`
    );
  }
  if (/(subscription|recurring|netflix|spotify|cancel)/.test(q)) {
    const clue = data.findings.find((f) =>
      /subscri|recur/i.test(`${f.title} ${f.detail}`),
    );
    if (clue) return `${clue.title}: ${clue.detail}`;
    return "I don't see subscription-like charges in this case file.";
  }
  if (/(rent|housing|landlord)/.test(q)) return categoryLine(data, "Rent");
  if (/(shop|amazon|flipkart|myntra|cloth)/.test(q)) return categoryLine(data, "Shopping");
  if (/(transport|uber|ola|cab|commute|petrol|fuel|metro|travel)/.test(q)) {
    return categoryLine(data, "Transport");
  }
  if (/(grocer|dmart|vegetable|kirana)/.test(q)) return categoryLine(data, "Groceries");
  if (/(bill|electricity|recharge|broadband|water)/.test(q)) return categoryLine(data, "Bills");
  if (/(entertain|movie|game|concert)/.test(q)) return categoryLine(data, "Entertainment");
  if (/(income|salary|earn|paid)/.test(q)) {
    return (
      `Total income in this file is ${formatINR(data.totalIncome)} across ` +
      `${data.transactionCount} transactions.`
    );
  }
  if (/(where|spent|spend|goes|going|breakdown|most)/.test(q)) {
    const top = [...data.categories].sort((a, b) => b.value - a.value).slice(0, 3);
    return (
      `Most of the ${formatINR(data.totalSpending)} went to ` +
      top.map((c) => `${c.name} (${formatINR(c.value)})`).join(", ") +
      `. See Spending Breakdown for the full split.`
    );
  }
  if (/(biggest|largest|big |huge)/.test(q)) {
    const top = [...data.categories].sort((a, b) => b.value - a.value)[0];
    if (top) {
      return (
        `Your biggest bucket is ${top.name} at ${formatINR(top.value)} — ` +
        `${pct(top.value, data.totalSpending)} of all spending.`
      );
    }
  }
  if (/(leak|pattern|finding|wrong|problem|clue)/.test(q)) {
    const clue = data.findings[0];
    if (clue) return `${clue.title}: ${clue.detail}`;
  }
  if (/(average|avg)/.test(q)) {
    return `Your average transaction is ${formatINR(data.averageTransaction)}.`;
  }
  if (/(balance|left|remain)/.test(q)) {
    return (
      `${formatINR(data.remaining)} remained unspent — a ${data.savingsRate}% savings rate.`
    );
  }
  if (/(help|what can|how do|how to)/.test(q)) {
    return (
      "Ask me where your money went, about food, weekends, subscriptions, savings, " +
      "or your biggest spending bucket — I answer from the numbers on this page."
    );
  }

  // Default: honest summary + steer toward answerable questions.
  const top = [...data.categories].sort((a, b) => b.value - a.value)[0];
  return (
    `In this file you earned ${formatINR(data.totalIncome)}, spent ` +
    `${formatINR(data.totalSpending)}, and kept ${formatINR(data.remaining)}. ` +
    (top ? `Biggest bucket: ${top.name} (${formatINR(top.value)}). ` : "") +
    `Try asking about food, weekends, subscriptions, or savings.`
  );
}
