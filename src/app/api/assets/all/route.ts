import { NextResponse } from "next/server";

export const NIFTY_50_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", sector: "Conglomerate" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", sector: "IT" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", sector: "Banking" },
  { symbol: "INFY.NS", name: "Infosys Ltd", sector: "IT" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", sector: "Banking" },
  { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", sector: "FMCG" },
  { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", sector: "Banking" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", sector: "Telecom" },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports & SEZ Ltd", sector: "Infrastructure" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", sector: "Chemicals" },
  { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", sector: "Banking" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", sector: "Finance" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Ltd", sector: "Finance" },
  { symbol: "BPCL.NS", name: "Bharat Petroleum Corp Ltd", sector: "Oil & Gas" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries Ltd", sector: "FMCG" },
  { symbol: "CIPLA.NS", name: "Cipla Ltd", sector: "Pharma" },
  { symbol: "COALINDIA.NS", name: "Coal India Ltd", sector: "Mining" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories Ltd", sector: "Pharma" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Laboratories Ltd", sector: "Pharma" },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors Ltd", sector: "Automobile" },
  { symbol: "GRASIM.NS", name: "Grasim Industries Ltd", sector: "Conglomerate" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies Ltd", sector: "IT" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp Ltd", sector: "Automobile" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries Ltd", sector: "Metals" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Ltd", sector: "Banking" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel Ltd", sector: "Steel" },
  { symbol: "L&T.NS", name: "Larsen & Toubro Ltd", sector: "Construction" },
  { symbol: "LTIM.NS", name: "LTIMindtree Ltd", sector: "IT" },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra Ltd", sector: "Automobile" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India Ltd", sector: "Automobile" },
  { symbol: "NESTLEIND.NS", name: "Nestle India Ltd", sector: "FMCG" },
  { symbol: "NTPC.NS", name: "NTPC Ltd", sector: "Power" },
  { symbol: "ONGC.NS", name: "Oil & Natural Gas Corp Ltd", sector: "Oil & Gas" },
  { symbol: "POWERGRID.NS", name: "Power Grid Corp of India Ltd", sector: "Power" },
  { symbol: "SHREECEM.NS", name: "Shree Cement Ltd", sector: "Cement" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Ltd", sector: "Pharma" },
  { symbol: "TATACONSUM.NS", name: "Tata Consumer Products Ltd", sector: "FMCG" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", sector: "Automobile" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel Ltd", sector: "Steel" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", sector: "IT" },
  { symbol: "TECHM.NS", name: "Tech Mahindra Ltd", sector: "IT" },
  { symbol: "TITAN.NS", name: "Titan Company Ltd", sector: "Jewelry" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement Ltd", sector: "Cement" },
  { symbol: "UPL.NS", name: "UPL Ltd", sector: "Chemicals" },
  { symbol: "WIPRO.NS", name: "Wipro Ltd", sector: "IT" },
  { symbol: "ZOMATO.NS", name: "Zomato Ltd", sector: "Food Tech" },
  { symbol: "JIOFIN.NS", name: "Jio Financial Services Ltd", sector: "Finance" },
];

export const ETFS = [
  { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", category: "Index" },
  { symbol: "GOLDBEES.NS", name: "Gold ETF", category: "Gold" },
  { symbol: "SILVERBEES.NS", name: "Silver ETF", category: "Silver" },
  { symbol: "MON100.NS", name: "Motilal Oswal NASDAQ 100 ETF", category: "International" },
  { symbol: "MID100BEES.NS", name: "Nifty Midcap 100 ETF", category: "Midcap" },
  { symbol: "SBIETFNSGOLD.NS", name: "SBI Gold ETF", category: "Gold" },
  { symbol: "KOTAKGOLD.NS", name: "Kotak Gold ETF", category: "Gold" },
  { symbol: "UTINIFTYYY.NS", name: "UTI Nifty 50 ETF", category: "Index" },
  { symbol: "ICICINIFTY.NS", name: "ICICI Prudential Nifty 50 ETF", category: "Index" },
  { symbol: "HDFCNIFETF.NS", name: "HDFC Nifty 50 ETF", category: "Index" },
  { symbol: "NIFTYIT.NS", name: "Nifty IT ETF", category: "Sectoral" },
  { symbol: "NIFTYBANK.NS", name: "Nifty Bank ETF", category: "Sectoral" },
  { symbol: "NIFTYPSU.NS", name: "Nifty PSU Bank ETF", category: "Sectoral" },
  { symbol: "NIFTYFINSERV.NS", name: "Nifty Financial Services ETF", category: "Sectoral" },
  { symbol: "NIFTYMEDIA.NS", name: "Nifty Media ETF", category: "Sectoral" },
  { symbol: "NIFTYMETAL.NS", name: "Nifty Metal ETF", category: "Sectoral" },
  { symbol: "NIFTYPHARMA.NS", name: "Nifty Pharma ETF", category: "Sectoral" },
  { symbol: "NIFTYREALTY.NS", name: "Nifty Realty ETF", category: "Sectoral" },
  { symbol: "NIFTYENERGY.NS", name: "Nifty Energy ETF", category: "Sectoral" },
  { symbol: "LIQUIDBEES.NS", name: "Liquid Bees ETF", category: "Liquid" },
  { symbol: "GILTBEES.NS", name: "Gilt Bees ETF", category: "Gilt" },
  { symbol: "SETFGOLD.NS", name: "Gold ETF", category: "Gold" },
];

export const MUTUAL_FUNDS = [
  { symbol: "MF001", name: "HDFC Top 100 Fund - Growth", category: "Large Cap" },
  { symbol: "MF002", name: "SBI Bluechip Fund - Growth", category: "Large Cap" },
  { symbol: "MF003", name: "ICICI Prudential Bluechip Fund - Growth", category: "Large Cap" },
  { symbol: "MF004", name: "Mirae Asset Large Cap Fund - Growth", category: "Large Cap" },
  { symbol: "MF005", name: "Axis Bluechip Fund - Growth", category: "Large Cap" },
  { symbol: "MF006", name: "Kotak Bluechip Fund - Growth", category: "Large Cap" },
  { symbol: "MF007", name: "Aditya Birla Sun Life Frontline Equity - Growth", category: "Large Cap" },
  { symbol: "MF008", name: "Mirae Asset Hybrid Equity Fund - Growth", category: "Hybrid" },
  { symbol: "MF009", name: "SBI Equity Hybrid Fund - Growth", category: "Hybrid" },
  { symbol: "MF010", name: "HDFC Hybrid Equity Fund - Growth", category: "Hybrid" },
  { symbol: "MF011", name: "ICICI Prudential Equity & Gold Fund - Growth", category: "Hybrid" },
  { symbol: "MF012", name: "HDFC Nifty 50 Index Fund - Growth", category: "Index" },
  { symbol: "MF013", name: "UTI Nifty Index Fund - Growth", category: "Index" },
  { symbol: "MF014", name: "SBI Nifty Index Fund - Growth", category: "Index" },
  { symbol: "MF015", name: "HDFC Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF016", name: "SBI Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF017", name: "Kotak Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF018", name: "Nippon India Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF019", name: "HDFC Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF020", name: "Kotak Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF021", name: "SBI Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF022", name: "Axis Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF023", name: "Nippon India Growth Fund - Growth", category: "Mid Cap" },
  { symbol: "MF024", name: "Quant Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF025", name: "Tata Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF026", name: "Invesco India Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF027", name: "Baroda BNP Paribas Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF028", name: "Tata Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF029", name: "Edelweiss Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF030", name: "L&T Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF031", name: "DSP Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF032", name: " Sundaram Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF033", name: "PGIM India Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF034", name: "Principal Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF035", name: "IDBI Mid Cap Fund - Growth", category: "Mid Cap" },
  { symbol: "MF036", name: "Union Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF037", name: "Kotak Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF038", name: "Mahindra Manulife Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF039", name: "Nippon India Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF040", name: "Baroda BNP Paribas Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF041", name: "Tata Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF042", name: "Quant Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF043", name: "Bank of India Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF044", name: "ITI Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF045", name: "Shri Ram Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF046", name: "SMC Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF047", name: "WhiteOak Capital Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF048", name: "Capsule Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF049", name: "Samco Small Cap Fund - Growth", category: "Small Cap" },
  { symbol: "MF050", name: "Nutritional Small Cap Fund - Growth", category: "Small Cap" },
];

export const COMMODITIES = [
  { symbol: "GC=F", name: "Gold Futures", category: "Precious Metals" },
  { symbol: "SI=F", name: "Silver Futures", category: "Precious Metals" },
  { symbol: "PL=F", name: "Platinum Futures", category: "Precious Metals" },
  { symbol: "PA=F", name: "Palladium Futures", category: "Precious Metals" },
  { symbol: "HG=F", name: "Copper Futures", category: "Base Metals" },
  { symbol: "ZN=F", name: "Zinc Futures", category: "Base Metals" },
  { symbol: "CL=F", name: "Crude Oil WTI", category: "Energy" },
  { symbol: "NG=F", name: "Natural Gas", category: "Energy" },
  { symbol: "RB=F", name: "RBOB Gasoline", category: "Energy" },
  { symbol: "HO=F", name: "Heating Oil", category: "Energy" },
  { symbol: "ZC=F", name: "Corn Futures", category: "Agriculture" },
  { symbol: "ZS=F", name: "Soybean Futures", category: "Agriculture" },
  { symbol: "ZW=F", name: "Wheat Futures", category: "Agriculture" },
  { symbol: "KC=F", name: "Coffee Futures", category: "Agriculture" },
  { symbol: "CT=F", name: "Cotton Futures", category: "Agriculture" },
  { symbol: "OJ=F", name: "Orange Juice Futures", category: "Agriculture" },
  { symbol: "Lumber Futures", name: "Lumber Futures", category: "Agriculture" },
  { symbol: "Rubber Futures", name: "Rubber Futures", category: "Agriculture" },
];

export const INDEXES = [
  { symbol: "^NSEI", name: "Nifty 50", category: "Index" },
  { symbol: "^BSESN", name: "Sensex", category: "Index" },
  { symbol: "NIFTYMIDCAP.NS", name: "Nifty Midcap 50", category: "Index" },
  { symbol: "NIFTYSMLCAP.NS", name: "Nifty Smallcap 50", category: "Index" },
  { symbol: "NIFTYBANK.NS", name: "Nifty Bank", category: "Index" },
  { symbol: "NIFTYIT.NS", name: "Nifty IT", category: "Index" },
  { symbol: "NIFTYAUTO.NS", name: "Nifty Auto", category: "Index" },
  { symbol: "NIFTYMETAL.NS", name: "Nifty Metal", category: "Index" },
  { symbol: "NIFTYPHARMA.NS", name: "Nifty Pharma", category: "Index" },
  { symbol: "NIFTYFINSERV.NS", name: "Nifty Financial Services", category: "Index" },
  { symbol: "NIFTYFMCG.NS", name: "Nifty FMCG", category: "Index" },
  { symbol: "NIFTYENERGY.NS", name: "Nifty Energy", category: "Index" },
  { symbol: "NIFTYREALTY.NS", name: "Nifty Realty", category: "Index" },
  { symbol: "NIFTYMEDIA.NS", name: "Nifty Media", category: "Index" },
  { symbol: "NIFTYCONSUMPTION.NS", name: "Nifty Consumption", category: "Index" },
  { symbol: "NIFTYCOMMODITIES.NS", name: "Nifty Commodities", category: "Index" },
  { symbol: "NIFTYINFRA.NS", name: "Nifty Infrastructure", category: "Index" },
  { symbol: "NIFTYPSUBNK.NS", name: "Nifty PSU Bank", category: "Index" },
  { symbol: "NIFTYGROWERS15.NS", name: "Nifty Growers", category: "Index" },
  { symbol: "NIFTY100.NS", name: "Nifty 100", category: "Index" },
];

export const CRYPTO = [
  { symbol: "BTC-USD", name: "Bitcoin", category: "Cryptocurrency" },
  { symbol: "ETH-USD", name: "Ethereum", category: "Cryptocurrency" },
  { symbol: "BNB-USD", name: "Binance Coin", category: "Cryptocurrency" },
  { symbol: "XRP-USD", name: "XRP", category: "Cryptocurrency" },
  { symbol: "SOL-USD", name: "Solana", category: "Cryptocurrency" },
  { symbol: "ADA-USD", name: "Cardano", category: "Cryptocurrency" },
  { symbol: "DOGE-USD", name: "Dogecoin", category: "Cryptocurrency" },
  { symbol: "DOT-USD", name: "Polkadot", category: "Cryptocurrency" },
  { symbol: "MATIC-USD", name: "Polygon", category: "Cryptocurrency" },
  { symbol: "LTC-USD", name: "Litecoin", category: "Cryptocurrency" },
  { symbol: "AVAX-USD", name: "Avalanche", category: "Cryptocurrency" },
  { symbol: "LINK-USD", name: "Chainlink", category: "Cryptocurrency" },
  { symbol: "ATOM-USD", name: "Cosmos", category: "Cryptocurrency" },
  { symbol: "UNI-USD", name: "Uniswap", category: "Cryptocurrency" },
  { symbol: "XLM-USD", name: "Stellar", category: "Cryptocurrency" },
  { symbol: "NEAR-USD", name: "NEAR Protocol", category: "Cryptocurrency" },
  { symbol: "APT-USD", name: "Aptos", category: "Cryptocurrency" },
  { symbol: "ARB-USD", name: "Arbitrum", category: "Cryptocurrency" },
  { symbol: "OP-USD", name: "Optimism", category: "Cryptocurrency" },
  { symbol: "INJ-USD", name: "Injective", category: "Cryptocurrency" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";

  let results = [];
  
  if (type === "all" || type === "stocks") results.push(...NIFTY_50_STOCKS.map(s => ({ ...s, assetType: "stock" })));
  if (type === "all" || type === "etfs") results.push(...ETFS.map(s => ({ ...s, assetType: "etf" })));
  if (type === "all" || type === "mfs") results.push(...MUTUAL_FUNDS.map(s => ({ ...s, assetType: "mutual_fund" })));
  if (type === "all" || type === "commodities") results.push(...COMMODITIES.map(s => ({ ...s, assetType: "commodity" })));
  if (type === "all" || type === "indexes") results.push(...INDEXES.map(s => ({ ...s, assetType: "index" })));
  if (type === "all" || type === "crypto") results.push(...CRYPTO.map(s => ({ ...s, assetType: "crypto" })));

  const query = searchParams.get("q")?.toLowerCase() || "";
  
  if (query) {
    results = results.filter(
      (r) =>
        r.symbol.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query)
    );
  }

  return NextResponse.json(results.slice(0, 50));
}
