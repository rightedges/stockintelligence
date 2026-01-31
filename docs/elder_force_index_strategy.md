# Elder Force Index (EFI) Strategy Guide

The **Elder Force Index (EFI)** is an oscillator developed by Dr. Alexander Elder that combines price movement and volume to measure the power of buyers (bulls) and sellers (bears).

This application implements an enhanced version of EFI using **ATR Channels** to identify statistically significant extremes and actionable entry signals within the Triple Screen Trading System.

## The Indicators

### 1. Elder Force Index (EFI)
- **Calculation**: 13-period EMA of `(Close - Previous Close) * Volume`.
- **Interpretation**:
  - **Positive**: Bulls effectively driving prices up.
  - **Negative**: Bears effectively driving prices down.
  - **Zero Line**: Balance of power. Crossing above is bullish; crossing below is bearish.

### 2. EFI Signal Line
- **Calculation**: 13-period EMA of the EFI itself.
- **Purpose**: Acts as a smoothing line. The crossover of the EFI and its Signal Line provides early warnings of trend changes, similar to MACD.

### 3. EFI ATR Channels (The "Spike" Detector)
- **Concept**: Instead of fixed overbought/oversold levels, we use dynamic volatility bands derived from the EFI's own volatility (ATR of the EFI).
- **Structure**:
  - **Center**: The EFI Signal Line.
  - **Bands**: Multiples of the EFI's ATR added/subtracted from the center.
    - **Band 1 & 2**: Normal fluctuation zones.
    - **Band 3 (Outer Band)**: Extreme deviation zone.

## Buy & Sell Signals

Signals are generated when the EFI reaches an unsustainable extreme relative to its recent history (Band 3). These act as mean-reversion signals within a broader trend.

### <span style="color: #22c55e">EFI BUY Signal (Green Arrow)</span>
**Condition**: The EFI drops **below the Lower 3rd ATR Band**.
- **Meaning**: Panic selling or a "washout" has occurred. The bearish force is statistically exhausted (3 standard deviations equivalent).
- **Action**:
  - **In an Uptrend (Triple Screen)**: This is the **ideal buy entry**. It signifies a sharp pullback that is likely to snap back.
  - **In a Downtrend**: This may signal a temporary relief rally or a "dead cat bounce." Use caution.

### <span style="color: #ef4444">EFI SELL Signal (Red Arrow)</span>
**Condition**: The EFI spikes **above the Upper 3rd ATR Band**.
- **Meaning**: Euphoric buying or a "climax" has occurred. The bullish force is statistically exhausted.
- **Action**:
  - **In a Downtrend**: This is the **ideal short entry**. It signifies a sharp rally that is likely to fail.
  - **In an Uptrend**: This typically marks a local top. It is a good place to take partial profits, but the trend may continue after a consolidation.

## Triple Screen Context

This EFI setup is designed to be the "trigger" for the **Third Screen** (Timing).

1.  **First Screen (Market Tide)**: Check the Weekly Impulse (Sidebar Color).
    -   **Green**: Uptrend.
    -   **Red**: Downtrend.
2.  **Second Screen (The Wave)**: Daily MACD or EMA Trend.
3.  **Third Screen (The Ripple)**: **EFI Buy/Sell Signals**.
    -   If Weekly is **Green**, wait for a **Daily EFI BUY Signal** (Green Arrow) to enter Long.
    -   If Weekly is **Red**, wait for a **Daily EFI SELL Signal** (Red Arrow) to enter Short.

## Visual Guide
- **Solid Line**: The EFI.
- **Dashed Bands**: The +/- 2 ATR Channels.
- **Gray Bands**: The +/- 3 ATR Channels (Extremes).
- **Green Arrow**: Buy Signal (Oversold).
- **Red Arrow**: Sell Signal (Overbought).
