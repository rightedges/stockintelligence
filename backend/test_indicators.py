import pandas as pd
import yfinance as yf
import sys
import os

# Add backend to path
sys.path.append('/Users/william/Documents/stock2026/backend')
try:
    from routes.stocks import calculate_indicators
except ImportError:
    print("Failed to import calculate_indicators")
    sys.exit(1)

def test_indicators(symbol):
    print(f"--- Testing {symbol} ---")
    df = yf.download(symbol, period="1y", interval="1d", progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        try:
            if symbol in df.columns.get_level_values(1):
                df = df.xs(symbol, axis=1, level=1)
            elif symbol in df.columns.get_level_values(0):
                df = df.xs(symbol, axis=1, level=0)
        except:
            df.columns = df.columns.get_level_values(0)
    
    df = df.loc[:, ~df.columns.duplicated()]
    df = calculate_indicators(df)
    
    analysis_data = df.to_dict(orient="records")
    last_bars = analysis_data[-10:]
    
    for i, bar in enumerate(last_bars):
        print(f"Bar {i}: EFI Buy: {bar.get('efi_buy_signal')}, EFI Sell: {bar.get('efi_sell_signal')}, EFI: {bar.get('efi')}, L3: {bar.get('efi_atr_l3')}")
    
    buy_count = sum(1 for b in analysis_data if b.get('efi_buy_signal'))
    sell_count = sum(1 for b in analysis_data if b.get('efi_sell_signal'))
    print(f"Total Buy Signals: {buy_count}")
    print(f"Total Sell Signals: {sell_count}")

if __name__ == "__main__":
    test_indicators("TSLA")
