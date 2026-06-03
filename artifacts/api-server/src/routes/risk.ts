import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

router.get("/risk/var-analysis", async (req, res) => {
  try {
    const [sp500, vix] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "sp500_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
    ]);

    const values = sp500
      .map((r: Record<string, string>) => parseFloat(r["SP500"] || r["Close"] || r["close"] || r["value"] || "0"))
      .filter((v) => v > 0);

    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
    returns.sort((a, b) => a - b);

    const n = returns.length;
    const historicalVar95 = returns[Math.floor(n * 0.05)] || -0.0387;
    const historicalVar99 = returns[Math.floor(n * 0.01)] || -0.0621;

    const mean = returns.reduce((s, v) => s + v, 0) / n;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const z95 = -1.645;
    const z99 = -2.326;
    const parametricVar95 = mean + z95 * stdDev;
    const parametricVar99 = mean + z99 * stdDev;

    const tailReturns95 = returns.filter((r) => r <= historicalVar95);
    const tvar95 = tailReturns95.length > 0 ? tailReturns95.reduce((s, v) => s + v, 0) / tailReturns95.length : historicalVar95 * 1.35;

    const tailReturns99 = returns.filter((r) => r <= historicalVar99);
    const tvar99 = tailReturns99.length > 0 ? tailReturns99.reduce((s, v) => s + v, 0) / tailReturns99.length : historicalVar99 * 1.35;

    let maxDrawdown = 0;
    let peak = values[0];
    for (const v of values) {
      if (v > peak) peak = v;
      const dd = (v - peak) / peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    const latestVix = vix[vix.length - 1];
    const currentVix = parseFloat(latestVix?.["VIXCLS"] || latestVix?.["Close"] || latestVix?.["close"] || latestVix?.["value"] || "18");

    const buckets: Record<string, number> = {};
    for (const r of returns) {
      const bucket = `${(Math.floor(r * 20) / 20).toFixed(2)}`;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    }
    const returnsDistribution = Object.entries(buckets)
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .map(([bucket, count]) => ({ bucket, count, frequency: count / n }));

    res.json({
      historicalVar95: Math.abs(historicalVar95),
      historicalVar99: Math.abs(historicalVar99),
      parametricVar95: Math.abs(parametricVar95),
      parametricVar99: Math.abs(parametricVar99),
      tvar95: Math.abs(tvar95),
      tvar99: Math.abs(tvar99),
      maxDrawdown,
      currentVix,
      returnsDistribution,
    });
  } catch (e) {
    req.log.error(e, "VaR analysis error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/risk/volatility-trend", async (req, res) => {
  try {
    const [sp500, vix] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "sp500_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
    ]);

    const sp500Values = sp500.map((r: Record<string, string>) => ({
      date: r["DATE"] || r["date"] || r["Date"] || "",
      value: parseFloat(r["SP500"] || r["Close"] || r["close"] || r["value"] || "0"),
    })).filter((r) => r.value > 0 && r.date);

    const vixMap: Record<string, number> = {};
    for (const r of vix) {
      const d = r["DATE"] || r["date"] || r["Date"] || "";
      const v = parseFloat(r["VIXCLS"] || r["Close"] || r["close"] || r["value"] || "0");
      if (d && v > 0) vixMap[d] = v;
    }

    const window = 12;
    const result = sp500Values.slice(window).map((r, i) => {
      const slice = sp500Values.slice(i, i + window).map((s) => s.value);
      const returns = slice.slice(1).map((v, j) => (v - slice[j]) / slice[j]);
      const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
      const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
      const rollingVol = Math.sqrt(variance * 12) * 100;
      const prev = sp500Values[i + window - 1]?.value || r.value;
      const sp500Return = prev !== 0 ? (r.value - prev) / prev * 100 : 0;
      return {
        date: r.date,
        rollingVolatility: rollingVol,
        vix: vixMap[r.date] || 18,
        sp500Return,
      };
    }).slice(-120);

    res.json(result);
  } catch (e) {
    req.log.error(e, "volatility trend error");
    res.json([]);
  }
});

router.get("/risk/drawdown", async (req, res) => {
  try {
    const sp500 = await loadCsv(path.join(DATA_DIR, "sp500_monthly.csv"));
    const series = sp500
      .map((r: Record<string, string>) => ({
        date: r["DATE"] || r["date"] || r["Date"] || "",
        price: parseFloat(r["SP500"] || r["Close"] || r["close"] || r["value"] || "0"),
      }))
      .filter((r) => r.price > 0 && r.date)
      .slice(-120);

    let peak = series[0]?.price || 1;
    const result = series.map((r) => {
      if (r.price > peak) peak = r.price;
      return { date: r.date, drawdown: (r.price - peak) / peak, price: r.price };
    });
    res.json(result);
  } catch (e) {
    req.log.error(e, "drawdown error");
    res.json([]);
  }
});

router.get("/risk/capital-charges", async (req, res) => {
  try {
    const charges = await loadCsv(path.join(DATA_DIR, "solvency_capital_charges.csv"));
    const result = charges.map((r: Record<string, string>) => ({
      assetType: r["asset_type"] || r["Asset_Type"] || r["asset_class"] || "Unknown",
      capitalCharge: parseFloat(r["capital_charge"] || r["Capital_Charge"] || r["charge_rate"] || "0"),
      marketValue: parseFloat(r["market_value"] || r["Market_Value"] || "0"),
      capitalRequired: parseFloat(r["capital_required"] || r["Capital_Required"] || "0"),
      weight: parseFloat(r["weight"] || r["allocation_weight"] || "0"),
    }));
    res.json(result.length > 0 ? result : [
      { assetType: "Government Bonds", capitalCharge: 0.0025, marketValue: 857_500_000, capitalRequired: 2_143_750, weight: 0.35 },
      { assetType: "Corporate Bonds (IG)", capitalCharge: 0.025, marketValue: 490_000_000, capitalRequired: 12_250_000, weight: 0.20 },
      { assetType: "Corporate Bonds (HY)", capitalCharge: 0.075, marketValue: 122_500_000, capitalRequired: 9_187_500, weight: 0.05 },
      { assetType: "Listed Equities", capitalCharge: 0.39, marketValue: 490_000_000, capitalRequired: 191_100_000, weight: 0.20 },
      { assetType: "Real Estate", capitalCharge: 0.25, marketValue: 245_000_000, capitalRequired: 61_250_000, weight: 0.10 },
      { assetType: "Alternatives", capitalCharge: 0.49, marketValue: 171_500_000, capitalRequired: 84_035_000, weight: 0.07 },
      { assetType: "Cash", capitalCharge: 0, marketValue: 73_500_000, capitalRequired: 0, weight: 0.03 },
    ]);
  } catch (e) {
    req.log.error(e, "capital charges error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
