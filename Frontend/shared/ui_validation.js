
export function pushFieldError(errors, field, message) {
  errors.push({ field, message });
}


export function buildErrorMap(errorList) {
  return errorList.reduce((fieldErrors, error) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = error.message;
    }
    return fieldErrors;
  }, {});
}


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

export function applyValidationErrors(form, fieldErrors = {}, getFieldElementCallback) {
  const errorEntries = Object.entries(fieldErrors);

  if (!form || errorEntries.length === 0) return;

  errorEntries.forEach(([fieldName, message]) => {
    const fieldElement = getFieldElementCallback(form, fieldName);

    if (!fieldElement) return;

    fieldElement.classList.add('input-error');
    
    insertErrorMessage(fieldElement, message, fieldName);
  });
}