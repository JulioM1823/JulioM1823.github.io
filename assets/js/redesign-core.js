/*
 * Dimension by HTML5 UP — html5up.net | @ajlkn | CCA 3.0.
 * Progressive academic-site refinement for Julio M. Morales.
 * The original index.html, hash addresses, narratives and media stay intact.
 * Current professional content has one editable source: professional.html.
 */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../../', script ? script.src : location.href);
  const originalArticles = [...document.querySelectorAll('#main article[id]')];
  const main = document.getElementById('main');
  const header = document.getElementById('header');
  const footer = document.getElementById('footer');
  if (!main || !header || !footer) return;

  const labels = {
    About: 'About me', mylife: 'Family, friends & values',
    academicjourney: 'My academic journey', Research: 'Research',
    plasmaflows: 'Helioseismology & solar flows', PMS: 'Accretion in young stars',
    Teaching: 'Teaching & mentorship', Outreach: 'Outreach',
    DEI: 'Equity, service & leadership', hiddenfigures: 'Hidden Figures Workshop',
    elements: 'Original theme reference', gravitywaves: 'Atmospheric gravity waves',
    Publications: 'Publications & presentations', Software: 'Software & research workflows',
    CV: 'Education & experience', Contact: 'Contact'
  };
  const groups = [
    ['Research', ['Research', 'gravitywaves', 'plasmaflows', 'PMS', 'Publications', 'Software']],
    ['Teaching & community', ['Teaching', 'DEI', 'Outreach', 'hiddenfigures']],
    ['About Julio', ['About', 'academicjourney', 'mylife', 'CV', 'Contact']]
  ];
  const historical = {
    Research: ['Earlier research & full-author records', 'The original project descriptions, complete author lists, and presentation links are retained below. Draft dates and older publication labels belong to the earlier website; the Publications page follows the May 2026 CV.'],
    Teaching: ['Earlier course history', 'The earlier teaching narrative and individual course listings are retained below, including the Leominster High School experience. The UMass date discrepancy is noted above.'],
    DEI: ['Personal perspective & community work', 'My earlier writing about inclusion, representation, and the origins of these initiatives remains below. The dated service record above distinguishes past coordinating roles from current work.'],
    Outreach: ['Explore the Solar System · 2021', 'The full account of this public event, its demonstrations, photographs, and acknowledgments is retained below.']
  };
  const smallImages = new Set(['about_pic.jpeg', 'evo.jpg', 'me_at_umass.jpg', 'grad_pic.jpg', 'flag.jpg', 'sunspots.jpg']);
  const alts = {
    'profile_pic11.png': 'Portrait of Julio M. Morales',
    'about_pic.jpeg': 'Julio outdoors on a summer day',
    'fam_reunion_big.jpg': 'Alicea family reunion in Chicago, 2004',
    'coolstars.jpg': 'Julio attending Cool Stars 21',
    'evo.jpg': 'Julio with his mother and aunts at Evolution 2016',
    'FRIENDS.jpg': 'Julio with friends from UMass Amherst',
    'papa_bartolo.jpg': 'Mama Maria and Papa Bartolo, Julio’s great-great-grandparents',
    'family.jpg': 'Julio as a child with his siblings',
    'size_comparisons.png': 'Comparison of the sizes of various stars',
    'me_at_umass.jpg': 'Julio visiting the UMass Amherst campus after admission',
    'grad_pic.jpg': 'Julio at the UMass Amherst commencement in 2022',
    'thesun.jpg': 'Solar image accompanying the solar-flow research overview',
    'accretion.jpg': 'Illustration accompanying the young-star accretion overview',
    'reva.jpg': 'Reva Kay Williams', 'alice.jpg': 'Alice Ball',
    'ramon.jpg': 'Ramón Emeterio Betances', 'ibrahim.jpeg': 'Ibrahim Cissé',
    'upward_bound_pic.jpg': 'Upward Bound colleagues and students at Anna Maria College',
    'hiddenfigures.jpg': 'Dorothy Vaughn, Katherine Johnson, and Mary Jackson',
    'LPS.jpg': 'Letters to a Pre-Scientist logo', 'flag.jpg': 'Progress Pride Flag',
    'pickle2.png': 'Emission-spectrum demonstration at the 2021 outreach event',
    'sodium_emission.jpg': 'Sodium emission spectrum',
    'seven-layer-density-column-10.jpg': 'Liquids separated into layers by density',
    'planetary_layers.jpg': 'Diagram of planetary interior layers',
    'fluid.png': 'Fluid-density demonstration at the 2021 outreach event',
    'solar.png': 'Solar observing at the 2021 outreach event',
    'sunspots.jpg': 'Sunspots on the solar surface',
    'lab_crew.jpg_small': 'Follette Lab members who helped run the outreach event',
    'poster_real.png': 'Poster for Explore the Solar System in Northampton',
    'scale1.png': 'Scale model of distances in the Solar System',
    'accretion.jpg.png': 'Magnetospheric accretion column, shock and photospheric hotspot',
    'chemistry.jpg.png': 'Diagram connecting accretion radiation to protoplanetary disk chemistry',
    'light-curve example.png': 'Example stellar light curve: magnitude versus time',
    'trans_disk.png': 'HD 142527 disk cavity with a 50 AU scale bar',
    'Light-Curve for SAO206462 12Apr14 GHOST.jpg': 'SAO 206462 Hα-to-continuum ratio light curve on April 12, 2014',
    'multi_epoch_PDS70.jpg': 'PDS 70 light curves comparing May 2 and May 3, 2018',
    'multi_epoch_TWHya.jpg': 'TW Hya light curves labeled 2014 and 2018 in the original caption',
    'wtts_ratios.jpg': 'Hα-to-continuum ratios from stellar models, weak-lined T-Tauri templates and GAPlanetS data'
  };
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const fragment = html => {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
  };
  const setMeta = (name, content) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.append(meta); }
    meta.content = content;
  };
  const exposeOriginal = () => {
    document.body.classList.remove('is-preload', 'is-article-visible', 'is-switching');
    main.style.display = 'block';
    main.hidden = false; header.hidden = false; footer.hidden = false;
    if (main.parentElement.classList.contains('jm-page-layout')) main.parentElement.hidden = false;
    originalArticles.forEach(article => {
      article.hidden = false;
      Object.assign(article.style, {display: 'block', opacity: '1', transform: 'none'});
    });
    if (!document.getElementById('jm-fallback')) {
      const warning = make('p', 'jm-load-warning'); warning.id = 'jm-fallback';
      warning.append('The enhanced layout could not load. All original sections are available below. ');
      const link = make('a', '', 'Open the standalone academic record');
      link.href = new URL('professional.html', root).href; warning.append(link);
      header.append(warning);
    }
  };
  const loadCSS = () => new Promise((resolve, reject) => {
    const link = document.createElement('link'); link.rel = 'stylesheet';
    link.href = new URL('assets/css/redesign.css', root).href;
    const timer = setTimeout(() => { link.remove(); reject(new Error('Stylesheet timed out')); }, 10000);
    link.onload = () => { clearTimeout(timer); resolve(); };
    link.onerror = () => { clearTimeout(timer); reject(new Error('Stylesheet unavailable')); };
    document.head.append(link);
  });
  const loadRecord = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(new URL('professional.html', root), {signal: controller.signal, credentials: 'same-origin'});
      if (!response.ok) throw new Error(`Academic record: HTTP ${response.status}`);
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!page.querySelector('#CV') || !page.querySelector('#Publications')) throw new Error('Academic record is incomplete');
      return page;
    } finally { clearTimeout(timer); }
  };

  function polishLegacy(wrapper) {
    wrapper.querySelectorAll('style, meta').forEach(node => node.remove());
    wrapper.querySelectorAll('center, head').forEach(node => node.replaceWith(...node.childNodes));
    wrapper.querySelectorAll('p').forEach(node => { if (!node.textContent.trim() && !node.children.length) node.remove(); });
    wrapper.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(node => {
      // Personal prose and all links are retained; replace only its presentation.
      const replacement = make('h3');
      [...node.attributes].forEach(attr => { if (!['style', 'align'].includes(attr.name)) replacement.setAttribute(attr.name, attr.value); });
      replacement.append(...node.childNodes); node.replaceWith(replacement);
    });
    wrapper.querySelectorAll('img').forEach(image => {
      const filename = decodeURIComponent(new URL(image.getAttribute('src'), root).pathname.split('/').pop());
      if (!image.alt || ['Snow', 'Mountains'].includes(image.alt)) {
        const figure = image.closest('figure');
        const caption = figure && figure.querySelector('figcaption');
        image.alt = alts[filename] || (caption && caption.textContent.trim()) || `Research or outreach figure: ${filename.replace(/[_-]/g, ' ').replace(/\.[^.]+$/, '')}`;
      }
      image.loading = 'lazy'; image.decoding = 'async';
      if (smallImages.has(filename)) image.classList.add('jm-small-image');
    });
    wrapper.querySelectorAll('a[href="mailto:jmmorale@nmsu.edu"]').forEach(link => { link.href = 'mailto:jmmorales@nmsu.edu'; });
  }

  async function initialize() {
    const recordPromise = loadRecord().catch(error => { console.warn(error.message); return null; });
    await loadCSS();
    const record = await recordPromise;
    document.documentElement.classList.add('jm-redesign');
    document.documentElement.lang = 'en';
    setMeta('viewport', 'width=device-width, initial-scale=1');
    setMeta('description', 'Julio M. Morales — astronomy Ph.D. candidate at New Mexico State University. Helioseismology, solar atmospheric waves, teaching, and scientific workflows.');
    document.body.classList.remove('is-preload', 'is-article-visible', 'is-switching');
    originalArticles.forEach(article => {
      // Moving, rather than re-creating, original nodes protects existing media and links.
      main.append(article);
      const legacy = make('div', 'jm-legacy-content');
      legacy.append(...article.childNodes); article.append(legacy); polishLegacy(legacy);
    });

    if (record) {
      record.querySelectorAll('.jm-record-section').forEach(source => {
        const imported = document.importNode(source, true);
        imported.querySelectorAll('a[href]').forEach(link => {
          const href = link.getAttribute('href');
          if (href.startsWith('index.html#')) link.setAttribute('href', href.slice('index.html'.length));
        });
        const existing = imported.dataset.augment && originalArticles.find(item => item.id === imported.dataset.augment);
        if (existing) {
          const intro = make('section', 'jm-legacy-intro');
          const [title, note] = historical[existing.id];
          intro.append(make('h2', '', title), make('p', 'jm-source-note', note));
          const content = make('div', 'jm-current-content'); content.id = imported.id;
          content.append(...imported.childNodes);
          content.append(make('p', 'jm-source-note', 'Professional details and dates marked “present” follow the May 2026 CV.'));
          existing.prepend(content, intro);
        } else main.append(imported);
      });
    }

    const solar = main.querySelector('#plasmaflows');
    if (solar) {
      const addition = make('div', 'jm-current-content');
      addition.append(fragment('<p class="jm-lead">Investigating the solar interior through time-distance helioseismology.</p><p>My website describes work on three-dimensional solar velocity fields, plasma flows around active regions, and the solar meridional flow. My May 2026 CV identifies helioseismology and solar atmospheric gravity waves as my graduate research areas with Prof. Jason Jackiewicz at New Mexico State University.</p><p class="jm-source-note">The original solar-flow detail page did not contain results. No measurements or new results have been invented here.</p>'));
      solar.prepend(addition);
    }
    const pms = main.querySelector('#PMS');
    if (pms) {
      const note = make('div', 'jm-current-content');
      note.append(fragment('<p class="jm-lead">Accretion variability in transitional disk host-stars.</p><p class="jm-source-note">The detailed account below preserves my earlier 2021–2022 research and its original figure references. The May 2026 CV lists the associated Morales, Balmer &amp; Follette manuscript as in preparation. One original TW Hya passage says “three years,” while its figure caption compares 2014 and 2018; that interval remains unconfirmed.</p>'));
      pms.prepend(note);
    }
    const about = main.querySelector('#About');
    if (about) about.prepend(fragment('<p class="jm-lead">I’m Julio, an astronomy Ph.D. candidate at New Mexico State University.</p><p>My work spans helioseismology, solar atmospheric gravity waves, and reproducible scientific computing. I completed my M.S. in Astronomy at NMSU in May 2025 and my B.S. in Physics and Astronomy at UMass Amherst in May 2022.</p>'));

    const articles = [...main.children].filter(node => node.matches('article[id]'));
    const byId = new Map(articles.map(article => [article.id, article]));
    articles.forEach(article => {
      const content = make('div', 'jm-page-content'); content.append(...article.childNodes);
      // Only the imported duplicate title is removed; original headings remain in history.
      const firstCurrent = content.querySelector('.jm-current-content') || content;
      const importedTitle = [...firstCurrent.children].find(node => node.matches('h2'));
      const eyebrow = [...firstCurrent.children].find(node => node.matches('.jm-eyebrow'));
      const pageHeader = make('header', 'jm-page-header');
      const breadcrumb = make('nav', 'jm-breadcrumb'); breadcrumb.setAttribute('aria-label', 'Breadcrumb');
      const home = make('a', '', 'Home'); home.href = '#';
      breadcrumb.append(home, make('span', '', '/'), make('span', '', labels[article.id] || article.dataset.title || article.id));
      pageHeader.append(breadcrumb);
      if (eyebrow) pageHeader.append(eyebrow);
      if (importedTitle) importedTitle.remove();
      const title = make('h1', 'jm-page-title', labels[article.id] || article.dataset.title || article.id);
      title.tabIndex = -1; title.id = `jm-title-${article.id}`;
      pageHeader.append(title); article.append(pageHeader, content);
      let previousLevel = 1;
      content.querySelectorAll('h2,h3,h4,h5,h6').forEach(heading => {
        const level = Math.min(Number(heading.tagName.slice(1)), previousLevel + 1);
        if (level !== Number(heading.tagName.slice(1))) {
          const replacement = make(`h${level}`);
          [...heading.attributes].forEach(attr => replacement.setAttribute(attr.name, attr.value));
          replacement.append(...heading.childNodes); heading.replaceWith(replacement);
        }
        previousLevel = level;
      });
      article.setAttribute('aria-labelledby', title.id); article.hidden = true;
    });

    const profile = header.querySelector('img');
    // The original homepage contains only the name, role, portrait and navigation.
    // Its complete substantive identity is restated; its existing portrait is reused.
    header.replaceChildren();
    header.setAttribute('role', 'main'); header.tabIndex = -1;
    header.append(fragment('<div class="jm-hero"><div><p class="jm-eyebrow">Astronomy · New Mexico State University</p><h1 tabindex="-1">Julio M.<br>Morales</h1><p class="jm-hero-role">Ph.D. candidate. Researcher. Educator.</p><p class="jm-hero-summary">I study the Sun through its oscillations and atmospheric waves—and build tools, mentorship, and learning experiences that support the work of science.</p><div class="jm-actions"><a class="jm-button jm-button-solid" href="#Research">Explore my research <span aria-hidden="true">↗</span></a><a class="jm-text-link" href="#CV">Education &amp; experience →</a></div></div></div><div class="jm-home-strip"><span>Helioseismology &amp; solar atmospheric waves</span><span>Las Cruces, New Mexico</span><span>Ph.D. expected 2027</span></div><section class="jm-home-section"><div><p class="jm-eyebrow">Explore</p><h2>The science.<br>The people.<br>The process.</h2></div><div class="jm-home-rows"><a class="jm-home-row" href="#Research"><span class="jm-number" aria-hidden="true">01</span><div><h3>Research &amp; publications</h3><p>Solar flows, atmospheric gravity waves, and earlier work on accretion in young stars.</p></div><span class="jm-arrow" aria-hidden="true">↗</span></a><a class="jm-home-row" href="#Teaching"><span class="jm-number" aria-hidden="true">02</span><div><h3>Teaching &amp; mentorship</h3><p>From astronomy laboratories and asteroid observations to one-on-one instruction and research readiness.</p></div><span class="jm-arrow" aria-hidden="true">↗</span></a><a class="jm-home-row" href="#DEI"><span class="jm-number" aria-hidden="true">03</span><div><h3>Equity &amp; community</h3><p>Departmental service, inclusive mentorship, and sharing astronomy beyond the classroom.</p></div><span class="jm-arrow" aria-hidden="true">↗</span></a><a class="jm-home-row" href="#Software"><span class="jm-number" aria-hidden="true">04</span><div><h3>Tools for research</h3><p>AstroStack, scientific workflow writing, and the Notion templates from my original website.</p></div><span class="jm-arrow" aria-hidden="true">↗</span></a></div></section><section class="jm-home-section"><div><p class="jm-eyebrow">Featured publication</p><h2>Waves in a<br>magnetic Sun.</h2></div><div><p class="jm-home-publication"><a href="https://doi.org/10.3847/1538-4357/ae0a55">Atmospheric Gravity Waves Modulated by the Magnetic Field Configuration</a></p><p class="jm-meta">Vesa, Morales, Jackiewicz, Vigeesh &amp; Reardon · The Astrophysical Journal · 2025</p><a class="jm-text-link" href="#Publications">All publications &amp; presentations →</a><p class="jm-home-note">Professional record aligned with the May 2026 CV.</p></div></section>'));
    if (profile) {
      profile.alt = alts['profile_pic11.png']; profile.loading = 'eager'; profile.decoding = 'async';
      const portrait = make('figure', 'jm-portrait');
      portrait.append(profile, make('figcaption', '', 'Curiosity. Community. Discovery.'));
      header.querySelector('.jm-hero').append(portrait);
    }
    if (!record) {
      const warning = make('p', 'jm-load-warning', 'The academic-record sections could not load. Original pages remain available. ');
      const link = make('a', '', 'Open the standalone academic record'); link.href = new URL('professional.html', root).href;
      warning.append(link); header.prepend(warning);
      header.querySelectorAll('a[href="#CV"],a[href="#Software"],a[href="#Publications"]').forEach(link => {
        link.href = new URL(`professional.html${link.getAttribute('href')}`, root).href;
      });
    }

    const layout = make('div', 'jm-page-layout'); layout.hidden = true;
    main.before(layout);
    const sidebar = make('nav', 'jm-sidebar'); sidebar.setAttribute('aria-label', 'Explore the website');
    sidebar.append(make('p', 'jm-eyebrow', 'Explore the website'));
    groups.forEach(([group, ids], index) => {
      if (index) sidebar.append(make('p', 'jm-eyebrow jm-sidebar-divider', group));
      ids.filter(id => byId.has(id)).forEach(id => { const link = make('a', '', labels[id]); link.href = `#${id}`; sidebar.append(link); });
    });
    layout.append(sidebar, main); main.setAttribute('role', 'main'); main.tabIndex = -1;
    const topbar = make('div', 'jm-topbar');
    const topbarInner = make('div', 'jm-topbar-inner');
    const brand = make('a', 'jm-brand', 'Julio M. Morales'); brand.href = '#'; brand.append(make('span', '', 'Astronomy'));
    const primary = make('nav', 'jm-primary-nav'); primary.setAttribute('aria-label', 'Primary navigation');
    [['Research','Research'],['Publications','Publications'],['Teaching','Teaching'],['DEI','Community'],['About','About'],['CV','CV']].filter(([id]) => byId.has(id)).forEach(([id, label]) => { const link = make('a', '', label); link.href = `#${id}`; primary.append(link); });
    const menu = make('button', 'jm-menu-button', 'Menu'); menu.type = 'button'; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-controls', 'jm-menu');
    const menuSymbol = make('span', '', '+'); menuSymbol.setAttribute('aria-hidden','true'); menu.append(menuSymbol);
    const drawer = make('nav', 'jm-drawer'); drawer.id = 'jm-menu'; drawer.hidden = true; drawer.setAttribute('aria-label', 'All sections');
    const drawerInner = make('div','jm-drawer-inner');
    groups.forEach(([label, ids]) => { const group = make('div', 'jm-drawer-group'); group.append(make('p','',label));
      ids.filter(id => byId.has(id)).forEach(id => { const link = make('a','', labels[id]); link.href = `#${id}`; group.append(link); }); drawerInner.append(group);
    });
    drawer.append(drawerInner); topbarInner.append(brand, primary, menu); topbar.append(topbarInner, drawer);
    const skip = make('a', 'jm-skip', 'Skip to main content'); skip.href = '#header';
    document.body.prepend(skip, topbar);
    const closeMenu = (focus = false) => { drawer.hidden = true; menu.setAttribute('aria-expanded', 'false'); menuSymbol.textContent = '+'; if (focus) menu.focus(); };
    menu.addEventListener('click', () => { const open = drawer.hidden; drawer.hidden = !open; menu.setAttribute('aria-expanded', String(open)); menuSymbol.textContent = open ? '−' : '+'; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !drawer.hidden) { closeMenu(true); event.preventDefault(); } });
    document.addEventListener('click', event => { if (!drawer.hidden && !topbar.contains(event.target)) closeMenu(); });
    document.addEventListener('focusin', event => { if (!drawer.hidden && !topbar.contains(event.target)) closeMenu(); });

    const oldFooter = make('div'); oldFooter.append(...footer.childNodes);
    oldFooter.querySelectorAll('a[href="mailto:jmmorale@nmsu.edu"]').forEach(link => { link.href = 'mailto:jmmorales@nmsu.edu'; });
    const archive = make('details', 'jm-legacy-footer'); archive.append(make('summary', '', 'Original site resources & archived CV'), oldFooter);
    footer.append(fragment('<div class="jm-footer-top"><span>Julio M. Morales · Astronomy</span><div class="jm-footer-links"><a href="mailto:jmmorales@nmsu.edu">Email</a><a href="https://github.com/JulioM1823">GitHub</a><a href="https://www.linkedin.com/in/julio-morales-6642a3236/">LinkedIn</a><a href="professional.html#CV">Academic record</a><a href="docs/Morales_CV.pdf">Archived CV · Jan 2023</a></div></div><p class="jm-footer-credit">Based on <a href="https://html5up.net/dimension">Dimension by HTML5 UP</a> · <a href="https://html5up.net/license">CCA 3.0</a> · <a href="#elements">Original theme reference</a></p>'));
    footer.append(archive);
    const announce = make('p','jm-announce'); announce.setAttribute('role','status'); announce.setAttribute('aria-live','polite'); document.body.append(announce);
    const notFound = make('article'); notFound.id = 'jm-not-found'; notFound.hidden = true;
    notFound.append(fragment('<header class="jm-page-header"><h1 class="jm-page-title" tabindex="-1">Section not found</h1></header><p>This address does not match a section of the website. Use the navigation to explore, or <a href="#">return to the homepage</a>.</p>'));
    main.append(notFound);
    const scrollPositions = new Map(); let lastURL = ''; let activeId = '';
    const readHash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; } };
    const saveScroll = () => { if (lastURL) scrollPositions.set(lastURL, {x: window.scrollX, y: window.scrollY}); };
    function render({focus = true, restore = false} = {}) {
      const hash = readHash();
      const target = hash ? document.getElementById(hash) : null;
      const article = target && (target.matches('article') ? target : target.closest('article'));
      const isHome = !hash || hash === 'header';
      const next = isHome ? null : (article && main.contains(article) ? article : notFound);
      articles.forEach(item => { item.hidden = item !== next; }); notFound.hidden = next !== notFound;
      header.hidden = !isHome; layout.hidden = isHome;
      header.setAttribute('role', isHome ? 'main' : 'region'); main.setAttribute('role', isHome ? 'region' : 'main');
      activeId = next ? next.id : '';
      document.title = `${next ? (labels[activeId] || 'Section not found') + ' · ' : ''}Julio M. Morales · Astronomy`;
      skip.href = isHome ? '#header' : '#main';
      document.querySelectorAll('.jm-primary-nav a,.jm-sidebar a,.jm-drawer a').forEach(link => {
        if (link.getAttribute('href') === `#${activeId}`) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
      closeMenu();
      const heading = isHome ? header.querySelector('h1') : next.querySelector('h1');
      if (focus && heading) heading.focus({preventScroll: true});
      const stored = restore && scrollPositions.get(location.href);
      if (stored) window.scrollTo(stored.x, stored.y);
      else if (target && next && target !== next && !target.matches('h1')) target.scrollIntoView({block:'start', behavior:'instant'});
      else window.scrollTo(0, 0);
      if (focus) announce.textContent = isHome ? 'Homepage' : (labels[activeId] || 'Section not found');
      lastURL = location.href;
    }
    document.addEventListener('click', event => {
      const link = event.target.closest && event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
      const url = new URL(link.getAttribute('href'), location.href);
      const samePage = url.origin === location.origin && (url.pathname === location.pathname || (['/', '/index.html'].includes(url.pathname) && ['/', '/index.html'].includes(location.pathname)));
      if (!samePage || !link.getAttribute('href').includes('#')) return;
      if (link === skip) {
        event.preventDefault(); const target = header.hidden ? main : header;
        target.focus({preventScroll: true}); target.scrollIntoView({block:'start', behavior:'instant'}); return;
      }
      event.preventDefault(); saveScroll();
      if (url.href !== location.href) history.pushState(null, '', url);
      render();
    });
    const onHistory = () => { if (location.href === lastURL) return; saveScroll(); render({restore:true}); };
    window.addEventListener('popstate', onHistory); window.addEventListener('hashchange', onHistory);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    main.querySelectorAll('#elements form').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); announce.textContent = 'This is an original theme demonstration, not a contact form. Please use the email link to contact Julio.'; }));
    render({focus:false});
    document.documentElement.dataset.jmReady = 'true';
  }
  initialize().catch(error => { console.error('Website enhancement unavailable:', error); exposeOriginal(); });
})();
