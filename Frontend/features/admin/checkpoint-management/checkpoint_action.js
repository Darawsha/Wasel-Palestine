import { confirmAndDeleteCheckpoint } from '/features/admin/checkpoint-management/delete_btn.js';
import { openEditCheckpointModal } from '/features/admin/checkpoint-management/EditCheckpoint_btn.js';
import { openCheckpointHistoryModal } from '/features/admin/checkpoint-management/CheckpointHistoryModal.js';

const ACTION_MENU_ID = 'checkpoint-actions-floating-menu';

let menuRoot = null;
let activeTrigger = null;
let actionContext = {
  getCheckpointById: null,
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
  menuRoot.className = 'checkpoint-actions-floating-menu';
  menuRoot.innerHTML = `
    <button class="dropdown-item" type="button" data-checkpoint-action="edit" data-checkpoint-edit-action>
      <span class="material-symbols-outlined">edit</span>
      Update checkpoint
    </button>
    <button class="dropdown-item" type="button" data-checkpoint-action="history">
      <span class="material-symbols-outlined">history</span>
      History
    </button>
    <button class="dropdown-item text-danger" type="button" data-checkpoint-action="delete" data-checkpoint-delete-action>
      <span class="material-symbols-outlined">delete</span>
      Delete checkpoint
    </button>
  `;

  menuRoot.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-checkpoint-action]');
    if (!actionButton) {
      return;
    }

    const checkpointId = Number(menuRoot.dataset.checkpointId);
    const checkpoint = actionContext.getCheckpointById?.(checkpointId);
    closeActionMenu();

    if (!checkpoint) {
      return;
    }

    const action = actionButton.dataset.checkpointAction;
    if (action === 'edit') {
      await openEditCheckpointModal(checkpoint);
    } else if (action === 'delete') {
      await confirmAndDeleteCheckpoint(checkpoint);
    } else if (action === 'history') {
      await openCheckpointHistoryModal(checkpoint);
    }
  });

  document.body.appendChild(menuRoot);

  if (!document.body.dataset.checkpointActionsDocumentBound) {
    document.addEventListener('click', (event) => {
      if (
        event.target.closest('[data-checkpoint-actions-trigger]') ||
        event.target.closest(`#${ACTION_MENU_ID}`)
      ) {
        return;
      }
      closeActionMenu();
    });

    window.addEventListener('resize', closeActionMenu);
    window.addEventListener('scroll', closeActionMenu, true);
    document.body.dataset.checkpointActionsDocumentBound = 'true';
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
    window.innerWidth - menuWidth - 16
  );

  const preferredTop = triggerRect.bottom + 8;
  const top = (preferredTop + menuHeight > window.innerHeight - 16)
    ? Math.max(triggerRect.top - menuHeight - 8, 16)
    : preferredTop;

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = '';
}

function updatePendingActions(checkpoint) {
  const menu = ensureActionMenu();
  void checkpoint;

  menu.querySelectorAll('[data-checkpoint-edit-action], [data-checkpoint-delete-action]').forEach((button) => {
    button.hidden = false;
  });
}

export function bindCheckpointActionMenus(root, options = {}) {
  if (!root) return;

  actionContext = {
    getCheckpointById: options.getCheckpointById,
  };

  ensureActionMenu();

  if (root.dataset.checkpointActionsBound === 'true') {
    return;
  }

  root.dataset.checkpointActionsBound = 'true';

  root.addEventListener('click', (event) => {
    const triggerButton = event.target.closest('[data-checkpoint-actions-trigger]');
    if (!triggerButton || !root.contains(triggerButton)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const checkpointId = Number(triggerButton.dataset.checkpointId);
    if (!Number.isFinite(checkpointId)) {
      return;
    }

    if (activeTrigger === triggerButton && menuRoot?.classList.contains('show')) {
      closeActionMenu();
      return;
    }

    closeActionMenu();

    const menu = ensureActionMenu();
    menu.dataset.checkpointId = String(checkpointId);
    updatePendingActions(actionContext.getCheckpointById?.(checkpointId));
    activeTrigger = triggerButton;
    activeTrigger.classList.add('is-open');
    activeTrigger.setAttribute('aria-expanded', 'true');
    positionActionMenu(triggerButton);
  });
}
