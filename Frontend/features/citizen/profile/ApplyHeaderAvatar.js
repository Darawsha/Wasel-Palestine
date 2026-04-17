(function (global) {
  const USER_KEY = 'user';
  const PROFILE_IMAGE_KEY = 'profileImage';

  function readCurrentUser() {
    try {
      const rawUser = global.localStorage?.getItem(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (_error) {
      return null;
    }
  }

  function buildInitials(user) {
    const fullName = [
      String(user?.firstname || user?.firstName || '').trim(),
      String(user?.lastname || user?.lastName || '').trim(),
    ]
      .join(' ')
      .trim();
    const parts = fullName.split(/\s+/).filter(Boolean).slice(0, 2);

    if (parts.length > 0) {
      return parts.map((part) => part[0]?.toUpperCase() || '').join('');
    }

    const emailInitial = String(user?.email || '').trim().charAt(0).toUpperCase();
    return emailInitial || 'U';
  }

  function getStoredImage(user) {
    const profileImage = String(user?.profileImage || '').trim();
    if (profileImage) {
      return profileImage;
    }

    return String(global.localStorage?.getItem(PROFILE_IMAGE_KEY) || '').trim();
  }

  function applyHeaderAvatar(image, options = {}) {
    const profileBtn = document.querySelector('.header-component__avatar');
    if (!profileBtn) {
      return;
    }

    if (global.CitizenPreview?.isActive?.()) {
      profileBtn.style.backgroundImage = '';
      profileBtn.textContent = 'P';
      return;
    }

    const user = readCurrentUser();
    const initials = String(options.initials || buildInitials(user) || 'U');
    profileBtn.dataset.initials = initials;

    if (!image) {
      profileBtn.style.backgroundImage = '';
      profileBtn.style.backgroundSize = '';
      profileBtn.style.backgroundPosition = '';
      profileBtn.style.backgroundRepeat = '';
      profileBtn.textContent = initials;
      return;
    }

    profileBtn.style.backgroundImage = `url(${image})`;
    profileBtn.style.backgroundSize = 'cover';
    profileBtn.style.backgroundPosition = 'center';
    profileBtn.style.backgroundRepeat = 'no-repeat';
    profileBtn.textContent = '';
  }

  function syncStoredHeaderAvatar() {
    if (global.CitizenPreview?.isActive?.()) {
      global.CitizenPreview.applyShellState?.();
      return;
    }

    const user = readCurrentUser();
    applyHeaderAvatar(getStoredImage(user), {
      initials: buildInitials(user),
    });
  }

  global.applyHeaderAvatar = applyHeaderAvatar;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      syncStoredHeaderAvatar();
    });
  } else {
    syncStoredHeaderAvatar();
  }
})(window);
