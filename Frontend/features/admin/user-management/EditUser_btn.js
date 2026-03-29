function fillEditUserForm(overlay, user) {
  const form = overlay?.querySelector('#editUserForm');
  if (!form || !user) {
    return;
  }

  form.querySelector('#editFirstName').value = user.firstname || '';
  form.querySelector('#editLastName').value = user.lastname || '';
  form.querySelector('#editUserEmail').value = user.email || '';
  form.querySelector('#editUserPassword').value = '';
  form.querySelector('#editUserRole').value = user.role || 'citizen';
  form.querySelector('#editUserPhone').value = user.phone || '';
  form.querySelector('#editUserAddress').value = user.address || '';
}

function closeModal(overlay) {
  overlay.classList.remove('show');
}

async function ensureEditUserOverlay() {
  let overlay = document.getElementById('editUserOverlay');

  if (overlay) {
    return overlay;
  }

  const response = await fetch('/features/admin/user-management/EditUser.html');
  if (!response.ok) {
    throw new Error('Failed to load Edit User modal');
  }

  const html = await response.text();

  overlay = document.createElement('div');
  overlay.className = 'edit-user-overlay';
  overlay.id = 'editUserOverlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  if (!document.querySelector('link[href*="EditUser.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/features/admin/user-management/EditUser.css?v=' + new Date().getTime();
    document.head.appendChild(link);
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal(overlay);
    }
  });

  const closeButton = overlay.querySelector('#editUserCloseBtn');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeModal(overlay);
    });
  }

  const cancelButton = overlay.querySelector('#editUserCancelBtn');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      closeModal(overlay);
    });
  }

  return overlay;
}

export async function openEditUserModal(user) {
  if (!user?.id) {
    return;
  }

  const overlay = await ensureEditUserOverlay();
  fillEditUserForm(overlay, user);

  const { bindEditUserSave } = await import('/features/admin/user-management/update_btn.js');
  bindEditUserSave(overlay, {
    user,
    onClose: () => closeModal(overlay),
  });

  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
}
