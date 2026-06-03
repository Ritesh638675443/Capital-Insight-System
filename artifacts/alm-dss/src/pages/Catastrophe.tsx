import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie, ScatterChart, Scatter, ZAxis,
} from "recharts";

interface CatastropheSummary {
  totalInsuredLoss: number; totalReinsuranceRecovery: number; totalNetLoss: number; recoveryRate: number;
  catBondTotalPrincipal: number; catBondExpectedLoss: number; ilsTotalCapital: number;
  reinsuranceTotalCoverage: number; femaProjectCount: number; topEventType: string; topState: string;
}
interface CatScenarioItem { year: number; state: string; eventType: string; returnPeriodYears: number; occurrenceProbability: number; economicLoss: number; insuredLoss: number; reinsuranceRecovery: number; netInsurerLoss: number; vixRegime: string; interestRateRegime: string; }
interface GeographicRiskItem { state: string; totalInsuredLoss: number; totalEconomicLoss: number; eventCount: number; avgNetLoss: number; topEventType: string; }
interface CatBond { bondId: string; principal: number; couponRate: number; triggerProbability: number; expectedLoss: number; expectedReturn: number; }

export default function Catastrophe() {
  const summary = useApiGet<CatastropheSummary>("/catastrophe/summary");
  const geographic = useApiGet<GeographicRiskItem[]>("/catastrophe/geographic");
  const catBonds = useApiGet<CatBond[]>("/catastrophe/cat-bonds");
  const scenarios = useApiGet<CatScenarioItem[]>("/catastrophe/scenarios");

  const s = summary.data;

  // Group scenarios by event type for bar chart
  const byEventType = (scenarios.data || []).reduce((acc, r) => {
    if (!acc[r.eventType]) acc[r.eventType] = { eventType: r.eventType, insuredLoss: 0, netLoss: 0, count: 0 };
    acc[r.eventType].insuredLoss += r.insuredLoss;
    acc[r.eventType].netLoss += r.netInsurerLoss;
    acc[r.eventType].count++;
    return acc;
  }, {} as Record<string, { eventType: string; insuredLoss: number; netLoss: number; count: number }>);
  const eventChart = Object.values(byEventType).sort((a, b) => b.insuredLoss - a.insuredLoss);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Catastrophe Risk Analytics" subtitle="Natural Perils, Reinsurance, Cat Bonds, ILS Sidecars & Geographic Exposure" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Gross Insured Loss" value={s ? fmtBn(s.totalInsuredLoss) : "—"} subtitle="All scenarios aggregate" accent="red" />
          <KpiCard title="Net Insurer Loss" value={s ? fmtBn(s.totalNetLoss) : "—"} subtitle={s ? `Reins. recovery: ${fmtPct(s.recoveryRate)}` : undefined} accent="amber" />
          <KpiCard title="Reinsurance Coverage" value={s ? fmtBn(s.reinsuranceTotalCoverage) : "—"} subtitle={s ? `Recovery: ${fmtBn(s.totalReinsuranceRecovery)}` : undefined} accent="blue" />
          <KpiCard title="Cat Bond Portfolio" value={s ? fmtBn(s.catBondTotalPrincipal) : "—"} subtitle={s ? `Expected Loss: ${fmtBn(s.catBondExpectedLoss)}` : undefined} accent="purple" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="ILS Sidecar Capital" value={s ? fmtBn(s.ilsTotalCapital) : "—"} accent="cyan" />
          <KpiCard title="Top Peril" value={s?.topEventType || "—"} subtitle="Highest frequency" accent="red" />
          <KpiCard title="Highest Exposure State" value={s?.topState || "—"} accent="amber" />
          <KpiCard title="FEMA Projects" value={s ? fmt(s.femaProjectCount, 0) : "—"} subtitle="Hazard mitigation database" accent="blue" />
        </div>

        {/* Loss by Event Type */}
        <ChartCard title="Loss Aggregation by Peril Type" subtitle="Insured vs. net insurer loss by catastrophe event">
          {eventChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis dataKey="eventType" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number, n: string) => [fmtBn(v), n === "insuredLoss" ? "Insured Loss" : "Net Insurer Loss"]}
                  contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v === "insuredLoss" ? "Insured Loss" : "Net Insurer Loss"}</span>} />
                <Bar dataKey="insuredLoss" fill="#ef4444" opacity={0.7} name="insuredLoss" />
                <Bar dataKey="netLoss" fill="#f59e0b" name="netLoss" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Geographic Exposure */}
          <ChartCard title="Geographic Loss Distribution" subtitle="Top states by insured loss exposure">
            {geographic.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={geographic.data.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis type="number" tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis dataKey="state" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={35} />
                  <Tooltip
                    formatter={(v: number, n: string) => [fmtBn(v), n === "totalInsuredLoss" ? "Insured Loss" : "Economic Loss"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="totalInsuredLoss" fill="#ef4444" opacity={0.7} name="totalInsuredLoss" radius={[0, 4, 4, 0]}>
                    {geographic.data.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          {/* Cat Bond Portfolio */}
          <ChartCard title="Cat Bond Portfolio" subtitle="Principal, trigger probability & expected returns">
            {catBonds.data ? (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Bond ID</th>
                      <th className="text-right py-2 text-muted-foreground">Principal</th>
                      <th className="text-right py-2 text-muted-foreground">Coupon</th>
                      <th className="text-right py-2 text-muted-foreground">Trigger Prob.</th>
                      <th className="text-right py-2 text-muted-foreground">Exp. Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catBonds.data.slice(0, 15).map((b, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-1.5 text-blue-400 font-mono">{b.bondId}</td>
                        <td className="text-right py-1.5">{fmtBn(b.principal)}</td>
                        <td className="text-right py-1.5 text-green-400">{fmtPct(b.couponRate)}</td>
                        <td className="text-right py-1.5 text-amber-400">{fmtPct(b.triggerProbability)}</td>
                        <td className="text-right py-1.5 text-red-400">{fmtBn(b.expectedLoss)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
