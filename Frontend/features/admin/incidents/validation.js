const FIELD_SELECTORS = {
  title: '#incidentTitle',
  description: '#incidentDescription',
  type: '#incidentType',
  severity: '#incidentSeverity',
  location: '#incidentLocation',
  status: '#incidentStatus',
};

function getFieldElement(form, fieldName) {
  return form?.querySelector(FIELD_SELECTORS[fieldName] || '');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function pushFieldError(errors, field, message) {
  errors.push({ field, message });
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
    pushFieldError(errors, field, `${label} must be at least ${min} characters.`);
    return;
  }

  if (max && normalizedValue.length > max) {
    pushFieldError(errors, field, `${label} must not exceed ${max} characters.`);
  }
}

export function validateAddIncidentData(data) {
  const errors = [];

  validateLength(data?.title, 'title', 'Title', 3, 150, errors);
  validateLength(data?.description, 'description', 'Description', 10, null, errors);

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

  // checkpointId (location) is optional — backend accepts null

  if (data?.status && !isValidStatus(data?.status)) {
    pushFieldError(errors, 'status', 'Please select a valid status.');
  }

  return errors;
}

function buildErrorMap(errorList) {
  return errorList.reduce((fieldErrors, error) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = error.message;
    }

    return fieldErrors;
  }, {});
}

export function collectAddIncidentFormData(form) {
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

export function validateAddIncidentPayload(payload) {
  const errorList = validateAddIncidentData(payload);

  return {
    isValid: errorList.length === 0,
    errors: buildErrorMap(errorList),
    messages: errorList.map((error) => error.message),
  };
}

export function clearValidationErrors(form) {
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

export function applyValidationErrors(form, fieldErrors = {}) {
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

if (typeof window !== 'undefined') {
  window.incidentManagementValidators = {
    isRequired,
    isValidType,
    isValidSeverity,
    isValidStatus,
    validateAddIncidentData,
  };
}
