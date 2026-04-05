import { NextResponse } from "next/server";
import { getHistoricalPrices } from "@/lib/data/market-data";
import { runBacktest } from "@/lib/strategies/backtester";

// All supported strategy IDs — always run every one
const ALL_STRATEGY_IDS = [
  "sma_crossover", "rsi", "macd", "bollinger",
  "value", "momentum", "dca", "moving_ribbon", "vwap", "rsr",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, startDate } = body as {
      assets: Array<{ symbol: string; name: string }>;
      strategies?: string[];
      startDate?: string;
    };

    const start = startDate || "2020-01-01";

    // Fetch historical data for each unique asset
    const uniqueSymbols = [...new Set((assets || []).map((a) => a.symbol))];
    const histMap = new Map<string, Awaited<ReturnType<typeof getHistoricalPrices>>>();

    await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        const prices = await getHistoricalPrices(symbol, start);
        histMap.set(symbol, prices);
      })
    );

    // Per-strategy bucket: collect results across all assets
    const byStrategy = new Map<
      string,
      Array<{
        signal: "BUY" | "SELL" | "HOLD";
        confidence: number;
        winRate: number;
        avgReturn: number;
        entryPrice: number;
        exitPrice: number;
        reasoning: string;
        graph: { label: string; value: number }[];
        signals: object[];
        strategyName: string;
        icon: string;
        isPrimary: boolean;
      }>
    >();

    for (const stratId of ALL_STRATEGY_IDS) {
      byStrategy.set(stratId, []);
    }

    const assetList = assets || [];
    for (let assetIdx = 0; assetIdx < assetList.length; assetIdx++) {
      const asset = assetList[assetIdx];
      const prices = histMap.get(asset.symbol) || [];

      for (const stratId of ALL_STRATEGY_IDS) {
        const backtest = runBacktest(stratId, prices);
        if (!backtest) continue;

        const latestPrice = backtest.latestPrice;
        let entryPrice: number;
        let exitPrice: number;

        if (backtest.latestSignal === "BUY") {
          const lastBuy = backtest.signals.filter((s) => s.type === "BUY").at(-1);
          entryPrice = lastBuy?.price ?? latestPrice;
          exitPrice = Math.round(entryPrice * 1.15);
        } else if (backtest.latestSignal === "SELL") {
          const lastSell = backtest.signals.filter((s) => s.type === "SELL").at(-1);
          entryPrice = lastSell?.price ?? latestPrice;
          exitPrice = Math.round(entryPrice * 0.88);
        } else {
          const lastSig = backtest.signals.at(-1);
          entryPrice = lastSig?.price ?? Math.round(latestPrice * 0.97);
          exitPrice = Math.round(latestPrice * 1.05);
        }

        const bucket = byStrategy.get(stratId)!;
        bucket.push({
          signal: backtest.latestSignal,
          confidence: backtest.confidence,
          winRate: backtest.winRate,
          avgReturn: backtest.avgReturn,
          entryPrice: Math.round(entryPrice * 100) / 100,
          exitPrice: Math.round(exitPrice * 100) / 100,
          reasoning: backtest.reasoning,
          graph:
            backtest.indicatorSeries.length > 0
              ? backtest.indicatorSeries
              : generateFallbackGraph(backtest.latestSignal),
          signals: backtest.signals.slice(-20).map((s) => ({
            date: s.date,
            price: s.price,
            type: s.type === "BUY" ? "entry" : "exit",
            label: `${s.type}: ${backtest.strategyName}`,
            strategy: backtest.strategyName,
            amount: s.price,
            reason: s.reason,
          })),
          strategyName: backtest.strategyName,
          icon: backtest.icon,
          isPrimary: assetIdx === 0,
        });
      }
    }

    // Aggregate each strategy across all assets
    const aggregated = [];
    for (const stratId of ALL_STRATEGY_IDS) {
      const bucket = byStrategy.get(stratId)!;
      if (bucket.length === 0) continue;

      // Majority-vote signal
      const counts = { BUY: 0, SELL: 0, HOLD: 0 };
      for (const r of bucket) counts[r.signal]++;
      const majoritySignal: "BUY" | "SELL" | "HOLD" =
        counts.BUY >= counts.SELL && counts.BUY >= counts.HOLD
          ? "BUY"
          : counts.SELL >= counts.BUY && counts.SELL >= counts.HOLD
          ? "SELL"
          : "HOLD";

      // Averages
      const n = bucket.length;
      const avgConfidence = Math.round(bucket.reduce((s, r) => s + r.confidence, 0) / n);
      const avgWinRate = bucket.reduce((s, r) => s + r.winRate, 0) / n;
      const avgReturn = bucket.reduce((s, r) => s + r.avgReturn, 0) / n;

      // Primary asset data for chart, prices, reasoning
      const primary = bucket.find((r) => r.isPrimary) ?? bucket[0];

      aggregated.push({
        strategyId: stratId,
        strategy: primary.strategyName,
        icon: primary.icon,
        signal: majoritySignal,
        entryPrice: primary.entryPrice,
        exitPrice: primary.exitPrice,
        reasoning: primary.reasoning,
        probability: avgConfidence,
        winRate: Math.round(avgWinRate * 100),       // % integer
        avgReturn: parseFloat((avgReturn * 100).toFixed(1)), // % with 1dp
        assetCount: n,
        graph: primary.graph,
        signals: primary.signals,
      });
    }

    return NextResponse.json(aggregated);
  } catch (error) {
    console.error("Strategy analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

function generateFallbackGraph(signal: string): { label: string; value: number }[] {
  const base = signal === "BUY" ? 65 : signal === "SELL" ? 35 : 50;
  return Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    value: Math.max(10, Math.min(90, base + (i - 6) * 2)),
  }));
}
