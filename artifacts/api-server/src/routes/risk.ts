import { Router } from "express";
import { loadCsv } from "../lib/csv";
import path from "path";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

// SP500 CSV has 3 header rows: row0=Price/Close/..., row1=Ticker/^GSPC/..., row2=Date/empty...
// Actual data starts at row3. csv-parse with columns:true uses row0 as headers.
function parseSp500Rows(rows: Record<string, string>[]) {
  return rows
    .filter((r) => {
      const date = r["Price"] || "";
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    })
    .map((r) => ({ date: r["Price"] || "", value: parseFloat(r["Close"] || "0") }))
    .filter((r) => r.value > 0);
}

function parseVixRows(rows: Record<string, string>[]) {
  return rows
    .filter((r) => {
      const date = r["Price"] || "";
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    })
    .map((r) => ({ date: r["Price"] || "", value: parseFloat(r["Close"] || "0") }))
    .filter((r) => r.value > 0);
}

router.get("/risk/var-analysis", async (req, res) => {
  try {
    const [sp500Rows, vixRows] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "sp500_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
    ]);

    const sp500 = parseSp500Rows(sp500Rows);
    const vix = parseVixRows(vixRows);

    const values = sp500.map((r) => r.value);
    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
    const sorted = [...returns].sort((a, b) => a - b);
    const n = sorted.length;

    const historicalVar95 = Math.abs(sorted[Math.floor(n * 0.05)] || -0.0387);
    const historicalVar99 = Math.abs(sorted[Math.floor(n * 0.01)] || -0.0621);

    const mean = returns.reduce((s, v) => s + v, 0) / (n || 1);
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n || 1);
    const stdDev = Math.sqrt(variance);
    const parametricVar95 = Math.abs(mean + -1.645 * stdDev);
    const parametricVar99 = Math.abs(mean + -2.326 * stdDev);

    const tail95 = sorted.filter((r) => r <= -historicalVar95);
    const tvar95 = tail95.length > 0 ? Math.abs(tail95.reduce((s, v) => s + v, 0) / tail95.length) : historicalVar95 * 1.35;
    const tail99 = sorted.filter((r) => r <= -historicalVar99);
    const tvar99 = tail99.length > 0 ? Math.abs(tail99.reduce((s, v) => s + v, 0) / tail99.length) : historicalVar99 * 1.35;

    let maxDrawdown = 0, peak = values[0] || 1;
    for (const v of values) {
      if (v > peak) peak = v;
      const dd = (v - peak) / peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    const currentVix = vix[vix.length - 1]?.value || 18;

    const buckets: Record<string, number> = {};
    for (const r of returns) {
      const b = (Math.floor(r * 20) / 20).toFixed(2);
      buckets[b] = (buckets[b] || 0) + 1;
    }
    const returnsDistribution = Object.entries(buckets)
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .map(([bucket, count]) => ({ bucket, count, frequency: count / (n || 1) }));

    res.json({ historicalVar95, historicalVar99, parametricVar95, parametricVar99, tvar95, tvar99, maxDrawdown, currentVix, returnsDistribution });
  } catch (e) {
    req.log.error(e, "VaR analysis error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/risk/volatility-trend", async (req, res) => {
  try {
    const [sp500Rows, vixRows] = await Promise.all([
      loadCsv(path.join(DATA_DIR, "sp500_monthly.csv")),
      loadCsv(path.join(DATA_DIR, "vix_monthly.csv")),
    ]);
    const sp500 = parseSp500Rows(sp500Rows);
    const vixMap: Record<string, number> = {};
    for (const r of parseVixRows(vixRows)) vixMap[r.date] = r.value;

    const window = 12;
    const result = sp500.slice(window).map((r, i) => {
      const slice = sp500.slice(i, i + window).map((s) => s.value);
      const rets = slice.slice(1).map((v, j) => (v - slice[j]) / slice[j]);
      const m = rets.reduce((s, v) => s + v, 0) / (rets.length || 1);
      const vol = Math.sqrt(rets.reduce((s, v) => s + (v - m) ** 2, 0) / (rets.length || 1) * 12) * 100;
      const prev = sp500[i + window - 1]?.value || r.value;
      return { date: r.date, rollingVolatility: vol, vix: vixMap[r.date] || 18, sp500Return: prev !== 0 ? (r.value - prev) / prev * 100 : 0 };
    }).slice(-120);
    res.json(result);
  } catch (e) {
    req.log.error(e, "volatility trend error");
    res.json([]);
  }
});

router.get("/risk/drawdown", async (req, res) => {
  try {
    const rows = await loadCsv(path.join(DATA_DIR, "sp500_monthly.csv"));
    const series = parseSp500Rows(rows).slice(-120);
    let peak = series[0]?.value || 1;
    const result = series.map((r) => {
      if (r.value > peak) peak = r.value;
      return { date: r.date, drawdown: (r.value - peak) / peak, price: r.value };
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
    const portfolioMap: Record<string, number> = {
      "Equity": 490_000_000,
      "Corporate Bond": 612_500_000,
      "Government Bond": 857_500_000,
      "Real Estate": 245_000_000,
      "Cash": 73_500_000,
    };
    const result = charges.map((r) => {
      const at = r["Asset_Type"] || "Unknown";
      const charge = parseFloat(r["Capital_Charge"] || "0");
      const mv = portfolioMap[at] || 100_000_000;
      return { assetType: at, capitalCharge: charge, marketValue: mv, capitalRequired: mv * charge, weight: mv / 2_450_000_000 };
    });
    res.json(result.length > 0 ? result : [
      { assetType: "Government Bonds", capitalCharge: 0.0025, marketValue: 857_500_000, capitalRequired: 2_143_750, weight: 0.35 },
      { assetType: "Corporate Bonds", capitalCharge: 0.025, marketValue: 612_500_000, capitalRequired: 15_312_500, weight: 0.25 },
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
