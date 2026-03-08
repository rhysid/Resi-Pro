(function initListResiSearch() {
  const root = document.querySelector('[data-list-search]');
  if (!root) {
    return;
  }

  const input = root.querySelector('[data-search-input]');
  const clearButton = root.querySelector('[data-search-clear]');
  const emptyState = root.querySelector('[data-search-empty]');
  const tableContainer = document.querySelector('[data-search-container]');
  const mobileContainer = document.querySelector('[data-search-mobile-container]');
  const pagination = document.querySelector('[data-search-pagination]');

  if (!input || !clearButton || !emptyState || !tableContainer || !mobileContainer || !pagination) {
    return;
  }

  const desktopRows = Array.from(tableContainer.querySelectorAll('tbody tr'));
  const mobileRows = Array.from(mobileContainer.querySelectorAll('.resi-item'));
  const hasAnyRow = desktopRows.length > 0 || mobileRows.length > 0;

  function rowMatches(element, keyword) {
    if (!keyword) {
      return true;
    }

    const rowId = (element.getAttribute('data-row-id') || '').toLowerCase();
    const rowResi = (element.getAttribute('data-row-resi') || '').toLowerCase();
    return rowResi.includes(keyword) || rowId === keyword;
  }

  function applyFilter() {
    const keyword = String(input.value || '').trim().toLowerCase();
    let visibleCount = 0;

    desktopRows.forEach((row) => {
      const match = rowMatches(row, keyword);
      row.hidden = !match;
      if (match) {
        visibleCount += 1;
      }
    });

    mobileRows.forEach((row) => {
      row.hidden = !rowMatches(row, keyword);
    });

    const hasVisible = visibleCount > 0;
    emptyState.hidden = !hasAnyRow || !keyword || hasVisible;
    tableContainer.classList.toggle('hidden', !hasVisible);
    mobileContainer.classList.toggle('hidden', !hasVisible);
    pagination.classList.toggle('hidden', Boolean(keyword));
  }

  input.addEventListener('input', applyFilter);
  clearButton.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });
})();
