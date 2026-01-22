// Detail Page JavaScript - Citation Functionality

document.addEventListener('DOMContentLoaded', function() {
  // Initialize citation functionality
  initializeCitation();
  
  // Initialize back button functionality
  initializeBackButton();
  
  // Animate elements on scroll
  observeElements();
});

/**
 * Initialize back button navigation
 */
function initializeBackButton() {
  const backButton = document.getElementById('backButton');
  
  if (backButton) {
    backButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Check if there's a previous page in history
      if (document.referrer && document.referrer !== window.location.href) {
        // Go back to the previous page
        window.history.back();
      } else {
        // No previous page, redirect to home/index
        const indexUrl = backButton.getAttribute('data-index-url') || '/';
        window.location.href = indexUrl;
      }
    });
  }
}

/**
 * Generate APA 7th Edition Citation
 */
function generateAPACitation() {
  // Get paper data from the page
  const title = document.querySelector('.detail-header h2')?.textContent.trim();
  const dateElement = document.querySelector('.meta-info');
  
  if (!title) return '';
  
  // Parse date - extract everything after "Finished on:" or "Published:"
  let dateText = '';
  if (dateElement) {
    // Get text and remove icon elements
    const fullText = dateElement.textContent || dateElement.innerText;
    // Remove Bootstrap icon characters and other special chars, then clean whitespace
    const cleanText = fullText
      .replace(/[\uE000-\uF8FF\u{1F300}-\u{1F9FF}]/gu, '') // Remove icon chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const match = cleanText.match(/(?:Finished on|Published):\s*(.+)/i);
    if (match) {
      dateText = match[1].trim();
    }
  }
  
  // Parse authors
  let authors = [];
  const authorListElement = document.querySelector('.author-list');
  
  if (authorListElement) {
    // Get text content, remove any icons
    let authorText = authorListElement.textContent.trim();
    
    // Remove the icon character if present (looks like a box or special char)
    authorText = authorText.replace(/^[\uE000-\uF8FF\s]+/, '');
    
    // Split by comma - this gives us segments
    const segments = authorText.split(',').map(s => s.trim()).filter(s => s);
    
    let i = 0;
    while (i < segments.length) {
      const segment = segments[i];
      
      // Pattern 1: Full name format (consented) - "Arthur B. Gaurana"
      // Has multiple words with at least one full word (not just initials)
      const isFullName = /^[A-Z][a-z]+(\s+[A-Z]\.?)*\s+[A-Z][a-z]+/.test(segment);
      
      if (isFullName) {
        // This is "First Middle. Last" format
        const nameParts = segment.split(/\s+/);
        const lastName = nameParts[nameParts.length - 1];
        
        // Convert first/middle names to initials
        const firstMiddle = nameParts.slice(0, -1);
        const initials = firstMiddle.map(part => {
          if (/^[A-Z]\.?$/.test(part)) {
            return part.endsWith('.') ? part : part + '.';
          }
          return part.charAt(0).toUpperCase() + '.';
        }).join(' ');
        
        // Check for suffix in next segment
        if (i + 1 < segments.length && /^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/i.test(segments[i + 1])) {
          authors.push(`${lastName}, ${initials}, ${segments[i + 1]}`);
          i += 2;
        } else {
          authors.push(`${lastName}, ${initials}`);
          i++;
        }
      }
      // Pattern 2: Last name followed by initials (non-consented) - "Sta. Ana" + "C. L. C."
      // Last name can be multi-word: "Sta. Ana", "De La Cruz"
      else if (/^[A-Z][a-z]+(\.\s*[A-Z][a-z]+)*(\s+[A-Z][a-z]+)*$/.test(segment)) {
        const lastName = segment;
        
        // Next segment should be the initials (all together, space-separated)
        if (i + 1 < segments.length) {
          const nextSegment = segments[i + 1];
          
          // Check if next segment is initials: "C. L. C." or "S. D. F."
          // Pattern: letters with dots and spaces, no lowercase
          if (/^[A-Z](\.\s*[A-Z])*\.?$/.test(nextSegment.replace(/\s+/g, ''))) {
            // This is the initials segment
            const initials = nextSegment.replace(/([A-Z])(?!\.)(?=\s|$)/g, '$1.').trim();
            authors.push(`${lastName}, ${initials}`);
            i += 2; // Skip both lastname and initials segments
          } else {
            // No initials found, just use last name
            authors.push(lastName);
            i++;
          }
        } else {
          // No next segment, just use last name
          authors.push(lastName);
          i++;
        }
      }
      else {
        // Skip unrecognized patterns
        i++;
      }
    }
  }
  
  // Format authors according to APA 7th
  let authorString = '';
  if (authors.length === 0) {
    authorString = '[No author].';
  } else if (authors.length === 1) {
    authorString = authors[0];
  } else if (authors.length === 2) {
    authorString = `${authors[0]}, & ${authors[1]}`;
  } else if (authors.length <= 20) {
    const lastAuthor = authors[authors.length - 1];
    const otherAuthors = authors.slice(0, -1).join(', ');
    authorString = `${otherAuthors}, & ${lastAuthor}`;
  } else {
    // For 21+ authors, list first 19, then ... then last author
    const first19 = authors.slice(0, 19).join(', ');
    const lastAuthor = authors[authors.length - 1];
    authorString = `${first19}, ... ${lastAuthor}`;
  }
  
  // Parse year
  let year = 'n.d.';
  if (dateText) {
    // Try multiple date parsing approaches
    const parsedDate = new Date(dateText);
    
    if (!isNaN(parsedDate.getTime())) {
      year = parsedDate.getFullYear();
    } else {
      // Try to extract year directly (YYYY format)
      const yearMatch = dateText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = yearMatch[0];
      }
    }
  }
  
  // Clean title (remove asterisks used for italics in Django)
  let cleanTitle = title.replace(/\*/g, '');
  
  // Convert to sentence case (first letter uppercase, rest lowercase)
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).toLowerCase();
  
  // Get current page URL
  const currentUrl = window.location.href;
  
  // Build citation
  let citation = `${authorString} (${year}). <em>${cleanTitle}</em> `;
  citation += `[Unpublished manuscript]. Bacolod Trinity Christian School, Inc. ${currentUrl}`;
  
  return citation;
}

/**
 * Initialize citation functionality
 */
function initializeCitation() {
  const citationBox = document.querySelector('.citation-box');
  if (!citationBox) return;
  
  // Generate and display citation when modal is shown
  const citationModal = document.getElementById('citationModal');
  if (citationModal) {
    citationModal.addEventListener('show.bs.modal', function() {
      const citation = generateAPACitation();
      citationBox.innerHTML = citation;
    });
  }
  
  // Copy button functionality
  const copyBtn = document.getElementById('copyCitation');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      const plainText = citationBox.innerText;
      
      navigator.clipboard.writeText(plainText).then(() => {
        showCopyFeedback(copyBtn);
      }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback method
        fallbackCopy(plainText);
        showCopyFeedback(copyBtn);
      });
    });
  }
  
  // Download button functionality
  const downloadBtn = document.getElementById('downloadCitation');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      downloadCitationAsText();
    });
  }
}

/**
 * Show copy feedback
 */
function showCopyFeedback(button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="bi bi-check-circle"></i> Copied!';
  button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  
  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.background = '';
  }, 2000);
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  
  document.body.removeChild(textArea);
}

/**
 * Download citation as text file
 */
function downloadCitationAsText() {
  const citationBox = document.querySelector('.citation-box');
  if (!citationBox) return;
  
  const plainText = citationBox.innerText;
  const title = document.querySelector('.detail-header h2')?.textContent.trim().replace(/\*/g, '');
  const filename = `citation_${title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.txt`;
  
  const blob = new Blob([plainText], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Observe elements for scroll animations
 */
function observeElements() {
  // Animation removed per user request
}

// Export functions for use in inline scripts if needed
window.citationFunctions = {
  generateAPACitation,
  downloadCitationAsText
};