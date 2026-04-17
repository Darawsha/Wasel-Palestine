(function (global) {
  const FORM_SELECTOR = '#profileSettingsForm';
  const SAVE_BUTTON_SELECTOR = '.btn-primary';
  const FULL_NAME_SELECTOR = '#fullName';
  const EMAIL_SELECTOR = '#email';
  const PHONE_SELECTOR = '#phone';
  const ADDRESS_SELECTOR = '#address';
  const LANGUAGE_SELECTOR = '#language';
  const CURRENT_PASSWORD_SELECTOR = '#currentPassword';
  const NEW_PASSWORD_SELECTOR = '#newPassword';
  const CONFIRM_PASSWORD_SELECTOR = '#confirmPassword';
  const STRENGTH_BAR_SELECTOR = '.strength-bar';
  const STRENGTH_TEXT_SELECTOR = '.strength-text';
  const AVATAR_SELECTOR = '.avatar-circle';
  const PROFILE_NAME_SELECTOR = '[data-profile-name]';
  const PROFILE_META_SELECTOR = '[data-profile-meta]';
  const PROFILE_STATUS_SELECTOR = '[data-profile-status]';
  const CHANGE_PHOTO_SELECTOR = '.change-photo-link';
  const FILE_INPUT_SELECTOR = '#fileInput';
  const MAX_PROFILE_IMAGE_BYTES = 700 * 1024;
  const DEFAULT_LANGUAGE = 'English';
  const ALLOWED_LANGUAGES = new Set(['English', 'Arabic']);

  const stateByRoot = new WeakMap();
  const rootByForm = new WeakMap();
  let dependenciesPromise;

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/profile.controller.js');
    }

    return dependenciesPromise;
  }

  function getRootState(root) {
    if (!stateByRoot.has(root)) {
      stateByRoot.set(root, {
        latestProfile: null,
        draftAvatarImage: undefined,
        loadedFromDatabase: false,
      });
    }

    return stateByRoot.get(root);
  }

  function getFormElements(root) {
    return {
      form: root.querySelector(FORM_SELECTOR),
      fullName: root.querySelector(FULL_NAME_SELECTOR),
      email: root.querySelector(EMAIL_SELECTOR),
      phone: root.querySelector(PHONE_SELECTOR),
      address: root.querySelector(ADDRESS_SELECTOR),
      language: root.querySelector(LANGUAGE_SELECTOR),
      currentPassword: root.querySelector(CURRENT_PASSWORD_SELECTOR),
      newPassword: root.querySelector(NEW_PASSWORD_SELECTOR),
      confirmPassword: root.querySelector(CONFIRM_PASSWORD_SELECTOR),
      saveButton: root.querySelector(SAVE_BUTTON_SELECTOR),
      strengthBars: Array.from(root.querySelectorAll(STRENGTH_BAR_SELECTOR)),
      strengthText: root.querySelector(STRENGTH_TEXT_SELECTOR),
      avatarCircle: root.querySelector(AVATAR_SELECTOR),
      profileName: root.querySelector(PROFILE_NAME_SELECTOR),
      profileMeta: root.querySelector(PROFILE_META_SELECTOR),
      profileStatus: root.querySelector(PROFILE_STATUS_SELECTOR),
      changePhotoLink: root.querySelector(CHANGE_PHOTO_SELECTOR),
      fileInput: root.querySelector(FILE_INPUT_SELECTOR),
    };
  }

  function getInitials(fullName, email) {
    const parts = String(fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length > 0) {
      return parts.map((part) => part[0]?.toUpperCase() || '').join('');
    }

    const emailInitial = String(email || '').trim().charAt(0).toUpperCase();
    return emailInitial || 'U';
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeLanguage(value) {
    const normalizedValue = normalizeText(value);
    return ALLOWED_LANGUAGES.has(normalizedValue)
      ? normalizedValue
      : DEFAULT_LANGUAGE;
  }

  function splitFullName(fullName) {
    const parts = normalizeText(fullName).split(/\s+/).filter(Boolean);

    return {
      firstname: parts.shift() || '',
      lastname: parts.join(' '),
    };
  }

  function buildFullName(user) {
    const firstname = normalizeText(user?.firstname || user?.firstName);
    const lastname = normalizeText(user?.lastname || user?.lastName);
    const directName = normalizeText(user?.fullName || user?.name);

    if (firstname || lastname) {
      return `${firstname} ${lastname}`.trim();
    }

    if (directName) {
      return directName;
    }

    return normalizeText(user?.email).split('@')[0] || 'User';
  }

  function normalizeProfile(user) {
    const fullName = buildFullName(user);
    const email = normalizeText(user?.email);

    return {
      id: user?.id ?? null,
      firstname: normalizeText(user?.firstname || user?.firstName),
      lastname: normalizeText(user?.lastname || user?.lastName),
      fullName,
      email,
      phone: normalizeText(user?.phone),
      address: normalizeText(user?.address),
      language: normalizeLanguage(user?.language || user?.preferredLanguage),
      role: normalizeText(user?.role),
      profileImage: user?.profileImage || null,
      provider: normalizeText(user?.provider),
      isVerified: Boolean(user?.isVerified),
      profileImageUpdatedAt: user?.profileImageUpdatedAt || null,
      initials: getInitials(fullName, email),
    };
  }

  function getApiBaseUrl() {
    if (global.AppConfig?.API_BASE_URL) {
      return global.AppConfig.API_BASE_URL;
    }

    return `${global.location.origin}/api/v1`;
  }

  function buildApiUrl(path) {
    const baseUrl = getApiBaseUrl();
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    return new URL(cleanPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
      .toString();
  }

  function storeCurrentUser(user) {
    global.localStorage?.setItem('user', JSON.stringify(user));

    const profileImage = String(user?.profileImage || '').trim();
    if (profileImage) {
      global.localStorage?.setItem('profileImage', profileImage);
    } else {
      global.localStorage?.removeItem('profileImage');
    }

    const language = normalizeLanguage(user?.language || user?.preferredLanguage);
    global.localStorage?.setItem('wasel.user.language', language);
    global.dispatchEvent(
      new CustomEvent('wasel:user-updated', {
        detail: {
          user,
          language,
        },
      }),
    );
  }

  function buildUpdatePayload(draft) {
    const { firstname, lastname } = splitFullName(draft.fullName);
    const payload = {
      firstname,
      lastname,
      phone: normalizeText(draft.phone) || null,
      address: normalizeText(draft.address) || null,
    };

    const language = normalizeText(draft.language);
    if (!ALLOWED_LANGUAGES.has(language)) {
      throw new Error('Language must be English or Arabic.');
    }

    payload.language = language;

    if (Object.prototype.hasOwnProperty.call(draft, 'profileImage')) {
      payload.profileImage =
        typeof draft.profileImage === 'string' && draft.profileImage
          ? draft.profileImage
          : null;
    }

    if (normalizeText(draft.newPassword)) {
      if (normalizeText(draft.currentPassword)) {
        payload.currentPassword = draft.currentPassword;
      }

      payload.newPassword = draft.newPassword;
    }

    return payload;
  }

  async function fetchDatabaseProfile(token) {
    const response = await global.fetch(buildApiUrl('/auth/profile'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let data = text;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (_error) {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(response.statusText || 'Profile reload failed');
      error.response = {
        status: response.status,
        data,
      };
      throw error;
    }

    return data;
  }

  async function persistProfileDraft(draft) {
    const token = global.localStorage?.getItem('token');
    if (!token) {
      throw new Error('Authentication token is missing');
    }

    const response = await global.fetch(buildApiUrl('/auth/profile'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildUpdatePayload(draft)),
    });

    const text = await response.text();
    let data = text;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (_error) {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(response.statusText || 'Profile update failed');
      error.response = {
        status: response.status,
        data,
      };
      throw error;
    }

    let databaseUser = data;

    try {
      databaseUser = await fetchDatabaseProfile(token);
    } catch (error) {
      console.warn('Profile saved, but database reload failed', error);
    }

    storeCurrentUser(databaseUser);
    return normalizeProfile(databaseUser);
  }

  function applyAvatarImage(avatarCircle, image, initials) {
    if (!avatarCircle) {
      return;
    }

    if (image) {
      global.applyProfileAvatarImage?.(avatarCircle, image);
      if (!avatarCircle.style.backgroundImage) {
        avatarCircle.style.backgroundImage = `url(${image})`;
        avatarCircle.style.backgroundSize = 'cover';
        avatarCircle.style.backgroundPosition = 'center';
        avatarCircle.style.backgroundRepeat = 'no-repeat';
        avatarCircle.textContent = '';
      }
      return;
    }

    global.clearProfileAvatarImage?.(avatarCircle, initials);
    if (avatarCircle.style.backgroundImage) {
      avatarCircle.style.backgroundImage = '';
      avatarCircle.style.backgroundSize = '';
      avatarCircle.style.backgroundPosition = '';
      avatarCircle.style.backgroundRepeat = '';
    }
    avatarCircle.textContent = initials;
  }

  function formatRole(role) {
    const normalizedRole = String(role || '').trim().toLowerCase();
    if (!normalizedRole) {
      return 'Account';
    }

    return `${normalizedRole.charAt(0).toUpperCase()}${normalizedRole.slice(1)} account`;
  }

  function setProfileStatus(elements, message) {
    if (elements.profileStatus) {
      elements.profileStatus.textContent = message;
    }
  }

  function applyProfile(root, profile) {
    const state = getRootState(root);
    const elements = getFormElements(root);
    const nextProfile = profile || state.latestProfile;

    if (!nextProfile) {
      return;
    }

    const avatarImage =
      state.draftAvatarImage !== undefined
        ? state.draftAvatarImage
        : nextProfile.profileImage;
    const initials =
      nextProfile.initials || getInitials(nextProfile.fullName, nextProfile.email);

    if (elements.fullName) {
      elements.fullName.value = nextProfile.fullName || '';
    }

    if (elements.email) {
      elements.email.value = nextProfile.email || '';
    }

    if (elements.phone) {
      elements.phone.value = nextProfile.phone || '';
    }

    if (elements.address) {
      elements.address.value = nextProfile.address || '';
    }

    if (elements.language) {
      elements.language.value = normalizeLanguage(nextProfile.language);
    }

    applyAvatarImage(elements.avatarCircle, avatarImage, initials);

    if (elements.profileName) {
      elements.profileName.textContent = nextProfile.fullName || 'Profile';
    }

    if (elements.profileMeta) {
      elements.profileMeta.textContent = nextProfile.email
        ? `${formatRole(nextProfile.role)} - ${nextProfile.email}`
        : formatRole(nextProfile.role);
    }

    global.applyHeaderAvatar?.(avatarImage || '', { initials });
  }

  function applyDraftAvatar(root) {
    const state = getRootState(root);
    const elements = getFormElements(root);
    const fullName =
      elements.fullName?.value?.trim() || state.latestProfile?.fullName || '';
    const email = elements.email?.value?.trim() || state.latestProfile?.email;
    const initials =
      state.latestProfile?.initials || getInitials(fullName, email);
    const avatarImage =
      state.draftAvatarImage !== undefined
        ? state.draftAvatarImage
        : state.latestProfile?.profileImage || '';

    applyAvatarImage(elements.avatarCircle, avatarImage, initials);
    global.applyHeaderAvatar?.(avatarImage || '', { initials });
  }

  function collectProfileDraft(root) {
    const state = getRootState(root);
    const elements = getFormElements(root);

    return {
      fullName: elements.fullName?.value?.trim() || '',
      phone: elements.phone?.value?.trim() || '',
      address: elements.address?.value?.trim() || '',
      language: elements.language?.value || DEFAULT_LANGUAGE,
      currentPassword: elements.currentPassword?.value || '',
      newPassword: elements.newPassword?.value || '',
      ...(state.draftAvatarImage !== undefined
        ? { profileImage: state.draftAvatarImage }
        : {}),
    };
  }

  function normalizeDraft(draft) {
    return JSON.stringify({
      fullName: String(draft?.fullName || '').trim(),
      phone: String(draft?.phone || '').trim(),
      address: String(draft?.address || '').trim(),
      language: normalizeLanguage(draft?.language),
      profileImage: String(draft?.profileImage || ''),
    });
  }

  function hasUnsavedChanges(root) {
    const state = getRootState(root);
    if (!state.latestProfile) {
      return true;
    }
    
    const currentDraft = normalizeDraft({
      ...collectProfileDraft(root),
      profileImage:
        state.draftAvatarImage !== undefined
          ? state.draftAvatarImage
          : state.latestProfile.profileImage || '',
    });
    const lastSaved = normalizeDraft(state.latestProfile);
    const imageChanged =
      state.draftAvatarImage !== undefined &&
      state.draftAvatarImage !== (state.latestProfile.profileImage || '');
    
    return currentDraft !== lastSaved || imageChanged;
  }

  function isValidPhone(phone) {
    return !phone || /^\+?[0-9]{7,15}$/.test(String(phone).trim());
  }

  function scorePassword(password) {
    const value = String(password || '');
    let score = 0;

    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    return score;
  }

  function updatePasswordStrength(elements) {
    const password = elements.newPassword?.value || '';
    const score = scorePassword(password);
    const labels = [
      'Weak Password',
      'Weak Password',
      'Fair Password',
      'Strong Password',
      'Strong Password',
    ];

    elements.strengthBars.forEach((bar, index) => {
      bar.classList.toggle('active', index < score);
    });

    if (elements.strengthText) {
      elements.strengthText.textContent = password
        ? labels[score]
        : 'Enter a new password';
    }
  }

  function getErrorMessage(error, fallbackMessage) {
    const apiMessage = error?.response?.data?.message;

    if (Array.isArray(apiMessage) && apiMessage.length > 0) {
      return apiMessage.join(', ');
    }

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  }

  function validateDraft(root) {
    const elements = getFormElements(root);
    const draft = collectProfileDraft(root);

    if (!draft.fullName) {
      return 'Full name is required.';
    }

    if (!isValidPhone(draft.phone)) {
      return 'Please enter a valid phone number.';
    }

    if (!ALLOWED_LANGUAGES.has(normalizeText(elements.language?.value))) {
      return 'Language must be English or Arabic.';
    }

    const currentPassword = elements.currentPassword?.value?.trim() || '';
    const newPassword = elements.newPassword?.value || '';
    const confirmPassword = elements.confirmPassword?.value || '';
    const wantsPasswordChange = newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        return 'Current password is required to change your password.';
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        return 'New password must be at least 8 characters and include uppercase, lowercase, and a number.';
      }

      if (newPassword !== confirmPassword) {
        return 'New password and confirmation do not match.';
      }
    }

    return '';
  }

  function flashButtonState(button, text) {
    if (!button) {
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;

    window.setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1400);
  }

  function togglePassword(button) {
    const targetId = button.getAttribute('data-target');
    if (!targetId) {
      return;
    }

    const input = document.getElementById(targetId);
    if (!input) {
      return;
    }

    const icon = button.querySelector('.material-symbols-outlined');
    const isPassword = input.type === 'password';

    input.type = isPassword ? 'text' : 'password';
    if (icon) {
      icon.textContent = isPassword ? 'visibility_off' : 'visibility';
    }

    button.setAttribute(
      'aria-label',
      isPassword ? 'Hide password' : 'Show password',
    );
  }

  function clearPasswordFields(elements) {
    if (elements.currentPassword) {
      elements.currentPassword.value = '';
    }

    if (elements.newPassword) {
      elements.newPassword.value = '';
    }

    if (elements.confirmPassword) {
      elements.confirmPassword.value = '';
    }

    updatePasswordStrength(elements);
  }

  async function hydrateProfile(root) {
    const state = getRootState(root);
    const elements = getFormElements(root);
    const controller = await getDependencies();

    try {
      state.latestProfile = await controller.getCurrentProfile();
      state.draftAvatarImage = undefined;
      state.loadedFromDatabase = true;
      applyProfile(root, state.latestProfile);
      clearPasswordFields(elements);
      setProfileStatus(
        elements,
        'Profile details are loaded from the authenticated user record in the database.',
      );
    } catch (error) {
      console.error('Failed to hydrate citizen profile', error);
      const cachedProfile = controller.getCachedCurrentProfile?.();
      if (cachedProfile) {
        state.latestProfile = cachedProfile;
        state.draftAvatarImage = undefined;
        state.loadedFromDatabase = false;
        applyProfile(root, cachedProfile);
      }

      setProfileStatus(
        elements,
        getErrorMessage(
          error,
          'Profile details could not be loaded from the server right now.',
        ),
      );
    }
  }

  function handleAvatarSelection(root, file) {
    const elements = getFormElements(root);
    if (!file) {
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileStatus(
        elements,
        'Profile images must be 700 KB or smaller so they can be saved with your account.',
      );
      if (elements.fileInput) {
        elements.fileInput.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        return;
      }

      const state = getRootState(root);
      state.draftAvatarImage = result;
      applyDraftAvatar(root);
      setProfileStatus(
        elements,
        'New profile photo selected. Save changes to persist it to your account.',
      );
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();

    const root =
      rootByForm.get(event.currentTarget) ||
      event.currentTarget.closest('.header-profile-modal-content') ||
      document;
    const elements = getFormElements(root);
    const validationError = validateDraft(root);
    const state = getRootState(root);

    if (validationError) {
      setProfileStatus(elements, validationError);
      flashButtonState(elements.saveButton, 'Fix Required');
      return;
    }

    if (!state.loadedFromDatabase) {
      setProfileStatus(
        elements,
        'Profile details must be loaded from the database before saving changes.',
      );
      flashButtonState(elements.saveButton, 'Reload Required');
      return;
    }

    if (
      !hasUnsavedChanges(root) &&
      !(elements.newPassword?.value || elements.confirmPassword?.value)
    ) {
      setProfileStatus(elements, 'No profile changes to save.');
      flashButtonState(elements.saveButton, 'No Changes');
      return;
    }

    try {
      const draft = collectProfileDraft(root);
      setProfileStatus(elements, 'Saving profile changes to the database...');
      const savedProfile = await persistProfileDraft(draft);

      state.latestProfile = savedProfile;
      state.draftAvatarImage = undefined;
      state.loadedFromDatabase = true;
      applyProfile(root, savedProfile);
      global.WaselUserLanguage?.applyLanguage?.(savedProfile.language);
      clearPasswordFields(elements);
      if (elements.fileInput) {
        elements.fileInput.value = '';
      }
      setProfileStatus(
        elements,
        'Profile changes were saved to the authenticated user record in the database.',
      );
      flashButtonState(elements.saveButton, 'Saved');
    } catch (error) {
      console.error('Failed to save citizen profile', error);
      setProfileStatus(
        elements,
        getErrorMessage(
          error,
          'Profile changes could not be saved right now. Please try again.',
        ),
      );
      flashButtonState(elements.saveButton, 'Save Failed');
    }
  }

  function bindProfileForm(root) {
    const elements = getFormElements(root);
    if (!elements.form || elements.form.dataset.bound === 'true') {
      return;
    }

    elements.form.dataset.bound = 'true';
    rootByForm.set(elements.form, root);
    elements.form.addEventListener('submit', handleSave);
    elements.newPassword?.addEventListener('input', () => {
      updatePasswordStrength(elements);
    });
    elements.changePhotoLink?.addEventListener('click', (event) => {
      event.preventDefault();
      elements.fileInput?.click();
    });
    elements.fileInput?.addEventListener('change', (event) => {
      handleAvatarSelection(root, event.target?.files?.[0]);
    });
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('.password-toggle');
    if (!button) {
      return;
    }

    event.preventDefault();
    togglePassword(button);
  }

  global.initProfilePage = function initProfilePage(root) {
    const scope = root instanceof Element ? root : document;
    bindProfileForm(scope);
    void hydrateProfile(scope);
  };

  if (!global.__profilePasswordToggleBound) {
    document.addEventListener('click', onDocumentClick);
    global.__profilePasswordToggleBound = true;
  }
})(window);
