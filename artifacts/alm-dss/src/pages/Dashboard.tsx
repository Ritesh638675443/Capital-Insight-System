import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

interface DashboardSummary {
  totalAssets: number; totalLiabilities: number; solvencyRatio: number;
  portfolioReturn: number; portfolioRisk: number; var95: number; tvar95: number;
  catastropheExposure: number; reinsuranceCoverage: number; fundingGap: number;
  durationGap: number; currentYear: number;
}
interface AllocationItem { asset: string; weight: number; value: number; }
interface SolvencyTrendItem { year: number; solvencyRatio: number; availableCapital: number; requiredCapital: number; }
interface RiskHeatmapItem { category: string; subcategory: string; severity: number; likelihood: number; riskScore: number; }

const STATUS_COLOR = (ratio: number) =>
  ratio >= 1.5 ? "#22c55e" : ratio >= 1.2 ? "#3b82f6" : ratio >= 1.0 ? "#f59e0b" : "#ef4444";

export default function Dashboard() {
  const summary = useApiGet<DashboardSummary>("/dashboard/summary");
  const allocation = useApiGet<AllocationItem[]>("/dashboard/portfolio-allocation");
  const solvency = useApiGet<SolvencyTrendItem[]>("/dashboard/solvency-trend");
  const heatmap = useApiGet<RiskHeatmapItem[]>("/dashboard/risk-heatmap");

  const d = summary.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Capital Investment Decision Support — Real-time ALM Overview"
      >
        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
          Live
        </span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Assets (AUM)"
            value={d ? fmtBn(d.totalAssets) : "—"}
            subtitle={d ? `Liabilities: ${fmtBn(d.totalLiabilities)}` : undefined}
            accent="blue"
            trend="up" trendLabel="FY Target on track"
          />
          <KpiCard
            title="Solvency Ratio (SCR)"
            value={d ? `${fmt(d.solvencyRatio, 2)}x` : "—"}
            subtitle="Solvency II SCR coverage"
            accent={d ? (d.solvencyRatio >= 1.5 ? "green" : d.solvencyRatio >= 1.2 ? "blue" : "red") : "blue"}
            trend={d && d.solvencyRatio >= 1.2 ? "up" : "down"}
            trendLabel={d && d.solvencyRatio >= 1.2 ? "Adequate" : "Warning"}
          />
          <KpiCard
            title="Portfolio Return"
            value={d ? fmtPct(d.portfolioReturn) : "—"}
            subtitle={d ? `Volatility: ${fmtPct(d.portfolioRisk)}` : undefined}
            accent="green"
            trend="up" trendLabel="Sharpe: 0.55"
          />
          <KpiCard
            title="VaR 95% (1-month)"
            value={d ? fmtBn(d.var95) : "—"}
            subtitle={d ? `TVaR 95%: ${fmtBn(d.tvar95)}` : undefined}
            accent="amber"
            trend="neutral" trendLabel="Historical method"
          />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Cat Exposure (Gross)" value={d ? fmtBn(d.catastropheExposure) : "—"} subtitle="Across all perils" accent="red" />
          <KpiCard title="Reinsurance Coverage" value={d ? fmtBn(d.reinsuranceCoverage) : "—"} subtitle={d ? `Recovery: ${fmtPct(d.reinsuranceCoverage / d.catastropheExposure)}` : undefined} accent="purple" />
          <KpiCard title="Funding Gap" value={d ? fmtBn(d.fundingGap) : "—"} subtitle="Assets vs PV Liabilities" accent={d && d.fundingGap < 0 ? "red" : "green"} />
          <KpiCard title="Duration Gap" value={d ? `${fmt(d.durationGap, 2)} yrs` : "—"} subtitle="Asset – Liability duration" accent="amber" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Portfolio Allocation" subtitle="By asset class, market value weighted">
            {allocation.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={allocation.data}
                    dataKey="weight"
                    nameKey="asset"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {allocation.data.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Weight"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </ChartCard>

          <ChartCard title="Solvency Ratio Projection" subtitle="2027–2045 forward-looking SCR coverage">
            {solvency.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={solvency.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[0.8, 2.2]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number) => [fmt(v, 2) + "x", "Solvency Ratio"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="solvencyRatio" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  {/* Warning line at 1.2 */}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            )}
          </ChartCard>
        </div>

        {/* Risk Heatmap */}
        <ChartCard title="Enterprise Risk Heatmap" subtitle="Severity × Likelihood — bubble size = risk score">
          {heatmap.data ? (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis dataKey="likelihood" type="number" name="Likelihood" domain={[0, 6]} label={{ value: "Likelihood →", position: "insideBottom", offset: -5, fill: "#94a3b8", fontSize: 11 }} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis dataKey="severity" type="number" name="Severity" domain={[0, 6]} label={{ value: "Severity →", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <ZAxis dataKey="riskScore" range={[80, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload as RiskHeatmapItem;
                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <p className="font-semibold">{d.subcategory}</p>
                        <p className="text-muted-foreground">{d.category}</p>
                        <p>Risk Score: <span className="text-amber-400 font-bold">{d.riskScore}</span></p>
                      </div>
                    );
                  }}
                />
                {["Market Risk", "Underwriting Risk", "ALM Risk", "Operational Risk"].map((cat, ci) => (
                  <Scatter
                    key={cat}
                    name={cat}
                    data={heatmap.data!.filter((d) => d.category === cat)}
                    fill={CHART_COLORS[ci % CHART_COLORS.length]}
                    fillOpacity={0.7}
                  />
                ))}
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
