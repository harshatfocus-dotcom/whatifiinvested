"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import type { ChartDataPoint, SignalPoint } from "@/types";

interface PerformanceChartProps {
  data: ChartDataPoint[];
  symbol: string;
}

const generateSignals = (data: ChartDataPoint[]): SignalPoint[] => {
  if (data.length < 50) return [];

  const signals: SignalPoint[] = [];
  const step = Math.floor(data.length / 6);

  for (let i = step; i < data.length - step; i += step) {
    const isEntry = Math.random() > 0.5;
    signals.push({
      date: data[i].date,
      price: data[i].value,
      type: isEntry ? "entry" : "exit",
      label: isEntry ? "Entry Point" : "Exit Point",
    });
  }

  return signals;
};

export function PerformanceChart({ data, symbol }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<string>("ALL");

  const filteredData = useMemo(() => {
    if (timeRange === "ALL") return data;
    const days = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 365,
    };
    const cutoff = days[timeRange as keyof typeof days] || 365;
    return data.slice(-cutoff);
  }, [data, timeRange]);

  const signals = useMemo(() => generateSignals(data), [data]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const dataPoint = payload[0]?.payload;
    return (
      <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl">
        <p className="text-text-muted text-xs mb-1">{formatDate(label)}</p>
        <p className="text-accent-primary font-medium">
          Value: {formatValue(dataPoint?.value || 0)}
        </p>
        <p className="text-text-secondary text-xs">
          Invested: {formatValue(dataPoint?.invested || 0)}
        </p>
      </div>
    );
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    const signal = signals.find((s) => s.date === payload.date);
    if (!signal) return null;

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={signal.type === "entry" ? "#00D9A5" : "#FF4D6A"}
          stroke="#0A0A0F"
          strokeWidth={2}
        />
        <title>
          {signal.label}: {formatValue(signal.price)}
        </title>
      </g>
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

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D9A5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D9A5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F2E" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
              }}
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
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
              dot={<CustomDot />}
              activeDot={{ r: 8, fill: "#00D9A5" }}
            />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="#7C5CFF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-primary" />
          <span className="text-xs text-text-secondary">Portfolio Value</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-tertiary" />
          <span className="text-xs text-text-secondary">Total Invested</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-primary" />
          <span className="text-xs text-text-secondary">Entry Signal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-secondary" />
          <span className="text-xs text-text-secondary">Exit Signal</span>
        </div>
      </div>
    </motion.div>
  );
}
