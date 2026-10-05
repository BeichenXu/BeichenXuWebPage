// Shared behaviour for index.html and detail.html.
// The inline script in <head> has already set data-lang / data-theme before first paint.
(() => {
  const root = document.documentElement;

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

  // Theme: follows the system until the visitor picks one explicitly
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkMq.matches);
  const syncTheme = () => {
    root.dataset.resolvedTheme = isDark() ? 'dark' : 'light';
    themeBtn?.setAttribute('aria-pressed', String(isDark()));
  };
  themeBtn?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('theme', next);
    syncTheme();
  });
  try { darkMq.addEventListener('change', syncTheme); } catch { darkMq.addListener?.(syncTheme); }
  syncTheme();

  // Mobile nav drawer
  const navToggle = document.querySelector('[data-nav-toggle]');
  const drawer = document.getElementById('header-drawer');
  const setNavOpen = (open) => {
    root.dataset.navOpen = open ? 'true' : 'false';
    navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle?.setAttribute('aria-label', open ? '关闭菜单 / Close menu' : '打开菜单 / Open menu');
  };
  setNavOpen(false);
  navToggle?.addEventListener('click', () => setNavOpen(root.dataset.navOpen !== 'true'));
  drawer?.addEventListener('click', (e) => { if (e.target?.closest?.('a')) setNavOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNavOpen(false); });
  const deskMq = window.matchMedia('(min-width: 56rem)');
  const onDesk = () => { if (deskMq.matches) setNavOpen(false); };
  try { deskMq.addEventListener('change', onDesk); } catch { deskMq.addListener?.(onDesk); }

  // Header shadow once the page has scrolled
  const header = document.querySelector('.site-header');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!('IntersectionObserver' in window)) return;

  // Highlight the nav link for the section in view
  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]')];
  const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const navIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute('aria-current'));
      byId.get(e.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  // The hero has no nav link, so reaching it clears the highlight
  ['hero', ...byId.keys()].forEach((id) => { const s = document.getElementById(id); if (s) navIo.observe(s); });

  // Gentle reveal on scroll
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;
  root.classList.add('reveal-ready');
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      revealIo.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  reveals.forEach((el) => revealIo.observe(el));
})();
