/* static/research/js/search-init.js */
/* Page-specific initialization for search.html */

document.addEventListener("DOMContentLoaded", () => {
    // Configure and initialize filters
    initializeFilters({
        resetUrl: document.querySelector('[data-reset-url]')?.dataset.resetUrl || '/research/search/',
        authorsApiUrl: document.querySelector('[data-authors-api]')?.dataset.authorsApi || '',
        keywordsApiUrl: document.querySelector('[data-keywords-api]')?.dataset.keywordsApi || '',
        updateCallback: (tempDiv) => {
            // Update search results
            const newResults = tempDiv.querySelector("#search-results");
            if (newResults) {
                document.querySelector("#search-results").innerHTML = newResults.innerHTML;
            }
        }
    });
    
    // Initialize research design options if applicable
    if (filterElements.researchDesign) {
        updateResearchDesignOptions();
    }
});