import {camKeys,drawBanner,drawVerdict} from './common.js';
export const display=`What if EVERYONE in town started taking nootropics? Day one: everybody grabs the SAME stack. But brains aren't the same. It CLICKS for some… and does NOTHING for others. Half the town is guessing. Spending. Lost. One player isn't guessing. He TESTED his. Find out what works for YOU. Placebo.`;
let B,K,BN,TE,SH,npcs,all,blimp,crates,jarsH,aura,pole,qm,storm,coinsA,ver,crown,logo,conf;
export function build(S){
  const {THREE}=S;
  B=S.makeChar('brian');K=S.makeChar('brick');BN=S.makeChar('benny');TE=S.makeChar('tea');SH=S.makeChar('shroom');
  npcs=[[0x2f6fd6,0x1a1a1a],[0xd6a12f,0x5a3010],[0xc23b6a,0x111111]].map(([c,h])=>S.makeChar('npc',{color:c,hair:h}));
  all=[B,K,BN,TE,SH,...npcs];
  const spots=[[0,0],[-3.6,-2],[3.6,-1.6],[-1.8,-4.5],[2,-5],[-5.5,-6],[5.3,-6.5],[0,-8.5]];
  all.forEach((c,i)=>{c.home=spots[i];c.g.scale.multiplyScalar(.8);});
  blimp=new THREE.Group();S.scene.add(blimp);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),S.M(S.TANG));body.scale.set(3.2,1.1,1.1);blimp.add(body);
  const band=new THREE.Mesh(new THREE.SphereGeometry(1.01,12,8),S.M(S.LIL));band.scale.set(1.2,1.12,1.12);blimp.add(band);
  S.box(1.2,.4,.6,S.M(S.INK),0,-1.2,0,blimp);
  crates=spots.map(([x,z])=>{const c=S.box(.7,.5,.7,S.M(0x3b2a6a,{emissive:0x5c3aff,emissiveIntensity:.6}),x+.9,-1.95,z+.6);return c;});
  jarsH=S.jars(8);aura=new THREE.Mesh(new THREE.SphereGeometry(1.6,12,10),new THREE.MeshBasicMaterial({color:S.TANG,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}));S.scene.add(aura);
  pole=S.box(.18,4,.18,S.M(0x555577),-1.6+.9,-.2,-3.5+.5);S.box(.8,.25,.3,S.M(0xffd27a,{emissive:0xffd27a}),-1.6+.9,1.8,-3.5+.5);
  qm=S.card(.8,.8,256,drawBanner);qm.redraw('?','', '#B7A6FF');
  storm=new THREE.Mesh(new THREE.CylinderGeometry(1,1,10,32,1,true),new THREE.MeshBasicMaterial({color:0x8a3cff,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false,fog:false}));S.scene.add(storm);
  coinsA=[0,1,2].map(()=>S.coins(10));
  ver=S.card(2,1.375,320,drawVerdict);ver.redraw(1,false);
  crown=S.card(2.4,.7,300,drawBanner);logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','stop guessing. test it.');conf=S.confetti(60);
}
export const duration=S=>S.words[S.words.length-1].t1+1.8;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(8),b2=T(15),b3=T(24),b4=T(29),b5=T(36),b6=T(43),end=duration(S);
  S.pill(t>=b6+.6?'':t<b1?'WHAT <b>IF?</b>':t<b2?'THE <b>DROP</b>':t<b4?'THE <b>TWIST</b>':t<b5?'THE <b>STORM</b>':'THE <b>WIN</b>');
  B.talking=S.speaking(t)&&t>b5;
  blimp.position.set(lerp(-14,14,t/(b1+2)),8,-6);blimp.visible=t<b1+2;
  all.forEach((c,i)=>{c.update(t);c.pose('rest',t+i);
    const td=i*.2;const f=S.clamp((t-td)/1.1);const land=t>td+1.1;
    let [x,z]=c.home;let y=land?0:lerp(8,0,f*f);
    if(land&&t<td+1.4)y=-.25*Math.sin((t-td-1.1)/.3*Math.PI);
    if(t>b1&&t<b5){const p=ease((t-b1-.2-i*.05)/.8);x+=.9*p*.6;z+=.6*p*.6;}
    c.g.position.set(x,y,z);c.g.rotation.y=Math.sin(i)*.4;
    if(!land){c.armL.rotation.z=-2.6;c.armR.rotation.z=2.6;}
    const jh=jarsH[i];jh.visible=t>b1+.8;jh.position.set(x+.9*.8,y+.1,z+.35);jh.scale.setScalar(.55);
    if(t>b1+.8&&t<b2)c.pose('thumbs',ease((t-b1-.8)/.3));
  });
  crates.forEach((c,i)=>{c.visible=t>b1-.3&&t<b1+1.2;c.rotation.y=t;});
  // Brick clicks
  aura.visible=t>b2&&t<b5;aura.position.copy(K.g.position);aura.position.y+=.2;aura.scale.setScalar(1+.08*Math.sin(t*10));
  if(t>b2&&t<b4){const p=ease((t-T(20))/1.2);K.g.position.x=lerp(K.g.position.x,K.g.position.x+2.5,p);K.pose('flex',ease((t-T(20))/.3));}
  // Benny bonks, Shroom lost
  if(t>b3&&t<b5){const p=ease((t-b3)/.5);BN.g.rotation.z=t>T(26)?-.25:0;BN.g.position.x+=.4*p;BN.pose('rest',0);BN.armL.rotation.z=-1.5*(t>T(27)?1:0);BN.armR.rotation.z=1.5*(t>T(27)?1:0);
    SH.g.position.x+=lerp(0,4,ease((t-T(26))/2.5));SH.g.rotation.y=-1.2;}
  qm.visible=t>T(26)&&t<b5;qm.position.set(SH.g.position.x,SH.g.position.y+2.3,SH.g.position.z);qm.scale.setScalar(Math.max(.01,back((t-T(26))/.3)));
  // storm
  storm.visible=t>b4-.3;storm.material.opacity=.35*(1-S.clamp((t-b5)/.5));const r=lerp(16,6.5,ease((t-b4)/3));storm.scale.set(r,1,r);storm.position.set(0,2,-2.5);storm.rotation.y=t*.3;
  [BN,TE,npcs[0]].forEach((c,i)=>S.burst(coinsA[i],t,T(34)+i*.12,[c.g.position.x,c.g.position.y+.2,c.g.position.z]));
  // win: Brian walks forward with verdict
  if(t>b5){const p=ease((t-b5)/1.2);B.g.position.set(0,0,lerp(0,1.2,p));all.forEach(c=>{if(c!==B)c.look=lerp(0,Math.atan2(-c.g.position.x,2),ease((t-T(38))/.4));});}
  ver.visible=t>b5+.2&&t<b6+.2;if(ver.visible){ver.position.set(.8,1.4,B.g.position.z+.6);ver.scale.setScalar(Math.max(.01,back((t-b5-.2)/.4)*.85));ver.rotation.y=-.15;}
  if(t>b5&&t<b6)B.pose('point',.4);
  crown.visible=t>b6;if(crown.visible){crown.redraw(t<T(46)?'LAST ONE GUESSING':'FIRST ONE KNOWING','',t<T(46)?'#B7A6FF':'#FF5A36');const fl=Math.abs(Math.cos(S.clamp((t-T(46)+.15)/.3)*Math.PI));crown.position.set(0,2.35,2.6);crown.scale.set(.8*(t>T(46)-.15&&t<T(46)+.15?fl:1),.8,1);}
  logo.visible=t>T(49);if(logo.visible){logo.position.set(0,1.6,2.6);logo.scale.setScalar(Math.max(.01,back((t-T(49))/.4)*.75));}
  S.burst(conf,t,T(46),[0,2,3]);if(t>b6)B.pose('thumbs',ease((t-b6)/.35));
  S.cta("Comment what you'd drop with",t>T(49)?back((t-T(49))/.4):0);
  camKeys(S,t,[
    [0,0,4,22,0,3],[b1-.6,0,3,22,0,1],
    [b1,0,14,18,0,-3],[b2-.01,0,13,17,0,-3],
    [b2,2,2,14,1,.5],[b3-.01,3,2,13,1.5,.5],
    [b3,0,2.5,15,0,0],[b4-.01,0,2.5,15.5,0,0],
    [b4,0,8,24,0,-1],[b5-.01,0,7,22,0,-1],
    [b5,0,1.6,15,0,.8],[b6-.01,0,1.6,14,0,.8],
    [b6,0,1.5,14,0,1.1],[end,0,1.5,13,0,1.2]]);
}
