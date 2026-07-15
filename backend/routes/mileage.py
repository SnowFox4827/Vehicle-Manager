from flask import Blueprint, request, jsonify

from database import get_db

mileage_bp = Blueprint("mileage", __name__)


@mileage_bp.route("/api/mileage", methods=["GET"])
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


@mileage_bp.route("/api/mileage/recent", methods=["GET"])
def get_recent_mileage():
    """Return each vehicle with its most recent mileage reading, if any.

    Used by the frontend home dashboard. Vehicles with no mileage
    records yet are still included (mileage/date come back null).
    """
    conn = get_db()
    try:
        records = conn.execute("""
            SELECT make, model, year, mileage, date
            FROM (
                SELECT
                    vehicles.id AS vehicle_id,
                    vehicles.make,
                    vehicles.model,
                    vehicles.year,
                    mileage.mileage,
                    mileage.date,
                    ROW_NUMBER() OVER (
                        PARTITION BY vehicles.id
                        ORDER BY mileage.date DESC, mileage.id DESC
                    ) AS rn
                FROM vehicles
                LEFT JOIN mileage ON mileage.vehicle_id = vehicles.id
            )
            WHERE rn = 1
            ORDER BY make, model
        """).fetchall()
        return jsonify([dict(r) for r in records])
    finally:
        conn.close()


@mileage_bp.route("/api/mileage", methods=["POST"])
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


@mileage_bp.route("/api/mileage/<int:record_id>", methods=["PUT"])
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


@mileage_bp.route("/api/mileage/<int:record_id>", methods=["DELETE"])
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