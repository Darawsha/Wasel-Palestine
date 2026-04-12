const DEFAULT_TAB = 'all';
const DEFAULT_VIEW = 'my';
const DEFAULT_PAGE = 1;
const DEFAULT_MY_LIMIT = 4;
const DEFAULT_COMMUNITY_LIMIT = 4;
const DEFAULT_RADIUS_KM = 25;

export function createReportsState() {
  return {
    view: DEFAULT_VIEW,
    myReports: {
      tab: DEFAULT_TAB,
      page: DEFAULT_PAGE,
      limit: DEFAULT_MY_LIMIT,
      meta: {
        total: 0,
        page: DEFAULT_PAGE,
        limit: DEFAULT_MY_LIMIT,
        totalPages: 0,
      },
      counts: {
        all: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
      },
    },
    community: {
      page: DEFAULT_PAGE,
      limit: DEFAULT_COMMUNITY_LIMIT,
      meta: {
        total: 0,
        page: DEFAULT_PAGE,
        limit: DEFAULT_COMMUNITY_LIMIT,
        totalPages: 0,
      },
      radiusKm: DEFAULT_RADIUS_KM,
      location: {
        status: 'idle',
        latitude: null,
        longitude: null,
      },
    },
  };
}

export function setReportsView(state, view) {
  if (!state || (view !== 'my' && view !== 'community')) {
    return state;
  }

  state.view = view;
  return state;
}

export function setMyReportsTab(state, tab) {
  if (!state) {
    return state;
  }

  state.myReports.tab = tab || DEFAULT_TAB;
  state.myReports.page = DEFAULT_PAGE;
  return state;
}

export function setMyReportsPage(state, page) {
  if (!state) {
    return state;
  }

  state.myReports.page = Number(page) > 0 ? Number(page) : DEFAULT_PAGE;
  return state;
}

export function setCommunityPage(state, page) {
  if (!state) {
    return state;
  }

  state.community.page = Number(page) > 0 ? Number(page) : DEFAULT_PAGE;
  return state;
}

export function setMyReportsPayload(state, payload = {}) {
  if (!state) {
    return state;
  }

  state.myReports.meta = payload.meta || state.myReports.meta;
  state.myReports.counts = payload.counts || state.myReports.counts;
  return state;
}

export function setCommunityPayload(state, payload = {}) {
  if (!state) {
    return state;
  }

  state.community.meta = payload.meta || state.community.meta;
  return state;
}

export function setCommunityLocation(state, payload = {}) {
  if (!state) {
    return state;
  }

  state.community.location = {
    status: payload.status || state.community.location.status,
    latitude:
      typeof payload.latitude === 'number'
        ? payload.latitude
        : state.community.location.latitude,
    longitude:
      typeof payload.longitude === 'number'
        ? payload.longitude
        : state.community.location.longitude,
  };

  if (typeof payload.radiusKm === 'number') {
    state.community.radiusKm = payload.radiusKm;
  }

  return state;
}

export function resetCommunityPage(state) {
  if (!state) {
    return state;
  }

  state.community.page = DEFAULT_PAGE;
  return state;
}
