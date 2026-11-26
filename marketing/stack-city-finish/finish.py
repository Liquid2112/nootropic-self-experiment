# usage: finish.py epN  -> builds /tmp/hfp/epN HyperFrames project
import json,re,html,os,shutil,sys
ep=sys.argv[1]
R='/tmp/claude-0/-home-user/2b9c32e8-a2eb-5934-bc91-5fe4026fd2e3/scratchpad/render3d'
P=f'/tmp/hfp/{ep}'
PR=json.load(open(f'{R}/probe.json'))[ep]
os.makedirs(P+'/lib/episodes',exist_ok=True);os.makedirs(P+'/assets',exist_ok=True)
shutil.copy(f'{R}/node_modules/three/build/three.module.js',P+'/lib/')
for f in ('common.js',ep+'.js'):shutil.copy(f'{R}/episodes/{f}',P+'/lib/episodes/')
shutil.copy(f'{R}/vo/{ep}.wav',P+'/assets/vo.wav')
for f in ('whoosh.wav','boom.wav','pop.wav'):shutil.copy('/tmp/hfp/fin/shared/'+f,P+'/assets/')
for f in ('hyperframes.json','package.json'):shutil.copy('/tmp/hfp/fin/shared/'+f,P+'/')
sc=open('/tmp/hfp/fin/shared/scene.js').read().replace("./episodes/ep8.js",f"./episodes/{ep}.js")
open(P+'/lib/scene.js','w').write(sc)
W=json.load(open(f'{R}/vo/{ep}.json'))
disp=re.search(r'display=`([^`]*)`',open(f'{R}/episodes/{ep}.js').read()).group(1).split()
assert len(disp)==len(W),(len(disp),len(W))
DUR=round(PR['dur'],2)
hidden=lambda i:disp[i].startswith('_')
clean=lambda s:s.strip('"').lstrip('_')
isHL=lambda s:(lambda c:bool(re.search('[$0-9]',c)) or (len(c)>1 and c==c.upper()))(re.sub('[^A-Za-z0-9$]','',s))
# hook = first sentence (<=9 words)
H=0
for i in range(len(disp)):
  H=i+1
  if re.search(r'[.?!]"?$',disp[i]):break
if H>9:H=5
HOOK=[i for i in range(H) if not hidden(i)]
groups=[];cur=[]
for i in range(H,len(W)):
  if hidden(i):continue
  cur.append(i)
  if re.search(r'[.,!?…:]"?$',disp[i]) or len(cur)>=3: groups.append(cur);cur=[]
if cur:groups.append(cur)
pills=[(max(0,p['s']),p['e'],p['h']) for p in PR['pills']]
beats=[p[0] for p in pills[1:]]
cta=PR['cta']
o=[]
for k,(s,e,h) in enumerate(pills):
  o.append(f'<div id="pill{k}" class="clip pill" data-start="{s:.2f}" data-duration="{e-s:.2f}" data-track-index="2"><span class="pin">{h}</span></div>')
hook_end=W[H-1][2]
o.append(f'<div id="hook" class="clip hook" data-start="0" data-duration="{hook_end+.25:.2f}" data-track-index="3"><div class="hin">'+''.join(f'<span id="h{i}" class="hw{" hl" if isHL(disp[i]) else ""}">{html.escape(clean(disp[i]))}</span> ' for i in HOOK)+'</div></div>')
for g,ids in enumerate(groups):
  s=W[ids[0]][1]-.06; e=(W[groups[g+1][0]][1]-.06) if g+1<len(groups) else W[ids[-1]][2]+1.2
  e=min(e, W[ids[-1]][2]+.9)
  words=''.join(f'<span id="w{i}" class="w{" hl" if isHL(disp[i]) else ""}">{html.escape(clean(disp[i]))}</span> ' for i in ids)
  o.append(f'<div id="g{g}" class="clip grp" data-start="{s:.2f}" data-duration="{e-s:.2f}" data-track-index="4"><div class="gin">{words}</div></div>')
if cta:
  o.append(f'<div id="cta" class="clip cta" data-start="{cta["t"]:.2f}" data-duration="{DUR-cta["t"]:.2f}" data-track-index="5"><span class="cin">{html.escape(cta["text"])} 👇</span></div>')
for k,t in enumerate(beats):
  o.append(f'<div id="fl{k}" class="clip flash" data-start="{t-.02:.2f}" data-duration="0.3" data-track-index="6"><div class="fin"></div></div>')
vlen=W[-1][2]+.4
aud=[f'<audio id="vo" class="clip" src="assets/vo.wav" data-start="0" data-duration="{min(DUR,vlen):.2f}" data-track-index="10" data-volume="1"></audio>']
for k,t in enumerate(beats):
  aud.append(f'<audio id="wh{k}" class="clip" src="assets/whoosh.wav" data-start="{max(0,t-.2):.2f}" data-duration="0.45" data-track-index="11" data-volume="0.5"></audio>')
booms=[pills[-1][0]]+([cta['t']] if cta else [])
for k,t in enumerate(booms):
  aud.append(f'<audio id="bm{k}" class="clip" src="assets/boom.wav" data-start="{t:.2f}" data-duration="0.5" data-track-index="12" data-volume="0.6"></audio>')
js=["tl.set('#stage',{scale:1},0);"]
for t in beats: js.append(f"tl.fromTo('#stage',{{scale:1.07}},{{scale:1,duration:.45,ease:'power3.out'}},{t:.2f});")
for k,(s,e,h) in enumerate(pills):
  js.append(f"tl.fromTo('#pill{k} .pin',{{y:-40,opacity:0,rotationX:-80}},{{y:0,opacity:1,rotationX:0,duration:.3,ease:'back.out(2)'}},{s:.2f});")
for n,i in enumerate(HOOK):
  first=n<2
  js.append(f"tl.fromTo('#h{i}',{{scale:{1 if first else (0.2 if isHL(disp[i]) else 0.6)},opacity:{1 if first else 0},y:{0 if first else 30}}},{{scale:1,opacity:1,y:0,duration:.22,ease:'back.out(3)'}},{(0 if first else max(.0,W[i][1]-.08)):.2f});")
js.append(f"tl.to('#hook .hin',{{scale:.6,y:-260,opacity:0,duration:.25,ease:'power2.in'}},{hook_end:.2f});")
for g,ids in enumerate(groups):
  s=W[ids[0]][1]-.06
  js.append(f"tl.fromTo('#g{g} .gin',{{scale:.7,y:24}},{{scale:1,y:0,duration:.18,ease:'back.out(2.5)'}},{s:.2f});")
  for i in ids:
    js.append(f"tl.fromTo('#w{i}',{{opacity:0,y:14}},{{opacity:1,y:0,duration:.1}},{W[i][1]-.06:.2f});")
    js.append(f"tl.fromTo('#w{i}',{{backgroundColor:'rgba(255,90,54,0)',scale:1}},{{backgroundColor:'rgba(255,90,54,1)',scale:{1.18 if isHL(disp[i]) else 1.06},duration:.08}},{W[i][1]-.03:.2f});")
    js.append(f"tl.to('#w{i}',{{backgroundColor:'rgba(255,90,54,0)',scale:1,duration:.1}},{W[i][2]:.2f});")
if cta: js.append(f"tl.fromTo('#cta .cin',{{scale:0,rotation:-8}},{{scale:1,rotation:0,duration:.4,ease:'back.out(2.5)'}},{cta['t']:.2f});")
for k,t in enumerate(beats): js.append(f"tl.fromTo('#fl{k} .fin',{{opacity:.55}},{{opacity:0,duration:.28,ease:'power2.out'}},{t-.02:.2f});")
page=open('/tmp/hfp/fin/tpl.html').read().replace('%DUR%',str(DUR)).replace('%WORDS%',json.dumps(W)).replace('%CLIPS%','\n      '.join(o+aud)).replace('%JS%','\n      '.join(js))
open(P+'/index.html','w').write(page)
print(ep,'dur',DUR,'hook',H,'groups',len(groups),'beats',len(beats))
