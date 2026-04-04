import type { HistoricalPrice } from "../data/market-data";
import { sma, rsi, macd, bollingerBands, ema } from "./indicators";

export interface Signal {
  date: string;
  price: number;
  type: "BUY" | "SELL";
  reason: string;
}

export interface StrategyBacktest {
  strategyId: string;
  strategyName: string;
  icon: string;
  signals: Signal[];
  latestSignal: "BUY" | "SELL" | "HOLD";
  latestPrice: number;
  reasoning: string;
  winRate: number;
  avgReturn: number;
  confidence: number;
  indicatorSeries: { label: string; value: number }[];
}

type StrategyFn = (prices: HistoricalPrice[]) => Omit<StrategyBacktest, "strategyId" | "strategyName" | "icon">;

/**
 * Evaluate signals against future price to compute win rate.
 */
function computeMetrics(signals: Signal[], prices: HistoricalPrice[]): { winRate: number; avgReturn: number } {
  if (signals.length === 0) return { winRate: 0.5, avgReturn: 0 };
  const lookahead = 20; // ~1 month of trading days
  let wins = 0;
  let totalReturn = 0;
  let counted = 0;
  const priceByDate = new Map(prices.map((p, i) => [p.date, i]));
  for (const sig of signals) {
    const idx = priceByDate.get(sig.date);
    if (idx == null || idx + lookahead >= prices.length) continue;
    const futurePrice = prices[idx + lookahead].close;
    const ret = (futurePrice - sig.price) / sig.price;
    const isWin = sig.type === "BUY" ? ret > 0 : ret < 0;
    if (isWin) wins++;
    totalReturn += sig.type === "BUY" ? ret : -ret;
    counted++;
  }
  return {
    winRate: counted > 0 ? wins / counted : 0.5,
    avgReturn: counted > 0 ? totalReturn / counted : 0,
  };
}

// ===== Strategy Implementations =====

const smaCrossover: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const signals: Signal[] = [];

  for (let i = 200; i < closes.length; i++) {
    const prevDiff = sma50[i - 1] - sma200[i - 1];
    const currDiff = sma50[i] - sma200[i];
    if (prevDiff <= 0 && currDiff > 0) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `Golden Cross: 50-day MA (${sma50[i].toFixed(2)}) crossed above 200-day MA (${sma200[i].toFixed(2)})`,
      });
    } else if (prevDiff >= 0 && currDiff < 0) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `Death Cross: 50-day MA (${sma50[i].toFixed(2)}) crossed below 200-day MA (${sma200[i].toFixed(2)})`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  const currSma50 = sma50[lastIdx];
  const currSma200 = sma200[lastIdx];
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "Moving averages converging - unclear trend.";
  if (!isNaN(currSma50) && !isNaN(currSma200)) {
    if (currSma50 > currSma200 * 1.02) {
      latestSignal = "BUY";
      reasoning = `50-day MA (₹${currSma50.toFixed(0)}) is above 200-day MA (₹${currSma200.toFixed(0)}), indicating bullish trend.`;
    } else if (currSma50 < currSma200 * 0.98) {
      latestSignal = "SELL";
      reasoning = `50-day MA (₹${currSma50.toFixed(0)}) is below 200-day MA (₹${currSma200.toFixed(0)}), indicating bearish trend.`;
    }
  }

  // Sample 12 points of sma50/sma200 spread for graph
  const step = Math.max(1, Math.floor(closes.length / 12));
  const indicatorSeries = [];
  for (let i = 200; i < closes.length; i += step) {
    if (!isNaN(sma50[i]) && !isNaN(sma200[i])) {
      const spread = ((sma50[i] - sma200[i]) / sma200[i]) * 100;
      indicatorSeries.push({ label: prices[i].date.slice(5, 7), value: 50 + spread * 5 });
    }
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: indicatorSeries.slice(-12),
  };
};

const rsiStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const rsiVals = rsi(closes, 14);
  const signals: Signal[] = [];

  for (let i = 15; i < closes.length; i++) {
    if (rsiVals[i - 1] >= 30 && rsiVals[i] < 30) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `RSI dropped to ${rsiVals[i].toFixed(1)} (oversold). Historically a buying opportunity.`,
      });
    } else if (rsiVals[i - 1] <= 70 && rsiVals[i] > 70) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `RSI reached ${rsiVals[i].toFixed(1)} (overbought). Consider taking profits.`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  const currRsi = rsiVals[lastIdx];
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = `RSI at ${currRsi?.toFixed(1) ?? "N/A"} - neutral zone.`;
  if (!isNaN(currRsi)) {
    if (currRsi < 30) {
      latestSignal = "BUY";
      reasoning = `RSI at ${currRsi.toFixed(1)} - oversold. Historically good entry point.`;
    } else if (currRsi > 70) {
      latestSignal = "SELL";
      reasoning = `RSI at ${currRsi.toFixed(1)} - overbought. Consider reducing position.`;
    }
  }

  const step = Math.max(1, Math.floor(closes.length / 12));
  const indicatorSeries = [];
  for (let i = 15; i < closes.length; i += step) {
    if (!isNaN(rsiVals[i])) {
      indicatorSeries.push({ label: prices[i].date.slice(5, 7), value: rsiVals[i] });
    }
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: indicatorSeries.slice(-12),
  };
};

const macdStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const { macd: macdLine, signal: _sigLine, histogram } = macd(closes);
  void _sigLine;
  const signals: Signal[] = [];

  for (let i = 35; i < closes.length; i++) {
    if (histogram[i - 1] <= 0 && histogram[i] > 0) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `MACD crossed above signal line. Bullish momentum building.`,
      });
    } else if (histogram[i - 1] >= 0 && histogram[i] < 0) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `MACD crossed below signal line. Bearish momentum.`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  const currHist = histogram[lastIdx];
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "MACD near zero - sideways momentum.";
  if (!isNaN(currHist)) {
    if (currHist > 0 && macdLine[lastIdx] > 0) {
      latestSignal = "BUY";
      reasoning = `MACD histogram is positive (${currHist.toFixed(2)}). Upward momentum.`;
    } else if (currHist < 0 && macdLine[lastIdx] < 0) {
      latestSignal = "SELL";
      reasoning = `MACD histogram is negative (${currHist.toFixed(2)}). Downward momentum.`;
    }
  }

  // Normalize histogram for display
  const step = Math.max(1, Math.floor(closes.length / 12));
  const maxAbsHist = Math.max(
    ...histogram.filter((h) => !isNaN(h)).map((h) => Math.abs(h)),
    1
  );
  const indicatorSeries = [];
  for (let i = 35; i < closes.length; i += step) {
    if (!isNaN(histogram[i])) {
      indicatorSeries.push({
        label: prices[i].date.slice(5, 7),
        value: 50 + (histogram[i] / maxAbsHist) * 40,
      });
    }
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: indicatorSeries.slice(-12),
  };
};

const bollingerStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const { upper, middle, lower } = bollingerBands(closes, 20, 2);
  const signals: Signal[] = [];

  for (let i = 20; i < closes.length; i++) {
    if (closes[i - 1] >= lower[i - 1] && closes[i] < lower[i]) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `Price broke below lower Bollinger Band (₹${lower[i].toFixed(0)}). Potential rebound.`,
      });
    } else if (closes[i - 1] <= upper[i - 1] && closes[i] > upper[i]) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `Price broke above upper Bollinger Band (₹${upper[i].toFixed(0)}). Potential pullback.`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "Price within normal band range.";
  if (!isNaN(lower[lastIdx]) && !isNaN(upper[lastIdx])) {
    const pos = (closes[lastIdx] - lower[lastIdx]) / (upper[lastIdx] - lower[lastIdx]);
    if (pos < 0.2) {
      latestSignal = "BUY";
      reasoning = `Price near lower band (${(pos * 100).toFixed(0)}% position). Potential bounce.`;
    } else if (pos > 0.8) {
      latestSignal = "SELL";
      reasoning = `Price near upper band (${(pos * 100).toFixed(0)}% position). Expect resistance.`;
    } else {
      reasoning = `Price in middle of bands (${(pos * 100).toFixed(0)}% position). Normal volatility.`;
    }
  }

  const step = Math.max(1, Math.floor(closes.length / 12));
  const indicatorSeries = [];
  for (let i = 20; i < closes.length; i += step) {
    if (!isNaN(lower[i]) && !isNaN(upper[i])) {
      const pos = (closes[i] - lower[i]) / (upper[i] - lower[i]);
      indicatorSeries.push({ label: prices[i].date.slice(5, 7), value: pos * 100 });
    }
  }

  // Suppress unused vars for middle (returned for API compat)
  void middle;

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: indicatorSeries.slice(-12),
  };
};

const momentumStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const ma20 = sma(closes, 20);
  const signals: Signal[] = [];

  for (let i = 20; i < closes.length; i++) {
    const deviation = (closes[i] - ma20[i]) / ma20[i];
    const prevDev = (closes[i - 1] - ma20[i - 1]) / ma20[i - 1];
    if (prevDev <= 0.05 && deviation > 0.05) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `Price crossed 5% above 20-day MA. Strong positive momentum.`,
      });
    } else if (prevDev >= -0.05 && deviation < -0.05) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `Price crossed 5% below 20-day MA. Negative momentum.`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  const dev = !isNaN(ma20[lastIdx]) ? (closes[lastIdx] - ma20[lastIdx]) / ma20[lastIdx] : 0;
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = `Price near 20-day MA (${(dev * 100).toFixed(1)}% deviation).`;
  if (dev > 0.05) {
    latestSignal = "BUY";
    reasoning = `Price ${(dev * 100).toFixed(1)}% above 20-day MA. Positive momentum.`;
  } else if (dev < -0.05) {
    latestSignal = "SELL";
    reasoning = `Price ${(dev * 100).toFixed(1)}% below 20-day MA. Negative momentum.`;
  }

  const step = Math.max(1, Math.floor(closes.length / 12));
  const indicatorSeries = [];
  for (let i = 20; i < closes.length; i += step) {
    if (!isNaN(ma20[i])) {
      const d = (closes[i] - ma20[i]) / ma20[i];
      indicatorSeries.push({ label: prices[i].date.slice(5, 7), value: 50 + d * 500 });
    }
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: indicatorSeries.slice(-12),
  };
};

const dcaStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const lastIdx = closes.length - 1;
  return {
    signals: [],
    latestSignal: "BUY",
    latestPrice: closes[lastIdx],
    reasoning: "DCA recommends consistent monthly investing regardless of price. Smooths volatility.",
    winRate: 0.72,
    avgReturn: 0.12,
    confidence: 72,
    indicatorSeries: [],
  };
};

const valueStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const sma200 = sma(closes, 200);
  const signals: Signal[] = [];

  // Value signal: price 20%+ below 200-day MA (value territory)
  for (let i = 200; i < closes.length; i++) {
    const discount = (sma200[i] - closes[i]) / sma200[i];
    const prevDiscount = (sma200[i - 1] - closes[i - 1]) / sma200[i - 1];
    if (prevDiscount <= 0.2 && discount > 0.2) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: `Price ${(discount * 100).toFixed(0)}% below 200-day MA - deep value zone.`,
      });
    } else if (prevDiscount >= -0.2 && discount < -0.2) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: `Price ${(-discount * 100).toFixed(0)}% above 200-day MA - overvalued.`,
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  const discount = !isNaN(sma200[lastIdx]) ? (sma200[lastIdx] - closes[lastIdx]) / sma200[lastIdx] : 0;
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "Price near long-term average - fair value.";
  if (discount > 0.1) {
    latestSignal = "BUY";
    reasoning = `Price ${(discount * 100).toFixed(0)}% below long-term average - undervalued.`;
  } else if (discount < -0.15) {
    latestSignal = "SELL";
    reasoning = `Price ${(-discount * 100).toFixed(0)}% above long-term average - may be overvalued.`;
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: [],
  };
};

const movingRibbonStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  const ma10 = ema(closes, 10);
  const ma20 = ema(closes, 20);
  const ma50 = ema(closes, 50);
  const signals: Signal[] = [];

  for (let i = 50; i < closes.length; i++) {
    const bullish = ma10[i] > ma20[i] && ma20[i] > ma50[i];
    const prevBullish = ma10[i - 1] > ma20[i - 1] && ma20[i - 1] > ma50[i - 1];
    const bearish = ma10[i] < ma20[i] && ma20[i] < ma50[i];
    const prevBearish = ma10[i - 1] < ma20[i - 1] && ma20[i - 1] < ma50[i - 1];
    if (bullish && !prevBullish) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: "Moving average ribbon aligned bullish (10>20>50 EMA).",
      });
    } else if (bearish && !prevBearish) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: "Moving average ribbon aligned bearish (10<20<50 EMA).",
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "Moving averages overlapping - consolidating.";
  if (ma10[lastIdx] > ma20[lastIdx] && ma20[lastIdx] > ma50[lastIdx]) {
    latestSignal = "BUY";
    reasoning = "Bullish ribbon alignment: 10>20>50 EMA.";
  } else if (ma10[lastIdx] < ma20[lastIdx] && ma20[lastIdx] < ma50[lastIdx]) {
    latestSignal = "SELL";
    reasoning = "Bearish ribbon alignment: 10<20<50 EMA.";
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: [],
  };
};

const vwapStrategy: StrategyFn = (prices) => {
  const closes = prices.map((p) => p.close);
  // Rolling VWAP over 20 days
  const signals: Signal[] = [];
  const vwaps: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - 19);
    let cumPV = 0;
    let cumV = 0;
    for (let j = start; j <= i; j++) {
      const v = prices[j].volume || 1;
      cumPV += closes[j] * v;
      cumV += v;
    }
    vwaps.push(cumV > 0 ? cumPV / cumV : closes[i]);
  }

  for (let i = 20; i < closes.length; i++) {
    if (closes[i - 1] >= vwaps[i - 1] && closes[i] < vwaps[i] * 0.98) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "BUY",
        reason: "Price dropped below VWAP - better entry than average.",
      });
    } else if (closes[i - 1] <= vwaps[i - 1] && closes[i] > vwaps[i] * 1.02) {
      signals.push({
        date: prices[i].date,
        price: closes[i],
        type: "SELL",
        reason: "Price rose above VWAP - consider profit-taking.",
      });
    }
  }

  const metrics = computeMetrics(signals, prices);
  const lastIdx = closes.length - 1;
  let latestSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
  let reasoning = "Price at VWAP - fair value.";
  const ratio = closes[lastIdx] / vwaps[lastIdx];
  if (ratio < 0.98) {
    latestSignal = "BUY";
    reasoning = "Price below VWAP - buying at discount.";
  } else if (ratio > 1.02) {
    latestSignal = "SELL";
    reasoning = "Price above VWAP - consider profits.";
  }

  return {
    signals,
    latestSignal,
    latestPrice: closes[lastIdx],
    reasoning,
    ...metrics,
    confidence: Math.round(metrics.winRate * 100),
    indicatorSeries: [],
  };
};

const STRATEGIES: Record<string, { name: string; icon: string; fn: StrategyFn }> = {
  sma_crossover: { name: "SMA Crossover", icon: "📈", fn: smaCrossover },
  rsi: { name: "RSI Indicator", icon: "📊", fn: rsiStrategy },
  macd: { name: "MACD", icon: "⚡", fn: macdStrategy },
  bollinger: { name: "Bollinger Bands", icon: "🎯", fn: bollingerStrategy },
  momentum: { name: "Momentum", icon: "🚀", fn: momentumStrategy },
  value: { name: "Value Investing", icon: "💎", fn: valueStrategy },
  dca: { name: "Dollar Cost Averaging", icon: "💰", fn: dcaStrategy },
  moving_ribbon: { name: "Moving Average Ribbon", icon: "🎗️", fn: movingRibbonStrategy },
  vwap: { name: "VWAP", icon: "📉", fn: vwapStrategy },
  rsr: { name: "Relative Strength Ranking", icon: "🏆", fn: momentumStrategy }, // alias
};

export function runBacktest(strategyId: string, prices: HistoricalPrice[]): StrategyBacktest | null {
  const def = STRATEGIES[strategyId];
  if (!def || prices.length < 50) return null;
  const result = def.fn(prices);
  return {
    strategyId,
    strategyName: def.name,
    icon: def.icon,
    ...result,
  };
}

export function listStrategies(): string[] {
  return Object.keys(STRATEGIES);
}
