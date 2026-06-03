import { useApiGet } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, Cell, PieChart, Pie,
} from "recharts";

interface PortfolioSummary {
  totalValue: number; annualReturn: number; volatility: number; sharpeRatio: number;
  var95: number; tvar95: number; maxDrawdown: number; beta: number; alpha: number; informationRatio: number;
}
interface HoldingItem { asset: string; allocationWeight: number; marketValue: number; capitalCharge: number; capitalRequired: number; riskContribution: number; }
interface SectorExposureItem { sector: string; count: number; avgPE: number; avgMarketCap: number; weight: number; }
interface TimeSeriesPoint { date: string; value: number; return?: number; }

export default function Portfolio() {
  const summary = useApiGet<PortfolioSummary>("/portfolio/summary");
  const holdings = useApiGet<HoldingItem[]>("/portfolio/holdings");
  const sectors = useApiGet<SectorExposureItem[]>("/portfolio/sector-exposure");
  const sp500 = useApiGet<TimeSeriesPoint[]>("/portfolio/sp500-performance");

  const s = summary.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Portfolio Analytics" subtitle="Holdings, Sector Exposure, Performance & Attribution" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Portfolio AUM" value={s ? fmtBn(s.totalValue) : "—"} subtitle="Total Market Value" accent="blue" trend="up" trendLabel={s ? fmtPct(s.annualReturn) + " annual return" : undefined} />
          <KpiCard title="Sharpe Ratio" value={s ? fmt(s.sharpeRatio, 3) : "—"} subtitle={s ? `Alpha: ${fmtPct(s.alpha)} | Beta: ${fmt(s.beta, 2)}` : undefined} accent="green" />
          <KpiCard title="Volatility (Ann.)" value={s ? fmtPct(s.volatility) : "—"} subtitle={s ? `VaR 95%: ${fmtBn(s.var95)}` : undefined} accent="amber" />
          <KpiCard title="Max Drawdown" value={s ? fmtPct(s.maxDrawdown) : "—"} subtitle="Historical maximum" accent="red" />
        </div>

        {/* S&P 500 Performance */}
        <ChartCard title="S&P 500 Index History" subtitle="Monthly closing prices (10-year lookback)">
          {sp500.data && sp500.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sp500.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="sp500Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={11} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number) => [fmt(v, 0), "Index Level"]}
                  contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#sp500Grad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Holdings Table */}
          <ChartCard title="Portfolio Holdings" subtitle="Weights and capital requirements">
            {holdings.data ? (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Asset</th>
                      <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Weight</th>
                      <th className="text-right py-2 pr-3 text-muted-foreground font-medium">MV</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Cap. Req.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.data.map((h, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 pr-3 text-foreground">{h.asset}</td>
                        <td className="text-right py-1.5 pr-3 text-blue-400">{fmtPct(h.allocationWeight)}</td>
                        <td className="text-right py-1.5 pr-3">{fmtBn(h.marketValue)}</td>
                        <td className="text-right py-1.5 text-amber-400">{fmtBn(h.capitalRequired)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          {/* S&P 500 Sector Exposure */}
          <ChartCard title="S&P 500 Sector Exposure" subtitle="Market-cap weighted sector breakdown">
            {sectors.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sectors.data.slice(0, 8)} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis dataKey="sector" type="category" tick={{ fontSize: 9, fill: "#94a3b8" }} width={130} />
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "S&P 500 Weight"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {sectors.data.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
