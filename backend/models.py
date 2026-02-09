from typing import Optional
from sqlmodel import Field, SQLModel

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True, unique=True)
    name: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None
    is_watched: bool = Field(default=False)
    divergence_status: Optional[str] = None # 'bullish', 'bearish', 'dual_bullish', 'dual_bearish'
    efi_status: Optional[str] = None # 'buy', 'sell'
    setup_signal: Optional[str] = None # 'pullback_buy', 'pullback_sell'
    candle_pattern: Optional[str] = None # 'hammer', 'engulfing', 'morning_star', etc.
    candle_pattern_type: Optional[str] = None # 'bullish' or 'bearish'
    confluence_alert: Optional[str] = None # 'HIGH-CONVICTION REVERSAL...', etc.

class StockPublic(Stock):
    impulse: Optional[str] = None

class Template(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    configuration: str  # JSON string storing active indicators/settings

class JournalEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    timestamp: str 
    note: str
    snapshot: Optional[str] = None # Base64 string
    timeframe: str # Weekly or Daily

class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    account: str = Field(default="Main")
    source: str = Field(default="Homework") # Homework, Tip, Webinar, etc.
    strategy_name: Optional[str] = None # 'Impulse', 'Divergence', etc.
    symbol: str = Field(index=True)
    quantity: float
    direction: str # 'Long' or 'Short'
    snapshot: Optional[str] = None # Base64 chart image
    
    # Entry
    entry_reason: Optional[str] = None # Why? Strategy context.
    entry_date: str
    entry_price: float
    entry_order_type: str = "Market" # Market, Limit
    entry_order_price: Optional[float] = None # For slippage calc
    slippage_entry: Optional[float] = 0.0
    comm_entry: Optional[float] = 0.0
    
    # Exit
    exit_snapshot: Optional[str] = None # Base64 chart image on exit
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None # Target Hit, Stop Loss, etc.
    exit_price: Optional[float] = None
    exit_order_type: Optional[str] = None
    exit_order_price: Optional[float] = None
    slippage_exit: Optional[float] = 0.0
    comm_exit: Optional[float] = 0.0
    fees: Optional[float] = 0.0
    
    # Performance
    gross_pl: Optional[float] = 0.0
    net_pl: Optional[float] = 0.0
    
    # Mental/Context
    upper_channel: Optional[float] = None
    lower_channel: Optional[float] = None
    entry_day_high: Optional[float] = None
    entry_day_low: Optional[float] = None
    exit_day_high: Optional[float] = None
    exit_day_low: Optional[float] = None
    
    # Grading (A, B, C or numeric score 0-100)
    grade_entry: Optional[str] = None
    grade_exit: Optional[str] = None
    grade_trade: Optional[str] = None
    
    note: Optional[str] = None

class BacktestResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    strategy_config: str  # JSON string with strategy parameters
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    position_size_percent: float
    commission_per_trade: float
    slippage_per_trade: float
    
    # Performance Metrics
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    max_drawdown: float = 0.0
    max_drawdown_percent: float = 0.0
    total_return: float = 0.0
    total_return_percent: float = 0.0
    cagr: float = 0.0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    calmar_ratio: float = 0.0
    ulcer_index: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    avg_risk_reward: float = 0.0
    best_trade: float = 0.0
    worst_trade: float = 0.0
    longest_win_streak: int = 0
    longest_loss_streak: int = 0
    
    # Trade Details
    trades: Optional[str] = None  # JSON array of trade details
    equity_curve: Optional[str] = None  # JSON array of equity values over time
    price_data: Optional[str] = None  # JSON array of OHLCV data for charting
    plots: Optional[str] = None  # JSON array of plot metadata
    created_at: str

class BacktestTrade(SQLModel):
    entry_date: str
    exit_date: str
    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    quantity: float
    gross_pl: float
    net_pl: float
    commission: float
    slippage: float
    max_runup: float
    max_drawdown: float
    trade_return_percent: float
    strategy_signal: str
    reason: str

class BacktestRequest(SQLModel):
    symbol: str
    strategy_type: str = Field(alias="strategyType")
    start_date: str = Field(alias="startDate")
    end_date: str = Field(alias="endDate")
    initial_capital: float = Field(default=10000.0, alias="initialCapital")
    position_size_percent: float = Field(default=2.0, alias="positionSizePercent")
    commission_per_trade: float = Field(default=1.0, alias="commissionPerTrade")
    slippage_per_trade: float = Field(default=0.01, alias="slippagePerTrade")
    stop_loss_atr_multiplier: float = Field(default=2.0, alias="stopLossATRMultiplier")
    take_profit_atr_multiplier: float = Field(default=3.0, alias="takeProfitATRMultiplier")
    max_open_positions: int = Field(default=5, alias="maxOpenPositions")
    custom_strategy_config: Optional[str] = Field(default=None, alias="customStrategyConfig")

    model_config = {
        "populate_by_name": True
    }

class BSLScript(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    script: str  # The actual BSL code
    created_at: str
    updated_at: str