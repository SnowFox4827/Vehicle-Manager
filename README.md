# Vehicle Manager

A lightweight, self-hosted web application for managing fleet vehicles, tracking mileage, and logging maintenance history.

---

## Project Structure

```text
Vehicle-Manager/
├── .env.example              # Sample environment configuration
├── docker-compose.yml        # Multi-container orchestration (backend, frontend, backup)
├── Dockerfile.backup         # Standalone backup daemon container definition
├── README.md                 # Documentation & setup guide
├── backend/                  # Backend REST API service
│   ├── Dockerfile            # Python 3.12 Flask API container
│   ├── app.py                # Flask app entrypoint & blueprint registrations
│   ├── database.py           # SQLite schema init & connection helpers
│   ├── requirements.txt      # Python dependencies (Flask, Flask-CORS, requests)
│   └── routes/               # Modular API endpoint blueprints
│       ├── __init__.py
│       ├── backup.py         # Export & manual snapshot endpoints
│       ├── health.py         # Container healthcheck endpoint (/api/health)
│       ├── home.py           # Summary dashboard endpoints
│       ├── maintenance.py    # Maintenance log CRUD endpoints
│       ├── mileage.py        # Mileage log CRUD endpoints
│       └── vehicles.py       # Vehicle management CRUD endpoints
├── frontend/                 # Frontend Web Server & Proxy
│   ├── Dockerfile            # Python 3.12 UI container
│   ├── app.py                # Template server & /api/* reverse proxy
│   ├── requirements.txt      # Python dependencies (Flask, requests)
│   ├── static/               # Client-side static assets
│   │   ├── css/
│   │   │   └── style.css     # Global responsive styling
│   │   ├── js/
│   │   │   ├── api.js        # Relative fetch helper (/api/...)
│   │   │   ├── home.js       # Dashboard view logic
│   │   │   ├── maintenance.js# Maintenance management logic
│   │   │   ├── mileage.js    # Mileage tracking logic
│   │   │   ├── modal.js      # Modal & dialog helpers
│   │   │   ├── state.js      # Client state storage
│   │   │   └── vehicles.js   # Vehicle CRUD UI logic
│   │   └── maintenance_types.json # Service categories & tasks
│   └── templates/            # Jinja2 HTML templates
│       ├── home.html         # Fleet dashboard overview
│       ├── maintenance.html  # Maintenance tracking page
│       ├── mileage.html      # Mileage tracking page
│       └── vehicles.html     # Vehicle management page
└── scripts/                  # Automation & maintenance utilities
    └── backup.py             # Dual-format backup daemon & retention pruner
```

---

## Architecture

- **Backend**: Python / Flask REST API with SQLite database & backup management endpoints.
- **Frontend**: Python / Flask server serving Jinja2 templates and providing a transparent `/api/*` reverse-proxy to the backend.
- **Backup Sidecar**: Automated daemon performing periodic dual-format SQLite + JSON backups with SHA-256 integrity checksums and configurable retention pruning.
- **Containerization**: Multi-container Docker setup orchestrated via `docker-compose` with health check dependencies.

---

## Quick Start

### Option A: Docker Compose (Recommended)

1. Create your environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Start the services:
   ```bash
   docker compose up --build -d
   ```

3. Open your browser:
   - **Web UI**: `http://localhost:5002` (or your configured `HOST_PORT`)
   - **Backend API**: `http://localhost:5003` (or your configured `BACKEND_PORT`)

---

### Option B: Local Python Development

1. **Start Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
   *(Runs on `http://127.0.0.1:5002`)*

2. **Start Frontend** (in a new terminal):
   ```bash
   cd frontend
   pip install -r requirements.txt
   python app.py
   ```
   *(Runs on `http://127.0.0.1:5000`)*

3. Open `http://127.0.0.1:5000` in your browser.

---

## Environment Variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `HOST_PORT` | `5002` | Port exposed on host for the web UI |
| `BACKEND_PORT` | `5003` | Port exposed on host for direct REST API access |
| `DATA_DIR` | `./backend/data` | Host folder for persistent SQLite database |
| `BACKUP_HOST_DIR` | `./backups` | Host folder / NAS path for backup snapshots |
| `BACKUP_INTERVAL_HOURS` | `24` | Automated backup sidecar interval in hours |
| `RETENTION_DAYS` | `30` | Number of days to retain snapshot backups before auto-pruning |

---

## Backup Strategy

1. **Automated Sidecar Daemon**:
   - Runs continuously on a scheduled cadence (default: every 24 hours).
   - Generates a timestamped snapshot folder under `BACKUP_HOST_DIR` (e.g. `snapshot_20260819_120000/`).
   - Produces a consistent online SQLite binary snapshot (`vehicles.db`) without locking active reads/writes.
   - Generates a structured JSON dump (`data_export.json`) containing all vehicles, mileage records, and maintenance logs.
   - Calculates SHA-256 checksums (`checksum.sha256`) for file validation.
   - Updates `latest.json` pointer for easy external monitoring.
   - Prunes snapshots older than `RETENTION_DAYS`.

2. **On-Demand API Endpoints**:
   - `POST /api/backup/snapshot` — Triggers an immediate dual-format snapshot.
   - `GET /api/backup/export?format=json` — Directly downloads full dataset as JSON.
   - `GET /api/backup/export?format=db` — Directly downloads a live SQLite binary copy.
   - `GET /api/backup/status` — Returns metadata and list of available backup snapshots.
