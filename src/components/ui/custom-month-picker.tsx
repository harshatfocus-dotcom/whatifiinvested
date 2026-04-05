import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomMonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  maxDate?: string; // "YYYY-MM"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CustomMonthPicker({ value, onChange, maxDate }: CustomMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Track the 'browsing' year conceptually separate from the applied block
  const [currentYear, setCurrentYear] = useState(() => {
    return value ? parseInt(value.split("-")[0], 10) : new Date().getFullYear();
  });
  
  const selectedYear = parseInt(value.split("-")[0], 10);
  const selectedMonth = parseInt(value.split("-")[1], 10); // 1-12
  
  const maxYear = maxDate ? parseInt(maxDate.split("-")[0], 10) : 2099;
  const maxMonth = maxDate ? parseInt(maxDate.split("-")[1], 10) : 12;

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
    if (currentYear === maxYear && monthIdx + 1 > maxMonth) return; // Disabled
    const formattedMonth = String(monthIdx + 1).padStart(2, "0");
    const formattedSelection = `${currentYear}-${formattedMonth}`;
    onChange(formattedSelection);
    setIsOpen(false);
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentYear(c => c - 1);
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
          width: "100%", textAlign: "left", padding: "12px 14px",
          background: isOpen ? "#f4f4f5" : "transparent",
          border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#ffffff", padding: 6, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", flexShrink: 0 }}>
             <Calendar size={15} color="#000000" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.2 }}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#86868B", marginTop: 2 }}>Select start date</div>
          </div>
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
              background: "#ffffff", borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)",
              overflow: "hidden", outline: "none",
            }}
          >
            {/* Header: Year Selector */}
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "space-between", 
              padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.04)" 
            }}>
              <button 
                onClick={handlePrevYear} 
                style={{ background: "#f4f4f5", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1D1D1F" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", fontFamily: "inherit" }}>
                {currentYear}
              </span>
              <button 
                onClick={handleNextYear} 
                disabled={currentYear >= maxYear}
                style={{ 
                  background: currentYear >= maxYear ? "transparent" : "#f4f4f5", 
                  border: "none", borderRadius: "50%", width: 28, height: 28, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  cursor: currentYear >= maxYear ? "not-allowed" : "pointer", 
                  color: currentYear >= maxYear ? "rgba(0,0,0,0.2)" : "#1D1D1F" 
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Months Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "12px", gap: 6 }}>
              {MONTHS.map((month, idx) => {
                const isSelected = selectedYear === currentYear && selectedMonth === idx + 1;
                const isDisabled = currentYear === maxYear && (idx + 1) > maxMonth;
                return (
                  <button
                    key={month}
                    disabled={isDisabled}
                    onClick={() => handleMonthClick(idx)}
                    style={{
                      padding: "10px 0",
                      borderRadius: "10px", border: "none",
                      background: isSelected ? "#000000" : "transparent",
                      color: isSelected ? "#ffffff" : isDisabled ? "rgba(0,0,0,0.2)" : "#1D1D1F",
                      fontSize: 13, fontWeight: isSelected ? 700 : 500,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = "rgba(0,0,0,0.04)";
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
