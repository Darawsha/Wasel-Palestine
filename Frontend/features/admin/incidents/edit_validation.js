import {
  isRequired,
  isValidType,
  isValidSeverity,
  isValidStatus,
  isValidImpactStatus,
  isValidCheckpointLink,
} from '/features/admin/incidents/validation.js';

import { isLocationReal } from '/shared/location_validator.js';

import {
  pushFieldError,
  buildErrorMap,
  clearValidationErrors as sharedClearErrors,
  applyValidationErrors as sharedApplyErrors,
} from '/shared/ui_validation.js';
import {
  getIncidentResolvedLocation,
  setIncidentResolvedLocation,
} from '/features/admin/incidents/incident_checkpoint_sync.js';

const EDIT_FIELD_SELECTORS = {
  title: '#editIncidentTitle',
  description: '#editIncidentDescription',
  type: '#editIncidentType',
  severity: '#editIncidentSeverity',
  checkpointId: '#editIncidentCheckpoint',
  impactStatus: '#editIncidentImpactStatus',
  location: '#editIncidentLocation',
  status: '#editIncidentStatus',
  isVerified: '#editIncidentVerification',
};

export function getFieldElement(form, fieldName) {
  return form?.querySelector(EDIT_FIELD_SELECTORS[fieldName] || '');
}

function normalizeText(value) {
  return String(value || '').trim();
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

export function collectEditIncidentFormData(form) {
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
    checkpointId: checkpointIdValue
      ? Number(checkpointIdValue)
      : checkpointIdValue === ''
        ? null
        : undefined,
    impactStatus: impactStatus || undefined,
    location: location || undefined,
    status: status || undefined,
    isVerified,
  };
}

async function resolveIncidentLocation(form, payload, errors) {
  const location = normalizeText(payload?.location);

  if (!location) {
    return;
  }

  if (payload?.checkpointId) {
    const resolvedLocation = getIncidentResolvedLocation(form);

    if (resolvedLocation) {
      payload.latitude = resolvedLocation.latitude;
      payload.longitude = resolvedLocation.longitude;
    }

    return;
  }

  const resolvedLocation = getIncidentResolvedLocation(form);
  if (resolvedLocation && resolvedLocation.location === location) {
    payload.latitude = resolvedLocation.latitude;
    payload.longitude = resolvedLocation.longitude;
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

  payload.latitude = locationResult.lat;
  payload.longitude = locationResult.lon;
  setIncidentResolvedLocation(form, {
    location,
    latitude: locationResult.lat,
    longitude: locationResult.lon,
  });
}

export async function validateEditIncidentPayload(form, payload) {
  const errors = [];

  validateLength(payload?.title, 'title', 'Title', 3, 150, errors);
  validateLength(
    payload?.description,
    'description',
    'Description',
    10,
    null,
    errors,
  );

  if (!isRequired(payload?.type)) {
    pushFieldError(errors, 'type', 'Type is required.');
  } else if (!isValidType(payload?.type)) {
    pushFieldError(errors, 'type', 'Please select a valid incident type.');
  }

  if (!isRequired(payload?.severity)) {
    pushFieldError(errors, 'severity', 'Severity is required.');
  } else if (!isValidSeverity(payload?.severity)) {
    pushFieldError(errors, 'severity', 'Please select a valid severity.');
  }

  if (!isValidCheckpointLink(payload?.type, payload?.checkpointId)) {
    pushFieldError(
      errors,
      'checkpointId',
      'Invalid incident type for checkpoint linking',
    );
  }

  if (payload?.checkpointId) {
    if (!isRequired(payload?.impactStatus)) {
      pushFieldError(
        errors,
        'impactStatus',
        'Impact on checkpoint is required when linking a checkpoint.',
      );
    } else if (!isValidImpactStatus(payload?.impactStatus)) {
      pushFieldError(
        errors,
        'impactStatus',
        'Please select a valid checkpoint impact.',
      );
    }
  }

  await resolveIncidentLocation(form, payload, errors);

  if (payload?.status && !isValidStatus(payload?.status)) {
    pushFieldError(errors, 'status', 'Please select a valid status.');
  }

  return {
    isValid: errors.length === 0,
    errors: buildErrorMap(errors),
    messages: errors.map((error) => error.message),
  };
}

export function clearEditValidationErrors(form) {
  sharedClearErrors(form);
}

export function applyEditValidationErrors(form, fieldErrors = {}) {
  sharedApplyErrors(form, fieldErrors, getFieldElement);
}
