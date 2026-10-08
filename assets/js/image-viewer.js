/* Shared local image viewer. AstroStack retains its existing gallery controls. */
(() => {
  'use strict';
  let dialog, opener;
  const processed = new WeakSet();
  function open(image, control) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'jm-image-viewer';
      dialog.setAttribute('aria-label', 'Image viewer');
      dialog.innerHTML = '<button type="button" aria-label="Close image viewer">Close ×</button><img alt="">';
      document.body.append(dialog);
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { dialog.querySelector('img').removeAttribute('src'); opener?.focus({preventScroll:true}); });
    }
    opener = control;
    const enlarged = dialog.querySelector('img');
    enlarged.src = image.dataset.fullSize || image.currentSrc || image.src;
    enlarged.alt = image.alt || 'Website image';
    dialog.showModal();
  }
  function enhance() {
    document.querySelectorAll('img').forEach(image => {
      if (processed.has(image) || image.closest('#bg, dialog, [data-astro-shot]')) return;
      processed.add(image);
      if (!image.getAttribute('src')) return;
      let parentLink = image.closest('a');
      // Split the portrait from the home link, keeping both controls native.
      if (parentLink?.classList.contains('jm-brand')) {
        const brand = document.createElement('div'); brand.className = parentLink.className;
        parentLink.replaceWith(brand); brand.append(image, parentLink);
        parentLink.classList.remove('jm-brand'); parentLink.classList.add('jm-brand-home');
        image.alt = 'Julio M. Morales profile portrait'; parentLink = null;
      }
      // Image controls and navigation links must not be nested interactively.
      if (parentLink?.classList.contains('jm-about-card')) {
        const card = document.createElement('div'); card.className = parentLink.className;
        const destination = parentLink.getAttribute('href');
        parentLink.replaceWith(card);
        while (parentLink.firstChild) card.append(parentLink.firstChild);
        const title = card.querySelector('h3');
        const link = document.createElement('a'); link.href = destination; link.className = 'jm-card-destination';
        while (title.firstChild) link.append(title.firstChild);
        title.append(link); parentLink = null;
      }
      if (parentLink) {
        // Existing image links retain their useful fallback and accessible name.
        parentLink.setAttribute('aria-label', `Open image: ${image.alt || 'Website image'}`);
        parentLink.dataset.imageViewer = 'true';
        return;
      }
      const control = document.createElement('button');
      control.type = 'button'; control.className = 'jm-image-open';
      control.setAttribute('aria-label', `Open image: ${image.alt || 'Website image'}`);
      image.replaceWith(control); control.append(image);
      control.addEventListener('click', () => open(image, control));
    });
  }
  // Capture before routing, so linked images open here instead of navigating.
  document.addEventListener('click', event => {
    const control = event.target.closest('a[data-image-viewer]');
    if (!control || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const image = event.target.closest('img') || control.querySelector('img');
    if (!image) return;
    event.preventDefault(); event.stopImmediatePropagation(); open(image, control);
  }, true);
  document.addEventListener('jm:routechange', enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, {once:true});
  else enhance();
  // Includes dynamically imported professional content and generated portraits.
  new MutationObserver(enhance).observe(document.body, {childList:true, subtree:true});
})();
