const FIELD_SELECTORS = {
  name: '#cpName',
  location: '#cpLocation',
  status: '#cpStatus',
  notes: '#cpNotes',
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

export function isValidStatus(status) {
  const validStatuses = ['ACTIVE', 'DELAYED', 'RESTRICTED', 'CLOSED'];
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

/**
 * Validates the checkpoint data for both creation and update.
 */
export function validateCheckpointData(data) {
  const errors = [];

  validateLength(data?.name, 'name', 'Checkpoint Name', 3, 100, errors);
  validateLength(data?.location, 'location', 'Location', 3, 255, errors);

  if (!isRequired(data?.status)) {
    pushFieldError(errors, 'status', 'Status is required.');
  } else if (!isValidStatus(data?.status)) {
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

/**
 * Collects data from the given form based on standardized selectors.
 */
export function collectCheckpointFormData(form) {
  const name = normalizeText(getFieldElement(form, 'name')?.value);
  const location = normalizeText(getFieldElement(form, 'location')?.value);
  const status = normalizeText(getFieldElement(form, 'status')?.value).toUpperCase();
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
export function validateCheckpointPayload(payload) {
  const errorList = validateCheckpointData(payload);

  return {
    isValid: errorList.length === 0,
    errors: buildErrorMap(errorList),
    messages: errorList.map((error) => error.message),
  };
}

/**
 * Clears all validation error messages and styling from the form.
 */
export function clearValidationErrors(form) {
  if (!form) return;

  form.querySelectorAll('.input-error').forEach((element) => {
    element.classList.remove('input-error');
  });

  form.querySelectorAll('.field-error').forEach((element) => {
    element.remove();
  });
}

function insertErrorMessage(fieldElement, message, fieldName) {
  if (!fieldElement?.parentElement) return;

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

/**
 * Applies validation errors to form fields.
 */
export function applyValidationErrors(form, fieldErrors = {}) {
  const errorEntries = Object.entries(fieldErrors);

  if (!form || errorEntries.length === 0) return;

  errorEntries.forEach(([fieldName, message]) => {
    const fieldElement = getFieldElement(form, fieldName);

    if (!fieldElement) return;

    fieldElement.classList.add('input-error');
    insertErrorMessage(fieldElement, message, fieldName);
  });
}
