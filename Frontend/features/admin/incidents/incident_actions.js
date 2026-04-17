import { confirmAndDeleteIncident } from '/features/admin/incidents/delete_btn.js';
import { openEditIncidentModal } from '/features/admin/incidents/EditIncident_btn.js';
import { openIncidentHistoryModal } from '/features/admin/incidents/IncidentHistoryModal.js';

const ACTION_MENU_ID = 'incident-actions-floating-menu';

let menuRoot = null;
let activeTrigger = null;
let actionContext = {
  getIncidentById: null,
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
  menuRoot.className = 'incident-actions-floating-menu';
  menuRoot.innerHTML = `
    <button class="dropdown-item" type="button" data-incident-action="edit" data-incident-edit-action>
      <span class="material-symbols-outlined">edit</span>
      Update incident
    </button>
    <button class="dropdown-item" type="button" data-incident-action="history">
      <span class="material-symbols-outlined">history</span>
      History
    </button>
    <button class="dropdown-item text-danger" type="button" data-incident-action="delete" data-incident-delete-action>
      <span class="material-symbols-outlined">delete</span>
      Delete incident
    </button>
    
  `;

  menuRoot.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-incident-action]');
    if (!actionButton) {
      return;
    }

    const incidentId = Number(menuRoot.dataset.incidentId);
    const incident = actionContext.getIncidentById?.(incidentId);
    closeActionMenu();

    if (!incident) {
      return;
    }

    if (actionButton.dataset.incidentAction === 'edit') {
      await openEditIncidentModal(incident);
      return;
    }

    if (actionButton.dataset.incidentAction === 'history') {
      await openIncidentHistoryModal(incident);
      return;
    }

    if (actionButton.dataset.incidentAction === 'delete') {
      await confirmAndDeleteIncident(incident);
    }

  });

  document.body.appendChild(menuRoot);

  if (!document.body.dataset.incidentActionsDocumentBound) {
    document.addEventListener('click', (event) => {
      if (
        event.target.closest('[data-incident-actions-trigger]') ||
        event.target.closest(`#${ACTION_MENU_ID}`)
      ) {
        return;
      }

      closeActionMenu();
    });

    window.addEventListener('resize', closeActionMenu);
    window.addEventListener('scroll', closeActionMenu, true);
    document.body.dataset.incidentActionsDocumentBound = 'true';
  }

  return menuRoot;
}

function updatePendingActions(incident) {
  const menu = ensureActionMenu();
  void incident;

  menu.querySelectorAll('[data-incident-edit-action], [data-incident-delete-action]').forEach((button) => {
    button.hidden = false;
  });
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

export function bindIncidentActionMenus(root, options = {}) {
  if (!root) {
    return;
  }

  actionContext = {
    getIncidentById: options.getIncidentById,
  };

  ensureActionMenu();

  if (root.dataset.incidentActionsBound === 'true') {
    return;
  }

  root.dataset.incidentActionsBound = 'true';

  root.addEventListener('click', (event) => {
    const triggerButton = event.target.closest('[data-incident-actions-trigger]');
    if (!triggerButton || !root.contains(triggerButton)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const incidentId = Number(triggerButton.dataset.incidentId);
    if (!Number.isFinite(incidentId)) {
      return;
    }

    if (activeTrigger === triggerButton && menuRoot?.classList.contains('show')) {
      closeActionMenu();
      return;
    }

    closeActionMenu();

    const menu = ensureActionMenu();
    menu.dataset.incidentId = String(incidentId);
    updatePendingActions(actionContext.getIncidentById?.(incidentId));
    activeTrigger = triggerButton;
    activeTrigger.classList.add('is-open');
    activeTrigger.setAttribute('aria-expanded', 'true');
    positionActionMenu(triggerButton);
  });
}
