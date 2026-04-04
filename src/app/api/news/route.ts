import { NextResponse } from "next/server";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  description: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

const NEWS_DATA: Record<string, NewsItem[]> = {
  "RELIANCE.NS": [
    { title: "Reliance Industries announces new green energy initiative", source: "Economic Times", date: "2026-04-03", description: "Reliance Industries has announced plans to invest ₹50,000 crore in green energy projects over the next 5 years.", url: "#", sentiment: "positive" },
    { title: "Reliance Jio adds 10 million new subscribers", source: "Business Standard", date: "2026-04-02", description: "Reliance Jio continues its growth trajectory with record subscriber additions in Q4 2026.", url: "#", sentiment: "positive" },
    { title: "Reliance Retail reports 25% revenue growth", source: "Moneycontrol", date: "2026-04-01", description: "Reliance Retail segment shows strong performance driven by festive season sales.", url: "#", sentiment: "positive" },
  ],
  "TCS.NS": [
    { title: "TCS wins major deal from European bank", source: "The Hindu", date: "2026-04-03", description: "Tata Consultancy Services has secured a $500 million contract from a leading European bank.", url: "#", sentiment: "positive" },
    { title: "TCS announces campus hiring for 2026", source: "Times of India", date: "2026-04-02", description: "TCS plans to hire 50,000 fresh graduates across India in 2026.", url: "#", sentiment: "neutral" },
  ],
  "HDFCBANK.NS": [
    { title: "HDFC Bank launches new digital banking platform", source: "Financial Express", date: "2026-04-03", description: "HDFC Bank unveils next-generation digital banking experience with AI-powered features.", url: "#", sentiment: "positive" },
    { title: "HDFC Bank Q4 results exceed expectations", source: "Live Mint", date: "2026-04-01", description: "HDFC Bank reports strong Q4 results with 20% YoY profit growth.", url: "#", sentiment: "positive" },
  ],
  "INFY.NS": [
    { title: "Infosys partners with AI startup for automation", source: "TechCrunch India", date: "2026-04-02", description: "Infosys announces strategic partnership with AI automation startup.", url: "#", sentiment: "positive" },
    { title: "Infosys maintains guidance for FY27", source: "Business Line", date: "2026-04-01", description: "Infosys reiterates its revenue guidance citing strong deal pipeline.", url: "#", sentiment: "neutral" },
  ],
  "NIFTYBEES.NS": [
    { title: "Nifty 50 hits new all-time high", source: "NDTV Profit", date: "2026-04-04", description: "The Nifty 50 index reached a new milestone of 23,500 points.", url: "#", sentiment: "positive" },
    { title: "FII inflows continue to support market", source: "Economic Times", date: "2026-04-03", description: "Foreign Institutional Investors remain net buyers in Indian equity markets.", url: "#", sentiment: "positive" },
  ],
  "GOLDBEES.NS": [
    { title: "Gold prices surge on global uncertainty", source: "Gold News", date: "2026-04-03", description: "Gold prices rise as investors seek safe-haven assets amid global geopolitical tensions.", url: "#", sentiment: "positive" },
    { title: "RBI increases gold reserves", source: "Business Standard", date: "2026-04-02", description: "Reserve Bank of India adds more gold to foreign reserves.", url: "#", sentiment: "neutral" },
  ],
};

const DEFAULT_NEWS: NewsItem[] = [
  { title: "Indian markets show strong momentum", source: "Economic Times", date: "2026-04-04", description: "Indian equity markets continue their upward trajectory supported by domestic investors.", url: "#", sentiment: "positive" },
  { title: "RBI maintains repo rate at 6.5%", source: "Live Mint", date: "2026-04-03", description: "Reserve Bank of India keeps repo rate unchanged in latest policy review.", url: "#", sentiment: "neutral" },
  { title: "IT sector sees renewed investor interest", source: "Moneycontrol", date: "2026-04-02", description: "Information Technology stocks rally on strong earnings season.", url: "#", sentiment: "positive" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const days = parseInt(searchParams.get("days") || "30");

  const news = NEWS_DATA[symbol] || DEFAULT_NEWS;

  const filteredNews = news.filter((item) => {
    const newsDate = new Date(item.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return newsDate >= cutoffDate;
  });

  return NextResponse.json(filteredNews.slice(0, 10));
}
