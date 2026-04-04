import YahooFinance from "yahoo-finance2";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache";
import { isMutualFund, getSchemeCode } from "./mf-scheme-codes";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CurrentQuote {
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
}

/**
 * Get historical daily prices for a symbol.
 * Supports NSE stocks (.NS suffix), crypto (-USD), commodities (=F), and mutual funds (MF###).
 */
export async function getHistoricalPrices(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const cacheKey = `hist:${symbol}:${startDate}:${endDate ?? "now"}`;
  const cached = cacheGet<HistoricalPrice[]>(cacheKey);
  if (cached) return cached;

  try {
    // Mutual funds use AMFI API
    if (isMutualFund(symbol)) {
      const data = await getMFHistoricalNAV(symbol, startDate, endDate);
      if (data.length > 0) {
        cacheSet(cacheKey, data, CACHE_TTL.HISTORICAL_DATA);
      }
      return data;
    }

    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate ?? new Date().toISOString().split("T")[0],
      interval: "1d",
    });

    const prices: HistoricalPrice[] = (result.quotes ?? [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        open: q.open ?? q.close!,
        high: q.high ?? q.close!,
        low: q.low ?? q.close!,
        close: q.close!,
        volume: q.volume ?? 0,
      }));

    if (prices.length > 0) {
      cacheSet(cacheKey, prices, CACHE_TTL.HISTORICAL_DATA);
    }
    return prices;
  } catch (error) {
    console.error(`Failed to fetch historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Get the current quote for a symbol.
 */
export async function getCurrentPrice(symbol: string): Promise<CurrentQuote | null> {
  const cacheKey = `quote:${symbol}`;
  const cached = cacheGet<CurrentQuote>(cacheKey);
  if (cached) return cached;

  try {
    if (isMutualFund(symbol)) {
      const nav = await getMFCurrentNAV(symbol);
      if (nav) {
        cacheSet(cacheKey, nav, CACHE_TTL.MF_NAV);
        return nav;
      }
      return null;
    }

    const result = await yahooFinance.quote(symbol);
    if (!result || !result.regularMarketPrice) return null;

    const quote: CurrentQuote = {
      price: result.regularMarketPrice,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      high52w: result.fiftyTwoWeekHigh ?? result.regularMarketPrice,
      low52w: result.fiftyTwoWeekLow ?? result.regularMarketPrice,
    };

    cacheSet(cacheKey, quote, CACHE_TTL.CURRENT_PRICE);
    return quote;
  } catch (error) {
    console.error(`Failed to fetch quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Batch fetch current prices for multiple symbols.
 */
export async function getBatchPrices(
  symbols: string[]
): Promise<Map<string, CurrentQuote>> {
  const results = new Map<string, CurrentQuote>();
  const promises = symbols.map(async (symbol) => {
    const quote = await getCurrentPrice(symbol);
    if (quote) results.set(symbol, quote);
  });
  await Promise.allSettled(promises);
  return results;
}

// ---- Mutual Fund helpers using AMFI API ----

async function getMFHistoricalNAV(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<HistoricalPrice[]> {
  const schemeCode = getSchemeCode(symbol);
  if (!schemeCode) return [];

  const cacheKey = `mf-nav:${schemeCode}:${startDate}`;
  const cached = cacheGet<HistoricalPrice[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data as Array<{ date: string; nav: string }>;
    if (!data) return [];

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const prices: HistoricalPrice[] = data
      .map((d) => {
        // AMFI dates are dd-MM-yyyy
        const [day, month, year] = d.date.split("-");
        const isoDate = `${year}-${month}-${day}`;
        const nav = parseFloat(d.nav);
        return {
          date: isoDate,
          open: nav,
          high: nav,
          low: nav,
          close: nav,
          volume: 0,
        };
      })
      .filter((p) => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (prices.length > 0) {
      cacheSet(cacheKey, prices, CACHE_TTL.MF_NAV);
    }
    return prices;
  } catch (error) {
    console.error(`Failed to fetch MF NAV for ${symbol}:`, error);
    return [];
  }
}

async function getMFCurrentNAV(symbol: string): Promise<CurrentQuote | null> {
  const schemeCode = getSchemeCode(symbol);
  if (!schemeCode) return null;

  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`);
    if (!res.ok) return null;
    const json = await res.json();
    const nav = parseFloat(json.data?.[0]?.nav);
    if (isNaN(nav)) return null;

    return {
      price: nav,
      change: 0,
      changePercent: 0,
      high52w: nav,
      low52w: nav,
    };
  } catch {
    return null;
  }
}
