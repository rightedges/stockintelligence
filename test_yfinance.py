import yfinance as yf
import pandas as pd

def test_yfinance():
    print("Testing yfinance download...")
    try:
        # Try a very standard download
        df = yf.download("AAPL", start="2023-01-01", end="2023-01-10", progress=False)
        print("Download finished.")
        print(f"Shape: {df.shape}")
        if df.empty:
            print("DATAFRAME IS EMPTY!")
        else:
            print(df.head())
            
    except Exception as e:
        print(f"YFINANCE FAILED: {e}")

if __name__ == "__main__":
    test_yfinance()
