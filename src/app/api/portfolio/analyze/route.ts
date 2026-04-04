import { NextResponse } from "next/server";

interface PortfolioAsset {
  symbol: string;
  name: string;
  weight: number;
  initialInvestment: number;
  recurringAmount: number;
  frequency: string | null;
  startDate: string;
}

interface Holding {
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

interface ChartDataPoint {
  date: string;
  value: number;
  invested: number;
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
  "MF001": 850,
  "MF002": 72,
  "MF003": 78,
  "MF004": 42,
  "MF005": 58,
  "MF006": 42,
  "MF007": 380,
  "MF008": 35,
};

function generateHistoricalData(startDate: string, currentPrice: number): ChartDataPoint[] {
  const start = new Date(startDate);
  const end = new Date();
  const data: ChartDataPoint[] = [];
  
  let price = currentPrice * 0.7;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dailyGrowth = Math.pow(currentPrice / price, 1 / totalDays) - 1;
  
  let investedCumulative = 0;
  let totalUnits = 0;
  let unitPrice = price;
  
  const current = new Date(start);
  while (current <= end) {
    const dailyReturn = (Math.random() - 0.45) * 0.03;
    price = price * (1 + dailyGrowth + dailyReturn);
    
    if (current.getDate() === 1) {
      investedCumulative += 10000;
      totalUnits += 10000 / unitPrice;
    }
    
    const portfolioValue = totalUnits * price;
    
    data.push({
      date: current.toISOString().split("T")[0],
      value: Math.round(portfolioValue),
      invested: Math.round(investedCumulative),
    });
    
    unitPrice = price;
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, initialInvestment, recurringAmount, frequency, startDate } = body as {
      assets: PortfolioAsset[];
      initialInvestment: number;
      recurringAmount: number;
      frequency: string | null;
      startDate: string;
    };

    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "No assets provided" }, { status: 400 });
    }

    const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
    const normalizedAssets = assets.map((a) => ({
      ...a,
      normalizedWeight: a.weight / totalWeight,
    }));

    let totalInvested = initialInvestment;
    const holdings: Holding[] = [];
    const allChartData: ChartDataPoint[] = [];

    // Calculate years of investment
    const start = new Date(startDate);
    const end = new Date();
    const years = Math.max(0.1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    // Calculate monthly recurring investments count
    const monthsInvested = Math.floor(years * 12);
    const totalRecurring = (recurringAmount || 0) * monthsInvested;
    totalInvested += totalRecurring;

    for (const asset of normalizedAssets) {
      const currentPrice = CURRENT_PRICES[asset.symbol] || 100;
      
      // Simulate starting price (assume 30% lower than current - realistic for 5 year period)
      const startPrice = currentPrice * 0.7;
      
      // Split investment: 50% initial, 50% from recurring (spread over time)
      const initialInvested = initialInvestment * asset.normalizedWeight;
      const recurringInvested = totalRecurring * asset.normalizedWeight;
      const totalAssetInvested = initialInvested + recurringInvested;
      
      // Calculate average purchase price (assume gradual buying at average price)
      const avgBuyPrice = (startPrice + currentPrice) / 2;
      const quantity = totalAssetInvested / avgBuyPrice;
      const currentValue = quantity * currentPrice;
      
      const returnAmount = currentValue - totalAssetInvested;
      const returnPercent = totalAssetInvested > 0 ? ((currentValue - totalAssetInvested) / totalAssetInvested) * 100 : 0;

      holdings.push({
        symbol: asset.symbol,
        name: asset.name,
        quantity: Math.round(quantity * 100) / 100,
        avgBuyPrice: Math.round(avgBuyPrice * 100) / 100,
        currentPrice,
        currentValue: Math.round(currentValue),
        investedAmount: Math.round(totalAssetInvested),
        returnAmount: Math.round(returnAmount),
        returnPercent: Math.round(returnPercent * 100) / 100,
      });
    }

    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const absoluteReturn = totalCurrentValue - totalInvested;
    const percentReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

    const cagr = Math.pow(totalCurrentValue / totalInvested, 1 / years) - 1;

    const sortedHoldings = [...holdings].sort((a, b) => b.returnPercent - a.returnPercent);
    const bestPerformer = sortedHoldings[0];
    const worstPerformer = sortedHoldings[sortedHoldings.length - 1];

    if (holdings.length > 0) {
      const firstAsset = holdings[0];
      allChartData.push(...generateHistoricalData(startDate, firstAsset.currentPrice));
    }

    return NextResponse.json({
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      absoluteReturn: Math.round(absoluteReturn),
      percentReturn: Math.round(percentReturn * 100) / 100,
      cagr: Math.round(cagr * 10000) / 100,
      holdings,
      chartData: allChartData,
      bestPerformer: { symbol: bestPerformer.symbol, returnPercent: bestPerformer.returnPercent },
      worstPerformer: { symbol: worstPerformer.symbol, returnPercent: worstPerformer.returnPercent },
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
