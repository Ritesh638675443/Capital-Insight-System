import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

const ASSETS = [
  { name: "Government Bonds", weight: 0.35, expectedReturn: 0.035, risk: 0.04 },
  { name: "Corporate Bonds (IG)", weight: 0.25, expectedReturn: 0.055, risk: 0.07 },
  { name: "Listed Equities", weight: 0.20, expectedReturn: 0.10, risk: 0.18 },
  { name: "Real Estate", weight: 0.10, expectedReturn: 0.08, risk: 0.12 },
  { name: "Alternatives", weight: 0.07, expectedReturn: 0.12, risk: 0.22 },
  { name: "Cash", weight: 0.03, expectedReturn: 0.05, risk: 0.01 },
];

function portfolioStats(weights: number[], assets: typeof ASSETS, correlations: number[][]) {
  const ret = assets.reduce((s, a, i) => s + weights[i] * a.expectedReturn, 0);
  let variance = 0;
  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      variance += weights[i] * weights[j] * assets[i].risk * assets[j].risk * correlations[i][j];
    }
  }
  const risk = Math.sqrt(variance);
  return { return: ret, risk, sharpe: (ret - 0.04) / risk };
}

router.get("/optimization/efficient-frontier", async (req, res) => {
  try {
    const correlations = [
      [1.00, 0.45, -0.15, 0.10, -0.05, 0.02],
      [0.45, 1.00, 0.20, 0.25, 0.15, 0.05],
      [-0.15, 0.20, 1.00, 0.40, 0.60, -0.10],
      [0.10, 0.25, 0.40, 1.00, 0.35, 0.00],
      [-0.05, 0.15, 0.60, 0.35, 1.00, -0.05],
      [0.02, 0.05, -0.10, 0.00, -0.05, 1.00],
    ];

    const frontier = [];
    for (let t = 0; t <= 40; t++) {
      const aggressiveness = t / 40;
      const weights = ASSETS.map((_, i) => {
        if (i === 0) return Math.max(0, 0.45 - aggressiveness * 0.35);
        if (i === 1) return Math.max(0, 0.30 - aggressiveness * 0.20);
        if (i === 2) return Math.min(0.55, 0.10 + aggressiveness * 0.45);
        if (i === 3) return Math.max(0, 0.10 - aggressiveness * 0.05);
        if (i === 4) return Math.min(0.20, 0.02 + aggressiveness * 0.18);
        return Math.max(0, 0.03 - aggressiveness * 0.03);
      });
      const sum = weights.reduce((s, w) => s + w, 0);
      const normalized = weights.map((w) => w / sum);
      const stats = portfolioStats(normalized, ASSETS, correlations);
      const weightObj: Record<string, number> = {};
      ASSETS.forEach((a, i) => { weightObj[a.name] = normalized[i]; });
      frontier.push({ ...stats, weights: weightObj });
    }

    const currentWeights = ASSETS.map((a) => a.weight);
    const currentStats = portfolioStats(currentWeights, ASSETS, correlations);

    const minVarWeights = [0.55, 0.30, 0.05, 0.06, 0.02, 0.02];
    const minVarStats = portfolioStats(minVarWeights, ASSETS, correlations);
    const minVarWeightObj: Record<string, number> = {};
    ASSETS.forEach((a, i) => { minVarWeightObj[a.name] = minVarWeights[i]; });

    res.json({
      frontier,
      currentPortfolio: currentStats,
      minVariancePortfolio: { ...minVarStats, weights: minVarWeightObj },
    });
  } catch (e) {
    req.log.error(e, "efficient frontier error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/optimization/optimal-portfolio", async (req, res) => {
  try {
    const optWeights = [0.30, 0.22, 0.30, 0.10, 0.05, 0.03];
    const correlations = [
      [1.00, 0.45, -0.15, 0.10, -0.05, 0.02],
      [0.45, 1.00, 0.20, 0.25, 0.15, 0.05],
      [-0.15, 0.20, 1.00, 0.40, 0.60, -0.10],
      [0.10, 0.25, 0.40, 1.00, 0.35, 0.00],
      [-0.05, 0.15, 0.60, 0.35, 1.00, -0.05],
      [0.02, 0.05, -0.10, 0.00, -0.05, 1.00],
    ];
    const stats = portfolioStats(optWeights, ASSETS, correlations);
    const currentStats = portfolioStats(ASSETS.map((a) => a.weight), ASSETS, correlations);

    const weightsObj: Record<string, number> = {};
    ASSETS.forEach((a, i) => { weightsObj[a.name] = optWeights[i]; });

    const totalRisk = stats.risk;
    const riskBudget = ASSETS.map((a, i) => {
      const marginalRisk = optWeights[i] * a.risk * a.risk;
      return {
        asset: a.name,
        riskContribution: marginalRisk,
        percentageRisk: marginalRisk / (totalRisk * totalRisk),
      };
    });

    res.json({
      weights: weightsObj,
      expectedReturn: stats.return,
      expectedRisk: stats.risk,
      sharpeRatio: stats.sharpe,
      improvementVsCurrent: stats.sharpe - currentStats.sharpe,
      riskBudget,
    });
  } catch (e) {
    req.log.error(e, "optimal portfolio error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
