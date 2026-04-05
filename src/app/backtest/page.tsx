"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, RefreshCw, Check, TrendingUp, Info, Download } from "lucide-react";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { MonteCarloProjections } from "@/components/charts/monte-carlo-projections";
import { CorrelationHeatmap } from "@/components/charts/correlation-heatmap";
import { CustomMonthPicker } from "@/components/ui/custom-month-picker";
import type { Asset, PortfolioAnalysis } from "@/types";

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  bg: "#F7F7F9",
  surface: "#FFFFFF",
  border: "rgba(0,0,0,0.05)",
  text: "#1D1D1F",
  textSub: "#6E6E73",
  muted: "#A1A1A6",
  accent: "#5E5CE6",
  green: "#00C853",
  red: "#FF3B30",
  amber: "#FF9F0A",
};

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
  {
    id: "covid_crash",
    label: "COVID Crash",
    icon: "📉",
    date: "2020-01",
    story: "What if you bought India's biggest names at the COVID bottom?",
    color: "#FF3B30",
    assets: [
      { symbol: "RELIANCE.NS", name: "Reliance Industries" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
      { symbol: "INFY.NS", name: "Infosys" },
    ],
  },
  {
    id: "crypto_bull",
    label: "Crypto Bull Run",
    icon: "🚀",
    date: "2020-10",
    story: "Riding the 2020–21 crypto bull run from near the bottom.",
    color: "#F7931A",
    assets: [
      { symbol: "BTC-USD", name: "Bitcoin" },
      { symbol: "ETH-USD", name: "Ethereum" },
    ],
  },
  {
    id: "it_supercycle",
    label: "IT Supercycle",
    icon: "💻",
    date: "2020-04",
    story: "The pandemic supercharged India's IT sector.",
    color: "#34C759",
    assets: [
      { symbol: "TCS.NS", name: "TCS" },
      { symbol: "INFY.NS", name: "Infosys" },
      { symbol: "HCLTECH.NS", name: "HCL Technologies" },
    ],
  },
  {
    id: "gold_safety",
    label: "Gold Safe Haven",
    icon: "🥇",
    date: "2019-01",
    story: "Gold's historic run during market uncertainty.",
    color: "#B8860B",
    assets: [
      { symbol: "GC=F", name: "Gold Futures" },
      { symbol: "GOLDBEES.NS", name: "Nippon Gold BeES" },
    ],
  },
  {
    id: "jio_revolution",
    label: "Jio Revolution",
    icon: "📡",
    date: "2018-01",
    story: "Bharti Airtel + Reliance — the telecom disruption play.",
    color: "#5E5CE6",
    assets: [
      { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
      { symbol: "RELIANCE.NS", name: "Reliance Industries" },
    ],
  },
  {
    id: "nifty_sip",
    label: "Nifty 50 SIP",
    icon: "📈",
    date: "2019-01",
    story: "The power of consistent monthly SIP in a Nifty index ETF.",
    color: "#5E5CE6",
    assets: [
      { symbol: "NIFTYBEES.NS", name: "Nippon Nifty BeES" },
    ],
  },
];

const DID_YOU_KNOW = [
  { text: "₹1 Lakh in TCS in 2004 → over ₹1 Crore today", preset: "it_supercycle" },
  { text: "₹1 Lakh in Bitcoin in Oct 2020 → over ₹12 Lakh just 12 months later", preset: "crypto_bull" },
  { text: "Nifty 50 SIP of ₹10K/month since 2019 — invested ₹6L, grew to ₹12L+", preset: "nifty_sip" },
  { text: "Gold in INR nearly doubled between 2019 and 2023, often rising when equities fell", preset: "gold_safety" },
  { text: "₹1 Lakh in Bharti Airtel in 2018 → ₹5 Lakh+ by 2024 as Jio competition eased", preset: "jio_revolution" },
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
    sub: asset.name,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetIcon({ symbol, name, type, size = 36 }: {
  symbol: string;
  name: string;
  type: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
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
        width: size, height: size, borderRadius: "50%",
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
  
  if (!failed && type !== "commodity" && type !== "crypto") {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/assets/logo?symbol=${fmpSymbol}`}
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
  const color = positive ? "#00C853" : "#FF3B30";
  return (
    <svg width={W} height={H} style={{ flexShrink: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, color, tooltip }: { label: string; value: string; color: string; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "12px 14px", textAlign: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 5 }}>
        <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
        <button
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: C.muted }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: 13, height: 13, borderRadius: "50%", border: `1px solid ${C.muted}`, color: C.muted }}>?</span>
        </button>
        {show && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
            background: "#1A1A2E", color: "#fff", fontSize: 11, lineHeight: 1.55, fontWeight: 400,
            padding: "9px 12px", borderRadius: 10, zIndex: 999, width: 220, textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.22)", whiteSpace: "normal",
            pointerEvents: "none",
          }}>
            {tooltip}
          </div>
        )}
      </div>
      <p style={{ color, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>{value}</p>
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
      borderRadius: 18, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
    }}>
      <h4 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
        Goal-Based SIP Calculator
      </h4>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>
        How much do you need to invest monthly to hit your target?
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
                width: "100%", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 15,
                fontWeight: 700, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Monthly SIP Required", value: formatCurrency(Math.round(monthlySIP)), color: C.accent, big: true },
          { label: "Total Invested", value: formatCurrency(Math.round(totalInvested)), color: C.text, big: false },
          { label: "Wealth Created", value: formatCurrency(Math.round(wealthCreated)), color: C.green, big: false },
        ].map(r => (
          <div key={r.label} style={{ textAlign: "center", padding: "14px 10px", background: "rgba(0,0,0,0.02)", border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{r.label}</p>
            <p style={{ color: r.color, fontSize: r.big ? 20 : 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{r.value}</p>
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

  const lineColor = signal === "BUY" ? "#00C853" : signal === "SELL" ? "#FF3B30" : "#5E5CE6";
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

const card: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${C.border}`,
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 4px 40px rgba(0,0,0,0.03)",
};

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

  // New state
  const [activeTab, setActiveTab] = useState("overview");
  const [activeBenchmarks, setActiveBenchmarks] = useState<Set<string>>(new Set());
  const [inflationAdjusted, setInflationAdjusted] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { loadAssets(); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'z') {
        setIsZenMode(prev => !prev);
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
    setSelectedAssets([]);
    setWeights({});
    setStartDate(preset.date);
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
  };

  const runSimulation = async () => {
    if (selectedAssets.length === 0) return;
    setIsLoading(true);
    setSimulationError(null);
    const fullStart = startDate.length === 7 ? `${startDate}-01` : startDate;

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
      };

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 25000);
      const [portfolioRes, strategiesRes] = await Promise.all([
        fetch("/api/portfolio/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal }),
        fetch("/api/strategies/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assets: selectedAssets, strategies: ALL_STRATEGIES.map(s => s.id), startDate: fullStart }), signal: ctrl.signal }),
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
        display: isZenMode ? "none" : "flex", flexDirection: "column",
        background: C.surface,
        borderRight: `1px solid rgba(0,0,0,0.08)`,
      }}>

        {/* Top: Logo + tagline (not scrollable) */}
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{
            fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #5E5CE6 0%, #00C087 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 3,
          }}>
            WhatIfIInvested
          </div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 500 }}>
            Stop wondering. Start backtesting.
          </div>
        </div>

        {/* Middle: scrollable config + asset list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>

          {/* ── Investment config ── */}
          {/* Initial Investment */}
          <div style={{ borderBottom: `1px solid rgba(0,0,0,0.05)`, padding: "10px 0" }}>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
              Initial Investment
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ color: C.muted, fontSize: 16, fontWeight: 400 }}>₹</span>
              <input
                type="number"
                value={initialInvestment}
                onChange={e => setInitialInvestment(parseInt(e.target.value) || 0)}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: C.text, fontSize: 22, fontWeight: 700, width: "100%", fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Recurring */}
          <div style={{ borderBottom: `1px solid rgba(0,0,0,0.05)`, padding: "10px 0" }}>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              Recurring
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Toggle */}
              <button
                onClick={() => setIsRecurring(r => !r)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: isRecurring ? "#34C759" : "rgba(0,0,0,0.12)",
                  border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
                  transition: "background 0.22s",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: isRecurring ? 18 : 2,
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }} />
              </button>
              {/* Amount */}
              <span style={{ color: isRecurring ? C.muted : "rgba(0,0,0,0.2)", fontSize: 14, fontWeight: 400 }}>₹</span>
              <input
                type="number"
                value={recurringAmount}
                onChange={e => setRecurringAmount(parseInt(e.target.value) || 0)}
                disabled={!isRecurring}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: isRecurring ? C.text : C.muted, fontSize: 16, fontWeight: 700,
                  width: 80, fontFamily: "inherit",
                }}
              />
              {/* Frequency dropdown */}
              <div style={{ position: "relative", flex: 1 }}>
                <button
                  onClick={() => isRecurring && setFreqOpen(o => !o)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 8, padding: "4px 9px",
                    cursor: isRecurring ? "pointer" : "default",
                    color: isRecurring ? C.text : C.muted,
                    fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                  }}
                >
                  <span>{FREQ_LABELS[frequency]}</span>
                  <span style={{ fontSize: 9, color: C.muted }}>▾</span>
                </button>
                {freqOpen && isRecurring && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0,
                    background: C.surface, border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 10, overflow: "hidden", zIndex: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  }}>
                    {["weekly", "monthly", "quarterly", "yearly"].map(f => (
                      <button key={f} onClick={() => { setFrequency(f); setFreqOpen(false); }}
                        style={{
                          width: "100%", padding: "9px 12px",
                          background: frequency === f ? `${C.accent}10` : "transparent",
                          border: "none",
                          color: frequency === f ? C.accent : C.text,
                          fontSize: 12, cursor: "pointer", textAlign: "left",
                          fontFamily: "inherit", fontWeight: frequency === f ? 700 : 400,
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                        }}>
                        {FREQ_LABELS[f]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div style={{ padding: "4px 0" }}>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, paddingLeft: 4 }}>
              Start Date
            </p>
            <CustomMonthPicker
              value={startDate}
              onChange={setStartDate}
              maxDate={new Date().toISOString().slice(0, 7)}
            />
          </div>

          {/* Thin divider */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "12px 0" }} />

          {/* Category tabs — horizontal scrollable single row */}
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: "6px 11px", borderRadius: 20,
                  border: selectedCategory === cat.id ? `1px solid ${C.accent}40` : "1px solid rgba(0,0,0,0.07)",
                  background: selectedCategory === cat.id ? `${C.accent}0D` : "transparent",
                  color: selectedCategory === cat.id ? C.accent : C.muted,
                  fontSize: 11, fontWeight: selectedCategory === cat.id ? 700 : 500,
                  cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.muted }} />
            <input
              placeholder="Search stocks, ETFs, funds…"
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: 10, padding: "8px 10px 8px 32px",
                color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          {/* Asset list */}
          <div style={{
            background: C.surface, border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            marginBottom: 8,
          }}>
            <div style={{
              padding: "8px 12px",
              borderBottom: "1px solid rgba(0,0,0,0.05)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {CATEGORIES.find(c => c.id === selectedCategory)?.label || "Assets"}
              </span>
              <span style={{ color: C.muted, fontSize: 10, fontWeight: 500 }}>{selectedAssets.length}/10</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {assetsLoading ? (
                <div style={{ padding: "28px 12px", textAlign: "center", color: C.muted, fontSize: 12 }}>
                  Loading assets…
                </div>
              ) : filteredAssets.length === 0 ? (
                <div style={{ padding: "28px 12px", textAlign: "center", color: C.muted, fontSize: 12 }}>
                  No assets found
                </div>
              ) : (
                filteredAssets.map((asset, idx) => {
                  const isSelected = !!selectedAssets.find(a => a.symbol === asset.symbol);
                  const { ticker, sub } = getDisplayInfo(asset);
                  const positive = (asset.priceChangePercent || 0) >= 0;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => isSelected ? removeAsset(asset.symbol) : addAsset(asset)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px",
                        background: isSelected ? `${C.accent}08` : "transparent",
                        border: "none", borderBottom: "1px solid rgba(0,0,0,0.03)",
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.12s", fontFamily: "inherit",
                      }}
                    >
                      <AssetIcon symbol={asset.symbol} name={asset.name} type={asset.assetType} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.text, fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{ticker}</div>
                        <div style={{ color: C.muted, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{sub}</div>
                      </div>
                      <Sparkline positive={positive} seed={idx + 1} />
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>
                          {asset.currentPrice ? `₹${asset.currentPrice.toLocaleString("en-IN")}` : "—"}
                        </div>
                        <div style={{ color: positive ? C.green : C.red, fontSize: 10 }}>
                          {positive ? "↑" : "↓"}{Math.abs(asset.priceChangePercent || 0).toFixed(2)}%
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%", background: C.accent,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Check style={{ width: 9, height: 9, color: "#fff" }} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected asset chips */}
          <AnimatePresence>
            {selectedAssets.length > 0 && (
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
                        background: `${C.accent}0D`, border: `1px solid ${C.accent}30`,
                        borderRadius: 20, padding: "2px 8px 2px 4px",
                      }}>
                        <AssetIcon symbol={a.symbol} name={a.name} type={a.type} size={16} />
                        <span style={{ color: C.accent, fontSize: 10, fontWeight: 700 }}>{ticker}</span>
                        <button onClick={() => removeAsset(a.symbol)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: C.muted, padding: 0, display: "flex", lineHeight: 1,
                        }}>
                          <X style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

        {/* Bottom: Run Simulation (not scrollable) */}
        <div style={{
          padding: 12,
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: C.surface,
        }}>
          <button
            onClick={runSimulation}
            disabled={isLoading || selectedAssets.length === 0}
            style={{
              width: "100%", padding: "14px 20px",
              background: selectedAssets.length === 0
                ? "rgba(0,0,0,0.06)"
                : isLoading
                  ? `${C.accent}80`
                  : `linear-gradient(135deg, ${C.accent} 0%, #007AFF 50%, #34C759 100%)`,
              border: "none", borderRadius: 12,
              color: selectedAssets.length === 0 ? C.muted : "#fff",
              fontSize: 15, fontWeight: 700,
              cursor: selectedAssets.length === 0 ? "not-allowed" : "pointer",
              transition: "opacity 0.2s", fontFamily: "inherit",
              letterSpacing: "0.01em",
              boxShadow: selectedAssets.length > 0 && !isLoading
                ? `0 4px 20px ${C.accent}55, 0 1px 4px rgba(0,0,0,0.1)`
                : "none",
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RefreshCw style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                Running Simulation…
              </span>
            ) : selectedAssets.length === 0
              ? "Select assets to simulate"
              : "Run Simulation →"}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN AREA
      ════════════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, overflowY: "auto", background: C.bg }}>

        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(240,242,245,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          padding: "14px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #5E5CE6 0%, #00C087 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              WhatIfIInvested
            </div>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 500, marginTop: 1 }}>
              Stop wondering. Start backtesting.
            </div>
          </div>
          {analysis && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setIsZenMode(z => !z)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", background: isZenMode ? `${C.accent}15` : "transparent",
                  border: `1px solid ${isZenMode ? C.accent : "transparent"}`,
                  borderRadius: 12, color: isZenMode ? C.accent : C.muted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}>
                {isZenMode ? "Exit Zen Mode" : "Zen Mode"} <kbd style={{ padding: "1px 5px", background: "rgba(0,0,0,0.06)", borderRadius: 4, fontSize: 10, fontFamily: "inherit" }}>Z</kbd>
              </button>
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
                  } catch (e) {
                    console.error("PDF failed", e);
                  } finally {
                    setIsGeneratingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", background: C.surface,
                  border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
                  color: C.textSub, fontSize: 12, fontWeight: 600,
                  cursor: isGeneratingPDF ? "wait" : "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  opacity: isGeneratingPDF ? 0.7 : 1,
                  transition: "all 0.15s",
                }}
              >
                <Download style={{ width: 13, height: 13 }} />
                {isGeneratingPDF ? "Exporting..." : "Export PDF"}
              </button>
              <button
                onClick={() => { setAnalysis(null); setStrategyResults([]); setChartSignals([]); setExpandedStrategy(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", background: C.surface,
                  border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
                  color: C.textSub, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <RefreshCw style={{ width: 13, height: 13 }} />
                New Simulation
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div id="report-capture-area" style={{ padding: "20px 28px" }}>

          {/* Historical Presets row */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
            <span style={{
              flexShrink: 0, alignSelf: "center",
              color: C.muted, fontSize: 10, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 2,
            }}>Try:</span>
            {HISTORICAL_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 14px", borderRadius: 10,
                  background: C.surface, border: `1px solid ${preset.color}28`,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 15 }}>{preset.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: C.text, fontSize: 11, fontWeight: 700 }}>{preset.label}</div>
                  <div style={{ color: C.muted, fontSize: 9, marginTop: 1 }}>from {preset.date}</div>
                </div>
              </button>
            ))}
          </div>

          {/* ── NO SIMULATION: Empty state with DYK ── */}
          {!analysis && (
            <div style={{
              ...card,
              minHeight: 400,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 16,
            }}>
              <TrendingUp style={{ width: 28, height: 28, color: C.muted }} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={dykIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.32 }}
                  style={{ textAlign: "center", maxWidth: 420 }}
                >
                  <p style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Did you know?
                  </p>
                  <p style={{ color: C.text, fontSize: 20, fontWeight: 700, lineHeight: 1.45, marginBottom: 18 }}>
                    {DID_YOU_KNOW[dykIdx].text}
                  </p>
                  {DID_YOU_KNOW[dykIdx].preset && (
                    <button
                      onClick={() => {
                        const p = HISTORICAL_PRESETS.find(pr => pr.id === DID_YOU_KNOW[dykIdx].preset);
                        if (p) loadPreset(p);
                      }}
                      style={{
                        padding: "9px 20px",
                        background: `${C.accent}0D`,
                        border: `1px solid ${C.accent}30`,
                        borderRadius: 10, cursor: "pointer",
                        color: C.accent, fontSize: 13, fontWeight: 700,
                        fontFamily: "inherit",
                      }}
                    >
                      Try This →
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
              <div style={{ display: "flex", gap: 6 }}>
                {DID_YOU_KNOW.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setDykIdx(i)}
                    style={{
                      width: i === dykIdx ? 18 : 6, height: 6, borderRadius: 3,
                      background: i === dykIdx ? C.accent : "rgba(0,0,0,0.1)",
                      transition: "all 0.35s", cursor: "pointer",
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Total Invested", value: formatCurrency(analysis.totalInvested), trend: null, pos: true },
                  { label: "Current Value", value: formatCurrency(analysis.currentValue), trend: `${analysis.percentReturn?.toFixed(1) ?? 0}%`, pos: analysis.currentValue >= analysis.totalInvested },
                  { label: "Absolute Return", value: formatCurrency(analysis.absoluteReturn), trend: `${analysis.percentReturn?.toFixed(1) ?? 0}%`, pos: analysis.absoluteReturn >= 0 },
                  { label: "CAGR", value: `${analysis.cagr}%`, trend: analysis.cagr > 12 ? "Above avg" : "Below avg", pos: analysis.cagr >= 0 },
                ].map(c => (
                  <div key={c.label} style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: "14px 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{c.label}</p>
                    <p style={{ color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>{c.value}</p>
                    {c.trend !== null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ color: c.pos ? C.green : C.red, fontSize: 11 }}>{c.pos ? "↑" : "↓"}</span>
                        <span style={{ color: c.pos ? C.green : C.red, fontSize: 11, fontWeight: 600 }}>{c.trend}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chart card */}
              <div style={{
                background: C.surface, borderRadius: 16, padding: "20px 24px",
                border: `1px solid ${C.border}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
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
                />
                {/* Benchmark toggles */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 0", flexWrap: "wrap" }}>
                  <span style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Compare vs:</span>
                  {[
                    { id: "nifty", label: "Nifty 50", color: "#FF9F0A" },
                    { id: "gold", label: "Gold", color: "#B8860B" },
                    { id: "fd", label: "FD 6.5%", color: "#00C087" },
                  ].map(b => (
                    <button key={b.id} onClick={() => toggleBenchmark(b.id)} style={{
                      padding: "5px 12px", borderRadius: 20,
                      border: `1px solid ${activeBenchmarks.has(b.id) ? b.color : "rgba(0,0,0,0.1)"}`,
                      background: activeBenchmarks.has(b.id) ? `${b.color}15` : "transparent",
                      color: activeBenchmarks.has(b.id) ? b.color : C.muted,
                      fontSize: 12, fontWeight: activeBenchmarks.has(b.id) ? 700 : 500,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    }}>{b.label}</button>
                  ))}
                  <button onClick={() => setInflationAdjusted(v => !v)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1px solid ${inflationAdjusted ? C.accent : "rgba(0,0,0,0.1)"}`,
                    background: inflationAdjusted ? `${C.accent}12` : "transparent",
                    color: inflationAdjusted ? C.accent : C.muted,
                    fontSize: 12, fontWeight: inflationAdjusted ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    marginLeft: 4,
                  }}>Inflation Adj.</button>
                </div>
              </div>

              {/* Analysis tabs */}
              <div style={{
                background: C.surface, borderRadius: 16, padding: "0 0 20px",
                border: `1px solid ${C.border}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
              }}>
                {/* Tab bar */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" }}>
                  {["overview", "projections", "strategies", "holdings", "risk", "insights", "compare"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: "11px 18px", border: "none", background: "transparent",
                      color: activeTab === tab ? C.accent : C.muted,
                      fontWeight: activeTab === tab ? 700 : 500,
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                      textTransform: "capitalize",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap"
                    }}>
                      {tab === "overview" ? "Overview" : tab === "projections" ? "Projections" : tab === "strategies" ? "Strategies" : tab === "holdings" ? "Holdings" : tab === "risk" ? "Risk" : tab === "insights" ? "Insights" : "Compare"}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "0 20px" }}>
                  {/* ── OVERVIEW TAB ── */}
                  {activeTab === "overview" && (
                    <div>
                      {/* Hero card */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{
                          background: analysis.absoluteReturn >= 0
                            ? "linear-gradient(135deg, rgba(0,192,135,0.06) 0%, rgba(94,92,230,0.04) 100%)"
                            : "linear-gradient(135deg, rgba(240,97,109,0.06) 0%, rgba(94,92,230,0.04) 100%)",
                          border: `1px solid ${analysis.absoluteReturn >= 0 ? "rgba(0,192,135,0.2)" : "rgba(240,97,109,0.2)"}`,
                          borderRadius: 16, padding: "28px 32px", textAlign: "center", marginBottom: 16,
                          boxShadow: `0 4px 24px ${analysis.absoluteReturn >= 0 ? "rgba(0,192,135,0.08)" : "rgba(240,97,109,0.08)"}`,
                        }}
                      >
                        <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                          Your investment journey
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>You invested</p>
                            <p style={{ color: C.text, fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
                              <AnimatedCounter value={analysis.totalInvested} />
                            </p>
                          </div>
                          <div style={{ fontSize: 24, color: C.muted, fontWeight: 300 }}>→</div>
                          <div>
                            <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>It became</p>
                            <p style={{
                              color: analysis.absoluteReturn >= 0 ? C.green : C.red,
                              fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
                            }}>
                              <AnimatedCounter value={analysis.currentValue} />
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                          <span style={{
                            padding: "5px 16px", borderRadius: 20,
                            background: analysis.absoluteReturn >= 0 ? "rgba(0,192,135,0.1)" : "rgba(240,97,109,0.1)",
                            color: analysis.absoluteReturn >= 0 ? C.green : C.red,
                            fontSize: 14, fontWeight: 700,
                          }}>
                            {analysis.absoluteReturn >= 0 ? "+" : ""}{analysis.percentReturn?.toFixed(1)}% total return
                          </span>
                          <span style={{ color: C.muted, fontSize: 14 }}>·</span>
                          <span style={{ color: C.textSub, fontSize: 14, fontWeight: 600 }}>
                            {analysis.cagr}% CAGR
                          </span>
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
                            <MetricCard key={m.label} label={m.label} value={m.value} color={m.color} tooltip={m.tooltip} />
                          ))}
                        </div>
                      )}

                      {/* Missed Best Days */}
                      {missedDaysAnalysis && (
                        <div style={{ ...card, marginBottom: 16 }}>
                          <h4 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
                            What If You Missed the Best Days?
                          </h4>
                          <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
                            Missing just a few of the best market days dramatically reduces returns — the case for staying invested.
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

                      {/* Tax Impact */}
                      {taxAnalysis && (
                        <div style={{ ...card, marginBottom: 16 }}>
                          <h4 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
                            Tax Impact ({taxAnalysis.taxType})
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                            {[
                              { label: "Gross Gain", value: formatCurrency(taxAnalysis.grossGain), color: C.green },
                              { label: "Tax Amount", value: formatCurrency(taxAnalysis.taxAmount), color: C.red },
                              { label: "Net Gain", value: formatCurrency(taxAnalysis.netGain), color: taxAnalysis.netGain >= 0 ? C.green : C.red },
                              { label: "Net Return", value: `${taxAnalysis.netReturnPct >= 0 ? "+" : ""}${taxAnalysis.netReturnPct}%`, color: taxAnalysis.netReturnPct >= 0 ? C.green : C.red },
                            ].map(item => (
                              <div key={item.label} style={{ textAlign: "center", padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                                <p style={{ color: C.muted, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{item.label}</p>
                                <p style={{ color: item.color, fontSize: 16, fontWeight: 800 }}>{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PROJECTIONS TAB ── */}
                  {activeTab === "projections" && (
                    <MonteCarloProjections analysis={analysis} years={10} />
                  )}

                  {/* ── STRATEGIES TAB ── */}
                  {activeTab === "strategies" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ALL_STRATEGIES.map(strategy => {
                        const result = strategyResults.find(
                          r => r.strategyId === strategy.id || r.strategy === strategy.name
                        );
                        const isExpanded = expandedStrategy === strategy.id;
                        const sig = result?.signal ?? "HOLD";
                        const sigColor = sig === "BUY" ? C.green : sig === "SELL" ? C.red : C.muted;
                        const sigBg = sig === "BUY" ? `${C.green}18` : sig === "SELL" ? `${C.red}18` : "rgba(0,0,0,0.05)";

                        return (
                          <div
                            key={strategy.id}
                            style={{
                              background: C.surface,
                              border: isExpanded ? `1px solid ${C.accent}40` : `1px solid ${C.border}`,
                              borderRadius: 14,
                              boxShadow: isExpanded ? `0 4px 20px ${C.accent}18` : "0 1px 3px rgba(0,0,0,0.04)",
                              overflow: "hidden",
                              transition: "border 0.18s, box-shadow 0.18s",
                            }}
                          >
                            <button
                              onClick={() => setExpandedStrategy(isExpanded ? null : strategy.id)}
                              style={{
                                width: "100%", display: "flex", alignItems: "center",
                                gap: 10, padding: "13px 14px",
                                background: "transparent", border: "none",
                                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                              }}
                            >
                              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{strategy.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{strategy.name}</div>
                                <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{strategy.description}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                {result ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: sigBg, color: sigColor }}>
                                    {sig}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(0,0,0,0.05)", color: C.muted }}>—</span>
                                )}
                                <span style={{
                                  fontSize: 12, color: isExpanded ? C.accent : C.muted,
                                  transition: "transform 0.2s, color 0.2s", display: "inline-block",
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                }}>▾</span>
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
                                        Strategy data not available for this portfolio
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
                  )}

                  {/* ── HOLDINGS TAB ── */}
                  {activeTab === "holdings" && (
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
                                background: isActive ? `${C.accent}0D` : C.surface,
                                border: isActive ? `1px solid ${C.accent}40` : `1px solid ${C.border}`,
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
                        <div style={{ ...card, marginBottom: 16 }}>
                          <DrawdownChart data={analysis.drawdownSeries} />
                        </div>
                      )}
                      {analysis.correlationMatrix && analysis.correlationSymbols && (
                        <div style={{ ...card }}>
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

                  {/* ── INSIGHTS TAB ── */}
                  {activeTab === "insights" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {insights.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13 }}>
                          No insights available
                        </div>
                      ) : (
                        insights.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 14,
                              padding: "14px 16px", borderRadius: 12,
                              background: C.surface, border: `1px solid ${C.border}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                          >
                            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                            <p style={{ color: C.text, fontSize: 13, lineHeight: 1.65, fontWeight: 400 }}>
                              {item.text}
                            </p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── COMPARE TAB ── */}
                  {activeTab === "compare" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* DCA vs Lump Sum */}
                      {analysis.lumpSumComparison ? (
                        <div style={card}>
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
                                padding: "20px", borderRadius: 14,
                                background: s.highlight ? `${C.accent}08` : "rgba(0,0,0,0.02)",
                                border: `1px solid ${s.highlight ? C.accent + "30" : C.border}`,
                              }}>
                                <p style={{ color: s.highlight ? C.accent : C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{s.label}</p>
                                <p style={{ color: C.text, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{formatCurrency(s.value)}</p>
                                <div style={{ display: "flex", gap: 12 }}>
                                  <span style={{ color: s.ret >= 0 ? C.green : C.red, fontSize: 14, fontWeight: 700 }}>{s.ret >= 0 ? "+" : ""}{s.ret.toFixed(1)}%</span>
                                  <span style={{ color: C.muted, fontSize: 13 }}>{s.cagr}% CAGR</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const diff = analysis.currentValue - analysis.lumpSumComparison.currentValue;
                            return (
                              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: diff >= 0 ? `${C.green}08` : `${C.red}08`, border: `1px solid ${diff >= 0 ? C.green : C.red}25` }}>
                                <p style={{ color: diff >= 0 ? C.green : C.red, fontSize: 13, fontWeight: 700 }}>
                                  DCA {diff >= 0 ? "outperformed" : "underperformed"} lump sum by {formatCurrency(Math.abs(diff))}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13, ...card }}>
                          <Info style={{ width: 20, height: 20, color: C.muted, display: "block", margin: "0 auto 10px" }} />
                          Lump sum comparison data not available. Enable recurring investments and re-run to compare DCA vs lump sum.
                        </div>
                      )}

                      {/* Goal-Based SIP Calculator */}
                      <SIPCalculator formatCurrency={formatCurrency} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "16px 28px", marginTop: 24, textAlign: "center",
          background: "rgba(255,255,255,0.4)",
        }}>
          <p style={{ color: C.muted, fontSize: 11, fontWeight: 500 }}>
            WhatIfIInvested — Educational purpose only. Not financial advice.
          </p>
        </footer>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
        button:hover { opacity: 0.88; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
