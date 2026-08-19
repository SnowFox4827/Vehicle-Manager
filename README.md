# Vehicle Fleet Manager

A self-contained, responsive fleet management web application for tracking vehicles, mileage logs, and service history with automated dual-format backups (SQLite binary + JSON) and light/dark theme support.

Built with an architecture identical to the **Budget Manager** app.

---

## Features

- **Fleet Overview:** Visual vehicle cards and table view with live odometer readings and service record counts.
- **Mileage Logging:** Track odometer readings per vehicle with date filters and presets.
- **Maintenance Tracking:** Record services (Oil Change, Tire Rotation, Brake Service, etc.) with mileage logs and searchable descriptions.
- **Instant In-Memory Slicers:** Filter by vehicle, service type, search keyword, or date ranges (`Today`, `This Month`, `Last Month`, `This Year`) without page reloads.
- **Automated Backup Daemon:** Hourly/daily scheduled SQLite online backups and structured JSON exports with SHA-256 integrity checksums and snapshot pruning.
- **Web Backup & Export:** Download database copies directly from the browser or trigger instant snapshots on the host/NAS.
- **Fully Responsive:** Optimized for desktop monitors, tablets, and mobile phones with thumb-friendly controls.
- **Theme Support:** Clean light and dark modes with persistent local preferences.

---

## Project Structure

```
Vehicle-Manager/
├── .env.example              # Example environment variables template
├── .env                      # Active host environment configuration
├── docker-compose.yml        # Multi-container orchestration (backend, frontend, backup)
├── Dockerfile.backup         # Standalone backup daemon container
├── README.md                 # Complete documentation
├── backend/
│   ├── Dockerfile            # Backend container definition (Python 3.11-slim)
│   ├── requirements.txt      # Python dependencies (Flask)
│   ├── app.py                # Backend entry point
│   ├── data/                 # Persistent SQLite database directory (vehicles.db)
│   └── app/
│       ├── __init__.py       # Flask app factory
│       ├── db.py             # SQLite connection & schema initialization
│       └── routes/
│           └── __init__.py   # REST API endpoints (Vehicles, Mileage, Maintenance, Backups)
├── frontend/
│   ├── Dockerfile            # Frontend container definition (Python 3.11-slim)
│   ├── requirements.txt      # Python dependencies (Flask, Requests)
│   ├── app.py                # Reverse-proxy server & SPA host
│   └── app/
│       ├── index.html        # Single-page application interface
│       └── static/
│           ├── css/
│           │   └── styles.css # Responsive light/dark design system
│           └── js/
│               └── main.js   # Fast client-side state & interactive filtering
├── backups/                  # Host directory for automated snapshots
└── scripts/
    └── backup.py             # Backup runner, JSON exporter, and retention pruner
```

---

## Environment Variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `HOST_PORT` | `8080` | Host port to access the Web UI in your browser |
| `BACKEND_PORT` | `5000` | Host port for direct REST API access (optional) |
| `DATA_DIR` | `./backend/data` | Host directory where `vehicles.db` is stored persistently |
| `BACKUP_HOST_DIR` | `./backups` | Host directory where backup snapshots are stored |
| `BACKUP_INTERVAL_HOURS` | `24` | Backup daemon schedule interval (in hours) |
| `RETENTION_DAYS` | `30` | Snapshot retention threshold before auto-pruning (in days) |

---

## Quick Start (Docker)

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

2. **Start Services:**
   ```bash
   docker compose up -d --build
   ```

3. **Access the Application:**
   - **Web UI:** `http://localhost:8080` (or the port defined by `HOST_PORT` in `.env`)
   - **REST API:** `http://localhost:5000` (optional)

4. **Stop Services:**
   ```bash
   docker compose down
   ```

---

## Running Locally Without Docker

### Prerequisites
- Python 3.10+
- SQLite3

### 1. Start Backend API
```bash
cd backend
pip install -r requirements.txt
python app.py
```
*(Runs on `http://127.0.0.1:5000`)*

### 2. Start Frontend Web App
In a separate terminal:
```bash
cd frontend
pip install -r requirements.txt
BACKEND_URL=http://127.0.0.1:5000 PORT=8080 python app.py
```

### 3. Open Web UI
Navigate to `http://localhost:8080` in your browser.

---

## Backup & Restore Architecture

- **Automated Snapshots:** The `backup-sidecar` container periodically creates snapshot directories (`snapshot_YYYYMMDD_HHMMSSZ/`) containing:
  - `vehicles.db`: Consistent SQLite online binary backup.
  - `data_export.json`: Human-readable JSON export of all fleet tables.
  - `manifest.json`: Snapshot metadata, record counts, and SHA-256 verification hashes.
- **Web UI Downloads:** Click the **Backup** button in the header to download live JSON exports or `.db` files directly in your browser.
- **Retention:** Automatically prunes snapshots older than `RETENTION_DAYS` (default: 30 days).
