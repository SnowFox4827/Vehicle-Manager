/**
 * Vehicle Fleet Manager - Modern Single-Page Application
 * Clean light/dark architecture matching Budget App
 */

const ICONS = {
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207z"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>'
};

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
        container.innerHTML = '<p class="text-muted">No vehicles added yet. Click "+ Add Vehicle" to get started.</p>';
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No vehicles found.</td></tr>';
        return;
    }

    container.innerHTML = state.vehicles.map(v => {
        const latestMiles = v.current_mileage ? `${Number(v.current_mileage).toLocaleString()} mi` : '0 mi';
        return `
            <div class="card h-100">
                <div class="card-body">
                    <div class="flex space-between align-center mb-2">
                        <h5 class="fw-bold m-0">${v.year ? v.year + ' ' : ''}${v.make} ${v.model}</h5>
                        <div class="flex gap-2">
                            <button class="btn-link text-primary" onclick="editVehicle(${v.id})" title="Edit Vehicle">${ICONS.edit}</button>
                            <button class="btn-link text-danger" onclick="deleteVehicle(${v.id})" title="Delete Vehicle">${ICONS.trash}</button>
                        </div>
                    </div>
                    <div class="acc-balance">${latestMiles}</div>
                    <div class="acc-row"><span>VIN:</span><span class="value">${v.vin || 'None'}</span></div>
                    <div class="acc-row"><span>Services:</span><span class="value">${v.maintenance_count || 0}</span></div>
                    <div class="flex gap-2 mt-3">
                        <button class="btn btn-sm btn-outline-secondary grow" onclick="filterToVehicle(${v.id}, 'mileage-sec')">Mileage</button>
                        <button class="btn btn-sm btn-outline-secondary grow" onclick="filterToVehicle(${v.id}, 'maintenance-sec')">Services</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    tbody.innerHTML = state.vehicles.map(v => `
        <tr>
            <td class="fw-semibold">${v.year ? v.year + ' ' : ''}${v.make} ${v.model}</td>
            <td><code>${v.vin || '-'}</code></td>
            <td class="text-end font-mono text-primary fw-bold">${v.current_mileage ? Number(v.current_mileage).toLocaleString() + ' mi' : '-'}</td>
            <td class="text-end text-dark">${v.maintenance_count || 0}</td>
            <td class="text-center">
                <div class="flex center gap-2">
                    <button class="btn-link text-primary" onclick="editVehicle(${v.id})" title="Edit">${ICONS.edit}</button>
                    <button class="btn-link text-danger" onclick="deleteVehicle(${v.id})" title="Delete">${ICONS.trash}</button>
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
    const snapshotsBox = document.getElementById('backup-snapshots-list');
    if (snapshotsBox) snapshotsBox.innerHTML = '<div class="text-muted small">Loading snapshots...</div>';
    try {
        const status = await api('backup/status');
        const countBox = document.getElementById('backup-total-count');
        const timeBox = document.getElementById('backup-last-time');
        if (timeBox) timeBox.textContent = status.latest_snapshot ? `Latest: ${status.latest_snapshot}` : 'No snapshots on server yet';
        if (countBox) countBox.textContent = `${status.snapshot_count} automated snapshot(s) stored in ${status.backup_dir} (Retention: ${status.retention_days} days)`;

        const list = status.snapshots || [];
        if (snapshotsBox) {
            if (list.length === 0) {
                snapshotsBox.innerHTML = '<div class="text-muted small">No server snapshots available yet.</div>';
            } else {
                snapshotsBox.innerHTML = list.map(s => `
                    <div class="flex space-between align-center gap-2 p-2" style="border:1px solid var(--border-color,#dee2e6); border-radius:6px;">
                        <div class="small" style="flex:1; min-width:0;">
                            <div class="fw-semibold text-truncate" style="word-break:break-all;">${s.name}</div>
                            <div class="text-muted">${s.created_at ? new Date(s.created_at).toLocaleString() : ''}</div>
                        </div>
                        <button type="button" class="btn btn-warning btn-sm" style="white-space:nowrap;" onclick="handleSnapshotRestore('${s.name}')">Restore</button>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error(e);
        if (snapshotsBox) snapshotsBox.innerHTML = '<div class="text-muted small">Failed to load snapshots.</div>';
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

// ==================== Restore from Backup ====================

const RESTORE_EXTENSIONS = ['.json', '.db', '.sqlite', '.sqlite3'];

window.handleFileRestore = async function() {
    const input = document.getElementById('backup-restore-file');
    if (!input || !input.files || !input.files[0]) {
        alert('Please select a .json or .db backup file first.');
        return;
    }

    const file = input.files[0];
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.slice(lowerName.lastIndexOf('.'));
    if (!RESTORE_EXTENSIONS.includes(ext)) {
        alert(`Unsupported file type '${ext}'. Please choose a .json, .db, .sqlite, or .sqlite3 file.`);
        return;
    }

    const ok = confirm(`Restore data from "${file.name}"? This will REPLACE all current vehicle data. An automatic safety snapshot will be taken first.`);
    if (!ok) return;

    const btn = document.querySelector('button[onclick="handleFileRestore()"]');
    if (btn) btn.disabled = true;
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/backup/restore/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({ success: false, error: 'Server error' }));
        if (!res.ok || !data.success) {
            alert('Restore failed: ' + (data.error || 'Unknown error'));
            return;
        }

        alert(data.message + (data.safety_snapshot ? `\nSafety snapshot: ${data.safety_snapshot}` : ''));
        input.value = '';
        await refreshAllData();
        showBackupModal();
    } catch (e) {
        alert('Restore error: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.handleSnapshotRestore = async function(snapshotName) {
    if (!snapshotName) return;

    const ok = confirm(`Restore from snapshot "${snapshotName}"? This will REPLACE all current vehicle data. An automatic safety snapshot will be taken first.`);
    if (!ok) return;

    try {
        const data = await api('backup/restore/snapshot', {
            method: 'POST',
            body: JSON.stringify({ snapshot_dir: snapshotName })
        });

        if (!data.success) {
            alert('Restore failed: ' + (data.error || 'Unknown error'));
            return;
        }

        alert(data.message + (data.safety_snapshot ? `\nSafety snapshot: ${data.safety_snapshot}` : ''));
        await refreshAllData();
        showBackupModal();
    } catch (e) {
        alert('Restore error: ' + e.message);
    }
};
