// incidents_filter.js (Citizen)
(function (global) {
	const SEARCH_FILTER_SELECTOR = '[data-incidents-search-filter]';
	const TYPE_FILTER_SELECTOR = '[data-incidents-type-filter]';
	const SEVERITY_FILTER_SELECTOR = '[data-incidents-severity-filter]';
	const STATUS_FILTER_SELECTOR = '[data-incidents-status-filter]';
	const TIMEFRAME_FILTER_SELECTOR = '[data-incidents-timeframe-filter]';
	const SORT_BUTTON_SELECTOR = '[data-incidents-sort-btn]';

	const DEFAULT_SORT_BY = 'createdAt';
	const DEFAULT_SORT_ORDER = 'DESC';

	function debounce(handler, delayMs = 350) {
		let timerId = null;

		return (...args) => {
			if (timerId) {
				clearTimeout(timerId);
			}

			timerId = setTimeout(() => {
				handler(...args);
			}, delayMs);
		};
	}

	function normalizeUpper(value) {
		return String(value || '')
			.trim()
			.toUpperCase()
			.replace(/-/g, '_');
	}

	function toApiStatus(rawStatus) {
		const status = normalizeUpper(rawStatus);

		if (!status) {
			return {
				status: undefined,
				isVerified: undefined,
			};
		}

		if (status === 'VERIFIED') {
			return {
				status: 'ACTIVE',
				isVerified: true,
			};
		}

		return {
			status,
			isVerified: undefined,
		};
	}

	function toApiType(rawType) {
		const type = normalizeUpper(rawType);

		if (type === 'ROAD_CLOSURE') {
			return 'CLOSURE';
		}

		if (type === 'WEATHER') {
			return 'WEATHER_HAZARD';
		}

		return type || undefined;
	}

	function toApiSeverity(rawSeverity) {
		const severity = normalizeUpper(rawSeverity);
		return severity || undefined;
	}

	function toDateWindow(rawTimeframe) {
		const timeframe = normalizeUpper(rawTimeframe);

		if (!timeframe || timeframe === 'ALL') {
			return {
				startDate: undefined,
				endDate: undefined,
			};
		}

		const now = new Date();
		const start = new Date(now);

		if (timeframe === '24H') {
			start.setHours(start.getHours() - 24);
		} else if (timeframe === '7D') {
			start.setDate(start.getDate() - 7);
		} else if (timeframe === '30D') {
			start.setDate(start.getDate() - 30);
		} else {
			return {
				startDate: undefined,
				endDate: undefined,
			};
		}

		return {
			startDate: start.toISOString(),
			endDate: now.toISOString(),
		};
	}

	function getSortState(root) {
		const sortBy = root?.dataset?.incidentsSortBy || DEFAULT_SORT_BY;
		const sortOrder = root?.dataset?.incidentsSortOrder || DEFAULT_SORT_ORDER;

		return {
			sortBy,
			sortOrder,
		};
	}

	function updateSortLabel(root) {
		const sortButton = root?.querySelector(SORT_BUTTON_SELECTOR);
		if (!sortButton) return;

		const { sortOrder } = getSortState(root);
		sortButton.dataset.sortOrder = sortOrder;

		if (sortOrder === 'ASC') {
			sortButton.innerHTML = 'Sort: Oldest First <span class="material-symbols-outlined">sort</span>';
		} else {
			sortButton.innerHTML = 'Sort: Newest First <span class="material-symbols-outlined">sort</span>';
		}
	}

	function getFilters(root) {
		const searchValue = root.querySelector(SEARCH_FILTER_SELECTOR)?.value || '';
		const rawType = root.querySelector(TYPE_FILTER_SELECTOR)?.value || '';
		const rawSeverity = root.querySelector(SEVERITY_FILTER_SELECTOR)?.value || '';
		const rawStatus = root.querySelector(STATUS_FILTER_SELECTOR)?.value || '';
		const rawTimeframe = root.querySelector(TIMEFRAME_FILTER_SELECTOR)?.value || 'ALL';
		const { sortBy, sortOrder } = getSortState(root);
		const { status, isVerified } = toApiStatus(rawStatus);
		const { startDate, endDate } = toDateWindow(rawTimeframe);

		return {
			search: String(searchValue).trim() || undefined,
			type: toApiType(rawType),
			severity: toApiSeverity(rawSeverity),
			status,
			isVerified,
			startDate,
			endDate,
			sortBy,
			sortOrder,
		};
	}

	function bindFilters(root, onChangeCallback) {
		if (!root || root.dataset.citizenIncidentsFiltersBound === 'true') {
			return;
		}

		root.dataset.incidentsSortBy = DEFAULT_SORT_BY;
		root.dataset.incidentsSortOrder = DEFAULT_SORT_ORDER;
		updateSortLabel(root);

		const triggerChange = () => {
			if (typeof onChangeCallback === 'function') {
				onChangeCallback();
			}
		};

		const debouncedSearchChange = debounce(triggerChange);

		const searchInput = root.querySelector(SEARCH_FILTER_SELECTOR);
		const filterElements = [
			root.querySelector(TYPE_FILTER_SELECTOR),
			root.querySelector(SEVERITY_FILTER_SELECTOR),
			root.querySelector(STATUS_FILTER_SELECTOR),
			root.querySelector(TIMEFRAME_FILTER_SELECTOR),
		].filter(Boolean);

		if (searchInput) {
			searchInput.addEventListener('input', debouncedSearchChange);
		}

		filterElements.forEach((element) => {
			element.addEventListener('change', triggerChange);
		});

		const sortButton = root.querySelector(SORT_BUTTON_SELECTOR);
		if (sortButton) {
			sortButton.addEventListener('click', () => {
				const nextSortOrder =
					root.dataset.incidentsSortOrder === 'DESC' ? 'ASC' : 'DESC';
				root.dataset.incidentsSortOrder = nextSortOrder;
				updateSortLabel(root);
				triggerChange();
			});
		}

		root.dataset.citizenIncidentsFiltersBound = 'true';
	}

	global.CitizenIncidentsFilters = {
		getFilters,
		bindFilters,
	};
})(window);

