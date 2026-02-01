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
