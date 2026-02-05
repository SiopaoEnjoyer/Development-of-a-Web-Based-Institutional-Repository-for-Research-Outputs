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

// Open denial modal
function openDenyModal(profileId) {
    const modal = document.getElementById('denyModal_' + profileId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Reset the reason dropdown
        const reasonSelect = document.getElementById('denial_reason_' + profileId);
        if (reasonSelect) {
            reasonSelect.value = '';
        }
    }
}

// Close denial modal
function closeDenyModal(profileId) {
    const modal = document.getElementById('denyModal_' + profileId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Handle deny form submission
function handleDenySubmit(event, form, userName) {
    event.preventDefault();
    
    const formData = new FormData(form);
    const reason = formData.get('denial_reason');
    
    if (!reason) {
        showError('Please select a reason for denial.');
        return false;
    }
    
    fetch(form.action, {
        method: 'POST',
        body: formData,
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