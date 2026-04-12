function showFilter() {
  const filterPanel = document.querySelector("#spa-page-home .filter-panel");
  const legendCard = document.querySelector("#spa-page-home .legend-card");

  if (legendCard) {
    legendCard.classList.remove("moveL");
    
  }

  if (filterPanel) {
    filterPanel.classList.add("visible");
    filterPanel.classList.remove("hidden");
  }
}
