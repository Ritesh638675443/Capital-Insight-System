import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, ReferenceLine, AreaChart, Area,
} from "recharts";

interface AlmProjection {
  coverageRatio: number; fundingGap: number; durationGap: number;
  assetDuration: number; liabilityDuration: number;
  convexityAsset: number; convexityLiability: number;
  totalAssetPV: number; totalLiabilityPV: number;
  projections: Array<{ year: number; policyType: string; expectedPayout: number; presentValue: number; discountRate: number; inflationRate: number }>;
}
interface DurationAnalysis {
  macaulayDurationAsset: number; modifiedDurationAsset: number;
  macaulayDurationLiability: number; modifiedDurationLiability: number;
  durationGap: number; dollarDurationGap: number; basisPointValue: number;
  byPolicyType: Array<{ policyType: string; duration: number; pv: number }>;
}
interface CashflowMatchItem { year: number; policyType: string; expectedPayout: number; assetCashflow: number; surplus: number; cumulativeSurplus: number; }

export default function ALM() {
  const projection = useApiGet<AlmProjection>("/alm/liability-projection");
  const duration = useApiGet<DurationAnalysis>("/alm/duration-analysis");
  const cashflow = useApiGet<CashflowMatchItem[]>("/alm/cashflow-matching");

  const p = projection.data;
  const d = duration.data;

  // Aggregate projections by year for chart
  const byYear = (projection.data?.projections || []).reduce((acc, r) => {
    if (!acc[r.year]) acc[r.year] = { year: r.year, expectedPayout: 0, presentValue: 0 };
    acc[r.year].expectedPayout += r.expectedPayout;
    acc[r.year].presentValue += r.presentValue;
    return acc;
  }, {} as Record<number, { year: number; expectedPayout: number; presentValue: number }>);
  const projectionChart = Object.values(byYear).sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="ALM Engine" subtitle="Asset-Liability Management — Duration, Cashflow & Coverage Analysis" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Coverage Ratio" value={p ? `${fmt(p.coverageRatio, 2)}x` : "—"} subtitle="Assets / PV Liabilities" accent={p && p.coverageRatio >= 1 ? "green" : "red"} />
          <KpiCard title="Funding Gap" value={p ? fmtBn(Math.abs(p.fundingGap)) : "—"} subtitle={p && p.fundingGap < 0 ? "Underfunded" : "Surplus"} accent={p && p.fundingGap < 0 ? "red" : "green"} />
          <KpiCard title="Asset Duration" value={d ? `${fmt(d.macaulayDurationAsset, 2)} yrs` : "—"} subtitle={d ? `Modified: ${fmt(d.modifiedDurationAsset, 2)} yrs` : undefined} accent="blue" />
          <KpiCard title="Liability Duration" value={d ? `${fmt(d.macaulayDurationLiability, 2)} yrs` : "—"} subtitle={d ? `Duration Gap: ${fmt(d.durationGap, 2)} yrs` : undefined} accent="amber" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Asset Convexity" value={p ? fmt(p.convexityAsset, 1) : "—"} subtitle="Price sensitivity 2nd order" accent="blue" />
          <KpiCard title="Liability Convexity" value={p ? fmt(p.convexityLiability, 1) : "—"} accent="purple" />
          <KpiCard title="Dollar Duration Gap" value={d ? fmtBn(d.dollarDurationGap) : "—"} subtitle="Rate sensitivity: $DV01" accent="amber" />
          <KpiCard title="BPV (DV01)" value={d ? `$${fmt(d.basisPointValue / 1000, 0)}K` : "—"} subtitle="Per basis point change" accent="red" />
        </div>

        {/* Liability Cashflow Projection */}
        <ChartCard title="Liability Cashflow Projection" subtitle="Expected payouts and present values by year">
          {projectionChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={projectionChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtBn(v), name === "presentValue" ? "Present Value" : "Expected Payout"]}
                  contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v === "presentValue" ? "Present Value" : "Expected Payout"}</span>} />
                <Area type="monotone" dataKey="presentValue" stroke="#3b82f6" fill="url(#pvGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expectedPayout" stroke="#a855f7" fill="url(#payGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Duration by Policy Type */}
          <ChartCard title="Duration by Policy Type" subtitle="Macaulay duration and PV weight">
            {duration.data?.byPolicyType ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={duration.data.byPolicyType} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, "auto"]} />
                  <YAxis dataKey="policyType" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={130} />
                  <Tooltip
                    formatter={(v: number) => [`${fmt(v, 1)} yrs`, "Duration"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="duration" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          {/* Cashflow Matching */}
          <ChartCard title="Cashflow Matching Surplus" subtitle="Cumulative surplus of asset vs liability cashflows">
            {cashflow.data ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cashflow.data.slice(0, 20)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtBn(v), name === "surplus" ? "Period Surplus" : "Cumulative Surplus"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                  <Bar dataKey="surplus" fill="#22c55e" radius={[2, 2, 0, 0]} name="Period Surplus" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
