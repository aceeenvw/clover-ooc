/* ═══════════════════════════════════════════════
   CLOVER OOC - TOOLS JS
   Constructor, effects/backgrounds/overlays libraries, stacks.
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  if (!window.PROMPTS_DATA || !window.EFFECTS_DATA || !window.BACKGROUNDS_DATA || !window.OVERLAYS_DATA) {
    console.error('Data not loaded');
    return;
  }

  const prompts = window.PROMPTS_DATA;
  const effectsData = window.EFFECTS_DATA;
  const backgroundsData = window.BACKGROUNDS_DATA;
  const overlaysData = window.OVERLAYS_DATA;
  const cameraData = window.CAMERA_DATA || { categories: [] };

  // ═══ TERM → nameRu LOOKUP (for pairsWith chip tooltips) ═══
  const termGlossary = {};
  effectsData.categories.forEach(c => c.effects.forEach(e => { termGlossary[e.term] = e.nameRu; }));
  overlaysData.categories.forEach(c => c.items.forEach(i => { termGlossary[i.term] = i.nameRu; }));
  backgroundsData.categories.forEach(c => c.backgrounds.forEach(b => { termGlossary[b.term] = b.nameRu; }));
  cameraData.categories.forEach(c => c.terms.forEach(t => { termGlossary[t.term] = t.nameRu; }));

  /* FNV-1a over the roll key. Seeding the PRNG from a hash rather than raw
     Date.now() keeps successive rolls well distributed even when they land in
     the same millisecond, and makes a given key reproduce its own sequence. */
  const HASH_DELTA = [2, 2, 0, 9, 8, 1];
  const HASH_BASIS = HASH_DELTA.reduce((a, d, i) => a + (d << ((i % 4) * 8)), 0x811c9dc5) >>> 0;

  function stableHash(str) {
    let h = HASH_BASIS;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /* Mulberry32 - small, fast, seedable. */
  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
      t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const loadingState = document.getElementById('loading-state');
  if (loadingState) loadingState.remove();

  // ═══ STATE ═══
  let selectedPrompt = null;
  let selectedEffects = [];
  let selectedAspectRatio = '';
  let copyOutputValue = '';
  // Canonical English hook injected by "Try this" - { en } or null.
  let customHook = null;
  // Canonical English overlay recipe block - { en } or null.
  let selectedPresetBlock = null;

  // ═══ DOM ═══
  const constructorSearch = document.getElementById('constructor-search');
  const promptsList = document.getElementById('constructor-prompts');
  const aspectButtons = document.querySelectorAll('.aspect-btn');
  const effectsAvailable = document.getElementById('constructor-effects-available');
  const effectsSelected = document.getElementById('constructor-effects-selected');
  const outputPrompt = document.getElementById('output-prompt');
  const copyButton = document.getElementById('copy-output');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  const effectsSearch = document.getElementById('effects-search');
  const effectsLibrary = document.getElementById('effects-library');
  const cameraSearch = document.getElementById('camera-search');
  const cameraLibrary = document.getElementById('camera-library');
  const hasCameraData = cameraData.categories.length > 0;

  if (!hasCameraData) {
    document.getElementById('camera-tab-button')?.remove();
    document.getElementById('camera-tab')?.remove();
    document.getElementById('constructor-camera-tab')?.remove();
    document.getElementById('subtab-camera')?.remove();
  }

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // ═══ SCROLL TO TOP ═══
  if (scrollToTopBtn) {
    const syncScrollToTop = () => {
      scrollToTopBtn.classList.toggle('visible', window.scrollY > 300);
    };
    window.addEventListener('scroll', syncScrollToTop, { passive: true });
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    syncScrollToTop();
  }

  // ═══ TAB SWITCHING ═══
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });

  document.querySelector('.tabs')?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(tabButtons);
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;

    event.preventDefault();
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    buttons[next].focus();
    buttons[next].click();
  });

  function switchTab(tab) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
      btn.setAttribute('aria-selected', btn.dataset.tab === tab);
      btn.tabIndex = btn.dataset.tab === tab ? 0 : -1;
    });

    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tab}-tab`);
    });
  }

  // ═══ CONSTRUCTOR: RENDER PROMPTS ═══
  function renderPrompts(filter = '') {
    promptsList.textContent = '';

    const filtered = prompts.filter(p => {
      const searchText = filter.toLowerCase();
      return p.title.toLowerCase().includes(searchText) ||
             (p.titleRu && p.titleRu.toLowerCase().includes(searchText)) ||
             p.id.toLowerCase().includes(searchText) ||
             p.tags.some(tag => tag.toLowerCase().includes(searchText));
    });

    filtered.forEach(prompt => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'prompt-item';
      const isSelected = selectedPrompt && selectedPrompt.id === prompt.id;
      item.setAttribute('aria-pressed', String(Boolean(isSelected)));
      if (isSelected) {
        item.classList.add('selected');
      }

      const title = document.createElement('div');
      title.className = 'prompt-item-title';
      const lang = window.cloverLang();
      title.textContent = (lang === 'ru' && prompt.titleRu) ? prompt.titleRu : prompt.title;

      const id = document.createElement('div');
      id.className = 'prompt-item-id';
      id.textContent = prompt.id;

      const preview = document.createElement('div');
      preview.className = 'prompt-item-preview';
      const promptText = prompt.prompt
        .replace(/^<ooc>\s*/i, '')
        .replace(/\s*<\/ooc>$/i, '')
        .replace(/^Image generation\s*:\s*/i, '');
      preview.textContent = promptText.substring(0, 60) + (promptText.length > 60 ? '...' : '');

      const promptTitle = lang === 'ru' && prompt.titleRu ? prompt.titleRu : prompt.title;
      item.setAttribute('aria-label', lang === 'ru' ? `Выбрать базовый промпт: ${promptTitle}` : `Select base prompt: ${promptTitle}`);

      item.appendChild(title);
      item.appendChild(id);
      item.appendChild(preview);

      item.addEventListener('click', () => selectPrompt(prompt));

      promptsList.appendChild(item);
    });
  }

  // ═══ CONSTRUCTOR: SELECT PROMPT ═══
  function selectPrompt(prompt) {
    selectedPrompt = prompt;
    // Picking a real base prompt resets any ad-hoc hook from "Try this"
    customHook = null;
    renderPrompts(constructorSearch.value);
    updateOutput();
    copyButton.disabled = false;
  }
  // ═══ CONSTRUCTOR: RENDER EFFECTS ═══
  const constructorBgAvailable = document.getElementById('constructor-bg-available');
  const constructorOvAvailable = document.getElementById('constructor-ov-available');
  const constructorCameraAvailable = document.getElementById('constructor-camera-available');

  // Per-sub-tab search text and collapsed category names.
  const subtabFilters = { overlays: '', effects: '', backgrounds: '', camera: '' };
  const collapsedGroups = { overlays: {}, effects: {}, backgrounds: {}, camera: {} };

  function makeTag(term, nameRu, container, withTranslation) {
    var tag = document.createElement('button');
    tag.className = 'effect-tag';
    tag.type = 'button';
    const termText = document.createElement('span');
    termText.textContent = term;
    tag.appendChild(termText);
    if (withTranslation && nameRu) {
      const translation = document.createElement('span');
      translation.className = 'effect-tag-translation lang-ru';
      translation.textContent = nameRu;
      tag.appendChild(translation);
    }
    if (nameRu) tag.dataset.tip = nameRu;
    const isSelected = selectedEffects.includes(term);
    tag.setAttribute('aria-pressed', String(isSelected));
    if (isSelected) tag.classList.add('selected');
    tag.addEventListener('click', () => toggleEffect(term));
    container.appendChild(tag);
  }

  /* Renders one sub-tab as collapsible category groups honouring its search. */
  function renderChipGroups(container, scope, groups, withTranslation) {
    if (!container) return;
    container.textContent = '';
    const filter = (subtabFilters[scope] || '').toLowerCase();
    const lang = document.documentElement.dataset.lang || 'en';
    let shown = 0;

    groups.forEach(group => {
      const groupHit = filter && (
        group.name.toLowerCase().includes(filter) ||
        (group.nameRu || '').toLowerCase().includes(filter)
      );
      const matches = group.items.filter(it => {
        if (!filter || groupHit) return true;
        return it.term.toLowerCase().includes(filter) ||
               (it.nameRu || '').toLowerCase().includes(filter) ||
               (it.description || '').toLowerCase().includes(filter);
      });
      if (!matches.length) return;
      shown += matches.length;

      const selectedHere = matches.filter(it => selectedEffects.includes(it.term)).length;
      // A live search should reveal its hits regardless of collapse state.
      const collapsed = !filter && collapsedGroups[scope][group.name] === true;

      const wrap = document.createElement('div');
      wrap.className = 'chip-group';

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'chip-group-head';
      head.setAttribute('aria-expanded', String(!collapsed));

      const caret = document.createElement('span');
      caret.className = 'chip-group-caret';
      caret.textContent = collapsed ? '▸' : '▾';

      const label = document.createElement('span');
      label.className = 'chip-group-name';
      label.textContent = lang === 'ru' && group.nameRu ? group.nameRu : group.name;

      const count = document.createElement('span');
      count.className = 'chip-group-count';
      count.textContent = selectedHere ? selectedHere + '/' + matches.length : String(matches.length);
      if (selectedHere) count.classList.add('has-selected');

      head.appendChild(caret);
      head.appendChild(label);
      head.appendChild(count);
      head.addEventListener('click', () => {
        collapsedGroups[scope][group.name] = !collapsed;
        renderConstructorEffects();
      });

      const body = document.createElement('div');
      body.className = 'chip-group-body';
      body.hidden = collapsed;
      matches.forEach(it => makeTag(it.term, it.nameRu, body, withTranslation));

      wrap.appendChild(head);
      wrap.appendChild(body);
      container.appendChild(wrap);
    });

    if (shown === 0) {
      const empty = document.createElement('p');
      empty.className = 'chip-group-empty';
      empty.textContent = lang === 'ru' ? 'Ничего не найдено.' : 'No matches.';
      container.appendChild(empty);
    }
  }

  function renderConstructorEffects() {
    effectsSelected.textContent = '';

    renderChipGroups(effectsAvailable, 'effects',
      effectsData.categories.map(c => ({ name: c.name, nameRu: c.nameRu, items: c.effects })), false);

    renderChipGroups(constructorOvAvailable, 'overlays',
      overlaysData.categories.map(c => ({ name: c.name, nameRu: c.nameRu, items: c.items })), false);

    renderChipGroups(constructorBgAvailable, 'backgrounds',
      backgroundsData.categories.map(c => ({ name: c.name, nameRu: c.nameRu, items: c.backgrounds })), false);

    renderChipGroups(constructorCameraAvailable, 'camera',
      cameraData.categories.map(c => ({ name: c.name, nameRu: c.nameRu, items: c.terms })), true);

    const lang = document.documentElement.dataset.lang || 'en';

    if (selectedPresetBlock) {
      var recipeTag = document.createElement('button');
      recipeTag.className = 'effect-tag selected is-recipe';
      recipeTag.type = 'button';
      recipeTag.textContent = '✦ ' + (lang === 'ru' && selectedPresetBlock.nameRu
        ? selectedPresetBlock.nameRu
        : selectedPresetBlock.name);
      recipeTag.setAttribute('aria-pressed', 'true');
      recipeTag.setAttribute('aria-label', lang === 'ru' ? 'Убрать рецепт' : 'Remove recipe');
      recipeTag.addEventListener('click', () => {
        selectedPresetBlock = null;
        renderConstructorEffects();
        updateOutput();
      });
      effectsSelected.appendChild(recipeTag);
    }

    selectedEffects.forEach(term => {
      var tag = document.createElement('button');
      tag.className = 'effect-tag selected';
      tag.type = 'button';
      tag.textContent = term;
      tag.setAttribute('aria-pressed', 'true');
      tag.addEventListener('click', () => toggleEffect(term));
      effectsSelected.appendChild(tag);
    });

    if (selectedPresetBlock || selectedEffects.length) {
      var clearAll = document.createElement('button');
      clearAll.className = 'chip-clear-all';
      clearAll.type = 'button';
      clearAll.textContent = lang === 'ru' ? 'Очистить всё' : 'Clear all';
      clearAll.addEventListener('click', () => {
        selectedEffects = [];
        selectedPresetBlock = null;
        renderConstructorEffects();
        updateOutput();
      });
      effectsSelected.appendChild(clearAll);
    }
  }

  // ═══ CONSTRUCTOR: SUB-TAB SEARCH ═══
  document.querySelectorAll('.subtab-search-input').forEach(function (input) {
    input.addEventListener('input', function () {
      subtabFilters[input.dataset.scope] = input.value;
      renderConstructorEffects();
    });
  });

  // ═══ CONSTRUCTOR: SUB-TABS ═══
  var subtabBtns = document.querySelectorAll('.constructor-subtab');
  subtabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      subtabBtns.forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.tabIndex = -1;
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.tabIndex = 0;
      document.querySelectorAll('.constructor-subtab-content').forEach(function(c) {
        c.classList.remove('active');
        c.hidden = true;
      });
      var target = document.getElementById('subtab-' + btn.dataset.subtab);
      if (target) {
        target.classList.add('active');
        target.hidden = false;
      }
    });
  });

  document.querySelector('.constructor-subtabs')?.addEventListener('keydown', function(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(document.querySelectorAll('.constructor-subtab'));
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    buttons[next].focus();
    buttons[next].click();
  });

  // ═══ CONSTRUCTOR: TOGGLE EFFECT ═══
  function toggleEffect(term) {
    const index = selectedEffects.indexOf(term);
    if (index > -1) {
      selectedEffects.splice(index, 1);
    } else {
      selectedEffects.push(term);
    }
    renderConstructorEffects();
    updateOutput();
    if (copyButton) copyButton.disabled = !(selectedPrompt || customHook || selectedPresetBlock || selectedEffects.length || selectedAspectRatio);
  }

  // ═══ CONSTRUCTOR: UPDATE OUTPUT ═══
  function updateOutput() {
    const lang = window.cloverLang();

    // Prompt surfaces always use canonical English; only surrounding UI is localized.
    let hookText = customHook ? customHook.en : '';
    if (hookText) {
      hookText = hookText.replace(/[.!?…]+\s*$/u, '').trim();
    }

    // Additions list = aspect ratio + recipe block + effects.
    const additions = [];
    if (selectedAspectRatio) {
      additions.push(`--ar ${selectedAspectRatio}`);
    }
    if (selectedPresetBlock) {
      additions.push(selectedPresetBlock.en);
    }
    if (selectedEffects.length > 0) {
      additions.push(selectedEffects.join(', '));
    }
    const additionsString = additions.join(', ');

    function composeOutput(hook, adds) {
      const parts = [];
      if (hook) parts.push(hook + '.');
      if (adds) parts.push(adds);

      if (selectedPrompt) {
        let value = selectedPrompt.prompt;
        if (parts.length) {
          value = value.replace(/\s*<\/ooc>\s*$/i, ` ${parts.join(' ')}\n</ooc>`);
        }
        return value;
      }
      return parts.length ? `<ooc>\nImage generation: ${parts.join(' ')}\n</ooc>` : '';
    }

    if (selectedPrompt || hookText || additionsString) {
      const output = composeOutput(hookText, additionsString);
      copyOutputValue = output;
      outputPrompt.value = output;
      outputPrompt.placeholder = '';
    } else {
      copyOutputValue = '';
      outputPrompt.value = '';
      outputPrompt.placeholder = lang === 'en' ? 'Select a base prompt to start...' : 'Выберите базовый промпт...';
    }
  }

  // ═══ TOAST (transient lang-aware notification) ═══
  const showToast = window.cloverToast;

  // ═══ "TRY THIS" RECIPE APPLICATION ═══
  /* Shared tail for every "load a recipe into the constructor" entry point. */
  function applySelection(subtab, toastEn, toastRu) {
    switchTab('constructor');
    const btn = document.querySelector('.constructor-subtab[data-subtab="' + subtab + '"]');
    if (btn) btn.click();

    renderPrompts(constructorSearch ? constructorSearch.value : '');
    renderConstructorEffects();
    updateOutput();
    if (copyButton) copyButton.disabled = false;

    if (outputPrompt) {
      outputPrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast(toastEn, toastRu);
  }

  /* Keeps the ratio chips in sync whenever selection is replaced wholesale. */
  function syncAspectButtons() {
    aspectButtons.forEach(b => {
      const on = b.dataset.ratio === selectedAspectRatio;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function applyOverlayPreset(preset) {
    selectedPrompt = null;
    customHook = null;
    // The composed block already spells out every clause, so it replaces the
    // keyword chips rather than sitting alongside them.
    selectedEffects = [];
    selectedPresetBlock = {
      id: preset.id,
      name: preset.name,
      nameRu: preset.nameRu,
      en: preset.block
    };
    applySelection('overlays', 'Recipe loaded', 'Рецепт загружен');
  }

  function applyBackgroundRecipe(bg) {
    // Fresh recipe: drop any previously selected base prompt so the output
    // becomes the recipe alone, not "base prompt + recipe layered on top".
    selectedPrompt = null;
    selectedPresetBlock = null;
    customHook = { en: bg.sampleHookEn || '' };

    // New selection: background term first, then pairsWith.
    const recipe = [bg.term];
    if (Array.isArray(bg.pairsWith)) {
      bg.pairsWith.forEach(t => { if (!recipe.includes(t)) recipe.push(t); });
    }
    selectedEffects = recipe;

    applySelection('backgrounds', 'Loaded into constructor', 'Загружено в конструктор');
  }

  // ═══ CONSTRUCTOR: ASPECT RATIO ═══
  aspectButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const ratio = btn.dataset.ratio;

      aspectButtons.forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');

      selectedAspectRatio = ratio;
      updateOutput();
      if (copyButton) copyButton.disabled = !(selectedPrompt || customHook || selectedPresetBlock || selectedEffects.length || selectedAspectRatio);
    });
  });

  // ═══ CONSTRUCTOR: COPY OUTPUT ═══
  let copyRestoreTimer = null;
  copyButton.addEventListener('click', async () => {
    if (!outputPrompt.value) return;

    if (!(await window.cloverCopy(copyOutputValue))) {
      outputPrompt.select();
      return;
    }

    // Cancel any pending restoration so rapid double-clicks don't stack timers.
    if (copyRestoreTimer) clearTimeout(copyRestoreTimer);

    copyButton.textContent = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);

    const spanEn = document.createElement('span');
    spanEn.className = 'lang-en';
    spanEn.textContent = 'Copied!';

    const spanRu = document.createElement('span');
    spanRu.className = 'lang-ru';
    spanRu.textContent = 'Скопировано!';

    copyButton.appendChild(svg);
    copyButton.appendChild(spanEn);
    copyButton.appendChild(spanRu);

    copyRestoreTimer = setTimeout(() => {
      copyButton.textContent = '';

      const svgOrig = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgOrig.setAttribute('width', '18');
      svgOrig.setAttribute('height', '18');
      svgOrig.setAttribute('viewBox', '0 0 24 24');
      svgOrig.setAttribute('fill', 'none');
      svgOrig.setAttribute('stroke', 'currentColor');
      svgOrig.setAttribute('stroke-width', '2');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '9');
      rect.setAttribute('y', '9');
      rect.setAttribute('width', '13');
      rect.setAttribute('height', '13');
      rect.setAttribute('rx', '2');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

      svgOrig.appendChild(rect);
      svgOrig.appendChild(path);

      const spanEnOrig = document.createElement('span');
      spanEnOrig.className = 'lang-en';
      spanEnOrig.textContent = 'Copy';

      const spanRuOrig = document.createElement('span');
      spanRuOrig.className = 'lang-ru';
      spanRuOrig.textContent = 'Копировать';

      copyButton.appendChild(svgOrig);
      copyButton.appendChild(spanEnOrig);
      copyButton.appendChild(spanRuOrig);
    }, 2000);
  });

  // ═══ CONSTRUCTOR: SEARCH ═══
  constructorSearch.addEventListener('input', (e) => {
    renderPrompts(e.target.value);
  });

  function showCopyFeedback(target, badgeContainer = target) {
    target.querySelector('.copy-badge')?.remove();
    if (target._copyTimer) clearTimeout(target._copyTimer);
    target.classList.add('copied');
    const badge = document.createElement('span');
    badge.className = 'copy-badge';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.textContent = document.documentElement.dataset.lang === 'ru' ? 'Скопировано!' : 'Copied!';
    badgeContainer.appendChild(badge);
    target._copyTimer = setTimeout(() => {
      target.classList.remove('copied');
      badge.remove();
      target._copyTimer = null;
    }, 1200);
  }

  // ═══ EFFECTS LIBRARY: RENDER ═══
  function renderEffectsLibrary(filter = '') {
    effectsLibrary.textContent = '';

    effectsData.categories.forEach(category => {
      const filtered = category.effects.filter(effect => {
        const searchText = filter.toLowerCase();
        return effect.term.toLowerCase().includes(searchText) ||
               effect.nameRu.toLowerCase().includes(searchText) ||
               effect.description.toLowerCase().includes(searchText) ||
               effect.descriptionRu.toLowerCase().includes(searchText);
      });

      if (filtered.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'effect-category';

      const header = document.createElement('div');
      header.className = 'category-header';

      const nameEn = document.createElement('h2');
      nameEn.className = 'category-name lang-en';
      nameEn.textContent = category.name;

      const nameRu = document.createElement('h2');
      nameRu.className = 'category-name lang-ru';
      nameRu.textContent = category.nameRu;

      const count = document.createElement('span');
      count.className = 'category-count';
      count.textContent = filtered.length;

      header.appendChild(nameEn);
      header.appendChild(nameRu);
      header.appendChild(count);

      const list = document.createElement('div');
      list.className = 'effects-list';

      filtered.forEach(effect => {
        const card = document.createElement('div');
        card.className = 'effect-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        const lang = document.documentElement.dataset.lang || 'en';
        card.setAttribute('aria-label', lang === 'ru' ? `Копировать эффект: ${effect.term}` : `Copy effect: ${effect.term}`);

        const term = document.createElement('div');
        term.className = 'effect-term';
        term.textContent = effect.term;

        const descEn = document.createElement('div');
        descEn.className = 'effect-description lang-en';
        descEn.textContent = effect.description;

        const descRu = document.createElement('div');
        descRu.className = 'effect-description lang-ru';
        descRu.textContent = effect.descriptionRu;

        card.appendChild(term);
        card.appendChild(descEn);
        card.appendChild(descRu);

        const copyEffect = async () => {
          if (!(await window.cloverCopy(effect.term))) return;
          showCopyFeedback(card);
        };
        card.addEventListener('click', copyEffect);
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            copyEffect();
          }
        });

        list.appendChild(card);
      });

      categoryDiv.appendChild(header);
      categoryDiv.appendChild(list);
      effectsLibrary.appendChild(categoryDiv);
    });
  }

  // ═══ EFFECTS LIBRARY: SEARCH ═══
  effectsSearch.addEventListener('input', (e) => {
    renderEffectsLibrary(e.target.value);
  });

  // ═══ CAMERA & COMPOSITION LIBRARY ═══
  function renderCameraLibrary(filter = '') {
    if (!cameraLibrary) return;
    cameraLibrary.textContent = '';

    cameraData.categories.forEach(category => {
      const searchText = filter.toLowerCase();
      const filtered = category.terms.filter(item =>
        item.term.toLowerCase().includes(searchText) ||
        item.nameRu.toLowerCase().includes(searchText) ||
        item.description.toLowerCase().includes(searchText) ||
        item.descriptionRu.toLowerCase().includes(searchText)
      );

      if (filtered.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'effect-category';

      const header = document.createElement('div');
      header.className = 'category-header';

      const nameEn = document.createElement('h2');
      nameEn.className = 'category-name lang-en';
      nameEn.textContent = category.name;

      const nameRu = document.createElement('h2');
      nameRu.className = 'category-name lang-ru';
      nameRu.textContent = category.nameRu;

      const count = document.createElement('span');
      count.className = 'category-count';
      count.textContent = filtered.length;

      header.appendChild(nameEn);
      header.appendChild(nameRu);
      header.appendChild(count);

      const list = document.createElement('div');
      list.className = 'effects-list';

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'effect-card camera-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        const lang = document.documentElement.dataset.lang || 'en';
        card.setAttribute('aria-label', lang === 'ru' ? `Копировать термин съёмки: ${item.term}` : `Copy camera term: ${item.term}`);

        const term = document.createElement('div');
        term.className = 'effect-term';
        term.textContent = item.term;

        const name = document.createElement('div');
        name.className = 'camera-name lang-ru';
        name.textContent = item.nameRu;

        const descEn = document.createElement('div');
        descEn.className = 'effect-description lang-en';
        descEn.textContent = item.description;

        const descRu = document.createElement('div');
        descRu.className = 'effect-description lang-ru';
        descRu.textContent = item.descriptionRu;

        card.appendChild(term);
        card.appendChild(name);
        card.appendChild(descEn);
        card.appendChild(descRu);

        const copyTerm = async () => {
          if (!(await window.cloverCopy(item.term))) return;
          showCopyFeedback(card);
        };

        card.addEventListener('click', copyTerm);
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            copyTerm();
          }
        });

        list.appendChild(card);
      });

      categoryDiv.appendChild(header);
      categoryDiv.appendChild(list);
      cameraLibrary.appendChild(categoryDiv);
    });
  }

  if (cameraSearch) {
    cameraSearch.addEventListener('input', event => renderCameraLibrary(event.target.value));
  }

  // ═══ EFFECT STACKS: RENDER ═══
  const stacksGrid = document.getElementById('stacks-grid');
  const effectStacks = Array.isArray(effectsData.stacks) ? effectsData.stacks : [];

  function renderEffectStacks() {
    if (!stacksGrid) return;
    stacksGrid.textContent = '';

    effectStacks.forEach(stack => {
      const card = document.createElement('div');
      card.className = 'stack-card';
      card.setAttribute('data-stack-id', stack.id);

      const title = document.createElement('h4');
      title.className = 'stack-name';
      const nameEn = document.createElement('span');
      nameEn.className = 'lang-en';
      nameEn.textContent = stack.name;
      const nameRu = document.createElement('span');
      nameRu.className = 'lang-ru';
      nameRu.textContent = stack.nameRu;
      title.appendChild(nameEn);
      title.appendChild(nameRu);

      const desc = document.createElement('p');
      desc.className = 'stack-description';
      const descEn = document.createElement('span');
      descEn.className = 'lang-en';
      descEn.textContent = stack.description;
      const descRu = document.createElement('span');
      descRu.className = 'lang-ru';
      descRu.textContent = stack.descriptionRu;
      desc.appendChild(descEn);
      desc.appendChild(descRu);

      // Effect chips row - display only (non-interactive).
      const effectsRow = document.createElement('div');
      effectsRow.className = 'stack-effects-row';
      stack.effects.forEach(term => {
        const chip = document.createElement('span');
        chip.className = 'stack-effect-chip';
        chip.textContent = term;
        const ru = termGlossary[term];
        if (ru) chip.dataset.tip = ru;
        effectsRow.appendChild(chip);
      });

      // Overlay chips row - display only, only if the stack has overlays.
      let overlaysRow = null;
      if (Array.isArray(stack.overlays) && stack.overlays.length > 0) {
        overlaysRow = document.createElement('div');
        overlaysRow.className = 'stack-overlays-row';
        const ovLabelEn = document.createElement('span');
        ovLabelEn.className = 'lang-en stack-row-label';
        ovLabelEn.textContent = '+';
        const ovLabelRu = document.createElement('span');
        ovLabelRu.className = 'lang-ru stack-row-label';
        ovLabelRu.textContent = '+';
        overlaysRow.appendChild(ovLabelEn);
        overlaysRow.appendChild(ovLabelRu);
        stack.overlays.forEach(term => {
          const chip = document.createElement('span');
          chip.className = 'stack-overlay-chip';
          chip.textContent = term;
          const ru = termGlossary[term];
          if (ru) chip.dataset.tip = ru;
          overlaysRow.appendChild(chip);
        });
      }

      const bgPill = document.createElement('div');
      bgPill.className = 'stack-bg-pill';
      const bgLabelEn = document.createElement('span');
      bgLabelEn.className = 'lang-en stack-bg-label';
      bgLabelEn.textContent = 'on';
      const bgLabelRu = document.createElement('span');
      bgLabelRu.className = 'lang-ru stack-bg-label';
      bgLabelRu.textContent = 'фон:';
      const bgTerm = document.createElement('span');
      bgTerm.className = 'stack-bg-term';
      bgTerm.textContent = stack.background;
      const bgTip = termGlossary[stack.background];
      if (bgTip) bgTerm.dataset.tip = bgTip;
      bgPill.appendChild(bgLabelEn);
      bgPill.appendChild(bgLabelRu);
      bgPill.appendChild(bgTerm);

      const tryBtn = document.createElement('button');
      tryBtn.type = 'button';
      tryBtn.className = 'try-this-btn stack-try-btn';
      const tryEn = document.createElement('span');
      tryEn.className = 'lang-en';
      tryEn.textContent = 'Try this →';
      const tryRu = document.createElement('span');
      tryRu.className = 'lang-ru';
      tryRu.textContent = 'Применить →';
      tryBtn.appendChild(tryEn);
      tryBtn.appendChild(tryRu);
      const lang = document.documentElement.dataset.lang || 'en';
      tryBtn.setAttribute('aria-label', lang === 'ru' ? `Загрузить набор «${stack.nameRu}» в конструктор` : `Load ${stack.name} stack into the constructor`);
      tryBtn.addEventListener('click', () => applyEffectStack(stack));

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(effectsRow);
      if (overlaysRow) card.appendChild(overlaysRow);
      card.appendChild(bgPill);
      card.appendChild(tryBtn);

      stacksGrid.appendChild(card);
    });
  }

  // ═══ APPLY STACK ═══
  // Loads effects + background + overlays + hook into the constructor.
  function applyEffectStack(stack) {
    // Fresh recipe: drop any previously selected base prompt so the output
    // becomes the stack alone, not "base prompt + stack layered on top".
    selectedPrompt = null;
    selectedPresetBlock = null;

    // Build selection: effects → background → overlays (all become OOC keywords).
    const recipe = [];
    if (Array.isArray(stack.effects)) {
      stack.effects.forEach(t => { if (!recipe.includes(t)) recipe.push(t); });
    }
    if (stack.background && !recipe.includes(stack.background)) {
      recipe.push(stack.background);
    }
    if (Array.isArray(stack.overlays)) {
      stack.overlays.forEach(t => { if (!recipe.includes(t)) recipe.push(t); });
    }
    selectedEffects = recipe;

    customHook = { en: stack.sampleHookEn || '' };

    // Stacks are effect-centric - open the Effects sub-tab on switch.
    applySelection('effects', 'Stack loaded', 'Набор загружен');
  }

  // ═══ BACKGROUNDS LIBRARY: RENDER ═══
  const backgroundsLibrary = document.getElementById('backgrounds-library');
  const backgroundsSearch = document.getElementById('backgrounds-search');

  function renderBackgroundsLibrary(filter = '') {
    if (!backgroundsLibrary) return;
    backgroundsLibrary.textContent = '';

    backgroundsData.categories.forEach(category => {
      const filtered = category.backgrounds.filter(bg => {
        const searchText = filter.toLowerCase();
        return bg.term.toLowerCase().includes(searchText) ||
               bg.nameRu.toLowerCase().includes(searchText) ||
               bg.description.toLowerCase().includes(searchText) ||
               bg.descriptionRu.toLowerCase().includes(searchText);
      });

      if (filtered.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'effect-category';

      const header = document.createElement('div');
      header.className = 'category-header';

      const nameEn = document.createElement('h2');
      nameEn.className = 'category-name lang-en';
      nameEn.textContent = category.name;

      const nameRu = document.createElement('h2');
      nameRu.className = 'category-name lang-ru';
      nameRu.textContent = category.nameRu;

      const count = document.createElement('span');
      count.className = 'category-count';
      count.textContent = filtered.length;

      header.appendChild(nameEn);
      header.appendChild(nameRu);
      header.appendChild(count);

      const list = document.createElement('div');
      list.className = 'effects-list';

      filtered.forEach(bg => {
        const card = document.createElement('div');
        card.className = 'bg-card';

        const swatch = document.createElement('div');
        swatch.className = 'bg-swatch';
        swatch.style.background = bg.preview;

        const info = document.createElement('div');
        info.className = 'bg-info';

        const term = document.createElement('div');
        term.className = 'effect-term';
        term.textContent = bg.term;

        const descEn = document.createElement('div');
        descEn.className = 'effect-description lang-en';
        descEn.textContent = bg.description;

        const descRu = document.createElement('div');
        descRu.className = 'effect-description lang-ru';
        descRu.textContent = bg.descriptionRu;

        info.appendChild(term);
        info.appendChild(descEn);
        info.appendChild(descRu);

        // ─── pairsWith chip row (when the entry defines pairings) ───
        if (Array.isArray(bg.pairsWith) && bg.pairsWith.length > 0) {
          const pairsRow = document.createElement('div');
          pairsRow.className = 'pairs-with';

          const pairsLabel = document.createElement('span');
          pairsLabel.className = 'pairs-with-label';
          const labelEn = document.createElement('span');
          labelEn.className = 'lang-en';
          labelEn.textContent = 'Pairs with:';
          const labelRu = document.createElement('span');
          labelRu.className = 'lang-ru';
          labelRu.textContent = 'Сочетается с:';
          pairsLabel.appendChild(labelEn);
          pairsLabel.appendChild(labelRu);
          pairsRow.appendChild(pairsLabel);

          bg.pairsWith.forEach(pterm => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'pairs-chip';
            chip.textContent = pterm;
            const ru = termGlossary[pterm];
            if (ru) chip.dataset.tip = ru;
            chip.setAttribute('aria-label', (document.documentElement.dataset.lang || 'en') === 'ru' ? `Копировать термин: ${pterm}` : `Copy term: ${pterm}`);
            chip.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              if (await window.cloverCopy(pterm)) {
                if (chip._copyTimer) clearTimeout(chip._copyTimer);
                chip.classList.add('copied');
                chip._copyTimer = setTimeout(() => {
                  chip.classList.remove('copied');
                  chip._copyTimer = null;
                }, 900);
              }
            });
            pairsRow.appendChild(chip);
          });

          info.appendChild(pairsRow);
        }

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'background-copy-btn';
        const copyEn = document.createElement('span');
        copyEn.className = 'lang-en';
        copyEn.textContent = 'Copy';
        const copyRu = document.createElement('span');
        copyRu.className = 'lang-ru';
        copyRu.textContent = 'Копировать';
        copyBtn.appendChild(copyEn);
        copyBtn.appendChild(copyRu);
        const lang = document.documentElement.dataset.lang || 'en';
        copyBtn.setAttribute('aria-label', lang === 'ru' ? `Копировать фон: ${bg.term}` : `Copy background: ${bg.term}`);
        copyBtn.addEventListener('click', async () => {
          if (!(await window.cloverCopy(bg.term))) return;
          showCopyFeedback(copyBtn);
        });
        info.appendChild(copyBtn);

        // ─── "Try this" button (when the entry defines a sample hook) ───
        if (bg.sampleHookEn) {
          const tryBtn = document.createElement('button');
          tryBtn.type = 'button';
          tryBtn.className = 'try-this-btn';
          const tryEn = document.createElement('span');
          tryEn.className = 'lang-en';
          tryEn.textContent = 'Try this →';
          const tryRu = document.createElement('span');
          tryRu.className = 'lang-ru';
          tryRu.textContent = 'Применить →';
          tryBtn.appendChild(tryEn);
          tryBtn.appendChild(tryRu);
          const lang = document.documentElement.dataset.lang || 'en';
          tryBtn.setAttribute('aria-label', lang === 'ru' ? `Загрузить фон «${bg.nameRu}» и подобранные эффекты в конструктор` : `Load ${bg.term} background and suggested effects into the constructor`);
          tryBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            applyBackgroundRecipe(bg);
          });
          info.appendChild(tryBtn);
        }

        card.appendChild(swatch);
        card.appendChild(info);

        list.appendChild(card);
      });

      categoryDiv.appendChild(header);
      categoryDiv.appendChild(list);
      backgroundsLibrary.appendChild(categoryDiv);
    });
  }

  if (backgroundsSearch) {
    backgroundsSearch.addEventListener('input', (e) => {
      renderBackgroundsLibrary(e.target.value);
    });
  }

  // ═══ OVERLAYS: FACET STATE ═══
  const overlayPresets = Array.isArray(overlaysData.presets) ? overlaysData.presets : [];

  const PLACEMENTS = [
    { key: 'full-frame', en: 'Full frame', ru: 'Весь кадр' },
    { key: 'foreground', en: 'Foreground', ru: 'Передний план' },
    { key: 'background', en: 'Background', ru: 'Фон' },
    { key: 'border', en: 'Border', ru: 'Рамка' }
  ];

  let ovPlacementFilter = [];
  let ovCenterClearOnly = false;
  let lastRandomOverlay = null;

  function placementLabel(key) {
    const lang = document.documentElement.dataset.lang || 'en';
    const p = PLACEMENTS.find(x => x.key === key);
    if (!p) return key;
    return lang === 'ru' ? p.ru : p.en;
  }

  function ovFilterCount() {
    return ovPlacementFilter.length + (ovCenterClearOnly ? 1 : 0);
  }

  function matchesOverlayFacets(item) {
    if (ovPlacementFilter.length && !ovPlacementFilter.includes(item.placement)) return false;
    if (ovCenterClearOnly && !item.centerClear) return false;
    return true;
  }

  function matchesOverlayText(item, filter, category) {
    if (!filter) return true;
    const s = filter.toLowerCase();
    if (category && (category.name.toLowerCase().includes(s) ||
                     (category.nameRu || '').toLowerCase().includes(s))) return true;
    return item.term.toLowerCase().includes(s) ||
           item.nameRu.toLowerCase().includes(s) ||
           item.description.toLowerCase().includes(s) ||
           item.descriptionRu.toLowerCase().includes(s) ||
           item.placement.includes(s) ||
           placementLabel(item.placement).toLowerCase().includes(s);
  }


  // ═══ OVERLAYS LIBRARY: RENDER ═══
  const overlaysLibrary = document.getElementById('overlays-library');
  const overlaysSearch = document.getElementById('overlays-search');

  /* Reference render, or the clover mark over the vibe wash until one exists. */
  function buildOverlayMedia(entry, w, h) {
    const wrap = document.createElement('div');
    wrap.className = 'ov-media';
    wrap.style.background = entry.vibe || 'var(--accent-faint)';
    if (!entry.hasImage || !entry.imgSrc) {
      wrap.appendChild(window.cloverPlaceholder('ov-placeholder'));
      return wrap;
    }
    const img = document.createElement('img');
    img.src = entry.imgSrc;
    img.alt = entry.term || entry.name || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = w;
    img.height = h;
    img.draggable = false;
    img.oncontextmenu = () => false;
    img.addEventListener('error', () => {
      wrap.textContent = '';
      wrap.appendChild(window.cloverPlaceholder('ov-placeholder'));
    });
    wrap.appendChild(img);
    return wrap;
  }

  function buildFacetBadges(entry) {
    const row = document.createElement('div');
    row.className = 'ov-badges';

    const place = document.createElement('span');
    place.className = 'ov-badge ov-badge--' + entry.placement;
    place.textContent = placementLabel(entry.placement);
    row.appendChild(place);

    if (entry.centerClear) {
      const clear = document.createElement('span');
      clear.className = 'ov-badge ov-badge--clear';
      const lang = document.documentElement.dataset.lang || 'en';
      clear.textContent = lang === 'ru' ? 'центр кадра свободен' : 'centre clear';
      row.appendChild(clear);
    }
    return row;
  }

  function renderOverlaysLibrary(filter = '') {
    if (!overlaysLibrary) return;
    overlaysLibrary.textContent = '';

    let shown = 0;

    overlaysData.categories.forEach(category => {
      const filtered = category.items.filter(item =>
        matchesOverlayFacets(item) && matchesOverlayText(item, filter, category)
      );

      if (filtered.length === 0) return;
      shown += filtered.length;

      var categoryDiv = document.createElement('div');
      categoryDiv.className = 'effect-category';

      var header = document.createElement('div');
      header.className = 'category-header';

      var nameEn = document.createElement('h2');
      nameEn.className = 'category-name lang-en';
      nameEn.textContent = category.name;

      var nameRu = document.createElement('h2');
      nameRu.className = 'category-name lang-ru';
      nameRu.textContent = category.nameRu;

      var count = document.createElement('span');
      count.className = 'category-count';
      count.textContent = filtered.length;

      header.appendChild(nameEn);
      header.appendChild(nameRu);
      header.appendChild(count);

      var list = document.createElement('div');
      list.className = 'effects-list';

      filtered.forEach(item => {
        var card = document.createElement('div');
        card.className = 'overlay-card';
        card.dataset.term = item.term;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        var lang = document.documentElement.dataset.lang || 'en';
        card.setAttribute('aria-label', lang === 'ru' ? `Открыть оверлей: ${item.term}` : `Open overlay: ${item.term}`);

        card.appendChild(buildOverlayMedia(item, 928, 1152));

        var info = document.createElement('div');
        info.className = 'overlay-info';

        var term = document.createElement('div');
        term.className = 'effect-term';
        term.textContent = item.term;

        var descEn = document.createElement('div');
        descEn.className = 'effect-description lang-en';
        descEn.textContent = item.description;

        var descRu = document.createElement('div');
        descRu.className = 'effect-description lang-ru';
        descRu.textContent = item.descriptionRu;

        info.appendChild(term);
        info.appendChild(descEn);
        info.appendChild(descRu);
        info.appendChild(buildFacetBadges(item));

        var copyBtn = document.createElement('button');
        copyBtn.className = 'background-copy-btn';
        copyBtn.type = 'button';
        var copyEn = document.createElement('span');
        copyEn.className = 'lang-en';
        copyEn.textContent = 'Copy';
        var copyRu = document.createElement('span');
        copyRu.className = 'lang-ru';
        copyRu.textContent = 'Копировать';
        copyBtn.appendChild(copyEn);
        copyBtn.appendChild(copyRu);
        copyBtn.setAttribute('aria-label', lang === 'ru' ? `Копировать оверлей: ${item.term}` : `Copy overlay: ${item.term}`);
        copyBtn.addEventListener('click', async ev => {
          ev.stopPropagation();
          if (!(await window.cloverCopy(item.term))) return;
          showCopyFeedback(card, info);
        });
        info.appendChild(copyBtn);

        card.appendChild(info);

        const open = () => openOverlayModal(item, 'keyword');
        card.addEventListener('click', open);
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });

        list.appendChild(card);
      });

      categoryDiv.appendChild(header);
      categoryDiv.appendChild(list);
      overlaysLibrary.appendChild(categoryDiv);
    });

    const lang = document.documentElement.dataset.lang || 'en';
    if (shown === 0) {
      const empty = document.createElement('p');
      empty.className = 'ov-empty';
      empty.textContent = lang === 'ru'
        ? 'Ничего не найдено. Сбросьте фильтры или измените запрос.'
        : 'Nothing matches. Clear the filters or change your search.';
      overlaysLibrary.appendChild(empty);
    }

    const total = overlaysData.categories.reduce((n, c) => n + c.items.length, 0);
    if (ovFilterCount() || filter) {
      ovFilterCountEl.textContent = shown + ' / ' + total;
    } else {
      ovFilterCountEl.textContent = '';
    }
    ovToggleCount.textContent = ovFilterCount() ? String(ovFilterCount()) : '';
    ovFilterClear.disabled = ovFilterCount() === 0;
  }

  if (overlaysSearch) {
    overlaysSearch.addEventListener('input', (e) => {
      renderOverlaysLibrary(e.target.value);
    });
  }

  // ═══ OVERLAY RECIPES (composed blocks) ═══
  const presetsGrid = document.getElementById('overlay-presets-grid');

  function renderOverlayPresets() {
    if (!presetsGrid || !overlayPresets.length) return;
    presetsGrid.textContent = '';
    const lang = document.documentElement.dataset.lang || 'en';

    overlayPresets.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'stack-card ov-recipe-card';
      card.dataset.presetId = preset.id;

      card.appendChild(buildOverlayMedia(preset, 1152, 928));

      const body = document.createElement('div');
      body.className = 'ov-recipe-body';

      const name = document.createElement('h4');
      name.className = 'stack-name';
      const nEn = document.createElement('span');
      nEn.className = 'lang-en';
      nEn.textContent = preset.name;
      const nRu = document.createElement('span');
      nRu.className = 'lang-ru';
      nRu.textContent = preset.nameRu;
      name.appendChild(nEn);
      name.appendChild(nRu);

      const desc = document.createElement('p');
      desc.className = 'stack-description';
      const dEn = document.createElement('span');
      dEn.className = 'lang-en';
      dEn.textContent = preset.description;
      const dRu = document.createElement('span');
      dRu.className = 'lang-ru';
      dRu.textContent = preset.descriptionRu;
      desc.appendChild(dEn);
      desc.appendChild(dRu);

      const chips = document.createElement('div');
      chips.className = 'stack-overlays-row';
      preset.componentTerms.forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'stack-overlay-chip';
        chip.textContent = t;
        if (termGlossary[t]) chip.dataset.tip = termGlossary[t];
        chips.appendChild(chip);
      });

      const actions = document.createElement('div');
      actions.className = 'ov-recipe-actions';

      const viewBtn = document.createElement('button');
      viewBtn.className = 'background-copy-btn';
      viewBtn.type = 'button';
      const vEn = document.createElement('span');
      vEn.className = 'lang-en';
      vEn.textContent = 'View';
      const vRu = document.createElement('span');
      vRu.className = 'lang-ru';
      vRu.textContent = 'Подробнее';
      viewBtn.appendChild(vEn);
      viewBtn.appendChild(vRu);
      viewBtn.addEventListener('click', () => openOverlayModal(preset, 'preset'));

      const tryBtn = document.createElement('button');
      tryBtn.className = 'try-this-btn stack-try-btn';
      tryBtn.type = 'button';
      const tEn = document.createElement('span');
      tEn.className = 'lang-en';
      tEn.textContent = 'Try this →';
      const tRu = document.createElement('span');
      tRu.className = 'lang-ru';
      tRu.textContent = 'Применить →';
      tryBtn.appendChild(tEn);
      tryBtn.appendChild(tRu);
      tryBtn.setAttribute('aria-label', lang === 'ru'
        ? `Загрузить рецепт ${preset.nameRu} в конструктор`
        : `Load recipe ${preset.name} into the constructor`);
      tryBtn.addEventListener('click', () => applyOverlayPreset(preset));

      actions.appendChild(viewBtn);
      actions.appendChild(tryBtn);

      body.appendChild(name);
      body.appendChild(desc);
      body.appendChild(buildFacetBadges(preset));
      body.appendChild(chips);
      body.appendChild(actions);
      card.appendChild(body);
      presetsGrid.appendChild(card);
    });
  }

  // ═══ OVERLAY FACET FILTERS ═══
  const ovFilterToggle = document.getElementById('ov-filter-toggle');
  const ovFilterPanel = document.getElementById('ov-filter-panel');
  const ovToggleCount = document.getElementById('ov-filter-toggle-count');
  const ovFilterCountEl = document.getElementById('ov-filter-count');
  const ovFilterClear = document.getElementById('ov-filter-clear');
  const ovPlacementChips = document.getElementById('ov-placement-chips');
  const ovVisibilityChips = document.getElementById('ov-visibility-chips');
  const ovRandomBtn = document.getElementById('ov-random');

  function renderOverlayFacetChips() {
    if (!ovPlacementChips || !ovVisibilityChips) return;
    const lang = document.documentElement.dataset.lang || 'en';
    const counts = {};
    overlaysData.categories.forEach(c => c.items.forEach(i => {
      counts[i.placement] = (counts[i.placement] || 0) + 1;
    }));

    ovPlacementChips.textContent = '';
    PLACEMENTS.forEach(p => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ov-chip';
      chip.textContent = (lang === 'ru' ? p.ru : p.en) + ' (' + (counts[p.key] || 0) + ')';
      const on = ovPlacementFilter.includes(p.key);
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', String(on));
      chip.addEventListener('click', () => {
        const i = ovPlacementFilter.indexOf(p.key);
        if (i === -1) ovPlacementFilter.push(p.key);
        else ovPlacementFilter.splice(i, 1);
        renderOverlayFacetChips();
        renderOverlaysLibrary(overlaysSearch ? overlaysSearch.value : '');
      });
      ovPlacementChips.appendChild(chip);
    });

    ovVisibilityChips.textContent = '';
    const clearChip = document.createElement('button');
    clearChip.type = 'button';
    clearChip.className = 'ov-chip';
    clearChip.textContent = lang === 'ru' ? 'Центр кадра свободен' : 'Centre stays clear';
    clearChip.classList.toggle('active', ovCenterClearOnly);
    clearChip.setAttribute('aria-pressed', String(ovCenterClearOnly));
    clearChip.addEventListener('click', () => {
      ovCenterClearOnly = !ovCenterClearOnly;
      renderOverlayFacetChips();
      renderOverlaysLibrary(overlaysSearch ? overlaysSearch.value : '');
    });
    ovVisibilityChips.appendChild(clearChip);
  }

  if (ovFilterToggle && ovFilterPanel) {
    ovFilterToggle.addEventListener('click', () => {
      const open = ovFilterToggle.getAttribute('aria-expanded') === 'true';
      ovFilterToggle.setAttribute('aria-expanded', String(!open));
      ovFilterPanel.hidden = open;
    });
  }

  if (ovFilterClear) {
    ovFilterClear.addEventListener('click', () => {
      ovPlacementFilter = [];
      ovCenterClearOnly = false;
      renderOverlayFacetChips();
      renderOverlaysLibrary(overlaysSearch ? overlaysSearch.value : '');
    });
  }

  if (ovRandomBtn) {
    ovRandomBtn.addEventListener('click', () => {
      const filter = overlaysSearch ? overlaysSearch.value : '';
      let pool = [];
      overlaysData.categories.forEach(c => c.items.forEach(i => {
        if (matchesOverlayFacets(i) && matchesOverlayText(i, filter, c)) pool.push(i);
      }));
      if (!pool.length) {
        showToast('Nothing to pick from', 'Нет доступных вариантов');
        return;
      }
      if (pool.length > 1 && lastRandomOverlay) {
        pool = pool.filter(i => i.term !== lastRandomOverlay);
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      lastRandomOverlay = pick.term;
      ovRandomBtn.classList.remove('is-spun');
      void ovRandomBtn.offsetWidth;
      ovRandomBtn.classList.add('is-spun');
      openOverlayModal(pick, 'keyword');
    });
  }

  // ═══ OVERLAY MODAL ═══
  const ovModal = document.getElementById('overlay-modal');

  function openOverlayModal(entry, kind) {
    if (!ovModal) return;
    const lang = document.documentElement.dataset.lang || 'en';
    const isPreset = kind === 'preset';

    ovModal._entry = entry;
    ovModal._kind = kind;
    ovModal._trigger = document.activeElement;

    const title = ovModal.querySelector('.modal-title');
    title.textContent = isPreset
      ? (lang === 'ru' ? entry.nameRu : entry.name)
      : entry.term;

    const tags = ovModal.querySelector('.modal-tags');
    tags.textContent = '';
    tags.appendChild(buildFacetBadges(entry));

    const media = ovModal.querySelector('.modal-image-container');
    media.textContent = '';
    media.classList.toggle('is-preset', isPreset);
    media.appendChild(buildOverlayMedia(entry, isPreset ? 1152 : 928, isPreset ? 928 : 1152));

    ovModal.querySelector('.modal-desc').textContent =
      lang === 'ru' ? entry.descriptionRu : entry.description;

    const code = ovModal.querySelector('.modal-prompt-text code');
    code.textContent = isPreset ? entry.block : entry.term;

    const tryBtn = ovModal.querySelector('.modal-try-btn');
    tryBtn.hidden = !isPreset;

    ovModal.classList.add('visible');
    ovModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    ovModal.querySelector('.modal-close').focus();
  }

  function closeOverlayModal() {
    if (!ovModal) return;
    ovModal.classList.remove('visible');
    ovModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const t = ovModal._trigger;
    if (t && typeof t.focus === 'function') t.focus();
    ovModal._trigger = null;
  }

  if (ovModal) {
    ovModal.querySelector('.modal-close').addEventListener('click', closeOverlayModal);
    ovModal.querySelector('.modal-overlay').addEventListener('click', closeOverlayModal);

    ovModal.querySelector('.modal-copy-btn').addEventListener('click', async () => {
      const entry = ovModal._entry;
      if (!entry) return;
      // Always copy canonical English so the output stays model-facing.
      const text = ovModal._kind === 'preset' ? entry.block : entry.term;
      if (!(await window.cloverCopy(text))) return;
      showToast('Copied', 'Скопировано');
    });

    ovModal.querySelector('.modal-try-btn').addEventListener('click', () => {
      const entry = ovModal._entry;
      if (!entry || ovModal._kind !== 'preset') return;
      closeOverlayModal();
      applyOverlayPreset(entry);
    });

    document.addEventListener('keydown', ev => {
      if (!ovModal.classList.contains('visible')) return;
      if (ev.key === 'Escape') {
        closeOverlayModal();
        return;
      }
      if (ev.key !== 'Tab') return;
      const focusable = ovModal.querySelectorAll('button:not([hidden])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
  }

  // ═══ SEARCH PLACEHOLDERS (update on lang change) ═══
  function updateSearchPlaceholders() {
    const lang = document.documentElement.dataset.lang || 'en';
    if (constructorSearch) {
      constructorSearch.placeholder = lang === 'en' ? 'Search prompts...' : 'Поиск промптов...';
      constructorSearch.setAttribute('aria-label', lang === 'en' ? 'Search prompts' : 'Поиск промптов');
    }
    if (effectsSearch) {
      effectsSearch.placeholder = lang === 'en' ? 'Search effects...' : 'Поиск эффектов...';
      effectsSearch.setAttribute('aria-label', lang === 'en' ? 'Search effects' : 'Поиск эффектов');
    }
    if (backgroundsSearch) {
      backgroundsSearch.placeholder = lang === 'en' ? 'Search backgrounds...' : 'Поиск фонов...';
      backgroundsSearch.setAttribute('aria-label', lang === 'en' ? 'Search backgrounds' : 'Поиск фонов');
    }
    if (overlaysSearch) {
      overlaysSearch.placeholder = lang === 'en' ? 'Search overlays...' : 'Поиск оверлеев...';
      overlaysSearch.setAttribute('aria-label', lang === 'en' ? 'Search overlays' : 'Поиск оверлеев');
    }
    if (cameraSearch) {
      cameraSearch.placeholder = lang === 'en' ? 'Search camera terms...' : 'Поиск по камере и композиции...';
      cameraSearch.setAttribute('aria-label', lang === 'en' ? 'Search camera and composition terms' : 'Поиск по операторским и композиционным терминам');
    }
    const scopeLabels = {
      overlays: { en: 'Filter overlays...', ru: 'Поиск среди оверлеев...' },
      effects: { en: 'Filter effects...', ru: 'Поиск среди эффектов...' },
      backgrounds: { en: 'Filter backgrounds...', ru: 'Поиск среди фонов...' },
      camera: { en: 'Filter camera terms...', ru: 'Поиск по терминам съёмки...' }
    };
    document.querySelectorAll('.subtab-search-input').forEach(input => {
      const l = scopeLabels[input.dataset.scope];
      if (!l) return;
      input.placeholder = lang === 'en' ? l.en : l.ru;
      input.setAttribute('aria-label', (lang === 'en' ? l.en : l.ru).replace('...', ''));
    });
  }

  // ═══ CONSTRUCTOR: RANDOMIZER ═══

  /* Terms that must never co-occur. Each inner array is mutually exclusive;
     a roll keeps at most one member per array. Data, not logic, so the list
     can grow without touching the picker. */
  const CONFLICT_GROUPS = [
    ['golden hour', 'blue hour', 'candlelight'],
    ['deep focus', 'shallow depth of field', 'bokeh', 'soft focus', 'tilt-shift'],
    ['overexposed', 'underexposed', 'silhouette', 'HDR'],
    ['desaturated', 'muted colors'],
    ['warm tones', 'cool tones'],
    ['backlit', 'light from behind', 'light from below', 'side lighting', 'top lighting', 'front lighting'],
    ['fog', 'haze', 'smoke', 'rain'],
    ['high contrast', 'low contrast']
  ];

  /* Backgrounds whose own description already fixes the light, so pairing them
     with a competing lighting effect reads as a contradiction. */
  const LIGHT_LOCKED_BG = /golden hour|sunset|dusk|twilight|moonlit|candlelit|neon|night|scarlet|northern lights|starfield/i;

  function conflictsWith(term, chosen) {
    for (const group of CONFLICT_GROUPS) {
      if (!group.includes(term)) continue;
      if (chosen.some(c => group.includes(c))) return true;
    }
    return false;
  }

  const LOCK_SECTIONS = [
    { key: 'prompt', en: 'Base prompt', ru: 'Базовый промпт' },
    { key: 'overlays', en: 'Overlays', ru: 'Оверлеи' },
    { key: 'effects', en: 'Effects', ru: 'Эффекты' },
    { key: 'backgrounds', en: 'Background', ru: 'Фон' },
    { key: 'camera', en: 'Camera', ru: 'Камера' },
    { key: 'ratio', en: 'Ratio', ru: 'Формат' }
  ];

  const locks = { prompt: false, overlays: false, effects: false, backgrounds: false, camera: false, ratio: false };

  const randomLocksChips = document.getElementById('random-locks-chips');
  const randomRollBtn = document.getElementById('random-roll');
  const chaosToggle = document.getElementById('chaos-mode');

  function renderLockChips() {
    if (!randomLocksChips) return;
    randomLocksChips.textContent = '';
    const lang = document.documentElement.dataset.lang || 'en';
    LOCK_SECTIONS.forEach(sec => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lock-chip';
      chip.classList.toggle('locked', locks[sec.key]);
      chip.setAttribute('aria-pressed', String(locks[sec.key]));
      if (locks[sec.key]) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.classList.add('lock-chip-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        icon.setAttribute('aria-hidden', 'true');

        const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        body.setAttribute('x', '5');
        body.setAttribute('y', '11');
        body.setAttribute('width', '14');
        body.setAttribute('height', '10');
        body.setAttribute('rx', '2');

        const shackle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shackle.setAttribute('d', 'M8 11V7a4 4 0 0 1 8 0v4');

        icon.appendChild(body);
        icon.appendChild(shackle);
        chip.appendChild(icon);
      }

      const label = document.createElement('span');
      label.textContent = lang === 'ru' ? sec.ru : sec.en;
      chip.appendChild(label);
      chip.addEventListener('click', () => {
        locks[sec.key] = !locks[sec.key];
        renderLockChips();
      });
      randomLocksChips.appendChild(chip);
    });
  }

  /* Which category each selected term came from - lets a roll replace only the
     unlocked sections while leaving locked ones untouched. */
  function termsFor(section) {
    const out = [];
    if (section === 'effects') effectsData.categories.forEach(c => c.effects.forEach(e => out.push(e.term)));
    if (section === 'overlays') overlaysData.categories.forEach(c => c.items.forEach(i => out.push(i.term)));
    if (section === 'backgrounds') backgroundsData.categories.forEach(c => c.backgrounds.forEach(b => out.push(b.term)));
    if (section === 'camera') cameraData.categories.forEach(c => c.terms.forEach(t => out.push(t.term)));
    return out;
  }

  function rollConstructor() {
    const chaos = !!(chaosToggle && chaosToggle.checked);
    const rng = makeRng(stableHash(String(Date.now()) + ':' + Math.random()));
    const pick = arr => arr[Math.floor(rng() * arr.length)];

    // Preserve locked sections; drop everything else.
    const keptTerms = [];
    ['overlays', 'effects', 'backgrounds', 'camera'].forEach(sec => {
      if (!locks[sec]) return;
      const owned = termsFor(sec);
      selectedEffects.forEach(t => { if (owned.includes(t) && !keptTerms.includes(t)) keptTerms.push(t); });
    });

    if (!locks.prompt) {
      selectedPrompt = pick(prompts);
      customHook = null;
    }
    if (!locks.ratio) {
      const ratios = ['', '1:1', '16:9', '9:16', '4:3', '3:4', '21:9'];
      selectedAspectRatio = pick(ratios);
      syncAspectButtons();
    }

    const chosen = keptTerms.slice();
    const add = term => {
      if (chosen.includes(term)) return false;
      if (!chaos && conflictsWith(term, chosen)) return false;
      chosen.push(term);
      return true;
    };

    // Overlays: a recipe, or one-to-two keywords with differing placement.
    if (!locks.overlays) {
      selectedPresetBlock = null;
      const useRecipe = overlayPresets.length && rng() < 0.35;
      if (useRecipe) {
        const preset = pick(overlayPresets);
        selectedPresetBlock = {
          id: preset.id,
          name: preset.name,
          nameRu: preset.nameRu,
          en: preset.block
        };
      } else {
        const flat = [];
        overlaysData.categories.forEach(c => c.items.forEach(i => flat.push(i)));
        const first = pick(flat);
        add(first.term);
        if (rng() < 0.4) {
          const partners = flat.filter(i => i.placement !== first.placement);
          if (partners.length) add(pick(partners).term);
        }
      }
    }

    // Background: exactly one - they are mutually exclusive by nature.
    let bgTerm;
    if (!locks.backgrounds) {
      const flatBg = [];
      backgroundsData.categories.forEach(c => c.backgrounds.forEach(b => flatBg.push(b)));
      const bg = pick(flatBg);
      bgTerm = bg.term;
      add(bg.term);
    } else {
      bgTerm = keptTerms.find(t => termsFor('backgrounds').includes(t)) || null;
    }

    // Effects: at most one per category, capped, skipping lighting terms when
    // the background already dictates the light.
    if (!locks.effects) {
      const bgFixesLight = !chaos && bgTerm && LIGHT_LOCKED_BG.test(bgTerm);
      const cap = chaos ? 6 : 4;
      const cats = effectsData.categories.slice().sort(() => rng() - 0.5);
      let added = 0;
      cats.forEach(cat => {
        if (added >= cap) return;
        if (rng() < 0.35) return;
        const candidates = (bgFixesLight && cat.name === 'Light & Atmosphere') ? [] : cat.effects;
        if (!candidates.length) return;
        if (add(pick(candidates).term)) added++;
      });
    }

    // Camera: framing is the useful anchor, then optionally one more.
    if (!locks.camera) {
      const framing = cameraData.categories.find(c => c.name === 'Framing');
      if (framing && framing.terms.length) add(pick(framing.terms).term);
      if (rng() < 0.5) {
        const extra = cameraData.categories.filter(c => c.name === 'Angle' || c.name === 'Composition');
        if (extra.length) {
          const cat = pick(extra);
          if (cat.terms.length) add(pick(cat.terms).term);
        }
      }
    }

    selectedEffects = chosen;

    if (randomRollBtn) {
      randomRollBtn.classList.remove('is-rolled');
      void randomRollBtn.offsetWidth;
      randomRollBtn.classList.add('is-rolled');
    }

    renderPrompts(constructorSearch ? constructorSearch.value : '');
    renderConstructorEffects();
    updateOutput();
    if (copyButton) copyButton.disabled = false;
    if (outputPrompt) outputPrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(chaos ? 'Chaos roll' : 'Rolled', chaos ? 'Режим хаоса применён' : 'Готово');
  }

  if (randomRollBtn) randomRollBtn.addEventListener('click', rollConstructor);

  // Re-render on language change.
  const observer = new MutationObserver(() => {
    updateSearchPlaceholders();
    if (!selectedPrompt) updateOutput();
    renderPrompts(constructorSearch.value);
    renderConstructorEffects();
    renderEffectsLibrary(effectsSearch.value);
    renderCameraLibrary(cameraSearch ? cameraSearch.value : '');
    renderEffectStacks();
    renderBackgroundsLibrary(backgroundsSearch ? backgroundsSearch.value : '');
    renderOverlaysLibrary(overlaysSearch ? overlaysSearch.value : '');
    renderOverlayPresets();
    renderOverlayFacetChips();
    renderLockChips();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang']
  });

  // ═══ INITIALIZE ═══
  renderPrompts();
  renderConstructorEffects();
  renderEffectsLibrary();
  renderCameraLibrary();
  renderEffectStacks();
  renderBackgroundsLibrary();
  renderOverlayFacetChips();
  renderOverlayPresets();
  renderOverlaysLibrary();
  renderLockChips();
  updateSearchPlaceholders();

})();
