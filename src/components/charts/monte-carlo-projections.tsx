import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PortfolioAnalysis } from "@/types";

interface Props {
  analysis: PortfolioAnalysis;
  years?: number;
}

const Z_90 = 1.2815;
const Z_10 = -1.2815;

export function MonteCarloProjections({ analysis, years = 10 }: Props) {
  const data = useMemo(() => {
    // Basic inputs
    const S0 = analysis.currentValue;
    const cagr = analysis.cagr / 100;
    const vol = (analysis.riskMetrics?.volatility ?? 15) / 100;

    // Geometric Brownian Motion drift terms
    const mu = Math.log(1 + cagr);
    const drift = mu - 0.5 * Math.pow(vol, 2);

    const points = [];
    const currentYear = new Date().getFullYear();

    for (let t = 0; t <= years; t++) {
      if (t === 0) {
        points.push({ year: currentYear.toString(), median: S0, bull: S0, bear: S0, range: [S0, S0] });
        continue;
      }

      // Compute percentiles for year t
      const medianPath = S0 * Math.exp(drift * t); // Z = 0
      const bullPath = S0 * Math.exp(drift * t + vol * Math.sqrt(t) * Z_90);
      const bearPath = S0 * Math.exp(drift * t + vol * Math.sqrt(t) * Z_10);

      points.push({
        year: (currentYear + t).toString(),
        median: Math.round(medianPath),
        bull: Math.round(bullPath),
        bear: Math.round(bearPath),
        range: [Math.round(bearPath), Math.round(bullPath)]
      });
    }
    return points;
  }, [analysis, years]);

  const lastPoint = data[data.length - 1];

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 20, padding: 24, boxShadow: "0 4px 40px rgba(0,0,0,0.03)" }}>
      <h4 style={{ color: "#1D1D1F", fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
        Future Wealth Projections (10 Years)
      </h4>
      <p style={{ color: "#A1A1A6", fontSize: 12, marginBottom: 24 }}>
        Based on historical volatility of {analysis.riskMetrics?.volatility}% and {analysis.cagr}% CAGR. 80% confidence interval.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
        <div style={{ padding: "16px", borderRadius: 14, background: "rgba(52, 199, 89, 0.06)", border: "1px solid rgba(52, 199, 89, 0.15)" }}>
          <p style={{ color: "#00C853", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Bull Market (Top 10%)</p>
          <p style={{ color: "#1D1D1F", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>₹{(lastPoint.bull / 100000).toFixed(1)}L</p>
        </div>
        <div style={{ padding: "16px", borderRadius: 14, background: "rgba(94, 92, 230, 0.06)", border: "1px solid rgba(94, 92, 230, 0.15)" }}>
          <p style={{ color: "#5E5CE6", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Expected (Median)</p>
          <p style={{ color: "#1D1D1F", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>₹{(lastPoint.median / 100000).toFixed(1)}L</p>
        </div>
        <div style={{ padding: "16px", borderRadius: 14, background: "rgba(255, 59, 48, 0.06)", border: "1px solid rgba(255, 59, 48, 0.15)" }}>
          <p style={{ color: "#FF3B30", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Bear Market (Bottom 10%)</p>
          <p style={{ color: "#1D1D1F", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>₹{(lastPoint.bear / 100000).toFixed(1)}L</p>
        </div>
      </div>

      <div style={{ height: 340, marginLeft: -10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="coneGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5E5CE6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#5E5CE6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
            <XAxis dataKey="year" stroke="transparent" tick={{ fill: "#A1A1A6", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} stroke="transparent" tick={{ fill: "#A1A1A6", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div style={{
                      background: "rgba(20, 20, 22, 0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 20px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)",
                      minWidth: 200, color: "#FFFFFF",
                    }}>
                      <p style={{ color: "#A1A1A6", fontSize: 11, marginBottom: 8, fontWeight: 500 }}>Year {label}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#00C853", fontSize: 12, fontWeight: 600 }}>Bull (90th)</span>
                        <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>₹{p.bull.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#8E8CE6", fontSize: 12, fontWeight: 600 }}>Expected</span>
                        <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>₹{p.median.toLocaleString("en-IN")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#FF3B30", fontSize: 12, fontWeight: 600 }}>Bear (10th)</span>
                        <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>₹{p.bear.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* The shaded cone area between bear and bull */}
            <Area
              type="monotone"
              dataKey="range"
              stroke="none"
              fill="url(#coneGlow)"
              activeDot={false}
            />
            {/* Central expected path */}
            <Area
              type="monotone"
              dataKey="median"
              stroke="#5E5CE6"
              strokeWidth={3}
              fill="none"
              activeDot={{ r: 6, fill: "#5E5CE6", stroke: "rgba(94,92,230,0.25)", strokeWidth: 4 }}
            />
            <Area type="monotone" dataKey="bull" stroke="#00C853" strokeWidth={1} strokeDasharray="3 3" fill="none" activeDot={false} />
            <Area type="monotone" dataKey="bear" stroke="#FF3B30" strokeWidth={1} strokeDasharray="3 3" fill="none" activeDot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
