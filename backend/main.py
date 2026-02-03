
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
    from migrate_db import migrate
    try:
        migrate()
    except Exception as e:
        print(f"Startup Migration Error: {e}")
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

