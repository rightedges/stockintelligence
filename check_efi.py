
import yfinance as yf
import pandas as pd
import ta
import sys

def check_efi_signals(symbol):
    df = yf.download(symbol, period="1mo", interval="1d", progress=False)
    if df.empty:
        print(f"No data for {symbol}")
        return

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.loc[:, ~df.columns.duplicated()]

    # EFI Calculation
    raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
    df['efi'] = raw_force.ewm(span=13, adjust=False).mean()
    df['efi_signal'] = df['efi'].ewm(span=13, adjust=False).mean()
    
    efi_range = (df['efi'] - df['efi'].shift(1)).abs()
    efi_atr = efi_range.ewm(span=13, adjust=False).mean()
    
    df['efi_atr_l2'] = df['efi_signal'] - efi_atr * 2
    df['efi_atr_h2'] = df['efi_signal'] + efi_atr * 2
    
    efi_in_buy_zone = (df['efi'] <= df['efi_atr_l2'])
    efi_in_sell_zone = (df['efi'] >= df['efi_atr_h2'])
    
    df['efi_buy_signal'] = (efi_in_buy_zone & (~efi_in_buy_zone.shift(1).fillna(False))).fillna(False)
    df['efi_sell_signal'] = (efi_in_sell_zone & (~efi_in_sell_zone.shift(1).fillna(False))).fillna(False)

    print(f"--- EFI Results for {symbol} ---")
    relevant_cols = ['Close', 'efi', 'efi_signal', 'efi_atr_l2', 'efi_buy_signal']
    print(df[relevant_cols].tail(10))

if __name__ == "__main__":
    symbol = sys.argv[1] if len(sys.argv) > 1 else "NVDA"
    check_efi_signals(symbol)
