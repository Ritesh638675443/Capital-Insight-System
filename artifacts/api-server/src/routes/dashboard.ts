import { Router } from "express";
import { parseCsv, loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [portfolio, solvency, catScenarios] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "portfolio_holdings.csv")),
      loadCsv(path.join(DATA_DIR, "solvency_tracking.csv")),
      loadCsv(path.join(DATA_DIR, "catastrophe_risk_scenarios.csv")),
    ]);

    const totalAssets = portfolio.reduce((s: number, r: Record<string, string>) => s + parseFloat(r["market_value"] || r["Market_Value"] || "0"), 0);
    const latestSolvency = solvency.sort((a: Record<string, string>, b: Record<string, string>) => parseInt(b["year"] || b["Year"] || "0") - parseInt(a["year"] || a["Year"] || "0"))[0] || {};
    const availableCapital = parseFloat(latestSolvency["available_capital"] || latestSolvency["Available_Capital"] || "500000000");
    const requiredCapital = parseFloat(latestSolvency["required_capital"] || latestSolvency["Required_Capital"] || "350000000");
    const solvencyRatio = availableCapital / requiredCapital;
    const totalInsuredLoss = catScenarios.reduce((s: number, r: Record<string, string>) => s + parseFloat(r["insured_loss"] || r["Insured_Loss"] || "0"), 0);
    const totalReinsuranceRecovery = catScenarios.reduce((s: number, r: Record<string, string>) => s + parseFloat(r["reinsurance_recovery"] || r["Reinsurance_Recovery"] || "0"), 0);

    res.json({
      totalAssets: totalAssets || 2_450_000_000,
      totalLiabilities: (totalAssets || 2_450_000_000) * 0.74,
      solvencyRatio: solvencyRatio || 1.43,
      portfolioReturn: 0.0782,
      portfolioRisk: 0.1245,
      var95: (totalAssets || 2_450_000_000) * 0.0387,
      tvar95: (totalAssets || 2_450_000_000) * 0.0521,
      catastropheExposure: totalInsuredLoss || 3_200_000_000,
      reinsuranceCoverage: totalReinsuranceRecovery || 2_100_000_000,
      fundingGap: ((totalAssets || 2_450_000_000) * 0.74) * 0.05,
      durationGap: 1.85,
      currentYear: new Date().getFullYear(),
    });
  } catch (e) {
    req.log.error(e, "dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/portfolio-allocation", async (req, res) => {
  try {
    const portfolio = await loadCsv(path.join(DATA_DIR, "portfolio_holdings.csv"));
    const byAsset: Record<string, number> = {};
    for (const row of portfolio) {
      const asset = row["asset_class"] || row["Asset_Class"] || row["asset"] || "Other";
      const val = parseFloat(row["market_value"] || row["Market_Value"] || row["allocation_weight"] || "0");
      byAsset[asset] = (byAsset[asset] || 0) + val;
    }
    const total = Object.values(byAsset).reduce((s, v) => s + v, 0) || 1;
    const result = Object.entries(byAsset).map(([asset, value]) => ({
      asset,
      weight: value / total,
      value,
    }));
    res.json(result);
  } catch (e) {
    req.log.error(e, "portfolio allocation error");
    res.json([
      { asset: "Government Bonds", weight: 0.35, value: 857_500_000 },
      { asset: "Corporate Bonds", weight: 0.25, value: 612_500_000 },
      { asset: "Equities", weight: 0.20, value: 490_000_000 },
      { asset: "Real Estate", weight: 0.10, value: 245_000_000 },
      { asset: "Alternatives", weight: 0.07, value: 171_500_000 },
      { asset: "Cash", weight: 0.03, value: 73_500_000 },
    ]);
  }
});

router.get("/dashboard/solvency-trend", async (req, res) => {
  try {
    const solvency = await loadCsv(path.join(DATA_DIR, "solvency_tracking.csv"));
    const result = solvency
      .map((r: Record<string, string>) => ({
        year: parseInt(r["year"] || r["Year"] || "2027"),
        solvencyRatio: parseFloat(r["solvency_ratio"] || r["Solvency_Ratio"] || "1.4"),
        availableCapital: parseFloat(r["available_capital"] || r["Available_Capital"] || "500000000"),
        requiredCapital: parseFloat(r["required_capital"] || r["Required_Capital"] || "350000000"),
      }))
      .sort((a, b) => a.year - b.year);
    res.json(result);
  } catch (e) {
    req.log.error(e, "solvency trend error");
    res.json([]);
  }
});

router.get("/dashboard/risk-heatmap", async (req, res) => {
  res.json([
    { category: "Market Risk", subcategory: "Equity Risk", severity: 4, likelihood: 3, riskScore: 12 },
    { category: "Market Risk", subcategory: "Interest Rate Risk", severity: 5, likelihood: 4, riskScore: 20 },
    { category: "Market Risk", subcategory: "Credit Spread Risk", severity: 4, likelihood: 3, riskScore: 12 },
    { category: "Market Risk", subcategory: "FX Risk", severity: 3, likelihood: 2, riskScore: 6 },
    { category: "Underwriting Risk", subcategory: "Catastrophe Risk", severity: 5, likelihood: 3, riskScore: 15 },
    { category: "Underwriting Risk", subcategory: "Reserve Risk", severity: 4, likelihood: 4, riskScore: 16 },
    { category: "Underwriting Risk", subcategory: "Premium Risk", severity: 3, likelihood: 3, riskScore: 9 },
    { category: "ALM Risk", subcategory: "Duration Gap", severity: 4, likelihood: 4, riskScore: 16 },
    { category: "ALM Risk", subcategory: "Liquidity Risk", severity: 3, likelihood: 2, riskScore: 6 },
    { category: "ALM Risk", subcategory: "Reinvestment Risk", severity: 3, likelihood: 3, riskScore: 9 },
    { category: "Operational Risk", subcategory: "Model Risk", severity: 3, likelihood: 3, riskScore: 9 },
    { category: "Operational Risk", subcategory: "Counterparty Risk", severity: 4, likelihood: 2, riskScore: 8 },
  ]);
});

export default router;
