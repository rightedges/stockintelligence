import requests
import json

def test_analysis(symbol):
    url = f"http://localhost:8000/api/stocks/{symbol}/analysis"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            analysis_data = data.get('data', [])
            if analysis_data:
                last_bars = analysis_data[-5:]
                print(f"--- Analysis for {symbol} ---")
                for bar in last_bars:
                    print(f"Date: {bar['Date']}, EFI Buy: {bar.get('efi_buy_signal')}, EFI Sell: {bar.get('efi_sell_signal')}")
                
                # Check if ANY bar has signals
                buy_count = sum(1 for b in analysis_data if b.get('efi_buy_signal'))
                sell_count = sum(1 for b in analysis_data if b.get('efi_sell_signal'))
                print(f"Total Buy Signals: {buy_count}")
                print(f"Total Sell Signals: {sell_count}")
            else:
                print("No data in response")
        else:
            print(f"Failed to fetch analysis: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_analysis("MSFT")
