const {chromium}=require('playwright');const fs=require('fs');
const [,,url,out,dur,fps,only]=process.argv;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
p.on('console',m=>console.log('PAGE',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(url);await p.waitForFunction('window.READY===true',{timeout:20000});await p.evaluate(()=>document.fonts.ready);
fs.mkdirSync(out,{recursive:true});
const ts=only?only.split(',').map(Number):[...Array(Math.round(dur*fps)).keys()].map(i=>i/fps);
for(let i=0;i<ts.length;i++){await p.evaluate(t=>window.renderAt(t),ts[i]);await p.screenshot({path:`${out}/f${String(i).padStart(5,'0')}.png`});}
await b.close();})();
