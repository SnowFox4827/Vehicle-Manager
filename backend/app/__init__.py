from flask import Flask
from app.db import init_db
from app.routes import dashboard_bp, vehicles_bp, mileage_bp, maintenance_bp, backup_bp


def create_app():
    """Application factory for Vehicle Manager backend."""
    app = Flask(__name__)

    # Initialize DB tables
    init_db()

    # Register blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(vehicles_bp)
    app.register_blueprint(mileage_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(backup_bp)

    return app
