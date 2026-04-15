const addSubscriptionHtmlPath = "/features/citizen/alerts/AddSubscription.html";
const addSubscriptionCssPath = "/features/citizen/alerts/AddSubscription.css";

function ensureAddSubscriptionCss() {
  const existingCss = document.querySelector(
    'link[rel="stylesheet"][href="' + addSubscriptionCssPath + '"]',
  );

  if (!existingCss) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = addSubscriptionCssPath;
    document.head.appendChild(link);
  }
}

function closeAlertModal() {
  const modal = document.getElementById("modalOverlay");
  const modalContent = modal?.querySelector(".modalContent");

  if (!modal || !modalContent) {
    return;
  }

  modal.classList.add("hidden");
  modalContent.innerHTML = "";
}

function wireAlertModalCloseEvents(modal, modalContent) {
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeAlertModal();
    }
  };

  const cancelBtn = modalContent.querySelector(".btn-secondary");
  const closeBtn = modalContent.querySelector(".close-btn");

  if (cancelBtn) {
    cancelBtn.onclick = closeAlertModal;
  }

  if (closeBtn) {
    closeBtn.onclick = closeAlertModal;
  }
}

async function openAlertModal(context = null) {
  const modal = document.getElementById("modalOverlay");
  const modalContent = modal?.querySelector(".modalContent");

  if (!modal || !modalContent) {
    return;
  }

  ensureAddSubscriptionCss();

  try {
    const response = await fetch(addSubscriptionHtmlPath);
    if (!response.ok) {
      throw new Error(
        "Failed to load add subscription page: " + response.status,
      );
    }

    const html = await response.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const content =
      temp.querySelector(".modal") ||
      temp.querySelector("main") ||
      temp.querySelector("body");

    modalContent.innerHTML = content
      ? '<div class="alerts-add-subscription">' + content.outerHTML + "</div>"
      : html;

    wireAlertModalCloseEvents(modal, modalContent);
    window.CitizenAlertsPage?.mountModal?.({
      modalContent,
      context,
      closeAlertModal,
    });
    modal.classList.remove("hidden");
  } catch (error) {
    console.error("Error loading alert modal:", error);
  }
}

window.openAlertModal = openAlertModal;
window.closeAlertModal = closeAlertModal;
