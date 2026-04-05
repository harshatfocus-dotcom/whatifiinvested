import { NextResponse } from "next/server";
import { getHistoricalPrices, isUSStock } from "@/lib/data/market-data";
import { computePortfolioRiskFromChart, computeCorrelationMatrix } from "@/lib/analytics/risk-metrics";

// Last-resort fallback prices (Apr 2025 approximations)
const FALLBACK_PRICES: Record<string, number> = {
  "RELIANCE.NS": 1270,  "TCS.NS": 3750,    "HDFCBANK.NS": 1880,  "INFY.NS": 1800,
  "ICICIBANK.NS": 1380, "SBIN.NS": 800,    "HINDUNILVR.NS": 2380,"ITC.NS": 430,
  "KOTAKBANK.NS": 2100, "BHARTIARTL.NS": 1750,"AXISBANK.NS": 1190,"BAJFINANCE.NS": 8600,
  "BAJAJFINSV.NS":1950, "WIPRO.NS": 260,   "TATAMOTORS.NS": 700, "MARUTI.NS": 12100,
  "HCLTECH.NS": 1760,   "TECHM.NS": 1520,  "ZOMATO.NS": 230,     "ADANIPORTS.NS": 1380,
  "SUNPHARMA.NS": 1860, "TITAN.NS": 3680,  "ASIANPAINT.NS": 2300,"NESTLEIND.NS": 24000,
  "LTIM.NS": 5200,      "NTPC.NS": 380,    "ONGC.NS": 260,       "COALINDIA.NS": 480,
  "NIFTYBEES.NS": 255,  "GOLDBEES.NS": 64, "SILVERBEES.NS": 96,
  "BTC-USD": 83000,     "ETH-USD": 1800,   "GC=F": 3050,         "SI=F": 34,
  "CL=F": 72,           "NG=F": 2.0,
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
      benchmarks?: string[];
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

    // Fetch historical prices for all assets in parallel
    const dataPromises = assets.map(async (asset) => {
      const histPrices = await getHistoricalPrices(asset.symbol, startDate);
      // Use last historical close as current price — avoids a redundant API call
      const lastPrice = histPrices.length > 0 ? histPrices[histPrices.length - 1].close : null;
      return {
        symbol: asset.symbol,
        histPrices,
        currentPrice: lastPrice ?? FALLBACK_PRICES[asset.symbol] ?? 100,
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
      currency?: string;
      currentPriceUSD?: number;
      avgBuyPriceUSD?: number;
      currentValueUSD?: number;
    }

    const holdings: HoldingResult[] = [];
    const allChartData: Array<{ date: string; value: number; invested: number }> = [];
    const allLumpSumData: Array<{ date: string; value: number; invested: number }> = [];
    const assetChartDataMap: Map<string, Array<{ date: string; value: number; invested: number }>> = new Map();

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

      // USD values for US stocks (prices are already converted to INR in market-data.ts)
      const lastPricePoint = histPrices.length > 0 ? histPrices[histPrices.length - 1] : null;
      const currentPriceUSD = lastPricePoint?.closeUSD;
      const usdInrRate = currentPriceUSD && currentPriceUSD > 0
        ? currentPrice / currentPriceUSD
        : undefined;

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
        ...(isUSStock(asset.symbol) && currentPriceUSD && usdInrRate ? {
          currency: "USD",
          currentPriceUSD: Math.round(currentPriceUSD * 100) / 100,
          avgBuyPriceUSD:  Math.round((avgBuyPrice / usdInrRate) * 100) / 100,
          currentValueUSD: Math.round(currentValue / usdInrRate),
        } : { currency: "INR" }),
      });

      // Build accurate chart data
      const assetPoints: Array<{ date: string; value: number; invested: number }> = [];
      if (histPrices.length > 0) {
        // Track cumulative invested and units for accurate chart
        let cumulativeUnits = initialInvested / histPrices[0].close;
        let cumulativeInvested = initialInvested;
        let lastChartMonth = -1;
        const monthlyDCA = recurringAmount * normalizedWeight;
        // Lump sum: all invested on day 1
        const lsUnits = totalAssetInvested / histPrices[0].close;

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

          const pt = {
            date: price.date,
            value: Math.round(cumulativeUnits * price.close),
            invested: Math.round(cumulativeInvested),
          };
          allChartData.push(pt);
          assetPoints.push(pt);
          allLumpSumData.push({
            date: price.date,
            value: Math.round(lsUnits * price.close),
            invested: Math.round(totalAssetInvested),
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
          const pt = {
            date: date.toISOString().split("T")[0],
            value: Math.round(quantity * price),
            invested: Math.round(initialInvested + (recurringInvested * m / months)),
          };
          allChartData.push(pt);
          assetPoints.push(pt);
          allLumpSumData.push({ ...pt, invested: Math.round(totalAssetInvested) });
        }
      }
      assetChartDataMap.set(asset.symbol, assetPoints);
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

    // Aggregate lump-sum data
    const lsMap = new Map<string, { value: number; invested: number }>();
    for (const pt of allLumpSumData) {
      const ex = lsMap.get(pt.date);
      if (ex) { ex.value += pt.value; ex.invested += pt.invested; }
      else lsMap.set(pt.date, { value: pt.value, invested: pt.invested });
    }
    const lsChartData = Array.from(lsMap.entries())
      .map(([date, d]) => ({ date, value: d.value, invested: d.invested }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const absoluteReturn = totalCurrentValue - totalInvested;
    const percentReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
    const cagr = totalInvested > 0 ? (Math.pow(totalCurrentValue / totalInvested, 1 / years) - 1) * 100 : 0;

    const sortedHoldings = [...holdings].sort((a, b) => b.returnPercent - a.returnPercent);
    const roundedCagr = Math.round(cagr * 100) / 100;

    // Risk metrics + drawdown series from aggregated chart data
    const { metrics: riskMetrics, drawdownSeries } = computePortfolioRiskFromChart(chartData, roundedCagr);

    // Lump sum comparison
    const lsCurrentValue = lsChartData[lsChartData.length - 1]?.value ?? totalCurrentValue;
    const lsReturn = totalInvested > 0 ? ((lsCurrentValue - totalInvested) / totalInvested) * 100 : 0;
    const lsCagr = totalInvested > 0 && years > 0 ? (Math.pow(lsCurrentValue / totalInvested, 1 / years) - 1) * 100 : 0;
    const lumpSumComparison = {
      currentValue: Math.round(lsCurrentValue),
      cagr: Math.round(lsCagr * 100) / 100,
      percentReturn: Math.round(lsReturn * 100) / 100,
      chartData: lsChartData,
    };

    // Per-asset chart data (for correlation)
    const assetChartData: Record<string, Array<{ date: string; value: number; invested: number }>> = {};
    for (const [sym, pts] of assetChartDataMap.entries()) assetChartData[sym] = pts;

    // Correlation matrix (if 2+ assets)
    let correlationMatrix: number[][] = [];
    let correlationSymbols: string[] = [];
    if (assets.length >= 2) {
      const result = computeCorrelationMatrix(assetChartData);
      correlationMatrix = result.matrix;
      correlationSymbols = result.symbols;
    }

    // Benchmarks
    let benchmarks: Record<string, Array<{ date: string; value: number; invested: number }>> = {};
    try {
      const firstDate = chartData[0]?.date ?? startDate;
      const lastDate = chartData[chartData.length - 1]?.date;
      const normBase = chartData[0]?.value ?? totalInvested;

      // Nifty 50
      const niftyPrices = await getHistoricalPrices("^NSEI", firstDate);
      if (niftyPrices.length > 1) {
        const niftyStart = niftyPrices[0].close;
        benchmarks.nifty = niftyPrices
          .filter(p => !lastDate || p.date <= lastDate)
          .map(p => ({ date: p.date, value: Math.round(normBase * (p.close / niftyStart)), invested: normBase }));
      }

      // Gold (GC=F)
      const goldPrices = await getHistoricalPrices("GC=F", firstDate);
      if (goldPrices.length > 1) {
        const goldStart = goldPrices[0].close;
        benchmarks.gold = goldPrices
          .filter(p => !lastDate || p.date <= lastDate)
          .map(p => ({ date: p.date, value: Math.round(normBase * (p.close / goldStart)), invested: normBase }));
      }

      // FD at 6.5% compounded annually
      benchmarks.fd = chartData.map(pt => {
        const t = (new Date(pt.date).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
        return { date: pt.date, value: Math.round(normBase * Math.pow(1.065, t)), invested: normBase };
      });
    } catch {
      // Benchmarks are non-critical, skip on error
    }

    return NextResponse.json({
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      absoluteReturn: Math.round(absoluteReturn),
      percentReturn: Math.round(percentReturn * 100) / 100,
      cagr: roundedCagr,
      holdings,
      chartData,
      assetChartData,
      bestPerformer: { symbol: sortedHoldings[0]?.symbol ?? "", returnPercent: sortedHoldings[0]?.returnPercent ?? 0 },
      worstPerformer: { symbol: sortedHoldings[sortedHoldings.length - 1]?.symbol ?? "", returnPercent: sortedHoldings[sortedHoldings.length - 1]?.returnPercent ?? 0 },
      riskMetrics,
      drawdownSeries,
      lumpSumComparison,
      benchmarks,
      correlationMatrix,
      correlationSymbols,
      dataSource: "yahoo-finance2 + AMFI",
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
