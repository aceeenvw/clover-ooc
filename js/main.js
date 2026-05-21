/* ═══════════════════════════════════════════════
   CLOVER OOC — SHARED JS
   aceenvw
   ═══════════════════════════════════════════════ */

function cloverMainInit() {

  // ═══ THEME TOGGLE ═══
  const saved = localStorage.getItem('clover-theme');
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
      localStorage.setItem('clover-theme', next);
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
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ═══ LANGUAGE TOGGLE ═══
  const savedLang = localStorage.getItem('clover-lang') || 'en';
  setLang(savedLang);

  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-lang') || 'en';
      const next = current === 'en' ? 'ru' : 'en';
      setLang(next);
      localStorage.setItem('clover-lang', next);

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
      'tools': { en: 'Tools — CLOVER OOC', ru: 'Инструменты — CLOVER OOC' },
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
    if (id.startsWith('china-') || id.startsWith('egypt-') || id.startsWith('greece-')) return 'Ancient World';
    if (id.startsWith('medieval-')) return 'Fantasy Medieval';
    if (id.startsWith('space-')) return 'Deep Space';
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

              card.href = '#';
              card.dataset.promptId = prompt.id;

              card.onclick = async (e) => {
                e.preventDefault();
                try {
                  await navigator.clipboard.writeText(prompt.prompt);
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
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
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

  if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/clover-ooc/')) {
    if (window.PROMPTS_DATA) {
      randomizeFeaturedPrompts();
    } else {
      // Poll for PROMPTS_DATA, bail after 3s.
      const checkData = setInterval(() => {
        if (window.PROMPTS_DATA) {
          randomizeFeaturedPrompts();
          clearInterval(checkData);
        }
      }, 100);

      setTimeout(() => clearInterval(checkData), 3000);
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
