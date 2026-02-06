import sys
import os
import pandas as pd
import json

# Add current dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Patch numpy
import numpy as np
if not hasattr(np, 'NaN'):
    np.NaN = np.nan

from backtest_engine import BacktestEngine, BacktestConfig, StrategyTypes
import yfinance as yf

# Mock Data Generator
def mock_download(symbol, start, end, progress=False):
    dates = pd.date_range(start=start, end=end)
    data = {
        'Open': np.linspace(100, 150, len(dates)),
        'High': np.linspace(101, 151, len(dates)),
        'Low': np.linspace(99, 149, len(dates)),
        'Close': np.linspace(100, 150, len(dates)) + np.random.normal(0, 1, len(dates)),
        'Volume': [1000000] * len(dates)
    }
    df = pd.DataFrame(data, index=dates)
    return df

# Monkeypatch yfinance
yf.download = mock_download

def test_full_backtest_flow():
    print("Testing Full Backtest Flow for Custom Strategy...")
    
    # 1. Define Script
    script = """
    fast = EMA(10)
    slow = EMA(50)
    ENTRY_LONG = CROSSOVER(fast, slow)
    EXIT_LONG = CROSSUNDER(fast, slow)
    """
    
    # 2. Create Config (mimicking routes/backtest.py)
    config = BacktestConfig(
        strategy_name="custom",
        initial_capital=10000,
        position_size_percent=50,
        commission_per_trade=1.0,
        slippage_per_trade=0.1,
        stop_loss_atr_multiplier=2.0,
        take_profit_atr_multiplier=3.0,
        max_trades_per_day=5,
        min_days_between_trades=1,
        max_open_positions=1,
        custom_strategy_config=script
    )
    
    # 3. Initialize Engine
    engine = BacktestEngine(config)
    
    # 4. Run Backtest (using AAPL or valid ticker)
    # We rely on backtest_engine downloading data. 
    # If network fails, we'll know.
    try:
        print("Running engine.run_backtest('AAPL')...")
        result = engine.run_backtest("AAPL", "2023-01-01", "2023-06-01", "custom")
        
        print("Backtest Completed.")
        print(f"Metrics: {json.dumps(result['metrics'], indent=2)}")
        print(f"Price Points: {len(result['price_data'])}")
        print(f"Trades: {len(result['trades'])}")
        
        # Verify Price Data Structure for Charting
        if len(result['price_data']) > 0:
            sample = result['price_data'][0]
            print("Sample Price Data:", sample)
            assert 'close' in sample
            assert 'time' in sample
        
        # Verify Trade Structure
        if len(result['trades']) > 0:
            trade = result['trades'][0]
            print("Sample Trade:", trade)
            assert 'entry_price' in trade
            assert 'exit_price' in trade
            
    except Exception as e:
        print(f"FULL FLOW FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_full_backtest_flow()
