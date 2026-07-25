// ==================== Backend API Base ====================
// The backend runs as a separate container on its own host port (see
// docker-compose.yml: backend is published on 5003, frontend on 5002).
// A plain relative fetch("/api/...") from the browser resolves against
// the frontend's own origin, which has no /api routes and 404s. Route
// /api requests to the backend's origin instead; leave everything else
// (e.g. /static/...) untouched so it's still served by the frontend.
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5003`;

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
    const targetUrl = url.startsWith("/api") ? `${API_BASE}${url}` : url;

    const options = {
        method: method,
        headers: { "Content-Type": "application/json" }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(targetUrl, options);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }
    return response;
}