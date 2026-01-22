/**
 * Password Reset Verification Modal Handler
 * Specialized version for password reset with single input field
 * Includes 10-attempt limit with 24-hour lockout
 */

function initPasswordResetModal(config) {
    const {
        showModal,
        email,
        csrfToken,
        verifyUrl,
        resendUrl,
        maxAttempts = 10
    } = config;

    if (!showModal || !email) {
        console.log('❌ No password reset modal to show');
        return;
    }

    console.log('✅ Initializing password reset modal');

    const modalElement = document.getElementById('passwordResetModal');
    if (!modalElement) {
        console.error('❌ passwordResetModal element not found!');
        return;
    }

    const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
    });

    document.getElementById('resetModalEmail').textContent = email;

    const codeInput = document.getElementById('resetModalCodeInput');
    const verifyBtn = document.getElementById('resetModalVerifyBtn');
    const resendBtn = document.getElementById('resetModalResendBtn');
    const messageDiv = document.getElementById('resetModalMessage');
    const timeLeftElement = document.getElementById('resetModalTimeLeft');

    // Track verification attempts
    let attemptCount = 0;

    modal.show();

    // Focus input when modal opens
    modalElement.addEventListener('shown.bs.modal', function() {
        setTimeout(() => codeInput.focus(), 200);
    });

    // Only allow numbers
    codeInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Handle Enter key
    codeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyBtn.click();
        }
    });

    // Show message
    function showMessage(text, type) {
        messageDiv.className = 'alert alert-' + type;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
    }

    // Verify button
    verifyBtn.addEventListener('click', function() {
        const code = codeInput.value.trim();
        if (code.length !== 6) {
            showMessage('Please enter a 6-digit code', 'danger');
            return;
        }

        // Check attempt limit
        if (attemptCount >= maxAttempts) {
            showMessage(`Too many attempts. Please try again in 24 hours.`, 'danger');
            verifyBtn.disabled = true;
            codeInput.disabled = true;
            return;
        }

        attemptCount++;
        const attemptsRemaining = maxAttempts - attemptCount;

        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';

        fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken
            },
            body: new URLSearchParams({code: code})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success');
                setTimeout(() => window.location.href = data.redirect, 1500);
            } else {
                // Check if account is locked
                if (data.locked) {
                    showMessage(data.message, 'danger');
                    verifyBtn.disabled = true;
                    codeInput.disabled = true;
                } else {
                    // Show attempts remaining
                    const attemptsMsg = attemptsRemaining > 0 
                        ? ` (${attemptsRemaining} attempts remaining)` 
                        : '';
                    showMessage(data.message + attemptsMsg, 'danger');
                    
                    if (attemptsRemaining === 0) {
                        verifyBtn.disabled = true;
                        codeInput.disabled = true;
                    } else {
                        codeInput.value = '';
                        codeInput.focus();
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Verify & Reset Password';
                    }
                }
            }
        })
        .catch(error => {
            console.error('Verification error:', error);
            showMessage('An error occurred. Please try again.', 'danger');
            codeInput.value = '';
            codeInput.focus();
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Verify & Reset Password';
        });
    });

    // Resend button
    let resendCooldown = 60;
    let canResend = true;
    let timerInterval;

    resendBtn.addEventListener('click', function() {
        if (!canResend) return;

        canResend = false;
        const originalText = this.innerHTML;

        fetch(resendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(data => {
            showMessage(data.message, data.success ? 'success' : 'danger');

            // Reset the 15-minute timer on successful resend
            if (data.success) {
                clearInterval(timerInterval);
                timeRemaining = 15 * 60;
                timerInterval = setInterval(updateTimer, 1000);
                updateTimer();
                codeInput.disabled = false;
                if (attemptCount < maxAttempts) {
                    verifyBtn.disabled = false;
                }
            }
        })
        .catch(error => {
            console.error('Resend error:', error);
            showMessage('Failed to resend code', 'danger');
        });

        const cooldownInterval = setInterval(() => {
            this.innerHTML = '<i class="bi bi-clock me-1"></i>Wait ' + resendCooldown + 's';
            resendCooldown--;

            if (resendCooldown < 0) {
                clearInterval(cooldownInterval);
                this.innerHTML = originalText;
                canResend = true;
                resendCooldown = 60;
            }
        }, 1000);
    });

    // Timer
    let timeRemaining = 15 * 60;
    function updateTimer() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timeLeftElement.textContent = minutes + ':' + seconds.toString().padStart(2, '0');

        if (timeRemaining <= 0) {
            timeLeftElement.textContent = 'Expired';
            codeInput.disabled = true;
            verifyBtn.disabled = true;
            clearInterval(timerInterval);
        }
        timeRemaining--;
    }
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}