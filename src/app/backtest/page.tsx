"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, RefreshCw, Check, TrendingUp, Info, Download, PanelLeft, ExternalLink, MessageCircle, ChevronDown, Send, Sun, Moon, Sparkles, Calendar, Lightbulb, AlertTriangle } from "lucide-react";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { MonteCarloProjections } from "@/components/charts/monte-carlo-projections";
import { CorrelationHeatmap } from "@/components/charts/correlation-heatmap";
import { CustomMonthPicker } from "@/components/ui/custom-month-picker";
import { ChatInterface } from "@/components/chat/chat-interface";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Asset, PortfolioAnalysis } from "@/types";

// ─── Design Tokens ────────────────────────────────────────────────────────────

function makeColors(dark: boolean) {
  return {
    // TradingView/Cursor-inspired palette — pure greys, no purple tint in dark mode
    bg: dark ? "#131722" : "#F0F3FA",
    surface: dark ? "#1E222D" : "#FFFFFF",
    surfaceHigh: dark ? "#26303F" : "#F8FAFC",
    border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)",
    text: dark ? "#D1D4DC" : "#131722",
    textSub: dark ? "#787B86" : "#4B5563",
    muted: dark ? "#555A68" : "#9CA3AF",
    accent: "#2962FF",
    accentLight: dark ? "rgba(41,98,255,0.14)" : "#EEF2FF",
    green: dark ? "#26A69A" : "#089981",
    greenLight: dark ? "rgba(38,166,154,0.14)" : "#E6FAF7",
    red: dark ? "#EF5350" : "#D32F2F",
    redLight: dark ? "rgba(239,83,80,0.14)" : "#FEF2F2",
    amber: dark ? "#F59E0B" : "#B45309",
  };
}

// Will be replaced by component-level usage
const C = makeColors(false);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetItem {
  symbol: string;
  name: string;
  sector?: string;
  category?: string;
  assetType: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  high52w?: number;
  low52w?: number;
  currency?: string;
}

interface StrategyResult {
  strategyId: string;
  strategy: string;
  icon: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  exitPrice: number;
  reasoning: string;
  probability: number;
  winRate?: number;
  avgReturn?: number;
  assetCount?: number;
  graph?: { label: string; value: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STRATEGIES = [
  { id: "sma_crossover", name: "SMA Crossover", icon: "📈", description: "50-day MA crosses 200-day MA" },
  { id: "rsi", name: "RSI Indicator", icon: "📊", description: "Buy oversold, sell overbought" },
  { id: "macd", name: "MACD", icon: "⚡", description: "Trend momentum indicator" },
  { id: "bollinger", name: "Bollinger Bands", icon: "🎯", description: "Price volatility bands" },
  { id: "value", name: "Value Investing", icon: "💎", description: "Buy when P/E < 15" },
  { id: "momentum", name: "Momentum", icon: "🚀", description: "Trend-following strategy" },
  { id: "dca", name: "Dollar Cost Avg", icon: "💰", description: "Consistent periodic investments" },
  { id: "vwap", name: "VWAP", icon: "📉", description: "Volume Weighted Avg Price" },
  { id: "moving_ribbon", name: "MA Ribbon", icon: "🎗️", description: "Multiple moving averages" },
  { id: "rsr", name: "Relative Strength", icon: "🏆", description: "Rank assets by strength" },
];

const HISTORICAL_PRESETS = [
  { id:"covid_crash", label:"COVID Crash & Recovery", icon:"��", date:"2020-03", endDate:"2021-10", color:"#EF4444",
    story:"In March 2020, WHO declared COVID-19 a pandemic. Nifty 50 plunged 38% in 6 weeks. Markets bottomed on March 23, 2020. RBI cut rates to 4% and the government unleashed massive stimulus. What followed was the sharpest V-shaped recovery in Indian market history. Investors who bought blue-chips at the crash saw 2-3x returns by late 2021.",
    assets:[{symbol:"RELIANCE.NS",name:"Reliance Industries"},{symbol:"HDFCBANK.NS",name:"HDFC Bank"},{symbol:"INFY.NS",name:"Infosys"}]},
  { id:"crypto_bull", label:"Crypto Bull Run 2020-21", icon:"🚀", date:"2020-10", endDate:"2021-11", color:"#F7931A",
    story:"PayPal announced crypto support in October 2020, triggering the first institutional bull run. Bitcoin surged from $11K to $64K by April 2021 — a 5.7x gain. Ethereum flew from $380 to $4,800 driven by DeFi and NFTs. Tesla bought $1.5B in BTC. China banned mining in May 2021 and the cycle peaked in November.",
    assets:[{symbol:"BTC-USD",name:"Bitcoin"},{symbol:"ETH-USD",name:"Ethereum"}]},
  { id:"global_financial_crisis", label:"2008 Financial Crisis", icon:"🏛️", date:"2008-01", endDate:"2013-12", color:"#6366F1",
    story:"Lehman Brothers collapsed September 15 2008 — largest US bankruptcy ever. Nifty 50 crashed 63% from 21,206 to 7,697 by Oct 2008. FIIs pulled Rs 52,000 cr from India. But gold surged 25% in INR that year. A 50/50 Nifty-Gold portfolio fell only 35% vs 63% for pure equity. Full Nifty recovery took until December 2013 — 5.5 years.",
    assets:[{symbol:"^NSEI",name:"Nifty 50"},{symbol:"GC=F",name:"Gold"}]},
  { id:"it_supercycle", label:"India IT Supercycle", icon:"💻", date:"2020-04", endDate:"2022-01", color:"#10B981",
    story:"COVID forced the world digital overnight. US tech companies outsourced at record pace — TCS and Infosys had more deals than they could handle. TCS added $8B revenue in 18 months. Infosys raised guidance five consecutive quarters. TCS surged 130%, Infosys 110%, HCLTech 90% from April 2020 to January 2022.",
    assets:[{symbol:"TCS.NS",name:"TCS"},{symbol:"INFY.NS",name:"Infosys"},{symbol:"HCLTECH.NS",name:"HCL Technologies"}]},
  { id:"gold_safety", label:"Gold Safe Haven 2019-20", icon:"🥇", date:"2019-01", endDate:"2020-12", color:"#D97706",
    story:"US-China trade war, Brexit, and Iran tensions drove central banks to buy record amounts of gold. INR fell 6% vs USD, amplifying gains for Indian investors. Gold in INR went from Rs 31,000/10g in Jan 2019 to Rs 56,000/10g by Aug 2020 — an 80% gain in under 2 years. RBI itself added 50+ tonnes to reserves.",
    assets:[{symbol:"GC=F",name:"Gold Futures"},{symbol:"GOLDBEES.NS",name:"Nippon Gold BeES"}]},
  { id:"jio_revolution", label:"Airtel Comeback + Jio Empire", icon:"📡", date:"2018-01", endDate:"2024-01", color:"#2962FF",
    story:"Jio's 2016 launch destroyed telecom margins and by 2018 everyone expected Airtel to collapse under Rs 1.16L cr debt. Instead Airtel raised tariffs in 2019, doubled revenue-per-user and shed low-value subscribers. Airtel went from Rs 280 to Rs 1,200+ — a 4x return. Reliance Jio became a digital empire worth over $100B.",
    assets:[{symbol:"BHARTIARTL.NS",name:"Bharti Airtel"},{symbol:"RELIANCE.NS",name:"Reliance Industries"}]},
  { id:"nifty_sip", label:"Nifty 50 SIP — 5 Years", icon:"📈", date:"2019-01", endDate:"2024-01", color:"#2962FF",
    story:"Invest a fixed amount monthly in Nifty 50, no matter what. From Jan 2019 to Jan 2024, a Rs 10,000/month SIP — total Rs 6L — grew to approximately Rs 10-11L, delivering ~14% IRR. No stock picking. No timing. Just consistency. COVID, rate hikes, geopolitical chaos — the SIP absorbed it all and came out ahead.",
    assets:[{symbol:"NIFTYBEES.NS",name:"Nippon Nifty BeES"}]},
  { id:"nvidia_ai", label:"Nvidia AI Supernova", icon:"🧠", date:"2022-10", endDate:"2024-06", color:"#10B981",
    story:"ChatGPT launched November 2022 and the world scrambled for GPUs. Nvidia owned 80%+ of the AI training chip market with no alternative at scale. Revenue grew from $6B to $26B in one year. Stock went from $108 in Oct 2022 to $1,200 in June 2024 — an 11x gain in 20 months. Possibly the fastest large-cap value creation in stock market history.",
    assets:[{symbol:"NVDA",name:"Nvidia"}]},
  { id:"magnificent_seven", label:"Magnificent Seven Rally", icon:"💎", date:"2022-12", endDate:"2024-06", color:"#6366F1",
    story:"When the 2022 rate-hike bear market ended, 7 mega-cap tech giants led an extraordinary rally. Apple crossed $3T market cap. Microsoft Azure AI drove enterprise deals. Meta rebounded 300%+ after its cost-cutting. S&P 500 gained ~50% but most gains came from just 7 stocks — a landmark study in concentration risk and reward.",
    assets:[{symbol:"AAPL",name:"Apple"},{symbol:"MSFT",name:"Microsoft"},{symbol:"NVDA",name:"Nvidia"}]},
  { id:"meta_crash", label:"Meta Metaverse Meltdown", icon:"📉", date:"2021-09", endDate:"2022-11", color:"#EC4899",
    story:"In Q4 2021 Zuckerberg renamed Facebook to Meta and pledged $10B+/year on Reality Labs. Simultaneously Apple iOS changes hit ad revenue by $10B/year. Meta fell from $380 to $88 — a 77% crash erasing $700B in market cap. The largest single-company value destruction in history. A textbook lesson that narrative without profits destroys shareholder value.",
    assets:[{symbol:"META",name:"Meta Platforms"}]},
  { id:"zomato_recovery", label:"Zomato's Business Turnaround", icon:"🍔", date:"2022-07", endDate:"2024-06", color:"#EF4444",
    story:"Zomato listed in July 2021 at Rs 76 then crashed to Rs 40 in 2022. Deepinder Goyal took action: shut Zomato Instant, cut dark stores, reduced headcount. Blinkit acquisition proved visionary. By FY24, Zomato delivered its first profit. Stock went from Rs 40 to Rs 220+ — a 5x recovery. A rare Indian new-age startup that genuinely fixed its unit economics.",
    assets:[{symbol:"ZOMATO.NS",name:"Zomato Ltd"}]},
  { id:"tata_motors_ev", label:"Tata Motors EV Turnaround", icon:"⚡", date:"2020-04", endDate:"2024-01", color:"#10B981",
    story:"Tata Motors was at Rs 65 in April 2020 — nearly left for dead. JLR sales had collapsed. Then JLR's order backlog built to 200,000+ vehicles and Tata's Nexon EV dominated India with 70%+ EV market share. By Jan 2024 the stock hit Rs 780 — a 12x return in under 4 years. The most dramatic turnaround in large-cap Indian manufacturing.",
    assets:[{symbol:"TATAMOTORS.NS",name:"Tata Motors"}]},
  { id:"indian_banking_boom", label:"India Private Banking Boom", icon:"🏦", date:"2020-10", endDate:"2024-01", color:"#8B5CF6",
    story:"Post-COVID credit fears evaporated. Banks had cleaned up NPAs via RBI's Asset Quality Review. ICICI Bank under Sandeep Bakshi refocused to risk-adjusted returns. NPAs hit decade lows. ICICI surged 3x, Axis Bank 2.5x, SBI 4x as India's credit growth hit a 10-year high. The entire sector re-rated from distressed to quality growth.",
    assets:[{symbol:"ICICIBANK.NS",name:"ICICI Bank"},{symbol:"AXISBANK.NS",name:"Axis Bank"},{symbol:"SBIN.NS",name:"State Bank of India"}]},
  { id:"crypto_winter", label:"Crypto Winter 2022", icon:"❄️", date:"2021-11", endDate:"2022-12", color:"#64748B",
    story:"Bitcoin peaked at $69K in Nov 2021. Luna/Terra — a $40B stablecoin — collapsed to zero in May 2022. FTX imploded in November when reserves were proven fabricated. BTC fell 77%, ETH 80%, Coinbase stock 92%. A total crisis of trust proving crypto markets can collapse without consumer protection or regulation.",
    assets:[{symbol:"BTC-USD",name:"Bitcoin"},{symbol:"ETH-USD",name:"Ethereum"},{symbol:"COIN",name:"Coinbase"}]},
  { id:"streaming_wars", label:"The Streaming Wars", icon:"📺", date:"2019-11", endDate:"2022-12", color:"#EC4899",
    story:"Disney+ launched November 12 2019 and hit 130M subscribers in 2 years. Netflix suddenly faced Disney, HBO Max, Peacock, and Apple TV+ simultaneously. Netflix lost subscribers for the first time in 2022 and crashed 76% from peak. Legacy TV decayed faster than streaming grew. A case study in how disruption creates chaos for both incumbents and new entrants.",
    assets:[{symbol:"NFLX",name:"Netflix"},{symbol:"DIS",name:"Walt Disney Co"}]},
  { id:"pandemic_tech", label:"Pandemic Stay-at-Home Stocks", icon:"🏠", date:"2020-03", endDate:"2021-08", color:"#3B82F6",
    story:"March 2020 lockdowns created the ultimate stay-at-home tailwind. Zoom went from 10M to 300M daily participants in 3 months. Shopify merchant base doubled. Zoom surged 500%, Shopify 300%, Amazon 100% from March 2020 lows to mid-2021. But as offices reopened, Zoom fell 90% from peak — a warning about valuation during euphoria.",
    assets:[{symbol:"ZM",name:"Zoom"},{symbol:"SHOP",name:"Shopify"},{symbol:"AMZN",name:"Amazon"}]},
  { id:"cloud_kings", label:"Cloud Computing Era", icon:"☁️", date:"2015-01", endDate:"2021-11", color:"#0EA5E9",
    story:"AWS went from a side project to $62B annually. Azure grew 40%+/year under Satya Nadella. Every company moved servers to cloud. Amazon 6x'd, Microsoft 7x'd, Alphabet 4x'd from 2015 to 2021 — pure fundamental growth compounding over 7 years. No speculation, just the biggest structural shift in enterprise technology.",
    assets:[{symbol:"AMZN",name:"Amazon"},{symbol:"MSFT",name:"Microsoft"},{symbol:"GOOGL",name:"Alphabet"}]},
  { id:"asian_paints_moat", label:"Asian Paints — The Perfect Moat", icon:"🎨", date:"2014-01", endDate:"2024-01", color:"#F43F5E",
    story:"Asian Paints controls 55%+ of India's organized paint market with 70,000+ dealers built over 50 years — impossible for any competitor to replicate. Revenue grew from Rs 11,000 cr in 2014 to Rs 35,000 cr in 2024. Stock compounded at ~18% CAGR over a decade. Pricing power, brand, and distribution moat. Exactly what Warren Buffett calls a castle with a moat.",
    assets:[{symbol:"ASIANPAINT.NS",name:"Asian Paints"}]},
  { id:"paytm_ipo", label:"Paytm: IPO to Destruction", icon:"🔥", date:"2021-11", endDate:"2023-12", color:"#EF4444",
    story:"Paytm listed November 2021 at Rs 2,150 — India's largest-ever IPO at Rs 18,300 cr. Within 2 years it fell to Rs 450 — a 79% crash. The business model confused everyone: payments, banking, or lending? None profitable. RBI banned Paytm Payments Bank in 2024 for regulatory violations. India's defining example of hype and overvaluation destroying IPO investors.",
    assets:[{symbol:"PAYTM.NS",name:"One97 Communications"}]},
  { id:"tesla_mania", label:"Tesla Short Squeeze 2019-21", icon:"🏎️", date:"2019-10", endDate:"2021-11", color:"#DC2626",
    story:"Tesla was Wall Street's most shorted stock in 2019. Bears said legacy automakers would crush it. They were spectacularly wrong. Tesla delivered 500K cars in 2020, entered the S&P 500, achieved GAAP profitability, and made Elon Musk the world's richest person. Stock went from $35 (split-adjusted) to $415 — a 12x gain in 25 months.",
    assets:[{symbol:"TSLA",name:"Tesla Inc"}]},
  { id:"fmcg_defensive", label:"FMCG Defensive Play", icon:"🧴", date:"2018-01", endDate:"2022-12", color:"#F59E0B",
    story:"From 2018-2022 markets faced demonetization aftermath, COVID, and rate hikes. ITC and HUL showed why consumer staples are called defensive — people buy soap and cigarettes no matter what. ITC's cigarette monopoly generated Rs 15,000 cr in annual cash flows. HUL reaches 7M+ retail outlets. Both stocks preserved capital and outperformed on a risk-adjusted basis.",
    assets:[{symbol:"ITC.NS",name:"ITC Ltd"},{symbol:"HINDUNILVR.NS",name:"Hindustan Unilever"}]},
  { id:"payments_duopoly", label:"Visa & Mastercard Network Moats", icon:"💳", date:"2016-01", endDate:"2021-07", color:"#F59E0B",
    story:"Visa and Mastercard collect a toll on every transaction globally without taking credit risk. As cashless payments doubled from 2016 to 2021 and e-commerce exploded, revenues grew without extra capital. Visa 3x'd, Mastercard 3x'd. These are pure compounding machines — the definition of an asset-light business with a global network moat.",
    assets:[{symbol:"V",name:"Visa"},{symbol:"MA",name:"Mastercard"}]},
];

const SCENARIO_STORIES: Record<string, string> = HISTORICAL_PRESETS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.story }),
  {} as Record<string, string>
);

const DID_YOU_KNOW = [
  { text:"India IT Supercycle: TCS, Infosys and HCLTech surged 90-130% in 18 months as COVID forced digital transformation globally, triggering a massive outsourcing boom.", preset:"it_supercycle" },
  { text:"Crypto Bull 2020-21: Bitcoin rose from $11K to $64K (+480%) and Ethereum from $380 to $4,800 (+1,163%) as institutions entered crypto for the first time at scale.", preset:"crypto_bull" },
  { text:"2008 Crisis: Nifty 50 crashed 63% in 9 months. A 50/50 Nifty+Gold portfolio fell only 35% — showing why diversification is portfolio armour in market crashes.", preset:"global_financial_crisis" },
  { text:"Nifty 50 SIP: Rs 10,000/month from Jan 2019 to Jan 2024 (Rs 6L total invested) grew to ~Rs 10-11L — a 14% IRR with zero stock picking or market timing required.", preset:"nifty_sip" },
  { text:"Gold Safe Haven: Gold in INR rose 80% between Jan 2019 and Aug 2020 as the US-China trade war, COVID, and INR depreciation hit simultaneously — a perfect storm for gold.", preset:"gold_safety" },
  { text:"Nvidia AI Supernova: From $108 in Oct 2022 to $1,200 in June 2024 — an 11x gain in 20 months — the fastest large-cap value creation triggered by the ChatGPT GPU arms race.", preset:"nvidia_ai" },
];

const COMPANY_DOMAINS: Record<string, string> = {
  // US Stocks
  AAPL: "apple.com", MSFT: "microsoft.com", AMZN: "amazon.com",
  GOOGL: "google.com", GOOG: "google.com", META: "meta.com",
  TSLA: "tesla.com", NVDA: "nvidia.com", NFLX: "netflix.com",
  PYPL: "paypal.com", NIKE: "nike.com", DIS: "disney.com",
  BABA: "alibaba.com", UBER: "uber.com", ABNB: "airbnb.com",
  SPOT: "spotify.com", CRM: "salesforce.com", ADBE: "adobe.com",
  INTC: "intel.com", AMD: "amd.com", JPM: "jpmorganchase.com",
  BAC: "bankofamerica.com", V: "visa.com", MA: "mastercard.com",
  WMT: "walmart.com", KO: "coca-cola.com", PEP: "pepsico.com",
  MCD: "mcdonalds.com", SBUX: "starbucks.com", ORCL: "oracle.com",
  IBM: "ibm.com", GE: "ge.com", F: "ford.com", GM: "gm.com",
  COIN: "coinbase.com", ZM: "zoom.us", SHOP: "shopify.com",
  PLTR: "palantir.com", HOOD: "robinhood.com", SNAP: "snap.com",
  LYFT: "lyft.com", RBLX: "roblox.com", UNH: "unitedhealthgroup.com",
  XOM: "exxonmobil.com", JNJ: "jnj.com", PG: "pg.com", HD: "homedepot.com",
  COST: "costco.com", SQ: "block.xyz",
  // Indian Stocks
  RELIANCE: "ril.com", TCS: "tcs.com", HDFCBANK: "hdfcbank.com",
  INFY: "infosys.com", ICICIBANK: "icicibank.com", SBIN: "onlinesbi.sbi",
  WIPRO: "wipro.com", HINDUNILVR: "hul.co.in", BAJFINANCE: "bajajfinserv.in",
  KOTAKBANK: "kotak.com", AXISBANK: "axisbank.com",
  MARUTI: "marutisuzuki.com", TITAN: "titancompany.in",
  ASIANPAINT: "asianpaints.com", NESTLEIND: "nestle.in",
  HCLTECH: "hcltech.com", SUNPHARMA: "sunpharma.com",
  ONGC: "ongcindia.com", NTPC: "ntpc.co.in", TATASTEEL: "tatasteel.com",
  TATAMOTORS: "tatamotors.com", BHARTIARTL: "airtel.in",
  DRREDDY: "drreddys.com", CIPLA: "cipla.com",
  ZOMATO: "zomato.com", PAYTM: "paytm.com", NYKAA: "nykaa.com",
  PIDILITIND: "pidilite.com", DIVISLAB: "divislaboratories.com",
  APOLLOHOSP: "apollohospitals.com", BAJAJFINSV: "bajajfinserv.in",
  ADANIPORTS: "adaniports.com", ADANIENT: "adanient.com",
  INDUSINDBK: "indusind.com", HINDALCO: "hindalco.com", JSWSTEEL: "jsw.in",
  ULTRACEMCO: "ultratech.in", BPCL: "bharatpetroleum.com",
  HEROMOTOCO: "heromotocorp.com", TECHM: "techmahindra.com",
  EICHERMOT: "royalenfield.com", COALINDIA: "coalindia.in",
  IOC: "iocl.com", POWERGRID: "powergridindia.co.in",
  TATACONSUM: "tataindiacoffee.com", ITC: "itcportal.com",
  GRASIM: "grasim.com", LTIM: "ltimindtree.com",
  BRITANNIA: "britannia.co.in", SHREECEM: "shreecement.com",
  UPL: "upl-ltd.com", JIOFIN: "jio.com",
  // ETF houses
  NIFTYBEES: "nippon-india.com", GOLDBEES: "nippon-india.com",
  JUNIORBEES: "nippon-india.com",
};

const COMMODITY_ICONS: Record<string, { bg: string; text: string; label: string }> = {
  "GC=F": { bg: "#B8860B", text: "#FFF8DC", label: "Au" },
  "SI=F": { bg: "#8E8E93", text: "#FFFFFF", label: "Ag" },
  "PL=F": { bg: "#5F8EA5", text: "#FFFFFF", label: "Pt" },
  "PA=F": { bg: "#9E9E9E", text: "#FFFFFF", label: "Pd" },
  "HG=F": { bg: "#B87333", text: "#FFF3E0", label: "Cu" },
  "ZN=F": { bg: "#636366", text: "#F2F2F7", label: "Zn" },
  "CL=F": { bg: "#2C2C2E", text: "#E5E5EA", label: "🛢" },
  "NG=F": { bg: "#1C4FB4", text: "#EAF0FF", label: "⛽" },
  "RB=F": { bg: "#C04000", text: "#FFF3E0", label: "⛽" },
  "HO=F": { bg: "#3A3A3C", text: "#E5E5EA", label: "🔥" },
  "ZC=F": { bg: "#D4A017", text: "#1A1A1E", label: "🌽" },
  "ZS=F": { bg: "#7D6608", text: "#FFF8E1", label: "🫘" },
  "ZW=F": { bg: "#D4720A", text: "#FFF3E0", label: "🌾" },
  "KC=F": { bg: "#4E342E", text: "#EFEBE9", label: "☕" },
  "CT=F": { bg: "#E8E8E8", text: "#1A1A1E", label: "🌿" },
  "OJ=F": { bg: "#E65100", text: "#FFF3E0", label: "🍊" },
  GOLD: { bg: "#B8860B", text: "#FFF8DC", label: "Au" },
  SILVER: { bg: "#8E8E93", text: "#FFFFFF", label: "Ag" },
  CRUDE: { bg: "#2C2C2E", text: "#E5E5EA", label: "🛢" },
  NATURAL_GAS: { bg: "#1C4FB4", text: "#EAF0FF", label: "⛽" },
  COPPER: { bg: "#B87333", text: "#FFF3E0", label: "Cu" },
};

const COMMODITY_UNIT: Record<string, { label: string; divisor: number }> = {
  "GC=F": { label: "/g",     divisor: 31.1035 },
  "SI=F": { label: "/g",     divisor: 31.1035 },
  "PL=F": { label: "/g",     divisor: 31.1035 },
  "PA=F": { label: "/g",     divisor: 31.1035 },
  "HG=F": { label: "/lb",    divisor: 1 },
  "CL=F": { label: "/bbl",   divisor: 1 },
  "NG=F": { label: "/MMBtu", divisor: 1 },
  "ZC=F": { label: "/bu",    divisor: 1 },
  "ZS=F": { label: "/bu",    divisor: 1 },
  "ZW=F": { label: "/bu",    divisor: 1 },
  "KC=F": { label: "/lb",    divisor: 1 },
  GOLD:   { label: "/g",     divisor: 31.1035 },
  SILVER: { label: "/g",     divisor: 31.1035 },
  CRUDE:  { label: "/bbl",   divisor: 1 },
};

const CRYPTO_COLORS: Record<string, { bg: string; text: string }> = {
  BTC: { bg: "#F7931A", text: "#fff" },
  ETH: { bg: "#627EEA", text: "#fff" },
  BNB: { bg: "#F3BA2F", text: "#1A1A2E" },
  SOL: { bg: "#9945FF", text: "#fff" },
  ADA: { bg: "#0033AD", text: "#fff" },
  DOT: { bg: "#E6007A", text: "#fff" },
  DOGE: { bg: "#C2A633", text: "#fff" },
  MATIC: { bg: "#8247E5", text: "#fff" },
  AVAX: { bg: "#E84142", text: "#fff" },
  LINK: { bg: "#2A5ADA", text: "#fff" },
  XRP: { bg: "#1A6BBD", text: "#fff" },
  LTC: { bg: "#345D9D", text: "#fff" },
  ATOM: { bg: "#2E3148", text: "#fff" },
  UNI: { bg: "#FF007A", text: "#fff" },
  XLM: { bg: "#14B6E7", text: "#fff" },
  NEAR: { bg: "#000000", text: "#fff" },
  APT: { bg: "#22D3EE", text: "#1A1A1E" },
  ARB: { bg: "#28A0F0", text: "#fff" },
  OP: { bg: "#FF0420", text: "#fff" },
  INJ: { bg: "#00F2FE", text: "#1A1A1E" },
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  sma_crossover: "Golden/Death Cross — when the 50-day MA crosses the 200-day MA, it signals a major trend shift.",
  rsi:           "Relative Strength Index — values below 30 flag oversold conditions (buy); above 70 flag overbought (sell).",
  macd:          "MACD Histogram — measures the gap between fast and slow EMAs; crossing zero signals momentum direction changes.",
  bollinger:     "Bollinger Bands — price touching the lower 2σ band often bounces back; upper band often resists further gains.",
  value:         "Value Investing — buy when price is 20%+ below its long-term average (undervalued); sell when 20%+ above.",
  momentum:      "Momentum — tracks when price breaks 5% above or below its 20-day MA, catching strong directional moves early.",
  dca:           "Dollar Cost Averaging — invest a fixed amount at regular intervals to smooth out price volatility over time.",
  moving_ribbon: "MA Ribbon — three EMAs (10/20/50) aligned in the same order confirm a strong, sustained trend direction.",
  vwap:          "VWAP — Volume-Weighted Average Price; buying below VWAP means getting in cheaper than the average market participant.",
  rsr:           "Relative Strength Ranking — ranks your portfolio assets by recent price performance to highlight leaders.",
};

const STRATEGY_REF_LINES: Record<string, { value: number; label: string; color?: string }[]> = {
  rsi:           [{ value: 70, label: "70 OB", color: "#FF3B30" }, { value: 30, label: "30 OS", color: "#00C853" }],
  bollinger:     [{ value: 80, label: "80%", color: "#FF3B30" }, { value: 20, label: "20%", color: "#00C853" }],
  sma_crossover: [{ value: 50, label: "0" }],
  macd:          [{ value: 50, label: "0" }],
  momentum:      [{ value: 50, label: "0" }],
};

const STRATEGY_CHART_LABEL: Record<string, string> = {
  rsi:           "RSI (0–100)",
  bollinger:     "Band Position (%)",
  sma_crossover: "MA Spread",
  macd:          "Histogram",
  momentum:      "Deviation",
  dca:           "Confidence",
  value:         "Value Score",
  moving_ribbon: "Ribbon Strength",
  vwap:          "VWAP Delta",
  rsr:           "Rel. Strength",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trimName(name: string): string {
  return name.replace(/\s+(Ltd\.?|Limited|Pvt\.?|Inc\.?|Corp\.?|Industries|Enterprises?)$/i, "").trim();
}

function getDisplayInfo(asset: AssetItem): { ticker: string; sub: string } {
  if (asset.assetType === "mutual_fund") {
    const shortName = asset.name
      .replace(" - Growth", "")
      .replace(" - Direct Growth", "")
      .replace(" Fund", "")
      .replace(" Ltd", "")
      .trim();
    const words = shortName.split(" ").filter(Boolean);
    return {
      ticker: words.slice(0, 3).join(" "),
      sub: asset.category || "Mutual Fund",
    };
  }
  if (asset.assetType === "commodity") {
    return {
      ticker: asset.name.replace(" Futures", "").replace(" WTI", "").replace(" RBOB", ""),
      sub: asset.category || "Commodity",
    };
  }
  return {
    ticker: asset.symbol.replace(".NS", "").replace("-USD", ""),
    sub: trimName(asset.name),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetIconInner({ symbol, name, type, size = 36, failed, setFailed }: {
  symbol: string;
  name: string;
  type: string;
  size?: number;
  failed: boolean;
  setFailed: (val: boolean) => void;
}) {
  const rawSymbol = symbol.toUpperCase();
  const cleanSymbol = symbol.replace(".NS", "").replace("-USD", "").replace(/^MF\d+$/, "").toUpperCase();

  const commodity = COMMODITY_ICONS[rawSymbol] || COMMODITY_ICONS[cleanSymbol];
  if (commodity || type === "commodity") {
    const c = commodity || { bg: "#636366", text: "#F2F2F7", label: rawSymbol.charAt(0) };
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: c.text, fontWeight: "700", flexShrink: 0,
      }}>
        {c.label}
      </div>
    );
  }

  const crypto = CRYPTO_COLORS[cleanSymbol];
  if (type === "crypto" || crypto) {
    const c = crypto || { bg: "#5E5CE6", text: "#fff" };
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: c.text, fontWeight: "700", flexShrink: 0,
      }}>
        {cleanSymbol.charAt(0)}
      </div>
    );
  }

  let fmpSymbol = symbol.toUpperCase();
  if (symbol.includes("-USD")) fmpSymbol = symbol.replace("-USD", "USD");
  else if (symbol.endsWith("=F")) fmpSymbol = symbol.replace("=F", "");
  else if (symbol.startsWith("^")) fmpSymbol = symbol.replace("^", "");

  const cleanSymbolForDomain = symbol.replace(".NS", "").replace("-USD", "").replace(/^MF\d+$/, "").toUpperCase();
  const domain = COMPANY_DOMAINS[cleanSymbolForDomain];
  let logoUrl = `/api/assets/logo?symbol=${fmpSymbol}`;
  if (domain) logoUrl += `&domain=${domain}`;

  if (!failed && type !== "commodity" && type !== "crypto") {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          width={size * 0.9}
          height={size * 0.9}
          style={{ objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const colors: [string, string][] = [
    ["#6366F1", "#EEF2FF"], ["#8B5CF6", "#F5F3FF"], ["#EC4899", "#FDF2F8"],
    ["#14B8A6", "#F0FDFA"], ["#F59E0B", "#FFFBEB"], ["#EF4444", "#FEF2F2"],
    ["#3B82F6", "#EFF6FF"], ["#10B981", "#ECFDF5"],
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  const [fg, bg] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, color: fg, fontWeight: "700", flexShrink: 0, letterSpacing: "-0.02em",
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function AssetIcon(props: { symbol: string; name: string; type: string; size?: number }) {
  const [hover, setHover] = useState(false);
  const [failed, setFailed] = useState(false);
  const s = props.size || 36;
  
  // Yahoo Finance maps accurately natively using original ticker endings
  let yfSymbol = props.symbol;
  if (props.symbol.endsWith("-USD")) yfSymbol = props.symbol; // Yahoo supports BTC-USD
  
  return (
    <div 
      style={{ position: "relative", display: "inline-flex", cursor: "pointer", width: s, height: s }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        window.open(`https://finance.yahoo.com/quote/${encodeURIComponent(yfSymbol)}`, '_blank');
      }}
      title={`View ${props.name} on Yahoo Finance`}
    >
      {!hover ? (
        <AssetIconInner {...props} failed={failed} setFailed={setFailed} />
      ) : (
        <div style={{
          width: s, height: s, borderRadius: s * 0.28,
          background: "linear-gradient(135deg, #3B82F6, #6366F1)", color: "#fff", 
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(99,102,241,0.4)", flexShrink: 0
        }}>
          <ExternalLink size={s * 0.5} />
        </div>
      )}
    </div>
  );
}

function Sparkline({ positive, seed = 1 }: { positive: boolean; seed?: number }) {
  const W = 64, H = 28;
  const points: { x: number; y: number }[] = [];
  let y = positive ? 20 : 8;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const noise = Math.sin(i * 1.7 + seed * 3.14) * 4 + Math.cos(i * 0.9 + seed) * 3;
    const trend = positive ? -0.8 : 0.8;
    y = Math.max(4, Math.min(H - 4, y + trend + noise));
    points.push({ x: (i / (n - 1)) * (W - 2) + 1, y });
  }
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const color = positive ? C.green : C.red;
  return (
    <svg width={W} height={H} style={{ flexShrink: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, color, tooltip, isDark = false }: { label: string; value: string; color: string; tooltip: string; isDark?: boolean }) {
  const [show, setShow] = useState(false);
  const C = makeColors(isDark);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 12px", textAlign: "center",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 6 }}>
        <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{label}</p>
        <button
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: C.muted }}
        >
          <span style={{ fontSize: 9, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: 13, height: 13, borderRadius: "50%", border: `1px solid rgba(0,0,0,0.15)`, color: C.muted }}>?</span>
        </button>
        {show && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
            background: "#1C2333", color: "#E5E7EB", fontSize: 11, lineHeight: 1.6, fontWeight: 400,
            padding: "10px 14px", borderRadius: 10, zIndex: 999, width: 230, textAlign: "left",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", whiteSpace: "normal",
            pointerEvents: "none", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {tooltip}
          </div>
        )}
      </div>
      <p style={{ color, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{value}</p>
    </div>
  );
}

function SIPCalculator({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  const [target, setTarget] = useState(10000000); // ₹1 Cr
  const [years, setYears] = useState(10);
  const [returnRate, setReturnRate] = useState(12);

  const monthlySIP = useMemo(() => {
    const r = returnRate / 100 / 12;
    const n = years * 12;
    if (r === 0) return target / n;
    return (target * r) / (Math.pow(1 + r, n) - 1);
  }, [target, years, returnRate]);

  const totalInvested = monthlySIP * years * 12;
  const wealthCreated = target - totalInvested;

  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)",
      borderRadius: 14, padding: "20px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>
        Goal-Based SIP Calculator
      </h4>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>
        How much do you need to invest monthly to reach your target?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Target Amount (₹)", value: target, setter: setTarget, step: 100000, min: 100000 },
          { label: "Timeline (Years)", value: years, setter: setYears, step: 1, min: 1 },
          { label: "Expected Return (%/yr)", value: returnRate, setter: setReturnRate, step: 0.5, min: 0.5 },
        ].map(f => (
          <div key={f.label}>
            <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{f.label}</p>
            <input
              type="number"
              value={f.value}
              step={f.step}
              min={f.min}
              onChange={e => f.setter(parseFloat(e.target.value) || f.min)}
              style={{
                width: "100%", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.09)",
                borderRadius: 8, padding: "8px 11px", color: C.text, fontSize: 14,
                fontWeight: 600, outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Monthly SIP", value: formatCurrency(Math.round(monthlySIP)), color: C.accent, bg: C.accentLight },
          { label: "Total Invested", value: formatCurrency(Math.round(totalInvested)), color: C.text, bg: "rgba(0,0,0,0.02)" },
          { label: "Wealth Created", value: formatCurrency(Math.round(wealthCreated)), color: C.green, bg: C.greenLight },
        ].map(r => (
          <div key={r.label} style={{ textAlign: "center", padding: "12px 10px", background: r.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{r.label}</p>
            <p style={{ color: r.color, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {

  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(value * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(displayed)}
    </span>
  );
}

function StrategyMiniChart({ data, signal, strategyId }: {
  data: { label: string; value: number }[];
  signal: "BUY" | "SELL" | "HOLD";
  strategyId: string;
}) {
  const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (!data || data.length < 2) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#AEAEB2", fontSize: 12, fontStyle: "italic" }}>
        Insufficient data for chart
      </div>
    );
  }

  const VW = 300, VH = 80;
  const pad = { t: 8, r: 8, b: 20, l: 28 };
  const cW = VW - pad.l - pad.r;
  const cH = VH - pad.t - pad.b;

  const values = data.map(d => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || 1;
  const min = rawMin - spread * 0.12;
  const max = rawMax + spread * 0.12;
  const totalRange = max - min;

  const sx = (i: number) => pad.l + (i / Math.max(values.length - 1, 1)) * cW;
  const sy = (v: number) => pad.t + cH - ((v - min) / totalRange) * cH;

  const pts = values.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${sx(values.length - 1).toFixed(1)},${(pad.t + cH).toFixed(1)} L${pad.l.toFixed(1)},${(pad.t + cH).toFixed(1)} Z`;

  const lineColor = signal === "BUY" ? C.green : signal === "SELL" ? C.red : "#6B7280";
  const gradId = `smc-${strategyId}`;

  const refLines = STRATEGY_REF_LINES[strategyId] ?? [];

  const step = Math.max(1, Math.floor(data.length / 4));
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % step === 0 || i === data.length - 1);

  const yTicks = [0, 50, 100].map(pct => ({
    v: min + (pct / 100) * totalRange,
    y: pad.t + cH * (1 - pct / 100),
  }));

  return (
    <svg
      width="100%"
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <line key={i} x1={pad.l} y1={t.y} x2={VW - pad.r} y2={t.y}
          stroke="rgba(0,0,0,0.07)" strokeWidth={0.8} />
      ))}
      {refLines.map((ref, i) => {
        const ry = sy(ref.value);
        if (ry < pad.t - 2 || ry > pad.t + cH + 2) return null;
        return (
          <g key={i}>
            <line x1={pad.l} y1={ry} x2={VW - pad.r} y2={ry}
              stroke={ref.color ?? "rgba(0,0,0,0.18)"} strokeWidth={1} strokeDasharray="3,3" />
            <text x={pad.l - 3} y={ry + 3} fontSize={7} fill={ref.color ?? "#AEAEB2"}
              textAnchor="end" fontFamily="inherit">{ref.label}</text>
          </g>
        );
      })}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y}
        r={3} fill={lineColor} stroke="#fff" strokeWidth={1.5} />
      {xLabels.map(({ d, i }) => {
        const raw = d.label;
        const num = parseInt(raw, 10);
        const label = !isNaN(num) && num >= 1 && num <= 12 ? MONTH_ABBR[num - 1] : raw;
        return (
          <text key={i} x={sx(i)} y={VH - 2} fontSize={7.5} fill="#AEAEB2"
            textAnchor="middle" fontFamily="inherit">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Card style ───────────────────────────────────────────────────────────────

const getCardStyle = (C: any): React.CSSProperties => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
});

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BacktestPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [initialInvestment, setInitialInvestment] = useState(100000);
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurringAmount, setRecurringAmount] = useState(10000);
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState("2021-01");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [strategyResults, setStrategyResults] = useState<StrategyResult[]>([]);
  const [chartSignals, setChartSignals] = useState<import("@/types").SignalPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [allAssets, setAllAssets] = useState<AssetItem[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("stock");
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<string>("");
  const [freqOpen, setFreqOpen] = useState(false);
  const [dykIdx, setDykIdx] = useState(0);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Trigger effect for scenarios auto-run
  const [triggerRunKey, setTriggerRunKey] = useState(0);

  useEffect(() => {
    if (triggerRunKey > 0 && selectedAssets.length > 0) {
      const tid = setTimeout(() => runSimulation(), 50);
      return () => clearTimeout(tid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRunKey]);

  // New state
  const [activeTab, setActiveTab] = useState("overview");
  const [activeBenchmarks, setActiveBenchmarks] = useState<Set<string>>(new Set());
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 7));
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const C = makeColors(isDark);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { loadAssets(); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'z') {
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (analysis) return;
    const id = setInterval(() => setDykIdx(i => (i + 1) % DID_YOU_KNOW.length), 4000);
    return () => clearInterval(id);
  }, [analysis]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const res = await fetch("/api/assets/all?type=all");
      if (res.ok) setAllAssets(await res.json());
    } catch (e) {
      console.error("Failed to load assets:", e);
    } finally {
      setAssetsLoading(false);
    }
  };

  const addAsset = (asset: AssetItem) => {
    if (selectedAssets.length >= 10) return;
    if (selectedAssets.find(a => a.symbol === asset.symbol)) return;
    const toAdd: Asset = {
      symbol: asset.symbol, name: asset.name,
      type: asset.assetType as Asset["type"],
      exchange: asset.assetType === "crypto" ? "CRYPTO" : asset.assetType === "us_stock" ? "NYSE/NASDAQ" : "NSE",
      currency: asset.currency ?? "INR",
      currentPrice: asset.currentPrice || 100,
      priceChange: asset.priceChange || 0,
      priceChangePercent: asset.priceChangePercent || 0,
      high52w: asset.high52w || 100, low52w: asset.low52w || 100,
    };
    const next = [...selectedAssets, toAdd];
    setSelectedAssets(next);
    const eq = Math.floor(100 / next.length);
    const w: Record<string, number> = {};
    next.forEach((a, i) => { w[a.symbol] = i === next.length - 1 ? 100 - eq * (next.length - 1) : eq; });
    setWeights(w);
  };

  const removeAsset = (symbol: string) => {
    const next = selectedAssets.filter(a => a.symbol !== symbol);
    setSelectedAssets(next);
    const w = { ...weights };
    delete w[symbol];
    if (next.length > 0) {
      const eq = Math.floor(100 / next.length);
      next.forEach((a, i) => { w[a.symbol] = i === next.length - 1 ? 100 - eq * (next.length - 1) : eq; });
    }
    setWeights(w);
    if (selectedDetailAsset === symbol && next.length > 0) setSelectedDetailAsset(next[0].symbol);
  };

  const loadPreset = (preset: typeof HISTORICAL_PRESETS[0]) => {
    setStartDate(preset.date);
    setEndDate(preset.endDate || new Date().toISOString().slice(0, 7));
    const toAdd: Asset[] = preset.assets.map(pa => {
      const found = allAssets.find(a => a.symbol === pa.symbol);
      return {
        symbol: pa.symbol, name: pa.name,
        type: (found?.assetType as Asset["type"]) || "stock",
        exchange: "NSE", currency: "INR",
        currentPrice: found?.currentPrice || 100,
        priceChange: 0, priceChangePercent: 0,
        high52w: found?.high52w || 100, low52w: found?.low52w || 100,
      };
    });
    setSelectedAssets(toAdd);
    const eq = Math.floor(100 / toAdd.length);
    const w: Record<string, number> = {};
    toAdd.forEach((a, i) => { w[a.symbol] = i === toAdd.length - 1 ? 100 - eq * (toAdd.length - 1) : eq; });
    setWeights(w);
    setTriggerRunKey(prev => prev + 1);
  };

  const runSimulation = async () => {
    if (selectedAssets.length === 0) return;
    setIsLoading(true);
    setSimulationError(null);
    const fullStart = startDate.length === 7 ? `${startDate}-01` : startDate;
    const fullEnd = endDate.length === 7 ? `${endDate}-01` : endDate;

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const normW = { ...weights };
    if (total !== 100 && total > 0) {
      selectedAssets.forEach(a => { normW[a.symbol] = Math.round((weights[a.symbol] / total) * 100); });
    }

    try {
      const body = {
        assets: selectedAssets.map(a => ({
          symbol: a.symbol, name: a.name,
          weight: normW[a.symbol] || Math.floor(100 / selectedAssets.length),
          initialInvestment: (initialInvestment * (normW[a.symbol] || 0)) / 100,
          recurringAmount: isRecurring ? recurringAmount : 0,
          frequency: isRecurring ? frequency : null,
          startDate: fullStart,
        })),
        initialInvestment,
        recurringAmount: isRecurring ? recurringAmount : 0,
        frequency: isRecurring ? frequency : null,
        startDate: fullStart,
        endDate: fullEnd,
      };

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 25000);
      const [portfolioRes, strategiesRes] = await Promise.all([
        fetch("/api/portfolio/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal }),
        fetch("/api/strategies/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assets: selectedAssets, strategies: ALL_STRATEGIES.map(s => s.id), startDate: fullStart, endDate: fullEnd }), signal: ctrl.signal }),
      ]).finally(() => clearTimeout(tid));

      if (!portfolioRes.ok) {
        setSimulationError(`Server error (${portfolioRes.status}). Please try again.`);
        return;
      }

      const portfolioData: PortfolioAnalysis = await portfolioRes.json();
      setAnalysis(portfolioData);
      setSelectedDetailAsset(selectedAssets[0]?.symbol || "");
      setActiveTab("overview"); // Reset tab on new simulation

      if (strategiesRes.ok) {
        const sd = await strategiesRes.json();
        setStrategyResults(sd);
        const sigs: import("@/types").SignalPoint[] = [];
        for (const r of sd) if (r.signals) sigs.push(...r.signals);
        const seen = new Set<string>();
        setChartSignals(sigs.filter(s => { const k = `${s.date}:${s.type}`; if (seen.has(k)) return false; seen.add(k); return true; }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSimulationError(msg.includes("abort") ? "Request timed out. Try fewer assets or a more recent date." : "Simulation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBenchmark = (b: string) => setActiveBenchmarks(prev => {
    const next = new Set(prev);
    next.has(b) ? next.delete(b) : next.add(b);
    return next;
  });

  // ── Computed ───────────────────────────────────────────────────────────────

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const filteredAssets = useMemo(() => {
    let list = allAssets;
    if (selectedCategory !== "all") list = list.filter(a => a.assetType === selectedCategory);
    if (assetSearch) {
      const q = assetSearch.toLowerCase();
      list = list.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    return list.slice(0, 60);
  }, [allAssets, selectedCategory, assetSearch]);

  const detailHolding = useMemo(() => {
    if (!analysis || !selectedDetailAsset) return null;
    return analysis.holdings.find(h => h.symbol === selectedDetailAsset) ?? null;
  }, [analysis, selectedDetailAsset]);

  const detailAsset = useMemo(() => {
    return allAssets.find(a => a.symbol === selectedDetailAsset) ?? null;
  }, [allAssets, selectedDetailAsset]);

  const displayChartData = useMemo(() => {
    if (!analysis?.chartData) return [];
    if (!inflationAdjusted) return analysis.chartData;
    const startMs = new Date(analysis.chartData[0]?.date ?? "2020-01-01").getTime();
    return analysis.chartData.map(pt => ({
      ...pt,
      value: Math.round(pt.value / Math.pow(1.06, (new Date(pt.date).getTime() - startMs) / (1000 * 60 * 60 * 24 * 365))),
    }));
  }, [analysis, inflationAdjusted]);

  const missedDaysAnalysis = useMemo(() => {
    if (!analysis?.chartData || analysis.chartData.length < 10) return null;
    const data = analysis.chartData;
    const returns: { date: string; r: number }[] = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].value > 0) returns.push({ date: data[i].date, r: (data[i].value - data[i - 1].value) / data[i - 1].value });
    }
    const sorted = [...returns].sort((a, b) => b.r - a.r);
    const startVal = data[0].value;
    const totalInvested = analysis.totalInvested;
    const years = (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const calcFinal = (excludeN: number) => {
      const excluded = new Set(sorted.slice(0, excludeN).map(x => x.date));
      let v = startVal;
      for (let i = 1; i < data.length; i++) {
        if (!excluded.has(data[i].date) && data[i - 1].value > 0)
          v *= (1 + (data[i].value - data[i - 1].value) / data[i - 1].value);
      }
      return v;
    };
    return [0, 5, 10, 20, 30].map(n => {
      const finalV = n === 0 ? data[data.length - 1].value : calcFinal(n);
      const ret = ((finalV - totalInvested) / totalInvested) * 100;
      const cagr = years > 0 ? (Math.pow(finalV / totalInvested, 1 / years) - 1) * 100 : 0;
      return { n, finalValue: finalV, returnPct: ret, cagr: Math.round(cagr * 10) / 10 };
    });
  }, [analysis]);

  const taxAnalysis = useMemo(() => {
    if (!analysis || analysis.absoluteReturn <= 0) return null;
    const fullStart = startDate.length === 7 ? `${startDate}-01` : startDate;
    const months = (Date.now() - new Date(fullStart).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const isLTCG = months >= 12;
    const gain = analysis.absoluteReturn;
    const taxAmount = isLTCG ? Math.max(0, gain - 100000) * 0.10 : gain * 0.15;
    return {
      isLTCG,
      taxType: isLTCG ? "LTCG (10% above ₹1L)" : "STCG (15% flat)",
      grossGain: gain,
      taxAmount: Math.round(taxAmount),
      netGain: Math.round(gain - taxAmount),
      netReturnPct: Math.round(((gain - taxAmount) / analysis.totalInvested) * 100 * 100) / 100,
    };
  }, [analysis, startDate]);

  const insights = useMemo(() => {
    if (!analysis) return [];
    const items: { icon: string; text: string; color: string }[] = [];
    const rm = analysis.riskMetrics;
    const years = analysis.chartData.length > 1
      ? (new Date(analysis.chartData[analysis.chartData.length - 1].date).getTime() - new Date(analysis.chartData[0].date).getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 1;
    const inflationReturn = (Math.pow(1.06, years) - 1) * 100;
    const realReturn = analysis.percentReturn - inflationReturn;
    items.push({
      icon: realReturn >= 0 ? "🌟" : "⚠️",
      text: realReturn >= 0
        ? `After 6% annual inflation, your real return was +${realReturn.toFixed(1)}% — purchasing power genuinely grew.`
        : `Inflation eroded ${Math.abs(realReturn).toFixed(1)}% of returns — real purchasing power declined.`,
      color: realReturn >= 0 ? C.green : C.red,
    });
    if (rm) {
      items.push({ icon: "📉", text: `Max drawdown of −${rm.maxDrawdown}% is the paper loss you'd have faced at the worst point — most investors panic-sell here.`, color: C.red });
      items.push({
        icon: rm.sharpeRatio >= 1 ? "🏆" : "📊",
        text: `Sharpe ratio ${rm.sharpeRatio}: for every 1% of volatility, you earned ${rm.sharpeRatio}% excess return above FD. ${rm.sharpeRatio >= 1 ? "Excellent risk-adjusted performance." : rm.sharpeRatio >= 0.5 ? "Decent, but room to optimize." : "You took more risk than you were rewarded for."}`,
        color: rm.sharpeRatio >= 1 ? C.green : rm.sharpeRatio >= 0.5 ? C.amber : C.red,
      });
      items.push({
        icon: "📅",
        text: `${rm.positiveMonthsPct}% of months were positive. ${rm.positiveMonthsPct >= 60 ? "The portfolio was right more often than not." : "More months were down than up — patience was essential."}`,
        color: rm.positiveMonthsPct >= 60 ? C.green : C.amber,
      });
    }
    if (analysis.cagr > 12) items.push({ icon: "🚀", text: `CAGR of ${analysis.cagr}% beats Nifty 50's historical ~12% average — this portfolio outperformed the index.`, color: C.green });
    else if (analysis.cagr > 6.5) items.push({ icon: "✅", text: `CAGR of ${analysis.cagr}% beat FD rates (6.5%) but trailed Nifty 50's ~12% historical average.`, color: C.amber });
    else items.push({ icon: "❌", text: `CAGR of ${analysis.cagr}% didn't beat FD rates (6.5%). A fixed deposit would have done better.`, color: C.red });
    return items;
  }, [analysis]);

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  const CATEGORIES = [
    { id: "stock", label: "IND Stocks" },
    { id: "us_stock", label: "US Stocks" },
    { id: "etf", label: "ETFs" },
    { id: "mutual_fund", label: "Mutual Funds" },
    { id: "commodity", label: "Commodities" },
    { id: "crypto", label: "Crypto" },
  ];

  const FREQ_LABELS: Record<string, string> = {
    weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      fontFamily: 'inherit',
      color: C.text,
      background: C.bg,
    }}>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════════════════════════════════════════ */}
      <aside style={{
        width: 340, flexShrink: 0,
        display: isSidebarOpen ? "flex" : "none", flexDirection: "column",
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
      }}>

        {/* Top: Logo (not scrollable) */}
        <div style={{ padding: "18px 16px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
            color: C.text,
          }}>
            What if I Invested?
          </div>
        </div>

        {/* Selected asset chips */}
        <div style={{ padding: "16px 16px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Selected Assets ({selectedAssets.length}/10)</span>
            <button 
              onClick={() => setIsAssetModalOpen(true)}
              style={{
                background: C.accent, color: "#fff", border: "none", borderRadius: 6,
                padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "opacity 0.2s",
              }}
            >
              + Add Assets
            </button>
          </div>
          
          <AnimatePresence>
            {selectedAssets.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 8 }}
              >
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {selectedAssets.map(a => {
                    const assetItem = allAssets.find(al => al.symbol === a.symbol);
                    const { ticker } = assetItem
                      ? getDisplayInfo(assetItem)
                      : { ticker: a.symbol.replace(".NS", "").replace("-USD", "") };
                    return (
                      <div key={a.symbol} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: C.accentLight, border: `1px solid ${C.accent}25`,
                        borderRadius: 6, padding: "5px 9px 5px 6px",
                      }}>
                        <AssetIcon symbol={a.symbol} name={a.name} type={a.type} size={16} />
                        <span style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}>{ticker}</span>
                        <button onClick={() => removeAsset(a.symbol)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: C.accent, padding: 0, display: "flex", lineHeight: 1,
                          marginLeft: 2, opacity: 0.7,
                        }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <div style={{ 
                border: `1px dashed ${C.border}`, borderRadius: 8, padding: "20px", 
                textAlign: "center", background: "rgba(0,0,0,0.01)" 
              }}>
                <p style={{ color: C.muted, fontSize: 12 }}>No assets selected.</p>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Add at least one to run a simulation.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 0" }}>

          {/* Weight Allocation */}
          {selectedAssets.length > 1 && (() => {
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            return (
              <div style={{
                marginBottom: 8, background: C.surface,
                border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  padding: "6px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "rgba(0,0,0,0.01)",
                }}>
                  <span style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Allocation</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: total === 100 ? C.green : C.amber, fontVariantNumeric: "tabular-nums" }}>{total}%</span>
                </div>
                {selectedAssets.map(a => {
                  const ai = allAssets.find(al => al.symbol === a.symbol);
                  const { ticker } = ai ? getDisplayInfo(ai) : { ticker: a.symbol.replace(".NS","").replace("-USD","") };
                  return (
                    <div key={a.symbol} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 12px", borderBottom: "1px solid rgba(0,0,0,0.03)",
                    }}>
                      <AssetIcon symbol={a.symbol} name={a.name} type={a.type} size={16} />
                      <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.text }}>{ticker}</span>
                      <input
                        type="number" min={0} max={100}
                        value={weights[a.symbol] ?? 0}
                        onChange={e => setWeights(prev => ({ ...prev, [a.symbol]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                        style={{
                          width: 42, textAlign: "right", border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: 5, padding: "2px 4px", fontSize: 11, fontWeight: 700,
                          color: C.text, background: "rgba(0,0,0,0.02)", fontFamily: "inherit",
                          outline: "none",
                        }}
                      />
                      <span style={{ fontSize: 10, color: C.muted }}>%</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Error */}
          {simulationError && (
            <div style={{
              marginBottom: 8, padding: "8px 12px",
              background: `${C.red}0A`, border: `1px solid ${C.red}30`,
              borderRadius: 8, fontSize: 11, color: C.red,
            }}>
              {simulationError}
            </div>
          )}
        </div>

        {/* Bottom: Export/New + Run Simulation (not scrollable) */}
        <div style={{
          padding: "10px 12px 14px",
          borderTop: `1px solid ${C.border}`,
          background: C.surface,
        }}>
          {/* Export / New row */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              onClick={async () => {
                if (!analysis) return;
                setIsGeneratingPDF(true);
                try {
                  const html2canvas = (await import("html2canvas")).default;
                  const { jsPDF } = await import("jspdf");
                  const el = document.getElementById("report-capture-area");
                  if (!el) return;
                  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: C.bg });
                  const imgData = canvas.toDataURL("image/png");
                  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`Zen-Report-${new Date().toISOString().split("T")[0]}.pdf`);
                } catch (e) { console.error("PDF failed", e); }
                finally { setIsGeneratingPDF(false); }
              }}
              disabled={isGeneratingPDF || !analysis}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "7px 0", background: "transparent",
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.muted, fontSize: 11, fontWeight: 500,
                cursor: (isGeneratingPDF || !analysis) ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: (isGeneratingPDF || !analysis) ? 0.4 : 1,
              }}
            >
              <Download style={{ width: 12, height: 12 }} />
              Export PDF
            </button>
            <button
              onClick={() => { setAnalysis(null); setStrategyResults([]); setChartSignals([]); setExpandedStrategy(null); }}
              disabled={!analysis}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "7px 0", background: "transparent",
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.muted, fontSize: 11, fontWeight: 500,
                cursor: !analysis ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: !analysis ? 0.4 : 1,
              }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} />
              New
            </button>
          </div>
          {/* Run Simulation */}
          <button
            onClick={runSimulation}
            disabled={isLoading || selectedAssets.length === 0}
            style={{
              width: "100%", padding: "13px 20px",
              background: selectedAssets.length === 0
                ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")
                : isLoading
                  ? `${C.accent}CC`
                  : C.accent,
              border: "none", borderRadius: 10,
              color: selectedAssets.length === 0 ? C.muted : "#fff",
              fontSize: 14, fontWeight: 600,
              cursor: selectedAssets.length === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s, opacity 0.15s", fontFamily: "inherit",
              letterSpacing: "-0.01em",
              boxShadow: selectedAssets.length > 0 && !isLoading
                ? "0 2px 8px rgba(41,98,255,0.3)"
                : "none",
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RefreshCw style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                Running simulation…
              </span>
            ) : selectedAssets.length === 0
              ? "Select assets to simulate"
              : `Run Simulation (${selectedAssets.length})`}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          ASSET MODAL OVERLAY
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAssetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsAssetModalOpen(false)}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
              zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 640, height: "85vh", maxHeight: 700,
                background: C.bg, borderRadius: 20,
                boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
                display: "flex", flexDirection: "column",
                overflow: "hidden", border: `1px solid ${C.border}`,
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface }}>
                 <div>
                   <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>Add Assets to Portfolio</h2>
                   <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0 0" }}>Search and select up to 10 assets to backtest.</p>
                 </div>
                 <button onClick={() => setIsAssetModalOpen(false)} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", padding: 6, cursor: "pointer", color: C.muted, display: "flex" }}>
                   <X size={18} />
                 </button>
              </div>

              {/* Modal Search & Filters */}
              <div style={{ padding: "16px 24px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        flexShrink: 0, padding: "6px 14px", borderRadius: 20,
                        border: selectedCategory === cat.id ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                        background: selectedCategory === cat.id ? C.accent : "transparent",
                        color: selectedCategory === cat.id ? "#fff" : C.muted,
                        fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                      }}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: C.muted }} />
                  <input
                    placeholder="Search stocks, ETFs, funds by name or symbol…"
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    style={{
                      width: "100%", background: C.bg, border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 14px 12px 42px",
                      color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              {/* Modal Asset List */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", background: C.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Available Assets
                  </span>
                  <span style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>{selectedAssets.length} / 10 Selected</span>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {assetsLoading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: C.muted, gridColumn: "1/-1" }}>Loading assets…</div>
                  ) : filteredAssets.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: C.muted, gridColumn: "1/-1" }}>No assets found matching "{assetSearch}"</div>
                  ) : (
                    filteredAssets.map((asset) => {
                      const isSelected = !!selectedAssets.find(a => a.symbol === asset.symbol);
                      const { ticker, sub } = getDisplayInfo(asset);
                      const unitInfo = COMMODITY_UNIT[asset.symbol];
                      const displayPrice = asset.currentPrice ? (unitInfo ? asset.currentPrice / unitInfo.divisor : asset.currentPrice) : null;
                      const unitLabel = unitInfo?.label ?? "";
                      
                      return (
                        <button
                          key={asset.symbol}
                          onClick={() => isSelected ? removeAsset(asset.symbol) : addAsset(asset)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px",
                            background: isSelected ? C.accentLight : C.surface,
                            border: `1px solid ${isSelected ? C.accent : C.border}`,
                            borderRadius: 12, cursor: "pointer", textAlign: "left",
                            transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                          }}
                        >
                          <AssetIcon symbol={asset.symbol} name={asset.name} type={asset.assetType} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: C.text, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{ticker}</div>
                            <div style={{ color: C.muted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{sub}</div>
                          </div>
                          {displayPrice != null && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: C.text, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                ₹{displayPrice.toLocaleString("en-IN", { maximumFractionDigits: unitInfo?.divisor === 31.1035 ? 2 : 0 })}
                              </div>
                              {unitInfo && (
                                <div style={{ color: C.muted, fontSize: 10, fontWeight: 500, marginTop: 2 }}>
                                  {unitInfo.divisor === 31.1035 ? "per gram" : `per ${unitInfo.label.replace("/", "")}`}
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                            background: isSelected ? C.accent : C.bg, border: `1px solid ${isSelected ? C.accent : C.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4,
                          }}>
                            {isSelected ? <Check size={14} color="#fff" /> : <span style={{ color: C.text, fontSize: 16, lineHeight: 1 }}>+</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN AREA
      ════════════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, overflowY: "auto", background: C.bg }}>

        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: isDark ? "rgba(15,17,23,0.92)" : "rgba(242,243,245,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          {/* Left: toggle + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              title="Toggle sidebar (Z)"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30,
                background: isSidebarOpen ? "transparent" : C.accentLight,
                border: `1px solid ${isSidebarOpen ? C.border : C.accent + "40"}`,
                borderRadius: 7, color: isSidebarOpen ? C.muted : C.accent,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              <PanelLeft size={14} />
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              {analysis ? selectedAssets.map(a => a.symbol.replace(".NS","").replace("-USD","")).join(", ") : "Backtest Lab"}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

          {/* Inline: Initial Investment */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Initial</span>
            <div style={{
              display: "flex", alignItems: "center", gap: 3,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 7, padding: "4px 8px",
            }}>
              <span style={{ color: C.muted, fontSize: 12 }}>₹</span>
              <input
                type="number"
                value={initialInvestment}
                onChange={e => setInitialInvestment(parseInt(e.target.value) || 0)}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: C.text, fontSize: 13, fontWeight: 700, width: 80, fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Inline: Recurring */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Recurring</span>
            <button
              onClick={() => setIsRecurring(r => !r)}
              style={{
                width: 30, height: 17, borderRadius: 9,
                background: isRecurring ? C.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 2, left: isRecurring ? 14 : 2,
                width: 13, height: 13, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
            {isRecurring && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 7, padding: "4px 8px",
                }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>₹</span>
                  <input
                    type="number"
                    value={recurringAmount}
                    onChange={e => setRecurringAmount(parseInt(e.target.value) || 0)}
                    style={{
                      background: "transparent", border: "none", outline: "none",
                      color: C.text, fontSize: 13, fontWeight: 700, width: 68, fontFamily: "inherit",
                    }}
                  />
                </div>
                {/* Frequency dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setFreqOpen(o => !o)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 7, padding: "4px 8px",
                      cursor: "pointer", color: C.text, fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                    }}
                  >
                    {FREQ_LABELS[frequency]}
                    <ChevronDown size={10} color={C.muted} />
                  </button>
                  {freqOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0,
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 9, overflow: "hidden", zIndex: 300,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 110,
                    }}>
                      {["weekly", "monthly", "quarterly", "yearly"].map(f => (
                        <button key={f} onClick={() => { setFrequency(f); setFreqOpen(false); }}
                          style={{
                            width: "100%", padding: "8px 12px",
                            background: frequency === f ? C.accentLight : "transparent",
                            border: "none", color: frequency === f ? C.accent : C.text,
                            fontSize: 12, cursor: "pointer", textAlign: "left",
                            fontFamily: "inherit", fontWeight: frequency === f ? 600 : 400,
                          }}>
                          {FREQ_LABELS[f]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Inline: Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Calendar size={12} color={C.muted} />
            <CustomMonthPicker value={startDate} onChange={setStartDate} maxDate={endDate} label="Start" isDark={isDark} />
            <span style={{ color: C.muted, fontSize: 12 }}>→</span>
            <CustomMonthPicker value={endDate} onChange={setEndDate} minDate={startDate} maxDate={new Date().toISOString().slice(0, 7)} label="End" isDark={isDark} />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right: only dark/light mode toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setIsDark(d => !d)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 30,
                background: isDark ? "rgba(251,191,36,0.12)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${isDark ? "rgba(251,191,36,0.3)" : C.border}`,
                borderRadius: 7, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {isDark ? <Sun size={14} color="#FBBF24" /> : <Moon size={14} color={C.muted} />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="report-capture-area" style={{ padding: "20px 28px" }}>

          {/* Historical Presets row */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none", alignItems: "center" }}>
            <span style={{
              flexShrink: 0,
              color: C.muted, fontSize: 10, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2,
            }}>Try</span>
            {HISTORICAL_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 6,
                  background: C.surface, border: `1px solid rgba(0,0,0,0.09)`,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "border-color 0.15s",
                }}
              >
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <div style={{ color: C.text, fontSize: 11, fontWeight: 500 }}>{preset.icon} {preset.label}</div>
                <div style={{ color: C.muted, fontSize: 9 }}>{preset.date}{preset.endDate ? ` → ${preset.endDate}` : ""}</div>
              </div>
            </button>
            ))}
          </div>

          {/* ── NO SIMULATION: Empty state with DYK ── */}
          {!analysis && (
            <div style={{
              ...getCardStyle(C),
              minHeight: 420,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(0,0,0,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <TrendingUp style={{ width: 20, height: 20, color: C.muted }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={dykIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  style={{ textAlign: "center", maxWidth: 440 }}
                >
                  <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 14 }}>
                    Did you know?
                  </p>
                  <p style={{ color: C.text, fontSize: 19, fontWeight: 600, lineHeight: 1.5, marginBottom: 20, letterSpacing: "-0.01em" }}>
                    {DID_YOU_KNOW[dykIdx].text}
                  </p>
                  {DID_YOU_KNOW[dykIdx].preset && (
                    <button
                      onClick={() => {
                        const p = HISTORICAL_PRESETS.find(pr => pr.id === DID_YOU_KNOW[dykIdx].preset);
                        if (p) loadPreset(p);
                      }}
                      style={{
                        padding: "8px 18px",
                        background: C.accentLight,
                        border: `1px solid ${C.accent}30`,
                        borderRadius: 8, cursor: "pointer",
                        color: C.accent, fontSize: 12, fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      Explore this scenario
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
              <div style={{ display: "flex", gap: 5 }}>
                {DID_YOU_KNOW.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setDykIdx(i)}
                    style={{
                      width: i === dykIdx ? 16 : 5, height: 5, borderRadius: 3,
                      background: i === dykIdx ? C.accent : "rgba(0,0,0,0.1)",
                      transition: "all 0.3s", cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SIMULATION RESULTS ── */}
          {analysis && (
            <motion.div
              id="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Stats bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Total Invested", value: formatCurrency(analysis.totalInvested), trend: null, pos: true },
                  { label: "Current Value", value: formatCurrency(analysis.currentValue), trend: `${analysis.percentReturn?.toFixed(1) ?? 0}%`, pos: analysis.currentValue >= analysis.totalInvested },
                  { label: "Absolute Return", value: formatCurrency(analysis.absoluteReturn), trend: `${analysis.percentReturn?.toFixed(1) ?? 0}%`, pos: analysis.absoluteReturn >= 0 },
                  { label: "CAGR", value: `${analysis.cagr}%`, trend: analysis.cagr >= 12 ? "vs 12% avg" : "vs 12% avg", pos: analysis.cagr >= 12 },
                  { label: "Max Drawdown", value: analysis.riskMetrics ? `-${analysis.riskMetrics.maxDrawdown}%` : "—", trend: "risk measure", pos: false },
                ].map(c => (
                  <div key={c.label} style={{
                    background: C.surface,
                    border: `1px solid rgba(0,0,0,0.07)`,
                    borderRadius: 12, padding: "16px 18px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                    <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{c.label}</p>
                    <p style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 5, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{c.value}</p>
                    {c.trend !== null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          padding: "2px 6px", borderRadius: 4,
                          background: c.pos ? C.greenLight : C.redLight,
                          color: c.pos ? C.green : C.red,
                          fontSize: 10, fontWeight: 600,
                        }}>{c.pos ? "+" : ""}{c.trend}</span>
                        <span style={{ color: C.muted, fontSize: 10 }}>{c.trend.includes("avg") ? "" : "total return"}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chart card */}
              <div style={{
                background: C.surface, borderRadius: 14, padding: "20px 24px",
                border: `1px solid rgba(0,0,0,0.07)`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
                marginBottom: 16,
              }}>
                <PerformanceChart
                  data={displayChartData}
                  symbol={selectedAssets.map(a => {
                    const ai = allAssets.find(al => al.symbol === a.symbol);
                    return ai ? getDisplayInfo(ai).ticker : a.symbol.replace(".NS", "").replace("-USD", "");
                  }).join(", ")}
                  signals={chartSignals}
                  benchmarks={analysis.benchmarks as import("@/types").BenchmarkData | undefined}
                  activeBenchmarks={activeBenchmarks}
                  inflationAdjusted={inflationAdjusted}
                  isDark={isDark}
                />
                {/* Benchmark toggles */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 0 0", flexWrap: "wrap" }}>
                  <span style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2 }}>Benchmark</span>
                  {[
                    { id: "nifty", label: "Nifty 50", color: "#D97706" },
                    { id: "gold", label: "Gold", color: "#92400E" },
                    { id: "fd", label: "FD 6.5%", color: "#065F46" },
                  ].map(b => (
                    <button key={b.id} onClick={() => toggleBenchmark(b.id)} style={{
                      padding: "4px 10px", borderRadius: 6,
                      border: `1px solid ${activeBenchmarks.has(b.id) ? b.color + "80" : "rgba(0,0,0,0.09)"}`,
                      background: activeBenchmarks.has(b.id) ? b.color + "14" : "transparent",
                      color: activeBenchmarks.has(b.id) ? b.color : C.muted,
                      fontSize: 11, fontWeight: activeBenchmarks.has(b.id) ? 600 : 400,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                    }}>{b.label}</button>
                  ))}
                  <button onClick={() => setInflationAdjusted(v => !v)} style={{
                    padding: "4px 10px", borderRadius: 6,
                    border: `1px solid ${inflationAdjusted ? C.accent + "60" : "rgba(0,0,0,0.09)"}`,
                    background: inflationAdjusted ? C.accentLight : "transparent",
                    color: inflationAdjusted ? C.accent : C.muted,
                    fontSize: 11, fontWeight: inflationAdjusted ? 600 : 400,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                    marginLeft: 2,
                  }}>Real (inflation adj.)</button>
                </div>
              </div>

              {/* Analysis tabs */}
              <div style={{
                background: C.surface, borderRadius: 14, padding: "0 0 24px",
                border: `1px solid rgba(0,0,0,0.07)`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
              }}>
                {/* Tab bar */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" }}>
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "compare", label: "Compare" },
                    { id: "risk", label: "Risk" },
                    { id: "learn", label: "Learn" },
                    { id: "planner", label: "Planner" },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                      padding: "12px 16px", border: "none", background: "transparent",
                      color: activeTab === tab.id ? C.text : C.muted,
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      borderBottom: activeTab === tab.id ? `2px solid ${C.accent}` : "2px solid transparent",
                      transition: "color 0.15s",
                      whiteSpace: "nowrap",
                    }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "0 20px" }}>
                  {/* ── OVERVIEW TAB ── */}
                  {activeTab === "overview" && (
                    <div>
                      {/* Hero card */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        style={{
                          background: C.surface,
                          border: `1px solid rgba(0,0,0,0.07)`,
                          borderLeft: `3px solid ${analysis.absoluteReturn >= 0 ? C.green : C.red}`,
                          borderRadius: 12, padding: "24px 28px", marginBottom: 16,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 20 }}>
                          Simulation result
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Invested</p>
                            <p style={{ color: C.text, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                              <AnimatedCounter value={analysis.totalInvested} />
                            </p>
                          </div>
                          <div style={{ color: C.muted, fontSize: 18, fontWeight: 300 }}>→</div>
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Current value</p>
                            <p style={{
                              color: analysis.absoluteReturn >= 0 ? C.green : C.red,
                              fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
                            }}>
                              <AnimatedCounter value={analysis.currentValue} />
                            </p>
                          </div>
                          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                            <span style={{
                              padding: "4px 10px", borderRadius: 6,
                              background: analysis.absoluteReturn >= 0 ? C.greenLight : C.redLight,
                              color: analysis.absoluteReturn >= 0 ? C.green : C.red,
                              fontSize: 13, fontWeight: 600,
                            }}>
                              {analysis.absoluteReturn >= 0 ? "+" : ""}{analysis.percentReturn?.toFixed(1)}% return
                            </span>
                            <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>
                              {analysis.cagr}% CAGR
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Risk snapshot bar */}
                      {analysis.riskMetrics && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                          {[
                            { label: "Max Drawdown", value: `-${analysis.riskMetrics.maxDrawdown}%`, color: C.red, tooltip: "The biggest percentage drop from a peak before the portfolio recovered. A 30% drawdown means you'd have seen ₹1L shrink to ₹70K at some point." },
                            { label: "Volatility", value: `${analysis.riskMetrics.volatility}%`, color: C.amber, tooltip: "Annualised standard deviation of daily returns. Higher = wilder price swings. Nifty 50 averages ~18% annually." },
                            { label: "Sharpe Ratio", value: `${analysis.riskMetrics.sharpeRatio}`, color: analysis.riskMetrics.sharpeRatio >= 1 ? C.green : analysis.riskMetrics.sharpeRatio >= 0 ? C.amber : C.red, tooltip: "How much excess return you earned per unit of risk. Above 1 is excellent; below 0 means FD would have been safer." },
                            { label: "Best Month", value: `+${analysis.riskMetrics.bestMonth}%`, color: C.green, tooltip: "The portfolio's single best calendar month — the biggest one-month gain in the period." },
                            { label: "Worst Month", value: `${analysis.riskMetrics.worstMonth}%`, color: C.red, tooltip: "The portfolio's single worst calendar month — the biggest one-month loss. Seeing this in your account tests investor patience." },
                          ].map(m => (
                            <MetricCard key={m.label} label={m.label} value={m.value} color={m.color} tooltip={m.tooltip} isDark={isDark} />
                          ))}
                        </div>
                      )}

                      {/* Scenario Story Card */}
                      {(() => {
                        const matchedPreset = HISTORICAL_PRESETS.find(p =>
                          p.date === startDate && (p.endDate === endDate || (!p.endDate && endDate === new Date().toISOString().slice(0,7)))
                        ) || HISTORICAL_PRESETS.find(p =>
                          selectedAssets.length > 0 && p.assets.some(a => a.symbol === selectedAssets[0]?.symbol) && p.date === startDate
                        );
                        if (!matchedPreset) return null;
                        return (
                          <motion.div
                            key={matchedPreset.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            style={{
                              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                              border: `1px solid ${C.border}`,
                              borderLeft: `3px solid ${matchedPreset.color}`,
                              borderRadius: 12,
                              padding: "18px 22px",
                              marginBottom: 0,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <span style={{ fontSize: 20 }}>{matchedPreset.icon}</span>
                              <div>
                                <p style={{ color: C.text, fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{matchedPreset.label}</p>
                                <p style={{ color: C.muted, fontSize: 10, fontWeight: 500, marginTop: 2 }}>
                                  {matchedPreset.date}{matchedPreset.endDate ? ` → ${matchedPreset.endDate}` : ""} · Scenario Snapshot
                                </p>
                              </div>
                            </div>
                            <p style={{
                              color: C.textSub, fontSize: 13, lineHeight: 1.75,
                              fontWeight: 400, letterSpacing: "0.005em",
                            }}>
                              {matchedPreset.story}
                            </p>
                          </motion.div>
                        );
                      })()}

                    </div>
                  )}

                  {/* ── PLANNER TAB ── */}
                  {activeTab === "planner" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Tax Impact */}
                      {taxAnalysis && (
                        <div style={{ ...getCardStyle(C), marginBottom: 0 }}>
                          <h4 style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>
                            Tax impact — {taxAnalysis.taxType}
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                            {[
                              { label: "Gross Gain", value: formatCurrency(taxAnalysis.grossGain), color: C.green, bg: C.greenLight },
                              { label: "Tax", value: formatCurrency(taxAnalysis.taxAmount), color: C.red, bg: C.redLight },
                              { label: "Net Gain", value: formatCurrency(taxAnalysis.netGain), color: taxAnalysis.netGain >= 0 ? C.green : C.red, bg: taxAnalysis.netGain >= 0 ? C.greenLight : C.redLight },
                              { label: "Net Return", value: `${taxAnalysis.netReturnPct >= 0 ? "+" : ""}${taxAnalysis.netReturnPct}%`, color: taxAnalysis.netReturnPct >= 0 ? C.green : C.red, bg: taxAnalysis.netReturnPct >= 0 ? C.greenLight : C.redLight },
                            ].map(item => (
                              <div key={item.label} style={{ textAlign: "center", padding: "10px", background: item.bg, borderRadius: 9, border: `1px solid rgba(0,0,0,0.06)` }}>
                                <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{item.label}</p>
                                <p style={{ color: item.color, fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <MonteCarloProjections analysis={analysis} years={10} />
                    </div>
                  )}

                  {/* ── LEARN TAB ── */}
                  {activeTab === "learn" && (() => {
                    const buys = strategyResults.filter(r => r.signal === "BUY").length;
                    const sells = strategyResults.filter(r => r.signal === "SELL").length;
                    const holds = strategyResults.filter(r => r.signal === "HOLD").length;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Missed Best Days */}
                        {missedDaysAnalysis && (
                          <div style={{ ...getCardStyle(C), marginBottom: 16 }}>
                            <h4 style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}>
                              What if you missed the best days?
                            </h4>
                            <p style={{ color: C.muted, fontSize: 12, marginBottom: 14, lineHeight: 1.55 }}>
                              Missing just a few top trading days dramatically reduces returns. The case for staying invested.
                            </p>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["Scenario", "Final Value", "Return", "CAGR"].map(h => (
                                    <th key={h} style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 10px", textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {missedDaysAnalysis.map((row, idx) => (
                                  <tr key={row.n} style={{ background: idx === 0 ? `${C.accent}05` : "transparent" }}>
                                    <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: idx === 0 ? 700 : 400, color: C.text, borderBottom: `1px solid ${C.border}` }}>
                                      {row.n === 0 ? "✓ Stayed fully invested" : `Missed ${row.n} best days`}
                                    </td>
                                    <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 700, color: C.text, borderBottom: `1px solid ${C.border}`, fontVariantNumeric: "tabular-nums" }}>
                                      ₹{Math.round(row.finalValue).toLocaleString("en-IN")}
                                    </td>
                                    <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 700, color: row.returnPct >= 0 ? C.green : C.red, borderBottom: `1px solid ${C.border}` }}>
                                      {row.returnPct >= 0 ? "+" : ""}{row.returnPct.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 700, color: row.cagr >= 0 ? C.green : C.red, borderBottom: `1px solid ${C.border}` }}>
                                      {row.cagr >= 0 ? "+" : ""}{row.cagr}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Signal summary */}
                        {strategyResults.length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
                            {[
                              { label: "Buy", count: buys, color: C.green, bg: C.greenLight },
                              { label: "Hold", count: holds, color: C.muted, bg: "rgba(0,0,0,0.04)" },
                              { label: "Sell", count: sells, color: C.red, bg: C.redLight },
                            ].map(s => (
                              <div key={s.label} style={{
                                background: s.bg, borderRadius: 10,
                                padding: "10px 12px", textAlign: "center",
                                border: `1px solid ${s.color}20`,
                              }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.03em" }}>{s.count}</div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: s.color, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 2 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Strategy rows */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                          {ALL_STRATEGIES.map(strategy => {
                            const result = strategyResults.find(
                              r => r.strategyId === strategy.id || r.strategy === strategy.name
                            );
                            const isExpanded = expandedStrategy === strategy.id;
                            const sig = result?.signal ?? "HOLD";
                            const sigColor = sig === "BUY" ? C.green : sig === "SELL" ? C.red : C.muted;
                            const sigBg = sig === "BUY" ? C.greenLight : sig === "SELL" ? C.redLight : "rgba(0,0,0,0.05)";

                            return (
                              <div
                                key={strategy.id}
                                style={{
                                  background: C.surface,
                                  border: isExpanded ? `1px solid ${C.accent}30` : `1px solid rgba(0,0,0,0.07)`,
                                  borderLeft: `3px solid ${result ? sigColor : "rgba(0,0,0,0.1)"}`,
                                  borderRadius: 10,
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                  overflow: "hidden",
                                  transition: "border 0.15s",
                                }}
                              >
                                <button
                                  onClick={() => setExpandedStrategy(isExpanded ? null : strategy.id)}
                                  style={{
                                    width: "100%", display: "flex", alignItems: "center",
                                    gap: 10, padding: "11px 14px",
                                    background: "transparent", border: "none",
                                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{strategy.name}</div>
                                    <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{strategy.description}</div>
                                    {result && (
                                      <div style={{ marginTop: 6, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden", width: "70%" }}>
                                        <div style={{ width: `${result.probability}%`, height: "100%", borderRadius: 2, background: sigColor }} />
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    {result ? (
                                      <span style={{
                                        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                                        background: sigBg, color: sigColor, letterSpacing: "0.03em",
                                      }}>
                                        {sig}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(0,0,0,0.05)", color: C.muted }}>—</span>
                                    )}
                                    <ChevronDown
                                      size={14}
                                      color={isExpanded ? C.accent : C.muted}
                                      style={{ transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                                    />
                                  </div>
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.22, ease: "easeOut" }}
                                      style={{ overflow: "hidden" }}
                                    >
                                      <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                                        <p style={{ color: C.textSub, fontSize: 12, lineHeight: 1.6, padding: "10px 0 8px" }}>
                                          {STRATEGY_DESCRIPTIONS[strategy.id] ?? strategy.description}
                                        </p>

                                        {result ? (
                                          <>
                                            <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "10px 8px 4px", marginBottom: 12 }}>
                                              <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, marginBottom: 6, paddingLeft: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                {STRATEGY_CHART_LABEL[strategy.id] ?? "Indicator"}
                                              </p>
                                              <StrategyMiniChart data={result.graph ?? []} signal={sig} strategyId={strategy.id} />
                                            </div>

                                            <div style={{ marginBottom: 12 }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                                <span style={{ color: C.textSub, fontSize: 11, fontWeight: 600 }}>Confidence</span>
                                                <span style={{ color: sigColor, fontSize: 13, fontWeight: 700 }}>{result.probability}%</span>
                                              </div>
                                              <div style={{ height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{ width: `${result.probability}%`, height: "100%", borderRadius: 3, background: sigColor, transition: "width 0.6s ease" }} />
                                              </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                                              {[
                                                { label: "Win Rate", value: result.winRate != null ? `${result.winRate}%` : "—", color: (result.winRate ?? 0) >= 50 ? C.green : C.red },
                                                { label: "Avg Return", value: result.avgReturn != null ? `${result.avgReturn > 0 ? "+" : ""}${result.avgReturn}%` : "—", color: (result.avgReturn ?? 0) >= 0 ? C.green : C.red },
                                                { label: "Assets", value: result.assetCount != null ? `${result.assetCount}` : "1", color: C.accent },
                                              ].map(s => (
                                                <div key={s.label} style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, padding: "7px 10px", textAlign: "center" }}>
                                                  <div style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
                                                  <div style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.value}</div>
                                                </div>
                                              ))}
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                                              <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 8, padding: "8px 12px" }}>
                                                <div style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Entry Price</div>
                                                <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>₹{result.entryPrice.toLocaleString("en-IN")}</div>
                                              </div>
                                              <div style={{ background: sig === "SELL" ? `${C.red}08` : `${C.accent}08`, border: `1px solid ${sig === "SELL" ? C.red + "20" : C.accent + "20"}`, borderRadius: 8, padding: "8px 12px" }}>
                                                <div style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Target Price</div>
                                                <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>₹{result.exitPrice.toLocaleString("en-IN")}</div>
                                              </div>
                                            </div>

                                            <p style={{ color: C.textSub, fontSize: 11, lineHeight: 1.65, background: "rgba(0,0,0,0.02)", borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid ${sigColor}` }}>
                                              {result.reasoning}
                                            </p>
                                          </>
                                        ) : (
                                          <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: "12px 0" }}>
                                            Run simulation first to see strategy signals
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── OVERVIEW TAB (Holdings portion) ── */}
                  {activeTab === "overview" && (
                    <div>
                      {/* Asset toggle tabs */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                        {selectedAssets.map(asset => {
                          const ai = allAssets.find(al => al.symbol === asset.symbol);
                          const { ticker } = ai ? getDisplayInfo(ai) : { ticker: asset.symbol.replace(".NS", "").replace("-USD", "") };
                          const isActive = selectedDetailAsset === asset.symbol;
                          const holding = analysis.holdings.find(h => h.symbol === asset.symbol);
                          const pos = (holding?.returnPercent ?? 0) >= 0;
                          return (
                            <button
                              key={asset.symbol}
                              onClick={() => setSelectedDetailAsset(asset.symbol)}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "5px 10px 5px 6px",
                                background: isActive ? C.accentLight : C.surface,
                                border: isActive ? `1px solid ${C.accent}40` : `1px solid rgba(0,0,0,0.09)`,
                                borderRadius: 20, cursor: "pointer",
                                color: isActive ? C.accent : C.textSub,
                                fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                              }}
                            >
                              <AssetIcon symbol={asset.symbol} name={asset.name} type={asset.type} size={18} />
                              <span>{ticker}</span>
                              {holding && (
                                <span style={{ color: pos ? C.green : C.red, fontSize: 10, fontWeight: 600 }}>
                                  {pos ? "↑" : "↓"}{Math.abs(holding.returnPercent).toFixed(1)}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Detail card */}
                      <AnimatePresence mode="wait">
                        {detailHolding ? (
                          <motion.div
                            key={selectedDetailAsset}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{
                              background: C.surface, border: `1px solid ${C.border}`,
                              borderRadius: 16, overflow: "hidden",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
                            }}
                          >
                            <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <AssetIcon
                                  symbol={detailHolding.symbol}
                                  name={detailHolding.name || detailHolding.symbol}
                                  type={detailAsset?.assetType || "stock"}
                                  size={42}
                                />
                                <div>
                                  <h4 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
                                    {detailHolding.name || detailHolding.symbol}
                                  </h4>
                                  <p style={{ color: C.muted, fontSize: 11, fontWeight: 500 }}>
                                    {detailHolding.symbol.replace(".NS", "").replace("-USD", "")} · {detailAsset?.sector || detailAsset?.category || detailAsset?.assetType || "Equity"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {[
                              { label: "Company", value: detailHolding.name || detailHolding.symbol },
                              { label: "Current Price", value: `₹${detailHolding.currentPrice.toLocaleString("en-IN")}` },
                              { label: "Ticker", value: detailHolding.symbol.replace(".NS", "").replace("-USD", "") },
                              { label: "Avg Buy Price", value: `₹${detailHolding.avgBuyPrice.toLocaleString("en-IN")}` },
                              { label: "Quantity", value: detailHolding.quantity.toFixed(4) },
                              { label: "Invested Amount", value: formatCurrency(detailHolding.investedAmount) },
                              { label: "Current Value", value: formatCurrency(detailHolding.currentValue) },
                              { label: "Absolute Return", value: `${detailHolding.returnPercent >= 0 ? "+" : ""}${formatCurrency(detailHolding.returnAmount)}`, accent: detailHolding.returnPercent >= 0 ? C.green : C.red },
                              { label: "Return %", value: `${detailHolding.returnPercent >= 0 ? "+" : ""}${detailHolding.returnPercent.toFixed(2)}%`, accent: detailHolding.returnPercent >= 0 ? C.green : C.red },
                              ...(detailAsset?.high52w ? [{ label: "52-Week High", value: `₹${detailAsset.high52w.toLocaleString("en-IN")}` }] : []),
                              ...(detailAsset?.low52w ? [{ label: "52-Week Low", value: `₹${detailAsset.low52w.toLocaleString("en-IN")}` }] : []),
                            ].map((row, i, arr) => (
                              <div key={row.label} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "12px 20px",
                                borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                                background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                              }}>
                                <span style={{ color: C.textSub, fontSize: 13, fontWeight: 400 }}>{row.label}</span>
                                <span style={{ color: (row as { accent?: string }).accent ?? C.text, fontSize: 13, fontWeight: 700 }}>
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        ) : (
                          <div style={{ padding: 28, textAlign: "center", color: C.muted, fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                            Select an asset to view details
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* ── RISK TAB ── */}
                  {activeTab === "risk" && (
                    <div>
                      {analysis.drawdownSeries && analysis.drawdownSeries.length > 5 && (
                        <div style={{ ...getCardStyle(C), marginBottom: 16 }}>
                          <DrawdownChart data={analysis.drawdownSeries} />
                        </div>
                      )}
                      {analysis.correlationMatrix && analysis.correlationSymbols && (
                        <div style={{ ...getCardStyle(C) }}>
                          <CorrelationHeatmap
                            matrix={analysis.correlationMatrix}
                            symbols={analysis.correlationSymbols}
                          />
                        </div>
                      )}
                      {!analysis.drawdownSeries && !analysis.correlationMatrix && (
                        <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13 }}>
                          Risk data not available for this simulation
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LEARN TAB (Insights portion) ── */}
                  {activeTab === "learn" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      
                      <div style={{ 
                        ...getCardStyle(C),
                        background: isDark ? "linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(26, 29, 39, 0) 100%)" : "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(255, 255, 255, 0) 100%)",
                        border: `1px solid ${C.accent}30`
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ padding: 6, background: C.accent, borderRadius: 8, color: "#fff" }}>
                            <Sparkles size={16} />
                          </div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>AI Context & Analysis</h3>
                        </div>
                        <p style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5, margin: 0, marginTop: 4 }}>
                          Historical context and automated technical observations generated for your selected simulation frame.
                        </p>
                      </div>

                      {insights.length === 0 ? (
                        <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 13, border: `1px dashed ${C.border}`, borderRadius: 16 }}>
                          <Lightbulb style={{ width: 24, height: 24, opacity: 0.5, margin: "0 auto 12px" }} />
                          No insights generated. Try running a diverse or volatile scenario to see AI analysis.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                          {insights.map((item, i) => {
                            const isWarning = item.color === "#F59E0B" || item.color === "#EF4444" || item.color === "#FF3B30";
                            const Icon = isWarning ? AlertTriangle : Lightbulb;
                            
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                  display: "flex", flexDirection: "column", gap: 10,
                                  padding: "16px 20px", borderRadius: 12,
                                  background: C.surface, 
                                  border: `1px solid ${C.border}`,
                                  borderTop: `3px solid ${item.color}`,
                                  position: "relative",
                                  overflow: "hidden"
                                }}
                              >
                                <div style={{ 
                                  position: "absolute", top: -16, right: -16, opacity: 0.05, 
                                  color: item.color, transform: "scale(2.5)" 
                                }}>
                                  <Icon size={48} />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${item.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={12} color={item.color} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: item.color }}>
                                    {isWarning ? "Risk Notice" : "Observation"}
                                  </span>
                                </div>
                                <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, fontWeight: 400, margin: 0, zIndex: 1 }}>
                                  {item.text}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── COMPARE TAB ── */}
                  {activeTab === "compare" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* DCA vs Lump Sum */}
                      {analysis.lumpSumComparison ? (
                        <div style={getCardStyle(C)}>
                          <h4 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
                            DCA vs Lump Sum
                          </h4>
                          <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                            Same total investment, same assets — just different timing strategies.
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {[
                              { label: "Your DCA Strategy", value: analysis.currentValue, cagr: analysis.cagr, ret: analysis.percentReturn, highlight: true },
                              { label: "Lump Sum (Day 1)", value: analysis.lumpSumComparison.currentValue, cagr: analysis.lumpSumComparison.cagr, ret: analysis.lumpSumComparison.percentReturn, highlight: false },
                            ].map(s => (
                              <div key={s.label} style={{
                                padding: "18px 20px", borderRadius: 12,
                                background: s.highlight ? C.accentLight : "rgba(0,0,0,0.02)",
                                border: `1px solid ${s.highlight ? C.accent + "30" : "rgba(0,0,0,0.07)"}`,
                                borderLeft: `3px solid ${s.highlight ? C.accent : "rgba(0,0,0,0.1)"}`,
                              }}>
                                <p style={{ color: s.highlight ? C.accent : C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{s.label}</p>
                                <p style={{ color: C.text, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(s.value)}</p>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <span style={{ color: s.ret >= 0 ? C.green : C.red, fontSize: 12, fontWeight: 600 }}>{s.ret >= 0 ? "+" : ""}{s.ret.toFixed(1)}%</span>
                                  <span style={{ color: C.muted, fontSize: 11 }}>·</span>
                                  <span style={{ color: C.muted, fontSize: 11 }}>{s.cagr}% CAGR</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const diff = analysis.currentValue - analysis.lumpSumComparison.currentValue;
                            return (
                              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 9, background: diff >= 0 ? C.greenLight : C.redLight, border: `1px solid ${diff >= 0 ? C.green : C.red}25`, borderLeft: `3px solid ${diff >= 0 ? C.green : C.red}` }}>
                                <p style={{ color: diff >= 0 ? C.green : C.red, fontSize: 13, fontWeight: 600 }}>
                                  DCA {diff >= 0 ? "outperformed" : "underperformed"} lump sum by {formatCurrency(Math.abs(diff))}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13, ...getCardStyle(C) }}>
                          <Info style={{ width: 20, height: 20, color: C.muted, display: "block", margin: "0 auto 10px" }} />
                          Lump sum comparison data not available. Enable recurring investments and re-run to compare DCA vs lump sum.
                        </div>
                      )}

                      {/* Portfolio vs Benchmarks */}
                      {analysis.benchmarks && Object.keys(analysis.benchmarks).length > 0 && (
                        <div style={getCardStyle(C)}>
                          <h4 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
                            Portfolio vs Benchmarks
                          </h4>
                          <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                            How your portfolio compares if the same amount was invested in standard indices.
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                            {/* The portfolio itself */}
                            <div style={{
                              padding: "16px", borderRadius: 12,
                              background: C.accentLight,
                              border: `1px solid ${C.accent}30`,
                              borderLeft: `3px solid ${C.accent}`,
                            }}>
                              <p style={{ color: C.accent, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Your Portfolio</p>
                              <p style={{ color: C.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>{formatCurrency(analysis.currentValue)}</p>
                              <span style={{ color: analysis.percentReturn >= 0 ? C.green : C.red, fontSize: 12, fontWeight: 600 }}>{analysis.percentReturn >= 0 ? "+" : ""}{analysis.percentReturn.toFixed(1)}%</span>
                              <div style={{ height: 60, marginTop: 10 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={analysis.chartData}>
                                    <defs>
                                      <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke={C.accent} fillOpacity={1} fill="url(#colorPort)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            {/* Benchmarks */}
                            {Object.entries(analysis.benchmarks).map(([key, data]) => {
                              const histData = data as Array<{ date: string; value: number; invested: number }>;
                              const lastPt = histData[histData.length - 1];
                              if (!lastPt) return null;
                              const invested = lastPt.invested;
                              const val = lastPt.value;
                              const ret = invested > 0 ? ((val - invested) / invested) * 100 : 0;
                              const names: Record<string, string> = { nifty: "Nifty 50", gold: "Gold", fd: "Fixed Deposit" };
                              
                              return (
                                <div key={key} style={{
                                  padding: "16px", borderRadius: 12,
                                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                                  borderLeft: `3px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                                }}>
                                  <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{names[key] || key}</p>
                                  <p style={{ color: C.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>{formatCurrency(val)}</p>
                                  <span style={{ color: ret >= 0 ? C.green : C.red, fontSize: 12, fontWeight: 600 }}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</span>
                                  <div style={{ height: 60, marginTop: 10 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={histData}>
                                        <defs>
                                          <linearGradient id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={C.muted} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={C.muted} stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke={C.muted} fillOpacity={1} fill={`url(#color${key})`} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* ── FLOATING AI CHAT (bottom center) ── */}
      <ChatInterface
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isDark={isDark}
        C={C}
        analysis={analysis}
        selectedAssets={selectedAssets}
        strategyResults={strategyResults}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes chatPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
        button { transition: opacity 0.12s ease, background 0.12s ease; }
        button:not(:disabled):active { opacity: 0.75; transform: scale(0.98); }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
