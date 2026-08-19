#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import time

DB_PATH = os.environ.get("DB_PATH", "/app/data/vehicles.db")
BACKUP_DIR = os.environ.get("BACKUP_DIR", "/backups")
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
    if not os.path.exists(DB_PATH):
        print(f"[{datetime.datetime.now()}] Database file not found at {DB_PATH}. Skipping.")
        return None

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    snapshot_dir = os.path.join(BACKUP_DIR, f"snapshot_{timestamp}")
    os.makedirs(snapshot_dir, exist_ok=True)

    target_db = os.path.join(snapshot_dir, "vehicles.db")
    src = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
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

    latest_file = os.path.join(BACKUP_DIR, "latest.json")
    with open(latest_file, "w", encoding="utf-8") as f:
        json.dump({"latest_snapshot": os.path.basename(snapshot_dir), "manifest": manifest}, f, indent=2)

    # Retention Prune
    cutoff = datetime.datetime.now() - datetime.timedelta(days=RETENTION_DAYS)
    for entry in os.listdir(BACKUP_DIR):
        entry_path = os.path.join(BACKUP_DIR, entry)
        if os.path.isdir(entry_path) and entry.startswith("snapshot_"):
            try:
                date_str = entry.replace("snapshot_", "").split("_")[0]
                entry_date = datetime.datetime.strptime(date_str, "%Y%m%d")
                if entry_date < cutoff:
                    shutil.rmtree(entry_path)
                    print(f"Pruned old snapshot: {entry}")
            except Exception:
                pass

    print(f"[{datetime.datetime.now()}] Backup finished successfully: {snapshot_dir}")
    return {"snapshot_dir": os.path.basename(snapshot_dir), "manifest": manifest}


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        run_backup_job()
        sys.exit(0)

    print(f"Starting automated backup daemon. Interval: {INTERVAL_HOURS}h, Retention: {RETENTION_DAYS}d")
    while True:
        try:
            run_backup_job()
        except Exception as e:
            print(f"Error during scheduled backup: {e}")
        time.sleep(INTERVAL_HOURS * 3600)
