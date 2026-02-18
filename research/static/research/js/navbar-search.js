/**
 * navbar-search.js  (patched)
 * Handles:
 *  1. Ajax live search in the navbar
 *  2. Mobile nested submenu toggling
 *
 * BACKEND NOTE — add `keywords` to your JSON response:
 *
 *   results = [
 *       {
 *         'id': p.id,
 *         'title': p.title,
 *         'strand': p.strand,
 *         'design': p.get_research_design_display(),
 *         'authors': [a.display_name_public for a in p.get_authors_alphabetically()],
 *         'keywords': p.keywords[:5] if p.keywords else [],
 *         # ↑ list of strings, e.g. ['climate', 'STEM', 'survey']
 *       }
 *       for p in queryset[:8]
 *   ]
 *
 * If `keywords` is absent the card still renders fine — the
 * keyword row is simply omitted.
 */

(function () {
    'use strict';

    // ── DOM references ─────────────────────────────────────────────
    const wrapper      = document.querySelector('.navbar-search-wrapper');
    const input        = document.getElementById('navbarSearchInput');
    const clearBtn     = document.getElementById('navbarSearchClear');
    const resultsBox   = document.getElementById('navbarSearchResults');

    if (!wrapper || !input || !resultsBox) return;

    const searchUrl    = wrapper.dataset.searchUrl    || '/research/search/';
    const searchApiUrl = wrapper.dataset.searchApiUrl || searchUrl;

    // ── State ──────────────────────────────────────────────────────
    let debounceTimer  = null;
    let activeRequest  = null;
    let lastQuery      = '';

    // ── Helpers ────────────────────────────────────────────────────
    function buildDetailUrl(id) {
        return `/research/${id}/`;
    }

    /** Mirror of Django's format_italics filter: *text* -> <i>text</i> */
    function formatItalics(str) {
        return String(str).replace(/\*([^*]+)\*/g, '<i>$1</i>');
    }

    function highlightMatch(text, query) {
        const safe    = escHtml(text);
        const italics = formatItalics(safe);
        if (!query) return italics;
        const escaped = query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        const regex   = new RegExp(`(${escaped})`, 'gi');
        return italics.replace(regex, '<mark>$1</mark>');
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showResults() { resultsBox.classList.add('visible'); }
    function hideResults() { resultsBox.classList.remove('visible'); }

    function showLoading() {
        resultsBox.innerHTML = `
            <div class="search-results-loading">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading…</span>
                </div>
            </div>`;
        showResults();
    }

    // ── Keyword chips builder ──────────────────────────────────────
    /**
     * Renders a row of keyword chips.
     * Highlights the chip that matches the current query (if any).
     *
     * @param {string[]} keywords  — array of keyword strings
     * @param {string}   query     — current search query (for highlight)
     * @returns {string} HTML string, or '' if no keywords
     */
    function buildKeywordsHtml(keywords, query) {
        if (!keywords || keywords.length === 0) return '';

        const chips = keywords.slice(0, 6).map(kw => {
            // Bold the chip border if the keyword contains the query
            const isMatch = query && kw.toLowerCase().includes(query.toLowerCase());
            const extraStyle = isMatch
                ? ' style="background:#fffde7;border-color:#f5c518;color:#7a6000 !important;"'
                : '';
            return `<span class="search-result-keyword"${extraStyle}>${formatItalics(escHtml(kw))}</span>`;
        }).join('');

        return `<div class="search-result-keywords">${chips}</div>`;
    }

    // ── Render results ─────────────────────────────────────────────
    function renderResults(data, query) {
        const { results, total } = data;

        if (!results || results.length === 0) {
            resultsBox.innerHTML = `
                <div class="search-results-empty">
                    <i class="bi bi-search"></i>
                    No papers found for <strong>${escHtml(query)}</strong>
                </div>`;
            showResults();
            return;
        }

        let html = `<div class="search-results-header">Papers</div>`;

        results.forEach(paper => {
            const title   = highlightMatch(paper.title, query);
            const strand  = paper.strand ? `<span class="search-result-badge">${escHtml(paper.strand)}</span>` : '';
            const design  = paper.design ? `<span class="search-result-badge">${escHtml(paper.design)}</span>` : '';
            const authors = paper.authors && paper.authors.length
                ? `<span>${escHtml(paper.authors.slice(0, 3).join(', '))}</span>`
                : '';

            // Keywords — backend should supply paper.keywords as string[]
            // Falls back gracefully to nothing if absent
            const keywordsHtml = buildKeywordsHtml(paper.keywords || [], query);

            html += `
                <a class="search-result-item" href="${buildDetailUrl(paper.id)}">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-meta">
                        ${strand}${design}${authors}
                    </div>
                    ${keywordsHtml}
                </a>`;
        });

        const seeAllHref = `${searchUrl}?q=${encodeURIComponent(query)}`;
        const extra = total > results.length ? ` (${total} total)` : '';
        html += `<a class="search-result-see-all" href="${seeAllHref}">
                     <i class="bi bi-arrow-right-circle me-1"></i>
                     See all results${extra}
                 </a>`;

        resultsBox.innerHTML = html;
        showResults();
    }

    function renderError() {
        resultsBox.innerHTML = `
            <div class="search-results-empty">
                <i class="bi bi-wifi-off"></i>
                Could not load results. Press Enter to search.
            </div>`;
        showResults();
    }

    function renderFallback(query) {
        const seeAllHref = `${searchUrl}?q=${encodeURIComponent(query)}`;
        resultsBox.innerHTML = `
            <div class="search-results-empty" style="padding:16px 16px 8px;">
                <i class="bi bi-info-circle"></i>
                Quick search not yet active.
            </div>
            <a class="search-result-see-all" href="${seeAllHref}">
                <i class="bi bi-arrow-right-circle me-1"></i>
                Search for "${escHtml(query)}"
            </a>`;
        showResults();
    }

    // ── Ajax fetch ─────────────────────────────────────────────────
    async function fetchResults(query) {
        if (activeRequest) activeRequest.abort();

        const controller = new AbortController();
        activeRequest = controller;

        try {
            const url = `${searchApiUrl}?q=${encodeURIComponent(query)}&format=json`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (!response.ok) throw new Error('Network response not OK');

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                renderFallback(query);
                return;
            }

            const data = await response.json();
            renderResults(data, query);
        } catch (err) {
            if (err.name === 'AbortError') return;
            renderError();
        } finally {
            if (activeRequest === controller) activeRequest = null;
        }
    }

    // ── Event: input ───────────────────────────────────────────────
    input.addEventListener('input', () => {
        const query = input.value.trim();

        if (query.length > 0) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
            hideResults();
            lastQuery = '';
            return;
        }

        if (query === lastQuery) return;
        lastQuery = query;

        if (query.length < 2) { hideResults(); return; }

        showLoading();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchResults(query), 280);
    });

    // ── Event: keyboard ────────────────────────────────────────────
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim();
            if (query) window.location.href = `${searchUrl}?q=${encodeURIComponent(query)}`;
        }
        if (e.key === 'Escape') { hideResults(); input.blur(); }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = [...resultsBox.querySelectorAll('.search-result-item, .search-result-see-all')];
            if (!items.length) return;
            const focused = resultsBox.querySelector('.search-result-item:focus, .search-result-see-all:focus');
            const idx = items.indexOf(focused);
            if (e.key === 'ArrowDown') {
                (idx < items.length - 1 ? items[idx + 1] : items[0]).focus();
            } else {
                (idx > 0 ? items[idx - 1] : items[items.length - 1]).focus();
            }
        }
    });

    // ── Event: clear ───────────────────────────────────────────────
    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        hideResults();
        lastQuery = '';
        input.focus();
    });

    // ── Event: click outside ───────────────────────────────────────
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) hideResults();
    });

    // ── Event: focus restores results ──────────────────────────────
    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2 && resultsBox.innerHTML.trim()) showResults();
    });

    // ── Strand submenu toggle (mobile) ─────────────────────────────
    function initSubmenus() {
        document.querySelectorAll('.strand-toggle').forEach((toggle) => {
            const item = toggle.closest('.dropdown-submenu');
            if (!item) return;

            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (window.innerWidth >= 992) return; // CSS :hover handles desktop

                const isOpen = item.classList.contains('open');
                item.closest('ul')
                    .querySelectorAll('.dropdown-submenu.open')
                    .forEach(s => s.classList.remove('open'));
                if (!isOpen) item.classList.add('open');
            });
        });

        document.querySelectorAll('.research-nav-dropdown').forEach(dd => {
            dd.addEventListener('hidden.bs.dropdown', () => {
                dd.querySelectorAll('.dropdown-submenu.open')
                  .forEach(s => s.classList.remove('open'));
            });
        });
    }

    initSubmenus();

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            document.querySelectorAll('.dropdown-submenu.open')
                .forEach(el => el.classList.remove('open'));
        }
    });

    // ── Cleanup ────────────────────────────────────────────────────
    if (typeof window.registerCleanup === 'function') {
        window.registerCleanup('navbar-search', () => {
            clearTimeout(debounceTimer);
            if (activeRequest) activeRequest.abort();
        });
    }

})();