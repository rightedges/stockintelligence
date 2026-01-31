
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, text
from database import engine

# Create the database tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    
    # Auto-migration for divergence_status
    try:
        with Session(engine) as session:
            session.exec(text("ALTER TABLE stock ADD COLUMN divergence_status TEXT"))
            session.commit()
            print("Migrated: Added divergence_status column")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note (div): {e}")

    # Auto-migration for efi_status
    try:
        with Session(engine) as session:
            session.exec(text("ALTER TABLE stock ADD COLUMN efi_status TEXT"))
            session.commit()
            print("Migrated: Added efi_status column")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note (efi): {e}")

    # Auto-migration for Trade fields (entry_reason, exit_snapshot)
    try:
        with Session(engine) as session:
            session.exec(text("ALTER TABLE trade ADD COLUMN entry_reason TEXT"))
            session.commit()
            print("Migrated: Added entry_reason column")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note (trade reason): {e}")

    try:
        with Session(engine) as session:
            session.exec(text("ALTER TABLE trade ADD COLUMN exit_snapshot TEXT"))
            session.commit()
            print("Migrated: Added exit_snapshot column")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note (trade exit snap): {e}")

    try:
        with Session(engine) as session:
            session.exec(text("ALTER TABLE trade ADD COLUMN exit_reason TEXT"))
            session.commit()
            print("Migrated: Added exit_reason column")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note (trade exit reason): {e}")

    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# CORS configuration
origins = [
    "http://localhost:5173",  # React frontend (standard)
    "http://127.0.0.1:5173",  # React frontend (IP)
    "http://localhost:5174",  # React frontend (Vite alternative)
    "http://intelligence.local:5173", # LAN Access
    "http://192.168.50.164:5173", # Direct IP Access
    "http://192.168.50.16:5173",  # Server IP Access
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Stock Analysis API is running"}

from routes import stocks, journal, trades
app.include_router(stocks.router)
app.include_router(journal.router)
app.include_router(trades.router)

