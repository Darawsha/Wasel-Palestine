export async function isLocationReal(location) {
  try {
    const countryCode = 'ps';

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&countrycodes=${countryCode}&limit=1`,
      {
        headers: { 'Accept-Language': 'ar,en' },
      },
    );

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
