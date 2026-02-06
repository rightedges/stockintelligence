import requests
import json

url = "http://localhost:8000/backtest/run"

payload = {
  "symbol": "AAPL",
  "strategyType": "custom",
  "startDate": "2023-08-01",
  "endDate": "2024-02-01",
  "initialCapital": 10000,
  "positionSizePercent": 10,
  "commissionPerTrade": 0,
  "slippagePerTrade": 0,
  "stopLossATRMultiplier": 2,
  "takeProfitATRMultiplier": 3,
  "maxOpenPositions": 5,
  "customStrategyConfig": """
EMA13 = EMA(13)
PLOT(EMA13, "EMA13", color="#0000FF")

ENTRY_LONG = CLOSE > EMA13
EXIT_LONG = CLOSE < EMA13
"""
}

try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        print("Success: API returned 200")
        
        print(f"Response Keys: {list(data.keys())}")
        print(f"Raw Plots Value: {data.get('plots')}")
        
        # Check plots metadata
        if 'plots' in data and data['plots']:
            print(f"Plots Metadata: {json.dumps(data['plots'], indent=2)}")
        else:
            print("ERROR: No 'plots' metadata found in response.")
            
        # Check price_data for plot values
        price_data = data.get('price_data', [])
        if price_data:
            first_point = price_data[-1] # Check last point
            print(f"Sample Data Point: {json.dumps(first_point, indent=2)}")
            
            # Check if plot column exists in data point
            # The column name is usually the variable name (EMA13) or a generated ID.
            # Based on loop, it should be in data_point
            plots = data.get('plots', [])
            if plots:
                col_name = plots[0]['column']
                if col_name in first_point:
                     print(f"✅ Verified: Column '{col_name}' found in price_data with value {first_point[col_name]}")
                else:
                     print(f"❌ ERROR: Column '{col_name}' NOT found in price_data")
        else:
             print("ERROR: No price_data returned.")
             
    else:
        print(f"Request failed with status {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Exception: {e}")
