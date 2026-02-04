import requests
import json

def check_signals(symbol):
    print(f"--- Checking {symbol} signals ---")
    url = f"http://localhost:8000/stocks/{symbol}/analysis?period=1y&interval=1d"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            result = response.json()
            data = result.get('data', [])
            print(f"Data points: {len(data)}")
            
            buys = [d for d in data if d.get('efi_buy_signal')]
            sells = [d for d in data if d.get('efi_sell_signal')]
            
            print(f"Buy signals found: {len(buys)}")
            print(f"Sell signals found: {len(sells)}")
            
            if buys:
                print(f"Sample Buy: {buys[0]['Date']} - EFI: {buys[0].get('efi')}")
            if sells:
                print(f"Sample Sell: {sells[0]['Date']} - EFI: {sells[0].get('efi')}")
                
            # Print available keys for the last bar
            if data:
                print(f"Available keys (last bar): {list(data[-1].keys())}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    check_signals("AAPL")
    check_signals("TSLA")
    check_signals("NVDA")
