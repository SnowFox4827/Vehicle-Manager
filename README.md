# Vehicle Management Application

## Overview

A Flask and SQLite application for managing a fleet of vehicles,
tracking mileage, and recording maintenance history.

The application is separated into two Docker containers:

-   Frontend: Web interface containing HTML templates, CSS, JavaScript, and frontend data files
-   Backend: Flask REST API with SQLite database

## Features

-   Vehicle management (add, view, update, delete)
-   Mileage tracking
-   Maintenance tracking
-   Fleet dashboard showing each vehicle's most recent mileage
-   SQLite database
-   REST API backend
-   Separate frontend and backend containers
-   Docker and Docker Compose support

## Project Structure

``` text
.
├── docker-compose.yml
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── vehicles.db
│   └── routes/
│       ├── home.py
│       ├── vehicles.py
│       ├── mileage.py
│       └── maintenance.py
│
└── frontend/
    ├── Dockerfile
    │── app.py
    ├── templates/
    │   ├── home.html
    │   ├── vehicles.html
    │   ├── mileage.html
    │   └── maintenance.html
    │
    └── static/
        |── maintenance_types.json
        ├── css/
        │   └── style.css
        |
        └── js/
            ├── api.js
            ├── home.js
            ├── maintenance.js
            ├── mileage.js
            ├── modal.js
            ├── state.js
            └── vehicles.js
```

## Requirements

-   Docker and Docker Compose (recommended)

Or:

-   Python 3.11+
-   pip

## Run with Docker Compose

Build and start containers:

``` bash
docker compose up -d
```

Frontend:

```
http://localhost:5002
```

Backend API:

```
http://localhost:5003
```

Stop:

``` bash
docker compose down
```

## Docker Port Mapping

Frontend:

``` yaml
5002:5000
```

-   Port `5002` = host computer port
-   Port `5000` = Flask port inside frontend container

Backend:

``` yaml
5003:5002
```

-   Port `5003` = host computer port
-   Port `5002` = Flask port inside backend container

## Run Backend Without Docker

Install dependencies:

``` bash
pip install -r requirements.txt
```

Start:

``` bash
python app.py
```

Backend runs on:

```
http://localhost:5002
```

## Database

The application uses:

```
vehicles.db
```

(SQLite database stored in the backend container.)

Tables include:

-   vehicles
-   mileage
-   maintenance

## Frontend Files

The frontend contains:

### Templates

HTML pages:

-   home.html
-   vehicles.html
-   mileage.html
-   maintenance.html

### Static Files

JavaScript:

```
static/js/
```

CSS:

```
static/css/
```

Maintenance service definitions:

```
maintenance_types.json
```

## API

Backend API endpoints:

-   GET /api/vehicles
-   POST /api/vehicles
-   PUT /api/vehicles/<id>
-   DELETE /api/vehicles/<id>

-   GET /api/mileage
-   GET /api/mileage/recent
-   POST /api/mileage
-   PUT /api/mileage/<id>
-   DELETE /api/mileage/<id>

-   GET /api/maintenance
-   POST /api/maintenance
-   PUT /api/maintenance/<id>
-   DELETE /api/maintenance/<id>

Example:

```
http://localhost:5003/api/vehicles
```

## Development

Source code is mounted into the containers:

Backend:

```
./backend:/app
```

Frontend:

```
./frontend:/app
```

Changes to source files are available without rebuilding the images.

## License

For educational and personal use.