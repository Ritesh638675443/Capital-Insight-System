import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

router.get("/solvency/tracking", async (req, res) => {
  try {
    const solvency = await loadCsv(path.join(DATA_DIR, "solvency_tracking.csv"));
    const result = solvency
      .map((r: Record<string, string>) => {
        const available = parseFloat(r["available_capital"] || r["Available_Capital"] || "0");
        const required = parseFloat(r["required_capital"] || r["Required_Capital"] || "0");
        const ratio = available / (required || 1);
        return {
          year: parseInt(r["year"] || r["Year"] || "2027"),
          availableCapital: available,
          requiredCapital: required,
          solvencyRatio: parseFloat(r["solvency_ratio"] || r["Solvency_Ratio"] || String(ratio)),
          capitalSurplus: available - required,
          status: ratio >= 1.5 ? "Strong" : ratio >= 1.2 ? "Adequate" : ratio >= 1.0 ? "Warning" : "Critical",
        };
      })
      .sort((a, b) => a.year - b.year);
    res.json(result);
  } catch (e) {
    req.log.error(e, "solvency tracking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/solvency/capital-adequacy", async (req, res) => {
  try {
    const solvency = await loadCsv(path.join(DATA_DIR, "solvency_tracking.csv"));
    const ratios = solvency
      .map((r: Record<string, string>) => parseFloat(r["solvency_ratio"] || r["Solvency_Ratio"] || "1.4"))
      .filter((v) => !isNaN(v) && v > 0);

    const current = ratios[ratios.length - 1] || 1.43;
    const avg = ratios.reduce((s, v) => s + v, 0) / (ratios.length || 1);
    const min = Math.min(...ratios);
    const max = Math.max(...ratios);

    const charges = await loadCsv(path.join(DATA_DIR, "solvency_capital_charges.csv"));
    const scrComponents = charges.slice(0, 5).map((r: Record<string, string>) => {
      const amount = parseFloat(r["capital_required"] || r["Capital_Required"] || "0");
      return {
        component: r["asset_type"] || r["Asset_Type"] || r["component"] || "SCR Component",
        amount,
        percentage: 0, // filled below
      };
    });
    const totalSCR = scrComponents.reduce((s, c) => s + c.amount, 0) || 1;
    scrComponents.forEach((c) => { c.percentage = c.amount / totalSCR; });

    res.json({
      currentSolvencyRatio: current,
      averageSolvencyRatio: avg,
      minSolvencyRatio: min,
      maxSolvencyRatio: max,
      earlyWarningTriggered: current < 1.2,
      criticalThreshold: 1.0,
      warningThreshold: 1.2,
      capitalSurplus: (current - 1.0) * 350_000_000,
      scrComponents: scrComponents.length > 0 ? scrComponents : [
        { component: "Market Risk SCR", amount: 192_500_000, percentage: 0.55 },
        { component: "Underwriting SCR", amount: 87_500_000, percentage: 0.25 },
        { component: "Counterparty Default SCR", amount: 35_000_000, percentage: 0.10 },
        { component: "Operational Risk SCR", amount: 17_500_000, percentage: 0.05 },
        { component: "Diversification Benefit", amount: -17_500_000, percentage: -0.05 },
      ],
    });
  } catch (e) {
    req.log.error(e, "capital adequacy error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
