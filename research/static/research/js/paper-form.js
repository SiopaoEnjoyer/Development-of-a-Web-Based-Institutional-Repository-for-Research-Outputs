/* static/research/js/paper-form.js */
/* Paper upload/edit form functionality - Updated with toast notifications */

// Global variables
const gradeSelect = document.getElementById("id_grade_level");
const syInput = document.getElementById("id_school_year");
const pubMonth = document.getElementById('pubMonth');
const pubDay = document.getElementById('pubDay');
const pubYear = document.getElementById('pubYear');
const pubDateField = document.getElementById('pubDateField');
const strandSelect = document.getElementById("id_strand");
const researchDesignSelect = document.getElementById("id_research_design");
const authorSearchInput = document.getElementById("authorSearchInput");
const authorDropdown = document.getElementById("authorDropdown");
const selectedAuthorsBox = document.getElementById("selectedAuthorsBox");
const awardSearchInput = document.getElementById("awardSearchInput");
const awardDropdown = document.getElementById("awardDropdown");
const selectedAwardsBox = document.getElementById("selectedAwardsBox");
const addAuthorBtn = document.getElementById("addAuthorBtn");

let availableAuthors = [];
let selectedAuthors = new Set();
let availableKeywords = [];
let selectedKeywords = new Set();
let availableAwards = [];
let selectedAwards = new Set();

// Load existing data in edit mode
const existingDataDiv = document.getElementById("existingData");
const pageMode = existingDataDiv?.dataset.mode || "create";
let existingAuthorIds = [];
let existingAuthorNames = {};
let existingAwardIds = [];
let existingAwardNames = {};
let existingKeywordIds = [];
let existingKeywordNames = {};

// Parse existing data
if (pageMode === "edit" && existingDataDiv) {
    try {
        const existingAuthorsData = JSON.parse(existingDataDiv.dataset.authors || '[]');
        existingAuthorsData.forEach(author => {
            existingAuthorIds.push(author.id);
            existingAuthorNames[author.id] = author.name;
        });
        
        const existingAwardsData = JSON.parse(existingDataDiv.dataset.awards || '[]');
        existingAwardsData.forEach(award => {
            existingAwardIds.push(award.id);
            existingAwardNames[award.id] = award.name;
        });

        const existingKeywordsData = JSON.parse(existingDataDiv.dataset.keywords || '[]');
        existingKeywordsData.forEach(keyword => {
            existingKeywordIds.push(keyword.id);
            existingKeywordNames[keyword.id] = keyword.name;
        });
    } catch (e) {
        console.error("Error parsing existing data:", e);
    }
}

// Load all available keywords
try {
    const allKeywordsDataDiv = document.getElementById("allKeywordsData");
    if (allKeywordsDataDiv) {
        availableKeywords = JSON.parse(allKeywordsDataDiv.textContent || '[]');
        availableKeywords.sort((a, b) => a.name.localeCompare(b.name));
    }
} catch (e) {
    console.error("Error parsing keywords data:", e);
}

// Load all available awards
try {
    const allAwardsDataDiv = document.getElementById("allAwardsData");
    if (allAwardsDataDiv) {
        availableAwards = JSON.parse(allAwardsDataDiv.textContent || '[]');
        availableAwards.sort((a, b) => a.name.localeCompare(b.name));
    }
} catch (e) {
    console.error("Error parsing awards data:", e);
}

// ==================== DJANGO ERROR HANDLING ====================

function handleDjangoFormErrors() {
    // Find the Django error alert
    const errorAlert = document.getElementById('djangoErrorAlert') || document.querySelector('.alert-danger');
    
    if (errorAlert && errorAlert.style.display !== 'none') {  // ADD THIS CHECK
        // Try to extract structured errors
        const errorLists = errorAlert.querySelectorAll('ul.errorlist');
        const errors = [];
        
        if (errorLists.length > 0) {
            // Django errorlist format
            errorLists.forEach(ul => {
                ul.querySelectorAll('li').forEach(li => {
                    errors.push(li.textContent.trim());
                });
            });
        } else {
            // Fallback: look for any list items
            const listItems = errorAlert.querySelectorAll('li');
            listItems.forEach(li => {
                const text = li.textContent.trim();
                if (text && text !== 'Please correct the following errors:') {
                    errors.push(text);
                }
            });
        }
        
        // If we found errors, show them as toasts
        if (errors.length > 0) {
            errors.forEach((error, index) => {
                setTimeout(() => {
                    showError(error, 5000);
                }, index * 300); // Stagger the toasts by 300ms
            });
        } else {
            // Last resort: show generic error
            showError('Please correct the form errors and try again.', 5000);
        }
        
        // Hide the error alert AND mark it as processed
        errorAlert.style.display = 'none';
        errorAlert.dataset.processed = 'true';  // ADD THIS
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", function() {
    // Handle Django form errors and convert to toast notifications (ONLY ONCE)
    handleDjangoFormErrors();
    
    initPublicationDateDropdowns();
    
    // Set up publication date listeners
    if (pubMonth) pubMonth.addEventListener('change', updatePubDay);
    if (pubYear) pubYear.addEventListener('change', updatePubDay);
    if (pubDay) pubDay.addEventListener('change', updatePubDateField);
    
    // Initialize research design based on current selections
    updateResearchDesignOptions();
    
    // Load initial data
    if (gradeSelect?.value && syInput?.value) {
        updateAddAuthorButton();
        loadAuthors().then(() => {
            if (pageMode === "edit" && existingAuthorIds.length > 0) {
                existingAuthorIds.forEach(id => {
                    if (!selectedAuthors.has(id) && existingAuthorNames[id]) {
                        selectedAuthors.add(id);
                    }
                });
                renderSelectedAuthors();
            }
        });
    }
    
    // Pre-select existing keywords
    if (pageMode === "edit" && existingKeywordIds.length > 0) {
        existingKeywordIds.forEach(id => {
            if (!selectedKeywords.has(id) && existingKeywordNames[id]) {
                selectedKeywords.add(id);
            }
        });
        renderSelectedKeywords();
    }
    
    // Pre-select existing awards
    if (pageMode === "edit" && existingAwardIds.length > 0) {
        existingAwardIds.forEach(id => {
            if (!selectedAwards.has(id) && existingAwardNames[id]) {
                selectedAwards.add(id);
            }
        });
        renderSelectedAwards();
    }
});

// ==================== RESEARCH DESIGN FILTERING ====================

function updateResearchDesignOptions() {
    if (!gradeSelect || !strandSelect || !researchDesignSelect) return;
    
    const grade = gradeSelect.value;
    const strand = strandSelect.value;
    const currentValue = researchDesignSelect.value;
    
    // Disable if either grade or strand is not selected
    if (!grade || !strand) {
        researchDesignSelect.disabled = true;
        researchDesignSelect.value = "";
        const emptyOption = researchDesignSelect.querySelector('option[value=""]');
        if (emptyOption) emptyOption.textContent = "Select Grade & Strand first";
        return;
    }
    
    // Enable and filter options
    researchDesignSelect.disabled = false;
    const emptyOption = researchDesignSelect.querySelector('option[value=""]');
    if (emptyOption) emptyOption.textContent = "Select Research Design";
    
    // Filter options based on grade and strand
    const allOptions = researchDesignSelect.querySelectorAll('option:not([value=""])');
    
    allOptions.forEach(option => {
        const value = option.value;
        let shouldShow = false;
        
        if (grade === '11') {
            // Grade 11: Only QUALITATIVE
            shouldShow = value === 'QUALITATIVE';
        } else if (grade === '12') {
            if (strand === 'STEM') {
                // Grade 12 STEM: SURVEY, EXPERIMENTAL, CAPSTONE
                shouldShow = ['SURVEY', 'EXPERIMENTAL', 'CAPSTONE'].includes(value);
            } else {
                // Grade 12 HUMSS/ABM: SURVEY only
                shouldShow = value === 'SURVEY';
            }
        }
        
        if (shouldShow) {
            option.style.display = '';
            option.disabled = false;
        } else {
            option.style.display = 'none';
            option.disabled = true;
        }
    });
    
    // Reset selection if current value is not valid
    const currentOption = researchDesignSelect.querySelector(`option[value="${currentValue}"]`);
    if (!currentOption || currentOption.disabled) {
        researchDesignSelect.value = "";
    }
}

if (gradeSelect) {
    gradeSelect.addEventListener("change", function() {
        updateResearchDesignOptions();
        updateAddAuthorButton();
        loadAuthors();
    });
}

if (strandSelect) {
    strandSelect.addEventListener("change", function() {
        updateResearchDesignOptions();
    });
}

// ==================== ADD AUTHOR BUTTON STATE ====================

function updateAddAuthorButton() {
    if (!addAuthorBtn || !gradeSelect || !syInput) return;
    
    const grade = gradeSelect.value;
    const sy = syInput.value;
    
    if (!grade || !sy) {
        addAuthorBtn.disabled = true;
        addAuthorBtn.classList.add('disabled');
    } else {
        addAuthorBtn.disabled = false;
        addAuthorBtn.classList.remove('disabled');
    }
}

if (syInput) syInput.addEventListener("change", function() {
    updateAddAuthorButton();
    loadAuthors();
});

// ==================== AUTHORS ====================

async function loadAuthors() {
    if (!gradeSelect || !syInput || !authorSearchInput || !authorDropdown) return;
    
    const grade = gradeSelect.value;
    const sy = syInput.value;

    if (!grade || !sy) {
        authorSearchInput.disabled = true;
        authorSearchInput.placeholder = "Select Grade Level and School Year first";
        authorDropdown.classList.remove("show");
        availableAuthors = [];
        return;
    }

    authorSearchInput.disabled = false;
    authorSearchInput.placeholder = "Search authors by name...";

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        const response = await fetch(`/ajax/authors-by-batch/?grade=${grade}&school_year=${sy}`, {
            headers: {
                'X-CSRFToken': csrfToken
            }
        });
        availableAuthors = await response.json();
        availableAuthors.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error loading authors:", error);
        availableAuthors = [];
    }
}

function renderAuthorDropdown(searchQuery = "") {
    if (!authorDropdown) return;
    
    authorDropdown.innerHTML = "";

    const filteredAuthors = availableAuthors.filter(author => 
        !selectedAuthors.has(author.id) &&
        author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredAuthors.length === 0) {
        authorDropdown.innerHTML = '<div class="author-dropdown-empty">No authors found</div>';
    } else {
        filteredAuthors.forEach(author => {
            const item = document.createElement("div");
            item.className = "author-dropdown-item";
            item.innerHTML = `
                <input type="checkbox" id="author-${author.id}" value="${author.id}">
                <label for="author-${author.id}">${author.name}</label>
            `;
            
            const checkbox = item.querySelector("input");
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    addAuthor(author.id, author.name);
                }
            });

            item.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                }
            });

            authorDropdown.appendChild(item);
        });
    }
}

function addAuthor(id, name) {
    selectedAuthors.add(id);
    renderSelectedAuthors();
    if (authorSearchInput) renderAuthorDropdown(authorSearchInput.value);
}

function removeAuthor(id) {
    selectedAuthors.delete(id);
    renderSelectedAuthors();
    if (authorSearchInput) renderAuthorDropdown(authorSearchInput.value);
}

function renderSelectedAuthors() {
    if (!selectedAuthorsBox) return;
    
    selectedAuthorsBox.innerHTML = "";
    
    if (selectedAuthors.size === 0) {
        selectedAuthorsBox.innerHTML = '<small class="text-muted">No authors selected yet</small>';
        return;
    }
    
    selectedAuthors.forEach(id => {
        const author = availableAuthors.find(a => a.id === id);
        const authorName = author ? author.name : (existingAuthorNames && existingAuthorNames[id] ? existingAuthorNames[id] : "Unknown");
        
        const item = document.createElement("span");
        item.className = "selected-item";
        item.innerHTML = `
            <input type="hidden" name="author" value="${id}">
            ${authorName}
            <button type="button" onclick="removeAuthor(${id})">×</button>
        `;
        selectedAuthorsBox.appendChild(item);
    });
}

if (authorSearchInput && authorDropdown) {
    authorSearchInput.addEventListener("focus", () => {
        if (!authorSearchInput.disabled && availableAuthors.length > 0) {
            authorDropdown.classList.add("show");
            renderAuthorDropdown(authorSearchInput.value);
        }
    });

    authorSearchInput.addEventListener("input", () => {
        if (!authorSearchInput.disabled && availableAuthors.length > 0) {
            authorDropdown.classList.add("show");
            renderAuthorDropdown(authorSearchInput.value);
        }
    });
}
// ==================== KEYWORDS ====================

const keywordSearchInput = document.getElementById("keywordSearchInput");
const keywordDropdown = document.getElementById("keywordDropdown");
const selectedKeywordsBox = document.getElementById("selectedKeywordsBox");

function renderKeywordWithFormatting(text) {
    return text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
}

const keywordNameInput = document.getElementById("keyword_name");
if (keywordNameInput) {
    keywordNameInput.addEventListener("input", function() {
        const input = this.value;
        const preview = document.getElementById("keyword_preview");
        const previewText = document.getElementById("keyword_preview_text");
        
        if (preview && previewText) {
            if (input.trim()) {
                preview.style.display = "block";
                const formatted = renderKeywordWithFormatting(input);
                previewText.innerHTML = formatted;
            } else {
                preview.style.display = "none";
            }
        }
    });
}

function renderKeywordDropdown(searchQuery = "") {
    if (!keywordDropdown) return;
    
    keywordDropdown.innerHTML = "";

    const filteredKeywords = availableKeywords.filter(keyword => 
        !selectedKeywords.has(keyword.id) &&
        keyword.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredKeywords.length === 0) {
        keywordDropdown.innerHTML = '<div class="keyword-dropdown-empty">No keywords found</div>';
    } else {
        filteredKeywords.forEach(keyword => {
            const item = document.createElement("div");
            item.className = "keyword-dropdown-item";
            
            const formattedName = renderKeywordWithFormatting(keyword.name);
            
            item.innerHTML = `
                <input type="checkbox" id="keyword-${keyword.id}" value="${keyword.id}">
                <label for="keyword-${keyword.id}">${formattedName}</label>
            `;
            
            const checkbox = item.querySelector("input");
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    addKeyword(keyword.id, keyword.name);
                }
            });

            item.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT" && e.target.tagName !== "LABEL") {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                }
            });

            keywordDropdown.appendChild(item);
        });
    }
}

function addKeyword(id, name) {
    selectedKeywords.add(id);
    renderSelectedKeywords();
    if (keywordSearchInput) renderKeywordDropdown(keywordSearchInput.value);
}

function removeKeyword(id) {
    selectedKeywords.delete(id);
    renderSelectedKeywords();
    if (keywordSearchInput) renderKeywordDropdown(keywordSearchInput.value);
}

function renderSelectedKeywords() {
    if (!selectedKeywordsBox) return;
    
    selectedKeywordsBox.innerHTML = "";
    
    if (selectedKeywords.size === 0) {
        selectedKeywordsBox.innerHTML = '<small class="text-muted">No keywords selected yet</small>';
        return;
    }
    
    selectedKeywords.forEach(id => {
        const keyword = availableKeywords.find(k => k.id === id);
        const keywordName = keyword ? keyword.name : (existingKeywordNames && existingKeywordNames[id] ? existingKeywordNames[id] : "Unknown");
        
        const item = document.createElement("span");
        item.className = "selected-item";
        
        const formattedName = renderKeywordWithFormatting(keywordName);
        
        item.innerHTML = `
            <input type="hidden" name="keywords" value="${id}">
            <span>${formattedName}</span>
            <button type="button" onclick="removeKeyword(${id})">×</button>
        `;
        selectedKeywordsBox.appendChild(item);
    });
}

if (keywordSearchInput && keywordDropdown) {
    keywordSearchInput.addEventListener("focus", () => {
        keywordDropdown.classList.add("show");
        renderKeywordDropdown(keywordSearchInput.value);
    });

    keywordSearchInput.addEventListener("input", () => {
        keywordDropdown.classList.add("show");
        renderKeywordDropdown(keywordSearchInput.value);
    });
}

// Keyword Save Button Handler - WITH DEBUGGING
let isKeywordSubmitting = false;

const saveKeywordBtn = document.getElementById("saveKeywordBtn");
console.log("saveKeywordBtn found:", saveKeywordBtn); // DEBUG

if (saveKeywordBtn) {
    saveKeywordBtn.addEventListener("click", async function(e) {
        console.log("Save Keyword button clicked!"); // DEBUG
        e.preventDefault(); // Prevent any default behavior
        
        if (isKeywordSubmitting) {
            console.log("Already submitting, skipping..."); // DEBUG
            return;
        }
        
        const modalErrors = document.getElementById("keywordModalErrors");
        if (modalErrors) {
            modalErrors.style.display = "none";
            modalErrors.innerHTML = "";
        }
        
        const keywordName = document.getElementById("keyword_name")?.value.trim();
        console.log("Keyword name:", keywordName); // DEBUG
        
        if (!keywordName) {
            if (modalErrors) {
                modalErrors.innerHTML = "Keyword is required.";
                modalErrors.style.display = "block";
            }
            return;
        }

        const isDuplicate = availableKeywords.some(keyword => 
            keyword.name.toLowerCase().replace(/\*/g, '') === keywordName.toLowerCase().replace(/\*/g, '')
        );
        
        if (isDuplicate) {
            if (modalErrors) {
                modalErrors.innerHTML = `Keyword "${keywordName}" already exists in the database.`;
                modalErrors.style.display = "block";
            }
            return;
        }
        
        isKeywordSubmitting = true;
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        
        console.log("Sending request to /ajax/add-keyword/"); // DEBUG
        
        try {
            const formData = new FormData();
            formData.append('name', keywordName);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch("/ajax/add-keyword/", {
                method: 'POST',
                body: formData
            });
            
            console.log("Response status:", response.status); // DEBUG
            
            if (response.ok) {
                const newKeyword = await response.json();
                console.log("New keyword:", newKeyword); // DEBUG
                
                const modalElement = document.getElementById('addKeywordModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                
                const keywordNameInput = document.getElementById("keyword_name");
                if (keywordNameInput) keywordNameInput.value = "";
                
                const keywordPreview = document.getElementById("keyword_preview");
                if (keywordPreview) keywordPreview.style.display = "none";
                
                availableKeywords.push(newKeyword);
                availableKeywords.sort((a, b) => a.name.localeCompare(b.name));
                addKeyword(newKeyword.id, newKeyword.name);
                
                console.log("About to show success toast"); // DEBUG
                showSuccess(`Keyword "${newKeyword.name}" added successfully!`);
            } else {
                const errorData = await response.json();
                console.error("Error response:", errorData); // DEBUG
                if (modalErrors) {
                    modalErrors.innerHTML = errorData.error || 'An error occurred while adding the keyword.';
                    modalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Error adding keyword:", error);
            if (modalErrors) {
                modalErrors.innerHTML = 'An error occurred while adding the keyword.';
                modalErrors.style.display = 'block';
            }
        } finally {
            isKeywordSubmitting = false;
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle"></i> Add Keyword';
        }
    });
} else {
    console.error("saveKeywordBtn element not found!"); // DEBUG
}

// ==================== AWARDS ====================

function renderAwardDropdown(searchQuery = "") {
    if (!awardDropdown) return;
    
    awardDropdown.innerHTML = "";

    const filteredAwards = availableAwards.filter(award => 
        !selectedAwards.has(award.id) &&
        award.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredAwards.length === 0) {
        awardDropdown.innerHTML = '<div class="award-dropdown-empty">No awards found</div>';
    } else {
        filteredAwards.forEach(award => {
            const item = document.createElement("div");
            item.className = "award-dropdown-item";
            item.innerHTML = `
                <input type="checkbox" id="award-${award.id}" value="${award.id}">
                <label for="award-${award.id}">${award.name}</label>
            `;
            
            const checkbox = item.querySelector("input");
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    addAward(award.id, award.name);
                }
            });

            item.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                }
            });

            awardDropdown.appendChild(item);
        });
    }
}

function addAward(id, name) {
    selectedAwards.add(id);
    renderSelectedAwards();
    if (awardSearchInput) renderAwardDropdown(awardSearchInput.value);
}

function removeAward(id) {
    selectedAwards.delete(id);
    renderSelectedAwards();
    if (awardSearchInput) renderAwardDropdown(awardSearchInput.value);
}

function renderSelectedAwards() {
    if (!selectedAwardsBox) return;
    
    selectedAwardsBox.innerHTML = "";
    
    if (selectedAwards.size === 0) {
        selectedAwardsBox.innerHTML = '<small class="text-muted">No awards selected yet</small>';
        return;
    }
    
    selectedAwards.forEach(id => {
        const award = availableAwards.find(a => a.id === id);
        const awardName = award ? award.name : (existingAwardNames && existingAwardNames[id] ? existingAwardNames[id] : "Unknown");
        
        const item = document.createElement("span");
        item.className = "selected-item";
        item.innerHTML = `
            <input type="hidden" name="awards" value="${id}">
            ${awardName}
            <button type="button" onclick="removeAward(${id})">×</button>
        `;
        selectedAwardsBox.appendChild(item);
    });
}

if (awardSearchInput && awardDropdown) {
    awardSearchInput.addEventListener("focus", () => {
        awardDropdown.classList.add("show");
        renderAwardDropdown(awardSearchInput.value);
    });

    awardSearchInput.addEventListener("input", () => {
        awardDropdown.classList.add("show");
        renderAwardDropdown(awardSearchInput.value);
    });
}

const saveAwardBtn = document.getElementById("saveAwardBtn");
if (saveAwardBtn) {
    saveAwardBtn.addEventListener("click", async function() {
        const modalErrors = document.getElementById("awardModalErrors");
        if (modalErrors) {
            modalErrors.style.display = "none";
            modalErrors.innerHTML = "";
        }
        
        const awardName = document.getElementById("award_name")?.value.trim();
        
        if (!awardName) {
            if (modalErrors) {
                modalErrors.innerHTML = "Award name is required.";
                modalErrors.style.display = "block";
            }
            return;
        }

        const isDuplicate = availableAwards.some(award => 
            award.name.toLowerCase() === awardName.toLowerCase()
        );
        
        if (isDuplicate) {
            if (modalErrors) {
                modalErrors.innerHTML = `Award "${awardName}" already exists in the database.`;
                modalErrors.style.display = "block";
            }
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('name', awardName);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch("/ajax/add-award/", {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const newAward = await response.json();
                
                const modalElement = document.getElementById('addAwardModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                
                const awardNameInput = document.getElementById("award_name");
                if (awardNameInput) awardNameInput.value = "";
                
                availableAwards.push(newAward);
                availableAwards.sort((a, b) => a.name.localeCompare(b.name));
                addAward(newAward.id, newAward.name);
                
                showSuccess(`Award "${newAward.name}" added successfully!`);
            } else {
                const errorData = await response.json();
                if (modalErrors) {
                    modalErrors.innerHTML = errorData.error || 'An error occurred while adding the award.';
                    modalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Error adding award:", error);
            if (modalErrors) {
                modalErrors.innerHTML = 'An error occurred while adding the award.';
                modalErrors.style.display = 'block';
            }
        }
    });
}

// ==================== PUBLICATION DATE ====================

function initPublicationDateDropdowns() {
    if (!pubYear) return;
    
    const currentYear = new Date().getFullYear();
    for (let year = currentYear + 1; year >= 2000; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        pubYear.appendChild(option);
    }
    
    if (pageMode === "edit" && existingDataDiv) {
        const existingDateAttr = existingDataDiv.dataset.pubDate;
        if (existingDateAttr) {
            const [year, month, day] = existingDateAttr.split('-');
            if (pubYear) pubYear.value = year;
            if (pubMonth) pubMonth.value = parseInt(month);
            updatePubDay();
            if (pubDay) pubDay.value = parseInt(day);
            updatePubDateField();
        }
    }
}

function updatePubDay() {
    if (!pubMonth || !pubDay) return;
    
    const month = parseInt(pubMonth.value);
    const year = parseInt(pubYear?.value) || new Date().getFullYear();
    const currentDay = pubDay.value;
    
    if (month) {
        pubDay.disabled = false;
        pubDay.innerHTML = '<option value="">Day</option>';
        
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            pubDay.appendChild(option);
        }
        
        if (currentDay && currentDay <= daysInMonth) {
            pubDay.value = currentDay;
        }
    } else {
        pubDay.disabled = true;
        pubDay.innerHTML = '<option value="">Day</option>';
    }
    
    updatePubDateField();
}

function updatePubDateField() {
    if (!pubMonth || !pubDay || !pubYear || !pubDateField) return;
    
    const month = pubMonth.value;
    const day = pubDay.value;
    const year = pubYear.value;
    
    if (month && day && year) {
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        pubDateField.value = formattedDate;
    } else {
        pubDateField.value = '';
    }
}

// ==================== ADD AUTHOR MODAL ====================

const saveAuthorBtn = document.getElementById("saveAuthorBtn");
if (saveAuthorBtn) {
    saveAuthorBtn.addEventListener("click", async function() {
        const modalErrors = document.getElementById("authorModalErrors");
        if (modalErrors) {
            modalErrors.style.display = "none";
            modalErrors.innerHTML = "";
        }
        
        const firstName = document.getElementById("author_first_name")?.value.trim();
        const middleInitial = document.getElementById("author_middle_initial")?.value.trim();
        const lastName = document.getElementById("author_last_name")?.value.trim();
        const suffix = document.getElementById("author_suffix")?.value.trim();
        const g11Batch = document.getElementById("author_G11_Batch")?.value.trim();
        const g12Batch = document.getElementById("author_G12_Batch")?.value.trim();
        
        const errors = [];
        
        if (!firstName) errors.push("First Name is required.");
        if (!lastName) errors.push("Last Name is required.");
        
        if (!g11Batch && !g12Batch) {
            errors.push("At least one batch (Grade 11 or Grade 12) is required.");
        }
        
        const batchPattern = /^\d{4}-\d{4}$/;
        
        if (g11Batch && !batchPattern.test(g11Batch)) {
            errors.push("Grade 11 Batch must be in format YYYY-YYYY (e.g., 2023-2024).");
        }
        if (g12Batch && !batchPattern.test(g12Batch)) {
            errors.push("Grade 12 Batch must be in format YYYY-YYYY (e.g., 2024-2025).");
        }
        
        const fullName = `${firstName} ${middleInitial ? middleInitial + '. ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();
        const isDuplicate = availableAuthors.some(author => 
            author.name.toLowerCase() === fullName.toLowerCase()
        );
        
        if (isDuplicate) {
            errors.push(`Author "${fullName}" already exists in the database.`);
        }
        
        if (errors.length > 0) {
            if (modalErrors) {
                modalErrors.innerHTML = '<ul class="mb-0">' + 
                    errors.map(err => `<li>${err}</li>`).join('') + 
                    '</ul>';
                modalErrors.style.display = 'block';
            }
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('first', firstName);
            formData.append('middle', middleInitial);
            formData.append('last', lastName);
            formData.append('suffix', suffix);
            formData.append('G11', g11Batch);
            formData.append('G12', g12Batch);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (csrfToken) formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch("/ajax/add-author/", {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const newAuthor = await response.json();
                
                const modalElement = document.getElementById('addAuthorModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                
                const firstNameInput = document.getElementById("author_first_name");
                const middleInitialInput = document.getElementById("author_middle_initial");
                const lastNameInput = document.getElementById("author_last_name");
                const suffixInput = document.getElementById("author_suffix");
                const g11Input = document.getElementById("author_G11_Batch");
                const g12Input = document.getElementById("author_G12_Batch");
                
                if (firstNameInput) firstNameInput.value = "";
                if (middleInitialInput) middleInitialInput.value = "";
                if (lastNameInput) lastNameInput.value = "";
                if (suffixInput) suffixInput.value = "";
                if (g11Input) g11Input.value = "";
                if (g12Input) g12Input.value = "";
                
                await loadAuthors();
                addAuthor(newAuthor.id, newAuthor.name);
                
                showSuccess(`Author "${newAuthor.name}" added successfully!`);
            } else {
                const errorData = await response.json();
                if (modalErrors) {
                    modalErrors.innerHTML = errorData.error || 'An error occurred while adding the author.';
                    modalErrors.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Error adding author:", error);
            if (modalErrors) {
                modalErrors.innerHTML = 'An error occurred while adding the author.';
                modalErrors.style.display = 'block';
            }
        }
    });
}

// ==================== PDF HANDLING ====================

const pdfInput = document.getElementById('id_pdf_file');
const modalPdfInput = document.getElementById('modalPdfInput');

if (modalPdfInput) {
    modalPdfInput.addEventListener('change', function() {
        const selectedFilePreview = document.getElementById('selectedFilePreview');
        const selectedFileNameDisplay = document.getElementById('selectedFileNameDisplay');
        
        if (this.files.length > 0) {
            if (selectedFilePreview) selectedFilePreview.style.display = 'block';
            if (selectedFileNameDisplay) selectedFileNameDisplay.textContent = this.files[0].name;
        } else {
            if (selectedFilePreview) selectedFilePreview.style.display = 'none';
        }
    });
}

const savePdfBtn = document.getElementById('savePdfBtn');
if (savePdfBtn) {
    savePdfBtn.addEventListener('click', function() {
        const pdfModalErrors = document.getElementById('pdfModalErrors');
        if (pdfModalErrors) {
            pdfModalErrors.style.display = 'none';
        }
        
        if (!modalPdfInput || !modalPdfInput.files.length) {
            if (pdfModalErrors) {
                pdfModalErrors.innerHTML = 'Please select a PDF file.';
                pdfModalErrors.style.display = 'block';
            }
            return;
        }
        
        if (pdfInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(modalPdfInput.files[0]);
            pdfInput.files = dataTransfer.files;
        }
        
        const currentFileName = document.getElementById('currentFileName');
        if (currentFileName && modalPdfInput.files.length) {
            currentFileName.textContent = modalPdfInput.files[0].name;
            currentFileName.style.color = '#2d5a3d';
        }
        
        const modalElement = document.getElementById('changePdfModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        if (modalPdfInput) {
            modalPdfInput.value = '';
        }
        const selectedFilePreview = document.getElementById('selectedFilePreview');
        if (selectedFilePreview) selectedFilePreview.style.display = 'none';
        
        showSuccess('PDF file updated successfully!');
    });
}

// ==================== VALIDATION ====================

function validateAndShake() {
    let isValid = true;
    const errors = [];
    
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid', 'shake');
    });
    document.querySelectorAll('.validation-error').forEach(el => {
        el.style.display = 'none';
    });
    
    const titleField = document.getElementById('titleField');
    if (titleField && !titleField.value.trim()) {
        titleField.classList.add('is-invalid', 'shake');
        const titleError = document.getElementById('titleError');
        if (titleError) titleError.style.display = 'block';
        errors.push("Title is required.");
        isValid = false;
    }
    
    if (!pubMonth?.value || !pubDay?.value || !pubYear?.value) {
        if (pubMonth && !pubMonth.value) pubMonth.classList.add('is-invalid', 'shake');
        if (pubDay && !pubDay.value) pubDay.classList.add('is-invalid', 'shake');
        if (pubYear && !pubYear.value) pubYear.classList.add('is-invalid', 'shake');
        const pubDateError = document.getElementById('pubDateError');
        if (pubDateError) pubDateError.style.display = 'block';
        errors.push("Publication Date is required.");
        isValid = false;
    }
    
    const abstractField = document.getElementById('abstractField');
    if (abstractField && !abstractField.value.trim()) {
        abstractField.classList.add('is-invalid', 'shake');
        const abstractError = document.getElementById('abstractError');
        if (abstractError) abstractError.style.display = 'block';
        errors.push("Abstract is required.");
        isValid = false;
    }
    
    if (gradeSelect && !gradeSelect.value) {
        gradeSelect.classList.add('is-invalid', 'shake');
        const gradeError = document.getElementById('gradeError');
        if (gradeError) gradeError.style.display = 'block';
        errors.push("Grade Level is required.");
        isValid = false;
    }
    
    if (syInput && !syInput.value) {
        syInput.classList.add('is-invalid', 'shake');
        const syError = document.getElementById('syError');
        if (syError) syError.style.display = 'block';
        errors.push("School Year is required.");
        isValid = false;
    }
    
    if (strandSelect && !strandSelect.value) {
        strandSelect.classList.add('is-invalid', 'shake');
        const strandError = document.getElementById('strandError');
        if (strandError) strandError.style.display = 'block';
        errors.push("Strand is required.");
        isValid = false;
    }
    
    if (researchDesignSelect && !researchDesignSelect.value) {
        researchDesignSelect.classList.add('is-invalid', 'shake');
        const researchDesignError = document.getElementById('researchDesignError');
        if (researchDesignError) researchDesignError.style.display = 'block';
        errors.push("Research Design is required.");
        isValid = false;
    }
    
    if (selectedAuthors.size === 0) {
        if (authorSearchInput) authorSearchInput.classList.add('is-invalid', 'shake');
        const authorError = document.getElementById('authorError');
        if (authorError) authorError.style.display = 'block';
        errors.push("At least one author is required.");
        isValid = false;
    }
    
    if (pageMode !== "edit" && pdfInput && !pdfInput.files.length) {
        pdfInput.classList.add('is-invalid', 'shake');
        const pdfError = document.getElementById('pdfError');
        if (pdfError) pdfError.style.display = 'block';
        errors.push("PDF file is required.");
        isValid = false;
    }
    
    setTimeout(() => {
        document.querySelectorAll('.shake').forEach(el => {
            el.classList.remove('shake');
        });
    }, 500);
    
    if (!isValid) {
        document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return isValid;
}

// ==================== PREVIEW & SAVE ====================

const previewBtn = document.getElementById("previewBtn");
if (previewBtn) {
    previewBtn.addEventListener("click", function() {
        if (!validateAndShake()) {
            showError('Please fill in all required fields.');
            return;
        }
        
        const titleField = document.getElementById('titleField');
        const titleValue = titleField?.value || "";
        const pubDate = pubDateField?.value || "Not selected";
        const abstractField = document.getElementById('abstractField');
        const abstract = abstractField?.value || "";
        const grade = gradeSelect?.value || "";
        const strand = strandSelect?.selectedOptions[0]?.text || "";
        const researchDesign = researchDesignSelect?.selectedOptions[0]?.text || "N/A";
        const sy = syInput?.value || "";
        
        let authors = "None selected";
        if (selectedAuthors.size > 0) {
            const authorNames = [];
            selectedAuthors.forEach(id => {
                const author = availableAuthors.find(a => a.id === id);
                const authorName = author ? author.name : (existingAuthorNames && existingAuthorNames[id] ? existingAuthorNames[id] : "Unknown");
                authorNames.push(authorName);
            });
            authors = authorNames.join(', ');
        }

        let keywords = "None selected";
        if (selectedKeywords.size > 0) {
            const keywordNames = [];
            selectedKeywords.forEach(id => {
                const keyword = availableKeywords.find(k => k.id === id);
                const keywordName = keyword ? keyword.name : "Unknown";
                keywordNames.push(keywordName);
            });
            keywords = keywordNames.join(', ');
        }

        let awards = "None selected";
        if (selectedAwards.size > 0) {
            const awardNames = [];
            selectedAwards.forEach(id => {
                const award = availableAwards.find(a => a.id === id);
                const awardName = award ? award.name : (existingAwardNames && existingAwardNames[id] ? existingAwardNames[id] : "Unknown");
                awardNames.push(awardName);
            });
            awards = awardNames.join(', ');
        }
        
        let pdf = "No file selected";
        if (pdfInput && pdfInput.files.length > 0) {
            pdf = pdfInput.files[0].name;
        } else if (pageMode === "edit" && existingDataDiv) {
            const pdfName = existingDataDiv.dataset.pdfName;
            pdf = pdfName ? `Current file: ${pdfName}` : "No file";
        }

        const previewContent = document.getElementById("previewContent");
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="row g-3">
                    <div class="col-12">
                        <p><strong>Title:</strong></p>
                        <p style="font-size: 1.1rem; margin-left: 20px;">${titleValue}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>Publication Date:</strong> ${pubDate}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>Abstract:</strong></p>
                        <p style="white-space: pre-wrap;">${abstract}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Grade Level:</strong> ${grade}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>School Year:</strong> ${sy}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Strand:</strong> ${strand}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Research Design:</strong> ${researchDesign}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>Authors:</strong> ${authors}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>Keywords:</strong> ${keywords}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>Awards:</strong> ${awards}</p>
                    </div>
                    <div class="col-12">
                        <p><strong>PDF File:</strong> ${pdf}</p>
                    </div>
                </div>
            `;
        }
        
        const previewModal = document.getElementById("previewModal");
        if (previewModal) {
            new bootstrap.Modal(previewModal).show();
        }
    });
}

const confirmSaveBtn = document.getElementById("confirmSaveBtn");
if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener("click", function() {
        const paperForm = document.getElementById("paperForm");
        if (paperForm) {
            paperForm.submit();
        }
    });
}

// ==================== CLOSE DROPDOWNS ====================

document.addEventListener("click", (e) => {
    if (authorDropdown && !e.target.closest(".author-dropdown-container")) {
        authorDropdown.classList.remove("show");
    }
    if (awardDropdown && !e.target.closest(".award-dropdown-container")) {
        awardDropdown.classList.remove("show");
    }
    if (keywordDropdown && !e.target.closest(".keyword-dropdown-container")) {
        keywordDropdown.classList.remove("show");
    }
});