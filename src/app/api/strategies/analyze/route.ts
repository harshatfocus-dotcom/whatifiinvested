import { NextResponse } from "next/server";
import { getHistoricalPrices } from "@/lib/data/market-data";
import { runBacktest } from "@/lib/strategies/backtester";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, strategies, startDate } = body as {
      assets: Array<{ symbol: string; name: string }>;
      strategies: string[];
      startDate?: string;
    };

    const start = startDate || "2020-01-01";
    const results = [];

    // Fetch historical data for each unique asset
    const uniqueSymbols = [...new Set((assets || []).map((a) => a.symbol))];
    const histMap = new Map<string, Awaited<ReturnType<typeof getHistoricalPrices>>>();

    await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        const prices = await getHistoricalPrices(symbol, start);
        histMap.set(symbol, prices);
      })
    );

    const strategyList = strategies?.length ? strategies : ["sma_crossover", "rsi", "macd"];

    // Run backtests for each asset × strategy combination (deduplicated by strategy)
    const seen = new Set<string>();
    for (const asset of assets || []) {
      const prices = histMap.get(asset.symbol) || [];

      for (const strategyId of strategyList) {
        const key = `${strategyId}:${asset.symbol}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const backtest = runBacktest(strategyId, prices);
        if (!backtest) continue;

        // Find the most recent BUY signal for entry price, most recent SELL for exit
        const buySignals = backtest.signals.filter((s) => s.type === "BUY");
        const sellSignals = backtest.signals.filter((s) => s.type === "SELL");
        const lastBuy = buySignals[buySignals.length - 1];
        const lastSell = sellSignals[sellSignals.length - 1];

        results.push({
          strategy: backtest.strategyName,
          icon: backtest.icon,
          signal: backtest.latestSignal,
          entryPrice: lastBuy?.price ?? backtest.latestPrice * 0.95,
          exitPrice: lastSell?.price ?? backtest.latestPrice * 1.12,
          reasoning: backtest.reasoning,
          probability: backtest.confidence,
          graph: backtest.indicatorSeries.length > 0
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
        });
      }
    }

    return NextResponse.json(results.slice(0, 10));
  } catch (error) {
    console.error("Strategy analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

function generateFallbackGraph(signal: string): { label: string; value: number }[] {
  const base = signal === "BUY" ? 65 : signal === "SELL" ? 35 : 50;
  return Array.from({ length: 12 }, (_, i) => ({
    label: `M${i + 1}`,
    value: Math.max(10, Math.min(90, base + (i - 6) * 2)),
  }));
}
