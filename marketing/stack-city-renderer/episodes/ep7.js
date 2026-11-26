import {slideCard,camKeys,drawBanner,drawCalendar,drawEntry,drawClaim} from './common.js';
export const display=`TikTok said it. Let's CHECK it. "Lion's mane gives you a PHOTOGRAPHIC memory?" The Library says: a handful of SMALL human studies. Interesting, not proven. "Coffee plus L-theanine _ is the PERFECT combo?" Some studies found a focus bump. YOUR brain might not. So read the sources, then find out for YOU. What should I check next? Comment it.`;
const LM={name:"Lion's Mane",tag:'The nerve-growth-factor mushroom.',evidence:'LIMITED',evColor:'#ff8fa8',research:'Interesting animal data. Human trials are few and small.',chips:['Mori 2009','Docherty 2023']};
const LT={name:'L-Theanine + Caffeine',tag:'The classic beginner stack.',evidence:'MODERATE',evColor:'#FFC23A',research:'Some trials: better attention-switching vs placebo.',chips:['PubMed','RCTs']};
let B,BN,TE,screen,c1,c2,e1,e2,cal,podium,logo,conf;
export function build(S){
  B=S.makeChar('brian');BN=S.makeChar('benny');TE=S.makeChar('tea');
  podium=S.box(1.8,1.4,.9,S.M(0x2a2350,{emissive:0x120a30}),0,-1.6,.9);S.box(1.82,.18,.92,S.M(S.TANG),0,-1.0,.9);
  screen=S.card(2.4,.8,300,drawBanner);screen.redraw('TIKTOK SAID','vs the Placebo Library','#ff2d6f','#fff');
  c1=S.card(2,1.0,320,drawClaim);c1.redraw("Lion's mane = photographic memory?");
  c2=S.card(2,1.0,320,drawClaim);c2.redraw('Coffee + L-theanine = the perfect combo?');
  e1=S.card(1.8,2.3,360,drawEntry);e1.redraw(LM,0);e2=S.card(1.8,2.3,360,drawEntry);e2.redraw(LT,0);
  cal=S.card(2,1.4,320,drawCalendar);conf=S.confetti(60);
  logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','read it. then test it.');
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(6),b2=T(13),b3=T(25),b4=T(33),b5=T(43),b6=T(52),end=duration(S);
  S.pill(t>=b6?'':t<b1?'WHAT <b>IF?</b>':t<b2?'ROUND <b>1</b>':t<b3?'THE <b>LIBRARY</b>':t<b4?'ROUND <b>2</b>':t<b5?'THE <b>LIBRARY</b>':'THE <b>WIN</b>');
  B.talking=S.speaking(t);B.update(t);BN.update(t);TE.update(t);B.pose('rest',t);BN.pose('rest',t);TE.pose('rest',t);
  B.g.position.set(0,0,-.3);
  screen.visible=t<b1+.3;screen.position.set(0,2.2,1);screen.scale.setScalar(Math.max(.01,back(t/.4)*.9));
  if(t<b1)B.pose('point',ease((t-T(3))/.3));
  // benny gasp round 1
  BN.g.visible=t>b1&&t<b5;BN.g.position.set(lerp(-6,-2.3,back((t-b1)/.4)),0,.3);BN.g.rotation.y=.5;BN.g.scale.setScalar(.85);
  BN.mouth.scale.y=t>T(11)&&t<b2?4:BN.mouth.scale.y;
  TE.g.visible=t>b3&&t<b5;TE.g.position.set(lerp(6,2.3,back((t-b3)/.4)),0,.3);TE.g.rotation.y=-.5;TE.g.scale.setScalar(.85);
  if(t>T(31)&&t<b4){BN.pose('raiseL',0);BN.armR.rotation.z=2.6*ease((t-T(31))/.25);TE.pose('raiseL',ease((t-T(31))/.25));}
  const slam=(c,t0,t1)=>{c.visible=t>t0&&t<t1;if(!c.visible)return;const p=S.clamp((t-t0)/.2);c.position.set(0,2.0,1.6);c.scale.setScalar(lerp(1.8,1,p*p));c.rotation.z=-.04;};
  slam(c1,b1,b2);slam(c2,b3+.35,b4);
  slideCard(S,e1,t,b2,b3,[.45,1.05,2.6],1.0);slideCard(S,e2,t,b4,b5,[.45,1.05,2.6],1.0);
  const lib=(t>b2&&t<b3)||(t>b4&&t<b5);B.g.position.x=lib?-1.4:0;
  // win: calendar
  cal.redraw(Math.floor(21*ease((t-b5-.3)/1.2)),true);slideCard(S,cal,t,b5,b6,[0,1.6,2.4],1.15);
  if(t>b5&&t<b6)B.pose('point',ease((t-b5)/.3));
  S.burst(conf,t,T(51),[0,1.5,1.5]);
  logo.visible=t>b6;if(logo.visible){logo.position.set(0,1.75,1.6);logo.scale.setScalar(Math.max(.01,back((t-b6)/.5)*.95));}
  if(t>b6)B.pose('thumbs',ease((t-b6)/.35));
  S.cta('Comment what to check next',t>T(57)?back((t-T(57))/.4):0);
  camKeys(S,t,[
    [0,0,1,9,0,.6],[.12,0,1,10,0,.6],[b1-.05,0,1,11,0,.6],
    [b1,0,1,12,0,.6],[b2-.01,0,1,12.5,0,.6],
    [b2,-.2,1,12.5,0,.5],[b3-.01,-.2,1,12.2,0,.5],
    [b3,0,1,12,0,.6],[b4-.01,0,1,12.5,0,.6],
    [b4,-.2,1,12.5,0,.5],[b5-.01,-.2,1,12.2,0,.5],
    [b5,0,1.2,13,0,.6],[b6-.01,0,1.2,12.5,0,.6],
    [b6,0,.8,10,0,.4],[end,0,.8,8.5,0,.6]]);
}
