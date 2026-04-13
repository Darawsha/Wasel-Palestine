(function (global) {
  const PROFILE_HTML = "/features/citizen/profile/Profile.html";
  const PROFILE_CSS = "/features/citizen/profile/Profile.css";
  const PROFILE_JS = "/features/citizen/profile/Profile.js";
  const OVERLAY_ID = "headerProfileOverlay";
  let handlersBound = false;

  function ensureStyle(href) {
    const existing = document.querySelector(
      'link[rel="stylesheet"][href="' + href + '"]',
    );
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      return Promise.resolve(existing);
    }

    const script = document.createElement("script");
    script.src = src;

    return new Promise((resolve, reject) => {
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error("Unable to load script: " + src));
      document.body.appendChild(script);
    });
  }

  function getOrCreateOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "header-profile-overlay hidden";
    overlay.innerHTML = '<div class="header-profile-modal-content"></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function close() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const content = overlay.querySelector(".header-profile-modal-content");

    overlay.classList.add("hidden");
    if (content) {
      content.innerHTML = "";
    }
  }

  function bindCloseHandlers(overlay) {
    if (handlersBound) return;

    overlay.onclick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickedCloseButton = target.closest(
        ".header-profile-close-btn, .btn-cancel",
      );
      if (target === overlay || clickedCloseButton) {
        close();
      }
    };

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });

    handlersBound = true;
  }

  async function open() {
    const overlay = getOrCreateOverlay();
    const content = overlay.querySelector(".header-profile-modal-content");
    if (!content) return;

    ensureStyle(PROFILE_CSS);
    await ensureScript(PROFILE_JS);

    try {
      const res = await fetch(PROFILE_HTML);
      if (!res.ok) {
        throw new Error("Failed to load profile page: " + res.status);
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const profileRoot =
        doc.querySelector(".header-profile-card") ||
        doc.querySelector(".profile-card") ||
        doc.querySelector("main") ||
        doc.body;

      content.innerHTML = profileRoot
        ? '<div class="profile-page-scope">' + profileRoot.outerHTML + "</div>"
        : html;

      if (typeof window.initProfilePage === 'function') {
        window.initProfilePage(content);
      }
      
      overlay.classList.remove("hidden");
      bindCloseHandlers(overlay);
    } catch (error) {
      console.error("Error opening profile modal:", error);
    }
  }

  global.HeaderProfileModal = {
    open,
    close,
  };
})(window);
