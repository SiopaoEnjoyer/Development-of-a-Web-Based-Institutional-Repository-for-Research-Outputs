/* static/research/js/admin-dashboard-init.js */

document.addEventListener("DOMContentLoaded", () => {
    // Configure and initialize filters
    initializeFilters({
        resetUrl: document.querySelector('[data-reset-url]')?.dataset.resetUrl || '/research/admin/dashboard/',
        authorsApiUrl: document.querySelector('[data-authors-api]')?.dataset.authorsApi || '',
        keywordsApiUrl: document.querySelector('[data-keywords-api]')?.dataset.keywordsApi || '',
        updateCallback: (tempDiv) => {
            // Update table body
            const newTableBody = tempDiv.querySelector("#tableBody");
            if (newTableBody) {
                document.querySelector("#tableBody").innerHTML = newTableBody.innerHTML;
            }
        }
    });
});