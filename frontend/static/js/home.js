// ==================== Initialize Pages ====================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Vehicles page
    if (document.getElementById("vehicleTable")) {
        if (window.INITIAL_VEHICLES) {
            cachedVehicles = window.INITIAL_VEHICLES;
        } else {
            loadVehicles();
        }
    }

    // 2. Mileage page
    if (document.getElementById("mileageTable")) {
        if (window.INITIAL_VEHICLES) {
            cachedVehicles = window.INITIAL_VEHICLES;
        }
        if (window.INITIAL_MILEAGE) {
            allMileageRecords = window.INITIAL_MILEAGE;
            // Always sync dropdown selection with URL and filter table on load
            applyVehicleFilterFromURL();
        } else {
            initMileagePage();
        }
    }

    // 3. Maintenance page
    if (document.getElementById("maintenanceTable")) {
        if (window.INITIAL_VEHICLES) {
            cachedVehicles = window.INITIAL_VEHICLES;
        }
        if (window.INITIAL_TYPES) {
            maintenanceTypesList = window.INITIAL_TYPES;
        }
        if (window.INITIAL_MAINTENANCE) {
            allMaintenanceRecords = window.INITIAL_MAINTENANCE;
            // Always sync dropdown selection with URL and filter table on load
            applyVehicleFilterFromURL();
        } else {
            initMaintenancePage();
        }
    }
});

async function initMileagePage() {
    const vehiclesPromise = getVehiclesList().then(vehicles => {
        populateDropdown("vehicle", vehicles, "-- Select Vehicle --");
        populateDropdown("filterVehicle", vehicles, "-- All Vehicles --");
        applyVehicleFilterFromURL();
    });
    const mileagePromise = loadMileage();
    await Promise.all([vehiclesPromise, mileagePromise]);
}

async function initMaintenancePage() {
    const vehiclesPromise = getVehiclesList().then(vehicles => {
        populateDropdown("vehicle", vehicles, "-- Select Vehicle --");
        populateDropdown("filterVehicle", vehicles, "-- All Vehicles --");
        applyVehicleFilterFromURL();
    });
    const typesPromise = loadMaintenanceTypes();
    const maintenancePromise = loadMaintenance();
    await Promise.all([vehiclesPromise, typesPromise, maintenancePromise]);
}
