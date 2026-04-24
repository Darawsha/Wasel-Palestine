const LIST_SELECTOR = '[data-reports-list]';
const VIEW_COPY_SELECTOR = '[data-reports-view-copy]';
const VIEW_TABS_SELECTOR = '[data-reports-view]';
const STATUS_NAV_SELECTOR = '[data-reports-status-nav]';
const STATUS_TABS_SELECTOR = '[data-report-status-tab]';
const PAGINATION_INFO_SELECTOR = '[data-reports-pagination-info]';
const PAGINATION_CONTROLS_SELECTOR = '[data-reports-pagination-controls]';
const COMMUNITY_REFRESH_SELECTOR = '[data-community-refresh-location]';

const MAX_VISIBLE_PAGES = 5;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildEmptyCard(message, description) {
  return `
    <article class="report-card report-card-empty">
      <div class="card-content">
        <h3 class="card-title-empty">${escapeHtml(message)}</h3>
        <p class="card-description">${escapeHtml(description)}</p>
      </div>
    </article>
  `;
}

function buildImagePlaceholder(report) {
  return `
    <div class="card-image">
      <div class="card-image-placeholder ${escapeHtml(report.categoryBadgeClass)}">
        <span class="material-symbols-outlined">${escapeHtml(report.categoryIcon)}</span>
        <span>${escapeHtml(report.categoryLabel)}</span>
      </div>
    </div>
  `;
}

function buildDuplicateBadge(report) {
  if (!report.isDuplicate) {
    return '';
  }

  return `
    <span class="report-mini-badge">
      Similar to #${escapeHtml(report.duplicateOf)}
    </span>
  `;
}

function buildMyReportCard(report) {
  const actionsMarkup = `
    <div class="report-actions">
      <button
        class="btn-outline report-action-btn report-action-btn-primary"
        type="button"
        data-report-action="view-details"
        data-report-id="${escapeHtml(report.id)}"
      >
        View Details
      </button>
      ${
        report.canManage
          ? `
            <button
              class="btn-outline report-action-btn"
              type="button"
              data-report-action="edit-report"
              data-report-id="${escapeHtml(report.id)}"
            >
              Edit
            </button>
            <button
              class="btn-outline report-action-btn report-action-btn-danger"
              type="button"
              data-report-action="delete-report"
              data-report-id="${escapeHtml(report.id)}"
            >
              Delete
            </button>
          `
          : ''
      }
    </div>
  `;

  return `
    <article class="report-card">
      <div class="card-inner">
        ${buildImagePlaceholder(report)}
        <div class="card-content">
          <div class="card-header">
            <div class="title-group">
              <span class="material-symbols-outlined icon-fill">${escapeHtml(report.categoryIcon)}</span>
              <h3>${escapeHtml(report.title)}</h3>
              <span class="status-pill ${escapeHtml(report.statusClass)}">${escapeHtml(report.statusLabel)}</span>
              ${buildDuplicateBadge(report)}
            </div>
            <div class="credibility-score ${escapeHtml(report.confidenceToneClass)}">
              <span class="material-symbols-outlined icon-fill">verified_user</span>
              <span>${escapeHtml(report.confidenceLabel)}</span>
            </div>
          </div>
          <p class="card-description">${escapeHtml(report.description)}</p>
          <div class="card-meta">
            <span class="meta-item">
              <span class="material-symbols-outlined">location_on</span>
              ${escapeHtml(report.location)}
            </span>
            <span class="meta-item">
              <span class="material-symbols-outlined">schedule</span>
              ${escapeHtml(report.relativeTime)}
            </span>
            <span class="meta-item">
              <span class="material-symbols-outlined">calendar_today</span>
              ${escapeHtml(report.createdAtLabel)}
            </span>
          </div>
          ${actionsMarkup}
        </div>
      </div>
    </article>
  `;
}

function buildCommunityReportCard(report) {
  const upVoteCount = report.interactionSummary.upVotes;
  const downVoteCount = report.interactionSummary.downVotes;
  const hasUpVoted = report.interactionSummary.userVoteType === 'UP';
  const hasDownVoted = report.interactionSummary.userVoteType === 'DOWN';
  const votingDisabled = !report.canVote;
  const ownerVoteMessage = report.isOwnReport
    ? 'You cannot vote on your own report.'
    : '';
  const upVoteTitle = ownerVoteMessage || (hasUpVoted ? 'You already upvoted this report.' : '');
  const downVoteTitle = ownerVoteMessage || (hasDownVoted ? 'You already downvoted this report.' : '');
  const upVoteTooltip = upVoteTitle
    ? `title="${escapeHtml(upVoteTitle)}" data-tooltip="${escapeHtml(upVoteTitle)}"`
    : '';
  const downVoteTooltip = downVoteTitle
    ? `title="${escapeHtml(downVoteTitle)}" data-tooltip="${escapeHtml(downVoteTitle)}"`
    : '';

  return `
    <article class="report-card">
      <div class="card-inner">
        ${buildImagePlaceholder(report)}
        <div class="card-content">
          <div class="card-header">
            <div class="title-group">
              <span class="material-symbols-outlined icon-fill">${escapeHtml(report.categoryIcon)}</span>
              <h3>${escapeHtml(report.title)}</h3>
              <span class="report-state-pill ${escapeHtml(report.stateClass)}">${escapeHtml(report.stateLabel)}</span>
              <span class="status-pill ${escapeHtml(report.statusClass)}">${escapeHtml(report.statusLabel)}</span>
              ${report.isOwnReport ? '<span class="report-mini-badge">Your report</span>' : ''}
            </div>
            <div class="community-reporter">
              <span class="reporter-avatar">${escapeHtml(report.reporterInitials)}</span>
              <span>${escapeHtml(report.reporterName)}</span>
            </div>
          </div>
          <p class="card-description">${escapeHtml(report.description)}</p>
          <div class="card-meta">
            <span class="meta-item">
              <span class="material-symbols-outlined">location_on</span>
              ${escapeHtml(report.location)}
            </span>
            <span class="meta-item">
              <span class="material-symbols-outlined">schedule</span>
              ${escapeHtml(report.relativeTime)}
            </span>
            <span class="meta-item">
              <span class="material-symbols-outlined">verified_user</span>
              ${escapeHtml(report.confidenceLabel)}
            </span>
          </div>
          <div class="community-actions">
            <button
              class="btn-outline community-action-btn community-action-btn-neutral"
              type="button"
              data-report-action="view-details"
              data-report-id="${escapeHtml(report.id)}"
            >
              <span class="material-symbols-outlined">visibility</span>
              View Details
            </button>
            <button
              class="btn-outline community-action-btn community-action-btn-neutral"
              type="button"
              data-report-action="view-history"
              data-report-id="${escapeHtml(report.id)}"
            >
              <span class="material-symbols-outlined">history</span>
              History
            </button>
            <span class="vote-action-wrapper" ${upVoteTooltip}>
              <button
                class="btn-outline community-action-btn vote-up${hasUpVoted ? ' is-active' : ''}"
                type="button"
                data-report-action="upvote"
                data-report-id="${escapeHtml(report.id)}"
                title="${escapeHtml(upVoteTitle)}"
                ${votingDisabled || hasUpVoted ? 'disabled' : ''}
              >
                <span class="material-symbols-outlined">thumb_up</span>
                Upvote (${escapeHtml(upVoteCount)})
              </button>
            </span>
            <span class="vote-action-wrapper" ${downVoteTooltip}>
              <button
                class="btn-outline community-action-btn vote-down${hasDownVoted ? ' is-active' : ''}"
                type="button"
                data-report-action="downvote"
                data-report-id="${escapeHtml(report.id)}"
                title="${escapeHtml(downVoteTitle)}"
                ${votingDisabled || hasDownVoted ? 'disabled' : ''}
              >
                <span class="material-symbols-outlined">thumb_down</span>
                Downvote (${escapeHtml(downVoteCount)})
              </button>
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function buildPageSequence(currentPage, totalPages) {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

function createPageButton(label, page, isActive, isDisabled, view, kind = 'page') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    kind === 'nav'
      ? 'btn-outline pagination-nav'
      : `page-num${isActive ? ' active' : ''}`;
  button.textContent = label;
  button.disabled = Boolean(isDisabled);

  if (Number.isFinite(page)) {
    button.dataset.reportsPage = String(page);
    button.dataset.reportsPageView = view;
  }

  return button;
}

export function renderReportsChrome(root, state) {
  if (!root || !state) {
    return;
  }

  root.querySelectorAll(VIEW_TABS_SELECTOR).forEach((button) => {
    button.classList.toggle('active', button.dataset.reportsView === state.view);
  });

  root.querySelectorAll(STATUS_TABS_SELECTOR).forEach((button) => {
    button.classList.toggle(
      'active',
      state.view === 'my' && button.dataset.reportStatusTab === state.myReports.tab,
    );
  });

  const statusNav = root.querySelector(STATUS_NAV_SELECTOR);
  if (statusNav) {
    statusNav.hidden = state.view !== 'my';
  }

  const refreshButton = root.querySelector(COMMUNITY_REFRESH_SELECTOR);
  if (refreshButton) {
    refreshButton.hidden = state.view !== 'community';
  }

  const copyElement = root.querySelector(VIEW_COPY_SELECTOR);
  if (!copyElement) {
    return;
  }

  if (state.view === 'my') {
    copyElement.textContent =
      'Track your submitted reports, grouped by moderation outcome.';
    return;
  }

  const locationStatus = state.community.location.status;
  if (locationStatus === 'ready') {
    copyElement.textContent =
      'Nearby public community reports are shown using your current location.';
    return;
  }

  if (locationStatus === 'denied') {
    copyElement.textContent =
      'Location access is off, so you are seeing recent public community reports across the network.';
    return;
  }

  if (locationStatus === 'error') {
    copyElement.textContent =
      'Location lookup failed, so the feed fell back to recent public community reports.';
    return;
  }

  copyElement.textContent =
    'See public community reports and help strengthen community credibility before moderation is finalized.';
}

export function renderReportsLoading(root, state, message) {
  renderReportsChrome(root, state);

  const list = root?.querySelector(LIST_SELECTOR);
  const info = root?.querySelector(PAGINATION_INFO_SELECTOR);
  const controls = root?.querySelector(PAGINATION_CONTROLS_SELECTOR);
  if (!list) {
    return;
  }

  list.innerHTML = buildEmptyCard(message || 'Loading reports...', 'Please wait a moment.');
  if (info) {
    info.textContent = 'Loading reports...';
  }
  if (controls) {
    controls.innerHTML = '';
  }
}

export function renderReportsError(root, state, message) {
  renderReportsChrome(root, state);

  const list = root?.querySelector(LIST_SELECTOR);
  const info = root?.querySelector(PAGINATION_INFO_SELECTOR);
  const controls = root?.querySelector(PAGINATION_CONTROLS_SELECTOR);
  if (!list) {
    return;
  }

  list.innerHTML = buildEmptyCard(
    message || 'Unable to load reports.',
    'Try again in a few moments.',
  );
  if (info) {
    info.textContent = 'Showing 0 reports';
  }
  if (controls) {
    controls.innerHTML = '';
  }
}

function renderList(root, cardsHtml) {
  const list = root?.querySelector(LIST_SELECTOR);
  if (!list) {
    return;
  }

  list.innerHTML = cardsHtml;
}

function renderPagination(root, meta = {}, view) {
  const info = root?.querySelector(PAGINATION_INFO_SELECTOR);
  const controls = root?.querySelector(PAGINATION_CONTROLS_SELECTOR);
  if (!info || !controls) {
    return;
  }

  const total = Math.max(Number(meta.total) || 0, 0);
  const page = Math.max(Number(meta.page) || 1, 1);
  const limit = Math.max(Number(meta.limit) || 1, 1);
  const totalPages = Math.max(Number(meta.totalPages) || 0, total > 0 ? Math.ceil(total / limit) : 0);

  if (total === 0) {
    info.textContent =
      view === 'community'
        ? 'Showing 0 community reports'
        : 'Showing 0 reports';
    controls.innerHTML = '';
    return;
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(start + limit - 1, total);

  info.textContent =
    view === 'community'
      ? `Showing ${start}-${end} of ${total} community reports`
      : `Showing ${start}-${end} of ${total} reports`;

  controls.innerHTML = '';

  if (totalPages <= 1) {
    return;
  }

  const fragment = document.createDocumentFragment();

  fragment.appendChild(
    createPageButton('Previous', page - 1, false, page <= 1, view, 'nav'),
  );

  buildPageSequence(page, totalPages).forEach((item) => {
    if (item === 'ellipsis') {
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '...';
      fragment.appendChild(span);
      return;
    }

    fragment.appendChild(
      createPageButton(String(item), item, item === page, false, view),
    );
  });

  fragment.appendChild(
    createPageButton('Next', page + 1, false, totalPages === 0 || page >= totalPages, view, 'nav'),
  );

  controls.appendChild(fragment);
}

function renderMyReportsTabs(root, counts = {}) {
  root.querySelectorAll(STATUS_TABS_SELECTOR).forEach((button) => {
    const tabKey = button.dataset.reportStatusTab;
    const countElement = button.querySelector('.badge-count');
    if (!countElement) {
      return;
    }

    const value = Math.max(Number(counts?.[tabKey]) || 0, 0);
    countElement.textContent = String(value);
    countElement.classList.toggle('muted', !button.classList.contains('active'));
  });
}

export function renderMyReports(root, state, reports) {
  renderReportsChrome(root, state);
  renderMyReportsTabs(root, state?.myReports?.counts);

  if (!Array.isArray(reports) || reports.length === 0) {
    renderList(
      root,
      buildEmptyCard(
        'No reports in this tab yet.',
        'Submit a report or switch tabs to see other moderation outcomes.',
      ),
    );
  } else {
    renderList(root, reports.map(buildMyReportCard).join(''));
  }

  renderPagination(root, state?.myReports?.meta, 'my');
}

export function renderCommunityReports(root, state, reports) {
  renderReportsChrome(root, state);

  if (!Array.isArray(reports) || reports.length === 0) {
    renderList(
      root,
      buildEmptyCard(
        'No public community reports found right now.',
        'Try refreshing the nearby feed or check back shortly.',
      ),
    );
  } else {
    renderList(root, reports.map(buildCommunityReportCard).join(''));
  }

  renderPagination(root, state?.community?.meta, 'community');
}
