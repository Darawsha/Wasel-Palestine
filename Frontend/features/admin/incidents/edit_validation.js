import {
  isRequired,
  isValidType,
  isValidSeverity,
  isValidStatus,
} from '/features/admin/incidents/validation.js';

const EDIT_FIELD_SELECTORS = {
  title: '#editIncidentTitle',
  description: '#editIncidentDescription',
  type: '#editIncidentType',
  severity: '#editIncidentSeverity',
  location: '#editIncidentLocation',
  status: '#editIncidentStatus',
};

function getFieldElement(form, fieldName) {
  return form?.querySelector(EDIT_FIELD_SELECTORS[fieldName] || '');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function pushFieldError(errors, field, message) {
  errors.push({ field, message });
}

function validateLength(value, field, label, min, max, errors) {
  const normalizedValue = normalizeText(value);

  if (!isRequired(normalizedValue)) {
    pushFieldError(errors, field, `${label} is required.`);
    return;
  }

  if (normalizedValue.length < min) {
    pushFieldError(errors, field, `${label} must be at least ${min} characters.`);
    return;
  }

  if (max && normalizedValue.length > max) {
    pushFieldError(errors, field, `${label} must not exceed ${max} characters.`);
  }
}

function buildErrorMap(errorList) {
  return errorList.reduce((fieldErrors, error) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = error.message;
    }

    return fieldErrors;
  }, {});
}

function insertErrorMessage(fieldElement, message, fieldName) {
  if (!fieldElement?.parentElement) {
    return;
  }

  const errorElement = document.createElement('p');
  errorElement.className = 'field-error';
  errorElement.dataset.errorFor = fieldName;
  errorElement.textContent = message;

  const container =
    fieldElement.closest('.input-wrapper') ||
    fieldElement.closest('.select-wrapper') ||
    fieldElement;

  container.insertAdjacentElement('afterend', errorElement);
}

export function collectEditIncidentFormData(form) {
  const title = normalizeText(getFieldElement(form, 'title')?.value);
  const description = normalizeText(getFieldElement(form, 'description')?.value);
  const type = normalizeText(getFieldElement(form, 'type')?.value).toUpperCase();
  const severity = normalizeText(getFieldElement(form, 'severity')?.value).toUpperCase();
  const location = normalizeText(getFieldElement(form, 'location')?.value);
  const status = normalizeText(getFieldElement(form, 'status')?.value).toUpperCase();

  return {
    title,
    description,
    type,
    severity,
    location: location || undefined,
    status: status || undefined,
  };
}

export function validateEditIncidentPayload(payload) {
  const errors = [];

  validateLength(payload?.title, 'title', 'Title', 3, 150, errors);
  validateLength(payload?.description, 'description', 'Description', 10, null, errors);

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

  // checkpointId (location) is optional — backend accepts null

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
  if (!form) {
    return;
  }

  form.querySelectorAll('.input-error').forEach((element) => {
    element.classList.remove('input-error');
  });

  form.querySelectorAll('.field-error').forEach((element) => {
    element.remove();
  });
}

export function applyEditValidationErrors(form, fieldErrors = {}) {
  const errorEntries = Object.entries(fieldErrors);

  if (!form || errorEntries.length === 0) {
    return;
  }

  errorEntries.forEach(([fieldName, message]) => {
    const fieldElement = getFieldElement(form, fieldName);

    if (!fieldElement) {
      return;
    }

    fieldElement.classList.add('input-error');
    insertErrorMessage(fieldElement, message, fieldName);
  });
}
