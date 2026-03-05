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

    // ── Instagram Feed from Google Sheets ────────────────
    const loadInstaFeed = async () => {
        const grid = document.getElementById('instaGrid');
        if (!grid) return;

        const sheetId = '1d0Tyi6sHbJyV3k0kU3M5I73Eikic-vLOsfwFL9DXX1U';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        try {
            const res = await fetch(url);
            const text = await res.text();

            // Extract JSON from Google's response format: /*O_o*/ google.visualization.Query.setResponse({...});
            const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);?/)[1];
            const data = JSON.parse(jsonStr);

            const rows = data.table.rows;
            if (!rows || rows.length === 0) {
                grid.innerHTML = '<p style="color:white;text-align:center;">Aún no hay publicaciones disponibles.</p>';
                return;
            }

            // Limit to 10 posts
            const posts = rows.slice(0, 10);
            let html = '';

            posts.forEach(row => {
                if (!row.c || !row.c[0] || !row.c[1]) return;

                // Usually A is image, B is link
                const img = row.c[0] ? row.c[0].v : null;
                const link = row.c[1] ? row.c[1].v : '#';

                // Skip headers if present in data
                if (img && img.toLowerCase() !== 'image' && link.toLowerCase() !== 'link') {
                    html += `
                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="insta-post fade-up">
                            <img src="${img}" alt="Instagram Post" loading="lazy" draggable="false" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 400 400\\' fill=\\'%23111\\'><rect width=\\'400\\' height=\\'400\\' fill=\\'%23F3F4F6\\'/><path d=\\'M200 120a80 80 0 1 0 0 160 80 80 0 0 0 0-160zm0 134.4a54.4 54.4 0 1 1 0-108.8 54.4 54.4 0 0 1 0 108.8zm83.2-132.8a19.2 19.2 0 1 1-38.4 0 19.2 19.2 0 0 1 38.4 0zM286.4 120H113.6A33.6 33.6 0 0 0 80 153.6v92.8A33.6 33.6 0 0 0 113.6 280h172.8A33.6 33.6 0 0 0 320 246.4v-92.8A33.6 33.6 0 0 0 286.4 120zm14.4 126.4a14.4 14.4 0 0 1-14.4 14.4H113.6a14.4 14.4 0 0 1-14.4-14.4v-92.8A14.4 14.4 0 0 1 113.6 139h172.8a14.4 14.4 0 0 1 14.4 14.4v92.8z\\' fill=\\'%239CA3AF\\'/></svg>'; this.parentElement.classList.add('image-fallback');">
                            <svg class="insta-post-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="2" width="20" height="20" rx="5" />
                                <circle cx="12" cy="12" r="5" />
                                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                            </svg>
                        </a>
                    `;
                }
            });

            if (html.trim() === '') {
                grid.innerHTML = '<p style="color:white;text-align:center;">No hay publicaciones válidas.</p>';
            } else {
                grid.innerHTML = html;
                initDragToScroll(grid);
            }

        } catch (error) {
            console.error('Error fetching Instagram feed:', error);
            grid.innerHTML = '<p style="color:white;text-align:center;">No se pudo cargar el feed de Instagram.</p>';
        }
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
