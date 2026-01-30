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
    
    if (!loginForm || !emailInput || !passwordInput) {
        console.error('Form elements not found!');
        return;
    }
    
    // Email validation helper
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Form validation
    loginForm.addEventListener('submit', function(e) {
        console.log('Form submitted');
        
        let isValid = true;
        let errorMessages = [];
        
        // Clear previous validation states
        emailInput.classList.remove('is-invalid', 'is-valid');
        passwordInput.classList.remove('is-invalid', 'is-valid');
        
        // Validate email
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
        
        // Validate password
        if (!passwordInput.value) {
            passwordInput.classList.add('is-invalid');
            document.getElementById('passwordError').textContent = 'Please enter your password';
            errorMessages.push('Password is required');
            isValid = false;
        }
        
        // If validation failed, prevent submission and show toast
        if (!isValid) {
            e.preventDefault();
            console.log('Validation failed:', errorMessages);
            
            // Shake animation
            loginCard.classList.add('shake');
            setTimeout(() => loginCard.classList.remove('shake'), 600);
            
            // Show toast
            const errorMsg = errorMessages.length === 1 
                ? errorMessages[0] 
                : `Please fix ${errorMessages.length} errors`;
            
            console.log('Calling showError with:', errorMsg);
            showError(errorMsg, 4000);
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
});