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
                    <button class="edit" onclick="editVehicle(${v.id}, '${escAttr(v.make)}', '${escAttr(v.model)}', '${escAttr(v.year || '')}', '${escAttr(v.vin || '')}')">Edit</button>
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

// Shared dropdown used by mileage.js and maintenance.js
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