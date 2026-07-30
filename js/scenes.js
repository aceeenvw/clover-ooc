/* ═══════════════════════════════════════════════
   CLOVER OOC - SCENES JS
   Page config for the shared accordion engine
   (see js/accordion-page.js).
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  window.cloverAccordionPage({
    label: 'Scenes',
    data: window.SCENES_DATA,
    rootId: 'scenes-sections',
    searchId: 'scenes-search',
    countId: 'scenes-result-count',
    copyLabel: {
      en: 'Copy prompt to clipboard',
      ru: 'Скопировать промпт',
    },
    searchPlaceholder: {
      en: 'Search scenes...',
      ru: 'Поиск сцен...',
    },
  });
})();
