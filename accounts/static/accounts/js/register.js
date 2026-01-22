document.addEventListener("DOMContentLoaded", function () {
    const serverDataElement = document.getElementById('serverData');
    const serverData = serverDataElement ? JSON.parse(serverDataElement.textContent) : {};
    
    const registerCard = document.getElementById('registerCard');
    const registerForm = document.getElementById('registerForm');
    const roleSelect = document.getElementById("id_role");
    const shsCheck = document.getElementById("shsCheck");
    const batchFields = document.getElementById("batchFields");
    const tookShsCheckbox = document.getElementById("id_took_shs");

    const birthMonth = document.getElementById('birthMonth');
    const birthDay = document.getElementById('birthDay');
    const birthYear = document.getElementById('birthYear');
    
    const recaptchaContainer = document.querySelector('.recaptcha-container');

    if (serverData.hasFormErrors && serverData.requestMethod === 'POST') {
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        if (serverData.formErrors.g11) {
            const g11Input = document.getElementById('id_g11');
            if (g11Input && !g11Input.value.trim()) {
                g11Input.classList.add('is-invalid');
            }
        }
        
        if (serverData.formErrors.g12) {
            const g12Input = document.getElementById('id_g12');
            if (g12Input && !g12Input.value.trim()) {
                g12Input.classList.add('is-invalid');
            }
        }

        for (const [field, error] of Object.entries(serverData.formErrors)) {
            if (field === '__all__' || field === 'g11' || field === 'g12' || field === 'captcha') {
                continue;
            }
            
            const fieldInput = document.querySelector(`[name="${field}"]`);
            if (fieldInput) {
                const fieldValue = fieldInput.value;
                const fieldType = fieldInput.type;
                const fieldTagName = fieldInput.tagName.toLowerCase();
                
                let shouldMarkInvalid = false;
                
                if (fieldTagName === 'select') {
                    shouldMarkInvalid = !fieldValue;
                } else if (fieldType === 'checkbox') {
                    shouldMarkInvalid = !fieldInput.checked;
                } else if (fieldType === 'text' || fieldType === 'email' || fieldType === 'password') {
                    shouldMarkInvalid = !fieldValue || fieldValue.trim() === '';
                } else {
                    shouldMarkInvalid = !fieldValue;
                }
                
                if (shouldMarkInvalid) {
                    fieldInput.classList.add('is-invalid');
                }
            }
        }
    } else {
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }

    if (serverData.hasFormErrors && serverData.requestMethod === 'POST') {
        let errorCount = 0;
        
        if (serverData.nonFieldErrors && serverData.nonFieldErrors.length > 0) {
            serverData.nonFieldErrors.forEach(error => {
                if (typeof showError === 'function') {
                    showError(error, 5000);
                }
                errorCount++;
            });
        }
        
        for (const [field, error] of Object.entries(serverData.formErrors)) {
            if (field !== '__all__') {
                errorCount++;
            }
        }
        
        if (errorCount > 0 && typeof showError === 'function') {
            const toastMessage = errorCount === 1 
                ? "Please fix the error in the form below"
                : `Please fix ${errorCount} errors in the form below`;
            showError(toastMessage, 5000);
        }
    }
    
    if (serverData.messages && serverData.messages.length > 0) {
        serverData.messages.forEach(message => {
            if (message.level >= 40 && typeof showError === 'function') {
                showError(message.text, 4000);
            } else if (message.level >= 30 && typeof showWarning === 'function') {
                showWarning(message.text, 3500);
            } else if (message.level >= 25 && typeof showSuccess === 'function') {
                showSuccess(message.text, 3000);
            } else if (typeof showInfo === 'function') {
                showInfo(message.text, 3000);
            }
        });
    }

    const modalElement = document.getElementById('verificationModal');
    if (modalElement && typeof bootstrap !== 'undefined' && typeof initVerificationModal !== 'undefined') {
        const showModalRaw = serverData.verification.showModal;
        const verificationEmail = serverData.verification.email;
        const shouldShowModal = (showModalRaw === 'True' || showModalRaw === 'true') && verificationEmail.length > 0;
        
        if (shouldShowModal) {
            initVerificationModal({
                showModal: true,
                email: verificationEmail,
                csrfToken: serverData.csrfToken,
                verifyUrl: serverData.urls.verifyEmail,
                resendUrl: serverData.urls.resendVerification,
                maxAttempts: 10
            });
        }
    }

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1960; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        birthYear.appendChild(option);
    }

    birthMonth.addEventListener('change', function() {
        birthDay.disabled = false;
        birthDay.innerHTML = '<option value="">Day</option>';
        
        const month = parseInt(this.value);
        const year = parseInt(birthYear.value) || currentYear;
        
        if (month) {
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                birthDay.appendChild(option);
            }
        } else {
            birthDay.disabled = true;
        }
    });

    birthYear.addEventListener('change', function() {
        if (birthMonth.value) {
            const currentDay = birthDay.value;
            birthMonth.dispatchEvent(new Event('change'));
            if (currentDay && birthDay.querySelector(`option[value="${currentDay}"]`)) {
                birthDay.value = currentDay;
            }
        }
    });

    const hasErrors = document.querySelector('.is-invalid') !== null;
    if (hasErrors) {
        registerCard.classList.add('shake');
        setTimeout(() => registerCard.classList.remove('shake'), 600);
    }

    registerForm.addEventListener('submit', function(e) {
        const email = document.getElementById('id_email');
        const password = document.getElementById('id_password');
        const confirmPassword = document.getElementById('id_confirm_password'); 
        const role = document.getElementById('id_role');
        const firstName = document.getElementById('id_first_name');
        const lastName = document.getElementById('id_last_name');
        const agreeTerms = document.getElementById('agreeTerms');
        const g11Input = document.getElementById('id_g11');
        const g12Input = document.getElementById('id_g12');
        
        const recaptchaResponse = document.querySelector('[name="g-recaptcha-response"]');
        
        let hasError = false;
        let errorMessages = [];
        
        [email, password, confirmPassword, role, firstName, lastName, birthMonth, birthDay, birthYear].forEach(field => {
            if (field) field.classList.remove('is-invalid');
        });
        
        if (g11Input) g11Input.classList.remove('is-invalid');
        if (g12Input) g12Input.classList.remove('is-invalid');
        
        if (recaptchaContainer) {
            recaptchaContainer.style.borderColor = '#e3e6ea';
            recaptchaContainer.style.boxShadow = 'none';
            
            const captchaError = document.querySelector('.recaptcha-error');
            if (captchaError) {
                captchaError.style.display = 'none';
            }
        }
        
        if (!email.value.trim()) {
            email.classList.add('is-invalid');
            document.getElementById('emailError').textContent = 'Please enter your email address';
            errorMessages.push('Email is required');
            hasError = true;
        } else if (!isValidEmail(email.value)) {
            email.classList.add('is-invalid');
            document.getElementById('emailError').textContent = 'Please enter a valid email address';
            errorMessages.push('Invalid email address');
            hasError = true;
        }
        
        if (!password.value) {
            password.classList.add('is-invalid');
            document.getElementById('passwordError').textContent = 'Please enter a password';
            errorMessages.push('Password is required');
            hasError = true;
        } else if (password.value.length < 8 || password.value.length > 20) {
            password.classList.add('is-invalid');
            document.getElementById('passwordError').textContent = 'Password must be 8-20 characters long';
            errorMessages.push('Password must be 8-20 characters');
            hasError = true;
        }
        
        if (!confirmPassword.value) {
            confirmPassword.classList.add('is-invalid');
            document.getElementById('confirmPasswordError').textContent = 'Please confirm your password';
            errorMessages.push('Password confirmation required');
            hasError = true;
        } else if (password.value !== confirmPassword.value) {
            confirmPassword.classList.add('is-invalid');
            document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
            errorMessages.push('Passwords do not match');
            hasError = true;
        }
        
        if (!role.value) {
            role.classList.add('is-invalid');
            errorMessages.push('Role is required');
            hasError = true;
        }
        
        if (!firstName.value.trim()) {
            firstName.classList.add('is-invalid');
            errorMessages.push('First name is required');
            hasError = true;
        }
        
        if (!lastName.value.trim()) {
            lastName.classList.add('is-invalid');
            errorMessages.push('Last name is required');
            hasError = true;
        }

        if (!birthMonth.value || !birthDay.value || !birthYear.value) {
            if (!birthMonth.value) birthMonth.classList.add('is-invalid');
            if (!birthDay.value) birthDay.classList.add('is-invalid');
            if (!birthYear.value) birthYear.classList.add('is-invalid');
            errorMessages.push('Complete date of birth required');
            hasError = true;
        }

        const selectedRole = role.value;
        const isSHSStudent = selectedRole === 'shs_student';
        const isAlumniWithSHS = selectedRole === 'alumni' && tookShsCheckbox && tookShsCheckbox.checked;
        
        if (isSHSStudent || isAlumniWithSHS) {
            const g11Value = g11Input ? g11Input.value.trim() : '';
            const g12Value = g12Input ? g12Input.value.trim() : '';
            
            if (!g11Value && !g12Value) {
                if (g11Input) g11Input.classList.add('is-invalid');
                if (g12Input) g12Input.classList.add('is-invalid');
                errorMessages.push('At least one batch year (Grade 11 or Grade 12) is required');
                hasError = true;
            } else {
                const batchPattern = /^\d{4}-\d{4}$/;
                
                if (g11Value && !batchPattern.test(g11Value)) {
                    if (g11Input) g11Input.classList.add('is-invalid');
                    errorMessages.push('Grade 11 batch must be in format YYYY-YYYY (e.g., 2019-2020)');
                    hasError = true;
                }
                
                if (g12Value && !batchPattern.test(g12Value)) {
                    if (g12Input) g12Input.classList.add('is-invalid');
                    errorMessages.push('Grade 12 batch must be in format YYYY-YYYY (e.g., 2020-2021)');
                    hasError = true;
                }
            }
        }

        if (!agreeTerms.checked) {
            agreeTerms.classList.add('is-invalid');
            errorMessages.push('You must agree to the Terms and Conditions');
            hasError = true;
        }
        
        if (!recaptchaResponse || !recaptchaResponse.value) {
            if (recaptchaContainer) {
                recaptchaContainer.style.borderColor = '#dc3545';
                recaptchaContainer.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
                
                const captchaError = document.querySelector('.recaptcha-error');
                if (captchaError) {
                    captchaError.style.display = 'block';
                }
            }
            errorMessages.push('Please complete the security verification');
            hasError = true;
        }
        
        if (hasError) {
            e.preventDefault();
            registerCard.classList.add('shake');
            setTimeout(() => registerCard.classList.remove('shake'), 600);
            
            if (typeof showError === 'function') {
                if (errorMessages.length === 1) {
                    showError(errorMessages[0], 4000);
                } else {
                    showError(`Please fix ${errorMessages.length} errors in the form`, 5000);
                }
            }
            
            const firstInvalid = document.querySelector('.is-invalid, .recaptcha-container[style*="border-color: rgb(220, 53, 69)"]');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    const inputs = registerForm.querySelectorAll('input:not([type="checkbox"]), select');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            
            const isOptionalField = this.id === 'id_middle_initial' || 
                                   this.id === 'id_suffix' || 
                                   this.id === 'id_g11' || 
                                   this.id === 'id_g12';
            
            if (this.value.trim() && !isOptionalField) {
                this.classList.add('is-valid');
            } else {
                this.classList.remove('is-valid');
            }
        });
    });
    
    if (recaptchaContainer) {
        const observer = new MutationObserver(function(mutations) {
            const recaptchaResponse = document.querySelector('[name="g-recaptcha-response"]');
            if (recaptchaResponse && recaptchaResponse.value) {
                recaptchaContainer.style.borderColor = '#28a745';
                recaptchaContainer.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
                
                const captchaError = document.querySelector('.recaptcha-error');
                if (captchaError) {
                    captchaError.style.display = 'none';
                }
            }
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function updateFields() {
        if (!roleSelect) return;

        const role = roleSelect.value;
        const g11Input = document.getElementById('id_g11');
        const g12Input = document.getElementById('id_g12');

        if (role === "shs_student") {
            shsCheck.style.display = "none";
            batchFields.style.display = "block";
            batchFields.style.animation = "fadeIn 0.5s ease";
            
            if (g11Input) g11Input.placeholder = "e.g., 2019-2020";
            if (g12Input) g12Input.placeholder = "e.g., 2020-2021";
        } 
        else if (role === "alumni") {
            shsCheck.style.display = "block";
            shsCheck.style.animation = "fadeIn 0.5s ease";
            
            if (tookShsCheckbox && tookShsCheckbox.checked) {
                batchFields.style.display = "block";
                batchFields.style.animation = "fadeIn 0.5s ease";
                
                if (g11Input) g11Input.placeholder = "e.g., 2019-2020";
                if (g12Input) g12Input.placeholder = "e.g., 2020-2021";
            } else {
                batchFields.style.display = "none";
                if (g11Input) g11Input.value = '';
                if (g12Input) g12Input.value = '';
            }
        } 
        else {
            shsCheck.style.display = "none";
            batchFields.style.display = "none";
            
            if (g11Input) g11Input.value = '';
            if (g12Input) g12Input.value = '';
        }
        
        if (batchFields.style.display === "none") {
            if (g11Input) g11Input.classList.remove('is-invalid', 'is-valid');
            if (g12Input) g12Input.classList.remove('is-invalid', 'is-valid');
        }
    }

    if (roleSelect) {
        roleSelect.addEventListener("change", updateFields);
    }

    if (tookShsCheckbox) {
        tookShsCheckbox.addEventListener("change", updateFields);
    }

    updateFields();

    const firstNameInput = document.getElementById('id_first_name');
    const lastNameInput = document.getElementById('id_last_name');
    const middleInitialInput = document.getElementById('id_middle_initial');
    const suffixInput = document.getElementById('id_suffix');

    function toTitleCase(str) {
        return str.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    function toUpperCase(str) {
        return str.trim().toUpperCase();
    }

    if (firstNameInput) {
        firstNameInput.addEventListener('blur', function() {
            const trimmed = this.value.trim().replace(/\s+/g, ' ');
            this.value = toTitleCase(trimmed);
        });
    }

    if (lastNameInput) {
        lastNameInput.addEventListener('blur', function() {
            const trimmed = this.value.trim().replace(/\s+/g, ' ');
            this.value = toTitleCase(trimmed);
        });
    }

    if (middleInitialInput) {
        middleInitialInput.addEventListener('input', function(e) {
            this.value = toUpperCase(this.value.replace(/\s/g, '')).slice(0, 1);
        });
    }

    if (suffixInput) {
        suffixInput.addEventListener('input', function(e) {
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });
    }
});