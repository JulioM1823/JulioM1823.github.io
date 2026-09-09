/*
 * Homepage/content augmentation for the 2026 redesign.
 * The original Dimension articles remain in the DOM so historical narratives,
 * images, project detail, and hash routes remain available. This script adds a
 * current professional layer above them and modernizes shared navigation/footer.
 */
(function () {
  'use strict';

  var body = document.body;
  var header = document.getElementById('header');
  var footer = document.getElementById('footer');
  var main = document.getElementById('main');

  if (!body || !header || !main) return;

  body.classList.add('jm-redesign');
  document.title = 'Julio M. Morales · Astronomy';

  var description = document.querySelector('meta[name="description"]');
  if (!description) {
    description = document.createElement('meta');
    description.name = 'description';
    document.head.appendChild(description);
  }
  description.content = 'Julio M. Morales is an astronomy Ph.D. candidate at New Mexico State University working in helioseismology, solar atmospheric gravity waves, scientific computing, teaching, and research workflows.';

  var theme = document.querySelector('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    document.head.appendChild(theme);
  }
  theme.content = '#101418';

  if (!document.querySelector('.jm-skip')) {
    var skip = document.createElement('a');
    skip.className = 'jm-skip';
    skip.href = '#header';
    skip.textContent = 'Skip to main navigation';
    body.insertBefore(skip, body.firstChild);
  }

  var heroImage = header.querySelector('.image img');
  if (heroImage) {
    heroImage.alt = 'Julio M. Morales';
    heroImage.loading = 'eager';
    heroImage.decoding = 'async';
  }

  var heroInner = header.querySelector('.content .inner');
  if (heroInner) {
    heroInner.innerHTML = [
      '<p class="jm-hero-role">Astronomy Ph.D. candidate · New Mexico State University</p>',
      '<h1>Julio <span class="jm-name-accent">M.</span> Morales</h1>',
      '<p class="jm-hero-deck">I study solar oscillations and atmospheric waves, build reproducible scientific workflows, and teach and mentor students across astronomy, physics, mathematics, and computing.</p>',
      '<div class="jm-hero-actions">',
        '<a class="jm-pill-link jm-primary" href="professional.html">Academic record</a>',
        '<a class="jm-pill-link" href="#Research">Explore research</a>',
        '<a class="jm-pill-link" href="professional.html#publications">Publications</a>',
      '</div>'
    ].join('');
  }

  var nav = header.querySelector('nav');
  if (nav) {
    nav.setAttribute('aria-label', 'Primary navigation');
    nav.innerHTML = [
      '<ul>',
        '<li><a href="#About">About</a></li>',
        '<li><a href="#Research">Research</a></li>',
        '<li><a href="#Teaching">Teaching</a></li>',
        '<li><a href="#DEI">Community</a></li>',
        '<li><a href="#Outreach">Outreach</a></li>',
        '<li><a href="professional.html#software">Software</a></li>',
        '<li><a href="professional.html#experience">CV / Record</a></li>',
      '</ul>'
    ].join('');
  }

  var banners = {
    About: {
      kicker: 'Current academic profile · May 2026 CV',
      title: 'Astronomy from the solar interior to the lower atmosphere',
      text: 'I am an astronomy Ph.D. candidate at New Mexico State University. I earned an M.S. in Astronomy from NMSU in May 2025 and a B.S. in Physics and Astronomy from UMass Amherst in May 2022. My current research spans helioseismology, solar atmospheric gravity waves, scientific computing, and reproducible research workflows.',
      link: 'professional.html#experience',
      label: 'View the academic record →'
    },
    Research: {
      kicker: 'Current research · May 2026 CV',
      title: 'Helioseismology, atmospheric gravity waves & scientific computing',
      text: 'My graduate research with Prof. Jason Jackiewicz includes computational analysis of solar oscillations and atmospheric-wave diagnostics. In 2025 I co-authored peer-reviewed work on magnetic-field modulation of atmospheric gravity waves in the lower solar atmosphere. The detailed pages below preserve my earlier solar-flow and young-star accretion research.',
      link: 'professional.html#research',
      label: 'Current research overview →'
    },
    Teaching: {
      kicker: 'Teaching & mentorship · updated May 2026',
      title: 'Instruction from introductory astronomy to research readiness',
      text: 'My current record adds private tutoring beginning in Fall 2024, the 2024 Summer Science Program in Astrophysics at UNC–Chapel Hill, the FRIENDS research-preparatory mentorship program at NMSU, and ongoing astronomy laboratory instruction. The historical course list below remains available in full.',
      link: 'professional.html#teaching',
      label: 'Teaching & mentorship record →'
    },
    DEI: {
      kicker: 'Service & leadership · updated May 2026',
      title: 'Building accountability and belonging into academic structures',
      text: 'I served as Inclusive Astronomy Coordinator for the NMSU Astronomy Graduate Student Organization from January 2023 through May 2025, where I helped restructure the initiative and designed a department-wide Individual Development Plan framework. My May 2026 CV also lists continuing involvement with the NMSU Teaching Academy and Letters to a Pre-Scientist.',
      link: 'professional.html#service',
      label: 'Service & leadership record →'
    },
    Outreach: {
      kicker: 'Outreach · updated May 2026',
      title: 'Astronomy in classrooms, observing nights, and public spaces',
      text: 'My current record includes 12+ hours of NMSU AGSO STEM outreach, observing assistance at a Las Cruces star party, an REU Q&A panel, and executive production of the in-progress documentary “So You Wanna Be an Astronomer...”. The original 2021 outreach report below remains intact with its experiments, photographs, and acknowledgments.',
      link: 'professional.html#outreach',
      label: 'Outreach record →'
    },
    plasmaflows: {
      kicker: 'Historical project route retained',
      title: 'Solar-flow research has continued beyond this original project stub',
      text: 'This URL is preserved for compatibility with the original website. For the current CV-aligned description of my helioseismology and solar-flow research, use the academic record.',
      link: 'professional.html#research',
      label: 'Current solar research →'
    },
    PMS: {
      kicker: 'Project history · publication status updated May 2026',
      title: 'Accretion variability in transitional disk host-stars',
      text: 'The detailed undergraduate project and figures below are retained as originally presented. The May 2026 CV lists the related manuscript as “Hα Variability in the Giant Accreting Protoplanet Survey” by Morales, Balmer, and Follette, in preparation; it is not presented as published work.',
      link: 'professional.html#publications',
      label: 'Publication record →'
    }
  };

  Object.keys(banners).forEach(function (id) {
    var article = document.getElementById(id);
    if (!article || article.querySelector(':scope > .jm-current-banner')) return;
    var data = banners[id];
    var banner = document.createElement('section');
    banner.className = 'jm-current-banner';
    banner.setAttribute('aria-label', 'Current context');
    banner.innerHTML = [
      '<p class="jm-kicker">' + data.kicker + '</p>',
      '<h3>' + data.title + '</h3>',
      '<p>' + data.text + '</p>',
      '<a class="jm-text-link" href="' + data.link + '">' + data.label + '</a>'
    ].join('');
    article.insertBefore(banner, article.firstChild);
  });

  if (footer) {
    footer.innerHTML = [
      '<div class="jm-footer-inner">',
        '<span>© Julio M. Morales · Academic website</span>',
        '<div class="jm-footer-links">',
          '<a href="mailto:jmmorales@nmsu.edu">Email</a>',
          '<a href="https://github.com/JulioM1823">GitHub</a>',
          '<a href="https://www.linkedin.com/in/julio-morales-6642a3236/">LinkedIn</a>',
          '<a href="professional.html">Academic record</a>',
          '<a href="docs/Morales_CV.pdf">Archived CV PDF · Jan 2023</a>',
          '<a href="professional.html#software">Notion templates</a>',
        '</div>',
      '</div>'
    ].join('');
  }

  // Make modal close controls keyboard-operable without replacing Dimension's
  // existing hash-navigation behavior.
  Array.prototype.forEach.call(main.querySelectorAll('article > .close'), function (close) {
    close.setAttribute('role', 'button');
    close.setAttribute('tabindex', '0');
    close.setAttribute('aria-label', 'Close section and return home');
    close.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        window.location.hash = '';
      }
    });
  });

  // Reuse existing captions as accessible descriptions where legacy content did
  // not provide alt text. No new interpretation is introduced.
  Array.prototype.forEach.call(main.querySelectorAll('img'), function (img) {
    if (img.hasAttribute('alt') && img.getAttribute('alt').trim() !== '') return;
    var figure = img.closest('figure');
    var caption = figure ? figure.querySelector('figcaption') : null;
    if (!caption) {
      var siblingCaption = img.parentElement && img.parentElement.querySelector ? img.parentElement.querySelector('figcaption') : null;
      caption = siblingCaption || null;
    }
    if (caption && caption.textContent.trim()) {
      img.alt = caption.textContent.replace(/\s+/g, ' ').trim().slice(0, 240);
    } else {
      img.alt = '';
    }
    img.loading = 'lazy';
    img.decoding = 'async';
  });

  // Links that leave the current website get a small semantic hint for screen
  // readers without changing their visible labels.
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="http"]'), function (link) {
    try {
      var target = new URL(link.href, window.location.href);
      if (target.hostname !== window.location.hostname && !link.getAttribute('aria-label')) {
        var text = link.textContent.replace(/\s+/g, ' ').trim();
        if (text) link.setAttribute('aria-label', text + ' (external site)');
      }
    } catch (e) {
      // Leave malformed historical links untouched rather than breaking the page.
    }
  });
})();
