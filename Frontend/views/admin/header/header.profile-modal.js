// components_Admin/header/header.profile-modal.js

document.addEventListener('DOMContentLoaded', () => {
    const openModalBtn = document.getElementById('openProfileModalBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (!openModalBtn) return;

    openModalBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // 1. Close dropdown
        if (profileDropdown) {
            profileDropdown.classList.remove('show');
        }

        // 2. Check if modal already exists
        let overlay = document.getElementById('profileModalOverlay');
        
        if (!overlay) {
            try {
                // Fetch the HTML
                const response = await fetch('/features/admin/profile/Profile.html');
                if (!response.ok) throw new Error('Failed to load profile modal');
                const html = await response.text();

                // Create Overlay Container
                overlay = document.createElement('div');
                overlay.className = 'profile-modal-overlay';
                overlay.id = 'profileModalOverlay';
                overlay.innerHTML = html;
                document.body.appendChild(overlay);

                // Load CSS if not already loaded
                if (!document.querySelector('link[href*="Profile.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/features/admin/profile/Profile.css';
                    document.head.appendChild(link);
                }

                // Load JS if not already loaded
                if (!document.querySelector('script[src*="Profile.js"]')) {
                    const script = document.createElement('script');
                    script.src = '/features/admin/profile/Profile.js';
                    document.body.appendChild(script);
                }

                if (!document.querySelector('script[src*="ApplyHeaderAvatar.js"]')) {
                    const script = document.createElement('script');
                    script.src = '/features/admin/profile/ApplyHeaderAvatar.js';
                    document.body.appendChild(script);
                }

                if (!document.querySelector('script[src*="AvatarUpload.js"]')) {
                    const script = document.createElement('script');
                    script.src = '/features/admin/profile/AvatarUpload.js';
                    document.body.appendChild(script);
                }

                // Attach Close Events
                // Close on backdrop click
                overlay.addEventListener('click', (event) => {
                    if (event.target === overlay) {
                        closeModal(overlay);
                    }
                });

                // Close on Cancel Button click
                const cancelBtn = overlay.querySelector('#profileModalCancelBtn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        closeModal(overlay);
                    });
                }
            } catch (err) {
                console.error("Error launching profile modal:", err);
                return;
            }
        }

        window.initProfileAvatarUpload?.(overlay);
        window.initAdminProfile?.(overlay);

        // 3. Show Modal
        // Small delay to ensure display:flex renders before opacity transition triggers
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
    });

    function closeModal(overlay) {
        overlay.classList.remove('show');
    }
});
