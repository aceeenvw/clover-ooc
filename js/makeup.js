/* CLOVER OOC - MAKEUP */

(function() {
  'use strict';

  const data = window.MAKEUP_DATA;
  if (!data || !data.viewKey || !Array.isArray(data.sections)) return;

  const root = document.getElementById('makeup-grid');
  const searchInput = document.getElementById('makeup-search');
  const resultCount = document.getElementById('makeup-result-count');
  const randomBtn = document.getElementById('makeup-random');
  const modal = document.getElementById('makeup-modal');
  const modalClose = modal.querySelector('.makeup-modal-close');
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  const allMakeup = data.sections.flatMap(section => section.prompts);
  const openState = Object.fromEntries(data.sections.map((section, index) => [section.id, index === 0]));
  let currentFilter = '';
  let lastRandomId = null;

  function getLang() {
    return window.cloverLang();
  }

  function title(item) {
    return getLang() === 'ru' && item.titleRu ? item.titleRu : item.title;
  }

  function matches(item, filter) {
    if (!filter) return true;
    return `${item.title} ${item.titleRu || ''} ${item.body}`.toLowerCase().includes(filter);
  }

  function renderImage(host, item, lazy) {
    if (!item.hasImage || !item.imgSrc) {
      host.appendChild(window.cloverPlaceholder('makeup-placeholder'));
      return;
    }
    const image = document.createElement('img');
    image.alt = title(item);
    if (lazy) image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 928;
    image.height = 1152;
    image.draggable = false;
    image.oncontextmenu = () => false;
    image.addEventListener('error', () => {
      image.replaceWith(window.cloverPlaceholder('makeup-placeholder'));
    }, { once: true });
    image.src = item.imgSrc;
    host.appendChild(image);
  }

  function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'makeup-card';
    card.dataset.makeupId = item.id;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'makeup-card-open';
    open.setAttribute('aria-label', `${getLang() === 'ru' ? 'Открыть образ' : 'Open makeup'} ${title(item)}`);
    open.addEventListener('click', () => openModal(item.id));
    card.appendChild(open);

    const imageWrap = document.createElement('div');
    imageWrap.className = 'makeup-card-image';
    renderImage(imageWrap, item, true);
    card.appendChild(imageWrap);

    const content = document.createElement('div');
    content.className = 'makeup-card-content';
    const heading = document.createElement('div');
    heading.className = 'makeup-card-heading';
    const name = document.createElement('h3');
    name.textContent = title(item);
    heading.appendChild(name);

    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'makeup-card-expand';
    expand.setAttribute('aria-expanded', 'false');
    expand.setAttribute('aria-label', `${getLang() === 'ru' ? 'Показать промпт' : 'Show description'}: ${title(item)}`);
    expand.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
    heading.appendChild(expand);
    content.appendChild(heading);

    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'makeup-card-body';
    body.id = `makeup-body-${item.id}`;
    body.hidden = true;
    body.textContent = item.body;
    const copyInstruction = document.createElement('span');
    copyInstruction.className = 'sr-only';
    copyInstruction.textContent = getLang() === 'ru' ? ' Скопировать промпт макияжа' : ' Copy this makeup line';
    body.appendChild(copyInstruction);
    expand.setAttribute('aria-controls', body.id);
    expand.addEventListener('click', () => {
      const expanded = body.hidden;
      body.hidden = !expanded;
      expand.setAttribute('aria-expanded', String(expanded));
      expand.setAttribute('aria-label', `${getLang() === 'ru'
        ? (expanded ? 'Скрыть промпт' : 'Показать промпт')
        : (expanded ? 'Hide description' : 'Show description')}: ${title(item)}`);
    });
    body.addEventListener('click', async () => {
      const copied = await window.cloverCopy(item.body);
      if (copied) {
        body.classList.add('is-copied');
        setTimeout(() => body.classList.remove('is-copied'), 900);
        window.cloverToast('Copied to clipboard', 'Скопировано в буфер обмена');
      } else {
        window.cloverToast('Copy failed', 'Не удалось скопировать');
      }
    });
    content.appendChild(body);
    card.appendChild(content);
    return card;
  }

  function buildSection(section) {
    const filter = currentFilter.trim().toLowerCase();
    const matched = section.prompts.filter(item => matches(item, filter));
    const filtering = Boolean(filter);
    const isOpen = filtering ? matched.length > 0 : openState[section.id];
    const sectionEl = document.createElement('section');
    sectionEl.className = `makeup-section${isOpen ? ' is-open' : ''}`;
    sectionEl.dataset.sectionId = section.id;

    const heading = document.createElement('h2');
    heading.className = 'makeup-section-heading';
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'makeup-section-header';
    header.setAttribute('aria-expanded', String(isOpen));
    const bodyId = `makeup-section-${section.id}`;
    header.setAttribute('aria-controls', bodyId);
    header.innerHTML = '<svg class="makeup-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>';

    const text = document.createElement('span');
    text.className = 'makeup-section-text';
    text.innerHTML = `<span class="makeup-section-name lang-en"></span><span class="makeup-section-name lang-ru"></span><small class="lang-en"></small><small class="lang-ru"></small>`;
    text.querySelector('.makeup-section-name.lang-en').textContent = section.name;
    text.querySelector('.makeup-section-name.lang-ru').textContent = section.nameRu || section.name;
    text.querySelector('small.lang-en').textContent = section.description;
    text.querySelector('small.lang-ru').textContent = section.descriptionRu || section.description;
    header.appendChild(text);

    const count = document.createElement('span');
    count.className = `makeup-section-count${filtering && matched.length ? ' has-matches' : ''}`;
    count.textContent = filtering ? `${matched.length}/${section.prompts.length}` : String(section.prompts.length);
    header.appendChild(count);
    header.addEventListener('click', () => {
      const next = !sectionEl.classList.contains('is-open');
      sectionEl.classList.toggle('is-open', next);
      header.setAttribute('aria-expanded', String(next));
      openState[section.id] = next;
    });
    heading.appendChild(header);
    sectionEl.appendChild(heading);

    const sectionBody = document.createElement('div');
    sectionBody.className = 'makeup-section-body';
    sectionBody.id = bodyId;
    if (matched.length) {
      const grid = document.createElement('div');
      grid.className = 'makeup-cards';
      matched.forEach(item => grid.appendChild(buildCard(item)));
      sectionBody.appendChild(grid);
    } else {
      sectionBody.classList.add('is-empty');
      sectionBody.innerHTML = '<span class="lang-en">No matches in this section.</span><span class="lang-ru">В этом разделе ничего не найдено.</span>';
    }
    sectionEl.appendChild(sectionBody);
    return sectionEl;
  }

  function render() {
    root.textContent = '';
    const filter = currentFilter.trim().toLowerCase();
    data.sections.forEach(section => root.appendChild(buildSection(section)));
    const matched = allMakeup.filter(item => matches(item, filter)).length;
    resultCount.textContent = filter ? `${matched} / ${allMakeup.length}` : '';
  }

  function openModal(id) {
    const item = allMakeup.find(entry => entry.id === id);
    if (!item) return;
    const content = modal.querySelector('.makeup-modal-content');
    content.scrollTop = 0;
    content.dataset.makeupId = item.id;
    modal.querySelector('h2').textContent = title(item);
    modal.querySelector('code').textContent = item.body;
    const imageHost = modal.querySelector('.makeup-modal-image');
    imageHost.textContent = '';
    renderImage(imageHost, item, false);
    modal._trigger = document.activeElement;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modal._background = Array.from(document.body.children).filter(element => element !== modal && element.id !== 'clover-toast' && element.tagName !== 'SCRIPT');
    modal._background.forEach(element => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    const id = modal.querySelector('.makeup-modal-content').dataset.makeupId;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    (modal._background || []).forEach(element => { element.inert = false; });
    modal._background = null;
    document.body.style.overflow = '';
    if (modal._trigger && modal._trigger.isConnected) modal._trigger.focus();
    else if (id) root.querySelector(`[data-makeup-id="${id}"] .makeup-card-open`)?.focus();
    modal._trigger = null;
  }

  modalClose.addEventListener('click', closeModal);
  modal.querySelector('.makeup-modal-overlay').addEventListener('click', closeModal);
  modal.querySelector('.makeup-modal-copy').addEventListener('click', async () => {
    const id = modal.querySelector('.makeup-modal-content').dataset.makeupId;
    const item = allMakeup.find(entry => entry.id === id);
    if (!item) return;
    const copied = await window.cloverCopy(item.body);
    window.cloverToast(copied ? 'Copied to clipboard' : 'Copy failed', copied ? 'Скопировано в буфер обмена' : 'Не удалось скопировать');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
    if (event.key === '/' && !modal.classList.contains('active') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === 'Tab' && modal.classList.contains('active')) {
      const controls = Array.from(modal.querySelectorAll('button:not([disabled]), a[href]')).filter(el => el.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  let debounce = null;
  searchInput.addEventListener('input', event => {
    currentFilter = event.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(render, 120);
  });

  randomBtn.addEventListener('click', () => {
    const filter = currentFilter.trim().toLowerCase();
    const pool = allMakeup.filter(item => matches(item, filter));
    if (!pool.length) {
      window.cloverToast('No makeup matches your search', 'По вашему запросу ничего не найдено');
      return;
    }
    const choices = pool.length > 1 ? pool.filter(item => item.id !== lastRandomId) : pool;
    const selected = choices[Math.floor(Math.random() * choices.length)];
    lastRandomId = selected.id;
    openModal(selected.id);
  });

  new MutationObserver(() => {
    searchInput.placeholder = getLang() === 'ru' ? 'Поиск по макияжу...' : 'Search makeup...';
    render();
    if (modal.classList.contains('active')) {
      const id = modal.querySelector('.makeup-modal-content').dataset.makeupId;
      const item = allMakeup.find(entry => entry.id === id);
      if (item) {
        modal.querySelector('h2').textContent = title(item);
        const image = modal.querySelector('.makeup-modal-image img');
        if (image) image.alt = title(item);
      }
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

  window.addEventListener('scroll', () => scrollToTopBtn.classList.toggle('visible', window.scrollY > 300), { passive: true });
  scrollToTopBtn.addEventListener('click', () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
  });
  searchInput.placeholder = getLang() === 'ru' ? 'Поиск по макияжу...' : 'Search makeup...';
  render();
})();
