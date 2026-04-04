import { NextResponse } from "next/server";

const STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", type: "stock", exchange: "NSE" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", type: "stock", exchange: "NSE" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", type: "stock", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys Ltd", type: "stock", exchange: "NSE" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", type: "stock", exchange: "NSE" },
  { symbol: "SBIN.NS", name: "State Bank of India", type: "stock", exchange: "NSE" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", type: "stock", exchange: "NSE" },
  { symbol: "ITC.NS", name: "ITC Ltd", type: "stock", exchange: "NSE" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", type: "stock", exchange: "NSE" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", type: "stock", exchange: "NSE" },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports & SEZ Ltd", type: "stock", exchange: "NSE" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", type: "stock", exchange: "NSE" },
  { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", type: "stock", exchange: "NSE" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", type: "stock", exchange: "NSE" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Ltd", type: "stock", exchange: "NSE" },
];

const ETFS = [
  { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", type: "etf", exchange: "NSE" },
  { symbol: "GOLDBEES.NS", name: "Gold ETF", type: "etf", exchange: "NSE" },
  { symbol: "SILVERBEES.NS", name: "Silver ETF", type: "etf", exchange: "NSE" },
  { symbol: "MON100.NS", name: "Motilal Oswal NASDAQ 100 ETF", type: "etf", exchange: "NSE" },
  { symbol: "MID100BEES.NS", name: "Nifty Midcap 100 ETF", type: "etf", exchange: "NSE" },
  { symbol: "SBIETFNSGOLD.NS", name: "SBI Gold ETF", type: "etf", exchange: "NSE" },
  { symbol: "KOTAKGOLD.NS", name: "Kotak Gold ETF", type: "etf", exchange: "NSE" },
  { symbol: "UTINIFTYYY.NS", name: "UTI Nifty 50 ETF", type: "etf", exchange: "NSE" },
];

const MUTUAL_FUNDS = [
  { symbol: "MF001", name: "HDFC Top 100 Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF002", name: "SBI Bluechip Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF003", name: "ICICI Prudential Bluechip Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF004", name: "Mirae Asset Large Cap Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF005", name: "Axis Bluechip Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF006", name: "Kotak Bluechip Fund - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF007", name: "Aditya Birla Sun Life Frontline Equity - Growth", type: "mutual_fund", exchange: "MF" },
  { symbol: "MF008", name: "Mirae Asset Hybrid Equity Fund - Growth", type: "mutual_fund", exchange: "MF" },
];

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";
  const type = searchParams.get("type") || "";

  if (!query) {
    return NextResponse.json([]);
  }

  let allAssets = [...STOCKS, ...ETFS, ...MUTUAL_FUNDS];

  if (type && type !== "all") {
    if (type === "stock") allAssets = STOCKS;
    else if (type === "etf") allAssets = ETFS;
    else if (type === "mutual_fund") allAssets = MUTUAL_FUNDS;
  }

  const filtered = allAssets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query)
  );

  const results = filtered.map((asset) => ({
    ...asset,
    currentPrice: CURRENT_PRICES[asset.symbol] || 100,
    priceChange: 0,
    priceChangePercent: 0,
    high52w: (CURRENT_PRICES[asset.symbol] || 100) * 1.2,
    low52w: (CURRENT_PRICES[asset.symbol] || 100) * 0.8,
  }));

  return NextResponse.json(results.slice(0, 10));
}
