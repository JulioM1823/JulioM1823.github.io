/*
 * Dimension by HTML5 UP — html5up.net | @ajlkn | CCA 3.0.
 * Progressive academic-site refinement for Julio M. Morales.
 * The routed experience combines the personal site with the current academic record.
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
    PMS: 'Accretion in young stars',
    Teaching: 'Teaching & mentorship', Outreach: 'Outreach',
    elements: 'Original theme reference', gravitywaves: 'Atmospheric gravity waves',
    Software: 'Software & research workflows',
    CV: 'Education & experience', Contact: 'Contact'
  };
  const groups = [
    ['Research', ['Research', 'gravitywaves', 'PMS', 'Software']],
    ['Teaching & outreach', ['Teaching', 'Outreach']],
    ['Education & experience', ['CV']],
    ['More about Julio', ['academicjourney', 'mylife', 'Contact']]
  ];
  const historical = {
    Teaching: ['Earlier course history', 'The earlier teaching narrative and individual course listings are retained below, including the Leominster High School experience. The UMass date discrepancy is noted above.'],
    Outreach: ['Explore the Solar System · 2021', 'The full account of this public event, its demonstrations, photographs, and acknowledgments is retained below.']
  };
  const smallImages = new Set(['about_pic.jpeg', 'evo.jpg', 'me_at_umass.jpg', 'grad_pic.jpg', 'sunspots.jpg']);
  const alts = {
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
    'upward_bound_pic.jpg': 'Upward Bound colleagues and students at Anna Maria College',
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
    document.documentElement.classList.remove('jm-loading');
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
    const href = new URL('assets/css/redesign.css', root).href;
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href === href);
    if (existing?.sheet) { resolve(); return; }
    const link = existing || document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
    const timer = setTimeout(() => { if (!existing) link.remove(); reject(new Error('Stylesheet timed out')); }, 10000);
    link.addEventListener('load', () => { clearTimeout(timer); resolve(); }, {once: true});
    link.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Stylesheet unavailable')); }, {once: true});
    if (!existing) document.head.append(link);
  });
  // Adapt the standalone source locally; other network requests retain native fetch semantics.
  function adaptAcademicRecord(page) {
    const routes = {
      research: ['Research-current', 'Research'],
      teaching: ['Teaching-current', 'Teaching'],
      outreach: ['Outreach-current', 'Outreach'], software: ['Software'],
      experience: ['CV'], contact: ['Contact']
    };
    Object.entries(routes).forEach(([id, [route, augment]]) => {
      const section = page.getElementById(id);
      if (!section) return;
      section.id = route;
      if (augment) section.dataset.augment = augment;
    });
    page.querySelectorAll('a[href^="#"]').forEach(link => {
      const route = routes[link.getAttribute('href').slice(1)];
      if (route) link.setAttribute('href', `#${route[0]}`);
    });
    if (!page.getElementById('gravitywaves')) {
      page.querySelector('main')?.append(fragment(`
        <article id="gravitywaves" data-title="Atmospheric gravity waves" class="jm-record-section">
          <p class="jm-eyebrow">Graduate research / Solar atmosphere</p>
          <h2>Atmospheric gravity waves</h2>
          <p class="jm-lead">Computational diagnostics of waves in the lower solar atmosphere.</p>
          <p>My Ph.D. research at New Mexico State University includes helioseismology and solar atmospheric gravity waves, with an emphasis on computational analysis of solar oscillation and atmospheric-wave diagnostics. Alongside that research, I develop reproducible workflows for analysis, visualization, documentation, and version control.</p>
          <section class="jm-callout"><h3>Related publication</h3><p>Vesa, O., Morales, J. M., Jackiewicz, J., Vigeesh, G., &amp; Reardon, K. (2025). <em>Atmospheric Gravity Waves Modulated by the Magnetic Field Configuration.</em> <em>ApJ</em>, 992, 201.</p><a class="jm-text-link" href="https://doi.org/10.3847/1538-4357/ae0a55">Read the publication →</a></section>
        </article>`));
    }
    return page;
  }

  const loadRecord = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(new URL('professional.html', root), {signal: controller.signal, credentials: 'same-origin', cache: 'no-cache'});
      if (!response.ok) throw new Error(`Academic record: HTTP ${response.status}`);
      const page = adaptAcademicRecord(new DOMParser().parseFromString(await response.text(), 'text/html'));
      if (!page.querySelector('#CV') || !page.querySelector('#Research-current')) throw new Error('Academic record is incomplete');
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
    // A failed stylesheet can still expose a CSSStyleSheet object. Confirm the
    // imported visual system actually applied before replacing the legacy view.
    if (!getComputedStyle(document.documentElement).getPropertyValue('--jm-max').trim()) {
      throw new Error('The shared website styles could not load');
    }
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
          const content = make('div', 'jm-current-content'); content.id = imported.id;
          content.append(...imported.childNodes);
          content.append(make('p', 'jm-source-note', 'Professional details and dates marked “present” follow the May 2026 CV.'));
          const retainedHistory = historical[existing.id];
          if (retainedHistory) {
            const intro = make('section', 'jm-legacy-intro');
            const [title, note] = retainedHistory;
            intro.append(make('h2', '', title), make('p', 'jm-source-note', note));
            existing.prepend(content, intro);
          } else {
            existing.replaceChildren(content);
          }
        } else main.append(imported);
      });
    }

    const pms = main.querySelector('#PMS');
    if (pms) {
      const note = make('div', 'jm-current-content');
      note.append(fragment('<p class="jm-lead">Accretion variability in transitional disk host-stars.</p><p class="jm-source-note">The detailed account below preserves my earlier 2021–2022 research and its original figure references. The May 2026 CV lists the associated Morales, Balmer &amp; Follette manuscript as in preparation. One original TW Hya passage says “three years,” while its figure caption compares 2014 and 2018; that interval remains unconfirmed.</p>'));
      pms.prepend(note);
    }
    const aboutIntro = main.querySelector('#About');
    if (aboutIntro) aboutIntro.prepend(fragment('<p class="jm-lead">I’m Julio, an astronomy Ph.D. candidate at New Mexico State University.</p><p>My work spans helioseismology, solar atmospheric gravity waves, and reproducible scientific computing. I completed my M.S. in Astronomy at NMSU in May 2025 and my B.S. in Physics and Astronomy at UMass Amherst in May 2022.</p>'));

    let articles = [...main.children].filter(node => node.matches('article[id]'));
    const byId = new Map(articles.map(article => [article.id, article]));
    articles.forEach(article => {
      const content = make('div', 'jm-page-content'); content.append(...article.childNodes);
      // Standalone records nest the title in a section header. Move its eyebrow
      // into the page header and retain the introductory prose without a second title.
      const firstCurrent = content.querySelector('.jm-current-content') || content;
      const importedHeader = firstCurrent.querySelector(':scope > .jm-section-heading');
      const importedTitle = importedHeader?.querySelector('h2') || [...firstCurrent.children].find(node => node.matches('h2'));
      const eyebrow = importedHeader?.querySelector('.jm-eyebrow') || [...firstCurrent.children].find(node => node.matches('.jm-eyebrow'));
      const legacy = content.querySelector('.jm-legacy-content');
      const legacyTitle = legacy && [...legacy.children].find(node => node.matches('h2,h3'));
      const redundantTitle = legacyTitle && (legacyTitle.classList.contains('major') || ['mylife', 'academicjourney'].includes(article.id));
      if (redundantTitle) legacyTitle.remove();
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
      // These original h3s are page sections once the record h2 becomes the h1.
      content.querySelectorAll('h3,h4,h5,h6').forEach(heading => {
        const level = Math.max(2, Number(heading.tagName.slice(1)) - 1);
        const replacement = make(`h${level}`);
        [...heading.attributes].forEach(attr => replacement.setAttribute(attr.name, attr.value));
        replacement.append(...heading.childNodes); heading.replaceWith(replacement);
      });
      const headings = [...content.querySelectorAll('h2')].filter(heading =>
        heading.textContent.trim() && !heading.closest('details, .jm-timeline, .jm-record-list, #elements')
      );
      if (headings.length > 1) {
        const rail = make('aside', 'jm-page-rail');
        const toc = make('nav', 'jm-page-toc'); toc.setAttribute('aria-label', 'On this page');
        toc.append(make('p', 'jm-eyebrow', 'On this page'));
        const list = make('ol');
        headings.forEach((heading, index) => {
          if (!heading.id) {
            const slug = heading.textContent.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
            heading.id = `jm-section-${article.id}-${slug || index + 1}`;
            const collision = document.getElementById(heading.id);
            if (collision && collision !== heading) heading.id += `-${index + 1}`;
          }
          heading.tabIndex = -1;
          const item = make('li');
          const link = make('a', '', heading.textContent.trim());
          link.href = `#${heading.id}`; link.dataset.jmSection = heading.id;
          item.append(link); list.append(item);
        });
        toc.append(list); rail.append(toc); content.before(rail);
        article.classList.add('jm-has-toc');
      }
      article.setAttribute('aria-labelledby', title.id); article.hidden = true;
    });

    // The former About route is now the homepage. Move the original article rather
    // than copying it so the personal narrative and media have one visible home.
    const homeAbout = byId.get('About');
    header.replaceChildren();
    header.setAttribute('role', 'main'); header.tabIndex = -1;
    if (homeAbout) {
      const title = homeAbout.querySelector('.jm-page-title');
      homeAbout.id = 'jm-home-about'; homeAbout.classList.add('jm-home-about'); homeAbout.hidden = false;
      homeAbout.querySelector('.jm-breadcrumb')?.remove();
      if (title) { title.id = 'jm-title-home'; homeAbout.setAttribute('aria-labelledby', title.id); }
      header.append(homeAbout); byId.delete('About');
      articles = articles.filter(article => article !== homeAbout);
    }
    if (!record) {
      const warning = make('p', 'jm-load-warning', 'The academic-record sections could not load. Original pages remain available. ');
      const link = make('a', '', 'Open the standalone academic record'); link.href = new URL('professional.html', root).href;
      warning.append(link); header.prepend(warning);
      header.querySelectorAll('a[href="#CV"],a[href="#Software"]').forEach(link => {
        const anchors = {'#CV': '#experience', '#Software': '#software'};
        link.href = new URL(`professional.html${anchors[link.getAttribute('href')]}`, root).href;
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
    const brand = make('a', 'jm-brand', 'Julio M. Morales'); brand.href = '#'; brand.append(make('span', '', 'Astronomer | Educator | Workflow Designer'));
    const primary = make('nav', 'jm-primary-nav'); primary.setAttribute('aria-label', 'Primary navigation');
    [['Research','Research'],['Teaching','Teaching'],['Outreach','Outreach'],['CV','Education & experience']].filter(([id]) => byId.has(id)).forEach(([id, label]) => { const link = make('a', '', label); link.href = `#${id}`; primary.append(link); });
    const menu = make('button', 'jm-menu-button', 'Menu'); menu.type = 'button'; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-controls', 'jm-menu');
    menu.setAttribute('aria-label', 'Open site menu');
    const menuSymbol = make('span', '', '+'); menuSymbol.setAttribute('aria-hidden','true'); menu.append(menuSymbol);
    const drawer = make('nav', 'jm-drawer'); drawer.id = 'jm-menu'; drawer.hidden = true; drawer.setAttribute('aria-label', 'All sections');
    const drawerInner = make('div','jm-drawer-inner');
    groups.forEach(([label, ids]) => { const group = make('div', 'jm-drawer-group'); group.append(make('p','',label));
      ids.filter(id => byId.has(id)).forEach(id => { const link = make('a','', labels[id]); link.href = `#${id}`; group.append(link); }); drawerInner.append(group);
    });
    drawer.append(drawerInner); topbarInner.append(brand, primary, menu); topbar.append(topbarInner, drawer);
    const skip = make('a', 'jm-skip', 'Skip to main content'); skip.href = '#header';
    document.body.prepend(skip, topbar);
    const closeMenu = (focus = false) => {
      drawer.hidden = true; menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open site menu'); menuSymbol.textContent = '+';
      if (focus) menu.focus({preventScroll: true});
    };
    const openMenu = () => {
      drawer.hidden = false; menu.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-label', 'Close site menu'); menuSymbol.textContent = '−';
    };
    menu.addEventListener('click', () => { if (drawer.hidden) openMenu(); else closeMenu(); });
    menu.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault(); openMenu(); drawer.querySelector('a')?.focus();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !drawer.hidden) { closeMenu(true); event.preventDefault(); } });
    document.addEventListener('click', event => { if (!drawer.hidden && !topbar.contains(event.target)) closeMenu(); });
    document.addEventListener('focusin', event => { if (!drawer.hidden && !topbar.contains(event.target)) closeMenu(); });

    const oldFooter = make('div'); oldFooter.append(...footer.childNodes);
    oldFooter.querySelectorAll('a[href="mailto:jmmorale@nmsu.edu"]').forEach(link => { link.href = 'mailto:jmmorales@nmsu.edu'; });
    const archive = make('details', 'jm-legacy-footer'); archive.append(make('summary', '', 'Original site resources & archived CV'), oldFooter);
    footer.append(fragment('<div class="jm-footer-top"><span>Julio M. Morales · Astronomy</span><div class="jm-footer-links"><a href="mailto:jmmorales@nmsu.edu">Email</a><a href="https://github.com/JulioM1823">GitHub</a><a href="https://www.linkedin.com/in/julio-morales-6642a3236/">LinkedIn</a><a href="professional.html#experience">Academic record</a><a href="docs/Morales_CV.pdf">Archived CV · Jan 2023</a></div></div><p class="jm-footer-credit">Based on <a href="https://html5up.net/dimension">Dimension by HTML5 UP</a> · <a href="https://html5up.net/license">CCA 3.0</a> · <a href="#elements">Original theme reference</a></p>'));
    footer.append(archive);
    const announce = make('p','jm-announce'); announce.setAttribute('role','status'); announce.setAttribute('aria-live','polite'); document.body.append(announce);
    const notFound = make('article'); notFound.id = 'jm-not-found'; notFound.hidden = true;
    notFound.append(fragment('<header class="jm-page-header"><h1 class="jm-page-title" tabindex="-1">Section not found</h1></header><p>This address does not match a section of the website. Use the navigation to explore, or <a href="#">return to the homepage</a>.</p>'));
    main.append(notFound);
    const scrollPositions = new Map();
    let lastURL = ''; let activeId = ''; let activeEntry = ''; let activePage = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const readHash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return location.hash.slice(1); } };
    const newEntry = () => `jm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const entryState = () => {
      if (!history.state?.jmEntry) history.replaceState({...history.state, jmEntry: newEntry()}, '', location.href);
      return history.state.jmEntry;
    };
    const saveScroll = (persist = false) => {
      if (!activeEntry || lastURL !== location.href) return;
      const position = {x: window.scrollX, y: window.scrollY};
      scrollPositions.set(activeEntry, position);
      if (persist) history.replaceState({...history.state, jmPosition: position}, '', location.href);
    };
    function render({focus = true, restore = false, smooth = false} = {}) {
      const hash = readHash();
      const target = hash ? document.getElementById(hash) : null;
      const article = target && (target.matches('article') ? target : target.closest('article'));
      const homeSection = Boolean(target && homeAbout?.contains(target));
      const isHome = !hash || hash === 'header' || homeSection;
      const next = isHome ? null : (article && main.contains(article) ? article : notFound);
      const page = next || header;
      const changed = activePage !== page;
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
      const isSection = target && !target.matches('h1') && (homeSection || (next && target !== next));
      const focusTarget = isSection ? target : page.querySelector('h1');
      if (focus && focusTarget) {
        if (!focusTarget.hasAttribute('tabindex')) focusTarget.tabIndex = -1;
        focusTarget.focus({preventScroll: true});
      }
      activeEntry = entryState();
      const stored = restore && (scrollPositions.get(activeEntry) || history.state.jmPosition);
      if (stored) window.scrollTo({left: stored.x, top: stored.y, behavior: 'instant'});
      else if (isSection) target.scrollIntoView({block: 'start', behavior: smooth && !changed && !reducedMotion.matches ? 'smooth' : 'instant'});
      else window.scrollTo({left: 0, top: 0, behavior: 'instant'});
      if (focus && changed) announce.textContent = isHome ? 'Homepage' : (labels[activeId] || 'Section not found');
      lastURL = location.href;
      activePage = page;
      saveScroll();
      document.dispatchEvent(new CustomEvent('jm:routechange', {detail: {page, changed}}));
    }
    document.addEventListener('click', event => {
      const link = event.target.closest && event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
      let url;
      try { url = new URL(link.getAttribute('href'), location.href); } catch (_) { return; }
      const normalizePath = pathname => pathname.replace(/\/index\.html$/, '/');
      const samePage = url.origin === location.origin && url.search === location.search && normalizePath(url.pathname) === normalizePath(location.pathname);
      if (!samePage || !link.getAttribute('href').includes('#')) return;
      if (link === skip) {
        event.preventDefault(); const target = header.hidden ? main : header;
        target.focus({preventScroll: true}); target.scrollIntoView({block:'start', behavior:'instant'}); return;
      }
      event.preventDefault(); saveScroll(true);
      if (url.href !== location.href) history.pushState({jmEntry: newEntry()}, '', url);
      render({smooth: true});
    });
    const onHistory = () => {
      if (location.href === lastURL && history.state?.jmEntry === activeEntry) return;
      render({restore: true});
    };
    window.addEventListener('scroll', () => saveScroll(), {passive: true});
    window.addEventListener('pagehide', () => saveScroll(true));
    window.addEventListener('popstate', onHistory); window.addEventListener('hashchange', onHistory);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    main.querySelectorAll('#elements form').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); announce.textContent = 'This is an original theme demonstration, not a contact form. Please use the email link to contact Julio.'; }));
    document.documentElement.classList.remove('jm-loading');
    document.documentElement.dataset.jmReady = 'true';
    render({focus: false, restore: true});
  }
  initialize().catch(error => { console.error('Website enhancement unavailable:', error); exposeOriginal(); });
})();
