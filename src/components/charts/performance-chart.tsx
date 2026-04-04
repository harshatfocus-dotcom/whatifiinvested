"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceDot,
} from "recharts";
import type { ChartDataPoint, SignalPoint } from "@/types";

interface PerformanceChartProps {
  data: ChartDataPoint[];
  symbol: string;
  signals?: SignalPoint[];
}

interface TooltipPayloadItem {
  payload?: ChartDataPoint;
}

export function PerformanceChart({ data, symbol, signals = [] }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<string>("ALL");
  const [hoveredSignal, setHoveredSignal] = useState<SignalPoint | null>(null);

  const filteredData = useMemo(() => {
    if (timeRange === "ALL") return data;
    const days: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    const cutoff = days[timeRange] ?? 365;
    return data.slice(-cutoff);
  }, [data, timeRange]);

  // Filter signals to visible date range
  const visibleSignals = useMemo(() => {
    if (filteredData.length === 0) return signals;
    const firstDate = filteredData[0]?.date ?? "";
    return signals.filter((s) => s.date >= firstDate);
  }, [signals, filteredData]);

  const formatValue = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const dataPoint = payload[0]?.payload;
    // Check if any signal is on this date
    const signal = signals.find((s) => s.date === label);
    return (
      <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
        <p className="text-text-muted text-xs mb-1">{formatDate(label ?? "")}</p>
        <p className="text-accent-primary font-medium">
          Value: {formatValue(dataPoint?.value || 0)}
        </p>
        <p className="text-text-secondary text-xs">
          Invested: {formatValue(dataPoint?.invested || 0)}
        </p>
        {signal && (
          <div
            className={`mt-2 pt-2 border-t border-border text-xs ${
              signal.type === "entry" ? "text-accent-primary" : "text-accent-secondary"
            }`}
          >
            <p className="font-semibold">
              {signal.type === "entry" ? "🟢 Entry Signal" : "🔴 Exit Signal"}
            </p>
            {signal.strategy && <p className="text-text-muted">{signal.strategy}</p>}
            {signal.amount && <p>Amount: {formatValue(signal.amount)}</p>}
            {signal.reason && (
              <p className="text-text-muted mt-1 line-clamp-2">{signal.reason}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold font-sora">Portfolio Performance</h3>
          <p className="text-text-secondary text-sm">{symbol}</p>
        </div>
        <div className="flex gap-2">
          {["1M", "3M", "6M", "1Y", "ALL"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                timeRange === range
                  ? "bg-accent-tertiary text-white"
                  : "bg-background-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D9A5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D9A5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => {
                const d = new Date(value);
                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
              }}
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`}
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00D9A5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ r: 6, fill: "#00D9A5" }}
            />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="#7C5CFF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            {/* Entry/Exit signal dots */}
            {visibleSignals.map((signal, i) => (
              <ReferenceDot
                key={`${signal.date}-${i}`}
                x={signal.date}
                y={signal.price}
                r={7}
                fill={signal.type === "entry" ? "#00D9A5" : "#FF4D6A"}
                stroke="#0A0A0F"
                strokeWidth={2}
                onClick={() =>
                  setHoveredSignal(hoveredSignal?.date === signal.date ? null : signal)
                }
                style={{ cursor: "pointer" }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Signal popover */}
      {hoveredSignal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 p-3 rounded-xl border text-sm ${
            hoveredSignal.type === "entry"
              ? "bg-accent-primary/10 border-accent-primary/40"
              : "bg-accent-secondary/10 border-accent-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">
              {hoveredSignal.type === "entry" ? "🟢 Entry Signal" : "🔴 Exit Signal"}
              {hoveredSignal.strategy && ` — ${hoveredSignal.strategy}`}
            </span>
            <button
              onClick={() => setHoveredSignal(null)}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              ✕
            </button>
          </div>
          <p className="text-text-secondary text-xs">
            {formatDate(hoveredSignal.date)} · Price: {formatValue(hoveredSignal.price)}
            {hoveredSignal.amount && ` · Amount: ${formatValue(hoveredSignal.amount)}`}
          </p>
          {hoveredSignal.reason && (
            <p className="text-text-muted text-xs mt-1">{hoveredSignal.reason}</p>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-primary" />
          <span className="text-xs text-text-secondary">Portfolio Value</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-tertiary" />
          <span className="text-xs text-text-secondary">Total Invested</span>
        </div>
        {visibleSignals.some((s) => s.type === "entry") && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent-primary border-2 border-background-primary" />
            <span className="text-xs text-text-secondary">Entry Signal</span>
          </div>
        )}
        {visibleSignals.some((s) => s.type === "exit") && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent-secondary border-2 border-background-primary" />
            <span className="text-xs text-text-secondary">Exit Signal</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
