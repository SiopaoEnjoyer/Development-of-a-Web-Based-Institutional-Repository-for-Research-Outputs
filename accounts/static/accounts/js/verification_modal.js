/**
 * Unified Verification Modal Handler - PROPERLY FIXED VERSION
 * Supports both 6-box input and single input modes
 * Works for email verification AND password reset
 * FIXED: Timer now properly restarts when switching tabs
 */

function initVerificationModal(config) {
    const {
        showModal,
        email,
        csrfToken,
        verifyUrl,
        resendUrl,
        maxAttempts = 10,
        useSingleInput = false
    } = config;

    if (!showModal || !email) {
        return;
    }

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

    if (!verifyBtn || !resendBtn || !messageDiv || !timeLeftElement) {
        return;
    }

    let attemptCount = 0;
    modal.show();

    // Get code function
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
            modalElement.addEventListener('shown.bs.modal', function() {
                setTimeout(() => singleInput.focus(), 200);
            });

            singleInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });

            singleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyBtn.click();
                }
            });
        }
    } else {
        const codeBoxes = document.querySelectorAll('#codeBoxesContainer .code-box');
        
        modalElement.addEventListener('shown.bs.modal', function() {
            setTimeout(() => {
                if (codeBoxes[0]) codeBoxes[0].focus();
            }, 200);
        });

        codeBoxes.forEach((box, index) => {
            box.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                
                if (this.value && index < 5 && codeBoxes[index + 1]) {
                    codeBoxes[index + 1].focus();
                }
            });
            
            box.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0 && codeBoxes[index - 1]) {
                    codeBoxes[index - 1].focus();
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyBtn.click();
                }
            });
            
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

    function showMessage(text, type) {
        // Only use toast notifications, not in-modal alerts
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

    // Show locked modal
    function showLockedModal() {
        modal.hide();
        
        setTimeout(() => {
            const lockedModalElement = document.getElementById('accountLockedModal');
            if (!lockedModalElement) {
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
verifyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    const code = getCode();
    
    if (code.length !== 6) {
        showMessage('Please enter a 6-digit code', 'danger');
        return;
    }

    if (attemptCount >= maxAttempts) {
        showLockedModal();
        return;
    }

    attemptCount++;
    const attemptsRemaining = maxAttempts - attemptCount;
    
    verifyBtn.disabled = true;
    const originalBtnText = verifyBtn.innerHTML;
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
            // Success: Close modal smoothly and redirect
            modalElement.style.transition = 'opacity 0.2s';
            modalElement.style.opacity = '0';
            
            setTimeout(() => {
                modal.hide();
                showMessage(data.message, 'success');
                setTimeout(() => window.location.href = data.redirect, 800);
            }, 200);
        } else {
            // Error handling
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = originalBtnText;
            
            if (data.locked) {
                showLockedModal();
            } else {
                const attemptsMsg = attemptsRemaining > 0 
                    ? ` (${attemptsRemaining} attempts remaining)` 
                    : '';
                showMessage(data.message + attemptsMsg, 'danger');
                
                if (attemptsRemaining === 0) {
                    setTimeout(() => showLockedModal(), 2000);
                } else {
                    clearCode();
                }
            }
        }
    })
    .catch(error => {
        console.error('Verification error:', error);
        showMessage('An error occurred. Please try again.', 'danger');
        clearCode();
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalBtnText;
    });
});

    // Resend button with cooldown
    let resendCooldown = 60;
    let canResend = true;
    let resendTimerInterval;

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
            
            if (data.success) {
                // Restart the 15-minute timer
                stopTimer();
                expirationTime = Date.now() + (15 * 60 * 1000);
                isTimerExpired = false;
                startTimer();
                
                if (attemptCount < maxAttempts) {
                    verifyBtn.disabled = false;
                }
            }
        })
        .catch(error => {
            showMessage('Failed to resend code', 'danger');
        });
        
        resendTimerInterval = setInterval(() => {
            this.innerHTML = '<i class="bi bi-clock me-1"></i>Wait ' + resendCooldown + 's';
            resendCooldown--;
            
            if (resendCooldown < 0) {
                clearInterval(resendTimerInterval);
                this.innerHTML = originalText;
                canResend = true;
                resendCooldown = 60;
            }
        }, 1000);
    });

    // ============================================
    // TIMER LOGIC - PROPERLY FIXED FOR TAB SWITCHING
    // ============================================
    
    let expirationTime = Date.now() + (15 * 60 * 1000);
    let timerInterval = null;
    let isTimerExpired = false;

    function updateTimer() {
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        timeLeftElement.textContent = minutes + ':' + seconds.toString().padStart(2, '0');
        
        if (timeRemaining <= 0 && !isTimerExpired) {
            isTimerExpired = true;
            timeLeftElement.textContent = 'Expired';
            verifyBtn.disabled = true;
            stopTimer();
            showMessage('Verification code has expired. Please request a new one.', 'warning');
        }
    }

    function startTimer() {
        // Clear any existing interval first
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Start new interval
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // Immediate first update
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // ============================================
    // PAGE VISIBILITY API - THE PROPER FIX
    // ============================================
    
    function handleVisibilityChange() {
        if (document.hidden) {
            // Tab became hidden - stop the interval to save resources
            stopTimer();
        } else {
            // Tab became visible - restart the interval
            updateTimer(); // Immediate update
            startTimer();  // Restart interval
        }
    }
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle window focus as backup
    window.addEventListener('focus', function() {
        if (!document.hidden && !timerInterval) {
            startTimer();
        }
    });

    // Start the initial timer
    startTimer();
    
    // ============================================
    // CLEANUP ON MODAL CLOSE
    // ============================================
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        stopTimer();
        clearInterval(resendTimerInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
}