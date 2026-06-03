import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, ReferenceLine, Cell, PieChart, Pie,
} from "recharts";

interface SolvencyTrackingItem { year: number; availableCapital: number; requiredCapital: number; solvencyRatio: number; capitalSurplus: number; status: string; }
interface CapitalAdequacy {
  currentSolvencyRatio: number; averageSolvencyRatio: number; minSolvencyRatio: number; maxSolvencyRatio: number;
  earlyWarningTriggered: boolean; criticalThreshold: number; warningThreshold: number; capitalSurplus: number;
  scrComponents: Array<{ component: string; amount: number; percentage: number }>;
}

const STATUS_COLOR: Record<string, string> = {
  Strong: "#22c55e",
  Adequate: "#3b82f6",
  Warning: "#f59e0b",
  Critical: "#ef4444",
};

export default function Solvency() {
  const tracking = useApiGet<SolvencyTrackingItem[]>("/solvency/tracking");
  const adequacy = useApiGet<CapitalAdequacy>("/solvency/capital-adequacy");

  const a = adequacy.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Solvency Monitoring" subtitle="Solvency II SCR Coverage, Capital Adequacy & Early Warning System" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Current Solvency Ratio"
            value={a ? `${fmt(a.currentSolvencyRatio, 2)}x` : "—"}
            subtitle="SCR coverage (Solvency II)"
            accent={a && a.currentSolvencyRatio >= 1.5 ? "green" : a && a.currentSolvencyRatio >= 1.2 ? "blue" : "red"}
            trend={a && a.currentSolvencyRatio >= 1.2 ? "up" : "down"}
            trendLabel={a?.earlyWarningTriggered ? "⚠ Early Warning Triggered" : "Within target range"}
          />
          <KpiCard title="Capital Surplus" value={a ? fmtBn(a.capitalSurplus) : "—"} subtitle="Available above SCR" accent="green" />
          <KpiCard title="Average Solvency" value={a ? `${fmt(a.averageSolvencyRatio, 2)}x` : "—"} subtitle="2027–2045 projection average" accent="blue" />
          <KpiCard title="Min / Max Ratio" value={a ? `${fmt(a.minSolvencyRatio, 2)}x / ${fmt(a.maxSolvencyRatio, 2)}x` : "—"} subtitle="Projection range" accent="amber" />
        </div>

        {/* Warning Thresholds */}
        {a?.earlyWarningTriggered && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
            <span className="text-amber-400 text-xl">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-400">Early Warning System Triggered</p>
              <p className="text-xs text-muted-foreground mt-0.5">Solvency ratio below {fmt(a.warningThreshold, 1)}x warning threshold. Capital strengthening actions recommended.</p>
            </div>
          </div>
        )}

        {/* Solvency Trend */}
        <ChartCard title="Solvency Ratio Projection (2027–2045)" subtitle="Available vs. Required Capital with ratio overlay">
          {tracking.data && tracking.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tracking.data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis yAxisId="left" tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis yAxisId="right" orientation="right" domain={[0.5, 2.5]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number, n: string) => n === "solvencyRatio" ? [`${fmt(v, 2)}x`, "Solvency Ratio"] : [fmtBn(v), n === "availableCapital" ? "Available Capital" : "Required Capital"]}
                  contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{
                  v === "availableCapital" ? "Available Capital" : v === "requiredCapital" ? "Required Capital (SCR)" : "Solvency Ratio (RHS)"
                }</span>} />
                <Bar yAxisId="left" dataKey="availableCapital" fill="#22c55e" opacity={0.7} name="availableCapital" />
                <Bar yAxisId="left" dataKey="requiredCapital" fill="#ef4444" opacity={0.6} name="requiredCapital" />
                <Line yAxisId="right" type="monotone" dataKey="solvencyRatio" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} name="solvencyRatio" />
                <ReferenceLine yAxisId="right" y={1.0} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "Critical 1.0x", fill: "#ef4444", fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={1.2} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: "Warning 1.2x", fill: "#f59e0b", fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status breakdown */}
          <ChartCard title="Solvency Status by Year" subtitle="Traffic light — Strong / Adequate / Warning / Critical">
            {tracking.data ? (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Year</th>
                      <th className="text-right py-2 text-muted-foreground">Available</th>
                      <th className="text-right py-2 text-muted-foreground">Required</th>
                      <th className="text-right py-2 text-muted-foreground">Ratio</th>
                      <th className="text-right py-2 text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracking.data.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-1.5">{r.year}</td>
                        <td className="text-right py-1.5">{fmtBn(r.availableCapital)}</td>
                        <td className="text-right py-1.5">{fmtBn(r.requiredCapital)}</td>
                        <td className="text-right py-1.5 font-mono">{fmt(r.solvencyRatio, 2)}x</td>
                        <td className="text-right py-1.5">
                          <span style={{ color: STATUS_COLOR[r.status] || "#94a3b8" }} className="font-medium">{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          {/* SCR Components */}
          <ChartCard title="SCR Component Breakdown" subtitle="Solvency Capital Requirement by risk module">
            {adequacy.data?.scrComponents ? (
              <div className="space-y-3">
                {adequacy.data.scrComponents.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground">{c.component}</span>
                      <span className="text-muted-foreground">{fmtBn(c.amount)} ({fmtPct(Math.abs(c.percentage), 0)})</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.abs(c.percentage) * 100)}%`,
                          background: c.amount < 0 ? "#22c55e" : CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
