import { useState } from "react";
import { useApiPost } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import ChartCard from "@/components/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from "recharts";

interface CustomScenarioParams {
  gdpShock: number; inflationShock: number; interestRateShock: number;
  creditSpreadShock: number; equityShock: number; catastropheShock: number;
}
interface CustomScenarioResult {
  portfolioImpact: number; portfolioImpactPct: number;
  liabilityImpact: number; liabilityImpactPct: number;
  solvencyRatioAfter: number; solvencyImpact: number;
  var95After: number; catastropheLossAdditional: number;
  stressedPortfolioValue: number; stressedLiabilityValue: number;
  breakdown: Array<{ factor: string; impact: number; description: string }>;
}

const DEFAULT_PARAMS: CustomScenarioParams = {
  gdpShock: -0.02,
  inflationShock: 0.02,
  interestRateShock: 0.015,
  creditSpreadShock: 0.015,
  equityShock: -0.25,
  catastropheShock: 0.5,
};

function SliderInput({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono font-bold ${value < 0 ? "text-red-400" : value > 0 ? "text-green-400" : "text-muted-foreground"}`}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted"
        style={{ accentColor: value < 0 ? "#ef4444" : "#22c55e" }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function Scenario() {
  const [params, setParams] = useState<CustomScenarioParams>(DEFAULT_PARAMS);
  const mutation = useApiPost<CustomScenarioParams, CustomScenarioResult>("/scenario/run");

  const set = (key: keyof CustomScenarioParams) => (v: number) => setParams((p) => ({ ...p, [key]: v }));
  const run = () => mutation.mutate(params);

  const r = mutation.data;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Scenario Builder" subtitle="Custom Stress Test — Interactive Multi-Factor Shock Analysis" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <ChartCard title="Scenario Parameters" subtitle="Adjust shocks and run simulation">
              <div className="space-y-5 pt-1">
                <SliderInput label="Equity Market Shock" value={params.equityShock} min={-0.6} max={0.3} step={0.01} onChange={set("equityShock")} format={fmtPct} />
                <SliderInput label="Interest Rate Shock" value={params.interestRateShock} min={-0.03} max={0.05} step={0.001} onChange={set("interestRateShock")} format={(v) => `${(v * 100).toFixed(1)}bp`} />
                <SliderInput label="Credit Spread Shock" value={params.creditSpreadShock} min={-0.01} max={0.1} step={0.001} onChange={set("creditSpreadShock")} format={(v) => `${(v * 100).toFixed(1)}bp`} />
                <SliderInput label="Inflation Shock" value={params.inflationShock} min={-0.02} max={0.06} step={0.005} onChange={set("inflationShock")} format={fmtPct} />
                <SliderInput label="GDP Shock" value={params.gdpShock} min={-0.1} max={0.05} step={0.005} onChange={set("gdpShock")} format={fmtPct} />
                <SliderInput label="Catastrophe Multiplier" value={params.catastropheShock} min={0} max={3} step={0.1} onChange={set("catastropheShock")} format={(v) => `${fmt(v, 1)}x`} />

                <button
                  onClick={run}
                  disabled={mutation.isPending}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {mutation.isPending ? "Running..." : "Run Stress Test"}
                </button>

                {/* Presets */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Quick Presets</p>
                  {[
                    { label: "2008 GFC", params: { equityShock: -0.55, interestRateShock: -0.02, creditSpreadShock: 0.08, inflationShock: -0.01, gdpShock: -0.04, catastropheShock: 0.3 } },
                    { label: "2020 COVID", params: { equityShock: -0.34, interestRateShock: -0.015, creditSpreadShock: 0.05, inflationShock: -0.005, gdpShock: -0.033, catastropheShock: 0.5 } },
                    { label: "2022 Rate Shock", params: { equityShock: -0.20, interestRateShock: 0.04, creditSpreadShock: 0.02, inflationShock: 0.07, gdpShock: -0.01, catastropheShock: 0.1 } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => { setParams(preset.params); setTimeout(run, 100); }}
                      className="w-full px-3 py-1.5 rounded border border-border text-xs text-left hover:bg-muted transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {!r && !mutation.isPending && (
              <div className="rounded-lg border border-dashed border-border h-48 flex items-center justify-center text-muted-foreground text-sm">
                Adjust parameters and run the stress test to see impact
              </div>
            )}
            {mutation.isPending && (
              <div className="rounded-lg border border-border h-48 flex items-center justify-center text-muted-foreground text-sm">
                Calculating scenario impact...
              </div>
            )}
            {r && (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Portfolio Impact", value: fmtBn(r.portfolioImpact), pct: fmtPct(r.portfolioImpactPct), neg: r.portfolioImpact < 0 },
                    { label: "Liability Impact", value: fmtBn(r.liabilityImpact), pct: fmtPct(r.liabilityImpactPct), neg: r.liabilityImpact > 0 },
                    { label: "Solvency After", value: `${fmt(r.solvencyRatioAfter, 2)}x`, pct: r.solvencyImpact >= 0 ? `+${fmt(r.solvencyImpact, 3)}` : fmt(r.solvencyImpact, 3), neg: r.solvencyRatioAfter < 1.2 },
                    { label: "Stressed Portfolio", value: fmtBn(r.stressedPortfolioValue), pct: "Post-stress", neg: false },
                    { label: "Stressed Liability", value: fmtBn(r.stressedLiabilityValue), pct: "Post-stress", neg: false },
                    { label: "Cat Loss Add.", value: fmtBn(r.catastropheLossAdditional), pct: "Additional exposure", neg: true },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg border p-3 text-center ${item.neg ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-lg font-bold ${item.neg ? "text-red-400" : "text-green-400"}`}>{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.pct}</p>
                    </div>
                  ))}
                </div>

                {/* Impact Breakdown Chart */}
                <ChartCard title="Impact Breakdown by Risk Factor">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={r.breakdown} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,20%,20%)" />
                      <XAxis type="number" tickFormatter={(v) => fmtBn(v)} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis dataKey="factor" type="category" tick={{ fontSize: 9, fill: "#94a3b8" }} width={150} />
                      <Tooltip
                        formatter={(v: number) => [fmtBn(v), "Impact"]}
                        contentStyle={{ background: "hsl(222,25%,11%)", border: "1px solid hsl(217,20%,20%)", borderRadius: 8 }}
                      />
                      <ReferenceLine x={0} stroke="#94a3b8" />
                      <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                        {r.breakdown.map((d, i) => (
                          <Cell key={i} fill={d.impact < 0 ? "#ef4444" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Descriptions */}
                <div className="space-y-2">
                  {r.breakdown.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs border border-border/50 rounded-lg p-3">
                      <span className={`font-bold shrink-0 ${d.impact < 0 ? "text-red-400" : "text-green-400"}`}>{fmtBn(d.impact)}</span>
                      <div>
                        <span className="font-semibold text-foreground">{d.factor}:</span>{" "}
                        <span className="text-muted-foreground">{d.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
