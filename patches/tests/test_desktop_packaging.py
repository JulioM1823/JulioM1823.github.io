"""Release boundary checks: hashes, traversal rejection and source allowlisting."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('desktop_builder', Path(__file__).resolve().parents[1]/'scripts/build-desktop.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class DesktopPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)

    def test_cached_runtime_must_match_pinned_hash(self):
        archive = self.root/'runtime.zip'
        archive.write_bytes(b'not the official runtime')
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            builder.verified_download('https://unused.invalid', '0'*64, archive)
        self.assertEqual(archive.read_bytes(), b'not the official runtime')

    def test_supplied_matching_runtime_requires_no_network(self):
        archive = self.root/'runtime.zip'
        archive.write_bytes(b'fixture')
        with patch.object(builder.urllib.request, 'urlopen', side_effect=AssertionError('network')):
            self.assertEqual(builder.verified_download('https://unused.invalid', builder.sha256(archive),
                                                     self.root/'other.zip', archive), archive)

    def test_runtime_archives_reject_traversal_and_absolute_members(self):
        names = ['../escaped', '/absolute', 'sub/../../escaped', 'C:/escaped', 'C:escaped', '//server/share/file']
        # ZipInfo normalizes backslashes to harmless separators on Windows
        # before our parser sees them; POSIX preserves them and must reject.
        if os.name != 'nt':
            names.append('back\\slash')
        for name in names:
            archive = self.root/'unsafe.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr(name, b'unsafe')
            with self.assertRaisesRegex(ValueError, 'Unsafe archive member'):
                builder.extract_zip(archive, self.root/'output')
        self.assertFalse((self.root/'escaped').exists())

    def test_runtime_extraction_omits_unneeded_pip_and_keeps_tk(self):
        archive = self.root/'runtime.zip'
        with zipfile.ZipFile(archive, 'w') as z:
            for name in ('pythonw.exe', 'Lib/tkinter/__init__.py', 'DLLs/_tkinter.pyd',
                         'Lib/site-packages/pip/__init__.py', 'Scripts/pip.exe', 'LICENSE.txt'):
                z.writestr(name, b'fixture')
        output = self.root/'output'
        builder.extract_zip(archive, output, omit_pip=True)
        self.assertTrue((output/'DLLs/_tkinter.pyd').exists())
        self.assertTrue((output/'LICENSE.txt').exists())
        self.assertFalse((output/'Lib/site-packages/pip/__init__.py').exists())
        self.assertFalse((output/'Scripts/pip.exe').exists())

    def test_application_copy_excludes_credentials_state_and_bytecode(self):
        package = self.root/'src/notion_calendar_sync'
        package.mkdir(parents=True)
        for name in ('desktop.py', '__init__.py', 'desktop_ui.py', 'google-token.json', 'sync.sqlite3', 'secrets.env'):
            (package/name).write_text('fixture')
        cache = package/'__pycache__'
        cache.mkdir()
        (cache/'cached.py').write_text('private cached fixture')
        (self.root/'secrets').mkdir()
        (self.root/'secrets/real-token.json').write_text('private-token-fixture')
        output = self.root/'release'
        with patch.object(builder, 'ROOT', self.root):
            builder.copy_source_package(output)
        self.assertEqual(sorted(p.name for p in output.iterdir()), ['__init__.py', 'desktop.py', 'desktop_ui.py'])

    def test_release_zip_rejects_symlinks(self):
        source = self.root/'application'
        source.mkdir()
        private = self.root/'private.txt'
        private.write_text('private fixture')
        try:
            (source/'link.txt').symlink_to(private)
        except OSError:
            self.skipTest('This Windows account cannot create symlinks')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            builder.archive_zip(source, self.root/'application.zip')

    def test_copied_package_requires_desktop_entrypoint(self):
        package = self.root/'src/notion_calendar_sync'
        package.mkdir(parents=True)
        (package/'__init__.py').write_text('')
        with patch.object(builder, 'ROOT', self.root):
            with self.assertRaisesRegex(ValueError, 'entrypoint'):
                builder.copy_source_package(self.root/'release')
