/* Shared eligibility for browsing, counts and Random. */
(function () {
  'use strict';

  window.cloverOutfitsModel = function (data) {
    const entries = data.sections.flatMap(section => section.prompts.map(outfit => ({
      outfit,
      section,
      gender: outfit.gender || 'female',
      search: [outfit.title, outfit.titleRu, outfit.body, section.name,
        section.nameRu, section.nameMale, section.nameMaleRu].filter(Boolean).join(' ').toLowerCase()
    })));
    const byId = new Map(entries.map(entry => [entry.outfit.id, entry]));
    const genders = [...new Set(entries.map(entry => entry.gender))];
    const worlds = new Map(data.groups.map(group => [group.id, group.setting]));
    const sectionsByScope = new Map();
    for (const gender of genders) {
      for (const world of ['all', ...worlds.keys()]) {
        sectionsByScope.set(gender + '/' + world, data.sections.filter(section =>
          section.prompts.some(outfit => (outfit.gender || 'female') === gender &&
            (world === 'all' || outfit.settings.includes(worlds.get(world))))
        ));
      }
    }

    function sectionsFor(gender, world = 'all') {
      return sectionsByScope.get(gender + '/' + world) || [];
    }

    function initialState(gender, world = 'all') {
      return { gender, world, query: '', categories: new Set(sectionsFor(gender, world).map(section => section.id)) };
    }

    function cloneState(state) {
      return { ...state, categories: new Set(state.categories) };
    }

    function evaluate(state) {
      const query = state.query.trim().toLowerCase();
      const counts = new Map(sectionsFor(state.gender, state.world).map(section => [section.id, 0]));
      const matches = [];
      for (const entry of entries) {
        if (entry.gender !== state.gender ||
            (state.world !== 'all' && !entry.outfit.settings.includes(worlds.get(state.world))) ||
            (query && !entry.search.includes(query))) continue;
        counts.set(entry.section.id, counts.get(entry.section.id) + 1);
        if (state.categories.has(entry.section.id)) matches.push(entry);
      }
      return { matches, counts };
    }

    function pickRandom(matches, lastId, random = Math.random) {
      const pool = matches.length > 1 ? matches.filter(entry => entry.outfit.id !== lastId) : matches;
      return pool.length ? pool[Math.floor(random() * pool.length)] : null;
    }

    return { entries, byId, genders, sectionsFor, initialState, cloneState, evaluate, pickRandom };
  };
})();
