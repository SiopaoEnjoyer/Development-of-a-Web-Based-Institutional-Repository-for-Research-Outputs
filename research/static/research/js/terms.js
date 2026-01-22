/**
 * Terms of Service & Privacy Policy - Interactive Section Toggle
 * Handles accordion-style expansion and collapse of sections
 */

/**
 * Toggle the visibility of a section (for Terms of Service)
 * @param {HTMLElement} button - The button element that was clicked
 */
function toggleSection(button) {
    const content = button.nextElementSibling;
    const chevron = button.querySelector('.terms-chevron');
    
    // Get all sections and chevrons
    const allContents = document.querySelectorAll('.terms-section-content');
    const allChevrons = document.querySelectorAll('.terms-chevron');
    
    // Close all other sections (accordion behavior)
    allContents.forEach(section => {
        if (section !== content && section.classList.contains('active')) {
            section.classList.remove('active');
        }
    });
    
    // Reset all other chevrons
    allChevrons.forEach(icon => {
        if (icon !== chevron && icon.classList.contains('active')) {
            icon.classList.remove('active');
        }
    });
    
    // Toggle current section
    content.classList.toggle('active');
    chevron.classList.toggle('active');
    
    // Smooth scroll to section if opening and not fully visible
    if (content.classList.contains('active')) {
        setTimeout(() => {
            const headerOffset = 100;
            const elementPosition = button.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            // Only scroll if button is not fully visible
            if (elementPosition < headerOffset || elementPosition > window.innerHeight - 100) {
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
}

/**
 * Toggle the visibility of a privacy section (for Privacy Policy)
 * @param {HTMLElement} button - The button element that was clicked
 */
function togglePrivacySection(button) {
    const content = button.nextElementSibling;
    const chevron = button.querySelector('.privacy-chevron');
    
    // Get all sections and chevrons
    const allContents = document.querySelectorAll('.privacy-section-content');
    const allChevrons = document.querySelectorAll('.privacy-chevron');
    
    // Close all other sections (accordion behavior)
    allContents.forEach(section => {
        if (section !== content && section.classList.contains('active')) {
            section.classList.remove('active');
        }
    });
    
    // Reset all other chevrons
    allChevrons.forEach(icon => {
        if (icon !== chevron && icon.classList.contains('active')) {
            icon.classList.remove('active');
        }
    });
    
    // Toggle current section
    content.classList.toggle('active');
    chevron.classList.toggle('active');
    
    // Smooth scroll to section if opening and not fully visible
    if (content.classList.contains('active')) {
        setTimeout(() => {
            const headerOffset = 100;
            const elementPosition = button.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            // Only scroll if button is not fully visible
            if (elementPosition < headerOffset || elementPosition > window.innerHeight - 100) {
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
}

/**
 * Initialize functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard accessibility for Terms sections
    const sectionHeaders = document.querySelectorAll('.terms-section-header');
    
    sectionHeaders.forEach(header => {
        header.setAttribute('tabindex', '0');
        
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection(this);
            }
        });
    });
    
    // Add keyboard accessibility for Privacy sections
    const privacySectionHeaders = document.querySelectorAll('.privacy-section-header');
    
    privacySectionHeaders.forEach(header => {
        header.setAttribute('tabindex', '0');
        
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePrivacySection(this);
            }
        });
    });
    
    // Optional: Deep linking to specific sections
    const hash = window.location.hash;
    if (hash) {
        const sectionId = hash.substring(1);
        const targetSection = document.getElementById(sectionId);
        
        if (targetSection) {
            if (targetSection.classList.contains('terms-section-header')) {
                setTimeout(() => {
                    toggleSection(targetSection);
                }, 300);
            } else if (targetSection.classList.contains('privacy-section-header')) {
                setTimeout(() => {
                    togglePrivacySection(targetSection);
                }, 300);
            }
        }
    }
});