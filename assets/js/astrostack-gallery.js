(() => {
  'use strict';
  let dialog, opener, current=0;
  const shots=()=>Array.from(document.querySelectorAll('#AstroStack .jm-gallery-item'));
  const linkFor=card=>card.querySelector('[data-astro-shot]');
  function ensureDialog(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='astro-lightbox';dialog.setAttribute('aria-labelledby','astro-dialog-title');
    dialog.innerHTML='<div class="astro-lightbox-header"><h2 id="astro-dialog-title"></h2><button type="button" data-astro-close aria-label="Close screenshot viewer">Close ×</button></div><img alt=""><div class="astro-lightbox-footer"><button type="button" data-astro-prev aria-label="Previous screenshot">← Previous</button><span aria-live="polite"></span><button type="button" data-astro-next aria-label="Next screenshot">Next →</button></div>';
    document.body.append(dialog);
    dialog.addEventListener('close',()=>{dialog.querySelector('img').removeAttribute('src');opener?.focus();});
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));}});
    dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-astro-close]'))dialog.close();else if(e.target.closest('[data-astro-prev]'))show(current-1);else if(e.target.closest('[data-astro-next]'))show(current+1);});
  }
  function show(index){const cards=shots();current=(index+cards.length)%cards.length;const card=cards[current],link=linkFor(card),img=card.querySelector('img');dialog.querySelector('img').src=link.href;dialog.querySelector('img').alt=img.alt;dialog.querySelector('h2').textContent=img.alt.split(':')[0] || 'AstroStack screenshot';dialog.querySelector('.astro-lightbox-footer span').textContent=`${current+1} / ${cards.length}`;}
  document.addEventListener('click',e=>{
    const filter=e.target.closest('[data-astro-filter]');
    if(filter){const category=filter.dataset.astroFilter;document.querySelectorAll('[data-astro-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));let count=0;shots().forEach(card=>{card.hidden=category!=='all'&&card.dataset.astroCategory!==category;if(!card.hidden)count++;});document.querySelector('.astro-count').textContent=`${count} screenshots`;return;}
    const link=e.target.closest('[data-astro-shot]');if(!link||!link.closest('#AstroStack')||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    if(typeof HTMLDialogElement==='undefined')return;
    e.preventDefault();opener=link;ensureDialog();show(Number(link.dataset.astroShot)-1);dialog.showModal();
  });
})();
