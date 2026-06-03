import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

router.get("/esg/macro-data", async (req, res) => {
  try {
    const [gdp, cpi, treasury, vix, creditSpread] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "gdp.csv")),
      loadCsv(path.join(DATA_DIR, "cpi.csv")),
      loadCsv(path.join(DATA_DIR, "treasury10y.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "credit_spread.csv")),
    ]);

    const mapSeries = (rows: Record<string, string>[], valueKey: string): Array<{ date: string; value: number }> =>
      rows
        .filter((r) => r["DATE"] || r["date"] || r["Date"])
        .map((r) => ({
          date: r["DATE"] || r["date"] || r["Date"] || "",
          value: parseFloat(r[valueKey] || r["VALUE"] || r["value"] || r["Close"] || r["close"] || "0"),
        }))
        .filter((r) => r.value !== 0 && !isNaN(r.value))
        .slice(-80);

    res.json({
      gdp: mapSeries(gdp, "GDP"),
      cpi: mapSeries(cpi, "CPIAUCSL"),
      treasury: mapSeries(treasury, "DGS10"),
      vix: mapSeries(vix, "VIXCLS"),
      creditSpread: mapSeries(creditSpread, "BAMLC0A1CAAA"),
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
    const preset = SCENARIO_PRESETS[params.scenario] || SCENARIO_PRESETS.bear;
    const assumptions = {
      interestRateShock: params.interestRateShock ?? preset.interestRateShock,
      equityShock: params.equityShock ?? preset.equityShock,
      inflationShock: params.inflationShock ?? preset.inflationShock,
      creditSpreadShock: params.creditSpreadShock ?? preset.creditSpreadShock,
      gdpShock: params.gdpShock ?? preset.gdpShock,
    };

    const basePortfolioValue = 2_450_000_000;
    const baseLiabilityValue = 1_810_000_000;
    const baseSolvency = 1.43;

    const equityWeight = 0.20;
    const bondWeight = 0.60;
    const durationEffect = -bondWeight * 7.2 * assumptions.interestRateShock;
    const equityEffect = equityWeight * assumptions.equityShock;
    const creditEffect = -bondWeight * 0.5 * assumptions.creditSpreadShock;
    const portfolioImpact = (durationEffect + equityEffect + creditEffect) * basePortfolioValue;

    const liabilityDuration = 8.65;
    const liabilityImpact = -liabilityDuration * assumptions.interestRateShock * baseLiabilityValue;

    const stressedAssets = basePortfolioValue + portfolioImpact;
    const stressedLiabilities = baseLiabilityValue + liabilityImpact;
    const stressedSolvency = stressedAssets / (stressedLiabilities * 0.85);
    const solvencyImpact = stressedSolvency - baseSolvency;

    const timeSeries = Array.from({ length: 36 }, (_, i) => {
      const t = i / 36;
      const ramp = Math.sin(t * Math.PI * 0.5);
      return {
        month: i + 1,
        portfolioValue: basePortfolioValue + portfolioImpact * ramp,
        liabilityValue: baseLiabilityValue + liabilityImpact * ramp,
        solvencyRatio: baseSolvency + solvencyImpact * ramp,
      };
    });

    res.json({
      scenario: params.scenario,
      portfolioImpact,
      liabilityImpact,
      solvencyImpact,
      varImpact: Math.abs(assumptions.equityShock) * basePortfolioValue * 0.15,
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
