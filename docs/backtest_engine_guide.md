# 📊 Backtesting Engine Guide

Welcome to the **Stock Intelligence Backtesting Engine**. This professional-grade tool allows you to simulate trading strategies against historical data, providing deep insights into risk-adjusted performance before you commit real capital.

---

## 🎓 Strategy Technical Details

The engine implements four core strategies, each with specific technical triggers:

### 1. Elder Triple Screen (The "Tide" & "Wave")
Based on Dr. Alexander Elder's classic system, this implementation uses:
- **Screen 1 (The Tide)**: Uses a Daily EMA 13 vs EMA 26 comparison as a proxy for the Weekly trend. A "Green" tide requires EMA 13 > EMA 26.
- **Screen 2 (The Wave)**: Uses a 2-day Force Index to find pullbacks. 
- **Screen 3 (Execution)**: Triggers an entry when:
    - **Long**: Tide is Bullish AND Force Index (2) is < 0 AND Price < EMA 13 AND RSI < 40.
    - **Short**: Tide is Bearish AND Force Index (2) is > 0 AND Price > EMA 13 AND RSI > 60.

### 2. MACD Divergence Strategy
Detects trend exhaustion by identifying disagreements between price and momentum:
- **Bullish Divergence**: Price makes a new lower low (over a 10-20 day window), but the MACD Histogram makes a higher low.
- **Bearish Divergence**: Price makes a new higher high, but the MACD Histogram makes a lower high.
- **Confirmation**: The signal is generated on the bar where the divergence is technically confirmed by a histogram tick.

### 3. Force Index Strategy (13-Day)
A trend-following momentum strategy:
- **Buy**: Force Index (13) crosses above 0 AND Price is above EMA 13.
- **Sell**: Force Index (13) crosses below 0 AND Price is below EMA 13.

### 4. MACD Crossover
A standard trend-following setup:
- **Buy**: MACD Line crosses above the Signal Line.
- **Sell**: MACD Line crosses below the Signal Line.

---

## ⚙️ Configuration & Risk Management

Precision backtesting requires realistic constraints. The engine supports the following:

### Risk Model
- **Initial Capital**: Your starting balance (default $10,000).
- **Position Sizing (%)**: The percentage of total capital risked **per trade**. 
    - *Example*: At 2%, a $10,000 account risks $200. If the distance to your Stop Loss is $2, the engine will purchase 100 shares.
- **Stop Loss (ATR)**: Uses Average True Range (14-day) volatility to set stops. A 2.0 multiplier is standard for "breathing room."
- **Take Profit (ATR)**: Sets a hard target based on ATR. A 3.0 multiplier provides a 1.5:1 reward-to-risk ratio relative to a 2.0 stop.

### Execution Realism
- **Commission**: Flat fee per trade (e.g., $1.00). Applied to both entry and exit.
- **Slippage**: Per-share cost representing bid/ask spread or market impact (e.g., $0.01).

---

## 📈 Interpreting Performance Metrics

The engine calculates institution-grade metrics to help you evaluate robustness:

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Profit Factor** | > 1.5 | Gross Profit / Gross Loss. The most basic measure of viability. |
| **CAGR** | > 15% | Compound Annual Growth Rate. Your "interest rate" over the period. |
| **Sharpe Ratio** | > 1.0 | Risk-adjusted return. Measures return per unit of volatility. |
| **Sortino Ratio** | > 1.5 | Similar to Sharpe, but only penalizes *downside* volatility. |
| **Win Rate** | 40% - 60% | Percentage of trades that closed at a profit. |
| **Max Drawdown** | < 20% | The largest peak-to-trough decline. Vital for psychological management. |

---

## 🚀 Advanced Features (API Only)

For power users, the backend provides endpoints for advanced analysis not yet in the primary UI:

### 1. Batch Backtesting (`POST /backtest/batch`)
Run the same strategy across up to 10 symbols simultaneously. Perfect for finding which tickers respond best to specific logic.
```bash
# Example payload
{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "strategy_type": "elder_triple_screen",
  "start_date": "2023-01-01",
  ...
}
```

### 2. Comparison Engine (`GET /backtest/compare?result_ids=1,2,3`)
Cross-references multiple saved results. Use this to compare different ATR multipliers or strategy types for the same symbol.

### 3. Symbol Summaries (`GET /backtest/summary/{symbol}`)
Aggregates all historical tests for a specific ticker, identifying the "Highest Return" and "Best Risk-Adjusted" strategies for that asset.

---

## 🛠️ How to Get Started

1. Navigate to the **Backtest Engine** tab.
2. Configure your **Strategy** and **Symbol**.
3. Use the **Save Config** button to store your favorite parameter sets.
4. Run the test and use the **Export CSV** feature to perform further analysis in Excel or Python.

