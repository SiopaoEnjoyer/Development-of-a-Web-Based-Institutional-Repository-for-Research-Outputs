// IMMEDIATE cleanup check on script load
if (window.__particlesState) {
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
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        console.error('❌ PARTICLES: Could not get 2D context');
        return;
    }
    
    // State management
    let animationFrameId = null;
    let isRunning = true;
    let particles = [];
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();

    const particleCount = 50;

    // Simple Particle class
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
            this.x = null;
            this.y = null;
            this.size = null;
            this.speedX = null;
            this.speedY = null;
            this.opacity = null;
        }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Simple animation loop
    function animate() {
        if (!isRunning) {
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }

        // Draw connections
        for (let i = 0; i < particles.length - 1; i++) {
            const p1 = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
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

    // Resize handler
    window.addEventListener('resize', function() {
        if (isRunning) {
            resizeCanvas();
        }
    });

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup function
    function cleanup() {
        isRunning = false;
        
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        window.removeEventListener('resize', resizeCanvas);
        
        if (particles && particles.length > 0) {
            for (let i = 0; i < particles.length; i++) {
                if (particles[i] && typeof particles[i].destroy === 'function') {
                    particles[i].destroy();
                }
                particles[i] = null;
            }
            particles.length = 0;
            particles = null;
        }
        
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 1;
            canvas.height = 1;
        }
    }

    // Store state globally
    const state = {
        cleanup,
        isRunning: () => isRunning,
        particleCount: () => particles ? particles.length : 0
    };
    
    window.__particlesState = state;
    
    if (window.registerCleanup) {
        window.registerCleanup('particles', cleanup);
    }
})();