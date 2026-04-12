const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function createModerationQueueState() {
  return {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: '',
    category: '',
    duplicateOnly: false,
    sort: {
      field: 'createdAt',
      order: 'DESC',
    },
    meta: {
      total: 0,
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      totalPages: 0,
    },
    counts: {
      all: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
    },
    selectedReportId: null,
  };
}

export function setModerationPage(state, page) {
  if (!state) {
    return state;
  }

  state.page = Number(page) > 0 ? Number(page) : DEFAULT_PAGE;
  return state;
}

export function setModerationSearch(state, search) {
  if (!state) {
    return state;
  }

  state.search = String(search || '').trim();
  state.page = DEFAULT_PAGE;
  return state;
}

export function setModerationCategory(state, category) {
  if (!state) {
    return state;
  }

  state.category = String(category || '').trim();
  state.page = DEFAULT_PAGE;
  return state;
}

export function toggleDuplicateOnly(state) {
  if (!state) {
    return state;
  }

  state.duplicateOnly = !state.duplicateOnly;
  state.page = DEFAULT_PAGE;
  return state;
}

export function setModerationSort(state, sortValue) {
  if (!state) {
    return state;
  }

  const [field, order] = String(sortValue || 'createdAt:DESC').split(':');
  state.sort = {
    field: field || 'createdAt',
    order: order === 'ASC' ? 'ASC' : 'DESC',
  };
  state.page = DEFAULT_PAGE;
  return state;
}

export function setModerationMeta(state, meta = {}) {
  if (!state) {
    return state;
  }

  state.meta = meta;
  return state;
}

export function setModerationCounts(state, counts = {}) {
  if (!state) {
    return state;
  }

  state.counts = {
    all: Math.max(Number(counts.all) || 0, 0),
    pending: Math.max(Number(counts.pending) || 0, 0),
    verified: Math.max(Number(counts.verified) || 0, 0),
    rejected: Math.max(Number(counts.rejected) || 0, 0),
  };

  return state;
}

export function setSelectedModerationReport(state, reportId) {
  if (!state) {
    return state;
  }

  state.selectedReportId = Number.isFinite(Number(reportId))
    ? Number(reportId)
    : null;
  return state;
}
