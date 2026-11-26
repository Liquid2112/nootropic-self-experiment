import {slideCard,camKeys,drawReaction,drawChart,drawBanner} from './common.js';
export const display=`Your brain has a LAP TIME. Tap when it goes ORANGE. That's it. Do it every morning, and you get a CHART of your own brain. Coffee-you _ versus no-coffee-you _ _. Finally on paper. Beat your own RECORD. Then find out WHY. Free in Placebo. What's your time?`;
let B,BN,TE,lights,lap,rx,ch,score,pb,conf,logo;
function drawScore(g,W,H,p){g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.textAlign='center';g.fillStyle='#8e88a8';g.font='800 24px Inter';g.fillText('COFFEE-YOU',W*.27,60);g.fillText('NO-COFFEE-YOU',W*.73,60);
  g.fillStyle='#FF5A36';g.font='900 72px Inter';g.fillText(Math.round(300-29*p)+'',W*.27,150);g.fillStyle='#B7A6FF';g.fillText(Math.round(300-11*p)+'',W*.73,150);
  g.fillStyle='#6d6788';g.font='800 22px Inter';g.fillText('ms · sample',W/2,H-24);g.textAlign='left';g.fillStyle='#2c2840';g.fillRect(W/2-2,40,4,130);}
export function build(S){
  B=S.makeChar('brian');BN=S.makeChar('benny');TE=S.makeChar('tea');
  lights=[0,1,2].map(i=>S.box(.32,.32,.2,new S.THREE.MeshBasicMaterial({color:0x332a44,fog:false}),-.6+i*.6,1.85,.3));
  lap=S.card(2,.7,300,drawBanner);rx=S.card(2,1.7,320,drawReaction);ch=S.card(2,1.4,320,drawChart);
  score=S.card(2,.9,320,drawScore);pb=S.card(2.1,.75,300,drawBanner);pb.redraw('NEW PB · 262ms','personal best');
  conf=S.confetti(70);logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','free reaction test');
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(6),b2=T(13),b3=T(26),b4=T(35),b5=T(43),end=duration(S);
  S.pill(t>=b5?'':t<b1?'WHAT <b>IF?</b>':t<b2?'THE <b>TEST</b>':t<b3?'THE <b>TWIST</b>':t<b4?'THE <b>FUN PART</b>':'THE <b>WIN</b>');
  B.talking=S.speaking(t);B.update(t);BN.update(t);TE.update(t);B.pose('rest',t);
  // race lights
  lights.forEach((l,i)=>{l.visible=t<b1+.2;const on=t>.25+i*.35;l.material.color.setHex(t>T(4)?0xFF5A36:on?0xff2244:0x332a44);
    l.position.x=B.g.position.x-.6+i*.6;});
  lap.visible=t>T(4)&&t<b1+.3;if(lap.visible){lap.redraw('287 ms','your lap time');const p=back((t-T(4))/.35);lap.position.set(0,1.85,1.4);lap.scale.setScalar(Math.max(.01,p*.9));}
  // reaction
  rx.redraw(t>T(9)?1:0,t>T(11)?287:0);slideCard(S,rx,t,b1,b2,[.1,1.15,2.6],1.15);
  if(t>T(9)&&t<b2)B.pose('tap',Math.sin(Math.min(1,(t-T(9))/.2)*Math.PI));
  ch.redraw(ease((t-b2-.3)/(b3-b2-.8)));slideCard(S,ch,t,b2,b3,[.1,1.3,2.6],1.25);
  B.g.position.x=-1.7*ease((t-b1)/.5)*(1-ease((t-b3)/.5));
  B.g.position.z=-2.2*ease((t-b3)/.4)*(1-ease((t-b4)/.4));
  // benny & tea
  const inF=back((t-b3)/.45),outF=ease((t-b4)/.35);
  BN.g.visible=TE.g.visible=t>b3&&t<b4+.4;
  BN.g.position.set(lerp(-6,-1.9,inF)+lerp(0,-6,outF),0,.6);TE.g.position.set(lerp(6,1.9,inF)+lerp(0,6,outF),0,.6);
  BN.g.rotation.y=.35;TE.g.rotation.y=-.35;BN.g.scale.setScalar(.85);TE.g.scale.setScalar(.85);
  BN.pose('flex',ease((t-T(27))/.3));TE.pose('raiseL',ease((t-T(29))/.3));
  score.redraw(ease((t-b3-.4)/1.5));score.visible=t>b3&&t<b4+.2;if(score.visible){score.position.set(0,2.35,1);score.scale.setScalar(Math.max(.01,back((t-b3-.2)/.4)*1.05));}
  // win
  pb.visible=t>b4&&t<b5+.2;if(pb.visible){pb.position.set(0,1.8,1.6);pb.scale.setScalar(Math.max(.01,back((t-b4)/.4)*.78));}
  S.burst(conf,t,b4+.1,[0,1,1.5]);if(t>b4&&t<b5)B.pose('flex',ease((t-b4)/.3));
  logo.visible=t>b5;if(logo.visible){logo.position.set(0,1.75,1.6);logo.scale.setScalar(Math.max(.01,back((t-b5)/.5)*.95));}
  if(t>b5)B.pose('thumbs',ease((t-b5)/.35));
  S.cta('Drop your ms below',t>T(46)?back((t-T(46))/.4):0);
  camKeys(S,t,[
    [0,0,.9,5,0,.9],[.12,0,.9,5.6,0,.9],[b1-.05,0,.6,8.5,0,.2],
    [b1,-.2,1,14,0,.25],[b3-.01,-.1,1,13.2,0,.25],
    [b3,0,.9,13,0,.5],[b4-.01,0,.9,12,0,.5],
    [b4,0,.6,10.5,0,.2],[b5-.01,0,.6,10,0,.2],
    [b5,0,.8,10,0,.4],[end,0,.8,8.2,0,.6]]);
}
