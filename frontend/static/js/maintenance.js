// ==================== Maintenance Management ====================

let allMaintenanceRecords = [];
let maintenanceTypesList = [];

async function loadMaintenanceTypes() {
    try {
        const res = await apiRequest("/api/maintenance/types");
        maintenanceTypesList = await res.json();
        const select = document.getElementById("type");
        if (!select) return;

        select.innerHTML = '<option value="">-- Select Type --</option>';
        maintenanceTypesList.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
    }
}

async function saveMaintenance() {
    const vehicleId = document.getElementById("vehicle").value;
    const type = document.getElementById("type").value;
    const description = document.getElementById("description").value;
    const cost = document.getElementById("cost").value;
    const date = document.getElementById("date").value;
    const mileageAtService = document.getElementById("mileage_at_service").value;

    if (!vehicleId || !type || !date) {
        alert("Vehicle, Maintenance Type, and Date are required.");
        return;
    }

    try {
        await apiRequest("/api/maintenance", "POST", {
            vehicle_id: parseInt(vehicleId),
            type: type,
            description: description || null,
            cost: cost ? parseFloat(cost) : null,
            date: date,
            mileage_at_service: mileageAtService ? parseInt(mileageAtService) : null
        });
        clearMaintenanceForm();
        loadMaintenance();
    } catch (e) {
        alert("Failed to add maintenance record.");
    }
}

function clearMaintenanceForm() {
    document.getElementById("description").value = "";
    document.getElementById("cost").value = "";
    document.getElementById("date").value = "";
    document.getElementById("mileage_at_service").value = "";
    document.getElementById("type").selectedIndex = 0;
}

async function loadMaintenance() {
    try {
        const tbody = document.querySelector("#maintenanceTable tbody");
        if (tbody && allMaintenanceRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; opacity:0.6;">Loading maintenance records...</td></tr>';
        }
        const res = await apiRequest("/api/maintenance");
        allMaintenanceRecords = await res.json();
        applyMaintenanceFilter();
    } catch (e) {
        alert("Failed to load maintenance records.");
    }
}

function applyMaintenanceFilter() {
    const filterSelect = document.getElementById("filterVehicle");
    const vehicleId = filterSelect ? filterSelect.value : "";
    const tbody = document.querySelector("#maintenanceTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtered = vehicleId
        ? allMaintenanceRecords.filter(m => String(m.vehicle_id) === String(vehicleId))
        : allMaintenanceRecords;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; opacity:0.6;">No maintenance records found.</td></tr>';
        return;
    }

    filtered.forEach(m => {
        const row = document.createElement("tr");
        const vehicleLabel = `${m.year || ''} ${m.make} ${m.model}`.trim();
        const costLabel = m.cost !== null ? `$${parseFloat(m.cost).toFixed(2)}` : "-";
        const milesLabel = m.mileage_at_service ? `${Number(m.mileage_at_service).toLocaleString()} mi` : "-";

        row.innerHTML = `
            <td>${m.id}</td>
            <td>${vehicleLabel}</td>
            <td>${m.type}</td>
            <td>${m.description || '-'}</td>
            <td>${costLabel}</td>
            <td>${m.date}</td>
            <td>${milesLabel}</td>
            <td>
                <button class="edit" onclick="editMaintenance(${m.id}, ${m.vehicle_id}, '${escAttr(m.type)}', '${escAttr(m.description || '')}', '${m.cost !== null ? m.cost : ''}', '${m.date}', '${m.mileage_at_service || ''}')">Edit</button>
                <button class="delete" onclick="deleteMaintenance(${m.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function applyVehicleFilterFromURL() {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get("vehicle");
    if (vehicleId) {
        const filterSelect = document.getElementById("filterVehicle");
        if (filterSelect) {
            filterSelect.value = vehicleId;
            applyMaintenanceFilter();
        }
    }
}

function editMaintenance(id, currentVehicleId, currentType, currentDesc, currentCost, currentDate, currentMileage) {
    getVehiclesList().then(vehicles => {
        const vehicleOptions = vehicles.map(v =>
            `<option value="${v.id}" ${v.id === currentVehicleId ? "selected" : ""}>${v.year || ''} ${v.make} ${v.model}</option>`
        ).join("");

        const typeOptions = maintenanceTypesList.map(t =>
            `<option value="${t}" ${t === currentType ? "selected" : ""}>${t}</option>`
        ).join("");

        showEditModal(
            "Edit Maintenance Record",
            [
                { label: "Vehicle", id: "edit_m_vehicle", type: "select", optionsHtml: vehicleOptions },
                { label: "Type", id: "edit_m_type", type: "select", optionsHtml: typeOptions },
                { label: "Description", id: "edit_m_desc", value: currentDesc },
                { label: "Cost ($)", id: "edit_m_cost", type: "number", value: currentCost, step: "0.01" },
                { label: "Date", id: "edit_m_date", type: "date", value: currentDate, required: true },
                { label: "Mileage at Service", id: "edit_m_mileage", type: "number", value: currentMileage }
            ],
            async () => {
                const vehicle_id = parseInt(document.getElementById("edit_m_vehicle").value);
                const type = document.getElementById("edit_m_type").value;
                const description = document.getElementById("edit_m_desc").value;
                const cost = document.getElementById("edit_m_cost").value;
                const date = document.getElementById("edit_m_date").value;
                const mileage_at_service = document.getElementById("edit_m_mileage").value;

                if (!vehicle_id || !type || !date) {
                    alert("Vehicle, Type, and Date are required.");
                    return false;
                }

                try {
                    await apiRequest(`/api/maintenance/${id}`, "PUT", {
                        vehicle_id,
                        type,
                        description: description || null,
                        cost: cost ? parseFloat(cost) : null,
                        date,
                        mileage_at_service: mileage_at_service ? parseInt(mileage_at_service) : null
                    });
                    loadMaintenance();
                    return true;
                } catch (e) {
                    alert("Failed to update maintenance record.");
                    return false;
                }
            }
        );
    });
}

async function deleteMaintenance(id) {
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;

    try {
        await apiRequest(`/api/maintenance/${id}`, "DELETE");
        loadMaintenance();
    } catch (e) {
        alert("Failed to delete maintenance record.");
    }
}
