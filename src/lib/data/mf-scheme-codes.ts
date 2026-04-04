// Maps internal MF symbols to real AMFI scheme codes
// Source: https://api.mfapi.in/mf/{scheme_code}
export const MF_SCHEME_CODES: Record<string, { schemeCode: number; name: string; category: string }> = {
  "MF001": { schemeCode: 118989, name: "SBI Blue Chip Fund - Growth", category: "Large Cap" },
  "MF002": { schemeCode: 120503, name: "HDFC Top 100 Fund - Growth", category: "Large Cap" },
  "MF003": { schemeCode: 119597, name: "ICICI Pru Bluechip Fund - Growth", category: "Large Cap" },
  "MF004": { schemeCode: 100356, name: "Axis Bluechip Fund - Growth", category: "Large Cap" },
  "MF005": { schemeCode: 119551, name: "Mirae Asset Large Cap Fund - Growth", category: "Large Cap" },
  "MF006": { schemeCode: 120505, name: "HDFC Mid-Cap Opportunities - Growth", category: "Mid Cap" },
  "MF007": { schemeCode: 119026, name: "Kotak Emerging Equity Fund - Growth", category: "Mid Cap" },
  "MF008": { schemeCode: 125354, name: "SBI Magnum Midcap Fund - Growth", category: "Mid Cap" },
  "MF009": { schemeCode: 101540, name: "DSP Midcap Fund - Growth", category: "Mid Cap" },
  "MF010": { schemeCode: 118834, name: "Axis Midcap Fund - Growth", category: "Mid Cap" },
  "MF011": { schemeCode: 120828, name: "SBI Small Cap Fund - Growth", category: "Small Cap" },
  "MF012": { schemeCode: 122639, name: "Nippon India Small Cap Fund - Growth", category: "Small Cap" },
  "MF013": { schemeCode: 119775, name: "HDFC Small Cap Fund - Growth", category: "Small Cap" },
  "MF014": { schemeCode: 125307, name: "Kotak Small Cap Fund - Growth", category: "Small Cap" },
  "MF015": { schemeCode: 118550, name: "Axis Small Cap Fund - Growth", category: "Small Cap" },
  "MF016": { schemeCode: 119364, name: "Parag Parikh Flexi Cap Fund - Growth", category: "Flexi Cap" },
  "MF017": { schemeCode: 120506, name: "HDFC Flexi Cap Fund - Growth", category: "Flexi Cap" },
  "MF018": { schemeCode: 120847, name: "SBI Flexicap Fund - Growth", category: "Flexi Cap" },
  "MF019": { schemeCode: 112090, name: "UTI Flexi Cap Fund - Growth", category: "Flexi Cap" },
  "MF020": { schemeCode: 118955, name: "Kotak Flexicap Fund - Growth", category: "Flexi Cap" },
  "MF021": { schemeCode: 120586, name: "ICICI Pru Balanced Advantage - Growth", category: "Hybrid" },
  "MF022": { schemeCode: 119062, name: "HDFC Balanced Advantage Fund - Growth", category: "Hybrid" },
  "MF023": { schemeCode: 119710, name: "SBI Equity Hybrid Fund - Growth", category: "Hybrid" },
  "MF024": { schemeCode: 100522, name: "ICICI Pru Equity & Debt Fund - Growth", category: "Hybrid" },
  "MF025": { schemeCode: 119568, name: "Mirae Asset Hybrid Equity Fund - Growth", category: "Hybrid" },
  "MF026": { schemeCode: 120716, name: "UTI Nifty 50 Index Fund - Growth", category: "Index" },
  "MF027": { schemeCode: 140245, name: "HDFC Index Fund - Nifty 50 Plan - Growth", category: "Index" },
  "MF028": { schemeCode: 119688, name: "ICICI Pru Nifty 50 Index Fund - Growth", category: "Index" },
  "MF029": { schemeCode: 143281, name: "SBI Nifty Index Fund - Growth", category: "Index" },
  "MF030": { schemeCode: 120684, name: "Nippon India Index Fund Nifty 50 - Growth", category: "Index" },
  "MF031": { schemeCode: 125497, name: "Motilal Oswal Nifty Next 50 Index - Growth", category: "Index" },
  "MF032": { schemeCode: 145552, name: "UTI Nifty Next 50 Index Fund - Growth", category: "Index" },
  "MF033": { schemeCode: 119250, name: "HDFC ELSS Tax Saver Fund - Growth", category: "ELSS" },
  "MF034": { schemeCode: 120846, name: "SBI Long Term Equity Fund - Growth", category: "ELSS" },
  "MF035": { schemeCode: 119775, name: "Axis Long Term Equity Fund - Growth", category: "ELSS" },
  "MF036": { schemeCode: 120587, name: "ICICI Pru Long Term Equity - Growth", category: "ELSS" },
  "MF037": { schemeCode: 118984, name: "Kotak Tax Saver Fund - Growth", category: "ELSS" },
  "MF038": { schemeCode: 119560, name: "Mirae Asset Tax Saver Fund - Growth", category: "ELSS" },
  "MF039": { schemeCode: 120754, name: "SBI Contra Fund - Growth", category: "Value/Contra" },
  "MF040": { schemeCode: 118560, name: "ICICI Pru Value Discovery - Growth", category: "Value/Contra" },
  "MF041": { schemeCode: 103504, name: "Nippon India Multi Cap Fund - Growth", category: "Multi Cap" },
  "MF042": { schemeCode: 119250, name: "HDFC Multi Cap Fund - Growth", category: "Multi Cap" },
  "MF043": { schemeCode: 119062, name: "ICICI Pru Multi Asset Fund - Growth", category: "Multi Asset" },
  "MF044": { schemeCode: 120578, name: "SBI Multi Asset Allocation - Growth", category: "Multi Asset" },
  "MF045": { schemeCode: 120503, name: "HDFC Focused 30 Fund - Growth", category: "Focused" },
  "MF046": { schemeCode: 118835, name: "Axis Focused 25 Fund - Growth", category: "Focused" },
  "MF047": { schemeCode: 119578, name: "Mirae Asset Focused Fund - Growth", category: "Focused" },
  "MF048": { schemeCode: 120511, name: "HDFC Corporate Bond Fund - Growth", category: "Debt" },
  "MF049": { schemeCode: 119566, name: "ICICI Pru Corporate Bond Fund - Growth", category: "Debt" },
  "MF050": { schemeCode: 119722, name: "SBI Magnum Gilt Fund - Growth", category: "Debt" },
};

export function isMutualFund(symbol: string): boolean {
  return symbol.startsWith("MF") && symbol.length <= 5;
}

export function getSchemeCode(symbol: string): number | null {
  return MF_SCHEME_CODES[symbol]?.schemeCode ?? null;
}
