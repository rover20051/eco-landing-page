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
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close nav when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
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
        const answer = item.querySelector('.faq-answer');

        question.addEventListener('click', () => {
            const isActive = question.getAttribute('aria-expanded') === 'true';

            // Close all other items
            faqItems.forEach(other => {
                if (other !== item) {
                    other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.querySelector('.faq-answer');
                    if (otherAnswer) otherAnswer.classList.remove('open');
                }
            });

            // Toggle current item
            question.setAttribute('aria-expanded', !isActive);
            if (answer) answer.classList.toggle('open', !isActive);
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


    // ── Parallax on Hero Image (subtle) ──────────────────
    const heroImg = document.querySelector('.hero-bg img');
    if (heroImg) {
        window.addEventListener('scroll', () => {
            const scroll = window.scrollY;
            if (scroll < window.innerHeight) {
                heroImg.style.transform = `translateY(${scroll * 0.2}px) scale(1.08)`;
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
        background: linear-gradient(90deg, var(--cream, #FFF7E7), var(--wine, #5A2428));
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

    // ── Instagram Feed from Google Sheets (JSONP — sin CORS) ──
    const loadInstaFeed = () => {
        const grid = document.getElementById('instaGrid');
        if (!grid) return;

        const sheetId = '1d0Tyi6sHbJyV3k0kU3M5I73Eikic-vLOsfwFL9DXX1U';
        const cbName = 'instaSheetCb';

        // Timeout por si el script falla silenciosamente
        const timeout = setTimeout(() => {
            if (grid.querySelector('.insta-loading')) {
                grid.innerHTML = '<p class="insta-loading">No se pudo cargar el feed.</p>';
            }
            delete window[cbName];
        }, 8000);

        window[cbName] = (data) => {
            clearTimeout(timeout);
            delete window[cbName];
            const existing = document.getElementById('instaSheetScript');
            if (existing) existing.remove();

            try {
                const rows = data.table.rows;
                if (!rows || rows.length === 0) {
                    grid.innerHTML = '<p class="insta-loading">Aún no hay publicaciones.</p>';
                    return;
                }

                // Recopilar hasta 10 links válidos de Instagram (columna B, saltar header)
                const links = [];
                rows.forEach(row => {
                    if (links.length >= 10) return;
                    if (!row.c || !row.c[1] || !row.c[1].v) return;
                    const link = row.c[1].v.trim();
                    if (link.toLowerCase() === 'link') return; // saltar cabecera
                    if (link.includes('instagram.com')) {
                        links.push(link.replace(/\/$/, ''));
                    }
                });

                if (links.length === 0) {
                    grid.innerHTML = '<p class="insta-loading">No hay publicaciones válidas.</p>';
                    return;
                }

                let html = '';
                links.forEach(postUrl => {
                    html += `
                        <div class="insta-embed-wrap">
                            <iframe src="${postUrl}/embed/captioned/"
                                class="insta-embed-frame"
                                frameborder="0" scrolling="no"
                                allowtransparency="true"
                                allow="encrypted-media"
                                loading="lazy">
                            </iframe>
                        </div>
                    `;
                });

                grid.innerHTML = html;
                initDragToScroll(grid);

            } catch (err) {
                console.error('Error procesando feed:', err);
                grid.innerHTML = '<p class="insta-loading">No se pudo cargar el feed.</p>';
            }
        };

        // Inyectar script JSONP — bypasa CORS completamente
        const script = document.createElement('script');
        script.id = 'instaSheetScript';
        script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${cbName}&gid=0`;
        script.onerror = () => {
            clearTimeout(timeout);
            delete window[cbName];
            grid.innerHTML = '<p class="insta-loading">No se pudo cargar el feed.</p>';
        };
        document.head.appendChild(script);
    };

    // Funcionalidad para arrastrar el slider con el mouse en Desktop
    const initDragToScroll = (slider) => {
        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            // Desactiva scroll-snap temporariamente para un arrastre fluido
            slider.style.scrollSnapType = 'none';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = '';
            slider.style.scrollSnapType = 'x mandatory';
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = '';
            slider.style.scrollSnapType = 'x mandatory';
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault(); // Evita selección de texto o arrastre de imagen
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; // Velocidad de arrastre
            slider.scrollLeft = scrollLeft - walk;
        });

        // Prevenir click al arrastrar links
        let isDragging = false;
        slider.addEventListener('mousedown', () => isDragging = false);
        slider.addEventListener('mousemove', () => isDragging = true);

        slider.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                if (isDragging) {
                    e.preventDefault();
                }
            });
        });
    };

    loadInstaFeed();

});
