/*
 * Compatibility bootstrap for the 2026 redesign.
 * The full, validated route/navigation implementation lives in redesign-core.js.
 * This small layer adapts professional.html's standalone section IDs into the
 * internal IDs expected by the legacy-site augmentation, without duplicating
 * the academic content in index.html.
 */
(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  let recordAdapted = false;

  function adaptAcademicRecord(html) {
    const replacements = [
      ['id="research"', 'id="Research-current" data-augment="Research" data-title="Research"'],
      ['id="publications"', 'id="Publications" data-title="Publications & presentations"'],
      ['id="teaching"', 'id="Teaching-current" data-augment="Teaching" data-title="Teaching & mentorship"'],
      ['id="service"', 'id="DEI-current" data-augment="DEI" data-title="Equity, service & leadership"'],
      ['id="outreach"', 'id="Outreach-current" data-augment="Outreach" data-title="Outreach"'],
      ['id="software"', 'id="Software" data-title="Software & research workflows"'],
      ['id="experience"', 'id="CV" data-title="Education & experience"'],
      ['id="contact"', 'id="Contact" data-title="Contact"'],
      ['href="#research"', 'href="#Research-current"'],
      ['href="#publications"', 'href="#Publications"'],
      ['href="#teaching"', 'href="#Teaching-current"'],
      ['href="#service"', 'href="#DEI-current"'],
      ['href="#outreach"', 'href="#Outreach-current"'],
      ['href="#software"', 'href="#Software"'],
      ['href="#experience"', 'href="#CV"'],
      ['href="#contact"', 'href="#Contact"']
    ];
    replacements.forEach(([from, to]) => { html = html.split(from).join(to); });

    if (!html.includes('id="gravitywaves"')) {
      const gravityWaves = `
        <article id="gravitywaves" data-title="Atmospheric gravity waves" class="jm-record-section">
          <p class="jm-eyebrow">Graduate research / Solar atmosphere</p>
          <h2>Atmospheric gravity waves</h2>
          <p class="jm-lead">Computational diagnostics of waves in the lower solar atmosphere.</p>
          <p>My Ph.D. research at New Mexico State University includes helioseismology and solar atmospheric gravity waves, with an emphasis on computational analysis of solar oscillation and atmospheric-wave diagnostics. Alongside that research, I develop reproducible workflows for analysis, visualization, documentation, and version control.</p>
          <section class="jm-callout"><h3>Related publication</h3><p>Vesa, O., Morales, J. M., Jackiewicz, J., Vigeesh, G., &amp; Reardon, K. (2025). <em>Atmospheric Gravity Waves Modulated by the Magnetic Field Configuration.</em> <em>ApJ</em>, 992, 201.</p><a class="jm-text-link" href="https://doi.org/10.3847/1538-4357/ae0a55">Read the publication →</a></section>
          <p><a href="#Publications">All publications &amp; presentations →</a></p>
        </article>`;
      html = html.replace('</main>', gravityWaves + '\n  </main>');
    }
    return html;
  }

  window.fetch = async function(input, init) {
    const source = input instanceof URL ? input.href : (typeof input === 'string' ? input : input.url);
    const url = new URL(source, location.href);
    if (!recordAdapted && /\/professional\.html$/.test(url.pathname)) {
      recordAdapted = true;
      const response = await nativeFetch(input, init);
      const text = adaptAcademicRecord(await response.text());
      const headers = new Headers(response.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }
    return nativeFetch(input, init);
  };

  const core = document.createElement('script');
  core.src = new URL('redesign-core.js', document.currentScript.src).href;
  core.onerror = () => {
    console.error('Website enhancement unavailable: redesign-core.js could not load.');
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
