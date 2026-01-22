// Mouse tracking for hero glow
document.addEventListener('mousemove', (e) => {
    const glow = document.getElementById('heroGlow');
    if (glow) {
        glow.style.background = `radial-gradient(circle at ${e.clientX}px ${e.clientY}px, rgba(1,87,38,0.3), transparent 40%)`;
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Animate stat counters
            if (entry.target.id === 'stats') {
                const statValues = entry.target.querySelectorAll('.stat-value');
                statValues.forEach(stat => {
                    const target = parseInt(stat.getAttribute('data-target'));
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
                });
            }
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('.stats-section, .vision-section, .features-section, .strands-section').forEach(section => {
    observer.observe(section);
});

// Feature cards interaction
const featureCards = document.querySelectorAll('.feature-card');
let currentFeature = 1;

featureCards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
        featureCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentFeature = index;
    });
});

// Auto-rotate features every 5 seconds
setInterval(() => {
    currentFeature = (currentFeature + 1) % featureCards.length;
    featureCards.forEach(c => c.classList.remove('active'));
    featureCards[currentFeature].classList.add('active');
}, 5000);

// Smooth fade out hero on scroll
window.addEventListener('scroll', () => {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const scrollY = window.scrollY;
        const opacity = Math.max(0, 1 - scrollY / 600);
        heroSection.style.opacity = opacity;
    }
});