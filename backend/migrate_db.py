from sqlmodel import create_engine, Session, text
from database import sqlite_url

# Initialize engine
engine = create_engine(sqlite_url)

def migrate():
    print("Checking database schema...")
    with Session(engine) as session:
        try:
            # Attempt to add the new column
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
