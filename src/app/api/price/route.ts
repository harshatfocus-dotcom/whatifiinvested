import { NextResponse } from "next/server";
import { getCurrentPrice } from "@/lib/data/market-data";

const FALLBACK_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2950, "TCS.NS": 4200, "HDFCBANK.NS": 1680, "INFY.NS": 1900,
  "ICICIBANK.NS": 1200, "SBIN.NS": 820, "HINDUNILVR.NS": 2850, "ITC.NS": 450,
  "NIFTYBEES.NS": 250, "GOLDBEES.NS": 58, "BTC-USD": 95000, "ETH-USD": 3200,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const quote = await getCurrentPrice(symbol);

  if (quote) {
    return NextResponse.json({
      symbol,
      currentPrice: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      source: "yahoo-finance2",
    });
  }

  return NextResponse.json({
    symbol,
    currentPrice: FALLBACK_PRICES[symbol] || 100,
    source: "fallback",
  });
}
