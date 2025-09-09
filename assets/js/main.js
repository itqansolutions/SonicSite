/* Main JS: nav, preloader, reveal (with stagger), magnetic buttons, a11y niceties */
document.addEventListener('DOMContentLoaded', () => {
  /* =======================
     Helpers
  ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================
     Mobile nav
  ======================= */
  const toggle = $('.nav-toggle');
  const mobile = $('.nav-mobile');

  const openNav = () => {
    if (!toggle || !mobile) return;
    mobile.classList.add('show');
    toggle.setAttribute('aria-expanded', 'true');
    const firstLink = $('a', mobile);
    firstLink && firstLink.focus();
  };

  const closeNav = () => {
    if (!toggle || !mobile) return;
    mobile.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  if (toggle && mobile) {
    toggle.setAttribute('aria-controls', 'mobile-menu');
    mobile.id = 'mobile-menu';
    toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', () => {
      mobile.classList.toggle('show');
      const expanded = mobile.classList.contains('show');
      toggle.setAttribute('aria-expanded', String(expanded));
    });

    $$('.nav-mobile a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobile.classList.contains('show')) closeNav();
    });
  }

  /* =======================
     Preloader (fires app:ready)
  ======================= */
  const pre = $('.preloader');
  let preloaderHidden = false;

  const hidePreloader = () => {
    if (preloaderHidden) return; // guard ضد التكرار
    preloaderHidden = true;

    // لو مفيش بريلودر أصلاً، أعلن الجاهزية
    if (!pre) {
      window.dispatchEvent(new Event('app:ready'));
      document.documentElement.classList.add('app-ready');
      return;
    }

    pre.classList.add('hidden');
    const remove = () => {
      // safety: ممكن يكون اتمسح بالفعل
      if (pre && pre.parentNode) pre.remove();
      window.dispatchEvent(new Event('app:ready'));
      document.documentElement.classList.add('app-ready');
    };
    pre.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 1000); // Safety
  };

  // اختفاء بعد تحميل الصفحة
  window.addEventListener('load', () => {
    setTimeout(hidePreloader, prefersReduced ? 200 : 500);
  });

  // Fallback لو load ما اشتغل لأي سبب
  setTimeout(hidePreloader, prefersReduced ? 700 : 1500);

  /* =======================
     Highlight active nav link
  ======================= */
  const path = location.pathname.split('/').pop() || 'index.html';
  const normalized = path === '' ? 'index.html' : path;
  $$('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href === normalized || (normalized === 'index.html' && (href === './' || href === 'index.html'))) {
      a.classList.add('is-active');
    }
  });

  /* =======================
     Header shadow on scroll
  ======================= */
  const header = $('.site-header');
  const setHeaderShadow = () => {
    if (!header) return;
    header.classList.toggle('elevated', window.scrollY > 4);
  };
  setHeaderShadow();
  window.addEventListener('scroll', setHeaderShadow, { passive: true });

  /* =======================
     Reveal on scroll (.reveal) — unified to .in-view + --delay
     (متسق مع [data-anim] اللى تحت)
  ======================= */
  const revealEls = $$('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;

        // ترتيب العنصر وسط اخواته لعمل stagger بسيط
        const siblings = $$('.reveal', el.parentElement);
        const index = siblings.indexOf(el);

        const base = Number(el.getAttribute('data-delay') || 0);
        const step = Number(el.getAttribute('data-stagger') || 80);
        const delay = Math.min(base + index * step, 500);

        el.style.setProperty('--delay', `${delay}ms`);
        el.classList.add('in-view');
        io.unobserve(el);
      });
    }, { threshold: 0.2 });
    revealEls.forEach(el => io.observe(el));
  }

  /* =======================
     Smooth anchor scroll (accounts for sticky header)
  ======================= */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - (headerH + 12);
    window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  /* =======================
     Magnetic buttons (CSS vars to preserve :hover scale)
  ======================= */
  const isTouch = window.matchMedia('(pointer:coarse)').matches;
  if (!isTouch) {
    $$('.btn--magnet').forEach(btn => {
      const strength = 18; // px
      let raf = 0;

      const onMove = (e) => {
        const rect = btn.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const dx = (mx - rect.width / 2) / (rect.width / 2);
        const dy = (my - rect.height / 2) / (rect.height / 2);
        const tx = Math.max(-1, Math.min(1, dx)) * strength;
        const ty = Math.max(-1, Math.min(1, dy)) * strength;

        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          // نكتب قيم الترجمة في CSS variables بدل transform inline
          btn.style.setProperty('--tx', `${tx}px`);
          btn.style.setProperty('--ty', `${ty}px`);
        });
      };

      const reset = () => {
        cancelAnimationFrame(raf);
        btn.style.removeProperty('--tx');
        btn.style.removeProperty('--ty');
      };

      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', reset);
      const ro = new ResizeObserver(reset);
      ro.observe(btn);
    });
  }
});

/* ===== Itqan-style Scroll Animations & Parallax & Counters & Progress ===== */
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function boot(){
    /* -------- Scroll Progress Bar -------- */
    let bar = document.querySelector('.scroll-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress';
      document.body.appendChild(bar);
    }
    const setProgress = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    };
    setProgress();
    window.addEventListener('scroll', setProgress, { passive: true });
    window.addEventListener('resize', setProgress);

    /* -------- Reveal + Stagger (data-anim -> .in-view + --delay) -------- */
    const revealItems = Array.from(document.querySelectorAll('[data-anim]'));
    if (revealItems.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const siblings = Array.from(el.parentElement.querySelectorAll('[data-anim]'));
          const index = siblings.indexOf(el);
          const base = Number(el.getAttribute('data-delay') || 0);
          const step = Number(el.getAttribute('data-stagger') || 80);
          const delay = Math.min(base + index * step, 500);
          el.style.setProperty('--delay', `${delay}ms`);
          el.classList.add('in-view');
          io.unobserve(el);
        });
      }, { threshold: 0.15 });
      revealItems.forEach(el => io.observe(el));
    }

    /* -------- Parallax -------- */
    const px = Array.from(document.querySelectorAll('[data-parallax]'));
    if (px.length && !prefersReduced) {
      const speeds = new WeakMap();
      px.forEach(el => speeds.set(el, parseFloat(el.getAttribute('data-speed')) || 0.15));
      const loop = () => {
        const vh = window.innerHeight;
        px.forEach(el => {
          const r = el.getBoundingClientRect();
          const center = r.top + r.height/2;
          const fromCenter = (center - vh/2) / vh;
          const ty = -fromCenter * (speeds.get(el) * 100);
          el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
        });
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    /* -------- Counters -------- */
    const counters = Array.from(document.querySelectorAll('[data-counter]'));
    if (counters.length) {
      const format = (n) => n.toLocaleString();
      const run = (el) => {
        const to = Number(el.getAttribute('data-to') || 0);
        const dur = Number(el.getAttribute('data-duration') || 1200);
        const start = performance.now();
        const from = 0;
        const step = (t) => {
          const p = Math.min((t - start) / dur, 1);
          const eased = p < .5 ? 2*p*p : -1+(4-2*p)*p; // easeInOutQuad
          el.textContent = format(Math.round(from + (to - from) * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            run(e.target);
            io2.unobserve(e.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(el => io2.observe(el));
    }
  }

  // شغّل المؤثرات بعد انتهاء البريلودر
  if (document.documentElement.classList.contains('app-ready')) {
    boot();
  } else {
    window.addEventListener('app:ready', boot, { once: true });
  }
})();

/* ====== Reveal with direction for .card--with-bg (alternating) ====== */
(() => {
  const cards = document.querySelectorAll('.card--with-bg');
  if (!cards.length) return;

  const ioCards = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const index = Array.from(cards).indexOf(el);
      // زوجي يدخل من اليمين، فردي من الشمال
      if (index % 2 === 0) {
        el.classList.add('in-view-left');
      } else {
        el.classList.add('in-view-right');
      }
      ioCards.unobserve(el);
    });
  }, { threshold: 0.2 });

  cards.forEach(el => ioCards.observe(el));
})();
