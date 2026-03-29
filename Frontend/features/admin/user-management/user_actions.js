import { confirmAndDeleteUser } from '/features/admin/user-management/delete_btn.js';
import { openEditUserModal } from '/features/admin/user-management/EditUser_btn.js';

const ACTION_MENU_ID = 'user-actions-floating-menu';

let menuRoot = null;
let activeTrigger = null;
let actionContext = {
  getUserById: null,
};

function closeActionMenu() {
  if (!menuRoot) {
    return;
  }

  menuRoot.classList.remove('show');

  if (activeTrigger) {
    activeTrigger.classList.remove('is-open');
    activeTrigger.setAttribute('aria-expanded', 'false');
  }

  activeTrigger = null;
}

function ensureActionMenu() {
  if (menuRoot) {
    return menuRoot;
  }

  menuRoot = document.createElement('div');
  menuRoot.id = ACTION_MENU_ID;
  menuRoot.className = 'user-actions-floating-menu';
  menuRoot.innerHTML = `
    <button class="dropdown-item" type="button" data-user-action="edit">
      <span class="material-symbols-outlined">edit</span>
      Update user
    </button>
    <button class="dropdown-item text-danger" type="button" data-user-action="delete">
      <span class="material-symbols-outlined">delete</span>
      Delete user
    </button>
  `;

  menuRoot.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-user-action]');
    if (!actionButton) {
      return;
    }

    const userId = Number(menuRoot.dataset.userId);
    const user = actionContext.getUserById?.(userId);
    closeActionMenu();

    if (!user) {
      return;
    }

    if (actionButton.dataset.userAction === 'edit') {
      await openEditUserModal(user);
      return;
    }

    if (actionButton.dataset.userAction === 'delete') {
      await confirmAndDeleteUser(user);
    }
  });

  document.body.appendChild(menuRoot);

  if (!document.body.dataset.userActionsDocumentBound) {
    document.addEventListener('click', (event) => {
      if (
        event.target.closest('[data-user-actions-trigger]') ||
        event.target.closest(`#${ACTION_MENU_ID}`)
      ) {
        return;
      }

      closeActionMenu();
    });

    window.addEventListener('resize', closeActionMenu);
    window.addEventListener('scroll', closeActionMenu, true);
    document.body.dataset.userActionsDocumentBound = 'true';
  }

  return menuRoot;
}

function positionActionMenu(triggerButton) {
  const menu = ensureActionMenu();
  const triggerRect = triggerButton.getBoundingClientRect();

  menu.classList.add('show');
  menu.style.visibility = 'hidden';

  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const left = Math.min(
    Math.max(triggerRect.right - menuWidth, 16),
    window.innerWidth - menuWidth - 16,
  );
  const preferredTop = triggerRect.bottom + 8;
  const top =
    preferredTop + menuHeight > window.innerHeight - 16
      ? Math.max(triggerRect.top - menuHeight - 8, 16)
      : preferredTop;

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = '';
}

export function bindUserActionMenus(root, options = {}) {
  if (!root) {
    return;
  }

  actionContext = {
    getUserById: options.getUserById,
  };

  ensureActionMenu();

  if (root.dataset.userActionsBound === 'true') {
    return;
  }

  root.dataset.userActionsBound = 'true';

  root.addEventListener('click', (event) => {
    const triggerButton = event.target.closest('[data-user-actions-trigger]');
    if (!triggerButton || !root.contains(triggerButton)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const userId = Number(triggerButton.dataset.userId);
    if (!Number.isFinite(userId)) {
      return;
    }

    if (activeTrigger === triggerButton && menuRoot?.classList.contains('show')) {
      closeActionMenu();
      return;
    }

    closeActionMenu();

    const menu = ensureActionMenu();
    menu.dataset.userId = String(userId);
    activeTrigger = triggerButton;
    activeTrigger.classList.add('is-open');
    activeTrigger.setAttribute('aria-expanded', 'true');
    positionActionMenu(triggerButton);
  });
}
