import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomMonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  maxDate?: string; // "YYYY-MM"
  minDate?: string; // "YYYY-MM"
  label?: string;
  isDark?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CustomMonthPicker({ value, onChange, maxDate, minDate, label = "Start date", isDark = false }: CustomMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Track the 'browsing' year conceptually separate from the applied block
  const [currentYear, setCurrentYear] = useState(() => {
    return value ? parseInt(value.split("-")[0], 10) : new Date().getFullYear();
  });

  const selectedYear = parseInt(value.split("-")[0], 10);
  const selectedMonth = parseInt(value.split("-")[1], 10); // 1-12

  const maxYear = maxDate ? parseInt(maxDate.split("-")[0], 10) : 2099;
  const maxMonth = maxDate ? parseInt(maxDate.split("-")[1], 10) : 12;
  const minYear = minDate ? parseInt(minDate.split("-")[0], 10) : 1900;
  const minMonth = minDate ? parseInt(minDate.split("-")[1], 10) : 1;

  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Sync currentYear with external value when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentYear(selectedYear);
    }
  }, [isOpen, selectedYear]);

  const handleMonthClick = (monthIdx: number) => { // 0-11
    if (currentYear === maxYear && monthIdx + 1 > maxMonth) return;
    if (currentYear === minYear && monthIdx + 1 < minMonth) return;
    const formattedMonth = String(monthIdx + 1).padStart(2, "0");
    const formattedSelection = `${currentYear}-${formattedMonth}`;
    onChange(formattedSelection);
    setIsOpen(false);
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentYear > minYear) setCurrentYear(c => c - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentYear < maxYear) {
      setCurrentYear(c => c + 1);
    }
  };

  return (
    <div ref={containerRef} className="relative select-none" style={{ position: "relative", width: "100%" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", textAlign: "left", padding: "10px 12px",
          background: isDark ? (isOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)") : (isOpen ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.02)"),
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.09)", borderRadius: "9px",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer", transition: "background 0.15s",
        }}
      >
        <Calendar size={14} color={isDark ? "#94A3B8" : "#9CA3AF"} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#F1F5F9" : "#111827", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </div>
          <div style={{ fontSize: 10, fontWeight: 400, color: isDark ? "#94A3B8" : "#9CA3AF", marginTop: 1 }}>{label}</div>
        </div>
      </button>

      {/* Popover Calendar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: isDark ? "#1E293B" : "#ffffff", borderRadius: "12px",
              boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)" : "0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)",
              overflow: "hidden", outline: "none",
            }}
          >
            {/* Header: Year Selector */}
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "space-between", 
              padding: "16px 16px 12px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)" 
            }}>
              <button
                onClick={handlePrevYear}
                disabled={currentYear <= minYear}
                style={{ background: currentYear <= minYear ? "transparent" : (isDark ? "rgba(255,255,255,0.08)" : "#f4f4f5"), border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentYear <= minYear ? "not-allowed" : "pointer", color: currentYear <= minYear ? (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") : (isDark ? "#F1F5F9" : "#1D1D1F") }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#F1F5F9" : "#1D1D1F", fontFamily: "inherit" }}>
                {currentYear}
              </span>
              <button 
                onClick={handleNextYear} 
                disabled={currentYear >= maxYear}
                style={{ 
                  background: currentYear >= maxYear ? "transparent" : (isDark ? "rgba(255,255,255,0.08)" : "#f4f4f5"), 
                  border: "none", borderRadius: "50%", width: 28, height: 28, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  cursor: currentYear >= maxYear ? "not-allowed" : "pointer", 
                  color: currentYear >= maxYear ? (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") : (isDark ? "#F1F5F9" : "#1D1D1F") 
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Months Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "12px", gap: 6 }}>
              {MONTHS.map((month, idx) => {
                const isSelected = selectedYear === currentYear && selectedMonth === idx + 1;
                const isDisabled = (currentYear === maxYear && (idx + 1) > maxMonth) || (currentYear === minYear && (idx + 1) < minMonth);
                return (
                  <button
                    key={month}
                    disabled={isDisabled}
                    onClick={() => handleMonthClick(idx)}
                    style={{
                      padding: "10px 0",
                      borderRadius: "10px", border: "none",
                      background: isSelected ? (isDark ? "#3B82F6" : "#000000") : "transparent",
                      color: isSelected ? "#ffffff" : isDisabled ? (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") : (isDark ? "#F1F5F9" : "#1D1D1F"),
                      fontSize: 13, fontWeight: isSelected ? 700 : 500,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
