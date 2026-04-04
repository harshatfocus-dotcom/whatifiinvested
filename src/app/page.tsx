"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, PieChart, Lightbulb, Newspaper, Sparkles, BarChart3, RefreshCw, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PerformanceChart } from "@/components/charts/performance-chart";
import type { Asset, PortfolioAnalysis, NewsItem } from "@/types";

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
}

const ALL_STRATEGIES = [
  { id: "sma_crossover", name: "SMA Crossover", icon: "📈", description: "Buy when 50-day MA crosses above 200-day MA" },
  { id: "rsi", name: "RSI Indicator", icon: "📊", description: "Buy oversold (RSI<30), Sell overbought (RSI>70)" },
  { id: "macd", name: "MACD", icon: "⚡", description: "Trend momentum indicator" },
  { id: "bollinger", name: "Bollinger Bands", icon: "🎯", description: "Price volatility bands" },
  { id: "value", name: "Value Investing", icon: "💎", description: "Buy when P/E < 15 (undervalued)" },
  { id: "momentum", name: "Momentum", icon: "🚀", description: "Trend-following strategy" },
  { id: "dca", name: "Dollar Cost Averaging", icon: "💰", description: "Consistent periodic investments" },
  { id: "vwap", name: "VWAP", icon: "📉", description: "Volume Weighted Average Price" },
  { id: "moving_ribbon", name: "Moving Average Ribbon", icon: "🎗️", description: "Multiple moving averages" },
  { id: "rsr", name: "Relative Strength Ranking", icon: "🏆", description: "Rank assets by strength" },
];

interface StrategyResult {
  strategy: string;
  icon: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  exitPrice: number;
  reasoning: string;
  probability: number;
  graph?: { label: string; value: number }[];
}

interface AIInsight {
  type: "insight" | "benchmark" | "risk" | "explanation";
  title: string;
  content: string;
  icon: string;
}

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [activeStrategies, setActiveStrategies] = useState<string[]>(["sma_crossover", "rsi", "macd", "dca"]);
  const [allAssets, setAllAssets] = useState<AssetItem[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [assetsLoading, setAssetsLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setAssetsLoading(true);
    try {
      const response = await fetch("/api/assets/all?type=all");
      if (response.ok) {
        const data = await response.json();
        setAllAssets(data);
      }
    } catch (error) {
      console.error("Failed to load assets:", error);
    } finally {
      setAssetsLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    let filtered = allAssets;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(a => a.assetType === selectedCategory);
    }
    if (assetSearch) {
      const search = assetSearch.toLowerCase();
      filtered = filtered.filter(a => 
        a.symbol.toLowerCase().includes(search) || 
        a.name.toLowerCase().includes(search)
      );
    }
    return filtered.slice(0, 50);
  }, [allAssets, selectedCategory, assetSearch]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "stock": return "📈";
      case "etf": return "🎯";
      case "mutual_fund": return "💼";
      case "commodity": return "🥇";
      case "index": return "📊";
      case "crypto": return "₿";
      default: return "💰";
    }
  };

  const addAsset = (asset: AssetItem) => {
    if (selectedAssets.length >= 10) return;
    if (selectedAssets.find((a) => a.symbol === asset.symbol)) return;
    
    const assetToAdd: Asset = {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.assetType as Asset["type"],
      exchange: asset.assetType === "crypto" ? "CRYPTO" : asset.assetType === "commodity" ? "MCX" : "NSE",
      currentPrice: asset.currentPrice || 100,
      priceChange: asset.priceChange || 0,
      priceChangePercent: asset.priceChangePercent || 0,
      high52w: asset.high52w || 100,
      low52w: asset.low52w || 100,
    };
    
    const newAssets = [...selectedAssets, assetToAdd];
    setSelectedAssets(newAssets);
    const equalWeight = Math.floor(100 / newAssets.length);
    const newWeights: Record<string, number> = {};
    newAssets.forEach((a, i) => {
      newWeights[a.symbol] = i === newAssets.length - 1 ? 100 - (equalWeight * (newAssets.length - 1)) : equalWeight;
    });
    setWeights(newWeights);
    setStep(2);
  };

  const removeAsset = (symbol: string) => {
    setSelectedAssets(selectedAssets.filter((a) => a.symbol !== symbol));
    const newWeights = { ...weights };
    delete newWeights[symbol];
    setWeights(newWeights);
  };

  const runSimulation = async () => {
    setIsLoading(true);
    // Convert "YYYY-MM" month input to "YYYY-MM-01" full date
    const fullStartDate = startDate.length === 7 ? `${startDate}-01` : startDate;
    try {
      const requestBody = {
        assets: selectedAssets.map((a) => ({
          symbol: a.symbol,
          name: a.name,
          weight: weights[a.symbol] || Math.floor(100 / selectedAssets.length),
          initialInvestment: (initialInvestment * (weights[a.symbol] || 0)) / 100,
          recurringAmount: isRecurring ? recurringAmount : 0,
          frequency: isRecurring ? frequency : null,
          startDate: fullStartDate,
        })),
        initialInvestment,
        recurringAmount: isRecurring ? recurringAmount : 0,
        frequency: isRecurring ? frequency : null,
        startDate: fullStartDate,
      };

      // Run portfolio analysis + strategies + news in parallel
      const [portfolioRes, strategiesRes, newsRes] = await Promise.all([
        fetch("/api/portfolio/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }),
        fetch("/api/strategies/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets: selectedAssets,
            strategies: activeStrategies,
            startDate: fullStartDate,
          }),
        }),
        fetch(`/api/news?symbols=${selectedAssets.map(a => a.symbol).join(",")}&days=365`),
      ]);

      if (!portfolioRes.ok) {
        const errorText = await portfolioRes.text();
        console.error("Portfolio API Error:", errorText);
        setIsLoading(false);
        return;
      }

      const portfolioData = await portfolioRes.json();
      setAnalysis(portfolioData);
      generateAIInsights(portfolioData);

      if (strategiesRes.ok) {
        const strategyData = await strategiesRes.json();
        setStrategyResults(strategyData);
        // Collect all entry/exit signals from strategy backtests for the chart
        const allSignals: import("@/types").SignalPoint[] = [];
        for (const result of strategyData) {
          if (result.signals) allSignals.push(...result.signals);
        }
        // Deduplicate by date+type
        const seen = new Set<string>();
        const uniqueSignals = allSignals.filter((s) => {
          const key = `${s.date}:${s.type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setChartSignals(uniqueSignals);
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNews(newsData);
      }

      setStep(3);
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIInsights = async (data: PortfolioAnalysis) => {
    setAiLoading(true);
    
    // Timeout after 10 seconds
    const timeoutId = setTimeout(() => {
      setAiLoading(false);
    }, 10000);
    
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: data,
          assets: selectedAssets,
          startDate,
        }),
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const insights = await response.json();
        setAiInsights(insights);
      }
    } catch (error) {
      console.error("AI insights failed:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const askAI = async () => {
    if (!userQuestion.trim()) return;
    setAiLoading(true);
    
    // Timeout after 10 seconds
    const timeoutId = setTimeout(() => {
      setAiResponse("I apologize, but I couldn't process your question at the moment. Please try again.");
      setAiLoading(false);
    }, 10000);
    
    try {
      const controller = new AbortController();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuestion,
          portfolio: analysis,
          assets: selectedAssets,
          strategies: strategyResults,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.response);
      } else {
        setAiResponse("I apologize, but I couldn't process your question at the moment. Please try again.");
      }
    } catch {
      clearTimeout(timeoutId);
      setAiResponse("I apologize, but I couldn't process your question at the moment. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const normalizeWeights = () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total === 0) return;
    const newWeights: Record<string, number> = {};
    selectedAssets.forEach((a) => {
      newWeights[a.symbol] = Math.round((weights[a.symbol] / total) * 100);
    });
    setWeights(newWeights);
  };

  const weightTotal = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightTotal - 100) <= 2;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleStrategy = (id: string) => {
    setActiveStrategies(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold font-sora"
          >
            <span className="text-gradient">WhatIfIInvested</span>
          </motion.h1>
          <div className="flex items-center gap-4">
            <span className="text-text-secondary text-sm">Stop wondering. Start investing.</span>
            <div className="flex gap-2">
              {step >= 1 && (
                <span className={`px-3 py-1 rounded-full text-xs ${step === 1 ? "bg-accent-tertiary text-white" : "bg-accent-primary/20 text-accent-primary"}`}>
                  1. Pick Assets
                </span>
              )}
              {step >= 2 && (
                <span className={`px-3 py-1 rounded-full text-xs ${step === 2 ? "bg-accent-tertiary text-white" : "bg-accent-primary/20 text-accent-primary"}`}>
                  2. Define Strategy
                </span>
              )}
              {step >= 3 && (
                <span className={`px-3 py-1 rounded-full text-xs ${step === 3 ? "bg-accent-tertiary text-white" : "bg-accent-primary/20 text-accent-primary"}`}>
                  3. Results
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold font-sora mb-3">
                  Add assets to build your <span className="text-gradient">basket</span>
                </h2>
                <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                  Select up to 10 assets from Indian markets - Stocks, ETFs, Mutual Funds, Commodities, Crypto & more
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                  { id: "all", icon: "🌐", label: "All Assets" },
                  { id: "stock", icon: "📈", label: "Stocks (50)" },
                  { id: "etf", icon: "🎯", label: "ETFs" },
                  { id: "mutual_fund", icon: "💼", label: "MFs" },
                  { id: "commodity", icon: "🥇", label: "Commodities" },
                  { id: "crypto", icon: "₿", label: "Crypto" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedCategory === cat.id
                        ? "bg-accent-tertiary text-white"
                        : "bg-background-tertiary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="text-xl mb-1">{cat.icon}</div>
                    <div className="text-xs font-medium">{cat.label}</div>
                  </button>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Search Assets</span>
                    <span className="text-text-muted text-sm">{selectedAssets.length}/10 selected</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <Input
                      placeholder="Search by name or symbol..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {assetsLoading ? (
                    <div className="text-center py-8 text-text-muted">Loading assets...</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
                      {filteredAssets.map((asset) => {
                        const isSelected = selectedAssets.find(a => a.symbol === asset.symbol);
                        return (
                          <motion.button
                            key={asset.symbol}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => isSelected ? removeAsset(asset.symbol) : addAsset(asset)}
                            className={`p-3 rounded-xl text-left transition-all border ${
                              isSelected 
                                ? "bg-accent-tertiary/20 border-accent-tertiary" 
                                : "bg-background-tertiary border-transparent hover:border-accent-tertiary/50"
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <span>{getAssetIcon(asset.assetType)}</span>
                              <div className="font-medium text-sm truncate">{asset.symbol.replace(".NS", "").replace("-USD", "")}</div>
                            </div>
                            <div className="text-xs text-text-muted truncate">{asset.name}</div>
                            <div className="text-xs text-text-muted mt-1">{asset.category || asset.sector || asset.assetType}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold font-sora mb-3">
                  Define your <span className="text-gradient">strategy</span>
                </h2>
                <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                  Set your investment amounts and let the simulation run
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Basket ({selectedAssets.length} assets)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      {selectedAssets.map((asset) => (
                        <div key={asset.symbol} className="flex items-center justify-between p-3 bg-background-tertiary rounded-lg">
                          <div className="flex items-center gap-3">
                            <button onClick={() => removeAsset(asset.symbol)} className="text-text-muted hover:text-accent-secondary">
                              <X className="w-4 h-4" />
                            </button>
                            <div>
                              <div className="font-medium">{asset.symbol.replace(".NS", "").replace("MF", "")}</div>
                              <div className="text-xs text-text-muted">{asset.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={weights[asset.symbol] || 0}
                              onChange={(e) => setWeights({ ...weights, [asset.symbol]: parseInt(e.target.value) || 0 })}
                              className="w-16 bg-background-secondary border border-border rounded px-2 py-1 text-sm text-right"
                              min={0}
                              max={100}
                            />
                            <span className="text-sm text-text-muted">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={normalizeWeights} className="text-sm text-accent-tertiary hover:underline">
                      ↻ Normalize to 100%
                    </button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contribution Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm text-text-secondary mb-2">INITIAL BUY</label>
                        <Input
                          type="number"
                          value={initialInvestment}
                          onChange={(e) => setInitialInvestment(parseInt(e.target.value) || 0)}
                          className="text-lg font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-background-tertiary rounded-xl">
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                          className="w-5 h-5 accent-accent-tertiary"
                        />
                        <div className="flex-1">
                          <label className="font-medium">RECURRING</label>
                          <p className="text-xs text-text-muted">Dollar Cost Averaging</p>
                        </div>
                      </div>

                      {isRecurring && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                          <div>
                            <label className="block text-sm text-text-secondary mb-2">Amount</label>
                            <Input
                              type="number"
                              value={recurringAmount}
                              onChange={(e) => setRecurringAmount(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-text-secondary mb-2">Frequency</label>
                            <div className="flex gap-2">
                              {["weekly", "monthly", "quarterly", "yearly"].map((freq) => (
                                <button
                                  key={freq}
                                  onClick={() => setFrequency(freq)}
                                  className={`flex-1 py-2 px-3 rounded-lg text-sm capitalize transition-all ${
                                    frequency === freq 
                                      ? "bg-accent-tertiary text-white" 
                                      : "bg-background-tertiary text-text-secondary hover:text-text-primary"
                                  }`}
                                >
                                  {freq}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-sm text-text-secondary mb-2">Start Month/Year</label>
                        <Input
                          type="month"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={new Date().toISOString().slice(0, 7)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Active Strategies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {ALL_STRATEGIES.map((strategy) => (
                        <button
                          key={strategy.id}
                          onClick={() => toggleStrategy(strategy.id)}
                          className={`p-3 rounded-xl text-center transition-all ${
                            activeStrategies.includes(strategy.id)
                              ? "bg-accent-tertiary/20 border-accent-tertiary"
                              : "bg-background-tertiary border-transparent"
                          }`}
                        >
                          <div className="text-xl mb-1">{strategy.icon}</div>
                          <div className="text-xs font-medium">{strategy.name}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  {!weightsValid && weightTotal > 0 && (
                    <div className="mb-3 px-4 py-2 bg-accent-secondary/10 border border-accent-secondary/40 rounded-xl text-sm text-accent-secondary">
                      ⚠️ Weights sum to {weightTotal}% — must equal 100%. Click &quot;Normalize to 100%&quot; to fix.
                    </div>
                  )}
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      ← Back
                    </Button>
                    <Button
                      onClick={runSimulation}
                      disabled={isLoading || (!weightsValid && selectedAssets.length > 0)}
                      className="flex-1 gap-2 text-lg py-6"
                    >
                      {isLoading ? "Running Simulation..." : "Run Simulation →"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && analysis && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-bold font-sora">
                    Portfolio <span className="text-gradient">Results</span>
                  </h2>
                  <p className="text-text-secondary">
                    {selectedAssets.length} assets • Started {startDate} • {analysis.totalInvested > 0 ? formatCurrency(analysis.totalInvested) : "N/A"} invested
                  </p>
                </div>
                <Button variant="outline" onClick={() => { setStep(1); setAnalysis(null); }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Simulation
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-background-tertiary">
                  <div className="text-text-secondary text-sm">Total Invested</div>
                  <div className="text-2xl font-bold font-sora mt-1">{formatCurrency(analysis.totalInvested)}</div>
                </Card>
                <Card className="bg-background-tertiary">
                  <div className="text-text-secondary text-sm">Current Value</div>
                  <div className="text-2xl font-bold font-sora mt-1 text-accent-primary">{formatCurrency(analysis.currentValue)}</div>
                </Card>
                <Card className="bg-background-tertiary">
                  <div className="text-text-secondary text-sm">Absolute Return</div>
                  <div className={`text-2xl font-bold font-sora mt-1 ${analysis.absoluteReturn >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                    {analysis.absoluteReturn >= 0 ? "+" : ""}{formatCurrency(analysis.absoluteReturn)}
                  </div>
                </Card>
                <Card className="bg-background-tertiary">
                  <div className="text-text-secondary text-sm">CAGR</div>
                  <div className={`text-2xl font-bold font-sora mt-1 ${analysis.cagr >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                    {analysis.cagr >= 0 ? "+" : ""}{analysis.cagr}%
                  </div>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Watch the whole portfolio evolve over time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.chartData && analysis.chartData.length > 0 && (
                    <PerformanceChart
                      data={analysis.chartData}
                      symbol={selectedAssets.map(a => a.symbol.replace(".NS", "")).join(", ")}
                      signals={chartSignals}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Strategy Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {strategyResults.map((result, idx) => (
                        <motion.div
                          key={result.strategy}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 bg-background-tertiary rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium flex items-center gap-2">
                              <span>{result.icon}</span> {result.strategy}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.signal === "BUY" ? "bg-accent-primary/20 text-accent-primary" :
                              result.signal === "SELL" ? "bg-accent-secondary/20 text-accent-secondary" :
                              "bg-text-muted/20 text-text-secondary"
                            }`}>
                              {result.signal}
                            </span>
                          </div>
                          {result.graph && result.graph.length > 0 && (
                            <div className="h-16 mb-3 flex items-end gap-1">
                              {result.graph.map((g, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-t ${g.value > 50 ? "bg-accent-primary/60" : "bg-accent-secondary/60"}`}
                                  style={{ height: `${Math.min(100, g.value)}%` }}
                                />
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-text-secondary mb-2">
                            Entry: <span className="text-accent-primary">₹{result.entryPrice}</span> | 
                            Exit: <span className="text-accent-secondary">₹{result.exitPrice}</span> | 
                            Confidence: {result.probability}%
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{result.reasoning}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent-tertiary" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-accent-tertiary" />
                      </div>
                    ) : aiInsights.length > 0 ? (
                      <div className="space-y-3">
                        {aiInsights.map((insight, idx) => (
                          <div key={idx} className="p-3 bg-background-tertiary rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{insight.icon}</span>
                              <span className="font-medium text-sm">{insight.title}</span>
                            </div>
                            <p className="text-xs text-text-secondary">{insight.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted text-sm text-center py-4">No insights available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Ask AI about your portfolio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Input
                        placeholder="Ask anything about your portfolio..."
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && askAI()}
                      />
                      <Button onClick={askAI} disabled={aiLoading || !userQuestion.trim()} className="w-full">
                        {aiLoading ? "Thinking..." : "Ask AI"}
                      </Button>
                      {aiResponse && (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          className="p-4 bg-background-tertiary rounded-lg"
                        >
                          <p className="text-sm text-text-secondary whitespace-pre-wrap">{aiResponse}</p>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="w-5 h-5" />
                      Latest News
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {news.map((item, idx) => (
                        <div key={idx} className="p-3 bg-background-tertiary rounded-lg hover:border-accent-tertiary/30 border border-transparent transition-all">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              item.sentiment === "positive" ? "bg-accent-primary" :
                              item.sentiment === "negative" ? "bg-accent-secondary" : "bg-text-muted"
                            }`} />
                            <span className="text-xs text-text-muted">{item.source} • {item.date}</span>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                          <p className="text-xs text-text-secondary line-clamp-2">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Holdings Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 text-text-secondary text-sm font-medium">Asset</th>
                          <th className="text-right py-3 text-text-secondary text-sm font-medium">Qty</th>
                          <th className="text-right py-3 text-text-secondary text-sm font-medium">Avg Buy</th>
                          <th className="text-right py-3 text-text-secondary text-sm font-medium">Current</th>
                          <th className="text-right py-3 text-text-secondary text-sm font-medium">Value</th>
                          <th className="text-right py-3 text-text-secondary text-sm font-medium">Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.holdings.map((holding) => (
                          <tr key={holding.symbol} className="border-b border-border/50">
                            <td className="py-3 font-medium">{holding.symbol}</td>
                            <td className="text-right py-3">{holding.quantity.toFixed(2)}</td>
                            <td className="text-right py-3">₹{holding.avgBuyPrice.toFixed(2)}</td>
                            <td className="text-right py-3">₹{holding.currentPrice}</td>
                            <td className="text-right py-3">{formatCurrency(holding.currentValue)}</td>
                            <td className={`text-right py-3 font-medium ${holding.returnPercent >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                              {holding.returnPercent >= 0 ? "+" : ""}{holding.returnPercent.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border px-6 py-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gradient font-semibold mb-2">WhatIfIInvested</p>
          <p className="text-text-muted text-sm">Educational purpose only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
