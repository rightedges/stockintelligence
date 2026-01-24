from typing import Optional
from sqlmodel import Field, SQLModel

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True, unique=True)
    name: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None

class Template(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    configuration: str  # JSON string storing active indicators/settings
