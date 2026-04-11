function closeFilter() {
  const filterPanel = document.querySelector("#spa-page-home .filter-panel");
  const showPanelBtn = document.querySelector("#spa-page-home .show-panel-btn");
  const legendCard = document.querySelector("#spa-page-home .legend-card");

  if (legendCard) {
    legendCard.classList.add("moveL");
  }

  if (filterPanel) {
    filterPanel.classList.add("hidden");
    filterPanel.classList.remove("visible");
  }

  if (showPanelBtn) {
    showPanelBtn.style.display = "flex";
  }
}
