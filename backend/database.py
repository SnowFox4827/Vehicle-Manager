import sqlite3

DATABASE = "vehicles.db"


def get_db():
    """Get database connection with row factory enabled."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables."""
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
                mileage INTEGER,
                FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
            )
        """)
        conn.commit()
    finally:
        conn.close()