const fs = require('fs');

const content = fs.readFileSync('/tmp/page.tsx.backup', 'utf-8');

// Find the start of the render function
const renderStart = content.indexOf('return (');

// Find the end of the aside
// To do this reliably, we'll slice and find "</aside>"
const asideEnd = content.indexOf('</aside>', renderStart) + '</aside>'.length;

// Find the start of the sticky header `<div style={{ position: "sticky",`
const stickyStart = content.indexOf('position: "sticky",', asideEnd);
const stickyHeaderDivStart = content.lastIndexOf('<div', stickyStart);

// Find the end of the sticky header
// It ends right before {/* Content */}
const contentComment = content.indexOf('{/* Content */}', stickyHeaderDivStart);

// Re-write the returned JSX shell
const beforeRender = content.slice(0, renderStart);
const afterContentComment = content.slice(contentComment);

const importsAdd = `
import { BentoControls } from "@/components/dashboard/bento-controls";
import { FloatingNav } from "@/components/ui/floating-nav";
`;

let newContent = beforeRender.replace('import { CustomMonthPicker } from "@/components/ui/custom-month-picker";', 'import { CustomMonthPicker } from "@/components/ui/custom-month-picker";' + importsAdd);

newContent += `  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      fontFamily: 'inherit', color: C.text, background: C.bg,
      paddingBottom: 120, // space for floating nav
    }}>
      <FloatingNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "40px 24px" }}>
        
        {/* Top Header & Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
           <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
                 Portfolio Intel
              </h1>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Institutional-grade backtesting architecture.</p>
           </div>
           
           {analysis && (
             <div style={{ display: "flex", gap: 12 }}>
                 <button
                  onClick={async () => {
                    setIsGeneratingPDF(true);
                    try {
                      const html2canvas = (await import("html2canvas")).default;
                      const { jsPDF } = await import("jspdf");
                      const el = document.getElementById("report-capture-area");
                      if (!el) return;
                      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: C.bg });
                      const imgData = canvas.toDataURL("image/png");
                      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                      pdf.save(\`Zen-Report-\${new Date().toISOString().split("T")[0]}.pdf\`);
                    } catch (e) {
                      console.error("PDF failed", e);
                    } finally {
                      setIsGeneratingPDF(false);
                    }
                  }}
                  disabled={isGeneratingPDF}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", background: C.surface,
                    border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
                    color: C.textSub, fontSize: 13, fontWeight: 600,
                    cursor: isGeneratingPDF ? "wait" : "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  {isGeneratingPDF ? "Exporting..." : "Export PDF"}
                </button>
                <button
                  onClick={() => { setAnalysis(null); setStrategyResults([]); setChartSignals([]); setExpandedStrategy(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", background: C.surface,
                    border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12,
                    color: C.textSub, fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  <RefreshCw style={{ width: 14, height: 14 }} />
                  New Simulation
                </button>
             </div>
           )}
        </div>

        {/* Configurations Bento */}
        <BentoControls 
            initialInvestment={initialInvestment} setInitialInvestment={setInitialInvestment}
            isRecurring={isRecurring} setIsRecurring={setIsRecurring}
            recurringAmount={recurringAmount} setRecurringAmount={setRecurringAmount}
            frequency={frequency} setFrequency={setFrequency}
            startDate={startDate} setStartDate={setStartDate}
        />

        {/* Selected Assets & Action Row */}
        <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: C.surface, borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.04)" }}>
               <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.muted, marginRight: 8 }}>
                  Allocations
               </h3>
               {selectedAssets.map(asset => (
                  <div key={asset.symbol} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)",
                    padding: "6px 12px", borderRadius: 100
                  }}>
                     <AssetIcon symbol={asset.symbol} name={asset.name} type={asset.type} size={20} />
                     <span style={{ fontSize: 13, fontWeight: 600 }}>{asset.symbol.replace(".NS", "")}</span>
                     <button onClick={() => removeAsset(asset.symbol)} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center" }}>
                        <X size={14} />
                     </button>
                  </div>
               ))}
               
               {/* Search Command Input */}
               <div style={{ position: "relative", marginLeft: "auto", minWidth: 280 }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                  <input
                    type="text"
                    placeholder="Search stocks, ETFs..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px 10px 34px",
                      background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 100, fontSize: 13, fontWeight: 500, outline: "none",
                      color: C.text, fontFamily: "inherit"
                    }}
                  />
                  
                  {/* Dropdown for search results */}
                  {assetSearch && (
                    <div style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 8, width: 320,
                      background: C.surface, border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                      maxHeight: 400, overflowY: "auto", zIndex: 100
                    }}>
                      {allAssets
                        .filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.symbol.toLowerCase().includes(assetSearch.toLowerCase()))
                        .slice(0, 20)
                        .map(asset => {
                          const isSelected = !!selectedAssets.find(sa => sa.symbol === asset.symbol);
                          return (
                            <button
                              key={asset.symbol}
                              onClick={() => {
                                if (isSelected) removeAsset(asset.symbol);
                                else addAsset(asset);
                                setAssetSearch("");
                              }}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)",
                                background: isSelected ? "rgba(0,0,0,0.02)" : "transparent",
                                cursor: "pointer", border: "none", textAlign: "left", fontFamily: "inherit"
                              }}
                            >
                               <AssetIcon symbol={asset.symbol} name={asset.name} type={asset.assetType} size={30} />
                               <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{asset.symbol.replace(".NS", "")}</div>
                                  <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
                               </div>
                               {isSelected && <Check size={16} color={C.accent} />}
                            </button>
                          );
                        })}
                    </div>
                  )}
               </div>
               
               {!analysis && selectedAssets.length > 0 && (
                   <button
                    onClick={runSimulation}
                    disabled={isLoading}
                    style={{
                      padding: "10px 24px", display: "flex", alignItems: "center", gap: 6,
                      background: C.accent, border: "none", borderRadius: 100,
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", boxShadow: \`0 4px 12px rgba(0,0,0,0.1)\`,
                    }}
                  >
                    {isLoading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Run Backtest \u2192"}
                  </button>
               )}
            </div>
            
            {simulationError && (
              <div style={{ marginTop: 12, padding: "12px", background: \`\${C.red}10\`, borderRadius: 12, color: C.red, fontSize: 13, fontWeight: 500 }}>
                {simulationError}
              </div>
            )}
        </div>

`;

newContent += afterContentComment;
newContent = newContent.replace(/<main style={{[^}]*}}>/, '');
newContent = newContent.replace(/<\/main>\n\s*<\/div>/, '\n      </div>\n    </div>');

fs.writeFileSync('src/app/backtest/page.tsx', newContent);
console.log("Successfully rewrote layout");
