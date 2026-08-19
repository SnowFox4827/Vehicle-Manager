// ==================== Vehicle Management ====================

let cachedVehicles = null;

async function getVehiclesList(forceRefresh = false) {
    if (!forceRefresh && cachedVehicles) {
        return cachedVehicles;
    }
    try {
        const res = await apiRequest("/api/vehicles");
        cachedVehicles = await res.json();
        return cachedVehicles;
    } catch (e) {
        console.error(e);
        return [];
    }
}

function populateDropdown(selectId, vehicles, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = defaultText ? `<option value="">${defaultText}</option>` : '';
    vehicles.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.year || ''} ${v.make} ${v.model}`.trim();
        select.appendChild(opt);
    });
    if (currentVal) {
        select.value = currentVal;
    }
}

async function loadVehicles() {
    try {
        const tbody = document.querySelector("#vehicleTable tbody");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.6;">Loading vehicles...</td></tr>';
        }
        const vehicles = await getVehiclesList(true);
        if (!tbody) return;

        tbody.innerHTML = "";
        if (vehicles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.6;">No vehicles found. Add one above.</td></tr>';
            return;
        }

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
        await apiRequest("/api/vehicles", "POST", data);
        clearVehicleForm();
        cachedVehicles = null;
        loadVehicles();
    } catch (e) {
        alert("Failed to save vehicle.");
    }
}

function clearVehicleForm() {
    document.getElementById("vehicle_id").value = "";
    document.getElementById("make").value = "";
    document.getElementById("model").value = "";
    document.getElementById("year").value = "";
    document.getElementById("vin").value = "";
}

function editVehicle(id, make, model, year, vin) {
    showEditModal(
        "Edit Vehicle",
        [
            { label: "Make", id: "edit_make", value: make, required: true },
            { label: "Model", id: "edit_model", value: model, required: true },
            { label: "Year", id: "edit_year", type: "number", value: year },
            { label: "VIN", id: "edit_vin", value: vin }
        ],
        async () => {
            const updated = {
                make: document.getElementById("edit_make").value.trim(),
                model: document.getElementById("edit_model").value.trim(),
                year: document.getElementById("edit_year").value.trim() || null,
                vin: document.getElementById("edit_vin").value.trim() || null
            };

            if (!updated.make || !updated.model) {
                alert("Make and Model are required.");
                return false;
            }

            try {
                await apiRequest(`/api/vehicles/${id}`, "PUT", updated);
                cachedVehicles = null;
                loadVehicles();
                return true;
            } catch (e) {
                alert("Failed to update vehicle.");
                return false;
            }
        }
    );
}

async function deleteVehicle(id) {
    if (!confirm("Are you sure you want to delete this vehicle? All related mileage and maintenance records will be permanently removed.")) {
        return;
    }

    try {
        await apiRequest(`/api/vehicles/${id}`, "DELETE");
        cachedVehicles = null;
        loadVehicles();
    } catch (e) {
        alert("Failed to delete vehicle.");
    }
}

async function loadVehiclesForDropdown(selectId = "vehicle", includeAllOption = false) {
    const vehicles = await getVehiclesList();
    populateDropdown(
        selectId,
        vehicles,
        includeAllOption ? "-- All Vehicles --" : "-- Select Vehicle --"
    );
}
