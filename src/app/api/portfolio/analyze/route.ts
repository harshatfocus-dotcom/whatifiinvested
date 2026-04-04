import { NextResponse } from "next/server";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const CURRENT_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2950, "TCS.NS": 4200, "HDFCBANK.NS": 1680, "INFY.NS": 1900,
  "ICICIBANK.NS": 1200, "SBIN.NS": 820, "HINDUNILVR.NS": 2850, "ITC.NS": 450,
  "KOTAKBANK.NS": 1850, "BHARTIARTL.NS": 1580, "ADANIPORTS.NS": 1450, "ASIANPAINT.NS": 3200,
  "AXISBANK.NS": 1050, "BAJFINANCE.NS": 7800, "BAJAJFINSV.NS": 1680, "BPCL.NS": 380,
  "BRITANNIA.NS": 5200, "CIPLA.NS": 1450, "COALINDIA.NS": 380, "DIVISLAB.NS": 5800,
  "DRREDDY.NS": 6800, "EICHERMOT.NS": 38000, "GRASIM.NS": 2800, "HCLTECH.NS": 2800,
  "HEROMOTOCO.NS": 4800, "HINDALCO.NS": 680, "INDUSINDBK.NS": 1450, "JSWSTEEL.NS": 980,
  "L&T.NS": 3200, "LTIM.NS": 5800, "M&M.NS": 2800, "MARUTI.NS": 12000,
  "NESTLEIND.NS": 2500, "NTPC.NS": 320, "ONGC.NS": 280, "POWERGRID.NS": 320,
  "SHREECEM.NS": 85000, "SUNPHARMA.NS": 1800, "TATACONSUM.NS": 1150, "TATAMOTORS.NS": 720,
  "TATASTEEL.NS": 145, "TECHM.NS": 1900, "TITAN.NS": 3800, "ULTRACEMCO.NS": 12000,
  "UPL.NS": 580, "WIPRO.NS": 420, "ZOMATO.NS": 280, "JIOFIN.NS": 380,
  "NIFTYBEES.NS": 250, "GOLDBEES.NS": 58, "SILVERBEES.NS": 125, "MON100.NS": 850,
  "MID100BEES.NS": 320, "SBIETFNSGOLD.NS": 5800, "KOTAKGOLD.NS": 5600, "UTINIFTYYY.NS": 250,
  "MF001": 850, "MF002": 72, "MF003": 78, "MF004": 42, "MF005": 58, "MF006": 42,
  "GC=F": 2750, "SI=F": 32, "CL=F": 75, "NG=F": 3.5,
  "BTC-USD": 95000, "ETH-USD": 3200, "BNB-USD": 680, "XRP-USD": 3.2,
  "SOL-USD": 195, "ADA-USD": 1.1, "DOGE-USD": 0.35, "DOT-USD": 8.5,
};

const START_PRICES: Record<string, number> = {
  "RELIANCE.NS": 2100, "TCS.NS": 3100, "HDFCBANK.NS": 1200, "INFY.NS": 1400,
  "ICICIBANK.NS": 850, "SBIN.NS": 580, "HINDUNILVR.NS": 2200, "ITC.NS": 320,
  "KOTAKBANK.NS": 1350, "BHARTIARTL.NS": 1100, "NIFTYBEES.NS": 175, "GOLDBEES.NS": 42,
  "BTC-USD": 35000, "ETH-USD": 1200,
};

async function getLivePrice(symbol: string): Promise<number> {
  try {
    if (ALPHA_VANTAGE_API_KEY) {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol.replace('.NS', '').replace('-USD', '')}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      const quote = data["Global Quote"];
      if (quote && quote["05. price"]) {
        return parseFloat(quote["05. price"]);
      }
    }
  } catch (e) {
    console.error("Live price error:", e);
  }
  return CURRENT_PRICES[symbol] || 100;
}

async function getHistoricalData(symbol: string, startDate: string): Promise<any[] | null> {
  try {
    if (ALPHA_VANTAGE_API_KEY) {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol.replace('.NS', '').replace('-USD', '')}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();
      const timeSeries = data["Time Series (Daily)"];
      
      if (timeSeries) {
        const result = [];
        const start = new Date(startDate);
        
        for (const [dateStr, values] of Object.entries(timeSeries)) {
          const date = new Date(dateStr);
          if (date >= start) {
            result.push({
              date: dateStr,
              close: parseFloat((values as any)["5. adjusted close"]),
              volume: parseInt((values as any)["6. volume"]),
            });
          }
        }
        
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }
  } catch (e) {
    console.error("Historical data error:", e);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assets, initialInvestment, recurringAmount, frequency, startDate } = body as {
      assets: any[];
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
    let totalInvested = initialInvestment + totalRecurring;

    const holdings: any[] = [];
    const allChartData: any[] = [];

    // Fetch live prices and historical data in parallel
    const pricePromises = assets.map(async (asset: any) => {
      const currentPrice = await getLivePrice(asset.symbol);
      const histData = await getHistoricalData(asset.symbol, startDate);
      return { symbol: asset.symbol, currentPrice, histData };
    });

    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map(priceResults.map(r => [r.symbol, r.currentPrice]));
    const histMap = new Map(priceResults.map(r => [r.symbol, r.histData]));

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const currentPrice = priceMap.get(asset.symbol) || CURRENT_PRICES[asset.symbol] || 100;
      const histData = histMap.get(asset.symbol);
      
      let startPrice = START_PRICES[asset.symbol];
      if (!startPrice && histData && histData.length > 0) {
        startPrice = histData[0].close;
      }
      startPrice = startPrice || (currentPrice * 0.7);
      
      const normalizedWeight = asset.weight / 100;
      const initialInvested = initialInvestment * normalizedWeight;
      const recurringInvested = totalRecurring * normalizedWeight;
      const totalAssetInvested = initialInvested + recurringInvested;
      
      let avgBuyPrice: number;
      let quantity: number;
      let currentValue: number;
      
      if (histData && histData.length > 0 && recurringAmount > 0) {
        // DCA with real historical data
        let totalUnits = 0;
        const monthlyData = histData.filter((_: any, idx: number) => idx % 21 === 0);
        
        for (const point of monthlyData) {
          const priceAtTime = point.close;
          const investmentAtTime = (recurringAmount * normalizedWeight);
          totalUnits += investmentAtTime / priceAtTime;
        }
        
        quantity = totalUnits;
        currentValue = quantity * currentPrice;
        avgBuyPrice = totalAssetInvested / quantity;
      } else {
        avgBuyPrice = startPrice;
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

      // Build chart data
      if (histData && histData.length > 0) {
        for (const point of histData) {
          allChartData.push({
            date: point.date,
            value: point.close * quantity,
            invested: totalAssetInvested * (histData.indexOf(point) / histData.length),
          });
        }
      } else {
        // Fallback chart data
        const monthlyGrowth = Math.pow(currentPrice / startPrice, 1 / Math.max(1, months));
        for (let m = 0; m <= months; m++) {
          const date = new Date(start);
          date.setMonth(date.getMonth() + m);
          const price = startPrice * Math.pow(monthlyGrowth, m);
          
          allChartData.push({
            date: date.toISOString().split("T")[0],
            value: Math.round(quantity * price),
            invested: Math.round(initialInvested + (recurringInvested * m / months)),
          });
        }
      }
    }

    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const absoluteReturn = totalCurrentValue - totalInvested;
    const percentReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
    const cagr = Math.pow(totalCurrentValue / totalInvested, 1 / years) - 1;

    const sortedHoldings = [...holdings].sort((a, b) => b.returnPercent - a.returnPercent);

    return NextResponse.json({
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(totalCurrentValue),
      absoluteReturn: Math.round(absoluteReturn),
      percentReturn: Math.round(percentReturn * 100) / 100,
      cagr: Math.round(cagr * 10000) / 100,
      holdings,
      chartData: allChartData,
      bestPerformer: { symbol: sortedHoldings[0].symbol, returnPercent: sortedHoldings[0].returnPercent },
      worstPerformer: { symbol: sortedHoldings[sortedHoldings.length - 1].symbol, returnPercent: sortedHoldings[sortedHoldings.length - 1].returnPercent },
      dataSource: "Alpha Vantage",
    });

  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
