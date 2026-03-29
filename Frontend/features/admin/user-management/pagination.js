const MAX_VISIBLE_PAGES = 5;

function normalizePositiveInteger(value, fallback) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0
    ? Math.floor(normalizedValue)
    : fallback;
}

function clampPage(page, totalPages) {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(normalizePositiveInteger(page, 1), 1), totalPages);
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

export function renderUserPagination(root, meta = {}, onNavigate) {
  const controls = root?.querySelector('[data-users-pagination-controls]');
  if (!controls) {
    return;
  }

  const total = Math.max(Number(meta.total) || 0, 0);
  const limit = normalizePositiveInteger(meta.limit, 10);
  const totalPages = Math.max(
    Number(meta.totalPages) || 0,
    total > 0 ? Math.ceil(total / limit) : 0,
  );
  const currentPage = clampPage(meta.page, totalPages);
  const fragment = document.createDocumentFragment();

  controls.innerHTML = '';

  const previousButton = createPageButton('Previous', {
    textOnly: true,
    page: currentPage - 1,
    disabled: currentPage <= 1 || totalPages === 0,
  });
  fragment.appendChild(previousButton);

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

  const nextButton = createPageButton('Next', {
    textOnly: true,
    page: currentPage + 1,
    disabled: totalPages === 0 || currentPage >= totalPages,
  });
  fragment.appendChild(nextButton);

  controls.appendChild(fragment);

  controls.querySelectorAll('button[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetPage = Number(button.dataset.page);
      if (!Number.isFinite(targetPage) || typeof onNavigate !== 'function') {
        return;
      }

      onNavigate(clampPage(targetPage, totalPages));
    });
  });
}
