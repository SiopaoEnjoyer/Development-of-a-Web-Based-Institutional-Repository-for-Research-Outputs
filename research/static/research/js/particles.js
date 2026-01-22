// IMMEDIATE cleanup check on script load
if (window.__particlesState) {
    console.log('⚠️ PARTICLES: Force stopping previous instance');
    try {
        window.__particlesState.cleanup();
    } catch (e) {
        console.error('Failed emergency particle cleanup:', e);
    }
    window.__particlesState = null;
}

(function() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.log('⚠️ PARTICLES: Canvas not found');
        return;
    }
    
    console.log('✨ PARTICLES: Starting fresh instance');
    
    const ctx = canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
    });
    
    if (!ctx) {
        console.error('❌ PARTICLES: Could not get 2D context');
        return;
    }
    
    // State management
    let animationFrameId = null;
    let isRunning = true;
    let particles = [];
    let lastFrameTime = performance.now();
    const MAX_FRAME_TIME = 100; // Skip frames if too slow
    
    // Set canvas size
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();

    const particleCount = 75;

    // Optimized Particle class
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > window.innerWidth || this.x < 0 || 
                this.y > window.innerHeight || this.y < 0) {
                this.reset();
            }
        }
        
        draw() {
            ctx.fillStyle = `rgba(1, 150, 70, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        destroy() {
            // Nullify all properties to help GC
            this.x = null;
            this.y = null;
            this.size = null;
            this.speedX = null;
            this.speedY = null;
            this.opacity = null;
        }
    }

    // Initialize particles once
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    console.log(`✅ PARTICLES: Created ${particleCount} particles`);

    // Optimized animation loop with frame skipping
    function animate(currentTime) {
        // CRITICAL: Check if we should still be running
        if (!isRunning) {
            console.log('🛑 PARTICLES: Animation stopped');
            return;
        }
        
        // Frame rate limiting
        const deltaTime = currentTime - lastFrameTime;
        if (deltaTime > MAX_FRAME_TIME) {
            lastFrameTime = currentTime;
            animationFrameId = requestAnimationFrame(animate);
            return; // Skip this frame
        }
        lastFrameTime = currentTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // Update and draw particles (optimized loop)
        const len = particles.length;
        for (let i = 0; i < len; i++) {
            particles[i].update();
            particles[i].draw();
        }

        // Draw connections (optimized)
        for (let i = 0; i < len - 1; i++) {
            const p1 = particles[i];
            for (let j = i + 1; j < len; j++) {
                const p2 = particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distSq = dx * dx + dy * dy;
                
                // Use squared distance to avoid sqrt
                if (distSq < 22500) { // 150 * 150
                    const distance = Math.sqrt(distSq);
                    const opacity = 0.3 * (1 - distance / 150);
                    ctx.strokeStyle = `rgba(1, 150, 70, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    // Debounced resize handler
    let resizeTimeout;
    const resizeHandler = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isRunning) {
                resizeCanvas();
            }
        }, 150);
    };
    window.addEventListener('resize', resizeHandler, { passive: true });

    // Start animation
    animationFrameId = requestAnimationFrame(animate);
    console.log('▶️ PARTICLES: Animation started');

    // AGGRESSIVE cleanup function
    function cleanup() {
        console.log('🧹 PARTICLES: Starting cleanup...');
        
        // STOP EVERYTHING IMMEDIATELY
        isRunning = false;
        
        // Cancel animation frame (it's being tracked globally now)
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            console.log('  ✓ Canceled RAF ID:', animationFrameId);
            animationFrameId = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', resizeHandler);
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
            resizeTimeout = null;
        }
        console.log('  ✓ Removed event listeners');
        
        // Destroy all particles IMMEDIATELY
        if (particles && particles.length > 0) {
            const count = particles.length;
            for (let i = 0; i < count; i++) {
                if (particles[i] && typeof particles[i].destroy === 'function') {
                    particles[i].destroy();
                }
                particles[i] = null; // Explicit null
            }
            particles.length = 0;
            particles = null;
            console.log(`  ✓ Destroyed ${count} particles`);
        }
        
        // Clear and minimize canvas to free GPU memory
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            canvas.width = 1;
            canvas.height = 1;
            canvas.style.width = '1px';
            canvas.style.height = '1px';
            console.log('  ✓ Canvas cleared and minimized');
        }
        
        console.log('✅ PARTICLES: Cleanup complete');
    }

    // Store state globally with read-only checks
    const state = {
        cleanup,
        isRunning: () => isRunning,
        particleCount: () => particles ? particles.length : 0
    };
    
    window.__particlesState = state;
    
    // Register with global cleanup system
    if (window.registerCleanup) {
        window.registerCleanup('particles', cleanup);
        console.log('📝 PARTICLES: Registered with cleanup system');
    }
})();