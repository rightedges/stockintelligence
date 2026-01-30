from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Optional
from database import engine
from models import Trade

router = APIRouter(prefix="/trades", tags=["trades"])

def get_session():
    with Session(engine) as session:
        yield session

@router.get("/", response_model=List[Trade])
def read_trades(session: Session = Depends(get_session)):
    return session.exec(select(Trade).order_by(Trade.entry_date.desc())).all()

@router.post("/", response_model=Trade)
def create_trade(trade: Trade, session: Session = Depends(get_session)):
    # Auto-calculate logic can go here or frontend.
    # Frontend handles reactive calc, but let's ensure consistency here if needed.
    
    # Calculate Grades if not provided?
    # For now, trust frontend values or just store implementation.
    
    try:
        session.add(trade)
        session.commit()
        session.refresh(trade)
        return trade
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write(f"Error creating trade: {e}\nPayload: {trade}\n")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.patch("/{trade_id}", response_model=Trade)
def update_trade(trade_id: int, trade_update: Trade, session: Session = Depends(get_session)):
    db_trade = session.get(Trade, trade_id)
    if not db_trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    trade_data = trade_update.dict(exclude_unset=True)
    for key, value in trade_data.items():
        setattr(db_trade, key, value)
        
    session.add(db_trade)
    session.commit()
    session.refresh(db_trade)
    return db_trade

@router.delete("/{trade_id}")
def delete_trade(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    session.delete(trade)
    session.commit()
    return {"ok": True}
