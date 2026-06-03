import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children, className, headerAction }: ChartCardProps) {
  return (
    <div className={cn("rounded-lg border border-card-border bg-card p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-card-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      {children}
    </div>
  );
}
