# Stock Intelligence Suite (2026 Edition)

**A professional-grade Techno-Fundamental analysis platform.** This tool automates the "Top-Down" trading routine, bridging the gap between broad market logic (Macro/Sector) and precision technical execution (Price/Action).

---

## 🚀 Key Features

### 1. 🧠 Market Intelligence Dashboard (The "Brain")
*   **Regime Detection**: Automatically classifies stocks into Accumulation, Mark-Up, Distribution, or Mark-Down.
*   **Macro Tides**: Monitors SPY (Risk), XLI (Growth), TIP (Inflation), and TNX (Liquidity) to interpret the "Why" behind moves.
*   **Interactive Tour**: New to the platform? Click **"Start Tour"** in the Intelligence header for a guided walkthrough of the decision engine.
*   **Confluence Score**: Instant 0-3 score rating the reliability of the current trend based on Volume, Momentum, and Price Structure.

### 2. 📊 Alexander Elder Triple Screen Strategy
*   **Top-Down Logic**:
    *   **Screen 1 (The Tide)**: Weekly EMA 13 Slope. Determines the *allowed* direction (Long/Short/Cash).
    *   **Screen 2 (The Wave)**: Daily Force Index (F2). Identifies contrarian value entries (pullbacks).
    *   **Screen 3 (Execution)**: Dynamic Entry, Stop, and Target mapping.
*   **Smart Strategy Panel**: Located at the **top of the view**, this panel consolidates all critical signals into a unified 3-column grid (Tide -> Wave -> Execution).
*   **Divergence Alerts**: Prominent **Red/Green alerts** trigger automatically when MACD Divergence is detected, warning of imminent reversals.

### 3. ⭐ Close Watchlist
*   **Priority Sorting**: Click the **Star Icon** next to any stock in the sidebar.
*   **Focus First**: Starred stocks are pinned to the top of your list, ensuring your best ideas are always visible.

### 4. 📝 Context-Aware Trading Journal
*   **Smart Templates**: Click "Elder Template" to inject a prompt tailored to your current view:
    *   **Weekly View**: Injects a "Macro Tide" template (Big Picture focus).
    *   **Daily View**: Injects a "Tactical Setup" template (Entry/Exit focus).
*   **Snapshot Database**: Save rich screenshots with every note. Searchable history keeps your "Lesson Learned" database accessible.

---

## 🛠️ Installation & Usage

### Prerequisites
*   **Python 3.9+**
*   **Node.js 18+**

### 1. Backend Setup
The backend utilizes SQLite and FastAPI. It must be bound to `0.0.0.0` to be accessible from other devices on your network.

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# CRITICAL: Use --host 0.0.0.0 to allow LAN access
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup
The frontend is built with React + Vite.

```bash
cd frontend
npm install

# Expose to network
npm run dev -- --host 0.0.0.0
```

Access the dashboard at: `http://localhost:5173` (or `http://YOUR_LAN_IP:5173`)

---

## 📈 Professional Workflow

1.  **Build Your List**: Add stocks to the sidebar. Use the **Star** icon to pin your top focus tickers.
2.  **Check the Weather**: Go to the **Intelligence** tab.
    *   Is the Macro Tide "Risk-On"?
    *   Is your stock's Sector leading?
    *   *If NO, proceed with extreme caution.*
3.  **Verify the Setup**: Switch to **Elder Daily**.
    *   **Screen 1**: Is the Tide Green? (Longs allowed).
    *   **Screen 2**: Is the Wave Negative? (Value entry available).
    *   **Alerts**: Are there any "Critical Divergence" warnings?
4.  **Plan the Trade**: Use the **Trading Journal** sidebar.
    *   Click "Elder Template" to load the Daily checklist.
    *   Validate your Entry, Stop, and R/R Ratio.
    *   Save the plan.

---

## 🧩 Troubleshooting

**"Unable to add stock"**
*   Ensure your backend is running with `--host 0.0.0.0`.
*   If running remotely (e.g., Proxmox), ensure the server has the latest code (`git pull`) and the database has been migrated.
