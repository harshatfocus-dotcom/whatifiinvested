"use client";

import { useState, useCallback } from "react";
import type { Asset, PortfolioAsset, PortfolioAnalysis } from "@/types";

const POPULAR_ASSETS: Asset[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", type: "stock", exchange: "NSE", currentPrice: 2950, priceChange: 0, priceChangePercent: 0, high52w: 3200, low52w: 2400 },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", type: "stock", exchange: "NSE", currentPrice: 4200, priceChange: 0, priceChangePercent: 0, high52w: 4500, low52w: 3500 },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", type: "stock", exchange: "NSE", currentPrice: 1680, priceChange: 0, priceChangePercent: 0, high52w: 1800, low52w: 1300 },
  { symbol: "INFY.NS", name: "Infosys", type: "stock", exchange: "NSE", currentPrice: 1900, priceChange: 0, priceChangePercent: 0, high52w: 2100, low52w: 1500 },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", type: "stock", exchange: "NSE", currentPrice: 1200, priceChange: 0, priceChangePercent: 0, high52w: 1300, low52w: 900 },
  { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", type: "etf", exchange: "NSE", currentPrice: 250, priceChange: 0, priceChangePercent: 0, high52w: 270, low52w: 210 },
  { symbol: "GOLDBEES.NS", name: "Gold ETF", type: "etf", exchange: "NSE", currentPrice: 58, priceChange: 0, priceChangePercent: 0, high52w: 62, low52w: 48 },
  { symbol: "SBIETFNSGOLD.NS", name: "SBI Gold ETF", type: "etf", exchange: "NSE", currentPrice: 5800, priceChange: 0, priceChangePercent: 0, high52w: 6200, low52w: 4800 },
];

export function usePortfolio() {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [initialInvestment, setInitialInvestment] = useState<number>(100000);
  const [recurringInvestment, setRecurringInvestment] = useState<number>(10000);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState<string>("2021-01-01");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const searchAssets = useCallback(async (query: string): Promise<Asset[]> => {
    if (!query || query.length < 2) return [];
    
    const filtered = POPULAR_ASSETS.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
        asset.name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered;
  }, []);

  const addAsset = useCallback((asset: Asset) => {
    if (selectedAssets.length >= 10) return;
    if (selectedAssets.find((a) => a.symbol === asset.symbol)) return;
    
    setSelectedAssets((prev) => [...prev, asset]);
    setPortfolioAssets((prev) => [
      ...prev,
      {
        symbol: asset.symbol,
        name: asset.name,
        weight: Math.floor(100 / (prev.length + 1)),
        initialInvestment: initialInvestment / (prev.length + 1),
        recurringAmount: recurringInvestment,
        frequency: isRecurring ? frequency : null,
        startDate,
      },
    ]);
  }, [selectedAssets, initialInvestment, recurringInvestment, isRecurring, frequency, startDate]);

  const removeAsset = useCallback((symbol: string) => {
    setSelectedAssets((prev) => prev.filter((a) => a.symbol !== symbol));
    setPortfolioAssets((prev) => prev.filter((p) => p.symbol !== symbol));
  }, []);

  const updateWeight = useCallback((symbol: string, weight: number) => {
    setPortfolioAssets((prev) =>
      prev.map((p) => (p.symbol === symbol ? { ...p, weight } : p))
    );
  }, []);

  const analyzePortfolio = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: portfolioAssets,
          initialInvestment,
          recurringAmount: isRecurring ? recurringInvestment : 0,
          frequency: isRecurring ? frequency : null,
          startDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error("Portfolio analysis failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [portfolioAssets, initialInvestment, recurringInvestment, isRecurring, frequency, startDate]);

  return {
    selectedAssets,
    portfolioAssets,
    analysis,
    initialInvestment,
    recurringInvestment,
    isRecurring,
    frequency,
    startDate,
    isLoading,
    searchAssets,
    addAsset,
    removeAsset,
    updateWeight,
    setInitialInvestment,
    setRecurringInvestment,
    setIsRecurring,
    setFrequency,
    setStartDate,
    analyzePortfolio,
  };
}
