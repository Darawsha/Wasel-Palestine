(function (global) {
	const PAGE_SELECTOR = '#spa-page-incidents';
	const GRID_SELECTOR = '[data-incidents-grid]';
	const PAGINATION_SELECTOR = '[data-incidents-pagination]';
	const TOTAL_LABEL_SELECTOR = '[data-incidents-total-label]';

	const DEFAULT_PAGE = 1;
	const DEFAULT_LIMIT = 4;

	let dependenciesPromise = null;
	let activeRequestId = 0;
	let pageState = {
		total: 0,
		page: DEFAULT_PAGE,
		limit: DEFAULT_LIMIT,
		totalPages: 0,
	};

	function getPageRoot() {
		return document.querySelector(PAGE_SELECTOR);
	}

	function normalizePositiveInteger(value, fallback) {
		const normalized = Number(value);
		return Number.isFinite(normalized) && normalized > 0
			? Math.floor(normalized)
			: fallback;
	}

	function normalizeMeta(meta = {}) {
		const total = Math.max(Number(meta.total) || 0, 0);
		const limit = normalizePositiveInteger(meta.limit, DEFAULT_LIMIT);
		const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
		const page =
			totalPages > 0
				? Math.min(normalizePositiveInteger(meta.page, DEFAULT_PAGE), totalPages)
				: DEFAULT_PAGE;

		return {
			total,
			limit,
			page,
			totalPages,
		};
	}

	function escapeHtml(value) {
		return String(value ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function formatRelativeTime(dateValue) {
		if (!dateValue) return 'Unknown time';

		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) return 'Unknown time';

		const deltaMs = Date.now() - date.getTime();
		const deltaMinutes = Math.max(Math.floor(deltaMs / 60000), 0);

		if (deltaMinutes < 1) return 'Just now';
		if (deltaMinutes < 60) return `${deltaMinutes} minute${deltaMinutes === 1 ? '' : 's'} ago`;

		const deltaHours = Math.floor(deltaMinutes / 60);
		if (deltaHours < 24) return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;

		const deltaDays = Math.floor(deltaHours / 24);
		return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
	}

	function getTypeLabel(type) {
		const normalized = String(type || '').trim().toUpperCase();

		if (normalized === 'CLOSURE') return 'Road Closure';
		if (normalized === 'DELAY') return 'Delay';
		if (normalized === 'ACCIDENT') return 'Accident';
		if (normalized === 'WEATHER_HAZARD') return 'Weather Hazard';

		return normalized || 'Incident';
	}

	function getTypeIcon(type) {
		const normalized = String(type || '').trim().toUpperCase();

		if (normalized === 'DELAY') {
			return {
				name: 'schedule',
				colorClass: 'text-amber',
			};
		}

		if (normalized === 'ACCIDENT') {
			return {
				name: 'car_crash',
				colorClass: 'text-red',
			};
		}

		if (normalized === 'WEATHER_HAZARD') {
			return {
				name: 'thunderstorm',
				colorClass: 'text-amber',
			};
		}

		return {
			name: 'block',
			colorClass: 'text-red',
		};
	}

	function getSeverityClass(severity) {
		const normalized = String(severity || '').trim().toUpperCase();

		if (normalized === 'CRITICAL') return 'badge-critical';
		if (normalized === 'HIGH') return 'badge-high';
		if (normalized === 'MEDIUM') return 'badge-medium';
		return 'badge-low';
	}

	function getStatusPresentation(incident) {
		if (incident?.status === 'CLOSED') {
			return {
				className: 'status-closed',
				label: 'Closed',
				icon: 'cancel',
			};
		}

		if (incident?.isVerified) {
			return {
				className: 'status-verified',
				label: 'Verified',
				icon: 'verified',
			};
		}

		return {
			className: 'status-active',
			label: 'Active',
			icon: '',
		};
	}

	function buildIncidentCard(incident) {
		const article = document.createElement('article');
		article.className = 'incident-card';

		const typeIcon = getTypeIcon(incident.type);
		const statusPresentation = getStatusPresentation(incident);
		const location = incident.location || incident.checkpoint?.location || 'Unknown location';
		const timestamp = incident.updatedAt || incident.createdAt;

		article.innerHTML = `
			<div class="card-header">
				<div class="type-tag">
					<span class="material-symbols-outlined ${typeIcon.colorClass}" style="font-variation-settings: 'FILL' 1">${typeIcon.name}</span>
					<span class="type-label">${escapeHtml(getTypeLabel(incident.type))}</span>
				</div>
				<span class="badge ${getSeverityClass(incident.severity)}">${escapeHtml(incident.severity || 'LOW')}</span>
			</div>
			<h3 class="card-title">${escapeHtml(incident.title || 'Untitled incident')}</h3>
			<div class="card-info">
				<div class="info-item">
					<span class="material-symbols-outlined">location_on</span>
					<span>${escapeHtml(location)}</span>
				</div>
				<div class="info-item">
					<span class="material-symbols-outlined">schedule</span>
					<span>${escapeHtml(formatRelativeTime(timestamp))}</span>
				</div>
			</div>
			<div class="card-footer">
				<span class="status-pill ${statusPresentation.className}">
					${statusPresentation.icon ? `<span class="material-symbols-outlined">${statusPresentation.icon}</span>` : '<span class="dot"></span>'}
					${escapeHtml(statusPresentation.label)}
				</span>
				<button class="details-link" type="button" data-incident-id="${escapeHtml(incident.id)}">View details</button>
			</div>
		`;

		return article;
	}

	function renderEmptyState(grid, message) {
		grid.innerHTML = '';

		const emptyCard = document.createElement('article');
		emptyCard.className = 'incident-card';
		emptyCard.innerHTML = `
			<h3 class="card-title">${escapeHtml(message)}</h3>
			<p class="type-label">Try adjusting your filters or search query.</p>
		`;

		grid.appendChild(emptyCard);
	}

	function renderIncidents(root, incidents) {
		const grid = root.querySelector(GRID_SELECTOR);
		if (!grid) return;

		if (!Array.isArray(incidents) || incidents.length === 0) {
			renderEmptyState(grid, 'No incidents found.');
			return;
		}

		grid.innerHTML = '';
		incidents.forEach((incident) => {
			grid.appendChild(buildIncidentCard(incident));
		});
	}

	function updateTotalLabel(root, meta) {
		const totalLabel = root.querySelector(TOTAL_LABEL_SELECTOR);
		if (!totalLabel) return;

		totalLabel.textContent = `Showing ${meta.total} incidents`;
	}

	function bindCardActions(root) {
		const detailsButtons = root.querySelectorAll('[data-incident-id]');
		const openDetails = global.CitizenIncidentDetails?.openViewIncidentDetails;

		detailsButtons.forEach((button) => {
			button.addEventListener('click', () => {
				const incidentId = Number(button.dataset.incidentId);
				if (!Number.isFinite(incidentId)) {
					return;
				}

				if (typeof openDetails === 'function') {
					void openDetails(incidentId);
				} else {
					console.error('Citizen incident details module is not loaded.');
				}
			});
		});
	}

	function getDependencies() {
		if (!dependenciesPromise) {
			dependenciesPromise = Promise.resolve().then(async () => {
				const controllerModule = await import('/Controllers/incidents.controller.js');

				return {
					loadIncidentsPage: controllerModule.loadIncidentsPage,
					filters: global.CitizenIncidentsFilters,
					pagination: global.CitizenIncidentsPagination,
				};
			});
		}

		return dependenciesPromise;
	}

	async function loadIncidentsData(page = DEFAULT_PAGE) {
		const root = getPageRoot();
		if (!root) return;

		const requestId = ++activeRequestId;

		const { loadIncidentsPage, filters, pagination } = await getDependencies();

		if (!filters || !pagination || typeof loadIncidentsPage !== 'function') {
			console.error('Citizen incidents dependencies are not ready.');
			return;
		}

		const normalizedPage = normalizePositiveInteger(page, DEFAULT_PAGE);
		const query = {
			page: normalizedPage,
			limit: pageState.limit || DEFAULT_LIMIT,
			...filters.getFilters(root),
		};

		const grid = root.querySelector(GRID_SELECTOR);
		if (grid) {
			renderEmptyState(grid, 'Loading incidents...');
		}

		try {
			const response = await loadIncidentsPage(query);

			if (requestId !== activeRequestId) return;

			const incidents = Array.isArray(response?.data) ? response.data : [];
			const meta = normalizeMeta(response?.meta);

			pageState = {
				...pageState,
				...meta,
			};

			renderIncidents(root, incidents);
			bindCardActions(root);
			updateTotalLabel(root, pageState);

			const paginationContainer = root.querySelector(PAGINATION_SELECTOR);
			pagination.renderPagination(paginationContainer, pageState, (nextPage) => {
				loadIncidentsData(nextPage);
			});
		} catch (error) {
			if (requestId !== activeRequestId) return;

			console.error('Failed to load citizen incidents', error);
			if (grid) {
				renderEmptyState(grid, 'Error loading incidents.');
			}
		}
	}

	async function initializeIncidentsPage() {
		const root = getPageRoot();
		if (!root || root.dataset.citizenIncidentsInitialized === 'true') {
			return;
		}

		const { filters } = await getDependencies();
		if (!filters) {
			return;
		}

		root.dataset.citizenIncidentsInitialized = 'true';

		filters.bindFilters(root, () => {
			pageState.page = DEFAULT_PAGE;
			loadIncidentsData(DEFAULT_PAGE);
		});

		loadIncidentsData(DEFAULT_PAGE);
	}

	function observePageMount() {
		const mainContainer = document.getElementById('flexible_main') || document.body;

		const observer = new MutationObserver(() => {
			const root = getPageRoot();
			if (root && root.dataset.citizenIncidentsInitialized !== 'true') {
				void initializeIncidentsPage();
			}
		});

		observer.observe(mainContainer, {
			childList: true,
			subtree: true,
		});

		if (getPageRoot()) {
			void initializeIncidentsPage();
		}
	}

	observePageMount();
})(window);

