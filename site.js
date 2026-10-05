// Shared behaviour for index.html and detail.html.
// The inline script in <head> has already set data-lang (and the motion class) before first paint.
(() => {
  const root = document.documentElement;
  root.dataset.ready = '1';

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  // Language
  const langBtns = document.querySelectorAll('[data-set-lang]');
  const setLang = (lang, persist) => {
    root.dataset.lang = lang;
    root.lang = lang === 'en' ? 'en' : 'zh-CN';
    langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
    if (persist) store.set('lang', lang);
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  };
  setLang(root.dataset.lang === 'en' ? 'en' : 'zh', false);
  langBtns.forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang, true)));

  // Black / white theme: dark by default, the visitor's choice is remembered
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const setTheme = (theme, persist) => {
    root.dataset.theme = theme;
    themeBtn?.setAttribute('aria-label', theme === 'light' ? '切换为黑色 / Switch to dark' : '切换为白色 / Switch to light');
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (themeMeta && bg) themeMeta.content = bg;
    if (persist) store.set('theme', theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  };
  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false);
  themeBtn?.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true));

  // Mobile menu sheet
  const menuBtn = document.querySelector('[data-nav-toggle]');
  const menu = document.getElementById('site-menu');
  const setMenu = (open) => {
    root.dataset.navOpen = open ? 'true' : 'false';
    menuBtn?.setAttribute('aria-expanded', String(open));
  };
  setMenu(false);
  menuBtn?.addEventListener('click', () => setMenu(root.dataset.navOpen !== 'true'));
  menu?.addEventListener('click', (e) => { if (e.target?.closest?.('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  const deskMq = window.matchMedia('(min-width: 56rem)');
  const onDesk = () => { if (deskMq.matches) setMenu(false); };
  try { deskMq.addEventListener('change', onDesk); } catch { deskMq.addListener?.(onDesk); }

  // Phone pagers: content that would overflow a phone screen sits on
  // horizontal pages instead. Tabs and dots follow the swipe and jump on tap.
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-pager]').forEach((pager) => {
    const pages = [...pager.children];
    const controls = [...document.querySelectorAll(`[data-pager-for="${pager.id}"] [data-page]`)];
    if (pages.length < 2 || !controls.length) return;

    const sync = () => {
      const step = pages[1].offsetLeft - pages[0].offsetLeft || pager.clientWidth;
      const atEnd = pager.scrollLeft >= pager.scrollWidth - pager.clientWidth - 2;
      const index = atEnd ? pages.length - 1 : Math.round(pager.scrollLeft / step);
      controls.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.page) === index)));
    };

    let queued = false;
    pager.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sync(); });
    }, { passive: true });

    controls.forEach((c) => c.addEventListener('click', () => {
      const page = pages[Number(c.dataset.page)];
      if (page) pager.scrollTo({ left: page.offsetLeft - pages[0].offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
    }));
    sync();
  });

  const panels = [...document.querySelectorAll('[data-panel]')];
  if (!panels.length) return;

  // Header backdrop and the active nav/pager item follow whichever panel is on screen
  const header = document.querySelector('.site-header');
  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"], .pager a[href^="#"]')];
  let activeId = null;

  const update = () => {
    const probe = (header?.offsetHeight || 64) / 2;
    const mid = window.innerHeight / 2;
    let under = panels[0];
    let active = panels[0];
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) under = p;
      if (r.top <= mid && r.bottom > mid) active = p;
    }
    root.dataset.solid = under.getBoundingClientRect().top < -2 ? 'true' : 'false';
    if (active.id !== activeId) {
      activeId = active.id;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === `#${activeId}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  // Phones: a deliberate flick moves exactly one screen. Snapping on its own
  // only advances once a flick would carry past half a screen, which on
  // Android needs a hard throw; here the swipe's direction decides, and the
  // snap stays as the resistance that settles small, hesitant drags back.
  const phonePaging = window.matchMedia('(max-width: 40rem) and (min-height: 46rem)');
  let touch = null;
  window.addEventListener('touchstart', (e) => {
    touch = null;
    if (!smooth || !phonePaging.matches || e.touches.length !== 1 || root.dataset.navOpen === 'true') return;
    const at = panels.findIndex((p) => Math.abs(p.offsetTop - window.scrollY) < 4);
    if (at < 0 || panels[at].offsetHeight > window.innerHeight + 2) return;
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), at };
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!touch) return;
    const { x, y, t, at } = touch;
    touch = null;
    const end = e.changedTouches[0];
    const dx = end.clientX - x;
    const dy = end.clientY - y;
    if (Math.abs(dy) < Math.abs(dx) * 1.2) return; // sideways: the pagers' business
    const speed = Math.abs(dy) / Math.max(performance.now() - t, 1); // px per ms
    const deliberate = Math.abs(dy) > window.innerHeight * 0.18 || (speed > 0.45 && Math.abs(dy) > 24);
    const target = panels[at + (dy < 0 ? 1 : -1)];
    if (deliberate && target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  }, { passive: true });

  // Each panel plays its entrance once, as it arrives
  const motion = root.classList.contains('motion');
  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    panels.forEach((p) => io.observe(p));
  } else {
    panels.forEach((p) => p.classList.add('is-in'));
  }

  // Hero rain: sparse hairlines drifting down — "this rain is not a real rain"
  const canvas = document.querySelector('[data-rain]');
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return;

  const SLANT = 0.16;
  let w = 0;
  let h = 0;
  let color = '#fff';
  let drops = [];
  let frame = 0;
  let last = 0;
  let running = false;
  let inView = true;

  const spawn = (anywhere) => {
    const len = 24 + Math.random() * 96;
    return {
      x: Math.random() * (w + h * SLANT),
      y: anywhere ? Math.random() * h : -len - Math.random() * h * 0.4,
      len,
      v: 0.05 + Math.random() * 0.13, // px per ms
      a: 0.05 + Math.random() * 0.2,
    };
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const d of drops) {
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * SLANT, d.y + d.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    color = getComputedStyle(canvas).color;
    drops = Array.from({ length: Math.round((w * h) / 9000) }, () => spawn(true));
    draw();
  };

  const tick = (t) => {
    const dt = last ? Math.min(t - last, 50) : 16;
    last = t;
    for (const d of drops) {
      d.y += d.v * dt;
      d.x -= d.v * dt * SLANT;
      if (d.y > h) Object.assign(d, spawn(false));
    }
    draw();
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running || !motion || !inView || document.hidden) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
  };

  size();
  start();

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(size, 150);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  document.addEventListener('themechange', () => {
    color = getComputedStyle(canvas).color;
    draw();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) start(); else stop();
    }).observe(canvas);
  }
})();
