/**
 * Technical indicators computed from price arrays.
 * All functions return arrays aligned with the input (NaN for warmup period).
 */

export function sma(prices: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
    if (i >= period) sum -= prices[i - period];
    result.push(i >= period - 1 ? sum / period : NaN);
  }
  return result;
}

export function ema(prices: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < prices.length; i++) {
    if (i === period - 1) {
      // Seed with SMA
      let sum = 0;
      for (let j = 0; j < period; j++) sum += prices[j];
      prev = sum / period;
      result.push(prev);
    } else if (i >= period) {
      prev = prices[i] * k + prev * (1 - k);
      result.push(prev);
    } else {
      result.push(NaN);
    }
  }
  return result;
}

export function rsi(prices: number[], period: number = 14): number[] {
  const result: number[] = new Array(prices.length).fill(NaN);
  if (prices.length < period + 1) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  prices: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine = prices.map((_, i) =>
    isNaN(emaFast[i]) || isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  );
  // Signal line is EMA of MACD, but skip NaN values
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalValid = ema(validMacd, signalPeriod);
  const signal = new Array(prices.length).fill(NaN);
  let j = 0;
  for (let i = 0; i < prices.length; i++) {
    if (!isNaN(macdLine[i])) {
      signal[i] = signalValid[j];
      j++;
    }
  }
  const histogram = macdLine.map((m, i) =>
    isNaN(m) || isNaN(signal[i]) ? NaN : m - signal[i]
  );
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult {
  const middle = sma(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (prices[j] - middle[i]) ** 2;
    }
    const sd = Math.sqrt(sumSq / period);
    upper.push(middle[i] + stdDev * sd);
    lower.push(middle[i] - stdDev * sd);
  }
  return { upper, middle, lower };
}

export function vwap(prices: number[], volumes: number[]): number[] {
  const result: number[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (let i = 0; i < prices.length; i++) {
    cumPV += prices[i] * volumes[i];
    cumV += volumes[i];
    result.push(cumV > 0 ? cumPV / cumV : prices[i]);
  }
  return result;
}

/**
 * Standard deviation of daily returns (annualized).
 */
export function volatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252); // annualized
}

/**
 * Maximum drawdown from a series of values.
 */
export function maxDrawdown(values: number[]): number {
  if (values.length === 0) return 0;
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}
