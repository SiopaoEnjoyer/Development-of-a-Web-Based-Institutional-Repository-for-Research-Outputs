
document.addEventListener('DOMContentLoaded', function() {
    // Find all password input fields
    const passwordFields = document.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(field => {
        // Create wrapper if it doesn't exist
        if (!field.parentElement.classList.contains('password-wrapper')) {
            wrapPasswordField(field);
        }
        
        // Add toggle button
        addToggleButton(field);
    });
});

/**
 * Wraps password field in a container for positioning
 */
function wrapPasswordField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-wrapper';
    
    // Insert wrapper before the field
    field.parentNode.insertBefore(wrapper, field);
    
    // Move field into wrapper
    wrapper.appendChild(field);
}

/**
 * Adds toggle button to password field
 */
function addToggleButton(field) {
    const wrapper = field.parentElement;
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
    toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
    
    // Add click event
    toggleBtn.addEventListener('click', function() {
        togglePasswordVisibility(field, toggleBtn);
    });
    
    // Append to wrapper
    wrapper.appendChild(toggleBtn);
}

/**
 * Toggles password visibility
 */
function togglePasswordVisibility(field, button) {
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        // Show password
        field.type = 'text';
        icon.className = 'bi bi-eye-slash';
        button.setAttribute('aria-label', 'Hide password');
        button.classList.add('active');
    } else {
        // Hide password
        field.type = 'password';
        icon.className = 'bi bi-eye';
        button.setAttribute('aria-label', 'Show password');
        button.classList.remove('active');
    }
    
    // Keep focus on the input field
    field.focus();
}