
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
        # Check if error is because column exists
        if "duplicate column name" not in str(e).lower():
            print(f"Migration note: {e}")

    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

# CORS configuration
origins = [
    "http://localhost:5173",  # React frontend (standard)
    "http://localhost:5174",  # React frontend (Vite alternative)
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Stock Analysis API is running"}

from routes import stocks, journal
app.include_router(stocks.router)
app.include_router(journal.router)

