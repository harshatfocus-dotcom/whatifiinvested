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

const SYMBOL_TO_COMPANY: Record<string, string> = {
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "TCS Tata Consultancy Services",
  "HDFCBANK.NS": "HDFC Bank",
  "INFY.NS": "Infosys",
  "ICICIBANK.NS": "ICICI Bank",
  "SBIN.NS": "SBI State Bank India",
  "HINDUNILVR.NS": "Hindustan Unilever HUL",
  "ITC.NS": "ITC Limited",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "BHARTIARTL.NS": "Bharti Airtel",
  "NIFTYBEES.NS": "Nifty 50 Sensex",
  "GOLDBEES.NS": "Gold ETF India",
  "TATAMOTORS.NS": "Tata Motors",
  "MARUTI.NS": "Maruti Suzuki",
  "BAJFINANCE.NS": "Bajaj Finance",
  "WIPRO.NS": "Wipro",
  "TECHM.NS": "Tech Mahindra",
  "HCLTECH.NS": "HCL Technologies",
  "ZOMATO.NS": "Zomato",
  "ADANIPORTS.NS": "Adani Ports",
  "SUNPHARMA.NS": "Sun Pharma",
  "TITAN.NS": "Titan Company",
  "ASIANPAINT.NS": "Asian Paints",
  "BTC-USD": "Bitcoin cryptocurrency",
  "ETH-USD": "Ethereum cryptocurrency",
  "GC=F": "Gold commodity price",
  "CL=F": "Crude oil price",
};

function inferSentiment(text: string): "positive" | "negative" | "neutral" {
  const t = text.toLowerCase();
  const pos = ["rise", "surge", "gain", "profit", "growth", "beat", "jump", "record", "rally", "strong", "upgrade", "outperform"].filter(w => t.includes(w)).length;
  const neg = ["fall", "drop", "loss", "decline", "miss", "slump", "cut", "downgrade", "weak", "concern", "crash", "risk"].filter(w => t.includes(w)).length;
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}

async function fetchFromNewsDataIO(company: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `news:nd:${company}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL("https://newsdata.io/api/1/latest");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("q", company);
    url.searchParams.set("country", "in");
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "WhatIfIInvested/1.0 (investment backtesting app)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    const json = await res.json();

    // newsdata.io returns {status: "error", results: {message:...}} on failure
    if (json.status !== "success" || !Array.isArray(json.results)) return [];

    const items: NewsItem[] = json.results.slice(0, 5).map((item: {
      title?: string;
      source_name?: string;
      source_id?: string;
      pubDate?: string;
      description?: string;
      ai_summary?: string;
      link?: string;
      sentiment?: string;
    }) => {
      const title = item.title || "Market Update";
      const description = item.ai_summary || item.description || title;
      return {
        title,
        source: item.source_name || item.source_id || "NewsData",
        date: item.pubDate ? item.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
        description,
        url: item.link || "#",
        sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "")
          ? item.sentiment as "positive" | "negative" | "neutral"
          : inferSentiment(title + " " + description)),
      };
    });

    if (items.length > 0) cacheSet(cacheKey, items, CACHE_TTL.NEWS);
    return items;
  } catch {
    return [];
  }
}

async function generateAINews(companies: string[]): Promise<NewsItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const cacheKey = `news:ai:${companies.slice(0, 3).join(",")}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const today = new Date().toISOString().split("T")[0];
  const companiesList = companies.slice(0, 5).join(", ");

  const prompt = `Generate 6 realistic and educational market news headlines and summaries for these Indian stocks/assets: ${companiesList}.

Return ONLY a JSON array with this exact structure (no markdown, no extra text):
[
  {
    "title": "headline here",
    "source": "source name (e.g. Economic Times, Moneycontrol, Business Standard)",
    "description": "2-3 sentence description with specific details like percentages, numbers",
    "sentiment": "positive" or "negative" or "neutral"
  }
]

Make the news realistic, educational, and relevant to Indian markets. Include mix of company-specific and macro news (RBI, FII, GDP, sector trends). Vary sentiments.`;

  // Try Gemini
  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const items: NewsItem[] = parsed.map((item: {
              title?: string;
              source?: string;
              description?: string;
              sentiment?: string;
            }) => ({
              title: item.title || "Market Update",
              source: item.source || "AI Analysis",
              date: today,
              description: item.description || "",
              url: "#",
              sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "")
                ? item.sentiment as "positive" | "negative" | "neutral"
                : "neutral"),
            }));
            if (items.length > 0) {
              cacheSet(cacheKey, items, CACHE_TTL.NEWS);
              return items;
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  // Try OpenRouter as fallback
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const items: NewsItem[] = parsed.map((item: {
              title?: string;
              source?: string;
              description?: string;
              sentiment?: string;
            }) => ({
              title: item.title || "Market Update",
              source: item.source || "AI Analysis",
              date: today,
              description: item.description || "",
              url: "#",
              sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "")
                ? item.sentiment as "positive" | "negative" | "neutral"
                : "neutral"),
            }));
            if (items.length > 0) {
              cacheSet(cacheKey, items, CACHE_TTL.NEWS);
              return items;
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) || [];

  const companies = symbols
    .map(s => SYMBOL_TO_COMPANY[s] || s.replace(".NS", "").replace("-USD", ""))
    .filter(Boolean);

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

  // 1. Try newsdata.io for each symbol
  const ndFetches = companies.slice(0, 4).map(company => fetchFromNewsDataIO(company));
  const ndResults = await Promise.allSettled(ndFetches);
  for (const r of ndResults) {
    if (r.status === "fulfilled") addNews(r.value);
  }

  // 2. If newsdata.io returned nothing, use AI-generated news
  if (allNews.length === 0 && companies.length > 0) {
    const aiNews = await generateAINews(companies);
    addNews(aiNews);
  }

  // 3. Supplement with AI news if we have < 6 items
  if (allNews.length < 6 && companies.length > 0) {
    const aiNews = await generateAINews(companies);
    addNews(aiNews);
  }

  // Sort newest first
  allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(allNews.slice(0, 20));
}
