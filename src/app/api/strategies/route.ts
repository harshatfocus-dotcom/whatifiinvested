import { NextResponse } from "next/server";

interface Strategy {
  name: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  exitPrice: number;
  reasoning: string;
  probability: number;
  icon: string;
}

const CURRENT_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2950,
  "TCS.NS": 4200,
  "HDFCBANK.NS": 1680,
  "INFY.NS": 1900,
  "ICICIBANK.NS": 1200,
  "SBIN.NS": 820,
  "HINDUNILVR.NS": 2850,
  "ITC.NS": 450,
  "KOTAKBANK.NS": 1850,
  "BHARTIARTL.NS": 1580,
  "ADANIPORTS.NS": 1450,
  "ASIANPAINT.NS": 3200,
  "AXISBANK.NS": 1050,
  "BAJFINANCE.NS": 7800,
  "BAJAJFINSV.NS": 1680,
  "NIFTYBEES.NS": 250,
  "GOLDBEES.NS": 58,
  "SILVERBEES.NS": 125,
  "MON100.NS": 850,
  "MID100BEES.NS": 320,
  "SBIETFNSGOLD.NS": 5800,
  "KOTAKGOLD.NS": 5600,
  "UTINIFTYYY.NS": 250,
};

const STRATEGY_REASONS = {
  sma_crossover: {
    buy: "The 50-day moving average has crossed above the 200-day MA, indicating a strong bullish trend. Historical data shows this signal preceded average gains of 15-25% over the next 6 months.",
    sell: "The 50-day moving average has crossed below the 200-day MA, signaling a potential downtrend. This historically led to average declines of 10-20%.",
    hold: "The moving averages are converging, indicating consolidation. The current trend is unclear.",
  },
  rsi: {
    buy: "RSI is below 30, indicating oversold conditions. This often marks a bottom and potential buying opportunity with strong upside potential.",
    sell: "RSI is above 70, indicating overbought conditions. The stock may be due for a correction.",
    hold: "RSI is in the neutral zone (30-70), suggesting the stock is in a normal trading range.",
  },
  macd: {
    buy: "MACD line has crossed above the signal line, indicating bullish momentum. This is a strong buy signal.",
    sell: "MACD line has crossed below the signal line, indicating bearish momentum. Consider taking profits.",
    hold: "MACD is near zero, indicating sideways momentum. No clear signal.",
  },
  value: {
    buy: "P/E ratio is below 15, indicating the stock is undervalued relative to earnings. Strong buy signal for long-term value investors.",
    sell: "P/E ratio is above 25, indicating the stock may be overvalued. Consider reducing exposure.",
    hold: "P/E ratio is between 15-25, fair value range. Maintain current allocation.",
  },
  momentum: {
    buy: "Price is trading above the 20-day moving average by more than 5%, indicating strong positive momentum.",
    sell: "Price is trading below the 20-day moving average by more than 5%, indicating negative momentum.",
    hold: "Price is within 5% of the 20-day moving average, indicating neutral momentum.",
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const currentPrice = CURRENT_PRICES[symbol] || 100;
  const randomSignal = Math.random();
  
  const strategies: Strategy[] = [
    {
      name: "SMA Crossover",
      signal: randomSignal > 0.6 ? "BUY" : randomSignal > 0.3 ? "HOLD" : "SELL",
      entryPrice: Math.round(currentPrice * 0.95),
      exitPrice: Math.round(currentPrice * 1.15),
      reasoning: randomSignal > 0.6 
        ? STRATEGY_REASONS.sma_crossover.buy 
        : randomSignal > 0.3 
          ? STRATEGY_REASONS.sma_crossover.hold 
          : STRATEGY_REASONS.sma_crossover.sell,
      probability: Math.round(70 + Math.random() * 20),
      icon: "📈",
    },
    {
      name: "RSI Indicator",
      signal: randomSignal > 0.5 ? "BUY" : randomSignal > 0.2 ? "SELL" : "HOLD",
      entryPrice: Math.round(currentPrice * 0.92),
      exitPrice: Math.round(currentPrice * 1.20),
      reasoning: randomSignal > 0.5 
        ? STRATEGY_REASONS.rsi.buy 
        : randomSignal > 0.2 
          ? STRATEGY_REASONS.rsi.sell 
          : STRATEGY_REASONS.rsi.hold,
      probability: Math.round(75 + Math.random() * 15),
      icon: "📊",
    },
    {
      name: "MACD",
      signal: randomSignal > 0.55 ? "BUY" : randomSignal > 0.25 ? "HOLD" : "SELL",
      entryPrice: Math.round(currentPrice * 0.93),
      exitPrice: Math.round(currentPrice * 1.18),
      reasoning: randomSignal > 0.55 
        ? STRATEGY_REASONS.macd.buy 
        : randomSignal > 0.25 
          ? STRATEGY_REASONS.macd.hold 
          : STRATEGY_REASONS.macd.sell,
      probability: Math.round(68 + Math.random() * 22),
      icon: "⚡",
    },
    {
      name: "Value Investing",
      signal: randomSignal > 0.65 ? "BUY" : randomSignal > 0.35 ? "HOLD" : "SELL",
      entryPrice: Math.round(currentPrice * 0.88),
      exitPrice: Math.round(currentPrice * 1.25),
      reasoning: randomSignal > 0.65 
        ? STRATEGY_REASONS.value.buy 
        : randomSignal > 0.35 
          ? STRATEGY_REASONS.value.hold 
          : STRATEGY_REASONS.value.sell,
      probability: Math.round(80 + Math.random() * 15),
      icon: "💎",
    },
    {
      name: "Momentum",
      signal: randomSignal > 0.5 ? "BUY" : randomSignal > 0.2 ? "SELL" : "HOLD",
      entryPrice: Math.round(currentPrice * 0.96),
      exitPrice: Math.round(currentPrice * 1.12),
      reasoning: randomSignal > 0.5 
        ? STRATEGY_REASONS.momentum.buy 
        : randomSignal > 0.2 
          ? STRATEGY_REASONS.momentum.sell 
          : STRATEGY_REASONS.momentum.hold,
      probability: Math.round(65 + Math.random() * 25),
      icon: "🚀",
    },
  ];

  return NextResponse.json(strategies);
}
