// ==================== Mileage Management ====================

let allMileageRecords = [];

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
        allMileageRecords = await res.json();
        applyMileageFilter();
    } catch (e) {
        alert("Failed to load mileage records.");
    }
}

function applyMileageFilter() {
    const filterSelect = document.getElementById("filterVehicle");
    const vehicleId = filterSelect ? filterSelect.value : "";
    const tbody = document.querySelector("#mileageTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtered = vehicleId
        ? allMileageRecords.filter(m => String(m.vehicle_id) === String(vehicleId))
        : allMileageRecords;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.6;">No mileage records found.</td></tr>';
        return;
    }

    filtered.forEach(m => {
        const row = document.createElement("tr");
        const vehicleLabel = `${m.year || ''} ${m.make} ${m.model}`.trim();
        row.innerHTML = `
            <td>${m.id}</td>
            <td>${vehicleLabel}</td>
            <td>${Number(m.mileage).toLocaleString()} mi</td>
            <td>${m.date}</td>
            <td>
                <button class="edit" onclick="editMileage(${m.id}, ${m.vehicle_id}, ${m.mileage}, '${m.date}')">Edit</button>
                <button class="delete" onclick="deleteMileage(${m.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function applyVehicleFilterFromURL() {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get("vehicle");
    const filterSelect = document.getElementById("filterVehicle");
    if (filterSelect && vehicleId) {
        filterSelect.value = vehicleId;
    }
    applyMileageFilter();
}

function editMileage(id, currentVehicleId, currentMileage, currentDate) {
    getVehiclesList().then(vehicles => {
        const vehicleOptions = vehicles.map(v =>
            `<option value="${v.id}" ${v.id === currentVehicleId ? "selected" : ""}>${v.year || ''} ${v.make} ${v.model}</option>`
        ).join("");

        showEditModal(
            "Edit Mileage",
            [
                { label: "Vehicle", id: "edit_vehicle", type: "select", optionsHtml: vehicleOptions },
                { label: "Mileage", id: "edit_mileage", type: "number", value: currentMileage, required: true },
                { label: "Date", id: "edit_date", type: "date", value: currentDate, required: true }
            ],
            async () => {
                const vehicle_id = parseInt(document.getElementById("edit_vehicle").value);
                const mileage = parseInt(document.getElementById("edit_mileage").value);
                const date = document.getElementById("edit_date").value;

                if (!vehicle_id || !mileage || !date) {
                    alert("All fields are required.");
                    return false;
                }

                try {
                    await apiRequest(`/api/mileage/${id}`, "PUT", { vehicle_id, mileage, date });
                    loadMileage();
                    return true;
                } catch (e) {
                    alert("Failed to update mileage.");
                    return false;
                }
            }
        );
    });
}

async function deleteMileage(id) {
    if (!confirm("Are you sure you want to delete this mileage record?")) return;

    try {
        await apiRequest(`/api/mileage/${id}`, "DELETE");
        loadMileage();
    } catch (e) {
        alert("Failed to delete mileage.");
    }
}
