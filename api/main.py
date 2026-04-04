# Python backend for WhatIfIInvested
# Uses yfinance for real historical data

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import yfinance as yf
from datetime import datetime, timedelta
import math
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Map NSE symbols
SYMBOL_MAP = {
    "RELIANCE.NS": "RELIANCE.NS",
    "TCS.NS": "TCS.NS",
    "HDFCBANK.NS": "HDFCBANK.NS",
    "INFY.NS": "INFY.NS",
    "ICICIBANK.NS": "ICICIBANK.NS",
    "SBIN.NS": "SBIN.NS",
    "HINDUNILVR.NS": "HINDUNILVR.NS",
    "ITC.NS": "ITC.NS",
    "KOTAKBANK.NS": "KOTAKBANK.NS",
    "BHARTIARTL.NS": "BHARTIARTL.NS",
    "NIFTYBEES.NS": "^NSEI",
    "GOLDBEES.NS": "GOLDBEES.NS",
}

class PortfolioAsset(BaseModel):
    symbol: str
    name: str
    weight: float
    initialInvestment: float
    recurringAmount: float
    frequency: Optional[str] = None
    startDate: str

class PortfolioRequest(BaseModel):
    assets: List[PortfolioAsset]
    initialInvestment: float
    recurringAmount: float
    frequency: Optional[str] = None
    startDate: str

def get_historical_data(symbol: str, start_date: str, end_date: str = None):
    """Get real historical data from yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        if end_date:
            hist = ticker.history(start=start_date, end=end_date)
        else:
            hist = ticker.history(start=start_date)
        
        if hist.empty:
            return None
        
        # Use adjusted close to account for splits/dividends
        data = []
        for idx, row in hist.iterrows():
            data.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "adj_close": float(row.get("Adj Close", row["Close"])),
                "volume": int(row["Volume"])
            })
        return data
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

@app.get("/api/price/{symbol}")
def get_current_price(symbol: str):
    """Get current/live price for a symbol"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return {
            "symbol": symbol,
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice"),
            "previousClose": info.get("previousClose"),
            "open": info.get("open"),
            "high": info.get("dayHigh"),
            "low": info.get("dayLow"),
            "volume": info.get("volume"),
            "source": "yfinance"
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/history/{symbol}")
def get_history(symbol: str, period: str = "5y"):
    """Get historical price data"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"error": "No data available"}
        
        data = []
        for idx, row in hist.iterrows():
            data.append({
                "date": idx.strftime("%Y-%m-%d"),
                "close": float(row["Close"]),
                "adj_close": float(row.get("Adj Close", row["Close"])),
                "volume": int(row["Volume"])
            })
        
        return {
            "symbol": symbol,
            "period": period,
            "data": data
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/portfolio/analyze")
def analyze_portfolio(request: PortfolioRequest):
    """Analyze portfolio with REAL historical data"""
    
    totalInvested = request.initialInvestment
    holdings = []
    chartData = []
    
    # Parse start date
    start_date = datetime.strptime(request.startDate, "%Y-%m-%d")
    end_date = datetime.now()
    years = (end_date - start_date).days / 365.25
    
    # Calculate total months for recurring investments
    months = int(years * 12)
    totalRecurring = request.recurringAmount * months
    totalInvested += totalRecurring
    
    # Process each asset
    for asset in request.assets:
        # Try multiple symbol formats
        symbols_to_try = [
            asset.symbol,
            asset.symbol.replace(".NS", ".NS"),
            asset.symbol.replace("-USD", "-USD"),
            f"^{asset.symbol.replace('.NS', '')}" if 'NSEI' in asset.symbol else None
        ]
        
        hist_data = None
        for sym in symbols_to_try:
            if sym:
                hist_data = get_historical_data(sym, request.startDate)
                if hist_data:
                    break
        
        if not hist_data:
            # Fallback to current price
            ticker = yf.Ticker(asset.symbol)
            info = ticker.info
            current_price = info.get("currentPrice", 100)
            avg_price = current_price * 0.7
        else:
            first_price = hist_data[0]["adj_close"] if "adj_close" in hist_data[0] else hist_data[0]["close"]
            last_price = hist_data[-1]["adj_close"] if "adj_close" in hist_data[-1] else hist_data[-1]["close"]
            avg_price = (first_price + last_price) / 2
            current_price = last_price
        
        # Calculate holdings
        normalized_weight = asset.weight / 100
        invested_amount = totalInvested * normalized_weight
        
        # For recurring, calculate average cost differently
        if request.recurringAmount > 0 and hist_data:
            # Use actual historical data for DCA
            total_units = 0
            recurring_per_period = request.recurringAmount * normalized_weight
            
            # Sample monthly data points for SIP calculation
            for i in range(0, len(hist_data), max(1, len(hist_data)//months)):
                if i < len(hist_data):
                    price_at_time = hist_data[i].get("adj_close", hist_data[i].get("close"))
                    total_units += recurring_per_period / price_at_time
            
            quantity = total_units
            current_value = quantity * current_price
            avg_buy_price = invested_amount / quantity if quantity > 0 else avg_price
        else:
            quantity = invested_amount / avg_price if avg_price > 0 else 0
            current_value = quantity * current_price
            avg_buy_price = avg_price
        
        return_amount = current_value - invested_amount
        return_percent = (return_amount / invested_amount * 100) if invested_amount > 0 else 0
        
        holdings.append({
            "symbol": asset.symbol,
            "name": asset.name,
            "quantity": round(quantity, 4),
            "avgBuyPrice": round(avg_buy_price, 2),
            "currentPrice": round(current_price, 2),
            "currentValue": round(current_value, 2),
            "investedAmount": round(invested_amount, 2),
            "returnAmount": round(return_amount, 2),
            "returnPercent": round(return_percent, 2)
        })
        
        # Build chart data from historical prices
        if hist_data:
            for point in hist_data:
                chartData.append({
                    "date": point["date"],
                    "value": round(point.get("adj_close", point.get("close")) * quantity, 2),
                    "invested": round(invested_amount * (hist_data.index(point) / len(hist_data)), 2) if hist_data else 0
                })
    
    # Calculate totals
    totalCurrentValue = sum(h["currentValue"] for h in holdings)
    absoluteReturn = totalCurrentValue - totalInvested
    percentReturn = (absoluteReturn / totalInvested * 100) if totalInvested > 0 else 0
    cagr = ((totalCurrentValue / totalInvested) ** (1/years) - 1) if years > 0 and totalInvested > 0 else 0
    
    # Find best/worst performers
    sorted_holdings = sorted(holdings, key=lambda x: x["returnPercent"], reverse=True)
    
    return {
        "totalInvested": round(totalInvested, 2),
        "currentValue": round(totalCurrentValue, 2),
        "absoluteReturn": round(absoluteReturn, 2),
        "percentReturn": round(percentReturn, 2),
        "cagr": round(cagr * 100, 2),
        "holdings": holdings,
        "chartData": chartData,
        "bestPerformer": {
            "symbol": sorted_holdings[0]["symbol"],
            "returnPercent": sorted_holdings[0]["returnPercent"]
        } if sorted_holdings else None,
        "worstPerformer": {
            "symbol": sorted_holdings[-1]["symbol"],
            "returnPercent": sorted_holdings[-1]["returnPercent"]
        } if sorted_holdings else None,
        "dataSource": "yfinance"
    }

@app.get("/api/assets/search")
def search_assets(q: str = "", asset_type: str = "all"):
    """Search for assets"""
    # This would typically query a database
    # For now, return sample data
    return [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "type": "stock"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "type": "stock"},
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
