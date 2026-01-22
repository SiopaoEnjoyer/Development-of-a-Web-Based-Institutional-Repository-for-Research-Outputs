/* ============================================
   CONSENT APPROVALS SPECIFIC JAVASCRIPT
   ============================================ */

// Handle approve consent with toast
function handleApproveConsent(event, form, studentName) {
    event.preventDefault();
    
    fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (response.ok) {
            showSuccess(`Parental consent for ${studentName} has been approved!`);
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showError('Failed to approve consent.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('An error occurred. Please try again.');
    });
    
    return false;
}

// Handle deny consent with confirmation and toast
function handleDenyConsent(event, form, studentName) {
    event.preventDefault();
    
    if (confirm(`Are you sure you want to deny the parental consent for ${studentName}? The consent file will be deleted and the student will need to re-upload.`)) {
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (response.ok) {
                showWarning(`Parental consent for ${studentName} has been denied. The file has been deleted.`);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showError('Failed to deny consent.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        });
    }
    
    return false;
}