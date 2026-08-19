/**
 * Vehicle Fleet Manager - Modern Single-Page Application
 * Clean light/dark architecture matching Budget App
 */

let state = {
    vehicles: [],
    mileage: [],
    maintenance: [],
    types: [],
    summary: { total_vehicles: 0, total_fleet_miles: 0, total_services: 0 },
    currentTab: 'vehicles-sec',
    vehicleView: 'grid'
};

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initForms();
    await refreshAllData();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = (savedTheme === 'dark');
}

window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
};

window.switchTab = function(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });
};

window.setVehicleView = function(mode) {
    state.vehicleView = mode;
    document.getElementById('veh-view-grid')?.classList.toggle('active', mode === 'grid');
    document.getElementById('veh-view-list')?.classList.toggle('active', mode === 'list');
    
    const container = document.getElementById('vehicles-container');
    const wrap = document.getElementById('vehicles-table-wrap');
    if (mode === 'grid') {
        if (container) container.style.display = 'grid';
        if (wrap) wrap.style.display = 'none';
    } else {
        if (container) container.style.display = 'none';
        if (wrap) wrap.style.display = 'block';
    }
};

// ==================== API & State Refresh ====================

async function api(path, options = {}) {
    const res = await fetch(`/api/${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

async function refreshAllData() {
    try {
        const [vehicles, mileage, maintenance, types, summary] = await Promise.all([
            api('vehicles'),
            api('mileage'),
            api('maintenance'),
            api('maintenance/types'),
            api('dashboard/summary')
        ]);

        state.vehicles = vehicles;
        state.mileage = mileage;
        state.maintenance = maintenance;
        state.types = types;
        state.summary = summary;

        renderSummary();
        renderVehicles();
        renderMileage();
        renderMaintenance();
        populateVehicleDropdowns();
    } catch (e) {
        console.error('Data load error:', e);
    }
}

// ==================== Render Functions ====================

function renderSummary() {
    document.getElementById('sum-vehicles').textContent = state.summary.total_vehicles || state.vehicles.length;
    document.getElementById('sum-miles').textContent = (state.summary.total_fleet_miles || 0).toLocaleString() + ' mi';
    document.getElementById('sum-services').textContent = state.summary.total_services || state.maintenance.length;
}

function renderVehicles() {
    const container = document.getElementById('vehicles-container');
    const tbody = document.getElementById('vehicles-list');
    if (!container || !tbody) return;

    if (state.vehicles.length === 0) {
        container.innerHTML = '<div class="empty-state text-muted">No vehicles added yet. Click "+ Add Vehicle" to get started.</div>';
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No vehicles found.</td></tr>';
        return;
    }

    // Modern styled Vehicle Grid Cards with generous breathing room
    container.innerHTML = state.vehicles.map(v => {
        const latestMiles = v.current_mileage ? `${Number(v.current_mileage).toLocaleString()} mi` : 'No logs';
        return `
            <div class="card vehicle-card">
                <div class="card-header flex between align-start">
                    <div class="vehicle-title-wrap">
                        <span class="vehicle-year">${v.year || 'Fleet'}</span>
                        <h4 class="card-title">${v.make} ${v.model}</h4>
                    </div>
                    <span class="badge ${v.current_mileage ? 'badge-blue' : 'badge-gray'}">${latestMiles}</span>
                </div>
                <div class="card-body flex col gap-3">
                    <div class="vehicle-specs-grid">
                        <div class="spec-box">
                            <span class="spec-label">Current Odometer</span>
                            <span class="spec-value font-mono">${latestMiles}</span>
                        </div>
                        <div class="spec-box">
                            <span class="spec-label">Service History</span>
                            <span class="spec-value">${v.maintenance_count || 0} events</span>
                        </div>
                    </div>
                    <div class="vin-pill-wrap">
                        <span class="vin-label">VIN:</span>
                        <code class="vin-code">${v.vin || 'Not specified'}</code>
                    </div>
                </div>
                <div class="card-footer flex between wrap align-center gap-2">
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="filterToVehicle(${v.id}, 'mileage-sec')" title="View Mileage History">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                            Mileage
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="filterToVehicle(${v.id}, 'maintenance-sec')" title="View Service History">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.103a3 3 0 0 0-3.675 3.68L7.462 6.46 4.79 3.79a1 1 0 0 1-.293-.707v-.07a1 1 0 0 0-.419-.814L1 0z"/></svg>
                            Services
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="editVehicle(${v.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVehicle(${v.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // List View Rows
    tbody.innerHTML = state.vehicles.map(v => `
        <tr>
            <td class="fw-semibold">${v.make} ${v.model}</td>
            <td>${v.year || '-'}</td>
            <td><code>${v.vin || '-'}</code></td>
            <td class="text-end font-mono">${v.current_mileage ? Number(v.current_mileage).toLocaleString() + ' mi' : '-'}</td>
            <td class="text-end">${v.maintenance_count || 0}</td>
            <td class="text-center">
                <div class="flex center gap-1">
                    <button class="btn btn-xs btn-outline-secondary" onclick="editVehicle(${v.id})">Edit</button>
                    <button class="btn btn-xs btn-outline-danger" onclick="deleteVehicle(${v.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.filterToVehicle = function(vehicleId, targetTab) {
    switchTab(targetTab);
    if (targetTab === 'mileage-sec') {
        const select = document.getElementById('slice-mileage-vehicle');
        if (select) {
            select.value = vehicleId;
            filterMileage();
        }
    } else if (targetTab === 'maintenance-sec') {
        const select = document.getElementById('slice-maint-vehicle');
        if (select) {
            select.value = vehicleId;
            filterMaintenance();
        }
    }
};

function renderMileage(records = state.mileage) {
    const tbody = document.getElementById('mileage-list');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No mileage records found.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(m => `
        <tr>
            <td>${m.date}</td>
            <td class="fw-semibold">${m.year ? m.year + ' ' : ''}${m.make} ${m.model}</td>
            <td class="text-end font-mono">${Number(m.mileage).toLocaleString()} mi</td>
            <td class="text-center">
                <div class="flex center gap-1">
                    <button class="btn btn-xs btn-outline-secondary" onclick="editMileage(${m.id})">Edit</button>
                    <button class="btn btn-xs btn-outline-danger" onclick="deleteMileage(${m.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderMaintenance(records = state.maintenance) {
    const tbody = document.getElementById('maintenance-list');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No maintenance records found.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(m => `
        <tr>
            <td>${m.date}</td>
            <td class="fw-semibold">${m.year ? m.year + ' ' : ''}${m.make} ${m.model}</td>
            <td><span class="badge badge-blue">${m.type}</span></td>
            <td>${m.description || '-'}</td>
            <td class="text-end font-mono">${m.mileage_at_service ? Number(m.mileage_at_service).toLocaleString() + ' mi' : '-'}</td>
            <td class="text-center">
                <div class="flex center gap-1">
                    <button class="btn btn-xs btn-outline-secondary" onclick="editMaintenance(${m.id})">Edit</button>
                    <button class="btn btn-xs btn-outline-danger" onclick="deleteMaintenance(${m.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== Instant Slicers / Filters ====================

window.filterMileage = function() {
    const vehVal = document.getElementById('slice-mileage-vehicle')?.value;
    const presetVal = document.getElementById('slice-mileage-preset')?.value;

    let filtered = [...state.mileage];

    if (vehVal) {
        filtered = filtered.filter(m => String(m.vehicle_id) === String(vehVal));
    }

    if (presetVal) {
        filtered = filtered.filter(m => dateMatchesPreset(m.date, presetVal));
    }

    renderMileage(filtered);
};

window.filterMaintenance = function() {
    const vehVal = document.getElementById('slice-maint-vehicle')?.value;
    const typeVal = document.getElementById('slice-maint-type')?.value;
    const searchVal = (document.getElementById('slice-maint-search')?.value || '').toLowerCase().trim();
    const presetVal = document.getElementById('slice-maint-preset')?.value;

    let filtered = [...state.maintenance];

    if (vehVal) {
        filtered = filtered.filter(m => String(m.vehicle_id) === String(vehVal));
    }

    if (typeVal) {
        filtered = filtered.filter(m => m.type === typeVal);
    }

    if (searchVal) {
        filtered = filtered.filter(m => (m.description || '').toLowerCase().includes(searchVal) || (m.type || '').toLowerCase().includes(searchVal));
    }

    if (presetVal) {
        filtered = filtered.filter(m => dateMatchesPreset(m.date, presetVal));
    }

    renderMaintenance(filtered);
};

function dateMatchesPreset(dateStr, preset) {
    if (!dateStr) return false;
    const recordDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();

    if (preset === 'today') {
        return recordDate.toDateString() === now.toDateString();
    }
    if (preset === 'this-month') {
        return recordDate.getFullYear() === now.getFullYear() && recordDate.getMonth() === now.getMonth();
    }
    if (preset === 'last-month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return recordDate.getFullYear() === lastMonth.getFullYear() && recordDate.getMonth() === lastMonth.getMonth();
    }
    if (preset === 'this-year') {
        return recordDate.getFullYear() === now.getFullYear();
    }
    return true;
}

function populateVehicleDropdowns() {
    const vehOptions = '<option value="">All Vehicles</option>' + state.vehicles.map(v =>
        `<option value="${v.id}">${v.year ? v.year + ' ' : ''}${v.make} ${v.model}</option>`
    ).join('');

    const formVehOptions = '<option value="" disabled selected>-- Select Vehicle --</option>' + state.vehicles.map(v =>
        `<option value="${v.id}">${v.year ? v.year + ' ' : ''}${v.make} ${v.model}</option>`
    ).join('');

    const typeFilterOptions = '<option value="">All Types</option>' + state.types.map(t =>
        `<option value="${t}">${t}</option>`
    ).join('');

    const formTypeOptions = '<option value="" disabled selected>-- Select Type --</option>' + state.types.map(t =>
        `<option value="${t}">${t}</option>`
    ).join('');

    // Slicer dropdowns
    const sliceMileage = document.getElementById('slice-mileage-vehicle');
    if (sliceMileage) sliceMileage.innerHTML = vehOptions;

    const sliceMaint = document.getElementById('slice-maint-vehicle');
    if (sliceMaint) sliceMaint.innerHTML = vehOptions;

    const sliceType = document.getElementById('slice-maint-type');
    if (sliceType) sliceType.innerHTML = typeFilterOptions;

    // Modal Form dropdowns
    const mileSelect = document.getElementById('mile-vehicle-select');
    if (mileSelect) mileSelect.innerHTML = formVehOptions;

    const maintSelect = document.getElementById('maint-vehicle-select');
    if (maintSelect) maintSelect.innerHTML = formVehOptions;

    const maintTypeSelect = document.getElementById('maint-type-select');
    if (maintTypeSelect) maintTypeSelect.innerHTML = formTypeOptions;
}

// ==================== Modals & CRUD ====================

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
};

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

// --- Vehicles ---
window.showAddVehicleModal = function() {
    document.getElementById('vehicleForm').reset();
    document.getElementById('veh-id').value = '';
    document.getElementById('vehicleModalTitle').textContent = 'Add Vehicle';
    openModal('vehicleModal');
};

window.editVehicle = function(id) {
    const v = state.vehicles.find(item => item.id === id);
    if (!v) return;
    document.getElementById('veh-id').value = v.id;
    document.getElementById('veh-make').value = v.make;
    document.getElementById('veh-model').value = v.model;
    document.getElementById('veh-year').value = v.year || '';
    document.getElementById('veh-vin').value = v.vin || '';
    document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
    openModal('vehicleModal');
};

window.deleteVehicle = async function(id) {
    if (!confirm('Are you sure you want to delete this vehicle? All related mileage and maintenance history will be permanently deleted.')) return;
    try {
        await api(`vehicles/${id}`, { method: 'DELETE' });
        await refreshAllData();
    } catch (e) {
        alert(e.message);
    }
};

// --- Mileage ---
window.showAddMileageModal = function() {
    document.getElementById('mileageForm').reset();
    document.getElementById('mile-id').value = '';
    document.getElementById('mile-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('mileageModalTitle').textContent = 'Log Mileage';
    openModal('mileageModal');
};

window.editMileage = function(id) {
    const m = state.mileage.find(item => item.id === id);
    if (!m) return;
    document.getElementById('mile-id').value = m.id;
    document.getElementById('mile-vehicle-select').value = m.vehicle_id;
    document.getElementById('mile-amount').value = m.mileage;
    document.getElementById('mile-date').value = m.date;
    document.getElementById('mileageModalTitle').textContent = 'Edit Mileage';
    openModal('mileageModal');
};

window.deleteMileage = async function(id) {
    if (!confirm('Delete this mileage record?')) return;
    try {
        await api(`mileage/${id}`, { method: 'DELETE' });
        await refreshAllData();
    } catch (e) {
        alert(e.message);
    }
};

// --- Maintenance ---
window.showAddMaintenanceModal = function() {
    document.getElementById('maintenanceForm').reset();
    document.getElementById('maint-id').value = '';
    document.getElementById('maint-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('maintenanceModalTitle').textContent = 'Log Maintenance';
    openModal('maintenanceModal');
};

window.editMaintenance = function(id) {
    const m = state.maintenance.find(item => item.id === id);
    if (!m) return;
    document.getElementById('maint-id').value = m.id;
    document.getElementById('maint-vehicle-select').value = m.vehicle_id;
    document.getElementById('maint-type-select').value = m.type;
    document.getElementById('maint-date').value = m.date;
    document.getElementById('maint-mileage').value = m.mileage_at_service || '';
    document.getElementById('maint-desc').value = m.description || '';
    document.getElementById('maintenanceModalTitle').textContent = 'Edit Maintenance';
    openModal('maintenanceModal');
};

window.deleteMaintenance = async function(id) {
    if (!confirm('Delete this maintenance record?')) return;
    try {
        await api(`maintenance/${id}`, { method: 'DELETE' });
        await refreshAllData();
    } catch (e) {
        alert(e.message);
    }
};

// ==================== Form Submissions ====================

function initForms() {
    document.getElementById('vehicleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('veh-id').value;
        const payload = {
            make: document.getElementById('veh-make').value.trim(),
            model: document.getElementById('veh-model').value.trim(),
            year: document.getElementById('veh-year').value.trim() || null,
            vin: document.getElementById('veh-vin').value.trim() || null
        };
        try {
            if (id) {
                await api(`vehicles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('vehicles', { method: 'POST', body: JSON.stringify(payload) });
            }
            closeModal('vehicleModal');
            await refreshAllData();
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('mileageForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('mile-id').value;
        const payload = {
            vehicle_id: document.getElementById('mile-vehicle-select').value,
            mileage: document.getElementById('mile-amount').value,
            date: document.getElementById('mile-date').value
        };
        try {
            if (id) {
                await api(`mileage/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('mileage', { method: 'POST', body: JSON.stringify(payload) });
            }
            closeModal('mileageModal');
            await refreshAllData();
        } catch (err) {
            alert(err.message);
        }
    });

    document.getElementById('maintenanceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('maint-id').value;
        const payload = {
            vehicle_id: document.getElementById('maint-vehicle-select').value,
            type: document.getElementById('maint-type-select').value,
            date: document.getElementById('maint-date').value,
            mileage_at_service: document.getElementById('maint-mileage').value || null,
            description: document.getElementById('maint-desc').value.trim() || null
        };
        try {
            if (id) {
                await api(`maintenance/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('maintenance', { method: 'POST', body: JSON.stringify(payload) });
            }
            closeModal('maintenanceModal');
            await refreshAllData();
        } catch (err) {
            alert(err.message);
        }
    });
}

// ==================== Backups ====================

window.showBackupModal = async function() {
    openModal('backupModal');
    try {
        const status = await api('backup/status');
        const countBox = document.getElementById('backup-total-count');
        const timeBox = document.getElementById('backup-last-time');
        if (timeBox) timeBox.textContent = status.latest_snapshot ? `Latest: ${status.latest_snapshot}` : 'No snapshots on server yet';
        if (countBox) countBox.textContent = `${status.snapshot_count} automated snapshot(s) stored in ${status.backup_dir} (Retention: ${status.retention_days} days)`;
    } catch (e) {
        console.error(e);
    }
};

window.downloadBackup = function(format) {
    window.location.href = `/api/backup/export?format=${format}`;
};

window.triggerServerSnapshot = async function() {
    const btn = document.getElementById('btn-trigger-snapshot');
    if (btn) btn.disabled = true;
    try {
        const res = await api('backup/snapshot', { method: 'POST' });
        alert(`Snapshot created: ${res.snapshot.snapshot_dir}`);
        showBackupModal();
    } catch (e) {
        alert('Snapshot error: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};
