import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "blue" | "green" | "red" | "amber" | "purple";
  className?: string;
}

const accentMap = {
  blue: "border-blue-500/40 bg-blue-500/5",
  green: "border-green-500/40 bg-green-500/5",
  red: "border-red-500/40 bg-red-500/5",
  amber: "border-amber-500/40 bg-amber-500/5",
  purple: "border-purple-500/40 bg-purple-500/5",
};

const trendColorMap = {
  up: "text-green-400",
  down: "text-red-400",
  neutral: "text-muted-foreground",
};

export default function KpiCard({ title, value, subtitle, trend, trendLabel, accent = "blue", className }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className={cn("rounded-lg border p-4", accentMap[accent], className)}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      {trend && trendLabel && (
        <div className={cn("mt-2 flex items-center gap-1 text-xs", trendColorMap[trend])}>
          <TrendIcon className="w-3 h-3" />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
