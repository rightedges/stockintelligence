
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
origins = ["*"]

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

from routes import stocks, journal, trades, backtest
app.include_router(stocks.router)
app.include_router(journal.router)
app.include_router(trades.router)
app.include_router(backtest.router)

