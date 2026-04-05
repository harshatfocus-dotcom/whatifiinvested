"use client";

import { useState } from "react";

interface CorrelationHeatmapProps {
  matrix: number[][];
  symbols: string[];
}

function corrColor(v: number): string {
  // +1 → green (#00C087), 0 → white, -1 → red (#F0616D)
  if (v >= 0) {
    const t = v;
    const r = Math.round(0 + (1 - t) * 255);
    const g = Math.round(192 + (1 - t) * 63);
    const b = Math.round(135 + (1 - t) * 120);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = -v;
    const r = Math.round(240 + (1 - t) * 15);
    const g = Math.round(97 + (1 - t) * 158);
    const b = Math.round(109 + (1 - t) * 146);
    return `rgb(${r},${g},${b})`;
  }
}

function shortLabel(sym: string) {
  return sym.replace(".NS", "").replace("-USD", "").replace("=F", "");
}

export function CorrelationHeatmap({ matrix, symbols }: CorrelationHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ i: number; j: number } | null>(null);
  const n = symbols.length;

  if (n < 2 || matrix.length < 2) return null;

  const cellSize = Math.min(72, Math.floor(480 / n));
  const labelW = 64;
  const totalW = labelW + n * cellSize;
  const totalH = labelW + n * cellSize;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ color: "#1A1A2E", fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "Sora, sans-serif" }}>
          Asset Correlation
        </h4>
        <p style={{ color: "#9EA3B8", fontSize: 12 }}>
          How much assets move together. +1 = perfectly correlated, −1 = perfectly opposite. Lower correlation = better diversification.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg width={totalW} height={totalH} style={{ display: "block" }}>
          {/* Column labels (top) */}
          {symbols.map((sym, j) => (
            <text
              key={`col-${j}`}
              x={labelW + j * cellSize + cellSize / 2}
              y={labelW - 8}
              textAnchor="middle"
              fontSize={cellSize > 56 ? 11 : 9}
              fill="#5A5F7A"
              fontFamily="inherit"
            >
              {shortLabel(sym)}
            </text>
          ))}

          {/* Row labels + cells */}
          {symbols.map((sym, i) => (
            <g key={`row-${i}`}>
              <text
                x={labelW - 6}
                y={labelW + i * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                fontSize={cellSize > 56 ? 11 : 9}
                fill="#5A5F7A"
                fontFamily="inherit"
              >
                {shortLabel(sym)}
              </text>
              {symbols.map((_, j) => {
                const val = matrix[i]?.[j] ?? 0;
                const isHovered = tooltip?.i === i && tooltip?.j === j;
                return (
                  <g key={`cell-${i}-${j}`}>
                    <rect
                      x={labelW + j * cellSize}
                      y={labelW + i * cellSize}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      rx={4}
                      fill={corrColor(val)}
                      stroke={isHovered ? "#5E5CE6" : "transparent"}
                      strokeWidth={2}
                      style={{ cursor: "default" }}
                      onMouseEnter={() => setTooltip({ i, j })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text
                      x={labelW + j * cellSize + (cellSize - 2) / 2}
                      y={labelW + i * cellSize + (cellSize - 2) / 2 + 4}
                      textAnchor="middle"
                      fontSize={cellSize > 56 ? 12 : 10}
                      fontWeight="700"
                      fill={Math.abs(val) > 0.5 ? "#fff" : "#1A1A2E"}
                      fontFamily="inherit"
                      style={{ pointerEvents: "none" }}
                    >
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10, fontSize: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          display: "inline-block",
        }}>
          <span style={{ color: "#1A1A2E", fontWeight: 700 }}>
            {shortLabel(symbols[tooltip.i])} × {shortLabel(symbols[tooltip.j])}
          </span>
          <span style={{ color: "#9EA3B8", marginLeft: 8 }}>
            {matrix[tooltip.i]?.[tooltip.j] >= 0.7
              ? "Highly correlated — limited diversification benefit"
              : matrix[tooltip.i]?.[tooltip.j] >= 0.3
              ? "Moderately correlated — some diversification"
              : matrix[tooltip.i]?.[tooltip.j] >= -0.1
              ? "Low correlation — good diversification"
              : "Negatively correlated — excellent hedge"}
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <div style={{ width: 80, height: 8, borderRadius: 4, background: "linear-gradient(to right, #F0616D, #fff, #00C087)" }} />
        <span style={{ color: "#9EA3B8", fontSize: 10 }}>−1 (opposite)</span>
        <span style={{ color: "#9EA3B8", fontSize: 10, marginLeft: 8 }}>0 (none)</span>
        <span style={{ color: "#9EA3B8", fontSize: 10, marginLeft: 8 }}>+1 (same)</span>
      </div>
    </div>
  );
}
