"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { DrawdownPoint } from "@/types";

interface DrawdownChartProps {
  data: DrawdownPoint[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const dd = payload[0]?.value ?? 0;
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 10,
      padding: "8px 12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      fontSize: 12,
    }}>
      <p style={{ color: "#AEAEB2", marginBottom: 3 }}>
        {label ? new Date(label).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}
      </p>
      <p style={{ color: dd < -10 ? "#FF3B30" : dd < -5 ? "#FF9F0A" : "#34C759", fontWeight: 700 }}>
        {dd === 0 ? "At peak" : `${dd.toFixed(1)}% below peak`}
      </p>
    </div>
  );
};

export function DrawdownChart({ data }: DrawdownChartProps) {
  const [timeRange, setTimeRange] = useState<string>("ALL");

  const filteredData = useMemo(() => {
    if (timeRange === "ALL") return data;
    const days: Record<string, number> = { "1Y": 365, "2Y": 730, "3Y": 1095 };
    return data.slice(-Math.min(days[timeRange] ?? data.length, data.length));
  }, [data, timeRange]);

  const minDrawdown = useMemo(
    () => Math.min(...filteredData.map(d => d.drawdown), 0),
    [filteredData]
  );

  if (!data || data.length < 5) return null;

  const domainMin = Math.floor(minDrawdown * 1.15);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h4 style={{ color: "#1D1D1F", fontSize: 15, fontWeight: 700, marginBottom: 2, fontFamily: "Sora, sans-serif" }}>
            Drawdown — The Pain Periods
          </h4>
          <p style={{ color: "#AEAEB2", fontSize: 12 }}>
            How far the portfolio fell below its previous peak at each point
          </p>
        </div>
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: 3 }}>
          {["1Y", "2Y", "3Y", "ALL"].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: "4px 10px", borderRadius: 7, border: "none", cursor: "pointer",
              background: timeRange === r ? "#FFFFFF" : "transparent",
              color: timeRange === r ? "#FF3B30" : "#AEAEB2",
              fontSize: 11, fontWeight: timeRange === r ? 700 : 500,
              fontFamily: "inherit", transition: "all 0.15s",
              boxShadow: timeRange === r ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Max drawdown callout */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
        padding: "10px 14px",
        background: "rgba(255,59,48,0.05)",
        border: "1px solid rgba(255,59,48,0.15)",
        borderRadius: 12,
      }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: "#FF3B30", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {Math.abs(minDrawdown).toFixed(1)}%
          </div>
          <div style={{ color: "#AEAEB2", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Max Drawdown</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,59,48,0.2)" }} />
        <p style={{ color: "#6E6E73", fontSize: 12, lineHeight: 1.5 }}>
          At its worst point, the portfolio fell{" "}
          <strong style={{ color: "#FF3B30" }}>{Math.abs(minDrawdown).toFixed(1)}%</strong>{" "}
          below its peak. This is the emotional cost of staying invested — could you have held through it?
        </p>
      </div>

      {/* Chart */}
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FF3B30" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.toLocaleString("default", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
              }}
              stroke="transparent" tick={{ fill: "#AEAEB2", fontSize: 10 }}
              tickLine={false} axisLine={false} interval="preserveStartEnd"
            />
            <YAxis
              domain={[domainMin, 0]}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              stroke="transparent" tick={{ fill: "#AEAEB2", fontSize: 10 }}
              tickLine={false} axisLine={false} width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
            {/* Threshold bands */}
            {domainMin < -10 && (
              <ReferenceLine y={-10} stroke="rgba(255,159,10,0.4)" strokeWidth={1}
                strokeDasharray="3 3"
                label={{ value: "-10%", position: "insideRight", fontSize: 9, fill: "#FF9F0A" }} />
            )}
            {domainMin < -25 && (
              <ReferenceLine y={-25} stroke="rgba(255,59,48,0.4)" strokeWidth={1}
                strokeDasharray="3 3"
                label={{ value: "-25%", position: "insideRight", fontSize: 9, fill: "#FF3B30" }} />
            )}
            <Area
              type="monotone" dataKey="drawdown"
              stroke="#FF3B30" strokeWidth={1.5}
              fill="url(#ddGrad)" dot={false}
              activeDot={{ r: 4, fill: "#FF3B30", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
