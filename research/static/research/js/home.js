// Home Page - Fixed Implementation
if (window.__homeState) {
    try {
        window.__homeState.cleanup();
    } catch (e) {
        // Silent cleanup
    }
    window.__homeState = null;
}

(function () {
    const state = {
        intervals: [],
        observers: [],
        handlers: [],
        isActive: true,
        statsAnimated: false
    };

    function init() {
        // ========== MOUSE GLOW EFFECT ==========
        const glow = document.getElementById('heroGlow');
        if (glow) {
            let lastMoveTime = 0;
            const THROTTLE_MS = 16;
            
            const mouseHandler = (e) => {
                if (!state.isActive) return;
                
                const now = performance.now();
                if (now - lastMoveTime < THROTTLE_MS) return;
                lastMoveTime = now;
                
                glow.style.background = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, rgba(1,87,38,0.3), transparent 40%)`;
            };
            
            document.addEventListener('mousemove', mouseHandler, { passive: true });
            state.handlers.push({ target: document, type: 'mousemove', handler: mouseHandler });
        }

        // ========== STATS ANIMATION ==========
        const statsSection = document.getElementById('stats');
        if (statsSection) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting || state.statsAnimated || !state.isActive) return;
                    
                    state.statsAnimated = true;
                    entry.target.classList.add('visible');

                    const statValues = entry.target.querySelectorAll('.stat-value');
                    statValues.forEach(stat => {
                        const target = parseInt(stat.getAttribute('data-target'));
                        if (isNaN(target)) return;

                        let current = 0;
                        const increment = target / 60;
                        let frames = 0;
                        const maxFrames = 60;
                        
                        const timer = setInterval(() => {
                            if (!state.isActive) {
                                clearInterval(timer);
                                return;
                            }
                            
                            current += increment;
                            frames++;
                            
                            if (frames >= maxFrames || current >= target) {
                                stat.textContent = target + '+';
                                clearInterval(timer);
                                const idx = state.intervals.indexOf(timer);
                                if (idx > -1) state.intervals.splice(idx, 1);
                            } else {
                                stat.textContent = Math.floor(current);
                            }
                        }, 33);

                        state.intervals.push(timer);
                    });
                    
                    statsObserver.disconnect();
                });
            }, { threshold: 0.1 });

            statsObserver.observe(statsSection);
            state.observers.push(statsObserver);
        }

        // ========== SECTION VISIBILITY ==========
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && state.isActive) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        state.observers.push(sectionObserver);

        const sectionsToObserve = document.querySelectorAll('.vision-section, .features-section, .strands-section');
        sectionsToObserve.forEach(s => sectionObserver.observe(s));

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
                interactionTimeout = setTimeout(() => {
                    userInteracting = false;
                }, 2000);
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
                if (!state.isActive || userInteracting) return;
                
                currentFeature = (currentFeature + 1) % featureCards.length;
                featureCards.forEach(c => c.classList.remove('active'));
                featureCards[currentFeature]?.classList.add('active');
            }, 5000);
            
            state.intervals.push(rotationInterval);
        }

        // ========== HERO PARALLAX ==========
        const hero = document.querySelector('.hero-section');
        if (hero) {
            let lastScrollTime = 0;
            const SCROLL_THROTTLE = 16;
            let ticking = false;
            
            const scrollHandler = () => {
                if (!state.isActive) return;
                
                const now = performance.now();
                if (now - lastScrollTime < SCROLL_THROTTLE) return;
                
                if (!ticking) {
                    requestAnimationFrame(() => {
                        hero.style.opacity = Math.max(0, 1 - window.scrollY / 600);
                        lastScrollTime = performance.now();
                        ticking = false;
                    });
                    ticking = true;
                }
            };
            
            window.addEventListener('scroll', scrollHandler, { passive: true });
            state.handlers.push({ target: window, type: 'scroll', handler: scrollHandler });
        }

        // Store cleanup reference for interactionTimeout
        state.interactionTimeout = interactionTimeout;
    }

    // ========== CLEANUP FUNCTION ==========
    function cleanup() {
        state.isActive = false;

        state.intervals.forEach(id => {
            clearInterval(id);
        });
        state.intervals.length = 0;

        if (state.interactionTimeout) {
            clearTimeout(state.interactionTimeout);
            state.interactionTimeout = null;
        }

        state.observers.forEach(obs => {
            if (obs && typeof obs.disconnect === 'function') {
                obs.disconnect();
            }
        });
        state.observers.length = 0;

        state.handlers.forEach(({ target, type, handler }) => {
            if (target && typeof target.removeEventListener === 'function') {
                target.removeEventListener(type, handler);
            }
        });
        state.handlers.length = 0;

        const hero = document.querySelector('.hero-section');
        if (hero) {
            hero.style.opacity = '';
        }
        
        state.statsAnimated = false;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, run immediately
        setTimeout(init, 0);
    }

    state.cleanup = cleanup;
    window.__homeState = state;
    
    if (window.registerCleanup) {
        window.registerCleanup('home', cleanup);
    }
})();