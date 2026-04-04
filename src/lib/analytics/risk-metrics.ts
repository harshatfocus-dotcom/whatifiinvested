import type { HistoricalPrice } from "../data/market-data";

export interface RiskMetrics {
  maxDrawdown: number;        // as percentage e.g. 23.5
  volatility: number;         // annualized, as percentage e.g. 18.2
  sharpeRatio: number;        // risk-adjusted return
  totalReturn: number;        // simple return percentage
  cagr: number;               // compound annual growth rate
}

const RISK_FREE_RATE = 0.07; // ~7% for Indian market (SBI FD rate)

/**
 * Compute portfolio risk metrics from historical prices.
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

  // Daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    dailyReturns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
  }

  // Annualized volatility
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252) * 100; // as percentage

  // Max drawdown
  const values = prices.map((p) => p.close);
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  // Total return and CAGR
  const totalReturn = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  const cagr = years > 0 && totalInvested > 0
    ? (Math.pow(currentValue / totalInvested, 1 / years) - 1) * 100
    : 0;

  // Sharpe ratio: (portfolio_return - risk_free_rate) / volatility
  const sharpeRatio = annualVol > 0
    ? (cagr / 100 - RISK_FREE_RATE) / (annualVol / 100)
    : 0;

  return {
    maxDrawdown: Math.round(maxDd * 1000) / 10, // e.g. 23.5
    volatility: Math.round(annualVol * 10) / 10,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    totalReturn: Math.round(totalReturn * 10) / 10,
    cagr: Math.round(cagr * 10) / 10,
  };
}
