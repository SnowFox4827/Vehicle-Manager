from flask import Blueprint, jsonify, request, send_file
from app.db import get_db, DB_PATH
import os

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


# ==================== Backup & Export ====================

@backup_bp.route('/api/backup/export', methods=['GET'])
def export_backup():
    fmt = request.args.get('format', 'json').lower()
    if fmt == 'db':
        if not os.path.exists(DB_PATH):
            return jsonify({'error': 'Database file not found'}), 404
        return send_file(DB_PATH, as_attachment=True, download_name='vehicles_backup.db')

    conn = get_db()
    vehicles = [dict(r) for r in conn.execute('SELECT * FROM vehicles').fetchall()]
    mileage = [dict(r) for r in conn.execute('SELECT * FROM mileage').fetchall()]
    maintenance = [dict(r) for r in conn.execute('SELECT * FROM maintenance').fetchall()]
    conn.close()

    export_payload = {
        'version': 1,
        'exported_at': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
        'tables': {
            'vehicles': vehicles,
            'mileage': mileage,
            'maintenance': maintenance
        }
    }
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
                snapshots.append(entry)

    return jsonify({
        'backup_dir': backup_dir,
        'retention_days': retention_days,
        'interval_hours': interval_hours,
        'snapshot_count': len(snapshots),
        'latest_snapshot': snapshots[0] if snapshots else None
    })

@backup_bp.route('/api/backup/snapshot', methods=['POST'])
def trigger_snapshot():
    try:
        from app.backup import run_backup_job
        info = run_backup_job()
        return jsonify({'status': 'ok', 'snapshot': info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
