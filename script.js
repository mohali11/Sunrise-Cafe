/* ============================================================
   SUNRISE CAFE & BAKERY — Demo Website Scripts
   Artisan Bakery & Brunch Cafe | Austin, TX
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ==================== NAVBAR ====================
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Scroll behavior — add "scrolled" class past 50px
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // opens and closes the mobile navigation accessibly
  const closeNavigation = () => {
    document.body.classList.remove('nav-open');
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    document.body.classList.toggle('nav-open', isOpen);
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNavigation);
  });

  // i keep one handler so hash links use the same smooth scroll path
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const targetId = link.getAttribute('href').slice(1);
    if (!targetId) return;
    const target = document.getElementById(decodeURIComponent(targetId));
    if (!target) return;

    event.preventDefault();
    const headerHeight = navbar.offsetHeight;
    const scrollTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      closeNavigation();
      navToggle.focus();
    }
  });

  document.addEventListener('click', event => {
    if (navLinks.classList.contains('open') && !navbar.contains(event.target)) {
      closeNavigation();
    }
  });
  // ==================== ACTIVE NAV LINK ON SCROLL ====================
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a');

  const highlightNav = () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navAnchors.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === `#${current}`) {
        a.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // ==================== SCROLL ANIMATIONS ====================
  const animatedElements = document.querySelectorAll('.animate-on-scroll');

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Stagger siblings for a cascading reveal
        const parent = entry.target.parentElement;
        const siblings = Array.from(parent.querySelectorAll('.animate-on-scroll'));
        const siblingIndex = siblings.indexOf(entry.target);
        const delay = siblingIndex * 100;

        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));

  // ==================== MENU CATEGORY FILTER ====================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const menuItems = document.querySelectorAll('.menu-item');
  const menuGroups = document.querySelectorAll('.menu-category-group');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active filter button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;

      menuGroups.forEach((group) => {
        group.classList.toggle('hidden', category !== 'all' && group.dataset.categoryGroup !== category);
      });

      menuItems.forEach((item, i) => {
        const show = category === 'all' || item.dataset.category === category;
        item.classList.toggle('hidden', !show);

        // Re-animate visible items with stagger
        if (show) {
          item.style.opacity = '0';
          item.style.transform = 'translateY(20px)';
          setTimeout(() => {
            item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, i * 50);
        }
      });
    });
  });
  // ==================== HERO PARALLAX EFFECT ====================
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        const offset = window.scrollY * 0.3;
        heroContent.style.transform = `translateY(${offset}px)`;
        heroContent.style.opacity = 1 - (window.scrollY / (window.innerHeight * 0.8));
      }
    }, { passive: true });
  }

  // ==================== COUNTER / BADGE ANIMATION ====================
  const counters = document.querySelectorAll('.stat-number, .badge strong');
  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => counterObserver.observe(el));
  }

  // ==================== MENU CARD HOVER TILT ====================
  document.querySelectorAll('.menu-card-tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ==================== TESTIMONIAL SLIDER ====================
  const track = document.getElementById('testimonialTrack');
  if (track) {
    const cards = track.querySelectorAll('.testimonial-card');
    const dotsContainer = document.getElementById('testimonialDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentSlide = 0;
    let slidesPerView = window.innerWidth >= 768 ? 2 : 1;
    let totalSlides = Math.ceil(cards.length / slidesPerView);

    // Create dots
    function createDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `dot ${i === currentSlide ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Show review group ${i + 1}`);
        dot.setAttribute('aria-current', String(i === currentSlide));
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      }
    }

    function goToSlide(index) {
      currentSlide = index;
      const offset = -(currentSlide * (100 / slidesPerView)) * slidesPerView;
      track.style.transform = `translateX(${offset}%)`;

      if (dotsContainer) {
        dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === currentSlide);
          dot.setAttribute('aria-current', String(i === currentSlide));
        });
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        goToSlide(currentSlide > 0 ? currentSlide - 1 : totalSlides - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0);
      });
    }

    // Auto-advance every 5s
    let autoPlay = setInterval(() => {
      goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0);
    }, 5000);

    // Pause on hover
    const slider = document.getElementById('testimonialSlider');
    if (slider) {
      slider.addEventListener('mouseenter', () => clearInterval(autoPlay));
      slider.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => {
          goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0);
        }, 5000);
      });
    }

    // Handle resize
    window.addEventListener('resize', () => {
      const newPerView = window.innerWidth >= 768 ? 2 : 1;
      if (newPerView !== slidesPerView) {
        slidesPerView = newPerView;
        totalSlides = Math.ceil(cards.length / slidesPerView);
        currentSlide = 0;
        createDots();
        goToSlide(0);
      }
    });

    createDots();
  }

  // i submit contact messages to formspree without reloading the page
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const contactMessage = document.getElementById('contactMessage');
    const contactSubmit = contactForm.querySelector('[type="submit"]');
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      contactMessage.classList.remove('is-error', 'is-success');
      contactMessage.textContent = 'Sending your message…';
      contactSubmit.disabled = true;
      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Contact request failed.');
        contactForm.reset();
        contactMessage.classList.add('is-success');
        contactMessage.textContent = 'Thanks for your message. We will be in touch soon.';
      } catch (error) {
        contactMessage.classList.add('is-error');
        contactMessage.textContent = 'We could not send your message. Please try again later.';
      } finally {
        contactSubmit.disabled = false;
      }
    });
  }

  // submits newsletter signups to formspree and shows the result
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    const newsletterMessage = document.getElementById('newsletterMessage');
    const newsletterSubmit = newsletterForm.querySelector('[type="submit"]');
    newsletterForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      newsletterMessage.classList.remove('is-error');
      newsletterMessage.textContent = 'Submitting…';
      newsletterSubmit.disabled = true;
      try {
        const response = await fetch(newsletterForm.action, {
          method: 'POST',
          body: new FormData(newsletterForm),
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Newsletter request failed.');
        newsletterForm.reset();
        newsletterMessage.textContent = 'Thanks for subscribing!';
      } catch (error) {
        newsletterMessage.classList.add('is-error');
        newsletterMessage.textContent = 'We could not complete your signup. Please try again later.';
      } finally {
        newsletterSubmit.disabled = false;
      }
    });
  }});
