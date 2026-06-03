import { useApiGet } from "@/hooks/useApi";
import { fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, Legend, BarChart, Bar, Cell,
} from "recharts";

interface EfficientFrontierResult {
  frontier: Array<{ risk: number; return: number; sharpe: number; weights: Record<string, number> }>;
  currentPortfolio: { risk: number; return: number; sharpe: number };
  minVariancePortfolio: { risk: number; return: number; weights: Record<string, number> };
}
interface OptimalPortfolio {
  weights: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  improvementVsCurrent: number;
  riskBudget: Array<{ asset: string; riskContribution: number; percentageRisk: number }>;
}

export default function Optimization() {
  const frontier = useApiGet<EfficientFrontierResult>("/optimization/efficient-frontier");
  const optimal = useApiGet<OptimalPortfolio>("/optimization/optimal-portfolio");

  const f = frontier.data;
  const o = optimal.data;

  const frontierPoints = f?.frontier.map((p) => ({ x: p.risk * 100, y: p.return * 100, sharpe: p.sharpe })) || [];
  const currentPoint = f ? { x: f.currentPortfolio.risk * 100, y: f.currentPortfolio.return * 100 } : null;
  const optimalPoint = o ? { x: o.expectedRisk * 100, y: o.expectedReturn * 100 } : null;

  const weightsData = o
    ? Object.entries(o.weights).map(([asset, weight], i) => ({ asset, weight, color: CHART_COLORS[i % CHART_COLORS.length] }))
    : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Portfolio Optimization" subtitle="Mean-Variance Efficient Frontier & Optimal ALM Portfolio Construction" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Optimal Sharpe Ratio" value={o ? fmt(o.sharpeRatio, 3) : "—"} subtitle="Maximum Sharpe portfolio" accent="green" />
          <KpiCard title="Optimal Return" value={o ? fmtPct(o.expectedReturn) : "—"} subtitle="Expected annual return" accent="blue" />
          <KpiCard title="Optimal Risk" value={o ? fmtPct(o.expectedRisk) : "—"} subtitle="Expected volatility" accent="amber" />
          <KpiCard title="Sharpe Improvement" value={o ? `+${fmt(o.improvementVsCurrent, 3)}` : "—"} subtitle="vs. current portfolio" accent="purple" trend={o && o.improvementVsCurrent > 0 ? "up" : "down"} trendLabel={o && o.improvementVsCurrent > 0 ? "Improvement available" : "Already optimal"} />
        </div>

        {/* Efficient Frontier */}
        <ChartCard title="Mean-Variance Efficient Frontier" subtitle="Risk-return tradeoff — hover for portfolio details">
          {frontierPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                <XAxis
                  dataKey="x" type="number" name="Risk"
                  label={{ value: "Portfolio Volatility (%) →", position: "insideBottom", offset: -15, fill: "#94a3b8", fontSize: 12 }}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <YAxis
                  dataKey="y" type="number" name="Return"
                  label={{ value: "Expected Return (%) →", angle: -90, position: "insideLeft", offset: 10, fill: "#94a3b8", fontSize: 12 }}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload as { x: number; y: number; sharpe: number };
                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <p>Return: <span className="text-green-400 font-bold">{d.y?.toFixed(2)}%</span></p>
                        <p>Risk: <span className="text-red-400 font-bold">{d.x?.toFixed(2)}%</span></p>
                        <p>Sharpe: <span className="text-blue-400 font-bold">{d.sharpe?.toFixed(3)}</span></p>
                      </div>
                    );
                  }}
                />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
                <Scatter name="Efficient Frontier" data={frontierPoints} fill="#3b82f6" opacity={0.7} r={3} />
                {currentPoint && (
                  <ReferenceDot x={currentPoint.x} y={currentPoint.y} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={2} label={{ value: "Current", position: "right", fill: "#f59e0b", fontSize: 11 }} />
                )}
                {optimalPoint && (
                  <ReferenceDot x={optimalPoint.x} y={optimalPoint.y} r={8} fill="#22c55e" stroke="#fff" strokeWidth={2} label={{ value: "Optimal", position: "right", fill: "#22c55e", fontSize: 11 }} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Optimal Weights */}
          <ChartCard title="Optimal Portfolio Weights" subtitle="Max Sharpe Ratio allocation vs. current">
            {weightsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weightsData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis dataKey="asset" type="category" tick={{ fontSize: 9, fill: "#94a3b8" }} width={140} />
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Weight"]}
                    contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                  />
                  <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {weightsData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          {/* Risk Budget */}
          <ChartCard title="Risk Budget Allocation" subtitle="Marginal risk contribution by asset">
            {optimal.data?.riskBudget ? (
              <div className="space-y-2 pt-2">
                {optimal.data.riskBudget.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground">{r.asset}</span>
                      <span className="text-muted-foreground">{fmtPct(r.percentageRisk, 1)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.max(0, r.percentageRisk * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
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
