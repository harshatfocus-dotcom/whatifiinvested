import type { HistoricalPrice } from "../data/market-data";
import type { DrawdownPoint, RiskSnapshot } from "@/types";

/**
 * Compute Pearson correlation matrix for N assets.
 * assetReturns: map of symbol → daily return series (already aligned by date).
 * Returns { matrix: number[][], symbols: string[] }
 */
export function computeCorrelationMatrix(
  assetChartData: Record<string, { date: string; value: number }[]>
): { matrix: number[][]; symbols: string[] } {
  const symbols = Object.keys(assetChartData);
  if (symbols.length < 2) return { matrix: [], symbols };

  // Align dates across all assets
  const allDates = new Set<string>();
  for (const s of symbols) for (const pt of assetChartData[s]) allDates.add(pt.date);
  const sortedDates = Array.from(allDates).sort();

  // Build value lookup per symbol
  const lookup: Record<string, Map<string, number>> = {};
  for (const s of symbols) {
    lookup[s] = new Map(assetChartData[s].map(pt => [pt.date, pt.value]));
  }

  // Compute daily returns per symbol (only on dates where all assets have data)
  const returns: Record<string, number[]> = {};
  for (const s of symbols) returns[s] = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1];
    const cur = sortedDates[i];
    const allHave = symbols.every(s => lookup[s].has(prev) && lookup[s].has(cur));
    if (!allHave) continue;
    for (const s of symbols) {
      const p = lookup[s].get(prev)!;
      const c = lookup[s].get(cur)!;
      if (p > 0) returns[s].push((c - p) / p);
    }
  }

  // Pearson correlation between each pair
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const pearson = (a: number[], b: number[]): number => {
    const len = Math.min(a.length, b.length);
    if (len < 2) return 0;
    const ma = mean(a.slice(0, len));
    const mb = mean(b.slice(0, len));
    let cov = 0, sa = 0, sb = 0;
    for (let i = 0; i < len; i++) {
      cov += (a[i] - ma) * (b[i] - mb);
      sa += (a[i] - ma) ** 2;
      sb += (b[i] - mb) ** 2;
    }
    const denom = Math.sqrt(sa * sb);
    return denom > 0 ? Math.round((cov / denom) * 100) / 100 : 0;
  };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrix[i][j] = i === j ? 1 : pearson(returns[symbols[i]], returns[symbols[j]]);
    }
  }

  return { matrix, symbols };
}

export interface RiskMetrics {
  maxDrawdown: number;        // as percentage e.g. 23.5
  volatility: number;         // annualized, as percentage e.g. 18.2
  sharpeRatio: number;        // risk-adjusted return
  totalReturn: number;        // simple return percentage
  cagr: number;               // compound annual growth rate
}

const RISK_FREE_RATE = 0.07; // ~7% for Indian market (SBI FD rate)

/**
 * Compute portfolio risk metrics from historical prices (single asset).
 */
export function computeRiskMetrics(
  prices: HistoricalPrice[],
  totalInvested: number,
  currentValue: number,
  years: number
): RiskMetrics {
  if (prices.length < 2) {
    return { maxDrawdown: 0, volatility: 0, sharpeRatio: 0, totalReturn: 0, cagr: 0 };
  }

  const dailyReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    dailyReturns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
  }

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / dailyReturns.length;
  const annualVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const values = prices.map((p) => p.close);
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  const totalReturn = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  const cagr = years > 0 && totalInvested > 0
    ? (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100 : 0;
  const sharpeRatio = annualVol > 0 ? (cagr / 100 - RISK_FREE_RATE) / (annualVol / 100) : 0;

  return {
    maxDrawdown: Math.round(maxDd * 1000) / 10,
    volatility: Math.round(annualVol * 10) / 10,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    totalReturn: Math.round(totalReturn * 10) / 10,
    cagr: Math.round(cagr * 10) / 10,
  };
}

/**
 * Compute portfolio-level risk metrics and drawdown series from aggregated chart data.
 * chartData must be sorted ascending by date.
 */
export function computePortfolioRiskFromChart(
  chartData: { date: string; value: number }[],
  cagr: number
): { metrics: RiskSnapshot; drawdownSeries: DrawdownPoint[] } {
  const empty: RiskSnapshot = {
    maxDrawdown: 0, volatility: 0, sharpeRatio: 0,
    bestMonth: 0, worstMonth: 0, positiveMonthsPct: 0,
  };
  if (chartData.length < 5) return { metrics: empty, drawdownSeries: [] };

  // ── Daily returns ─────────────────────────────────────────────────────────
  const dailyReturns: number[] = [];
  for (let i = 1; i < chartData.length; i++) {
    const prev = chartData[i - 1].value;
    if (prev > 0) dailyReturns.push((chartData[i].value - prev) / prev);
  }

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (dailyReturns.length || 1);
  const annualVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

  // ── Drawdown series ───────────────────────────────────────────────────────
  let peak = chartData[0].value;
  let maxDd = 0;
  const drawdownSeries: DrawdownPoint[] = chartData.map(pt => {
    if (pt.value > peak) peak = pt.value;
    const dd = peak > 0 ? (peak - pt.value) / peak * 100 : 0;
    if (dd > maxDd) maxDd = dd;
    return { date: pt.date, drawdown: -(Math.round(dd * 10) / 10) };
  });

  // ── Monthly returns ───────────────────────────────────────────────────────
  const monthMap = new Map<number, { first: number; last: number }>();
  for (const pt of chartData) {
    const d = new Date(pt.date);
    const key = d.getFullYear() * 12 + d.getMonth();
    const entry = monthMap.get(key);
    if (!entry) monthMap.set(key, { first: pt.value, last: pt.value });
    else entry.last = pt.value;
  }

  const monthlyReturns: number[] = [];
  for (const { first, last } of monthMap.values()) {
    if (first > 0) monthlyReturns.push(((last - first) / first) * 100);
  }

  const bestMonth = monthlyReturns.length > 0 ? Math.max(...monthlyReturns) : 0;
  const worstMonth = monthlyReturns.length > 0 ? Math.min(...monthlyReturns) : 0;
  const positiveMonthsPct = monthlyReturns.length > 0
    ? (monthlyReturns.filter(r => r > 0).length / monthlyReturns.length) * 100 : 0;

  // ── Sharpe ratio ──────────────────────────────────────────────────────────
  const sharpeRatio = annualVol > 0 ? (cagr / 100 - RISK_FREE_RATE) / (annualVol / 100) : 0;

  return {
    metrics: {
      maxDrawdown: Math.round(maxDd * 10) / 10,
      volatility: Math.round(annualVol * 10) / 10,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      bestMonth: Math.round(bestMonth * 10) / 10,
      worstMonth: Math.round(worstMonth * 10) / 10,
      positiveMonthsPct: Math.round(positiveMonthsPct),
    },
    drawdownSeries,
  };
}
