import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtBn(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export const CHART_COLORS = [
  "#3b82f6", "#a855f7", "#22c55e", "#ef4444",
  "#f59e0b", "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

export const PALETTE: Record<string, string> = {
  blue: "#3b82f6", purple: "#a855f7", green: "#22c55e", red: "#ef4444",
  amber: "#f59e0b", cyan: "#06b6d4", pink: "#ec4899", orange: "#f97316",
};
