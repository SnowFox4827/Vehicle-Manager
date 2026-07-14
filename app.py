from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

DATABASE = "vehicles.db"


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year TEXT,
            vin TEXT
        )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS mileage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        mileage INTEGER,
        date TEXT,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    )
""")

    conn.commit()
    conn.close()



@app.route("/")
def home():

    conn = get_db()

    vehicle_count = conn.execute(
        "SELECT COUNT(*) FROM vehicles"
    ).fetchone()[0]


    mileage_count = conn.execute(
        "SELECT COUNT(*) FROM mileage"
    ).fetchone()[0]


    recent_mileage = conn.execute("""
        SELECT
            vehicles.make,
            vehicles.model,
            mileage.mileage,
            mileage.date

        FROM mileage

        JOIN vehicles
        ON vehicles.id = mileage.vehicle_id

        ORDER BY mileage.date DESC

        LIMIT 5

    """).fetchall()


    conn.close()


    return render_template(
        "home.html",
        vehicle_count=vehicle_count,
        mileage_count=mileage_count,
        recent_mileage=recent_mileage
    )

@app.route("/vehicles")
def vehicles_page():

    return render_template("vehicles.html")

# GET all vehicles
@app.route("/api/vehicles", methods=["GET"])
def get_vehicles():

    conn = get_db()

    vehicles = conn.execute(
        "SELECT * FROM vehicles"
    ).fetchall()

    conn.close()

    return jsonify(
        [dict(vehicle) for vehicle in vehicles]
    )



# CREATE vehicle
@app.route("/api/vehicles", methods=["POST"])
def add_vehicle():

    data = request.json

    conn = get_db()

    conn.execute("""
        INSERT INTO vehicles
        (make, model, year, vin)
        VALUES (?, ?, ?, ?)
    """,
    (
        data["make"],
        data["model"],
        data["year"],
        data["vin"]
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message":"Vehicle added"
    })



# UPDATE vehicle
@app.route("/api/vehicles/<int:id>", methods=["PUT"])
def update_vehicle(id):

    data = request.json

    conn = get_db()

    conn.execute("""
        UPDATE vehicles
        SET make=?,
            model=?,
            year=?,
            vin=?
        WHERE id=?
    """,
    (
        data["make"],
        data["model"],
        data["year"],
        data["vin"],
        id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message":"Vehicle updated"
    })



# DELETE vehicle
@app.route("/api/vehicles/<int:id>", methods=["DELETE"])
def delete_vehicle(id):

    conn = get_db()

    conn.execute(
        "DELETE FROM vehicles WHERE id=?",
        (id,)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "message":"Vehicle deleted"
    })

#For adding mileage
@app.route("/mileage")
def mileage_page():

    return render_template("mileage.html")

# Get mileage records
@app.route("/api/mileage", methods=["GET"])
def get_mileage():

    conn = get_db()

    records = conn.execute("""
        SELECT 
            mileage.id,
            vehicles.make,
            vehicles.model,
            mileage.mileage,
            mileage.date
        FROM mileage
        JOIN vehicles
        ON vehicles.id = mileage.vehicle_id
    """).fetchall()

    conn.close()

    return jsonify(
        [dict(r) for r in records]
    )



# Add mileage
@app.route("/api/mileage", methods=["POST"])
def add_mileage():

    data = request.json

    conn = get_db()

    conn.execute("""
        INSERT INTO mileage
        (vehicle_id, mileage, date)
        VALUES (?, ?, ?)
    """,
    (
        data["vehicle_id"],
        data["mileage"],
        data["date"]
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message":"Mileage added"
    })

if __name__ == "__main__":

    init_db()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )