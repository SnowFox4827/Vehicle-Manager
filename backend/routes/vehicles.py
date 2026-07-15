import sqlite3

from flask import Blueprint, render_template, request, jsonify

from database import get_db

vehicles_bp = Blueprint("vehicles", __name__)


@vehicles_bp.route("/vehicles")
def vehicles_page():
    return render_template("vehicles.html")


@vehicles_bp.route("/api/vehicles", methods=["GET"])
def get_vehicles():
    conn = get_db()
    try:
        vehicles = conn.execute("SELECT * FROM vehicles ORDER BY make, model").fetchall()
        return jsonify([dict(v) for v in vehicles])
    finally:
        conn.close()


@vehicles_bp.route("/api/vehicles", methods=["POST"])
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


@vehicles_bp.route("/api/vehicles/<int:vehicle_id>", methods=["PUT"])
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


@vehicles_bp.route("/api/vehicles/<int:vehicle_id>", methods=["DELETE"])
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