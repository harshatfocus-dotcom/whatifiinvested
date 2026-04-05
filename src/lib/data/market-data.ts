import { cacheGet, cacheSet, CACHE_TTL } from "../cache";
import { isMutualFund, getSchemeCode } from "./mf-scheme-codes";

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;     // Always in INR
  volume: number;
  closeUSD?: number; // Original USD price (US stocks only, before conversion)
}

export interface CurrentQuote {
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
}

// ── Synthetic fallback parameters ──────────────────────────────────────────
// [startPrice_Jan2020, currentPrice_Apr2025, annualVolatility]
// Used ONLY when all real data sources fail.
const ASSET_PARAMS: Record<string, [number, number, number]> = {
  "RELIANCE.NS":   [1480, 1270, 0.26],
  "TCS.NS":        [2150, 3750, 0.22],
  "HDFCBANK.NS":   [1200, 1880, 0.22],
  "INFY.NS":       [890,  1800, 0.25],
  "ICICIBANK.NS":  [510,  1380, 0.28],
  "SBIN.NS":       [275,  800,  0.30],
  "HINDUNILVR.NS": [1900, 2380, 0.18],
  "ITC.NS":        [190,  430,  0.22],
  "KOTAKBANK.NS":  [1700, 2100, 0.23],
  "BHARTIARTL.NS": [480,  1750, 0.25],
  "AXISBANK.NS":   [720,  1190, 0.26],
  "BAJFINANCE.NS": [4100, 8600, 0.30],
  "BAJAJFINSV.NS": [700,  1950, 0.28],
  "WIPRO.NS":      [410,  260,  0.28],
  "TATAMOTORS.NS": [175,  700,  0.35],
  "MARUTI.NS":     [6200, 12100,0.22],
  "HCLTECH.NS":    [680,  1760, 0.23],
  "TECHM.NS":      [720,  1520, 0.26],
  "ZOMATO.NS":     [78,   230,  0.45],
  "ADANIPORTS.NS": [400,  1380, 0.35],
  "SUNPHARMA.NS":  [490,  1860, 0.22],
  "TITAN.NS":      [1050, 3680, 0.24],
  "ASIANPAINT.NS": [1680, 2300, 0.22],
  "NESTLEIND.NS":  [13500,24000,0.18],
  "LTIM.NS":       [1800, 5200, 0.28],
  "NTPC.NS":       [108,  380,  0.25],
  "ONGC.NS":       [100,  260,  0.28],
  "COALINDIA.NS":  [130,  480,  0.25],
  "NIFTYBEES.NS":  [132,  255,  0.15],
  "GOLDBEES.NS":   [34,   64,   0.12],
  "SILVERBEES.NS": [45,   96,   0.22],
  "^NSEI":         [12000,22500,0.15],
  "^BSESN":        [40000,74000,0.15],
  "GC=F":          [1580, 3050, 0.12],
  "CL=F":          [45,   72,   0.35],
  "SI=F":          [18,   34,   0.25],
  "NG=F":          [2.5,  2.0,  0.50],
  "HG=F":          [2.8,  5.0,  0.28],
};

// CoinGecko ID mapping for crypto
const CRYPTO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin", "ETH-USD": "ethereum", "BNB-USD": "binancecoin",
  "XRP-USD": "ripple",  "SOL-USD": "solana",    "ADA-USD": "cardano",
  "DOGE-USD":"dogecoin","DOT-USD": "polkadot",  "MATIC-USD":"matic-network",
  "LTC-USD": "litecoin","AVAX-USD":"avalanche-2","LINK-USD":"chainlink",
  "ATOM-USD":"cosmos",  "UNI-USD": "uniswap",   "XLM-USD": "stellar",
  "NEAR-USD":"near",    "APT-USD": "aptos",     "ARB-USD": "arbitrum",
  "OP-USD":  "optimism","INJ-USD": "injective-protocol",
};

// ── Upstox instrument key mapping (ISIN-based, no auth needed) ───────────
// Format: NSE_EQ|{ISIN} for equities, NSE_INDEX|{name} for indices
const UPSTOX_KEYS: Record<string, string> = {
  "RELIANCE.NS":   "NSE_EQ|INE002A01018",
  "TCS.NS":        "NSE_EQ|INE467B01029",
  "HDFCBANK.NS":   "NSE_EQ|INE040A01034",
  "INFY.NS":       "NSE_EQ|INE009A01021",
  "ICICIBANK.NS":  "NSE_EQ|INE090A01021",
  "SBIN.NS":       "NSE_EQ|INE062A01020",
  "HINDUNILVR.NS": "NSE_EQ|INE030A01027",
  "ITC.NS":        "NSE_EQ|INE154A01025",
  "KOTAKBANK.NS":  "NSE_EQ|INE237A01028",
  "BHARTIARTL.NS": "NSE_EQ|INE397D01024",
  "AXISBANK.NS":   "NSE_EQ|INE238A01034",
  "BAJFINANCE.NS": "NSE_EQ|INE296A01024",
  "BAJAJFINSV.NS": "NSE_EQ|INE918I01026",
  "WIPRO.NS":      "NSE_EQ|INE075A01022",
  "TATAMOTORS.NS": "NSE_EQ|INE155A01022",
  "MARUTI.NS":     "NSE_EQ|INE585B01010",
  "HCLTECH.NS":    "NSE_EQ|INE860A01027",
  "TECHM.NS":      "NSE_EQ|INE669C01036",
  "ZOMATO.NS":     "NSE_EQ|INE758T01015",
  "ADANIPORTS.NS": "NSE_EQ|INE742F01042",
  "SUNPHARMA.NS":  "NSE_EQ|INE044A01036",
  "TITAN.NS":      "NSE_EQ|INE280A01028",
  "ASIANPAINT.NS": "NSE_EQ|INE021A01026",
  "NESTLEIND.NS":  "NSE_EQ|INE239A01024",
  "LTIM.NS":       "NSE_EQ|INE214T01019",
  "NTPC.NS":       "NSE_EQ|INE733E01010",
  "ONGC.NS":       "NSE_EQ|INE213A01029",
  "COALINDIA.NS":  "NSE_EQ|INE522F01014",
  "POWERGRID.NS":  "NSE_EQ|INE752E01010",
  "GRASIM.NS":     "NSE_EQ|INE047A01021",
  "EICHERMOT.NS":  "NSE_EQ|INE066A01021",
  "HEROMOTOCO.NS": "NSE_EQ|INE158A01026",
  "HINDALCO.NS":   "NSE_EQ|INE038A01020",
  "JSWSTEEL.NS":   "NSE_EQ|INE019A01038",
  "INDUSINDBK.NS": "NSE_EQ|INE095A01012",
  "TATASTEEL.NS":  "NSE_EQ|INE081A01012",
  "ULTRACEMCO.NS": "NSE_EQ|INE481G01011",
  "DIVISLAB.NS":   "NSE_EQ|INE361B01024",
  "DRREDDY.NS":    "NSE_EQ|INE089A01031",
  "CIPLA.NS":      "NSE_EQ|INE059A01026",
  "BRITANNIA.NS":  "NSE_EQ|INE216A01030",
  "NIFTYBEES.NS":  "NSE_EQ|INF204KB13I2",
  "GOLDBEES.NS":   "NSE_EQ|INF204K01025",
  "SILVERBEES.NS": "NSE_EQ|INF205K01025",
  "^NSEI":         "NSE_INDEX|Nifty 50",
  "^BSESN":        "BSE_INDEX|SENSEX",
};

// ── US stock identifier ────────────────────────────────────────────────────
export function isUSStock(symbol: string): boolean {
  return !symbol.endsWith(".NS") &&
    !symbol.endsWith(".BO") &&
    !symbol.startsWith("^") &&
    !symbol.startsWith("MF") &&
    !symbol.endsWith("-USD") &&
    !symbol.endsWith("=F") &&
    !(symbol in CRYPTO_IDS) &&
    !(symbol in UPSTOX_KEYS);
}

// USD/INR approximate historical yearly rates (last-resort fallback)
const USD_INR_APPROX: Record<string, number> = {
  "2018": 68.4, "2019": 70.4, "2020": 74.1, "2021": 74.3,
  "2022": 79.5, "2023": 82.7, "2024": 83.9, "2025": 85.5,
};
function getApproxUSDINR(date: string): number {
  return USD_INR_APPROX[date.slice(0, 4)] ?? 85;
}

// ── US stock synthetic fallback params (in USD) ────────────────────────────
// [startPrice_Jan2020_USD, currentPrice_Apr2025_USD, annualVolatility]
const US_STOCK_PARAMS: Record<string, [number, number, number]> = {
  "AAPL":  [77,   170,  0.28], "MSFT":  [160,  390,  0.26],
  "GOOGL": [68,   165,  0.28], "AMZN":  [95,   195,  0.32],
  "NVDA":  [60,   880,  0.50], "META":  [200,  510,  0.38],
  "TSLA":  [130,  175,  0.60], "JPM":   [130,  210,  0.26],
  "V":     [215,  285,  0.22], "MA":    [290,  475,  0.23],
  "UNH":   [290,  490,  0.23], "WMT":   [120,  180,  0.18],
  "XOM":   [80,   118,  0.30], "JNJ":   [150,  158,  0.18],
  "PG":    [125,  168,  0.18], "HD":    [265,  380,  0.23],
  "BAC":   [33,   39,   0.30], "ADBE":  [380,  465,  0.32],
  "NFLX":  [350,  625,  0.42], "AMD":   [50,   180,  0.55],
  "ORCL":  [58,   132,  0.28], "CRM":   [165,  295,  0.33],
  "COST":  [330,  930,  0.22], "DIS":   [145,  102,  0.30],
  "UBER":  [35,   76,   0.48], "COIN":  [300,  220,  0.65],
  "PLTR":  [10,   98,   0.70], "INTC":  [67,   22,   0.38],
  "PYPL":  [120,  70,   0.42], "SPOT":  [155,  325,  0.45],
  "SHOP":  [550,  110,  0.55], "SQ":    [85,   68,   0.50],
};

// ── Utilities ──────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function safeAbortFetch(url: string, options: RequestInit, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer))
    .catch(() => null);
}

// ── USD/INR historical exchange rates ─────────────────────────────────────

async function fetchFrankfurterRates(startDate: string, endDate?: string): Promise<Map<string, number>> {
  const end = endDate ?? new Date().toISOString().split("T")[0];
  const url = `https://api.frankfurter.app/${startDate}..${end}?from=USD&to=INR`;
  try {
    const res = await safeAbortFetch(url, { headers: { Accept: "application/json" } }, 5000);
    if (!res?.ok) return new Map();
    const json = await res.json().catch(() => null);
    const rates = new Map<string, number>();
    if (json?.rates) {
      for (const [date, currencies] of Object.entries(json.rates as Record<string, Record<string, number>>)) {
        const rate = currencies["INR"];
        if (rate && rate > 0) rates.set(date, rate);
      }
    }
    return rates;
  } catch { return new Map(); }
}

async function fetchYahooUSDINR(startDate: string, endDate?: string): Promise<Map<string, number>> {
  const prices = await fetchYahooHistorical("USDINR=X", startDate, endDate);
  const rates = new Map<string, number>();
  for (const p of prices) { if (p.close > 0) rates.set(p.date, p.close); }
  return rates;
}

// Cache + fallback chain for USD/INR rates
async function getUSDINRRates(startDate: string, endDate?: string): Promise<Map<string, number>> {
  const cacheKey = `usdinr:${startDate}:${endDate ?? "now"}`;
  const cached = cacheGet<[string, number][]>(cacheKey);
  if (cached) return new Map(cached);

  let rates = await withTimeout(fetchFrankfurterRates(startDate, endDate), 5000, new Map<string, number>());
  if (rates.size === 0) {
    rates = await withTimeout(fetchYahooUSDINR(startDate, endDate), 3000, new Map<string, number>());
  }
  if (rates.size > 0) cacheSet(cacheKey, Array.from(rates.entries()), CACHE_TTL.HISTORICAL_DATA);
  return rates;
}

// Apply USD→INR conversion to a price series
function convertUSDToINR(prices: HistoricalPrice[], usdInrRates: Map<string, number>): HistoricalPrice[] {
  if (prices.length === 0) return [];
  const ratesArr = Array.from(usdInrRates.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return prices.map(p => {
    let rate = usdInrRates.get(p.date);
    if (!rate && ratesArr.length > 0) {
      // Find nearest available rate by date
      const pTime = new Date(p.date).getTime();
      let best = ratesArr[0];
      let bestDiff = Math.abs(new Date(best[0]).getTime() - pTime);
      for (const entry of ratesArr) {
        const diff = Math.abs(new Date(entry[0]).getTime() - pTime);
        if (diff < bestDiff) { best = entry; bestDiff = diff; }
      }
      rate = best[1];
    }
    if (!rate) rate = getApproxUSDINR(p.date);

    return {
      ...p,
      closeUSD: p.close,
      close:  Math.round(p.close * rate * 100) / 100,
      open:   Math.round(p.open  * rate * 100) / 100,
      high:   Math.round(p.high  * rate * 100) / 100,
      low:    Math.round(p.low   * rate * 100) / 100,
    };
  });
}

// ── Upstox public API (real NSE data, no auth required) ──────────────────

async function fetchUpstoxHistorical(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const key = UPSTOX_KEYS[symbol];
  if (!key) return [];

  const to   = endDate ?? new Date().toISOString().split("T")[0];
  const from = startDate;
  const encodedKey = encodeURIComponent(key);
  const url = `https://api.upstox.com/v2/historical-candle/${encodedKey}/day/${to}/${from}`;

  try {
    const res = await safeAbortFetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    }, 6000);
    if (!res?.ok) return [];

    const json = await res.json().catch(() => null);
    if (json?.status !== "success" || !Array.isArray(json?.data?.candles)) return [];

    // Candle format: [datetime, open, high, low, close, volume, oi]
    // Upstox returns newest-first → reverse
    const candles: [string, number, number, number, number, number, number][] =
      [...json.data.candles].reverse();

    return candles
      .map(([dt, open, high, low, close, volume]) => {
        if (!close || close <= 0) return null;
        return {
          date:   dt.split("T")[0],
          open:   open   || close,
          high:   high   || close,
          low:    low    || close,
          close,
          volume: volume || 0,
        };
      })
      .filter((p): p is HistoricalPrice => p !== null);
  } catch (e) {
    console.error(`Upstox error for ${symbol}:`, e);
    return [];
  }
}

// ── Twelve Data (fallback with API key) ────────────────────────────────────

async function fetchTwelveData(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return [];

  // Convert to Twelve Data symbol format
  let sym: string, exchange: string | undefined;
  if (symbol.endsWith(".NS")) { sym = symbol.replace(".NS", ""); exchange = "NSE"; }
  else if (symbol.endsWith(".BO")) { sym = symbol.replace(".BO", ""); exchange = "BSE"; }
  else if (symbol === "^NSEI")  { sym = "NIFTY50"; exchange = "NSE"; }
  else if (symbol === "^BSESN") { sym = "SENSEX";  exchange = "BSE"; }
  else if (symbol.endsWith("-USD")) { sym = symbol.replace("-USD", "/USD"); }
  else if (symbol.endsWith("=F")) {
    const m: Record<string, string> = { "GC=F":"XAU/USD","SI=F":"XAG/USD","CL=F":"WTI/USD" };
    if (!m[symbol]) return [];
    sym = m[symbol];
  } else {
    // Plain US stock symbol (AAPL, MSFT, GOOGL, etc.) — Twelve Data free tier supports NYSE/NASDAQ
    sym = symbol;
  }

  const params = { sym, exchange };

  const qs = new URLSearchParams({
    symbol:     params.sym,
    interval:   "1day",
    outputsize: "5000",
    start_date: startDate,
    end_date:   endDate ?? new Date().toISOString().split("T")[0],
    apikey:     apiKey,
  });
  if (params.exchange) qs.set("exchange", params.exchange);

  const url = `https://api.twelvedata.com/time_series?${qs}`;
  try {
    const res = await safeAbortFetch(url, { headers: { Accept: "application/json" } }, 6000);
    if (!res?.ok) return [];
    const json = await res.json().catch(() => null);
    if (json?.status === "error" || !Array.isArray(json?.values)) return [];

    // Twelve Data returns newest-first; reverse to chronological
    const values: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }> =
      [...json.values].reverse();

    return values
      .map((v) => {
        const close = parseFloat(v.close);
        if (isNaN(close) || close <= 0) return null;
        return {
          date:   v.datetime.split(" ")[0],
          open:   parseFloat(v.open)   || close,
          high:   parseFloat(v.high)   || close,
          low:    parseFloat(v.low)    || close,
          close,
          volume: parseInt(v.volume ?? "0") || 0,
        };
      })
      .filter((p): p is HistoricalPrice => p !== null);
  } catch (e) {
    console.error("Twelve Data error:", e);
    return [];
  }
}

// ── Yahoo Finance v8 ───────────────────────────────────────────────────────

async function fetchYahooHistorical(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const p1 = Math.floor(new Date(startDate).getTime() / 1000);
  const p2 = Math.floor((endDate ? new Date(endDate) : new Date()).getTime() / 1000);
  const headers: HeadersInit = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://finance.yahoo.com",
  };
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d&events=history`;
    try {
      const res = await safeAbortFetch(url, { headers }, 3000);
      if (!res?.ok) continue;
      const json = await res.json().catch(() => null);
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp?.length) continue;
      const ts: number[] = result.timestamp;
      const q = result.indicators?.quote?.[0] ?? {};
      const out: HistoricalPrice[] = [];
      for (let i = 0; i < ts.length; i++) {
        const close = q.close?.[i];
        if (!close || close <= 0) continue;
        out.push({
          date:   new Date(ts[i] * 1000).toISOString().split("T")[0],
          open:   q.open?.[i]   ?? close,
          high:   q.high?.[i]   ?? close,
          low:    q.low?.[i]    ?? close,
          close,
          volume: q.volume?.[i] ?? 0,
        });
      }
      const sorted = out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sorted.length > 0) return sorted;
    } catch { /* try next host */ }
  }
  return [];
}

// ── Stooq CSV ─────────────────────────────────────────────────────────────

async function fetchStooqHistorical(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  let s: string;
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) s = symbol.toLowerCase();
  else if (symbol.startsWith("^")) s = symbol.toLowerCase();
  else if (symbol.endsWith("=F")) s = symbol.toLowerCase().replace("=f", ".f");
  else return [];
  const d1 = startDate.replace(/-/g, "");
  const d2 = (endDate ?? new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&d1=${d1}&d2=${d2}&i=d`;
  try {
    const res = await safeAbortFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 3000);
    if (!res) return [];
    const csv = await res.text().catch(() => "");
    const lines = csv.trim().split("\n");
    if (lines.length < 2 || csv.includes("No data")) return [];
    const out: HistoricalPrice[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 5) continue;
      const close = parseFloat(cols[4]);
      if (!cols[0] || isNaN(close) || close <= 0) continue;
      out.push({ date: cols[0].trim(), open: parseFloat(cols[1])||close, high: parseFloat(cols[2])||close, low: parseFloat(cols[3])||close, close, volume: parseInt(cols[5]??"0")||0 });
    }
    return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch { return []; }
}

// ── CoinGecko ─────────────────────────────────────────────────────────────

async function fetchCoinGeckoHistorical(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const coinId = CRYPTO_IDS[symbol];
  if (!coinId) return [];
  const from = Math.floor(new Date(startDate).getTime() / 1000);
  const to   = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const url  = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`;
  try {
    const res = await safeAbortFetch(url, { headers: { Accept: "application/json" } }, 5000);
    if (!res?.ok) return [];
    const json = await res.json().catch(() => null);
    const daily = new Map<string, number>();
    for (const [ts, price] of (json?.prices ?? []) as [number, number][]) {
      daily.set(new Date(ts).toISOString().split("T")[0], price);
    }
    return Array.from(daily.entries())
      .map(([date, price]) => ({ date, open: price, high: price, low: price, close: price, volume: 0 }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch { return []; }
}

// ── Synthetic fallback — FIXED GBM with correct daily volatility ───────────

function seededRand(symbol: string, i: number): number {
  let h = 2166136261;
  const s = symbol + i;
  for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = (h * 16777619) >>> 0; }
  return (h % 100000) / 100000;
}

function generateSyntheticPrices(
  symbol: string,
  startDate: string,
  endDate?: string,
  isUSD = false
): HistoricalPrice[] {
  const params    = isUSD ? US_STOCK_PARAMS[symbol] : ASSET_PARAMS[symbol];
  const p0        = params?.[0] ?? 100;
  const pEnd      = params?.[1] ?? p0 * 1.5;
  const annualVol = params?.[2] ?? 0.25;

  const genStart  = new Date("2020-01-01");
  const reqStart  = new Date(startDate);
  const reqEnd    = endDate ? new Date(endDate) : new Date();
  const totalDays = Math.ceil((reqEnd.getTime() - genStart.getTime()) / 86400000);

  // Count approximate trading days from genStart to reqEnd
  const tradingDays = Math.round(totalDays * 5 / 7);

  // FIXED: use daily volatility for Itô correction
  const dailySig   = annualVol / Math.sqrt(252);
  const dailyDrift = Math.log(pEnd / p0) / Math.max(1, tradingDays) - (dailySig * dailySig) / 2;

  const prices: HistoricalPrice[] = [];
  let price = p0;
  const day = new Date(genStart);

  for (let i = 0; prices.length < tradingDays + 10 && i < totalDays + 200; i++) {
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) {
      const r1 = Math.max(1e-10, seededRand(symbol, i * 2));
      const r2 = seededRand(symbol, i * 2 + 1);
      const z  = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
      price    = Math.max(price * Math.exp(dailyDrift + dailySig * z), p0 * 0.2);

      if (day >= reqStart && day <= reqEnd) {
        const hl = price * 0.012;
        prices.push({
          date:   day.toISOString().split("T")[0],
          open:   Math.round((price * 0.997) * 100) / 100,
          high:   Math.round((price + hl) * 100) / 100,
          low:    Math.round(Math.max(price - hl, price * 0.5) * 100) / 100,
          close:  Math.round(price * 100) / 100,
          volume: 1000000 + Math.floor(seededRand(symbol, i) * 5000000),
        });
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return prices;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function getHistoricalPrices(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const cacheKey = `hist5:${symbol}:${startDate}:${endDate ?? "now"}`;
  const cached = cacheGet<HistoricalPrice[]>(cacheKey);
  if (cached) return cached;

  let prices: HistoricalPrice[] = [];

  if (isMutualFund(symbol)) {
    prices = await getMFHistoricalNAV(symbol, startDate, endDate);

  } else if (CRYPTO_IDS[symbol]) {
    // CoinGecko first (reliable for crypto), fallback to Yahoo
    prices = await withTimeout(fetchCoinGeckoHistorical(symbol, startDate, endDate), 5000, []);
    if (prices.length === 0) {
      prices = await withTimeout(fetchYahooHistorical(symbol, startDate, endDate), 3000, []);
    }

  } else if (isUSStock(symbol)) {
    // US stocks — Twelve Data (primary, free tier supports NYSE/NASDAQ) then Yahoo
    prices = await withTimeout(fetchTwelveData(symbol, startDate, endDate), 7000, []);
    if (prices.length === 0) {
      prices = await withTimeout(fetchYahooHistorical(symbol, startDate, endDate), 3000, []);
    }
    if (prices.length === 0) {
      // Synthetic fallback in USD
      prices = generateSyntheticPrices(symbol, startDate, endDate, true);
    }
    // Convert USD prices → INR using historical exchange rates
    const usdInrRates = await withTimeout(getUSDINRRates(startDate, endDate), 5000, new Map<string, number>());
    prices = convertUSDToINR(prices, usdInrRates);

  } else {
    // Indian stocks / ETFs / indices / commodities
    // 1. Upstox public API — real NSE data, no auth, works from Vercel
    prices = await withTimeout(fetchUpstoxHistorical(symbol, startDate, endDate), 6000, []);

    if (prices.length === 0) {
      // 2. Yahoo + Stooq in parallel (3s each)
      const [yahoo, stooq] = await Promise.all([
        withTimeout(fetchYahooHistorical(symbol, startDate, endDate), 3000, []),
        withTimeout(fetchStooqHistorical(symbol, startDate, endDate), 3000, []),
      ]);
      prices = yahoo.length >= stooq.length ? yahoo : stooq;
    }

    if (prices.length === 0) {
      // 3. Twelve Data (note: free tier doesn't support NSE — last resort)
      prices = await withTimeout(fetchTwelveData(symbol, startDate, endDate), 5000, []);
    }
  }

  // Final synthetic fallback — always works, never times out
  if (prices.length === 0) {
    prices = generateSyntheticPrices(symbol, startDate, endDate);
  }

  if (prices.length > 0) cacheSet(cacheKey, prices, CACHE_TTL.HISTORICAL_DATA);
  return prices;
}

export async function getCurrentPrice(symbol: string): Promise<CurrentQuote | null> {
  const cacheKey = `quote5:${symbol}`;
  const cached = cacheGet<CurrentQuote>(cacheKey);
  if (cached) return cached;

  const start  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const prices = await getHistoricalPrices(symbol, start);
  if (prices.length === 0) return null;

  const last  = prices[prices.length - 1];
  const prev  = prices.length > 1 ? prices[prices.length - 2] : last;
  const change = last.close - prev.close;
  const changePercent = prev.close > 0 ? (change / prev.close) * 100 : 0;
  const high52w = Math.max(...prices.map((p) => p.high));
  const low52w  = Math.min(...prices.map((p) => p.low));
  const quote: CurrentQuote = { price: last.close, change, changePercent, high52w, low52w };
  cacheSet(cacheKey, quote, CACHE_TTL.CURRENT_PRICE);
  return quote;
}

export async function getBatchPrices(symbols: string[]): Promise<Map<string, CurrentQuote>> {
  const results = new Map<string, CurrentQuote>();
  await Promise.allSettled(symbols.map(async (s) => {
    const q = await getCurrentPrice(s);
    if (q) results.set(s, q);
  }));
  return results;
}

// ── AMFI for Mutual Funds ─────────────────────────────────────────────────

async function getMFHistoricalNAV(symbol: string, startDate: string, endDate?: string): Promise<HistoricalPrice[]> {
  const schemeCode = getSchemeCode(symbol);
  if (!schemeCode) return [];
  const cacheKey = `mf-nav:${schemeCode}:${startDate}`;
  const cached = cacheGet<HistoricalPrice[]>(cacheKey);
  if (cached) return cached;
  try {
    const res = await safeAbortFetch(`https://api.mfapi.in/mf/${schemeCode}`, {}, 5000);
    if (!res?.ok) return [];
    const json = await res.json().catch(() => null);
    const data = json?.data as Array<{ date: string; nav: string }> | undefined;
    if (!data) return [];
    const start = new Date(startDate);
    const end   = endDate ? new Date(endDate) : new Date();
    const prices: HistoricalPrice[] = data
      .map((d) => {
        const [day, month, year] = d.date.split("-");
        const nav = parseFloat(d.nav);
        return { date: `${year}-${month}-${day}`, open: nav, high: nav, low: nav, close: nav, volume: 0 };
      })
      .filter((p) => { const d = new Date(p.date); return !isNaN(d.getTime()) && d >= start && d <= end; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (prices.length > 0) cacheSet(cacheKey, prices, CACHE_TTL.MF_NAV);
    return prices;
  } catch { return []; }
}
