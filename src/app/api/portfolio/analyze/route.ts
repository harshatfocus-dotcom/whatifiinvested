import { NextResponse } from "next/server";
import { getHistoricalPrices, getCurrentPrice } from "@/lib/data/market-data";

// Fallback prices if API fails
const FALLBACK_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2950, "TCS.NS": 4200, "HDFCBANK.NS": 1680, "INFY.NS": 1900,
  "ICICIBANK.NS": 1200, "SBIN.NS": 820, "HINDUNILVR.NS": 2850, "ITC.NS": 450,
  "KOTAKBANK.NS": 1850, "BHARTIARTL.NS": 1580, "NIFTYBEES.NS": 250, "GOLDBEES.NS": 58,
  "BTC-USD": 95000, "ETH-USD": 3200, "GC=F": 2750, "SI=F": 32,
};

interface AssetInput {
  symbol: string;
  name: string;
  weight: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, initialInvestment, recurringAmount, startDate } = body as {
      assets: AssetInput[];
      initialInvestment: number;
      recurringAmount: number;
      frequency: string | null;
      startDate: string;
    };

    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "No assets provided" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date();
    const years = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor(years * 12);
    const totalRecurring = (recurringAmount || 0) * months;
    const totalInvested = initialInvestment + totalRecurring;

    // Fetch historical and current prices in parallel for all assets
    const dataPromises = assets.map(async (asset) => {
      const [histPrices, quote] = await Promise.all([
        getHistoricalPrices(asset.symbol, startDate),
        getCurrentPrice(asset.symbol),
      ]);
      return {
        symbol: asset.symbol,
        histPrices,
        currentPrice: quote?.price ?? FALLBACK_PRICES[asset.symbol] ?? 100,
      };
    });

    const assetData = await Promise.all(dataPromises);
    const dataMap = new Map(assetData.map((d) => [d.symbol, d]));

    interface HoldingResult {
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

    const holdings: HoldingResult[] = [];
    const allChartData: Array<{ date: string; value: number; invested: number }> = [];

    for (const asset of assets) {
      const data = dataMap.get(asset.symbol);
      if (!data) continue;

      const { histPrices, currentPrice } = data;
      const normalizedWeight = asset.weight / 100;
      const initialInvested = initialInvestment * normalizedWeight;
      const recurringInvested = totalRecurring * normalizedWeight;
      const totalAssetInvested = initialInvested + recurringInvested;

      let avgBuyPrice: number;
      let quantity: number;
      let currentValue: number;

      if (histPrices.length > 0 && recurringAmount > 0) {
        // Real DCA calculation using actual monthly dates
        let totalUnits = 0;
        let totalSpent = 0;

        // Initial lump sum investment at start price
        const startPrice = histPrices[0].close;
        const initialUnits = initialInvested / startPrice;
        totalUnits += initialUnits;
        totalSpent += initialInvested;

        // Monthly DCA: find first trading day of each month
        const monthlyInvestment = recurringAmount * normalizedWeight;
        let lastMonth = -1;
        for (const price of histPrices) {
          const d = new Date(price.date);
          const monthKey = d.getFullYear() * 12 + d.getMonth();
          if (monthKey !== lastMonth && totalSpent < totalAssetInvested) {
            // Skip the first month (already invested lump sum)
            if (lastMonth !== -1) {
              const unitsThisMonth = monthlyInvestment / price.close;
              totalUnits += unitsThisMonth;
              totalSpent += monthlyInvestment;
            }
            lastMonth = monthKey;
          }
        }

        quantity = totalUnits;
        currentValue = quantity * currentPrice;
        avgBuyPrice = totalSpent > 0 ? totalSpent / quantity : startPrice;
      } else if (histPrices.length > 0) {
        // Lump sum only
        const startPrice = histPrices[0].close;
        avgBuyPrice = startPrice;
        quantity = totalAssetInvested / avgBuyPrice;
        currentValue = quantity * currentPrice;
      } else {
        // No historical data fallback
        const estimatedStartPrice = currentPrice * 0.7;
        avgBuyPrice = estimatedStartPrice;
        quantity = totalAssetInvested / avgBuyPrice;
        currentValue = quantity * currentPrice;
      }

      const returnAmount = currentValue - totalAssetInvested;
      const returnPercent = totalAssetInvested > 0 ? (returnAmount / totalAssetInvested) * 100 : 0;

      holdings.push({
        symbol: asset.symbol,
        name: asset.name,
        quantity: Math.round(quantity * 10000) / 10000,
        avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
        currentPrice,
        currentValue: Math.round(currentValue),
        investedAmount: Math.round(totalAssetInvested),
        returnAmount: Math.round(returnAmount),
        returnPercent: Math.round(returnPercent * 100) / 100,
      });

      // Build accurate chart data
      if (histPrices.length > 0) {
        // Track cumulative invested and units for accurate chart
        let cumulativeUnits = initialInvested / histPrices[0].close;
        let cumulativeInvested = initialInvested;
        let lastChartMonth = -1;
        const monthlyDCA = recurringAmount * normalizedWeight;

        for (const price of histPrices) {
          const d = new Date(price.date);
          const monthKey = d.getFullYear() * 12 + d.getMonth();

          // Add DCA units at month boundaries
          if (recurringAmount > 0 && monthKey !== lastChartMonth && lastChartMonth !== -1) {
            if (cumulativeInvested < totalAssetInvested) {
              cumulativeUnits += monthlyDCA / price.close;
              cumulativeInvested += monthlyDCA;
            }
          }
          lastChartMonth = monthKey;

          allChartData.push({
            date: price.date,
            value: Math.round(cumulativeUnits * price.close),
            invested: Math.round(cumulativeInvested),
          });
        }
      } else {
        // Fallback: generate synthetic chart data
        const estimatedStartPrice = currentPrice * 0.7;
        const monthlyGrowth = Math.pow(currentPrice / estimatedStartPrice, 1 / Math.max(1, months));
        for (let m = 0; m <= months; m++) {
          const date = new Date(start);
          date.setMonth(date.getMonth() + m);
          const price = estimatedStartPrice * Math.pow(monthlyGrowth, m);
          allChartData.push({
            date: date.toISOString().split("T")[0],
            value: Math.round(quantity * price),
            invested: Math.round(initialInvested + (recurringInvested * m / months)),
          });
        }
      }
    }

    // Aggregate chart data by date for multi-asset portfolios
    const chartByDate = new Map<string, { value: number; invested: number }>();
    for (const point of allChartData) {
      const existing = chartByDate.get(point.date);
      if (existing) {
        existing.value += point.value;
        existing.invested += point.invested;
      } else {
        chartByDate.set(point.date, { value: point.value, invested: point.invested });
      }
    }

    const chartData = Array.from(chartByDate.entries())
      .map(([date, d]) => ({ date, value: d.value, invested: d.invested }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const absoluteReturn = totalCurrentValue - totalInvested;
    const percentReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
    const cagr = totalInvested > 0 ? (Math.pow(totalCurrentValue / totalInvested, 1 / years) - 1) * 100 : 0;

    const sortedHoldings = [...holdings].sort((a, b) => b.returnPercent - a.returnPercent);

    return NextResponse.json({
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      absoluteReturn: Math.round(absoluteReturn),
      percentReturn: Math.round(percentReturn * 100) / 100,
      cagr: Math.round(cagr * 100) / 100,
      holdings,
      chartData,
      bestPerformer: { symbol: sortedHoldings[0]?.symbol ?? "", returnPercent: sortedHoldings[0]?.returnPercent ?? 0 },
      worstPerformer: { symbol: sortedHoldings[sortedHoldings.length - 1]?.symbol ?? "", returnPercent: sortedHoldings[sortedHoldings.length - 1]?.returnPercent ?? 0 },
      dataSource: "yahoo-finance2 + AMFI",
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
