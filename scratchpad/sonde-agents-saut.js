// La page Agents de la Tour remonte-t-elle en haut quand une relecture (Pauline, horaires, agents) la redessine ? On se met tout en bas, on relit, on mesure scrollY.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const RAC = process.argv[2], PAGE = process.argv[3] || 'tour.html';
const { MOCK } = require(path.join(RAC, 'scratchpad', 'sonde-tour-theme.js'));
const EXTRA = String.raw`(function(){ var N=Date.now(), n=0; var prev=window.fetch;
  var AGS=['victor','camille','hugo','margaux','lea','max','nina','theo','jules','chloe','emma','louis','sarah','lola','noah','ines'].map(function(id,i){ return {id:id,nom:id[0].toUpperCase()+id.slice(1),role:'Rôle de '+id,vague:1+(i%3),plafondUsd:5,mode:'arret',couche:i<8?'Direction et clients':'Croissance',cerveau:true}; });
  window.fetch=function(u,o){ var s=String(u); if(s.indexOf('https://api.teamop.fr/api/monitor/')!==0) return prev(u,o);
    var p=s.slice('https://api.teamop.fr'.length).split('?')[0], d=null;
    if(p==='/api/monitor/agents') d={agents:AGS,cleOk:true,enAttente:0,pause:null};
    else if(p==='/api/monitor/agents/validations') d={validations:[]};
    else if(p==='/api/monitor/agents/journal') d={journal:[]};
    else if(p==='/api/monitor/agents/taches') d={taches:[]};
    else if(p==='/api/monitor/pauline'){ n++; var ents=[]; for(var i=0;i<40;i++) ents.push({id:'e'+i,nom:'Entreprise '+i,majLe:N-3600000}); d={ok:true,recuLe:N+n*60000,releve:{jour:{envoyes:0,reponses:0,refus:0,enAttente:0},chauffe:{jour:0,plafond:0},recherches:[{id:'r1',texte:'nettoyage'}],entreprises:ents,courriels:[],reponses:[]}}; }
    if(!d) return prev(u,o);
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}})); },30); }); };
})();`;
const srv = http.createServer((q, r) => { const x = path.join(RAC, decodeURIComponent(q.url.split('?')[0].split('#')[0])); fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : x.endsWith('.png') ? 'image/png' : x.endsWith('.jpg') ? 'image/jpeg' : x.endsWith('.svg') ? 'image/svg+xml' : 'text/html;charset=utf-8' }), r.end(d))); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(); const out = {};
  for (const [nom, opts] of [['mac', { viewport: { width: 1440, height: 900 } }], ['iphone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }]]) {
    const c = await b.newContext(opts); if (process.env.PERTURBE) await c.addInitScript('window.PERTURBE=true'); await c.addInitScript(MOCK); await c.addInitScript(EXTRA);
    await c.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.toString()), r => r.abort());
    const p = await c.newPage(); const err = []; p.on('pageerror', e => err.push(String(e).slice(0, 150)));
    await p.goto('http://127.0.0.1:' + srv.address().port + '/' + PAGE);
    await p.waitForFunction(() => typeof setTab === 'function' && document.getElementById('app') && document.getElementById('app').classList.contains('on'), null, { timeout: 60000 });
    await p.evaluate(() => { setTab('agents', true); }); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__rendus = 0; const o = window.vueAgents; window.vueAgents = function () { window.__rendus++; return o.apply(this, arguments); };
      if (window.PERTURBE) new MutationObserver(() => window.scrollTo(0, 0)).observe(document.getElementById('vue'), { childList: true }); });
    const r = [];
    for (const [quoi, js] of [['chargerPauline (même relevé, heure neuve)', 'chargerPauline()'], ['chargerPauline encore', 'chargerPauline()'], ['chargerHoraires', 'chargerHoraires()'], ['chargerAgents', 'chargerAgents()'], ['render', 'render()'], ['setTab agents (doit partir du haut)', "setTab('agents',true)"]]) {
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
      const avant = await p.evaluate(() => [Math.round(scrollY), document.documentElement.scrollHeight]);
      await p.evaluate(js); await p.waitForTimeout(1500);
      const apres = await p.evaluate(() => [Math.round(scrollY), document.documentElement.scrollHeight]);
      r.push(quoi + ' : scrollY ' + avant[0] + ' → ' + apres[0] + ' (hauteur ' + avant[1] + ' → ' + apres[1] + ', rendus ' + await p.evaluate(() => { const n = window.__rendus; window.__rendus = 0; return n; }) + ')');
    }
    out[nom] = { r, err, pauline: await p.evaluate(() => !!document.querySelector('[data-ext="pauline"]')) };
    await c.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
