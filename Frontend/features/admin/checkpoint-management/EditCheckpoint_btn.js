/**
 * Fills the update form with checkpoint data.
 */
function fillEditCheckpointForm(overlay, checkpoint) {
  const form = overlay?.querySelector('#editCheckpointForm');
  if (!form || !checkpoint) return;

  const nameInput = form.querySelector('#cpName');
  const locationInput = form.querySelector('#cpLocation');
  const statusSelect = form.querySelector('#cpStatus');

  if (nameInput) nameInput.value = checkpoint.name || '';
  if (locationInput) locationInput.value = checkpoint.location || '';
  if (statusSelect) statusSelect.value = checkpoint.status || 'ACTIVE';
}

function closeModal(overlay) {
  overlay.classList.remove('show');
}

/**
 * Ensures the edit checkpoint overlay exists in the DOM.
 */
async function ensureEditCheckpointOverlay() {
  let overlay = document.getElementById('editCheckpointOverlay');
  if (overlay) return overlay;

  try {
    const response = await fetch('/features/admin/checkpoint-management/EditCheckpoint.html');
    if (!response.ok) throw new Error('Failed to load Edit Checkpoint modal');
    const html = await response.text();

    overlay = document.createElement('div');
    overlay.className = 'edit-checkpoint-overlay';
    overlay.id = 'editCheckpointOverlay';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Dynamic stylesheet loading
    if (!document.querySelector('link[href*="EditCheckpoint.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/features/admin/checkpoint-management/EditCheckpoint.css?v=' + new Date().getTime();
      document.head.appendChild(link);
    }

    // Modal Close Events
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay); });
    overlay.querySelector('#editCheckpointCloseBtn')?.addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#editCheckpointCancelBtn')?.addEventListener('click', () => closeModal(overlay));

    return overlay;
  } catch (err) {
    console.error('Error ensuring edit overlay:', err);
    throw err;
  }
}

/**
 * Opens the edit checkpoint modal for the given checkpoint.
 * 
 * @param {Object} checkpoint - The checkpoint object to edit.
 */
export async function openEditCheckpointModal(checkpoint) {
  if (!checkpoint?.id) return;

  try {
    const overlay = await ensureEditCheckpointOverlay();
    fillEditCheckpointForm(overlay, checkpoint);

    // Import and bind the save logic (lazy loaded)
    const { bindEditCheckpointSave } = await import('/features/admin/checkpoint-management/update_btn.js');
    bindEditCheckpointSave(overlay, {
      checkpoint,
      onClose: () => closeModal(overlay),
    });

    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });
  } catch (err) {
    console.error('Failed to open edit modal:', err);
  }
}
