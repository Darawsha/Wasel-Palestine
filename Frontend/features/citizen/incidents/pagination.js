// pagination.js (Citizen incidents)
(function (global) {
	const MAX_VISIBLE_PAGES = 5;

	function normalizePositiveInteger(value, fallback) {
		const normalized = Number(value);
		return Number.isFinite(normalized) && normalized > 0
			? Math.floor(normalized)
			: fallback;
	}

	function clampPage(page, totalPages) {
		if (totalPages <= 0) return 1;

		return Math.min(
			Math.max(normalizePositiveInteger(page, 1), 1),
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
		button.className = options.nav ? 'page-nav' : 'page-btn';
		button.disabled = Boolean(options.disabled);

		if (options.disabled) {
			button.classList.add('disabled');
		}

		if (options.active) {
			button.classList.add('active');
		}

		if (options.page) {
			button.dataset.page = String(options.page);
		}

		button.innerHTML = label;
		return button;
	}

	function createDotsNode() {
		const dots = document.createElement('span');
		dots.className = 'dots';
		dots.textContent = '...';
		return dots;
	}

	function renderPagination(container, meta = {}, onPageChange) {
		if (!container) {
			return;
		}

		const total = Math.max(Number(meta.total) || 0, 0);
		const limit = normalizePositiveInteger(meta.limit, 10);
		const totalPages = Math.max(
			Number(meta.totalPages) || 0,
			total > 0 ? Math.ceil(total / limit) : 0,
		);
		const normalizedTotalPages = Math.max(totalPages, total > 0 ? 1 : 0);
		const currentPage = clampPage(meta.page, Math.max(normalizedTotalPages, 1));

		container.innerHTML = '';
		container.style.display = 'flex';

		if (total === 0) {
			const emptySummary = document.createElement('p');
			emptySummary.className = 'pagination-summary';
			emptySummary.textContent = 'Showing 0 incidents';
			container.appendChild(emptySummary);
			return;
		}

		const startIndex = (currentPage - 1) * limit + 1;
		const endIndex = Math.min(currentPage * limit, total);

		const summary = document.createElement('p');
		summary.className = 'pagination-summary';
		summary.textContent = `Showing ${startIndex}-${endIndex} of ${total} incidents`;
		container.appendChild(summary);

		const controls = document.createElement('div');
		controls.className = 'pagination-controls';

		const previousButton = createPageButton(
			'<span class="material-symbols-outlined">chevron_left</span> Previous',
			{
				nav: true,
				page: Math.max(currentPage - 1, 1),
				disabled: currentPage <= 1,
			},
		);
		controls.appendChild(previousButton);

		const pagesWrapper = document.createElement('div');
		pagesWrapper.className = 'page-numbers';

		buildPageSequence(currentPage, Math.max(normalizedTotalPages, 1)).forEach((item) => {
			if (item === 'ellipsis') {
				pagesWrapper.appendChild(createDotsNode());
				return;
			}

			pagesWrapper.appendChild(
				createPageButton(String(item), {
					page: item,
					active: item === currentPage,
				}),
			);
		});

		controls.appendChild(pagesWrapper);

		const nextButton = createPageButton(
			'Next <span class="material-symbols-outlined">chevron_right</span>',
			{
				nav: true,
				page: Math.min(currentPage + 1, normalizedTotalPages),
				disabled: currentPage >= normalizedTotalPages,
			},
		);
		controls.appendChild(nextButton);
		container.appendChild(controls);

		container.querySelectorAll('button[data-page]').forEach((button) => {
			button.addEventListener('click', () => {
				const targetPage = clampPage(
					Number(button.dataset.page),
					Math.max(normalizedTotalPages, 1),
				);
				if (typeof onPageChange === 'function') {
					if (targetPage !== currentPage) {
						onPageChange(targetPage);
					}
				}
			});
		});
	}

	global.CitizenIncidentsPagination = {
		renderPagination,
	};
})(window);

