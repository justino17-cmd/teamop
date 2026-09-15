/* Profil CPU reel (CDP Profiler) du rendu d'un ecran : quelles fonctions coutent quoi.
   Usage : node profil.js <base.json> <vue> [ralenti] */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop', BASE=process.argv[2], VUE=process.argv[3]||'rapports', RAL=+(process.argv[4]||4);
const srv=http.createServer((q,r)=>{const x=path.join(R,q.url.split('?')[0]);
  fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)));}).listen(8190,'127.0.0.1');
(async()=>{
  let base=JSON.parse(fs.readFileSync(BASE,'utf8')); if(base&&!Array.isArray(base.produits)&&base.db) base=base.db;
  const json=JSON.stringify(base);
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const p=await nav.newPage({viewport:{width:390,height:844}});
  await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/* n */'}));
  await p.addInitScript(j=>{try{localStorage.setItem('elanB_gestion_v2',j);localStorage.setItem('elanB_vierge_v1','1');localStorage.setItem('elanB_sync_on','0');}catch(e){}},json);
  const cdp=await p.context().newCDPSession(p);
  if(RAL>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:RAL});
  await p.goto('http://127.0.0.1:8190/beta.html',{timeout:120000,waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof rendreVueSure==='function',{timeout:60000});
  await p.evaluate(()=>{ enterApp((db.users||[]).filter(x=>x&&x.actif!==false)[0]); });
  await p.waitForTimeout(1000);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval',{interval:50});
  await cdp.send('Profiler.start');
  await p.evaluate(v=>{ for(let i=0;i<8;i++){ current=v; rendreVueSure(v); } }, VUE);
  const {profile}=await cdp.send('Profiler.stop');
  /* temps propre par fonction */
  const byId={}; profile.nodes.forEach(n=>byId[n.id]=n);
  const self={};
  const dt=profile.timeDeltas||[], sm=profile.samples||[];
  for(let i=0;i<sm.length;i++){ const n=byId[sm[i]]; if(!n) continue;
    const f=n.callFrame, cle=(f.functionName||'(anonyme)')+'  ['+(f.url||'').split('/').pop()+':'+(f.lineNumber+1)+']';
    self[cle]=(self[cle]||0)+Math.max(0,dt[i]||0); }
  const tot=Object.values(self).reduce((a,b)=>a+b,0);
  console.log('\n  == profil CPU de rendreVueSure("'+VUE+'") x8, processeur ralenti x'+RAL+' ==');
  console.log('  total echantillonne : '+Math.round(tot/1000)+' ms\n');
  Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,18)
    .forEach(([k,v])=>console.log('  '+String(Math.round(v/1000)+' ms').padStart(8)+'  '+String(Math.round(v*100/tot)+'%').padStart(5)+'  '+k));
  await nav.close(); srv.close();
})();
