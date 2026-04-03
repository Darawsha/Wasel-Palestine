import { FilterUI } from '/components/filter-ui.js';

const filterUiByRoot = new WeakMap();

export function connectHomeFilterButtons(homeRoot, handlers = {}) {
  if (!homeRoot) {
    return {
      didBind: false,
      filterUI: null,
    };
  }

  let filterUI = filterUiByRoot.get(homeRoot);

  if (!filterUI) {
    filterUI = new FilterUI({
      onApply: handlers.onApply,
      onClear: handlers.onClear,
    });

    const didBind = filterUI.bind(homeRoot);
    if (!didBind) {
      return {
        didBind: false,
        filterUI: null,
      };
    }

    filterUiByRoot.set(homeRoot, filterUI);

    return {
      didBind: true,
      filterUI,
    };
  }

  if (typeof handlers.onApply === 'function') {
    filterUI.onApply = handlers.onApply;
  }

  if (typeof handlers.onClear === 'function') {
    filterUI.onClear = handlers.onClear;
  }

  return {
    didBind: true,
    filterUI,
  };
}
