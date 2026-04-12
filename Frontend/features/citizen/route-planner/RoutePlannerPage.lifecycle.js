(function (global) {
  if (!global.RoutePlannerPage) {
    global.RoutePlannerPage = {
      init: async function initRoutePlannerPage() {
        const map = global.RoutePlannerLogic?.getMap?.();
        if (!map) return;

        await global.RoutePlannerLogic?.drawRouteOnMap?.(map);
      },
      destroy: function destroyRoutePlannerPage() {
        global.RoutePlannerLogic?.clearRouteLayers?.();
      },
    };
  }

  if (global.location.hash === "#route-planner") {
    void global.RoutePlannerPage?.init?.();
  }
})(window);
