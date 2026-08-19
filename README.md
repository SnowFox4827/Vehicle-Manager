# Vehicle Fleet Manager

A self-contained fleet management system for vehicles, mileage logging, and maintenance tracking with automated backups and light/dark theme support.

Built with an architecture identical to the **Budget Manager** app.

---

## Project Structure

```
Vehicle-Manager/
├── .env.example              # Example environment variables
├── .env                      # Live host environment configuration
├── docker-compose.yml        # Docker composition (backend, frontend, backup daemon)
├── Dockerfile.backup         # Standalone backup daemon container
├── README.md                 # Documentation
├── backend/
│   ├── Dockerfile            # Backend container definition
│   ├── requirements.txt      # Python dependencies (Flask)
│   ├── app.py                # Backend entry point
│   ├── data/                 # Persistent SQLite database storage (vehicles.db)
│   └── app/
│       ├── __init__.py       # Flask app factory
│       ├── db.py             # SQLite connection & schema initialization
│       └── routes/
│           └── __init__.py   # REST API endpoints (Vehicles, Mileage, Maintenance, Backups)
├── frontend/
│   ├── Dockerfile            # Frontend container definition
│   ├── requirements.txt      # Python dependencies (Flask, Requests)
│   ├── app.py                # Reverse-proxy server & SPA host
│   └── app/
│       ├── index.html        # Single-page interface (SPA)
│       └── static/
│           ├── css/
│           │   └── styles.css # Clean light/dark UI design
│           └── js/
│               └── main.js   # Fast client-side state & interactive filtering
├── backups/                  # Automated hourly/daily snapshot storage
└── scripts/
    └── backup.py             # SQLite backup runner, JSON exporter, & checksum generator
```

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

3. **Access the App:**
   - Web UI: `http://localhost:8080` (or the port defined by `HOST_PORT` in `.env`)
   - Direct API (optional): `http://localhost:5000`

---

## Running Locally Without Docker

1. **Start Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   pip install -r requirements.txt
   BACKEND_URL=http://localhost:5000 PORT=8080 python app.py
   ```

3. Open `http://localhost:8080` in your browser.
