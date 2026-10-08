/*
 * Quiet progressive enhancement shared by the routed site and academic record.
 * Content is always visible. Observers and animations never reserve layout space.
 */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealed = new WeakSet();
  const animations = new Set();
  let scope = null;
  let revealObserver = null;
  let resizeObserver = null;
  let entries = [];
  let frame = 0;
  let measureNeeded = true;
  let pageBottom = 0;
  let topInset = 100;

  function cleanup() {
    revealObserver?.disconnect();
    resizeObserver?.disconnect();
    revealObserver = null;
    resizeObserver = null;
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }

  function measure() {
    if (!scope || !scope.isConnected || scope.hidden) return;
    const bounds = scope.getBoundingClientRect();
    const masthead = document.querySelector('.jm-topbar-inner, .jm-record-header');
    topInset = (masthead?.getBoundingClientRect().height || 76) + 36;
    pageBottom = bounds.bottom + window.scrollY;
    entries.forEach(entry => { entry.top = entry.heading.getBoundingClientRect().top + window.scrollY; });
    entries.sort((a, b) => a.top - b.top);
    measureNeeded = false;
  }

  function update() {
    frame = 0;
    if (!scope) return;
    if (measureNeeded) measure();
    const marker = window.scrollY + topInset + 16;
    let current = entries[0]?.heading;
    for (const entry of entries) {
      if (entry.top > marker) break;
      current = entry.heading;
    }
    // The final section may be too short to reach the sticky masthead.
    if (entries.length && window.scrollY + window.innerHeight >= pageBottom - 24) current = entries[entries.length - 1].heading;
    entries.forEach(entry => {
      if (entry.heading === current) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    });
  }

  function schedule(measureAgain = false) {
    if (measureAgain) measureNeeded = true;
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function watchReveals() {
    revealObserver?.disconnect();
    if (!scope || reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const selector = '.jm-content-section, .jm-feature, .jm-callout, .jm-legacy-content > figure, .jm-legacy-content > .row';
    const candidates = [...scope.querySelectorAll(selector)];
    const targets = candidates.filter(target => !candidates.some(other => other !== target && other.contains(target)));
    revealObserver = new IntersectionObserver(changes => {
      changes.forEach(change => {
        if (!change.isIntersecting) return;
        const target = change.target;
        revealObserver?.unobserve(target);
        if (revealed.has(target) || reducedMotion.matches) return;
        revealed.add(target);
        const animation = target.animate([
          {opacity: .85, transform: 'translateY(2px)'},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 220, easing: 'ease-out'});
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      });
    }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
    targets.forEach(target => {
      const bounds = target.getBoundingClientRect();
      // Existing viewport content and very tall narrative blocks need no reveal.
      if (bounds.top < window.innerHeight || bounds.height > window.innerHeight) revealed.add(target);
      else if (!revealed.has(target)) revealObserver.observe(target);
    });
  }

  function activate(page) {
    if (!page) return;
    if (scope === page && resizeObserver) { schedule(true); return; }
    cleanup();
    scope = page;
    const standalone = document.documentElement.classList.contains('jm-standalone');
    const links = standalone
      ? [...document.querySelectorAll('.jm-record-header nav a[href^="#"]')]
      : [...scope.querySelectorAll('.jm-page-toc a[data-jm-section]')];
    entries = links.map(link => {
      let id;
      try { id = decodeURIComponent(link.hash.slice(1)); } catch (_) { return null; }
      const heading = document.getElementById(id);
      return heading && scope.contains(heading) ? {link, heading, top: 0} : null;
    }).filter(Boolean);
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => schedule(true));
      resizeObserver.observe(scope);
      const masthead = document.querySelector('.jm-topbar-inner, .jm-record-header');
      if (masthead) resizeObserver.observe(masthead);
    }
    watchReveals();
    schedule(true);
  }

  function initialize() {
    if (document.documentElement.classList.contains('jm-standalone')) activate(document.querySelector('.jm-record'));
    else if (document.documentElement.dataset.jmReady === 'true') activate(document.querySelector('#main > article:not([hidden])') || document.getElementById('header'));
  }

  document.addEventListener('jm:routechange', event => activate(event.detail.page));
  window.addEventListener('scroll', () => schedule(), {passive: true});
  window.addEventListener('resize', () => schedule(true), {passive: true});
  document.addEventListener('load', event => { if (event.target instanceof HTMLImageElement) schedule(true); }, true);
  document.addEventListener('toggle', () => schedule(true), true);
  window.addEventListener('pagehide', cleanup);
  window.addEventListener('pageshow', initialize);
  const onMotionChange = () => {
    animations.forEach(animation => animation.cancel()); animations.clear();
    watchReveals();
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
  else reducedMotion.addListener(onMotionChange);
  document.fonts?.ready.then(() => schedule(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
