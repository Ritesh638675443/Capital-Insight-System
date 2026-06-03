import { Router } from "express";
import path from "path";

const router = Router();

router.post("/scenario/run", async (req, res) => {
  try {
    const {
      gdpShock = 0,
      inflationShock = 0,
      interestRateShock = 0,
      creditSpreadShock = 0,
      equityShock = 0,
      catastropheShock = 0,
    } = req.body as {
      gdpShock: number;
      inflationShock: number;
      interestRateShock: number;
      creditSpreadShock: number;
      equityShock: number;
      catastropheShock: number;
    };

    const basePortfolio = 2_450_000_000;
    const baseLiability = 1_810_000_000;
    const baseSolvency = 1.43;
    const baseVar = 94_815_000;

    const equityWeight = 0.20;
    const bondDuration = 7.2;
    const bondWeight = 0.60;

    const bondImpact = -bondDuration * interestRateShock * bondWeight * basePortfolio;
    const equityImpact = equityShock * equityWeight * basePortfolio;
    const creditImpact = -bondWeight * 0.5 * creditSpreadShock * basePortfolio;
    const catImpact = -catastropheShock * 0.15 * basePortfolio;
    const portfolioImpact = bondImpact + equityImpact + creditImpact + catImpact;

    const liabilityRateDuration = -8.65 * interestRateShock * baseLiability;
    const liabilityInflation = inflationShock * 0.5 * baseLiability;
    const liabilityImpact = liabilityRateDuration + liabilityInflation;

    const stressedPortfolioValue = basePortfolio + portfolioImpact;
    const stressedLiabilityValue = baseLiability + liabilityImpact;
    const stressedSolvency = stressedPortfolioValue / (stressedLiabilityValue * 0.85);
    const varImpact = baseVar * (1 + Math.abs(equityShock) + Math.abs(creditSpreadShock));

    const breakdown = [
      { factor: "Interest Rate Shock", impact: bondImpact, description: `${(interestRateShock * 100).toFixed(0)}bp parallel shift on bond portfolio (dur: ${bondDuration}yr)` },
      { factor: "Equity Market Shock", impact: equityImpact, description: `${(equityShock * 100).toFixed(0)}% equity move on ${(equityWeight * 100).toFixed(0)}% equity allocation` },
      { factor: "Credit Spread Widening", impact: creditImpact, description: `${(creditSpreadShock * 100).toFixed(0)}bp spread widening on corporate bonds` },
      { factor: "Catastrophe Loss", impact: catImpact, description: `${(catastropheShock * 100).toFixed(0)}% catastrophe shock multiplier` },
      { factor: "Liability Rate Impact", impact: liabilityRateDuration, description: `Rate effect on liabilities (dur: 8.65yr)` },
      { factor: "Inflation on Liabilities", impact: liabilityInflation, description: `${(inflationShock * 100).toFixed(0)}% inflation impact on claims` },
    ];

    res.json({
      portfolioImpact,
      portfolioImpactPct: portfolioImpact / basePortfolio,
      liabilityImpact,
      liabilityImpactPct: liabilityImpact / baseLiability,
      solvencyRatioAfter: stressedSolvency,
      solvencyImpact: stressedSolvency - baseSolvency,
      var95After: varImpact,
      catastropheLossAdditional: Math.abs(catImpact),
      stressedPortfolioValue,
      stressedLiabilityValue,
      breakdown,
    });
  } catch (e) {
    req.log.error(e, "scenario run error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
