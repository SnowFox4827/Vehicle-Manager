import os
from flask import Flask, render_template, request, Response, jsonify
import requests

app = Flask(__name__)

# Backend container hostname / fallback
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")


@app.route("/")
def home():
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/mileage/recent",
            timeout=5
        )
        recent_mileage = response.json()
    except Exception:
        recent_mileage = []

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


@app.route("/api/<path:path>", methods=["GET", "POST", "PUT", "DELETE"])
def proxy(path):
    """Reverse-proxy API calls to the backend container."""
    url = f"{BACKEND_URL}/api/{path}"
    params = request.args.to_dict()
    data = request.get_data() if request.method in ("POST", "PUT", "DELETE") else None
    
    headers = {}
    if request.content_type:
        headers["Content-Type"] = request.content_type

    try:
        resp = requests.request(
            request.method,
            url,
            params=params,
            data=data,
            headers=headers,
            timeout=30
        )
        excluded_headers = [
            "content-encoding",
            "content-length",
            "transfer-encoding",
            "connection"
        ]
        response_headers = [
            (name, value) for (name, value) in resp.raw.headers.items()
            if name.lower() not in excluded_headers
        ]
        return Response(resp.content, resp.status_code, response_headers)
    except Exception as e:
        return jsonify({"error": f"Backend connection failed: {str(e)}"}), 502


@app.route("/api/health")
def health():
    return jsonify({"status": "ok-frontend"})


@app.route("/favicon.ico")
def favicon():
    return ("", 204)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 80)),
        debug=True
    )
