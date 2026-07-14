// ==================== Global Variables & Utilities ====================
let currentEditId = null;
let currentEditType = null; // 'vehicle', 'mileage', or 'maintenance'

// Common API helper
async function apiRequest(url, method = "GET", data = null) {
    const options = {
        method: method,
        headers: { "Content-Type": "application/json" }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }
    return response;
}

// ==================== Modal Popup ====================
function showEditModal(title, fields, onSave) {
    let modal = document.getElementById("editModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "editModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <h2 id="modalTitle"></h2>
                <div id="modalFields"></div>
                <div class="modal-buttons">
                    <button onclick="saveCurrentEdit()">Save Changes</button>
                    <button onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById("modalTitle").textContent = title;
    const container = document.getElementById("modalFields");
    container.innerHTML = "";

    fields.forEach(f => {
        const div = document.createElement("div");
        div.className = "modal-field";
        div.innerHTML = `
            <label>${f.label}</label>
            <input 
                type="${f.type || 'text'}" 
                id="modal_${f.id}" 
                value="${f.value || ''}">
        `;
        container.appendChild(div);
    });

    window.saveCurrentEdit = () => {
        const data = {};
        fields.forEach(f => {
            const input = document.getElementById(`modal_${f.id}`);
            if (input) data[f.id] = input.value;
        });
        onSave(data);
        closeModal();
    };

    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("editModal");
    if (modal) modal.style.display = "none";
}

// ==================== Vehicle Management ====================

async function loadVehicles() {
    try {
        const res = await apiRequest("/api/vehicles");
        const vehicles = await res.json();
        const tbody = document.querySelector("#vehicleTable tbody");
        if (!tbody) return;

        tbody.innerHTML = "";
        vehicles.forEach(v => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${v.id}</td>
                <td>${v.make}</td>
                <td>${v.model}</td>
                <td>${v.year || '-'}</td>
                <td>${v.vin || '-'}</td>
                <td>
                    <button class="edit" onclick="editVehicle(${v.id}, '${v.make}', '${v.model}', '${v.year || ''}', '${v.vin || ''}')">Edit</button>
                    <button class="delete" onclick="deleteVehicle(${v.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        alert("Failed to load vehicles.");
    }
}

async function saveVehicle() {
    const make = document.getElementById("make").value.trim();
    const model = document.getElementById("model").value.trim();
    const year = document.getElementById("year").value.trim();
    const vin = document.getElementById("vin").value.trim();

    if (!make || !model) {
        alert("Make and Model are required.");
        return;
    }

    const data = { make, model, year: year || null, vin: vin || null };

    try {
        if (currentEditId && currentEditType === 'vehicle') {
            await apiRequest(`/api/vehicles/${currentEditId}`, "PUT", data);
        } else {
            await apiRequest("/api/vehicles", "POST", data);
        }
        clearVehicleForm();
        loadVehicles();
    } catch (e) {
        alert(e.message || "Failed to save vehicle.");
    }
}

function editVehicle(id, make, model, year, vin) {
    currentEditType = 'vehicle';
    currentEditId = id;

    showEditModal("Edit Vehicle", [
        { id: "make", label: "Make", value: make },
        { id: "model", label: "Model", value: model },
        { id: "year", label: "Year", type: "number", value: year },
        { id: "vin", label: "VIN", value: vin }
    ], async (data) => {
        try {
            await apiRequest(`/api/vehicles/${currentEditId}`, "PUT", data);
            loadVehicles();
        } catch (e) {
            alert("Failed to update vehicle.");
        }
    });
}

async function deleteVehicle(id) {
    if (!confirm("Delete this vehicle and ALL related mileage & maintenance records?")) return;
    try {
        await apiRequest(`/api/vehicles/${id}`, "DELETE");
        loadVehicles();
    } catch (e) {
        alert("Failed to delete vehicle.");
    }
}

function clearVehicleForm() {
    currentEditId = null;
    currentEditType = null;
    document.getElementById("make").value = "";
    document.getElementById("model").value = "";
    document.getElementById("year").value = "";
    document.getElementById("vin").value = "";
}

// ==================== Mileage Management ====================

async function loadVehiclesForDropdown() {
    try {
        const res = await apiRequest("/api/vehicles");
        const vehicles = await res.json();
        const select = document.getElementById("vehicle");
        if (!select) return;

        select.innerHTML = '<option value="">-- Select Vehicle --</option>';
        vehicles.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = `${v.year || ''} ${v.make} ${v.model}`.trim();
            select.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
    }
}

async function saveMileage() {
    const vehicleId = document.getElementById("vehicle").value;
    const mileage = document.getElementById("mileage").value;
    const date = document.getElementById("date").value;

    if (!vehicleId || !mileage || !date) {
        alert("All fields are required.");
        return;
    }

    try {
        await apiRequest("/api/mileage", "POST", {
            vehicle_id: parseInt(vehicleId),
            mileage: parseInt(mileage),
            date: date
        });
        clearMileageForm();
        loadMileage();
    } catch (e) {
        alert("Failed to add mileage.");
    }
}

function clearMileageForm() {
    document.getElementById("mileage").value = "";
    document.getElementById("date").value = "";
}

async function loadMileage() {
    try {
        const res = await apiRequest("/api/mileage");
        const records = await res.json();
        const tbody = document.querySelector("#mileageTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        records.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.make} ${r.model}</td>
                <td>${Number(r.mileage).toLocaleString()} miles</td>
                <td>${r.date}</td>
                <td>
                    <button class="edit" onclick="editMileage(${r.id}, ${r.mileage}, '${r.date}')">Edit</button>
                    <button class="delete" onclick="deleteMileage(${r.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        alert("Failed to load mileage records.");
    }
}

function editMileage(id, mileage, date) {
    currentEditType = 'mileage';
    currentEditId = id;

    showEditModal("Edit Mileage", [
        { id: "mileage", label: "Mileage", type: "number", value: mileage },
        { id: "date", label: "Date", type: "date", value: date }
    ], async (data) => {
        try {
            await apiRequest(`/api/mileage/${currentEditId}`, "PUT", {
                mileage: parseInt(data.mileage),
                date: data.date
            });
            loadMileage();
        } catch (e) {
            alert("Failed to update mileage.");
        }
    });
}

async function deleteMileage(id) {
    if (!confirm("Delete this mileage record?")) return;
    try {
        await apiRequest(`/api/mileage/${id}`, "DELETE");
        loadMileage();
    } catch (e) {
        alert("Failed to delete record.");
    }
}

// ==================== Maintenance Management ====================

async function saveMaintenance() {
    const vehicleId = document.getElementById("vehicle").value;
    const serviceDate = document.getElementById("service_date").value;
    const serviceType = document.getElementById("service_type").value.trim();
    const description = document.getElementById("description").value.trim();
    const mileage = document.getElementById("maintenance_mileage").value;

    if (!vehicleId || !serviceDate || !serviceType) {
        alert("Please fill required fields.");
        return;
    }

    try {
        await apiRequest("/api/maintenance", "POST", {
            vehicle_id: parseInt(vehicleId),
            service_date: serviceDate,
            service_type: serviceType,
            description: description || null,
            mileage: mileage ? parseInt(mileage) : null
        });
        clearMaintenanceForm();
        loadMaintenance();
    } catch (e) {
        alert("Failed to add maintenance record.");
    }
}

function clearMaintenanceForm() {
    document.getElementById("service_date").value = "";
    document.getElementById("service_type").value = "";
    document.getElementById("description").value = "";
    document.getElementById("maintenance_mileage").value = "";
}

async function loadMaintenance() {
    try {
        const res = await apiRequest("/api/maintenance");
        const records = await res.json();
        const tbody = document.querySelector("#maintenanceTable tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        records.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.make} ${r.model}</td>
                <td>${r.service_date}</td>
                <td>${r.service_type}</td>
                <td>${r.description || ''}</td>
                <td>${r.mileage ? Number(r.mileage).toLocaleString() + ' miles' : '-'}</td>
                <td>
                    <button class="edit" onclick="editMaintenance(${r.id}, '${r.service_date}', '${r.service_type}', '${(r.description || '').replace(/'/g, "\\'")}', ${r.mileage || null})">Edit</button>
                    <button class="delete" onclick="deleteMaintenance(${r.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        alert("Failed to load maintenance records.");
    }
}

function editMaintenance(id, serviceDate, serviceType, description, mileage) {
    currentEditType = 'maintenance';
    currentEditId = id;

    showEditModal("Edit Maintenance", [
        { id: "service_date", label: "Service Date", type: "date", value: serviceDate },
        { id: "service_type", label: "Service Type", value: serviceType },
        { id: "description", label: "Description", value: description || "" },
        { id: "mileage", label: "Mileage at Service", type: "number", value: mileage || "" }
    ], async (data) => {
        try {
            await apiRequest(`/api/maintenance/${currentEditId}`, "PUT", {
                service_date: data.service_date,
                service_type: data.service_type,
                description: data.description,
                mileage: data.mileage ? parseInt(data.mileage) : null
            });
            loadMaintenance();
        } catch (e) {
            alert("Failed to update maintenance record.");
        }
    });
}

async function deleteMaintenance(id) {
    if (!confirm("Delete this maintenance record?")) return;
    try {
        await apiRequest(`/api/maintenance/${id}`, "DELETE");
        loadMaintenance();
    } catch (e) {
        alert("Failed to delete record.");
    }
}

// ==================== Initialize Pages ====================
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("vehicleTable")) loadVehicles();
    if (document.getElementById("mileageTable")) {
        loadVehiclesForDropdown();
        loadMileage();
    }
    if (document.getElementById("maintenanceTable")) {
        loadVehiclesForDropdown();
        loadMaintenance();
    }
});