# Website UI acceptance checks

The static site has no application build step or configured linter. These browser
checks cover native whole-card links, keyboard focus, narrative image sizing,
alternating Personal Life rows, the Professional Journey opening pair, About
heading hierarchy, research naming, requested block removals, the image-wrapper/
source-assembly ordering, Research removal boundaries, removed
Contact URLs, menus, image viewers, reduced motion, and six responsive widths.
They accept only a loopback preview URL and never deploy or publish anything.

Start a preview from this repository in one terminal:

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

Use an available Node.js and Playwright installation. To install test dependencies
outside the repository on macOS and use installed Google Chrome:

```sh
npm install --prefix "$HOME/.cache/morales-website-tests" --no-save playwright
NODE_PATH="$HOME/.cache/morales-website-tests/node_modules" \
BROWSER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node tests/ui-refinements.cjs
```

If port 8766 is occupied, choose another port and supply `BASE_URL`. Without
`BROWSER_EXECUTABLE_PATH`, Playwright uses its installed Chromium browser.
`EVIDENCE_DIR` optionally writes screenshots and a report: choose a folder outside
the served repository to keep captures private. `CONTENT_BASELINE` optionally
compares narrative text/images to a pre-change inventory. Source syntax checks:

```sh
node --check assets/js/image-viewer.js
node --check assets/js/redesign-core.js
node --check tests/ui-refinements.cjs
git diff --check -- assets/js/image-viewer.js assets/js/redesign-core.js assets/css/redesign-core.css tests
```

Homepage navigation-card images navigate with the rest of their cards. The profile
portrait and ordinary content images keep their in-site viewer, and AstroStack
keeps its specialized gallery viewer.

## MAG Waves and PMS Accretion

Run the research-page checks against the same loopback preview:

```sh
NODE_PATH="$HOME/.cache/morales-website-tests/node_modules" \
BROWSER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node tests/research-pages.cjs
```

These checks cover six viewport widths, exact MAG content order and preserved
introduction, heading hierarchy, accessible image placeholders, section links,
publication layout, actual MAG/PMS video playback, and a separate-tab tool with
working sliders, polarization, rotation, zoom, and reset. They also check relative
resource resolution below a GitHub Pages project prefix. All browser requests
stay on loopback; publication verification is separate from this test.

Use `BASE_URL` for another loopback port. Optional `EVIDENCE_DIR` must be outside
the website checkout; screenshots and reports must not become public assets.

Bibliographic verification, 2026-10-09:

- Balmer et al.: https://arxiv.org/abs/2206.00687 (journal DOI ac73f4; 2022).
- Follette et al.: https://authors.library.caltech.edu/records/31n9r-m3t80
  (published journal DOI acc183; 2023). The published author list includes Kevin
  Wagner, who is absent from the older arXiv metadata. The existing CV's preprint
  citation is preserved.
- Morales thesis: https://www.umass.edu/astronomy/departmental-honors confirms the
  2022 thesis title, author, and advisor. No full-text thesis repository URL was
  verified; the page labels that limitation explicitly.

The journal publisher pages could not be fetched by the verification browser;
DOIs are confirmed by authoritative arXiv/university metadata. The website links
to the accessible records as well as the DOIs.

## AstroStack screenshot privacy

The published gallery retains its feature layout and filters, but contains no
image sources or download links for AstroStack screenshots. The gallery script
restores private screenshot controls only on localhost/127.0.0.1/[::1].
`images/astrostack/` is ignored by Git and excluded from the GitHub Pages build.
Keep those local files outside future commits. Old Git history may retain images
that had already been committed before this privacy change.
