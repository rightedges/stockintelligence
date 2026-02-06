import requests
import sys

BASE_URL = "http://localhost:8000/backtest/custom_scripts"

import time

def run_test():
    print("Testing BSL Script CRUD...")
    
    # 1. Create
    ts = int(time.time())
    script_data = {
        "name": f"Test Script {ts}",
        "description": "A test script",
        "script": "PLOT(CLOSE, 'Close')"
    }
    print(f"1. Creating script: {script_data['name']}...")
    res = requests.post(BASE_URL, json=script_data)
    if res.status_code != 200:
        print(f"FAILED to update: {res.text}")
        sys.exit(1)
    
    data = res.json()
    script_id = data['id']
    print(f"   Created ID: {script_id}")
    
    # 2. List
    print("2. Listing scripts...")
    res = requests.get(BASE_URL)
    if res.status_code != 200:
        print(f"FAILED to list: {res.status_code} {res.text}")
        sys.exit(1)
    scripts = res.json()
    found = any(s['id'] == script_id for s in scripts)
    if not found:
        print("FAILED: Script not found in list")
        sys.exit(1)
    print(f"   Found {len(scripts)} scripts. Target found: {found}")
    
    # 3. Update
    print("3. Updating script...")
    update_data = {
        "script": "PLOT(OPEN, 'Open')",
        "description": "Updated description"
    }
    res = requests.put(f"{BASE_URL}/{script_id}", json=update_data)
    if res.status_code != 200:
        print(f"FAILED to update: {res.text}")
        sys.exit(1)
        
    # 4. Get Detail
    print("4. Verifying update...")
    res = requests.get(f"{BASE_URL}/{script_id}")
    updated = res.json()
    if updated['script'] != "PLOT(OPEN, 'Open')":
        print(f"FAILED: Script content mismatch. Got: {updated['script']}")
        sys.exit(1)
    print("   Update verified.")
    
    # 5. Delete
    print("5. Deleting script...")
    res = requests.delete(f"{BASE_URL}/{script_id}")
    if res.status_code != 200:
        print(f"FAILED to delete: {res.text}")
        sys.exit(1)
        
    # 6. Verify Delete
    print("6. Verifying deletion...")
    res = requests.get(f"{BASE_URL}/{script_id}")
    if res.status_code != 404:
        print("FAILED: Script still exists or returned non-404")
        sys.exit(1)
    print("   Deletion verified.")
    
    print("\n✅ CRUD Verification Successful!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
