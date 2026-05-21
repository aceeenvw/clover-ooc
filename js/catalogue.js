/* ═══════════════════════════════════════════════
   CLOVER OOC — CATALOGUE JS
   Search, filters, grid/list views, modal.
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ═══ HELPERS ═══
  function getTitle(prompt) {
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    return (lang === 'ru' && prompt.titleRu) ? prompt.titleRu : prompt.title;
  }

  // ═══ STATE ═══
  let allPrompts = [];
  let filteredPrompts = [];
  let activeTags = new Set();
  let searchQuery = '';
  let currentView = 'grid';
  let translations = {};

  // ═══ DOM ═══
  const promptsGrid = document.getElementById('prompts-grid');
  const searchInput = document.getElementById('search-input');
  const tagsFilter = document.getElementById('tags-filter');
  const viewToggles = document.querySelectorAll('.view-toggle');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const resultsCount = document.getElementById('results-count');
  const modal = document.getElementById('prompt-modal');
  const modalOverlay = modal.querySelector('.modal-overlay');
  const modalClose = modal.querySelector('.modal-close');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // ═══ INIT ═══
  async function init() {
    if (!window.PROMPTS_DATA) {
      console.error('PROMPTS_DATA not found');
      return;
    }

    allPrompts = window.PROMPTS_DATA;
    filteredPrompts = [...allPrompts];

    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.remove();

    try {
      const response = await fetch('translations.json');
      translations = await response.json();
    } catch (err) {
      console.error('Failed to load translations:', err);
      translations = { tags: {}, categories: {} };
    }

    renderTagsFilter();
    renderPrompts();
    attachEventListeners();
    updateSearchPlaceholder();
    initStickyFilters();
  }

  // ═══ SEARCH PLACEHOLDER (lang-aware) ═══
  function updateSearchPlaceholder() {
    const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
    if (currentLang === 'en') {
      searchInput.placeholder = 'Search prompts...';
    } else {
      searchInput.placeholder = 'Поиск промптов...';
    }
  }

  // ═══ TAGS ═══
  function getAllTags() {
    const tagsSet = new Set();
    allPrompts.forEach(prompt => {
      prompt.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }

  function renderTagsFilter() {
    const tags = getAllTags();
    tagsFilter.textContent = '';
    const currentLang = document.documentElement.getAttribute('data-lang') || 'en';

    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-pill';
      btn.dataset.tag = tag;
      btn.setAttribute('aria-pressed', activeTags.has(tag) ? 'true' : 'false');

      if (activeTags.has(tag)) btn.classList.add('active');

      const spanEn = document.createElement('span');
      spanEn.className = 'lang-en';
      spanEn.textContent = translations.tags?.[tag]?.en || tag;

      const spanRu = document.createElement('span');
      spanRu.className = 'lang-ru';
      spanRu.textContent = translations.tags?.[tag]?.ru || tag;

      btn.appendChild(spanEn);
      btn.appendChild(spanRu);
      tagsFilter.appendChild(btn);
    });
  }

  // ═══ FILTER / SEARCH ═══
  function filterPrompts() {
    filteredPrompts = allPrompts.filter(prompt => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = prompt.title.toLowerCase().includes(query);
        const matchPrompt = prompt.prompt.toLowerCase().includes(query);
        const matchTags = prompt.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchPrompt && !matchTags) return false;
      }

      if (activeTags.size > 0) {
        const hasAllTags = [...activeTags].every(tag => prompt.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });

    updateResultsCount();
    renderPrompts();
  }

  function updateResultsCount() {
    const countEn = resultsCount.querySelector('.lang-en strong');
    const countRu = resultsCount.querySelector('.lang-ru strong');
    if (countEn) countEn.textContent = filteredPrompts.length;
    if (countRu) countRu.textContent = filteredPrompts.length;
  }

  // ═══ DOM BUILDERS ═══
  function createSVG(width, height, paths) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');

    paths.forEach(pathData => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', pathData.type || 'path');
      Object.keys(pathData).forEach(key => {
        if (key !== 'type') {
          path.setAttribute(key, pathData[key]);
        }
      });
      svg.appendChild(path);
    });

    return svg;
  }

  function createPlaceholder() {
    const div = document.createElement('div');
    div.className = 'placeholder-inner';

    const svg = createSVG('24', '24', [
      { type: 'rect', x: '3', y: '3', width: '18', height: '18', rx: '2' },
      { type: 'circle', cx: '8.5', cy: '8.5', r: '1.5' },
      { d: 'm21 15-5-5L5 21' }
    ]);

    const span = document.createElement('span');
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    span.textContent = lang === 'en' ? 'image coming soon' : 'скоро будет';

    div.appendChild(svg);
    div.appendChild(span);
    return div;
  }

  // Solo/Pair badge for prompts in mixed categories. Returns null for the
  // top-level Solo/Pair categories (those are already grouped by kind).
  function createKindBadge(prompt) {
    const id = prompt.id || '';
    if (id.startsWith('solo-') || id.startsWith('pair-')) return null;

    let kind = null;
    if (id.includes('-solo-')) kind = 'solo';
    else if (id.includes('-pair-')) kind = 'pair';
    if (!kind) return null;

    const span = document.createElement('span');
    span.className = `prompt-kind-badge prompt-kind-${kind}`;

    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const labels = translations.kind?.[kind];
    span.textContent = (labels && labels[lang]) || (kind === 'solo' ? 'Solo' : 'Pair');

    return span;
  }

  // ═══ RENDER ═══
  function renderPrompts() {
    promptsGrid.textContent = '';

    if (filteredPrompts.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';

      const svg = createSVG('48', '48', [
        { type: 'circle', cx: '11', cy: '11', r: '8' },
        { d: 'm21 21-4.35-4.35' }
      ]);

      const h3En = document.createElement('h3');
      h3En.className = 'lang-en';
      h3En.textContent = 'No prompts found';

      const h3Ru = document.createElement('h3');
      h3Ru.className = 'lang-ru';
      h3Ru.textContent = 'Промпты не найдены';

      const pEn = document.createElement('p');
      pEn.className = 'lang-en';
      pEn.textContent = 'Try adjusting your filters or search query';

      const pRu = document.createElement('p');
      pRu.className = 'lang-ru';
      pRu.textContent = 'Попробуй изменить фильтры или поисковый запрос';

      noResults.appendChild(svg);
      noResults.appendChild(h3En);
      noResults.appendChild(h3Ru);
      noResults.appendChild(pEn);
      noResults.appendChild(pRu);

      promptsGrid.appendChild(noResults);
      return;
    }

    if (currentView === 'grid') {
      renderGridView();
    } else {
      renderListView();
    }
  }

  function groupPromptsByCategory(prompts) {
    const categories = {
      'Solo Character': { prompts: [], order: 1 },
      'Pair / Two Characters': { prompts: [], order: 2 },
      'Ancient World': { prompts: [], order: 3 },
      'Fantasy Medieval': { prompts: [], order: 4 },
      'Deep Space': { prompts: [], order: 5 },
      'Tropical Noir': { prompts: [], order: 6 },
      'Gothic Revival': { prompts: [], order: 7 },
      'Neon Underground': { prompts: [], order: 8 }
    };

    prompts.forEach(prompt => {
      if (prompt.id.startsWith('solo-')) {
        categories['Solo Character'].prompts.push(prompt);
      } else if (prompt.id.startsWith('pair-')) {
        categories['Pair / Two Characters'].prompts.push(prompt);
      } else if (prompt.id.startsWith('china-') || prompt.id.startsWith('egypt-') || prompt.id.startsWith('greece-')) {
        categories['Ancient World'].prompts.push(prompt);
      } else if (prompt.id.startsWith('medieval-')) {
        categories['Fantasy Medieval'].prompts.push(prompt);
      } else if (prompt.id.startsWith('space-')) {
        categories['Deep Space'].prompts.push(prompt);
      } else if (prompt.id.startsWith('tropical-')) {
        categories['Tropical Noir'].prompts.push(prompt);
      } else if (prompt.id.startsWith('gothic-')) {
        categories['Gothic Revival'].prompts.push(prompt);
      } else if (prompt.id.startsWith('neon-')) {
        categories['Neon Underground'].prompts.push(prompt);
      }
    });

    return Object.entries(categories)
      .filter(([_, data]) => data.prompts.length > 0)
      .sort((a, b) => a[1].order - b[1].order);
  }

  function createCategoryHeader(categoryName, count) {
    const header = document.createElement('div');
    header.className = 'category-header';

    // Map category names to simple IDs for navigation anchors.
    const categoryIdMap = {
      'Solo Character': 'solo',
      'Pair / Two Characters': 'pair',
      'Ancient World': 'ancient',
      'Fantasy Medieval': 'fantasy',
      'Deep Space': 'space',
      'Tropical Noir': 'tropical',
      'Gothic Revival': 'gothic',
      'Neon Underground': 'neon'
    };

    header.id = categoryIdMap[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');

    const title = document.createElement('h2');
    title.className = 'category-title';

    const spanEn = document.createElement('span');
    spanEn.className = 'lang-en';
    spanEn.textContent = translations.categories?.[categoryName]?.en || categoryName;

    const spanRu = document.createElement('span');
    spanRu.className = 'lang-ru';
    spanRu.textContent = translations.categories?.[categoryName]?.ru || categoryName;

    title.appendChild(spanEn);
    title.appendChild(spanRu);

    const countSpan = document.createElement('span');
    countSpan.className = 'category-count';
    countSpan.textContent = count;

    header.appendChild(title);
    header.appendChild(countSpan);

    return header;
  }

  function createGridCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.promptId = prompt.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(prompt.id); }
    });

    const imagePlaceholder = document.createElement('div');
    imagePlaceholder.className = 'prompt-image-placeholder';
    if (prompt.hasImage) imagePlaceholder.classList.add('has-image');

    if (prompt.hasImage && prompt.imgSrc) {
      const img = document.createElement('img');
      img.src = prompt.imgSrc;
      img.alt = prompt.title;
      img.loading = 'lazy';
      img.draggable = false;
      img.oncontextmenu = () => false;
      imagePlaceholder.appendChild(img);
    } else {
      imagePlaceholder.appendChild(createPlaceholder());
    }

    const content = document.createElement('div');
    content.className = 'prompt-card-content';

    const titleRow = document.createElement('div');
    titleRow.className = 'prompt-title-row';

    const number = document.createElement('span');
    number.className = 'prompt-number';
    number.textContent = `#${prompt.number}`;

    const title = document.createElement('h3');
    title.className = 'prompt-title';
    title.textContent = getTitle(prompt);

    titleRow.appendChild(number);
    titleRow.appendChild(title);

    const kindBadge = createKindBadge(prompt);
    if (kindBadge) titleRow.appendChild(kindBadge);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'prompt-tags';
    prompt.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'prompt-tag';

      const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
      tagSpan.textContent = translations.tags?.[tag]?.[currentLang] || tag;

      tagsDiv.appendChild(tagSpan);
    });

    const preview = document.createElement('div');
    preview.className = 'prompt-preview';
    preview.textContent = prompt.prompt.substring(0, 150) + '...';

    content.appendChild(titleRow);
    content.appendChild(tagsDiv);
    content.appendChild(preview);

    card.appendChild(imagePlaceholder);
    card.appendChild(content);

    return card;
  }

  function createListCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.promptId = prompt.id;

    const imagePlaceholder = document.createElement('div');
    imagePlaceholder.className = 'prompt-image-placeholder';
    if (prompt.hasImage) imagePlaceholder.classList.add('has-image');

    if (prompt.hasImage && prompt.imgSrc) {
      const img = document.createElement('img');
      img.src = prompt.imgSrc;
      img.alt = prompt.title;
      img.loading = 'lazy';
      img.draggable = false;
      img.oncontextmenu = () => false;
      imagePlaceholder.appendChild(img);
    } else {
      imagePlaceholder.appendChild(createPlaceholder());
    }

    const content = document.createElement('div');
    content.className = 'prompt-card-content';

    const titleRow = document.createElement('div');
    titleRow.className = 'prompt-title-row';

    const number = document.createElement('span');
    number.className = 'prompt-number';
    number.textContent = `#${prompt.number}`;

    const title = document.createElement('h3');
    title.className = 'prompt-title';
    title.textContent = getTitle(prompt);

    titleRow.appendChild(number);
    titleRow.appendChild(title);

    const kindBadge = createKindBadge(prompt);
    if (kindBadge) titleRow.appendChild(kindBadge);

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'prompt-tags';
    prompt.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'prompt-tag';

      const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
      tagSpan.textContent = translations.tags?.[tag]?.[currentLang] || tag;

      tagsDiv.appendChild(tagSpan);
    });

    const fullText = document.createElement('div');
    fullText.className = 'prompt-full-text';
    fullText.textContent = prompt.prompt;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.dataset.promptId = prompt.id;

    const copySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    copySvg.setAttribute('width', '16');
    copySvg.setAttribute('height', '16');
    copySvg.setAttribute('viewBox', '0 0 24 24');
    copySvg.setAttribute('fill', 'none');
    copySvg.setAttribute('stroke', 'currentColor');
    copySvg.setAttribute('stroke-width', '2');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9');
    rect.setAttribute('y', '9');
    rect.setAttribute('width', '13');
    rect.setAttribute('height', '13');
    rect.setAttribute('rx', '2');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

    copySvg.appendChild(rect);
    copySvg.appendChild(path);

    const spanEn = document.createElement('span');
    spanEn.className = 'lang-en';
    spanEn.textContent = 'Copy';

    const spanRu = document.createElement('span');
    spanRu.className = 'lang-ru';
    spanRu.textContent = 'Копировать';

    copyBtn.appendChild(copySvg);
    copyBtn.appendChild(spanEn);
    copyBtn.appendChild(spanRu);

    content.appendChild(titleRow);
    content.appendChild(tagsDiv);
    content.appendChild(fullText);
    content.appendChild(copyBtn);

    card.appendChild(imagePlaceholder);
    card.appendChild(content);

    return card;
  }

  function renderGridView() {
    const grouped = groupPromptsByCategory(filteredPrompts);

    grouped.forEach(([categoryName, data]) => {
      promptsGrid.appendChild(createCategoryHeader(categoryName, data.prompts.length));

      const categoryGrid = document.createElement('div');
      categoryGrid.className = 'category-grid';

      data.prompts.forEach(prompt => {
        categoryGrid.appendChild(createGridCard(prompt));
      });

      promptsGrid.appendChild(categoryGrid);
    });
  }

  function renderListView() {
    const grouped = groupPromptsByCategory(filteredPrompts);

    grouped.forEach(([categoryName, data]) => {
      promptsGrid.appendChild(createCategoryHeader(categoryName, data.prompts.length));

      const categoryList = document.createElement('div');
      categoryList.className = 'category-list';

      data.prompts.forEach(prompt => {
        categoryList.appendChild(createListCard(prompt));
      });

      promptsGrid.appendChild(categoryList);
    });
  }

  // ═══ MODAL ═══
  function openModal(promptId) {
    const prompt = allPrompts.find(p => p.id === promptId);
    if (!prompt) return;

    modal.querySelector('.modal-content').dataset.promptId = prompt.id;
    modal.querySelector('.modal-number').textContent = `#${prompt.number}`;
    modal.querySelector('.modal-title').textContent = getTitle(prompt);

    // Refresh Solo/Pair badge (modal is reused across prompts).
    const modalTitleRow = modal.querySelector('.modal-title-row');
    const existingBadge = modalTitleRow.querySelector('.prompt-kind-badge');
    if (existingBadge) existingBadge.remove();
    const modalBadge = createKindBadge(prompt);
    if (modalBadge) modalTitleRow.appendChild(modalBadge);

    const modalTags = modal.querySelector('.modal-tags');
    modalTags.textContent = '';
    prompt.tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'prompt-tag';

      const currentLang = document.documentElement.getAttribute('data-lang') || 'en';
      span.textContent = translations.tags?.[tag]?.[currentLang] || tag;

      modalTags.appendChild(span);
    });

    const imageContainer = modal.querySelector('.modal-image-container');
    imageContainer.textContent = '';

    if (prompt.hasImage && prompt.imgSrc) {
      const img = document.createElement('img');
      img.src = prompt.imgSrc;
      img.alt = prompt.title;
      img.draggable = false;
      img.oncontextmenu = () => false;
      imageContainer.appendChild(img);
    } else {
      imageContainer.appendChild(createPlaceholder());
    }

    modal.querySelector('.modal-prompt-text code').textContent = prompt.prompt;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal._trigger = document.activeElement;
    modal.querySelector('.modal-close').focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (modal._trigger) {
      modal._trigger.focus();
      modal._trigger = null;
    }
  }

  async function copyPrompt(promptId) {
    const prompt = allPrompts.find(p => p.id === promptId);
    if (!prompt) return false;

    try {
      await navigator.clipboard.writeText(prompt.prompt);
      return true;
    } catch (e) {
      console.error('Failed to copy:', e);
      return false;
    }
  }

  // ═══ EVENT LISTENERS ═══
  function attachEventListeners() {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      filterPrompts();
    });

    const randomBtn = document.getElementById('random-btn');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        const pool = filteredPrompts.length > 0 ? filteredPrompts : allPrompts;
        const random = pool[Math.floor(Math.random() * pool.length)];
        randomBtn.classList.remove('pulsed');
        void randomBtn.offsetWidth;
        randomBtn.classList.add('pulsed');
        openModal(random.id);
      });
    }

    document.querySelectorAll('.category-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    });

    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
      // Focus trap (modal is open).
      if (e.key === 'Tab' && modal.classList.contains('active')) {
        const focusable = Array.from(
          modal.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    tagsFilter.addEventListener('click', (e) => {
      const tagBtn = e.target.closest('.tag-pill');
      if (!tagBtn) return;

      const tag = tagBtn.dataset.tag;
      if (activeTags.has(tag)) {
        activeTags.delete(tag);
        tagBtn.classList.remove('active');
        tagBtn.setAttribute('aria-pressed', 'false');
      } else {
        activeTags.add(tag);
        tagBtn.classList.add('active');
        tagBtn.setAttribute('aria-pressed', 'true');
      }

      filterPrompts();
    });

    viewToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const view = toggle.dataset.view;
        if (view === currentView) return;

        currentView = view;
        promptsGrid.dataset.view = view;

        viewToggles.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-pressed', 'false');
        });
        toggle.classList.add('active');
        toggle.setAttribute('aria-pressed', 'true');

        renderPrompts();
      });
    });

    clearFiltersBtn.addEventListener('click', () => {
      searchQuery = '';
      searchInput.value = '';
      activeTags.clear();

      document.querySelectorAll('.tag-pill').forEach(pill => {
        pill.classList.remove('active');
        pill.setAttribute('aria-pressed', 'false');
      });

      filterPrompts();
    });

    promptsGrid.addEventListener('click', async (e) => {
      if (currentView === 'grid') {
        const card = e.target.closest('.prompt-card');
        if (card) {
          openModal(card.dataset.promptId);
        }
      }

      if (currentView === 'list') {
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
          const success = await copyPrompt(copyBtn.dataset.promptId);
          if (success) {
            copyBtn.classList.add('copied');
            copyBtn.querySelector('.lang-en').textContent = 'Copied!';
            copyBtn.querySelector('.lang-ru').textContent = 'Скопировано!';
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.querySelector('.lang-en').textContent = 'Copy';
              copyBtn.querySelector('.lang-ru').textContent = 'Копировать';
            }, 2000);
          }
        }
      }
    });

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    modal.querySelector('.modal-copy-btn').addEventListener('click', async (e) => {
      const promptId = e.currentTarget.closest('.modal-content').dataset.promptId;
      const success = await copyPrompt(promptId);
      if (success) {
        const btn = modal.querySelector('.modal-copy-btn');
        const origEn = btn.querySelector('.lang-en').textContent;
        const origRu = btn.querySelector('.lang-ru').textContent;
        btn.querySelector('.lang-en').textContent = 'Copied!';
        btn.querySelector('.lang-ru').textContent = 'Скопировано!';
        setTimeout(() => {
          btn.querySelector('.lang-en').textContent = origEn;
          btn.querySelector('.lang-ru').textContent = origRu;
        }, 2000);
      }
    });
  }

  // ═══ STICKY FILTER BAR SHADOW ═══
  function initStickyFilters() {
    const strip = document.querySelector('.filters-strip');
    if (!strip) return;
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;width:1px;position:absolute;top:0;left:0;pointer-events:none;';
    strip.parentNode.insertBefore(sentinel, strip);

    const stickyObs = new IntersectionObserver(([entry]) => {
      strip.classList.toggle('stuck', !entry.isIntersecting);
    }, { threshold: 0, rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56}px 0px 0px 0px` });

    stickyObs.observe(sentinel);
  }

  // ═══ BOOT ═══
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposed for the language toggle in main.js.
  window.catalogueRerender = function() {
    updateSearchPlaceholder();
    renderTagsFilter();
    renderPrompts();
  };
})();
