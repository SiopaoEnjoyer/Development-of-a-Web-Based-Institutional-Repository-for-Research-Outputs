/**
 * Login Page JavaScript
 * Handles form validation and verification modal
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Login page loaded');
    
    const loginCard = document.getElementById('loginCard');
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Shake animation if there are errors
    const hasErrors = document.querySelector('.custom-error') !== null;
    if (hasErrors) {
        loginCard.classList.add('shake');
        setTimeout(() => loginCard.classList.remove('shake'), 600);
    }
    
    // Form validation
    loginForm.addEventListener('submit', function(e) {
        let isValid = true;
        let errorMessages = [];
        
        emailInput.classList.remove('is-invalid');
        passwordInput.classList.remove('is-invalid');
        
        if (!emailInput.value.trim()) {
            emailInput.classList.add('is-invalid');
            document.getElementById('emailError').textContent = 'Please enter your email address';
            errorMessages.push('Email is required');
            isValid = false;
        } else if (!isValidEmail(emailInput.value)) {
            emailInput.classList.add('is-invalid');
            document.getElementById('emailError').textContent = 'Please enter a valid email address';
            errorMessages.push('Invalid email address');
            isValid = false;
        }
        
        if (!passwordInput.value) {
            passwordInput.classList.add('is-invalid');
            document.getElementById('passwordError').textContent = 'Please enter your password';
            errorMessages.push('Password is required');
            isValid = false;
        }
        
        if (!isValid) {
            e.preventDefault();
            loginCard.classList.add('shake');
            setTimeout(() => loginCard.classList.remove('shake'), 600);
            
            // Show toast notification
            if (typeof showError === 'function') {
                if (errorMessages.length === 1) {
                    showError(errorMessages[0], 4000);
                } else {
                    showError(`Please fix ${errorMessages.length} errors`, 4000);
                }
            }
        }
    });
    
    // Real-time validation feedback
    emailInput.addEventListener('input', function() {
        this.classList.remove('is-invalid');
        if (this.value.trim() && isValidEmail(this.value)) {
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
        }
    });
    
    passwordInput.addEventListener('input', function() {
        this.classList.remove('is-invalid');
        if (this.value) {
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
        }
    });
    
    // Email validation helper
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});