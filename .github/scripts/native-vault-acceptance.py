"""Full controlled setup with actual native credential persistence, disposable namespace."""
from pathlib import Path
import argparse,importlib.util,json,platform,sys,uuid
from notion_calendar_sync.desktop_platform import SecretStore
p=argparse.ArgumentParser();p.add_argument('--source-script',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
assert platform.system()=='Windows','This check targets actual Windows Credential Manager'
spec=importlib.util.spec_from_file_location('guide_controlled_acceptance',a.source_script.resolve())
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
instances=[]
class NativeVault:
 def __init__(self):
  self.store=SecretStore(service='org.notioncalendarsync.guide-test.'+uuid.uuid4().hex)
  self.keys=set();instances.append(self)
 def get(self,key):return self.store.get(key)
 def set(self,key,value):self.keys.add(key);self.store.set(key,value)
 def delete(self,key):self.store.delete(key)
module.Vault=NativeVault
report={'passed':False,'native_credential_manager':True,'real_provider_accounts_accessed':False,'real_credentials_accessed':False}
error=None
try:
 report=module.run_acceptance()
 report['native_credential_manager']=True
 report['native_fake_credential_keys']=sum(len(v.keys) for v in instances)
 assert report['native_fake_credential_keys']>=3, 'Controller did not write expected account/client/token native keys'
except BaseException as exc:
 error=exc;report['passed']=False;report['error']=type(exc).__name__;report['message']=str(exc)
finally:
 cleanup=[]
 for v in instances:
  for key in v.keys:
   try:
    v.delete(key)
    assert v.get(key) is None
   except Exception as exc:cleanup.append(type(exc).__name__)
 report['native_credentials_cleanup_verified']=not cleanup
 report['cleanup_errors']=cleanup
 report['passed']=report['passed'] and not cleanup
 a.output.parent.mkdir(parents=True,exist_ok=True)
 a.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if error:raise error
if not report['passed']:raise SystemExit(1)
