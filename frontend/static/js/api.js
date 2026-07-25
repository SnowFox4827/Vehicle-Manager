// ==================== Attribute Escaping Helper ====================
// Escapes a value so it can be safely embedded inside an onclick="fn('...')"
// attribute: backslashes and single quotes (which delimit the JS string
// literal) and double quotes (which delimit the HTML attribute itself).
function escAttr(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}

// ==================== API Helper ====================
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