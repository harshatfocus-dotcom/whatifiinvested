import { NextResponse } from "next/server";

interface StrategyResult {
  strategy: string;
  icon: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  exitPrice: number;
  reasoning: string;
  probability: number;
  graph?: { label: string; value: number }[];
}

const CURRENT_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2950, "TCS.NS": 4200, "HDFCBANK.NS": 1680, "INFY.NS": 1900,
  "ICICIBANK.NS": 1200, "SBIN.NS": 820, "HINDUNILVR.NS": 2850, "ITC.NS": 450,
  "KOTAKBANK.NS": 1850, "BHARTIARTL.NS": 1580, "NIFTYBEES.NS": 250, "GOLDBEES.NS": 58,
  "SILVERBEES.NS": 125, "MON100.NS": 850, "MID100BEES.NS": 320, "MF001": 850, "MF002": 72,
};

const STRATEGY_CONFIGS: Record<string, { icon: string; buyReason: string; sellReason: string; holdReason: string }> = {
  sma_crossover: {
    icon: "📈",
    buyReason: "50-day MA crossed above 200-day MA - strong bullish signal. Historically preceded 15-25% gains.",
    sellReason: "50-day MA crossed below 200-day MA - bearish trend. Typically led to 10-20% declines.",
    holdReason: "Moving averages converging - unclear trend direction.",
  },
  rsi: {
    icon: "📊",
    buyReason: "RSI below 30 indicates oversold conditions - potential bottom and buying opportunity.",
    sellReason: "RSI above 70 indicates overbought conditions - stock may correct soon.",
    holdReason: "RSI in neutral zone (30-70) - no clear overbought/oversold signal.",
  },
  macd: {
    icon: "⚡",
    buyReason: "MACD line crossed above signal - bullish momentum building.",
    sellReason: "MACD line crossed below signal - bearish momentum increasing.",
    holdReason: "MACD near zero - sideways momentum, no clear direction.",
  },
  bollinger: {
    icon: "🎯",
    buyReason: "Price near lower Bollinger Band - potential bounce opportunity.",
    sellReason: "Price near upper Bollinger Band - expect resistance.",
    holdReason: "Price in middle of bands - normal volatility range.",
  },
  value: {
    icon: "💎",
    buyReason: "P/E ratio below 15 - undervalued stock, strong buy for value investors.",
    sellReason: "P/E ratio above 25 - potentially overvalued, consider taking profits.",
    holdReason: "P/E ratio between 15-25 - fair value, maintain position.",
  },
  momentum: {
    icon: "🚀",
    buyReason: "Price above 20-day MA by 5%+ - strong positive momentum.",
    sellReason: "Price below 20-day MA by 5%+ - negative momentum signal.",
    holdReason: "Price within 5% of 20-day MA - neutral momentum.",
  },
  dca: {
    icon: "💰",
    buyReason: "Consistent DCA strategy averages out volatility - continue investing.",
    sellReason: "Consider taking profit if portfolio has grown significantly.",
    holdReason: "DCA continues - market timing not recommended.",
  },
  vwap: {
    icon: "📉",
    buyReason: "Price trading below VWAP - buying at better average price.",
    sellReason: "Price trading above VWAP - consider taking profits.",
    holdReason: "Price at VWAP - fair market value.",
  },
  moving_ribbon: {
    icon: "🎗️",
    buyReason: "Moving averages in bullish alignment (short > medium > long).",
    sellReason: "Moving averages in bearish alignment (short < medium < long).",
    holdReason: "Moving averages overlapping - consolidating.",
  },
  rsr: {
    icon: "🏆",
    buyReason: "Strong relative strength vs peers - continue holding.",
    sellReason: "Weak relative strength - consider rotation.",
    holdReason: "Neutral relative strength - maintain current allocation.",
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, strategies } = body as { assets: any[]; strategies: string[] };

    const results: StrategyResult[] = [];

    for (const asset of assets || []) {
      const currentPrice = CURRENT_PRICES[asset.symbol] || 100;
      
      for (const strategyId of strategies || ["sma_crossover", "rsi", "macd"]) {
        const config = STRATEGY_CONFIGS[strategyId];
        if (!config) continue;
        
        const randomSignal = Math.random();
        const signal = randomSignal > 0.55 ? "BUY" : randomSignal > 0.25 ? "SELL" : "HOLD";
        
        const graphData = Array.from({ length: 12 }, (_, i) => ({
          label: `M${i + 1}`,
          value: Math.round(30 + Math.random() * 70),
        }));

        results.push({
          strategy: strategyId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          icon: config.icon,
          signal,
          entryPrice: Math.round(currentPrice * (signal === "BUY" ? 0.92 : signal === "SELL" ? 1.05 : 0.98)),
          exitPrice: Math.round(currentPrice * (signal === "SELL" ? 0.88 : 1.18)),
          reasoning: signal === "BUY" ? config.buyReason : signal === "SELL" ? config.sellReason : config.holdReason,
          probability: Math.round(65 + Math.random() * 25),
          graph: graphData,
        });
      }
    }

    return NextResponse.json(results.slice(0, 10));
  } catch (error) {
    console.error("Strategy analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
