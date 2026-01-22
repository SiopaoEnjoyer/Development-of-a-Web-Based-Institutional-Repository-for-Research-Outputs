// Particle Background Effect
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
const particleCount = 80;

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

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Draw connections
    particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                ctx.strokeStyle = `rgba(1, 87, 38, ${0.2 * (1 - distance / 150)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });

    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
});

// Mouse tracking for hero glow
document.addEventListener('mousemove', (e) => {
    const glow = document.getElementById('heroGlow');
    if (glow) {
        glow.style.background = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, rgba(1,87,38,0.3), transparent 40%)`;
    }
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Animate stat counters when stats section becomes visible
            if (entry.target.id === 'stats') {
                const statValues = entry.target.querySelectorAll('.stat-value');
                statValues.forEach(stat => {
                    const target = parseInt(stat.getAttribute('data-target'));
                    if (!isNaN(target)) {
                        const duration = 2000;
                        const steps = 60;
                        const increment = target / steps;
                        let current = 0;
                        
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= target) {
                                stat.textContent = target + '+';
                                clearInterval(timer);
                            } else {
                                stat.textContent = Math.floor(current);
                            }
                        }, duration / steps);
                    }
                });
            }
        }
    });
}, observerOptions);

// Observe all content sections
document.querySelectorAll('.content-section').forEach(section => {
    observer.observe(section);
});

// Smooth fade out hero on scroll
window.addEventListener('scroll', () => {
    const heroSection = document.querySelector('.about-hero');
    if (heroSection) {
        const scrollY = window.scrollY;
        const opacity = Math.max(0, 1 - scrollY / 600);
        heroSection.style.opacity = opacity;
    }
});

// Add hover effects to feature list items
const featureItems = document.querySelectorAll('.feature-list li');
featureItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(12px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0) scale(1)';
    });
});

// Tech badge interaction
const techBadges = document.querySelectorAll('.tech-badge');
techBadges.forEach((badge, index) => {
    badge.style.animationDelay = `${index * 0.1}s`;
    
    badge.addEventListener('click', function() {
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = '';
        }, 10);
    });
});