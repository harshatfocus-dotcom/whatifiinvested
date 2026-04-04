import { NextResponse } from "next/server";
import { getHistoricalPrices } from "@/lib/data/market-data";
import { runBacktest, listStrategies } from "@/lib/strategies/backtester";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const startDate = searchParams.get("start") || "2020-01-01";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const prices = await getHistoricalPrices(symbol, startDate);

  if (prices.length < 50) {
    return NextResponse.json({ error: "Insufficient price history" }, { status: 422 });
  }

  const strategyIds = listStrategies();
  const results = strategyIds
    .map((id) => runBacktest(id, prices))
    .filter(Boolean)
    .map((bt) => {
      const p = bt!.latestPrice;
      let entryPrice: number, exitPrice: number;
      if (bt!.latestSignal === "BUY") {
        entryPrice = bt!.signals.filter(s => s.type === "BUY").at(-1)?.price ?? p;
        exitPrice = Math.round(entryPrice * 1.15);
      } else if (bt!.latestSignal === "SELL") {
        entryPrice = bt!.signals.filter(s => s.type === "SELL").at(-1)?.price ?? p;
        exitPrice = Math.round(entryPrice * 0.88);
      } else {
        entryPrice = bt!.signals.at(-1)?.price ?? Math.round(p * 0.97);
        exitPrice = Math.round(p * 1.05);
      }
      return {
        name: bt!.strategyName,
        icon: bt!.icon,
        signal: bt!.latestSignal,
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitPrice: Math.round(exitPrice * 100) / 100,
        reasoning: bt!.reasoning,
        probability: bt!.confidence,
      };
    });

  return NextResponse.json(results);
}
