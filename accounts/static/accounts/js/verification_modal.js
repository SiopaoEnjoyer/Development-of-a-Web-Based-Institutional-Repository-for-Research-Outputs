/**
 * Unified Verification Modal Handler
 * Supports both 6-box input and single input modes
 * Works for email verification AND password reset
 */

function initVerificationModal(config) {
    const {
        showModal,
        email,
        csrfToken,
        verifyUrl,
        resendUrl,
        maxAttempts = 10,
        useSingleInput = false  // New option for single input mode
    } = config;

    if (!showModal || !email) {
        console.log('❌ No verification modal to show');
        return;
    }

    console.log('✅ Initializing verification modal', useSingleInput ? '(single input)' : '(6-box input)');

    const modalElement = document.getElementById('verificationModal');
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
    });

    document.getElementById('modalEmail').textContent = email;

    const verifyBtn = document.getElementById('modalVerifyBtn');
    const resendBtn = document.getElementById('modalResendBtn');
    const messageDiv = document.getElementById('modalMessage');
    const timeLeftElement = document.getElementById('modalTimeLeft');

    // Verify these elements exist
    if (!verifyBtn || !resendBtn || !messageDiv || !timeLeftElement) {
        console.error('❌ Required modal elements not found');
        return;
    }

    // Track verification attempts
    let attemptCount = 0;

    modal.show();

    // Get code function - works for both input modes
    function getCode() {
        if (useSingleInput) {
            const singleInput = document.getElementById('singleCodeInput');
            return singleInput ? singleInput.value.trim() : '';
        } else {
            const codeBoxes = document.querySelectorAll('#codeBoxesContainer .code-box');
            return Array.from(codeBoxes).map(box => box.value).join('');
        }
    }

    // Clear code function
    function clearCode() {
        if (useSingleInput) {
            const singleInput = document.getElementById('singleCodeInput');
            if (singleInput) {
                singleInput.value = '';
                singleInput.focus();
            }
        } else {
            const codeBoxes = document.querySelectorAll('#codeBoxesContainer .code-box');
            codeBoxes.forEach(box => box.value = '');
            if (codeBoxes[0]) codeBoxes[0].focus();
        }
    }

    // Setup input handlers
    if (useSingleInput) {
        const singleInput = document.getElementById('singleCodeInput');
        if (singleInput) {
            // Focus on modal open
            modalElement.addEventListener('shown.bs.modal', function() {
                setTimeout(() => singleInput.focus(), 200);
            });

            // Only allow numbers
            singleInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });

            // Handle Enter key
            singleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyBtn.click();
                }
            });
        }
    } else {
        const codeBoxes = document.querySelectorAll('#codeBoxesContainer .code-box');
        
        // Focus first box when modal opens
        modalElement.addEventListener('shown.bs.modal', function() {
            setTimeout(() => {
                if (codeBoxes[0]) codeBoxes[0].focus();
            }, 200);
        });

        // Handle input boxes
        codeBoxes.forEach((box, index) => {
            // Only allow numbers
            box.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                
                // Auto-focus next box
                if (this.value && index < 5 && codeBoxes[index + 1]) {
                    codeBoxes[index + 1].focus();
                }
            });
            
            // Handle backspace
            box.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0 && codeBoxes[index - 1]) {
                    codeBoxes[index - 1].focus();
                }
                
                // Handle Enter key
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyBtn.click();
                }
            });
            
            // Handle paste
            box.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                
                for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
                    if (codeBoxes[i]) {
                        codeBoxes[i].value = pastedData[i];
                    }
                }
                
                const lastFilledIndex = Math.min(pastedData.length - 1, 5);
                if (lastFilledIndex < 5 && codeBoxes[lastFilledIndex + 1]) {
                    codeBoxes[lastFilledIndex + 1].focus();
                } else if (codeBoxes[5]) {
                    codeBoxes[5].focus();
                }
            });
        });
    }

    // Show message - both modal alert and toast
    function showMessage(text, type) {
        // Show in-modal alert
        messageDiv.className = 'alert alert-' + type;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
        
        // Also show toast notification if available
        if (typeof showError === 'function' && type === 'danger') {
            showError(text, 4000);
        } else if (typeof showSuccess === 'function' && type === 'success') {
            showSuccess(text, 4000);
        } else if (typeof showWarning === 'function' && type === 'warning') {
            showWarning(text, 3500);
        } else if (typeof showInfo === 'function' && type === 'info') {
            showInfo(text, 3000);
        }
    }

    // Function to show locked modal
    function showLockedModal() {
        console.log('🔒 Showing locked modal');
        // Hide verification modal
        modal.hide();
        
        // Show locked modal after a brief delay
        setTimeout(() => {
            const lockedModalElement = document.getElementById('accountLockedModal');
            if (!lockedModalElement) {
                console.error('❌ Account locked modal element not found');
                if (typeof showError === 'function') {
                    showError('Account locked due to too many attempts. Please try again in 24 hours.', 5000);
                } else {
                    alert('Account locked due to too many attempts. Please try again in 24 hours.');
                }
                return;
            }
            const lockedModal = new bootstrap.Modal(lockedModalElement, {
                backdrop: 'static',
                keyboard: false
            });
            lockedModal.show();
        }, 500);
    }

    // Verify button
    console.log('🔘 Attaching verify button listener');
    verifyBtn.addEventListener('click', function(e) {
        console.log('🔘 Verify button clicked', { attemptCount, maxAttempts });
        e.preventDefault();
        
        const code = getCode();
        console.log('📝 Code entered:', code);
        
        if (code.length !== 6) {
            showMessage('Please enter a 6-digit code', 'danger');
            return;
        }

        // Check attempt limit (frontend check)
        if (attemptCount >= maxAttempts) {
            console.log('❌ Max attempts reached on frontend');
            showLockedModal();
            return;
        }

        attemptCount++;
        const attemptsRemaining = maxAttempts - attemptCount;
        console.log(`📊 Attempt ${attemptCount}/${maxAttempts}, ${attemptsRemaining} remaining`);
        
        verifyBtn.disabled = true;
        const originalBtnText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
        
        console.log('🌐 Sending verification request to:', verifyUrl);
        
        fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken
            },
            body: new URLSearchParams({code: code})
        })
        .then(response => {
            console.log('📥 Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📦 Response data:', data);
            
            if (data.success) {
                showMessage(data.message, 'success');
                setTimeout(() => window.location.href = data.redirect, 1000);
            } else {
                // Check if account is locked (server response)
                if (data.locked) {
                    console.log('🔒 Account locked by server');
                    showLockedModal();
                } else {
                    // Show attempts remaining
                    const attemptsMsg = attemptsRemaining > 0 
                        ? ` (${attemptsRemaining} attempts remaining)` 
                        : '';
                    showMessage(data.message + attemptsMsg, 'danger');
                    
                    // If out of attempts, show locked modal
                    if (attemptsRemaining === 0) {
                        console.log('🔒 Out of attempts, showing locked modal');
                        setTimeout(() => showLockedModal(), 2000);
                    } else {
                        clearCode();
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = originalBtnText;
                    }
                }
            }
        })
        .catch(error => {
            console.error('❌ Verification error:', error);
            showMessage('An error occurred. Please try again.', 'danger');
            clearCode();
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = originalBtnText;
        });
    });

    // Resend button with timer reset
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
            verifyBtn.disabled = true;
            clearInterval(timerInterval);
        }
        timeRemaining--;
    }
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}