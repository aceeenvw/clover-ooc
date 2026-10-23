/* CLOVER OOC - OUTFITS */
(function () {
  'use strict';

  if (window.cloverOutfitsCleanup) window.cloverOutfitsCleanup();
  const data = window.OUTFITS_DATA;
  if (!data || !Array.isArray(data.sections) || !Array.isArray(data.groups)) return;
  const model = window.cloverOutfitsModel(data);
  const $ = id => document.getElementById(id);
  const root = $('outfits-grid');
  const search = $('outfits-search');
  const toolbar = search.closest('.outfits-search-wrap');
  const viewControls = $('outfits-view-controls');
  const searchControls = $('outfits-search-controls');
  const searchField = $('outfits-search-field');
  const searchBox = $('outfits-search-box');
  const searchToggle = $('outfits-search-toggle');
  const gridChoice = $('outfits-grid-choice');
  const random = $('outfits-random');
  const sidebar = $('outfits-sidebar');
  const sheet = $('outfits-filter-sheet');
  const modal = $('outfit-modal');
  const modalRandom = $('outfit-modal-random');
  const modalImage = modal.querySelector('.modal-image-container');
  const pagination = $('outfits-pagination');
  const pageSize = 48;
  const panel = document.createElement('div');
  panel.className = 'outfits-filter-panel';
  const categoriesPanel = document.createElement('div');
  sidebar.appendChild(panel);
  const controller = new AbortController();
  const on = (node, type, fn, options = {}) => node.addEventListener(type, fn, { ...options, signal: controller.signal });
  const t = (en, ru) => window.cloverLang() === 'ru' ? ru : en;
  const worlds = [{ id: 'all', name: 'All outfits', nameRu: 'Все образы' }, ...data.groups];
  let gender = model.genders.includes('female') ? 'female' : model.genders[0];
  try {
    const saved = localStorage.getItem('clover-outfits-gender');
    if (model.genders.includes(saved)) gender = saved;
  } catch (error) {}
  let state = model.initialState(gender);
  let draft = null;
  let selections = new Map();
  let draftSelections = null;
  const expandedGroups = new Set([data.groups[0].id]);
  let evaluation = model.evaluate(state);
  let lastRandomId = null;
  let page = 0;
  let searchTimer;
  let destroyed = false;
  let modalTrigger;
  let previousOverflow = '';
  const desktop = window.matchMedia('(min-width: 1024px)');
  let columns = window.matchMedia('(min-width: 640px)').matches ? '2' : '1';
  let searchExpanded = false;
  try {
    const saved = localStorage.getItem('clover-outfits-columns');
    if (saved === '1' || saved === '2') columns = saved;
    searchExpanded = localStorage.getItem('clover-outfits-search') === 'open';
  } catch (error) {}

  function syncViewControls() {
    const focused = document.activeElement;
    if (!searchExpanded && (searchControls.contains(focused) || searchBox.contains(focused))) searchToggle.focus({ preventScroll: true });
    searchControls.hidden = !searchExpanded;
    searchBox.hidden = !searchExpanded;
    toolbar.classList.toggle('is-search-open', searchExpanded);
    const host = desktop.matches ? searchField : searchControls;
    if (searchBox.parentElement !== host) {
      host.insertBefore(searchBox, desktop.matches ? null : host.firstChild);
      if (focused === search && searchExpanded) search.focus({ preventScroll: true });
    }
    if (desktop.matches && gridChoice.contains(document.activeElement)) searchToggle.focus({ preventScroll: true });
    searchToggle.setAttribute('aria-expanded', String(searchExpanded));
    searchToggle.setAttribute('aria-label', searchExpanded ? t('Hide search', 'Скрыть поиск') : t('Show search', 'Показать поиск'));
    root.dataset.mobileColumns = columns;
    gridChoice.querySelectorAll('input').forEach(input => { input.checked = input.value === columns; });
  }

  function setSearchExpanded(expanded) {
    searchExpanded = expanded;
    try { localStorage.setItem('clover-outfits-search', expanded ? 'open' : 'closed'); } catch (error) {}
    syncViewControls();
    if (expanded && desktop.matches) search.focus({ preventScroll: true });
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(className, text, action, value) {
    const node = element('button', className, text);
    node.type = 'button';
    node.dataset.action = action;
    if (value) node.dataset.value = value;
    return node;
  }

  function sectionLabel(section, field = 'name') {
    const male = state.gender === 'male' && section[field + 'Male'];
    const en = male || section[field] || '';
    const ru = (state.gender === 'male' && section[field + 'MaleRu']) || section[field + 'Ru'];
    return t(en, ru || en);
  }

  function title(outfit) { return t(outfit.title, outfit.titleRu || outfit.title); }
  function worldLabel(value) { const option = worlds.find(item => item.id === value); return t(option.name, option.nameRu); }
  function editing() { return draft || state; }
  function selectionCache() { return draftSelections || selections; }

  function changeScope(gender, world) {
    const current = editing();
    const cache = selectionCache();
    cache.set(current.gender + '/' + current.world, new Set(current.categories));
    current.gender = gender;
    current.world = world;
    current.categories = new Set(cache.get(gender + '/' + world) || model.initialState(gender, world).categories);
  }

  function buildPanel() {
    panel.replaceChildren();
    const worldBox = element('fieldset', 'outfits-worlds');
    worldBox.appendChild(element('legend', '', t('Browse worlds', 'Выберите мир')));
    const options = element('div', 'outfits-world-options');
    worlds.forEach(world => {
      const label = element('label', 'outfits-world');
      const input = element('input');
      input.type = 'radio';
      input.name = 'outfit-world';
      input.value = world.id;
      label.append(input, element('span', '', worldLabel(world.id)));
      options.appendChild(label);
    });
    worldBox.appendChild(options);
    panel.append(worldBox, categoriesPanel);
    buildCategories();
    syncPanel();
  }

  function categoryList(members) {
    const list = element('div', 'outfits-category-list');
    members.forEach(section => {
      const row = element('div', 'outfits-category-row');
      const label = element('label', 'outfits-category-label');
      const input = element('input');
      input.type = 'checkbox';
      input.dataset.category = section.id;
      const count = element('span', 'outfits-category-count');
      count.dataset.count = section.id;
      label.append(input, element('span', 'outfits-category-name', sectionLabel(section)), count);
      row.appendChild(label);
      list.appendChild(row);
    });
    return list;
  }

  function buildCategories() {
    const current = editing();
    categoriesPanel.dataset.scope = current.gender + '/' + current.world;
    categoriesPanel.replaceChildren();
    const heading = element('div', 'outfits-category-heading');
    const label = element('h2', '', t('Categories', 'Категории'));
    label.id = 'outfits-categories-title';
    const actions = element('div', 'outfits-category-actions');
    actions.append(button('outfits-text-btn', t('All', 'Все'), 'all'), button('outfits-text-btn', t('Clear', 'Ни одной'), 'clear'));
    heading.append(label, actions);
    categoriesPanel.append(heading, element('p', 'outfits-filter-help', t(
      'Only checked categories in this world are used for browsing and Random.',
      'В подборку и случайный выбор входят только отмеченные категории выбранного мира.'
    )));
    const sections = model.sectionsFor(current.gender, current.world);
    if (current.world !== 'all') {
      categoriesPanel.appendChild(categoryList(sections));
      return;
    }
    data.groups.forEach(group => {
      const members = sections.filter(section => section.group === group.id);
      if (!members.length) return;
      const wrap = element('div', 'outfits-category-group');
      const header = element('div', 'outfits-group-header');
      const checkLabel = element('label', 'outfits-check');
      const check = element('input');
      check.type = 'checkbox';
      check.dataset.group = group.id;
      const name = t(group.name, group.nameRu || group.name);
      check.setAttribute('aria-label', t('Include group: ', 'Включить группу: ') + name);
      checkLabel.appendChild(check);
      const toggle = button('outfits-group-toggle', name, 'toggle', group.id);
      toggle.setAttribute('aria-controls', 'outfits-group-' + group.id);
      toggle.setAttribute('aria-expanded', String(expandedGroups.has(group.id)));
      header.append(checkLabel, toggle);
      const list = categoryList(members);
      list.id = 'outfits-group-' + group.id;
      list.hidden = !expandedGroups.has(group.id);
      wrap.append(header, list);
      categoriesPanel.appendChild(wrap);
    });
  }

  function syncPanel() {
    const current = editing();
    const result = draft ? model.evaluate(draft) : evaluation;
    if (categoriesPanel.dataset.scope !== current.gender + '/' + current.world) buildCategories();
    panel.querySelectorAll('[name="outfit-world"]').forEach(input => { input.checked = input.value === current.world; });
    panel.querySelectorAll('[data-category]').forEach(input => { input.checked = current.categories.has(input.dataset.category); });
    panel.querySelectorAll('[data-count]').forEach(node => { node.textContent = String(result.counts.get(node.dataset.count) || 0); });
    panel.querySelectorAll('[data-group]').forEach(input => {
      const members = model.sectionsFor(current.gender, current.world).filter(section => section.group === input.dataset.group);
      const selected = members.filter(section => current.categories.has(section.id)).length;
      input.checked = selected === members.length;
      input.indeterminate = selected > 0 && selected < members.length;
    });
    $('outfits-sheet-apply').textContent = t('Show ' + result.matches.length + ' outfits', 'Показать образы: ' + result.matches.length);
  }

  function changeSelection(action) {
    const current = editing();
    if (action === 'all') current.categories = new Set(model.sectionsFor(current.gender, current.world).map(section => section.id));
    if (action === 'clear') current.categories.clear();
    if (draft) syncPanel(); else refresh();
  }

  function reset() {
    const cache = selectionCache();
    for (const key of cache.keys()) {
      if (key.startsWith(state.gender + '/')) cache.delete(key);
    }
    if (draft) {
      draft = model.initialState(state.gender);
      syncPanel();
    } else {
      state = model.initialState(state.gender);
      search.value = '';
      refresh();
    }
  }

  function buildCard(entry) {
    const outfit = entry.outfit;
    const card = element('article', 'outfit-card');
    card.dataset.outfitId = outfit.id;
    const open = button('outfit-card-open', '', 'open', outfit.id);
    open.setAttribute('aria-label', t('Open outfit ', 'Открыть образ ') + title(outfit));
    const image = element('div', 'outfit-card-image');
    image.appendChild(outfitImage(outfit, true));
    const content = element('div', 'outfit-card-content');
    const heading = element('div', 'outfit-card-heading');
    const expand = button('outfit-card-expand', '', 'expand', outfit.id);
    expand.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    expand.setAttribute('aria-expanded', 'false');
    expand.setAttribute('aria-label', t('Show outfit description', 'Показать описание образа'));
    const body = button('outfit-card-body', outfit.body, 'copy', outfit.id);
    body.id = 'outfit-body-' + outfit.id;
    body.hidden = true;
    body.setAttribute('aria-label', t('Copy full outfit', 'Скопировать образ целиком'));
    expand.setAttribute('aria-controls', body.id);
    heading.append(element('h3', 'outfit-card-title', title(outfit)), expand);
    content.append(heading, element('p', 'outfit-card-category', sectionLabel(entry.section)), body);
    card.append(open, image, content);
    return card;
  }

  function outfitImage(outfit, lazy) {
    if (!outfit.hasImage || !outfit.imgSrc) return window.cloverPlaceholder('outfit-placeholder');
    const img = element('img');
    img.alt = title(outfit);
    img.draggable = false;
    img.decoding = 'async';
    if (lazy) img.loading = 'lazy';
    img.onerror = () => img.replaceWith(window.cloverPlaceholder('outfit-placeholder'));
    img.src = outfit.imgSrc;
    return img;
  }

  function renderCards() {
    const start = page * pageSize;
    root.replaceChildren();
    const fragment = document.createDocumentFragment();
    evaluation.matches.slice(start, start + pageSize).forEach(entry => fragment.appendChild(buildCard(entry)));
    root.appendChild(fragment);
    const total = evaluation.matches.length;
    pagination.hidden = total <= pageSize;
    $('outfits-previous').disabled = page === 0;
    $('outfits-next').disabled = start + pageSize >= total;
    $('outfits-empty').hidden = total !== 0;
    $('outfits-shown').textContent = total ? t(
      'Showing ' + (start + 1) + '–' + (start + root.children.length) + ' of ' + total,
      'Показано ' + (start + 1) + '–' + (start + root.children.length) + ' из ' + total
    ) : '';
  }

  function syncPool() {
    const count = evaluation.matches.length;
    random.disabled = count === 0;
    modalRandom.disabled = count === 0;
    $('outfits-pool-count').textContent = count
      ? t('Random from ' + count + ' matching outfits', 'Случайный выбор из ' + count + ' образов')
      : t('No matching outfits for Random', 'Нет образов для случайного выбора');
  }

  function refresh(resetPage = true) {
    clearTimeout(searchTimer);
    searchTimer = null;
    evaluation = model.evaluate(state);
    if (resetPage) page = 0;
    syncPool();
    syncPanel();
    const count = evaluation.matches.length;
    $('outfits-result-count').textContent = t(count + ' matching outfits', 'Подходящих образов: ' + count);
    const sections = model.sectionsFor(state.gender, state.world);
    const categorySummary = state.categories.size === sections.length ? t('All categories', 'Все категории')
      : state.categories.size === 1 ? sectionLabel(sections.find(section => state.categories.has(section.id)))
      : t(state.categories.size + ' of ' + sections.length + ' categories', 'Категории: ' + state.categories.size + ' из ' + sections.length);
    $('outfits-filter-summary').textContent = [worldLabel(state.world), categorySummary, state.query.trim() ? '“' + state.query.trim() + '”' : ''].filter(Boolean).join(' · ');
    $('outfits-reset').hidden = state.world === 'all' && !state.query && state.categories.size === sections.length;
    renderCards();
  }

  function lockScroll() {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() { document.body.style.overflow = previousOverflow; }

  function openSheet() {
    if (desktop.matches || sheet.open) return;
    draft = model.cloneState(state);
    draftSelections = new Map([...selections].map(([key, value]) => [key, new Set(value)]));
    $('outfits-sheet-body').appendChild(panel);
    syncPanel();
    lockScroll();
    sheet.showModal();
    $('outfits-sheet-close').focus();
  }

  function closeSheet(apply) {
    if (!sheet.open) return;
    if (apply) {
      state = draft;
      selections = draftSelections;
      search.value = state.query;
    }
    draft = null;
    draftSelections = null;
    sidebar.appendChild(panel);
    sheet.close();
    unlockScroll();
    if (apply) refresh(); else syncPanel();
    (searchControls.hidden ? searchToggle : desktop.matches ? search : $('outfits-filter-trigger')).focus({ preventScroll: true });
  }

  function clearModalImage() {
    const img = modalImage.querySelector('img');
    if (img) {
      img.onerror = null;
      img.removeAttribute('src');
    }
    modalImage.replaceChildren();
  }

  function updateModal() {
    const entry = model.byId.get(modal.dataset.outfitId);
    if (!entry) return;
    $('outfit-modal-title').textContent = title(entry.outfit);
    const img = modalImage.querySelector('img');
    if (img && entry.outfit.hasImage && entry.outfit.imgSrc) {
      img.alt = title(entry.outfit);
      if (img.getAttribute('src') !== entry.outfit.imgSrc) img.src = entry.outfit.imgSrc;
    } else {
      clearModalImage();
      modalImage.replaceChildren(outfitImage(entry.outfit, false));
    }
    modal.querySelector('.modal-prompt-text code').textContent = entry.outfit.body;
    modal.querySelector('.modal-close').setAttribute('aria-label', t('Close outfit', 'Закрыть образ'));
  }

  function openModal(id, trigger) {
    if (!model.byId.has(id)) return;
    modal.dataset.outfitId = id;
    updateModal();
    if (!modal.open) {
      modalTrigger = trigger;
      lockScroll();
      modal.showModal();
      modal.querySelector('.modal-close').focus({ preventScroll: true });
    }
    modal.querySelector('.modal-content').scrollTop = 0;
  }

  function closeModal() {
    if (!modal.open) return;
    modal.close();
    clearModalImage();
    unlockScroll();
    const triggerVisible = modalTrigger && modalTrigger.isConnected && !(searchControls.hidden && searchControls.contains(modalTrigger));
    (triggerVisible ? modalTrigger : searchControls.hidden ? searchToggle : search).focus({ preventScroll: true });
    modalTrigger = null;
    delete modal.dataset.outfitId;
  }

  function randomOutfit() {
    const entry = model.pickRandom(evaluation.matches, modal.open ? modal.dataset.outfitId : lastRandomId);
    if (!entry) return;
    lastRandomId = entry.outfit.id;
    openModal(entry.outfit.id, random);
  }

  function copyOutfit(id) {
    const entry = model.byId.get(id);
    if (!entry) return;
    window.cloverCopy(entry.outfit.body).then(ok => {
      if (destroyed) return;
      window.cloverToast(ok ? 'Full outfit copied!' : 'Copy failed. Open the outfit and select its text to copy.',
        ok ? 'Образ скопирован целиком!' : 'Не удалось скопировать. Откройте образ и выделите текст для копирования.');
    });
  }

  on(panel, 'change', event => {
    const input = event.target;
    const current = editing();
    if (input.name === 'outfit-world' && worlds.some(world => world.id === input.value)) changeScope(current.gender, input.value);
    if (input.dataset.category) {
      if (input.checked) current.categories.add(input.dataset.category);
      else current.categories.delete(input.dataset.category);
    }
    if (input.dataset.group) {
      model.sectionsFor(current.gender, current.world).filter(section => section.group === input.dataset.group).forEach(section => {
        if (input.checked) current.categories.add(section.id); else current.categories.delete(section.id);
      });
    }
    if (draft) syncPanel(); else refresh();
  });

  on(panel, 'click', event => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const { action, value } = target.dataset;
    if (action === 'toggle') {
      const open = !expandedGroups.has(value);
      if (open) expandedGroups.add(value); else expandedGroups.delete(value);
      target.setAttribute('aria-expanded', String(open));
      $('outfits-group-' + value).hidden = !open;
    } else changeSelection(action);
  });

  on(root, 'click', event => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const { action, value } = target.dataset;
    if (action === 'open') openModal(value, target);
    if (action === 'copy') copyOutfit(value);
    if (action === 'expand') {
      const body = $('outfit-body-' + value);
      body.hidden = !body.hidden;
      target.setAttribute('aria-expanded', String(!body.hidden));
      target.setAttribute('aria-label', body.hidden ? t('Show outfit description', 'Показать описание образа') : t('Hide outfit description', 'Скрыть описание образа'));
      target.closest('.outfit-card').classList.toggle('is-expanded', !body.hidden);
    }
  });

  on(searchToggle, 'click', () => setSearchExpanded(!searchExpanded));
  on(gridChoice, 'change', event => {
    const value = event.target.value;
    if (event.target.name !== 'outfits-columns' || (value !== '1' && value !== '2')) return;
    columns = value;
    try { localStorage.setItem('clover-outfits-columns', value); } catch (error) {}
    syncViewControls();
  });
  on(search, 'input', () => {
    state.query = search.value;
    evaluation = model.evaluate(state);
    syncPool();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => refresh(), 120);
  });
  on(search, 'keydown', event => {
    if (event.key !== 'Escape' || !desktop.matches) return;
    event.preventDefault();
    setSearchExpanded(false);
  });
  on(random, 'click', randomOutfit);
  on(modalRandom, 'click', randomOutfit);
  on(pagination, 'click', event => {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    if (searchTimer) { refresh(); return; }
    page += target.id === 'outfits-next' ? 1 : -1;
    renderCards();
    const heading = $('outfits-result-count');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.style.scrollMarginTop = 'calc(var(--nav-height) + ' + (toolbar.offsetHeight + 16) + 'px)';
    heading.scrollIntoView({ block: 'start' });
  });
  ['outfits-reset', 'outfits-empty-reset', 'outfits-sheet-reset'].forEach(id => on($(id), 'click', reset));
  on($('outfits-filter-trigger'), 'click', openSheet);
  on($('outfits-sheet-close'), 'click', () => closeSheet(false));
  on($('outfits-sheet-apply'), 'click', () => closeSheet(true));
  on(sheet, 'cancel', event => { event.preventDefault(); closeSheet(false); });
  on(desktop, 'change', () => {
    syncViewControls();
    if (desktop.matches) closeSheet(false);
  });
  on(modal.querySelector('.modal-close'), 'click', closeModal);
  on(modal.querySelector('.modal-overlay'), 'click', closeModal);
  on(modal, 'cancel', event => { event.preventDefault(); closeModal(); });
  on(modal.querySelector('.modal-copy-btn'), 'click', () => copyOutfit(modal.dataset.outfitId));
  on($('outfit-select-text'), 'click', () => {
    const text = modal.querySelector('.modal-prompt-text code');
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);
    text.parentElement.scrollIntoView({ block: 'nearest' });
  });

  function syncGender() {
    document.querySelectorAll('.outfits-gender-tab').forEach(tab => {
      const active = tab.dataset.gender === state.gender;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const count = model.entries.filter(entry => entry.gender === tab.dataset.gender).length;
      tab.querySelectorAll('[data-gender-count]').forEach(node => { node.textContent = count; });
    });
    $('outfits-results').setAttribute('aria-labelledby', 'outfits-' + state.gender + '-tab');
  }

  function setGender(value) {
    if (value === state.gender || !model.genders.includes(value)) return;
    changeScope(value, state.world);
    try { localStorage.setItem('clover-outfits-gender', value); } catch (error) {}
    syncGender();
    buildPanel();
    refresh();
  }

  const tabs = [...document.querySelectorAll('.outfits-gender-tab')];
  tabs.forEach(tab => {
    on(tab, 'click', () => setGender(tab.dataset.gender));
    on(tab, 'keydown', event => {
      const index = tabs.indexOf(tab);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      setGender(tabs[next].dataset.gender);
    });
  });

  on(document, 'keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || modal.open || sheet.open ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault();
    if (searchControls.hidden) setSearchExpanded(true);
    search.focus();
  });
  const scrollTop = $('scroll-to-top');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateScroll = () => scrollTop.classList.toggle('visible', window.scrollY > 600);
  on(window, 'scroll', updateScroll, { passive: true });
  on(scrollTop, 'click', () => window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }));

  function localize() {
    syncViewControls();
    search.placeholder = t('Search outfits…', 'Поиск образов…');
    document.querySelector('.outfits-gender-tabs').setAttribute('aria-label', t('Outfit gender', 'Пол персонажа'));
    scrollTop.setAttribute('aria-label', t('Scroll to top', 'Наверх'));
    pagination.setAttribute('aria-label', t('Outfit pages', 'Страницы образов'));
    buildPanel();
    refresh(false);
    if (modal.open) updateModal();
  }

  const languageObserver = new MutationObserver(localize);
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

  window.cloverOutfitsCleanup = function () {
    destroyed = true;
    clearTimeout(searchTimer);
    languageObserver.disconnect();
    controller.abort();
    if (sheet.open) closeSheet(false);
    if (modal.open) closeModal();
    panel.remove();
    root.replaceChildren();
    delete root.dataset.mobileColumns;
    viewControls.hidden = true;
    searchControls.hidden = false;
    searchBox.hidden = false;
    searchControls.prepend(searchBox);
    toolbar.classList.remove('is-search-open');
    $('outfits-result-count').style.removeProperty('scroll-margin-top');
    delete window.cloverOutfitsCleanup;
  };

  $('outfits-filter-trigger').disabled = false;
  viewControls.hidden = false;
  $('outfits-gender-tabs').hidden = false;
  syncGender();
  localize();
  updateScroll();
})();
