document.addEventListener('DOMContentLoaded', () => {
  const openModalBtn = document.getElementById('openProfileModalBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  if (!openModalBtn) {
    return;
  }

  function ensureStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      return Promise.resolve(existing);
    }

    const script = document.createElement('script');
    script.src = src;

    return new Promise((resolve, reject) => {
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true';
          resolve(script);
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => reject(new Error(`Unable to load script: ${src}`)),
        { once: true },
      );
      document.body.appendChild(script);
    });
  }

  openModalBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    if (profileDropdown) {
      profileDropdown.classList.remove('show');
    }

    let overlay = document.getElementById('profileModalOverlay');

    if (!overlay) {
      try {
        const response = await fetch('/features/admin/profile/Profile.html');
        if (!response.ok) {
          throw new Error('Failed to load profile modal');
        }

        const html = await response.text();
        overlay = document.createElement('div');
        overlay.className = 'profile-modal-overlay';
        overlay.id = 'profileModalOverlay';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        ensureStyle('/features/admin/profile/Profile.css');
        await Promise.all([
          ensureScript('/features/admin/profile/AvatarUpload.js'),
          ensureScript('/features/admin/profile/ApplyHeaderAvatar.js'),
          ensureScript('/features/admin/profile/Profile.js'),
        ]);

        overlay.addEventListener('click', (overlayEvent) => {
          if (overlayEvent.target === overlay) {
            closeModal(overlay);
          }
        });

        const cancelBtn = overlay.querySelector('#profileModalCancelBtn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            closeModal(overlay);
          });
        }
      } catch (error) {
        console.error('Error launching profile modal:', error);
        return;
      }
    }

    window.initAdminProfile?.(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });
  });

  function closeModal(overlay) {
    overlay.classList.remove('show');
  }
});
