/* ═══════════════════════════════════════════════
   CLOVER OOC — RESTYLE JS
   Mirrors scenes.js (same accordion + card + search behavior).
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  if (!window.RESTYLE_DATA || !Array.isArray(window.RESTYLE_DATA.sections)) {
    console.error('Restyle data not loaded');
    return;
  }

  const data = window.RESTYLE_DATA;
  const root = document.getElementById('restyle-sections');
  const searchInput = document.getElementById('restyle-search');
  const resultCount = document.getElementById('restyle-result-count');
  const searchWrap = document.querySelector('.scenes-search-wrap');

  // Track open/closed state per section ID
  const openState = {};
  data.sections.forEach((s, i) => { openState[s.id] = (i === 0); });

  // Track expanded body per prompt (sectionId|promptId)
  const expandedBodies = new Set();

  let currentFilter = '';

  // ═══ HELPERS ═══
  function getLang() {
    return document.documentElement.getAttribute('data-lang') || 'en';
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function matchesFilter(prompt, filterLower) {
    if (!filterLower) return true;
    return (
      prompt.title.toLowerCase().includes(filterLower) ||
      (prompt.titleRu && prompt.titleRu.toLowerCase().includes(filterLower)) ||
      prompt.description.toLowerCase().includes(filterLower) ||
      (prompt.descriptionRu && prompt.descriptionRu.toLowerCase().includes(filterLower)) ||
      prompt.body.toLowerCase().includes(filterLower) ||
      prompt.id.toLowerCase().includes(filterLower)
    );
  }

  // ═══ TOAST ═══
  let toastTimer = null;
  function showToast(msgEn, msgRu) {
    let toast = document.getElementById('clover-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'clover-toast';
      toast.className = 'clover-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = getLang() === 'ru' ? msgRu : msgEn;
    toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  // ═══ CARD BUILDER ═══
  function buildCard(prompt, sectionId) {
    const key = sectionId + '|' + prompt.id;

    const card = document.createElement('article');
    card.className = 'scene-card';
    card.setAttribute('data-prompt-id', prompt.id);

    const head = document.createElement('div');
    head.className = 'scene-card-head';

    const idBadge = document.createElement('span');
    idBadge.className = 'scene-card-id';
    idBadge.textContent = prompt.id;
    head.appendChild(idBadge);

    const title = document.createElement('h3');
    title.className = 'scene-card-title';
    title.textContent = getLang() === 'ru' && prompt.titleRu ? prompt.titleRu : prompt.title;
    head.appendChild(title);

    card.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'scene-card-desc';
    desc.textContent = getLang() === 'ru' && prompt.descriptionRu ? prompt.descriptionRu : prompt.description;
    card.appendChild(desc);

    // Body — click anywhere on it to copy the full prompt.
    const isExpanded = expandedBodies.has(key);
    const bodyEl = document.createElement('div');
    bodyEl.className = 'scene-card-body' + (isExpanded ? '' : ' is-collapsed');
    bodyEl.setAttribute('role', 'button');
    bodyEl.setAttribute('tabindex', '0');
    bodyEl.setAttribute('aria-label',
      getLang() === 'ru' ? 'Скопировать рестайл-промпт' : 'Copy restyle prompt to clipboard');

    const bodyText = document.createElement('span');
    bodyText.className = 'scene-card-body-text';
    bodyText.textContent = prompt.body;
    bodyEl.appendChild(bodyText);

    async function copyBody() {
      const ok = await window.cloverCopy(prompt.body);
      if (ok) {
        bodyEl.classList.add('is-copied');
        setTimeout(() => bodyEl.classList.remove('is-copied'), 900);
        showToast('Copied to clipboard', 'Скопировано в буфер');
      } else {
        showToast('Copy failed', 'Не удалось скопировать');
      }
    }

    bodyEl.addEventListener('click', copyBody);
    bodyEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyBody();
      }
    });

    card.appendChild(bodyEl);

    const controls = document.createElement('div');
    controls.className = 'scene-card-controls';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'scene-card-toggle';
    const toggleEn = document.createElement('span');
    toggleEn.className = 'lang-en';
    toggleEn.textContent = isExpanded ? 'Collapse' : 'Read full';
    const toggleRu = document.createElement('span');
    toggleRu.className = 'lang-ru';
    toggleRu.textContent = isExpanded ? 'Свернуть' : 'Развернуть';
    toggle.appendChild(toggleEn);
    toggle.appendChild(toggleRu);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowExpanded = bodyEl.classList.toggle('is-collapsed') === false;
      if (nowExpanded) {
        expandedBodies.add(key);
        toggleEn.textContent = 'Collapse';
        toggleRu.textContent = 'Свернуть';
      } else {
        expandedBodies.delete(key);
        toggleEn.textContent = 'Read full';
        toggleRu.textContent = 'Развернуть';
      }
    });

    controls.appendChild(toggle);

    const hint = document.createElement('span');
    hint.className = 'scene-card-copy-hint';
    const hintEn = document.createElement('span');
    hintEn.className = 'lang-en';
    hintEn.textContent = 'click body to copy';
    const hintRu = document.createElement('span');
    hintRu.className = 'lang-ru';
    hintRu.textContent = 'Нажмите на текст, чтобы скопировать';
    hint.appendChild(hintEn);
    hint.appendChild(hintRu);
    controls.appendChild(hint);

    card.appendChild(controls);

    return card;
  }

  // ═══ SECTION BUILDER ═══
  function buildSection(section) {
    const filterLower = currentFilter.trim().toLowerCase();
    const matched = section.prompts.filter(p => matchesFilter(p, filterLower));

    const wrap = document.createElement('section');
    wrap.className = 'scene-section';
    wrap.setAttribute('data-section-id', section.id);

    // Auto-open when filtering finds matches.
    const shouldOpen = filterLower
      ? matched.length > 0
      : openState[section.id];
    if (shouldOpen) wrap.classList.add('is-open');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'scene-section-header';
    header.setAttribute('aria-expanded', String(shouldOpen));

    const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chev.setAttribute('class', 'scene-section-chevron');
    chev.setAttribute('viewBox', '0 0 24 24');
    chev.setAttribute('fill', 'none');
    chev.setAttribute('stroke', 'currentColor');
    chev.setAttribute('stroke-width', '2');
    const chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    chevPath.setAttribute('points', '9 6 15 12 9 18');
    chev.appendChild(chevPath);
    header.appendChild(chev);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'scene-section-title';

    const nameEn = document.createElement('span');
    nameEn.className = 'scene-section-name lang-en';
    nameEn.textContent = section.name;
    const nameRu = document.createElement('span');
    nameRu.className = 'scene-section-name lang-ru';
    nameRu.textContent = section.nameRu;
    titleBlock.appendChild(nameEn);
    titleBlock.appendChild(nameRu);

    const descEn = document.createElement('span');
    descEn.className = 'scene-section-desc lang-en';
    descEn.textContent = section.description;
    const descRu = document.createElement('span');
    descRu.className = 'scene-section-desc lang-ru';
    descRu.textContent = section.descriptionRu;
    titleBlock.appendChild(descEn);
    titleBlock.appendChild(descRu);

    header.appendChild(titleBlock);

    const count = document.createElement('span');
    count.className = 'scene-section-count';
    if (filterLower) {
      count.textContent = matched.length + '/' + section.prompts.length;
      if (matched.length > 0) count.classList.add('has-matches');
    } else {
      count.textContent = String(section.prompts.length);
    }
    header.appendChild(count);

    header.addEventListener('click', () => {
      const willOpen = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', willOpen);
      header.setAttribute('aria-expanded', String(willOpen));
      openState[section.id] = willOpen;
    });

    wrap.appendChild(header);

    const body = document.createElement('div');
    body.className = 'scene-section-body';

    if (matched.length === 0) {
      body.classList.add('is-empty');
      const empty = document.createElement('span');
      const emEn = document.createElement('span');
      emEn.className = 'lang-en';
      emEn.textContent = 'No matches in this section.';
      const emRu = document.createElement('span');
      emRu.className = 'lang-ru';
      emRu.textContent = 'В этом разделе совпадений нет.';
      empty.appendChild(emEn);
      empty.appendChild(emRu);
      body.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'scene-cards';
      matched.forEach(p => grid.appendChild(buildCard(p, section.id)));
      body.appendChild(grid);
    }

    wrap.appendChild(body);
    return wrap;
  }

  // ═══ RENDER ═══
  function render() {
    root.textContent = '';
    const filterLower = currentFilter.trim().toLowerCase();
    let totalMatched = 0;
    data.sections.forEach(section => {
      const sectionEl = buildSection(section);
      root.appendChild(sectionEl);
      const m = section.prompts.filter(p => matchesFilter(p, filterLower)).length;
      totalMatched += m;
    });

    if (filterLower) {
      const total = data.sections.reduce((s, sec) => s + sec.prompts.length, 0);
      resultCount.textContent = totalMatched + ' / ' + total;
    } else {
      resultCount.textContent = '';
    }
  }

  // ═══ SEARCH INPUT ═══
  let searchDebounce = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter = e.target.value;
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(render, 120);
    });
  }

  // ═══ SEARCH PLACEHOLDER + LANGUAGE SYNC ═══
  function updatePlaceholders() {
    if (!searchInput) return;
    searchInput.placeholder = getLang() === 'ru' ? 'Поиск рестайлов...' : 'Search restyles...';
  }

  // Re-render so JS-built nodes pick up the active language for title/desc.
  const langObserver = new MutationObserver(() => {
    updatePlaceholders();
    render();
  });
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang'],
  });

  // ═══ STICKY-STATE SHADOW ON SEARCH BAR ═══
  // Sentinel above the search wrap; fires when scrolled past the sticky offset
  // (nav-height), mirroring the pattern used in catalogue.js.
  if (searchWrap && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;width:1px;';
    searchWrap.parentNode.insertBefore(sentinel, searchWrap);
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
    ) || 56;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => searchWrap.classList.toggle('is-stuck', !e.isIntersecting)),
      { rootMargin: `-${navHeight}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(sentinel);
  }

  // ═══ INIT ═══
  updatePlaceholders();
  render();
})();
