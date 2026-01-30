from sqlmodel import create_engine, Session, text, SQLModel
from database import sqlite_url
from models import Trade # Import Trade model to register it

# Initialize engine
engine = create_engine(sqlite_url)

def migrate():
    print("Checking database schema...")
    
    # Ensure all tables exist (including new Trade table)
    SQLModel.metadata.create_all(engine)
    print("✅ Verified tables.")

    with Session(engine) as session:
        try:
            # Attempt to add the new column (if needed for stock table)
            session.exec(text("ALTER TABLE stock ADD COLUMN divergence_status TEXT"))
            session.commit()
            print("✅ SUCCESS: Added 'divergence_status' column to 'stock' table.")
        except Exception as e:
            # Check if error is because column already exists (common in SQLite)
            if "duplicate column name" in str(e).lower():
                print("ℹ️  INFO: Column 'divergence_status' already exists. You are good to go.")
            else:
                print(f"❌ ERROR: Migration failed: {e}")

if __name__ == "__main__":
    migrate()
