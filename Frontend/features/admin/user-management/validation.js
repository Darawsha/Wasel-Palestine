const FIELD_SELECTORS = {
  firstname: '#firstName',
  lastname: '#lastName',
  email: '#userEmail',
  password: '#userPassword',
  role: '#userRole',
  phone: '#userPhone',
  address: '#userAddress',
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

export function isValidEmail(email) {
  var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(normalizeText(email));
}

export function isValidPassword(password) {
  return normalizeText(password).length >= 8;
}

export function isValidPhone(phone) {
  if (!phone) {
    return true;
  }

  var pattern = /^\d{10,15}$/;
  return pattern.test(normalizeText(phone));
}

export function isValidRole(role) {
  return role === 'admin' || role === 'citizen';
}

function validateName(value, field, label, errors) {
  var normalizedValue = normalizeText(value);

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

export function validateAddUserData(data) {
  var errors = [];
  var address = normalizeText(data?.address);

  validateName(data?.firstname, 'firstname', 'First name', errors);
  validateName(data?.lastname, 'lastname', 'Last name', errors);

  if (!isRequired(data?.email)) {
    pushFieldError(errors, 'email', 'Email is required.');
  } else if (!isValidEmail(data?.email)) {
    pushFieldError(errors, 'email', 'Please enter a valid email address.');
  }

  if (!isRequired(data?.password)) {
    pushFieldError(errors, 'password', 'Password is required.');
  } else if (!isValidPassword(data?.password)) {
    pushFieldError(errors, 'password', 'Password must be at least 8 characters long.');
  }

  if (!isRequired(data?.role)) {
    pushFieldError(errors, 'role', 'Role is required.');
  } else if (!isValidRole(data?.role)) {
    pushFieldError(errors, 'role', 'Role must be Admin or Citizen.');
  }

  if (!isValidPhone(data?.phone)) {
    pushFieldError(errors, 'phone', 'Please enter a valid phone number.');
  }

  if (address.length > 200) {
    pushFieldError(errors, 'address', 'Address must not exceed 200 characters.');
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

export function collectAddUserFormData(form) {
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
    password,
    role,
    phone: phone || undefined,
    address: address || undefined,
  };
}

export function validateAddUserPayload(payload) {
  const errorList = validateAddUserData(payload);

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
  window.userManagementValidators = {
    isRequired,
    isValidEmail,
    isValidPassword,
    isValidPhone,
    isValidRole,
    validateAddUserData,
  };
}
