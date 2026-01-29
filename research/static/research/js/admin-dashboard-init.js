/**
 * Admin Dashboard Initialization
 * Handles filter UI, AJAX interactions, and toast notifications
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize toast notifications for Django messages
    initializeDjangoMessages();
    
    // Configure and initialize filters using the shared filter system
    initializeFilters({
        resetUrl: document.querySelector('[data-reset-url]')?.dataset.resetUrl || '/research/admin/dashboard/',
        authorsApiUrl: document.querySelector('[data-authors-api]')?.dataset.authorsApi || '',
        keywordsApiUrl: document.querySelector('[data-keywords-api]')?.dataset.keywordsApi || '',
        updateCallback: (tempDiv) => {
            // Update table body
            const newTableBody = tempDiv.querySelector("#tableBody");
            if (newTableBody) {
                document.querySelector("#tableBody").innerHTML = newTableBody.innerHTML;
                
                // Re-initialize delete buttons for the new content
                initializeDeleteButtons();
            }
        }
    });
    
    // Initialize sort functionality
    initializeSorting();
    
    // Initialize delete confirmations with toast feedback
    initializeDeleteButtons();
});

/**
 * Display Django messages as toast notifications
 */
function initializeDjangoMessages() {
    const messagesContainer = document.querySelector('.django-messages');
    if (!messagesContainer) return;
    
    const messages = messagesContainer.querySelectorAll('.alert');
    messages.forEach(messageDiv => {
        const messageText = messageDiv.textContent.trim();
        
        // Determine toast type based on Django message class
        let toastType = 'info';
        if (messageDiv.classList.contains('alert-success')) {
            toastType = 'success';
        } else if (messageDiv.classList.contains('alert-danger') || messageDiv.classList.contains('alert-error')) {
            toastType = 'error';
        } else if (messageDiv.classList.contains('alert-warning')) {
            toastType = 'warning';
        }
        
        // Show toast notification
        showToast(messageText, toastType);
        
        // Hide the original message
        messageDiv.style.display = 'none';
    });
}

/**
 * Initialize sorting
 */
function initializeSorting() {
    const sortSelect = document.getElementById('sort_by');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', function() {
        const form = document.getElementById('filtersForm');
        
        // Remove existing sort_by parameter if exists
        const hiddenSort = form.querySelector('input[name="sort_by"]');
        if (hiddenSort) {
            hiddenSort.remove();
        }
        
        // Add new sort_by as hidden input
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'sort_by';
        input.value = this.value;
        form.appendChild(input);
        
        // Submit form
        form.submit();
    });
}

/**
 * Initialize delete buttons with improved feedback
 */
function initializeDeleteButtons() {
    const deleteForms = document.querySelectorAll('form[action*="delete"]');
    
    deleteForms.forEach(form => {
        // Remove existing listener to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener('submit', function(e) {
            // The confirmation is already in the HTML's onsubmit
            // We'll just add a loading state here
            const submitButton = newForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
            }
        });
    });
}

/**
 * Handle AJAX errors with toast notifications
 */
function handleAjaxError(error, context = 'operation') {
    console.error(`${context} failed:`, error);
    showError(`Failed to complete ${context}. Please try again.`);
}

/**
 * Handle successful AJAX operations
 */
function handleAjaxSuccess(message) {
    showSuccess(message);
}