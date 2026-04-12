export async function isLocationReal(location, options = {}) {
  try {
    const response = await fetch(buildLocationSearchUrl(location, options), {
      headers: { 'Accept-Language': 'ar,en' },
    });

    if (!response.ok) return { isValid: false };

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const bestMatch = data[0];
      return {
        isValid: true,
        lat: parseFloat(bestMatch.lat),
        lon: parseFloat(bestMatch.lon),
      };
    }
    return { isValid: false };
  } catch (error) {
    console.error('Error validating location:', error);

    if (typeof window.showErrorToast === 'function') {
      window.showErrorToast('Unable to validate location at this time.');
    }
    return { isValid: false };
  }
}

function buildLocationSearchUrl(location, options = {}) {
  const params = new URLSearchParams({
    format: 'json',
    q: String(location || ''),
    limit: '1',
  });
  const countryCodes = normalizeCountryCodes(options.countryCodes);

  if (countryCodes.length > 0) {
    params.set('countrycodes', countryCodes.join(','));
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

function normalizeCountryCodes(countryCodes) {
  if (countryCodes === undefined) {
    return ['ps'];
  }

  if (countryCodes === null) {
    return [];
  }

  const values = Array.isArray(countryCodes)
    ? countryCodes
    : String(countryCodes || '')
        .split(',')
        .map((value) => value.trim());

  return values
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}
