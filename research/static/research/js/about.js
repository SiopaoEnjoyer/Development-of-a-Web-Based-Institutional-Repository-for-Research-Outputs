// About Page
if (window.aboutPageCleanup) {
    window.aboutPageCleanup();
}

(function() {
    const state = {
        intervals: [],
        timeouts: [],
        handlers: [],
        currentFrameId: null,
        canvases: [],
        statsAnimated: false,
        isActive: true,
        animationRunning: false
    };

    let particles = [];

    // ========== FIND THE REAL SCROLL CONTAINER ==========
    function getScrollParent(el) {
        let node = el?.parentElement;
        while (node && node !== document.body) {
            const style = getComputedStyle(node);
            if (/scroll|auto/.test(style.overflow + style.overflowY)) return node;
            node = node.parentElement;
        }
        return window;
    }

    // ========== VIEWPORT CHECK ==========
    function isVisible(el) {
        const rect = el.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    // ========== STATS ANIMATION ==========
    function runStatsAnimation() {
        if (state.statsAnimated || !state.isActive) return;
        state.statsAnimated = true;

        document.querySelectorAll('.stat-value').forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            if (isNaN(target)) return;

            let current = 0;
            const increment = target / 60;

            const tick = () => {
                if (!state.isActive) return;
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current);
                    requestAnimationFrame(tick);
                } else {
                    stat.textContent = target;
                }
            };
            requestAnimationFrame(tick);
        });
    }

    // ========== REVEAL VISIBLE SECTIONS ==========
    function revealVisible(sections, statsSection) {
        if (!state.isActive) return;
        sections.forEach(s => {
            if (!s.classList.contains('visible') && isVisible(s)) s.classList.add('visible');
        });
        if (statsSection && !state.statsAnimated && isVisible(statsSection)) {
            runStatsAnimation();
        }
    }

    function init() {
        // ========== PARTICLE ANIMATION ==========
        const canvas = document.getElementById('particleCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');

            const resize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            resize();

            class Particle {
                constructor() { this.reset(); }
                reset() {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                    this.vx = (Math.random() - 0.5) * 0.5;
                    this.vy = (Math.random() - 0.5) * 0.5;
                    this.size = Math.random() * 2 + 1;
                }
                update() {
                    this.x += this.vx; this.y += this.vy;
                    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
                }
                draw() {
                    ctx.fillStyle = 'rgba(1, 87, 38, 0.5)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            for (let i = 0; i < 80; i++) particles.push(new Particle());
            state.canvases.push({ canvas, ctx, particles });

            const animate = () => {
                if (!state.isActive || document.hidden) {
                    state.animationRunning = false;
                    state.currentFrameId = null;
                    return;
                }
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach(p => { p.update(); p.draw(); });
                state.currentFrameId = requestAnimationFrame(animate);
            };

            const startAnimation = () => {
                if (state.animationRunning || !state.isActive) return;
                state.animationRunning = true;
                animate();
            };

            startAnimation();

            window.addEventListener('resize', resize);
            state.handlers.push({ target: window, type: 'resize', handler: resize });

            // Re-start particles on tab focus
            const visHandler = () => { if (!document.hidden) startAnimation(); };
            document.addEventListener('visibilitychange', visHandler);
            state.handlers.push({ target: document, type: 'visibilitychange', handler: visHandler });
        }

        // ========== SECTION & STATS VISIBILITY ==========
        const sections = Array.from(document.querySelectorAll('.content-section'));
        const statsSection = document.getElementById('stats');

        // ========== SCROLL LISTENER ==========
        const scrollParent = getScrollParent(sections[0] || document.body);

        const scrollHandler = () => revealVisible(sections, statsSection);

        scrollParent.addEventListener('scroll', scrollHandler, { passive: true });
        state.handlers.push({ target: scrollParent, type: 'scroll', handler: scrollHandler });

        if (scrollParent !== window) {
            window.addEventListener('scroll', scrollHandler, { passive: true });
            state.handlers.push({ target: window, type: 'scroll', handler: scrollHandler });
        }

        // Immediate check after layout settles
        requestAnimationFrame(() => revealVisible(sections, statsSection));

        // ========== UNCONDITIONAL FALLBACK TIMERS ==========
        // 1.5s: reveal anything currently in viewport
        const t1 = setTimeout(() => {
            sections.forEach(s => {
                if (!s.classList.contains('visible') && isVisible(s)) s.classList.add('visible');
            });
            if (statsSection && !state.statsAnimated && isVisible(statsSection)) runStatsAnimation();
        }, 1500);
        state.timeouts.push(t1);

        // 5s: reveal EVERYTHING — no conditions at all
        const t2 = setTimeout(() => {
            sections.forEach(s => s.classList.add('visible'));
            if (statsSection && !state.statsAnimated) runStatsAnimation();
        }, 5000);
        state.timeouts.push(t2);

        // ========== HERO GLOW ==========
        const heroGlow = document.getElementById('heroGlow');
        const hero = document.querySelector('.about-hero');

        if (heroGlow && hero) {
            const mouseMoveHandler = (e) => {
                if (!state.isActive) return;
                const rect = hero.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                heroGlow.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 50%)`;
            };
            hero.addEventListener('mousemove', mouseMoveHandler);
            state.handlers.push({ target: hero, type: 'mousemove', handler: mouseMoveHandler });
        }

        // ========== SCROLL FADE (hero) ==========
        if (hero) {
            const heroScroll = () => {
                if (!state.isActive) return;
                const scrollY = scrollParent === window ? window.scrollY : scrollParent.scrollTop;
                hero.style.opacity = Math.max(0, 1 - (scrollY / hero.offsetHeight) * 1.5);
            };
            scrollParent.addEventListener('scroll', heroScroll, { passive: true });
            state.handlers.push({ target: scrollParent, type: 'scroll', handler: heroScroll });
        }

        // ========== PAGE VISIBILITY ==========
        const pageVisHandler = () => {
            if (document.hidden || !state.isActive) return;
            revealVisible(sections, statsSection);
        };
        document.addEventListener('visibilitychange', pageVisHandler);
        state.handlers.push({ target: document, type: 'visibilitychange', handler: pageVisHandler });
    }

    // ========== CLEANUP ==========
    function cleanup() {
        state.isActive = false;

        if (state.currentFrameId) {
            cancelAnimationFrame(state.currentFrameId);
            state.currentFrameId = null;
        }

        state.intervals.forEach(clearInterval);
        state.timeouts.forEach(clearTimeout);
        state.handlers.forEach(({ target, type, handler }) => {
            if (target?.removeEventListener) target.removeEventListener(type, handler);
        });

        state.canvases.forEach(({ canvas, ctx, particles }) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 1;
            canvas.height = 1;
            particles.length = 0;
        });

        const hero = document.querySelector('.about-hero');
        if (hero) hero.style.opacity = '';

        state.intervals.length = 0;
        state.timeouts.length = 0;
        state.handlers.length = 0;
        state.canvases.length = 0;
        state.statsAnimated = false;
        state.animationRunning = false;
        particles.length = 0;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.aboutPageCleanup = cleanup;
    if (typeof window.registerCleanup === 'function') window.registerCleanup('about', cleanup);
})();