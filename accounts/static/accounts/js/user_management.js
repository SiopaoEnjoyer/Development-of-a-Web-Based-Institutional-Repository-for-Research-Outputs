/* ============================================
   USER MANAGEMENT SPECIFIC JAVASCRIPT
   Filtering, Sorting, and AJAX Updates
   ============================================ */

// Filter display labels and values
const filterLabels = {
    "search": "Search",
    "role": "Role",
    "approval": "Approval Status",
    "consent": "Consent Status",
    "batch": "School Year"
};

const filterDisplayValues = {
    "approval": {
        "approved": "Approved",
        "pending": "Pending"
    },
    "consent": {
        "consented": "Consented",
        "pending_approval": "Pending Approval",
        "not_consented": "Not Consented"
    },
    "role": {
        "shs_student": "BTCS SHS Student",
        "alumni": "BTCS Alumni",
        "nonresearch_teacher": "BTCS Non-Research Teacher",
        "research_teacher": "BTCS Research Teacher",
        "admin": "BTCS Admin"
    }
};

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Filter elements
const filterElements = {
    search: document.getElementById("search"),
    role: document.getElementById("role"),
    approval: document.getElementById("approval"),
    consent: document.getElementById("consent"),
    batch: document.getElementById("batch")
};

// Current sort state
let currentSort = '{{ current_sort }}' || 'id';
let currentOrder = '{{ current_order }}' || 'desc';

/* ============================================
   AJAX UPDATE RESULTS
   ============================================ */

async function updateResults(includeSort = false) {
    const params = new URLSearchParams();
    
    if (filterElements.search.value) params.set("search", filterElements.search.value);
    if (filterElements.role.value) params.set("role", filterElements.role.value);
    if (filterElements.approval.value) params.set("approval", filterElements.approval.value);
    if (filterElements.consent.value) params.set("consent", filterElements.consent.value);
    if (filterElements.batch.value) params.set("batch", filterElements.batch.value);
    
    if (includeSort) {
        params.set("sort", currentSort);
        params.set("order", currentOrder);
    }

    try {
        const res = await fetch(`?${params.toString()}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        const data = await res.json();
        
        // Update table
        if (data.table_html) {
            document.querySelector("#tableContainer").innerHTML = data.table_html;
            
            // Remove all existing modals (they'll be loaded on-demand)
            document.querySelectorAll('.modal').forEach(modal => modal.remove());
            
            if (includeSort) {
                updateSortIndicators();
            }
        }
        
        // Update pagination if it exists (for HTML-based pagination)
        // If your backend returns pagination separately, handle it here
        if (data.pagination_html) {
            const paginationContainer = document.querySelector(".card-footer");
            if (paginationContainer) {
                paginationContainer.innerHTML = data.pagination_html;
            }
        }

        history.replaceState(null, "", `?${params.toString()}`);
        renderAppliedFilters();
    } catch (error) {
        console.error("Error updating results:", error);
        showError("Failed to update results. Please try again.");
    }
}

/* ============================================
   SORT INDICATORS
   ============================================ */

function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort) {
            th.classList.add(currentOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

/* ============================================
   EVENT LISTENERS FOR FILTERS
   ============================================ */

// Add event listeners for filters
filterElements.role.addEventListener("change", () => updateResults(false));
filterElements.approval.addEventListener("change", () => updateResults(false));
filterElements.consent.addEventListener("change", () => updateResults(false));
filterElements.batch.addEventListener("change", () => updateResults(false));

// Debounced search
filterElements.search.addEventListener("input", debounce(() => updateResults(false), 500));

// Reset button
document.getElementById("resetAllBtn").addEventListener("click", () => {
    window.location.href = "{% url 'accounts:user_management' %}";
});

/* ============================================
   APPLIED FILTERS RENDERING
   ============================================ */

function renderAppliedFilters() {
    const activeFiltersSection = document.getElementById("activeFiltersSection");
    const tokens = document.getElementById("active-filters");
    tokens.innerHTML = "";

    const url = new URLSearchParams(window.location.search);
    let hasFilters = false;

    for (const [key, label] of Object.entries(filterLabels)) {
        if (url.has(key) && url.get(key)) {
            hasFilters = true;
            let displayValue = url.get(key);
            
            if (filterDisplayValues[key] && filterDisplayValues[key][displayValue]) {
                displayValue = filterDisplayValues[key][displayValue];
            }

            const token = document.createElement("span");
            token.className = "filter-token";
            token.innerHTML = `
                ${label}: ${displayValue}
                <button type="button" onclick="removeFilter('${key}')">×</button>
            `;
            tokens.appendChild(token);
        }
    }

    activeFiltersSection.style.display = hasFilters ? 'block' : 'none';
}

// Remove filter and update results
function removeFilter(key) {
    const element = document.querySelector(`[name="${key}"]`);
    if (element) {
        element.value = "";
    }
    updateResults(false);
}

/* ============================================
   SORTING FUNCTIONALITY
   ============================================ */

document.addEventListener('click', function(e) {
    const sortableHeader = e.target.closest('.sortable');
    if (!sortableHeader) return;
    
    const sortField = sortableHeader.dataset.sort;
    
    // Toggle order if clicking same field, otherwise default to asc
    if (currentSort === sortField) {
        currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = sortField;
        currentOrder = 'asc';
    }
    
    // Update results with new sort
    updateResults(true);
});

/* ============================================
   INITIALIZE ON PAGE LOAD
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
    renderAppliedFilters();
    updateSortIndicators();
});