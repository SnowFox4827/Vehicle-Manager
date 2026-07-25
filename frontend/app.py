from flask import Flask, render_template
import requests

app = Flask(__name__)

BACKEND_URL = "http://backend:5002"


@app.route("/")
def home():

    response = requests.get(
        f"{BACKEND_URL}/api/mileage/recent"
    )

    recent_mileage = response.json()

    return render_template(
        "home.html",
        recent_mileage=recent_mileage
    )


@app.route("/vehicles")
def vehicles():
    return render_template("vehicles.html")


@app.route("/mileage")
def mileage():
    return render_template("mileage.html")


@app.route("/maintenance")
def maintenance():
    return render_template("maintenance.html")


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )