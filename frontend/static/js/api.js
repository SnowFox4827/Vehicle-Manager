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