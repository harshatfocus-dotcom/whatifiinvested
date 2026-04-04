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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const functionType = searchParams.get("function") || "GLOBAL_QUOTE";

  // Try to get live price from Alpha Vantage if API key is available
  if (ALPHA_VANTAGE_API_KEY && symbol) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol.replace(".NS", "").replace("-USD", "")}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const quote = data["Global Quote"] || data["Realtime Currency Exchange Rate"];
        
        if (quote) {
          const livePrice = parseFloat(quote["05. price"] || quote["5. Exchange Rate"]);
          if (livePrice && livePrice > 0) {
            return NextResponse.json({
              symbol,
              currentPrice: livePrice,
              source: "Alpha Vantage (Live)"
            });
          }
        }
      }
    } catch (error) {
      console.error("Alpha Vantage API error:", error);
    }
  }

  // Fallback to static prices
  return NextResponse.json({
    symbol,
    currentPrice: CURRENT_PRICES[symbol] || 100,
    source: "Static (Mock)"
  });
}
