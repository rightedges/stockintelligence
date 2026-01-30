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
            if "duplicate column name" not in str(e).lower():
                 print(f"Migration note (stock): {e}")

        try:
            # Attempt to add snapshot column to Trade table
            session.exec(text("ALTER TABLE trade ADD COLUMN snapshot TEXT"))
            session.commit()
            print("✅ SUCCESS: Added 'snapshot' column to 'trade' table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("ℹ️  INFO: Column 'snapshot' already exists in 'trade'.")
            else:
                 print(f"❌ ERROR: Trade Migration failed: {e}")

if __name__ == "__main__":
    migrate()
