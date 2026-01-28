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

def check_div_debug(df, indicator_col, symbol):
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
            seg["price_at_extrema"] = float(prices[peak_idx])
        else:
            trough_idx = idxs[0] + hist[idxs].argmin()
            seg["extrema_idx"] = int(trough_idx)
            seg["extrema_val"] = float(hist[trough_idx])
            seg["price_at_extrema"] = float(lows[trough_idx])

    print(f"\n--- {symbol} | {indicator_col} ---")
    pos_segs = [s for s in segments if s["type"] == "pos" and len(s["indices"]) > 1]
    neg_segs = [s for s in segments if s["type"] == "neg" and len(s["indices"]) > 1]

    # Current Logic (Bearish)
    print("Bearish Candidates (New Logic):")
    if len(pos_segs) >= 2:
        for j in range(1, min(len(pos_segs), 3)):
            s2 = pos_segs[-j]
            for k in range(1, min(len(pos_segs) - (j-1), 4)):
                s1 = pos_segs[-j - k]
                recency = len(hist) - 1 - s2["extrema_idx"]
                if recency >= 30: continue
                
                # Check intervening
                s1_all_idx = segments.index(s1)
                s2_all_idx = segments.index(s2)
                bridge_count = s2_all_idx - s1_all_idx - 1
                distance_count = s2["extrema_idx"] - s1["extrema_idx"]
                
                # Divergence conditions
                price_cond = s2["price_at_extrema"] >= (s1["price_at_extrema"] * 0.98)
                ind_cond = s2["extrema_val"] < s1["extrema_val"]
                
                if price_cond and ind_cond and bridge_count <= 3 and distance_count <= 60:
                    print(f"  FOUND: s1(idx:{s1['extrema_idx']}) to s2(idx:{s2['extrema_idx']}) | Bridge Waves: {bridge_count} | Distance: {distance_count} | Recency: {recency}")

    # Current Logic (Bullish)
    print("Bullish Candidates (New Logic):")
    if len(neg_segs) >= 2:
        for j in range(1, min(len(neg_segs), 3)):
            s2 = neg_segs[-j]
            for k in range(1, min(len(neg_segs) - (j-1), 4)):
                s1 = neg_segs[-j - k]
                recency = len(hist) - 1 - s2["extrema_idx"]
                if recency >= 30: continue
                
                s1_all_idx = segments.index(s1)
                s2_all_idx = segments.index(s2)
                bridge_count = s2_all_idx - s1_all_idx - 1
                distance_count = s2["extrema_idx"] - s1["extrema_idx"]
                
                price_cond = s2["price_at_extrema"] <= (s1["price_at_extrema"] * 1.02)
                ind_cond = s2["extrema_val"] > s1["extrema_val"]
                
                if price_cond and ind_cond and bridge_count <= 3 and distance_count <= 60:
                    print(f"  FOUND: s1(idx:{s1['extrema_idx']}) to s2(idx:{s2['extrema_idx']}) | Bridge Waves: {bridge_count} | Distance: {distance_count} | Recency: {recency}")

symbol = "AMD"
df = yf.download(symbol, period="1y", interval="1d", progress=False)
if isinstance(df.columns, pd.MultiIndex):
    df.columns = df.columns.get_level_values(0)
df = calculate_indicators(df)

check_div_debug(df, 'macd_diff', symbol)
check_div_debug(df, 'force_index_13', symbol)

# Also check AVGO and GOOGL to see why they needed the fix
for s in ["AVGO", "GOOGL", "ESTC"]:
    df_s = yf.download(s, period="1y", interval="1d", progress=False)
    if isinstance(df_s.columns, pd.MultiIndex):
        df_s.columns = df_s.columns.get_level_values(0)
    df_s = calculate_indicators(df_s)
    check_div_debug(df_s, 'macd_diff', s)
    check_div_debug(df_s, 'force_index_13', s)
