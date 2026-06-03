import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell, AreaChart, Area, Legend,
} from "recharts";

interface VarAnalysis {
  historicalVar95: number; historicalVar99: number; parametricVar95: number; parametricVar99: number;
  tvar95: number; tvar99: number; maxDrawdown: number; currentVix: number;
  returnsDistribution: Array<{ bucket: string; count: number; frequency: number }>;
}
interface VolatilityPoint { date: string; rollingVolatility: number; vix: number; sp500Return: number; }
interface DrawdownPoint { date: string; drawdown: number; price: number; }
interface CapitalChargeItem { assetType: string; capitalCharge: number; marketValue: number; capitalRequired: number; weight: number; }

const BASE_PORTFOLIO = 2_450_000_000;

export default function Risk() {
  const varData = useApiGet<VarAnalysis>("/risk/var-analysis");
  const volatility = useApiGet<VolatilityPoint[]>("/risk/volatility-trend");
  const drawdown = useApiGet<DrawdownPoint[]>("/risk/drawdown");
  const charges = useApiGet<CapitalChargeItem[]>("/risk/capital-charges");

  const v = varData.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Risk & Capital Engine" subtitle="VaR, TVaR, Drawdown, Volatility & Solvency Capital Requirements" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Historical VaR 95%" value={v ? fmtBn(v.historicalVar95 * BASE_PORTFOLIO) : "—"} subtitle={v ? `VaR 99%: ${fmtBn(v.historicalVar99 * BASE_PORTFOLIO)}` : undefined} accent="red" />
          <KpiCard title="TVaR 95% (CVaR)" value={v ? fmtBn(v.tvar95 * BASE_PORTFOLIO) : "—"} subtitle={v ? `TVaR 99%: ${fmtBn(v.tvar99 * BASE_PORTFOLIO)}` : undefined} accent="red" />
          <KpiCard title="Current VIX" value={v ? fmt(v.currentVix, 1) : "—"} subtitle="Market fear gauge" accent={v && v.currentVix > 25 ? "red" : v && v.currentVix > 18 ? "amber" : "green"} />
          <KpiCard title="Max Drawdown" value={v ? fmtPct(v.maxDrawdown) : "—"} subtitle="S&P 500 historical" accent="amber" />
        </div>

        {/* VaR Comparison Table + Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="VaR Methodology Comparison">
            {v ? (
              <div className="space-y-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Method</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">VaR 95%</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">VaR 99%</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">TVaR 95%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-foreground">Historical</td>
                      <td className="text-right py-2 text-red-400">{fmtPct(v.historicalVar95)}</td>
                      <td className="text-right py-2 text-red-500">{fmtPct(v.historicalVar99)}</td>
                      <td className="text-right py-2 text-orange-400">{fmtPct(v.tvar95)}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 text-foreground">Parametric (Normal)</td>
                      <td className="text-right py-2 text-red-400">{fmtPct(v.parametricVar95)}</td>
                      <td className="text-right py-2 text-red-500">{fmtPct(v.parametricVar99)}</td>
                      <td className="text-right py-2 text-orange-400">{fmtPct(v.tvar99)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: "Portfolio VaR 95%", val: fmtBn(v.historicalVar95 * BASE_PORTFOLIO) },
                    { label: "Portfolio VaR 99%", val: fmtBn(v.historicalVar99 * BASE_PORTFOLIO) },
                    { label: "Portfolio TVaR 95%", val: fmtBn(v.tvar95 * BASE_PORTFOLIO) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold text-red-400">{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          <ChartCard title="Returns Distribution" subtitle="Monthly S&P 500 returns frequency">
            {varData.data?.returnsDistribution ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={varData.data.returnsDistribution.filter((d, i) => i % 2 === 0)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Frequency"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="frequency" radius={[2, 2, 0, 0]}>
                    {varData.data.returnsDistribution.filter((_, i) => i % 2 === 0).map((d, i) => (
                      <Cell key={i} fill={parseFloat(d.bucket) < -0.05 ? "#ef4444" : parseFloat(d.bucket) < 0 ? "#f59e0b" : "#22c55e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>

        {/* Rolling Volatility + Drawdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Rolling 12M Volatility vs VIX" subtitle="Annualized volatility comparison">
            {volatility.data && volatility.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={volatility.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={17} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
                  <Line type="monotone" dataKey="rollingVolatility" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Rolling Vol (%)" />
                  <Line type="monotone" dataKey="vix" stroke="#ef4444" dot={false} strokeWidth={1.5} name="VIX" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          <ChartCard title="Drawdown Analysis" subtitle="S&P 500 historical peak-to-trough drawdown">
            {drawdown.data && drawdown.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={drawdown.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={17} />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Drawdown"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>

        {/* Capital Charges */}
        <ChartCard title="Solvency II Capital Charges by Asset Class" subtitle="SCR capital requirements per Solvency II Standard Formula">
          {charges.data ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charges.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="assetType" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number, n: string) => [fmtBn(v), n === "capitalRequired" ? "Capital Required" : "Market Value"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v === "capitalRequired" ? "Capital Required" : "Market Value"}</span>} />
                  <Bar dataKey="marketValue" fill="#3b82f6" name="marketValue" opacity={0.5} />
                  <Bar dataKey="capitalRequired" fill="#ef4444" name="capitalRequired" />
                </BarChart>
              </ResponsiveContainer>
              <table className="text-xs self-start">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 text-muted-foreground">Asset</th>
                    <th className="text-right py-1.5 text-muted-foreground">Charge</th>
                    <th className="text-right py-1.5 text-muted-foreground">Cap. Req.</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.data.map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-2">{c.assetType}</td>
                      <td className="text-right py-1.5 pr-2 text-amber-400">{fmtPct(c.capitalCharge)}</td>
                      <td className="text-right py-1.5 text-red-400">{fmtBn(c.capitalRequired)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>
      </div>
    </div>
  );
}
