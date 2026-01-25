// About Page - Complete Implementation with Cleanup
if (window.aboutPageCleanup) {
    window.aboutPageCleanup();
}

(function() {
    console.log('ℹ️ ABOUT: Starting...');
    
    const state = {
        intervals: [],
        observers: [],
        handlers: [],
        animationFrames: [],
        canvases: [],
        statsAnimated: false
    };

    // ========== PARTICLE ANIMATION ==========
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.error('❌ ABOUT: particleCanvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    let particles = [];
    let isRunning = true;
    let frameId = null;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
        if (!isRunning) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { 
            p.update(); 
            p.draw(); 
        });
        
        frameId = requestAnimationFrame(animate);
    }
    
    animate();
    console.log('✅ ABOUT: Particle animation started');

    const resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeHandler);
    state.handlers.push({ target: window, type: 'resize', handler: resizeHandler });

    // ========== SECTION ANIMATIONS (INTERSECTION OBSERVER) ==========
    const sections = document.querySelectorAll('.content-section');
    
    if (sections.length > 0) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
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
        console.log(`✅ ABOUT: Observing ${sections.length} sections`);
    }

    // ========== STATS COUNTER ANIMATION ==========
    const statsSection = document.getElementById('stats');
    
    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !state.statsAnimated) {
                    state.statsAnimated = true;
                    animateStats();
                }
            });
        }, {
            threshold: 0.5
        });

        statsObserver.observe(statsSection);
        state.observers.push(statsObserver);
        console.log('✅ ABOUT: Stats observer initialized');
    }

    function animateStats() {
        const statValues = document.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current);
                    const intervalId = requestAnimationFrame(updateCounter);
                    state.animationFrames.push(intervalId);
                } else {
                    stat.textContent = target;
                }
            };

            updateCounter();
        });
        
        console.log('✅ ABOUT: Stats animation started');
    }

    // ========== HERO GLOW EFFECT ==========
    const heroGlow = document.getElementById('heroGlow');
    const hero = document.querySelector('.about-hero');
    
    if (heroGlow && hero) {
        const mouseMoveHandler = (e) => {
            const rect = hero.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            heroGlow.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.15) 0%, transparent 50%)`;
        };
        
        hero.addEventListener('mousemove', mouseMoveHandler);
        state.handlers.push({ target: hero, type: 'mousemove', handler: mouseMoveHandler });
        console.log('✅ ABOUT: Hero glow effect initialized');
    }

    // ========== SCROLL FADE EFFECT ==========
    const scrollHandler = () => {
        if (!hero) return;
        
        const scrolled = window.scrollY;
        const heroHeight = hero.offsetHeight;
        const opacity = Math.max(0, 1 - (scrolled / heroHeight) * 1.5);
        
        hero.style.opacity = opacity;
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    state.handlers.push({ target: window, type: 'scroll', handler: scrollHandler });
    console.log('✅ ABOUT: Scroll fade effect initialized');

    // ========== CLEANUP FUNCTION ==========
    function cleanup() {
        console.log('🧹 ABOUT: Cleanup starting...');
        isRunning = false;
        
        if (frameId) {
            cancelAnimationFrame(frameId);
        }
        
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
        
        // Reset hero opacity
        if (hero) {
            hero.style.opacity = '';
        }
        
        state.animationFrames.length = 0;
        state.intervals.length = 0;
        state.observers.length = 0;
        state.handlers.length = 0;
        state.canvases.length = 0;
        particles.length = 0;
        frameId = null;
        state.statsAnimated = false;
        
        console.log('✅ ABOUT: Cleaned');
    }

    window.aboutPageCleanup = cleanup;
    
    if (typeof window.registerCleanup === 'function') {
        window.registerCleanup('about', cleanup);
    }
    
    console.log('✅ ABOUT: Complete initialization finished');
})();