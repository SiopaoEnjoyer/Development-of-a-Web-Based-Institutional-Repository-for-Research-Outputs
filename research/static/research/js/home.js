// IMMEDIATE cleanup check
if (window.__homeState) {
    console.log('⚠️ HOME: Force cleaning previous instance');
    try {
        window.__homeState.cleanup();
    } catch (e) {
        console.error('Failed emergency home cleanup:', e);
    }
    window.__homeState = null;
}

(function () {
    console.log('🏠 HOME: Initializing...');

    // Single state object
    const state = {
        intervals: [],
        observers: [],
        handlers: [],
        isActive: true
    };

    // Mouse glow effect (throttled)
    const glow = document.getElementById('heroGlow');
    if (glow) {
        let lastMoveTime = 0;
        const THROTTLE_MS = 16; // ~60fps
        
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

    // Stats animation - ONE TIME ONLY
    const statsSection = document.getElementById('stats');
    if (statsSection) {
        let statsAnimated = false;
        
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting || statsAnimated || !state.isActive) return;
                
                statsAnimated = true;
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
                            // Remove from intervals array
                            const idx = state.intervals.indexOf(timer);
                            if (idx > -1) state.intervals.splice(idx, 1);
                        } else {
                            stat.textContent = Math.floor(current);
                        }
                    }, 33);

                    state.intervals.push(timer);
                });
                
                // Disconnect after first animation
                statsObserver.disconnect();
            });
        }, { threshold: 0.1 });

        statsObserver.observe(statsSection);
        state.observers.push(statsObserver);
    }

    // Other section visibility
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    state.observers.push(sectionObserver);

    const sectionsToObserve = document.querySelectorAll('.vision-section, .features-section, .strands-section');
    sectionsToObserve.forEach(s => sectionObserver.observe(s));

    // Feature card rotation (optimized)
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
            // Give user 2 seconds before auto-rotation resumes
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

    // Feature rotation interval
    if (featureCards.length > 0) {
        const rotationInterval = setInterval(() => {
            if (!state.isActive || userInteracting) return;
            
            currentFeature = (currentFeature + 1) % featureCards.length;
            featureCards.forEach(c => c.classList.remove('active'));
            featureCards[currentFeature]?.classList.add('active');
        }, 5000);
        
        state.intervals.push(rotationInterval);
    }

    // Hero parallax (throttled)
    const hero = document.querySelector('.hero-section');
    if (hero) {
        let lastScrollTime = 0;
        const SCROLL_THROTTLE = 16; // ~60fps
        let ticking = false;
        
        const scrollHandler = () => {
            if (!state.isActive) return;
            
            const now = performance.now();
            if (now - lastScrollTime < SCROLL_THROTTLE) return;
            
            if (!ticking) {
                window.requestAnimationFrame(() => {
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

    // AGGRESSIVE cleanup
    function cleanup() {
        console.log('🧹 HOME: Starting cleanup...');
        
        // Mark as inactive FIRST to stop all callbacks
        state.isActive = false;

        // Clear all intervals (they're tracked globally now)
        console.log(`  → Clearing ${state.intervals.length} intervals`);
        state.intervals.forEach(id => {
            window.clearInterval(id);
        });
        state.intervals.length = 0;

        // Clear timeouts
        if (interactionTimeout) {
            clearTimeout(interactionTimeout);
            interactionTimeout = null;
        }

        // Disconnect all observers IMMEDIATELY
        console.log(`  → Disconnecting ${state.observers.length} observers`);
        state.observers.forEach(obs => {
            if (obs && typeof obs.disconnect === 'function') {
                obs.disconnect();
            }
        });
        state.observers.length = 0;

        // Remove all event listeners
        console.log(`  → Removing ${state.handlers.length} event listeners`);
        state.handlers.forEach(({ target, type, handler }) => {
            if (target && typeof target.removeEventListener === 'function') {
                target.removeEventListener(type, handler);
            }
        });
        state.handlers.length = 0;

        console.log('✅ HOME: Cleanup complete');
    }

    // Store state
    state.cleanup = cleanup;
    window.__homeState = state;
    
    // Register with global system
    if (window.registerCleanup) {
        window.registerCleanup('home', cleanup);
        console.log('📝 HOME: Registered with cleanup system');
    }
    
    console.log('✅ HOME: Initialization complete');
})();