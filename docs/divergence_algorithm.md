# 🧠 Divergence Detection Algorithm

The Stock Intelligence Suite uses a custom "Wave-based" algorithm to detect reliable divergences, specifically designed to filter out noise and identify high-conviction reversal signals.

## 1. Wave Identification
Instead of comparing raw daily slopes, the system segments the indicator data (MACD Histogram or Force Index) into **Waves**. A wave is defined as a contiguous sequence of values on one side of the zero-line.

```mermaid
graph LR
    A["Wave 1 (Positive)"] -- Zero Cross --> B["Wave 2 (Negative)"]
    B -- Zero Cross --> C["Wave 3 (Positive)"]
    style A fill:#166534,stroke:#4ade80,color:#fff
    style B fill:#991b1b,stroke:#f87171,color:#fff
    style C fill:#166534,stroke:#4ade80,color:#fff
```

*   **Zero-Line Crossing**: A new wave starts whenever the indicator crosses the zero-line. This ensures that divergences are compared across distinct momentum shifts.

## 2. Extrema Extraction
For each wave, the algorithm extracts two critical data points:
*   **Indicator Extrema**: The maximum value for a positive wave (Peak) or the minimum value for a negative wave (Trough).
*   **Price at Extrema**: The corresponding Stock Price at the exact same point in time.
    *   For **Peaks** (Positive Indicator): High Price is recorded.
    *   For **Troughs** (Negative Indicator): Low Price is recorded.

## 3. Divergence Comparison Logic
The system compares the **current active wave** with a **previous historical wave** of the same polarity.

### 🔍 Multi-Segment Lookback (Noise Resistance)
To protect against market "noise" and minor indicator fluctuations, the algorithm does not just look at the *immediate* previous wave. It searches back through the last **4 previous waves** of the same polarity to find a valid divergence pair. This ensures that a large, significant divergence isn't hidden by a tiny indicator "bump."

### 📉 Bearish Divergence (Reversal Signal)
Occurs during an uptrend when price momentum is fading.

```mermaid
graph TD
    subgraph Price
    P1["Peak 1 (High)"] --- P2["Peak 2 (Higher High)"]
    end
    subgraph Indicator
    I1["Peak 1 (High)"] --- I2["Peak 2 (Lower High)"]
    end
    P1 -.-> I1
    P2 -.-> I2
    style P1 fill:#1f2937,color:#fff
    style P2 fill:#1f2937,color:#fff
    style I1 fill:#1f2937,color:#fff
    style I2 fill:#1f2937,color:#fff
    linkStyle 0 stroke:#22c55e,stroke-width:3px;
    linkStyle 1 stroke:#ef4444,stroke-width:3px;
```

*   **Price Condition**: Current Peak High >= (Previous Peak High * 0.98). 
    *   *Note: Includes "Higher Highs" and "Equal Highs" (Double Tops) within a 2% tolerance.*
*   **Indicator Condition**: Current Peak Value < Previous Peak Value (A "Lower High" in momentum/volume).
*   **Confirmation**: There must be at least one complete negative wave (zero-crossing) between the two peaks.

### 📈 Bullish Divergence (Bottoming Signal)
Occurs during a downtrend when selling pressure is exhausting.

```mermaid
graph TD
    subgraph Price
    T1["Trough 1 (Low)"] --- T2["Trough 2 (Lower Low)"]
    end
    subgraph Indicator
    V1["Trough 1 (Low)"] --- V2["Trough 2 (Higher Low)"]
    end
    T1 -.-> V1
    T2 -.-> V2
    style T1 fill:#1f2937,color:#fff
    style T2 fill:#1f2937,color:#fff
    style V1 fill:#1f2937,color:#fff
    style V2 fill:#1f2937,color:#fff
    linkStyle 0 stroke:#ef4444,stroke-width:3px;
    linkStyle 1 stroke:#22c55e,stroke-width:3px;
```

*   **Price Condition**: Current Trough Low <= (Previous Trough Low * 1.02).
    *   *Note: Includes "Lower Lows" and "Equal Lows" (Double Bottoms) within a 2% tolerance.*
*   **Indicator Condition**: Current Trough Value > Previous Trough Value (A "Higher Low" in momentum/volume).
*   **Confirmation**: There must be at least one complete positive wave (zero-crossing) between the two troughs.

## 4. Signal Confirmation (Zero-Lag Prevention)
To prevent "premature" signals that might trigger on the very day a peak is forming (and then disappear if price continues to trend), the system requires:
*   **1-Bar Lag**: The extrema (peak/trough) must be at least one candle in the past.
*   **Reversal Confirmation**: The indicator must have explicitly "ticked" back toward the zero-line from its extrema (Ticked down for Bearish, Ticked up for Bullish).

## 4. Dual Divergence (High Confluence)
A **Dual Divergence** alert is triggered when both **MACD (Momentum)** and **Force Index 13 (Volume Pressure)** detect the same type of divergence simultaneously. This represents a powerful confluence of fading momentum and decreasing smart-money participation, making it one of the most reliable signals in the suite.

## 6. Recency Filter
To ensure relevance, an alert is only displayed if the extrema of the current wave occurred within the last **30 bars** (Daily) or **20 bars** (Weekly). This allows the system to capture established patterns formed over the preceding month.
