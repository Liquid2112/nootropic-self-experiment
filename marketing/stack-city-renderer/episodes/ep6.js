import {slideCard,camKeys,drawBanner,drawCalendar,drawEntry,drawMini} from './common.js';
export const display=`A thousand nootropic TikToks. ZERO receipts. What if one app had them ALL? What it is. What studies ACTUALLY tested. REAL sources, not anecdotes. Then don't just read it. TEST it. Blind, on you. Read it. Test it. KNOW it. Comment a nootropic, and I'll look it up.`;
const E={name:'L-Theanine',tag:'The calm-focus amino acid from tea leaves.',evidence:'MODERATE',evColor:'#FFC23A',research:'May ease stress in people under stress. Trials are small.',chips:['PubMed','Systematic review']};
let B,noise,minis,entry,cal,stamps,conf,logo;
function drawComment(g,W,H,txt){g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(4,4,W-8,H-8,24);g.fill();g.fillStyle='#FF5A36';g.beginPath();g.arc(48,H/2,24,0,7);g.fill();g.fillStyle='#15131C';g.font='800 30px Inter';g.fillText(txt,86,H/2+11);}
export function build(S){
  B=S.makeChar('brian');
  const tx=['trust me bro','10x focus!!','my gym coach says','limitless pill fr','ate it, got smarter','link in my bio 😉'.replace(' 😉',''),'stack of the century','doctors hate this'];
  noise=tx.map((x,i)=>{const c=S.card(2.1,.48,260,drawComment);c.redraw(x);c.i=i;c.r=[S.rnd(),S.rnd(),S.rnd()];return c;});
  const names=[['Caffeine','#FF5A36'],['L-Theanine','#58d46e'],['Creatine','#5c7cff'],['Rhodiola','#B7A6FF'],["Lion's Mane",'#FFC23A'],['Bacopa','#ff6fa8']];
  minis=names.map(([n,c],i)=>{const m=S.card(.85,1.15,280,drawMini);m.redraw(n,c);m.i=i;return m;});
  entry=S.card(1.8,2.5,360,drawEntry);cal=S.card(2,1.4,320,drawCalendar);
  stamps=['READ ✓','TESTED ✓','KNOWN ✓'].map((s,i)=>{const c=S.card(1.6,.5,280,drawBanner);c.redraw(s,'',['#F7F4EE','#B7A6FF','#FF5A36'][i]);return c;});
  conf=S.confetti(70);logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','the nootropic library + blind tests');
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(6),b2=T(13),b3=T(24),b4=T(34),b5=T(40),end=duration(S);
  S.pill(t>=b5?'':t<b1?'WHAT <b>IF?</b>':t<b2?'THE <b>FIX</b>':t<b3?"WHAT'S <b>INSIDE</b>":t<b4?'THE <b>NEXT STEP</b>':'THE <b>WIN</b>');
  B.talking=S.speaking(t);B.update(t);B.pose('rest',t);
  B.brows.forEach((b,i)=>{b.rotation.z=(t<b1?(i?.25:-.25):0);});
  // noise rain then blast away
  noise.forEach(c=>{const t0=.1+c.i*.22;c.visible=t>t0&&t<b1+.6;if(!c.visible)return;const f=ease((t-t0)/.35);const bl=ease((t-b1)/.5);
    const ang=c.r[0]*6.28;c.position.set(lerp((c.r[1]-.5)*2.4,(c.r[1]-.5)*2.4+Math.cos(ang)*7,bl),lerp(4.5,-.2+c.i*.42,f)+Math.sin(ang)*6*bl,1.2+c.i*.06);
    c.rotation.z=(c.r[2]-.5)*.6+bl*3;c.scale.setScalar(1-.3*bl);});
  if(t>b1-.1&&t<b1+.6)B.pose('flex',Math.sin(ease((t-b1+.1)/.6)*Math.PI));
  // minis fan
  minis.forEach(m=>{m.visible=t>b1&&t<b2+.5;if(!m.visible)return;const p=back((t-b1-.2-m.i*.08)/.4);const a=(m.i-2.5)*.32;const out=ease((t-b2)/.4);
    m.position.set(Math.sin(a)*2.1*p,1.0+Math.cos(a)*1.4*p-.6+(m.i===1?out*.5:-out*3),1.6+(m.i===1?out*.6:0));m.rotation.z=-a*.6*(1-out);m.scale.setScalar(Math.max(.01,p)*(m.i===1?1+out*.3:1-out));});
  // entry card
  const btn=t>T(28)?(t>T(29)?2:1):(t>b3?1:0);entry.redraw(E,btn);
  slideCard(S,entry,t,b2+.2,T(31),[.5,1.15,2.6],1.0);entry.rotation.y=entry.visible?entry.rotation.y*.5:0;
  B.g.position.x=-1.55*ease((t-b2)/.5)*(1-ease((t-b4)/.5));
  if(t>T(28)&&t<T(31))B.pose('tap',Math.sin(Math.min(1,(t-T(28))/.25)*Math.PI));
  cal.redraw(Math.floor(21*ease((t-T(31))/1)),true);slideCard(S,cal,t,T(31),b4,[.3,1.3,2.6],1.15);
  // stamps
  stamps.forEach((s,i)=>{const t0=[T(34),T(36),T(38)][i];s.visible=t>t0&&t<b5+.2;if(!s.visible)return;const p=S.clamp((t-t0)/.22);s.position.set(0,2.45-i*.62,1.8);s.scale.setScalar(lerp(2,.95,p*p));s.rotation.z=(i-1)*.06;});
  S.burst(conf,t,T(38)+.1,[0,1.5,1.5]);
  if(t>b4&&t<b5)B.pose('flex',ease((t-T(38))/.3));
  logo.visible=t>b5;if(logo.visible){logo.position.set(0,1.75,1.6);logo.scale.setScalar(Math.max(.01,back((t-b5)/.5)*.95));}
  if(t>b5)B.pose('thumbs',ease((t-b5)/.35));
  S.cta('Comment a nootropic',t>T(41)?back((t-T(41))/.4):0);
  camKeys(S,t,[
    [0,0,1,7,0,.8],[.12,0,1,8,0,.8],[b1-.05,0,1,10,0,.8],
    [b1,0,1,11,0,.8],[b2-.01,0,1,11.5,0,.8],
    [b2,-.2,1,12.8,0,.5],[b4-.01,0,1,12.4,0,.5],
    [b4,0,1,11.5,0,.8],[b5-.01,0,1,11,0,.8],
    [b5,0,.8,10,0,.4],[end,0,.8,8.5,0,.6]]);
}
