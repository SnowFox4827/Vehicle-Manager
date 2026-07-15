// ==================== Initialize Pages ====================
document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("vehicleTable")) loadVehicles();
    if (document.getElementById("mileageTable")) {
        loadVehiclesForDropdown();
        loadMileage();
    }
    if (document.getElementById("maintenanceTable")) {
        await loadVehiclesForDropdown();
        await loadMaintenanceTypes();
        loadMaintenance();
    }
});