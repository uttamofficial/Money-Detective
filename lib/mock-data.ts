/**
 * Mock data layer for the Money Detective dashboard.
 *
 * TODO (backend): replace `getMockDashboard()` with a call to the
 * FastAPI backend, e.g. `fetch("/api/analyze", { method: "POST", body })`,
 * and keep the `DashboardData` shape unchanged so components keep working.
 */

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export interface MonthPoint {
  month: string;
  income: number;
  spending: number;
}

export type FindingTone = "alert" | "watch" | "good";

export interface Finding {
  id: string;
  title: string;
  detail: string;
  tag: string;
  tone: FindingTone;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  saving: string;
}

export interface DashboardData {
  caseId: string;
  periodLabel: string;
  transactionCount: number;
  totalIncome: number;
  totalSpending: number;
  remaining: number;
  averageTransaction: number;
  savingsRate: number;
  categories: CategorySlice[];
  trend: MonthPoint[];
  findings: Finding[];
  recommendations: Recommendation[];
}

export function getMockDashboard(): DashboardData {
  return {
    caseId: "MD-2026-1042",
    periodLabel: "1 Sept – 30 Sept 2026 · 128 transactions",
    transactionCount: 128,
    totalIncome: 82400,
    totalSpending: 46280,
    remaining: 36120,
    averageTransaction: 1157,
    savingsRate: 44,
    categories: [
      { name: "Rent & Housing", value: 15000, color: "#047857" },
      { name: "Food & Dining", value: 12400, color: "#d97706" },
      { name: "Shopping", value: 7600, color: "#7c3aed" },
      { name: "Transport", value: 4280, color: "#0284c7" },
      { name: "Utilities & Bills", value: 3500, color: "#57534e" },
      { name: "Entertainment", value: 3500, color: "#e11d48" },
    ],
    trend: [
      { month: "May", income: 82400, spending: 39840 },
      { month: "Jun", income: 82400, spending: 44120 },
      { month: "Jul", income: 86300, spending: 37560 },
      { month: "Aug", income: 82400, spending: 42980 },
      { month: "Sep", income: 82400, spending: 46280 },
      { month: "Oct", income: 21300, spending: 9870 },
    ],
    findings: [
      {
        id: "f1",
        title: "Dining out is your biggest leak",
        detail:
          "Food & Dining hit ₹12,400 in September — up 23% from August. Swiggy and Zomato orders on weekends account for nearly two-thirds of it.",
        tag: "High impact",
        tone: "alert",
      },
      {
        id: "f2",
        title: "Weekends cost 2.1× weekdays",
        detail:
          "61% of your discretionary spending lands on Saturday and Sunday. Shopping and entertainment spike hardest after 7pm.",
        tag: "Pattern",
        tone: "watch",
      },
      {
        id: "f3",
        title: "Subscriptions quietly add up",
        detail:
          "6 recurring charges total ₹1,847/month. Two of them — a music plan and a cloud storage tier — haven't been used in 60+ days.",
        tag: "Easy win",
        tone: "watch",
      },
      {
        id: "f4",
        title: "You still saved 44% of income",
        detail:
          "Despite the leaks, ₹36,120 stayed unspent in September. Your savings rate beats 8 out of 10 people in your income bracket.",
        tag: "Good news",
        tone: "good",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Cap dining at ₹9,000/month",
        detail:
          "A weekly ₹2,250 eating-out budget keeps the fun and kills the drift. Cook twice more per week to get there.",
        saving: "≈ ₹3,400/mo",
      },
      {
        id: "r2",
        title: "Give weekends a ₹2,500 envelope",
        detail:
          "Move Saturday–Sunday fun money to a separate UPI account. When the envelope is empty, the weekend borrows from next week — not from savings.",
        saving: "≈ ₹1,900/mo",
      },
      {
        id: "r3",
        title: "Cancel 2 unused subscriptions",
        detail:
          "The dormant music plan (₹149) and extra cloud tier (₹500) can go today with zero lifestyle change.",
        saving: "≈ ₹649/mo",
      },
      {
        id: "r4",
        title: "Auto-transfer ₹15,000 on salary day",
        detail:
          "Pay your future self first. A standing instruction on the 1st beats willpower on the 30th, every time.",
        saving: "Habit",
      },
    ],
  };
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inr.format(value);
}
