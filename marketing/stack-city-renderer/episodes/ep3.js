import {slideCard,camKeys,drawBanner} from './common.js';
export const display=`Your brain LIES to you. But scientists have a trick. Expect to feel sharp, and you will. That's the placebo effect. So they HIDE which day is real. It's called a blind test. Now Placebo runs that trick on YOUR routine. We named the app after the effect, so you can BEAT it. Placebo. Link in bio.`;
let B,mini,parts,bubble,mugs,phone,logo,conf,desk;
function drawBubble(g,W,H,a){g.globalAlpha=a;g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(4,4,W-8,H-60,50);g.fill();
  g.beginPath();g.arc(W*.25,H-40,22,0,7);g.fill();g.beginPath();g.arc(W*.18,H-14,12,0,7);g.fill();
  g.fillStyle='#15131C';g.font='900 52px Inter';g.textAlign='center';g.fillText('I feel SHARP ✦',W/2,(H-60)/2+18);g.textAlign='left';g.globalAlpha=1;}
function drawPhone(g,W,H,day){g.fillStyle='#0d0c12';g.beginPath();g.roundRect(4,4,W-8,H-8,44);g.fill();g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(22,22,W-44,H-44,32);g.fill();
  g.textAlign='center';g.fillStyle='#6d6788';g.font='800 26px Inter';g.fillText('TODAY',W/2,100);g.fillStyle='#15131C';g.font='900 64px Inter';g.fillText('Day '+day,W/2,180);
  g.fillStyle='#15131C';g.beginPath();g.roundRect(50,220,W-100,70,20);g.fill();g.fillStyle='#F7F4EE';g.font='900 30px Inter';g.fillText('RANDOMIZED',W/2,266);
  g.fillStyle='#FF5A36';g.beginPath();g.arc(W/2,H-150,70,0,7);g.fill();g.fillStyle='#15131C';g.font='900 26px Inter';g.fillText('TEST',W/2,H-140);g.textAlign='left';}
export function build(S){
  B=S.makeChar('brian');
  parts=B.head.children.map(c=>({c,x:c.position.x}));
  mini=S.box(.45,.35,.4,S.M(0xffb3c7,{emissive:0x772244}),0,.65,0,B.g);mini.visible=false;
  bubble=S.card(2.2,1.0,300,drawBubble);
  desk=S.box(4.2,.25,1.6,S.M(0x2a2350),0,-2.05,1.1);desk.visible=false;
  mugs=[0,1].map(()=>{const g=new S.THREE.Group();g.add(new S.THREE.Mesh(new S.THREE.CylinderGeometry(.35,.3,.7,10),S.M(0xF7F4EE)));
    const h=new S.THREE.Mesh(new S.THREE.TorusGeometry(.17,.06,6,10),S.M(0xF7F4EE));h.position.x=.4;g.add(h);S.scene.add(g);return g;});
  phone=S.card(1.1,1.9,300,drawPhone);logo=S.card(2.4,.8,300,drawBanner);logo.redraw('Placebo','named after the effect');conf=S.confetti(70);
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(10),b2=T(21),b3=T(33),b4=T(41),b5=T(53),end=duration(S);
  S.pill(t>=b5?'':t<b1?'WHAT <b>IF?</b>':t<b2?'THE <b>PROBLEM</b>':t<b3?'THE <b>TRICK</b>':t<b4?'NOW <b>YOU CAN</b>':'THE <b>WIN</b>');
  B.talking=S.speaking(t);B.update(t);B.pose('rest',t);
  // head opens on "lies" through b1
  const op=ease((t-T(2))/.35)*(1-ease((t-b1+.4)/.35));
  parts.forEach(p=>{p.c.position.x=p.x+Math.sign(p.x||.0001)*op*.45;});
  mini.visible=op>.05;mini.position.y=.65+op*.2;mini.rotation.z=Math.sin(t*12)*.3*op;mini.scale.setScalar(Math.max(.01,op));
  // bubble
  const ba=t>T(12)&&t<b2?Math.min(1,(t-T(12))/.3)*(t>T(19)?Math.max(0,1-(t-T(19))/.6):1):0;
  bubble.visible=ba>0;bubble.redraw(ba);bubble.position.set(.9,2.1,1.2);bubble.scale.setScalar(.9+(1-ba)*.1);
  B.brows.forEach((b,i)=>{b.rotation.z=(t>T(2)&&t<b1?(i?-.25:.25):0);});
  // mugs shuffle
  desk.visible=t>b2-.2&&t<b3;mugs.forEach((m,i)=>{m.visible=desk.visible;const k=Math.max(0,t-T(23));const sw=Math.floor(k/.45),f=ease((k%.45)/.45);
    const cnt=Math.min(sw,4);const side=((i+cnt)%2)*2-1;const prev=cnt<4?-side:side;const x=cnt>=4?side*.9:lerp(prev*.9,side*.9,f);
    m.position.set(x,-1.5+(cnt<4&&k>0?Math.sin(f*Math.PI)*.4*(i?1:-1)*.5:0),1.4+(cnt<4&&k>0?Math.sin(f*Math.PI)*(i?.5:-.5):0));});
  if(t>b2&&t<b3)B.pose('point',ease((t-b2)/.3)*.6);
  // phone
  phone.redraw(9);slideCard(S,phone,t,b3,b4,[.6,1.0,2.4],1.15);
  B.g.position.x=-1.3*ease((t-b3)/.5)*(1-ease((t-b4)/.5));
  // logo slam
  logo.visible=t>b4;if(logo.visible){const p=S.clamp((t-T(44))/.3);logo.position.set(0,lerp(5,1.9,p*p),1.6);logo.scale.setScalar(.9);}
  S.burst(conf,t,T(44)+.3,[0,1.9,1.6]);
  if(t>T(51)&&t<b5)B.pose('flex',ease((t-T(51))/.3));
  if(t>b5)B.pose('thumbs',ease((t-b5)/.35));
  S.cta('Link in bio',t>T(54)?back((t-T(54))/.4):0);
  camKeys(S,t,[
    [0,0,.9,5,0,.8],[.12,0,.9,5.6,0,.8],[b1-.05,0,.9,7.5,0,.6],
    [b1,0,1.2,10,0,.9],[b2-.01,0,1.2,10.5,0,.9],
    [b2,0,.4,11,0,-.6],[b3-.01,0,.4,10,0,-.8],
    [b3,0,1,12.5,0,.3],[b4-.01,0,1,12,0,.3],
    [b4,0,.9,11,0,.5],[end,0,.8,8.8,0,.6]]);
}
