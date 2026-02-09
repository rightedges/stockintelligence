import pandas as pd
import numpy as np

def detect_candlestick_pattern(df):
    """Detect advanced candlestick patterns (supports up to 5-bar lookback)"""
    if len(df) < 2:
        return None, None
    
    # helper to get bars safely with negative indexing
    def get_bar(idx):
        if abs(idx) > len(df): return None
        return df.iloc[idx]
    
    curr = get_bar(-1)
    prev = get_bar(-2)
    prev2 = get_bar(-3)
    prev3 = get_bar(-4)
    prev4 = get_bar(-5)

    # Basic metrics
    def is_bull(bar): return bar['Close'] > bar['Open']
    def is_bear(bar): return bar['Close'] < bar['Open']
    def body_size(bar): return abs(bar['Close'] - bar['Open'])
    
    # Volatility Check: Use 15-bar average body as benchmark
    avg_body = df['Close'].sub(df['Open']).abs().tail(15).mean()
    if pd.isna(avg_body) or avg_body == 0: avg_body = 0.001
    
    def is_doji(bar):
        range_val = bar['High'] - bar['Low']
        return body_size(bar) / range_val < 0.15 if range_val > 0 else False

    def is_meaningful(bar, multiplier=0.8):
        return body_size(bar) > (avg_body * multiplier)

    # 1. Rising Three Methods (5-bar Trend Continuation)
    if prev4 is not None and is_meaningful(prev4, 1.5) and is_bull(prev4):
        # 3 small bear bars falling but within prev4 range
        small_bars = [prev3, prev2, prev]
        if all(is_bear(b) and body_size(b) < body_size(prev4) * 0.6 for b in small_bars):
            if all(b['High'] < prev4['High'] and b['Low'] > prev4['Low'] for b in small_bars):
                if is_bull(curr) and curr['Close'] > prev4['Close']:
                    return "rising_three_methods", "bullish"

    # 2. Falling Three Methods (5-bar)
    if prev4 is not None and is_meaningful(prev4, 1.5) and is_bear(prev4):
        small_bars = [prev3, prev2, prev]
        if all(is_bull(b) and body_size(b) < body_size(prev4) * 0.6 for b in small_bars):
            if all(b['Low'] > prev4['Low'] and b['High'] < prev4['High'] for b in small_bars):
                if is_bear(curr) and curr['Close'] < prev4['Close']:
                    return "falling_three_methods", "bearish"

    # 3. Abandoned Baby (3-bar with Gaps)
    if prev2 is not None:
        # Bullish Abandoned Baby
        if is_bear(prev2) and is_doji(prev) and is_bull(curr) and is_meaningful(prev2) and is_meaningful(curr):
            if prev['High'] < prev2['Low'] and prev['High'] < curr['Low']:
                return "abandoned_baby", "bullish"
        # Bearish Abandoned Baby
        if is_bull(prev2) and is_doji(prev) and is_bear(curr) and is_meaningful(prev2) and is_meaningful(curr):
            if prev['Low'] > prev2['High'] and prev['Low'] > curr['High']:
                return "abandoned_baby", "bearish"

    # 4. Morning Star / Evening Star (3-bar)
    if prev2 is not None:
        # Morning Star
        if is_bear(prev2) and is_meaningful(prev2, 1.2) and body_size(prev) < body_size(prev2) * 0.3 and is_bull(curr) and is_meaningful(curr, 1.0):
            if curr['Close'] > (prev2['Open'] + prev2['Close']) / 2:
                return "morning_star", "bullish"
        # Evening Star
        if is_bull(prev2) and is_meaningful(prev2, 1.2) and body_size(prev) < body_size(prev2) * 0.3 and is_bear(curr) and is_meaningful(curr, 1.0):
            if curr['Close'] < (prev2['Open'] + prev2['Close']) / 2:
                return "evening_star", "bearish"

    # 5. Engulfing (2-bar)
    if is_bear(prev) and is_bull(curr) and is_meaningful(curr, 1.1):
        if curr['Open'] <= prev['Close'] and curr['Close'] >= prev['Open']:
            return "bullish_engulfing", "bullish"
    elif is_bull(prev) and is_bear(curr) and is_meaningful(curr, 1.1):
        if curr['Open'] >= prev['Close'] and curr['Close'] <= prev['Open']:
            return "bearish_engulfing", "bearish"

    # 6. Piercing Line / Dark Cloud (2-bar)
    if is_bear(prev) and is_bull(curr) and is_meaningful(curr, 1.2):
        if curr['Open'] < prev['Low'] and curr['Close'] > (prev['Open'] + prev['Close']) / 2:
            return "piercing_line", "bullish"
    elif is_bull(prev) and is_bear(curr) and is_meaningful(curr, 1.2):
        if curr['Open'] > prev['High'] and curr['Close'] < (prev['Open'] + prev['Close']) / 2:
            return "dark_cloud_cover", "bearish"

    # 7. Three White Soldiers / Black Crows (3-bar)
    if prev2 is not None:
        if all([is_bull(prev2), is_bull(prev), is_bull(curr)]):
            if curr['Close'] > prev['Close'] > prev2['Close']:
                if all(is_meaningful(b, 1.1) for b in [prev2, prev, curr]):
                    return "three_white_soldiers", "bullish"
        if all([is_bear(prev2), is_bear(prev), is_bear(curr)]):
            if curr['Close'] < prev['Close'] < prev2['Close']:
                if all(is_meaningful(b, 1.1) for b in [prev2, prev, curr]):
                    return "three_black_crows", "bearish"

    return None, None

def detect_confluence(df, macd_divergence=None):
    """
    Analyzes indicator signals for overlaps.
    Returns (confluence_alert, wisdom) if strong confluence is found.
    """
    if len(df) < 1: return None, None
    
    last_row = df.iloc[-1]
    last_pattern = last_row.get('candle_pattern')
    last_pattern_type = last_row.get('candle_pattern_type')
    efi_buy = bool(last_row.get('efi_buy_signal', False))
    efi_sell = bool(last_row.get('efi_sell_signal', False))
    
    # 1. Map Pattern Wisdom
    wisdom_map = {
        'bullish_engulfing': "Buyers have completely overwhelmed sellers in a single session.",
        'bearish_engulfing': "Sellers have completely overwhelmed buyers, signaling a potential peak.",
        'morning_star': "Demand has returned via a high-conviction 3-bar reversal floor.",
        'evening_star': "Supply has returned via a high-conviction 3-bar reversal ceiling.",
        'abandoned_baby': "Extreme psychological shift; the gap indicates total abandonment of previous trend.",
        'three_white_soldiers': "Significant institutional accumulation in progress; trend momentum is powerful.",
        'three_black_crows': "Significant institutional liquidation in progress; bearish momentum is powerful.",
        'rising_three_methods': "Healthy consolidation within an uptrend. Professionals are holding ground.",
        'falling_three_methods': "Healthy consolidation within a downtrend. Professionals are selling into bounces.",
        'piercing_line': "Intraday psychological reversal; buyers reclaimed late-session control.",
        'dark_cloud_cover': "Intraday psychological reversal; sellers reclaimed late-session control."
    }
    wisdom = wisdom_map.get(last_pattern, "Context-specific high-probability pattern detected.") if last_pattern else None
    
    # 2. Confluence Alerts
    confluence_alert = None
    pattern_clean = last_pattern.replace('_', ' ').title() if last_pattern else ""
    
    # Pullback Buy + Bullish Pattern + EFI Buy
    if last_pattern_type == 'bullish' and efi_buy:
        confluence_alert = f"HIGH-CONVICTION REVERSAL: {pattern_clean} + EFI 3-ATR exhaustion signal. Professional buying detected."
    
    # Rally Sell + Bearish Pattern + EFI Sell
    elif last_pattern_type == 'bearish' and efi_sell:
        confluence_alert = f"HIGH-CONVICTION REVERSAL: {pattern_clean} + EFI 3-ATR exhaustion signal. Professional selling detected."
        
    # Macd Divergence Confluence
    if macd_divergence and macd_divergence.get('recency', 10) < 5:
        div_type = macd_divergence.get('type')
        if div_type == 'bullish' and (last_pattern_type == 'bullish' or efi_buy):
            confluence_alert = f"BULLISH CONFLUENCE: MACD Divergence confirmed by {'pattern' if last_pattern_type == 'bullish' else 'oscillator'} exhaustion."
        elif div_type == 'bearish' and (last_pattern_type == 'bearish' or efi_sell):
            confluence_alert = f"BEARISH CONFLUENCE: MACD Divergence confirmed by {'pattern' if last_pattern_type == 'bearish' else 'oscillator'} exhaustion."
            
    return confluence_alert, wisdom
