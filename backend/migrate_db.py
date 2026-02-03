from sqlmodel import create_engine, Session, text, SQLModel
from database import sqlite_url
from models import Trade # Import Trade model to register it

# Initialize engine
engine = create_engine(sqlite_url)

def migrate():
    print("Checking database schema...")
    
    # Ensure all tables exist (creates new tables if they don't exist)
    SQLModel.metadata.create_all(engine)
    print("✅ Verified tables.")

    def add_column(table_name, column_name, column_type):
        with Session(engine) as session:
            try:
                session.exec(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
                session.commit()
                print(f"✅ SUCCESS: Added '{column_name}' to '{table_name}'.")
            except Exception as e:
                # Silence 'duplicate column name' errors as they are expected on subsequent runs
                if "duplicate column" not in str(e).lower():
                    print(f"Migration note ({table_name}.{column_name}): {e}")

    # --- STOCK TABLE ---
    add_column("stock", "divergence_status", "TEXT")
    add_column("stock", "efi_status", "TEXT")
    add_column("stock", "setup_signal", "TEXT")

    # --- TRADE TABLE ---
    # Core identifying fields (usually in base but checking)
    add_column("trade", "strategy_name", "TEXT")
    add_column("trade", "entry_reason", "TEXT")
    add_column("trade", "snapshot", "TEXT")
    add_column("trade", "exit_snapshot", "TEXT")
    add_column("trade", "exit_reason", "TEXT")
    
    # Performance & Financials
    add_column("trade", "slippage_entry", "REAL")
    add_column("trade", "comm_entry", "REAL")
    add_column("trade", "slippage_exit", "REAL")
    add_column("trade", "comm_exit", "REAL")
    add_column("trade", "fees", "REAL")
    add_column("trade", "gross_pl", "REAL")
    add_column("trade", "net_pl", "REAL")
    
    # Elder Context Fields
    add_column("trade", "upper_channel", "REAL")
    add_column("trade", "lower_channel", "REAL")
    add_column("trade", "entry_day_high", "REAL")
    add_column("trade", "entry_day_low", "REAL")
    add_column("trade", "exit_day_high", "REAL")
    add_column("trade", "exit_day_low", "REAL")
    
    # Grading & Notes
    add_column("trade", "grade_entry", "TEXT")
    add_column("trade", "grade_exit", "TEXT")
    add_column("trade", "grade_trade", "TEXT")
    add_column("trade", "note", "TEXT")

    print("🏁 Migration check complete.")

if __name__ == "__main__":
    migrate()
