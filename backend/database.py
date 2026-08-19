import os
import sqlite3

DATA_DIR = os.environ.get("DATA_DIR", ".")
DATABASE = os.path.join(DATA_DIR, "vehicles.db")


def get_db():
    """Get database connection with row factory enabled."""
    if DATA_DIR and DATA_DIR != ".":
        os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables and run lightweight migrations."""
    conn = get_db()
    try:
        conn.execute("PRAGMA foreign_keys = ON;")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                year TEXT,
                vin TEXT UNIQUE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS mileage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER NOT NULL,
                mileage INTEGER NOT NULL,
                date TEXT NOT NULL,
                FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS maintenance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER,
                service_date TEXT,
                category TEXT,
                service_type TEXT,
                description TEXT,
                cost REAL,
                mileage INTEGER,
                FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            )
        """)

        # Migration helper: ensure `cost` column exists if database was created by an older schema
        cols = [c["name"] for c in conn.execute("PRAGMA table_info(maintenance)").fetchall()]
        if "cost" not in cols:
            conn.execute("ALTER TABLE maintenance ADD COLUMN cost REAL")

        conn.commit()
    finally:
        conn.close()
