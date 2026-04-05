"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, ComposedChart, ReferenceDot, ReferenceLine,
} from "recharts";
import type { ChartDataPoint, SignalPoint, BenchmarkData } from "@/types";

// ── Major market events ────────────────────────────────────────────────────
const MARKET_EVENTS = [
  { date: "2020-03-23", label: "COVID", icon: "🦠", color: "#FF3B30", description: "Markets hit bottom, Nifty −38% in 5 weeks" },
  { date: "2021-10-18", label: "ATH",   icon: "🚀", color: "#34C759", description: "Nifty 50 bull market all-time high" },
  { date: "2022-02-24", label: "War",   icon: "⚠️",  color: "#FF3B30", description: "Russia–Ukraine war begins, markets sell off" },
  { date: "2022-06-15", label: "Fed",   icon: "📉",  color: "#FF9F0A", description: "Fed hikes 75bps — largest since 1994" },
  { date: "2023-03-10", label: "SVB",   icon: "🏦",  color: "#FF9F0A", description: "Silicon Valley Bank collapse" },
  { date: "2023-10-07", label: "Gaza",  icon: "⚠️",  color: "#FF3B30", description: "Middle East conflict escalation" },
  { date: "2024-06-04", label: "India Election", icon: "🗳️", color: "#5E5CE6", description: "Indian election results — Nifty swings 4%" },
];

interface PerformanceChartProps {
  data: ChartDataPoint[];
  symbol: string;
  signals?: SignalPoint[];
  showEvents?: boolean;
  height?: number;
  benchmarks?: BenchmarkData;
  activeBenchmarks?: Set<string>;
  inflationAdjusted?: boolean;
}

interface TooltipPayloadItem {
  payload?: ChartDataPoint;
}

interface ExtendedDataPoint extends ChartDataPoint {
  nifty?: number;
  gold?: number;
  fd?: number;
}

export function PerformanceChart({
  data,
  symbol,
  signals = [],
  showEvents = true,
  height = 360,
  benchmarks,
  activeBenchmarks = new Set(),
  inflationAdjusted = false,
}: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<string>("ALL");
  const [hoveredSignal, setHoveredSignal] = useState<SignalPoint | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<typeof MARKET_EVENTS[0] | null>(null);

  const filteredData = useMemo(() => {
    if (timeRange === "ALL") return data;
    const days: Record<string, number> = { "1D": 1, "7D": 7, "1M": 30, "6M": 180, "1Y": 365, "3Y": 1095 };
    const cutoff = days[timeRange] ?? data.length;
    return data.slice(-cutoff);
  }, [data, timeRange]);

  // Merge benchmark values into chart data points for rendering
  const chartDataWithBenchmarks = useMemo(() => {
    if (!benchmarks || activeBenchmarks.size === 0) return filteredData;
    const bmLookups: Record<string, Map<string, number>> = {};
    if (activeBenchmarks.has("nifty") && benchmarks.nifty)
      bmLookups.nifty = new Map(benchmarks.nifty.map(p => [p.date, p.value]));
    if (activeBenchmarks.has("gold") && benchmarks.gold)
      bmLookups.gold = new Map(benchmarks.gold.map(p => [p.date, p.value]));
    if (activeBenchmarks.has("fd") && benchmarks.fd)
      bmLookups.fd = new Map(benchmarks.fd.map(p => [p.date, p.value]));
    return filteredData.map(pt => ({
      ...pt,
      nifty: bmLookups.nifty?.get(pt.date),
      gold: bmLookups.gold?.get(pt.date),
      fd: bmLookups.fd?.get(pt.date),
    }));
  }, [filteredData, benchmarks, activeBenchmarks]);

  const visibleSignals = useMemo(() => {
    if (filteredData.length === 0) return signals;
    const firstDate = filteredData[0]?.date ?? "";
    return signals.filter(s => s.date >= firstDate);
  }, [signals, filteredData]);

  // Only show events that fall within the visible date range
  const visibleEvents = useMemo(() => {
    if (!showEvents || filteredData.length < 2) return [];
    const first = filteredData[0]?.date ?? "";
    const last = filteredData[filteredData.length - 1]?.date ?? "";
    return MARKET_EVENTS.filter(e => e.date >= first && e.date <= last);
  }, [filteredData, showEvents]);

  // Place signal/event dots on the portfolio value line
  const getPortfolioValueAt = (date: string): number => {
    const exact = filteredData.find(d => d.date === date);
    if (exact) return exact.value;
    let nearest: ChartDataPoint | null = null;
    let minDiff = Infinity;
    const ts = new Date(date).getTime();
    for (const pt of filteredData) {
      const diff = Math.abs(new Date(pt.date).getTime() - ts);
      if (diff < minDiff) { minDiff = diff; nearest = pt; }
    }
    return nearest?.value ?? 0;
  };

  const formatValue = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  const firstVal = filteredData[0]?.value ?? 0;
  const lastVal = filteredData[filteredData.length - 1]?.value ?? 0;
  const gainPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const isPositive = gainPct >= 0;

  const CustomTooltip = ({
    active, payload, label,
  }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const dp = payload[0]?.payload;
    const sig = signals.find(s => s.date === label);
    const nearEvent = visibleEvents.find(e => {
      const diff = Math.abs(new Date(e.date).getTime() - new Date(label ?? "").getTime());
      return diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
    });
    return (
      <div style={{
        background: "rgba(20, 20, 22, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)",
        minWidth: 220,
        color: "#FFFFFF",
      }}>
        <p style={{ color: "#A1A1A6", fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{formatDate(label ?? "")}</p>
        <p style={{ color: "#8E8CE6", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
          {formatValue(dp?.value || 0)}{inflationAdjusted ? " (real)" : ""}
        </p>
        <p style={{ color: "#A1A1A6", fontSize: 12 }}>Invested: {formatValue(dp?.invested || 0)}</p>
        {(dp as ExtendedDataPoint)?.nifty != null && <p style={{ color: "#FF9F0A", fontSize: 11, marginTop: 4 }}>Nifty 50: {formatValue((dp as ExtendedDataPoint).nifty!)}</p>}
        {(dp as ExtendedDataPoint)?.gold != null && <p style={{ color: "#B8860B", fontSize: 11 }}>Gold: {formatValue((dp as ExtendedDataPoint).gold!)}</p>}
        {(dp as ExtendedDataPoint)?.fd != null && <p style={{ color: "#34C759", fontSize: 11 }}>FD 6.5%: {formatValue((dp as ExtendedDataPoint).fd!)}</p>}
        {sig && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: sig.type === "entry" ? "#34C759" : "#FF3B30" }}>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>{sig.type === "entry" ? "● Entry Signal" : "● Exit Signal"}</p>
            {sig.strategy && <p style={{ color: "#A1A1A6" }}>{sig.strategy}</p>}
          </div>
        )}
        {nearEvent && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 11 }}>
            <p style={{ color: nearEvent.color, fontWeight: 700, marginBottom: 2 }}>{nearEvent.icon} {nearEvent.label}</p>
            <p style={{ color: "#6E6E73" }}>{nearEvent.description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#AEAEB2", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
            {symbol}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ color: "#1D1D1F", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {formatValue(lastVal)}
            </span>
            <span style={{ color: isPositive ? "#34C759" : "#FF3B30", fontSize: 14, fontWeight: 700 }}>
              {isPositive ? "+" : ""}{gainPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Time range */}
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: 3 }}>
          {["1M", "6M", "1Y", "3Y", "ALL"].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer",
              background: timeRange === r ? "#FFFFFF" : "transparent",
              color: timeRange === r ? "#5E5CE6" : "#AEAEB2",
              fontSize: 12, fontWeight: timeRange === r ? 700 : 500,
              fontFamily: "inherit", transition: "all 0.15s",
              boxShadow: timeRange === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Event legend (only visible ones) */}
      {visibleEvents.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {visibleEvents.map(e => (
            <div key={e.date}
              onMouseEnter={() => setHoveredEvent(e)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                background: `${e.color}10`,
                border: `1px solid ${e.color}30`,
                cursor: "default",
              }}>
              <span style={{ fontSize: 11 }}>{e.icon}</span>
              <span style={{ color: e.color, fontSize: 10, fontWeight: 700 }}>{e.label}</span>
            </div>
          ))}
          {hoveredEvent && (
            <span style={{ color: "#6E6E73", fontSize: 11, alignSelf: "center" }}>
              — {hoveredEvent.description}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ height, marginLeft: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartDataWithBenchmarks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="perfPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5E5CE6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#5E5CE6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="perfInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.toLocaleString("default", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
              }}
              stroke="transparent" tick={{ fill: "#AEAEB2", fontSize: 11 }}
              tickLine={false} axisLine={false} interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
              stroke="transparent" tick={{ fill: "#AEAEB2", fontSize: 11 }}
              tickLine={false} axisLine={false} width={48}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Market event vertical lines */}
            {visibleEvents.map(event => (
              <ReferenceLine
                key={event.date}
                x={event.date}
                stroke={event.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.6}
                label={{
                  value: event.icon,
                  position: "insideTopLeft",
                  fontSize: 11,
                  fill: event.color,
                  offset: 4,
                }}
              />
            ))}

            <Area
              type="basis" dataKey="value"
              stroke="#5E5CE6" strokeWidth={2.5}
              fillOpacity={1} fill="url(#perfPortfolioGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#5E5CE6", stroke: "rgba(94,92,230,0.25)", strokeWidth: 3 }}
            />
            <Area
              type="basis" dataKey="invested"
              stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="4 4"
              fillOpacity={1} fill="url(#perfInvestedGrad)"
              dot={false}
            />

            {/* Benchmark lines */}
            {activeBenchmarks.has("nifty") && benchmarks?.nifty && (
              <Area type="basis" dataKey="nifty" stroke="#FF9F0A" strokeWidth={1.5}
                strokeDasharray="5 3" fill="none" dot={false} name="Nifty 50" />
            )}
            {activeBenchmarks.has("gold") && benchmarks?.gold && (
              <Area type="basis" dataKey="gold" stroke="#B8860B" strokeWidth={1.5}
                strokeDasharray="5 3" fill="none" dot={false} name="Gold" />
            )}
            {activeBenchmarks.has("fd") && benchmarks?.fd && (
              <Area type="basis" dataKey="fd" stroke="#34C759" strokeWidth={1.5}
                strokeDasharray="3 4" fill="none" dot={false} name="FD 6.5%" />
            )}

            {/* Strategy signal dots */}
            {visibleSignals.map((sig, i) => (
              <ReferenceDot
                key={`${sig.date}-${i}`}
                x={sig.date}
                y={getPortfolioValueAt(sig.date)}
                r={7}
                fill={sig.type === "entry" ? "#34C759" : "#FF3B30"}
                stroke="#FFFFFF"
                strokeWidth={2.5}
                onClick={() => setHoveredSignal(hoveredSignal?.date === sig.date ? null : sig)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Signal popover */}
      {hoveredSignal && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 10, padding: "12px 16px", borderRadius: 14, fontSize: 12,
            background: hoveredSignal.type === "entry" ? "rgba(52,199,89,0.06)" : "rgba(255,59,48,0.06)",
            border: `1px solid ${hoveredSignal.type === "entry" ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: hoveredSignal.type === "entry" ? "#34C759" : "#FF3B30" }}>
              {hoveredSignal.type === "entry" ? "● Entry" : "● Exit"}{hoveredSignal.strategy ? ` — ${hoveredSignal.strategy}` : ""}
            </span>
            <button onClick={() => setHoveredSignal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#AEAEB2", fontSize: 12, fontFamily: "inherit" }}>✕</button>
          </div>
          <p style={{ color: "#6E6E73", fontSize: 11 }}>
            {formatDate(hoveredSignal.date)} · {formatValue(hoveredSignal.price)}
            {hoveredSignal.amount && ` · ${formatValue(hoveredSignal.amount)}`}
          </p>
          {hoveredSignal.reason && <p style={{ color: "#AEAEB2", marginTop: 4, fontSize: 11 }}>{hoveredSignal.reason}</p>}
        </motion.div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 3, background: "#5E5CE6", borderRadius: 2 }} />
          <span style={{ color: "#6E6E73", fontSize: 11, fontWeight: 500 }}>Portfolio Value</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 0, border: "1.5px dashed #8B5CF6", borderRadius: 2 }} />
          <span style={{ color: "#6E6E73", fontSize: 11, fontWeight: 500 }}>Total Invested</span>
        </div>
        {visibleSignals.some(s => s.type === "entry") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34C759" }} />
            <span style={{ color: "#6E6E73", fontSize: 11, fontWeight: 500 }}>Entry</span>
          </div>
        )}
        {visibleSignals.some(s => s.type === "exit") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF3B30" }} />
            <span style={{ color: "#6E6E73", fontSize: 11, fontWeight: 500 }}>Exit</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
