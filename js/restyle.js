/* ═══════════════════════════════════════════════
   CLOVER OOC - RESTYLE JS
   Page config for the shared accordion engine
   (see js/accordion-page.js).
   aceenvw
   ═══════════════════════════════════════════════ */

(function() {
  'use strict';

  window.cloverAccordionPage({
    label: 'Restyle',
    data: window.RESTYLE_DATA,
    rootId: 'restyle-sections',
    searchId: 'restyle-search',
    countId: 'restyle-result-count',
    copyLabel: {
      en: 'Copy restyle prompt to clipboard',
      ru: 'Скопировать рестайл-промпт',
    },
    searchPlaceholder: {
      en: 'Search restyles...',
      ru: 'Поиск рестайлов...',
    },
  });
})();
