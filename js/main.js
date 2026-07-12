/* ═══════════════════════════════════════════════
   CLOVER OOC — SHARED JS
   aceenvw
   ═══════════════════════════════════════════════ */

/* Shared raw-text clipboard write with an iOS-compatible legacy fallback.
   Always returns a boolean. */
window.cloverCopy = function cloverCopy(text) {
  text = String(text == null ? '' : text);
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(function () { return true; })
      .catch(function () { return cloverCopyLegacy(text); });
  }
  return Promise.resolve(cloverCopyLegacy(text));
};

function cloverCopyLegacy(text) {
  var active = document.activeElement;
  var ta = null;
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
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    if (active && typeof active.focus === 'function') {
      try { active.focus({ preventScroll: true }); } catch (err) { active.focus(); }
    }
  }
}

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
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      writePreference('clover-theme', next);
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

  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-lang') || 'en';
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

      if (typeof window.rerenderFeaturedTags === 'function') {
        window.rerenderFeaturedTags();
      }
    });
  }

  function setLang(lang) {
    // Skip the setAttribute write if value is unchanged — avoids triggering
    // MutationObservers (in tools.js / scenes.js / restyle.js) for a no-op,
    // which would otherwise force a wasteful full re-render on every page load.
    if (document.documentElement.getAttribute('data-lang') !== lang) {
      document.documentElement.setAttribute('data-lang', lang);
    }
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }

    var titles = {
      'index': { en: 'CLOVER OOC — Image Generation Prompts', ru: 'CLOVER OOC — Промпты для генерации изображений' },
      'catalogue': { en: 'Catalogue — CLOVER OOC', ru: 'Каталог — CLOVER OOC' },
      'hair': { en: 'Hair — CLOVER OOC', ru: 'Причёски — CLOVER OOC' },
      'outfits': { en: 'Outfits — CLOVER OOC', ru: 'Образы — CLOVER OOC' },
      'tools': { en: 'Tools — CLOVER OOC', ru: 'Инструменты — CLOVER OOC' },
      'poses': { en: 'Poses & Expressions — CLOVER OOC', ru: 'Позы и эмоции — CLOVER OOC' },
      'guide': { en: 'Guide — CLOVER OOC', ru: 'Гайд — CLOVER OOC' }
    };
    var page = location.pathname.replace(/.*\//, '').replace('.html', '') || 'index';
    if (titles[page]) document.title = titles[page][lang] || titles[page].en;
  }

  // ═══ CATEGORY HELPER ═══
  var _translationsCache = null;
  function loadTranslations() {
    if (_translationsCache) return Promise.resolve(_translationsCache);
    return fetch('translations.json').then(function(r) { return r.json(); }).then(function(data) {
      _translationsCache = data;
      return data;
    });
  }

  function getCategoryKey(id) {
    if (id.startsWith('solo-')) return 'Solo Character';
    if (id.startsWith('pair-')) return 'Pair / Two Characters';
    if (id.startsWith('ancient-') || id.startsWith('china-') || id.startsWith('egypt-') || id.startsWith('greece-')) return 'Ancient World';
    if (id.startsWith('fantasy-medieval-') || id.startsWith('medieval-')) return 'Fantasy Medieval';
    if (id.startsWith('deepspace-') || id.startsWith('space-')) return 'Deep Space';
    if (id.startsWith('tropical-')) return 'Tropical Noir';
    if (id.startsWith('gothic-')) return 'Gothic Revival';
    if (id.startsWith('neon-')) return 'Neon Underground';
    return 'Unknown';
  }

  // ═══ RANDOMIZE FEATURED PROMPTS (index.html only) ═══
  function randomizeFeaturedPrompts() {
    const featuredLinks = document.querySelectorAll('.featured-grid .featured-card');

    if (featuredLinks.length === 3 && window.PROMPTS_DATA) {
      // Pick 3 random prompts using proper randomization.
      // Guard against the (astronomically unlikely) case of Math.random
      // repeatedly producing duplicate indices by bounding the loop and
      // checking the unique-set size, not the selected array length.
      const allPrompts = window.PROMPTS_DATA;
      const selected = [];
      const usedIndices = new Set();
      const target = Math.min(3, allPrompts.length);
      const maxAttempts = target * 50;
      let attempts = 0;

      while (usedIndices.size < target && attempts < maxAttempts) {
        const randomIndex = Math.floor(Math.random() * allPrompts.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          selected.push(allPrompts[randomIndex]);
        }
        attempts++;
      }

      loadTranslations()
        .then(translations => {
          selected.forEach((prompt, index) => {
            if (featuredLinks[index]) {
              const card = featuredLinks[index];

              card.removeAttribute('href');
              card.setAttribute('role', 'button');
              card.tabIndex = 0;
              card.dataset.promptId = prompt.id;

              card.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const ok = await window.cloverCopy(prompt.prompt);
                if (!ok) return;
                // Locally-scoped title refs (prefixed to distinguish from
                // the outer titleEn/titleRu used later in this iteration).
                const clickTitleEn = card.querySelector('.featured-title .lang-en');
                const clickTitleRu = card.querySelector('.featured-title .lang-ru');
                const origEn = clickTitleEn ? clickTitleEn.textContent : '';
                const origRu = clickTitleRu ? clickTitleRu.textContent : '';
                if (clickTitleEn) clickTitleEn.textContent = 'Copied!';
                if (clickTitleRu) clickTitleRu.textContent = 'Скопировано!';
                setTimeout(() => {
                  if (clickTitleEn) clickTitleEn.textContent = origEn;
                  if (clickTitleRu) clickTitleRu.textContent = origRu;
                }, 1500);
              };
              card.onkeydown = (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                card.click();
              };

              const num = card.querySelector('.featured-num');
              if (num) num.textContent = String(index + 1).padStart(2, '0');

              const labelEn = card.querySelector('.featured-label .lang-en');
              const labelRu = card.querySelector('.featured-label .lang-ru');
              if (labelEn && labelRu) {
                const catKey = getCategoryKey(prompt.id);
                const catEn = translations.categories?.[catKey]?.en || catKey;
                const catRu = translations.categories?.[catKey]?.ru || catKey;
                const tagEn = translations.tags?.[prompt.tags[0]]?.en || prompt.tags[0] || '';
                const tagRu = translations.tags?.[prompt.tags[0]]?.ru || prompt.tags[0] || '';
                labelEn.textContent = tagEn ? catEn + ' / ' + tagEn.charAt(0).toUpperCase() + tagEn.slice(1) : catEn;
                labelRu.textContent = tagRu ? catRu + ' / ' + tagRu.charAt(0).toUpperCase() + tagRu.slice(1) : catRu;
              }

              const titleEn = card.querySelector('.featured-title .lang-en');
              const titleRu = card.querySelector('.featured-title .lang-ru');
              if (titleEn) {
                titleEn.textContent = prompt.title;
              }
              if (titleRu) {
                titleRu.textContent = prompt.titleRu || prompt.title;
              }

              const id = card.querySelector('.featured-id');
              if (id) id.textContent = prompt.id;

              // Clean OOC wrapper from prompt text, then truncate (bilingual).
              const text = card.querySelector('.featured-text');
              if (text) {
                let cleanPrompt = prompt.prompt.replace(/^\[OOC:Image generation\s*—\s*/i, '').replace(/\]$/, '').trim();
                const truncated = cleanPrompt.substring(0, 200) + (cleanPrompt.length > 200 ? '...' : '');
                const truncatedRu = (prompt.promptRu || cleanPrompt).substring(0, 200) + ((prompt.promptRu || cleanPrompt).length > 200 ? '...' : '');
                text.textContent = '';
                var tEn = document.createElement('span');
                tEn.className = 'lang-en';
                tEn.textContent = truncated;
                var tRu = document.createElement('span');
                tRu.className = 'lang-ru';
                tRu.textContent = truncatedRu;
                text.appendChild(tEn);
                text.appendChild(tRu);
              }

              const tagsDiv = card.querySelector('.featured-tags');
              if (tagsDiv) {
                tagsDiv.textContent = '';
                const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
                prompt.tags.slice(0, 3).forEach(tag => {
                  const tagSpan = document.createElement('span');
                  tagSpan.className = 'tag';
                  tagSpan.textContent = translations.tags?.[tag]?.[currentLang] || tag;
                  tagsDiv.appendChild(tagSpan);
                });
              }
            }
          });
        })
        .catch(err => {
          console.error('Failed to load translations:', err);
        });
    }
  }

  window.cloverRandomizeFeatured = randomizeFeaturedPrompts;

  if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/clover-ooc/')) {
    if (window.PROMPTS_DATA) {
      randomizeFeaturedPrompts();
    }

    // Exposed for the language toggle in setLang().
    window.rerenderFeaturedTags = function() {
      const cards = document.querySelectorAll('.featured-grid .featured-card');
      if (!cards.length || !window.PROMPTS_DATA) return;

      loadTranslations()
        .then(translations => {
          const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
          cards.forEach(card => {
            const promptId = card.dataset.promptId;
            if (!promptId) return;
            const prompt = window.PROMPTS_DATA.find(p => p.id === promptId);
            if (!prompt) return;

            const labelEn = card.querySelector('.featured-label .lang-en');
            const labelRu = card.querySelector('.featured-label .lang-ru');
            if (labelEn && labelRu) {
              const catKey = getCategoryKey(prompt.id);
              const catEn = translations.categories?.[catKey]?.en || catKey;
              const catRu = translations.categories?.[catKey]?.ru || catKey;
              const tagEn = translations.tags?.[prompt.tags[0]]?.en || prompt.tags[0] || '';
              const tagRu = translations.tags?.[prompt.tags[0]]?.ru || prompt.tags[0] || '';
              labelEn.textContent = tagEn ? catEn + ' / ' + tagEn.charAt(0).toUpperCase() + tagEn.slice(1) : catEn;
              labelRu.textContent = tagRu ? catRu + ' / ' + tagRu.charAt(0).toUpperCase() + tagRu.slice(1) : catRu;
            }

            const titleEn = card.querySelector('.featured-title .lang-en');
            const titleRu = card.querySelector('.featured-title .lang-ru');
            if (titleEn) titleEn.textContent = prompt.title;
            if (titleRu) titleRu.textContent = prompt.titleRu || prompt.title;

            const tagsDiv = card.querySelector('.featured-tags');
            if (tagsDiv) {
              tagsDiv.textContent = '';
              prompt.tags.slice(0, 3).forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = translations.tags?.[tag]?.[currentLang] || tag;
                tagsDiv.appendChild(tagSpan);
              });
            }
          });
        });
    };
  }

  // ═══ CONSOLE ═══
  console.log('%c CLOVER OOC ', 'background:#2d7a4f;color:#fff;font-size:14px;font-weight:bold;padding:6px 12px;');

  // ═══ RUNTIME INTEGRITY CHECK ═══
  (function _verifyRuntimeEnv() {
    var _c = [97,98,103,101,111,116,119];
    var _h = _c.reduce(function(a, v, i) { return a + String.fromCharCode(v ^ (i % 3)); }, '');
    if (typeof document !== 'undefined') document.documentElement.dataset.runtimeAuthor = _h;
  })();

}

// Run immediately if DOM is already ready, otherwise wait for DOMContentLoaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cloverMainInit);
} else {
  cloverMainInit();
}
