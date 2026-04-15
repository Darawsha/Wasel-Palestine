(function (global) {
  const PAGE_SELECTOR = '#spa-page-alerts';
  const LIST_SELECTOR = '[data-alert-subscription-list]';
  const SUMMARY_SELECTOR = '[data-alert-summary-count]';
  const MODAL_FORM_SELECTOR = '[data-alert-subscription-form]';
  const MODAL_TITLE_SELECTOR = '[data-alert-modal-title]';
  const MODAL_LOCATION_SELECTOR = '[data-alert-location-input]';
  const MODAL_CATEGORY_SELECTOR = '[data-alert-category-input]';
  const MODAL_FEEDBACK_SELECTOR = '[data-alert-form-feedback]';
  const MODAL_SAVE_BUTTON_SELECTOR = '[data-alert-save-button]';
  const DELETE_CONFIRM_HTML = '/features/citizen/alerts/DeleteSubscription.html';
  const DELETE_CONFIRM_CSS = '/features/citizen/alerts/DeleteSubscription.css';
  const DELETE_CONFIRM_OVERLAY_ID = 'alertDeleteConfirmOverlay';
  const NOTIFICATION_REFRESH_EVENT = 'user-notifications:refresh';
  const AUTO_REFRESH_MS = 30000;

  let dependenciesPromise = null;
  let loadRequestId = 0;
  let actionInFlight = false;
  let deleteModalHandlersBound = false;
  let autoRefreshStarted = false;
  let state = {
    subscriptions: [],
  };

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function notify(type, message) {
    if (type === 'error' && typeof global.showError === 'function') {
      global.showError(message);
      return;
    }

    if (type === 'success' && typeof global.showSuccess === 'function') {
      global.showSuccess(message);
      return;
    }

    if (type === 'warning' && typeof global.showWarning === 'function') {
      global.showWarning(message);
      return;
    }

    if (typeof global.showInfo === 'function') {
      global.showInfo(message);
      return;
    }

    global.alert(message);
  }

  function notifyNotificationCenter() {
    global.dispatchEvent(
      new CustomEvent(NOTIFICATION_REFRESH_EVENT, {
        detail: {
          source: 'alert-subscription-created',
          timestamp: Date.now(),
        },
      }),
    );
  }

  function ensureStyle(href) {
    const existing = document.querySelector(
      'link[rel="stylesheet"][href="' + href + '"]',
    );
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.resolve().then(() =>
        import('/Controllers/alerts.controller.js'),
      );
    }

    return dependenciesPromise;
  }

  function findSubscription(subscriptionKey) {
    return state.subscriptions.find(
      (subscription) => subscription.key === subscriptionKey,
    );
  }

  function getOrCreateDeleteConfirmOverlay() {
    let overlay = document.getElementById(DELETE_CONFIRM_OVERLAY_ID);
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = DELETE_CONFIRM_OVERLAY_ID;
    overlay.className = 'alert-delete-overlay hidden';
    overlay.innerHTML = '<div class="alert-delete-modal-content"></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeDeleteConfirmModal() {
    const overlay = document.getElementById(DELETE_CONFIRM_OVERLAY_ID);
    if (!overlay) {
      return;
    }

    const content = overlay.querySelector('.alert-delete-modal-content');
    overlay.classList.add('hidden');

    if (content) {
      content.innerHTML = '';
    }
  }

  function bindDeleteConfirmHandlers(overlay) {
    if (deleteModalHandlersBound) {
      return;
    }

    overlay.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const cancelButton = target.closest('[data-delete-subscription-cancel]');
      const confirmButton = target.closest('[data-delete-subscription-confirm]');

      if (confirmButton) {
        overlay.dataset.pendingAction = 'confirm';
        closeDeleteConfirmModal();
        return;
      }

      if (cancelButton || target === overlay) {
        overlay.dataset.pendingAction = 'cancel';
        closeDeleteConfirmModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      const currentOverlay = document.getElementById(DELETE_CONFIRM_OVERLAY_ID);
      if (!currentOverlay || currentOverlay.classList.contains('hidden')) {
        return;
      }

      if (event.key === 'Escape') {
        currentOverlay.dataset.pendingAction = 'cancel';
        closeDeleteConfirmModal();
      }
    });

    deleteModalHandlersBound = true;
  }

  async function openDeleteConfirmModal(subscription) {
    const overlay = getOrCreateDeleteConfirmOverlay();
    const content = overlay.querySelector('.alert-delete-modal-content');
    if (!content) {
      return false;
    }

    ensureStyle(DELETE_CONFIRM_CSS);

    try {
      overlay.dataset.pendingAction = '';
      const response = await fetch(DELETE_CONFIRM_HTML);
      if (!response.ok) {
        throw new Error(
          'Failed to load delete subscription modal: ' + response.status,
        );
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const deleteRoot =
        doc.querySelector('.modal-overlay') ||
        doc.querySelector('.modal') ||
        doc.querySelector('main') ||
        doc.body;

      content.innerHTML = deleteRoot
        ? '<div class="alert-delete-page-scope">' + deleteRoot.outerHTML + '</div>'
        : html;

      const scopeRoot = content.querySelector('.alert-delete-page-scope');
      if (
        scopeRoot &&
        global.localStorage?.getItem('darkmode') === 'enabled'
      ) {
        scopeRoot.classList.add('dark');
      }

      const messageElement = content.querySelector(
        '[data-delete-subscription-message]',
      );
      if (messageElement) {
        messageElement.textContent =
          `Are you sure you want to delete the alert subscription for "${subscription.location}"?`;
      }

      overlay.classList.remove('hidden');
      bindDeleteConfirmHandlers(overlay);

      return await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (!overlay.classList.contains('hidden')) {
            return;
          }

          observer.disconnect();
          resolve(overlay.dataset.pendingAction === 'confirm');
        });

        observer.observe(overlay, {
          attributes: true,
          attributeFilter: ['class'],
        });
      });
    } catch (error) {
      console.error('Error opening delete subscription modal:', error);
      return false;
    }
  }

  function updateSummary(root) {
    const summaryLabel = root.querySelector(SUMMARY_SELECTOR);
    if (!summaryLabel) {
      return;
    }

    const subscriptionCount = state.subscriptions.length;
    const suffix = subscriptionCount === 1 ? '' : 's';
    summaryLabel.textContent = `${subscriptionCount} active subscription${suffix}`;
  }

  function renderStatusCard(root, title, message) {
    const list = root.querySelector(LIST_SELECTOR);
    if (!list) {
      return;
    }

    list.innerHTML = `
      <article class="subscription-card subscription-card--status">
        <div class="card-body">
          <p class="category-label">${escapeHtml(title)}</p>
          <div>
            <h3 class="region-name">${escapeHtml(message)}</h3>
          </div>
        </div>
      </article>
    `;
  }

  function buildCategoryBadges(categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
      return '<p class="subscription-status-copy">No categories selected.</p>';
    }

    return categories
      .map((category) => {
        return `<span class="badge ${escapeHtml(category.badgeClass)}">${escapeHtml(category.label)}</span>`;
      })
      .join('');
  }

  function getMatchSourceLabel(sourceType) {
    switch (String(sourceType || '').toLowerCase()) {
      case 'checkpoint':
        return 'Checkpoint';
      case 'report':
        return 'Approved Report';
      default:
        return 'Incident';
    }
  }

  async function openIncidentMatchDetails(matchId) {
    const incidentId = Number(matchId);

    if (!Number.isFinite(incidentId) || incidentId <= 0) {
      return;
    }

    try {
      if (typeof global.CitizenIncidentDetails?.openViewIncidentDetails !== 'function') {
        await import('/features/citizen/incidents/viewIncidentsDetails.js');
      }

      const openDetails = global.CitizenIncidentDetails?.openViewIncidentDetails;

      if (typeof openDetails !== 'function') {
        notify('error', 'Incident details are unavailable right now.');
        return;
      }

      await openDetails(incidentId);
    } catch (error) {
      console.error('Unable to open incident match details.', error);
      notify('error', 'Incident details are unavailable right now.');
    }
  }

  function getSharedModalElements() {
    const modal = document.getElementById('modalOverlay');
    const modalContent = modal?.querySelector('.modalContent');

    if (!modal || !modalContent) {
      return null;
    }

    return {
      modal,
      modalContent,
    };
  }

  function openSharedModalMarkup(markup, options = {}) {
    const modalElements = getSharedModalElements();
    if (!modalElements) {
      return;
    }

    const { modal, modalContent } = modalElements;

    modalContent.innerHTML = markup;
    modal.classList.remove('hidden');

    const closeModal = () => {
      modal.classList.add('hidden');
      modalContent.innerHTML = '';
    };

    modal.onclick = (event) => {
      if (event.target === modal) {
        closeModal();
      }
    };

    const closeButton = modalContent.querySelector('[data-alert-details-close]');
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }

    if (typeof options.onMounted === 'function') {
      options.onMounted({
        modal,
        modalContent,
        closeModal,
      });
    }
  }

  async function openReportMatchDetails(matchId) {
    const reportId = Number(matchId);

    if (!Number.isFinite(reportId) || reportId <= 0) {
      return;
    }

    try {
      const { loadReportDetails } = await import('/Controllers/reports.controller.js');
      const report = await loadReportDetails(reportId);

      openSharedModalMarkup(`
        <div class="alert-report-details-scope">
          <div class="alert-report-details-card">
            <div class="alert-report-details-header">
              <div>
                <p class="alert-report-details-kicker">Report Details</p>
                <h3 class="alert-report-details-title">${escapeHtml(report.title || 'Report')}</h3>
              </div>
              <button
                type="button"
                class="alert-report-details-close"
                data-alert-details-close
                aria-label="Close details"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="alert-report-details-chip-row">
              <span class="status-pill ${escapeHtml(report.statusClass || 'pending')}">${escapeHtml(report.statusLabel || 'Pending')}</span>
              <span class="alert-report-details-chip">${escapeHtml(report.categoryLabel || 'Report')}</span>
              <span class="alert-report-details-chip">${escapeHtml(report.confidenceLabel || '0% confidence')}</span>
            </div>
            <div class="alert-report-details-grid">
              <article class="alert-report-details-item">
                <h4>Location</h4>
                <p>${escapeHtml(report.location || 'Unknown location')}</p>
              </article>
              <article class="alert-report-details-item">
                <h4>Created</h4>
                <p>${escapeHtml(report.createdAtLabel || 'Unknown date')}</p>
              </article>
              <article class="alert-report-details-item">
                <h4>Updated</h4>
                <p>${escapeHtml(report.updatedAtLabel || 'Unknown date')}</p>
              </article>
              <article class="alert-report-details-item">
                <h4>Reporter</h4>
                <p>${escapeHtml(report.reporterName || 'Community member')}</p>
              </article>
            </div>
            <article class="alert-report-details-description">
              <h4>Description</h4>
              <p>${escapeHtml(report.description || 'No description provided.')}</p>
            </article>
          </div>
        </div>
      `);
    } catch (error) {
      console.error('Unable to open report match details.', error);
      notify('error', 'Report details are unavailable right now.');
    }
  }

  function renderMatchList(matches) {
    if (!Array.isArray(matches) || matches.length === 0) {
      return `
        <div class="match-empty-state">
          No matching checkpoint, incident, or approved report right now. This alert remains active and will keep waiting for future updates.
        </div>
      `;
    }

    return `
      <div class="match-list">
        ${matches
          .map((match) => {
            const summaryMarkup =
              match.sourceType !== 'incident' &&
              String(match.summary || '').trim() &&
              String(match.summary || '').trim() !== String(match.title || '').trim()
                ? `<p class="match-copy">${escapeHtml(match.summary)}</p>`
                : '';
            const actionMarkup = match.canViewDetails
              ? `
                <button
                  class="match-details-link"
                  type="button"
                  data-alert-match-action="view-details"
                  data-alert-match-source="${escapeHtml(match.sourceType)}"
                  data-alert-match-id="${escapeHtml(match.sourceRecordId)}"
                >
                  View details
                </button>
              `
              : `<span class="match-source-copy">${escapeHtml(getMatchSourceLabel(match.sourceType))}</span>`;

            return `
              <article class="match-card match-card--${escapeHtml(match.sourceType)}">
                <div class="match-card-header">
                  <div class="match-type-tag">
                    <span class="material-symbols-outlined ${escapeHtml(match.iconColorClass)}" style="font-variation-settings: 'FILL' 1">
                      ${escapeHtml(match.iconName)}
                    </span>
                    <span class="match-type-label">${escapeHtml(match.categoryLabel)}</span>
                  </div>
                  ${
                    match.priorityBadgeLabel
                      ? `<span class="badge match-priority-badge ${escapeHtml(match.priorityBadgeClass)}">${escapeHtml(match.priorityBadgeLabel)}</span>`
                      : ''
                  }
                </div>
                <h4 class="match-title">${escapeHtml(match.title)}</h4>
                ${summaryMarkup}
                <div class="match-info">
                  <div class="match-info-item">
                    <span class="material-symbols-outlined">location_on</span>
                    ${escapeHtml(match.location)}
                  </div>
                  <div class="match-info-item">
                    <span class="material-symbols-outlined">schedule</span>
                    ${escapeHtml(match.relativeTimeLabel || match.createdAtLabel || 'Just now')}
                  </div>
                </div>
                <div class="match-footer">
                  <span class="match-status-pill ${escapeHtml(match.statusPillClass)}">
                    ${
                      match.statusPillIcon
                        ? `<span class="material-symbols-outlined">${escapeHtml(match.statusPillIcon)}</span>`
                        : '<span class="dot"></span>'
                    }
                    ${escapeHtml(match.statusPillLabel)}
                  </span>
                  ${actionMarkup}
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function buildSubscriptionCard(subscription) {
    const article = document.createElement('article');
    article.className = `subscription-card${subscription.matchCount > 0 ? ' subscription-card--matched' : ''}`;
    article.dataset.subscriptionKey = subscription.key;

    article.innerHTML = `
      <div class="card-top">
        <div class="card-info">
          <div class="icon-box">
            <span class="material-symbols-outlined">map</span>
          </div>
          <div>
            <h3 class="region-name">${escapeHtml(subscription.location)}</h3>
            <p class="region-subtext">Manual location subscription</p>
          </div>
        </div>
      </div>

      <div class="card-body">
        <p class="category-label">Subscribed Categories</p>
        <div class="badge-group">
          ${buildCategoryBadges(subscription.categories)}
        </div>
      </div>

      <div class="match-section">
        <div class="match-section-header">
          <p class="category-label">Current Matches</p>
          <span class="match-count">${escapeHtml(String(subscription.matchCount || 0))} found</span>
        </div>
        ${renderMatchList(subscription.currentMatches)}
      </div>

      <footer class="card-footer">
        <div class="subscription-date">
          <span class="material-symbols-outlined">calendar_today</span>
          <span>Subscribed since: ${escapeHtml(subscription.subscribedSinceLabel)}</span>
        </div>
        <div class="card-actions">
          <button type="button" class="action-edit" data-alert-action="edit">Edit</button>
          <button type="button" class="action-delete" data-alert-action="delete">Delete</button>
        </div>
      </footer>
    `;

    return article;
  }

  function renderSubscriptions(root) {
    const list = root.querySelector(LIST_SELECTOR);
    if (!list) {
      return;
    }

    if (!Array.isArray(state.subscriptions) || state.subscriptions.length === 0) {
      renderStatusCard(
        root,
        'No subscriptions yet',
        'Add a location and categories to start receiving alerts.',
      );
      updateSummary(root);
      return;
    }

    list.innerHTML = '';
    state.subscriptions.forEach((subscription) => {
      list.appendChild(buildSubscriptionCard(subscription));
    });

    updateSummary(root);
  }

  function bindCardActions(root) {
    root
      .querySelectorAll('[data-alert-match-action="view-details"]')
      .forEach((button) => {
        button.addEventListener('click', async () => {
          const matchId = button.getAttribute('data-alert-match-id');
          const matchSource = String(
            button.getAttribute('data-alert-match-source') || '',
          ).toLowerCase();

          if (!matchId) {
            return;
          }

          if (matchSource === 'report') {
            await openReportMatchDetails(matchId);
            return;
          }

          await openIncidentMatchDetails(matchId);
        });
      });

    root.querySelectorAll('[data-alert-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const article = button.closest('[data-subscription-key]');
        const subscription = article
          ? findSubscription(article.dataset.subscriptionKey)
          : null;

        if (!subscription || typeof global.openAlertModal !== 'function') {
          return;
        }

        global.openAlertModal({
          mode: 'edit',
          subscription,
        });
      });
    });

    root.querySelectorAll('[data-alert-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (actionInFlight) {
          return;
        }

        const article = button.closest('[data-subscription-key]');
        const subscription = article
          ? findSubscription(article.dataset.subscriptionKey)
          : null;

        if (!subscription) {
          return;
        }

        const confirmed = await openDeleteConfirmModal(subscription);

        if (!confirmed) {
          return;
        }

        actionInFlight = true;
        button.disabled = true;

        try {
          const controller = await getDependencies();
          await controller.deleteAlertSubscriptionGroup(subscription);
          notify('success', 'Subscription deleted successfully.');
        } catch (error) {
          const controller = await getDependencies();
          notify(
            'error',
            controller.extractAlertErrorMessage(
              error,
              'Unable to delete the selected subscription.',
            ),
          );
        } finally {
          actionInFlight = false;
          await refreshSubscriptions({ showLoading: false });
        }
      });
    });
  }

  async function refreshSubscriptions(options = {}) {
    const showLoading = options.showLoading !== false;
    const root = getPageRoot();

    if (!root) {
      return;
    }

    const requestId = ++loadRequestId;

    if (showLoading) {
      state.subscriptions = [];
      renderStatusCard(root, 'Loading', 'Loading subscriptions...');
      updateSummary(root);
    }

    try {
      const controller = await getDependencies();
      const subscriptions = await controller.loadAlertSubscriptions();

      if (requestId !== loadRequestId) {
        return;
      }

      state.subscriptions = subscriptions;
      renderSubscriptions(root);
      bindCardActions(root);
    } catch (error) {
      if (requestId !== loadRequestId) {
        return;
      }

      console.error('Failed to load alert subscriptions', error);
      state.subscriptions = [];
      renderStatusCard(
        root,
        'Unable to load subscriptions',
        'Refresh the page or try again in a moment.',
      );
      updateSummary(root);
    }
  }

  function getModalElements(modalContent) {
    return {
      form: modalContent.querySelector(MODAL_FORM_SELECTOR),
      title: modalContent.querySelector(MODAL_TITLE_SELECTOR),
      locationInput: modalContent.querySelector(MODAL_LOCATION_SELECTOR),
      categoryInputs: Array.from(
        modalContent.querySelectorAll(MODAL_CATEGORY_SELECTOR),
      ),
      feedback: modalContent.querySelector(MODAL_FEEDBACK_SELECTOR),
      saveButton: modalContent.querySelector(MODAL_SAVE_BUTTON_SELECTOR),
    };
  }

  function syncSelectedCategoryCards(categoryInputs) {
    categoryInputs.forEach((input) => {
      const card = input.closest('.checkbox-card');
      if (!card) {
        return;
      }

      card.classList.toggle('is-selected', input.checked);
    });
  }

  function setModalFeedback(modalElements, message, type) {
    if (!modalElements.feedback) {
      return;
    }

    const normalizedMessage = String(message || '').trim();

    if (!normalizedMessage) {
      modalElements.feedback.hidden = true;
      modalElements.feedback.textContent = '';
      modalElements.feedback.removeAttribute('data-feedback-type');
      return;
    }

    modalElements.feedback.hidden = false;
    modalElements.feedback.dataset.feedbackType = type || 'error';
    modalElements.feedback.textContent = normalizedMessage;
  }

  function setModalSavingState(modalElements, isSaving) {
    if (modalElements.saveButton) {
      modalElements.saveButton.disabled = isSaving;
      modalElements.saveButton.textContent = isSaving
        ? 'Saving...'
        : modalElements.saveButton.dataset.defaultLabel || 'Save Subscription';
    }

    if (modalElements.locationInput) {
      modalElements.locationInput.disabled = isSaving;
    }

    modalElements.categoryInputs.forEach((input) => {
      input.disabled = isSaving;
    });
  }

  function populateModal(modalElements, context) {
    const isEditMode = context?.mode === 'edit' && context?.subscription;
    const subscription = isEditMode ? context.subscription : null;
    const selectedCategories = new Set(
      Array.isArray(subscription?.categories)
        ? subscription.categories.map((category) => String(category.key || '').trim())
        : [],
    );

    if (modalElements.title) {
      modalElements.title.textContent = isEditMode
        ? 'Edit Alert Subscription'
        : 'Add Alert Subscription';
    }

    if (modalElements.saveButton) {
      modalElements.saveButton.dataset.defaultLabel = isEditMode
        ? 'Save Changes'
        : 'Save Subscription';
      modalElements.saveButton.textContent =
        modalElements.saveButton.dataset.defaultLabel;
    }

    if (modalElements.locationInput) {
      modalElements.locationInput.value = subscription?.location || '';
      modalElements.locationInput.focus();
      modalElements.locationInput.select();
    }

    modalElements.categoryInputs.forEach((input) => {
      input.checked = selectedCategories.has(String(input.value || '').trim());
    });

    syncSelectedCategoryCards(modalElements.categoryInputs);
    setModalFeedback(modalElements, '', 'error');
  }

  async function handleModalSubmit(modalContent, context, closeModal) {
    const controller = await getDependencies();
    const modalElements = getModalElements(modalContent);
    const location = modalElements.locationInput?.value || '';
    const categories = modalElements.categoryInputs
      .filter((input) => input.checked)
      .map((input) => input.value);
    const isEditMode = context?.mode === 'edit' && context?.subscription;

    setModalFeedback(modalElements, '', 'error');
    setModalSavingState(modalElements, true);

    try {
      if (isEditMode) {
        await controller.updateAlertSubscription(context.subscription, {
          location,
          categories,
        });
      } else {
        await controller.createAlertSubscriptions({
          location,
          categories,
        });
        notifyNotificationCenter();
      }

      notify(
        'success',
        isEditMode
          ? 'Subscription updated successfully.'
          : 'Subscription created successfully.',
      );

      closeModal();
      await refreshSubscriptions({ showLoading: false });
    } catch (error) {
      const errorMessage = controller.extractAlertErrorMessage(
        error,
        isEditMode
          ? 'Unable to update the subscription.'
          : 'Unable to create the subscription.',
      );

      notify('error', errorMessage);
      setModalFeedback(modalElements, '', 'error');
    } finally {
      setModalSavingState(modalElements, false);
    }
  }

  function mountModal(options = {}) {
    const modalContent = options.modalContent;
    if (!modalContent) {
      return;
    }

    const modalElements = getModalElements(modalContent);
    if (!modalElements.form) {
      return;
    }

    populateModal(modalElements, options.context);

    modalElements.categoryInputs.forEach((input) => {
      input.addEventListener('change', () => {
        syncSelectedCategoryCards(modalElements.categoryInputs);
        setModalFeedback(modalElements, '', 'error');
      });
    });

    modalElements.locationInput?.addEventListener('input', () => {
      setModalFeedback(modalElements, '', 'error');
    });

    modalElements.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await handleModalSubmit(
        modalContent,
        options.context,
        options.closeAlertModal || (() => {}),
      );
    });

    modalElements.saveButton?.addEventListener('click', () => {
      modalElements.form.requestSubmit();
    });
  }

  async function initializePage() {
    const root = getPageRoot();
    if (!root || root.dataset.alertsInitialized === 'true') {
      return;
    }

    root.dataset.alertsInitialized = 'true';
    startAutoRefresh();
    await refreshSubscriptions();
  }

  function startAutoRefresh() {
    if (autoRefreshStarted) {
      return;
    }

    autoRefreshStarted = true;

    window.setInterval(() => {
      const pageRoot = getPageRoot();

      if (
        pageRoot &&
        pageRoot.dataset.alertsInitialized === 'true' &&
        document.visibilityState === 'visible' &&
        !actionInFlight
      ) {
        void refreshSubscriptions({ showLoading: false });
      }
    }, AUTO_REFRESH_MS);
  }

  function observePageMount() {
    const mountRoot = document.getElementById('flexible_main') || document.body;

    const observer = new MutationObserver(() => {
      if (getPageRoot()?.dataset.alertsInitialized !== 'true') {
        void initializePage();
      }
    });

    observer.observe(mountRoot, {
      childList: true,
      subtree: true,
    });

    if (getPageRoot()) {
      void initializePage();
    }
  }

  global.CitizenAlertsPage = {
    mountModal,
    refreshSubscriptions,
  };

  observePageMount();
})(window);
