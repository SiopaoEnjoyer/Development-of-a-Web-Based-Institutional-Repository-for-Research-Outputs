// Home Page
if (window.__homeState) {
    try { window.__homeState.cleanup(); } catch (e) {}
    window.__homeState = null;
}

(function () {
    const state = {
        intervals: [],
        timeouts: [],
        handlers: [],
        isActive: true,
        statsAnimated: false
    };

    // ========== FIND THE REAL SCROLL CONTAINER ==========
    // Django templates often wrap content in a div with overflow scroll/auto.
    // IO and window.scrollY both fail in that case — we find the real container.
    function getScrollParent(el) {
        let node = el.parentElement;
        while (node && node !== document.body) {
            const style = getComputedStyle(node);
            const overflow = style.overflow + style.overflowY;
            if (/scroll|auto/.test(overflow)) return node;
            node = node.parentElement;
        }
        return window;
    }

    // ========== VIEWPORT CHECK (works for any scroll container) ==========
    function isVisible(el) {
        const rect = el.getBoundingClientRect();
        // Element is visible if any part of it is within the viewport
        return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    // ========== REVEAL ALL TRACKED SECTIONS ==========
    // Called on scroll, tab focus, and by fallback timers.
    function revealVisible(sections, statsSection) {
        if (!state.isActive) return;

        sections.forEach(s => {
            if (!s.classList.contains('visible') && isVisible(s)) {
                s.classList.add('visible');
            }
        });

        if (statsSection && !state.statsAnimated && isVisible(statsSection)) {
            runStatsAnimation(statsSection);
        }
    }

    // ========== STATS ANIMATION ==========
    function runStatsAnimation(section) {
        if (state.statsAnimated || !state.isActive) return;
        state.statsAnimated = true;
        section.classList.add('visible');

        section.querySelectorAll('.stat-value').forEach(stat => {
            const targetVal = parseInt(stat.getAttribute('data-target'));
            if (isNaN(targetVal)) return;

            let current = 0;
            const increment = targetVal / 60;

            const timer = setInterval(() => {
                if (!state.isActive) { clearInterval(timer); return; }
                current += increment;
                if (current >= targetVal) {
                    stat.textContent = targetVal + '+';
                    clearInterval(timer);
                    const idx = state.intervals.indexOf(timer);
                    if (idx > -1) state.intervals.splice(idx, 1);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 33);

            state.intervals.push(timer);
        });
    }

    function init() {
        const sectionsToReveal = Array.from(document.querySelectorAll(
            '.stats-section, .vision-section, .features-section, .strands-section'
        ));
        const statsSection = document.getElementById('stats');

        // ========== IMMEDIATE REVEAL (no scroll needed) ==========
        // Run after one rAF so layout is settled, then reveal anything already on screen.
        requestAnimationFrame(() => {
            revealVisible(sectionsToReveal, statsSection);
        });

        // ========== SCROLL LISTENER (scroll-container-agnostic) ==========
        const scrollParent = getScrollParent(document.querySelector('.stats-section') || document.body);

        const scrollHandler = () => {
            revealVisible(sectionsToReveal, statsSection);

            // Hero parallax — only meaningful if window is the scroll container
            const hero = document.querySelector('.hero-section');
            if (hero) {
                const scrollY = scrollParent === window
                    ? window.scrollY
                    : scrollParent.scrollTop;
                hero.style.opacity = Math.max(0, 1 - scrollY / 600);
            }
        };

        scrollParent.addEventListener('scroll', scrollHandler, { passive: true });
        state.handlers.push({ target: scrollParent, type: 'scroll', handler: scrollHandler });

        // Also listen on window in case scrollParent detection was wrong
        if (scrollParent !== window) {
            window.addEventListener('scroll', scrollHandler, { passive: true });
            state.handlers.push({ target: window, type: 'scroll', handler: scrollHandler });
        }

        // ========== UNCONDITIONAL FALLBACK TIMERS ==========
        // These run regardless of scrolling or isActive — nothing should stay hidden.

        // 1.5s: reveal everything currently in the viewport, no excuses
        const t1 = setTimeout(() => {
            sectionsToReveal.forEach(s => {
                if (!s.classList.contains('visible') && isVisible(s)) s.classList.add('visible');
            });
            if (statsSection && !state.statsAnimated && isVisible(statsSection)) {
                runStatsAnimation(statsSection);
            }
        }, 1500);
        state.timeouts.push(t1);

        // 5s: reveal ALL sections unconditionally — no isActive check, no viewport check.
        // If something is still invisible after 5 seconds, just show it.
        const t2 = setTimeout(() => {
            sectionsToReveal.forEach(s => s.classList.add('visible'));
            if (statsSection && !state.statsAnimated) runStatsAnimation(statsSection);
        }, 5000);
        state.timeouts.push(t2);

        // ========== MOUSE GLOW ==========
        const glow = document.getElementById('heroGlow');
        if (glow) {
            const mouseHandler = (e) => {
                if (!state.isActive) return;
                glow.style.background = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, rgba(1,87,38,0.3), transparent 40%)`;
            };
            document.addEventListener('mousemove', mouseHandler);
            state.handlers.push({ target: document, type: 'mousemove', handler: mouseHandler });
        }

        // ========== FEATURE CARD ROTATION ==========
        const featureCards = document.querySelectorAll('.feature-card');
        let currentFeature = 1;
        let userInteracting = false;
        let interactionTimeout;

        featureCards.forEach((card, i) => {
            const mouseEnterHandler = () => {
                if (!state.isActive) return;
                userInteracting = true;
                clearTimeout(interactionTimeout);
                featureCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentFeature = i;
            };
            const mouseLeaveHandler = () => {
                clearTimeout(interactionTimeout);
                interactionTimeout = setTimeout(() => { userInteracting = false; }, 5000);
            };
            card.addEventListener('mouseenter', mouseEnterHandler);
            card.addEventListener('mouseleave', mouseLeaveHandler);
            state.handlers.push(
                { target: card, type: 'mouseenter', handler: mouseEnterHandler },
                { target: card, type: 'mouseleave', handler: mouseLeaveHandler }
            );
        });

        if (featureCards.length > 0) {
            const rotationInterval = setInterval(() => {
                if (!state.isActive || userInteracting || document.hidden) return;
                currentFeature = (currentFeature + 1) % featureCards.length;
                featureCards.forEach(c => c.classList.remove('active'));
                featureCards[currentFeature]?.classList.add('active');
            }, 8000);
            state.intervals.push(rotationInterval);
        }

        // ========== PAGE VISIBILITY (tab switching) ==========
        const visibilityHandler = () => {
            if (document.hidden || !state.isActive) return;
            userInteracting = false;
            clearTimeout(interactionTimeout);
            revealVisible(sectionsToReveal, statsSection);
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        state.handlers.push({ target: document, type: 'visibilitychange', handler: visibilityHandler });
    }

    // ========== CLEANUP ==========
    function cleanup() {
        state.isActive = false;
        state.intervals.forEach(clearInterval);
        state.timeouts.forEach(clearTimeout);
        state.handlers.forEach(({ target, type, handler }) => {
            if (target?.removeEventListener) target.removeEventListener(type, handler);
        });
        state.intervals.length = 0;
        state.timeouts.length = 0;
        state.handlers.length = 0;
        const hero = document.querySelector('.hero-section');
        if (hero) hero.style.opacity = '';
        state.statsAnimated = false;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    state.cleanup = cleanup;
    window.__homeState = state;
    if (window.registerCleanup) window.registerCleanup('home', cleanup);
})();