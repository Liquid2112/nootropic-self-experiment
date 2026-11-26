import {slideCard,camKeys,drawVerdict,drawCalendar,drawReaction,drawBanner} from './common.js';
export const display=`You spend $90 _ a month on THIS. What if it had to PROVE it works? Placebo mixes your days. ON, or OFF. You don't know which. Every morning, a 60-second _ brain game. 21 _ days later… the verdict. Keep what works. Cut what doesn't. Either way, you WIN. Comment STACK for the free test.`;
let B,J,cal,rx,ver,coinsA,desk,logo;
export function build(S){
  B=S.makeChar('brian');J=S.jars(5);coinsA=S.coins(22);
  desk=S.box(4.2,.25,1.6,S.M(0x2a2350),0,-2.05,1.1);
  cal=S.card(2,1.4,320,drawCalendar);rx=S.card(2,1.7,320,drawReaction);ver=S.card(2,1.375,320,drawVerdict);
  logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','test your stack');
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(8),b2=T(16),b3=T(27),b4=T(34),b5=T(40),b6=T(50),end=duration(S);
  S.pill(t>=b6?'':t<b2?'WHAT <b>IF?</b>':t<b3?'STEP 1 · <b>SHUFFLE</b>':t<b4?'STEP 2 · <b>60 SECONDS</b>':t<b5?'<b>21</b> DAYS LATER':t<b6?'THE <b>WIN</b>':'<b>FREE</b> TEST');
  B.talking=S.speaking(t);B.update(t);
  // jars
  J.forEach((j,i)=>{const p=back((t-.15-i*.08)/.35);let y=lerp(6,-1.5,p);let s=1;
    if(i%2===1||i===4){if(i!==0&&i!==2){s=1-ease((t-T(43))/.25);} }
    if(i===0||i===2){if(t>T(40)){j.mat.emissive.setHex(0x331a00);y+=Math.abs(Math.sin((t-T(40))*6))*.25*(t<T(43)+1?1:0);} }
    j.position.set(-1.35+i*.68,y,1.35);j.rotation.z=(1-p)*.6;j.scale.setScalar(Math.max(.001,s));});
  S.burst(coinsA,t,T(43),[.3,-1.3,1.6]);
  // brian placement and poses
  B.g.position.x=-1.7*ease((t-b2)/.5)*(1-ease((t-b5)/.5));
  B.pose('rest',t);
  const pt=ease((t-b1-.1)/.35)*(1-ease((t-b2+.2)/.3));if(pt>0)B.pose('point',pt);
  B.brows.forEach((b,i)=>{b.position.y=.36+(t>1.6&&t<b1+.3?.08:0);b.rotation.z=(t>b1&&t<b2?(i?-.2:.2):0);});
  // calendar
  const fill=Math.floor(21*ease((t-b2-.3)/1.6));cal.redraw(fill,t>T(23));slideCard(S,cal,t,b2,b3,[.1,1.3,2.6],1.25);
  // reaction
  const flash=t>T(32)?1:0;const ms=t>T(33)?287:0;rx.redraw(flash,ms);slideCard(S,rx,t,b3,b4,[.1,1.15,2.6],1.15);
  if(t>T(32)&&t<b4){B.pose('tap',Math.sin(Math.min(1,(t-T(32))/.2)*Math.PI));}
  // verdict
  ver.redraw(t>T(39)?back((t-T(39))/.4):0,false);slideCard(S,ver,t,b4,b5,[.1,1.3,2.6],1.3);
  // cta
  logo.visible=t>b6;if(logo.visible){const p=back((t-b6)/.5);logo.position.set(0,1.75,1.6);logo.scale.setScalar(Math.max(.01,p*.95));}
  if(t>b6)B.pose('thumbs',ease((t-b6)/.35));
  S.cta('Comment "STACK" 👇'.replace(' 👇',''),t>T(51)?back((t-T(51))/.4):0);
  camKeys(S,t,[
    [0,0,.7,4.6,0,.6],[.12,0,.7,5.4,0,.6],[b1-.05,0,.3,8.5,0,-.4],
    [b1,.2,.6,11,0,-.5],[b2-.01,-.2,.6,12,0,-.5],
    [b2,-.2,1,14,0,.25],[b5-.01,-.1,1,13.2,0,.25],
    [b5,0,.4,12.5,0,-.7],[b6-.01,0,.4,11.5,0,-.6],
    [b6,0,.8,10,0,.4],[end,0,.8,8.2,0,.6]]);
}
