/* ═══════════════════════════════════════════════
   CLOVER OOC — WARDROBE JS (outfit constructor)
   Mode tabs (two-piece / dress), slot picker, live preview,
   filter strip (search + tags + colors), surprise me.
   Stateless except for tab-state in localStorage.
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── DATA GUARD ──────────────────────────────────────────────────────────
  if (!window.WARDROBE_DATA || !Array.isArray(window.WARDROBE_DATA.items)) {
    console.error('Wardrobe data not loaded');
    return;
  }
  const data = window.WARDROBE_DATA;
  const items = data.items;
  const colorBuckets = data.colorBuckets || [];
  const tagVocab = data.tagVocabulary || [];
  const tagsRu = data.tagsRu || {};
  const colorsRu = data.colorsRu || {};

  // ─── i18n HELPERS ────────────────────────────────────────────────────────
  // Display sites use Russian when lang=ru AND a translation exists.
  // Copy sites always use English (Shape C: display RU, copy EN).
  function itemText(it) {
    return (document.documentElement.getAttribute('data-lang') === 'ru' && it && it.textRu)
      ? it.textRu : (it ? it.text : '');
  }
  function tagLabel(t) {
    return (document.documentElement.getAttribute('data-lang') === 'ru' && tagsRu[t])
      ? tagsRu[t] : t;
  }
  function colorLabel(c) {
    return (document.documentElement.getAttribute('data-lang') === 'ru' && colorsRu[c])
      ? colorsRu[c] : c;
  }

  // ─── DOM ─────────────────────────────────────────────────────────────────
  const $slots         = document.getElementById('slots');
  const $picker        = document.getElementById('picker');
  const $pickerGrid    = document.getElementById('picker-grid');
  const $pickerCount   = document.getElementById('picker-count');
  const $pickerCurCat  = document.getElementById('picker-current-cat');
  const $search        = document.getElementById('picker-search');
  const $colorRow      = document.getElementById('color-swatches');
  const $tagRow        = document.getElementById('tag-pills');
  const $preview       = document.getElementById('preview-output');
  const $previewBar    = document.getElementById('preview-bar');
  const $copyBtn       = document.getElementById('copy-btn');
  const $surpriseBtn   = document.getElementById('surprise-btn');
  const $clearBtn      = document.getElementById('clear-btn');
  const $modeTabs      = document.querySelectorAll('.mode-tab');
  const $scrollTopBtn  = document.getElementById('scroll-to-top');

  // ─── CATEGORY METADATA ───────────────────────────────────────────────────
  // Slot order per mode. Accessory is multi-pick; everything else is single.
  const SLOTS_TWO_PIECE = ['top', 'bottom', 'outer', 'shoes', 'accessory'];
  const SLOTS_DRESS     = ['dress', 'outer', 'shoes', 'accessory'];

  const SLOT_META = {
    top:       { en: 'Top',         ru: 'Верх',         multi: false, optional: false },
    bottom:    { en: 'Bottom',      ru: 'Низ',          multi: false, optional: false },
    dress:     { en: 'Dress',       ru: 'Платье',       multi: false, optional: false },
    outer:     { en: 'Outerwear',   ru: 'Верхняя одежда', multi: false, optional: true  },
    shoes:     { en: 'Shoes',       ru: 'Обувь',        multi: false, optional: true  },
    accessory: { en: 'Accessories', ru: 'Аксессуары',   multi: true,  optional: true  },
  };

  // ─── COLOR HEX MAP (for the small swatch dot per item / filter) ──────────
  const COLOR_HEX = {
    white:   '#f7f5f0',
    cream:   '#efe6cf',
    beige:   '#d7c3a3',
    brown:   '#7c4f2c',
    black:   '#222',
    grey:    '#9aa0a6',
    red:     '#c43c2e',
    pink:    '#e88aaf',
    orange:  '#e8893c',
    yellow:  '#e6c84a',
    green:   '#5b9e6a',
    blue:    '#4378c6',
    purple:  '#8b6cc1',
    neutral: 'transparent',
    multi:   'conic-gradient(#e88aaf,#e6c84a,#5b9e6a,#4378c6,#8b6cc1,#e88aaf)',
  };

  // ─── STATE ───────────────────────────────────────────────────────────────
  let mode = 'two-piece';
  try {
    const saved = localStorage.getItem('clover-wardrobe-mode');
    if (saved === 'two-piece' || saved === 'dress') mode = saved;
  } catch (e) {}

  const state = {
    // slot → itemId (string) or null; for accessory, an array of itemIds
    slots: { top: null, bottom: null, dress: null, outer: null, shoes: null, accessory: [] },
    activeSlot: null,      // which category the picker is currently showing
    activeAccIndex: null,  // when active slot is 'accessory', which index we're filling (null = append)
    filters: { search: '', tags: new Set(), colors: new Set() },
  };

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  const getLang = () => document.documentElement.getAttribute('data-lang') || 'en';
  const itemById = (id) => items.find(it => it.id === id);
  const currentSlots = () => mode === 'two-piece' ? SLOTS_TWO_PIECE : SLOTS_DRESS;

  function showToast(en, ru) {
    let t = document.getElementById('clover-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'clover-toast';
      t.className = 'clover-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = getLang() === 'ru' ? ru : en;
    t.classList.add('visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('visible'), 2000);
  }

  async function copyToClipboard(text) {
    return window.cloverCopy(text);
  }

  // ─── COMPOSE OUTPUT ──────────────────────────────────────────────────────
  function composedClothesLine() {
    const order = currentSlots();
    const pieces = [];
    order.forEach(cat => {
      const v = state.slots[cat];
      if (!v) return;
      if (Array.isArray(v)) {
        v.forEach(id => {
          const it = itemById(id);
          if (it) pieces.push(it.text);
        });
      } else {
        const it = itemById(v);
        if (it) pieces.push(it.text);
      }
    });
    if (pieces.length === 0) return 'clothes: …';
    return 'clothes: ' + pieces.join(', ');
  }

  function renderPreview() {
    $preview.textContent = composedClothesLine();
    const hasAny = currentSlots().some(c => {
      const v = state.slots[c];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
    $previewBar.classList.toggle('is-empty', !hasAny);
    $copyBtn.disabled = !hasAny;
  }

  // ─── RENDER SLOTS ────────────────────────────────────────────────────────
  function renderSlots() {
    $slots.textContent = '';
    currentSlots().forEach(cat => {
      const meta = SLOT_META[cat];
      const slotEl = document.createElement('div');
      slotEl.className = 'slot' + (state.activeSlot === cat ? ' is-active' : '');
      slotEl.dataset.cat = cat;

      const head = document.createElement('div');
      head.className = 'slot-head';
      const label = document.createElement('span');
      label.className = 'slot-label';
      const lEn = document.createElement('span'); lEn.className = 'lang-en'; lEn.textContent = meta.en;
      const lRu = document.createElement('span'); lRu.className = 'lang-ru'; lRu.textContent = meta.ru;
      label.appendChild(lEn); label.appendChild(lRu);
      head.appendChild(label);

      if (meta.optional) {
        const opt = document.createElement('span');
        opt.className = 'slot-optional';
        const oEn = document.createElement('span'); oEn.className = 'lang-en'; oEn.textContent = 'optional';
        const oRu = document.createElement('span'); oRu.className = 'lang-ru'; oRu.textContent = 'необязательно';
        opt.appendChild(oEn); opt.appendChild(oRu);
        head.appendChild(opt);
      }
      slotEl.appendChild(head);

      // Filled chips (or placeholder)
      const body = document.createElement('div');
      body.className = 'slot-body';
      const v = state.slots[cat];

      function renderChip(itemId, indexInArray) {
        const it = itemById(itemId);
        if (!it) return null;
        const chip = document.createElement('div');
        chip.className = 'slot-chip';
        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.background = COLOR_HEX[it.color] || 'transparent';
        if (it.color === 'neutral') sw.classList.add('is-neutral');
        chip.appendChild(sw);
        const txt = document.createElement('span');
        txt.className = 'slot-chip-text';
        txt.textContent = itemText(it);
        chip.appendChild(txt);
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'slot-chip-remove';
        x.setAttribute('aria-label', 'Remove');
        x.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        x.addEventListener('click', (e) => {
          e.stopPropagation();
          if (Array.isArray(state.slots[cat])) {
            state.slots[cat].splice(indexInArray, 1);
          } else {
            state.slots[cat] = null;
          }
          renderSlots();
          renderPreview();
        });
        chip.appendChild(x);
        return chip;
      }

      if (meta.multi) {
        const arr = Array.isArray(v) ? v : [];
        arr.forEach((id, i) => {
          const ch = renderChip(id, i);
          if (ch) body.appendChild(ch);
        });
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'slot-add';
        const aEn = document.createElement('span'); aEn.className = 'lang-en';
        aEn.textContent = arr.length === 0 ? '+ pick' : '+ add another';
        const aRu = document.createElement('span'); aRu.className = 'lang-ru';
        aRu.textContent = arr.length === 0 ? '+ выбрать' : '+ добавить';
        addBtn.appendChild(aEn); addBtn.appendChild(aRu);
        addBtn.addEventListener('click', () => activateSlot(cat, null));
        body.appendChild(addBtn);
      } else if (v) {
        const ch = renderChip(v, null);
        if (ch) body.appendChild(ch);
      } else {
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'slot-add';
        const pEn = document.createElement('span'); pEn.className = 'lang-en'; pEn.textContent = '+ pick';
        const pRu = document.createElement('span'); pRu.className = 'lang-ru'; pRu.textContent = '+ выбрать';
        pick.appendChild(pEn); pick.appendChild(pRu);
        pick.addEventListener('click', () => activateSlot(cat));
        body.appendChild(pick);
      }
      slotEl.appendChild(body);

      // Whole-slot click activates the picker for that category
      slotEl.addEventListener('click', (e) => {
        // Don't re-activate when chip's × or add button consumed the click
        if (e.target.closest('.slot-chip-remove')) return;
        if (e.target.closest('.slot-add')) return;
        activateSlot(cat);
      });

      $slots.appendChild(slotEl);
    });
  }

  // ─── ACTIVATE SLOT → POPULATE PICKER ─────────────────────────────────────
  function activateSlot(cat, accIndex) {
    state.activeSlot = cat;
    state.activeAccIndex = (typeof accIndex === 'number') ? accIndex : null;
    renderSlots();
    renderPickerHeader();
    renderPickerGrid();
    // Scroll picker into view (mobile-friendly).
    $picker.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── PICKER HEADER (label + count) ───────────────────────────────────────
  function renderPickerHeader() {
    const cat = state.activeSlot;
    if (!cat) {
      $pickerCurCat.textContent = '';
      $pickerCount.textContent = '';
      return;
    }
    const meta = SLOT_META[cat];
    $pickerCurCat.textContent = getLang() === 'ru' ? meta.ru : meta.en;
  }

  // ─── PICKER GRID (filter + render items for active category) ─────────────
  function pickerFilteredItems() {
    if (!state.activeSlot) return [];
    const cat = state.activeSlot;
    const q = state.filters.search.trim().toLowerCase();
    const activeTags = state.filters.tags;
    const activeColors = state.filters.colors;
    return items.filter(it => {
      if (it.category !== cat) return false;
      if (q) {
        const hay = (it.text + ' ' + (it.textRu || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeColors.size > 0 && !activeColors.has(it.color)) return false;
      if (activeTags.size > 0 && !it.tags.some(t => activeTags.has(t))) return false;
      return true;
    });
  }

  function renderPickerGrid() {
    $pickerGrid.textContent = '';
    if (!state.activeSlot) {
      const p = document.createElement('p');
      p.className = 'picker-empty';
      const en = document.createElement('span'); en.className = 'lang-en';
      en.textContent = 'Tap a slot above to start browsing.';
      const ru = document.createElement('span'); ru.className = 'lang-ru';
      ru.textContent = 'Нажмите на слот выше, чтобы начать.';
      p.appendChild(en); p.appendChild(ru);
      $pickerGrid.appendChild(p);
      $pickerCount.textContent = '';
      return;
    }
    const filtered = pickerFilteredItems();
    $pickerCount.textContent = filtered.length + ' / ' + items.filter(it => it.category === state.activeSlot).length;
    if (filtered.length === 0) {
      const p = document.createElement('p');
      p.className = 'picker-empty';
      const en = document.createElement('span'); en.className = 'lang-en'; en.textContent = 'No items match these filters.';
      const ru = document.createElement('span'); ru.className = 'lang-ru'; ru.textContent = 'Нет элементов, соответствующих фильтрам.';
      p.appendChild(en); p.appendChild(ru);
      $pickerGrid.appendChild(p);
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach(it => frag.appendChild(buildItemCard(it)));
    $pickerGrid.appendChild(frag);
  }

  function buildItemCard(it) {
    const cat = state.activeSlot;
    const slotVal = state.slots[cat];
    const isSelected = Array.isArray(slotVal) ? slotVal.includes(it.id) : slotVal === it.id;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'item-card' + (isSelected ? ' is-selected' : '');
    card.dataset.itemId = it.id;

    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = COLOR_HEX[it.color] || 'transparent';
    if (it.color === 'neutral') sw.classList.add('is-neutral');
    card.appendChild(sw);

    const txt = document.createElement('span');
    txt.className = 'item-text';
    txt.textContent = itemText(it);
    card.appendChild(txt);

    if (it.tags && it.tags.length) {
      const tags = document.createElement('span');
      tags.className = 'item-tags';
      // Show up to 2 tags
      it.tags.slice(0, 2).forEach(t => {
        const tg = document.createElement('span');
        tg.className = 'item-tag';
        tg.textContent = tagLabel(t);
        tags.appendChild(tg);
      });
      card.appendChild(tags);
    }

    card.addEventListener('click', () => {
      pickItem(it);
    });

    return card;
  }

  // ─── PICK / TOGGLE ITEM ──────────────────────────────────────────────────
  function pickItem(it) {
    const cat = state.activeSlot;
    if (!cat) return;
    const meta = SLOT_META[cat];
    if (meta.multi) {
      const arr = Array.isArray(state.slots[cat]) ? state.slots[cat] : [];
      const idx = arr.indexOf(it.id);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(it.id);
      }
      state.slots[cat] = arr;
    } else {
      // toggle off if same item; else replace
      state.slots[cat] = (state.slots[cat] === it.id) ? null : it.id;
    }
    renderSlots();
    renderPreview();
    renderPickerGrid(); // refresh selected styling
  }

  // ─── FILTERS (search / colors / tags) ────────────────────────────────────
  function renderColorSwatches() {
    $colorRow.textContent = '';
    colorBuckets.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-swatch';
      b.dataset.color = c;
      b.title = c;
      b.setAttribute('aria-pressed', 'false');
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = COLOR_HEX[c] || 'transparent';
      if (c === 'neutral') dot.classList.add('is-neutral');
      b.appendChild(dot);
      const lbl = document.createElement('span');
      lbl.className = 'color-swatch-label';
      lbl.textContent = colorLabel(c);
      b.appendChild(lbl);
      b.addEventListener('click', () => {
        if (state.filters.colors.has(c)) {
          state.filters.colors.delete(c);
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        } else {
          state.filters.colors.add(c);
          b.classList.add('is-active');
          b.setAttribute('aria-pressed', 'true');
        }
        renderPickerGrid();
      });
      $colorRow.appendChild(b);
    });
  }

  function renderTagPills() {
    $tagRow.textContent = '';
    tagVocab.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tag-pill';
      b.dataset.tag = t;
      b.textContent = tagLabel(t);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        if (state.filters.tags.has(t)) {
          state.filters.tags.delete(t);
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        } else {
          state.filters.tags.add(t);
          b.classList.add('is-active');
          b.setAttribute('aria-pressed', 'true');
        }
        renderPickerGrid();
      });
      $tagRow.appendChild(b);
    });
  }

  let searchDebounce = null;
  $search.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(renderPickerGrid, 120);
  });

  // ─── COPY ────────────────────────────────────────────────────────────────
  $copyBtn.addEventListener('click', async () => {
    const line = composedClothesLine();
    if (line === 'clothes: …') {
      showToast('Pick at least one piece first', 'Сначала выберите хотя бы один элемент');
      return;
    }
    const ok = await copyToClipboard(line);
    if (ok) {
      showToast('Copied to clipboard', 'Скопировано в буфер');
      $copyBtn.classList.add('is-copied');
      setTimeout(() => $copyBtn.classList.remove('is-copied'), 900);
    } else {
      showToast('Copy failed', 'Не удалось скопировать');
    }
  });

  // ─── SURPRISE ME (E2: fill only empty slots, respect active filters) ─────
  $surpriseBtn.addEventListener('click', () => {
    const order = currentSlots();
    let filledAny = false;
    order.forEach(cat => {
      const v = state.slots[cat];
      const isEmpty = Array.isArray(v) ? v.length === 0 : !v;
      if (!isEmpty) return;
      // Build candidate pool: items in this category respecting active filters
      const q = state.filters.search.trim().toLowerCase();
      const activeTags = state.filters.tags;
      const activeColors = state.filters.colors;
      const pool = items.filter(it => {
        if (it.category !== cat) return false;
        if (q) {
          const hay = (it.text + ' ' + (it.textRu || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (activeColors.size > 0 && !activeColors.has(it.color)) return false;
        if (activeTags.size > 0 && !it.tags.some(t => activeTags.has(t))) return false;
        return true;
      });
      if (pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (SLOT_META[cat].multi) {
        state.slots[cat] = [pick.id];
      } else {
        state.slots[cat] = pick.id;
      }
      filledAny = true;
    });
    if (filledAny) {
      renderSlots();
      renderPreview();
      if (state.activeSlot) renderPickerGrid();
    } else {
      showToast('Nothing to fill — all slots already chosen', 'Нечего заполнять — все слоты уже выбраны');
    }
  });

  // ─── CLEAR ───────────────────────────────────────────────────────────────
  $clearBtn.addEventListener('click', () => {
    Object.keys(state.slots).forEach(k => {
      state.slots[k] = Array.isArray(state.slots[k]) ? [] : null;
    });
    renderSlots();
    renderPreview();
    if (state.activeSlot) renderPickerGrid();
  });

  // ─── MODE TABS ───────────────────────────────────────────────────────────
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    try { localStorage.setItem('clover-wardrobe-mode', next); } catch(e) {}
    // Clear slots that aren't part of the new mode (top/bottom vs dress)
    const keep = new Set(currentSlots());
    Object.keys(state.slots).forEach(k => {
      if (!keep.has(k)) {
        state.slots[k] = Array.isArray(state.slots[k]) ? [] : null;
      }
    });
    // If active slot no longer exists in this mode, clear picker
    if (state.activeSlot && !keep.has(state.activeSlot)) {
      state.activeSlot = null;
    }
    $modeTabs.forEach(t => {
      const isActive = t.dataset.mode === mode;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    renderSlots();
    renderPreview();
    renderPickerHeader();
    renderPickerGrid();
  }
  $modeTabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
  // Apply saved mode on load
  $modeTabs.forEach(t => {
    const isActive = t.dataset.mode === mode;
    t.classList.toggle('is-active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });

  // ─── LANGUAGE OBSERVER ───────────────────────────────────────────────────
  // On lang flip, re-render every surface whose text is i18n-dependent:
  // slot chips (item labels), picker header (category label), picker grid
  // (item cards + their tag chips), tag-filter pills, and color swatches.
  const langObs = new MutationObserver(() => {
    updatePlaceholders();
    renderSlots();
    renderPickerHeader();
    renderPickerGrid();
    // Re-render tag pills + color swatches; preserve currently-active selections.
    const prevTags = new Set(state.filters.tags);
    renderTagPills();
    $tagRow.querySelectorAll('.tag-pill').forEach(btn => {
      if (prevTags.has(btn.dataset.tag)) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      }
    });
    const prevColors = new Set(state.filters.colors);
    renderColorSwatches();
    $colorRow.querySelectorAll('.color-swatch').forEach(btn => {
      if (prevColors.has(btn.dataset.color)) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      }
    });
  });
  langObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

  function updatePlaceholders() {
    $search.placeholder = getLang() === 'ru' ? 'Поиск элементов...' : 'Search pieces...';
  }

  // ─── STICKY PREVIEW SHADOW ───────────────────────────────────────────────
  if ($previewBar && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;width:1px;';
    $previewBar.parentNode.insertBefore(sentinel, $previewBar);
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => $previewBar.classList.toggle('is-stuck', !e.isIntersecting)),
      { rootMargin: `-${navH}px 0px 0px 0px`, threshold: 0 }
    );
    io.observe(sentinel);
  }

  // ─── SCROLL TO TOP ───────────────────────────────────────────────────────
  if ($scrollTopBtn) {
    window.addEventListener('scroll', () => {
      $scrollTopBtn.classList.toggle('visible', window.scrollY > 300);
    });
    $scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ─── KEYBOARD ────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      $search.focus();
    }
  });

  // ─── INIT ────────────────────────────────────────────────────────────────
  updatePlaceholders();
  renderColorSwatches();
  renderTagPills();
  renderSlots();
  renderPreview();
})();
