import { NextResponse } from "next/server";
import { getHistoricalPrices } from "@/lib/data/market-data";
import { computeRiskMetrics } from "@/lib/analytics/risk-metrics";

interface AIInsight {
  type: "insight" | "benchmark" | "risk" | "explanation";
  title: string;
  content: string;
  icon: string;
}

interface PortfolioData {
  totalInvested?: number;
  currentValue?: number;
  percentReturn?: number;
  cagr?: number;
  bestPerformer?: { symbol: string; returnPercent: number };
  holdings?: Array<{ symbol: string; returnPercent: number }>;
}

interface AssetData {
  symbol: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { portfolio, assets, startDate } = body as {
      portfolio?: PortfolioData;
      assets?: AssetData[];
      startDate?: string;
    };

    const start = startDate || "2021-01-01";
    const end = new Date();
    const startDt = new Date(start);
    const years = Math.max(0.1, (end.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24 * 365));

    // Fetch historical prices for the primary asset to compute real risk metrics
    const primarySymbol = assets?.[0]?.symbol;
    let riskMetrics = { maxDrawdown: 0, volatility: 0, sharpeRatio: 0, totalReturn: 0, cagr: 0 };

    if (primarySymbol) {
      const prices = await getHistoricalPrices(primarySymbol, start);
      if (prices.length >= 20) {
        riskMetrics = computeRiskMetrics(
          prices,
          portfolio?.totalInvested ?? 100000,
          portfolio?.currentValue ?? 100000,
          years
        );
      }
    }

    const totalInvested = portfolio?.totalInvested ?? 0;
    const currentValue = portfolio?.currentValue ?? 0;
    const percentReturn = portfolio?.percentReturn ?? 0;
    const cagr = portfolio?.cagr ?? riskMetrics.cagr;

    // Nifty 50 average CAGR benchmark (~12% historically)
    const niftyBenchmarkCAGR = 12;
    const outperformed = cagr > niftyBenchmarkCAGR;
    const diff = Math.abs(cagr - niftyBenchmarkCAGR).toFixed(1);

    const insights: AIInsight[] = [
      {
        type: "insight",
        title: "Portfolio Growth",
        content: `Your ₹${totalInvested.toLocaleString()} investment is now worth ₹${currentValue.toLocaleString()}, a ${percentReturn.toFixed(1)}% return. CAGR of ${cagr.toFixed(1)}% shows ${cagr > 15 ? "exceptional" : cagr > 10 ? "solid" : "moderate"} compounding.`,
        icon: "📈",
      },
      {
        type: "benchmark",
        title: "vs Nifty 50",
        content: `Your portfolio ${outperformed ? "outperformed" : "underperformed"} the Nifty 50 by ${diff}% CAGR. The index returned ~${niftyBenchmarkCAGR}% CAGR over the same period. ${outperformed ? "Great stock selection!" : "Consider adding index funds for stability."}`,
        icon: "🎯",
      },
      {
        type: "risk",
        title: "Risk Analysis",
        content: `Max drawdown: ${riskMetrics.maxDrawdown.toFixed(1)}%. Annual volatility: ${riskMetrics.volatility.toFixed(1)}%. Sharpe ratio: ${riskMetrics.sharpeRatio.toFixed(2)} (${riskMetrics.sharpeRatio > 1 ? "excellent" : riskMetrics.sharpeRatio > 0.5 ? "good" : "needs improvement"} risk-adjusted returns).`,
        icon: "⚠️",
      },
      {
        type: "explanation",
        title: "Strategy Insight",
        content: percentReturn > 0
          ? `Your portfolio grew by ${percentReturn.toFixed(1)}%. Dollar cost averaging reduced your average purchase price during dips, helping you accumulate more units when markets were lower.`
          : `Markets have been challenging. During corrections, DCA actually works in your favor — you buy more units at lower prices, positioning for recovery.`,
        icon: "💡",
      },
      {
        type: "insight",
        title: "Best Performer",
        content: portfolio?.bestPerformer
          ? `${portfolio.bestPerformer.symbol.replace(".NS", "")} was your top performer with +${portfolio.bestPerformer.returnPercent.toFixed(1)}% return, demonstrating the power of concentrated quality positions.`
          : `Your selected assets show diversification across market sectors.`,
        icon: "🏆",
      },
      {
        type: "risk",
        title: "Diversification Score",
        content: (assets?.length ?? 0) >= 5
          ? `With ${assets?.length} assets, you have ${(assets?.length ?? 0) >= 8 ? "excellent" : "good"} diversification. Your portfolio spans multiple sectors, reducing single-stock risk.`
          : `With ${assets?.length ?? 0} assets, diversification is limited. Adding 3-4 uncorrelated assets (e.g., Gold ETF, IT sector, FMCG) can reduce volatility by 20-30%.`,
        icon: "🛡️",
      },
    ];

    return NextResponse.json(insights);
  } catch (error) {
    console.error("AI insights error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
