// ==================== Initialize Pages ====================
document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("vehicleTable")) loadVehicles();
    if (document.getElementById("mileageTable")) {
        loadVehiclesForDropdown();
        loadVehiclesForDropdown("filterVehicle", true);
        loadMileage();
    }
    if (document.getElementById("maintenanceTable")) {
        await loadVehiclesForDropdown();
        await loadVehiclesForDropdown("filterVehicle", true);
        await loadMaintenanceTypes();
        loadMaintenance();
    }
});