/* ⛔⛔ CETTE SONDE NE PROUVE RIEN — ET C'EST ÉCRIT ICI POUR QUE PERSONNE NE S'Y FIE ⛔⛔
   Conservée UNIQUEMENT pour la leçon. Sa contre-épreuve (la rejouer sur la version SANS la
   garde) rend « 0 écriture » : elle ne voit donc pas le défaut, donc elle ne prouve pas sa
   correction. Le jour où on croit le contraire, on publie en confiance sur du vide.

   POURQUOI ELLE ÉCHOUE : `_fbDoc` est une variable de SCRIPT (`let _fbDoc`), pas une propriété
   de `window`. `window._fbDoc = …` depuis `page.evaluate` crée une AUTRE variable ; la vraie
   reste nulle, et `syncPush` sort à sa première ligne (`if(!_syncOn||!_fbDoc||…) return`).
   C'est exactement le piège déjà noté dans REPRISE.md pour `window.clientName=`, refait.

   CE QU'IL FAUDRAIT POUR PROUVER LA COURSE : un vrai SDK Firestore, donc un environnement où
   `www.gstatic.com` est joignable — ce conteneur ne l'a pas. À rejouer sur une machine avec
   réseau, ou en servant une copie de beta.html dont `_fbDoc` est exposé volontairement.

   ══ ce que la sonde voulait faire ══════════════════════════════════════════════════════════
   Le défaut : `syncPush` fige une copie de `db`, attend (compression + chiffrement), puis
   écrit — en REMPLAÇANT le document entier. Si une réception remplace `db` pendant l'attente,
   on écrivait une base PÉRIMÉE par-dessus le travail de l'équipe.
   Ici on ralentit `gzipper` exprès pour élargir la fenêtre, on remplace `db` au milieu, et on
   regarde si l'écriture part quand même. ⛔ beta.html, réseau coupé, base fictive. */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop';
const BETA=fs.readFileSync(path.join(R,'beta.html'),'utf8');
if((BETA.match(/const BETA_ESSAI=true;/g)||[]).length!==1){ console.error('⛔ BETA_ESSAI introuvable'); process.exit(1); }
const BETA2=BETA.replace('const BETA_ESSAI=true;','const BETA_ESSAI=false;');
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0];
 if(u==='/beta.html'){ r.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}); return r.end(BETA2); }
 const x=path.join(R,u);fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)))}).listen(8198,'127.0.0.1');
(async()=>{
 const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const p=await nav.newPage({viewport:{width:390,height:844}});
 const err=[]; p.on('pageerror',e=>err.push(String(e)));
 await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/**/'}));
 const base={users:[{id:'u1',prenom:'A',nom:'B',login:'a',role:'admin',actif:true,pwdHash:require('crypto').createHash('sha256').update('Chantier2026!').digest('hex'),secu:'2026-09',email:'a@b.fr'}],
   clients:[],produits:[],boxes:[{id:'bx1',numero:'BX-1',nom:'Cuisine',stock:{p1:{u:40}},_ms:{}}],interventions:[],mouvements:[],journal:[],devis:[],factures:[],bons:[],fournisseurs:[],techniciens:[]};
 await p.addInitScript(j=>{ try{ localStorage.setItem('elanB_gestion_v2',j); localStorage.setItem('elanB_vierge_v1','1'); localStorage.setItem('elanB_sync_on','0'); }catch(e){} }, JSON.stringify(base));
 await p.goto('http://127.0.0.1:8198/beta.html',{timeout:60000,waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>typeof syncPush==='function'&&typeof db==='object',{timeout:30000});

 const r=await p.evaluate(async()=>{
   const journal=[];
   /* Un faux document Firestore : on note ce qui serait ÉCRIT, sans réseau. */
   const ecritures=[];
   window._fbDoc={ set:(o)=>{ ecritures.push(o); return Promise.resolve(); },
                   get:()=>Promise.resolve({exists:false, data:()=>null}) };
   _syncOn=true; _syncGotInitial=true; _syncApplying=false; _horsLigne=false; _versionBloquee=false;
   currentUser=db.users[0];
   /* ⛔ ON ÉLARGIT LA FENÊTRE : gzipper devient lent, comme sur un téléphone chargé. */
   const vraiGz=window.gzipper;
   window.gzipper=async(t)=>{ await new Promise(r=>setTimeout(r,500)); return vraiGz(t); };

   /* ⛔ LA SONDE DOIT TOURNER SUR LES DEUX VERSIONS. Sans ça, la contre-épreuve (« est-ce
      qu'elle attrape le défaut ? ») plante au lieu de répondre — et un banc qui ne voit pas le
      défaut ne prouve rien du tout. */
   const aGarde = typeof _dbGen!=='undefined';
   const genAvant = aGarde?_dbGen:0;
   const pousse=syncPush(true);
   /* Au milieu de l'attente, une réception remplace la base — exactement ce que fait onSnapshot. */
   await new Promise(r=>setTimeout(r,250));
   const neuve=JSON.parse(JSON.stringify(db));
   neuve.boxes[0].stock={p1:{u:12}};          // un collègue a sorti 28 unités
   neuve.boxes[0].nom='Cuisine (à jour)';
   _syncApplying=true; db=neuve; if(aGarde) _dbGen++; _syncApplying=false;
   journal.push('version avec garde : '+aGarde+' · réception simulée, la base est remplacée');
   await new Promise(r=>setTimeout(r,2500));
   return { ecritures:ecritures.length, journal, aGarde,
            stockActuel: db.boxes[0].stock.p1.u, nomActuel: db.boxes[0].nom };
 });
 console.log('\n  '+r.journal.join('\n  '));
 console.log('  écritures parties vers le nuage : '+r.ecritures);
 console.log('  base locale après : stock='+r.stockActuel+' u · nom= '+r.nomActuel);
 if(!r.aGarde){
   console.log('\n  ══ CONTRE-ÉPREUVE (version SANS la garde) ══');
   console.log('  écritures périmées parties : '+r.ecritures);
   console.log('  '+(r.ecritures>0?'✅ LA SONDE VOIT BIEN LE DÉFAUT — elle prouve donc quelque chose'
                                   :'⛔ la sonde ne voit PAS le défaut : elle ne prouve rien'));
   await nav.close(); srv.close(); process.exit(r.ecritures>0?0:1);
 }
 const cas=[
   ['⛔ AUCUNE écriture périmée n\'est partie', r.ecritures===0],
   ['la base fusionnée est intacte (28 u sorties conservées)', r.stockActuel===12],
   ['… et le nom mis à jour par le collègue aussi', r.nomActuel==='Cuisine (à jour)'],
   ['aucune erreur de page', err.length===0],
 ];
 cas.forEach(([n,b])=>console.log('  '+(b?'✓':'✗')+' '+n));
 if(err.length) console.log('  ⚠ '+err.join(' | '));
 const tout=cas.every(([,b])=>b);
 console.log('\n  '+(tout?'✅ L\'ÉCRITURE PÉRIMÉE EST BIEN ABANDONNÉE':'⛔ ÉCHEC — le travail de l\'équipe serait écrasé'));
 await nav.close(); srv.close();
 process.exit(tout?0:1);
})();
