import {
  pushFieldError,
  buildErrorMap,
  clearValidationErrors as sharedClearErrors,
  applyValidationErrors as sharedApplyErrors,
} from '/shared/ui_validation.js';

import { isLocationReal } from '/shared/location_validator.js';
import {
  getIncidentResolvedLocation,
  isCheckpointLinkAllowedForType,
  setIncidentResolvedLocation,
} from '/features/admin/incidents/incident_checkpoint_sync.js';

const FIELD_SELECTORS = {
  title: '#incidentTitle',
  description: '#incidentDescription',
  type: '#incidentType',
  severity: '#incidentSeverity',
  checkpointId: '#incidentCheckpoint',
  impactStatus: '#incidentImpactStatus',
  location: '#incidentLocation',
  status: '#incidentStatus',
  isVerified: '#incidentVerification',
};

export function getFieldElement(form, fieldName) {
  return form?.querySelector(FIELD_SELECTORS[fieldName] || '');
}

function normalizeText(value) {
  return String(value || '').trim();
}

export function isRequired(value) {
  return normalizeText(value) !== '';
}

export function isValidType(type) {
  const validTypes = ['CLOSURE', 'DELAY', 'ACCIDENT', 'WEATHER_HAZARD'];
  return validTypes.includes(type);
}

export function isValidSeverity(severity) {
  const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  return validSeverities.includes(severity);
}

export function isValidStatus(status) {
  const validStatuses = ['ACTIVE', 'CLOSED'];
  return validStatuses.includes(status);
}

export function isValidImpactStatus(impactStatus) {
  const validImpactStatuses = ['OPEN', 'CLOSED', 'RESTRICTED', 'DELAYED'];
  return validImpactStatuses.includes(impactStatus);
}

export function isValidCheckpointLink(type, checkpointId) {
  return !checkpointId || isCheckpointLinkAllowedForType(type);
}

function validateLength(value, field, label, min, max, errors) {
  const normalizedValue = normalizeText(value);

  if (!isRequired(normalizedValue)) {
    pushFieldError(errors, field, `${label} is required.`);
    return;
  }

  if (normalizedValue.length < min) {
    pushFieldError(
      errors,
      field,
      `${label} must be at least ${min} characters.`,
    );
    return;
  }

  if (max && normalizedValue.length > max) {
    pushFieldError(
      errors,
      field,
      `${label} must not exceed ${max} characters.`,
    );
  }
}

async function resolveIncidentLocation(form, data, errors) {
  const location = normalizeText(data?.location);

  if (!location) {
    return;
  }

  if (data?.checkpointId) {
    const resolvedLocation = getIncidentResolvedLocation(form);

    if (resolvedLocation) {
      data.latitude = resolvedLocation.latitude;
      data.longitude = resolvedLocation.longitude;
    }

    return;
  }

  const resolvedLocation = getIncidentResolvedLocation(form);
  if (resolvedLocation && resolvedLocation.location === location) {
    data.latitude = resolvedLocation.latitude;
    data.longitude = resolvedLocation.longitude;
    return;
  }

  const locationResult = await isLocationReal(location);
  if (!locationResult.isValid) {
    pushFieldError(
      errors,
      'location',
      'The location provided could not be found. Please enter a valid address.',
    );
    return;
  }

  data.latitude = locationResult.lat;
  data.longitude = locationResult.lon;
  setIncidentResolvedLocation(form, {
    location,
    latitude: locationResult.lat,
    longitude: locationResult.lon,
  });
}

export async function validateAddIncidentData(form, data) {
  const errors = [];

  validateLength(data?.title, 'title', 'Title', 3, 150, errors);
  validateLength(
    data?.description,
    'description',
    'Description',
    10,
    null,
    errors,
  );

  if (!isRequired(data?.type)) {
    pushFieldError(errors, 'type', 'Type is required.');
  } else if (!isValidType(data?.type)) {
    pushFieldError(errors, 'type', 'Please select a valid incident type.');
  }

  if (!isRequired(data?.severity)) {
    pushFieldError(errors, 'severity', 'Severity is required.');
  } else if (!isValidSeverity(data?.severity)) {
    pushFieldError(errors, 'severity', 'Please select a valid severity.');
  }

  if (!isValidCheckpointLink(data?.type, data?.checkpointId)) {
    pushFieldError(
      errors,
      'checkpointId',
      'Invalid incident type for checkpoint linking',
    );
  }

  if (data?.checkpointId) {
    if (!isRequired(data?.impactStatus)) {
      pushFieldError(
        errors,
        'impactStatus',
        'Impact on checkpoint is required when linking a checkpoint.',
      );
    } else if (!isValidImpactStatus(data?.impactStatus)) {
      pushFieldError(
        errors,
        'impactStatus',
        'Please select a valid checkpoint impact.',
      );
    }
  }

  await resolveIncidentLocation(form, data, errors);

  if (data?.status && !isValidStatus(data?.status)) {
    pushFieldError(errors, 'status', 'Please select a valid status.');
  }

  return errors;
}

export function collectAddIncidentFormData(form) {
  const title = normalizeText(getFieldElement(form, 'title')?.value);
  const description = normalizeText(
    getFieldElement(form, 'description')?.value,
  );
  const type = normalizeText(
    getFieldElement(form, 'type')?.value,
  ).toUpperCase();
  const severity = normalizeText(
    getFieldElement(form, 'severity')?.value,
  ).toUpperCase();
  const checkpointIdValue = normalizeText(
    getFieldElement(form, 'checkpointId')?.value,
  );
  const impactStatus = normalizeText(
    getFieldElement(form, 'impactStatus')?.value,
  ).toUpperCase();
  const location = normalizeText(getFieldElement(form, 'location')?.value);
  const status = normalizeText(
    getFieldElement(form, 'status')?.value,
  ).toUpperCase();
  const isVerified =
    normalizeText(getFieldElement(form, 'isVerified')?.value) === 'true';

  return {
    title,
    description,
    type,
    severity,
    checkpointId: checkpointIdValue ? Number(checkpointIdValue) : undefined,
    impactStatus: impactStatus || undefined,
    location: location || undefined,
    status: status || undefined,
    isVerified,
  };
}

export async function validateAddIncidentPayload(form, payload) {
  const errorList = await validateAddIncidentData(form, payload);

  return {
    isValid: errorList.length === 0,
    errors: buildErrorMap(errorList),
    messages: errorList.map((error) => error.message),
  };
}

export function clearValidationErrors(form) {
  sharedClearErrors(form);
}

export function applyValidationErrors(form, fieldErrors = {}) {
  sharedApplyErrors(form, fieldErrors, getFieldElement);
}

if (typeof window !== 'undefined') {
  window.incidentManagementValidators = {
    isRequired,
    isValidType,
    isValidSeverity,
    isValidStatus,
    isValidImpactStatus,
    isValidCheckpointLink,
    validateAddIncidentData,
  };
}
