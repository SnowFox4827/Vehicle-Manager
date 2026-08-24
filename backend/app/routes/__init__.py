from flask import Blueprint, jsonify, request, send_file
from app.db import get_db, DB_PATH
import os
import io
import json
import sqlite3
import datetime
import tempfile
import shutil

dashboard_bp = Blueprint('dashboard', __name__)
vehicles_bp = Blueprint('vehicles', __name__)
mileage_bp = Blueprint('mileage', __name__)
maintenance_bp = Blueprint('maintenance', __name__)
backup_bp = Blueprint('backup', __name__)

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

# ==================== Health & Dashboard ====================

@dashboard_bp.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

@dashboard_bp.route('/api/dashboard/summary')
def get_dashboard_summary():
    conn = get_db()
    cursor = conn.cursor()

    total_vehicles = cursor.execute('SELECT COUNT(*) FROM vehicles').fetchone()[0]
    total_services = cursor.execute('SELECT COUNT(*) FROM maintenance').fetchone()[0]

    # Total recorded miles logged across fleet
    miles_row = cursor.execute('SELECT MAX(mileage) FROM mileage GROUP BY vehicle_id').fetchall()
    total_fleet_miles = sum(r[0] for r in miles_row if r[0] is not None)

    # Recent mileage (last 5)
    recent_mileage = cursor.execute('''
        SELECT m.id, v.make, v.model, v.year, m.mileage, m.date, m.vehicle_id
        FROM mileage m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.date DESC, m.id DESC
        LIMIT 5
    ''').fetchall()

    # Recent maintenance (last 5)
    recent_maintenance = cursor.execute('''
        SELECT m.id, v.make, v.model, v.year, m.service_type as type, m.service_date as date, m.vehicle_id
        FROM maintenance m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.service_date DESC, m.id DESC
        LIMIT 5
    ''').fetchall()

    conn.close()

    return jsonify({
        'total_vehicles': total_vehicles,
        'total_services': total_services,
        'total_fleet_miles': total_fleet_miles,
        'recent_mileage': [dict(r) for r in recent_mileage],
        'recent_maintenance': [dict(r) for r in recent_maintenance]
    })


# ==================== Vehicles ====================

@vehicles_bp.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    conn = get_db()
    rows = conn.execute('''
        SELECT 
            v.id, v.make, v.model, v.year, v.vin,
            (SELECT mileage FROM mileage WHERE vehicle_id = v.id ORDER BY date DESC, id DESC LIMIT 1) as current_mileage,
            (SELECT COUNT(*) FROM maintenance WHERE vehicle_id = v.id) as maintenance_count
        FROM vehicles v
        ORDER BY v.id ASC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@vehicles_bp.route('/api/vehicles', methods=['POST'])
def add_vehicle():
    data = request.get_json(silent=True) or {}
    make = (data.get('make') or '').strip()
    model = (data.get('model') or '').strip()
    year = (str(data.get('year') or '')).strip() or None
    vin = (data.get('vin') or '').strip() or None

    if not make or not model:
        return jsonify({'error': 'Make and model are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO vehicles (make, model, year, vin) VALUES (?, ?, ?, ?)',
            (make, model, year, vin)
        )
        conn.commit()
        vehicle_id = cursor.lastrowid
        return jsonify({'id': vehicle_id, 'make': make, 'model': model, 'year': year, 'vin': vin}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        conn.close()

@vehicles_bp.route('/api/vehicles/<int:vid>', methods=['PUT'])
def update_vehicle(vid):
    data = request.get_json(silent=True) or {}
    make = (data.get('make') or '').strip()
    model = (data.get('model') or '').strip()
    year = (str(data.get('year') or '')).strip() or None
    vin = (data.get('vin') or '').strip() or None

    if not make or not model:
        return jsonify({'error': 'Make and model are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE vehicles SET make = ?, model = ?, year = ?, vin = ? WHERE id = ?',
        (make, model, year, vin, vid)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@vehicles_bp.route('/api/vehicles/<int:vid>', methods=['DELETE'])
def delete_vehicle(vid):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM vehicles WHERE id = ?', (vid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ==================== Mileage ====================

@mileage_bp.route('/api/mileage', methods=['GET'])
def get_mileage():
    conn = get_db()
    rows = conn.execute('''
        SELECT 
            m.id, m.vehicle_id, m.mileage, m.date,
            v.make, v.model, v.year
        FROM mileage m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.date DESC, m.id DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@mileage_bp.route('/api/mileage', methods=['POST'])
def add_mileage():
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get('vehicle_id')
    mileage = data.get('mileage')
    date = data.get('date')

    if not vehicle_id or mileage is None or not date:
        return jsonify({'error': 'vehicle_id, mileage, and date are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO mileage (vehicle_id, mileage, date) VALUES (?, ?, ?)',
        (int(vehicle_id), int(mileage), date)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'vehicle_id': vehicle_id, 'mileage': mileage, 'date': date}), 201

@mileage_bp.route('/api/mileage/<int:mid>', methods=['PUT'])
def update_mileage(mid):
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get('vehicle_id')
    mileage = data.get('mileage')
    date = data.get('date')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE mileage SET vehicle_id = ?, mileage = ?, date = ? WHERE id = ?',
        (int(vehicle_id), int(mileage), date, mid)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@mileage_bp.route('/api/mileage/<int:mid>', methods=['DELETE'])
def delete_mileage(mid):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM mileage WHERE id = ?', (mid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ==================== Maintenance ====================

@maintenance_bp.route('/api/maintenance/types')
def get_types():
    return jsonify(MAINTENANCE_TYPES)

@maintenance_bp.route('/api/maintenance', methods=['GET'])
def get_maintenance():
    conn = get_db()
    rows = conn.execute('''
        SELECT 
            m.id, m.vehicle_id, m.service_date as date, m.category,
            m.service_type as type, m.description, m.mileage as mileage_at_service,
            v.make, v.model, v.year
        FROM maintenance m
        JOIN vehicles v ON v.id = m.vehicle_id
        ORDER BY m.service_date DESC, m.id DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@maintenance_bp.route('/api/maintenance', methods=['POST'])
def add_maintenance():
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get('vehicle_id')
    service_type = data.get('type') or data.get('service_type')
    date = data.get('date') or data.get('service_date')
    description = (data.get('description') or '').strip() or None
    mileage = int(data['mileage_at_service']) if data.get('mileage_at_service') not in (None, '') else (int(data['mileage']) if data.get('mileage') not in (None, '') else None)

    if not vehicle_id or not service_type or not date:
        return jsonify({'error': 'Vehicle, type, and date are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO maintenance (vehicle_id, service_date, category, service_type, description, mileage)
        VALUES (?, ?, 'General', ?, ?, ?)
    ''', (int(vehicle_id), date, service_type, description, mileage))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id}), 201

@maintenance_bp.route('/api/maintenance/<int:mid>', methods=['PUT'])
def update_maintenance(mid):
    data = request.get_json(silent=True) or {}
    vehicle_id = data.get('vehicle_id')
    service_type = data.get('type') or data.get('service_type')
    date = data.get('date') or data.get('service_date')
    description = (data.get('description') or '').strip() or None
    mileage = int(data['mileage_at_service']) if data.get('mileage_at_service') not in (None, '') else (int(data['mileage']) if data.get('mileage') not in (None, '') else None)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE maintenance 
        SET vehicle_id = ?, service_date = ?, service_type = ?, description = ?, mileage = ?
        WHERE id = ?
    ''', (int(vehicle_id), date, service_type, description, mileage, mid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@maintenance_bp.route('/api/maintenance/<int:mid>', methods=['DELETE'])
def delete_maintenance(mid):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM maintenance WHERE id = ?', (mid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ==================== Backup, Export & Restore ====================

def get_database_json():
    """Extract all vehicles, mileage, and maintenance logs as a dictionary."""
    conn = get_db()
    vehicles = [dict(r) for r in conn.execute('SELECT * FROM vehicles').fetchall()]
    mileage = [dict(r) for r in conn.execute('SELECT * FROM mileage').fetchall()]
    maintenance = [dict(r) for r in conn.execute('SELECT * FROM maintenance').fetchall()]
    conn.close()

    return {
        'version': 1,
        'exported_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'tables': {
            'vehicles': vehicles,
            'mileage': mileage,
            'maintenance': maintenance
        }
    }


def restore_from_json_dict(data):
    """Restore database state from a parsed JSON dictionary."""
    if not isinstance(data, dict):
        raise ValueError("Invalid JSON format: root must be an object.")

    # Support both nested under 'tables' or direct root keys
    tables = data.get('tables') if isinstance(data.get('tables'), dict) else data
    vehicles = tables.get('vehicles', [])
    mileage = tables.get('mileage', [])
    maintenance = tables.get('maintenance', [])

    if not isinstance(vehicles, list) or not isinstance(mileage, list) or not isinstance(maintenance, list):
        raise ValueError("Invalid format: 'vehicles', 'mileage', and 'maintenance' must be lists.")

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("BEGIN TRANSACTION;")

        # Clear existing data
        cursor.execute("DELETE FROM maintenance;")
        cursor.execute("DELETE FROM mileage;")
        cursor.execute("DELETE FROM vehicles;")

        # Restore vehicles
        for v in vehicles:
            cols = list(v.keys())
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join(cols)
            cursor.execute(f"INSERT INTO vehicles ({col_names}) VALUES ({placeholders})", list(v.values()))

        # Restore mileage
        for m in mileage:
            cols = list(m.keys())
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join(cols)
            cursor.execute(f"INSERT INTO mileage ({col_names}) VALUES ({placeholders})", list(m.values()))

        # Restore maintenance
        for mt in maintenance:
            cols = list(mt.keys())
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join(cols)
            cursor.execute(f"INSERT INTO maintenance ({col_names}) VALUES ({placeholders})", list(mt.values()))

        # Reset SQLite autoincrement sequences to match maximum restored IDs
        for table in ['vehicles', 'mileage', 'maintenance']:
            cursor.execute(f"SELECT MAX(id) FROM {table};")
            max_id = cursor.fetchone()[0] or 0
            cursor.execute("INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES (?, ?);", (table, max_id))

        cursor.execute("COMMIT;")
        cursor.execute("PRAGMA foreign_keys = ON;")
    except Exception:
        cursor.execute("ROLLBACK;")
        raise
    finally:
        conn.close()


def restore_from_db_file(src_path):
    """Safely restore the SQLite database file directly using SQLite online backup."""
    # Verify sqlite file header
    with open(src_path, 'rb') as f:
        header = f.read(16)
        if not header.startswith(b'SQLite format 3'):
            raise ValueError("Uploaded file is not a valid SQLite database.")

    src_conn = sqlite3.connect(src_path)
    integrity = src_conn.execute("PRAGMA quick_check;").fetchone()
    if not integrity or integrity[0] != "ok":
        src_conn.close()
        raise ValueError("Corrupt SQLite database file.")

    dst_conn = sqlite3.connect(DB_PATH)
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()


def take_safety_snapshot():
    """Create a safety snapshot before any destructive restore operation."""
    try:
        from app.backup import run_backup_job
        return run_backup_job()
    except Exception:
        return None


@backup_bp.route('/api/backup/export', methods=['GET'])
def export_backup():
    fmt = request.args.get('format', 'json').lower()
    if fmt == 'db':
        if not os.path.exists(DB_PATH):
            return jsonify({'error': 'Database file not found'}), 404
        return send_file(DB_PATH, as_attachment=True, download_name='vehicles_backup.db')

    export_payload = get_database_json()
    response = jsonify(export_payload)
    response.headers['Content-Disposition'] = 'attachment; filename=vehicles_backup.json'
    return response


@backup_bp.route('/api/backup/status', methods=['GET'])
def backup_status():
    from app.backup import get_backup_dir
    backup_dir = get_backup_dir()
    retention_days = int(os.environ.get('RETENTION_DAYS', 30))
    interval_hours = int(os.environ.get('BACKUP_INTERVAL_HOURS', 24))

    snapshots = []
    if os.path.isdir(backup_dir):
        for entry in sorted(os.listdir(backup_dir), reverse=True):
            entry_path = os.path.join(backup_dir, entry)
            if os.path.isdir(entry_path) and entry.startswith('snapshot_'):
                created_at = None
                manifest_path = os.path.join(entry_path, 'manifest.json')
                if os.path.exists(manifest_path):
                    try:
                        with open(manifest_path, 'r', encoding='utf-8') as mf:
                            mdata = json.load(mf)
                            created_at = mdata.get('snapshot_timestamp')
                    except Exception:
                        pass
                snapshots.append({
                    'name': entry,
                    'created_at': created_at or entry.replace('snapshot_', '')
                })

    return jsonify({
        'backup_dir': backup_dir,
        'retention_days': retention_days,
        'interval_hours': interval_hours,
        'snapshot_count': len(snapshots),
        'latest_snapshot': snapshots[0]['name'] if snapshots else None,
        'snapshots': snapshots
    })


@backup_bp.route('/api/backup/snapshot', methods=['POST'])
def trigger_snapshot():
    try:
        from app.backup import run_backup_job
        info = run_backup_job()
        return jsonify({'status': 'ok', 'snapshot': info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@backup_bp.route('/api/backup/restore/upload', methods=['POST'])
def restore_upload():
    """Upload a .json or .db backup file and restore the database."""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded."}), 400

    file = request.files['file']
    filename = file.filename or ''

    # Safety snapshot first
    safety_snap = take_safety_snapshot()

    ext = os.path.splitext(filename)[1].lower()

    try:
        if ext == '.json':
            content = file.read().decode('utf-8')
            data = json.loads(content)
            restore_from_json_dict(data)
            return jsonify({
                "success": True,
                "message": f"Successfully restored data from {filename}.",
                "safety_snapshot": safety_snap.get('snapshot_dir') if safety_snap else None
            })
        elif ext in ('.db', '.sqlite', '.sqlite3'):
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                file.save(tmp.name)
                tmp_path = tmp.name
            try:
                restore_from_db_file(tmp_path)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            return jsonify({
                "success": True,
                "message": f"Successfully restored database from {filename}.",
                "safety_snapshot": safety_snap.get('snapshot_dir') if safety_snap else None
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Unsupported file type '{ext}'. Must be .json, .db, .sqlite, or .sqlite3."
            }), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@backup_bp.route('/api/backup/restore/snapshot', methods=['POST'])
def restore_snapshot():
    """Restore the database from a stored snapshot on the server."""
    payload = request.get_json(silent=True) or {}
    snapshot_dir = payload.get('snapshot_dir') or payload.get('snapshot')
    if not snapshot_dir:
        return jsonify({"success": False, "error": "Missing 'snapshot_dir' parameter."}), 400

    snapshot_dir = os.path.basename(snapshot_dir)
    from app.backup import get_backup_dir
    backup_dir = get_backup_dir()
    target_path = os.path.join(backup_dir, snapshot_dir)

    if not os.path.isdir(target_path):
        return jsonify({"success": False, "error": f"Snapshot directory '{snapshot_dir}' not found."}), 404

    # Create safety snapshot first
    safety_snap = take_safety_snapshot()

    try:
        db_file = os.path.join(target_path, 'vehicles.db')
        json_file = os.path.join(target_path, 'data_export.json')

        if os.path.exists(db_file):
            restore_from_db_file(db_file)
        elif os.path.exists(json_file):
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            restore_from_json_dict(data)
        else:
            return jsonify({"success": False, "error": "No database or JSON backup found in snapshot."}), 404

        return jsonify({
            "success": True,
            "message": f"Successfully restored from snapshot '{snapshot_dir}'.",
            "safety_snapshot": safety_snap.get('snapshot_dir') if safety_snap else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
