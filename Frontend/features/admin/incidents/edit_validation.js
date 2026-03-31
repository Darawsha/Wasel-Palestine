import {
  isRequired,
  isValidType,
  isValidSeverity,
  isValidStatus,
} from '/features/admin/incidents/validation.js';

import { isLocationReal } from '/shared/location_validator.js';

import {
  pushFieldError,
  buildErrorMap,
  clearValidationErrors as sharedClearErrors,
  applyValidationErrors as sharedApplyErrors,
} from '/shared/ui_validation.js';

const EDIT_FIELD_SELECTORS = {
  title: '#editIncidentTitle',
  description: '#editIncidentDescription',
  type: '#editIncidentType',
  severity: '#editIncidentSeverity',
  location: '#editIncidentLocation',
  status: '#editIncidentStatus',
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
  const location = normalizeText(getFieldElement(form, 'location')?.value);
  const status = normalizeText(
    getFieldElement(form, 'status')?.value,
  ).toUpperCase();

  return {
    title,
    description,
    type,
    severity,
    location: location || undefined,
    status: status || undefined,
  };
}

export async function validateEditIncidentPayload(payload) {
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

  if (payload?.location) {
    const locationResult = await isLocationReal(payload.location);
    if (!locationResult.isValid) {
      pushFieldError(
        errors,
        'location',
        'The location provided could not be found. Please enter a valid address.',
      );
    } else {
      payload.latitude = locationResult.lat;
      payload.longitude = locationResult.lon;
    }
  }

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
