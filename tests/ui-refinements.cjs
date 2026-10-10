// Run against a loopback preview of the checkout. Requires Playwright for development only.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = process.env.BASE_URL || 'http://127.0.0.1:8766';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Use a private loopback preview');
const results = [], errors = [];
const evidence = process.env.EVIDENCE_DIR;
async function ready(page, route = '') {
  await page.goto(origin + '/#' + route);
  await page.waitForFunction(() => document.documentElement.dataset.jmReady === 'true');
  await page.waitForSelector(route ? '#' + route + ':not([hidden])' : '#header:not([hidden])');
}
async function inspect(page, route) {
  const selector = route ? '#' + route : '#header';
  await page.locator(selector + ' img').evaluateAll(async images => {
    await Promise.all(images.map(async image => { image.loading = 'eager'; await image.decode(); }));
  });
  return page.locator(selector).evaluate(el => ({
    text: [...el.querySelectorAll('.jm-story-copy p')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' '),
    images: [...el.querySelectorAll('img')].map(e => e.getAttribute('src')),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    storyCount: el.querySelectorAll('.jm-story-beat').length,
    empty: [...el.querySelectorAll('.jm-story-copy')].some(e => !e.textContent.trim()),
    heights: [...el.querySelectorAll('.jm-story-media img')].map(e => e.getBoundingClientRect().height),
    captionMismatch: [...el.querySelectorAll('figure')].some(e => {
      const img = e.querySelector('img'), cap = e.querySelector('figcaption');
      if (!img || !cap) return false;
      const a = img.getBoundingClientRect(), b = cap.getBoundingClientRect();
      return Math.abs(a.left-b.left)>1 || Math.abs(a.width-b.width)>1;
    })
  }));
}
async function checkPresentation(page, route, width) {
  if (route === 'academicjourney') {
    const layout = await page.locator('#academicjourney .jm-story-beat').first().evaluate(e => {
      const media = e.querySelector('.jm-story-media').getBoundingClientRect();
      const copy = e.querySelector('.jm-story-copy').getBoundingClientRect();
      return {paired:e.classList.contains('jm-story-beat-paired'), images:e.querySelectorAll('img').length,
        beside:media.right <= copy.left + 1, stacked:media.bottom <= copy.top + 1};
    });
    assert.equal(layout.paired,true);assert.equal(layout.images,2);
    assert.equal(width > 1000 ? layout.beside : layout.stacked,true,'Opening pair and text form an editorial layout');
  } else if (route === 'mylife') {
    const layout = await page.locator('#mylife .jm-story-beat').evaluateAll(items => items.map((e,index) => {
      const media=e.querySelector('.jm-story-media').getBoundingClientRect();
      const copy=e.querySelector('.jm-story-copy').getBoundingClientRect();
      return {index,left:media.right <= copy.left + 1,right:copy.right <= media.left + 1,stacked:media.bottom <= copy.top + 1};
    }));
    for(const item of layout) assert.equal(width > 700 ? (item.index % 2 ? item.right : item.left) : item.stacked,true,'Personal Life alternates on desktop and stacks on phones');
  }
}
(async () => {
  if (evidence) await fs.mkdir(evidence, {recursive:true});
  const baseline = process.env.CONTENT_BASELINE ? JSON.parse(await fs.readFile(process.env.CONTENT_BASELINE)) : null;
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE_PATH ? {executablePath:process.env.BROWSER_EXECUTABLE_PATH} : {}), chromiumSandbox:true});
  try {
    const context = await browser.newContext(); const page = await context.newPage();
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',r=>{if(r.url().startsWith(origin) && r.status()>=400) errors.push(r.status()+' '+r.url());});
    // Delaying source assembly reproduces the previous image-wrapper race.
    await page.route('**/assets/js/redesign-core.js',async route=>{await new Promise(r=>setTimeout(r,250)); await route.continue();});
    for (const width of [1920,1440,1024,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      for (const route of ['academicjourney','mylife']) {
        for (const area of ['image','title','padding','empty-space']) {
          await ready(page);
          const card = page.locator(`a.jm-about-card[href="#${route}"]`);
          assert.equal(await card.count(),1);
          assert.equal(await card.locator('a,button').count(),0,'No nested interactive card controls');
          if (area==='image') await card.locator('img').click();
          else if (area==='title') await card.locator('h3').click();
          else {const box=await card.boundingBox();await card.click({position:{x:area==='padding'?6:box.width-6,y:area==='padding'?6:box.height-6}});}
          await page.waitForSelector(`#${route}:not([hidden])`);
          assert.equal(new URL(page.url()).hash,'#'+route);
          assert.equal(await page.locator('dialog[open]').count(),0);
        }
        await ready(page);
        const card = page.locator(`a.jm-about-card[href="#${route}"]`);
        await card.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        assert.equal(await card.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
        await page.keyboard.press('Enter'); await page.waitForSelector(`#${route}:not([hidden])`);
        const layout=await inspect(page,route);
        await checkPresentation(page,route,width);
        assert.equal(layout.overflow,false);assert.equal(layout.empty,false);
        assert.equal(layout.storyCount,route==='academicjourney'?3:4);
        assert.ok(layout.heights.every(h=>h<=301),'Narrative photos remain proportionate');
        assert.equal(layout.captionMismatch,false);
        if (baseline) {
          assert.deepEqual(layout.images,baseline[route].images,'All narrative images preserved');
          const expected=baseline[route].narrativeText || (route==='academicjourney'?baseline[route].text[0]:baseline[route].text.join(' '));
          assert.equal(layout.text,expected,'All current narrative text preserved');
        }
        if(evidence && [1920,768,390].includes(width)){await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await page.screenshot({path:path.join(evidence,`${route}-${width}.png`),fullPage:true});}
        results.push({width,route,...layout});
      }
      await ready(page);
      assert.equal(await page.locator('.jm-about-hero-copy .jm-about-lead').evaluate(e=>e.tagName),'H2');
      assert.equal(await page.locator('.jm-about-role').evaluate(e=>e.tagName),'H3');
      assert.equal(await page.locator('.jm-about-role').innerText(),'Astronomy Ph.D candidate, New Mexico State University');
      const portrait = await page.locator('.jm-about-portrait img').boundingBox();
      assert.ok(portrait.width <= (width>1000?421:width>700?361:301));
      assert.equal(await page.locator('.jm-about-portrait .jm-image-open').count(),1);
      await ready(page,'Research'); await inspect(page,'Research');
      assert.equal(await page.locator('.jm-sidebar a[href="#gravitywaves"]').innerText(),'MAG Waves');
      assert.equal(await page.locator('.jm-sidebar a[href="#PMS"]').innerText(),'PMS Accretion');
      assert.match(await page.locator('#Research .jm-kicker a[href="#gravitywaves"]').innerText(),/^01 · SOLAR PHYSICS(?: · 2022–PRESENT)?$/);
      assert.equal(await page.locator('#Research h2 a[href="#gravitywaves"]').innerText(),'Magneto-acoustic-gravity Waves');
      assert.equal(await page.locator('#Research h2 a[href="#PMS"]').innerText(),'Pre-main-sequence Accretion');
      assert.equal(await page.locator('#Research .jm-feature').count(),2);
      assert.equal(await page.locator('#Research iframe, #Research video, #Research .jm-subsection').count(),0);
      assert.doesNotMatch(await page.locator('#Research').innerText(),/Interactive transverse-wave interference|Solar wave simulations/i);
      assert.equal(await page.locator('a[href="#Contact"],a[href="#contact"],#Contact,#contact').count(),0);
      await page.locator('.jm-menu-button').click();
      assert.equal(await page.locator('.jm-drawer-column').count(),5);
      assert.equal(await page.locator('.jm-drawer').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
      assert.equal(await page.getByRole('link',{name:'Contact',exact:true}).count(),0);
      await page.keyboard.press('Escape');
    }
    for(const url of ['/#Contact','/#contact','/professional.html#contact']){
      await page.goto(origin+url);await page.waitForSelector('#jm-not-found:not([hidden])');
      await page.reload();await page.waitForSelector('#jm-not-found:not([hidden])');
      await page.locator('#jm-not-found a').click();await page.waitForSelector('#header:not([hidden])');
    }
    await ready(page);await page.locator('.jm-brand .jm-image-open').click();await page.waitForSelector('.jm-image-viewer[open]');await page.keyboard.press('Escape');
    assert.equal(await page.locator('.jm-brand .jm-image-open').evaluate(e=>e===document.activeElement),true);
    for (const route of ['Teaching','Materials','Software','AstroStack','CV','PMS','gravitywaves']) {
      await ready(page,route);assert.equal((await inspect(page,route)).overflow,false);
      if(route==='PMS' || route==='gravitywaves') {
        const expected=route==='PMS'?'PMS Accretion':'MAG Waves';
        assert.equal(await page.locator('#'+route+' h1').innerText(),route==='PMS'?'Pre-main-sequence Accretion':'Magneto-acoustic-gravity Waves');
        assert.equal(await page.locator('#'+route+' h1').evaluate(e=>getComputedStyle(e).maxWidth),'none');
        assert.equal(await page.locator('#'+route+' h1').evaluate(e=>getComputedStyle(e).textWrap),'wrap');
        assert.ok((await page.title()).startsWith(expected));
      }
      if(route==='CV') {
        assert.equal(await page.locator('#cv-profile,#cv-profile-title').count(),0);
        assert.equal(await page.locator('#cv-education').count(),1);
      }
      assert.equal(await page.getByRole('link',{name:'AstroStack on GitHub →',exact:true}).count(),0);
    }
    await ready(page,'AstroStack');assert.equal(await page.locator('#AstroStack .jm-gallery-item').count(),25);
    await page.locator('[data-astro-shot="1"]').click();await page.waitForSelector('.astro-lightbox[open]');
    await page.locator('[data-astro-next]').click();await page.keyboard.press('Escape');
    await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    await page.locator('.jm-about-card').first().hover();assert.equal(await page.locator('.jm-about-card').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)),[]);
    assert.deepEqual(errors,[],'No browser or asset errors');
    if(evidence)await fs.writeFile(path.join(evidence,'results.json'),JSON.stringify({status:'passed',results,errors},null,2));
    console.log('PASS: whole-card mouse/keyboard navigation; narrative grouping and content preservation; six responsive widths; Research/Contact removals; alternating/pair layouts; About heading hierarchy; research labels; requested block removals; image viewers; all routes; reduced motion; no overflow, broken images or browser errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
