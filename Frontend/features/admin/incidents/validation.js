import {
  pushFieldError,
  buildErrorMap,
  clearValidationErrors as sharedClearErrors,
  applyValidationErrors as sharedApplyErrors,
} from '/shared/ui_validation.js';

import { isLocationReal } from '/shared/location_validator.js';

const FIELD_SELECTORS = {
  title: '#incidentTitle',
  description: '#incidentDescription',
  type: '#incidentType',
  severity: '#incidentSeverity',
  location: '#incidentLocation',
  status: '#incidentStatus',
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
  const validStatuses = ['ACTIVE', 'VERIFIED', 'CLOSED'];
  return validStatuses.includes(status);
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

export async function validateAddIncidentData(data) {
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

  if (data?.location && isRequired(data.location)) {
    const locationResult = await isLocationReal(data.location);
    if (!locationResult.isValid) {
      pushFieldError(
        errors,
        'location',
        'The location provided could not be found. Please enter a valid address.',
      );
    } else {
      data.latitude = locationResult.lat;
      data.longitude = locationResult.lon;
    }
  }

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

export async function validateAddIncidentPayload(payload) {
  const errorList = await validateAddIncidentData(payload);

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
    validateAddIncidentData,
  };
}
