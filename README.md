# Techno-Fundamental Stock Analysis Suite

A professional-grade stock analysis application that bridges the gap between **Technical Analysis** and **Market Logic**. This tool automates the "Top-Down" routine used by professional traders to ensure every trade is supported by broad market tides and sector leadership.

## 🚀 Key Features

### 1. Unified Technical Dashboard
- **Single-Canvas Architecture**: Price, Volume SMA, and RSI are perfectly synchronized on a single time-axis.
- **Stacked Scale Layout**: Professional multi-pane view optimized for precision entry/exit timing.

### 2. Market Intelligence Dashboard (The "Brain")
The **Intelligence Tab** is the core of the application, transforming raw data into actionable "Market Logic."

#### A. Automated Market Regime Detection
The system automatically classifies the stock into one of the four market phases:
*   **Accumulation**: Sideways consolidation; Smart money absorption.
*   **Mark-Up**: Trending uptrend; Public participation.
*   **Distribution**: Choppy sideways; Smart money offloading.
*   **Mark-Down**: Trending downtrend; Panic selling.
*   **Reliability Score**: Every signal is scored (High/Medium/Low) based on the confluence of **Trend** (EMAs), **Volatility** (ATR), and **Flow** (Volume/RSI).

#### B. Automated Top-Down Routine
An automated checklist verifying the 4 pillars of a high-probability trade:
1.  **Macro**: Checks if the S&P 500 (SPY) is trending positive ("Risk-On").
2.  **Sector**: Scans all 11 GICS Sector ETFs to ensure your stock is in the #1 leading market sector.
3.  **Chart**: Verifies the stock is in a "Mark-Up" regime.
4.  **Execution**: Checks for high-confluence technical triggers.

#### C. Macro Tides & Strategic Playbook
Automated tracking of the "Why" behind market moves:
- **Growth (XLI)**: Monitored via Industrials performance.
- **Inflation (TIP)**: Monitored via inflation-protected bond trends.
- **Liquidity (^TNX)**: Monitored via 10-Year Treasury Yields.
- **Strategic Playbook**: Synthesizes these tides into a specific recommendation (e.g., "Goldilocks Zone: Aggressively target High-Beta Tech").

---

## 📈 How to Use the Intelligence Tab

The Intelligence tab should be used to filter your technical setups. **Never trade a technical breakout if the Market Intelligence is "Risk-Off" or in a "Distribution" regime.**

### The Workflow:
1.  **Select a Stock**: Start in the Technical tab to find a setup.
2.  **Check the Tide**: Switch to the **Intelligence** tab. 
    - Is the **Macro Tide** expanding?
    - Is the **Strategic Playbook** suggesting your stock's sector?
3.  **Verify the Routine**: Look at the **Automated Routine** box. 
    - All boxes green? -> **High-Probability Trade.**
    - Sector or Macro red? -> **High-Risk Trade (Consider skipping).**
4.  **Observe Reliability**: Only size up if the **Reliability Badge** is "High."

---

## 💡 Examples & Scenarios

### Example 1: The "Goldilocks" Breakout
*   **Technical Tab**: AAPL is breaking out of a 3-month range.
*   **Intelligence Tab**: 
    - **Regime**: Mark-Up (High Confidence).
    - **Macro**: Risk-On (SPY > EMA 50).
    - **Sector**: Technology is the leading sector.
    - **Playbook**: "Goldilocks Zone: Target Tech."
*   **Decision**: **Strong Buy.** All cylinders are firing.

### Example 2: The "Bull Trap" (Stagflation)
*   **Technical Tab**: TSLA shows an RSI oversold bounce. Looks like a "buy the dip" opportunity.
*   **Intelligence Tab**:
    - **Regime**: Distribution (Medium Confidence).
    - **Macro**: Risk-Off.
    - **Inflation**: Rising Pressure.
    - **Sector**: Energy is leading; Technology is lagging.
*   **Decision**: **Avoid / Short.** The technical bounce is fighting the macro tide and a distribution regime.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- Python 3.9+
- Node.js 18+

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🖥️ Proxmox / Linux Deployment

### 1. Download & Initial Setup
Clone the repository to your server (e.g., `/opt/stock-suite`):
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/stock2026.git stock-suite
cd stock-suite

# Prep Backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Prep Frontend
cd ../frontend && npm install && npm run build
```

### 2. Automatic Updates (Upgrade Script)
To update the application from GitHub, create an `update.sh` script:
```bash
#!/bin/bash
git pull origin main
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install && npm run build
sudo systemctl restart stock-backend stock-frontend
```

### 3. Autostart with Systemd
To ensure the app starts after every Proxmox/system reboot, create two service files.

#### A. Backend Service (`/etc/systemd/system/stock-backend.service`)
```ini
[Unit]
Description=Stock Suite Backend
After=network.target

[Service]
User=youruser
WorkingDirectory=/opt/stock-suite/backend
ExecStart=/opt/stock-suite/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

#### B. Frontend Service (`/etc/systemd/system/stock-frontend.service`)
*Note: For production, it is recommended to serve the `dist` folder via Nginx. However, for a simple auto-start setup:*
```ini
[Unit]
Description=Stock Suite Frontend
After=network.target

[Service]
User=youruser
WorkingDirectory=/opt/stock-suite/frontend
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0
Restart=always

[Install]
WantedBy=multi-user.target
```

### 4. Enable Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable stock-backend stock-frontend
sudo systemctl start stock-backend stock-frontend
```
