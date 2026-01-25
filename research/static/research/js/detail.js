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
 * Generate APA 7th Edition Citation with proper suffix handling
 */
function generateAPACitation() {
  // Get paper data from the page
  const title = document.querySelector('.detail-header h2')?.textContent.trim();
  const dateElement = document.querySelector('.meta-info');
  
  if (!title) return '';
  
  // Parse date
  let dateText = '';
  if (dateElement) {
    const fullText = dateElement.textContent || dateElement.innerText;
    const cleanText = fullText
      .replace(/[\uE000-\uF8FF\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const match = cleanText.match(/(?:Finished on|Published):\s*(.+)/i);
    if (match) {
      dateText = match[1].trim();
    }
  }
  
  // Parse authors with improved suffix handling
  let authors = [];
  const authorListElement = document.querySelector('.author-list');
  
  if (authorListElement) {
    let authorText = authorListElement.textContent.trim();
    // Remove icon characters
    authorText = authorText.replace(/^[\uE000-\uF8FF\s]+/, '');
    
    // Split by comma and process
    const segments = authorText.split(',').map(s => s.trim()).filter(s => s);
    
    let i = 0;
    while (i < segments.length) {
      const segment = segments[i];
      
      // Check if this is a full name format (consented) - e.g., "Arthur B. Gaurana"
      const isFullName = /^[A-Z][a-z]+(\s+[A-Z]\.?)*\s+[A-Z][a-z]+/.test(segment);
      
      if (isFullName) {
        // Full name format: "First Middle Last" or "First M. Last"
        const nameParts = segment.split(/\s+/);
        const lastName = nameParts[nameParts.length - 1];
        
        const firstMiddle = nameParts.slice(0, -1);
        const initials = firstMiddle.map(part => {
          if (/^[A-Z]\.?$/.test(part)) {
            return part.endsWith('.') ? part : part + '.';
          }
          return part.charAt(0).toUpperCase() + '.';
        }).join(' ');
        
        // Check for suffix in next segment
        if (i + 1 < segments.length && /^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/i.test(segments[i + 1])) {
          const suffix = segments[i + 1];
          const normalizedSuffix = suffix.endsWith('.') ? suffix : suffix + '.';
          authors.push(`${lastName}, ${initials}, ${normalizedSuffix}`);
          i += 2;
        } else {
          authors.push(`${lastName}, ${initials}`);
          i++;
        }
      }
      // Non-consented format: "LastName, Initials" or "LastName, Initials Suffix"
      else {
        const lastName = segment;
        let initials = '';
        let suffix = '';
        
        // Look ahead for initials and suffix
        if (i + 1 < segments.length) {
          const nextSegment = segments[i + 1];
          
          // Check if next segment is initials (e.g., "N. S." or "N. S. II")
          const initialsMatch = nextSegment.match(/^([A-Z]\.\s*)+/);
          
          if (initialsMatch) {
            // Extract initials
            const initialsText = initialsMatch[0].trim();
            initials = initialsText.replace(/([A-Z])(?!\.)(?=\s|$)/g, '$1.').trim();
            
            // Check if there's a suffix in the same segment after the initials
            const remainingText = nextSegment.substring(initialsMatch[0].length).trim();
            if (remainingText && /^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/i.test(remainingText)) {
              suffix = remainingText.endsWith('.') && !remainingText.match(/^I+$/) ? remainingText : remainingText + '.';
              if (suffix === 'I.' || suffix === 'II.' || suffix === 'III.') {
                suffix = suffix.replace(/\.$/, ''); // Remove period from Roman numerals
              }
              authors.push(`${lastName}, ${initials}, ${suffix}`);
              i += 2;
            }
            // Check if next segment (i+2) is a standalone suffix
            else if (i + 2 < segments.length && /^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/i.test(segments[i + 2])) {
              suffix = segments[i + 2];
              const normalizedSuffix = suffix.endsWith('.') && !suffix.match(/^I+$/) ? suffix : suffix + '.';
              if (normalizedSuffix === 'I.' || normalizedSuffix === 'II.' || normalizedSuffix === 'III.') {
                suffix = normalizedSuffix.replace(/\.$/, '');
              } else {
                suffix = normalizedSuffix;
              }
              authors.push(`${lastName}, ${initials}, ${suffix}`);
              i += 3;
            } else {
              authors.push(`${lastName}, ${initials}`);
              i += 2;
            }
          }
          // Check if next segment is just a suffix
          else if (/^(Jr\.?|Sr\.?|I{1,3}|IV|V)$/i.test(nextSegment)) {
            suffix = nextSegment;
            const normalizedSuffix = suffix.endsWith('.') && !suffix.match(/^I+$/) ? suffix : suffix + '.';
            if (normalizedSuffix === 'I.' || normalizedSuffix === 'II.' || normalizedSuffix === 'III.') {
              suffix = normalizedSuffix.replace(/\.$/, '');
            } else {
              suffix = normalizedSuffix;
            }
            
            // Check if there are initials after the suffix
            if (i + 2 < segments.length && /^[A-Z](\.\s*[A-Z])*\.?$/.test(segments[i + 2].replace(/\s+/g, ''))) {
              initials = segments[i + 2].replace(/([A-Z])(?!\.)(?=\s|$)/g, '$1.').trim();
              authors.push(`${lastName}, ${initials}, ${suffix}`);
              i += 3;
            } else {
              authors.push(`${lastName}, ${suffix}`);
              i += 2;
            }
          } else {
            // Just last name
            authors.push(lastName);
            i++;
          }
        } else {
          // Just last name, no more segments
          authors.push(lastName);
          i++;
        }
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
    const first19 = authors.slice(0, 19).join(', ');
    const lastAuthor = authors[authors.length - 1];
    authorString = `${first19}, ... ${lastAuthor}`;
  }
  
  // Parse year
  let year = 'n.d.';
  if (dateText) {
    const parsedDate = new Date(dateText);
    
    if (!isNaN(parsedDate.getTime())) {
      year = parsedDate.getFullYear();
    } else {
      const yearMatch = dateText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = yearMatch[0];
      }
    }
  }
  
  // Clean and format title
  let cleanTitle = title.replace(/\*/g, '');
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).toLowerCase();
  
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