let darkmode = localStorage.getItem("darkmode");
const themeSwitch = document.getElementById("theme-switch");
const header = document.querySelector(".header-component");
const root = document.documentElement;

const syncRootTheme = (isDark) => {
  if (!root) return;
  root.classList.toggle("dark", !!isDark);
};

const applyDarkToModals = () => {
  const modalSelectors = [
    ".alerts-add-subscription",
    ".alert-delete-page-scope",
    "#modalOverlay .submit-report-container",
    ".profile-page-scope",
    ".logout-page-scope",
  ];

  modalSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (!el.classList.contains("dark")) {
        el.classList.add("dark");
      }
    });
  });
};

const removeDarkFromModals = () => {
  const modalSelectors = [
    ".alerts-add-subscription",
    ".alert-delete-page-scope",
    "#modalOverlay .submit-report-container",
    ".profile-page-scope",
    ".logout-page-scope",
  ];

  modalSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.remove("dark");
    });
  });
};

const enableDarkMode = () => {
  syncRootTheme(true);

  if (header) {
    header.classList.add("darkmode");
  }

  const HomePage = document.getElementById("spa-page-home");
  const IncidentsPage = document.getElementById("spa-page-incidents");
  const RoutePlannerPage = document.getElementById("spa-page-route-planner");
  const MyReportsPage = document.getElementById("spa-page-myreports");
  const AlertsPage = document.getElementById("spa-page-alerts");

  if (HomePage) HomePage.classList.add("dark");
  if (IncidentsPage) IncidentsPage.classList.add("dark");
  if (RoutePlannerPage) RoutePlannerPage.classList.add("dark");
  if (MyReportsPage) MyReportsPage.classList.add("dark");
  if (AlertsPage) AlertsPage.classList.add("dark");

  applyDarkToModals();

  localStorage.setItem("darkmode", "enabled");
  darkmode = "enabled";
};

const disableDarkMode = () => {
  syncRootTheme(false);

  if (header) {
    header.classList.remove("darkmode");
  }

  const HomePage = document.getElementById("spa-page-home");
  if (HomePage) HomePage.classList.remove("dark");

  const IncidentsPage = document.getElementById("spa-page-incidents");
  if (IncidentsPage) IncidentsPage.classList.remove("dark");

  const RoutePlannerPage = document.getElementById("spa-page-route-planner");
  if (RoutePlannerPage) RoutePlannerPage.classList.remove("dark");

  const MyReportsPage = document.getElementById("spa-page-myreports");
  if (MyReportsPage) MyReportsPage.classList.remove("dark");

  const AlertsPage = document.getElementById("spa-page-alerts");
  if (AlertsPage) AlertsPage.classList.remove("dark");

  removeDarkFromModals();

  localStorage.setItem("darkmode", "disabled");
  darkmode = "disabled";
};

function applyDarkToSPAIfNeeded() {
  if (darkmode === "enabled") {
    const HomePage = document.getElementById("spa-page-home");
    if (HomePage && !HomePage.classList.contains("dark")) {
      HomePage.classList.add("dark");
    }

    const IncidentsPage = document.getElementById("spa-page-incidents");
    if (IncidentsPage && !IncidentsPage.classList.contains("dark")) {
      IncidentsPage.classList.add("dark");
    }

    const RoutePlannerPage = document.getElementById("spa-page-route-planner");
    if (RoutePlannerPage && !RoutePlannerPage.classList.contains("dark")) {
      RoutePlannerPage.classList.add("dark");
    }

    const MyReportsPage = document.getElementById("spa-page-myreports");
    if (MyReportsPage && !MyReportsPage.classList.contains("dark")) {
      MyReportsPage.classList.add("dark");
    }

    const AlertsPage = document.getElementById("spa-page-alerts");
    if (AlertsPage && !AlertsPage.classList.contains("dark")) {
      AlertsPage.classList.add("dark");
    }
  }
}

syncRootTheme(darkmode === "enabled");

// Initial header dark mode
if (darkmode === "enabled") {
  enableDarkMode();
}

// Observe for SPA page injection
const observer = new MutationObserver(() => {
  applyDarkToSPAIfNeeded();
});

observer.observe(document.body, { childList: true, subtree: true });

// Observe for modal root injection
const modalObserver = new MutationObserver(() => {
  if (darkmode === "enabled") {
    applyDarkToModals();
  }
});

modalObserver.observe(document.body, { childList: true, subtree: true });

if (themeSwitch) {
  themeSwitch.addEventListener("click", () => {
    darkmode = localStorage.getItem("darkmode");
    if (darkmode !== "enabled") {
      enableDarkMode();
      applyDarkToSPAIfNeeded();
    } else {
      disableDarkMode();
    }
  });
}
