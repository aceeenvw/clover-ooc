/* ═══════════════════════════════════════════════
   CLOVER OOC - OUTFITS JS
   820 outfits across 19 sections (560 female, 260 male). Click card body to copy,
   click card to open modal with full image + body.
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  if (!window.OUTFITS_DATA || !Array.isArray(window.OUTFITS_DATA.sections)) {
    console.error('Outfits data not loaded');
    return;
  }

  const data = window.OUTFITS_DATA;
  const root = document.getElementById('outfits-grid');
  const searchInput = document.getElementById('outfits-search');
  const resultCount = document.getElementById('outfits-result-count');
  const searchWrap = document.querySelector('.outfits-search-wrap');
  const randomBtn = document.getElementById('outfits-random');
  const modal = document.getElementById('outfit-modal');
  const modalOverlay = modal.querySelector('.modal-overlay');
  const modalClose = modal.querySelector('.modal-close');
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  const genderTabsWrap = document.getElementById('outfits-gender-tabs');
  const genderTabs = genderTabsWrap
    ? genderTabsWrap.querySelectorAll('.outfits-gender-tab')
    : [];

  // Flatten for modal lookup by id.
  const allOutfits = [];
  data.sections.forEach(sec => sec.prompts.forEach(p => allOutfits.push(p)));

  // Open/closed state per section ID - first section open by default.
  const openState = {};
  data.sections.forEach((s, i) => { openState[s.id] = (i === 0); });

  let currentFilter = '';
  let lastRandomId = null;

  // Which genders actually have outfits. The tab strip only appears once more
  // than one is present, so it stays hidden until male outfits are ingested.
  const availableGenders = [];
  allOutfits.forEach(o => {
    const g = o.gender || 'female';
    if (!availableGenders.includes(g)) availableGenders.push(g);
  });

  let currentGender = availableGenders.includes('female')
    ? 'female'
    : (availableGenders[0] || 'female');
  try {
    const savedGender = localStorage.getItem('clover-outfits-gender');
    if (savedGender && availableGenders.includes(savedGender)) {
      currentGender = savedGender;
    }
  } catch (e) {}

  // ═══ HELPERS ═══
  const getLang = window.cloverLang;

  // i18n: titles localize when lang=ru AND a translation exists.
  // Bodies never localize - see outfitBody below.
  function outfitTitle(o) {
    return (getLang() === 'ru' && o && o.titleRu) ? o.titleRu : (o ? o.title : '');
  }
  // The clothes: line stays English in both languages - it is the canonical
  // prompt that gets copied, and the title plus image already carry the intent.
  function outfitBody(o) {
    return o ? o.body : '';
  }

  function matchesFilter(outfit, filterLower) {
    // Gender facet first, so Random and the result count inherit it for free.
    if (availableGenders.length > 1 && (outfit.gender || 'female') !== currentGender) {
      return false;
    }
    if (!filterLower) return true;
    const hay = (
      outfit.title + ' ' +
      (outfit.titleRu || '') + ' ' +
      outfit.body
    ).toLowerCase();
    return hay.includes(filterLower) || String(outfit.number).includes(filterLower);
  }

  // ═══ TOAST ═══
  const showToast = window.cloverToast;

  async function copyText(text) {
    return window.cloverCopy(text);
  }

  // ═══ PLACEHOLDER (used when an outfit has no image) ═══
  function createPlaceholder() {
    const wrap = document.createElement('div');
    wrap.className = 'outfit-placeholder';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 240');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    // Mini clover mark.
    svg.innerHTML =
      '<g transform="rotate(0 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(90 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(180 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(270 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>';
    wrap.appendChild(svg);
    return wrap;
  }

  // ═══ CARD ═══
  function buildCard(outfit) {
    const card = document.createElement('article');
    card.className = 'outfit-card';
    card.setAttribute('data-outfit-id', outfit.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label',
      (getLang() === 'ru' ? 'Открыть образ ' : 'Open outfit ') + outfitTitle(outfit));

    // Image / placeholder
    const imgWrap = document.createElement('div');
    imgWrap.className = 'outfit-card-image';
    if (outfit.hasImage && outfit.imgSrc) {
      imgWrap.classList.add('has-image');
      const img = document.createElement('img');
      img.src = outfit.imgSrc;
      img.alt = outfitTitle(outfit);
      img.loading = 'lazy';
      img.draggable = false;
      img.oncontextmenu = () => false;
      imgWrap.appendChild(img);
    } else {
      imgWrap.appendChild(createPlaceholder());
    }
    card.appendChild(imgWrap);

    // Content
    const content = document.createElement('div');
    content.className = 'outfit-card-content';

    const head = document.createElement('div');
    head.className = 'outfit-card-head';
    const num = document.createElement('span');
    num.className = 'outfit-card-num';
    num.textContent = '#' + outfit.number;
    const title = document.createElement('h3');
    title.className = 'outfit-card-title';
    title.textContent = outfitTitle(outfit);
    head.appendChild(num);
    head.appendChild(title);
    content.appendChild(head);

    // Body - click to copy.
    // DISPLAY uses outfitBody() (RU when lang=ru); COPY always uses outfit.body
    // (English) so the model receives the canonical "clothes: …" line.
    const bodyEl = document.createElement('button');
    bodyEl.type = 'button';
    bodyEl.className = 'outfit-card-body';
    bodyEl.setAttribute('aria-label',
      getLang() === 'ru' ? 'Скопировать строку clothes' : 'Copy clothes line');
    bodyEl.textContent = outfitBody(outfit);

    async function doCopy(e) {
      if (e) e.stopPropagation();
      const ok = await copyText(outfit.body);
      if (ok) {
        bodyEl.classList.add('is-copied');
        setTimeout(() => bodyEl.classList.remove('is-copied'), 900);
        showToast('Copied to clipboard', 'Скопировано в буфер');
      } else {
        showToast('Copy failed', 'Не удалось скопировать');
      }
    }
    bodyEl.addEventListener('click', doCopy);
    content.appendChild(bodyEl);

    // Hint row
    const hint = document.createElement('div');
    hint.className = 'outfit-card-hint';
    const hintEn = document.createElement('span');
    hintEn.className = 'lang-en';
    hintEn.textContent = 'click text to copy · click card for full view';
    const hintRu = document.createElement('span');
    hintRu.className = 'lang-ru';
    hintRu.textContent = 'Нажмите на текст, чтобы скопировать · нажмите на карточку, чтобы открыть полностью';
    hint.appendChild(hintEn);
    hint.appendChild(hintRu);
    content.appendChild(hint);

    card.appendChild(content);

    // Card click (anywhere except the body) → open modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.outfit-card-body')) return;
      openModal(outfit.id);
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.outfit-card-body')) {
        e.preventDefault();
        openModal(outfit.id);
      }
    });

    return card;
  }

  // Prompts in a section belonging to the active gender, ignoring text search.
  // Used as the count denominator so totals never include the other gender.
  function genderPrompts(section) {
    if (availableGenders.length < 2) return section.prompts;
    return section.prompts.filter(p => (p.gender || 'female') === currentGender);
  }

  // ═══ SECTION ═══
  function buildSection(section) {
    const filterLower = currentFilter.trim().toLowerCase();
    const matched = section.prompts.filter(p => matchesFilter(p, filterLower));
    const inGender = genderPrompts(section);

    const wrap = document.createElement('section');
    wrap.className = 'outfit-section';
    wrap.setAttribute('data-section-id', section.id);

    const shouldOpen = filterLower
      ? matched.length > 0
      : openState[section.id];
    if (shouldOpen) wrap.classList.add('is-open');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'outfit-section-header';
    header.setAttribute('aria-expanded', String(shouldOpen));

    const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chev.setAttribute('class', 'outfit-section-chevron');
    chev.setAttribute('viewBox', '0 0 24 24');
    chev.setAttribute('fill', 'none');
    chev.setAttribute('stroke', 'currentColor');
    chev.setAttribute('stroke-width', '2');
    const chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    chevPath.setAttribute('points', '9 6 15 12 9 18');
    chev.appendChild(chevPath);
    header.appendChild(chev);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'outfit-section-title';
    const nameEn = document.createElement('span');
    nameEn.className = 'outfit-section-name lang-en';
    nameEn.textContent = section.name;
    const nameRu = document.createElement('span');
    nameRu.className = 'outfit-section-name lang-ru';
    nameRu.textContent = section.nameRu;
    titleBlock.appendChild(nameEn);
    titleBlock.appendChild(nameRu);
    const descEn = document.createElement('span');
    descEn.className = 'outfit-section-desc lang-en';
    descEn.textContent = section.description;
    const descRu = document.createElement('span');
    descRu.className = 'outfit-section-desc lang-ru';
    descRu.textContent = section.descriptionRu;
    titleBlock.appendChild(descEn);
    titleBlock.appendChild(descRu);
    header.appendChild(titleBlock);

    const count = document.createElement('span');
    count.className = 'outfit-section-count';
    if (filterLower) {
      count.textContent = matched.length + '/' + inGender.length;
      if (matched.length > 0) count.classList.add('has-matches');
    } else {
      count.textContent = String(inGender.length);
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
    body.className = 'outfit-section-body';

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
      grid.className = 'outfit-cards';
      matched.forEach(p => grid.appendChild(buildCard(p)));
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
    let totalInGender = 0;
    data.sections.forEach(section => {
      const inGender = genderPrompts(section);
      totalInGender += inGender.length;
      // Skip sections with nothing in the active gender, so switching tabs
      // never leaves a wall of empty accordions.
      if (!inGender.length) return;
      const el = buildSection(section);
      root.appendChild(el);
      totalMatched += section.prompts.filter(p => matchesFilter(p, filterLower)).length;
    });
    if (filterLower) {
      resultCount.textContent = totalMatched + ' / ' + totalInGender;
    } else {
      resultCount.textContent = '';
    }
  }

  // ═══ MODAL ═══
  function openModal(outfitId) {
    const o = allOutfits.find(p => p.id === outfitId);
    if (!o) return;
    modal.querySelector('.modal-content').dataset.outfitId = o.id;
    modal.querySelector('.modal-number').textContent = '#' + o.number;
    modal.querySelector('.modal-title').textContent = outfitTitle(o);

    const imageContainer = modal.querySelector('.modal-image-container');
    imageContainer.textContent = '';
    if (o.hasImage && o.imgSrc) {
      const img = document.createElement('img');
      img.src = o.imgSrc;
      img.alt = outfitTitle(o);
      img.draggable = false;
      img.oncontextmenu = () => false;
      imageContainer.appendChild(img);
    } else {
      imageContainer.appendChild(createPlaceholder());
    }

    // Display uses outfitBody() (RU when lang=ru); the Copy button below
    // still copies o.body (English).
    modal.querySelector('.modal-prompt-text code').textContent = outfitBody(o);

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

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  modal.querySelector('.modal-copy-btn').addEventListener('click', async () => {
    const id = modal.querySelector('.modal-content').dataset.outfitId;
    const o = allOutfits.find(p => p.id === id);
    if (!o) return;
    const ok = await copyText(o.body);
    if (ok) {
      const btn = modal.querySelector('.modal-copy-btn');
      const en = btn.querySelector('.lang-en');
      const ru = btn.querySelector('.lang-ru');
      const oEn = en.textContent, oRu = ru.textContent;
      en.textContent = 'Copied!';
      ru.textContent = 'Скопировано!';
      setTimeout(() => { en.textContent = oEn; ru.textContent = oRu; }, 1800);
      showToast('Copied to clipboard', 'Скопировано в буфер');
    } else {
      showToast('Copy failed', 'Не удалось скопировать');
    }
  });

  // ═══ KEYBOARD ═══
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      if (searchInput) { e.preventDefault(); searchInput.focus(); }
    }
    // focus trap
    if (e.key === 'Tab' && modal.classList.contains('active')) {
      const focusable = Array.from(modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ═══ GENDER TABS ═══
  function syncGenderTabs() {
    genderTabs.forEach(t => {
      const isActive = t.dataset.gender === currentGender;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', String(isActive));
      t.tabIndex = isActive ? 0 : -1;
    });
  }

  function setGender(next) {
    if (next === currentGender || !availableGenders.includes(next)) return;
    currentGender = next;
    try { localStorage.setItem('clover-outfits-gender', next); } catch (e) {}
    syncGenderTabs();
    render();
  }

  genderTabs.forEach(t => {
    t.addEventListener('click', () => setGender(t.dataset.gender));
  });

  // Arrow/Home/End navigation, matching the tab pattern used in tools.js.
  if (genderTabsWrap) {
    genderTabsWrap.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const buttons = Array.from(genderTabs);
      const current = buttons.indexOf(document.activeElement);
      if (current < 0) return;
      e.preventDefault();
      let next = current;
      if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
      if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = buttons.length - 1;
      buttons[next].focus();
      buttons[next].click();
    });

    // Reveal the strip only when there is a real choice to make. Once male
    // outfits are ingested this turns itself on with no further changes.
    if (availableGenders.length > 1) {
      genderTabsWrap.hidden = false;
    }
  }

  syncGenderTabs();

  // ═══ SEARCH ═══
  let searchDebounce = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter = e.target.value;
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(render, 120);
    });
  }

  function pickRandom() {
    const filterLower = currentFilter.trim().toLowerCase();
    const matched = allOutfits.filter(outfit => matchesFilter(outfit, filterLower));
    if (!matched.length) {
      showToast('No outfits match your search', 'По вашему запросу ничего не найдено');
      return;
    }

    const pool = matched.length > 1
      ? matched.filter(outfit => outfit.id !== lastRandomId)
      : matched;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    lastRandomId = choice.id;

    randomBtn.classList.remove('is-spun');
    void randomBtn.offsetWidth;
    randomBtn.classList.add('is-spun');
    openModal(choice.id);
  }

  if (randomBtn) randomBtn.addEventListener('click', pickRandom);

  function updatePlaceholders() {
    if (!searchInput) return;
    searchInput.placeholder = getLang() === 'ru' ? 'Поиск образов...' : 'Search outfits...';
  }

  // Re-render on language change. Also refresh an open modal so its title +
  // body swap immediately (otherwise stale text lingers until close+reopen).
  const langObserver = new MutationObserver(() => {
    updatePlaceholders();
    render();
    if (modal.classList.contains('active')) {
      const openId = modal.querySelector('.modal-content').dataset.outfitId;
      const o = allOutfits.find(p => p.id === openId);
      if (o) {
        modal.querySelector('.modal-title').textContent = outfitTitle(o);
        modal.querySelector('.modal-prompt-text code').textContent = outfitBody(o);
        const modalImg = modal.querySelector('.modal-image-container img');
        if (modalImg) modalImg.alt = outfitTitle(o);
      }
    }
  });
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

  // ═══ STICKY-STATE SHADOW ON SEARCH BAR ═══
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

  // ═══ SCROLL TO TOP ═══
  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      scrollToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ═══ INIT ═══
  updatePlaceholders();
  render();
})();
