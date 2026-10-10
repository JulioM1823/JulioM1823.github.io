// Development-only acceptance checks; never contact production or publish files.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:8766/');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname), 'Use a private loopback preview');
const evidence = process.env.EVIDENCE_DIR;
if (evidence) assert.ok(!path.resolve(evidence).startsWith(path.resolve(__dirname,'..')+path.sep), 'Keep evidence outside the website');
const title = 'Connecting Theoretical and Observational Phase-Difference Diagnostics of Atmospheric Gravity Waves in the Lower Solar Atmosphere';
const introduction = 'My Ph.D. research at New Mexico State University includes helioseismology and solar atmospheric gravity waves, with an emphasis on computational analysis of solar oscillation and atmospheric-wave diagnostics. Alongside that research, I develop reproducible workflows for analysis, visualization, documentation, and version control.';
const topics = ['Atmospheric Gravity Waves','Magnetohydrodynamic Waves','Chromospheric Energy Balance','Mode Coupling','Energy Transport via Mode Coupling'];
const placeholder = 'Research discussion and supporting scientific analysis will be added here.';
const errors = [], results = [];
async function ready(page, route) {
  await page.goto(new URL('#'+route,base).href);
  await page.waitForFunction(()=>document.documentElement.dataset.jmReady==='true');
  await page.waitForSelector('#'+route+':not([hidden])');
}
async function playback(page, selector) {
  const video=page.locator(selector);
  await video.evaluate(async v=>{v.muted=true;await v.play();});
  await page.waitForFunction(s=>{const v=document.querySelector(s);return !v.paused&&v.currentTime>0.15&&v.videoWidth>0;},selector,{timeout:20000});
  const metadata=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,controls:v.controls,inline:v.playsInline,error:v.error?.message||null}));
  assert.ok(metadata.duration>0);assert.ok(metadata.controls&&metadata.inline);assert.equal(metadata.error,null);
  await video.evaluate(v=>v.pause());return metadata;
}
(async()=>{
  if(evidence)await fs.mkdir(evidence,{recursive:true});
  const browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{})});
  try {
    const context=await browser.newContext();
    // Tests are local. Bibliographic targets are verified separately against primary records.
    await context.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort());
    const page=await context.newPage();
    context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('response',r=>{if(new URL(r.url()).origin===base.origin&&r.status()>=400)errors.push(r.status()+' '+r.url());});
    for(const width of [1920,1440,1024,768,390,320]){
      await page.setViewportSize({width,height:1000});
      await ready(page,'gravitywaves');
      const mag=page.locator('#gravitywaves');
      assert.equal(await mag.locator('video').count(),1);
      assert.equal(await mag.locator('video').evaluate(v=>v.paused&&!v.autoplay&&v.currentTime===0),true,'MAG starts paused with its poster');
      assert.equal(await mag.locator('iframe').count(),0);
      assert.equal(await mag.locator('video source').getAttribute('src'),'images/solar_gravity_to_alfven_refined.mp4');
      assert.equal(await mag.locator('.jm-research-project-title').innerText(),title);
      assert.equal(await mag.locator('.jm-research-project-title + p').innerText(),introduction);
      assert.deepEqual(await mag.locator('.jm-research-subsection > h3').allTextContents(),topics);
      assert.equal(await mag.locator('details').count(),0,'Research subsections stay expanded');
      const layout=await mag.evaluate(e=>{
        const content=e.querySelector('.jm-page-content'),heading=e.querySelector('.jm-research-project-title');
        const intro=heading.nextElementSibling,media=intro.nextElementSibling,chapters=media.nextElementSibling;
        return {firstIsTitle:content.firstElementChild===heading,adjacent:!!media.querySelector('video')&&chapters.matches('.jm-research-subsections'),
          order:intro.getBoundingClientRect().bottom<=media.getBoundingClientRect().top+1&&media.getBoundingClientRect().bottom<=chapters.getBoundingClientRect().top+1,
          overflow:document.documentElement.scrollWidth>innerWidth+1,
          videoRatio:(r=>r.width/r.height)(media.querySelector('video').getBoundingClientRect()),
          chapters:[...e.querySelectorAll('.jm-research-subsection')].map(s=>{
            const [h,f,p]=s.children,r=f.querySelector('[role=img]').getBoundingClientRect();
            return {semantic:h.tagName==='H3'&&f.tagName==='FIGURE'&&p.tagName==='P',text:p.textContent,alt:f.querySelector('[role=img]').getAttribute('aria-label'),width:r.width,height:r.height};
          })};
      });
      assert.ok(layout.firstIsTitle&&layout.adjacent&&layout.order);assert.equal(layout.overflow,false);
      assert.ok(Math.abs(layout.videoRatio-16/9)<0.02);
      for(const [index,s] of layout.chapters.entries()){
        assert.ok(s.semantic);assert.equal(s.text,placeholder);assert.ok(s.alt.includes(topics[index]));
        assert.ok(Math.abs(s.width/s.height-16/9)<0.02);
        assert.ok(Math.abs(s.width-layout.chapters[0].width)<1);
      }
      assert.equal(await mag.locator('.jm-publications h2').innerText(),'Publications');
      const link=mag.getByRole('link',{name:'Click here for an interactive tool for 3D transverse waves.',exact:true});
      assert.equal(await link.getAttribute('target'),'_blank');
      assert.equal(await link.getAttribute('href'),'images/3d_transverse_wave_interference.html');
      assert.ok((await link.getAttribute('rel')).includes('noopener'));
      assert.equal(await link.evaluate(a=>a.closest('.jm-research-subsection')?.getAttribute('aria-labelledby')==='mag-atmospheric-gravity-waves'),true);
      for(const topic of topics)assert.equal(await mag.locator('.jm-page-toc').getByRole('link',{name:topic,exact:true}).count(),1);
      if(width===1440){
        results.push({feature:'MAG video playback',...await playback(page,'#gravitywaves video')});
        const popupPromise=page.waitForEvent('popup');await link.click();const tool=await popupPromise;
        await tool.waitForLoadState('domcontentloaded');
        assert.equal(new URL(tool.url()).pathname,new URL('images/3d_transverse_wave_interference.html',base).pathname);
        await tool.waitForFunction(()=>!document.querySelector('#count').textContent.includes('—'));
        await tool.locator('#toggle').click();assert.equal(await tool.locator('#toggle').innerText(),'Play');
        const frame=()=>tool.locator('canvas').evaluate(c=>c.toDataURL());
        const before=await frame();
        await tool.locator('#kx').evaluate(e=>{e.value='1.5';e.dispatchEvent(new Event('input',{bubbles:true}));});
        await tool.waitForFunction(()=>document.querySelector('#kxv').textContent==='1.50');
        await tool.locator('#pol').selectOption('circular');
        assert.notEqual(await frame(),before,'Wave controls update the rendered visualization');
        const canvas=await tool.locator('canvas').boundingBox(),rotated=await frame();
        await tool.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);await tool.mouse.down();
        await tool.mouse.move(canvas.x+canvas.width/2+70,canvas.y+canvas.height/2+25,{steps:6});await tool.mouse.up();
        await tool.waitForFunction(old=>document.querySelector('canvas').toDataURL()!==old,rotated);
        const rotation=await frame();await tool.mouse.wheel(0,100);
        await tool.waitForFunction(old=>document.querySelector('canvas').toDataURL()!==old,rotation);
        await tool.locator('#reset').click();await tool.locator('#toggle').click();assert.equal(await tool.locator('#toggle').innerText(),'Pause');
        if(evidence)await tool.screenshot({path:path.join(evidence,'interactive-tool-desktop.png'),fullPage:true});
        await tool.setViewportSize({width:390,height:844});
        assert.equal(await tool.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        if(evidence)await tool.screenshot({path:path.join(evidence,'interactive-tool-mobile.png'),fullPage:true});
        await tool.close();results.push({feature:'Separate-tab interactive tool',controls:true,rotation:true,zoom:true,mobile:true});
      }
      await page.evaluate(()=>scrollTo(0,0));
      if(evidence&&[1440,768,390].includes(width))await page.screenshot({path:path.join(evidence,`mag-${width}.png`),fullPage:true});
      await ready(page,'PMS');
      await page.locator('#PMS img').evaluateAll(images=>images.forEach(i=>{i.loading='eager';}));
      await page.waitForFunction(()=>[...document.querySelectorAll('#PMS img')].every(i=>i.complete&&i.naturalWidth>0));
      assert.equal(await page.locator('#PMS video').evaluate(v=>v.paused&&!v.autoplay&&v.currentTime===0),true,'PMS starts paused with its poster');
      const publications=page.locator('#pms-publications');
      assert.equal(await publications.locator('h2').innerText(),'Publications');
      assert.equal(await publications.locator(':scope > ol > li').count(),3);
      assert.equal(await publications.evaluate(e=>e===e.parentElement.lastElementChild),true,'Bibliography follows all scientific chapters');
      const citations=await publications.locator('li').allTextContents();
      assert.match(citations[0],/2022[\s\S]*HD 142527 B[\s\S]*164\(1\), 29/);
      assert.match(citations[1],/Kevin Wagner[\s\S]*2023[\s\S]*165\(6\), 225/);
      assert.match(citations[2],/Julio M\. Morales[\s\S]*2022[\s\S]*Undergraduate honors senior thesis[\s\S]*University of Massachusetts Amherst/);
      assert.equal(await publications.locator('a[href="https://arxiv.org/abs/2206.00687"]').count(),1);
      assert.equal(await publications.locator('a[href="https://authors.library.caltech.edu/records/31n9r-m3t80"]').count(),1);
      assert.equal(await publications.locator('a[href="https://www.umass.edu/astronomy/departmental-honors"]').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(h=>h.some(e=>/^Related publications?$/i.test(e.textContent.trim()))),false);
      if(width===1440)results.push({feature:'PMS video playback',...await playback(page,'#PMS video')});
      if(evidence&&[1440,768,390].includes(width)){
        await publications.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,`pms-publications-${width}.png`),fullPage:false});
        await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(evidence,`pms-${width}.png`),fullPage:true});
      }
      results.push({width,feature:'Research structure, bibliography, media sizing and overflow',passed:true});
    }
    // Relative resources also resolve beneath a GitHub Pages project prefix.
    const project='/website-test-prefix/';
    await page.route('**/website-test-prefix/**',async route=>{
      const url=new URL(route.request().url());url.pathname=url.pathname.slice(project.length-1);
      const response=await context.request.get(url.href,{maxRetries:2});await route.fulfill({response});
    });
    await page.goto(new URL(project+'index.html#gravitywaves',base).href);
    await page.waitForFunction(()=>document.documentElement.dataset.jmReady==='true');
    const target=await page.locator('#gravitywaves .jm-tool-link a').evaluate(a=>a.href);
    assert.equal(new URL(target).pathname,project+'images/3d_transverse_wave_interference.html');
    assert.equal((await context.request.get(new URL('images/3d_transverse_wave_interference.html',base).href)).status(),200);
    await page.emulateMedia({reducedMotion:'reduce'});
    await ready(page,'gravitywaves');
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)),[]);
    assert.deepEqual(errors,[],'No browser or local-resource errors');
    if(evidence)await fs.writeFile(path.join(evidence,'research-results.json'),JSON.stringify({status:'passed',results,errors},null,2));
    console.log('PASS: MAG media/order/title/introduction; five accessible responsive placeholders; section navigation; unchanged interactive tool in new tab with controls/rotation/zoom; three PMS citations; publication headings; MAG/PMS video playback; six responsive widths; relative GitHub Pages paths; no browser errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
