(function (global) {
  let initialized = false;

  async function bootstrapHomePage() {
    if (initialized) {
      return;
    }

    try {
      const module = await import('/features/citizen/home/home-page.js');
      if (typeof module.initHomePage === 'function') {
        module.initHomePage();
        initialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize home page map modules', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void bootstrapHomePage();
    });
  } else {
    void bootstrapHomePage();
  }

  global.addEventListener('hashchange', () => {
    void bootstrapHomePage();
  });
})(window);