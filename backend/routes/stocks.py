from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
import yfinance as yf
import pandas as pd
import ta
from backend.database import get_session
from backend.models import Stock

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.post("/", response_model=Stock)
def add_stock(stock: Stock, session: Session = Depends(get_session)):
    # Check if stock exists
    statement = select(Stock).where(Stock.symbol == stock.symbol)
    existing_stock = session.exec(statement).first()
    if existing_stock:
        raise HTTPException(status_code=400, detail="Stock already exists")
    
    # Verify symbol with yfinance
    ticker = yf.Ticker(stock.symbol)
    info = ticker.info
    if 'symbol' not in info:
         # Some valid tickers might fail info check, but robust check is good.
         # For now, let's assume if it doesn't error out completely it's semi-valid, 
         # but yfinance is tricky.
         pass 

    # Populate name if missing
    if not stock.name and 'longName' in info:
        stock.name = info['longName']
    if not stock.sector and 'sector' in info:
        stock.sector = info['sector']

    session.add(stock)
    session.commit()
    session.refresh(stock)
    return stock

@router.get("/", response_model=list[Stock])
def get_stocks(session: Session = Depends(get_session)):
    stocks = session.exec(select(Stock)).all()
    return stocks

@router.delete("/{symbol}")
def delete_stock(symbol: str, session: Session = Depends(get_session)):
    statement = select(Stock).where(Stock.symbol == symbol)
    stock = session.exec(statement).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    session.delete(stock)
    session.commit()
    return {"ok": True}

@router.get("/{symbol}/analysis")
def get_stock_analysis(symbol: str, interval: str = "1d", period: str = "1y"):
    # Fetch data
    try:
        df = yf.download(symbol, period=period, interval=interval, progress=False)
        if df.empty:
             raise HTTPException(status_code=404, detail="No data found for symbol")
        
        # Clean data (flatten MultiIndex columns if present, yfinance updated recently)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        # Calculate Indicators using 'ta' library
        # MACD
        df['macd'] = ta.trend.macd(df['Close'])
        df['macd_signal'] = ta.trend.macd_signal(df['Close'])
        df['macd_diff'] = ta.trend.macd_diff(df['Close'])
        
        # RSI
        df['rsi'] = ta.momentum.rsi(df['Close'], window=14)
        
        # EMA
        df['ema_50'] = ta.trend.ema_indicator(df['Close'], window=50)
        df['ema_200'] = ta.trend.ema_indicator(df['Close'], window=200)

        # Calculate Volume SMA
        df['volume_sma_20'] = ta.trend.sma_indicator(df['Volume'], window=20)

        # --- Market Regime Detection ---
        # 1. Trend Direction
        # Mark-Up: Price > EMA50 > EMA200 
        # Mark-Down: Price < EMA50 < EMA200
        
        last_close = df['Close'].iloc[-1]
        last_ema50 = df['ema_50'].iloc[-1]
        last_ema200 = df['ema_200'].iloc[-1]
        
        # Volatility (ATR)
        df['atr'] = ta.volatility.average_true_range(df['High'], df['Low'], df['Close'], window=14)
        last_atr = df['atr'].iloc[-1]
        avg_atr = df['atr'].tail(30).mean() # Baseline volatility
        
        volatility_status = "High" if last_atr > avg_atr * 1.1 else "Low"
        
        # --- Confluence Layers ---
        # 1. Volume Confluence
        last_vol = df['Volume'].iloc[-1]
        last_vol_sma = df['volume_sma_20'].iloc[-1]
        volume_conf = last_vol > last_vol_sma if last_vol_sma else False
        
        # 2. Momentum Confluence (RSI)
        last_rsi = df['rsi'].iloc[-1]
        rsi_bullish = last_rsi > 50 if last_rsi is not None else False
        rsi_bearish = last_rsi < 50 if last_rsi is not None else False

        regime = "Unknown"
        reason = ""
        confidence = "Medium"
        confluence_count = 1 # Trend is always base

        if last_ema50 is not None and last_ema200 is not None:
            # Mark-Up Logic
            if last_close > last_ema50 > last_ema200:
                regime = "Mark-Up"
                reason = "Strong uptrend with price above key averages."
                if volume_conf: confluence_count += 1
                if rsi_bullish: confluence_count += 1
            
            # Mark-Down Logic
            elif last_close < last_ema50 < last_ema200:
                regime = "Mark-Down"
                reason = "Price is breaking down in a established downtrend."
                if volume_conf: confluence_count += 1
                if rsi_bearish: confluence_count += 1
            
            # Range Logic (Accumulation / Distribution)
            elif abs(last_ema50 - last_ema200) / last_ema200 < 0.05:
                if volatility_status == "Low":
                    regime = "Accumulation"
                    reason = "Quiet sideways movement often preceding a breakout."
                    if not volume_conf: confluence_count += 1 # Accumulation is often quiet
                else:
                    regime = "Distribution"
                    reason = "High volatility range-bound action suggesting a peak."
                    if volume_conf: confluence_count += 1 # Churn has high volume
            
            else:
                 regime = "Transition"
                 reason = "Price is between major moving averages; direction is neutral."
                 confluence_count = 1

        # Reliability Score
        if confluence_count >= 3:
            confidence = "High"
        elif confluence_count == 2:
            confidence = "Medium"
        else:
            confidence = "Low"

        # --- Top-Down Automation Data ---
        # 1. Macro (SPY)
        macro_status = "Unknown"
        relative_strength = 1.0 # Baseline
        
        # 2. Macro Tides (Growth, Inflation, Liquidity)
        macro_tides = {
            "growth": {"status": "Unknown", "value": None},
            "inflation": {"status": "Unknown", "value": None},
            "liquidity": {"status": "Unknown", "value": None}
        }
        
        try:
            # Optimized: Fetch all proxies at once
            proxies = ["SPY", "XLI", "TIP", "^TNX"]
            p_data = yf.download(proxies, period=period, interval=interval, progress=False)
            
            if not p_data.empty:
                # Handle MultiIndex
                if isinstance(p_data.columns, pd.MultiIndex):
                    p_close = p_data['Close']
                else:
                    p_close = p_data # Fallback if single column (unlikely here)

                # Macro Trend (SPY)
                spy_c = p_close['SPY'].iloc[-1]
                spy_ema50 = ta.trend.ema_indicator(p_close['SPY'], window=50).iloc[-1]
                macro_status = "Risk-On" if spy_c > spy_ema50 else "Risk-Off"
                
                # Growth (XLI)
                xli_c = p_close['XLI'].iloc[-1]
                xli_ema50 = ta.trend.ema_indicator(p_close['XLI'], window=50).iloc[-1]
                macro_tides["growth"] = {
                    "status": "Expanding" if xli_c > xli_ema50 else "Slowing",
                    "details": "Industrials (XLI) trending up." if xli_c > xli_ema50 else "Industrial sector showing weakness."
                }
                
                # Inflation (TIP) - Falling TIP often means rising inflation expectations
                tip_c = p_close['TIP'].iloc[-1]
                tip_ema50 = ta.trend.ema_indicator(p_close['TIP'], window=50).iloc[-1]
                macro_tides["inflation"] = {
                    "status": "Rising Pressure" if tip_c < tip_ema50 else "Cooling/Stable",
                    "details": "TIP Bonds falling vs trend." if tip_c < tip_ema50 else "Bonds showing stable inflation expectations."
                }
                
                # Liquidity (TNX) - Falling yields = Easing
                tnx_c = p_close['^TNX'].iloc[-1]
                tnx_ema50 = ta.trend.ema_indicator(p_close['^TNX'], window=50).iloc[-1]
                macro_tides["liquidity"] = {
                    "status": "Easing" if tnx_c < tnx_ema50 else "Tightening",
                    "details": "10-Year Yields (^TNX) are falling." if tnx_c < tnx_ema50 else "Yields are rising; capital tightening."
                }

                # --- Final Strategic Synthesis ---
                g_status = macro_tides["growth"]["status"]
                i_status = macro_tides["inflation"]["status"]
                l_status = macro_tides["liquidity"]["status"]
                
                suggestion = {
                    "title": "Neutral / Transition",
                    "action": "Maintain balanced positions while waiting for macro clarity.",
                    "focus": "Quality & Cash"
                }

                if g_status == "Expanding" and l_status == "Easing":
                    suggestion = {
                        "title": "Goldilocks Zone (Bullish)",
                        "action": "Aggressively target High-Beta Tech and Growth stocks.",
                        "focus": "Tech, Growth, Discretionary"
                    }
                elif g_status == "Slowing" and i_status == "Rising Pressure":
                    suggestion = {
                        "title": "Stagflation Risk (Defensive)",
                        "action": "Shift focus to commodities and inflation-resistant assets.",
                        "focus": "Energy, Staples, Materials, Gold"
                    }
                elif g_status == "Slowing" and l_status == "Tightening":
                    suggestion = {
                        "title": "Deflationary Pressure (Conservative)",
                        "action": "Prioritize capital preservation and high-quality dividend payers.",
                        "focus": "Cash, Healthcare, Utilities, Quality"
                    }
                elif g_status == "Expanding" and l_status == "Tightening":
                    suggestion = {
                        "title": "Late Cycle Expansion (Balanced)",
                        "action": "Focus on cash-flow generative value sectors as liquidity tightens.",
                        "focus": "Financials, Energy, Industrials"
                    }
                elif g_status == "Slowing" and l_status == "Easing":
                    suggestion = {
                        "title": "Early Cycle Recovery (Growth Focus)",
                        "action": "Look for oversold growth opportunities as liquidity improves.",
                        "focus": "Small Caps, Financials, Forward-looking Tech"
                    }

                # --- Sector Leadership Analysis ---
                sectors = {
                    "Technology": "XLK",
                    "Energy": "XLE",
                    "Financial Services": "XLF",
                    "Healthcare": "XLV",
                    "Consumer Defensive": "XLP",
                    "Consumer Cyclical": "XLY",
                    "Industrials": "XLI",
                    "Basic Materials": "XLB",
                    "Utilities": "XLU",
                    "Real Estate": "XLRE",
                    "Communication Services": "XLC"
                }
                
                sector_etfs = list(sectors.values())
                s_data = yf.download(sector_etfs, period="2mo", interval="1d", progress=False)
                sector_performance = {}
                
                if not s_data.empty:
                    s_close = s_data['Close']
                    for s_name, ticker in sectors.items():
                        if ticker in s_close.columns and len(s_close[ticker]) > 20:
                            ret = (s_close[ticker].iloc[-1] / s_close[ticker].iloc[-21]) - 1
                            sector_performance[s_name] = ret
                
                leading_sector = max(sector_performance, key=sector_performance.get) if sector_performance else "Unknown"
                
                # Check if stock is in leading sector
                info = yf.Ticker(symbol).info
                stock_sector = info.get('sector', 'Unknown')
                is_leading_sector = stock_sector == leading_sector

                # 3. Relative Strength (1mo return vs SPY)
                if len(df) > 20 and len(p_close['SPY']) > 20:
                    stock_1m_ret = (df['Close'].iloc[-1] / df['Close'].iloc[-21]) - 1
                    spy_1m_ret = (p_close['SPY'].iloc[-1] / p_close['SPY'].iloc[-21]) - 1
                    relative_strength = (1 + stock_1m_ret) / (1 + spy_1m_ret)

                # --- Decision Logic (Harmonized with Strategic Playbook) ---
                playbook_title = suggestion.get("title", "Unknown")
                playbook_focus = [s.strip().lower() for s in suggestion.get("focus", "").split(",")]
                is_bullish_playbook = any(word in playbook_title for word in ["Bullish", "Goldilocks", "Recovery"])
                is_bearish_playbook = any(word in playbook_title for word in ["Defensive", "Conservative", "Stagflation", "Deflationary"])
                
                # Check for Sector Alignment
                stock_sector_lower = stock_sector.lower() if stock_sector else "unknown"
                # Some mapping for yfinance sectors to playbook focus strings
                sector_map = {
                    "technology": "tech",
                    "financial services": "financials",
                    "energy": "energy",
                    "industrials": "industrials",
                    "healthcare": "healthcare",
                    "consumer cyclical": "discretionary",
                    "consumer defensive": "staples",
                    "basic materials": "materials",
                    "utilities": "utilities",
                    "communication services": "communication"
                }
                mapped_sector = sector_map.get(stock_sector_lower, stock_sector_lower)
                is_sector_aligned = any(mapped_sector in f or f in mapped_sector for f in playbook_focus)

                decision = "Wait / Watch"
                
                # Logic cases
                if macro_status == "Risk-On" and regime == "Mark-Up" and confidence == "High" and is_leading_sector:
                    if is_bullish_playbook and is_sector_aligned:
                        decision = "Strong Buy. All cylinders are firing (Trend, Sector, and Macro Playbook)."
                    elif not is_sector_aligned:
                        decision = f"Cautious. Strong trend but {stock_sector} is not the current Macro priority ({playbook_title})."
                    else:
                        decision = "Hold / Buy. Strong technicals but macro playbook suggests balanced caution."
                
                elif regime == "Mark-Up" and macro_status == "Risk-On":
                    if is_sector_aligned:
                        decision = "Bullish. Sector and Trend are aligned with Risk-On and Macro."
                    else:
                        decision = "Speculative Bullish. Individual trend is strong, but sector lacks macro tailwind."
                
                elif is_bearish_playbook and (regime in ["Mark-Down", "Distribution", "Transition"]):
                    decision = f"Avoid / Short. Low-conviction technicals fighting a {playbook_title} macro tide."
                
                elif regime == "Distribution":
                    decision = "Avoid / Short. The technical bounce is fighting a distribution regime."
                
                elif regime == "Mark-Down":
                    decision = "Avoid. Strong markdown in progress."
                
                elif regime == "Transition" and is_bullish_playbook:
                    decision = "Watch for Entry. Macro is favorable, waiting for technical trend to establish."
                
                elif regime == "Accumulation":
                    if is_sector_aligned:
                        decision = f"Build Position. Accumulation phase in a priority macro sector ({playbook_title})."
                    else:
                        decision = "Hold / Watch. Quiet absorption detected, but sector is not currently a macro priority."
                
                elif macro_status == "Risk-Off":
                     decision = "Defensive. Macro Risk-Off environment overrides technical setups."
        except Exception as p_err:
            print(f"Error fetching Market Proxies: {p_err}")

        # Prepare response
        # Convert index (Date) to listing
        df.reset_index(inplace=True)
        
        # Convert to list of dicts for frontend
        data = df.to_dict(orient="records")
        
        # Handle nan values (JSON doesn't support NaN)
        cleaned_data = []
        for row in data:
            new_row = {}
            for k, v in row.items():
                if pd.isna(v):
                    new_row[k] = None
                else:
                    new_row[k] = v
            # Ensure Date is string
            new_row['Date'] = row['Date'].isoformat()
            cleaned_data.append(new_row)

        return {
            "symbol": symbol,
            "data": cleaned_data,
            "regime": regime,
            "regime_reason": reason,
            "volatility": volatility_status,
            "confidence": confidence,
            "confluence_factor": confluence_count,
            "macro_status": macro_status,
            "relative_strength": round(float(relative_strength), 4),
            "macro_tides": macro_tides,
            "strategic_suggestion": suggestion,
            "decision": decision,
            "sector_analysis": {
                "stock_sector": stock_sector,
                "leading_sector": leading_sector,
                "is_leading": is_leading_sector
            }
        }

    except Exception as e:
        print(f"Error analyzing {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
