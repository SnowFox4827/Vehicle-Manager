import datetime
import hashlib
import json
import os
import shutil
import sqlite3
try:
    from app.db import DB_PATH as DEFAULT_DB_PATH
except ImportError:
    try:
        from .db import DB_PATH as DEFAULT_DB_PATH
    except ImportError:
        from db import DB_PATH as DEFAULT_DB_PATH

def get_backup_dir():
    env_dir = os.environ.get("BACKUP_DIR")
    if env_dir:
        if os.name == "nt" and env_dir == "/backups":
            pass  # Avoid resolving /backups to C:\backups on Windows
        else:
            return env_dir
    # Check if running in Linux container with /backups mounted
    if os.name != "nt" and os.path.exists("/backups") and os.path.isdir("/backups"):
        return "/backups"
    # Project root / backups
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base, "backups")

RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", 30))
INTERVAL_HOURS = int(os.environ.get("BACKUP_INTERVAL_HOURS", 24))


def sha256_file(filepath):
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def run_backup_job():
    """Execute a complete, atomic backup cycle."""
    target_db_path = os.environ.get("DB_PATH", DEFAULT_DB_PATH)
    if not os.path.exists(target_db_path):
        raise FileNotFoundError(f"Database file not found at {target_db_path}")

    backup_dir = get_backup_dir()
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    snapshot_dir = os.path.join(backup_dir, f"snapshot_{timestamp}")
    # Guard against same-second collisions (e.g. safety snapshot right after a manual one)
    suffix = 1
    while os.path.exists(snapshot_dir):
        snapshot_dir = os.path.join(backup_dir, f"snapshot_{timestamp}_{suffix}")
        suffix += 1
    os.makedirs(snapshot_dir, exist_ok=True)

    target_db = os.path.join(snapshot_dir, "vehicles.db")
    src = sqlite3.connect(f"file:{target_db_path}?mode=ro", uri=True)
    dst = sqlite3.connect(target_db)
    with dst:
        src.backup(dst, pages=100)
    dst.close()
    src.close()

    db_hash = sha256_file(target_db)

    conn = sqlite3.connect(target_db)
    conn.row_factory = sqlite3.Row
    vehicles = [dict(r) for r in conn.execute("SELECT * FROM vehicles").fetchall()]
    mileage = [dict(r) for r in conn.execute("SELECT * FROM mileage").fetchall()]
    maintenance = [dict(r) for r in conn.execute("SELECT * FROM maintenance").fetchall()]
    conn.close()

    json_export = {
        "version": 1,
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "tables": {
            "vehicles": vehicles,
            "mileage": mileage,
            "maintenance": maintenance,
        },
    }

    target_json = os.path.join(snapshot_dir, "data_export.json")
    with open(target_json, "w", encoding="utf-8") as f:
        json.dump(json_export, f, indent=2)

    json_hash = sha256_file(target_json)

    manifest = {
        "snapshot_timestamp": timestamp,
        "database_sha256": db_hash,
        "export_json_sha256": json_hash,
        "record_counts": {
            "vehicles": len(vehicles),
            "mileage": len(mileage),
            "maintenance": len(maintenance),
        },
    }

    manifest_file = os.path.join(snapshot_dir, "manifest.json")
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    latest_file = os.path.join(backup_dir, "latest.json")
    with open(latest_file, "w", encoding="utf-8") as f:
        json.dump({"latest_snapshot": os.path.basename(snapshot_dir), "manifest": manifest}, f, indent=2)

    # Retention Prune
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=RETENTION_DAYS)
    for entry in os.listdir(backup_dir):
        entry_path = os.path.join(backup_dir, entry)
        if os.path.isdir(entry_path) and entry.startswith("snapshot_"):
            try:
                date_str = entry.replace("snapshot_", "").split("_")[0]
                entry_date = datetime.datetime.strptime(date_str, "%Y%m%d").replace(tzinfo=datetime.timezone.utc)
                if entry_date < cutoff:
                    shutil.rmtree(entry_path)
            except Exception:
                pass

    return {"snapshot_dir": os.path.basename(snapshot_dir), "manifest": manifest}
