/**
 * Common authentication utilities
 * Shared across login, register, and password reset pages
 */

/**
 * Display Django form errors and messages as toast notifications
 * @param {Object} options - Configuration object
 * @param {boolean} options.hasFormErrors - Whether form has errors
 * @param {Array} options.nonFieldErrors - Array of non-field error messages
 * @param {number} options.fieldErrorCount - Count of field-specific errors
 * @param {Array} options.messages - Array of Django message objects {level, text}
 * @param {boolean} options.skipToasts - Skip showing toasts (e.g., when modal is shown)
 */
function displayAuthToasts(options) {
    const {
        hasFormErrors = false,
        nonFieldErrors = [],
        fieldErrorCount = 0,
        messages = [],
        skipToasts = false
    } = options;

    if (skipToasts) {
        return;
    }

    // Display non-field errors
    if (nonFieldErrors.length > 0) {
        nonFieldErrors.forEach(error => {
            showError(error, 4000);
        });
    }

    // If there are field errors but no non-field errors, show generic message
    if (hasFormErrors && fieldErrorCount > 0 && nonFieldErrors.length === 0) {
        showError("Please correct the errors in the form.", 4000);
    }

    // Display Django messages
    messages.forEach(msg => {
        const duration = {
            'error': 4000,
            'warning': 3500,
            'success': 3000,
            'info': 3000
        }[msg.level] || 3000;

        switch(msg.level) {
            case 'error':
                showError(msg.text, duration);
                break;
            case 'warning':
                showWarning(msg.text, duration);
                break;
            case 'success':
                showSuccess(msg.text, duration);
                break;
            default:
                showInfo(msg.text, duration);
        }
    });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Toggle password visibility
 * @param {string} inputId - ID of password input
 * @param {string} iconId - ID of toggle icon
 */
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    }
}

/**
 * Add loading state to button
 * @param {HTMLElement} button - Button element
 * @param {string} loadingText - Text to display while loading
 */
function setButtonLoading(button, loadingText = 'Processing...') {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
}

/**
 * Remove loading state from button
 * @param {HTMLElement} button - Button element
 */
function removeButtonLoading(button) {
    if (!button || !button.dataset.originalText) return;
    
    button.disabled = false;
    button.innerHTML = button.dataset.originalText;
    delete button.dataset.originalText;
}

/**
 * Show form validation error
 * @param {string} fieldId - ID of the form field
 * @param {string} errorMessage - Error message to display
 */
function showFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (field) {
        field.classList.add('is-invalid');
    }
    
    if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
}

/**
 * Clear form validation error
 * @param {string} fieldId - ID of the form field
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (field) {
        field.classList.remove('is-invalid');
    }
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * Clear all form validation errors
 * @param {HTMLFormElement} form - Form element
 */
function clearAllFieldErrors(form) {
    if (!form) return;
    
    const invalidFields = form.querySelectorAll('.is-invalid');
    invalidFields.forEach(field => {
        field.classList.remove('is-invalid');
    });
    
    const errorDivs = form.querySelectorAll('.invalid-feedback');
    errorDivs.forEach(div => {
        div.style.display = 'none';
    });
}

function handleFormSubmit(formId, buttonSelector, loadingText = 'Loading...') {
    const form = document.getElementById(formId);
    const submitButton = form.querySelector(buttonSelector);
    
    if (!form || !submitButton) {
        console.error('Form or button not found');
        return;
    }
    
    let isSubmitting = false;
    
    form.addEventListener('submit', function(e) {
        // Prevent double submission
        if (isSubmitting) {
            e.preventDefault();
            return false;
        }
        
        // Validate form before showing loading state
        if (!form.checkValidity()) {
            // Let browser handle validation
            return true;
        }
        
        // Set submitting flag
        isSubmitting = true;
        
        // Store original button content
        const originalContent = submitButton.innerHTML;
        
        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.style.cursor = 'not-allowed';
        submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${loadingText}
        `;
        
        // Add visual feedback
        submitButton.style.opacity = '0.7';
        
        // If form validation fails on server side, re-enable button
        // This is a fallback - the page will reload on success
        setTimeout(() => {
            // Only re-enable if we're still on the same page (server validation failed)
            if (document.getElementById(formId)) {
                submitButton.disabled = false;
                submitButton.style.cursor = 'pointer';
                submitButton.innerHTML = originalContent;
                submitButton.style.opacity = '1';
                isSubmitting = false;
            }
        }, 5000);
    });
}

// Initialize for Login Page
function initLoginSubmitHandler() {
    handleFormSubmit('loginForm', 'button[type="submit"]', 'Signing In...');
}

// Initialize for Register Page
function initRegisterSubmitHandler() {
    handleFormSubmit('registerForm', 'button[type="submit"]', 'Creating Account...');
}

// Export functions for use in page-specific scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleFormSubmit,
        initLoginSubmitHandler,
        initRegisterSubmitHandler
    };
}