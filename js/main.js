/* ═══════════════════════════════════════════════
   CLOVER OOC - SHARED JS
   aceenvw
   ═══════════════════════════════════════════════ */

/* Shared raw-text clipboard write with an iOS-compatible legacy fallback.
   Always returns a boolean. */
window.cloverCopy = function cloverCopy(text) {
  text = String(text == null ? '' : text);
  if (navigator.clipboard && window.isSecureContext) {
    if (navigator.clipboard.write && window.ClipboardItem) {
      var item = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      return navigator.clipboard.write([item]).then(function () { return true; })
        .catch(function () {
          if (!navigator.clipboard.writeText) return cloverCopyLegacy(text);
          return navigator.clipboard.writeText(text).then(function () { return true; })
            .catch(function () { return cloverCopyLegacy(text); });
        });
    }
    if (navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return cloverCopyLegacy(text); });
    }
  }
  return Promise.resolve(cloverCopyLegacy(text));
};

function cloverCopyLegacy(text) {
  var active = document.activeElement;
  var ta = null;
  var forcePlainText = null;
  try {
    ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.inset = '0 auto auto 0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.opacity = '0.01';
    ta.style.fontSize = '16px';
    forcePlainText = function (event) {
      if (!event.clipboardData) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', text);
    };
    ta.addEventListener('copy', forcePlainText);
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = document.execCommand('copy');
    return ok;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  } finally {
    if (ta && forcePlainText) ta.removeEventListener('copy', forcePlainText);
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    if (active && typeof active.focus === 'function') {
      try { active.focus({ preventScroll: true }); } catch (err) { active.focus(); }
    }
  }
}

var CLOVER_MARK_PATHS =
  '<path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/>' +
  '<path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/>';

/* Shared clover mark used wherever a reference render is absent. */
window.cloverPlaceholder = function cloverPlaceholder(className) {
  var wrap = document.createElement('div');
  wrap.className = className || 'clover-placeholder';
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 240');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  var markup = '';
  for (var deg = 0; deg < 360; deg += 90) {
    markup += '<g transform="rotate(' + deg + ' 100 100)">' + CLOVER_MARK_PATHS + '</g>';
  }
  svg.innerHTML = markup;
  wrap.appendChild(svg);
  return wrap;
};

/* Active interface language. Single source of truth for every page. */
window.cloverLang = function cloverLang() {
  return document.documentElement.getAttribute('data-lang') || 'en';
};

/* ═══ TOAST (shared transient notification) ═══ */
/* One #clover-toast node per document, created on first use and reused after.
   Callers pass both languages; the active one is chosen at display time. */
window.cloverToast = function cloverToast(messageEn, messageRu) {
  var toast = document.getElementById('clover-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'clover-toast';
    toast.className = 'clover-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = window.cloverLang() === 'ru' ? messageRu : messageEn;
  toast.classList.add('visible');
  clearTimeout(cloverToast._timer);
  cloverToast._timer = setTimeout(function () {
    toast.classList.remove('visible');
  }, 2200);
};

function cloverMainInit() {
  function readPreference(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  }

  function writePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (err) {}
  }

  // ═══ THEME TOGGLE ═══
  const saved = readPreference('clover-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const toggle = document.getElementById('themeToggle');
  const langBtn = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      writePreference('clover-theme', next);
      updatePreferenceLabels();
    });
  }

  // ═══ MOBILE NAV ═══
  const burger = document.getElementById('navBurger');
  const mobileNav = document.getElementById('navMobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', mobileNav.classList.contains('open'));
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', (e) => {
      if (!burger.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 700 && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    }, { passive: true });
    window.addEventListener('scroll', () => {
      if (mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    }, { passive: true });
  }

  // ═══ FADE IN ON SCROLL ═══
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // ═══ SMOOTH SCROLL ═══
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        if (this.classList.contains('sr-only')) target.focus({ preventScroll: true });
      }
    });
  });

  // ═══ LANGUAGE TOGGLE ═══
  const savedLang = readPreference('clover-lang') || 'en';
  setLang(savedLang);

  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const current = window.cloverLang();
      const next = current === 'en' ? 'ru' : 'en';
      setLang(next);
      writePreference('clover-lang', next);

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        if (next === 'en') {
          searchInput.placeholder = 'Search prompts...';
        } else {
          searchInput.placeholder = 'Поиск промптов...';
        }
      }

      if (typeof window.catalogueRerender === 'function') {
        window.catalogueRerender();
      }
    });
  }

  function updatePreferenceLabels() {
    const isRu = window.cloverLang() === 'ru';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (toggle) {
      const label = isRu
        ? (isDark ? 'Включить светлую тему' : 'Включить тёмную тему')
        : (isDark ? 'Switch to light theme' : 'Switch to dark theme');
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
    if (langBtn) {
      const label = isRu ? 'EN / RU — Переключить на английский' : 'EN / RU — Switch to Russian';
      langBtn.setAttribute('aria-label', label);
      langBtn.title = label;
    }
  }

  function setLang(lang) {
    // Skip the setAttribute write if value is unchanged - avoids triggering
    // MutationObservers (in tools.js / scenes.js / restyle.js) for a no-op,
    // which would otherwise force a wasteful full re-render on every page load.
    if (document.documentElement.getAttribute('data-lang') !== lang) {
      document.documentElement.setAttribute('data-lang', lang);
    }
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }

    var labels = lang === 'ru'
      ? { start: 'CLOVER — Главная', menu: 'Меню', close: 'Закрыть', top: 'Наверх' }
      : { start: 'CLOVER — start page', menu: 'Menu', close: 'Close', top: 'Scroll to top' };
    var labelTargets = [
      ['.nav-logo', labels.start],
      ['#navBurger', labels.menu],
      ['.modal-close', labels.close],
      ['.makeup-modal-close', labels.close],
      ['.scroll-to-top', labels.top],
    ];
    labelTargets.forEach(function(entry) {
      document.querySelectorAll(entry[0]).forEach(function(element) {
        element.setAttribute('aria-label', entry[1]);
      });
    });
    updatePreferenceLabels();

    var titles = {
      'index': { en: 'CLOVER OOC - Image Generation Prompts', ru: 'CLOVER OOC - Промпты для генерации изображений' },
      'catalogue': { en: 'Catalogue - CLOVER OOC', ru: 'Каталог - CLOVER OOC' },
      'scenes': { en: 'Scenes - CLOVER OOC', ru: 'Сцены - CLOVER OOC' },
      'restyle': { en: 'Restyle - CLOVER OOC', ru: 'Рестайл - CLOVER OOC' },
      'hair': { en: 'Hair - CLOVER OOC', ru: 'Причёски - CLOVER OOC' },
      'makeup': { en: 'Makeup - CLOVER OOC', ru: 'Макияж - CLOVER OOC' },
      'outfits': { en: 'Outfits - CLOVER OOC', ru: 'Образы - CLOVER OOC' },
      'tools': { en: 'Tools - CLOVER OOC', ru: 'Инструменты - CLOVER OOC' },
      'poses': { en: 'Poses & Expressions - CLOVER OOC', ru: 'Позы и эмоции - CLOVER OOC' },
      'guide': { en: 'Guide - CLOVER OOC', ru: 'Гайд - CLOVER OOC' }
    };
    var page = location.pathname.replace(/.*\//, '').replace('.html', '') || 'index';
    if (titles[page]) document.title = titles[page][lang] || titles[page].en;
  }
}

// Run immediately if DOM is already ready, otherwise wait for DOMContentLoaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cloverMainInit);
} else {
  cloverMainInit();
}
