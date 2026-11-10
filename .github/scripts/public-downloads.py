"""Fetch only public release files; never accesses account credentials."""
from pathlib import Path, PurePosixPath
from urllib.request import Request, urlopen
from hashlib import sha256
import argparse,json,platform,zipfile
p=argparse.ArgumentParser();p.add_argument('--platform',choices=['windows','intel'],required=True);a=p.parse_args()
base='https://juliom1823.github.io/notion-calendar-sync/'
root=Path('public-downloads');root.mkdir(exist_ok=True)
report={'base_url':base,'host':platform.platform(),'machine':platform.machine(),'checks':[]}
def fetch(name,path=None):
 url=base+name
 with urlopen(Request(url,headers={'User-Agent':'NCS-public-guide-native-validation','Accept-Encoding':'identity'}),timeout=90) as r:data=r.read();status=r.status
 out=root/(path or Path(name).name);out.write_bytes(data)
 return out,{'url':url,'status':status,'bytes':len(data),'sha256':sha256(data).hexdigest()}
_,guide=fetch('', 'published-guide.html');report['checks'].append(guide)
sums,_=fetch('downloads/SHA256SUMS.txt')
expected={line.split(maxsplit=1)[1].strip():line.split()[0] for line in sums.read_text().splitlines()}
files=['Notion-Calendar-Sync-0.2.1-Source.zip']
files += ['Notion-Calendar-Sync-0.2.1-Windows-x64.zip','Notion-Calendar-Sync-0.2.1-Windows-native-x64.zip'] if a.platform=='windows' else ['Notion-Calendar-Sync-0.2.1-macOS-x86_64.dmg']
for f in files:
 item,info=fetch('downloads/'+f);assert info['sha256']==expected[f], f+' checksum mismatch'
 report['checks'].append(info)
 if f.endswith('.zip'):
  with zipfile.ZipFile(item) as z:
   assert z.testzip() is None
   for n in z.namelist():
    part=PurePosixPath(n);assert not part.is_absolute() and '..' not in part.parts and ':' not in part.parts[0]
   dest=Path('source' if 'Source' in f else 'portable' if f.endswith('-Windows-x64.zip') else 'native')
   assert not dest.exists(), 'Fresh extraction required'
   z.extractall(dest)
report['passed']=True
Path('reports').mkdir(exist_ok=True)
Path('reports/downloads-'+a.platform+'.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
