import yfinance as yf
import pandas as pd
import ta
import json
import datetime
import random
import os

def generate_static_data():
    print("Generating static sample data...")
    data = []
    base_price = 150.0
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=500)
    
    current_date = start_date
    for i in range(500):
        change = random.uniform(-2, 2)
        open_p = base_price
        close_p = base_price + change
        high_p = max(open_p, close_p) + random.uniform(0, 1)
        low_p = min(open_p, close_p) - random.uniform(0, 1)
        
        rsi = 50 + (change * 10)
        
        data.append({
            "time": current_date.strftime('%Y-%m-%d'),
            "open": float(open_p),
            "high": float(high_p),
            "low": float(low_p),
            "close": float(close_p),
            "volume": float(random.randint(1000000, 5000000)),
            "rsi": float(rsi),
            "sma_20": float(base_price),
            "ema_20": float(base_price)
        })
        base_price = close_p
        current_date += datetime.timedelta(days=1)
    return data

def fetch_data():
    ticker_name = "AAPL"
    print(f"Fetching data for {ticker_name}...")
    df = pd.DataFrame()
    try:
        ticker = yf.Ticker(ticker_name)
        df = ticker.history(period="2y", interval="1d", auto_adjust=True)
        if df.empty:
            df = yf.download(ticker_name, period="2y", interval="1d", auto_adjust=True)
    except Exception as e:
        print(f"Error fetching data: {e}")

    if df.empty:
        print("Falling back to static data.")
        data_list = generate_static_data()
    else:
        print(f"Downloaded {len(df)} rows.")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df['RSI'] = ta.momentum.rsi(df['Close'], window=14)
        df['SMA_20'] = ta.trend.sma_indicator(df['Close'], window=20)
        df['EMA_20'] = ta.trend.ema_indicator(df['Close'], window=20)
        df = df.reset_index()
        
        data_list = []
        for index, row in df.iterrows():
            if pd.isna(row['RSI']) or pd.isna(row['SMA_20']):
                continue
            time_str = row['Date'].strftime('%Y-%m-%d')
            data_list.append({
                "time": time_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": float(row['Volume']),
                "rsi": float(row['RSI']),
                "sma_20": float(row['SMA_20']),
                "ema_20": float(row['EMA_20'])
            })

    os.makedirs("public", exist_ok=True)
    output_path = "public/data.json"
    with open(output_path, "w") as f:
        json.dump(data_list, f, indent=2)
    
    print(f"Data saved to {output_path} with {len(data_list)} records.")

if __name__ == "__main__":
    fetch_data()
