#!/usr/bin/env python3
"""Build allowlisted desktop artifacts without packaging account/state files.

native: run on each target OS/CPU with packaging/requirements-build.txt installed.
windows-portable: assemble a Windows x64 private-runtime ZIP on any build host.
source: assemble a generic source ZIP, excluding personal deployment evidence.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import platform
import shutil
import subprocess
import sys
import sysconfig
import tarfile
import tomllib
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NAME = 'Notion Calendar Sync'


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def verified_download(url, expected, destination, supplied=None):
    destination = Path(supplied) if supplied else Path(destination)
    if not destination.exists():
        if supplied:
            raise ValueError('The supplied runtime archive does not exist')
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + '.download')
        try:
            with urllib.request.urlopen(url, timeout=60) as response, temporary.open('wb') as out:
                total = 0
                while block := response.read(1024 * 1024):
                    total += len(block)
                    if total > 150 * 1024 * 1024:
                        raise ValueError('Runtime download exceeds size limit')
                    out.write(block)
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)
    if sha256(destination) != expected:
        raise ValueError('Runtime checksum mismatch; refusing to build')
    return destination


def extract_zip(archive, target, *, omit_pip=False):
    with zipfile.ZipFile(archive) as z:
        for member in z.infolist():
            parts = PurePosixPath(member.filename).parts
            if (PurePosixPath(member.filename).is_absolute() or
                    PureWindowsPath(member.filename).drive or '..' in parts or '\\' in member.filename):
                raise ValueError('Unsafe archive member')
            if omit_pip and (member.filename.startswith('Lib/site-packages/') or
                             member.filename.startswith('Lib/ensurepip/') or
                             member.filename.startswith('Scripts/')):
                continue
            z.extract(member, target)


def project_version():
    return tomllib.loads((ROOT / 'pyproject.toml').read_text())['project']['version']


def copy_source_package(target):
    source = ROOT / 'src/notion_calendar_sync'
    for path in source.rglob('*.py'):
        if '__pycache__' in path.parts:
            continue
        if path.is_symlink():
            raise ValueError('Source releases cannot include symlinks')
        output = target / path.relative_to(source)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, output)
    if not (target / 'desktop.py').exists():
        raise ValueError('Desktop entrypoint is missing; finish the source implementation before building')


def notices(target):
    for name in ('LICENSE', 'THIRD_PARTY_NOTICES.md'):
        shutil.copy2(ROOT / name, target / name)
    shutil.copy2(ROOT / 'docs/desktop.md', target / 'USER_GUIDE.md')
    shutil.copytree(ROOT / 'packaging/licenses', target / 'Licenses', dirs_exist_ok=True)


def archive_zip(source, destination):
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(source.rglob('*')):
            if path.is_file():
                if path.is_symlink():
                    raise ValueError('Unexpected symlink in Windows bundle')
                z.write(path, (source.name / path.relative_to(source)).as_posix())


def write_manifest(artifact, details):
    checksum = sha256(artifact)
    Path(str(artifact) + '.sha256').write_text(checksum + '  ' + artifact.name + '\n')
    Path(str(artifact) + '.manifest.json').write_text(json.dumps({
        'artifact': artifact.name, 'sha256': checksum, 'bytes': artifact.stat().st_size,
        'version': project_version(), **details}, indent=2) + '\n')
    print(json.dumps({'artifact': str(artifact), 'sha256': checksum, 'bytes': artifact.stat().st_size}))


def source_archive(args):
    args.output.mkdir(parents=True, exist_ok=True)
    artifact = args.output/f'Notion-Calendar-Sync-{project_version()}-Source.zip'
    prefix = 'notion-calendar-sync-' + project_version()
    files = []
    # Deliberately exclude the original README, observed examples, all private
    # account reports/screenshots and every unlisted file anywhere in the repo.
    for directory, pattern in [('src', '*.py'), ('tests', '*.py'),
                               ('scripts', '*.py'), ('deploy', '*'), ('packaging', '*')]:
        for p in (ROOT/directory).rglob(pattern):
            if p.is_file() and '__pycache__' not in p.parts and not p.name.endswith(('.pyc', '.pyo')):
                if p.is_symlink():
                    raise ValueError('Source releases cannot include symlinks')
                files.append(p)
    for name in ['.gitignore', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'pyproject.toml',
                 'examples/config.toml', 'examples/secrets.env.example',
                 'scripts/install-pi.sh', '.github/workflows/desktop-build.yml',
                 'docs/desktop.md', 'docs/desktop-validation.md', 'docs/desktop-native-credentials.json', 'docs/mapping.md',
                 'docs/security.md', 'docs/api-notes.md']:
        files.append(ROOT/name)
    with zipfile.ZipFile(artifact, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(ROOT/'packaging/README-desktop.md', prefix+'/README.md')
        for path in sorted(set(files)):
            if path.is_symlink() or not path.is_file():
                raise ValueError('Source release input is missing or not a regular file')
            z.write(path, prefix+'/'+path.relative_to(ROOT).as_posix())
    write_manifest(artifact, {'format': 'Generic MIT application source and tests',
                             'personal_deployment_evidence_included': False})


def windows_portable(args):
    pin = json.loads((ROOT / 'packaging/windows-runtime.json').read_text())
    cache = ROOT / 'build/desktop-cache'
    runtime = verified_download(pin['url'], pin['sha256'], cache/'python-windows.zip', args.runtime_zip)
    tzdata = verified_download(pin['tzdata_url'], pin['tzdata_sha256'], cache/'tzdata.whl', args.tzdata_wheel)
    stage = ROOT / 'build/desktop-windows' / NAME
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    extract_zip(runtime, stage/'runtime', omit_pip=True)
    site = stage/'runtime/Lib/site-packages'
    site.mkdir(parents=True, exist_ok=True)
    extract_zip(tzdata, site)
    copy_source_package(site/'notion_calendar_sync')
    for required in ('pythonw.exe', 'DLLs/_tkinter.pyd', 'Lib/tkinter/__init__.py', 'LICENSE.txt'):
        if not (stage/'runtime'/required).exists():
            raise ValueError('Official full runtime is incomplete: ' + required)
    for source, name in [('windows-start.vbs', 'Start Notion Calendar Sync.vbs'),
                         ('windows-start.cmd', 'Start Notion Calendar Sync.cmd'),
                         ('windows-install.vbs', 'Install.vbs')]:
        shutil.copy2(ROOT/'packaging'/source, stage/name)
    notices(stage)
    (stage/'BUILD_INFO.json').write_text(json.dumps({'runtime': pin, 'source_version': project_version(),
        'entrypoint': 'runtime/pythonw.exe -I -m notion_calendar_sync.desktop',
        'runtime_execution_tested_on_builder': sys.platform == 'win32'}, indent=2))
    if sys.platform == 'win32':
        subprocess.run([str(stage/'runtime/python.exe'), '-I', '-c',
                        'import tkinter,zoneinfo; from notion_calendar_sync import desktop; '
                        'assert zoneinfo.ZoneInfo("America/Denver"); r=tkinter.Tk();r.destroy()'], check=True)
    args.output.mkdir(parents=True, exist_ok=True)
    artifact = args.output/f'Notion-Calendar-Sync-{project_version()}-Windows-x64.zip'
    archive_zip(stage, artifact)
    write_manifest(artifact, {'format': 'Windows portable application plus optional per-user installer',
                             'runtime_sha256': pin['sha256'], 'tzdata_sha256': pin['tzdata_sha256'],
                             'windows_execution_tested': sys.platform == 'win32'})


def collect_native_licenses(destination):
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT/'packaging/licenses', destination/'upstream-runtime', dirs_exist_ok=True)
    for root in [Path(sys.base_prefix), Path(sys.base_prefix)/'Resources/English.lproj',
                 Path(sysconfig.get_path('stdlib'))]:
        for name in ['LICENSE.txt', 'LICENSE', 'License.rtf']:
            source = root/name
            if source.is_file():
                shutil.copy2(source, destination/('Python-'+name))
    # Preserve explicit license files used by the builder's interpreter/deps.
    import importlib.metadata
    for name in ['tzdata', 'pyinstaller']:
        dist = importlib.metadata.distribution(name)
        for entry in dist.files or []:
            if any(word in str(entry).lower() for word in ('license', 'copying')):
                path = dist.locate_file(entry)
                if path.is_file():
                    output = destination/name/str(entry).replace('../', '')
                    output.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(path, output)
    import tkinter
    interpreter = tkinter.Tcl()
    lib = Path(interpreter.eval('info library'))
    for directory in [lib, lib.parent/('tk'+tkinter.TkVersion.__str__())]:
        for name in ['license.terms', 'LICENSE', 'license.txt']:
            if (directory/name).is_file():
                shutil.copy2(directory/name, destination/(directory.name+'-'+name))
    # python.org's macOS installer keeps licenses beside the Tcl/Tk framework
    # resources rather than next to init.tcl.
    for framework in ('Tcl', 'Tk'):
        parent = Path(sys.base_prefix)/'Frameworks'/(framework+'.framework')/'Versions'
        if parent.exists():
            for path in parent.glob('*/Resources/license.terms'):
                shutil.copy2(path, destination/(framework+'-'+path.parent.parent.name+'-license.terms'))
    if not list(destination.glob('Python-*')):
        raise ValueError('Python license text was not found; collect it before distributing')


def native(args):
    if sys.platform not in ('darwin', 'win32'):
        raise ValueError('Native desktop bundles must be built on macOS or Windows')
    if not (ROOT/'src/notion_calendar_sync/desktop.py').is_file():
        raise ValueError('Desktop entrypoint is missing')
    architecture = args.mac_arch or platform.machine()
    # Freeze only the allowlisted desktop entrypoint and its imports. Runtime
    # state is in the user's app-data directory, never under this source tree.
    import PyInstaller
    import tzdata
    del PyInstaller, tzdata
    args.output.mkdir(parents=True, exist_ok=True)
    work = ROOT/'build/desktop-native'
    licenses = work/'Licenses'
    collect_native_licenses(licenses)
    command = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--windowed', '--onedir',
               '--name', NAME, '--paths', str(ROOT/'src'), '--distpath', str(args.output),
               '--workpath', str(work/'pyinstaller'), '--specpath', str(work),
               '--collect-all', 'tzdata', '--hidden-import', 'notion_calendar_sync.desktop_ui',
               '--add-data', str(ROOT/'LICENSE')+os.pathsep+'.',
               '--add-data', str(ROOT/'THIRD_PARTY_NOTICES.md')+os.pathsep+'.',
               '--add-data', str(ROOT/'docs/desktop.md')+os.pathsep+'.',
               '--add-data', str(licenses)+os.pathsep+'Licenses']
    if sys.platform == 'darwin':
        command += ['--osx-bundle-identifier', 'org.notion-calendar-sync.desktop']
        if args.mac_arch:
            command += ['--target-architecture', args.mac_arch]
    command += [str(ROOT/'packaging/desktop_entry.py')]
    subprocess.run(command, check=True, cwd=ROOT)
    if sys.platform == 'darwin':
        app = args.output/(NAME+'.app')
        stage = work/'dmg'
        if stage.exists(): shutil.rmtree(stage)
        stage.mkdir(parents=True)
        subprocess.run(['ditto', str(app), str(stage/app.name)], check=True)
        (stage/'Applications').symlink_to('/Applications')
        notices(stage)
        artifact = args.output/f'Notion-Calendar-Sync-{project_version()}-macOS-{architecture}.dmg'
        subprocess.run(['hdiutil', 'create', '-ov', '-volname', NAME, '-srcfolder', str(stage),
                        '-format', 'UDZO', str(artifact)], check=True)
        write_manifest(artifact, {'format': 'macOS application disk image', 'architecture': architecture,
                                 'signed_and_notarized': False})
    else:
        folder = args.output/NAME
        notices(folder)
        artifact = args.output/f'Notion-Calendar-Sync-{project_version()}-Windows-native-x64.zip'
        archive_zip(folder, artifact)
        write_manifest(artifact, {'format': 'Windows native frozen application', 'architecture': platform.machine(),
                                 'signed': False})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('format', choices=['native', 'windows-portable', 'source'])
    parser.add_argument('--output', type=Path, default=ROOT/'dist/desktop')
    parser.add_argument('--runtime-zip', type=Path)
    parser.add_argument('--tzdata-wheel', type=Path)
    parser.add_argument('--mac-arch', choices=['arm64', 'x86_64', 'universal2'],
                        help='Native macOS target; universal2 requires universal Python and all binary dependencies')
    args = parser.parse_args()
    args.output = args.output.resolve()
    {'native': native, 'windows-portable': windows_portable, 'source': source_archive}[args.format](args)


if __name__ == '__main__':
    main()
