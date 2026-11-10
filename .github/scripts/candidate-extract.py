"""Extract only checksum-pinned, credential-free release candidate archives."""
from pathlib import Path,PurePosixPath
from hashlib import sha256
import argparse,json,platform,zipfile,shutil
p=argparse.ArgumentParser();p.add_argument('--platform',choices=['windows','intel'],required=True);a=p.parse_args()
root=Path('.github/validation');checks=[]
for name,destination in [('Notion-Calendar-Sync-0.2.2-Source.zip','candidate')]+([('Notion-Calendar-Sync-0.2.2-Windows-x64.zip','portable')] if a.platform=='windows' else []):
 f=root/name;actual=sha256(f.read_bytes()).hexdigest();expected=(root/(name+'.sha256')).read_text().split()[0];assert actual==expected
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None
  for item in z.namelist():
   v=PurePosixPath(item);assert not v.is_absolute() and '..' not in v.parts and ':' not in v.parts[0]
   assert not any(s.lower() in ('secrets','state','backups','.git') for s in v.parts)
  target=Path(destination);assert not target.exists();z.extractall(target)
 checks.append({'archive':name,'sha256':actual,'bytes':f.stat().st_size})
Path('reports').mkdir(exist_ok=True)
Path('reports/candidate-downloads-'+a.platform+'.json').write_text(json.dumps({'passed':True,'platform':platform.platform(),'machine':platform.machine(),'checks':checks,'private_credentials_accessed':False},indent=2)+'\n')
