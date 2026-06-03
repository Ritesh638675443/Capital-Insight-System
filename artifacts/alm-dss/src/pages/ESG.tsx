import { useState } from "react";
import { useApiGet, useApiPost } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt, CHART_COLORS } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import ChartCard from "@/components/ChartCard";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MacroData {
  gdp: Array<{ date: string; value: number }>;
  cpi: Array<{ date: string; value: number }>;
  treasury: Array<{ date: string; value: number }>;
  vix: Array<{ date: string; value: number }>;
  creditSpread: Array<{ date: string; value: number }>;
}
interface ScenarioParams { scenario: string; interestRateShock?: number; equityShock?: number; inflationShock?: number; creditSpreadShock?: number; gdpShock?: number; }
interface ScenarioResult {
  scenario: string; portfolioImpact: number; liabilityImpact: number; solvencyImpact: number;
  varImpact: number; projectedReturn: number; projectedVolatility: number;
  assumptions: { interestRateShock: number; equityShock: number; inflationShock: number; creditSpreadShock: number; gdpShock: number };
  timeSeries: Array<{ month: number; portfolioValue: number; liabilityValue: number; solvencyRatio: number }>;
}

const SCENARIOS = [
  { id: "bull", label: "Bull Market", desc: "Strong equity rally, rate decline" },
  { id: "bear", label: "Bear Market", desc: "Equity selloff, rate rise" },
  { id: "high_inflation", label: "High Inflation", desc: "Stagflation — high rates & inflation" },
  { id: "recession", label: "Deep Recession", desc: "Severe equity & GDP shock" },
  { id: "rate_shock", label: "Rate Shock (+300bp)", desc: "Sharp monetary tightening" },
  { id: "credit_widening", label: "Credit Widening", desc: "Spread blowout scenario" },
];

export default function ESG() {
  const macro = useApiGet<MacroData>("/esg/macro-data");
  const [selectedScenario, setSelectedScenario] = useState("bear");
  const scenarioMutation = useApiPost<ScenarioParams, ScenarioResult>("/esg/scenarios");

  const runScenario = (id: string) => {
    setSelectedScenario(id);
    scenarioMutation.mutate({ scenario: id });
  };

  const sr = scenarioMutation.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Economic Scenario Generator" subtitle="Macro Trends — GDP, CPI, Treasury, VIX, Credit Spreads & Stress Testing" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Macro Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="US Treasury 10Y Yield" subtitle="FRED: DGS10 — recent history">
            {macro.data?.treasury && macro.data.treasury.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={macro.data.treasury.slice(-40)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={7} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${fmt(v, 2)}%`, "10Y Yield"]} contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          <ChartCard title="VIX — Market Volatility Index" subtitle="CBOE Volatility Index monthly">
            {macro.data?.vix && macro.data.vix.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={macro.data.vix.slice(-40)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={7} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip formatter={(v: number) => [fmt(v, 1), "VIX"]} contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#ef4444" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          <ChartCard title="US GDP Growth" subtitle="FRED: GDP (quarterly, billions USD)">
            {macro.data?.gdp && macro.data.gdp.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={macro.data.gdp.slice(-30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={5} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}T`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip formatter={(v: number) => [`$${fmt(v, 0)}B`, "GDP"]} contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>

          <ChartCard title="AAA Corporate Credit Spread" subtitle="FRED: BAMLC0A1CAAA — OAS spread (%)">
            {macro.data?.creditSpread && macro.data.creditSpread.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={macro.data.creditSpread.slice(-40)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={7} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${fmt(v, 2)}%`, "Credit Spread"]} contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#a855f7" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
          </ChartCard>
        </div>

        {/* Scenario Selection */}
        <ChartCard title="Economic Scenario Stress Test" subtitle="Select a scenario to see portfolio impact">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => runScenario(s.id)}
                className={`p-3 rounded-lg border text-left transition-all text-xs ${
                  selectedScenario === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 text-foreground"
                }`}
              >
                <p className="font-semibold">{s.label}</p>
                <p className="text-muted-foreground mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>

          {scenarioMutation.isPending && (
            <div className="text-center text-sm text-muted-foreground py-8">Running scenario simulation...</div>
          )}

          {sr && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Portfolio Impact</p>
                  <p className={`text-lg font-bold ${sr.portfolioImpact < 0 ? "text-red-400" : "text-green-400"}`}>{fmtBn(sr.portfolioImpact)}</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Solvency Impact</p>
                  <p className={`text-lg font-bold ${sr.solvencyImpact < 0 ? "text-red-400" : "text-green-400"}`}>{sr.solvencyImpact > 0 ? "+" : ""}{fmt(sr.solvencyImpact, 3)}x</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Proj. Return</p>
                  <p className={`text-lg font-bold ${sr.projectedReturn < 0 ? "text-red-400" : "text-green-400"}`}>{fmtPct(sr.projectedReturn)}</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Proj. Volatility</p>
                  <p className="text-lg font-bold text-amber-400">{fmtPct(sr.projectedVolatility)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sr.timeSeries} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "Month", position: "insideBottom", offset: -5, fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0.5, 2.5]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }} />
                  <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
                  <Line yAxisId="left" type="monotone" dataKey="portfolioValue" stroke="#3b82f6" dot={false} strokeWidth={2} name="Portfolio Value" />
                  <Line yAxisId="left" type="monotone" dataKey="liabilityValue" stroke="#a855f7" dot={false} strokeWidth={2} name="Liability Value" />
                  <Line yAxisId="right" type="monotone" dataKey="solvencyRatio" stroke="#22c55e" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Solvency Ratio (RHS)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
