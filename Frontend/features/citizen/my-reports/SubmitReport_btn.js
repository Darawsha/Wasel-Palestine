const submitReportHtmlPath = "/features/citizen/my-reports/SubmitReport.html";
const submitReportCssPath = "/features/citizen/my-reports/SubmitReport.css";

function applySubmitReportTheme(root) {
  const isDark = localStorage.getItem("darkmode") === "enabled";
  const containers = root.querySelectorAll(".submit-report-container");
  containers.forEach((el) => el.classList.toggle("dark", isDark));
}

function ensureSubmitReportCss() {
  const existingCss = document.querySelector(
    'link[rel="stylesheet"][href="' + submitReportCssPath + '"]',
  );

  if (!existingCss) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = submitReportCssPath;
    document.head.appendChild(link);
  }
}

function closeMyReportModal() {
  const modal = document.getElementById("modalOverlay");
  const modalContent = modal?.querySelector(".modalContent");

  if (!modal || !modalContent) {
    return;
  }

  modal.classList.add("hidden");
  modalContent.innerHTML = "";
}

async function openMyReportModal() {
  const modal = document.getElementById("modalOverlay");
  const modalContent = modal?.querySelector(".modalContent");

  if (!modal || !modalContent) {
    return;
  }

  ensureSubmitReportCss();

  try {
    const response = await fetch(submitReportHtmlPath);
    if (!response.ok) {
      throw new Error("Failed to load submit report page: " + response.status);
    }

    const html = await response.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const main = temp.querySelector("main");
    const content =
      main?.cloneNode(true) || temp.firstElementChild?.cloneNode(true);

    // Avoid leaving stale markup or scripts behind
    modalContent.replaceChildren();
    if (content) {
      modalContent.appendChild(content);
    } else {
      modalContent.innerHTML = html;
    }

    applySubmitReportTheme(modalContent);
    if (window.CitizenSubmitReport?.init) {
      await window.CitizenSubmitReport.init(modalContent);
    }
    modal.classList.remove("hidden");
  } catch (error) {
    console.error("Error loading submit report modal:", error);
  }
}
