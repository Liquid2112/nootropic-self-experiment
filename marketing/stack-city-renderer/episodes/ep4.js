import {slideCard,camKeys,drawVerdict,drawCalendar,drawBanner} from './common.js';
export const display=`"My pre-workout _ makes me a GENIUS." Cool. PROVE it. Three weeks. Blind days. 60 seconds a morning. And his answer was right there. HIS answer. He kept one. Cut one. Saved $40 _ a month. Tag the friend who needs RECEIPTS.`;
let B,K,tub,tub2,phone,cal,ver,save,coinsA,sweat,logo;
function drawPhone(g,W,H){g.fillStyle='#0d0c12';g.beginPath();g.roundRect(4,4,W-8,H-8,44);g.fill();g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(22,22,W-44,H-44,32);g.fill();
  g.fillStyle='#15131C';g.font='900 40px Inter';g.textAlign='center';g.fillText('Placebo',W/2,110);g.font='700 24px Inter';g.fillStyle='#6d6788';g.fillText('21-day blind test',W/2,150);
  g.fillStyle='#FF5A36';g.beginPath();g.roundRect(50,H-150,W-100,80,22);g.fill();g.fillStyle='#15131C';g.font='900 32px Inter';g.fillText('START',W/2,H-98);g.textAlign='left';}
export function build(S){
  B=S.makeChar('brian');K=S.makeChar('brick');
  const mk=(c)=>{const g=new S.THREE.Group();const b=new S.THREE.Mesh(new S.THREE.CylinderGeometry(.45,.45,1,8),S.M(c,{emissive:c,emissiveIntensity:.35}));g.add(b);
    const lid=new S.THREE.Mesh(new S.THREE.CylinderGeometry(.48,.48,.2,8),S.M(S.INK));lid.position.y=.6;g.add(lid);S.scene.add(g);return g;};
  tub=mk(0x9b5cff);tub2=mk(0x2fbf71);
  phone=S.card(.9,1.5,320,drawPhone);phone.redraw();
  cal=S.card(2,1.4,320,drawCalendar);ver=S.card(2,1.375,320,drawVerdict);
  save=S.card(2,.75,300,drawBanner);save.redraw('+$40 / month','kept one, cut one');
  coinsA=S.coins(22);logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','show your receipts');
  sweat=[0,1,2,3].map(i=>S.box(.1,.18,.1,new S.THREE.MeshBasicMaterial({color:0x7fd6ff,fog:false}),0,0,0));
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(7),b2=T(10),b3=T(18),b4=T(26),b5=T(36),end=duration(S);
  S.pill(t>=b5?'':t<b1?'WHAT <b>IF?</b>':t<b2?'THE <b>DARE</b>':t<b3?'<b>21</b> DAYS':t<b4?'THE <b>RESULT</b>':'THE <b>WIN</b>');
  const sp=S.speaking(t);K.talking=sp&&t<b1;B.talking=sp&&t>=b1;K.update(t);B.update(t);
  K.pose('rest',t);B.pose('rest',t);
  // Brick placement
  const kx=t<b1?0:lerp(0,1.5,ease((t-b1)/.5));K.g.position.set(kx,-.25,0);K.g.rotation.y=t<b1?0:-.35*ease((t-b1)/.5);
  if(t<b1)K.pose('flex',ease((t-.15)/.3));
  tub.visible=t<b4+T(29)-T(26)+.3;tub.position.set(kx-1.3,-1.2,1.3);tub.rotation.y=t;
  const pc=1-ease((t-T(29))/.25);tub.scale.setScalar(Math.max(.001,t>b4?pc:1));
  tub2.visible=t>b4;tub2.position.set(kx-2.3,-1.2,1.3);tub2.scale.setScalar(Math.max(.01,back((t-b4)/.4)));
  S.burst(coinsA,t,T(29),[kx-1.3,-1.1,1.4]);
  // Brian slides in
  B.g.visible=t>b1;B.g.position.set(lerp(-6,-1.5,back((t-b1)/.5)),0,0);B.g.rotation.y=.3;
  if(t>b1&&t<b2)B.pose('point',ease((t-b1-.2)/.3));
  phone.visible=t>T(8)&&t<b2+.3;if(phone.visible){const p=ease((t-T(8))/.6);phone.position.set(lerp(-1,.6,p),-1.1,1.8);phone.rotation.x=-1.1;phone.scale.setScalar(1.1);}
  // calendar + sweat
  cal.redraw(Math.floor(21*ease((t-b2-.2)/1.8)),true);slideCard(S,cal,t,b2,b3,[0,1.6,2.4],1.15);
  sweat.forEach((s,i)=>{const d=((t-b2)*1.4+i*.25)%1;s.visible=t>b2&&t<b3;s.position.set(K.g.position.x+.55+(i%2)*.1,1.1-d*.9,.8);});
  ver.redraw(t>T(24)?back((t-T(24))/.4):0,true);slideCard(S,ver,t,b3,b4,[0,1.6,2.4],1.15);
  save.visible=t>T(31)&&t<b5+.2;if(save.visible){save.position.set(0,1.9,1.6);save.scale.setScalar(Math.max(.01,back((t-T(31))/.4)*.95));}
  if(t>b4&&t<b5){B.pose('raiseL',ease((t-b4)/.3));K.armR.rotation.z=2.8*ease((t-b4)/.3);}
  logo.visible=t>b5;if(logo.visible){logo.position.set(0,1.75,1.6);logo.scale.setScalar(Math.max(.01,back((t-b5)/.5)*.95));}
  if(t>b5)B.pose('thumbs',ease((t-b5)/.35));
  S.cta('Tag them 👇'.replace(' 👇',''),t>T(37)?back((t-T(37))/.4):0);
  camKeys(S,t,[
    [0,0,1.2,5.5,0,1],[.12,0,1,6.5,0,.8],[b1-.05,0,.6,9,0,0],
    [b1,0,.8,12,0,0],[b2-.01,0,.8,12.5,0,0],
    [b2,0,1.2,14,0,.5],[b4-.01,0,1.2,13.5,0,.5],
    [b4,0,.8,12,0,.2],[b5-.01,0,.8,11.5,0,.2],
    [b5,0,.8,10.5,0,.4],[end,0,.8,9,0,.6]]);
}
