/**
 * Forgot Password Page JavaScript
 * Handles form validation and password strength checking
 */

document.addEventListener('DOMContentLoaded', function() {
    const resetCard = document.getElementById('resetCard');
    const resetForm = document.getElementById('resetForm');
    const emailInput = document.getElementById('email');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthDiv = document.getElementById('passwordStrength');
    
    // Password strength checker
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]+/)) strength++;
        if (password.match(/[A-Z]+/)) strength++;
        if (password.match(/[0-9]+/)) strength++;
        if (password.match(/[$@#&!]+/)) strength++;
        
        strengthDiv.className = 'password-strength';
        
        if (password.length === 0) {
            strengthDiv.style.display = 'none';
        } else if (strength <= 2) {
            strengthDiv.classList.add('weak');
            strengthDiv.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>Weak password';
        } else if (strength <= 4) {
            strengthDiv.classList.add('medium');
            strengthDiv.innerHTML = '<i class="bi bi-shield-check me-2"></i>Medium password';
        } else {
            strengthDiv.classList.add('strong');
            strengthDiv.innerHTML = '<i class="bi bi-shield-fill-check me-2"></i>Strong password';
        }
    });
    
    // Form validation
    resetForm.addEventListener('submit', function(e) {
        let isValid = true;
        
        emailInput.classList.remove('is-invalid');
        newPasswordInput.classList.remove('is-invalid');
        confirmPasswordInput.classList.remove('is-invalid');
        
        if (!emailInput.value.trim() || !isValidEmail(emailInput.value)) {
            emailInput.classList.add('is-invalid');
            isValid = false;
        }
        
        if (newPasswordInput.value.length < 8) {
            newPasswordInput.classList.add('is-invalid');
            document.getElementById('newPasswordError').textContent = 'Password must be at least 8 characters';
            isValid = false;
        }
        
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.classList.add('is-invalid');
            isValid = false;
        }
        
        if (!isValid) {
            e.preventDefault();
            resetCard.classList.add('shake');
            setTimeout(() => resetCard.classList.remove('shake'), 600);
        }
    });
    
    // Email validation helper
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Real-time validation feedback
    emailInput.addEventListener('input', function() {
        this.classList.remove('is-invalid');
        if (this.value.trim() && isValidEmail(this.value)) {
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
        }
    });
    
    newPasswordInput.addEventListener('input', function() {
        this.classList.remove('is-invalid');
        if (this.value.length >= 8) {
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
        }
    });
    
    confirmPasswordInput.addEventListener('input', function() {
        this.classList.remove('is-invalid');
        if (this.value && this.value === newPasswordInput.value) {
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
        }
    });
});