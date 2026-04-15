(function (global) {
  function applyProfileAvatarImage(avatarCircle, image) {
    if (!avatarCircle || !image) {
      return;
    }

    avatarCircle.style.backgroundImage = `url(${image})`;
    avatarCircle.style.backgroundSize = 'cover';
    avatarCircle.style.backgroundPosition = 'center';
    avatarCircle.style.backgroundRepeat = 'no-repeat';
    avatarCircle.textContent = '';
  }

  function clearProfileAvatarImage(avatarCircle, fallbackText = '') {
    if (!avatarCircle) {
      return;
    }

    avatarCircle.style.backgroundImage = '';
    avatarCircle.style.backgroundSize = '';
    avatarCircle.style.backgroundPosition = '';
    avatarCircle.style.backgroundRepeat = '';
    avatarCircle.textContent = fallbackText;
  }

  global.applyProfileAvatarImage = applyProfileAvatarImage;
  global.clearProfileAvatarImage = clearProfileAvatarImage;
  global.initProfileAvatarUpload = function initProfileAvatarUpload() {};
})(window);
