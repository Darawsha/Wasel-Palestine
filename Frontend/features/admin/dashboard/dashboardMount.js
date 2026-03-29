function queueHydration(hydrate) {
  window.requestAnimationFrame(() => {
    void hydrate();
  });
}

export function observeDashboardMount(hydrate) {
  let observer = null;

  function startObserving() {
    if (observer) {
      return;
    }

    const mainMount = document.getElementById('flexible_main');
    if (!mainMount) {
      return;
    }

    observer = new MutationObserver(() => {
      queueHydration(hydrate);
    });

    observer.observe(mainMount, {
      childList: true,
      subtree: true,
    });

    queueHydration(hydrate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving, {
      once: true,
    });
  } else {
    startObserving();
  }
}
