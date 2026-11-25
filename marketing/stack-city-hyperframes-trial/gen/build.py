import json,re,html
W=json.load(open('/tmp/claude-0/-home-user/2b9c32e8-a2eb-5934-bc91-5fe4026fd2e3/scratchpad/render3d/vo/ep8.json'))
disp=re.search(r'display=`([^`]*)`',open('/tmp/hfp/ep8/lib/episodes/ep8.js').read()).group(1).split()
assert len(disp)==len(W)
T=lambda i:W[i][1]
DUR=round(W[-1][2]+1.8,2)
b=[T(8),T(15),T(24),T(29),T(36),T(43)]
isHL=lambda s:(lambda c:bool(re.search('[$0-9]',c)) or (len(c)>1 and c==c.upper()))(re.sub('[^A-Za-z0-9$]','',s))
# hook = words 0..7 shown as big kinetic title
HOOK=list(range(0,8))
groups=[];cur=[]
for i in range(8,len(W)):
  cur.append(i)
  if re.search(r'[.,!?…:]$',disp[i]) or len(cur)>=3: groups.append(cur);cur=[]
if cur:groups.append(cur)
pills=[(0.15,b[0],'WHAT <b>IF?</b>'),(b[0],b[1],'THE <b>DROP</b>'),(b[1],b[3],'THE <b>TWIST</b>'),(b[3],b[4],'THE <b>STORM</b>'),(b[4],b[5]+.6,'THE <b>WIN</b>')]
o=[]
# pills
for k,(s,e,h) in enumerate(pills):
  o.append(f'<div id="pill{k}" class="clip pill" data-start="{s:.2f}" data-duration="{e-s:.2f}" data-track-index="2"><span class="pin">{h}</span></div>')
# hook title
o.append(f'<div id="hook" class="clip hook" data-start="0" data-duration="{W[7][2]+.25:.2f}" data-track-index="3"><div class="hin">'+''.join(f'<span id="h{i}" class="hw{" hl" if isHL(disp[i]) else ""}">{html.escape(disp[i])}</span> ' for i in HOOK)+'</div></div>')
# caption groups
cap=[]
for g,ids in enumerate(groups):
  s=W[ids[0]][1]-.06; e=(W[groups[g+1][0]][1]-.06) if g+1<len(groups) else W[ids[-1]][2]+1.2
  e=min(e, W[ids[-1]][2]+.9)
  words=''.join(f'<span id="w{i}" class="w{" hl" if isHL(disp[i]) else ""}">{html.escape(disp[i].strip(chr(34)))}</span> ' for i in ids)
  cap.append(f'<div id="g{g}" class="clip grp" data-start="{s:.2f}" data-duration="{e-s:.2f}" data-track-index="4"><div class="gin">{words}</div></div>')
o+=cap
cta_t=T(49)
o.append(f'<div id="cta" class="clip cta" data-start="{cta_t:.2f}" data-duration="{DUR-cta_t:.2f}" data-track-index="5"><span class="cin">Comment what you\'d drop with 👇</span></div>')
flashes=b
for k,t in enumerate(flashes):
  o.append(f'<div id="fl{k}" class="clip flash" data-start="{t-.02:.2f}" data-duration="0.3" data-track-index="6"><div class="fin"></div></div>')
# audio
aud=[f'<audio id="vo" class="clip" src="assets/vo.wav" data-start="0" data-duration="{DUR}" data-track-index="10" data-volume="1"></audio>']
for k,t in enumerate(b):
  aud.append(f'<audio id="wh{k}" class="clip" src="assets/whoosh.wav" data-start="{max(0,t-.2):.2f}" data-duration="0.45" data-track-index="11" data-volume="0.5"></audio>')
for k,t in enumerate([T(8)+.4,T(34),T(46)]):
  aud.append(f'<audio id="bm{k}" class="clip" src="assets/boom.wav" data-start="{t:.2f}" data-duration="0.5" data-track-index="12" data-volume="0.6"></audio>')
# GSAP
js=[]
js.append("tl.set('#stage',{scale:1},0);")
for t in b:
  js.append(f"tl.fromTo('#stage',{{scale:1.07}},{{scale:1,duration:.45,ease:'power3.out'}},{t:.2f});")
for k,(s,e,h) in enumerate(pills):
  js.append(f"tl.fromTo('#pill{k} .pin',{{y:-40,opacity:0,rotationX:-80}},{{y:0,opacity:1,rotationX:0,duration:.3,ease:'back.out(2)'}},{s:.2f});")
for i in HOOK:
  js.append(f"tl.fromTo('#h{i}',{{scale:{1 if i<2 else (0.2 if isHL(disp[i]) else 0.6)},opacity:{1 if i<2 else 0},y:{0 if i<2 else 30}}},{{scale:1,opacity:1,y:0,duration:.22,ease:'back.out(3)'}},{(0 if i<2 else max(.0,W[i][1]-.08)):.2f});")
js.append(f"tl.to('#hook .hin',{{scale:.6,y:-260,opacity:0,duration:.25,ease:'power2.in'}},{W[7][2]:.2f});")
for g,ids in enumerate(groups):
  s=W[ids[0]][1]-.06
  js.append(f"tl.fromTo('#g{g} .gin',{{scale:.7,y:24}},{{scale:1,y:0,duration:.18,ease:'back.out(2.5)'}},{s:.2f});")
  for i in ids:
    js.append(f"tl.fromTo('#w{i}',{{opacity:0,y:14}},{{opacity:1,y:0,duration:.1}},{W[i][1]-.06:.2f});")
    js.append(f"tl.fromTo('#w{i}',{{backgroundColor:'rgba(255,90,54,0)',scale:1}},{{backgroundColor:'rgba(255,90,54,1)',scale:{1.18 if isHL(disp[i]) else 1.06},duration:.08}},{W[i][1]-.03:.2f});")
    js.append(f"tl.to('#w{i}',{{backgroundColor:'rgba(255,90,54,0)',scale:1,duration:.1}},{W[i][2]:.2f});")
js.append(f"tl.fromTo('#cta .cin',{{scale:0,rotation:-8}},{{scale:1,rotation:0,duration:.4,ease:'back.out(2.5)'}},{cta_t:.2f});")
for k,t in enumerate(flashes):
  js.append(f"tl.fromTo('#fl{k} .fin',{{opacity:.55}},{{opacity:0,duration:.28,ease:'power2.out'}},{t-.02:.2f});")
page=open('/tmp/hfp/gen/tpl.html').read().replace('%DUR%',str(DUR)).replace('%WORDS%',json.dumps(W)).replace('%CLIPS%','\n      '.join(o+aud)).replace('%JS%','\n      '.join(js))
open('/tmp/hfp/ep8/index.html','w').write(page)
print('dur',DUR,'groups',len(groups))
