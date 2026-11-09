#!/usr/bin/env python3
"""Native macOS probes using only disposable credentials and temporary files.

Run under either native arm64 or `arch -x86_64` Python. Existing credentials,
startup preferences, account grants and synchronization state are never read.
"""
import argparse
import ctypes
import json
import os
from pathlib import Path
import platform
import plistlib
import subprocess
import sys
import tempfile
import uuid


def run_checks(bundle=None):
    if sys.platform != 'darwin':
        raise RuntimeError('This checker requires actual macOS execution.')
    from notion_calendar_sync.desktop_platform import SecretStore, SecretJSONStore, set_startup, startup_enabled
    from notion_calendar_sync.oauth import TokenManager, secure_write
    from notion_calendar_sync.service import StateLock
    from notion_calendar_sync.store import Store
    translated = subprocess.run(['/usr/sbin/sysctl','-in','sysctl.proc_translated'], capture_output=True, text=True)
    result = {'platform':platform.platform(), 'machine':platform.machine(),
              'python':sys.version.split()[0], 'native_macos_apis':True,
              'translated_x86':translated.returncode == 0 and translated.stdout.strip() == '1',
              'checks':[], 'passed':False, 'existing_credentials_accessed':False,
              'real_startup_preference_changed':False, 'secret_values_logged':False}
    def check(name, condition):
        if not condition:
            raise AssertionError(name)
        result['checks'].append(name)
    api = ctypes.CDLL('/System/Library/Frameworks/Security.framework/Security')
    get_interaction = api.SecKeychainGetUserInteractionAllowed
    get_interaction.argtypes = [ctypes.POINTER(ctypes.c_bool)]
    get_interaction.restype = ctypes.c_int32
    set_interaction = api.SecKeychainSetUserInteractionAllowed
    set_interaction.argtypes = [ctypes.c_bool]
    set_interaction.restype = ctypes.c_int32
    previous = ctypes.c_bool()
    check('read process Keychain interaction flag',get_interaction(ctypes.byref(previous)) == 0)
    check('disable prompts in this probe process',set_interaction(False) == 0)
    vault = SecretStore(service='org.notioncalendarsync.test.'+uuid.uuid4().hex)
    try:
        check('isolated credential missing',vault.get('probe') is None)
        vault.set('probe','disposable credential café 🌌')
        check('native Keychain roundtrip',vault.get('probe') == 'disposable credential café 🌌')
        large = 'disposable-long-🔐'*1000
        vault.set('probe',large)
        check('native long Unicode credential replacement',vault.get('probe') == large)
        vault.delete('probe')
        check('native credential deleted',vault.get('probe') is None)
        tokens = SecretJSONStore(vault,'oauth')
        tokens.save({'refresh_token':'disposable-refresh','expires_at':0})
        class Transport:
            def request(self,*a,**kw):
                return {'access_token':'disposable-access','expires_in':3600}
        with tempfile.TemporaryDirectory(prefix='ncs-mac-native-') as td:
            root = Path(td)
            manager = TokenManager(root/'unused-client',root/'unused-token',Transport(),
                client_loader=lambda:{'client_id':'disposable-id'},token_loader=tokens.load,token_saver=tokens.save)
            check('native OAuth secure refresh hook',manager.access_token() == 'disposable-access' and tokens.load()['refresh_token'] == 'disposable-refresh')
            check('no plaintext OAuth files',not list(root.iterdir()))
            state = root/'state.sqlite3'
            from notion_calendar_sync import service
            package_root = str(Path(service.__file__).resolve().parent.parent)
            code = 'import sys;sys.path.insert(0,sys.argv[1]);from notion_calendar_sync.service import StateLock\ntry:\n with StateLock(sys.argv[2]):print("acquired")\nexcept RuntimeError:print("blocked")'
            command = [sys.executable,'-I','-c',code,package_root,str(state)]
            with StateLock(state):
                child = subprocess.run(command,capture_output=True,text=True,timeout=30)
                check('native second writer rejected',child.returncode == 0 and child.stdout.strip() == 'blocked')
            child = subprocess.run(command,capture_output=True,text=True,timeout=30)
            check('native writer lock released',child.returncode == 0 and child.stdout.strip() == 'acquired')
            with Store(state) as store:
                store.set_meta('disposable-marker',{'unchanged':True})
                store.db.commit()
                store.backup(root/'backup.sqlite3')
                check('native SQLite integrity',store.db.execute('PRAGMA quick_check').fetchone()[0] == 'ok')
            with Store(root/'backup.sqlite3') as store:
                check('native SQLite backup preserves state',store.get_meta('disposable-marker') == {'unchanged':True})
            check('native private state permissions',(state.stat().st_mode & 0o777) == 0o600)
            secure_write(root/'settings.json',{'nonsecret-setting':True})
            check('native atomic settings write',json.loads((root/'settings.json').read_text()) == {'nonsecret-setting':True})
            startup = [sys.executable,'-I','-m','notion_calendar_sync.desktop','--background']
            # The real implementation writes only beneath this isolated fake
            # home, with no launchctl registration or real LaunchAgent change.
            home = root/'fake-home'
            set_startup(True,startup,home=home)
            check('startup registration isolated home',startup_enabled(home=home))
            files = list((home/'Library/LaunchAgents').glob('*.plist'))
            with files[0].open('rb') as f:
                plist = plistlib.load(f)
            check('startup private runtime arguments',plist['ProgramArguments'] == startup and plist['KeepAlive'] == {'SuccessfulExit':False})
            set_startup(False,startup,home=home)
            check('startup removal isolated home',not startup_enabled(home=home))
        if bundle:
            bundle = Path(bundle).resolve()
            executable = bundle/'Contents/MacOS/Notion Calendar Sync'
            check('bundle executable exists',executable.is_file())
            child = subprocess.run([str(executable),'--smoke-test'],timeout=60)
            check('packaged native Tk setup window',child.returncode == 0)
        result['passed'] = True
        return result
    finally:
        try:
            vault.delete('probe')
            vault.delete('oauth')
        finally:
            if set_interaction(previous.value) != 0:
                raise RuntimeError('Could not restore this process Keychain interaction flag.')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--bundle',type=Path)
    ap.add_argument('--output',type=Path,required=True)
    args = ap.parse_args()
    try:
        result = run_checks(args.bundle)
    except Exception as error:
        result = {'passed':False,'native_macos_apis':sys.platform == 'darwin','error':type(error).__name__}
        if isinstance(error,(AssertionError,RuntimeError)):
            result['message'] = str(error)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    if not result['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
