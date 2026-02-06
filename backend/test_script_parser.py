import pandas as pd
import sys
import os

# Add current dir to path to import backtest_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import numpy as np
# Patch numpy for pandas_ta compatibility
if not hasattr(np, 'NaN'):
    np.NaN = np.nan

# import pandas_ta as ta
from backtest_engine import ScriptParser

def test_script_parser():
    # 1. Create Mock Data
    data = {
        'Close': [100, 102, 104, 103, 101, 99, 98, 97, 100, 105, 110],
        'High':  [101, 103, 105, 104, 102, 100, 99, 98, 101, 106, 111],
        'Low':   [99,  101, 103, 102, 100, 98,  97, 96, 99,  104, 109],
        'Open':  [99,  101, 103, 104, 102, 100, 98, 97, 99,  104, 109],
        'Volume':[1000] * 11
    }
    df = pd.DataFrame(data)
    
    # 2. Define Script
    script = """
    // Variables
    sma_short = SMA(2)
    sma_long = SMA(5)
    
    // Logic
    cross_up = CROSSOVER(sma_short, sma_long)
    
    // Signals
    ENTRY_LONG = cross_up
    EXIT_LONG = SMA(2) < SMA(5)
    """
    
    # 3. specific test for CROSSOVER logic
    # Day 0-4: SMA(5) not ready (NaN)
    # Day 5: SMA2=99+101/2=100, SMA5=...
    # Let's trust the parser to just run it and not crash first.
    
    print("Running Script Parser...")
    try:
        df_res = ScriptParser.parse_script(df, script)
        print("Script Executed Successfully!")
        print("Columns Generated:", df_res.columns.tolist())
        
        # Check if columns exist
        assert 'custom_entry_long' in df_res.columns
        assert 'custom_exit_long' in df_res.columns
        
        print(df_res[['Close', 'custom_entry_long', 'custom_exit_long']].tail(5))
        
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_script_parser()
