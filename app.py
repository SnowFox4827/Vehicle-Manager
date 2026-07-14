from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

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


# --------------------
# Dashboard
# --------------------
@app.route("/")
def home():
    conn = get_db()
    try:
        vehicle_count = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
        mileage_count = conn.execute("SELECT COUNT(*) FROM mileage").fetchone()[0]

        recent_mileage = conn.execute("""
            SELECT
                vehicles.id,
                vehicles.make,
                vehicles.model,
                vehicles.year,
                COALESCE(mileage.mileage, 0) as mileage,
                mileage.date
            FROM vehicles
            LEFT JOIN mileage ON vehicles.id = mileage.vehicle_id
                AND mileage.date = (
                    SELECT MAX(m.date)
                    FROM mileage m
                    WHERE m.vehicle_id = vehicles.id
                )
            ORDER BY vehicles.make, vehicles.model
        """).fetchall()

        return render_template(
            "home.html",
            vehicle_count=vehicle_count,
            mileage_count=mileage_count,
            recent_mileage=[dict(row) for row in recent_mileage]
        )
    finally:
        conn.close()


# --------------------
# Vehicle Routes
# --------------------
@app.route("/vehicles")
def vehicles_page():
    return render_template("vehicles.html")


@app.route("/api/vehicles", methods=["GET"])
def get_vehicles():
    conn = get_db()
    try:
        vehicles = conn.execute("SELECT * FROM vehicles ORDER BY make, model").fetchall()
        return jsonify([dict(v) for v in vehicles])
    finally:
        conn.close()


@app.route("/api/vehicles", methods=["POST"])
def add_vehicle():
    data = request.get_json(silent=True) or {}
    if not data.get("make") or not data.get("model"):
        return jsonify({"error": "make and model are required"}), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            INSERT INTO vehicles (make, model, year, vin)
            VALUES (?, ?, ?, ?)
        """, (
            data["make"].strip(),
            data["model"].strip(),
            data.get("year"),
            data.get("vin")
        ))
        conn.commit()
        return jsonify({"message": "Vehicle added successfully", "id": cursor.lastrowid}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "A vehicle with this VIN already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/vehicles/<int:vehicle_id>", methods=["PUT"])
def update_vehicle(vehicle_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    try:
        cursor = conn.execute("""
            UPDATE vehicles
            SET make = ?, model = ?, year = ?, vin = ?
            WHERE id = ?
        """, (
            data.get("make", "").strip(),
            data.get("model", "").strip(),
            data.get("year"),
            data.get("vin"),
            vehicle_id
        ))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Vehicle not found"}), 404
        return jsonify({"message": "Vehicle updated successfully"})
    finally:
        conn.close()


@app.route("/api/vehicles/<int:vehicle_id>", methods=["DELETE"])
def delete_vehicle(vehicle_id):
    """Delete vehicle and all related records (cascade)."""
    conn = get_db()
    try:
        cursor = conn.execute("DELETE FROM vehicles WHERE id = ?", (vehicle_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Vehicle not found"}), 404
        return jsonify({"message": "Vehicle and related records deleted successfully"})
    finally:
        conn.close()


# --------------------
# Mileage Routes
# --------------------
@app.route("/mileage")
def mileage_page():
    return render_template("mileage.html")


@app.route("/api/mileage", methods=["GET"])
def get_mileage():
    conn = get_db()
    try:
        records = conn.execute("""
            SELECT 
                mileage.id,
                vehicles.make,
                vehicles.model,
                mileage.vehicle_id,
                mileage.mileage,
                mileage.date
            FROM mileage
            JOIN vehicles ON vehicles.id = mileage.vehicle_id
            ORDER BY mileage.date DESC
        """).fetchall()
        return jsonify([dict(r) for r in records])
    finally:
        conn.close()


@app.route("/api/mileage", methods=["POST"])
def add_mileage():
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ("vehicle_id", "mileage", "date")):
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            INSERT INTO mileage (vehicle_id, mileage, date)
            VALUES (?, ?, ?)
        """, (data["vehicle_id"], data["mileage"], data["date"]))
        conn.commit()
        return jsonify({"message": "Mileage added successfully", "id": cursor.lastrowid}), 201
    finally:
        conn.close()


@app.route("/api/mileage/<int:record_id>", methods=["PUT"])
def update_mileage(record_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    try:
        cursor = conn.execute("""
            UPDATE mileage
            SET mileage = ?, date = ?
            WHERE id = ?
        """, (data.get("mileage"), data.get("date"), record_id))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Mileage record not found"}), 404
        return jsonify({"message": "Mileage updated successfully"})
    finally:
        conn.close()


@app.route("/api/mileage/<int:record_id>", methods=["DELETE"])
def delete_mileage(record_id):
    conn = get_db()
    try:
        cursor = conn.execute("DELETE FROM mileage WHERE id = ?", (record_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Mileage record not found"}), 404
        return jsonify({"message": "Mileage record deleted successfully"})
    finally:
        conn.close()


# --------------------
# Maintenance Routes (similar pattern)
# --------------------
@app.route("/maintenance")
def maintenance_page():
    return render_template("maintenance.html")


@app.route("/api/maintenance", methods=["GET"])
def get_maintenance():
    conn = get_db()
    try:
        records = conn.execute("""
            SELECT
                maintenance.id,
                vehicles.make,
                vehicles.model,
                maintenance.service_date,
                maintenance.category,
                maintenance.service_type,
                maintenance.description,
                maintenance.mileage
            FROM maintenance
            JOIN vehicles
            ON vehicles.id = maintenance.vehicle_id
            ORDER BY maintenance.service_date DESC
        """).fetchall()
        return jsonify([dict(r) for r in records])
    finally:
        conn.close()


@app.route("/api/maintenance", methods=["POST"])
def add_maintenance():
    data = request.get_json(silent=True) or {}
    if not all(k in data for k in ("vehicle_id", "service_date", "service_type")):
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            INSERT INTO maintenance(vehicle_id,service_date,category,service_type,description,mileage)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
                data["vehicle_id"],
                data["service_date"],
                data["category"],
                data["service_type"],
                data["description"],
                data["mileage"]
            ))
        conn.commit()
        return jsonify({"message": "Maintenance record added successfully", "id": cursor.lastrowid}), 201
    finally:
        conn.close()


@app.route("/api/maintenance/<int:record_id>", methods=["PUT"])
def update_maintenance(record_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    try:
        cursor = conn.execute("""
            UPDATE maintenance
            SET service_date = ?, category=?,service_type = ?, description = ?, mileage = ?
            WHERE id = ?
        """, (
            data.get("service_date"),
            data.get("category"),
            data.get("service_type"),
            data.get("description"),
            data.get("mileage"),
            record_id
        ))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Maintenance record not found"}), 404
        return jsonify({"message": "Maintenance updated successfully"})
    finally:
        conn.close()


@app.route("/api/maintenance/<int:record_id>", methods=["DELETE"])
def delete_maintenance(record_id):
    conn = get_db()
    try:
        cursor = conn.execute("DELETE FROM maintenance WHERE id = ?", (record_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Maintenance record not found"}), 404
        return jsonify({"message": "Maintenance record deleted successfully"})
    finally:
        conn.close()


# --------------------
# Run Application
# --------------------
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)