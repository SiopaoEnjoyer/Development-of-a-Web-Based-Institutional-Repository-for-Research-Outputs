/* ============================================
   PENDING APPROVALS SPECIFIC JAVASCRIPT
   ============================================ */

// Handle approve with toast
function handleApprove(event, form, userName) {
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
            showSuccess(`${userName} has been approved successfully!`);
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showError('Failed to approve user.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('An error occurred. Please try again.');
    });
    
    return false;
}

// Handle deny with confirmation and toast
function handleDeny(event, form, userName) {
    event.preventDefault();
    
    if (confirm(`Are you sure you want to deny the account for ${userName}? This action cannot be undone.`)) {
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (response.ok) {
                showSuccess(`${userName}'s account has been denied.`);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showError('Failed to deny user.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        });
    }
    
    return false;
}

// Handle edit and approve submission
function handleEditApproveSubmit(event, form) {
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
            showSuccess('User information updated and approved successfully!');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showError('Failed to update and approve user.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('An error occurred. Please try again.');
    });
    
    return false;
}