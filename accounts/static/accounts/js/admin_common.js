/* ============================================
   ADMIN PANEL COMMON JAVASCRIPT
   Used by: User Management, Pending Approvals, Consent Approvals
   ============================================ */

/* ============================================
   TOAST NOTIFICATION SYSTEM
   ============================================ */

// Create toast container on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Show Django messages as toasts
    showDjangoMessages();
});

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="bi ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" onclick="closeToast(this)">×</button>
        <div class="toast-progress"></div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function closeToast(button) {
    const toast = button.closest('.toast-notification');
    if (toast) {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// Convenience functions
function showSuccess(message, duration = 3000) {
    showToast(message, 'success', duration);
}

function showError(message, duration = 4000) {
    showToast(message, 'error', duration);
}

function showWarning(message, duration = 3500) {
    showToast(message, 'warning', duration);
}

function showInfo(message, duration = 3000) {
    showToast(message, 'info', duration);
}

// Convert Django messages to toasts
function showDjangoMessages() {
    const messagesDiv = document.querySelector('.django-messages');
    if (!messagesDiv) return;
    
    const messages = messagesDiv.querySelectorAll('.alert');
    messages.forEach(msg => {
        const text = msg.textContent.trim();
        const classList = msg.classList;
        
        let type = 'info';
        if (classList.contains('alert-success')) type = 'success';
        else if (classList.contains('alert-danger') || classList.contains('alert-error')) type = 'error';
        else if (classList.contains('alert-warning')) type = 'warning';
        
        showToast(text, type);
    });
    
    // Hide the original Django messages
    messagesDiv.style.display = 'none';
}

/* ============================================
   MODAL FUNCTIONS
   ============================================ */

/**
 * Open edit modal (loads modal on demand for user management)
 */
async function openEditModal(profileId) {
    // Check if modal already exists
    let modal = document.getElementById('editModal_' + profileId);
    
    if (!modal) {
        // Fetch modal HTML from server
        try {
            const response = await fetch(`/accounts/get-user-modal/${profileId}/`, {
                headers: { "X-Requested-With": "XMLHttpRequest" }
            });
            
            if (!response.ok) throw new Error('Failed to load modal');
            
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            
            modal = document.getElementById('editModal_' + profileId);
            initializeBirthdateDropdowns();
        } catch (error) {
            console.error('Error loading modal:', error);
            showError('Failed to load edit form. Please try again.');
            return;
        }
    }
    
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        const monthSelect = document.getElementById('birthMonth_' + profileId);
        if (monthSelect && monthSelect.value) {
            monthSelect.dispatchEvent(new Event('change'));
        }
    }
}

/**
 * Close edit modal
 */
function closeEditModal(profileId) {
    const modal = document.getElementById('editModal_' + profileId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Toggle academic section based on role
 */
function toggleAcademicSection(profileId) {
    const roleSelect = document.getElementById('role_' + profileId);
    const academicSection = document.getElementById('academic_section_' + profileId);
    const role = roleSelect.value;
    
    if (role === 'shs_student' || role === 'alumni') {
        academicSection.classList.remove('d-none');
    } else {
        academicSection.classList.add('d-none');
    }
}

/**
 * Toggle batch fields based on took_shs checkbox
 */
function toggleBatchFields(profileId) {
    const tookShsCheckbox = document.getElementById('took_shs_' + profileId);
    const batchFields = document.getElementById('batch_fields_' + profileId);
    
    if (tookShsCheckbox && tookShsCheckbox.checked) {
        batchFields.classList.remove('d-none');
    } else if (batchFields) {
        batchFields.classList.add('d-none');
        const g11 = document.getElementById('g11_batch_' + profileId);
        const g12 = document.getElementById('g12_batch_' + profileId);
        if (g11) g11.value = '';
        if (g12) g12.value = '';
    }
}

/**
 * Toggle batch inputs based on dropdown (for pending approvals)
 */
function toggleBatchInputs(profileId) {
    const tookShsSelect = document.getElementById('took_shs_modal_' + profileId);
    const batchInputs = document.getElementById('batch_inputs_' + profileId);
    
    if (tookShsSelect && tookShsSelect.value === 'true') {
        batchInputs.classList.remove('d-none');
    } else if (batchInputs) {
        batchInputs.classList.add('d-none');
        const g11 = document.getElementById('g11_batch_modal_' + profileId);
        const g12 = document.getElementById('g12_batch_modal_' + profileId);
        if (g11) g11.value = '';
        if (g12) g12.value = '';
    }
}

/* ============================================
   BIRTHDATE DROPDOWN INITIALIZATION
   ============================================ */

function initializeBirthdateDropdowns() {
    const currentYear = new Date().getFullYear();
    
    document.querySelectorAll('.birthMonth').forEach(monthSelect => {
        const profileId = monthSelect.id.replace('birthMonth_', '');
        const daySelect = document.getElementById('birthDay_' + profileId);
        const yearSelect = document.getElementById('birthYear_' + profileId);
        
        if (yearSelect && yearSelect.options.length <= 1) {
            for (let year = currentYear; year >= 1960; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }
        }
        
        monthSelect.addEventListener('change', function() {
            if (daySelect) {
                daySelect.disabled = false;
                const currentDay = daySelect.value;
                daySelect.innerHTML = '<option value="">Day</option>';
                
                const month = parseInt(this.value);
                const year = parseInt(yearSelect ? yearSelect.value : currentYear) || currentYear;
                
                if (month) {
                    const daysInMonth = new Date(year, month, 0).getDate();
                    for (let day = 1; day <= daysInMonth; day++) {
                        const option = document.createElement('option');
                        option.value = day;
                        option.textContent = day;
                        daySelect.appendChild(option);
                    }
                    
                    if (currentDay && parseInt(currentDay) <= daysInMonth) {
                        daySelect.value = currentDay;
                    }
                } else {
                    daySelect.disabled = true;
                }
            }
        });
        
        if (yearSelect) {
            yearSelect.addEventListener('change', function() {
                if (monthSelect.value) {
                    monthSelect.dispatchEvent(new Event('change'));
                }
            });
        }
    });
}

// Initialize birthdate dropdowns on page load
document.addEventListener('DOMContentLoaded', initializeBirthdateDropdowns);

/* ============================================
   MODAL EVENT HANDLERS
   ============================================ */

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(function(modal) {
            modal.classList.remove('show');
        });
        document.body.style.overflow = 'auto';
    }
});

/* ============================================
   FORM SUBMISSION WITH TOAST FEEDBACK
   ============================================ */

/**
 * Handle form submission with AJAX and show toast
 */
function handleFormSubmit(form, successMessage, errorMessage) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const url = form.action;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                showSuccess(successMessage);
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showError(errorMessage);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showError('An unexpected error occurred. Please try again.');
        }
    });
}