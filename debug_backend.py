import sys
import os
import pandas as pd
import yfinance as yf
import ta

# Add backend to path
sys.path.append("/Users/william/Documents/stock2026/backend")

from routes.stocks import calculate_indicators

def test_analysis(symbol):
    print(f"Testing {symbol}...")
    df = yf.download(symbol, period="1y", interval="1d", progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    
    df = calculate_indicators(df)
    
    # Simulate the strategy synthesis logic
    tide_slope = 0.5 # Dummy positive tide
    tide_label = "Weekly"
    
    force2 = df['force_index_2'].iloc[-1]
    wr = df['williams_r'].iloc[-1]
    stoch_k = df['stoch_k'].iloc[-1]
    impulse_color = df['impulse'].iloc[-1]
    
    f2_streak = 0
    f2_vals = df['force_index_2'].values
    if force2 > 0:
        for v in reversed(f2_vals):
            if v > 0: f2_streak += 1
            else: break
    else:
        for v in reversed(f2_vals):
            if v < 0: f2_streak += 1
            else: break

    print(f"Force2: {force2}, Streak: {f2_streak}, WR: {wr}, StochK: {stoch_k}")
    
    u_envelope = df['envelope_upper'].iloc[-1]
    l_envelope = df['envelope_lower'].iloc[-1]
    
    entry_price = float(df['High'].iloc[-1])
    target_price = float(u_envelope)
    stop_price = float(df['ema_26'].iloc[-1])
    
    # Simulate find_divergence logic
    def find_divergence(df, indicator_col):
        hist = df[indicator_col].values
        prices = df['High'].values
        lows = df['Low'].values
        
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

        # Bullish Divergence check
        neg_segs = [s for s in segments if s["type"] == "neg" and len(s["indices"]) > 1]
        if len(neg_segs) >= 2:
            for j in range(1, min(len(neg_segs), 3)):
                s2 = neg_segs[-j]
                recency = len(hist) - 1 - s2["extrema_idx"]
                if recency < 30:
                    for k in range(1, min(len(neg_segs) - (j-1), 4)):
                        s1 = neg_segs[-j - k]
                        # ... bridge logic etc.
                        pass
        return "Checked Divergence"

    print("Checking F13 Divergence...")
    find_divergence(df, 'force_index_13')

    # Simulate Serialization
    df.reset_index(inplace=True)
    data = df.to_dict(orient="records")
    cleaned_data = []
    print(f"Serializing {len(data)} rows...")
    for row in data:
        new_row = {}
        for k, v in row.items():
            if pd.isna(v):
                new_row[k] = None
            else:
                new_row[k] = v
        try:
            new_row['Date'] = row['Date'].isoformat()
        except AttributeError:
             print(f"ERROR: Date column has type {type(row['Date'])}")
             raise
        cleaned_data.append(new_row)
    print("Serialization Success!")

if __name__ == "__main__":
    try:
        test_analysis("AVGO")
        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()
