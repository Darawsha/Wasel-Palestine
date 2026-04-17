(function (global) {
  const LOGOUT_HTML = "/features/citizen/logout/Logout.html";
  const LOGOUT_CSS = "/features/citizen/logout/Logout.css";
  const OVERLAY_ID = "headerLogoutOverlay";
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

  function getOrCreateOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "header-profile-overlay hidden";
    overlay.innerHTML = '<div class="header-logout-modal-content"></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function close() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const content = overlay.querySelector(".header-logout-modal-content");

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

      const clickedLogoutButton = target.closest(".btn-logout");
      if (clickedLogoutButton) {
        import("/Services/session.service.js")
          .then(({ logoutUser }) => logoutUser())
          .catch((error) => console.error("Error during logout:", error));
        return;
      }

      const clickedCloseButton = target.closest(".btn-cancel");
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
    if (global.CitizenPreview?.isActive?.()) {
      global.CitizenPreview.notifyBlockedAction?.('Logout');
      return;
    }

    const overlay = getOrCreateOverlay();
    const content = overlay.querySelector(".header-logout-modal-content");
    if (!content) return;

    ensureStyle(LOGOUT_CSS);

    try {
      const res = await fetch(LOGOUT_HTML);
      if (!res.ok) {
        throw new Error("Failed to load logout page: " + res.status);
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const logoutRoot =
        doc.querySelector(".modal-overlay") ||
        doc.querySelector(".modal") ||
        doc.querySelector("main") ||
        doc.body;

      content.innerHTML = logoutRoot
        ? '<div class="logout-page-scope">' + logoutRoot.outerHTML + "</div>"
        : html;
      overlay.classList.remove("hidden");
      bindCloseHandlers(overlay);
    } catch (error) {
      console.error("Error opening logout modal:", error);
    }
  }

  global.HeaderLogoutModal = {
    open,
    close,
  };
})(window);
