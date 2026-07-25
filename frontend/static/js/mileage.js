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

    const records = vehicleId
        ? allMileageRecords.filter(r => String(r.vehicle_id) === String(vehicleId))
        : allMileageRecords;

    renderMileageRows(records);
}

function renderMileageRows(records) {
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