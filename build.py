import base64,json,zipfile,io,os
from urllib.parse import urlsplit
from pathlib import Path
default_origin="https://deskpa-workstation.grassycaper.chatgpt.site"
# Prefer an explicit custom origin; otherwise bind the companion to this Render service.
origin=(os.environ.get("DESKPA_PUBLIC_ORIGIN") or os.environ.get("RENDER_EXTERNAL_URL") or default_origin).rstrip("/")
parts=urlsplit(origin)
if parts.scheme not in ("http","https") or not parts.hostname or parts.path or parts.query or parts.fragment or parts.username or parts.password:
 raise ValueError("DESKPA_PUBLIC_ORIGIN must be a bare HTTP(S) origin")
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as archive:
 for f in sorted(Path('companion').glob('*')):
  content=f.read_text().replace(default_origin,origin)
  if f.name=="manifest.json":
   manifest=json.loads(content)
   manifest["content_scripts"][0]["matches"]=[f"{parts.scheme}://{parts.hostname}/*"]
   content=json.dumps(manifest)
  info=zipfile.ZipInfo(f.name)
  archive.writestr(info,content,compress_type=zipfile.ZIP_DEFLATED)
sources={k:Path('web',name).read_text() for k,name in [('/','index.html'),('/style.css','style.css'),('/app.js','app.js'),('/task.js','task.js')]}
provider=Path('providers.mjs').read_text()
sources['/catalog.js']=provider.split('const planner=')[0]
worker=provider+'\nconst assets='+json.dumps(sources)+';\nconst zipped='+json.dumps(base64.b64encode(buf.getvalue()).decode())+''';
export default {async fetch(req){
const p=new URL(req.url).pathname;
if(p==="/api/infer")return api(req);
if(!["GET","HEAD"].includes(req.method))return new Response("Method not allowed",{status:405});
if(p==="/companion.zip")return new Response(Uint8Array.from(atob(zipped),c=>c.charCodeAt(0)),{headers:{"content-type":"application/zip","content-disposition":"attachment; filename=DeskPA-Companion.zip"}});
if(!Object.hasOwn(assets,p))return new Response("Not found",{status:404});
return new Response(assets[p],{headers:{"Content-Type":p==="/"? "text/html;charset=utf-8":p.endsWith(".css")?"text/css":"text/javascript","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"}})
}};
'''
Path('dist/server').mkdir(parents=True,exist_ok=True)
Path('dist/server/index.js').write_text(worker)
