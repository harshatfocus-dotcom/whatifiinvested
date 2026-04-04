export interface Asset {
  symbol: string;
  name: string;
  type: "stock" | "etf" | "mutual_fund";
  exchange: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high52w: number;
  low52w: number;
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
}

export interface PortfolioAnalysis {
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  percentReturn: number;
  cagr: number;
  holdings: Holding[];
  chartData: ChartDataPoint[];
  bestPerformer: { symbol: string; returnPercent: number };
  worstPerformer: { symbol: string; returnPercent: number };
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
}
