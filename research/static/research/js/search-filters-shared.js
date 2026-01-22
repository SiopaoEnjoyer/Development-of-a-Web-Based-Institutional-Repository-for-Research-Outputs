/* static/research/js/search-filters-shared.js */
/* Shared filtering logic for both search.html and admin_dashboard.html */

// Global variables
let filterElements = {};
let selectedAuthors = new Set();
let selectedKeywords = new Set();
let availableAuthors = [];
let availableKeywords = [];
let authorSearchInput, authorDropdown, keywordSearchInput, keywordDropdown;

// Configuration object - to be set by each page
let filterConfig = {
    resetUrl: '',
    updateCallback: null, // Function to update page-specific content
    authorsApiUrl: '',
    keywordsApiUrl: ''
};

// Initialize filter elements
function initializeFilters(config) {
    filterConfig = { ...filterConfig, ...config };
    
    filterElements = {
        schoolYear: document.getElementById("school_year"),
        strand: document.getElementById("strand"),
        researchDesign: document.getElementById("research_design"),
        gradeLevel: document.getElementById("grade_level"),
        award: document.getElementById("award"),
        searchQuery: document.getElementById("searchQuery"),
        sortBy: document.getElementById("sort_by")
    };
    
    authorSearchInput = document.getElementById("authorSearchInput");
    authorDropdown = document.getElementById("authorDropdown");
    keywordSearchInput = document.getElementById("keywordSearchInput");
    keywordDropdown = document.getElementById("keywordDropdown");
    
    setupEventListeners();
    initializeDropdowns();
    loadKeywords();
    renderAppliedFilters();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update results via AJAX
async function updateResults() {
    const params = new URLSearchParams();

    if (filterElements.searchQuery?.value) params.set("q", filterElements.searchQuery.value);
    if (filterElements.schoolYear?.value) params.set("school_year", filterElements.schoolYear.value);
    if (filterElements.strand?.value) params.set("strand", filterElements.strand.value);
    if (filterElements.researchDesign?.value) params.set("research_design", filterElements.researchDesign.value);
    if (filterElements.gradeLevel?.value) params.set("grade_level", filterElements.gradeLevel.value);
    if (filterElements.award?.value) params.set("award", filterElements.award.value);
    if (filterElements.sortBy?.value) params.set("sort_by", filterElements.sortBy.value);

    selectedAuthors.forEach(id => params.append("authors", id));
    selectedKeywords.forEach(id => params.append("keywords", id));

    const res = await fetch(`?${params.toString()}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const html = await res.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Call page-specific update callback
    if (filterConfig.updateCallback) {
        filterConfig.updateCallback(temp);
    }

    history.replaceState(null, "", `?${params.toString()}`);
    renderAppliedFilters();
}

// Research Design Filtering (for search.html)
function updateResearchDesignOptions() {
    if (!filterElements.gradeLevel || !filterElements.researchDesign) return;
    
    const gradeLevel = filterElements.gradeLevel.value;
    const strand = filterElements.strand.value;
    const researchDesign = filterElements.researchDesign;
    const currentValue = researchDesign.value;
    
    const allOptions = {
        'QUALITATIVE': 'Qualitative',
        'SURVEY': 'Survey',
        'EXPERIMENTAL': 'Experimental',
        'CAPSTONE': 'Capstone'
    };
    
    let allowedOptions = [];
    
    if (gradeLevel === '11') {
        allowedOptions = ['QUALITATIVE'];
    } else if (gradeLevel === '12') {
        if (strand === 'STEM') {
            allowedOptions = ['SURVEY', 'EXPERIMENTAL', 'CAPSTONE'];
        } else if (strand === 'HUMSS' || strand === 'ABM') {
            allowedOptions = ['SURVEY'];
        } else {
            allowedOptions = ['SURVEY', 'EXPERIMENTAL', 'CAPSTONE'];
        }
    } else {
        allowedOptions = Object.keys(allOptions);
    }
    
    researchDesign.innerHTML = '<option value="">All</option>';
    
    allowedOptions.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = allOptions[key];
        if (key === currentValue) {
            option.selected = true;
        }
        researchDesign.appendChild(option);
    });
    
    if (currentValue && !allowedOptions.includes(currentValue)) {
        researchDesign.value = '';
    }
}

// Setup event listeners
function setupEventListeners() {
    if (filterElements.gradeLevel) {
        filterElements.gradeLevel.addEventListener("change", () => {
            if (filterElements.researchDesign) {
                updateResearchDesignOptions();
            }
            updateResults();
            loadAuthors();
        });
    }
    
    if (filterElements.strand) {
        filterElements.strand.addEventListener("change", () => {
            if (filterElements.researchDesign) {
                updateResearchDesignOptions();
            }
            updateResults();
        });
    }
    
    if (filterElements.schoolYear) {
        filterElements.schoolYear.addEventListener("change", () => {
            updateResults();
            loadAuthors();
        });
    }
    
    if (filterElements.researchDesign) {
        filterElements.researchDesign.addEventListener("change", () => updateResults());
    }
    
    if (filterElements.award) {
        filterElements.award.addEventListener("change", () => updateResults());
    }
    
    if (filterElements.sortBy) {
        filterElements.sortBy.addEventListener("change", () => updateResults());
    }
    
    if (filterElements.searchQuery) {
        filterElements.searchQuery.addEventListener("input", debounce(() => {
            updateResults();
        }, 500));
    }
    
    // Reset button
    const resetBtn = document.getElementById("resetAllBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            document.getElementById("filtersForm").reset();
            selectedAuthors.clear();
            selectedKeywords.clear();
            window.location = filterConfig.resetUrl;
        });
    }
}

/* FILTER TOKENS */
function renderAppliedFilters() {
    const activeFiltersSection = document.getElementById("activeFiltersSection");
    const tokens = document.getElementById("active-filters");
    tokens.innerHTML = "";

    const url = new URLSearchParams(window.location.search);

    const filterLabels = {
        "q": "Search",
        "strand": "Strand",
        "research_design": "Research Design",
        "school_year": "School Year",
        "grade_level": "Grade",
        "award": "Award"
    };

    let hasFilters = false;

    for (const [key, label] of Object.entries(filterLabels)) {
        if (url.has(key) && url.get(key)) {
            hasFilters = true;
            let displayValue = url.get(key);
            
            if (key === "award" && filterElements.award) {
                const selectedOption = filterElements.award.querySelector(`option[value="${displayValue}"]`);
                if (selectedOption) {
                    displayValue = selectedOption.textContent.trim();
                }
            }

            const token = document.createElement("span");
            token.className = "filter-token";
            token.innerHTML = `
                ${label}: ${displayValue}
                <button onclick="removeFilter('${key}')">×</button>
            `;
            tokens.appendChild(token);
        }
    }

    renderAuthorFilterTokens();
    renderKeywordFilterTokens();
    
    if (hasFilters || selectedAuthors.size > 0 || selectedKeywords.size > 0) {
        activeFiltersSection.style.display = 'block';
    } else {
        activeFiltersSection.style.display = 'none';
    }
}

function removeFilter(key) {
    const url = new URLSearchParams(window.location.search);
    url.delete(key);

    const element = document.querySelector(`[name="${key}"]`);
    if (element) {
        element.value = "";
    }

    fetch(`?${url.toString()}`, { headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.text())
        .then(html => {
            const temp = document.createElement("div");
            temp.innerHTML = html;
            if (filterConfig.updateCallback) {
                filterConfig.updateCallback(temp);
            }
            history.replaceState(null, "", `?${url.toString()}`);
            renderAppliedFilters();
        });
}

/* AUTHOR MULTI-SELECT */
async function loadAuthors() {
    const grade = filterElements.gradeLevel?.value;
    const schoolYear = filterElements.schoolYear?.value;

    if (!grade || !schoolYear || !authorSearchInput) {
        if (authorSearchInput) {
            authorSearchInput.disabled = true;
            authorSearchInput.placeholder = "Select Grade Level and School Year first";
        }
        if (authorDropdown) {
            authorDropdown.classList.remove("show");
        }
        availableAuthors = [];
        return;
    }

    authorSearchInput.disabled = false;
    authorSearchInput.placeholder = "Search authors by name...";

    try {
        const response = await fetch(`${filterConfig.authorsApiUrl}?grade=${grade}&school_year=${schoolYear}`);
        availableAuthors = await response.json();
        availableAuthors.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error loading authors:", error);
        availableAuthors = [];
    }
}

function renderAuthorDropdown(searchQuery = "") {
    authorDropdown.innerHTML = "";

    const filteredAuthors = availableAuthors.filter(author => 
        !selectedAuthors.has(author.id) &&
        author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredAuthors.length === 0) {
        authorDropdown.innerHTML = '<div class="dropdown-empty">No authors found</div>';
    } else {
        filteredAuthors.forEach(author => {
            const item = document.createElement("div");
            item.className = "dropdown-item-custom";
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
    renderAuthorDropdown(authorSearchInput.value);
    updateResults();
}

function removeAuthor(id) {
    selectedAuthors.delete(id);
    renderAuthorDropdown(authorSearchInput.value);
    updateResults();
}

function renderAuthorFilterTokens() {
    const tokens = document.getElementById("active-filters");
    
    selectedAuthors.forEach(id => {
        const author = availableAuthors.find(a => a.id === id);
        if (author) {
            const token = document.createElement("span");
            token.className = "filter-token";
            token.innerHTML = `
                Author: ${author.name}
                <button onclick="removeAuthor(${id})">×</button>
            `;
            tokens.appendChild(token);
        }
    });
}

/* KEYWORD MULTI-SELECT */
async function loadKeywords() {
    try {
        const response = await fetch(filterConfig.keywordsApiUrl);
        availableKeywords = await response.json();
        availableKeywords.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error loading keywords:", error);
        availableKeywords = [];
    }
}

function renderKeywordDropdown(searchQuery = "") {
    keywordDropdown.innerHTML = "";

    const filteredKeywords = availableKeywords.filter(keyword => 
        !selectedKeywords.has(keyword.id) &&
        keyword.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredKeywords.length === 0) {
        keywordDropdown.innerHTML = '<div class="dropdown-empty">No keywords found</div>';
    } else {
        filteredKeywords.forEach(keyword => {
            const item = document.createElement("div");
            item.className = "dropdown-item-custom";
            
            const formattedName = keyword.name.replace(/\*([^*]+)\*/g, '<i>$1</i>');
            
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
                if (e.target.tagName !== "INPUT") {
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
    renderKeywordDropdown(keywordSearchInput.value);
    updateResults();
}

function removeKeyword(id) {
    selectedKeywords.delete(id);
    renderKeywordDropdown(keywordSearchInput.value);
    updateResults();
}

function renderKeywordFilterTokens() {
    const tokens = document.getElementById("active-filters");
    
    selectedKeywords.forEach(id => {
        const keyword = availableKeywords.find(k => k.id === id);
        if (keyword) {
            const token = document.createElement("span");
            token.className = "filter-token";
            
            const cleanName = keyword.name.replace(/\*/g, '');
            
            token.innerHTML = `
                Keyword: ${cleanName}
                <button onclick="removeKeyword(${id})">×</button>
            `;
            tokens.appendChild(token);
        }
    });
}

/* DROPDOWN POSITIONING */
function initializeDropdowns() {
    if (!authorDropdown || !keywordDropdown) return;
    
    // Move dropdowns to body
    document.body.appendChild(authorDropdown);
    document.body.appendChild(keywordDropdown);
    
    function positionDropdown(input, dropdown) {
        const rect = input.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.width = `${rect.width}px`;
    }
    
    // Author dropdown
    if (authorSearchInput) {
        authorSearchInput.addEventListener("focus", () => {
            if (!authorSearchInput.disabled && availableAuthors.length > 0) {
                positionDropdown(authorSearchInput, authorDropdown);
                authorDropdown.classList.add("show");
                renderAuthorDropdown(authorSearchInput.value);
            }
        });

        authorSearchInput.addEventListener("input", () => {
            if (!authorSearchInput.disabled && availableAuthors.length > 0) {
                positionDropdown(authorSearchInput, authorDropdown);
                authorDropdown.classList.add("show");
                renderAuthorDropdown(authorSearchInput.value);
            }
        });
    }
    
    // Keyword dropdown
    if (keywordSearchInput) {
        keywordSearchInput.addEventListener("focus", () => {
            if (availableKeywords.length > 0) {
                positionDropdown(keywordSearchInput, keywordDropdown);
                keywordDropdown.classList.add("show");
                renderKeywordDropdown(keywordSearchInput.value);
            }
        });

        keywordSearchInput.addEventListener("input", () => {
            if (availableKeywords.length > 0) {
                positionDropdown(keywordSearchInput, keywordDropdown);
                keywordDropdown.classList.add("show");
                renderKeywordDropdown(keywordSearchInput.value);
            }
        });
    }
    
    // Close dropdowns
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown-container") && 
            !e.target.closest("#authorDropdown") && 
            !e.target.closest("#keywordDropdown")) {
            authorDropdown.classList.remove("show");
            keywordDropdown.classList.remove("show");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            authorDropdown.classList.remove("show");
            keywordDropdown.classList.remove("show");
        }
    });

    // Reposition on scroll/resize
    window.addEventListener('scroll', () => {
        if (authorDropdown.classList.contains('show')) {
            positionDropdown(authorSearchInput, authorDropdown);
        }
        if (keywordDropdown.classList.contains('show')) {
            positionDropdown(keywordSearchInput, keywordDropdown);
        }
    });

    window.addEventListener('resize', () => {
        if (authorDropdown.classList.contains('show')) {
            positionDropdown(authorSearchInput, authorDropdown);
        }
        if (keywordDropdown.classList.contains('show')) {
            positionDropdown(keywordSearchInput, keywordDropdown);
        }
    });
    
    // Initial load
    if (filterElements.gradeLevel?.value && filterElements.schoolYear?.value) {
        loadAuthors();
    }
}