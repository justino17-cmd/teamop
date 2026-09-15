/* L'ÉCRAN DE CONNEXION D'app.html SUR UN APPAREIL NEUF — ce qu'il montre VRAIMENT.
   Justin, 15 septembre 2026, capture à l'appui : « c'est quoi cette page, je trouve ça pas
   bien ». On est allé regarder au lieu de supposer, et la mesure a donné :
     avant : champEntreprise true · avertissementOrphelin FALSE · ditLaisseVide TRUE
     après : champEntreprise true · avertissementOrphelin TRUE  · ditLaisseVide FALSE
   L'avertissement « cet appareil n'est rattaché à aucune entreprise » n'était même pas dans
   le HTML : il vivait à l'intérieur de la branche « l'appareil EST sur un espace » alors que
   sa condition dit l'inverse. Écrit depuis des mois, jamais affiché une seule fois.
   ⚠️ On sert le dépôt LOCAL sur 127.0.0.1 avec un profil VIDE, et toutes les sorties réseau
   sont bouchonnées : aucune donnée de client réel n'entre ici. C'est ce qui rend cette sonde
   compatible avec la règle « le navigateur piloté ne va pas sur app.html en production ». */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop';
const srv=http.createServer((q,r)=>{const x=path.join(R,q.url.split('?')[0]);
  fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)));}).listen(8195,'127.0.0.1');
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const p=await nav.newPage({viewport:{width:900,height:1000}});
  await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/* n */'}));
  await p.goto('http://127.0.0.1:8195/app.html',{timeout:120000,waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof renderLogin==='function',{timeout:60000});
  await p.waitForTimeout(1200);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const vis=el=>!!el&&el.offsetParent!==null;
    const t=(document.getElementById('login-box')||{}).textContent||'';
    return {
      surEspace: !!localStorage.getItem((typeof STORE_KEY==='string'?STORE_KEY.replace(/gestion_v2$/,''):'elanB_')+'sync_team'),
      champEntreprise: vis(document.getElementById('li-ent')),
      avertissementOrphelin: vis(document.getElementById('li-orphelin')),
      avertissementDansLeHTML: !!document.getElementById('li-orphelin'),
      ditPasRattache: /n'est rattaché à aucune entreprise/.test(t),
      ditLaisseVide: /laisse vide/.test(t)
    };
  }),null,1));
  await nav.close(); srv.close();
})().catch(e=>{console.error(e);process.exit(1);});
