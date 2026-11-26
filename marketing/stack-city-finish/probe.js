const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out={};const log=m=>console.error(m);
for(const ep of process.argv.slice(2)){const p=await b.newPage({viewport:{width:540,height:960}});
p.on('pageerror',e=>log(ep+' ERR '+e.message));p.on('console',m=>{if(/MISMATCH/.test(m.text()))log(ep+' '+m.text())});await p.goto('http://localhost:8765/engine.html?ep='+ep);await p.waitForFunction('window.READY===true',{timeout:90000});
out[ep]=await p.evaluate(()=>{const r=[];const d=window.DURATION;for(let i=0;i<Math.round(d*30);i++){const t=i/30;window.renderAt(t);const c=document.getElementById('cta');r.push([t,document.getElementById('pill').innerHTML,c.textContent,parseFloat(getComputedStyle(c).getPropertyValue('--s')||0)]);}return {d,r};});
await p.close();}
const res={};for(const [ep,{d,r}] of Object.entries(out)){const pills=[];let last=null;for(const [t,h] of r){if(h!==last){if(last)pills[pills.length-1].e=t;if(h)pills.push({s:t,h});last=h;}}if(last&&pills.length&&pills[pills.length-1].e===undefined)pills[pills.length-1].e=d;
const c=r.find(x=>x[3]>0.01);res[ep]={dur:d,pills,cta:c?{t:c[0],text:c[2]}:null};}
require('fs').writeFileSync('probe.json',JSON.stringify(res,null,1));await b.close();})();
