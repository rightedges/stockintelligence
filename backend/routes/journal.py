from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from database import get_session
from models import JournalEntry
from datetime import datetime

router = APIRouter(prefix="/api/journal", tags=["journal"])

@router.post("/")
def create_entry(entry: JournalEntry, session: Session = Depends(get_session)):
    if not entry.timestamp:
        entry.timestamp = datetime.now().isoformat()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@router.get("/{symbol}")
def get_entries(symbol: str, timeframe: str = None, session: Session = Depends(get_session)):
    statement = select(JournalEntry).where(JournalEntry.symbol == symbol)
    if timeframe:
        statement = statement.where(JournalEntry.timeframe == timeframe)
    
    # Order by timestamp descending
    results = session.exec(statement).all()
    # Sort in python as sqlmodel/sqlite ordering can be tricky with simple strings
    results.sort(key=lambda x: x.timestamp, reverse=True)
    return results

@router.delete("/{id}")
def delete_entry(id: int, session: Session = Depends(get_session)):
    statement = select(JournalEntry).where(JournalEntry.id == id)
    entry = session.exec(statement).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"ok": True}
