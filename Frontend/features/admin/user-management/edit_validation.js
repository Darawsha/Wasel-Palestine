import {
  isRequired,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidRole,
} from '/features/admin/user-management/validation.js';

const EDIT_FIELD_SELECTORS = {
  firstname: '#editFirstName',
  lastname: '#editLastName',
  email: '#editUserEmail',
  password: '#editUserPassword',
  role: '#editUserRole',
  phone: '#editUserPhone',
  address: '#editUserAddress',
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

function validateName(value, field, label, errors) {
  const normalizedValue = normalizeText(value);

  if (!isRequired(normalizedValue)) {
    pushFieldError(errors, field, `${label} is required.`);
    return;
  }

  if (normalizedValue.length < 2) {
    pushFieldError(errors, field, `${label} must be at least 2 characters.`);
    return;
  }

  if (normalizedValue.length > 50) {
    pushFieldError(errors, field, `${label} must not exceed 50 characters.`);
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

export function collectEditUserFormData(form) {
  const firstname = normalizeText(getFieldElement(form, 'firstname')?.value);
  const lastname = normalizeText(getFieldElement(form, 'lastname')?.value);
  const email = normalizeText(getFieldElement(form, 'email')?.value).toLowerCase();
  const password = String(getFieldElement(form, 'password')?.value || '');
  const role = normalizeText(getFieldElement(form, 'role')?.value);
  const rawPhone = normalizeText(getFieldElement(form, 'phone')?.value);
  const phone = rawPhone.replace(/\D/g, '');
  const address = normalizeText(getFieldElement(form, 'address')?.value);

  return {
    firstname,
    lastname,
    email,
    role,
    password: password || undefined,
    phone: rawPhone ? phone : null,
    address: address || null,
  };
}

export function validateEditUserPayload(payload) {
  const errors = [];
  const normalizedAddress = normalizeText(payload?.address);

  validateName(payload?.firstname, 'firstname', 'First name', errors);
  validateName(payload?.lastname, 'lastname', 'Last name', errors);

  if (!isRequired(payload?.email)) {
    pushFieldError(errors, 'email', 'Email is required.');
  } else if (!isValidEmail(payload?.email)) {
    pushFieldError(errors, 'email', 'Please enter a valid email address.');
  }

  if (!isRequired(payload?.role)) {
    pushFieldError(errors, 'role', 'Role is required.');
  } else if (!isValidRole(payload?.role)) {
    pushFieldError(errors, 'role', 'Role must be Admin or Citizen.');
  }

  if (payload?.password && !isValidPassword(payload.password)) {
    pushFieldError(errors, 'password', 'Password must be at least 8 characters long.');
  }

  if (!isValidPhone(payload?.phone)) {
    pushFieldError(errors, 'phone', 'Please enter a valid phone number.');
  }

  if (normalizedAddress.length > 200) {
    pushFieldError(errors, 'address', 'Address must not exceed 200 characters.');
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
