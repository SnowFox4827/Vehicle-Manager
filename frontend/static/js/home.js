// ==================== Initialize Pages ====================
document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("vehicleTable")) loadVehicles();
    if (document.getElementById("mileageTable")) {
        loadVehiclesForDropdown();
        await loadVehiclesForDropdown("filterVehicle", true);
        applyVehicleFilterFromURL();
        loadMileage();
    }
    if (document.getElementById("maintenanceTable")) {
        await loadVehiclesForDropdown();
        await loadVehiclesForDropdown("filterVehicle", true);
        applyVehicleFilterFromURL();
        await loadMaintenanceTypes();
        loadMaintenance();
    }
});