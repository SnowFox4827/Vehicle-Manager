import os
from flask import Flask
from flask_cors import CORS

from database import init_db
from routes.home import home_bp
from routes.vehicles import vehicles_bp
from routes.mileage import mileage_bp
from routes.maintenance import maintenance_bp
from routes.backup import backup_bp
from routes.health import health_bp


def create_app():
    # Ensure database schema is initialized on startup
    init_db()

    app = Flask(__name__)

    # Allow CORS
    CORS(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(vehicles_bp)
    app.register_blueprint(mileage_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(backup_bp)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )
