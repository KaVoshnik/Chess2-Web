document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    initScrollAnimations();
    initNavigation();
    initSmoothScroll();
    initParallaxEffects();
    initCardFlip();
});

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        
        const size = 2 + Math.random() * 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        particlesContainer.appendChild(particle);
    }
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                if (entry.target.classList.contains('mode-card')) {
                    const delay = entry.target.style.getPropertyValue('--delay') || '0s';
                    entry.target.style.transitionDelay = delay;
                }
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
    animatedElements.forEach(el => observer.observe(el));

    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.classList.add('reveal-up');
        observer.observe(card);
    });
}

function initNavigation() {
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.style.background = 'rgba(10, 10, 26, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(10, 10, 26, 0.9)';
            navbar.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });

    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === '#' + current) {
                item.classList.add('active');
            }
        });
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initParallaxEffects() {
    const heroVisual = document.querySelector('.hero-visual');
    const floatingPieces = document.querySelectorAll('.floating-piece');

    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;

        if (heroVisual) {
            heroVisual.style.transform = `translateX(${mouseX * 20}px) translateY(${mouseY * 20}px)`;
        }

        floatingPieces.forEach((piece, index) => {
            const speed = (index + 1) * 10;
            piece.style.transform = `translateX(${mouseX * speed}px) translateY(${mouseY * speed}px)`;
        });
    });

    const cards = document.querySelectorAll('.mode-card, .about-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

function initCardFlip() {
    document.querySelectorAll('.card-flip-container').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });

    document.querySelectorAll('.card-flip-container').forEach((card, index) => {
        card.addEventListener('mouseenter', () => {
            document.querySelectorAll('.card-flip-container').forEach((c, i) => {
                if (i !== index) {
                    c.style.opacity = '0.6';
                    c.style.filter = 'blur(2px)';
                }
            });
        });
        
        card.addEventListener('mouseleave', () => {
            document.querySelectorAll('.card-flip-container').forEach(c => {
                c.style.opacity = '1';
                c.style.filter = 'none';
            });
        });
    });
}

const typingElements = document.querySelectorAll('.hero-subtitle');
typingElements.forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    el.style.opacity = '1';
    
    let charIndex = 0;
    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            el.textContent += text.charAt(charIndex);
            charIndex++;
        } else {
            clearInterval(typeInterval);
        }
    }, 30);
});

function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        const icon = card.querySelector('.mode-icon');
        if (icon) {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        }
    });
    
    card.addEventListener('mouseleave', () => {
        const icon = card.querySelector('.mode-icon');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
        }
    });
});

const sharkPiece = document.querySelector('.shark-piece');
if (sharkPiece) {
    sharkPiece.addEventListener('click', () => {
        sharkPiece.style.animation = 'none';
        sharkPiece.offsetHeight;
        sharkPiece.style.animation = 'shark-dive 1s ease-in-out';
        
        setTimeout(() => {
            sharkPiece.style.animation = 'shark-swim 4s ease-in-out infinite';
        }, 1000);
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shark-dive {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        50% {
            transform: translate(-50%, -50%) scale(0) translateY(50px);
            opacity: 0;
        }
        51% {
            transform: translate(calc(-50% + 100px), -50%) scale(0);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const boardGlow = document.querySelector('.board-glow');
    const hero = document.querySelector('.hero');
    
    if (boardGlow) {
        boardGlow.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
    
    if (hero && scrolled < window.innerHeight) {
        hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
    }
});

function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => createRipple(e, btn));
});

console.log('%c Chess 2 ', 'background: linear-gradient(135deg, #4facfe, #f5576c); color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 10px;');
console.log('%c Новая эра шахмат начинается здесь! ', 'color: #4facfe; font-size: 14px;');
