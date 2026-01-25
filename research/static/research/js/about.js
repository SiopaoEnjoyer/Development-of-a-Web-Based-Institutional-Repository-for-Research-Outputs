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
        canvases: []
    };

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
        state.animationFrames.push(frameId);
    }
    
    // Start the animation
    animate();
    console.log('✅ ABOUT: Animation started');

    const resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeHandler);
    state.handlers.push({ target: window, type: 'resize', handler: resizeHandler });

    function cleanup() {
        console.log('🧹 ABOUT: Cleanup starting...');
        isRunning = false;
        
        // Cancel the last animation frame
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
        
        state.animationFrames.length = 0;
        state.intervals.length = 0;
        state.observers.length = 0;
        state.handlers.length = 0;
        state.canvases.length = 0;
        particles.length = 0;
        frameId = null;
        
        console.log('✅ ABOUT: Cleaned');
    }

    window.aboutPageCleanup = cleanup;
    
    // Register cleanup if the function exists
    if (typeof window.registerCleanup === 'function') {
        window.registerCleanup('about', cleanup);
    }
    
    console.log('✅ ABOUT: Initialization complete');
})();