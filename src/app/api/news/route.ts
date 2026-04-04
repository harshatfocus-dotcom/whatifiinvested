import { NextResponse } from "next/server";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/cache";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  description: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

// Map NSE symbols to company search terms for news
const SYMBOL_TO_SEARCH: Record<string, string> = {
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "TCS Tata Consultancy",
  "HDFCBANK.NS": "HDFC Bank",
  "INFY.NS": "Infosys",
  "ICICIBANK.NS": "ICICI Bank",
  "SBIN.NS": "SBI State Bank India",
  "HINDUNILVR.NS": "Hindustan Unilever HUL",
  "ITC.NS": "ITC Limited",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "BHARTIARTL.NS": "Bharti Airtel",
  "NIFTYBEES.NS": "Nifty 50 index",
  "GOLDBEES.NS": "Gold ETF India",
  "TATAMOTORS.NS": "Tata Motors",
  "MARUTI.NS": "Maruti Suzuki",
  "BAJFINANCE.NS": "Bajaj Finance",
  "WIPRO.NS": "Wipro",
  "TECHM.NS": "Tech Mahindra",
  "HCLTECH.NS": "HCL Technologies",
  "ZOMATO.NS": "Zomato",
  "ADANIPORTS.NS": "Adani Ports",
  "BTC-USD": "Bitcoin crypto",
  "ETH-USD": "Ethereum crypto",
  "GC=F": "Gold commodity",
  "CL=F": "Crude oil",
};

function inferSentiment(title: string, description: string): "positive" | "negative" | "neutral" {
  const text = (title + " " + description).toLowerCase();
  const positiveWords = ["rise", "surges", "gains", "profit", "growth", "beats", "jumps", "record", "outperform", "upgrade", "buy", "strong"];
  const negativeWords = ["fall", "drops", "loss", "decline", "miss", "cut", "downgrade", "sell", "weak", "concern", "risk", "slump"];
  const posScore = positiveWords.filter((w) => text.includes(w)).length;
  const negScore = negativeWords.filter((w) => text.includes(w)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

async function fetchFromNewsDataIO(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `news:newsdata:${query}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q: query,
      country: "in",
      category: "business",
      language: "en",
    });
    const res = await fetch(`https://newsdata.io/api/1/news?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    const items: NewsItem[] = (json.results || []).slice(0, 5).map((item: {
      title?: string;
      source_id?: string;
      pubDate?: string;
      description?: string;
      link?: string;
      sentiment?: string;
    }) => ({
      title: item.title || "Market Update",
      source: item.source_id || "NewsData",
      date: item.pubDate ? item.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
      description: item.description || "",
      url: item.link || "#",
      sentiment: (item.sentiment as "positive" | "negative" | "neutral") || inferSentiment(item.title || "", item.description || ""),
    }));
    if (items.length > 0) cacheSet(cacheKey, items, CACHE_TTL.NEWS);
    return items;
  } catch {
    return [];
  }
}

async function fetchFromGnews(query: string): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `news:gnews:${query}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      token: apiKey,
      q: `${query} India stock`,
      lang: "en",
      country: "in",
      max: "5",
    });
    const res = await fetch(`https://gnews.io/api/v4/search?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    const items: NewsItem[] = (json.articles || []).slice(0, 5).map((a: {
      title?: string;
      source?: { name?: string };
      publishedAt?: string;
      description?: string;
      url?: string;
    }) => ({
      title: a.title || "Market Update",
      source: a.source?.name || "GNews",
      date: a.publishedAt ? a.publishedAt.split("T")[0] : new Date().toISOString().split("T")[0],
      description: a.description || "",
      url: a.url || "#",
      sentiment: inferSentiment(a.title || "", a.description || ""),
    }));
    if (items.length > 0) cacheSet(cacheKey, items, CACHE_TTL.NEWS);
    return items;
  } catch {
    return [];
  }
}

async function fetchMarketGeneralNews(): Promise<NewsItem[]> {
  const cacheKey = "news:market:general";
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  // Try newsdata.io for general Indian market news
  const general = await fetchFromNewsDataIO("Indian stock market NSE BSE");
  if (general.length > 0) {
    cacheSet(cacheKey, general, CACHE_TTL.NEWS);
    return general;
  }

  // Fallback: static general market news
  const today = new Date().toISOString().split("T")[0];
  const items: NewsItem[] = [
    {
      title: "Indian markets update — check live prices for latest news",
      source: "WhatIfIInvested",
      date: today,
      description: "Configure NEWSDATA_API_KEY in .env to get live news. Free tier: 200 req/day at newsdata.io",
      url: "https://newsdata.io",
      sentiment: "neutral",
    },
  ];
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) || [];

  const allNews: NewsItem[] = [];
  const seenTitles = new Set<string>();

  const addNews = (items: NewsItem[]) => {
    for (const item of items) {
      if (!seenTitles.has(item.title)) {
        seenTitles.add(item.title);
        allNews.push(item);
      }
    }
  };

  // Fetch news for each symbol in parallel
  const symbolFetches = symbols.slice(0, 5).map(async (symbol) => {
    const query = SYMBOL_TO_SEARCH[symbol] || symbol.replace(".NS", "").replace("-USD", "");
    // Try newsdata.io first, then gnews
    const news = await fetchFromNewsDataIO(query);
    if (news.length > 0) return news;
    return fetchFromGnews(query);
  });

  const symbolResults = await Promise.allSettled(symbolFetches);
  for (const result of symbolResults) {
    if (result.status === "fulfilled") addNews(result.value);
  }

  // Add general market news
  const marketNews = await fetchMarketGeneralNews();
  addNews(marketNews);

  // Sort by date, newest first
  allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(allNews.slice(0, 20));
}
