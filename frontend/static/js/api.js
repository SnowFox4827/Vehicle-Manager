// ==================== Backend API Helper ====================
// Uses same-origin relative URLs (/api/...) proxied through the frontend server,
// eliminating CORS and direct backend port access issues in the browser.

async function apiRequest(path, method = "GET", body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body !== null && method !== "GET") {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(path, options);
    if (!res.ok) {
        let msg = `${method} ${path} failed (${res.status})`;
        try {
            const err = await res.json();
            if (err.error) msg = err.error;
        } catch (_) {}
        throw new Error(msg);
    }
    return res;
}
