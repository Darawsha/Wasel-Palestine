(function () {
  const initAddCheckpointBtn = () => {
    const addBtn = document.getElementById('addCheckpointBtn');
    if (!addBtn || addBtn.dataset.modalBound === 'true') return;

    addBtn.dataset.modalBound = 'true';

    addBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      let overlay = document.getElementById('addCheckpointOverlay');
      if (!overlay) {
        try {
          const response = await fetch(
            '/features/admin/checkpoint-management/AddCheckpoint.html',
          );
          if (!response.ok)
            throw new Error('Failed to load Add Checkpoint modal');
          const html = await response.text();

          overlay = document.createElement('div');
          overlay.className = 'add-checkpoint-overlay';
          overlay.id = 'addCheckpointOverlay';
          overlay.innerHTML = html;
          document.body.appendChild(overlay);

          if (!document.querySelector('link[href*="AddCheckpoint.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href =
              '/features/admin/checkpoint-management/AddCheckpoint.css?v=' +
              new Date().getTime();
            document.head.appendChild(link);
          }

          // Close Events
          overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) closeModal(overlay);
          });
          overlay
            .querySelector('#addCheckpointCloseBtn')
            ?.addEventListener('click', () => closeModal(overlay));
          overlay
            .querySelector('#addCheckpointCancelBtn')
            ?.addEventListener('click', () => closeModal(overlay));

          const form = overlay.querySelector('#addCheckpointForm');
          if (form) {
            form.addEventListener('submit', async (submitEvent) => {
              submitEvent.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              if (submitBtn) submitBtn.disabled = true;

              try {
                const { createNewCheckpoint } =
                  await import('/Controllers/checkpoint-management.controller.js');
                const {
                  applyValidationErrors,
                  clearValidationErrors,
                  collectCheckpointFormData,
                  validateCheckpointPayload,
                } =
                  await import('/features/admin/checkpoint-management/validation.js');

                clearValidationErrors(form);

                const payload = collectCheckpointFormData(form);
                const validationResult =
                  await validateCheckpointPayload(payload);

                if (!validationResult.isValid) {
                  applyValidationErrors(form, validationResult.errors);
                  if (validationResult.messages[0]) {
                    if (typeof window.showError === 'function')
                      window.showError(validationResult.messages[0]);
                    else alert(validationResult.messages[0]);
                  }
                  return;
                }

                await createNewCheckpoint(payload);

                document.dispatchEvent(
                  new CustomEvent('admin:checkpoint-created', {
                    detail: { timestamp: Date.now() },
                  }),
                );

                if (typeof window.showSuccess === 'function')
                  window.showSuccess('Checkpoint created successfully.');
                else alert('Checkpoint created successfully.');

                closeModal(overlay);
                form.reset();
              } catch (err) {
                console.error('Failed to create checkpoint:', err);
                const errorMsg =
                  err?.response?.data?.message ||
                  'Failed to create checkpoint.';
                if (typeof window.showError === 'function')
                  window.showError(errorMsg);
                else alert(errorMsg);
              } finally {
                if (submitBtn) submitBtn.disabled = false;
              }
            });
          }
        } catch (err) {
          console.error('Error launching create checkpoint modal:', err);
          return;
        }
      }

      requestAnimationFrame(() => {
        overlay.classList.add('show');
      });
    });
  };

  function closeModal(overlay) {
    overlay.classList.remove('show');
  }

  // Initialize immediately for SPA routing
  initAddCheckpointBtn();

  // Also bind to DOMContentLoaded for hard reloads
  document.addEventListener('DOMContentLoaded', initAddCheckpointBtn);
})();
