// ==================== Maintenance Management ====================

let maintenanceTypes = {};

async function loadMaintenanceTypes() {
    try {
        const res = await apiRequest("/static/maintenance_types.json");
        maintenanceTypes = await res.json();
        populateMaintenanceCategories();
    } catch (e) {
        console.error("Failed to load maintenance types.", e);
    }
}

function populateMaintenanceCategories() {
    const dropdown = document.getElementById("service_category");

    dropdown.innerHTML = `<option value="">-- Select Category --</option>`;

    Object.keys(maintenanceTypes)
        .sort()
        .forEach(category => {
            dropdown.innerHTML += `<option value="${category}">${category}</option>`;
        });
}

function loadServices() {
    const category = document.getElementById("service_category").value;
    const dropdown = document.getElementById("service_type");

    dropdown.innerHTML = `<option value="">-- Select Service --</option>`;

    if (!category) {
        return;
    }

    maintenanceTypes[category].forEach(service => {
        dropdown.innerHTML += `<option value="${service}">${service}</option>`;
    });
}

async function saveMaintenance() {
    const vehicleId = document.getElementById("vehicle").value;
    const serviceDate = document.getElementById("service_date").value;
    const category = document.getElementById("service_category").value;
    const serviceType = document.getElementById("service_type").value.trim();
    const description = document.getElementById("description").value.trim();
    const mileage = document.getElementById("maintenance_mileage").value;

    if (!vehicleId || !serviceDate || !category || !serviceType) {
        alert("Please fill required fields.");
        return;
    }

    try {
        await apiRequest("/api/maintenance", "POST", {
            vehicle_id: parseInt(vehicleId),
            service_date: serviceDate,
            category: category,
            service_type: serviceType,
            description: description || null,
            mileage: mileage ? parseInt(mileage) : null
        });

        clearMaintenanceForm();
        loadMaintenance();
    } catch (e) {
        console.error(e);
        alert("Failed to add maintenance record.");
    }
}

function clearMaintenanceForm() {
    document.getElementById("service_date").value = "";
    document.getElementById("service_category").value = "";
    document.getElementById("service_type").innerHTML = `<option value="">-- Select Service --</option>`;
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
                <td>${r.category || ''}</td>
                <td>${r.service_type}</td>
                <td>${r.description || ''}</td>
                <td>${r.mileage ? Number(r.mileage).toLocaleString() + ' miles' : '-'}</td>
                <td>
                    <button class="edit" onclick="editMaintenance(${r.id}, '${escAttr(r.service_date)}', '${escAttr(r.category)}', '${escAttr(r.service_type)}', '${escAttr(r.description)}', ${r.mileage || null})">Edit</button>
                    <button class="delete" onclick="deleteMaintenance(${r.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        alert("Failed to load maintenance records.");
    }
}

function editMaintenance(id, serviceDate, category, serviceType, description, mileage) {
    currentEditType = 'maintenance';
    currentEditId = id;

    showEditModal("Edit Maintenance", [
        { id: "service_date", label: "Service Date", type: "date", value: serviceDate },
        { id: "category", label: "Category", value: category || "" },
        { id: "service_type", label: "Service Type", value: serviceType },
        { id: "description", label: "Description", value: description || "" },
        { id: "mileage", label: "Mileage at Service", type: "number", value: mileage || "" }
    ], async (data) => {
        try {
            await apiRequest(`/api/maintenance/${currentEditId}`, "PUT", {
                service_date: data.service_date,
                category: data.category,
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