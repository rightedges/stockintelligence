from sqlmodel import create_engine, text, Session
from database import sqlite_url

engine = create_engine(sqlite_url)

def check_schema():
    with Session(engine) as session:
        try:
            result = session.exec(text("PRAGMA table_info(trade)")).all()
            print("Columns in 'trade' table:")
            found_snapshot = False
            for col in result:
                print(f"- {col[1]} ({col[2]})")
                if col[1] == 'snapshot':
                    found_snapshot = True
            
            if not found_snapshot:
                print("\n❌ CRITICAL: 'snapshot' column is MISSING!")
            else:
                print("\n✅ 'snapshot' column exists.")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
