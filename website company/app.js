document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initTheme();
  initNavbar();
  initStatsCounter();
  initSlider();
  initCaptcha();
  initModals();
  initFormSubmit();
  initScrollBasedEffects(); // Consolidated scroll handler
  initHeroInteractions();
  initTypingEffect();
  initCookieConsent();
  initScrollAnimations();
  initPortfolioFilter();
  initFormInputs();
});

/* Preloader */
function initPreloader() {
  window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
    }
    document.body.classList.remove('loading');
  });
}

/* Theme Toggle (Dark/Light) */
function initTheme() {
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
  });
}

/* Sticky Header and Mobile Drawer */
function initNavbar() {
  const header = document.querySelector('.header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Mobile navigation drawer toggle
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // Auto-close menu on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        if (menuToggle) {
          const icon = menuToggle.querySelector('i');
          if (icon) icon.textContent = '☰';
        }
      }
    });
  });

  // Set active nav link based on current page URL
  const currentPage = window.location.pathname.split('/').pop();
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    link.classList.remove('active'); // Clean up any hardcoded active classes

    // Handle index.html case where currentPage might be empty
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* Scroll-triggered Animations */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if (animatedElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        // We don't unobserve, to allow animations to re-trigger if elements are hidden and shown again (e.g., in tabs)
      }
    });
  }, {
    threshold: 0.1 // Trigger when 10% of the element is visible
  });

  animatedElements.forEach(el => {
    observer.observe(el);
  });
}

/* Statistics Count-up Animation */
function initStatsCounter() {
  const statsSection = document.querySelector('.stats-section');
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statsSection || statNumbers.length === 0) return;

  let hasRun = false;

  const countUp = () => {
    statNumbers.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-target'), 10);
      const suffix = stat.getAttribute('data-suffix') || '';
      let current = 0;
      const duration = 2000; // 2 seconds animation
      const increment = target / (duration / 16); // ~60fps

      const updateCount = () => {
        current += increment;
        if (current >= target) {
          stat.textContent = target + suffix;
        } else {
          stat.textContent = Math.floor(current) + suffix;
          requestAnimationFrame(updateCount);
        }
      };

      updateCount();
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasRun) {
        countUp();
        hasRun = true;
        observer.unobserve(statsSection);
      }
    });
  }, { threshold: 0.2 });

  observer.observe(statsSection);
}

/* Case Studies Carousel Engine */
function initSlider() {
  const track = document.querySelector('.slider-track');
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  const dotsContainer = document.querySelector('.slider-dots');

  if (!track || slides.length === 0) return;

  let currentIndex = 0;
  const totalSlides = slides.length;

  // Create dot indicators
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.classList.add('slider-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(i);
    });
    if (dotsContainer) dotsContainer.appendChild(dot);
  }

  const dots = document.querySelectorAll('.slider-dot');

  function updateSlider() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function goToSlide(index) {
    currentIndex = index;
    updateSlider();
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateSlider();
  }

  if (nextBtn) nextBtn.addEventListener('click', nextSlide);
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);

  // Auto slide option
  let autoSlideInterval = setInterval(nextSlide, 8000);

  // Pause on hover
  const sliderContainer = document.querySelector('.slider-container');
  if (sliderContainer) {
    sliderContainer.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
    sliderContainer.addEventListener('mouseleave', () => {
      autoSlideInterval = setInterval(nextSlide, 8000);
    });
  }
}

/* Slide-to-Verify Captcha Mechanism */
function initCaptcha() {
  const captchaContainer = document.querySelector('.slider-captcha-container');
  if (!captchaContainer) return;

  const track = captchaContainer.querySelector('.slider-captcha-track');
  const handle = captchaContainer.querySelector('.slider-captcha-handle');
  const bg = captchaContainer.querySelector('.slider-captcha-bg');
  const text = captchaContainer.querySelector('.slider-captcha-text');
  const submitBtn = captchaContainer.closest('form').querySelector('[type="submit"]');

  if (!captchaContainer || !track || !handle || !submitBtn) return;

  let isDragging = false;
  let startX = 0;
  let maxSlide = 0;
  let verified = false;

  // Initially disable submit button
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor = 'not-allowed';

  function updateSliderPosition(deltaX) {
    if (verified) return;

    if (deltaX < 0) deltaX = 0;
    if (deltaX > maxSlide) deltaX = maxSlide;

    handle.style.left = `${deltaX}px`;
    bg.style.width = `${deltaX + 24}px`;

    const percent = Math.round((deltaX / maxSlide) * 100);
    handle.setAttribute('aria-valuenow', percent);

    if (deltaX >= maxSlide * 0.98) {
      verify();
    }
  }

  function verify() {
    if (verified) return;
    verified = true;
    isDragging = false;

    captchaContainer.classList.add('verified');
    text.textContent = 'Verification Successful!';
    text.style.color = '#28a745';
    
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';

    handle.style.left = `${maxSlide}px`;
    bg.style.width = `100%`;
    handle.setAttribute('aria-valuenow', 100);
    handle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
    text.setAttribute('aria-live', 'assertive');
    setTimeout(() => submitBtn.focus(), 100); // Move focus for accessibility
  }

  function startDrag(e) {
    if (verified) return;
    isDragging = true;
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    maxSlide = track.clientWidth - handle.clientWidth;
    handle.style.transition = 'none';
    bg.style.transition = 'none';

    // Attach move/end listeners to the window for better drag experience
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
  }

  function doDrag(e) {
    if (!isDragging || verified) return;
    e.preventDefault(); // Prevent page scroll on touch devices
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    let deltaX = currentX - startX;
    updateSliderPosition(deltaX);
  }

  function stopDrag() {
    if (!isDragging || verified) return;
    isDragging = false;
    
    // Detach listeners
    window.removeEventListener('mousemove', doDrag);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchmove', doDrag);
    window.removeEventListener('touchend', stopDrag);

    // Reset back to start
    handle.style.transition = 'left 0.3s ease';
    bg.style.transition = 'width 0.3s ease';
    handle.style.left = '1px';
    bg.style.width = '0';
    handle.setAttribute('aria-valuenow', 0);
  }

  function handleKeyDown(e) {
    if (verified) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      maxSlide = track.clientWidth - handle.clientWidth;
      let currentPos = parseFloat(handle.style.left) || 0;
      const step = maxSlide / 10; // Move in 10% increments

      currentPos += (e.key === 'ArrowRight' ? step : -step);
      updateSliderPosition(currentPos);
    }
  }

  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag, { passive: false });
  handle.addEventListener('keydown', handleKeyDown);
}

/* Modals System (e.g. WeChat QR Modal) */
function initModals() {
  const openModalBtns = document.querySelectorAll('.open-wechat-modal');
  const modal = document.getElementById('wechat-modal');
  const closeModalBtn = document.querySelector('.modal-close-btn');

  if (openModalBtns.length === 0 || !modal) return;

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Escape key support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

/* Cookie Consent Banner Logic */
function initCookieConsent() {
  const banner = document.getElementById('cookie-consent-banner');
  const acceptBtn = document.getElementById('cookie-accept-btn');
  const declineBtn = document.getElementById('cookie-decline-btn');

  if (!banner || !acceptBtn || !declineBtn) return;

  // Helper function to get a cookie
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };

  // Hide banner and exit if consent has been given
  if (getCookie('cookie_consent')) {
    banner.style.display = 'none';
    return;
  }

  // Show the banner if no cookie is found after a delay
  setTimeout(() => {
    banner.classList.add('visible');
  }, 2000);

  const setConsentCookie = (value) => {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000)); // Expires in 1 year
    let expires = "expires=" + d.toUTCString();
    document.cookie = `cookie_consent=${value};${expires};path=/;SameSite=Lax`;
    banner.classList.remove('visible');
    setTimeout(() => { banner.style.display = 'none'; }, 600); // Hide after transition
  };

  acceptBtn.addEventListener('click', () => setConsentCookie('accepted'));
  declineBtn.addEventListener('click', () => setConsentCookie('declined'));
}

/* Hero Section Dynamic Interactions */
function initHeroInteractions() {
  const discoverBtn = document.getElementById('hero-cta-discover');
  const heroSection = document.querySelector('.hero-section');

  if (discoverBtn && heroSection) {
    discoverBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = discoverBtn.getAttribute('href');
      
      // Trigger dynamic background warp reaction
      heroSection.classList.add('warp-speed');
      
      // Update button feedback
      discoverBtn.innerHTML = 'Accessing...';
      discoverBtn.style.pointerEvents = 'none';

      // Navigate to the portfolio page after the transition effect finishes (800ms)
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 800);
    });
  }
}

/* Hero Description Typing Effect */
function initTypingEffect() {
  const heroDesc = document.querySelector('.hero-desc');
  if (!heroDesc) return;

  const text = heroDesc.textContent.trim();
  heroDesc.textContent = '';
  heroDesc.classList.add('typing-cursor');

  function startTypingLoop() {
    let i = 0;
    heroDesc.textContent = ''; // Clear text before starting

    function typeWriter() {
      if (i < text.length) {
        heroDesc.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 20); // Typing speed in milliseconds
      } else {
        // Wait 2 seconds after finishing, then restart the animation
        setTimeout(startTypingLoop, 2000);
      }
    }
    typeWriter();
  }

  // Start the first loop exactly when the CSS slideInRight animation begins (1.5s delay)
  setTimeout(startTypingLoop, 1500);
}

/* Unified handler for all scroll-based effects for performance */
function initScrollBasedEffects() {
  // Query elements once
  const header = document.querySelector('.header');
  const progressBar = document.getElementById('scroll-progress');
  const sphere = document.querySelector('.hero-glow-sphere');
  const statsSection = document.querySelector('.stats-section');
  const waBtn = document.querySelector('.whatsapp-float');
  const backToTopBtn = document.getElementById('back-to-top-btn');
  let ticking = false;

  function handleScroll() {
    const scrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    // 1. Scroll Progress Bar
    if (progressBar) {
      const scrollPercentage = (scrollY / scrollHeight) * 100;
      progressBar.style.width = scrollPercentage + '%';
    }

    // 2. Sticky Header
    if (header) {
      header.classList.toggle('scrolled', scrollY > 20);
    }

    // 3. Parallax Effects
    if (sphere) {
      sphere.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
    if (statsSection) {
      statsSection.style.backgroundPosition = `center ${scrollY * 0.5}px`;
    }

    // 4. WhatsApp Button Visibility
    if (waBtn) {
      waBtn.classList.toggle('visible', scrollY > 800);
    }

    // 5. Back to Top Button Visibility
    if (backToTopBtn) {
      backToTopBtn.classList.toggle('visible', scrollY > 600);
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Initial call to set states correctly on page load
  handleScroll();

  // Add click listener for the back-to-top button
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

/* Form Submit Event Feedback */
function initFormSubmit() {
  const forms = document.querySelectorAll('.contact-form, .career-form');
  forms.forEach(form => {
    const errorContainer = form.querySelector('.form-error-container');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Hide previous errors
      if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';
      }

      // Custom Form Validation
      const emailInput = form.querySelector('input[type="email"]');
      const captchaContainer = form.querySelector('.slider-captcha-container');
      
      // 1. Strict Email Format Validation
      if (emailInput) {
        emailInput.removeAttribute('aria-invalid');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
          emailInput.setAttribute('aria-invalid', 'true');
          if (errorContainer) {
            errorContainer.textContent = 'Please enter a valid email address.';
            errorContainer.style.display = 'block';
            errorContainer.focus();
          }
          return; // Stop submission
        }
      }

      // 2. Ensure Slide Captcha is verified (prevents submission if button was forced active via DOM manipulation)
      if (captchaContainer && !captchaContainer.classList.contains('verified')) {
        if (errorContainer) {
          errorContainer.textContent = 'Please complete the slide verification to prove you are human.';
          errorContainer.style.display = 'block';
          captchaContainer.querySelector('.slider-captcha-handle').focus();
        }
        return; // Stop submission
      }

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.innerHTML = 'Sending...';
      submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        // IMPORTANT: Replace this placeholder with your own Formspree URL.
        // Go to formspree.io, create a new form, and set the destination email to sanjeevk630129@gmail.com.
        const endpoint = 'https://formspree.io/f/YOUR_UNIQUE_FORM_ID';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          submitBtn.innerHTML = 'Message Sent Successfully!';
          submitBtn.style.backgroundColor = '#28a745';
          submitBtn.style.color = '#ffffff';
          form.reset();
        } else {
          throw new Error('Form submission failed');
        }
      } catch (error) {
        submitBtn.innerHTML = 'Oops! There was a problem.';
        submitBtn.style.backgroundColor = '#dc3545';
        submitBtn.style.color = '#ffffff';
      }
        
      // Reset button after 3 seconds
      setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.color = '';
          submitBtn.disabled = false;
          
          // Reset slider captcha if present
          const captchaContainer = document.querySelector('.slider-captcha-container');
          if (captchaContainer) {
            captchaContainer.classList.remove('verified');
            const handle = document.querySelector('.slider-captcha-handle');
            const bg = document.querySelector('.slider-captcha-bg');
            const text = document.querySelector('.slider-captcha-text');
            const submitBtnEl = document.getElementById('submit-btn');

            if (handle && bg && text && submitBtnEl) {
              handle.style.left = '1px';
              bg.style.width = '0';
              text.textContent = 'Slide to prove you are human';
              text.style.color = '';
              submitBtnEl.disabled = true;
              submitBtnEl.style.opacity = '0.5';
              submitBtnEl.style.cursor = 'not-allowed';
              handle.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              `;
            }
          }
        }, 3000);
    });
  });
}

/* Professional Floating Form Labels */
function initFormInputs() {
  const formControls = document.querySelectorAll('.form-control');

  formControls.forEach(input => {
    // Check on load for pre-filled values (e.g., from browser autocomplete)
    if (input.value && input.value.trim() !== '') {
      input.classList.add('has-content');
    }

    input.addEventListener('blur', (e) => {
      if (e.target.value.trim() !== '') {
        e.target.classList.add('has-content');
      } else {
        e.target.classList.remove('has-content');
      }
    });
  });
}

/* Portfolio Filtering with Animation */
function initPortfolioFilter() {
  const filterNav = document.querySelector('.filter-nav');
  if (!filterNav) return;

  const filterBtns = filterNav.querySelectorAll('.filter-btn');
  const portfolioGrid = document.querySelector('.portfolio-grid');
  const portfolioItems = portfolioGrid.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (portfolioGrid.classList.contains('is-animating')) return;
      portfolioGrid.classList.add('is-animating');

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      // Animate out items that don't match the new filter
      portfolioItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        const shouldShow = filterValue === 'all' || itemCategory === filterValue;
        
        if (!shouldShow) {
          item.classList.add('is-filtered');
        }
      });

      // After the fade-out, hide them and reveal the new ones
      setTimeout(() => {
        portfolioItems.forEach(item => {
          const itemCategory = item.getAttribute('data-category');
          const shouldShow = filterValue === 'all' || itemCategory === filterValue;

          if (shouldShow) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });

        // A tiny delay to allow the 'display' property to take effect before animating in
        setTimeout(() => {
          portfolioItems.forEach(item => {
            if (!item.classList.contains('hidden')) {
              item.classList.remove('is-filtered');
            }
          });
        }, 20);

        // Allow clicking again after animations are done
        setTimeout(() => {
          portfolioGrid.classList.remove('is-animating');
        }, 350);

      }, 300); // This duration should match the CSS transition
    });
  });
}
