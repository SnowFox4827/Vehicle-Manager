from flask import Blueprint, request, jsonify
from database import get_db

maintenance_bp = Blueprint("maintenance", __name__)

MAINTENANCE_TYPES = [
    "Oil Change",
    "Tire Rotation",
    "Brake Service",
    "Transmission Service",
    "Battery Replacement",
    "Air Filter",
    "Cabin Filter",
    "Coolant Flush",
    "Spark Plugs",
    "Inspection",
    "Wiper Blades",
    "Other"
]


@maintenance_bp.route("/api/maintenance/types", methods=["GET"])
def get_maintenance_types():
    return jsonify(MAINTENANCE_TYPES)


@maintenance_bp.route("/api/maintenance", methods=["GET"])
def get_maintenance():
    conn = get_db()
    try:
        records = conn.execute("""
            SELECT
                maintenance.id,
                maintenance.vehicle_id,
                vehicles.make,
                vehicles.model,
                vehicles.year,
                maintenance.service_date AS date,
                maintenance.service_type AS type,
                maintenance.category,
                maintenance.description,
                maintenance.cost,
                maintenance.mileage AS mileage_at_service
            FROM maintenance
            JOIN vehicles ON vehicles.id = maintenance.vehicle_id
            ORDER BY maintenance.service_date DESC, maintenance.id DESC
        """).fetchall()
        return jsonify([dict(r) for r in records])
    finally:
        conn.close()


@maintenance_bp.route("/api/maintenance", methods=["POST"])
def add_maintenance():
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get("vehicle_id")
    service_type = data.get("type") or data.get("service_type")
    service_date = data.get("date") or data.get("service_date")
    category = data.get("category", "General")
    description = data.get("description")
    cost = data.get("cost")
    mileage = data.get("mileage_at_service") or data.get("mileage")

    if not vehicle_id or not service_type or not service_date:
        return jsonify({"error": "vehicle_id, type/service_type, and date/service_date are required"}), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            INSERT INTO maintenance (vehicle_id, service_date, category, service_type, description, cost, mileage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            vehicle_id,
            service_date,
            category,
            service_type,
            description,
            cost,
            mileage
        ))
        conn.commit()
        return jsonify({"message": "Maintenance record added successfully", "id": cursor.lastrowid}), 201
    finally:
        conn.close()


@maintenance_bp.route("/api/maintenance/<int:record_id>", methods=["PUT"])
def update_maintenance(record_id):
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get("vehicle_id")
    service_type = data.get("type") or data.get("service_type")
    service_date = data.get("date") or data.get("service_date")
    category = data.get("category", "General")
    description = data.get("description")
    cost = data.get("cost")
    mileage = data.get("mileage_at_service") or data.get("mileage")

    conn = get_db()
    try:
        cursor = conn.execute("""
            UPDATE maintenance
            SET vehicle_id = coalesce(?, vehicle_id),
                service_date = coalesce(?, service_date),
                category = coalesce(?, category),
                service_type = coalesce(?, service_type),
                description = ?,
                cost = ?,
                mileage = ?
            WHERE id = ?
        """, (
            vehicle_id,
            service_date,
            category,
            service_type,
            description,
            cost,
            mileage,
            record_id
        ))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Maintenance record not found"}), 404
        return jsonify({"message": "Maintenance record updated successfully"})
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
