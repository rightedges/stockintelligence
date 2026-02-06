import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backtest_engine import BacktestEngine, BacktestConfig

def test_negative_equity_metrics():
    print("Testing negative equity metrics...")
    
    config = BacktestConfig(
        strategy_name="test",
        initial_capital=10000.0,
        position_size_percent=2.0,
        commission_per_trade=1.0,
        slippage_per_trade=0.01,
        stop_loss_atr_multiplier=2.0,
        take_profit_atr_multiplier=3.0,
        max_trades_per_day=5,
        min_days_between_trades=1
    )
    
    engine = BacktestEngine(config)
    
    # Simulate a disastrous backtest result (negative equity)
    engine.equity_curve = [
        {'date': '2020-01-01', 'equity': 10000.0},
        {'date': '2021-01-01', 'equity': 5000.0},
        {'date': '2022-01-01', 'equity': -1000.0} # Negative equity
    ]
    
    # Add a dummy closed trade
    engine.trades = [
        {'status': 'closed', 'gross_pl': -11000.0, 'net_pl': -11000.0, 'exit_date': '2022-01-01'}
    ]
    
    # Create a dummy dataframe for the method to use
    df = pd.DataFrame({'Close': [100, 110, 120]})
    
    metrics = engine.calculate_performance_metrics(df)
    
    print(f"CAGR: {metrics['cagr']}")
    print(f"Calmar Ratio: {metrics['calmar_ratio']}")
    
    # Assertions
    assert metrics['cagr'] == -100.0, f"CAGR should be -100.0 for negative equity, got {metrics['cagr']}"
    assert not np.isnan(metrics['cagr']), "CAGR should not be NaN"
    assert not np.isnan(metrics['calmar_ratio']), "Calmar Ratio should not be NaN"
    assert not np.isinf(metrics['calmar_ratio']), "Calmar Ratio should not be Inf"
    
    print("Test passed!")

if __name__ == "__main__":
    try:
        test_negative_equity_metrics()
    except Exception as e:
        print(f"Test failed with error: {e}")
        sys.exit(1)
