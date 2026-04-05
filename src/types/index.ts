export interface Asset {
  symbol: string;
  name: string;
  type: "stock" | "us_stock" | "etf" | "mutual_fund" | "commodity" | "index" | "crypto";
  exchange: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high52w: number;
  low52w: number;
  currency?: string; // "INR" or "USD"
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  weight: number;
  initialInvestment: number;
  recurringAmount: number;
  frequency: "daily" | "weekly" | "monthly" | null;
  startDate: string;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  investedAmount: number;
  returnAmount: number;
  returnPercent: number;
  // USD fields — only set for US stocks, all values are INR-converted
  currency?: string;        // "USD" if US stock, "INR" otherwise
  currentPriceUSD?: number; // Current price in USD
  avgBuyPriceUSD?: number;  // Average buy price in USD
  currentValueUSD?: number; // Current value in USD
}

export interface DrawdownPoint {
  date: string;
  drawdown: number; // negative %, e.g. -23.5
}

export interface RiskSnapshot {
  maxDrawdown: number;    // % e.g. 23.5
  volatility: number;     // annualised % e.g. 18.2
  sharpeRatio: number;    // e.g. 1.24
  bestMonth: number;      // best monthly return %
  worstMonth: number;     // worst monthly return %
  positiveMonthsPct: number; // % of months positive
}

export interface BenchmarkData {
  nifty?: ChartDataPoint[];
  gold?: ChartDataPoint[];
  fd?: ChartDataPoint[];
}

export interface LumpSumComparison {
  currentValue: number;
  cagr: number;
  percentReturn: number;
  chartData: ChartDataPoint[];
}

export interface PortfolioAnalysis {
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  percentReturn: number;
  cagr: number;
  holdings: Holding[];
  chartData: ChartDataPoint[];
  assetChartData?: Record<string, ChartDataPoint[]>;
  bestPerformer: { symbol: string; returnPercent: number };
  worstPerformer: { symbol: string; returnPercent: number };
  signals?: SignalPoint[];
  riskMetrics?: RiskSnapshot;
  drawdownSeries?: DrawdownPoint[];
  benchmarks?: BenchmarkData;
  lumpSumComparison?: LumpSumComparison;
  correlationMatrix?: number[][];
  correlationSymbols?: string[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
  invested: number;
}

export interface Strategy {
  name: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  exitPrice: number;
  reasoning: string;
  probability: number;
  icon: string;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  description: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface PriceData {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface SignalPoint {
  date: string;
  price: number;
  type: "entry" | "exit";
  label: string;
  strategy?: string;
  amount?: number;
  reason?: string;
}
