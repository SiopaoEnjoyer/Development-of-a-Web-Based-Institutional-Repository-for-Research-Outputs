// About Page - Fixed Implementation
if (window.aboutPageCleanup) {
    window.aboutPageCleanup();
}

(function() {
    const state = {
        intervals: [],
        observers: [],
        handlers: [],
        animationFrames: [],
        canvases: [],
        statsAnimated: false,
        isActive: true
    };

    // Wait for DOM to be fully ready
    function init() {
        // ========== PARTICLE ANIMATION ==========
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let particles = [];
        let frameId = null;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
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

        for (let i = 0; i < 80; i++) {
            particles.push(new Particle());
        }
        state.canvases.push({ canvas, ctx, particles });

        function animate() {
            if (!state.isActive) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { 
                p.update(); 
                p.draw(); 
            });
            
            frameId = requestAnimationFrame(animate);
            state.animationFrames.push(frameId);
        }
        
        animate();

        const resizeHandler = () => {
            resizeCanvas();
        };
        window.addEventListener('resize', resizeHandler);
        state.handlers.push({ target: window, type: 'resize', handler: resizeHandler });

        // ========== SECTION ANIMATIONS ==========
        const sections = document.querySelectorAll('.content-section');
        
        if (sections.length > 0) {
            const sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && state.isActive) {
                        entry.target.classList.add('visible');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            sections.forEach(section => {
                sectionObserver.observe(section);
            });
            
            state.observers.push(sectionObserver);
        }

        // ========== STATS COUNTER ANIMATION ==========
        const statsSection = document.getElementById('stats');
        
        if (statsSection) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !state.statsAnimated && state.isActive) {
                        state.statsAnimated = true;
                        animateStats();
                    }
                });
            }, {
                threshold: 0.5
            });

            statsObserver.observe(statsSection);
            state.observers.push(statsObserver);
        }

        function animateStats() {
            const statValues = document.querySelectorAll('.stat-value');
            
            statValues.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                if (isNaN(target)) return;
                
                const duration = 2000;
                const increment = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    if (!state.isActive) return;
                    
                    current += increment;
                    if (current < target) {
                        stat.textContent = Math.floor(current);
                        const frameId = requestAnimationFrame(updateCounter);
                        state.animationFrames.push(frameId);
                    } else {
                        stat.textContent = target;
                    }
                };

                updateCounter();
            });
        }

        // ========== HERO GLOW EFFECT ==========
        const heroGlow = document.getElementById('heroGlow');
        const hero = document.querySelector('.about-hero');
        
        if (heroGlow && hero) {
            let lastMoveTime = 0;
            const THROTTLE_MS = 16;
            
            const mouseMoveHandler = (e) => {
                if (!state.isActive) return;
                
                const now = performance.now();
                if (now - lastMoveTime < THROTTLE_MS) return;
                lastMoveTime = now;
                
                const rect = hero.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                heroGlow.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 50%)`;
            };
            
            hero.addEventListener('mousemove', mouseMoveHandler, { passive: true });
            state.handlers.push({ target: hero, type: 'mousemove', handler: mouseMoveHandler });
        }

        // ========== SCROLL FADE EFFECT ==========
        let lastScrollTime = 0;
        const SCROLL_THROTTLE = 16;
        let ticking = false;
        
        const scrollHandler = () => {
            if (!state.isActive || !hero) return;
            
            const now = performance.now();
            if (now - lastScrollTime < SCROLL_THROTTLE) return;
            
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    const heroHeight = hero.offsetHeight;
                    const opacity = Math.max(0, 1 - (scrolled / heroHeight) * 1.5);
                    
                    hero.style.opacity = opacity;
                    lastScrollTime = performance.now();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', scrollHandler, { passive: true });
        state.handlers.push({ target: window, type: 'scroll', handler: scrollHandler });
    }

    // ========== CLEANUP FUNCTION ==========
    function cleanup() {
        state.isActive = false;
        
        state.animationFrames.forEach(id => cancelAnimationFrame(id));
        state.intervals.forEach(clearInterval);
        state.observers.forEach(o => o.disconnect());
        state.handlers.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        
        state.canvases.forEach(({ canvas, ctx, particles }) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 1;
            canvas.height = 1;
            particles.length = 0;
        });
        
        const hero = document.querySelector('.about-hero');
        if (hero) {
            hero.style.opacity = '';
        }
        
        state.animationFrames.length = 0;
        state.intervals.length = 0;
        state.observers.length = 0;
        state.handlers.length = 0;
        state.canvases.length = 0;
        state.statsAnimated = false;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, run immediately
        setTimeout(init, 0);
    }

    window.aboutPageCleanup = cleanup;
    
    if (typeof window.registerCleanup === 'function') {
        window.registerCleanup('about', cleanup);
    }
})();