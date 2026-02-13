document.addEventListener("DOMContentLoaded", () => {
    /* == HERO VIDEO LOOP SUAVE (CROSSFADE) == */
    /* ======================================= */
    const heroVideos = Array.from(document.querySelectorAll('.hero-video[data-hero-loop]'));

    if (heroVideos.length >= 2) {
        const LOOP_START = 0.06;
        const SWITCH_BEFORE_END = 0.30;
        const FADE_DURATION_MS = 320;
        let activeIndex = heroVideos.findIndex((v) => v.classList.contains('is-active'));
        let switching = false;

        if (activeIndex < 0) activeIndex = 0;

        const switchHeroVideo = () => {
            if (switching) return;
            switching = true;

            const current = heroVideos[activeIndex];
            const next = heroVideos[1 - activeIndex];

            try {
                next.currentTime = LOOP_START;
            } catch (_) {
                // Ignore seek errors while metadata is not fully available.
            }

            next.play().then(() => {
                next.classList.add('is-active');
                current.classList.remove('is-active');

                window.setTimeout(() => {
                    current.pause();
                    try {
                        current.currentTime = LOOP_START;
                    } catch (_) {
                        // Ignore seek errors while metadata is not fully available.
                    }
                    activeIndex = 1 - activeIndex;
                    switching = false;
                }, FADE_DURATION_MS);
            }).catch(() => {
                switching = false;
            });
        };

        heroVideos.forEach((video, index) => {
            video.addEventListener('timeupdate', () => {
                if (index !== activeIndex || switching) return;
                if (!Number.isFinite(video.duration) || video.duration <= 0) return;
                if (video.duration - video.currentTime <= SWITCH_BEFORE_END) {
                    switchHeroVideo();
                }
            });
        });
    }

    /* == HEADER: PARALLAX + ROLAGEM DO MENU == */
    /* ========================================= */
    const brandDock = document.querySelector('.header-brand-dock');
    const navDock = document.querySelector('.header-nav-dock');

    if (brandDock || navDock) {
        let headerTicking = false;

        const updateHeaderParallax = () => {
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const brandShift = Math.min(16, scrollY * 0.06);
            const navShift = Math.max(-12, -(scrollY * 0.025));

            document.documentElement.style.setProperty('--brand-parallax-y', `${brandShift.toFixed(2)}px`);
            document.documentElement.style.setProperty('--nav-parallax-y', `${navShift.toFixed(2)}px`);
            headerTicking = false;
        };

        const requestHeaderParallax = () => {
            if (headerTicking) return;
            headerTicking = true;
            window.requestAnimationFrame(updateHeaderParallax);
        };

        window.addEventListener('scroll', requestHeaderParallax, { passive: true });
        updateHeaderParallax();
    }

    const mainNavLinks = document.querySelectorAll('#main-nav a[href^="#"]');
    if (mainNavLinks.length > 0) {
        const updateHash = (hash) => {
            try {
                history.replaceState(null, '', hash);
            } catch (_) {
                window.location.hash = hash;
            }
        };

        const easeInOutCubic = (t) => (t < 0.5)
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const animatedScrollTo = (targetY, duration = 760) => {
            const startY = window.scrollY || window.pageYOffset || 0;
            const distance = targetY - startY;

            if (Math.abs(distance) < 2) {
                window.scrollTo({ top: targetY, behavior: 'auto' });
                return;
            }

            const startTime = performance.now();
            const step = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const eased = easeInOutCubic(progress);
                window.scrollTo({ top: startY + (distance * eased), behavior: 'auto' });
                if (progress < 1) window.requestAnimationFrame(step);
            };

            window.requestAnimationFrame(step);
        };

        mainNavLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                const targetId = link.getAttribute('href');
                if (!targetId || targetId === '#') return;

                const targetSection = document.querySelector(targetId);
                if (!targetSection) return;

                event.preventDefault();

                if (targetId === '#home') {
                    animatedScrollTo(0, 700);
                    updateHash(targetId);
                    return;
                }

                const navOffset = (navDock?.offsetHeight ?? 0) + 18;
                const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - navOffset;
                animatedScrollTo(Math.max(0, targetTop), 760);
                updateHash(targetId);
            });
        });
    }

    /* == 1. SCROLLYTELLING PROCEDIMENTOS == */
    /* ===================================== */
    const container = document.querySelector('.procedimentos');
    const tags = document.querySelectorAll('.procedimentos .tag');
    const videoPlayer = document.getElementById('procedimento-video');

    if (container && tags.length > 0 && videoPlayer) {
        let videoSource = videoPlayer.querySelector('source') || document.createElement('source');
        if (!videoPlayer.contains(videoSource)) videoPlayer.appendChild(videoSource);

        let currentActiveIndex = -1;
        let ticking = false;

        const handleVideoLoop = () => {
            const activeTag = tags[currentActiveIndex];
            if (!activeTag) return;

            const loopStart = parseFloat(activeTag.dataset.loopStart);
            const loopEnd = parseFloat(activeTag.dataset.loopEnd);

            if (!isNaN(loopStart) && !isNaN(loopEnd) && videoPlayer.currentTime >= loopEnd) {
                videoPlayer.currentTime = loopStart;
            }
        };

       const onScroll = () => {
            const { top, height } = container.getBoundingClientRect();
            const scrollableHeight = height - window.innerHeight;

            if (top > 0 || top < -scrollableHeight) {
                if (currentActiveIndex !== -1) {
                    tags[currentActiveIndex].classList.remove('active');
                    videoPlayer.classList.remove('visible');
                    videoPlayer.removeEventListener('timeupdate', handleVideoLoop);
                    videoPlayer.pause();
                    currentActiveIndex = -1;
                }
                return;
            }

            const progress = -top / scrollableHeight;
            const step = 1 / tags.length;
            const newActiveIndex = Math.min(tags.length - 1, Math.floor(progress / step));
            const progressWithinStep = (progress % step) / step;

            if (newActiveIndex !== currentActiveIndex) {
                if (currentActiveIndex !== -1) tags[currentActiveIndex].classList.remove('active');
                tags[newActiveIndex].classList.add('active');
                videoPlayer.classList.remove('visible'); 
                videoPlayer.pause();                   
                
                const newVideoPath = tags[newActiveIndex].dataset.video;
                if (videoSource.getAttribute('src') !== newVideoPath) {
                    videoSource.src = newVideoPath;
                    videoPlayer.load();
                }
                currentActiveIndex = newActiveIndex;
                videoPlayer.removeEventListener('timeupdate', handleVideoLoop);
                
            } else {
                if (progressWithinStep > 0.5) {
                    if (!videoPlayer.classList.contains('visible')) {
                        videoPlayer.classList.add('visible');
                        videoPlayer.play().then(() => {
                            videoPlayer.addEventListener('timeupdate', handleVideoLoop);
                        }).catch(console.warn);
                    }
                } else {
                    if (videoPlayer.classList.contains('visible')) {
                        videoPlayer.classList.remove('visible');
                        videoPlayer.pause();
                        videoPlayer.removeEventListener('timeupdate', handleVideoLoop);
                    }
                }
            }
        };

        const requestTick = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                onScroll();
                ticking = false;
            });
        };

        window.addEventListener('scroll', requestTick, { passive: true });
        onScroll();
    }

    /* == 2. EFEITO DE SCROLL (IntersectionObserver) == */
    /* ================================================ */
    
    // Seleciona TODOS os elementos que queremos animar
    const animatedElements = document.querySelectorAll(
        '.servico-card, .sobre-texto, .sobre-imagem'
    );

    if (animatedElements.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1 // Ativa quando 10% do elemento está visível
        };

        const observerCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        };

        const scrollObserver = new IntersectionObserver(observerCallback, observerOptions);

        // Observa cada elemento da nossa lista
        animatedElements.forEach(el => {
            scrollObserver.observe(el);
        });
    }
    
    /* == 3. CONTROLES DO MODAL DE AGENDAMENTO == */
    /* ========================================= */
    const openModalButtons = document.querySelectorAll('[data-open-modal]');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOverlay = document.getElementById('agendamento-modal');
    const modalContent = modalOverlay?.querySelector('.modal-content');
    let lastFocusedElement = null;

    // Verifica se os elementos do modal existem
    if (openModalButtons.length > 0 && closeModalBtn && modalOverlay && modalContent) {
        const focusableSelector = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');

        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            modalOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }
        };

        const openModal = (trigger) => {
            lastFocusedElement = trigger;
            modalOverlay.classList.add('visible');
            modalOverlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            modalContent.focus();
        };

        openModalButtons.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(btn);
            });
        });

        closeModalBtn.addEventListener('click', () => {
            closeModal();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!modalOverlay.classList.contains('visible')) return;

            if (e.key === 'Escape') {
                closeModal();
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = modalContent.querySelectorAll(focusableSelector);
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
});
