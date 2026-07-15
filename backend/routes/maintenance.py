from flask import Blueprint, render_template, request, jsonify

from database import get_db

maintenance_bp = Blueprint("maintenance", __name__)


@maintenance_bp.route("/maintenance")
def maintenance_page():
    return render_template("maintenance.html")


@maintenance_bp.route("/api/maintenance", methods=["GET"])
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


@maintenance_bp.route("/api/maintenance", methods=["POST"])
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


@maintenance_bp.route("/api/maintenance/<int:record_id>", methods=["PUT"])
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


@maintenance_bp.route("/api/maintenance/<int:record_id>", methods=["DELETE"])
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