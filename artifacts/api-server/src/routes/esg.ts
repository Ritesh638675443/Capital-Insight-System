import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

function parseSp500Dates(rows: Record<string, string>[]) {
  return rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r["Price"] || ""))
    .map((r) => ({ date: r["Price"] || "", value: parseFloat(r["Close"] || "0") }))
    .filter((r) => r.value > 0);
}

router.get("/esg/macro-data", async (req, res) => {
  try {
    const [gdp, cpi, treasury, vix, creditSpread] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "gdp.csv")),
      loadCsv(path.join(DATA_DIR, "cpi.csv")),
      loadCsv(path.join(DATA_DIR, "treasury10y.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "credit_spread.csv")),
    ]);

    // GDP and CPI are standard FRED format: observation_date, VALUE or DATE, VALUE
    const mapFred = (rows: Record<string, string>[], valueKey: string) =>
      rows
        .filter((r) => /^\d{4}/.test(r["observation_date"] || r["DATE"] || ""))
        .map((r) => ({ date: r["observation_date"] || r["DATE"] || "", value: parseFloat(r[valueKey] || r["VALUE"] || "0") }))
        .filter((r) => !isNaN(r.value) && r.value !== 0)
        .slice(-80);

    // VIX and Treasury use same multi-header format as SP500
    const mapMultiHeader = (rows: Record<string, string>[]) =>
      rows
        .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r["Price"] || ""))
        .map((r) => ({ date: r["Price"] || "", value: parseFloat(r["Close"] || "0") }))
        .filter((r) => !isNaN(r.value) && r.value > 0)
        .slice(-80);

    res.json({
      gdp: mapFred(gdp, "GDP"),
      cpi: mapFred(cpi, "CPIAUCSL"),
      treasury: mapMultiHeader(treasury),
      vix: mapMultiHeader(vix),
      creditSpread: mapFred(creditSpread, "BAMLC0A1CAAA"),
    });
  } catch (e) {
    req.log.error(e, "ESG macro data error");
    res.status(500).json({ error: "Internal server error" });
  }
});

const SCENARIO_PRESETS: Record<string, { interestRateShock: number; equityShock: number; inflationShock: number; creditSpreadShock: number; gdpShock: number }> = {
  bull: { interestRateShock: -0.005, equityShock: 0.20, inflationShock: -0.005, creditSpreadShock: -0.003, gdpShock: 0.03 },
  bear: { interestRateShock: 0.015, equityShock: -0.25, inflationShock: 0.02, creditSpreadShock: 0.015, gdpShock: -0.02 },
  high_inflation: { interestRateShock: 0.025, equityShock: -0.12, inflationShock: 0.04, creditSpreadShock: 0.008, gdpShock: -0.005 },
  recession: { interestRateShock: -0.02, equityShock: -0.35, inflationShock: -0.01, creditSpreadShock: 0.025, gdpShock: -0.05 },
  rate_shock: { interestRateShock: 0.03, equityShock: -0.10, inflationShock: 0.015, creditSpreadShock: 0.01, gdpShock: -0.01 },
  credit_widening: { interestRateShock: 0.005, equityShock: -0.08, inflationShock: 0.005, creditSpreadShock: 0.04, gdpShock: -0.005 },
};

router.post("/esg/scenarios", async (req, res) => {
  try {
    const params = req.body as { scenario: string; interestRateShock?: number; equityShock?: number; inflationShock?: number; creditSpreadShock?: number; gdpShock?: number };
    const preset = SCENARIO_PRESETS[params.scenario] || SCENARIO_PRESETS["bear"]!;
    const assumptions = {
      interestRateShock: params.interestRateShock ?? preset.interestRateShock,
      equityShock: params.equityShock ?? preset.equityShock,
      inflationShock: params.inflationShock ?? preset.inflationShock,
      creditSpreadShock: params.creditSpreadShock ?? preset.creditSpreadShock,
      gdpShock: params.gdpShock ?? preset.gdpShock,
    };

    const basePortfolio = 2_450_000_000;
    const baseLiability = 1_810_000_000;
    const baseSolvency = 1.43;

    const durationEffect = -0.60 * 7.2 * assumptions.interestRateShock * basePortfolio;
    const equityEffect = 0.20 * assumptions.equityShock * basePortfolio;
    const creditEffect = -0.60 * 0.5 * assumptions.creditSpreadShock * basePortfolio;
    const portfolioImpact = durationEffect + equityEffect + creditEffect;
    const liabilityImpact = -8.65 * assumptions.interestRateShock * baseLiability + assumptions.inflationShock * 0.5 * baseLiability;

    const stressedSolvency = (basePortfolio + portfolioImpact) / ((baseLiability + liabilityImpact) * 0.85);

    const timeSeries = Array.from({ length: 36 }, (_, i) => {
      const ramp = Math.sin((i / 36) * Math.PI * 0.5);
      return {
        month: i + 1,
        portfolioValue: basePortfolio + portfolioImpact * ramp,
        liabilityValue: baseLiability + liabilityImpact * ramp,
        solvencyRatio: baseSolvency + (stressedSolvency - baseSolvency) * ramp,
      };
    });

    res.json({
      scenario: params.scenario,
      portfolioImpact,
      liabilityImpact,
      solvencyImpact: stressedSolvency - baseSolvency,
      varImpact: Math.abs(assumptions.equityShock) * basePortfolio * 0.15,
      projectedReturn: 0.0782 + assumptions.equityShock * 0.3 + assumptions.gdpShock,
      projectedVolatility: 0.1245 * (1 + Math.abs(assumptions.equityShock)),
      assumptions,
      timeSeries,
    });
  } catch (e) {
    req.log.error(e, "ESG scenario error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
