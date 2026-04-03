function getFilterPanel(rootElement = document) {
  if (typeof rootElement.matches === 'function' && rootElement.matches('#spa-page-home')) {
    return rootElement.querySelector('.filter-panel');
  }

  return (
    rootElement.querySelector('#spa-page-home .filter-panel')
    || rootElement.querySelector('.filter-panel')
  );
}

function getTypeInputs(panel) {
  return Array.from(panel.querySelectorAll('input[name="type"]'));
}

function getSeverityInput(panel) {
  return panel.querySelector('#severity-select');
}

function getDateFromInput(panel) {
  return panel.querySelector('input[name="date-from"]');
}

function getDateToInput(panel) {
  return panel.querySelector('input[name="date-to"]');
}

function getApplyButton(panel) {
  return panel.querySelector('.apply-btn');
}

function getClearButton(panel) {
  return panel.querySelector('.clear-btn');
}

export class FilterUI {
  constructor({ onApply, onClear } = {}) {
    this.onApply = typeof onApply === 'function' ? onApply : () => {};
    this.onClear = typeof onClear === 'function' ? onClear : null;
    this.panel = null;
  }

  bind(rootElement = document) {
    const panel = getFilterPanel(rootElement);
    if (!panel) return false;

    this.panel = panel;

    if (panel.dataset.filterUiBound === 'true') {
      return true;
    }

    panel.dataset.filterUiBound = 'true';

    const applyButton = getApplyButton(panel);
    const clearButton = getClearButton(panel);

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        this.onApply(this.readRawFilters());
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.resetFilters();
        const payload = this.readRawFilters();

        if (this.onClear) {
          this.onClear(payload);
          return;
        }

        this.onApply(payload);
      });
    }

    return true;
  }

  readRawFilters() {
    if (!this.panel) {
      return {
        types: [],
        severity: '',
        fromDate: '',
        toDate: '',
      };
    }

    const types = getTypeInputs(this.panel)
      .filter((input) => input.checked)
      .map((input) => input.value);

    const severity = getSeverityInput(this.panel)?.value || '';
    const fromDate = getDateFromInput(this.panel)?.value || '';
    const toDate = getDateToInput(this.panel)?.value || '';

    return {
      types,
      severity,
      fromDate,
      toDate,
    };
  }

  resetFilters() {
    if (!this.panel) return;

    getTypeInputs(this.panel).forEach((input) => {
      input.checked = false;
    });

    const severityInput = getSeverityInput(this.panel);
    if (severityInput) {
      severityInput.value = '';
    }

    const fromInput = getDateFromInput(this.panel);
    if (fromInput) {
      fromInput.value = '';
    }

    const toInput = getDateToInput(this.panel);
    if (toInput) {
      toInput.value = '';
    }
  }
}
