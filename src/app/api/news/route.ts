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
  "HINDUNILVR.NS": "Hindustan Unilever",
  "ITC.NS": "ITC Limited",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "BHARTIARTL.NS": "Bharti Airtel",
  "NIFTYBEES.NS": "Nifty 50 stock market",
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
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "GC=F": "Gold price",
  "CL=F": "Crude oil price",
};

function inferSentiment(text: string): "positive" | "negative" | "neutral" {
  const t = text.toLowerCase();
  const pos = ["rise","surge","gain","profit","growth","beat","jump","record","rally","strong","upgrade","outperform"].filter(w => t.includes(w)).length;
  const neg = ["fall","drop","loss","decline","miss","slump","cut","downgrade","weak","concern","crash","risk"].filter(w => t.includes(w)).length;
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchFromNewsDataIO(company: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const cacheKey = `news:nd2:${company}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q: company,
      country: "in",
      language: "en",
    });
    const res = await fetchWithTimeout(
      `https://newsdata.io/api/1/latest?${params}`,
      { headers: { "User-Agent": "Mozilla/5.0 WhatIfIInvested/1.0" } },
      3500
    );

    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "success" || !Array.isArray(json.results)) return [];

    const items: NewsItem[] = json.results.slice(0, 5).map((item: {
      title?: string; source_name?: string; source_id?: string;
      pubDate?: string; description?: string; ai_summary?: string;
      link?: string; sentiment?: string;
    }) => {
      const title = item.title || "Market Update";
      const desc = item.ai_summary || item.description || title;
      return {
        title,
        source: item.source_name || item.source_id || "NewsData",
        date: item.pubDate ? item.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
        description: desc,
        url: item.link || "#",
        sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "")
          ? item.sentiment as "positive" | "negative" | "neutral"
          : inferSentiment(title + " " + desc)),
      };
    });

    if (items.length > 0) cacheSet(cacheKey, items, CACHE_TTL.NEWS);
    return items;
  } catch (e) {
    console.error("NewsData fetch error:", e);
    return [];
  }
}

async function generateAINews(companies: string[]): Promise<NewsItem[]> {
  const cacheKey = `news:ai2:${companies.slice(0, 3).join(",")}`;
  const cached = cacheGet<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const today = new Date().toISOString().split("T")[0];
  const companiesList = companies.slice(0, 5).join(", ");

  const prompt = `You are a financial news writer. Generate 6 realistic, educational market news items for these Indian stocks/assets: ${companiesList}.

Return ONLY a valid JSON array, no markdown fences, no extra text:
[{"title":"headline","source":"Economic Times","description":"2-3 sentence detail with numbers","sentiment":"positive"},...]

Mix company-specific and macro Indian market news (RBI policy, FII flows, GDP, sector trends). Vary sentiments. Be specific with percentages and figures.`;

  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
          }),
        },
        5000
      );
      if (res.ok) {
        const data = await res.json();
        const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonStart = cleaned.indexOf("[");
        const jsonEnd = cleaned.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
          if (Array.isArray(parsed) && parsed.length > 0) {
            const items: NewsItem[] = parsed.map((item: { title?: string; source?: string; description?: string; sentiment?: string }) => ({
              title: item.title || "Market Update",
              source: item.source || "AI Market Analysis",
              date: today,
              description: item.description || "",
              url: "#",
              sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "") ? item.sentiment as "positive"|"negative"|"neutral" : inferSentiment(item.title || "")),
            }));
            cacheSet(cacheKey, items, CACHE_TTL.NEWS);
            return items;
          }
        }
      }
    } catch (e) {
      console.error("Gemini news error:", e);
    }
  }

  // Try OpenRouter fallback
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const res = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${orKey}` },
          body: JSON.stringify({
            model: "qwen/qwen3.6-plus:free",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 800,
          }),
        },
        5000
      );
      if (res.ok) {
        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content ?? "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonStart = cleaned.indexOf("[");
        const jsonEnd = cleaned.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
          if (Array.isArray(parsed) && parsed.length > 0) {
            const items: NewsItem[] = parsed.map((item: { title?: string; source?: string; description?: string; sentiment?: string }) => ({
              title: item.title || "Market Update",
              source: item.source || "AI Market Analysis",
              date: today,
              description: item.description || "",
              url: "#",
              sentiment: (["positive","negative","neutral"].includes(item.sentiment ?? "") ? item.sentiment as "positive"|"negative"|"neutral" : inferSentiment(item.title || "")),
            }));
            cacheSet(cacheKey, items, CACHE_TTL.NEWS);
            return items;
          }
        }
      }
    } catch (e) {
      console.error("OpenRouter news error:", e);
    }
  }

  return [];
}

function getStaticFallbackNews(companies: string[]): NewsItem[] {
  const today = new Date().toISOString().split("T")[0];
  const company = companies[0] || "Indian markets";
  return [
    {
      title: `${company} — Market Update`,
      source: "Market Snapshot",
      date: today,
      description: "Indian equity markets continue to track global cues. FII activity and RBI policy remain key near-term drivers.",
      url: `https://www.google.com/search?q=${encodeURIComponent(company + " stock news")}&tbm=nws`,
      sentiment: "neutral",
    },
    {
      title: "Nifty 50 Outlook: Analyst Views",
      source: "Market Snapshot",
      date: today,
      description: "Analysts expect range-bound trading as markets await US Fed signals and domestic earnings cues.",
      url: "https://www.google.com/search?q=Nifty+50+outlook+today&tbm=nws",
      sentiment: "neutral",
    },
    {
      title: "RBI Policy Watch: Rate Decision Ahead",
      source: "Market Snapshot",
      date: today,
      description: "The Reserve Bank of India's monetary policy stance continues to influence bond yields and banking sector stocks.",
      url: "https://www.google.com/search?q=RBI+policy+rate+India&tbm=nws",
      sentiment: "neutral",
    },
  ];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols")?.split(",").filter(Boolean) || [];

    if (symbols.length === 0) {
      return NextResponse.json([]);
    }

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

    // Run newsdata.io + AI generation in parallel with a hard 8s overall cap
    const fetchAll = async () => {
      // 1. Try newsdata.io per-symbol (parallel, max 2)
      const ndResults = await Promise.allSettled(
        companies.slice(0, 2).map(c => fetchFromNewsDataIO(c))
      );
      for (const r of ndResults) {
        if (r.status === "fulfilled") addNews(r.value);
      }

      // 2. Use AI-generated news as primary or supplement
      if (allNews.length < 4) {
        try {
          const aiItems = await generateAINews(companies);
          addNews(aiItems);
        } catch (e) {
          console.error("AI news generation error:", e);
        }
      }
    };

    // Hard 8s timeout for the entire fetch pipeline
    await Promise.race([
      fetchAll(),
      new Promise<void>(resolve => setTimeout(resolve, 8000)),
    ]);

    // Always fall back to static news if nothing came through
    if (allNews.length === 0) {
      addNews(getStaticFallbackNews(companies));
    }

    allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(allNews.slice(0, 20));
  } catch (error) {
    console.error("News route error:", error);
    return NextResponse.json([]);
  }
}
