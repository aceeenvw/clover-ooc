/* ═══════════════════════════════════════════════
   CLOVER OOC — TOOLS JS
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

  // ═══ TERM → nameRu LOOKUP (for pairsWith chip tooltips) ═══
  const termGlossary = {};
  effectsData.categories.forEach(c => c.effects.forEach(e => { termGlossary[e.term] = e.nameRu; }));
  overlaysData.categories.forEach(c => c.items.forEach(i => { termGlossary[i.term] = i.nameRu; }));
  backgroundsData.categories.forEach(c => c.backgrounds.forEach(b => { termGlossary[b.term] = b.nameRu; }));

  const loadingState = document.getElementById('loading-state');
  if (loadingState) loadingState.remove();

  // ═══ STATE ═══
  let selectedPrompt = null;
  let selectedEffects = [];
  let selectedAspectRatio = '';
  let currentTab = 'constructor';
  // Custom hook injected by "Try this" — { en, ru } or null.
  let customHook = null;

  // ═══ DOM ═══
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  const constructorSearch = document.getElementById('constructor-search');
  const promptsList = document.getElementById('constructor-prompts');
  const aspectButtons = document.querySelectorAll('.aspect-btn');
  const effectsAvailable = document.getElementById('constructor-effects-available');
  const effectsSelected = document.getElementById('constructor-effects-selected');
  const outputPrompt = document.getElementById('output-prompt');
  const copyButton = document.getElementById('copy-output');

  const effectsSearch = document.getElementById('effects-search');
  const effectsLibrary = document.getElementById('effects-library');

  // ═══ TAB SWITCHING ═══
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });

  function switchTab(tab) {
    currentTab = tab;

    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
      btn.setAttribute('aria-selected', btn.dataset.tab === tab);
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
      const item = document.createElement('div');
      item.className = 'prompt-item';
      if (selectedPrompt && selectedPrompt.id === prompt.id) {
        item.classList.add('selected');
      }

      const title = document.createElement('div');
      title.className = 'prompt-item-title';
      const lang = document.documentElement.getAttribute('data-lang') || 'en';
      title.textContent = (lang === 'ru' && prompt.titleRu) ? prompt.titleRu : prompt.title;

      const id = document.createElement('div');
      id.className = 'prompt-item-id';
      id.textContent = prompt.id;

      const preview = document.createElement('div');
      preview.className = 'prompt-item-preview';
      const promptText = prompt.prompt.replace(/\[OOC:Image generation — /i, '').replace(/\]$/, '');
      preview.textContent = promptText.substring(0, 60) + (promptText.length > 60 ? '...' : '');

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

  function renderConstructorEffects() {
    effectsAvailable.textContent = '';
    effectsSelected.textContent = '';
    if (constructorBgAvailable) constructorBgAvailable.textContent = '';
    if (constructorOvAvailable) constructorOvAvailable.textContent = '';

    function makeTag(term, nameRu, container) {
      var tag = document.createElement('button');
      tag.className = 'effect-tag';
      tag.textContent = term;
      if (nameRu) tag.dataset.tip = nameRu;
      if (selectedEffects.includes(term)) tag.classList.add('selected');
      tag.addEventListener('click', () => toggleEffect(term));
      container.appendChild(tag);
    }

    effectsData.categories.forEach(cat => {
      cat.effects.forEach(e => makeTag(e.term, e.nameRu, effectsAvailable));
    });

    if (constructorBgAvailable) {
      backgroundsData.categories.forEach(cat => {
        cat.backgrounds.forEach(bg => makeTag(bg.term, bg.nameRu, constructorBgAvailable));
      });
    }

    if (constructorOvAvailable) {
      overlaysData.categories.forEach(cat => {
        cat.items.forEach(item => makeTag(item.term, item.nameRu, constructorOvAvailable));
      });
    }

    if (selectedEffects.length > 0) {
      selectedEffects.forEach(term => {
        var tag = document.createElement('button');
        tag.className = 'effect-tag selected';
        tag.textContent = term;
        tag.addEventListener('click', () => toggleEffect(term));
        effectsSelected.appendChild(tag);
      });
    }
  }

  // ═══ CONSTRUCTOR: SUB-TABS ═══
  var subtabBtns = document.querySelectorAll('.constructor-subtab');
  subtabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      subtabBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.constructor-subtab-content').forEach(function(c) { c.classList.remove('active'); });
      var target = document.getElementById('subtab-' + btn.dataset.subtab);
      if (target) target.classList.add('active');
    });
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
  }

  // ═══ CONSTRUCTOR: UPDATE OUTPUT ═══
  function updateOutput() {
    const lang = document.documentElement.getAttribute('data-lang') || 'en';

    // Pick the hook text in the active language (EN fallback) and normalize
    // its trailing punctuation so we never produce e.g. "..]" or "?.]".
    let hookText = customHook ? (lang === 'ru' && customHook.ru ? customHook.ru : customHook.en) : '';
    if (hookText) {
      // Drop any existing terminal punctuation; we always add a single ".".
      hookText = hookText.replace(/[.!?…]+\s*$/u, '').trim();
    }

    // Additions list = effects + aspect ratio.
    const additions = [];
    if (selectedAspectRatio) additions.push(`--ar ${selectedAspectRatio}`);
    if (selectedEffects.length > 0) additions.push(selectedEffects.join(', '));
    const additionsString = additions.join(', ');

    let output;
    if (selectedPrompt) {
      // Inject hook (if any) and additions just before the closing OOC bracket.
      output = selectedPrompt.prompt;
      if (hookText) {
        output = output.replace(/\]$/, ` ${hookText}.]`);
      }
      if (additionsString) {
        output = output.replace(/\]$/, ` ${additionsString}]`);
      }
      outputPrompt.value = output;
      outputPrompt.placeholder = '';
    } else if (hookText || additionsString) {
      // Ad-hoc mode: no base prompt, hook/effects came in via "Try this".
      const prefix = lang === 'ru'
        ? '[OOC:Генерация изображения — '
        : '[OOC:Image generation — ';
      const parts = [];
      if (hookText) parts.push(hookText + '.');
      if (additionsString) parts.push(additionsString);
      output = prefix + parts.join(' ') + ']';
      outputPrompt.value = output;
      outputPrompt.placeholder = '';
    } else {
      outputPrompt.value = '';
      outputPrompt.placeholder = lang === 'en' ? 'Select a base prompt to start...' : 'Выбери базовый промпт...';
    }
  }

  // ═══ TOAST (transient lang-aware notification) ═══
  let toastTimer = null;
  function showToast(messageEn, messageRu) {
    let toast = document.getElementById('clover-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'clover-toast';
      toast.className = 'clover-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    toast.textContent = lang === 'ru' ? messageRu : messageEn;
    toast.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  // ═══ "TRY THIS" RECIPE APPLICATION ═══
  function applyBackgroundRecipe(bg) {
    // Fresh recipe: drop any previously selected base prompt so the output
    // becomes the recipe alone, not "base prompt + recipe layered on top".
    selectedPrompt = null;
    customHook = { en: bg.sampleHookEn || '', ru: bg.sampleHookRu || '' };

    // New selection: background term first, then pairsWith.
    const recipe = [bg.term];
    if (Array.isArray(bg.pairsWith)) {
      bg.pairsWith.forEach(t => { if (!recipe.includes(t)) recipe.push(t); });
    }
    selectedEffects = recipe;

    switchTab('constructor');
    const bgSubtabBtn = document.querySelector('.constructor-subtab[data-subtab="backgrounds"]');
    if (bgSubtabBtn) bgSubtabBtn.click();

    renderPrompts(constructorSearch ? constructorSearch.value : '');
    renderConstructorEffects();
    updateOutput();
    if (copyButton) copyButton.disabled = false;

    if (outputPrompt) {
      outputPrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast('Loaded into constructor', 'Загружено в конструктор');
  }

  // ═══ CONSTRUCTOR: ASPECT RATIO ═══
  aspectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const ratio = btn.dataset.ratio;

      aspectButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      selectedAspectRatio = ratio;
      updateOutput();
    });
  });

  // ═══ CONSTRUCTOR: COPY OUTPUT ═══
  let copyRestoreTimer = null;
  copyButton.addEventListener('click', async () => {
    if (!outputPrompt.value) return;

    try {
      await navigator.clipboard.writeText(outputPrompt.value);
    } catch (err) {
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

        card.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(effect.term);
          } catch (err) {
            console.error('Failed to copy:', err);
            return;
          }

          card.style.borderColor = 'var(--accent)';
          card.classList.add('copied');

          const lang = document.documentElement.getAttribute('data-lang') || 'en';
          const badge = document.createElement('span');
          badge.className = 'copy-badge';
          badge.textContent = lang === 'en' ? 'Copied!' : 'Скопировано!';
          card.appendChild(badge);

          setTimeout(() => {
            card.style.borderColor = '';
            card.classList.remove('copied');
            badge.remove();
          }, 1200);
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

      // Effect chips row — display only (non-interactive).
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

      // Overlay chips row — display only, only if the stack has overlays.
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
      bgLabelRu.textContent = 'на';
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
      tryRu.textContent = 'Попробовать →';
      tryBtn.appendChild(tryEn);
      tryBtn.appendChild(tryRu);
      tryBtn.setAttribute('aria-label', 'Load this stack into the constructor');
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

    // updateOutput() picks the right variant based on active language.
    customHook = { en: stack.sampleHookEn || '', ru: stack.sampleHookRu || '' };

    // Stacks are effect-centric — open the Effects sub-tab on switch.
    switchTab('constructor');
    const effSubtabBtn = document.querySelector('.constructor-subtab[data-subtab="effects"]');
    if (effSubtabBtn) effSubtabBtn.click();

    renderPrompts(constructorSearch ? constructorSearch.value : '');
    renderConstructorEffects();
    updateOutput();
    if (copyButton) copyButton.disabled = false;

    if (outputPrompt) {
      outputPrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast('Stack loaded', 'Стек загружен');
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

        // ─── pairsWith chip row (new entries only) ───
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
            chip.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              try {
                await navigator.clipboard.writeText(pterm);
                chip.classList.add('copied');
                setTimeout(() => chip.classList.remove('copied'), 900);
              } catch (err) {
                console.error('Failed to copy chip:', err);
              }
            });
            pairsRow.appendChild(chip);
          });

          info.appendChild(pairsRow);
        }

        // ─── "Try this" button (new entries only) ───
        if (bg.sampleHookEn && bg.sampleHookRu) {
          const tryBtn = document.createElement('button');
          tryBtn.type = 'button';
          tryBtn.className = 'try-this-btn';
          const tryEn = document.createElement('span');
          tryEn.className = 'lang-en';
          tryEn.textContent = 'Try this →';
          const tryRu = document.createElement('span');
          tryRu.className = 'lang-ru';
          tryRu.textContent = 'Попробовать →';
          tryBtn.appendChild(tryEn);
          tryBtn.appendChild(tryRu);
          tryBtn.setAttribute('aria-label', 'Load this background and suggested effects into the constructor');
          tryBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            applyBackgroundRecipe(bg);
          });
          info.appendChild(tryBtn);
        }

        card.appendChild(swatch);
        card.appendChild(info);

        card.addEventListener('click', async (ev) => {
          // Ignore clicks that originated on chips or the try-this button.
          if (ev.target.closest('.pairs-chip') || ev.target.closest('.try-this-btn')) return;
          try {
            await navigator.clipboard.writeText(bg.term);
          } catch (err) {
            console.error('Failed to copy:', err);
            return;
          }

          card.classList.add('copied');
          const lang = document.documentElement.getAttribute('data-lang') || 'en';
          const badge = document.createElement('span');
          badge.className = 'copy-badge';
          badge.textContent = lang === 'en' ? 'Copied!' : 'Скопировано!';
          info.appendChild(badge);

          setTimeout(() => {
            card.classList.remove('copied');
            badge.remove();
          }, 1200);
        });

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

  // ═══ OVERLAYS: CATEGORY ICONS ═══
  var overlayCatMap = {
    'Paper & Edges': 'paper',
    'Drawings & Scribbles': 'draw',
    'Stickers & Stamps': 'sticker',
    'Glitch & Digital': 'glitch',
    'Nature & Organic': 'nature'
  };

  var overlayCatIcons = {
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    draw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"/></svg>',
    sticker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    glitch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    nature: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12z"/><path d="M12 6v10"/><path d="M8 10l4-4 4 4"/></svg>'
  };

  // ═══ OVERLAYS LIBRARY: RENDER ═══
  const overlaysLibrary = document.getElementById('overlays-library');
  const overlaysSearch = document.getElementById('overlays-search');

  function renderOverlaysLibrary(filter = '') {
    if (!overlaysLibrary) return;
    overlaysLibrary.textContent = '';

    overlaysData.categories.forEach(category => {
      const filtered = category.items.filter(item => {
        var s = filter.toLowerCase();
        return item.term.toLowerCase().includes(s) ||
               item.nameRu.toLowerCase().includes(s) ||
               item.description.toLowerCase().includes(s) ||
               item.descriptionRu.toLowerCase().includes(s);
      });

      if (filtered.length === 0) return;

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

        var swatch = document.createElement('div');
        swatch.className = 'bg-swatch';
        swatch.style.background = item.vibe;

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

        card.appendChild(swatch);
        card.appendChild(info);

        card.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(item.term);
          } catch (err) {
            console.error('Failed to copy:', err);
            return;
          }

          card.classList.add('copied');
          var lang = document.documentElement.getAttribute('data-lang') || 'en';
          var badge = document.createElement('span');
          badge.className = 'copy-badge';
          badge.textContent = lang === 'en' ? 'Copied!' : 'Скопировано!';
          info.appendChild(badge);

          setTimeout(() => {
            card.classList.remove('copied');
            badge.remove();
          }, 1200);
        });

        list.appendChild(card);
      });

      categoryDiv.appendChild(header);
      categoryDiv.appendChild(list);
      overlaysLibrary.appendChild(categoryDiv);
    });
  }

  if (overlaysSearch) {
    overlaysSearch.addEventListener('input', (e) => {
      renderOverlaysLibrary(e.target.value);
    });
  }

  // ═══ SEARCH PLACEHOLDERS (update on lang change) ═══
  function updateSearchPlaceholders() {
    const lang = document.documentElement.dataset.lang || 'en';
    if (constructorSearch) {
      constructorSearch.placeholder = lang === 'en' ? 'Search prompts...' : 'Поиск промптов...';
    }
    if (effectsSearch) {
      effectsSearch.placeholder = lang === 'en' ? 'Search effects...' : 'Поиск эффектов...';
    }
    if (backgroundsSearch) {
      backgroundsSearch.placeholder = lang === 'en' ? 'Search backgrounds...' : 'Поиск фонов...';
    }
    if (overlaysSearch) {
      overlaysSearch.placeholder = lang === 'en' ? 'Search overlays...' : 'Поиск оверлеев...';
    }
  }

  // Re-render on language change.
  const observer = new MutationObserver(() => {
    updateSearchPlaceholders();
    if (!selectedPrompt) updateOutput();
    renderPrompts(constructorSearch.value);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang']
  });

  // ═══ INITIALIZE ═══
  renderPrompts();
  renderConstructorEffects();
  renderEffectsLibrary();
  renderEffectStacks();
  renderBackgroundsLibrary();
  renderOverlaysLibrary();
  updateSearchPlaceholders();

})();
