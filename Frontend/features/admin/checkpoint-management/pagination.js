// pagination.js (Checkpoint Management)

const PAGINATION_CONTROLS_SELECTOR = '[data-checkpoint-pagination-controls]';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_VISIBLE_PAGES = 5;

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function clampPage(page, totalPages) {
  if (totalPages <= 0) return DEFAULT_PAGE;
  return Math.min(
    Math.max(normalizePositiveInteger(page, DEFAULT_PAGE), DEFAULT_PAGE),
    totalPages,
  );
}

function buildPageSequence(currentPage, totalPages) {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [
      1,
      'ellipsis',
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ];
}

function createPageButton(label, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-page${options.textOnly ? ' text-only' : ''}${options.active ? ' active' : ''}`;
  button.textContent = label;
  button.disabled = Boolean(options.disabled);
  if (options.page) {
    button.dataset.page = String(options.page);
  }
  return button;
}

function createEllipsis() {
  const ellipsis = document.createElement('span');
  ellipsis.className = 'page-ellipsis';
  ellipsis.textContent = '...';
  return ellipsis;
}

/**
 * Renders the pagination controls.
 *
 * @param {HTMLElement} rootParent - The container for the pagination controls.
 * @param {Object} options - Pagination options (currentPage, totalPages, onPageChange).
 */
export function renderPagination(rootParent, options = {}) {
  const controls =
    rootParent.querySelector(PAGINATION_CONTROLS_SELECTOR) || rootParent;
  if (!controls) return;

  const totalPages = Math.max(Number(options.totalPages) || 0, 0);
  const currentPage = clampPage(options.currentPage || 1, totalPages);
  const onPageChange = options.onPageChange;

  const fragment = document.createDocumentFragment();
  controls.innerHTML = '';

  if (totalPages <= 1) {
    fragment.appendChild(
      createPageButton(String(currentPage || 1), {
        active: true,
        disabled: true,
      }),
    );
    controls.appendChild(fragment);
    return;
  }

  // Previous Button
  const previousButton = createPageButton('Previous', {
    textOnly: true,
    page: currentPage - 1,
    disabled: currentPage <= DEFAULT_PAGE || totalPages === 0,
  });
  fragment.appendChild(previousButton);

  // Page Numbers
  buildPageSequence(currentPage, totalPages).forEach((item) => {
    if (item === 'ellipsis') {
      fragment.appendChild(createEllipsis());
      return;
    }
    fragment.appendChild(
      createPageButton(String(item), {
        page: item,
        active: item === currentPage,
      }),
    );
  });

  // Next Button
  const nextButton = createPageButton('Next', {
    textOnly: true,
    page: currentPage + 1,
    disabled: totalPages === 0 || currentPage >= totalPages,
  });
  fragment.appendChild(nextButton);

  controls.appendChild(fragment);

  // Event Listeners
  controls.querySelectorAll('button[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetPage = Number(button.dataset.page);
      if (Number.isFinite(targetPage) && typeof onPageChange === 'function') {
        onPageChange(clampPage(targetPage, totalPages));
      }
    });
  });
}
