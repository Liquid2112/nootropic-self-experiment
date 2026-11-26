const {chromium}=require('playwright');const fs=require('fs');
const [,,ep,out,fps='30',only]=process.argv;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
p.on('console',m=>{if(!/GL Driver/.test(m.text()))console.log('PAGE',m.text())});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/engine.html?ep='+ep);await p.waitForFunction('window.READY===true',{timeout:30000});await p.evaluate(()=>document.fonts.ready);
const dur=await p.evaluate(()=>window.DURATION);fs.mkdirSync(out,{recursive:true});
const ts=only?only.split(',').map(Number):[...Array(Math.round(dur*fps)).keys()].map(i=>i/fps);
for(let i=0;i<ts.length;i++){await p.evaluate(t=>window.renderAt(t),ts[i]);await p.screenshot({path:`${out}/f${String(i).padStart(5,'0')}.png`});}
console.log('dur',dur,'frames',ts.length);await b.close();})();
