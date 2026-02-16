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
    
    // Initialize pre-selected filters from URL
    initializePreselectedFilters();
});

/**
 * Initialize pre-selected filters from URL parameters
 */
async function initializePreselectedFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Pre-select strand
    const strand = urlParams.get('strand');
    if (strand && filterElements.strand) {
        filterElements.strand.value = strand;
    }
    
    // Pre-select research design
    const researchDesign = urlParams.get('research_design');
    if (researchDesign && filterElements.researchDesign) {
        // Update options first based on grade level and strand
        updateResearchDesignOptions();
        // Then set the value
        filterElements.researchDesign.value = researchDesign;
    }
    
    // Pre-select grade level
    const gradeLevel = urlParams.get('grade_level');
    if (gradeLevel && filterElements.gradeLevel) {
        filterElements.gradeLevel.value = gradeLevel;
    }
    
    // Pre-select school year
    const schoolYear = urlParams.get('school_year');
    if (schoolYear && filterElements.schoolYear) {
        filterElements.schoolYear.value = schoolYear;
    }
    
    // Pre-select award
    const award = urlParams.get('award');
    if (award && filterElements.award) {
        filterElements.award.value = award;
    }
    
    // Wait for keywords to be loaded
    if (availableKeywords.length === 0) {
        await loadKeywords();
    }
    
    // Pre-select keywords from URL
    const keywordIds = urlParams.getAll('keywords');
    if (keywordIds.length > 0) {
        keywordIds.forEach(id => {
            const keywordId = parseInt(id);
            const keyword = availableKeywords.find(k => k.id === keywordId);
            if (keyword) {
                selectedKeywords.add(keywordId);
            }
        });
    }
    
    // Pre-select authors from URL
    const authorIds = urlParams.getAll('authors');
    if (authorIds.length > 0) {
        // Wait for authors to be loaded if grade level and school year are set
        if (filterElements.gradeLevel?.value && filterElements.schoolYear?.value) {
            if (availableAuthors.length === 0) {
                await loadAuthors();
            }
            
            authorIds.forEach(id => {
                const authorId = parseInt(id);
                const author = availableAuthors.find(a => a.id === authorId);
                if (author) {
                    selectedAuthors.add(authorId);
                }
            });
        }
    }
    
    // Update the display
    renderAppliedFilters();
}