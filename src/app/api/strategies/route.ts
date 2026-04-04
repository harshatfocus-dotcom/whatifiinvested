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
    .map((bt) => ({
      name: bt!.strategyName,
      icon: bt!.icon,
      signal: bt!.latestSignal,
      entryPrice: bt!.signals.filter((s) => s.type === "BUY").at(-1)?.price ?? bt!.latestPrice * 0.95,
      exitPrice: bt!.signals.filter((s) => s.type === "SELL").at(-1)?.price ?? bt!.latestPrice * 1.12,
      reasoning: bt!.reasoning,
      probability: bt!.confidence,
    }));

  return NextResponse.json(results);
}
