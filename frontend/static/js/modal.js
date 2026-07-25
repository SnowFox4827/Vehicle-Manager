// ==================== Modal Popup ====================
function showEditModal(title, fields, onSave) {
    let modal = document.getElementById("editModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "editModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <h2 id="modalTitle"></h2>
                <div id="modalFields"></div>
                <div class="modal-buttons">
                    <button onclick="saveCurrentEdit()">Save Changes</button>
                    <button onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById("modalTitle").textContent = title;
    const container = document.getElementById("modalFields");
    container.innerHTML = "";

    fields.forEach(f => {
        const div = document.createElement("div");
        div.className = "modal-field";
        const safeValue = String(f.value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        div.innerHTML = `
            <label>${f.label}</label>
            <input 
                type="${f.type || 'text'}" 
                id="modal_${f.id}" 
                value="${safeValue}">
        `;
        container.appendChild(div);
    });

    window.saveCurrentEdit = () => {
        const data = {};
        fields.forEach(f => {
            const input = document.getElementById(`modal_${f.id}`);
            if (input) data[f.id] = input.value;
        });
        onSave(data);
        closeModal();
    };

    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("editModal");
    if (modal) modal.style.display = "none";
}