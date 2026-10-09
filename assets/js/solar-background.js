/* Observational BBSO sunspot waves. Provenance: images/bbso-sunspot-waves.README.md. */
(() => {
  'use strict';
  const root = new URL('../../', document.currentScript.src);

  function initialize() {
    const background = document.getElementById('bg');
    const footer = document.getElementById('footer');
    if (!background || !footer || background.querySelector('video')) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const forcedColors = matchMedia('(forced-colors: active)');
    const connection = navigator.connection;
    let userPaused = false;
    let failed = false;
    let loaded = false;

    const video = document.createElement('video');
    video.className = 'jm-solar-background';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    // Slow the observed sequence without synthesizing intermediate frames.
    video.defaultPlaybackRate = 0.25;
    video.playbackRate = 0.25;
    video.playsInline = true;
    video.preload = 'none';
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('disablepictureinpicture', '');
    background.append(video);

    const credits = document.createElement('div');
    credits.className = 'jm-background-credit';
    const source = document.createElement('a');
    source.href = 'https://www.nasa.gov/centers-and-facilities/goddard/tracking-waves-from-sunspots-gives-new-solar-insight/';
    source.textContent = 'Solar waves · BBSO/Zhao et al.';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'jm-background-toggle';
    credits.append(source, toggle);
    footer.append(credits);

    const staticPreference = () => reducedMotion.matches || forcedColors.matches || Boolean(connection?.saveData);
    const shouldPlay = () => !staticPreference() && !document.hidden && !userPaused && !failed;
    const updateControl = () => {
      toggle.hidden = staticPreference() || failed;
      toggle.textContent = video.paused ? 'Play background' : 'Pause background';
      toggle.setAttribute('aria-label', video.paused ? 'Play solar-wave background' : 'Pause solar-wave background');
    };
    const loadSources = () => {
      if (loaded) return;
      loaded = true;
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([extension, type]) => {
        const source = document.createElement('source');
        source.src = new URL(`images/bbso-sunspot-waves.${extension}`, root).href;
        source.type = type;
        video.append(source);
      });
      video.load();
    };
    const syncPlayback = () => {
      background.classList.toggle('jm-solar-static', staticPreference());
      if (shouldPlay()) {
        loadSources();
        video.play().catch(updateControl);
      } else video.pause();
      updateControl();
    };

    video.addEventListener('loadeddata', () => { background.dataset.solarReady = 'true'; });
    video.addEventListener('playing', () => {
      if (!shouldPlay()) video.pause();
      updateControl();
    });
    video.addEventListener('pause', updateControl);
    video.addEventListener('error', () => {
      failed = true;
      delete background.dataset.solarReady;
      updateControl();
    });
    toggle.addEventListener('click', () => {
      userPaused = !video.paused;
      syncPlayback();
    });
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pagehide', () => video.pause());
    window.addEventListener('pageshow', syncPlayback);
    reducedMotion.addEventListener('change', syncPlayback);
    forcedColors.addEventListener('change', syncPlayback);
    connection?.addEventListener('change', syncPlayback);
    syncPlayback();
  }

  // The routed document rebuilds its footer before announcing its first route.
  if (document.documentElement.dataset.jmReady === 'true') initialize();
  else document.addEventListener('jm:routechange', initialize, {once: true});
})();
