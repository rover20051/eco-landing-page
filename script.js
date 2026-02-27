/* ═══════════════════════════════════════════════════════
   ECO — Interactive Functionality
   FAQ Accordion, Smooth Scroll, Navbar, Animations
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Scroll Reveal Animations ─────────────────────────
    // Supports: .fade-up, .scale-in, .slide-left, .slide-right, .text-reveal
    const animatedElements = document.querySelectorAll(
        '.fade-up, .scale-in, .slide-left, .slide-right, .text-reveal'
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px'
    });

    animatedElements.forEach(el => revealObserver.observe(el));


    // ── Header Scroll Effect ─────────────────────────────
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    }, { passive: true });


    // ── Mobile Navigation Toggle ─────────────────────────
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close nav when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });


    // ── Active Nav Link on Scroll ────────────────────────
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navAnchors.forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => sectionObserver.observe(section));


    // ── FAQ Accordion ────────────────────────────────────
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all other items
            faqItems.forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                    other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current item
            item.classList.toggle('active', !isActive);
            question.setAttribute('aria-expanded', !isActive);
        });
    });


    // ── Video Play Button ────────────────────────────────
    const playBtn = document.getElementById('playBtn');
    const videoWrapper = document.getElementById('videoWrapper');

    if (playBtn && videoWrapper) {
        playBtn.addEventListener('click', () => {
            const videoOverlay = document.createElement('div');
            videoOverlay.style.cssText = `
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(17, 31, 77, 0.95);
                z-index: 10;
                color: white;
                font-size: 1.2rem;
                font-family: 'Playfair Display', serif;
                text-align: center;
                padding: 24px;
                cursor: pointer;
            `;
            videoOverlay.innerHTML = `
                <div>
                    <svg viewBox="0 0 80 80" fill="none" style="width:60px;height:60px;margin:0 auto 16px;display:block;animation:pulse 2s infinite;">
                        <circle cx="40" cy="40" r="39" stroke="rgba(232,185,49,0.5)" stroke-width="2"/>
                        <polygon points="32,24 58,40 32,56" fill="#E8B931"/>
                    </svg>
                    <p style="font-size:1rem;opacity:0.8;">Video próximamente disponible</p>
                </div>
            `;

            videoOverlay.addEventListener('click', () => {
                videoOverlay.remove();
                playBtn.style.display = '';
            });

            videoWrapper.appendChild(videoOverlay);
            playBtn.style.display = 'none';
        });
    }


    // ── Smooth Scroll for Anchor Links ───────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = header.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });


    // ── Parallax on Hero Video (subtle) ──────────────────
    const heroVideo = document.querySelector('.hero-bg video');
    if (heroVideo) {
        window.addEventListener('scroll', () => {
            const scroll = window.scrollY;
            if (scroll < window.innerHeight) {
                heroVideo.style.transform = `translateY(${scroll * 0.25}px) scale(1.1)`;
            }
        }, { passive: true });
    }


    // ── Counter Animation for Phase Numbers ──────────────
    const faseNumbers = document.querySelectorAll('.fase-number');
    const faseObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.textContent);
                let count = 0;
                const step = () => {
                    count++;
                    el.textContent = String(count).padStart(2, '0');
                    if (count < target) {
                        requestAnimationFrame(step);
                    }
                };
                el.textContent = '00';
                requestAnimationFrame(step);
                faseObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    faseNumbers.forEach(num => faseObserver.observe(num));


    // ── Magnetic Hover Effect on Buttons ──────────────────
    const magneticBtns = document.querySelectorAll('.btn');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });


    // ── Tilt Effect on Cards ─────────────────────────────
    const tiltCards = document.querySelectorAll('.pilar-card, .testimonio-card');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const tiltX = (y - 0.5) * 6;
            const tiltY = (x - 0.5) * -6;

            card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });


    // ── Smooth Section Indicator (scroll progress) ───────
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--yellow, #E8B931), var(--red, #CC2A12));
        z-index: 10000;
        transition: width 0.1s ease;
        width: 0%;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = `${progress}%`;
    }, { passive: true });

});
