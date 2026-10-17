import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Search, Send, Command, ArrowRight } from "lucide-react";

interface ChatInterfaceProps {
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDark: boolean;
  C: any;
  analysis: any;
  selectedAssets: any[];
  strategyResults: any[];
}

export function ChatInterface({ isChatOpen, setIsChatOpen, isDark, C, analysis, selectedAssets, strategyResults }: ChatInterfaceProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  const handleSend = async (questionRaw?: string) => {
    const question = (questionRaw || chatInput).trim();
    if (!question || chatLoading) return;
    
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: question }]);
    setChatLoading(true);
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question, 
          portfolio: analysis ? { 
            totalInvested: analysis.totalInvested, 
            currentValue: analysis.currentValue, 
            absoluteReturn: analysis.absoluteReturn, 
            percentReturn: analysis.percentReturn, 
            cagr: analysis.cagr 
          } : undefined, 
          assets: selectedAssets.map(a => ({ symbol: a.symbol, name: a.name })), 
          strategies: strategyResults.slice(0, 5).map(s => ({ strategy: s.strategy, signal: s.signal })) 
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't get a response." }]);
    } catch { 
      setChatMessages(prev => [...prev, { role: "assistant", content: "Couldn't connect. Please try again." }]); 
    } finally { 
      setChatLoading(false); 
    }
  };

  const SUGGESTIONS = [
    { label: "What's my portfolio CAGR?", icon: "📈" },
    { label: "Explain Max Drawdown", icon: "📉" },
    { label: "Analyze my asset allocation", icon: "⚖️" },
    { label: "What if Covid crash happens again?", icon: "🦠" },
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, pointerEvents: "none" }}>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              width: 580,
              background: isDark ? "rgba(26,29,39,0.98)" : "rgba(255,255,255,0.98)",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
              borderRadius: 16,
              boxShadow: isDark
                ? "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.12)"
                : "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              pointerEvents: "all",
            }}
          >
            {/* Spotlight Top Input Bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
            }}>
              <Search size={18} color={isDark ? "#94A3B8" : "#9CA3AF"} />
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a command or search..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: isDark ? "#F8FAFC" : "#0F172A", fontSize: 16, fontFamily: "inherit",
                }}
              />
              <button 
                onClick={() => setIsChatOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
              >
                <X size={16} color={C.muted} />
              </button>
            </div>

            {/* Chat Body */}
            <div style={{
              flex: 1, 
              maxHeight: 400, 
              overflowY: "auto",
              padding: chatMessages.length === 0 ? "0px" : "16px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              {chatMessages.length === 0 ? (
                // Empty State / Command Palette View
                <div style={{ padding: "0 10px 10px" }}>
                  <div style={{ 
                    padding: "16px 14px", 
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderRadius: 8, margin: "10px 10px 16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Sparkles size={16} color="#6366F1" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Ask AI about your portfolio</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ padding: "3px 6px", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 4, fontSize: 11, color: C.muted }}><Command size={10} style={{ display: "inline", marginBottom: -1 }} /></span>
                      <span style={{ padding: "3px 6px", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderRadius: 4, fontSize: 11, color: C.muted }}>Enter</span>
                    </div>
                  </div>

                  <div style={{ padding: "0 14px 6px" }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Suggested Commands</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s.label}
                          onClick={() => handleSend(s.label)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "10px 12px",
                            background: "transparent", border: "none", cursor: "pointer",
                            textAlign: "left", borderRadius: 8, fontFamily: "inherit",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ filter: isDark ? "none" : "grayscale(0.2)" }}>{s.icon}</span>
                            <span style={{ fontSize: 14, color: C.textSub }}>{s.label}</span>
                          </div>
                          <ArrowRight size={14} color={C.muted} style={{ opacity: 0.5 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Messages List View
                <>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{
                      display: "flex", flexDirection: "column",
                      alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "100%",
                    }}>
                      {msg.role === "assistant" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: "linear-gradient(135deg,#3B82F6,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Sparkles size={8} color="#fff" />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase" }}>Portfolio AI</span>
                        </div>
                      )}
                      <div style={{
                        background: msg.role === "user"
                          ? "linear-gradient(135deg,#3B82F6,#6366F1)"
                          : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                        color: msg.role === "user" ? "#fff" : C.text,
                        padding: "10px 14px", borderRadius: 14,
                        borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                        borderBottomLeftRadius: msg.role === "assistant" ? 4 : 14,
                        fontSize: 13, lineHeight: 1.5,
                        boxShadow: msg.role === "user" ? "0 4px 12px rgba(59,130,246,0.25)" : "none",
                        border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
                        maxWidth: "85%",
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: "linear-gradient(135deg,#3B82F6,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles size={8} color="#fff" />
                      </div>
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ fontSize: 11, color: C.muted }}
                      >
                        Analyzing data...
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger bar */}
      <motion.button
        onClick={() => setIsChatOpen(v => !v)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 18px 10px 14px",
          background: isDark ? "rgba(26,29,39,0.95)" : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.10)"}`,
          borderRadius: 40,
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
          cursor: "pointer", fontFamily: "inherit",
          pointerEvents: "all",
          transition: "box-shadow 0.2s",
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: "linear-gradient(135deg,#3B82F6,#6366F1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
        }}>
          {isChatOpen ? <X size={12} color="#fff" /> : <Sparkles size={12} color="#fff" />}
        </div>
        <span style={{ color: C.muted, fontSize: 13, fontWeight: 400 }}>
          {isChatOpen ? "Close Command Panel" : "Ask AI or type a command..."}
        </span>
        {!isChatOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
            <span style={{
              padding: "2px 6px", borderRadius: 5,
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 10, fontWeight: 600,
            }}><Command size={10} style={{ display: "inline" }}/> A</span>
          </div>
        )}
      </motion.button>
    </div>
  );
}
