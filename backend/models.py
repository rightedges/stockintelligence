from typing import Optional
from sqlmodel import Field, SQLModel

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True, unique=True)
    name: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None
    is_watched: bool = Field(default=False)

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
