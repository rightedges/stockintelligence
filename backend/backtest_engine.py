import pandas as pd
import numpy as np

# Patch numpy for pandas_ta compatibility
# pandas_ta relies on numpy.NaN which was removed in numpy 2.x
if not hasattr(np, 'NaN'):
    np.NaN = np.nan

# import pandas_ta as ta_pandas # Keep just in case, but aliased to avoid conflict
import ta # The original library
import yfinance as yf
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from sqlmodel import Session, select
from models import BacktestResult, BacktestTrade
from database import engine
from utils import safe_download
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BacktestConfig:
    strategy_name: str
    initial_capital: float
    position_size_percent: float
    commission_per_trade: float
    slippage_per_trade: float
    stop_loss_atr_multiplier: float
    take_profit_atr_multiplier: float
    max_trades_per_day: int
    min_days_between_trades: int
    max_open_positions: int = 5  # Allow multiple positions by default
    custom_strategy_config: Optional[str] = None

class StrategyTypes:
    ELDER_TRIPLE_SCREEN = "elder_triple_screen"
    DIVERGENCE = "divergence"
    FORCE_INDEX = "force_index"
    MACD_CROSSOVER = "macd_crossover"
    CUSTOM = "custom"

# BSL Scripts for Built-in Strategies
STRATEGY_SCRIPTS = {
    StrategyTypes.ELDER_TRIPLE_SCREEN: """
EMA13 = EMA(13)
EMA26 = EMA(26)
FI2 = FORCE_INDEX(2)
RSI14 = RSI(14)
ENTRY_LONG = EMA13 > EMA26 AND FI2 < 0 AND Close < EMA13 AND RSI14 < 40
EXIT_LONG = EMA13 < EMA26 AND FI2 > 0 AND Close > EMA13 AND RSI14 > 60
""",
    StrategyTypes.FORCE_INDEX: """
FI = FORCE_INDEX(13)
EMA13 = EMA(13)
ENTRY_LONG = CROSSOVER(FI, 0) AND Close > EMA13
EXIT_LONG = CROSSUNDER(FI, 0) AND Close < EMA13
""",
    StrategyTypes.MACD_CROSSOVER: """
MACD_LINE = MACD(12, 26, 9)
SIGNAL_LINE = MACD_SIGNAL(12, 26, 9)
ENTRY_LONG = CROSSOVER(MACD_LINE, SIGNAL_LINE)
EXIT_LONG = CROSSUNDER(MACD_LINE, SIGNAL_LINE)
""",
    StrategyTypes.DIVERGENCE: """
// Divergence is currently handled via a custom built-in function
ENTRY_LONG = MACD_DIVERGENCE_BULLISH()
EXIT_LONG = MACD_DIVERGENCE_BEARISH()
"""
}

class ScriptParser:
    """
    Parses and executes BSL-Script (Pine-like) logic.
    Supports variable assignment, multi-line execution, and state management.
    """
    
    @staticmethod
    def parse_script(df: pd.DataFrame, script: str) -> pd.DataFrame:
        import re
        
        # Symbol table: maps user_var_name -> dataframe_col_name
        # Pre-populate with OHLCV
        variables = {
            'Open': 'Open', 'High': 'High', 'Low': 'Low', 'Close': 'Close', 'Volume': 'Volume',
            'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume',
            'OPEN': 'Open', 'HIGH': 'High', 'LOW': 'Low', 'CLOSE': 'Close', 'VOLUME': 'Volume'
        }
        
        lines = [line.strip() for line in script.split('\n') if line.strip() and not line.strip().startswith('//')]
        
        plots = []
        for line in lines:
            try:
                # 1. Check for PLOT: PLOT(EXPRESSION, "Title", color="#hex")
                if line.upper().startswith('PLOT(') or line.upper().startswith('PLOT '):
                    # Robust regex for PLOT: supports PLOT(expr), PLOT(expr, "title"), PLOT(expr, "title", color="#hex")
                    # Also handles optional "color=" prefix
                    plot_match = re.search(r'(?i)PLOT\s*\(([^,)]+)(?:,\s*"([^"]+)")?(?:,\s*(?:color\s*=\s*)?"([^"]+)")?\)', line)
                    if plot_match:
                        expr = plot_match.group(1).strip()
                        title = plot_match.group(2) or expr
                        color = plot_match.group(3) or "#3b82f6"
                        
                        # Evaluate the expression to get the column
                        plot_col = ScriptParser._evaluate_expression(df, expr, variables)
                        plots.append({
                            "column": plot_col,
                            "title": title,
                            "color": color
                        })
                        continue

                # 2. Check for Assignment: VAR = EXPRESSION
                if '=' in line:
                    parts = line.split('=', 1)
                    var_name = parts[0].strip()
                    expression = parts[1].strip()
                    
                    # Calculate expression
                    col_name = ScriptParser._evaluate_expression(df, expression, variables)
                    
                    # Store in symbol table
                    variables[var_name] = col_name
                    # logger.info(f"BSL: Assigned {var_name} -> {col_name}")
                        
            except Exception as e:
                logger.error(f"Error parsing line '{line}': {e}")
                
        # After execution, mapping the final specific signals to standard columns expected by the engine
        signal_map = {
            'ENTRY_LONG': 'custom_entry_long',
            'EXIT_LONG': 'custom_exit_long',
            'ENTRY_SHORT': 'custom_entry_short',
            'EXIT_SHORT': 'custom_exit_short'
        }
        
        for user_var, engine_col in signal_map.items():
            if user_var in variables:
                df[engine_col] = df[variables[user_var]]
            else:
                df[engine_col] = False

        return df, plots

    @staticmethod
    def _evaluate_expression(df: pd.DataFrame, expression: str, variables: Dict[str, str]) -> str:
        """
        Parses a right-hand side expression.
        1. Identifies and calculates Indicators: RSI(14)
        2. Identifies and calculates Functions: CROSSOVER(A, B)
        3. Replaces Variables with DF Columns.
        4. Evals math/logic.
        Returns: The name of the column containing the result.
        """
        import re
        import hashlib
        
        # Helper to generate unique column name for intermediate results
        def get_temp_col(desc):
            hash_str = hashlib.md5(desc.encode()).hexdigest()[:8]
            return f"calc_{hash_str}"

        # 1. Variable Substitution (Pre-pass for functions)
        # Any token that matches a key in `variables` should be replaced by its column name
        sorted_vars = sorted(variables.keys(), key=len, reverse=True)
        for var in sorted_vars:
            if var in expression: 
                # Replace if it's not part of another word
                pattern = r"\b" + re.escape(var) + r"\b"
                expression = re.sub(pattern, variables[var], expression)

        # 2. Handle Lookback: VAR[n] -> VAR_shift_n
        def replace_lookback(match):
            col = match.group(1)
            shift = int(match.group(2))
            shifted_col = f"{col}_shift_{shift}"
            if shifted_col not in df.columns and col in df.columns:
                 df[shifted_col] = df[col].shift(shift)
            return shifted_col

        expression = re.sub(r"([a-zA-Z0-9_]+)\[(\d+)\]", replace_lookback, expression)

        # 3. Handle Special Functions: CROSSOVER, CROSSUNDER
        if "CROSSOVER" in expression or "CROSSUNDER" in expression:
             match = re.search(r"(CROSSOVER|CROSSUNDER)\(([^,]+),\s*([^)]+)\)", expression)
             if match:
                 func = match.group(1)
                 col1 = match.group(2).strip()
                 col2 = match.group(3).strip()
                 
                 res_col = get_temp_col(f"{func}_{col1}_{col2}")
                 
                 def ensure_shift(c):
                     if c in df.columns:
                         s = f"{c}_shift_1"
                         if s not in df.columns: df[s] = df[c].shift(1)
                         return s
                     return c
                     
                 col1_prev = ensure_shift(col1)
                 col2_prev = ensure_shift(col2)
                 
                 if func == "CROSSOVER":
                     logic = f"({col1} > {col2}) & ({col1_prev} < {col2_prev})"
                 else:
                     logic = f"({col1} < {col2}) & ({col1_prev} > {col2_prev})"
                     
                 df[res_col] = df.eval(logic).fillna(False)
                 expression = expression.replace(match.group(0), res_col)

        # 4. Handle Standard Indicators
        indicator_matches = re.findall(r"([A-Z_]+)\(([\d,\s\.]*)\)", expression)
        for name, args_str in indicator_matches:
            if name in ["CROSSOVER", "CROSSUNDER"]: continue
            
            if args_str.strip():
                args = [int(float(x.strip())) for x in args_str.split(',')]
            else:
                args = []
            
            # Use name directly if no args, otherwise standard format
            base_col = f"{name}_{'_'.join(map(str, args))}" if args else name
            
            if base_col not in df.columns:
                 try:
                    if name == "RSI":
                        df[base_col] = ta.momentum.rsi(df['Close'], window=args[0])
                    elif name == "EMA":
                        df[base_col] = ta.trend.ema_indicator(df['Close'], window=args[0])
                    elif name == "SMA":
                        df[base_col] = ta.trend.sma_indicator(df['Close'], window=args[0])
                    elif name == "MACD": 
                        fast, slow, sign = args
                        df[base_col] = ta.trend.macd(df['Close'], window_fast=fast, window_slow=slow)
                    elif name == "MACD_SIGNAL":
                        fast, slow, sign = args
                        df[base_col] = ta.trend.macd_signal(df['Close'], window_fast=fast, window_slow=slow, window_sign=sign)
                    elif name == "MACD_DIFF":
                        fast, slow, sign = args
                        df[base_col] = ta.trend.macd_diff(df['Close'], window_fast=fast, window_slow=slow, window_sign=sign)
                    elif name == "FORCE_INDEX":
                        period = args[0]
                        raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
                        df[base_col] = raw_force.ewm(span=period, adjust=False).mean()
                    elif name == "MACD_DIVERGENCE_BULLISH":
                        df[base_col] = False 
                    elif name == "MACD_DIVERGENCE_BEARISH":
                        df[base_col] = False
                 except Exception as e:
                     logger.error(f"Failed to calc {name}: {e}")
            
            pattern = re.escape(f"{name}({args_str})")
            expression = re.sub(pattern, base_col, expression)

        # 5. Handle Logical Operators & Booleans for df.eval
        # We replace AND/OR/NOT with pandas-friendly ops
        # And ensure true/false literals are True/False
        expression = re.sub(r"\bAND\b", "&", expression)
        expression = re.sub(r"\bOR\b", "|", expression)
        expression = re.sub(r"\bNOT\b", "~", expression)
        expression = re.sub(r"\btrue\b", "True", expression)
        expression = re.sub(r"\bfalse\b", "False", expression)

        # 6. Final Eval
        result_col = get_temp_col(expression)
        try:
            if expression in df.columns:
                return expression
            
            eval_res = df.eval(expression).fillna(False)
            df[result_col] = eval_res
            return result_col
        except Exception as e:
            logger.error(f"Eval failed for '{expression}': {e}")
            return "False"

class BacktestEngine:
    def __init__(self, config: BacktestConfig):
        self.config = config
        self.trades = []
        self.equity_curve = []
        self.daily_positions = {}
        
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate all required indicators for backtesting"""
        if len(df) < 50:
            return df
            
        # EMA
        df['ema_13'] = ta.trend.ema_indicator(df['Close'], window=13)
        df['ema_26'] = ta.trend.ema_indicator(df['Close'], window=26)
        df['ema_50'] = ta.trend.ema_indicator(df['Close'], window=50)
        df['ema_200'] = ta.trend.ema_indicator(df['Close'], window=200)
        
        # MACD
        df['macd'] = ta.trend.macd(df['Close'])
        df['macd_signal'] = ta.trend.macd_signal(df['Close'])
        df['macd_diff'] = ta.trend.macd_diff(df['Close'])
        
        # RSI
        df['rsi'] = ta.momentum.rsi(df['Close'], window=14)
        
        # ATR for stops
        df['atr'] = ta.volatility.average_true_range(df['High'], df['Low'], df['Close'], window=14)
        
        # Force Index
        raw_force = (df['Close'] - df['Close'].shift(1)) * df['Volume']
        df['force_index_2'] = raw_force.ewm(span=2, adjust=False).mean()
        df['force_index_13'] = raw_force.ewm(span=13, adjust=False).mean()
        
        # Elder Impulse System
        df['ema_13_slope'] = df['ema_13'].diff()
        df['macd_diff_slope'] = df['macd_diff'].diff()
        
        def get_impulse(row):
            if pd.isna(row['ema_13_slope']) or pd.isna(row['macd_diff_slope']):
                return "blue"
            if row['ema_13_slope'] > 0 and row['macd_diff_slope'] > 0:
                return "green"
            elif row['ema_13_slope'] < 0 and row['macd_diff_slope'] < 0:
                return "red"
            else:
                return "blue"
        
        df['impulse'] = df.apply(get_impulse, axis=1)
        
        # Williams %R
        df['williams_r'] = ta.momentum.williams_r(df['High'], df['Low'], df['Close'], lbp=14)
        
        # Stochastic
        stoch = ta.momentum.StochasticOscillator(df['High'], df['Low'], df['Close'], window=14, smooth_window=3)
        df['stoch_k'] = stoch.stoch()
        df['stoch_d'] = stoch.stoch_signal()
        
        return df
    
    def detect_divergence(self, df: pd.DataFrame) -> Dict:
        """Detect bullish and bearish divergences"""
        divergences = {'bullish': [], 'bearish': []}
        
        if len(df) < 50:
            return divergences
            
        # MACD Divergence
        macd_hist = df['macd_diff'].values
        prices = df['High'].values
        lows = df['Low'].values
        
        # Find local extrema
        for i in range(10, len(macd_hist) - 10):
            # Bullish divergence: lower low in price, higher low in MACD
            if (i > 20 and 
                df['Low'].iloc[i] < df['Low'].iloc[i-10:i].min() and
                df['macd_diff'].iloc[i] > df['macd_diff'].iloc[i-10:i].min()):
                divergences['bullish'].append({
                    'date': df.index[i],
                    'price': df['Low'].iloc[i],
                    'indicator': df['macd_diff'].iloc[i],
                    'type': 'bullish'
                })
            
            # Bearish divergence: higher high in price, lower high in MACD
            elif (i > 20 and
                  df['High'].iloc[i] > df['High'].iloc[i-10:i].max() and
                  df['macd_diff'].iloc[i] < df['macd_diff'].iloc[i-10:i].max()):
                divergences['bearish'].append({
                    'date': df.index[i],
                    'price': df['High'].iloc[i],
                    'indicator': df['macd_diff'].iloc[i],
                    'type': 'bearish'
                })
        
        return divergences
    
    def generate_signals_custom(self, df: pd.DataFrame, script: str = None) -> pd.DataFrame:
        """Generate signals based on custom Pine-like script"""
        df['signal'] = 0
        plots = []
        
        # 1. Get the script (either passed or from config)
        if script is None:
            script = self.config.custom_strategy_config
            
        if not script:
             logger.warning("No strategy script found.")
             return df, plots
             
        # 2. Parse and Execute Script
        try:
             df, plots = ScriptParser.parse_script(df, str(script))
        except Exception as e:
             logger.error(f"Script Execution Failed: {e}")
             return df, []
        
        # ... signals logic continues
        
        # 3. Generate Signals from Script Output
        for i in range(1, len(df)):
            date = df.index[i]
            
            def is_true(val):
                return val == True or val == 1 or val == 1.0 or str(val).lower() == 'true'

            # Entry/Exit Signals from Script
            if is_true(df.at[date, 'custom_entry_long']):
                df.at[date, 'signal'] = 1
                df.at[date, 'signal_type'] = 'buy_bsl'
                df.at[date, 'signal_reason'] = 'BSL Entry'
            
            elif is_true(df.at[date, 'custom_entry_short']):
                df.at[date, 'signal'] = -1
                df.at[date, 'signal_type'] = 'sell_bsl'
                df.at[date, 'signal_reason'] = 'BSL Entry'
            
            elif is_true(df.at[date, 'custom_exit_long']):
                df.at[date, 'signal'] = -2
                df.at[date, 'signal_type'] = 'exit_bsl'
                df.at[date, 'signal_reason'] = 'BSL Exit'
            
            elif is_true(df.at[date, 'custom_exit_short']):
                df.at[date, 'signal'] = 2
                df.at[date, 'signal_type'] = 'exit_bsl'
                df.at[date, 'signal_reason'] = 'BSL Exit'

        # 4. Final Debug Log
        signal_counts = df['signal'].value_counts().to_dict()
        logger.info(f"BSL: Final Signal Counts: {signal_counts}")
        
        for col in ['custom_entry_long', 'custom_exit_long', 'custom_entry_short', 'custom_exit_short']:
            if col in df.columns:
                c = (df[col] == True).sum()
                logger.info(f"BSL: Column {col} has {c} True values")
        
        return df, plots
    
    def run_backtest(self, symbol: str, start_date: str, end_date: str, strategy_type: str) -> Dict:
        """Run the backtest for a specific symbol and strategy"""
        try:
            # Download data
            df = safe_download(symbol, start=start_date, end=end_date)
            if df.empty:
                raise ValueError(f"No data found for {symbol}")
            
            # Flatten columns if multi-indexed (yfinance new default)
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            
            # Calculate indicators
            df = self.calculate_indicators(df)
            
            # Generate signals based on strategy
            if strategy_type == StrategyTypes.DIVERGENCE:
                # Specialized pre-processing for Divergence
                divergences = self.detect_divergence(df)
                bullish_dates = set(d['date'] for d in divergences['bullish'])
                bearish_dates = set(d['date'] for d in divergences['bearish'])
                df['MACD_DIVERGENCE_BULLISH'] = df.index.map(lambda x: x in bullish_dates)
                df['MACD_DIVERGENCE_BEARISH'] = df.index.map(lambda x: x in bearish_dates)
            
            # Prefer custom config if provided, otherwise fallback to built-in default
            script = self.config.custom_strategy_config
            if not script:
                script = STRATEGY_SCRIPTS.get(strategy_type)
            
            if script:
                df, plots = self.generate_signals_custom(df, script)
            else:
                raise ValueError(f"No BSL script found for strategy: {strategy_type}")
            
            # Run simulation
            self.simulate_trading(df, symbol)
            
            # Calculate performance metrics
            metrics = self.calculate_performance_metrics(df)
            
            # Prepare price data for frontend charting
            price_data = []
            for date, row in df.iterrows():
                data_point = {
                    'time': date.strftime('%Y-%m-%d'),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': float(row['Volume'])
                }
                
                # Add plot data
                for p in plots:
                    col = p['column']
                    if col in row:
                        val = row[col]
                        # Convert to float, handling potential NaN or non-numeric
                        try:
                            data_point[col] = float(val) if not pd.isna(val) else None
                        except:
                            data_point[col] = None
                
                price_data.append(data_point)
            
            return {
                'symbol': symbol,
                'strategy': strategy_type,
                'start_date': start_date,
                'end_date': end_date,
                'metrics': metrics,
                'trades': self.trades,
                'equity_curve': self.equity_curve,
                'price_data': price_data,
                'plots': plots
            }
            
        except Exception as e:
            logger.error(f"Backtest failed for {symbol}: {e}")
            raise
    
    def simulate_trading(self, df: pd.DataFrame, symbol: str):
        """Simulate trading based on generated signals with support for multiple positions"""
        capital = self.config.initial_capital
        open_trades = [] # List to track currently open trade objects
        
        for i in range(len(df)):
            date = df.index[i]
            row = df.iloc[i]
            current_price = row['Close']
            
            # 1. Update equity curve daily (summing all open positions)
            total_position_value = 0
            for trade in open_trades:
                if trade['direction'] == 'Long':
                    total_position_value += trade['quantity'] * current_price
                else: # Short
                    # Treated as liability against the cash that includes proceeds
                    total_position_value -= trade['quantity'] * current_price
            
            self.equity_curve.append({
                'date': date.strftime('%Y-%m-%d'),
                'equity': capital + total_position_value,
                'cash': capital,
                'position_value': total_position_value
            })
            
            # 2. Check for exits on ALL open positions
            remaining_trades = []
            for trade in open_trades:
                exit_triggered = False
                exit_price = 0
                
                if trade['direction'] == 'Long':
                    if df.at[date, 'custom_exit_long'] == True: # Explicit Custom Exit
                         exit_price = current_price
                         exit_triggered = True
                         exit_reason = "Custom Exit Rule"
                    elif current_price <= trade['stop_loss']:
                        exit_price = trade['stop_loss']
                        exit_triggered = True
                        exit_reason = "Stop Loss"
                    elif current_price >= trade['take_profit']:
                        exit_price = trade['take_profit']
                        exit_triggered = True
                        exit_reason = "Take Profit"
                else: # Short
                    if df.at[date, 'custom_exit_short'] == True: # Explicit Custom Exit
                         exit_price = current_price
                         exit_triggered = True
                         exit_reason = "Custom Exit Rule"
                    elif current_price >= trade['stop_loss']:
                        exit_price = trade['stop_loss']
                        exit_triggered = True
                        exit_reason = "Stop Loss"
                    elif current_price <= trade['take_profit']:
                        exit_price = trade['take_profit']
                        exit_triggered = True
                        exit_reason = "Take Profit"
                
                if exit_triggered:
                    # Execute Close
                    commission = self.config.commission_per_trade
                    slippage = trade['quantity'] * self.config.slippage_per_trade
                    
                    if trade['direction'] == 'Long':
                        gross_pl = (exit_price - trade['entry_price']) * trade['quantity']
                        capital += (exit_price * trade['quantity']) - commission - slippage
                    else: # Short
                        gross_pl = (trade['entry_price'] - exit_price) * trade['quantity']
                        capital -= (exit_price * trade['quantity']) + commission + slippage
                    
                    net_pl = gross_pl - commission - slippage
                    
                    # Update the trade record in self.trades (find the original reference)
                    trade.update({
                        'exit_date': date.strftime('%Y-%m-%d'),
                        'exit_price': exit_price,
                        'gross_pl': gross_pl,
                        'net_pl': net_pl,
                        'commission': trade['commission'] + commission,
                        'slippage': trade['slippage'] + slippage,
                        'status': 'closed'
                    })
                else:
                    remaining_trades.append(trade)
            
            open_trades = remaining_trades

            # 3. Check for NEW entries
            if row['signal'] != 0 and len(open_trades) < self.config.max_open_positions:
                # Calculate position size (ensure capital is non-negative)
                safe_capital = max(0, capital)
                risk_amount = safe_capital * (self.config.position_size_percent / 100)
                atr = row['atr']
                
                if row['signal'] == 1:  # Buy (Long)
                    entry_price = current_price
                    stop_loss = entry_price - (atr * self.config.stop_loss_atr_multiplier)
                    take_profit = entry_price + (atr * self.config.take_profit_atr_multiplier)
                    
                    risk_per_share = entry_price - stop_loss
                    if risk_per_share > 0:
                        shares = int(risk_amount / risk_per_share)
                        
                        # Cap shares by available capital (Buying Power)
                        max_shares_by_capital = int(safe_capital / entry_price)
                        shares = min(shares, max_shares_by_capital)
                        
                        if shares > 0:
                            cost = shares * entry_price
                            commission = self.config.commission_per_trade
                            slippage = shares * self.config.slippage_per_trade
                            
                            if cost + commission + slippage <= capital:
                                capital -= (cost + commission + slippage)
                                new_trade = {
                                    'entry_date': date.strftime('%Y-%m-%d'),
                                    'exit_date': None,
                                    'symbol': symbol,
                                    'direction': 'Long',
                                    'entry_price': entry_price,
                                    'exit_price': None,
                                    'quantity': shares,
                                    'stop_loss': stop_loss,
                                    'take_profit': take_profit,
                                    'commission': commission,
                                    'slippage': slippage,
                                    'status': 'open'
                                }
                                self.trades.append(new_trade)
                                open_trades.append(new_trade)
                            else:
                                logger.warning(f"BSL: Long trade rejected. Cost {cost:.2f} > Capital {capital:.2f}. Risk Amount: {risk_amount:.2f}, Risk/Share: {risk_per_share:.2f}, Shares: {shares}")
                
                elif row['signal'] == -1:  # Sell (Short)
                    entry_price = current_price
                    stop_loss = entry_price + (atr * self.config.stop_loss_atr_multiplier)
                    take_profit = entry_price - (atr * self.config.take_profit_atr_multiplier)
                    
                    risk_per_share = stop_loss - entry_price
                    if risk_per_share > 0:
                        shares = int(risk_amount / risk_per_share)
                        
                        # Cap by margin requirements (Buying Power)
                        # proceeds * 0.5 <= capital  =>  shares * entry_price * 0.5 <= capital => shares <= capital / (entry_price * 0.5)
                        max_shares_by_margin = int(safe_capital / (entry_price * 0.5))
                        shares = min(shares, max_shares_by_margin)

                        if shares > 0:
                            proceeds = shares * entry_price
                            commission = self.config.commission_per_trade
                            slippage = shares * self.config.slippage_per_trade
                            
                            # Margin check (assume 50%)
                            margin_required = proceeds * 0.5
                            if margin_required + commission + slippage <= capital:
                                capital += proceeds - commission - slippage
                                new_trade = {
                                    'entry_date': date.strftime('%Y-%m-%d'),
                                    'exit_date': None,
                                    'symbol': symbol,
                                    'direction': 'Short',
                                    'entry_price': entry_price,
                                    'exit_price': None,
                                    'quantity': shares,
                                    'stop_loss': stop_loss,
                                    'take_profit': take_profit,
                                    'commission': commission,
                                    'slippage': slippage,
                                    'status': 'open'
                                }
                                self.trades.append(new_trade)
                                open_trades.append(new_trade)
                            else:
                                logger.warning(f"BSL: Short trade rejected. Margin {margin_required:.2f} > Capital {capital:.2f}. Risk Amount: {risk_amount:.2f}, Risk/Share: {risk_per_share:.2f}, Shares: {shares}")
                
        # 5. Finalize: Close all remaining positions at the end of simulation
        for trade in open_trades:
            exit_price = df['Close'].iloc[-1]
            commission = self.config.commission_per_trade
            slippage = trade['quantity'] * self.config.slippage_per_trade
            
            if trade['direction'] == 'Long':
                gross_pl = (exit_price - trade['entry_price']) * trade['quantity']
                capital += (exit_price * trade['quantity']) - commission - slippage
            else: # Short
                gross_pl = (trade['entry_price'] - exit_price) * trade['quantity']
                capital -= (exit_price * trade['quantity']) + commission + slippage
                
            net_pl = gross_pl - commission - slippage
            
            trade.update({
                'exit_date': df.index[-1].strftime('%Y-%m-%d'),
                'exit_price': exit_price,
                'gross_pl': gross_pl,
                'net_pl': net_pl,
                'status': 'closed',
                'exit_reason': 'End of Simulation'
            })

    def calculate_performance_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate comprehensive performance metrics"""
        closed_trades = [t for t in self.trades if t['status'] == 'closed']
        
        if not closed_trades:
            return self.get_empty_metrics()
        
        # Basic metrics
        total_trades = len(closed_trades)
        winning_trades = len([t for t in closed_trades if t['net_pl'] > 0])
        losing_trades = len([t for t in closed_trades if t['net_pl'] < 0])
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
        
        # Profit metrics
        total_gross_profit = sum(t['gross_pl'] for t in closed_trades if t['gross_pl'] > 0)
        total_gross_loss = abs(sum(t['gross_pl'] for t in closed_trades if t['gross_pl'] < 0))
        profit_factor = total_gross_profit / total_gross_loss if total_gross_loss > 0 else float('inf')
        
        total_net_profit = sum(t['net_pl'] for t in closed_trades)
        avg_win = total_gross_profit / winning_trades if winning_trades > 0 else 0
        avg_loss = total_gross_loss / losing_trades if losing_trades > 0 else 0
        
        # Risk metrics
        max_drawdown, max_drawdown_percent = self.calculate_max_drawdown_metrics([eq['equity'] for eq in self.equity_curve])
        
        # Return metrics
        total_return = total_net_profit
        total_return_percent = (total_return / self.config.initial_capital) * 100 if self.config.initial_capital > 0 else 0
        
        # Time-based metrics
        start_date = pd.to_datetime(self.equity_curve[0]['date'])
        end_date = pd.to_datetime(self.equity_curve[-1]['date'])
        years = (end_date - start_date).days / 365.25
        
        final_equity = self.equity_curve[-1]['equity']
        if final_equity <= 0:
            cagr = -100.0
        elif years > 0:
            cagr = ((final_equity / self.config.initial_capital) ** (1/years) - 1) * 100
        else:
            cagr = 0.0
        
        # Risk-adjusted returns
        daily_returns = self.calculate_daily_returns([eq['equity'] for eq in self.equity_curve])
        sharpe_ratio = self.calculate_sharpe_ratio(daily_returns)
        sortino_ratio = self.calculate_sortino_ratio(daily_returns)
        calmar_ratio = self.calculate_calmar_ratio(cagr, max_drawdown_percent)
        ulcer_index = self.calculate_ulcer_index([eq['equity'] for eq in self.equity_curve])
        
        # Trade statistics
        best_trade = max([t['net_pl'] for t in closed_trades]) if closed_trades else 0
        worst_trade = min([t['net_pl'] for t in closed_trades]) if closed_trades else 0
        
        # Streak analysis
        win_streaks, loss_streaks = self.calculate_streaks(closed_trades)
        longest_win_streak = max(win_streaks) if win_streaks else 0
        longest_loss_streak = max(loss_streaks) if loss_streaks else 0
        
        # Average risk-reward
        avg_risk_reward = abs(avg_win / avg_loss) if avg_loss > 0 else float('inf')
        
        metrics = {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': round(win_rate, 2),
            'profit_factor': round(profit_factor, 2),
            'max_drawdown': round(max_drawdown, 2),
            'max_drawdown_percent': round(max_drawdown_percent, 2),
            'total_return': round(total_return, 2),
            'total_return_percent': round(total_return_percent, 2),
            'cagr': round(cagr, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'sortino_ratio': round(sortino_ratio, 2),
            'calmar_ratio': round(calmar_ratio, 2),
            'ulcer_index': round(ulcer_index, 2),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'avg_risk_reward': round(avg_risk_reward, 2),
            'best_trade': round(best_trade, 2),
            'worst_trade': round(worst_trade, 2),
            'longest_win_streak': longest_win_streak,
            'longest_loss_streak': longest_loss_streak
        }

        # Final sanitization: Replace nan/inf with 0.0 for database safety
        for key, value in metrics.items():
            if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
                metrics[key] = 0.0
                
        return metrics
    
    def calculate_max_drawdown_metrics(self, equity_series: List[float]) -> Tuple[float, float]:
        """Calculate maximum drawdown in dollars and percentage off peak"""
        if not equity_series:
            return 0.0, 0.0
        
        peak = equity_series[0]
        max_dd_dollars = 0.0
        max_dd_percent = 0.0
        
        for value in equity_series:
            if value > peak:
                peak = value
            
            dd_dollars = peak - value
            if peak > 0:
                dd_percent = (dd_dollars / peak) * 100
            else:
                dd_percent = 0.0
            
            if dd_dollars > max_dd_dollars:
                max_dd_dollars = dd_dollars
            
            if dd_percent > max_dd_percent:
                max_dd_percent = dd_percent
                
        return max_dd_dollars, max_dd_percent
    
    def calculate_daily_returns(self, equity_series: List[float]) -> List[float]:
        """Calculate daily returns"""
        returns = []
        for i in range(1, len(equity_series)):
            ret = (equity_series[i] / equity_series[i-1]) - 1
            returns.append(ret)
        return returns
    
    def calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.02) -> float:
        """Calculate Sharpe ratio"""
        if len(returns) < 2:
            return 0
        
        excess_returns = [r - (risk_free_rate / 252) for r in returns]
        mean_return = np.mean(excess_returns)
        std_return = np.std(excess_returns)
        
        if std_return == 0:
            return 0
        
        # Annualize
        sharpe = (mean_return / std_return) * np.sqrt(252)
        return sharpe
    
    def calculate_sortino_ratio(self, returns: List[float], risk_free_rate: float = 0.02, target_return: float = 0) -> float:
        """Calculate Sortino ratio"""
        if len(returns) < 2:
            return 0
        
        excess_returns = [r - (risk_free_rate / 252) for r in returns]
        downside_returns = [r for r in excess_returns if r < target_return]
        
        if not downside_returns:
            return float('inf')
        
        mean_return = np.mean(excess_returns)
        downside_deviation = np.std(downside_returns)
        
        if downside_deviation == 0:
            return 0
        
        # Annualize
        sortino = (mean_return / downside_deviation) * np.sqrt(252)
        return sortino
    
    def calculate_calmar_ratio(self, cagr: float, max_drawdown_percent: float) -> float:
        """Calculate Calmar ratio (CAGR / Max Drawdown)"""
        if max_drawdown_percent <= 0:
            return 0.0
        # If CAGR is negative, Calmar is technically negative, which is fine
        return cagr / max_drawdown_percent

    def calculate_ulcer_index(self, equity_series: List[float]) -> float:
        """Calculate Ulcer Index (Square root of mean squared drawdowns)"""
        if not equity_series:
            return 0
        
        peak = equity_series[0]
        squared_drawdowns = []
        
        for value in equity_series:
            if value > peak:
                peak = value
            
            dd_pct = ((peak - value) / peak) * 100
            squared_drawdowns.append(dd_pct ** 2)
            
        return np.sqrt(np.mean(squared_drawdowns))
    
    def calculate_streaks(self, trades: List[Dict]) -> Tuple[List[int], List[int]]:
        """Calculate win and loss streaks"""
        win_streaks = []
        loss_streaks = []
        
        current_win_streak = 0
        current_loss_streak = 0
        
        for trade in trades:
            if trade['net_pl'] > 0:
                current_win_streak += 1
                if current_loss_streak > 0:
                    loss_streaks.append(current_loss_streak)
                    current_loss_streak = 0
            else:
                current_loss_streak += 1
                if current_win_streak > 0:
                    win_streaks.append(current_win_streak)
                    current_win_streak = 0
        
        # Add final streaks
        if current_win_streak > 0:
            win_streaks.append(current_win_streak)
        if current_loss_streak > 0:
            loss_streaks.append(current_loss_streak)
        
        return win_streaks, loss_streaks
    
    def get_empty_metrics(self) -> Dict:
        """Return empty metrics structure"""
        return {
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'win_rate': 0,
            'profit_factor': 0,
            'max_drawdown': 0,
            'max_drawdown_percent': 0,
            'total_return': 0,
            'total_return_percent': 0,
            'cagr': 0,
            'sharpe_ratio': 0,
            'sortino_ratio': 0,
            'calmar_ratio': 0,
            'ulcer_index': 0,
            'avg_win': 0,
            'avg_loss': 0,
            'avg_risk_reward': 0,
            'best_trade': 0,
            'worst_trade': 0,
            'longest_win_streak': 0,
            'longest_loss_streak': 0
        }

def save_backtest_result(result: Dict, config: BacktestConfig):
    """Save backtest result to database"""
    try:
        with Session(engine) as session:
            backtest = BacktestResult(
                name=f"{config.strategy_name} - {result['symbol']}",
                strategy_config=json.dumps({
                    'strategy_name': config.strategy_name,
                    'initial_capital': config.initial_capital,
                    'position_size_percent': config.position_size_percent,
                    'commission_per_trade': config.commission_per_trade,
                    'slippage_per_trade': config.slippage_per_trade,
                    'stop_loss_atr_multiplier': config.stop_loss_atr_multiplier,
                    'take_profit_atr_multiplier': config.take_profit_atr_multiplier
                }),
                symbol=result['symbol'],
                start_date=result['start_date'],
                end_date=result['end_date'],
                initial_capital=config.initial_capital,
                position_size_percent=config.position_size_percent,
                commission_per_trade=config.commission_per_trade,
                slippage_per_trade=config.slippage_per_trade,
                plots=json.dumps(result.get("plots", [])),
                **result['metrics'],
                trades=json.dumps(result['trades']),
                equity_curve=json.dumps(result['equity_curve']),
                price_data=json.dumps(result.get('price_data', [])),
                created_at=datetime.now().isoformat()
            )
            
            session.add(backtest)
            session.commit()
            session.refresh(backtest)
            
            return backtest.id
            
    except Exception as e:
        logger.error(f"Failed to save backtest result: {e}")
        raise