import {camKeys,drawBanner} from './common.js';
export const display=`Coffee versus tea. SETTLED. In 21 _ days. Not by the internet. By YOU. Blind days, a morning test, and a real verdict. Whatever wins, it's YOUR winner. Comment COFFEE or TEA, and I'll run it next.`;
let B,BN,TE,ring,comments,score,win,conf,poll;
function drawComment(g,W,H,txt){g.fillStyle='#F7F4EE';g.beginPath();g.roundRect(4,4,W-8,H-8,24);g.fill();g.fillStyle='#B7A6FF';g.beginPath();g.arc(48,H/2,24,0,7);g.fill();
  g.fillStyle='#15131C';g.font='800 30px Inter';g.fillText(txt,86,H/2+11);}
function drawScore(g,W,H,a,b){g.fillStyle='#14121c';g.beginPath();g.roundRect(4,4,W-8,H-8,36);g.fill();g.strokeStyle='#2c2840';g.lineWidth=5;g.stroke();
  g.textAlign='center';g.fillStyle='#8e88a8';g.font='800 26px Inter';g.fillText('COFFEE',W*.27,60);g.fillText('TEA',W*.73,60);
  g.fillStyle='#FF5A36';g.font='900 72px Inter';g.fillText(a,W*.27,150);g.fillStyle='#58d46e';g.fillText(b,W*.73,150);
  g.fillStyle='#6d6788';g.font='800 22px Inter';g.fillText('test days logged',W/2,H-24);g.textAlign='left';g.fillStyle='#2c2840';g.fillRect(W/2-2,40,4,130);}
function drawPoll(g,W,H){g.fillStyle='#FF5A36';g.beginPath();g.roundRect(4,4,W/2-8,H-8,26);g.fill();g.fillStyle='#58d46e';g.beginPath();g.roundRect(W/2+4,4,W/2-8,H-8,26);g.fill();
  g.fillStyle='#15131C';g.font='900 56px Inter';g.textAlign='center';g.fillText('COFFEE',W*.25,H*.62);g.fillText('TEA',W*.75,H*.62);g.textAlign='left';}
export function build(S){
  B=S.makeChar('brian');BN=S.makeChar('benny');TE=S.makeChar('tea');
  ring=new S.THREE.Group();S.scene.add(ring);S.box(7,.3,4,S.M(0x2a2350),0,-2.05,0,ring);
  [[-3.3,-1.8],[3.3,-1.8],[-3.3,1.8],[3.3,1.8]].forEach(([x,z],i)=>S.box(.25,2.2,.25,S.M(i%2?S.LIL:S.TANG),x,-.9,z,ring));
  [-.6,-.1].forEach(y=>{S.box(6.6,.06,.06,S.M(0xffffff,{emissive:0x333333}),0,y,1.8,ring);S.box(6.6,.06,.06,S.M(0xffffff),0,y,-1.8,ring);});
  const txt=['coffee > tea!!','tea wins, obviously','trust me bro','my uncle says...'];
  comments=txt.map((x,i)=>{const c=S.card(2.2,.5,260,drawComment);c.redraw(x);c.seed=i;return c;});
  score=S.card(2,.9,320,drawScore);win=S.card(2.2,.75,300,drawBanner);win.redraw('YOUR WINNER','decided by your data');
  conf=S.confetti(70);poll=S.card(2.4,.8,300,drawPoll);poll.redraw();
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(8),b2=T(14),b3=T(23),b4=T(28),end=duration(S);
  S.pill(t>=b4?'':t<b1?'WHAT <b>IF?</b>':t<b2?'ROUND <b>1</b>':t<b3?'ROUND <b>2</b>':'THE <b>WIN</b>');
  const sp=S.speaking(t);B.talking=sp;B.update(t);BN.update(t);TE.update(t);
  BN.g.position.set(-2.1,0,-.2);TE.g.position.set(2.1,0,-.2);BN.g.rotation.y=.9;TE.g.rotation.y=-.9;BN.g.scale.setScalar(.85);TE.g.scale.setScalar(.85);
  BN.g.position.y=Math.abs(Math.sin(t*5))*.12;TE.g.position.y=Math.abs(Math.sin(t*5+1))*.12;
  BN.pose('rest',t);TE.pose('rest',t);BN.armL.rotation.x=BN.armR.rotation.x=-1.2-.3*Math.abs(Math.sin(t*6));TE.armL.rotation.x=TE.armR.rotation.x=-1.2-.3*Math.abs(Math.sin(t*6+1));
  B.g.position.set(0,0,-1.2);B.pose('rest',t);
  if(t>T(3)&&t<b1)B.pose('point',ease((t-T(3))/.25));
  // comments rain + crumble
  comments.forEach((c,i)=>{const t0=b1+i*.25;c.visible=t>t0&&t<b2;if(!c.visible)return;const fall=Math.max(0,t-T(12));
    c.position.set((i%2?1:-1)*(.5+i*.15),lerp(4,2.6-i*.5,ease((t-t0)/.4))-fall*fall*6,1.8+i*.1);c.rotation.z=(i%2?1:-1)*(.08+fall*2);});
  // score
  const k=ease((t-b2-.3)/2.5);score.redraw(Math.round(lerp(0,11,k)),Math.round(lerp(0,10,k)));
  score.visible=t>b2&&t<b3+.2;if(score.visible){score.position.set(0,2.2,1);score.scale.setScalar(Math.max(.01,back((t-b2)/.4)*1.1));}
  // win
  win.visible=t>b3&&t<b4+.2;if(win.visible){win.position.set(0,2.1,1.2);win.scale.setScalar(Math.max(.01,back((t-b3)/.4)*.85));}
  S.burst(conf,t,b3+.1,[0,1.5,1]);
  if(t>b3&&t<b4){B.pose('raiseL',ease((t-b3)/.3));}
  poll.visible=t>b4;if(poll.visible){poll.position.set(0,2.0,1.2);poll.scale.setScalar(Math.max(.01,back((t-b4)/.4)*.85));}
  if(t>b4)B.pose('thumbs',ease((t-b4)/.35));
  S.cta('Comment COFFEE or TEA',t>T(29)?back((t-T(29))/.4):0);
  camKeys(S,t,[
    [0,0,1.5,11,0,.4],[.12,0,1.3,12,0,.3],[b1-.05,0,1.6,14.5,0,.2],
    [b1,0,1.8,15,0,.9],[b2-.01,0,1.8,14.5,0,.9],
    [b2,0,1.2,14,0,.5],[b3-.01,0,1.2,13.5,0,.5],
    [b3,0,1,12.5,0,.4],[b4-.01,0,1,12.5,0,.4],
    [b4,0,1,13,0,.5],[end,0,1,12,0,.6]]);
}
