# Vehicle Management Application

## Overview

A Flask and SQLite application for managing a fleet of vehicles,
tracking mileage, and recording maintenance history.

## Features

-   Vehicle management (add, view, delete)
-   Mileage tracking
-   Maintenance tracking
-   Fleet dashboard with record counts
-   SQLite database
-   Docker and Docker Compose support

## Project Structure

``` text
.
├── app.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── vehicles.db
├── templates/
├── static/
└── README.md
```

## Requirements

-   Docker and Docker Compose (recommended)

Or: - Python 3.11+ - pip

## Run with Docker Compose

``` bash
docker compose up -d
```

Open: http://localhost:5001

Stop:

``` bash
docker compose down
```

## Run without Docker

Install dependencies:

``` bash
pip install -r requirements.txt
```

Start:

``` bash
python app.py
```

Open: http://localhost:5001

## Database

The application uses `vehicles.db` (SQLite). Tables include: -
vehicles - mileage - maintenance

## API

-   GET /api/vehicles
-   POST /api/vehicles
-   DELETE /api/vehicles/`<id>`{=html}
-   GET /api/mileage
-   POST /api/mileage
-   GET /api/maintenance
-   POST /api/maintenance

## License

For educational and personal use.
