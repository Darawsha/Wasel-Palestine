(function (global) {
  const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_OPTIONS = {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };

  const MAP_VIEWS = {
    home: {
      lat: 32.2211,
      lng: 35.2544,
      zoom: 13,
    },
    routePlanner: {
      lat: 31.9522,
      lng: 35.2332,
      zoom: 10,
    },
  };

  var returnedMap = null;
  function createMap(element, view, options) {
    if (!element || typeof global.L === 'undefined') return null;

    const map = global.L.map(element, options || {});
    const targetView = view || MAP_VIEWS.home;

    map.setView([targetView.lat, targetView.lng], targetView.zoom);
    returnedMap = map;
    return map;
  }

  function addBaseLayer(map) {
    if (!map || typeof global.L === 'undefined') return null;
    return global.L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
  }

  function destroyMap(map) {
    if (!map) return;
    if (returnedMap === map) {
      returnedMap = null;
    }
    map.remove();
  }

  global.AppMapShared = {
    TILE_URL,
    TILE_OPTIONS,
    MAP_VIEWS,
    createMap,
    addBaseLayer,
    destroyMap,
    getMapInstance: () => returnedMap,
  };
})(window);
