"""Public documentation/download checks. Never reads live account credentials.

Run from the website root: python3 -m unittest discover -s tests -p 'test_notion_calendar_guide.py' -v
The HTTP checks start a temporary loopback-only static server.
"""
from functools import partial
from hashlib import sha256
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
import json
import re
import threading
import unittest
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import urlopen
import zipfile


SITE = Path(__file__).resolve().parents[1]
GUIDE = SITE / 'notion-calendar-sync/index.html'
DOWNLOADS = GUIDE.parent / 'downloads'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.links, self.downloads = [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag in ('a', 'link') and 'href' in attrs:
            self.links.append(attrs['href'])
            if tag == 'a' and 'download' in attrs:
                self.downloads.append(attrs['href'])


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class GuideChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = GUIDE.read_text()
        cls.page = Page(cls.text)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SITE)))
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}/'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()

    def test_unique_anchors_and_resolved_guide_links(self):
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))
        for href in self.page.links:
            with self.subTest(href=href):
                target = urlsplit(urljoin('/notion-calendar-sync/', href))
                if target.scheme or target.netloc:
                    continue
                path = SITE / unquote(target.path).lstrip('/')
                if path.is_dir():
                    path /= 'index.html'
                self.assertTrue(path.is_file(), str(path))
                if target.fragment and path == GUIDE:
                    self.assertIn(target.fragment, self.page.ids)
                elif target.fragment and path == SITE/'index.html':
                    # The homepage assembles professional.html through redesign-core.js.
                    ids = Page(path.read_text()).ids + Page((SITE/'professional.html').read_text()).ids
                    routes = (SITE/'assets/js/redesign-core.js').read_text()
                    self.assertTrue(target.fragment in ids or target.fragment in routes)

    def test_helper_placement_and_template_links(self):
        text = (SITE/'professional.html').read_text()
        section = re.search(r'<section aria-labelledby="software-notion-helper-tools">(.*?)</section>', text, re.S).group(1)
        self.assertEqual(section.count('href="notion-calendar-sync/"'), 1)
        self.assertIn('GitHub to Notion Research Diary', section)
        self.assertIn('href="notion-research-diary/"', section)
        self.assertIn('Notion-Google Calendar Sync', section)
        for expected in ('Home-page-template-', 'Calendar-template-', 'Project-Template-', 'Research-Diary-Template-', 'Reference-Database-Template-'):
            self.assertIn(expected, text)

    def test_no_em_dashes_and_existing_privacy_address(self):
        self.assertNotIn('\u2014', self.text)
        self.assertIn('href="privacy.html"', self.text)
        self.assertIn('href="../#templates-title"', self.text)

    def test_artifact_hashes_and_manifests(self):
        sums = {}
        for line in (DOWNLOADS/'SHA256SUMS.txt').read_text().splitlines():
            digest, filename = line.split(maxsplit=1)
            sums[filename.strip()] = digest
        self.assertEqual(len(sums), 5)
        for filename, expected in sums.items():
            with self.subTest(filename=filename):
                artifact = DOWNLOADS/filename
                data = artifact.read_bytes()
                self.assertEqual(sha256(data).hexdigest(), expected)
                self.assertEqual(artifact.with_name(filename+'.sha256').read_text().split()[0], expected)
                manifest = json.loads(artifact.with_name(filename+'.manifest.json').read_text())
                self.assertEqual(manifest['artifact'], filename)
                self.assertEqual(manifest['sha256'], expected)
                self.assertEqual(manifest['bytes'], len(data))

    def test_zip_integrity_safe_paths_and_credential_exclusion(self):
        for archive in DOWNLOADS.glob('*.zip'):
            with self.subTest(archive=archive.name), zipfile.ZipFile(archive) as bundle:
                self.assertIsNone(bundle.testzip())
                for item in bundle.namelist():
                    path = PurePosixPath(item)
                    self.assertFalse(path.is_absolute() or '..' in path.parts or re.match(r'^[A-Za-z]:', item), item)
                    self.assertFalse(any(part.lower() in {'secrets', 'state', 'backups', '.git'} for part in path.parts), item)
                    self.assertFalse(path.name in {'google-client.json', 'google-token.json', 'config.observed.toml', 'sync.sqlite3'}, item)

    def test_public_text_has_no_live_credential_patterns(self):
        pattern = re.compile(r'(?:ntn_|secret_)[A-Za-z0-9_-]{25,}|1//[A-Za-z0-9_-]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
        for item in [GUIDE, *DOWNLOADS.glob('*.md'), *DOWNLOADS.glob('*.toml'), *DOWNLOADS.glob('*.example'), *DOWNLOADS.glob('*.json')]:
            with self.subTest(file=item.name):
                self.assertIsNone(pattern.search(item.read_text()))
        with zipfile.ZipFile(DOWNLOADS/'Notion-Calendar-Sync-0.2.1-Source.zip') as bundle:
            for item in bundle.namelist():
                if item.endswith(('.md', '.json', '.toml', '.example')):
                    with self.subTest(source_item=item):
                        self.assertIsNone(pattern.search(bundle.read(item).decode()))

    def test_report_relative_evidence_links(self):
        for item in DOWNLOADS.glob('*.md'):
            for href in re.findall(r'\]\(([^)]+)\)', item.read_text()):
                target = urlsplit(href)
                if target.scheme or target.netloc or href.startswith('#'):
                    continue
                with self.subTest(file=item.name, href=href):
                    self.assertTrue((item.parent/unquote(target.path)).exists())

    def test_http_guide_privacy_and_all_downloads(self):
        for href in ['notion-calendar-sync/', 'notion-calendar-sync/privacy.html', 'notion-research-diary/']:
            with self.subTest(href=href), urlopen(urljoin(self.base, href), timeout=15) as response:
                self.assertEqual(response.status, 200)
        for href in self.page.downloads:
            with self.subTest(download=href), urlopen(urljoin(self.base+'notion-calendar-sync/', href), timeout=20) as response:
                body = response.read()
                self.assertEqual(response.status, 200)
                local = GUIDE.parent/unquote(urlsplit(href).path)
                self.assertEqual(sha256(body).digest(), sha256(local.read_bytes()).digest())


if __name__ == '__main__':
    unittest.main()
