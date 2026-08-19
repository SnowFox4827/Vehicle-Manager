// ==================== Shared Edit State ====================
let currentEditId = null;
let currentEditType = null; // 'vehicle', 'mileage', or 'maintenance'

// Escape HTML attributes to avoid broken quotes
function escAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
