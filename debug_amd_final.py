import yfinance as yf
import pandas as pd
import ta
import numpy as np

def calculate_indicators(df):
    # MACD
    df['macd_diff'] = ta.trend.macd_diff(df['Close'])
    # Force Index 13
    raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
    df['force_index_13'] = raw_force.ewm(span=13, adjust=False).mean()
    return df

def check_div_scan_logic(df, indicator_col, symbol):
    hist = df[indicator_col].values
    prices = df['High'].values
    lows = df['Low'].values
    
    segments = []
    if len(hist) < 1: return
    current_seg = {"indices": [0], "type": "pos" if hist[0] >= 0 else "neg"}
    for i in range(1, len(hist)):
        is_pos = hist[i] >= 0
        if (is_pos and current_seg["type"] == "pos") or (not is_pos and current_seg["type"] == "neg"):
            current_seg["indices"].append(i)
        else:
            segments.append(current_seg)
            current_seg = {"indices": [i], "type": "pos" if is_pos else "neg"}
    segments.append(current_seg)
    
    for seg in segments:
        idxs = seg["indices"]
        if seg["type"] == "pos":
            peak_idx = idxs[0] + hist[idxs].argmax()
            seg["extrema_idx"] = int(peak_idx)
            seg["extrema_val"] = float(hist[peak_idx])
            seg["price_at_extrema"] = float(prices[idxs].max())
        else:
            trough_idx = idxs[0] + hist[idxs].argmin()
            seg["extrema_idx"] = int(trough_idx)
            seg["extrema_val"] = float(hist[trough_idx])
            seg["price_at_extrema"] = float(lows[idxs].min())

    print(f"\n--- {symbol} | {indicator_col} ---")
    
    # Bearish
    pos_segs = [s for s in segments if s["type"] == "pos" and len(s["indices"]) > 1]
    if len(pos_segs) >= 2:
        for j in range(1, min(len(pos_segs), 3)):
            s2 = pos_segs[-j]
            recency = len(hist) - 1 - s2["extrema_idx"]
            if recency < 5:
                is_confirmed = recency >= 1
                indicator_ticked_down = hist[-1] < s2["extrema_val"] if is_confirmed else False
                if j > 1:
                    is_confirmed = True
                    indicator_ticked_down = True
                
                print(f"DEBUG: s2(idx:{s2['extrema_idx']}) | recency:{recency} | confirmed:{is_confirmed} | ticked_down:{indicator_ticked_down}")
                
                if is_confirmed and indicator_ticked_down:
                    for k in range(1, min(len(pos_segs) - (j-1), 4)):
                        s1 = pos_segs[-j - k]
                        s1_idx_in_all = segments.index(s1)
                        s2_idx_in_all = segments.index(s2)
                        bridge_waves = s2_idx_in_all - s1_idx_in_all - 1
                        distance_bars = s2["extrema_idx"] - s1["extrema_idx"]
                        
                        price_cond = s2["price_at_extrema"] >= (s1["price_at_extrema"] * 0.995)
                        ind_cond = s2["extrema_val"] < s1["extrema_val"]
                        has_bridge = any(segments[m]["type"] == "neg" for m in range(s1_idx_in_all + 1, s2_idx_in_all))
                        
                        print(f"  s1(idx:{s1['extrema_idx']}) | price_at_extrema: {s1['price_at_extrema']} vs s2: {s2['price_at_extrema']}")
                        print(f"  Conditions: bridge:{bridge_waves} | dist:{distance_bars} | price_cond:{price_cond} | ind_cond:{ind_cond} | has_bridge:{has_bridge}")
                        
                        if bridge_waves == 1 and distance_bars <= 60 and price_cond and ind_cond and has_bridge:
                            print(f"  >>> BEARISH DIV FOUND <<<")

    # Bullish
    neg_segs = [s for s in segments if s["type"] == "neg" and len(s["indices"]) > 1]
    if len(neg_segs) >= 2:
        for j in range(1, min(len(neg_segs), 3)):
            s2 = neg_segs[-j]
            recency = len(hist) - 1 - s2["extrema_idx"]
            if recency < 5:
                is_confirmed = recency >= 1
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
                        
                        price_cond = s2["price_at_extrema"] <= (s1["price_at_extrema"] * 1.005)
                        ind_cond = s2["extrema_val"] > s1["extrema_val"]
                        has_bridge = any(segments[m]["type"] == "pos" for m in range(s1_idx_in_all + 1, s2_idx_in_all))
                        
                        if bridge_waves == 1 and distance_bars <= 60 and price_cond and ind_cond and has_bridge:
                            print(f"  >>> BULLISH DIV FOUND <<<")

for s in ["AMD", "AVGO", "GOOGL", "ESTC"]:
    df_s = yf.download(s, period="1y", interval="1d", progress=False)
    if isinstance(df_s.columns, pd.MultiIndex):
        df_s.columns = df_s.columns.get_level_values(0)
    df_s = calculate_indicators(df_s)
    check_div_scan_logic(df_s, 'macd_diff', s)
    check_div_scan_logic(df_s, 'force_index_13', s)
