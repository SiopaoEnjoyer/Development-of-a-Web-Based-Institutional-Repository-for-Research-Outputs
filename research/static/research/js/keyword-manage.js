/* static/research/js/keyword-manage.js */
/* Keyword management page functionality */

const filterElements = {
    sortBy: document.getElementById("sort_by"),
    searchQuery: document.getElementById("searchQuery")
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

// Update results via AJAX
async function updateResults() {
    const params = new URLSearchParams();

    if (filterElements.searchQuery.value) params.set("q", filterElements.searchQuery.value);
    if (filterElements.sortBy.value) params.set("sort_by", filterElements.sortBy.value);

    const res = await fetch(`?${params.toString()}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const html = await res.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const newTableBody = temp.querySelector("#keywordTableBody");
    if (newTableBody) {
        document.querySelector("#keywordTableBody").innerHTML = newTableBody.innerHTML;
    }

    // Update pagination if it exists
    const newPagination = temp.querySelector(".card-footer");
    const currentPagination = document.querySelector(".card-footer");
    if (newPagination && currentPagination) {
        currentPagination.innerHTML = newPagination.innerHTML;
    }

    history.replaceState(null, "", `?${params.toString()}`);
    renderAppliedFilters();
    
    // Reinitialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Add change listeners
filterElements.sortBy.addEventListener("change", updateResults);

filterElements.searchQuery.addEventListener("input", debounce(() => {
    updateResults();
}, 500));

/* FILTER TOKENS */
function renderAppliedFilters() {
    const activeFiltersSection = document.getElementById("activeFiltersSection");
    const tokens = document.getElementById("active-filters");
    tokens.innerHTML = "";

    const url = new URLSearchParams(window.location.search);

    const filterLabels = {
        "q": "Search",
        "sort_by": "Sort By"
    };

    let hasFilters = false;

    for (const [key, label] of Object.entries(filterLabels)) {
        if (url.has(key) && url.get(key)) {
            hasFilters = true;
            let displayValue = url.get(key);
            
            if (key === "sort_by") {
                const sortMap = {
                    "alphabetical": "A-Z",
                    "reverse_alphabetical": "Z-A",
                    "most_used": "Most Used",
                    "least_used": "Least Used"
                };
                displayValue = sortMap[displayValue] || displayValue;
            }

            const token = document.createElement("span");
            token.className = "filter-token";
            token.innerHTML = `
                ${label}: ${displayValue}
                <button onclick="removeFilter('${key}')">×</button>
            `;
            tokens.appendChild(token);
        }
    }
    
    if (hasFilters) {
        activeFiltersSection.style.display = 'block';
    } else {
        activeFiltersSection.style.display = 'none';
    }
}

function removeFilter(key) {
    const url = new URLSearchParams(window.location.search);
    url.delete(key);

    const element = document.querySelector(`[name="${key}"]`);
    if (element) {
        element.value = "";
    }

    fetch(`?${url.toString()}`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.text())
        .then(html => {
            const temp = document.createElement("div");
            temp.innerHTML = html;
            const newTableBody = temp.querySelector("#keywordTableBody");
            if (newTableBody) {
                document.querySelector("#keywordTableBody").innerHTML = newTableBody.innerHTML;
            }
            
            // Update pagination if it exists
            const newPagination = temp.querySelector(".card-footer");
            const currentPagination = document.querySelector(".card-footer");
            if (newPagination && currentPagination) {
                currentPagination.innerHTML = newPagination.innerHTML;
            }
            
            history.replaceState(null, "", `?${url.toString()}`);
            renderAppliedFilters();
        });
}

/* RESET ALL */
document.getElementById("resetAllBtn").addEventListener("click", () => {
    document.getElementById("filtersForm").reset();
    window.location = window.location.pathname;
});

// Format keyword with italics (converts *text* to <em>text</em>)
function formatKeyword(text) {
    if (!text || text.trim() === '') {
        return '<span class="keyword-preview-empty">Type to see preview...</span>';
    }
    return text.replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// Live preview for Add Keyword
const addKeywordInput = document.getElementById('keyword_name');
const addPreviewContent = document.getElementById('keyword_preview_text');

if (addKeywordInput && addPreviewContent) {
    addKeywordInput.addEventListener('input', function() {
        const preview = document.getElementById('keyword_preview');
        if (this.value.trim()) {
            if (preview) preview.style.display = 'block';
            const formattedText = formatKeyword(this.value);
            addPreviewContent.innerHTML = formattedText;
        } else {
            if (preview) preview.style.display = 'none';
        }
    });
}

// Live preview for Edit Keyword
const editKeywordInput = document.getElementById('edit_keyword_name');
const editPreviewContent = document.getElementById('editPreviewContent');

if (editKeywordInput && editPreviewContent) {
    editKeywordInput.addEventListener('input', function() {
        const formattedText = formatKeyword(this.value);
        editPreviewContent.innerHTML = formattedText;
    });
}

// ==================== ADD KEYWORD (AJAX) ====================
const saveKeywordBtn = document.getElementById('saveKeywordBtn');
const keywordModalErrors = document.getElementById('keywordModalErrors');

if (saveKeywordBtn) {
    saveKeywordBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (keywordModalErrors) {
            keywordModalErrors.style.display = 'none';
            keywordModalErrors.innerHTML = '';
        }
        
        const keywordName = document.getElementById('keyword_name')?.value.trim();
        
        if (!keywordName) {
            if (keywordModalErrors) {
                keywordModalErrors.innerHTML = 'Keyword is required.';
                keywordModalErrors.style.display = 'block';
            }
            return;
        }
        
        if (keywordName.length < 2) {
            if (keywordModalErrors) {
                keywordModalErrors.innerHTML = 'Keyword must be at least 2 characters long.';
                keywordModalErrors.style.display = 'block';
            }
            return;
        }
        
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        
        try {
            const formData = new FormData();
            formData.append('keyword_name', keywordName);
            formData.append('add_keyword', '1');
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addKeywordModal'));
                if (modal) modal.hide();
                
                document.getElementById('keyword_name').value = '';
                const preview = document.getElementById('keyword_preview');
                if (preview) preview.style.display = 'none';
                
                // Show success toast if available, otherwise alert
                if (typeof showSuccess === 'function') {
                    showSuccess(`Keyword "${keywordName}" added successfully!`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    alert(`✓ Keyword "${keywordName}" added successfully!`);
                    window.location.reload();
                }
            } else {
                const text = await response.text();
                if (keywordModalErrors) {
                    keywordModalErrors.innerHTML = 'An error occurred while adding the keyword.';
                    keywordModalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (keywordModalErrors) {
                keywordModalErrors.innerHTML = 'An error occurred while adding the keyword.';
                keywordModalErrors.style.display = 'block';
            }
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle"></i> Add Keyword';
        }
    });
}

// ==================== EDIT KEYWORD ====================
const updateKeywordBtn = document.getElementById('updateKeywordBtn');
const editModalErrors = document.getElementById('editModalErrors');

// Use event delegation for edit buttons
document.addEventListener('click', function(e) {
    const editBtn = e.target.closest('.edit-keyword-btn');
    if (!editBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const keywordId = editBtn.dataset.id;
    const keywordName = editBtn.dataset.name;
    const usageCount = editBtn.dataset.count;
    
    if (editModalErrors) {
        editModalErrors.style.display = 'none';
        editModalErrors.innerHTML = '';
    }
    
    document.getElementById('edit_keyword_id').value = keywordId;
    document.getElementById('edit_keyword_name').value = keywordName;
    document.getElementById('edit_usage_count').textContent = usageCount;
    
    if (editPreviewContent) {
        const formattedText = formatKeyword(keywordName);
        editPreviewContent.innerHTML = formattedText;
    }
    
    const modalElement = document.getElementById('editKeywordModal');
    const bsModal = new bootstrap.Modal(modalElement);
    bsModal.show();
});

if (updateKeywordBtn) {
    updateKeywordBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (editModalErrors) {
            editModalErrors.style.display = 'none';
            editModalErrors.innerHTML = '';
        }
        
        const keywordId = document.getElementById('edit_keyword_id')?.value;
        const keywordName = document.getElementById('edit_keyword_name')?.value.trim();
        
        if (!keywordName) {
            if (editModalErrors) {
                editModalErrors.innerHTML = 'Keyword is required.';
                editModalErrors.style.display = 'block';
            }
            return;
        }
        
        if (keywordName.length < 2) {
            if (editModalErrors) {
                editModalErrors.innerHTML = 'Keyword must be at least 2 characters long.';
                editModalErrors.style.display = 'block';
            }
            return;
        }
        
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
        
        try {
            const formData = new FormData();
            formData.append('keyword_id', keywordId);
            formData.append('keyword_name', keywordName);
            formData.append('edit_keyword', '1');
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('editKeywordModal'));
                if (modal) modal.hide();
                
                if (typeof showSuccess === 'function') {
                    showSuccess(`Keyword "${keywordName}" updated successfully!`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    alert(`✓ Keyword "${keywordName}" updated successfully!`);
                    window.location.reload();
                }
            } else {
                if (editModalErrors) {
                    editModalErrors.innerHTML = 'An error occurred while updating the keyword.';
                    editModalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (editModalErrors) {
                editModalErrors.innerHTML = 'An error occurred while updating the keyword.';
                editModalErrors.style.display = 'block';
            }
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-check-circle"></i> Update Keyword';
        }
    });
}

// Reset modals when closed
const addKeywordModal = document.getElementById('addKeywordModal');
if (addKeywordModal) {
    addKeywordModal.addEventListener('hidden.bs.modal', function () {
        document.getElementById('keyword_name').value = '';
        if (keywordModalErrors) {
            keywordModalErrors.style.display = 'none';
            keywordModalErrors.innerHTML = '';
        }
        const preview = document.getElementById('keyword_preview');
        if (preview) preview.style.display = 'none';
        if (addPreviewContent) {
            addPreviewContent.innerHTML = '<span class="keyword-preview-empty">Type to see preview...</span>';
        }
    });
}

const editKeywordModal = document.getElementById('editKeywordModal');
if (editKeywordModal) {
    editKeywordModal.addEventListener('hidden.bs.modal', function () {
        document.getElementById('edit_keyword_name').value = '';
        if (editModalErrors) {
            editModalErrors.style.display = 'none';
            editModalErrors.innerHTML = '';
        }
        if (editPreviewContent) {
            editPreviewContent.innerHTML = '<span class="keyword-preview-empty">Type to see preview...</span>';
        }
    });
}

// Initialize Bootstrap tooltips and filters
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    renderAppliedFilters();
});

// Make removeFilter available globally
window.removeFilter = removeFilter;