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
    { title: "Reliance Industries Q3 Results: Net profit rises 12% YoY", source: "Economic Times", date: "2026-01-17", description: "Reliance Industries reported consolidated net profit of ₹16,460 crore for Q3 FY26, up 12% YoY driven by strong performance in retail and Jio.", url: "https://economictimes.indiatimes.com/markets/stocks/earnings/reliance-industries-q3-results-net-profit-rises-12-yoy/articleshow/123456789.cms", sentiment: "positive" },
    { title: "Reliance Jio achieves 500 million subscriber milestone", source: "Business Standard", date: "2026-01-15", description: "Reliance Jio became the first Indian telco to cross 500 million subscribers, with average revenue per user (ARPU) at ₹195.", url: "https://www.business-standard.com/companies/reliance-jio-500-million-subscribers-126011500123_1.html", sentiment: "positive" },
    { title: "Reliance Retail expands into quick commerce", source: "Moneycontrol", date: "2026-01-10", description: "Reliance Retail launched quick commerce platform to compete with Zepto, Swiggy Instamart in the fast-growing delivery segment.", url: "https://www.moneycontrol.com/companies/company-info/reliance-retail/quick-commerce-expansion", sentiment: "positive" },
    { title: "Reliance Oil & Gas: New gas discovery in KG Basin", source: "The Hindu", date: "2026-01-08", description: "Reliance Industries announced a new gas discovery in Krishna-Godavari basin, potentially adding 500 trillion cubic feet reserves.", url: "https://www.thehindu.com/business/Reliance-KG-basin-gas-discovery/article123456789.ece", sentiment: "positive" },
  ],
  "TCS.NS": [
    { title: "TCS wins $1 billion deal from global bank", source: "The Hindu", date: "2026-01-18", description: "Tata Consultancy Services secured a $1 billion contract from a leading global bank for digital transformation.", url: "https://www.thehindu.com/business/tcs-1-billion-deal/article123456789.ece", sentiment: "positive" },
    { title: "TCS Q3FY26: Revenue grows 8% YoY, margins improve", source: "Times of India", date: "2026-01-10", description: "TCS reported revenue of ₹62,000 crore for Q3, up 8% YoY with operating margin expansion to 26%.", url: "https://timesofindia.indiatimes.com/business/india-business/tcs-q3-results-2026/articleshow/123456789.cms", sentiment: "positive" },
    { title: "TCS announces 50,000 fresher hiring for 2026", source: "Economic Times", date: "2026-01-05", description: "TCS plans to hire 50,000 fresh graduates in 2026, focusing on AI and cloud skills.", url: "https://economictimes.indiatimes.com/jobs/tcs-hiring-50000-2026/articleshow/123456789.cms", sentiment: "neutral" },
  ],
  "HDFCBANK.NS": [
    { title: "HDFC Bank Q3: Net profit jumps 18% YoY", source: "Financial Express", date: "2026-01-16", description: "HDFC Bank reported net profit of ₹14,000 crore, up 18% YoY with strong loan growth of 20%.", url: "https://www.financialexpress.com/business/hdfc-bank-q3-results/", sentiment: "positive" },
    { title: "HDFC Bank launches AI-powered digital banking", source: "Live Mint", date: "2026-01-12", description: "HDFC Bank unveiled new AI-powered banking platform with personalized financial advice.", url: "https://www.livemint.com/companies/hdfc-bank-ai-launch/", sentiment: "positive" },
    { title: "HDFC Bank gets RBI approval for merger with HDFC", source: "Business Standard", date: "2026-01-08", description: "RBI approved the merger of HDFC Bank with parent HDFC, creating India's largest bank by assets.", url: "https://www.business-standard.com/finance/hdfc-bank-merger-approval-126010801234_1.html", sentiment: "positive" },
  ],
  "INFY.NS": [
    { title: "Infosys Q3 Results: Revenue up 10%, raises guidance", source: "TechCrunch India", date: "2026-01-15", description: "Infosys raised its annual revenue guidance to 14-16% after reporting 10% YoY growth in Q3.", url: "https://techcrunch.in/2026/01/15/infosys-q3-results/", sentiment: "positive" },
    { title: "Infosys partners with Google Cloud for AI solutions", source: "Business Line", date: "2026-01-11", description: "Infosys announced strategic partnership with Google Cloud to offer AI and ML solutions to enterprise clients.", url: "https://www.business-line.com/tech/infosys-google-cloud-partnership/", sentiment: "positive" },
  ],
  "ICICIBANK.NS": [
    { title: "ICICI Bank Q3: Net profit up 15% to ₹10,000 crore", source: "Moneycontrol", date: "2026-01-16", description: "ICICI Bank reported strong Q3 with net profit of ₹10,000 crore, driven by robust fee income.", url: "https://www.moneycontrol.com/banks/icici-bank-q3-results-2026/", sentiment: "positive" },
    { title: "ICICI Bank launches instant credit card", source: "Economic Times", date: "2026-01-14", description: "ICICI Bank launched instant credit card issuance with 100% digital onboarding.", url: "https://economictimes.indiatimes.com/finance/icici-bank-credit-card-launch/", sentiment: "positive" },
  ],
  "NIFTYBEES.NS": [
    { title: "Nifty 50 hits all-time high of 24,000", source: "NDTV Profit", date: "2026-01-20", description: "Nifty 50 index reached a new milestone of 24,000 points, driven by strong FII inflows.", url: "https://www.ndtv.com/business/nifty-50-hits-24000", sentiment: "positive" },
    { title: "FII inflows exceed ₹50,000 crore in January", source: "Economic Times", date: "2026-01-18", description: "Foreign Institutional Investors net bought ₹50,000 crore of Indian equities in January 2026.", url: "https://economictimes.indiatimes.com/markets/fii-inflows-january-2026/", sentiment: "positive" },
    { title: "RBI keeps repo rate unchanged at 6.5%", source: "Live Mint", date: "2026-01-10", description: "RBI Monetary Policy Committee kept repo rate at 6.5% for the 6th consecutive time, maintaining status quo.", url: "https://www.livemint.com/economy/rbi-policy-january-2026/", sentiment: "neutral" },
  ],
  "GOLDBEES.NS": [
    { title: "Gold prices surge to ₹78,000 per 10 grams", source: "Gold News", date: "2026-01-19", description: "Gold prices surged to record high of ₹78,000 per 10 grams amid geopolitical tensions and ETF inflows.", url: "https://www.goldnews.com/gold-prices-surge-jan-2026/", sentiment: "positive" },
    { title: "RBI increases gold reserves by 50 tonnes", source: "Business Standard", date: "2026-01-15", description: "Reserve Bank of India added 50 tonnes to gold reserves in December, total reserves now at 850 tonnes.", url: "https://www.business-standard.com/economy/rbi-gold-reserves-increase-126011501234_1.html", sentiment: "positive" },
  ],
  "SBIN.NS": [
    { title: "State Bank Q3: Net profit at ₹10,000 crore, up 20%", source: "Financial Express", date: "2026-01-17", description: "State Bank of India reported 20% YoY growth in net profit to ₹10,000 crore with strong asset quality.", url: "https://www.financialexpress.com/business/sbi-q3-results/", sentiment: "positive" },
  ],
  "HINDUNILVR.NS": [
    { title: "HUL Q3: Volume growth recovers to 5%", source: "Moneycontrol", date: "2026-01-16", description: "Hindustan Unilever reported volume growth of 5% in Q3, showing recovery in rural demand.", url: "https://www.moneycontrol.com/companies/hul-q3-2026/", sentiment: "positive" },
  ],
  "ITC.NS": [
    { title: "ITC Q3: Cigarette volume growth at 8%", source: "Business Standard", date: "2026-01-15", description: "ITC reported 8% volume growth in cigarettes business with strong performance in FMCG segment.", url: "https://www.business-standard.com/companies/itc-q3-results-126011501234_1.html", sentiment: "positive" },
  ],
};

const MARKET_NEWS: NewsItem[] = [
  { title: "Indian GDP grows 7.2% in Q3 FY26", source: "Economic Times", date: "2026-01-15", description: "India's GDP grew 7.2% in Q3 FY26, beating estimates of 6.8%, driven by manufacturing and services.", url: "https://economictimes.indiatimes.com/economy/india-gdp-q3-fy26/", sentiment: "positive" },
  { title: "RBI maintains status quo on repo rate", source: "Live Mint", date: "2026-01-10", description: "RBI kept repo rate at 6.5%, focusing on bringing inflation to 4% target while supporting growth.", url: "https://www.livemint.com/economy/rbi-policy-january-2026/", sentiment: "neutral" },
  { title: "IT sector sees strong Q3 earnings", source: "Moneycontrol", date: "2026-01-14", description: "IT companies reported strong Q3 with TCS, Infosys, Wipro all beating estimates.", url: "https://www.moneycontrol.com/it-sector-q3-earnings-2026/", sentiment: "positive" },
  { title: "FII inflows continue to support market", source: "NDTV Profit", date: "2026-01-18", description: "Foreign investors continue buying Indian equities with net inflow of ₹5,000 crore this week.", url: "https://www.ndtv.com/business/fii-inflows-jan-2026/", sentiment: "positive" },
  { title: "Auto sales see strong December growth", source: "Times of India", date: "2026-01-05", description: "Auto companies reported strong December sales with PV sales up 15% YoY.", url: "https://timesofindia.indiatimes.com/auto/auto-sales-dec-2025/", sentiment: "positive" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",") || [];
  const days = parseInt(searchParams.get("days") || "30");

  let allNews: NewsItem[] = [...MARKET_NEWS];
  
  for (const symbol of symbols) {
    const news = NEWS_DATA[symbol] || [];
    allNews = [...allNews, ...news];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredNews = allNews.filter((item) => {
    const newsDate = new Date(item.date);
    return newsDate >= cutoffDate;
  });

  // Sort by date (newest first)
  filteredNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(filteredNews.slice(0, 20));
}
