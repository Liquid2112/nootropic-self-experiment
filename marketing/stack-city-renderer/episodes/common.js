// shared helpers for episodes
export function slideCard(S,m,t,t0,t1,pos=[.25,1.3,2.2],sc=.78){
  const {lerp,back,ease}=S;
  m.visible=t>=t0&&t<t1+.35;
  if(!m.visible)return;
  const pin=back((t-t0)/.5), pout=ease((t-t1)/.3);
  m.position.set(lerp(6,pos[0],pin)+lerp(0,-9,pout),pos[1],pos[2]);
  m.rotation.y=lerp(-1.2,-.1,pin);
  m.scale.setScalar(lerp(.4,sc,pin));
}
export function camKeys(S,t,keys,useLx){ // keys: [t,x,y,z,lx,ly], eased between; key with cut:true jumps
  const {lerp,ease}=S;let a=keys[0],b=keys[0];
  for(let i=0;i<keys.length;i++){if(t>=keys[i][0]){a=keys[i];b=keys[i+1]||keys[i];}}
  const span=Math.max(.001,b[0]-a[0]);const u=b===a?0:ease((t-a[0])/span);
  const v=i=>lerp(a[i],b[i],u);
  S.cam.position.set(v(1),v(2),v(3));S.cam.lookAt(useLx?v(4):v(1)*.5,v(5),0);
}
export function drawVerdict(g,W,H,stamp,blur){
  g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.fillStyle='#8e88a8';g.font='800 26px Inter';g.fillText('DAY 21 · TEST RESULT',40,64);
  g.fillStyle='#fff';g.font='900 46px Inter';g.fillText('Your morning stack',40,124);
  if(blur)g.filter='blur(9px)';
  const bar=(y,l,w,c,v)=>{g.fillStyle='#8e88a8';g.font='800 24px Inter';g.fillText(l,40,y+28);g.fillStyle='#262236';g.beginPath();g.roundRect(150,y,440,40,12);g.fill();g.fillStyle=c;g.beginPath();g.roundRect(150,y,w,40,12);g.fill();g.fillStyle='#fff';g.font='900 22px Inter';g.fillText(v,150+w-82,y+28);};
  bar(170,'ON',400,'#FF5A36','271ms');bar(230,'OFF',300,'#B7A6FF','298ms');
  g.filter='none';
  if(stamp>0){g.save();g.globalAlpha=Math.min(1,stamp);g.translate(320,356);g.scale(1+(1-Math.min(1,stamp))*.6,1+(1-Math.min(1,stamp))*.6);
   g.fillStyle=blur?'#B7A6FF':'#2fbf71';g.beginPath();g.roundRect(-280,-44,560,88,20);g.fill();
   g.fillStyle=blur?'#15131C':'#062a16';g.font='900 38px Inter';g.textAlign='center';g.fillText(blur?'HIS ANSWER, NOT YOURS':'✓  KEEP IT: it works for YOU',0,14);g.restore();}
  g.fillStyle='#6d6788';g.font='700 18px Inter';g.textAlign='left';g.fillText('sample result',W-170,H-22);
}
export function drawCalendar(g,W,H,fill,blinded,seed=3){
  g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.fillStyle='#8e88a8';g.font='800 26px Inter';g.fillText('YOUR 21 DAYS',40,62);
  let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<21;i++){const x=40+(i%7)*80,y=90+Math.floor(i/7)*80;const on=r()<.5;
    g.fillStyle=i<fill?(on?'#FF5A36':'#B7A6FF'):'#221f30';g.beginPath();g.roundRect(x,y,66,66,14);g.fill();
    g.fillStyle=i<fill?'#15131C':'#4a4560';g.font='900 22px Inter';g.textAlign='center';g.fillText(String(i+1),x+33,y+42);g.textAlign='left';}
  if(blinded){g.fillStyle='#FF5A36';g.beginPath();g.roundRect(W-230,26,190,48,14);g.fill();g.fillStyle='#15131C';g.font='900 24px Inter';g.fillText('RANDOM',W-190,58);}
}
export function drawReaction(g,W,H,state,ms){ // state 0 dark, 1 orange
  g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.fillStyle='#8e88a8';g.font='800 26px Inter';g.fillText('MORNING TEST · 60s',40,62);
  g.fillStyle=state?'#FF5A36':'#2a2638';g.beginPath();g.arc(W/2,H/2+20,120,0,7);g.fill();
  if(state){g.strokeStyle='rgba(255,90,54,.35)';g.lineWidth=22;g.beginPath();g.arc(W/2,H/2+20,150,0,7);g.stroke();}
  g.fillStyle=state?'#15131C':'#6d6788';g.font='900 44px Inter';g.textAlign='center';g.fillText(state?'TAP!':'wait…',W/2,H/2+36);
  if(ms){g.fillStyle='#fff';g.font='900 60px Inter';g.fillText(ms+' ms',W/2,H-40);}
  g.textAlign='left';
}
export function drawChart(g,W,H,prog,title='YOUR REACTION TIME'){
  g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.fillStyle='#8e88a8';g.font='800 26px Inter';g.fillText(title,40,62);
  const pts=[300,296,301,290,288,292,284,286,279,281,276,279,271,274,268];
  const x0=50,x1=W-50,y0=110,y1=H-50;g.strokeStyle='#262236';g.lineWidth=2;for(let k=0;k<4;k++){const y=y0+(y1-y0)*k/3;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();}
  const n=Math.max(1,Math.floor(pts.length*prog));g.strokeStyle='#FF5A36';g.lineWidth=8;g.lineJoin='round';g.beginPath();
  for(let i=0;i<n;i++){const x=x0+(x1-x0)*i/(pts.length-1),y=y0+(y1-y0)*(pts[i]-262)/(305-262);i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
  const i=n-1,x=x0+(x1-x0)*i/(pts.length-1),y=y0+(y1-y0)*(pts[i]-262)/(305-262);g.fillStyle='#fff';g.beginPath();g.arc(x,y,12,0,7);g.fill();
  g.fillStyle='#fff';g.font='900 30px Inter';g.fillText(pts[i]+'ms',Math.min(x+16,W-130),y-14);
}
export function drawBanner(g,W,H,big,small,bg='#FF5A36',fg='#15131C'){
  g.fillStyle=bg;g.beginPath();g.roundRect(4,4,W-8,H-8,30);g.fill();
  g.fillStyle=fg;g.textAlign='center';let fs=Math.round(H*.36);g.font='900 '+fs+'px Inter';while(fs>10&&g.measureText(big).width>W-60){fs-=2;g.font='900 '+fs+'px Inter';}g.fillText(big,W/2,H*.56);
  if(small){g.font='800 '+Math.round(H*.15)+'px Inter';g.fillText(small,W/2,H*.83);}g.textAlign='left';
}
export function wrapText(g,txt,x,y,maxW,lh){const words=txt.split(' ');let line='';for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);y+=lh;line=w;}else line=t;}if(line)g.fillText(line,x,y);return y+lh;}
export function drawEntry(g,W,H,e,btn){
  g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(4,4,W-8,H-8,40);g.fill();
  g.fillStyle='#6d6788';g.font='800 30px Inter';g.fillText('PLACEBO LIBRARY',40,66);
  g.fillStyle='#15131C';g.font='900 '+(e.name.length>14?58:76)+'px Inter';g.fillText(e.name,40,145);
  g.fillStyle='#4a4560';g.font='700 34px Inter';let y=wrapText(g,e.tag,40,200,W-80,42);
  g.fillStyle=e.evColor;g.beginPath();g.roundRect(40,y,400,60,16);g.fill();g.fillStyle='#15131C';g.font='900 32px Inter';g.fillText('EVIDENCE: '+e.evidence,62,y+42);
  y+=110;g.fillStyle='#6d6788';g.font='800 28px Inter';g.fillText('WHAT THE RESEARCH SAYS',40,y);y+=54;
  g.fillStyle='#15131C';g.font='900 42px Inter';y=wrapText(g,e.research,40,y,W-80,52);
  y+=8;let x=40;g.font='800 28px Inter';for(const c of e.chips){const w=g.measureText(c).width+40;g.fillStyle='#B7A6FF';g.beginPath();g.roundRect(x,y,w,50,14);g.fill();g.fillStyle='#15131C';g.fillText(c,x+20,y+35);x+=w+14;}
  if(btn){g.fillStyle=btn>1?'#15131C':'#FF5A36';g.beginPath();g.roundRect(40,H-130,W-80,90,24);g.fill();g.fillStyle=btn>1?'#F7F4EE':'#15131C';g.font='900 40px Inter';g.textAlign='center';g.fillText(btn>1?'TEST STARTED':'TEST THIS ON ME',W/2,H-72);g.textAlign='left';}
}
export function drawMini(g,W,H,name,col){g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(4,4,W-8,H-8,26);g.fill();g.fillStyle=col;g.beginPath();g.roundRect(4,4,W-8,60,[26,26,0,0]);g.fill();
  g.fillStyle='#15131C';g.font='900 34px Inter';g.textAlign='center';wrapText(g,name,W/2,140,W-30,40);g.textAlign='left';}
export function drawClaim(g,W,H,txt){g.fillStyle='#15131C';g.beginPath();g.roundRect(4,4,W-8,H-8,30);g.fill();g.strokeStyle='#ff2d6f';g.lineWidth=8;g.stroke();
  g.fillStyle='#ff2d6f';g.font='900 32px Inter';g.fillText('TIKTOK SAID',36,60);g.fillStyle='#fff';g.font='900 56px Inter';wrapText(g,txt,36,130,W-72,64);}
