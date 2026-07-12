/* ═══════════════════════════════════════════════
   CLOVER OOC — HAIR JS
   275 hairstyles across 8 sections. Click card body to copy
   the 'hairstyle:' line; click card for full image + body.
   Two filter facets: vibe (multi) + texture (single-per-item, multi-select).
   Mirrors the outfits.js pattern.
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  if (!window.HAIR_DATA || !Array.isArray(window.HAIR_DATA.sections)) {
    console.error('Hair data not loaded');
    return;
  }

  const data = window.HAIR_DATA;
  const root = document.getElementById('hair-grid');
  const searchInput = document.getElementById('hair-search');
  const resultCount = document.getElementById('hair-result-count');
  const searchWrap = document.querySelector('.hair-search-wrap');
  const modal = document.getElementById('hair-modal');
  const modalOverlay = modal.querySelector('.modal-overlay');
  const modalClose = modal.querySelector('.modal-close');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // Flatten for modal lookup by id.
  const allHair = [];
  data.sections.forEach(sec => sec.prompts.forEach(p => allHair.push(p)));

  // Open/closed state per section ID — first section open by default.
  const openState = {};
  data.sections.forEach((s, i) => { openState[s.id] = (i === 0); });

  let currentFilter = '';
  // Faceted filters — vibe (multi) AND texture (multi). Both OR within a group.
  const selectedVibes = new Set();
  const selectedTextures = new Set();

  const filterEl = document.getElementById('hair-filter');
  const filterToggle = document.getElementById('hair-filter-toggle');
  const filterCount = document.getElementById('hair-filter-toggle-count');
  const vibeChipsWrap = document.getElementById('hair-vibe-chips');
  const textureChipsWrap = document.getElementById('hair-texture-chips');
  const clearBtn = document.getElementById('hair-filter-clear');
  const randomBtn = document.getElementById('hair-random');
  let lastRandomId = null;

  // ═══ HELPERS ═══
  function getLang() {
    return document.documentElement.getAttribute('data-lang') || 'en';
  }

  // i18n: display Russian when lang=ru AND a translation exists.
  // Copy always returns English (Shape C: display RU, copy EN — matches wardrobe).
  function hairTitle(o) {
    return (getLang() === 'ru' && o && o.titleRu) ? o.titleRu : (o ? o.title : '');
  }
  function hairBody(o) {
    return (getLang() === 'ru' && o && o.bodyRu) ? o.bodyRu : (o ? o.body : '');
  }

  function matchesFilter(item, filterLower) {
    // Facet: vibe (OR within group). Empty selection = pass.
    if (selectedVibes.size) {
      const vibes = item.vibes || [];
      if (!vibes.some(v => selectedVibes.has(v))) return false;
    }
    // Facet: texture (OR within group). Empty selection = pass.
    if (selectedTextures.size) {
      if (!selectedTextures.has(item.texture)) return false;
    }
    // Text search — haystack includes title/body/vibes/texture.
    if (!filterLower) return true;
    const hay = (
      item.title + ' ' +
      (item.titleRu || '') + ' ' +
      item.body + ' ' +
      (item.bodyRu || '') + ' ' +
      (item.vibes || []).join(' ') + ' ' +
      (item.texture || '')
    ).toLowerCase();
    return hay.includes(filterLower) || String(item.number).includes(filterLower);
  }

  function activeFilterCount() {
    return selectedVibes.size + selectedTextures.size;
  }
  function hasAnyFilter() {
    return currentFilter.trim() !== '' || activeFilterCount() > 0;
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

  // Delegates to the shared hardened helper (textarea/execCommand fallback).
  async function copyText(text) {
    return window.cloverCopy(text);
  }

  // ═══ PLACEHOLDER (used when a hairstyle has no image) ═══
  function createPlaceholder() {
    const wrap = document.createElement('div');
    wrap.className = 'hair-placeholder';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 240');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    // Mini clover mark (matches site iconography).
    svg.innerHTML =
      '<g transform="rotate(0 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(90 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(180 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>' +
      '<g transform="rotate(270 100 100)"><path d="M100 100C100 72 80 40 68 40C52 40 50 60 58 76C64 88 84 98 100 100Z"/><path d="M100 100C100 72 120 40 132 40C148 40 150 60 142 76C136 88 116 98 100 100Z"/></g>';
    wrap.appendChild(svg);
    return wrap;
  }

  // ═══ TAG CHIPS (vibe + texture) ═══
  function buildTagChips(item) {
    const vibes = item.vibes || [];
    const texture = item.texture;
    if (!vibes.length && !texture) return null;
    const wrap = document.createElement('div');
    wrap.className = 'hair-card-tags';
    vibes.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'hair-tag hair-tag--vibe';
      chip.textContent = v;
      wrap.appendChild(chip);
    });
    if (texture && texture !== 'any') {
      const t = document.createElement('span');
      t.className = 'hair-tag hair-tag--texture';
      t.textContent = texture;
      wrap.appendChild(t);
    }
    return wrap.children.length ? wrap : null;
  }

  // ═══ CARD ═══
  function buildCard(outfit) {
    const card = document.createElement('article');
    card.className = 'hair-card';
    card.setAttribute('data-hair-id', outfit.id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label',
      (getLang() === 'ru' ? 'Открыть причёску ' : 'Open hairstyle ') + hairTitle(outfit));

    // Image / placeholder
    const imgWrap = document.createElement('div');
    imgWrap.className = 'hair-card-image';
    if (outfit.hasImage && outfit.imgSrc) {
      imgWrap.classList.add('has-image');
      const img = document.createElement('img');
      img.src = outfit.imgSrc;
      img.alt = hairTitle(outfit);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 928;
      img.height = 1160;
      img.draggable = false;
      img.oncontextmenu = () => false;
      imgWrap.appendChild(img);
    } else {
      imgWrap.appendChild(createPlaceholder());
    }
    card.appendChild(imgWrap);

    // Content
    const content = document.createElement('div');
    content.className = 'hair-card-content';

    const head = document.createElement('div');
    head.className = 'hair-card-head';
    const num = document.createElement('span');
    num.className = 'hair-card-num';
    num.textContent = '#' + outfit.number;
    const title = document.createElement('h3');
    title.className = 'hair-card-title';
    title.textContent = hairTitle(outfit);
    head.appendChild(num);
    head.appendChild(title);
    content.appendChild(head);

    // Tag chips — vibe (multi) + one texture chip (distinct accent).
    const chips = buildTagChips(outfit);
    if (chips) content.appendChild(chips);

    // Body — click to copy.
    // DISPLAY uses hairBody() (RU when lang=ru); COPY always uses outfit.body
    // (English) so the model receives the canonical "hairstyle: …" line.
    const bodyEl = document.createElement('div');
    bodyEl.className = 'hair-card-body';
    bodyEl.setAttribute('role', 'button');
    bodyEl.setAttribute('tabindex', '0');
    bodyEl.setAttribute('aria-label',
      getLang() === 'ru' ? 'Скопировать строку hairstyle' : 'Copy hairstyle line');
    bodyEl.textContent = hairBody(outfit);

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
    bodyEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(e); }
    });
    content.appendChild(bodyEl);

    // Hint row
    const hint = document.createElement('div');
    hint.className = 'hair-card-hint';
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
      if (e.target.closest('.hair-card-body')) return;
      openModal(outfit.id);
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.hair-card-body')) {
        e.preventDefault();
        openModal(outfit.id);
      }
    });

    return card;
  }

  // ═══ SECTION ═══
  function buildSection(section) {
    const filterLower = currentFilter.trim().toLowerCase();
    const matched = section.prompts.filter(p => matchesFilter(p, filterLower));

    const wrap = document.createElement('section');
    wrap.className = 'hair-section';
    wrap.setAttribute('data-section-id', section.id);

    const filtering = hasAnyFilter();
    const shouldOpen = filtering
      ? matched.length > 0
      : openState[section.id];
    if (shouldOpen) wrap.classList.add('is-open');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'hair-section-header';
    header.setAttribute('aria-expanded', String(shouldOpen));

    const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chev.setAttribute('class', 'hair-section-chevron');
    chev.setAttribute('viewBox', '0 0 24 24');
    chev.setAttribute('fill', 'none');
    chev.setAttribute('stroke', 'currentColor');
    chev.setAttribute('stroke-width', '2');
    const chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    chevPath.setAttribute('points', '9 6 15 12 9 18');
    chev.appendChild(chevPath);
    header.appendChild(chev);

    const titleBlock = document.createElement('div');
    titleBlock.className = 'hair-section-title';
    const nameEn = document.createElement('span');
    nameEn.className = 'hair-section-name lang-en';
    nameEn.textContent = section.name;
    const nameRu = document.createElement('span');
    nameRu.className = 'hair-section-name lang-ru';
    nameRu.textContent = section.nameRu;
    titleBlock.appendChild(nameEn);
    titleBlock.appendChild(nameRu);
    const descEn = document.createElement('span');
    descEn.className = 'hair-section-desc lang-en';
    descEn.textContent = section.description;
    const descRu = document.createElement('span');
    descRu.className = 'hair-section-desc lang-ru';
    descRu.textContent = section.descriptionRu;
    titleBlock.appendChild(descEn);
    titleBlock.appendChild(descRu);
    header.appendChild(titleBlock);

    const count = document.createElement('span');
    count.className = 'hair-section-count';
    if (filtering) {
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
    body.className = 'hair-section-body';

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
      grid.className = 'hair-cards';
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
    data.sections.forEach(section => {
      const el = buildSection(section);
      root.appendChild(el);
      totalMatched += section.prompts.filter(p => matchesFilter(p, filterLower)).length;
    });
    if (hasAnyFilter()) {
      const total = data.sections.reduce((s, sec) => s + sec.prompts.length, 0);
      resultCount.textContent = totalMatched + ' / ' + total;
    } else {
      resultCount.textContent = '';
    }
  }

  // ═══ MODAL ═══
  function openModal(hairId) {
    const o = allHair.find(p => p.id === hairId);
    if (!o) return;
    modal.querySelector('.modal-content').dataset.hairId = o.id;
    modal.querySelector('.modal-number').textContent = '#' + o.number;
    modal.querySelector('.modal-title').textContent = hairTitle(o);

    const imageContainer = modal.querySelector('.modal-image-container');
    imageContainer.textContent = '';
    if (o.hasImage && o.imgSrc) {
      const img = document.createElement('img');
      img.src = o.imgSrc;
      img.alt = hairTitle(o);
      img.draggable = false;
      img.oncontextmenu = () => false;
      imageContainer.appendChild(img);
    } else {
      imageContainer.appendChild(createPlaceholder());
    }

    // Modal tag chips (vibe + texture).
    const tagHost = modal.querySelector('.modal-tags');
    if (tagHost) {
      tagHost.textContent = '';
      const chips = buildTagChips(o);
      if (chips) tagHost.appendChild(chips);
    }

    // Modal prompt area: DISPLAY uses hairBody() (RU when lang=ru);
    // the Copy button below still copies o.body (English, Shape C).
    modal.querySelector('.modal-prompt-text code').textContent = hairBody(o);

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
    const id = modal.querySelector('.modal-content').dataset.hairId;
    const o = allHair.find(p => p.id === id);
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

  // ═══ SEARCH ═══
  let searchDebounce = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter = e.target.value;
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(render, 120);
    });
  }

  function updatePlaceholders() {
    if (!searchInput) return;
    searchInput.placeholder = getLang() === 'ru' ? 'Поиск причёсок...' : 'Search hairstyles...';
  }

  // Re-render on language change. Also refresh an open modal so its title +
  // body swap immediately (otherwise stale text lingers until close+reopen).
  const langObserver = new MutationObserver(() => {
    updatePlaceholders();
    render();
    if (modal.classList.contains('active')) {
      const openId = modal.querySelector('.modal-content').dataset.hairId;
      const o = allHair.find(p => p.id === openId);
      if (o) {
        modal.querySelector('.modal-title').textContent = hairTitle(o);
        modal.querySelector('.modal-prompt-text code').textContent = hairBody(o);
        const modalImg = modal.querySelector('.modal-image-container img');
        if (modalImg) modalImg.alt = hairTitle(o);
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
    }, { passive: true });
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ═══ FILTER PANEL (vibe + texture facets) ═══
  // Fixed texture order; vibes come from the data (union, sorted).
  const TEXTURE_ORDER = ['straight', 'wavy', 'curly', 'coily', 'any'];

  function collectVibes() {
    const set = new Set();
    allHair.forEach(p => (p.vibes || []).forEach(v => set.add(v)));
    return Array.from(set).sort();
  }
  function collectTextures() {
    const present = new Set(allHair.map(p => p.texture).filter(Boolean));
    return TEXTURE_ORDER.filter(t => present.has(t));
  }

  function makeFilterChip(value, selectedSet) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hair-filter-chip';
    chip.textContent = value;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      if (selectedSet.has(value)) {
        selectedSet.delete(value);
        chip.classList.remove('is-active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selectedSet.add(value);
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');
      }
      updateFilterUI();
      render();
    });
    return chip;
  }

  function updateFilterUI() {
    const n = activeFilterCount();
    if (filterCount) filterCount.textContent = n ? String(n) : '';
    if (clearBtn) clearBtn.disabled = n === 0;
  }

  function buildFilterPanel() {
    if (!filterEl) return;
    if (vibeChipsWrap) {
      collectVibes().forEach(v => vibeChipsWrap.appendChild(makeFilterChip(v, selectedVibes)));
    }
    if (textureChipsWrap) {
      collectTextures().forEach(t => textureChipsWrap.appendChild(makeFilterChip(t, selectedTextures)));
    }
    if (filterToggle) {
      filterToggle.addEventListener('click', () => {
        filterEl.classList.toggle('is-open');
        filterToggle.setAttribute('aria-expanded',
          String(filterEl.classList.contains('is-open')));
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedVibes.clear();
        selectedTextures.clear();
        filterEl.querySelectorAll('.hair-filter-chip.is-active').forEach(c => {
          c.classList.remove('is-active');
          c.setAttribute('aria-pressed', 'false');
        });
        updateFilterUI();
        render();
      });
    }
    updateFilterUI();
  }

  // ═══ RANDOM ═══
  // Picks from the currently-matched set (respects search + facet filters),
  // opens its modal, and avoids repeating the previous pick when possible.
  function pickRandom() {
    const filterLower = currentFilter.trim().toLowerCase();
    const pool = allHair.filter(p => matchesFilter(p, filterLower));
    if (!pool.length) {
      showToast('No hairstyles match your filters', 'Нет причёсок по фильтрам');
      return;
    }
    let choice = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && choice.id === lastRandomId) {
      choice = pool[Math.floor(Math.random() * pool.length)];
    }
    lastRandomId = choice.id;
    if (randomBtn) {
      randomBtn.classList.remove('is-spun');
      void randomBtn.offsetWidth; // restart the icon spin
      randomBtn.classList.add('is-spun');
    }
    openModal(choice.id);
  }

  if (randomBtn) randomBtn.addEventListener('click', pickRandom);

  // ═══ INIT ═══
  buildFilterPanel();
  updatePlaceholders();
  render();
})();
