import { isLocationReal } from '/shared/location_validator.js';

import {
  pushFieldError,
  buildErrorMap,
  clearValidationErrors as sharedClearErrors,
  applyValidationErrors as sharedApplyErrors,
} from '/shared/ui_validation.js';

const FIELD_SELECTORS = {
  name: '#cpName',
  location: '#cpLocation',
  status: '#cpStatus',
  notes: '#cpNotes',
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

export function isValidStatus(status) {
  const validStatuses = ['OPEN', 'DELAYED', 'RESTRICTED', 'CLOSED'];
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

/**
 * Validates the checkpoint data for both creation and update.
 */
export async function validateCheckpointData(data, options = {}) {
  const errors = [];
  const requireStatus = options.requireStatus !== false;

  validateLength(data?.name, 'name', 'Checkpoint Name', 3, 100, errors);
  validateLength(data?.location, 'location', 'Location', 3, 255, errors);

  if (requireStatus && !isRequired(data?.status)) {
    pushFieldError(errors, 'status', 'Status is required.');
  } else if (data?.status && !isValidStatus(data?.status)) {
    pushFieldError(errors, 'status', 'Please select a valid status.');
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

  return errors;
}

/**
 * Collects data from the given form based on standardized selectors.
 */
export function collectCheckpointFormData(form) {
  const name = normalizeText(getFieldElement(form, 'name')?.value);
  const location = normalizeText(getFieldElement(form, 'location')?.value);
  const statusField = getFieldElement(form, 'status');
  const status = statusField?.disabled
    ? ''
    : normalizeText(statusField?.value).toUpperCase();
  const notes = normalizeText(getFieldElement(form, 'notes')?.value);

  return {
    name,
    location,
    status,
    notes: notes || undefined,
  };
}

/**
 * Validates the form payload and returns a status object.
 */
export async function validateCheckpointPayload(payload, options = {}) {
  const errorList = await validateCheckpointData(payload, options);

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
