(function() {
  'use strict';

  if (!window.POSES_DATA || !Array.isArray(window.POSES_DATA.sections)) {
    console.error('[POS] data unavailable');
    return;
  }

  const data = window.POSES_DATA;
  const root = document.getElementById('poses-sections');
  const searchInput = document.getElementById('poses-search');
  const resultCount = document.getElementById('poses-result-count');
  const searchWrap = document.querySelector('.poses-search-wrap');
  const openState = {};
  const expandedBodies = new Set();
  const copiedTimers = new WeakMap();
  let currentFilter = '';
  let searchTimer = null;

  data.sections.forEach((section, index) => {
    openState[section.id] = index === 0;
  });

  const getLang = window.cloverLang;

  function matchesFilter(prompt, filter) {
    if (!filter) return true;
    return [
      prompt.title,
      prompt.titleRu,
      prompt.description,
      prompt.descriptionRu,
      prompt.body,
      prompt.id,
    ].some(value => String(value || '').toLowerCase().includes(filter));
  }

  const showToast = window.cloverToast;

  function markCopied(body) {
    body.classList.add('is-copied');
    clearTimeout(copiedTimers.get(body));
    copiedTimers.set(body, setTimeout(() => {
      body.classList.remove('is-copied');
      copiedTimers.delete(body);
    }, 900));
  }

  function buildCard(prompt, sectionId) {
    const lang = getLang();
    const isRu = lang === 'ru';
    const key = sectionId + '|' + prompt.id;
    // The pose line is the canonical English prompt in both languages - it is
    // what gets copied, so showing a translation would misrepresent it.
    const displayText = prompt.body;
    const card = document.createElement('article');
    card.className = 'pose-card';
    card.dataset.promptId = prompt.id;

    if (prompt.hasImage && prompt.imgSrc) {
      const media = document.createElement('div');
      media.className = 'pose-card-media';
      const image = document.createElement('img');
      image.src = prompt.imgSrc;
      image.alt = isRu ? prompt.titleRu : prompt.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 1152;
      image.height = 928;
      media.appendChild(image);
      card.appendChild(media);
    }

    const head = document.createElement('div');
    head.className = 'pose-card-head';
    const badge = document.createElement('span');
    badge.className = 'pose-card-id';
    badge.textContent = prompt.id;
    const title = document.createElement('h3');
    title.className = 'pose-card-title';
    title.textContent = isRu ? prompt.titleRu : prompt.title;
    head.append(badge, title);
    card.appendChild(head);

    const description = document.createElement('p');
    description.className = 'pose-card-desc';
    description.textContent = isRu ? prompt.descriptionRu : prompt.description;
    card.appendChild(description);

    const isExpanded = expandedBodies.has(key);
    const body = document.createElement('div');
    const bodyId = 'pose-body-' + prompt.id;
    body.id = bodyId;
    body.className = 'pose-card-body' + (isExpanded ? '' : ' is-collapsed');
    body.setAttribute('role', 'button');
    body.setAttribute('tabindex', '0');
    body.setAttribute('aria-label', isRu ? 'Скопировать промпт' : 'Copy prompt to clipboard');
    const bodyText = document.createElement('span');
    bodyText.className = 'pose-card-body-text';
    bodyText.textContent = displayText;
    body.appendChild(bodyText);

    async function copyBody() {
      const ok = await window.cloverCopy(prompt.body);
      if (ok) {
        markCopied(body);
        showToast('Copied to clipboard', 'Скопировано в буфер');
      } else {
        showToast('Copy failed', 'Не удалось скопировать');
      }
    }
    body.addEventListener('click', copyBody);
    body.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyBody();
      }
    });
    card.appendChild(body);

    const controls = document.createElement('div');
    controls.className = 'pose-card-controls';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pose-card-toggle';
    toggle.setAttribute('aria-controls', bodyId);
    toggle.setAttribute('aria-expanded', String(isExpanded));
    const toggleEn = document.createElement('span');
    toggleEn.className = 'lang-en';
    toggleEn.textContent = isExpanded ? 'Collapse' : 'Read full';
    const toggleRu = document.createElement('span');
    toggleRu.className = 'lang-ru';
    toggleRu.textContent = isExpanded ? 'Свернуть' : 'Развернуть';
    toggle.append(toggleEn, toggleRu);
    toggle.addEventListener('click', () => {
      const expanded = body.classList.toggle('is-collapsed') === false;
      toggle.setAttribute('aria-expanded', String(expanded));
      if (expanded) expandedBodies.add(key);
      else expandedBodies.delete(key);
      toggleEn.textContent = expanded ? 'Collapse' : 'Read full';
      toggleRu.textContent = expanded ? 'Свернуть' : 'Развернуть';
    });
    controls.appendChild(toggle);

    const hint = document.createElement('span');
    hint.className = 'pose-card-copy-hint';
    hint.innerHTML = '<span class="lang-en">click body to copy</span><span class="lang-ru">Нажмите на текст, чтобы скопировать</span>';
    controls.appendChild(hint);
    card.appendChild(controls);
    return card;
  }

  function buildSection(section) {
    const filter = currentFilter.trim().toLowerCase();
    const matched = section.prompts.filter(prompt => matchesFilter(prompt, filter));
    const shouldOpen = filter ? matched.length > 0 : openState[section.id];
    const sectionElement = document.createElement('section');
    sectionElement.className = 'pose-section' + (shouldOpen ? ' is-open' : '');
    sectionElement.dataset.sectionId = section.id;

    const heading = document.createElement('h2');
    heading.className = 'pose-section-heading';
    const header = document.createElement('button');
    const sectionBodyId = 'pose-section-body-' + section.id;
    header.type = 'button';
    header.className = 'pose-section-header';
    header.setAttribute('aria-expanded', String(shouldOpen));
    header.setAttribute('aria-controls', sectionBodyId);
    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'pose-section-chevron');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    path.setAttribute('points', '9 6 15 12 9 18');
    chevron.appendChild(path);

    const titleBlock = document.createElement('span');
    titleBlock.className = 'pose-section-title';
    const nameEn = document.createElement('span');
    nameEn.className = 'pose-section-name lang-en';
    nameEn.textContent = section.name;
    const nameRu = document.createElement('span');
    nameRu.className = 'pose-section-name lang-ru';
    nameRu.textContent = section.nameRu;
    const descEn = document.createElement('span');
    descEn.className = 'pose-section-desc lang-en';
    descEn.textContent = section.description;
    const descRu = document.createElement('span');
    descRu.className = 'pose-section-desc lang-ru';
    descRu.textContent = section.descriptionRu;
    titleBlock.append(nameEn, nameRu, descEn, descRu);

    const count = document.createElement('span');
    count.className = 'pose-section-count';
    count.textContent = filter ? matched.length + '/' + section.prompts.length : String(section.prompts.length);
    if (filter && matched.length) count.classList.add('has-matches');
    header.append(chevron, titleBlock, count);
    header.addEventListener('click', () => {
      const willOpen = !sectionElement.classList.contains('is-open');
      sectionElement.classList.toggle('is-open', willOpen);
      header.setAttribute('aria-expanded', String(willOpen));
      openState[section.id] = willOpen;
    });
    heading.appendChild(header);
    sectionElement.appendChild(heading);

    const sectionBody = document.createElement('div');
    sectionBody.id = sectionBodyId;
    sectionBody.className = 'pose-section-body';
    if (!matched.length) {
      sectionBody.classList.add('is-empty');
      sectionBody.innerHTML = '<span class="lang-en">No matches in this section.</span><span class="lang-ru">В этом разделе совпадений нет.</span>';
    } else {
      const grid = document.createElement('div');
      grid.className = 'pose-cards';
      matched.forEach(prompt => grid.appendChild(buildCard(prompt, section.id)));
      sectionBody.appendChild(grid);
    }
    sectionElement.appendChild(sectionBody);
    return sectionElement;
  }

  function render() {
    root.textContent = '';
    const filter = currentFilter.trim().toLowerCase();
    let matchedTotal = 0;
    let promptTotal = 0;
    data.sections.forEach(section => {
      root.appendChild(buildSection(section));
      promptTotal += section.prompts.length;
      matchedTotal += section.prompts.filter(prompt => matchesFilter(prompt, filter)).length;
    });
    resultCount.textContent = filter ? matchedTotal + ' / ' + promptTotal : '';
  }

  function updateSearchLanguage() {
    if (!searchInput) return;
    const isRu = getLang() === 'ru';
    searchInput.placeholder = isRu ? 'Поиск поз...' : 'Search poses...';
    searchInput.setAttribute('aria-label', isRu ? 'Поиск поз и эмоций' : 'Search poses and expressions');
  }

  if (searchInput) {
    searchInput.addEventListener('input', event => {
      currentFilter = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 120);
    });
  }

  const langObserver = new MutationObserver(() => {
    updateSearchLanguage();
    render();
  });
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang'],
  });

  if (searchWrap && 'IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.className = 'poses-sticky-sentinel';
    searchWrap.parentNode.insertBefore(sentinel, searchWrap);
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
      10
    ) || 56;
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => searchWrap.classList.toggle('is-stuck', !entry.isIntersecting)),
      { rootMargin: `-${navHeight}px 0px 0px 0px`, threshold: 0 }
    );
    observer.observe(sentinel);
  }

  updateSearchLanguage();
  render();
})();
