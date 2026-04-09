/* Admin/Pages/ProfilePage/Profile.js */

(function (global) {
  const OVERLAY_SELECTOR = '#profileModalOverlay';
  const FORM_SELECTOR = '#profileSettingsForm';
  const SAVE_BUTTON_SELECTOR = '.btn-primary';
  const FULL_NAME_SELECTOR = '#fullName';
  const EMAIL_SELECTOR = '#email';
  const PHONE_SELECTOR = '#phone';
  const CURRENT_PASSWORD_SELECTOR = '#currentPassword';
  const NEW_PASSWORD_SELECTOR = '#newPassword';
  const CONFIRM_PASSWORD_SELECTOR = '#confirmPassword';
  const STRENGTH_BAR_SELECTOR = '.strength-bar';
  const STRENGTH_TEXT_SELECTOR = '.strength-text';
  const AVATAR_SELECTOR = '.avatar-circle';
  const PROFILE_NAME_SELECTOR = '[data-profile-name]';
  const PROFILE_META_SELECTOR = '[data-profile-meta]';
  const PROFILE_STATUS_SELECTOR = '[data-profile-status]';

  let dependenciesPromise;
  let latestProfile = null;

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/admin-profile.controller.js');
    }

    return dependenciesPromise;
  }

  function getOverlay() {
    return document.querySelector(OVERLAY_SELECTOR);
  }

  function getFormElements(root) {
    return {
      form: root.querySelector(FORM_SELECTOR),
      fullName: root.querySelector(FULL_NAME_SELECTOR),
      email: root.querySelector(EMAIL_SELECTOR),
      phone: root.querySelector(PHONE_SELECTOR),
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
    };
  }

  function getInitials(fullName) {
    const parts = String(fullName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return 'AD';
    }

    return parts.map((part) => part[0]?.toUpperCase() || '').join('');
  }

  function setAvatarInitials(avatarCircle, fullName) {
    if (!avatarCircle || avatarCircle.style.backgroundImage) {
      return;
    }

    avatarCircle.textContent = getInitials(fullName);
  }

  function applyProfile(elements, profile) {
    if (elements.fullName) {
      elements.fullName.value = profile.fullName || '';
    }

    if (elements.email) {
      elements.email.value = profile.email || '';
    }

    if (elements.phone) {
      elements.phone.value = profile.phone || '';
    }

    if (elements.avatarCircle) {
      elements.avatarCircle.textContent = profile.initials || getInitials(profile.fullName);
    }

    if (elements.profileName) {
      elements.profileName.textContent = profile.fullName || 'Admin User';
    }

    if (elements.profileMeta) {
      const roleLabel = profile.role
        ? `${String(profile.role).charAt(0).toUpperCase()}${String(profile.role).slice(1).toLowerCase()} account`
        : 'Administrator account';
      elements.profileMeta.textContent = profile.email
        ? `${roleLabel} - ${profile.email}`
        : roleLabel;
    }
  }

  function collectProfileDraft(elements) {
    return {
      fullName: elements.fullName?.value?.trim() || '',
      phone: elements.phone?.value?.trim() || '',
    };
  }

  function normalizeDraft(draft) {
    return {
      fullName: String(draft?.fullName || '').trim(),
      phone: String(draft?.phone || '').trim(),
    };
  }

  function hasUnsavedChanges(elements) {
    return JSON.stringify(normalizeDraft(collectProfileDraft(elements)))
      !== JSON.stringify(normalizeDraft(latestProfile));
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
    const labels = ['Weak Password', 'Weak Password', 'Fair Password', 'Strong Password', 'Strong Password'];

    elements.strengthBars.forEach((bar, index) => {
      bar.classList.toggle('active', index < score);
    });

    if (elements.strengthText) {
      elements.strengthText.textContent = password ? labels[score] : 'Enter a new password';
    }
  }

  function setProfileStatus(elements, message) {
    if (elements.profileStatus) {
      elements.profileStatus.textContent = message;
    }
  }

  function validateDraft(elements) {
    const draft = collectProfileDraft(elements);

    if (!draft.fullName) {
      return 'Full name is required.';
    }

    if (draft.phone && !window.validators?.isValidPhone?.(draft.phone)) {
      return 'Please enter a valid phone number.';
    }

    const currentPassword = elements.currentPassword?.value?.trim() || '';
    const newPassword = elements.newPassword?.value || '';
    const confirmPassword = elements.confirmPassword?.value || '';
    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!currentPassword) {
        return 'Current password is required to request a password change.';
      }

      if (newPassword.length < 8) {
        return 'New password must be at least 8 characters.';
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
    if (!targetId) return;

    const input = document.getElementById(targetId);
    if (!input) return;

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

  async function hydrateProfile(root) {
    const elements = getFormElements(root);

    try {
      const controller = await getDependencies();
      latestProfile = await controller.getAdminProfile();
      applyProfile(elements, latestProfile);
      updatePasswordStrength(elements);
      setAvatarInitials(elements.avatarCircle, latestProfile.fullName);
      setProfileStatus(
        elements,
        'Profile details are loaded from your current admin session. Name and phone changes are saved locally in the current frontend runtime.',
      );
    } catch (error) {
      console.error('Failed to hydrate admin profile', error);
      setProfileStatus(
        elements,
        'Profile details could not be refreshed from the API, so the card is showing the best available local session data.',
      );
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    const overlay = getOverlay();
    if (!overlay) {
      return;
    }

    const elements = getFormElements(overlay);
    const validationError = validateDraft(elements);

    if (validationError) {
      setProfileStatus(elements, validationError);
      flashButtonState(elements.saveButton, validationError);
      return;
    }

    if (!hasUnsavedChanges(elements)
      && !(elements.currentPassword?.value || elements.newPassword?.value || elements.confirmPassword?.value)) {
      setProfileStatus(elements, 'No new profile changes to save.');
      flashButtonState(elements.saveButton, 'No Changes');
      return;
    }

    try {
      const controller = await getDependencies();
      latestProfile = controller.persistAdminProfile(collectProfileDraft(elements));
      applyProfile(elements, latestProfile);
      global.applyHeaderAvatar?.(global.localStorage?.getItem('profileImage') || '');

      elements.currentPassword.value = '';
      elements.newPassword.value = '';
      elements.confirmPassword.value = '';
      updatePasswordStrength(elements);
      setProfileStatus(
        elements,
        'Profile card updated. Name and phone were saved in the current frontend runtime.',
      );

      flashButtonState(
        elements.saveButton,
        validateDraft(elements)
          ? 'Saved Locally'
          : 'Saved',
      );
    } catch (error) {
      console.error('Failed to save admin profile', error);
      setProfileStatus(
        elements,
        'Profile changes could not be saved right now. Please try again.',
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
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('.password-toggle');
    if (!button) return;

    event.preventDefault();
    togglePassword(button);
  }

  global.initAdminProfile = function initAdminProfile(root) {
    const scope = root instanceof Element ? root : getOverlay();
    if (!scope) {
      return;
    }

    bindProfileForm(scope);
    void hydrateProfile(scope);
  };

  if (!global.__profilePasswordToggleBound) {
    document.addEventListener('click', onDocumentClick);
    global.__profilePasswordToggleBound = true;
  }
})(window);
