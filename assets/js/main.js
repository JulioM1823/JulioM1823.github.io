/*
 * Progressive enhancement entry point. The academic source is adapted by
 * redesign-core.js without changing the browser's native network APIs.
 */
(() => {
  'use strict';
  const core = document.createElement('script');
  core.src = new URL('redesign-core.js', document.currentScript.src).href;
  core.onerror = () => {
    console.error('Website enhancement unavailable: redesign-core.js could not load.');
    document.documentElement.classList.remove('jm-loading');
    document.body.classList.remove('is-preload');
    const main = document.getElementById('main');
    if (main) {
      main.hidden = false;
      main.style.display = 'block';
      main.querySelectorAll('article').forEach(article => {
        article.hidden = false;
        article.style.display = 'block';
        article.style.opacity = '1';
        article.style.transform = 'none';
      });
    }
  };
  document.body.appendChild(core);
})();
