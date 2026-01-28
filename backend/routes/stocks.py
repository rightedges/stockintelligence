from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
import yfinance as yf
import pandas as pd
import ta
from database import get_session
from models import Stock, StockPublic
from cache import get_cached, set_cache

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

def calculate_indicators(df):
    if len(df) < 2:
        return df
        
    # Calculate Indicators using 'ta' library
    # MACD
    df['macd'] = ta.trend.macd(df['Close'])
    df['macd_signal'] = ta.trend.macd_signal(df['Close'])
    df['macd_diff'] = ta.trend.macd_diff(df['Close'])
    
    # RSI
    df['rsi'] = ta.momentum.rsi(df['Close'], window=14)
    
    # EMA
    df['ema_13'] = ta.trend.ema_indicator(df['Close'], window=13)
    df['ema_22'] = ta.trend.ema_indicator(df['Close'], window=22)
    df['ema_26'] = ta.trend.ema_indicator(df['Close'], window=26)
    df['ema_50'] = ta.trend.ema_indicator(df['Close'], window=50)
    df['ema_200'] = ta.trend.ema_indicator(df['Close'], window=200)

    # 95% Envelope Logic (Elder's Auto-Envelope)
    window = 100
    dist = (df['High'] - df['ema_22']).abs() / df['ema_22']
    # Use rolling quantile if enough data, else fallback
    if len(df) >= window:
        multiplier = dist.rolling(window=window).quantile(0.95).iloc[-1]
    else:
        multiplier = dist.quantile(0.95) # Fallback for short history
        
    if pd.isna(multiplier) or multiplier == 0: multiplier = 0.03 # Fallback
    
    df['envelope_upper'] = df['ema_22'] * (1 + multiplier)
    df['envelope_lower'] = df['ema_22'] * (1 - multiplier)

    # Calculate Volume SMA
    df['volume_sma_20'] = ta.trend.sma_indicator(df['Volume'], window=20)

    # --- Alex Elder Indicators ---
    # 1. Elder Impulse System
    df['ema_13_slope'] = df['ema_13'].diff()
    df['macd_diff_slope'] = df['macd_diff'].diff()
    
    def get_impulse(row):
        if pd.isna(row['ema_13_slope']) or pd.isna(row['macd_diff_slope']):
            return "blue" # Default
        if row['ema_13_slope'] > 0 and row['macd_diff_slope'] > 0:
            return "green"
        elif row['ema_13_slope'] < 0 and row['macd_diff_slope'] < 0:
            return "red"
        else:
            return "blue"
    
    df['impulse'] = df.apply(get_impulse, axis=1)

    # 2. Elder-ray Index
    df['bulls_power'] = df['High'] - df['ema_13']
    df['bears_power'] = df['Low'] - df['ema_13']

    # 3. Force Index
    raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
    df['force_index_2'] = raw_force.ewm(span=2, adjust=False).mean()
    df['force_index_13'] = raw_force.ewm(span=13, adjust=False).mean()
    
    return df

@router.post("/", response_model=Stock)
def add_stock(stock: Stock, session: Session = Depends(get_session)):
    # Sanitize symbol
    stock.symbol = stock.symbol.strip().upper().replace("\n", "").replace("\r", "")
    
    # Check if stock exists
    statement = select(Stock).where(Stock.symbol == stock.symbol)
    existing_stock = session.exec(statement).first()
    if existing_stock:
        raise HTTPException(status_code=400, detail="Stock already exists")
    
    # Verify symbol with yfinance (Use cache for info)
    info = get_cached(f"info_{stock.symbol}", ttl=86400) # Info can last 24h
    if not info:
        try:
            ticker = yf.Ticker(stock.symbol)
            info = ticker.info
            set_cache(f"info_{stock.symbol}", info, use_pkl=False)
        except Exception as e:
            print(f"Error fetching info for {stock.symbol}: {e}")
            info = {}

    if 'symbol' not in info and not info.get('regularMarketPrice'):
         # info check can be unreliable, but let's try to be smart
         # If yfinance failed completely, we still allow adding the stock
         # but maybe warn or just rely on manual entry/updates later
         pass 

    # Populate name if missing
    if not stock.name and 'longName' in info:
        stock.name = info['longName']
    if not stock.name and 'shortName' in info:
        stock.name = info['shortName']
    if not stock.sector and 'sector' in info:
        stock.sector = info['sector']

    session.add(stock)
    session.commit()
    session.refresh(stock)
    return stock

    session.refresh(stock)
    return stock

@router.post("/scan")
def scan_stocks(session: Session = Depends(get_session)):
    import time
    
    # Get all stocks
    stocks = session.exec(select(Stock)).all()
    results = []
    
    # Process each stock (limit history to save bandwidth)
    for stock in stocks:
        try:
            # 1. Fetch Daily Data (~1y is enough for divergence)
            # Use yfinance directly, bypass heavy caching for speed or use short TTL?
            # We'll use download but minimal call
            df = yf.download(stock.symbol, period="1y", interval="1d", progress=False)
            
            if df.empty or len(df) < 50:
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            
            # 2. Calculate Indicators (MACD & Force Index)
            # Use minimal calcs to save CPU
            df['macd'] = ta.trend.macd(df['Close'])
            df['macd_signal'] = ta.trend.macd_signal(df['Close'])
            df['macd_diff'] = ta.trend.macd_diff(df['Close'])
            
            # Force Index
            raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
            df['force_index_13'] = raw_force.ewm(span=13, adjust=False).mean()
            
            # 3. Check Divergence
            # Use the existing find_divergence logic but reused here
            # Ideally Refactor find_divergence to be reusable outside get_stock_analysis
            # But for now, we duplicate the core check or extract it.
            # Let's simple duplicate the core algorithm for safety/simplicity in this context
            
            div_status = None
            
            # Helper for scan
            def check_div_scan(df, indicator_col):
                hist = df[indicator_col].values
                prices = df['High'].values
                lows = df['Low'].values
                
                # Segments
                segments = []
                current_seg = {"indices": [0], "type": "pos" if hist[0] >= 0 else "neg"}
                for i in range(1, len(hist)):
                    is_pos = hist[i] >= 0
                    if (is_pos and current_seg["type"] == "pos") or (not is_pos and current_seg["type"] == "neg"):
                        current_seg["indices"].append(i)
                    else:
                        segments.append(current_seg)
                        current_seg = {"indices": [i], "type": "pos" if is_pos else "neg"}
                segments.append(current_seg)
                
                # Extrema
                for seg in segments:
                    idxs = seg["indices"]
                    # Indicator extrema (for momentum comparison and drawing)
                    if seg["type"] == "pos":
                        peak_idx = idxs[0] + hist[idxs].argmax()
                        seg["extrema_idx"] = int(peak_idx)
                        seg["extrema_val"] = float(hist[peak_idx])
                        # Use the true High of the entire segment for price comparison
                        seg["price_at_extrema"] = float(prices[idxs].max())
                    else:
                        trough_idx = idxs[0] + hist[idxs].argmin()
                        seg["extrema_idx"] = int(trough_idx)
                        seg["extrema_val"] = float(hist[trough_idx])
                        # Use the true Low of the entire segment for price comparison
                        seg["price_at_extrema"] = float(lows[idxs].min())
                        
                # Bearish Lookback (Dynamic S2 & Stricter Bridge)
                pos_segs = [s for s in segments if s["type"] == "pos" and len(s["indices"]) > 1]
                if len(pos_segs) >= 2:
                    # Check top 2 most recent segments as potential s2 (latest or previous)
                    for j in range(1, min(len(pos_segs), 3)):
                        s2 = pos_segs[-j]
                        if (len(hist) - 1 - s2["extrema_idx"]) < 5:
                            is_confirmed = (len(hist) - 1 - s2["extrema_idx"]) >= 1
                            indicator_ticked_down = hist[-1] < s2["extrema_val"] if is_confirmed else False
                            
                            if j > 1:
                                is_confirmed = True
                                indicator_ticked_down = True

                            if is_confirmed and indicator_ticked_down:
                                # Stricter historical lookback (Elder Standard: usually immediate previous wave)
                                for k in range(1, min(len(pos_segs) - (j-1), 4)):
                                    s1 = pos_segs[-j - k]
                                    s1_idx_in_all = segments.index(s1)
                                    s2_idx_in_all = segments.index(s2)
                                    
                                    # 1. Bridge Constraint: Max 3 intervening waves (e.g. crossing one major cycle)
                                    bridge_waves = s2_idx_in_all - s1_idx_in_all - 1
                                    # 2. Distance Constraint: Max 60 bars (3 months)
                                    distance_bars = s2["extrema_idx"] - s1["extrema_idx"]
                                    
                                    if bridge_waves <= 3 and distance_bars <= 60:
                                        # Tightened tolerance to 0.5% for Double Tops
                                        price_condition = s2["price_at_extrema"] >= (s1["price_at_extrema"] * 0.995)
                                        if price_condition and s2["extrema_val"] < s1["extrema_val"]:
                                            if any(segments[m]["type"] == "neg" for m in range(s1_idx_in_all + 1, s2_idx_in_all)):
                                                return "bearish"
                
                # Bullish Lookback (Dynamic S2 & Stricter Bridge)
                neg_segs = [s for s in segments if s["type"] == "neg" and len(s["indices"]) > 1]
                if len(neg_segs) >= 2:
                    for j in range(1, min(len(neg_segs), 3)):
                        s2 = neg_segs[-j]
                        if (len(hist) - 1 - s2["extrema_idx"]) < 5:
                            is_confirmed = (len(hist) - 1 - s2["extrema_idx"]) >= 1
                            indicator_ticked_up = hist[-1] > s2["extrema_val"] if is_confirmed else False
                            
                            if j > 1:
                                is_confirmed = True
                                indicator_ticked_up = True

                            if is_confirmed and indicator_ticked_up:
                                for k in range(1, min(len(neg_segs) - (j-1), 4)):
                                    s1 = neg_segs[-j - k]
                                    s1_idx_in_all = segments.index(s1)
                                    s2_idx_in_all = segments.index(s2)
                                    
                                    bridge_waves = s2_idx_in_all - s1_idx_in_all - 1
                                    distance_bars = s2["extrema_idx"] - s1["extrema_idx"]

                                    if bridge_waves <= 3 and distance_bars <= 60:
                                        # Tightened tolerance to 0.5% for Double Bottoms
                                        price_condition = s2["price_at_extrema"] <= (s1["price_at_extrema"] * 1.005)
                                        if price_condition and s2["extrema_val"] > s1["extrema_val"]:
                                             if any(segments[m]["type"] == "pos" for m in range(s1_idx_in_all + 1, s2_idx_in_all)):
                                                 return "bullish"
                return None

            macd_div = check_div_scan(df, 'macd_diff')
            f13_div = check_div_scan(df, 'force_index_13')
            
            final_status = None
            if macd_div and f13_div and macd_div == f13_div:
                final_status = f"dual_{macd_div}" # dual_bullish or dual_bearish
            elif macd_div:
                final_status = macd_div
            elif f13_div:
                final_status = f13_div # store as 'bullish'/'bearish'? Or separate?
                # To distinguish, maybe prefix? But UI expects 'bullish'/'bearish' for color.
                # Let's just use 'bullish'/'bearish' priority MACD
                # User asked: "use color code in symbol list"
            
            # Update DB
            stock.divergence_status = final_status
            session.add(stock)
            
            if final_status:
                results.append({"symbol": stock.symbol, "status": final_status})
            
            # Anti-Block Sleep
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Scan failed for {stock.symbol}: {e}")
            continue
    
    session.commit()
    return {"scanned": len(stocks), "divergences": results}

@router.get("/", response_model=list[StockPublic])
def get_stocks(session: Session = Depends(get_session)):
    # Sort by is_watched (descending -> True first) then symbol (ascending)
    statement = select(Stock).order_by(Stock.is_watched.desc(), Stock.symbol)
    stocks = session.exec(statement).all()
    public_stocks = []
    
    # Process weekly impulse for sidebar coloring
    # This is optimizing to do 1 request per stock (could be better but ok for <20 stocks)
    for stock in stocks:
        try:
             # Check cache for fetching weekly data
            cache_key = f"impulse_wk_{stock.symbol}"
            impulse = get_cached(cache_key, ttl=3600) # Cache for 1 hour
            
            if not impulse:
                # Fetch only last ~50 weeks to calculate indicators
                wk_df = yf.download(stock.symbol, period="1y", interval="1wk", progress=False)
                if not wk_df.empty:
                    if isinstance(wk_df.columns, pd.MultiIndex):
                        wk_df.columns = wk_df.columns.get_level_values(0)
                    
                    # Calculate minimal indicators for impulse
                    wk_df['ema_13'] = ta.trend.ema_indicator(wk_df['Close'], window=13)
                    wk_df['macd_diff'] = ta.trend.macd_diff(wk_df['Close'])
                    
                    slope_ema = wk_df['ema_13'].diff().iloc[-1]
                    slope_macd = wk_df['macd_diff'].diff().iloc[-1]
                    
                    if slope_ema > 0 and slope_macd > 0:
                        impulse = "green"
                    elif slope_ema < 0 and slope_macd < 0:
                        impulse = "red"
                    else:
                        impulse = "blue"
                    
                    set_cache(cache_key, impulse)
            
            # Create StockPublic instance
            s_pub = StockPublic.model_validate(stock)
            s_pub.impulse = impulse
            public_stocks.append(s_pub)
            
        except Exception as e:
            print(f"Error calc weekly impulse for {stock.symbol}: {e}")
            # Fallback
            s_pub = StockPublic.model_validate(stock)
            s_pub.impulse = "blue"
            public_stocks.append(s_pub)

    return public_stocks

@router.delete("/{symbol}")
def delete_stock(symbol: str, session: Session = Depends(get_session)):
    statement = select(Stock).where(Stock.symbol == symbol)
    stock = session.exec(statement).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    session.delete(stock)
    session.commit()
    session.commit()
    return {"ok": True}

@router.put("/{symbol}/watch", response_model=Stock)
def toggle_watch(symbol: str, session: Session = Depends(get_session)):
    statement = select(Stock).where(Stock.symbol == symbol)
    stock = session.exec(statement).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    stock.is_watched = not stock.is_watched
    session.add(stock)
    session.commit()
    session.refresh(stock)
    return stock

@router.get("/{symbol}/analysis")
def get_stock_analysis(symbol: str, interval: str = "1d", period: str = "1y"):
    # Fetch data (Use cache)
    cache_key = f"download_{symbol}_{period}_{interval}"
    df = get_cached(cache_key, ttl=900) # 15 mins for price data

    try:
        if df is None:
            df = yf.download(symbol, period=period, interval=interval, progress=False)
            if df.empty:
                 raise HTTPException(status_code=404, detail="No data found for symbol")
            set_cache(cache_key, df)
        
        # Clean data (flatten MultiIndex columns if present, yfinance updated recently)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        # Calculate Indicators using Helper
        df = calculate_indicators(df)

        # --- Support & Resistance Detection ---
        # Look for local extrema in the last 100 days
        def find_levels(df, window=5):
            levels = []
            if len(df) < window * 2 + 1:
                return levels
            
            # Simple fractal-based detection
            for i in range(window, len(df) - window):
                # Resistance (Local Peak)
                is_resistance = True
                for j in range(i - window, i + window + 1):
                    if df['High'].iloc[j] > df['High'].iloc[i]:
                        is_resistance = False
                        break
                if is_resistance:
                    levels.append({"price": float(df['High'].iloc[i]), "type": "resistance", "date": df.index[i]})

                # Support (Local Trough)
                is_support = True
                for j in range(i - window, i + window + 1):
                    if df['Low'].iloc[j] < df['Low'].iloc[i]:
                        is_support = False
                        break
                if is_support:
                    levels.append({"price": float(df['Low'].iloc[i]), "type": "support", "date": df.index[i]})
            
            
            # --- Explicitly Add Recent Range (Last 30 Days) ---
            # Fractals might miss the most recent high/low because of the window lag.
            if len(df) > 2:
                recent_df = df.iloc[-30:] # Look at last 30 bars
                
                # Recent Resistance
                max_idx = recent_df['High'].idxmax()
                recent_high = float(recent_df['High'].loc[max_idx])
                
                # Check if this high is close to an existing fractal level
                is_duplicate = False
                for l in levels:
                    if l['type'] == 'resistance' and abs(l['price'] - recent_high) / recent_high < 0.01:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    levels.append({"price": recent_high, "type": "resistance", "date": max_idx})
                
                # Recent Support
                min_idx = recent_df['Low'].idxmin()
                recent_low = float(recent_df['Low'].loc[min_idx])
                
                is_duplicate = False
                for l in levels:
                    if l['type'] == 'support' and abs(l['price'] - recent_low) / recent_low < 0.01:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    levels.append({"price": recent_low, "type": "support", "date": min_idx})

            # Keep only the most recent and significant ones
            # Increased limit to 3 to assume better coverage
            res_levels = [l for l in levels if l['type'] == 'resistance']
            sup_levels = [l for l in levels if l['type'] == 'support']
            
            final_levels = []
            if res_levels:
                final_levels.extend(sorted(res_levels, key=lambda x: x['date'], reverse=True)[:3])
            if sup_levels:
                final_levels.extend(sorted(sup_levels, key=lambda x: x['date'], reverse=True)[:3])
            
            return final_levels
            
            return final_levels

        sr_levels = find_levels(df.tail(120)) # Look at last 120 candles

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
            # Confluence Tracking
            confluence_details = {
                "trend": False,
                "momentum": False,
                "flow": False
            }

            # 1. Mark-Up (Classic Uptrend)
            if last_close > last_ema50 > last_ema200:
                regime = "Mark-Up"
                reason = "Strong uptrend with price leading key averages."
                confluence_details["trend"] = True
                if rsi_bullish: 
                    confluence_details["momentum"] = True
                    confluence_count += 1
                if volume_conf: 
                    confluence_details["flow"] = True
                    confluence_count += 1
            
            # 2. Mark-Down (Classic Downtrend)
            elif last_close < last_ema50 < last_ema200:
                regime = "Mark-Down"
                reason = "Established downtrend; price breaking lower."
                confluence_details["trend"] = True
                if rsi_bearish: 
                    confluence_details["momentum"] = True
                    confluence_count += 1
                if volume_conf: 
                    confluence_details["flow"] = True
                    confluence_count += 1

            # 3. Distribution (Breaking down from Highs)
            elif last_close < last_ema50 and last_ema50 >= last_ema200:
                regime = "Distribution"
                reason = "Price breaking below fast EMA while trend averages are flat or topping."
                confluence_details["trend"] = True
                if volume_conf: # Aggressive selling
                    confluence_details["flow"] = True
                    confluence_count += 1
                if rsi_bearish:
                    confluence_details["momentum"] = True
                    confluence_count += 1
            
            # 4. Accumulation (Breaking up from Lows)
            elif last_close > last_ema50 and last_ema50 <= last_ema200:
                regime = "Accumulation"
                reason = "Price recovering above fast EMA; potential smart money absorption."
                confluence_details["trend"] = True
                if not volume_conf: # Quiet buying is accumulation
                    confluence_details["flow"] = True
                    confluence_count += 1
                if rsi_bullish:
                    confluence_details["momentum"] = True
                    confluence_count += 1
            
            # 5. Squeeze / Indecision
            elif abs(last_ema50 - last_ema200) / last_ema200 < 0.02:
                regime = "Consolidation"
                reason = "Averages are tight; market awaiting macro catalyst."
                confluence_details["trend"] = True
            
            else:
                 regime = "Transition"
                 reason = "Price is between major moving averages; direction is neutral."
                 confluence_count = 1
                 confluence_details["trend"] = True

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
            cache_key_proxies = f"proxies_{period}_{interval}"
            p_data = get_cached(cache_key_proxies, ttl=3600) # Macro cache 1h
            
            if p_data is None:
                p_data = yf.download(proxies, period=period, interval=interval, progress=False)
                set_cache(cache_key_proxies, p_data)
            
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
                cache_key_sectors = "sector_leadership_1mo"
                s_data = get_cached(cache_key_sectors, ttl=14400) # Sector cache 4h
                
                if s_data is None:
                    s_data = yf.download(sector_etfs, period="2mo", interval="1d", progress=False)
                    set_cache(cache_key_sectors, s_data)

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

        # --- Alex Elder Tactical Logic ---
        # 1. Trend (The Tide)
        # If interval is daily, Screen 1 (The Tide) must be the Weekly EMA13 slope.
        # If already in weekly, use the current dataframe.
        
        ema13_slope = df['ema_13'].diff().iloc[-1]
        tide_slope = ema13_slope
        tide_label = "Daily"
        
        if interval == "1d":
            try:
                # Fetch weekly data for Screen 1 (The Tide)
                cache_key_wk = f"tide_wk_{symbol}"
                wk_df = get_cached(cache_key_wk, ttl=3600)
                if wk_df is None:
                    wk_df = yf.download(symbol, period="2y", interval="1wk", progress=False)
                    if isinstance(wk_df.columns, pd.MultiIndex):
                        wk_df.columns = wk_df.columns.get_level_values(0)
                    set_cache(cache_key_wk, wk_df)
                
                if not wk_df.empty and len(wk_df) > 13:
                    wk_ema13 = ta.trend.ema_indicator(wk_df['Close'], window=13)
                    tide_slope = wk_ema13.diff().iloc[-1]
                    tide_label = "Weekly"
            except Exception as wk_err:
                print(f"Error fetching Weekly Tide for {symbol}: {wk_err}")
                # Fallback to daily slope if weekly fails

        force2 = df['force_index_2'].iloc[-1]
        impulse_color = df['impulse'].iloc[-1]
        
        # 2. Strategy Synthesis
        elder_recommendation = "WAIT"
        tactic_reason = "No high-confluence setup detected."
        entry_price = None
        target_price = None
        stop_price = None

        u_envelope = df['envelope_upper'].iloc[-1]
        l_envelope = df['envelope_lower'].iloc[-1]

        # BUY Logic: Rising Tide (Weekly if Daily view) + Negative Force Index 2 (Wave)
        if tide_slope > 0:
            entry_price = float(df['High'].iloc[-1]) if force2 < 0 else float(df['ema_13'].iloc[-1])
            target_price = float(u_envelope)
            stop_price = float(df['ema_26'].iloc[-1])
            
            if impulse_color == "red":
                elder_recommendation = "WAIT (CENSORED)"
                tactic_reason = f"{tide_label} Tide is active, but Impulse System is RED. Long trades are forbidden."
            elif force2 < 0:
                elder_recommendation = "BUY"
                tactic_reason = f"{tide_label} EMA 13 is rising (Bull Tide); 2-day pullback detected. Impulse allows entry."
            else:
                elder_recommendation = "HOLD / ADD"
                tactic_reason = f"{tide_label} Tide is intact. Optimal entry is near the EMA 13 value zone."
        
        # SELL Logic: Falling Tide (Weekly if Daily view) + Positive Force Index 2 (Wave)
        elif tide_slope < 0:
            entry_price = float(df['Low'].iloc[-1]) if force2 > 0 else float(df['ema_13'].iloc[-1])
            target_price = float(l_envelope)
            stop_price = float(df['ema_26'].iloc[-1])

            if impulse_color == "green":
                elder_recommendation = "WAIT (CENSORED)"
                tactic_reason = f"{tide_label} Tide is active, but Impulse System is GREEN. Short trades are forbidden."
            elif force2 > 0:
                elder_recommendation = "SELL / SHORT"
                tactic_reason = f"{tide_label} EMA 13 is falling (Bear Tide); rally detected. Impulse allows entry."
            else:
                elder_recommendation = "AVOID / PROTECT"
                tactic_reason = f"{tide_label} Tide is intact. Trend is down; look for exit opportunities near EMA 13."

        elder_tactics = {
            "type": "LONG" if tide_slope > 0 else "SHORT",
            "recommendation": elder_recommendation,
            "reason": tactic_reason,
            "entry": round(entry_price, 2) if entry_price else None,
            "target": round(target_price, 2) if target_price else None,
            "stop": round(stop_price, 2) if stop_price else None,
            "style": "success" if elder_recommendation in ["BUY", "HOLD / ADD"] else "danger" if elder_recommendation in ["SELL / SHORT", "AVOID / PROTECT"] else "warning"
        }

        # Prepare response
        # --- MACD Divergence Detection (Wave-based) ---
        # --- Divergence Detection (Generic) ---
        def find_divergence(df, indicator_col):
            if len(df) < 50: return None
            
            
            hist = df[indicator_col].values
            prices = df['High'].values # Use Highs for Bearish
            lows = df['Low'].values # Use Lows for Bullish
            
            # 1. Identify Segments (waves between zero-crossings)
            segments = []
            if len(hist) < 2: return None
            
            current_seg = {"indices": [0], "type": "pos" if hist[0] >= 0 else "neg"}
            
            for i in range(1, len(hist)):
                h = hist[i]
                is_pos = h >= 0
                if (is_pos and current_seg["type"] == "pos") or (not is_pos and current_seg["type"] == "neg"):
                    current_seg["indices"].append(i)
                else:
                    segments.append(current_seg)
                    current_seg = {"indices": [i], "type": "pos" if is_pos else "neg"}
            segments.append(current_seg)
            
            # 2. Extract extrema for each segment
            for seg in segments:
                idxs = seg["indices"]
                if seg["type"] == "pos":
                    peak_idx = idxs[0] + hist[idxs].argmax()
                    seg["extrema_idx"] = int(peak_idx)
                    seg["extrema_val"] = float(hist[peak_idx])
                    # Use segment max High
                    seg["price_at_extrema"] = float(prices[idxs].max())
                else:
                    trough_idx = idxs[0] + hist[idxs].argmin()
                    seg["extrema_idx"] = int(trough_idx)
                    seg["extrema_val"] = float(hist[trough_idx])
                    # Use segment min Low
                    seg["price_at_extrema"] = float(lows[idxs].min())

            # 3. Detect Bearish Divergence Lookback (Dynamic S2 & Stricter Bridge)
            pos_segs = [s for s in segments if s["type"] == "pos" and len(s["indices"]) > 1]
            if len(pos_segs) >= 2:
                for j in range(1, min(len(pos_segs), 3)):
                    s2 = pos_segs[-j]
                    if (len(hist) - 1 - s2["extrema_idx"]) < 30:
                        is_confirmed = (len(hist) - 1 - s2["extrema_idx"]) >= 1
                        indicator_ticked_down = hist[-1] < s2["extrema_val"] if is_confirmed else False
                        
                        if j > 1:
                            is_confirmed = True
                            indicator_ticked_down = True

                        if is_confirmed and indicator_ticked_down:
                            for k in range(1, min(len(pos_segs) - (j-1), 4)):
                                s1 = pos_segs[-j - k]
                                s1_idx_all = segments.index(s1)
                                s2_idx_all = segments.index(s2)
                                bridge_count = s2_idx_all - s1_idx_all - 1
                                distance_count = s2["extrema_idx"] - s1["extrema_idx"]

                                if bridge_count <= 3 and distance_count <= 60:
                                    # Tightened tolerance to 0.5%
                                    price_condition = s2["price_at_extrema"] >= (s1["price_at_extrema"] * 0.995)
                                    if price_condition and s2["extrema_val"] < s1["extrema_val"]:
                                        if any(segments[m]["type"] == "neg" for m in range(s1_idx_all + 1, s2_idx_all)):
                                            return {"type": "bearish", "idx1": s1["extrema_idx"], "idx2": s2["extrema_idx"]}

            # 4. Detect Bullish Divergence Lookback (Dynamic S2 & Stricter Bridge)
            neg_segs = [s for s in segments if s["type"] == "neg" and len(s["indices"]) > 1]
            if len(neg_segs) >= 2:
                for j in range(1, min(len(neg_segs), 3)):
                    s2 = neg_segs[-j]
                    if (len(hist) - 1 - s2["extrema_idx"]) < 30:
                        is_confirmed = (len(hist) - 1 - s2["extrema_idx"]) >= 1
                        indicator_ticked_up = hist[-1] > s2["extrema_val"] if is_confirmed else False
                        
                        if j > 1:
                            is_confirmed = True
                            indicator_ticked_up = True

                        if is_confirmed and indicator_ticked_up:
                            for k in range(1, min(len(neg_segs) - (j-1), 4)):
                                s1 = neg_segs[-j - k]
                                s1_idx_all = segments.index(s1)
                                s2_idx_all = segments.index(s2)
                                bridge_count = s2_idx_all - s1_idx_all - 1
                                distance_count = s2["extrema_idx"] - s1["extrema_idx"]

                                if bridge_count <= 3 and distance_count <= 60:
                                    # Tightened tolerance to 0.5%
                                    price_condition = s2["price_at_extrema"] <= (s1["price_at_extrema"] * 1.005)
                                    if price_condition and s2["extrema_val"] > s1["extrema_val"]:
                                        if any(segments[m]["type"] == "pos" for m in range(s1_idx_all + 1, s2_idx_all)):
                                            return {"type": "bullish", "idx1": s1["extrema_idx"], "idx2": s2["extrema_idx"]}
            
            return None

        macd_divergence = find_divergence(df, 'macd_diff')
        f13_divergence = None
        if interval != '1wk':
             f13_divergence = find_divergence(df, 'force_index_13')

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
            "confluence_details": confluence_details,
            "macro_status": macro_status,
            "relative_strength": round(float(relative_strength), 4),
            "macro_tides": macro_tides,
            "strategic_suggestion": suggestion,
            "decision": decision,
            "sector_analysis": {
                "stock_sector": stock_sector,
                "leading_sector": leading_sector,
                "is_leading": is_leading_sector,
                "sector_performance": sector_performance
            },
            "sr_levels": sr_levels,
            "elder_tactics": elder_tactics,
            "macd_divergence": macd_divergence,
            "f13_divergence": f13_divergence
        }

    except Exception as e:
        print(f"Error analyzing {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
