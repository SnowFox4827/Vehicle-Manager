from flask import Flask

from database import init_db
from routes.home import home_bp
from routes.vehicles import vehicles_bp
from routes.mileage import mileage_bp
from routes.maintenance import maintenance_bp


def create_app():
    app = Flask(__name__)

    app.register_blueprint(home_bp)
    app.register_blueprint(vehicles_bp)
    app.register_blueprint(mileage_bp)
    app.register_blueprint(maintenance_bp)

    return app


app = create_app()

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)