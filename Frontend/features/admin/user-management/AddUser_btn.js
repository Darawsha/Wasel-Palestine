// Admin/Pages/UserManagement/AddUser_btn.js

(function() {
    const initAddUserBtn = () => {
        const addBtn = document.getElementById('addUserBtn');
        if (!addBtn || addBtn.dataset.modalBound) return;

        addBtn.dataset.modalBound = "true";

        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            let overlay = document.getElementById('addUserOverlay');

            if (!overlay) {
                try {
                    const response = await fetch('/features/admin/user-management/AddUser.html');
                    if (!response.ok) throw new Error('Failed to load Add User modal');
                    const html = await response.text();

                    overlay = document.createElement('div');
                    overlay.className = 'add-user-overlay';
                    overlay.id = 'addUserOverlay';
                    overlay.innerHTML = html;
                    document.body.appendChild(overlay);

                    if (!document.querySelector('link[href*="AddUser.css"]')) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = '/features/admin/user-management/AddUser.css?v=' + new Date().getTime();
                        document.head.appendChild(link);
                    }

                    // Attach Close Events
                    overlay.addEventListener('click', (event) => {
                        if (event.target === overlay) {
                            closeModal(overlay);
                        }
                    });

                    const closeBtn = overlay.querySelector('#addUserCloseBtn');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => {
                            closeModal(overlay);
                        });
                    }

                    const cancelBtn = overlay.querySelector('#addUserCancelBtn');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', () => {
                            closeModal(overlay);
                        });
                    }
                } catch (err) {
                    console.error("Error launching add user modal:", err);
                    return;
                }
            }

            try {
                const { bindAddUserSave } = await import('/features/admin/user-management/save_btn.js');
                bindAddUserSave(overlay, {
                    onClose: () => closeModal(overlay),
                });
            } catch (err) {
                console.error('Error wiring add user save flow:', err);
                return;
            }

            requestAnimationFrame(() => {
                overlay.classList.add('show');
            });
        });
    };

    function closeModal(overlay) {
        overlay.classList.remove('show');
    }

    // Initialize immediately in case DOM is already parsed (SPA routing)
    initAddUserBtn();

    // Also bind to DOMContentLoaded for initial hard reloads
    document.addEventListener('DOMContentLoaded', initAddUserBtn);
})();