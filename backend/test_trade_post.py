import requests
import json
from datetime import datetime

url = "http://127.0.0.1:8000/trades/"

payload = {
    "symbol": "NVDA",
    "quantity": 10,
    "direction": "Long",
    "entry_date": datetime.now().strftime("%Y-%m-%d"),
    "entry_price": 105.50,
    "entry_order_type": "Market",
    "entry_day_high": 110.0,
    "entry_day_low": 100.0,
    "snapshot": None,
    "account": "Main",
    "source": "Test Script"
}

try:
    print(f"Sending POST request to {url}...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
