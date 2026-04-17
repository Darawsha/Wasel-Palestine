const links = document.querySelectorAll(".header-component__nav-link");

function normalizeRoute(routeValue = "") {
  const value = String(routeValue || "")
    .replace(/^#/, "")
    .trim()
    .toLowerCase();

  if (!value) return "home";
  if (value === "routeplanner") return "route-planner";
  return value;
}

function updateActiveLink() {
  const currentRoute = normalizeRoute(window.location.hash);
  links.forEach((link) => {
    const targetRoute =
      link.getAttribute("data-route") || link.getAttribute("href") || "";
    const normalizedTarget = normalizeRoute(targetRoute);
    const isActive = normalizedTarget === currentRoute;

    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

updateActiveLink();
window.addEventListener("hashchange", updateActiveLink);
window.updateActiveLink = updateActiveLink;
window.CitizenPreview?.applyShellState?.();

function setupAvatarMenu() {
  const actions = document.querySelector(".header-component__actions");
  const avatarButton = document.querySelector(".header-component__avatar");
  if (!actions || !avatarButton) return;

  let avatarMenu = actions.querySelector(".header-component__avatar-menu");

  if (!avatarMenu) {
    avatarMenu = document.createElement("div");
    avatarMenu.className = "header-component__avatar-menu";
    avatarMenu.setAttribute("role", "menu");
    avatarMenu.setAttribute("aria-label", "User menu");
    avatarMenu.innerHTML = `
      <button type="button" class="header-component__avatar-menu-item" role="menuitem" data-action="profile">
        <span class="material-symbols-outlined" aria-hidden="true">person</span>
        <span>Profile</span>
      </button>
      <button type="button" class="header-component__avatar-menu-item header-component__avatar-menu-item--danger" role="menuitem" data-action="logout">
        <span class="material-symbols-outlined" aria-hidden="true">logout</span>
        <span>Logout</span>
      </button>
    `;

    actions.appendChild(avatarMenu);
  }

  avatarButton.setAttribute("aria-expanded", "false");

  function closeMenu() {
    avatarMenu.classList.remove("header-component__avatar-menu--open");
    avatarButton.setAttribute("aria-expanded", "false");
  }

  avatarButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = avatarMenu.classList.toggle(
      "header-component__avatar-menu--open",
    );
    avatarButton.setAttribute("aria-expanded", String(isOpen));
  });

  avatarMenu.addEventListener("click", (event) => {
    const button = event.target.closest(".header-component__avatar-menu-item");
    if (!button) return;

    const action = button.getAttribute("data-action");
    if (action === "profile") {
      window.HeaderProfileModal?.open?.();
    }
    if (action === "logout") {
      window.HeaderLogoutModal?.open?.();
    }

    closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".header-component__actions")) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

setupAvatarMenu();
