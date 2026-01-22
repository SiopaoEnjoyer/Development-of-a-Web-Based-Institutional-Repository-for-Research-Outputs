/* static/research/js/author-manage.js */
/* Author management page functionality */

(function() {
    'use strict';
    
    // Filter elements
    const filterElements = {};

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeFilters();
        initializeModals();
        renderAppliedFilters();
        
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });

    function initializeFilters() {
        // Populate the filterElements object
        filterElements.gradeLevel = document.getElementById("grade_level");
        filterElements.schoolYear = document.getElementById("school_year");
        filterElements.hasAccount = document.getElementById("has_account");
        filterElements.hasConsented = document.getElementById("has_consented");
        filterElements.sortBy = document.getElementById("sort_by");
        filterElements.searchQuery = document.getElementById("searchQuery");

        // Add change listeners
        if (filterElements.gradeLevel) filterElements.gradeLevel.addEventListener("change", updateResults);
        if (filterElements.schoolYear) filterElements.schoolYear.addEventListener("change", updateResults);
        if (filterElements.hasAccount) filterElements.hasAccount.addEventListener("change", updateResults);
        if (filterElements.hasConsented) filterElements.hasConsented.addEventListener("change", updateResults);
        if (filterElements.sortBy) filterElements.sortBy.addEventListener("change", updateResults);
        
        if (filterElements.searchQuery) {
            filterElements.searchQuery.addEventListener("input", debounce(() => {
                updateResults();
            }, 500));
        }
        
        // Reset button
        const resetBtn = document.getElementById("resetAllBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                const form = document.getElementById("filtersForm");
                if (form) form.reset();
                window.location = window.location.pathname;
            });
        }
    }

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

        if (filterElements.searchQuery && filterElements.searchQuery.value) {
            params.set("q", filterElements.searchQuery.value);
        }
        if (filterElements.gradeLevel && filterElements.gradeLevel.value) {
            params.set("grade_level", filterElements.gradeLevel.value);
        }
        if (filterElements.schoolYear && filterElements.schoolYear.value) {
            params.set("school_year", filterElements.schoolYear.value);
        }
        if (filterElements.hasAccount && filterElements.hasAccount.value) {
            params.set("has_account", filterElements.hasAccount.value);
        }
        if (filterElements.hasConsented && filterElements.hasConsented.value) {
            params.set("has_consented", filterElements.hasConsented.value);
        }
        if (filterElements.sortBy && filterElements.sortBy.value) {
            params.set("sort_by", filterElements.sortBy.value);
        }

        const res = await fetch(`?${params.toString()}`, {
            headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        const html = await res.text();
        const temp = document.createElement("div");
        temp.innerHTML = html;

        const newTableBody = temp.querySelector("#authorTableBody");
        if (newTableBody) {
            document.querySelector("#authorTableBody").innerHTML = newTableBody.innerHTML;
        }

        history.replaceState(null, "", `?${params.toString()}`);
        renderAppliedFilters();
    }

    /* FILTER TOKENS */
    function renderAppliedFilters() {
        const activeFiltersSection = document.getElementById("activeFiltersSection");
        const tokens = document.getElementById("active-filters");
        
        if (!activeFiltersSection || !tokens) return;
        
        tokens.innerHTML = "";

        const url = new URLSearchParams(window.location.search);

        const filterLabels = {
            "q": "Search",
            "grade_level": "Grade Level",
            "school_year": "School Year",
            "has_account": "Has Account",
            "has_consented": "Has Consented",
            "sort_by": "Sort By"
        };

        let hasFilters = false;

        for (const [key, label] of Object.entries(filterLabels)) {
            if (url.has(key) && url.get(key)) {
                hasFilters = true;
                let displayValue = url.get(key);
                
                if (key === "grade_level") {
                    displayValue = "Grade " + displayValue;
                } else if (key === "sort_by") {
                    const sortMap = {
                        "alphabetical": "A-Z",
                        "reverse_alphabetical": "Z-A",
                        "latest": "Newest First",
                        "oldest": "Oldest First"
                    };
                    displayValue = sortMap[displayValue] || displayValue;
                } else if (key === "has_account") {
                    displayValue = displayValue === "yes" ? "Yes" : "No";
                } else if (key === "has_consented") {
                    if (displayValue === "yes") displayValue = "Yes";
                    else if (displayValue === "pending") displayValue = "Pending";
                    else displayValue = "No";
                }

                const token = document.createElement("span");
                token.className = "filter-token";
                token.innerHTML = `
                    ${label}: ${displayValue}
                    <button onclick="window.removeFilter('${key}')">×</button>
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
                const newTableBody = temp.querySelector("#authorTableBody");
                if (newTableBody) {
                    document.querySelector("#authorTableBody").innerHTML = newTableBody.innerHTML;
                }
                history.replaceState(null, "", `?${url.toString()}`);
                renderAppliedFilters();
            });
    }

    /* MODAL FUNCTIONS */
    function initializeModals() {
        const addAuthorBtn = document.getElementById('saveAuthorBtn');
        const updateAuthorBtn = document.getElementById('updateAuthorBtn');
        
        if (addAuthorBtn) {
            addAuthorBtn.addEventListener('click', handleAddAuthor);
        }
        
        if (updateAuthorBtn) {
            updateAuthorBtn.addEventListener('click', handleUpdateAuthor);
        }
        
        // Reset modals when closed
        const addAuthorModal = document.getElementById('addAuthorModal');
        if (addAuthorModal) {
            addAuthorModal.addEventListener('hidden.bs.modal', function () {
                resetAddForm();
            });
        }
        
        const editAuthorModal = document.getElementById('editAuthorModal');
        if (editAuthorModal) {
            editAuthorModal.addEventListener('hidden.bs.modal', function () {
                resetEditForm();
            });
        }
    }

    // Edit author function
    function editAuthor(id, firstName, middleInitial, lastName, suffix, g11Batch, g12Batch) {
        document.getElementById('edit_author_id').value = id;
        document.getElementById('edit_first_name').value = firstName;
        document.getElementById('edit_middle_initial').value = middleInitial || '';
        document.getElementById('edit_last_name').value = lastName;
        document.getElementById('edit_suffix').value = suffix || '';
        document.getElementById('edit_G11_Batch').value = g11Batch || '';
        document.getElementById('edit_G12_Batch').value = g12Batch || '';
        
        const editModal = new bootstrap.Modal(document.getElementById('editAuthorModal'));
        editModal.show();
    }

    // Validation helper
    function validateAuthorForm(firstName, lastName, g11Batch, g12Batch) {
        const errors = [];
        
        if (!firstName) errors.push('First Name is required.');
        if (!lastName) errors.push('Last Name is required.');
        
        // At least one batch is required
        if (!g11Batch && !g12Batch) {
            errors.push('At least one batch (Grade 11 or Grade 12) is required.');
        }
        
        const batchPattern = /^\d{4}-\d{4}$/;
        
        // Only validate format if the field is filled
        if (g11Batch && !batchPattern.test(g11Batch)) {
            errors.push('Grade 11 Batch must be in format YYYY-YYYY (e.g., 2023-2024).');
        }
        if (g12Batch && !batchPattern.test(g12Batch)) {
            errors.push('Grade 12 Batch must be in format YYYY-YYYY (e.g., 2024-2025).');
        }
        
        return errors;
    }

    // Helper function to get CSRF token from cookie
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Handle Add Author
    async function handleAddAuthor(e) {
        e.preventDefault();
        
        const addAuthorModalErrors = document.getElementById('authorModalErrors');
        if (addAuthorModalErrors) {
            addAuthorModalErrors.style.display = 'none';
            addAuthorModalErrors.innerHTML = '';
        }
        
        const firstName = document.getElementById('author_first_name')?.value.trim();
        const lastName = document.getElementById('author_last_name')?.value.trim();
        const middleInitial = document.getElementById('author_middle_initial')?.value.trim();
        const suffix = document.getElementById('author_suffix')?.value.trim();
        const g11Batch = document.getElementById('author_G11_Batch')?.value.trim();
        const g12Batch = document.getElementById('author_G12_Batch')?.value.trim();
        
        const errors = validateAuthorForm(firstName, lastName, g11Batch, g12Batch);
        
        if (errors.length > 0) {
            if (addAuthorModalErrors) {
                addAuthorModalErrors.innerHTML = '<ul class="mb-0">' + 
                    errors.map(err => `<li>${err}</li>`).join('') + 
                    '</ul>';
                addAuthorModalErrors.style.display = 'block';
            }
            return;
        }
        
        e.currentTarget.disabled = true;
        e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        
        try {
            const formData = new FormData();
            formData.append('first', firstName);
            formData.append('middle', middleInitial);
            formData.append('last', lastName);
            formData.append('suffix', suffix);
            formData.append('G11', g11Batch);
            formData.append('G12', g12Batch);
            
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch('/ajax/add-author/', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                const fullName = data.name || `${firstName} ${lastName}`;
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('addAuthorModal'));
                if (modal) modal.hide();
                
                resetAddForm();
                
                if (typeof showSuccess === 'function') {
                    showSuccess(`Author "${fullName}" added successfully!`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    alert(`✓ Author "${fullName}" added successfully!`);
                    window.location.reload();
                }
            } else {
                let errorMessage = 'An error occurred while adding the author.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Response was not JSON:', e);
                }
                
                if (addAuthorModalErrors) {
                    addAuthorModalErrors.innerHTML = errorMessage;
                    addAuthorModalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (addAuthorModalErrors) {
                addAuthorModalErrors.innerHTML = 'An error occurred while adding the author.';
                addAuthorModalErrors.style.display = 'block';
            }
        } finally {
            e.currentTarget.disabled = false;
            e.currentTarget.innerHTML = '<i class="bi bi-plus-circle"></i> Add Author';
        }
    }

    // Handle Update Author
    async function handleUpdateAuthor(e) {
        e.preventDefault();
        
        const editAuthorModalErrors = document.getElementById('editAuthorModalErrors');
        if (editAuthorModalErrors) {
            editAuthorModalErrors.style.display = 'none';
            editAuthorModalErrors.innerHTML = '';
        }
        
        const authorId = document.getElementById('edit_author_id')?.value;
        const firstName = document.getElementById('edit_first_name')?.value.trim();
        const lastName = document.getElementById('edit_last_name')?.value.trim();
        const middleInitial = document.getElementById('edit_middle_initial')?.value.trim();
        const suffix = document.getElementById('edit_suffix')?.value.trim();
        const g11Batch = document.getElementById('edit_G11_Batch')?.value.trim();
        const g12Batch = document.getElementById('edit_G12_Batch')?.value.trim();
        
        const errors = validateAuthorForm(firstName, lastName, g11Batch, g12Batch);
        
        if (errors.length > 0) {
            if (editAuthorModalErrors) {
                editAuthorModalErrors.innerHTML = '<ul class="mb-0">' + 
                    errors.map(err => `<li>${err}</li>`).join('') + 
                    '</ul>';
                editAuthorModalErrors.style.display = 'block';
            }
            return;
        }
        
        e.currentTarget.disabled = true;
        e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
        
        try {
            const formData = new FormData();
            formData.append('author_id', authorId);
            formData.append('first_name', firstName);
            formData.append('middle_initial', middleInitial);
            formData.append('last_name', lastName);
            formData.append('suffix', suffix);
            formData.append('G11_Batch', g11Batch);
            formData.append('G12_Batch', g12Batch);
            formData.append('action', 'edit');
            formData.append('edit_author', '1');
            
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
                const fullName = `${firstName} ${middleInitial ? middleInitial + '.' : ''} ${lastName}${suffix ? ' ' + suffix : ''}`.trim();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('editAuthorModal'));
                if (modal) modal.hide();
                
                resetEditForm();
                
                if (typeof showSuccess === 'function') {
                    showSuccess(`Author "${fullName}" updated successfully!`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    alert(`✓ Author "${fullName}" updated successfully!`);
                    window.location.reload();
                }
            } else {
                if (editAuthorModalErrors) {
                    editAuthorModalErrors.innerHTML = 'An error occurred while updating the author.';
                    editAuthorModalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (editAuthorModalErrors) {
                editAuthorModalErrors.innerHTML = 'An error occurred while updating the author.';
                editAuthorModalErrors.style.display = 'block';
            }
        } finally {
            e.currentTarget.disabled = false;
            e.currentTarget.innerHTML = '<i class="bi bi-check-circle"></i> Save Changes';
        }
    }

    function resetAddForm() {
        document.getElementById('author_first_name').value = '';
        document.getElementById('author_middle_initial').value = '';
        document.getElementById('author_last_name').value = '';
        document.getElementById('author_suffix').value = '';
        document.getElementById('author_G11_Batch').value = '';
        document.getElementById('author_G12_Batch').value = '';
        
        const addAuthorModalErrors = document.getElementById('authorModalErrors');
        if (addAuthorModalErrors) {
            addAuthorModalErrors.style.display = 'none';
            addAuthorModalErrors.innerHTML = '';
        }
    }

    function resetEditForm() {
        document.getElementById('edit_first_name').value = '';
        document.getElementById('edit_middle_initial').value = '';
        document.getElementById('edit_last_name').value = '';
        document.getElementById('edit_suffix').value = '';
        document.getElementById('edit_G11_Batch').value = '';
        document.getElementById('edit_G12_Batch').value = '';
        
        const editAuthorModalErrors = document.getElementById('editAuthorModalErrors');
        if (editAuthorModalErrors) {
            editAuthorModalErrors.style.display = 'none';
            editAuthorModalErrors.innerHTML = '';
        }
    }

    // Make functions available globally
    window.editAuthor = editAuthor;
    window.removeFilter = removeFilter;
})();