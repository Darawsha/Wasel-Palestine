(function (global) {
  const FORM_SELECTOR = '#profileSettingsForm';
  const SAVE_BUTTON_SELECTOR = '.btn-primary';
  const FULL_NAME_SELECTOR = '#fullName';
  const EMAIL_SELECTOR = '#email';
  const PHONE_SELECTOR = '#phone';
  const ADDRESS_SELECTOR = '#address';
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

  const stateByRoot = new WeakMap();
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

    applyAvatarImage(elements.avatarCircle, avatarImage, initials);

    if (elements.profileName) {
      elements.profileName.textContent = nextProfile.fullName || 'Profile';
    }

    if (elements.profileMeta) {
      const providerLabel = nextProfile.provider
        ? ` via ${String(nextProfile.provider).charAt(0).toUpperCase()}${String(nextProfile.provider).slice(1)}`
        : '';
      elements.profileMeta.textContent = nextProfile.email
        ? `${formatRole(nextProfile.role)}${providerLabel} - ${nextProfile.email}`
        : `${formatRole(nextProfile.role)}${providerLabel}`;
    }

    global.applyHeaderAvatar?.(avatarImage || '', { initials });
  }

  function collectProfileDraft(root) {
    const state = getRootState(root);
    const elements = getFormElements(root);

    return {
      fullName: elements.fullName?.value?.trim() || '',
      phone: elements.phone?.value?.trim() || '',
      address: elements.address?.value?.trim() || '',
      profileImage:
        state.draftAvatarImage !== undefined
          ? state.draftAvatarImage
          : state.latestProfile?.profileImage || '',
      currentPassword: elements.currentPassword?.value || '',
      newPassword: elements.newPassword?.value || '',
    };
  }

  function normalizeDraft(draft) {
    return JSON.stringify({
      fullName: String(draft?.fullName || '').trim(),
      phone: String(draft?.phone || '').trim(),
      address: String(draft?.address || '').trim(),
      profileImageExists: !!draft?.profileImage,  // ← Check if exists, don't serialize it
    });
  }

  function hasUnsavedChanges(root) {
    const state = getRootState(root);
    if (!state.latestProfile) {
      return false;
    }
    
    const currentDraft = normalizeDraft(collectProfileDraft(root));
    const lastSaved = normalizeDraft(state.latestProfile);
    
    // Also check if profile image changed
    const imageChanged = state.draftAvatarImage !== undefined;
    
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

    const currentPassword = elements.currentPassword?.value?.trim() || '';
    const newPassword = elements.newPassword?.value || '';
    const confirmPassword = elements.confirmPassword?.value || '';
    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

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
      state.draftAvatarImage = state.latestProfile.profileImage || '';
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
        state.draftAvatarImage = cachedProfile.profileImage || '';
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
      applyProfile(root, state.latestProfile);
      setProfileStatus(
        elements,
        'New profile photo selected. Save changes to persist it to your account.',
      );
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();

    const root = event.currentTarget.closest('#headerProfileOverlay') || document;
    const elements = getFormElements(root);
    const validationError = validateDraft(root);

    if (validationError) {
      setProfileStatus(elements, validationError);
      flashButtonState(elements.saveButton, 'Fix Required');
      return;
    }

    if (
      !hasUnsavedChanges(root) &&
      !(elements.currentPassword?.value || elements.newPassword?.value || elements.confirmPassword?.value)
    ) {
      setProfileStatus(elements, 'No profile changes to save.');
      flashButtonState(elements.saveButton, 'No Changes');
      return;
    }

    try {
      const controller = await getDependencies();
      const state = getRootState(root);
      const draft = collectProfileDraft(root);
      console.log('📝 Profile Draft:', draft);
      
      const savedProfile = await controller.persistCurrentProfile(draft);
      console.log('✅ Profile Saved:', savedProfile);

      state.latestProfile = savedProfile;
      state.draftAvatarImage = savedProfile.profileImage || '';
      applyProfile(root, savedProfile);
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
      console.error('❌ Failed to save citizen profile', error);
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
