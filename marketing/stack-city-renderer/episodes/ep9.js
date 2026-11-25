import {camKeys,drawBanner,drawVerdict} from './common.js';
export const display=`In this town, EVERYONE takes nootropics. The teacher. My grandma. Even the MAYOR'S GOLDFISH. But nobody knows what's REAL… and what's PLACEBO. So the town held a contest. Find the REAL one. Teacher: WRONG. Grandma: WRONG. Goldfish: VERY WRONG. Brian? First try. Because he KNEW what actually worked for him. Stop guessing. TEST it. Placebo.`;
let B,TC,GM,fish,fishG,bowl,board,chair,mugs,cap,table,qs,xs,ver,logo,conf,stage,mugT,jarsW;
function drawBoard(g,W,H){g.fillStyle='#1f3a2c';g.fillRect(0,0,W,H);g.strokeStyle='#8a5a32';g.lineWidth=18;g.strokeRect(0,0,W,H);g.fillStyle='#e8f0e8';g.font='900 58px Inter';g.fillText('E = mc² + L-theanine',40,110);g.font='800 40px Inter';g.fillText('pop quiz: is it placebo?',40,190);}
export function build(S){
  const {THREE}=S;
  B=S.makeChar('brian');TC=S.makeChar('teacher');GM=S.makeChar('grandma');
  // goldfish in bowl with sash
  fishG=new THREE.Group();S.scene.add(fishG);
  bowl=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0x9fd8ff,transparent:true,opacity:.28,roughness:.1}));fishG.add(bowl);
  const water=new THREE.Mesh(new THREE.SphereGeometry(.96,16,12,0,Math.PI*2,Math.PI*.35,Math.PI*.65),new THREE.MeshBasicMaterial({color:0x3aa0ff,transparent:true,opacity:.25}));fishG.add(water);
  fish=new THREE.Group();fishG.add(fish);
  S.box(.7,.45,.3,S.M(0xff8a1f),0,0,0,fish);const tail=S.box(.3,.4,.06,S.M(0xffb35c),-.45,0,0,fish);tail.rotation.z=.6;
  S.box(.12,.12,.04,S.M(0xffffff),.22,.08,.16,fish);S.box(.06,.06,.03,S.M(0x111111),.24,.08,.185,fish);
  const sash=S.box(.08,.55,.32,S.M(S.LIL),0,0,0,fish);sash.rotation.z=.7;
  S.box(.9,1.1,.9,S.M(0x2a2350),0,-1.55,0,fishG);
  board=S.card(3.2,1.6,240,drawBoard);board.redraw();
  chair=new THREE.Group();S.scene.add(chair);S.box(1.6,.2,1.2,S.M(0x8a5a32),0,-1.4,0,chair);S.box(1.6,1.6,.2,S.M(0x8a5a32),0,-.5,-.6,chair);
  const rock=new THREE.Mesh(new THREE.TorusGeometry(1.2,.07,6,24,Math.PI*.6),S.M(0x6b4226));rock.rotation.set(0,Math.PI/2,Math.PI*1.2);rock.position.y=-1.1;chair.add(rock);
  table=S.box(4.4,.25,1.6,S.M(0x2a2350),0,-1.0,1.6);stage=S.box(9,.4,5,S.M(0x1d1840,{emissive:0x120a30}),0,-2.1,0);
  mugs=[0,1,2].map(()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CylinderGeometry(.42,.36,.8,10),S.M(0xF7F4EE)));const h=new THREE.Mesh(new THREE.TorusGeometry(.18,.06,6,10),S.M(0xF7F4EE));h.position.x=.47;g.add(h);g.scale.setScalar(.72);S.scene.add(g);return g;});
  cap=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.25,4,8),S.M(S.TANG,{emissive:S.TANG,emissiveIntensity:.8}));cap.rotation.z=Math.PI/2;S.scene.add(cap);
  qs=[0,1,2,3].map(()=>{const c=S.card(.7,.7,256,drawBanner);c.redraw('?','','#B7A6FF');return c;});
  xs=[0,1,2].map(()=>{const c=S.card(.9,.9,256,drawBanner);c.redraw('✕','','#ff2d6f','#fff');return c;});
  ver=S.card(2,1.375,320,drawVerdict);ver.redraw(1,false);
  logo=S.card(2.2,.7,300,drawBanner);logo.redraw('Placebo','stop guessing. test it.');conf=S.confetti(70);
  jarsW=S.jars(6);
}
export const duration=S=>S.words[S.words.length-1].t1+1.6;
// mug slot positions on the table
const SX=[-1.05,0,1.05];
export function update(t,S){
  const {T,lerp,ease,back}=S;
  const b1=T(6),b2=T(8),b3=T(10),b4=T(14),b5=T(22),b6=T(32),b7=T(39),b8=T(50),end=duration(S);
  S.pill(t>=b8+.4?'':t<b4?'IN THIS <b>TOWN</b>':t<b5?'THE <b>CATCH</b>':t<b7?'THE <b>SHOWDOWN</b>':'THE <b>WIN</b>');
  const sp=S.speaking(t);
  [B,TC,GM].forEach(c=>{c.update(t);c.pose('rest',t);});B.talking=sp&&t>b7;
  // vignettes live at x offsets; stage at x=0
  const onStage=t>=b4||t<b1;
  jarsW.forEach((j,i)=>{j.visible=t<b1;j.position.set(-5+i*2,-1.3+Math.abs(Math.sin(t*3+i))*.2,-2+((i%2)*1.5));});
  TC.g.position.set(onStage?-2.6:-20,0,onStage?.2:0);TC.g.rotation.y=onStage?.4:0;
  board.visible=!onStage;board.position.set(-20.5,1.1,-1.3);
  if(t>b1&&t<b2)TC.pose('thumbs',ease((t-b1-.2)/.3));
  GM.g.position.set(onStage?2.6:20,onStage?0:-.1,onStage?.2:0);GM.g.rotation.y=onStage?-.4:0;GM.g.rotation.x=onStage?0:Math.sin(t*3)*.08;
  chair.visible=!onStage;chair.position.set(20,0,-.2);chair.rotation.x=Math.sin(t*3)*.08;
  if(t>b2&&t<b3){GM.pose('flex',.5+.5*Math.abs(Math.sin(t*5)));}
  fishG.position.set(onStage?0:40,onStage?.2:0,onStage?-1.2:0);fishG.scale.setScalar(onStage?.7:1);
  fish.position.set(Math.sin(t*1.7)*.3,Math.sin(t*2.3)*.1,Math.cos(t*1.7)*.2);fish.rotation.y=Math.cos(t*1.7)>0?0:Math.PI;
  // question marks
  const heads=[TC.g,GM.g,fishG,B.g];
  qs.forEach((q,i)=>{q.visible=t>T(17)+i*.12&&t<b5;if(!q.visible)return;const h=heads[i];q.position.set(h.position.x,(i===2?1.4:2.4),h.position.z+.4);q.scale.setScalar(Math.max(.01,back((t-T(17)-i*.12)/.3)));});
  B.g.position.set(onStage?(t<b1?-.9:0):-40,0,onStage?(t>=b5?-.9:.2):0);
  if(t<b1){fishG.position.set(1.1,.3,-1);B.pose('thumbs',ease((t-.3)/.3));}
  if(onStage&&t>=b4&&t<b5){fishG.position.set(1.5,.2,1.4);fishG.scale.setScalar(.5);}
  if(t>=b5){TC.g.position.set(-1.9,0,-.5);TC.g.rotation.y=.5;GM.g.position.set(1.9,0,-.5);GM.g.rotation.y=-.5;fishG.position.set(2.05,-.35,1.7);fishG.scale.setScalar(.42);}
  [B,TC,GM].forEach(c=>c.g.scale.setScalar(onStage?.85:1));
  // stage props
  table.visible=stage.visible=onStage&&t>=b5-.2;stage.visible=onStage;
  // shuffle: swaps between T(28) and b6
  const swaps=[[0,1],[1,2],[0,2],[0,1],[1,2],[0,2],[0,1]];const ss=T(27),dur=Math.max(.2,(b6-ss)/swaps.length);
  let slot=[0,1,2];let mp=[0,1,2].map(i=>({x:SX[i],z:1.6}));
  for(let k=0;k<swaps.length;k++){const st=ss+k*dur;const [a,b]=swaps[k];
    if(t>=st+dur){const ia=slot.indexOf(a),ib=slot.indexOf(b);slot[ia]=b;slot[ib]=a;}
    else if(t>=st){const f=ease((t-st)/dur);const ia=slot.indexOf(a),ib=slot.indexOf(b);
      mp[ia]={x:lerp(SX[a],SX[b],f),z:1.6+Math.sin(f*Math.PI)*.5};mp[ib]={x:lerp(SX[b],SX[a],f),z:1.6-Math.sin(f*Math.PI)*.5};break;}}
  const settled=k=>({x:SX[slot[k]],z:1.6});
  mugs.forEach((m,k)=>{m.visible=table.visible;let p=(t>=ss&&t<b6)?mp[k]:settled(k);if(t<ss)p={x:SX[k],z:1.6};if(mp[k].x!==SX[k]||t<ss){}
m.position.set(p.x,-.47,p.z);m.rotation.z=0;});
  // capsule under mug 1 (initial slot 1)
  const capMug=mugs[1];cap.visible=table.visible&&(t<T(26)||t>b7);
  // show capsule at start then cover
  const capLift=t>T(24)&&t<T(26)+.5?1:0;
  // reveal picks: teacher picks slot 0, grandma slot 2, goldfish slot 0? use mugs not holding capsule
  const finalSlotOf=k=>slot[k];
  const wrongMugs=mugs.filter((m,k)=>k!==1);
  const lift=(m,t0)=>{const f=Math.sin(S.clamp((t-t0)/.9)*Math.PI);m.position.y+=f*1.1;m.rotation.z=f*.3;};
  if(capLift)capMug.position.y+=.9*Math.sin(S.clamp((t-T(24))/2.3)*Math.PI);
  lift(wrongMugs[0],T(33));lift(wrongMugs[1],T(35));lift(wrongMugs[0],T(37));
  xs.forEach((x,i)=>{const t0=[T(33),T(35),T(37)][i];x.visible=t>t0+.2&&t<t0+1.4;const who=[TC.g,GM.g,fishG][i];x.position.set(who.position.x*.55,2.5,who.position.z+.8);x.scale.setScalar(Math.max(.01,back((t-t0-.2)/.25)));});
  if(t>T(37)&&t<T(38)+.5){fish.position.y+=Math.sin(S.clamp((t-T(37))/1)*Math.PI)*1.6;}
  if(t>b7){const f=ease((t-T(41))/.4);capMug.position.y+=1.2*f;cap.visible=true;}
  cap.position.set(capMug.position.x,-.8+(t>b7?ease((t-T(41))/.4)*.4:0),capMug.position.z);
  if(t>b7&&t<b8)B.pose('raiseL',ease((t-T(41))/.3));
  S.burst(conf,t,T(41)+.1,[0,.5,1.6]);
  ver.visible=t>T(44)&&t<b8+.2;if(ver.visible){ver.position.set(0,2.2,1.5);ver.scale.setScalar(Math.max(.01,back((t-T(44))/.4)*.85));}
  logo.visible=t>b8;if(logo.visible){logo.position.set(0,2.1,1.8);logo.scale.setScalar(Math.max(.01,back((t-b8)/.4)*.8));}
  if(t>b8)B.pose('thumbs',ease((t-b8)/.35));
  S.cta('Who in your town needs this?',t>T(52)?back((t-T(52))/.4):0);
  // camera cuts
  const K=[[0,0,2,17,0,1],[b1-.01,0,1.6,14,0,.9],
    [b1,-20,1.2,10,-20,.9],[b2-.01,-20,1.2,9.5,-20,.9],
    [b2,20,1,10,20,.6],[b3-.01,20,1,9.5,20,.6],
    [b3,40,.6,6,40,.1],[b4-.01,40,.6,5.5,40,.1],
    [b4,0,2,18,0,.8],[b5-.01,0,2,17,0,.8],
    [b5,0,3,16,0,0],[b6-.01,0,2.8,14.5,0,-.2],
    [b6,0,2.2,16,0,.3],[b7-.01,0,2.2,15.5,0,.3],
    [b7,0,1.6,13,0,.5],[b8-.01,0,1.6,13.5,0,.8],
    [b8,0,1.4,14,0,1],[end,0,1.4,13,0,1.1]];
  camKeys(S,t,K,true);
}
