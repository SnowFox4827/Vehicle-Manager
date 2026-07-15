from flask import Blueprint, render_template, jsonify

from database import get_db

home_bp = Blueprint("home", __name__)


@home_bp.route("/")
def home_page():
    return render_template("home.html")


@home_bp.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """Return record counts for the fleet dashboard."""
    conn = get_db()
    try:
        vehicle_count = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
        mileage_count = conn.execute("SELECT COUNT(*) FROM mileage").fetchone()[0]
        maintenance_count = conn.execute("SELECT COUNT(*) FROM maintenance").fetchone()[0]

        return jsonify({
            "vehicle_count": vehicle_count,
            "mileage_count": mileage_count,
            "maintenance_count": maintenance_count
        })
    finally:
        conn.close()
