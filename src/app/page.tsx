"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, TrendingDown, X, Plus, PieChart, Lightbulb, Newspaper, ArrowRight } from "lucide-react";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Asset, PortfolioAsset, PortfolioAnalysis, Strategy, NewsItem, SignalPoint } from "@/types";

const POPULAR_STOCKS: Asset[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", type: "stock", exchange: "NSE", currentPrice: 2950, priceChange: 25, priceChangePercent: 0.85, high52w: 3200, low52w: 2400 },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", type: "stock", exchange: "NSE", currentPrice: 4200, priceChange: -15, priceChangePercent: -0.36, high52w: 4500, low52w: 3500 },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", type: "stock", exchange: "NSE", currentPrice: 1680, priceChange: 42, priceChangePercent: 2.56, high52w: 1800, low52w: 1300 },
  { symbol: "INFY.NS", name: "Infosys", type: "stock", exchange: "NSE", currentPrice: 1900, priceChange: -8, priceChangePercent: -0.42, high52w: 2100, low52w: 1500 },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", type: "stock", exchange: "NSE", currentPrice: 1200, priceChange: 18, priceChangePercent: 1.52, high52w: 1300, low52w: 900 },
  { symbol: "SBIN.NS", name: "State Bank of India", type: "stock", exchange: "NSE", currentPrice: 820, priceChange: -5, priceChangePercent: -0.61, high52w: 900, low52w: 650 },
];

const POPULAR_ETFS: Asset[] = [
  { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", type: "etf", exchange: "NSE", currentPrice: 250, priceChange: 3.5, priceChangePercent: 1.42, high52w: 270, low52w: 210 },
  { symbol: "GOLDBEES.NS", name: "Gold ETF", type: "etf", exchange: "NSE", currentPrice: 58, priceChange: 0.8, priceChangePercent: 1.4, high52w: 62, low52w: 48 },
  { symbol: "SILVERBEES.NS", name: "Silver ETF", type: "etf", exchange: "NSE", currentPrice: 125, priceChange: -2, priceChangePercent: -1.57, high52w: 140, low52w: 95 },
  { symbol: "MON100.NS", name: "Motilal Oswal NASDAQ 100", type: "etf", exchange: "NSE", currentPrice: 850, priceChange: 12, priceChangePercent: 1.43, high52w: 920, low52w: 680 },
];

const POPULAR_MFS: Asset[] = [
  { symbol: "MF001", name: "HDFC Top 100 Fund", type: "mutual_fund", exchange: "MF", currentPrice: 850, priceChange: 5, priceChangePercent: 0.59, high52w: 900, low52w: 720 },
  { symbol: "MF002", name: "SBI Bluechip Fund", type: "mutual_fund", exchange: "MF", currentPrice: 72, priceChange: 0.4, priceChangePercent: 0.56, high52w: 76, low52w: 62 },
  { symbol: "MF003", name: "ICICI Prudential Bluechip", type: "mutual_fund", exchange: "MF", currentPrice: 78, priceChange: 0.6, priceChangePercent: 0.78, high52w: 82, low52w: 65 },
  { symbol: "MF004", name: "Mirae Asset Large Cap", type: "mutual_fund", exchange: "MF", currentPrice: 42, priceChange: 0.2, priceChangePercent: 0.48, high52w: 45, low52w: 35 },
];

export default function Home() {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [initialInvestment, setInitialInvestment] = useState(100000);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState(10000);
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState("2021-01-01");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("stocks");

  const searchAssets = async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    const allAssets = [...POPULAR_STOCKS, ...POPULAR_ETFS, ...POPULAR_MFS];
    const filtered = allAssets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const addAsset = (asset: Asset) => {
    if (selectedAssets.length >= 10) return;
    if (selectedAssets.find((a) => a.symbol === asset.symbol)) return;
    setSelectedAssets([...selectedAssets, asset]);
    setWeights((prev) => ({ ...prev, [asset.symbol]: Math.floor(100 / (selectedAssets.length + 1)) }));
  };

  const removeAsset = (symbol: string) => {
    setSelectedAssets(selectedAssets.filter((a) => a.symbol !== symbol));
    const newWeights = { ...weights };
    delete newWeights[symbol];
    setWeights(newWeights);
  };

  const analyzePortfolio = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: selectedAssets.map((a) => ({
            symbol: a.symbol,
            name: a.name,
            weight: weights[a.symbol] || Math.floor(100 / selectedAssets.length),
            initialInvestment: initialInvestment / selectedAssets.length,
            recurringAmount: isRecurring ? recurringAmount : 0,
            frequency: isRecurring ? frequency : null,
            startDate,
          })),
          initialInvestment,
          recurringAmount: isRecurring ? recurringAmount : 0,
          frequency: isRecurring ? frequency : null,
          startDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);

        if (selectedAssets.length > 0) {
          const strategiesRes = await fetch(`/api/strategies?symbol=${selectedAssets[0].symbol}`);
          if (strategiesRes.ok) {
            const strategyData = await strategiesRes.json();
            setStrategies(strategyData);
          }

          const newsRes = await fetch(`/api/news?symbol=${selectedAssets[0].symbol}&days=30`);
          if (newsRes.ok) {
            const newsData = await newsRes.json();
            setNews(newsData);
          }
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsLoading(false);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
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
            <span className="text-gradient">WealthBacktest</span>
          </motion.h1>
          <nav className="flex gap-6 text-text-secondary">
            <a href="#" className="hover:text-accent-primary transition-colors">Home</a>
            <a href="#" className="hover:text-accent-primary transition-colors">Strategies</a>
            <a href="#" className="hover:text-accent-primary transition-colors">About</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl font-bold font-sora mb-4">
            Time Travel Your <span className="text-gradient">Investments</span>
          </h2>
          <p className="text-text-secondary text-xl max-w-2xl mx-auto">
            Discover what your money could've earned in India's stock market. 
            Backtest strategies with real historical data.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <Input
                    placeholder="Search stocks, ETFs, funds..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchAssets(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="stocks" className="flex-1">Stocks</TabsTrigger>
                    <TabsTrigger value="etfs" className="flex-1">ETFs</TabsTrigger>
                    <TabsTrigger value="mfs" className="flex-1">MFs</TabsTrigger>
                  </TabsList>

                  <TabsContent value="stocks" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {POPULAR_STOCKS.map((asset) => (
                      <motion.button
                        key={asset.symbol}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addAsset(asset)}
                        className="w-full p-3 bg-background-tertiary rounded-lg text-left hover:border-accent-tertiary/50 border border-transparent transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{asset.symbol.replace(".NS", "")}</div>
                            <div className="text-xs text-text-muted">{asset.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{asset.currentPrice}</div>
                            <div className={`text-xs ${asset.priceChangePercent >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                              {asset.priceChangePercent >= 0 ? "+" : ""}{asset.priceChangePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </TabsContent>

                  <TabsContent value="etfs" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {POPULAR_ETFS.map((asset) => (
                      <motion.button
                        key={asset.symbol}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addAsset(asset)}
                        className="w-full p-3 bg-background-tertiary rounded-lg text-left hover:border-accent-tertiary/50 border border-transparent transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{asset.symbol.replace(".NS", "")}</div>
                            <div className="text-xs text-text-muted">{asset.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{asset.currentPrice}</div>
                            <div className={`text-xs ${asset.priceChangePercent >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                              {asset.priceChangePercent >= 0 ? "+" : ""}{asset.priceChangePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </TabsContent>

                  <TabsContent value="mfs" className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {POPULAR_MFS.map((asset) => (
                      <motion.button
                        key={asset.symbol}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addAsset(asset)}
                        className="w-full p-3 bg-background-tertiary rounded-lg text-left hover:border-accent-tertiary/50 border border-transparent transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{asset.symbol}</div>
                            <div className="text-xs text-text-muted">{asset.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{asset.currentPrice}</div>
                            <div className={`text-xs ${asset.priceChangePercent >= 0 ? "text-accent-primary" : "text-accent-secondary"}`}>
                              {asset.priceChangePercent >= 0 ? "+" : ""}{asset.priceChangePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </TabsContent>
                </Tabs>

                {selectedAssets.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-sm">Selected Assets</h4>
                      <button onClick={normalizeWeights} className="text-xs text-accent-tertiary hover:underline">
                        Normalize
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedAssets.map((asset) => (
                        <div key={asset.symbol} className="flex items-center justify-between p-2 bg-background-tertiary rounded-lg">
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeAsset(asset.symbol)} className="text-text-muted hover:text-accent-secondary">
                              <X className="w-4 h-4" />
                            </button>
                            <span className="text-sm">{asset.symbol.replace(".NS", "").replace("MF", "")}</span>
                          </div>
                          <input
                            type="number"
                            value={weights[asset.symbol] || 0}
                            onChange={(e) => setWeights({ ...weights, [asset.symbol]: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-background-secondary border border-border rounded px-2 py-1 text-sm text-right"
                            min={0}
                            max={100}
                          />
                          <span className="text-xs text-text-muted">%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-9"
          >
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Investment Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Initial Investment</label>
                    <Input
                      type="number"
                      value={initialInvestment}
                      onChange={(e) => setInitialInvestment(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Investment Timeline</label>
                    <div className="p-3 bg-background-tertiary rounded-lg text-center">
                      <span className="text-accent-primary font-medium">
                        {Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} Years
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 accent-accent-tertiary"
                    />
                    <span className="text-sm">Add Recurring Investment (SIP)</span>
                  </label>
                </div>

                {isRecurring && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4"
                  >
                    <div>
                      <label className="block text-sm text-text-secondary mb-2">SIP Amount</label>
                      <Input
                        type="number"
                        value={recurringAmount}
                        onChange={(e) => setRecurringAmount(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-2">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full h-11 bg-background-tertiary border border-border rounded-lg px-4 py-2 text-text-primary"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={analyzePortfolio}
                    disabled={selectedAssets.length === 0 || isLoading}
                    className="gap-2"
                  >
                    {isLoading ? "Analyzing..." : "Analyze Portfolio"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
                      <TrendingUp className="w-5 h-5" />
                      Performance Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.chartData && analysis.chartData.length > 0 && (
                      <PerformanceChart 
                        data={analysis.chartData} 
                        symbol={selectedAssets.map(a => a.symbol.replace(".NS", "")).join(", ")} 
                      />
                    )}
                  </CardContent>
                </Card>

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Strategy Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {strategies.map((strategy, idx) => (
                          <motion.div
                            key={strategy.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-4 bg-background-tertiary rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{strategy.icon} {strategy.name}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                strategy.signal === "BUY" ? "bg-accent-primary/20 text-accent-primary" :
                                strategy.signal === "SELL" ? "bg-accent-secondary/20 text-accent-secondary" :
                                "bg-text-muted/20 text-text-secondary"
                              }`}>
                                {strategy.signal}
                              </span>
                            </div>
                            <div className="text-xs text-text-secondary mb-2">
                              Entry: <span className="text-accent-primary">₹{strategy.entryPrice}</span> | 
                              Exit: <span className="text-accent-secondary">₹{strategy.exitPrice}</span> | 
                              Confidence: {strategy.probability}%
                            </div>
                            <p className="text-sm text-text-secondary">{strategy.reasoning}</p>
                          </motion.div>
                        ))}
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
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {news.map((item, idx) => (
                          <motion.a
                            key={idx}
                            href={item.url}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="block p-4 bg-background-tertiary rounded-lg hover:border-accent-tertiary/30 border border-transparent transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-2 h-2 rounded-full ${
                                item.sentiment === "positive" ? "bg-accent-primary" :
                                item.sentiment === "negative" ? "bg-accent-secondary" :
                                "bg-text-muted"
                              }`} />
                              <span className="text-xs text-text-muted">{item.source} • {item.date}</span>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                            <p className="text-xs text-text-secondary line-clamp-2">{item.description}</p>
                          </motion.a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-8 mt-12">
        <div className="max-w-7xl mx-auto text-center text-text-muted text-sm">
          <p>© 2026 WealthBacktest. Educational purpose only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
