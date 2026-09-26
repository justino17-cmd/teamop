/* ══ SONDE — LE THÈME DE LA TOUR (maquette « TeamOp Tour HIG », validée par Justin) ══════════
   Autonome, sans dépendance : Chromium piloté par CDP (WebSocket intégré à Node 22), tour.html
   servi sur 127.0.0.1, l'API api.teamop.fr SIMULÉE dans la page (fetch intercepté avant le
   premier script) — aucune requête ne sort, aucune donnée réelle n'entre.
   ⛔ Pas pilote.js : son chemin de copie est FIXE et une autre session s'en sert. Ici la copie
   est à nous (dossier temporaire), prise AU DÉMARRAGE : on juge le fichier du moment.
   Chemin de rendu SwiftShader : c'est lui qui floute le verre comme un vrai appareil
   (--disable-gpu laisse des rayures nettes sous une vitre mince — règle du dépôt).

   Ce qu'elle mesure, vue par vue, jour ET nuit, bureau 1280×900 ET téléphone 390×844 :
     · une capture PNG (dossier CAPTURES) ;
     · les exceptions JavaScript (Runtime.exceptionThrown) ;
     · au téléphone : le défilement latéral RÉEL (scrollTo(9999) puis scrollX, deux lectures à
       700 ms d'écart, contre la largeur POSÉE 390, après deux trames et une lecture forcée) ;
     · au téléphone : les cibles < 44 px, mesurées sur la ZONE QUI RÉPOND (elementFromPoint) ;
     · au pixel : le contraste texte/fond d'une population nommée (titres, lignes, puces, onglets) ;
   puis : la feuille « Plus » atteint toutes les vues ; chaque vue s'ouvre depuis le menu (bureau)
   et depuis la barre ou la feuille (téléphone) ; ?mode=light|dark force le mode ; sans paramètre
   le mode suit le système EN DIRECT.
   Chaque contrôle prouve d'abord sa population : un zéro sur un ensemble vide ne prouve rien.
   Usage : node scratchpad/sonde-tour-theme.js
           SEULES=surveillance,entreprises APPAREILS=bureau MODES=dark node scratchpad/sonde-tour-theme.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const { decoder, contraste } = require('./png.js');

const RACINE = path.resolve(__dirname, '..');
const CHROME = '/opt/pw-browsers/chromium';
const CAPTURES = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/tour-captures';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

/* ── L'API SIMULÉE — des réponses FICTIVES mais plausibles, une par route que la Tour appelle.
   Noms d'entreprises inventés ; aucun code promo réel (BIENVENUE3 est l'exemple déclaré fictif
   de scripts/verif-secrets.sh). Les noms sont LONGS exprès : une mise en page se mesure avec les
   valeurs les plus longues plausibles, pas avec la démonstration (règle du dépôt). ── */
const MOCK = String.raw`
(function(){
  var H=3600000, J=24*H, N=Date.now();
  try{ localStorage.setItem('tour_token','jeton-de-sonde'); localStorage.setItem('tour_nom','Justin'); localStorage.setItem('tour_role','patron');
       localStorage.setItem('tour_apps',JSON.stringify(['gestion','messages'])); }catch(e){}
  var ENTS=[
    {t:'boulmartin-7k2q',nom:'Boulangerie Martin',slug:'boulmartin',email:'contact@boulangerie-martin.test',dansAnnuaire:true,origine:'site',formule:'business',utilisateurs7:4,appareils7:6,derniere:N-2*H,versions:{'755':5,'752':1},erreurs:2,echecs24:1,cleEtat:'propre',opMessages:true,comptesAnnuaire:4},
    {t:'azurnet-x1p0',nom:'Azur Nettoyage Services Professionnels de la Côte',slug:'azurnet',email:'direction.generale@azur-nettoyage-services.test',dansAnnuaire:true,origine:'site',formule:'premium',utilisateurs7:9,appareils7:12,derniere:N-20*60000,versions:{'755':12},erreurs:0,echecs24:0,cleEtat:'propre',promo:{actif:true,code:'BIENVENUE3',finLe:'2026-12-15'},comptesAnnuaire:9},
    {t:'hotelpins-77lm',nom:'Hôtel des Pins',slug:'hotelpins',email:'gerance@hotel-pins.test',dansAnnuaire:true,origine:'tour',formule:'gratuit',utilisateurs7:1,appareils7:1,derniere:N-3*J,versions:{'748':1},erreurs:0,echecs24:3,cleEtat:'partagee',suspendu:true,comptesAnnuaire:1},
    {t:'essaidemo-9k2q',nom:'',slug:'',email:'',dansAnnuaire:false,origine:'',utilisateurs7:2,appareils7:2,derniere:N-5*H,versions:{'750':2},erreurs:1,echecs24:0,cleEtat:'inconnue',comptesAnnuaire:0},
    {t:'mesessais-a1b2',nom:'Essai Justin',slug:'essaijustin',email:'',dansAnnuaire:true,origine:'tour',formule:'',utilisateurs7:0,appareils7:0,derniere:0,versions:{},erreurs:0,echecs24:0,cleEtat:'propre'},
    {t:'opgestion-beta',nom:'',slug:'',email:'',dansAnnuaire:false,technique:true,utilisateurs7:3,appareils7:3,derniere:N-H,versions:{'755':3},erreurs:0,echecs24:0,cleEtat:'inconnue'}
  ];
  var ESPS=[
    {nom:'Boulangerie Martin',slug:'boulmartin',email:'contact@boulangerie-martin.test',ident:'claire',origine:'site',opMessages:true,annuaire:4,ouvertLe:N-90*J,resume:{derniere:N-2*H,utilisateurs7:4,apps:{opgestion:40}}},
    {nom:'Azur Nettoyage Services Professionnels de la Côte',slug:'azurnet',email:'direction.generale@azur-nettoyage-services.test',ident:'karim',origine:'site',opMessages:false,annuaire:9,ouvertLe:N-60*J,resume:{derniere:N-20*60000,utilisateurs7:9,apps:{opgestion:120}}},
    {nom:'Hôtel des Pins',slug:'hotelpins',email:'gerance@hotel-pins.test',ident:'lea',origine:'tour',opMessages:false,annuaire:0,suspendu:true,ouvertLe:N-10*J,ouvertPar:'Justin',resume:{}}
  ];
  var ISSUES=[
    {id:'i1',type:'erreur',statut:'nouveau',count:14,app:'opgestion',message:'TypeError: impossible de lire « stock » sur la fiche box\nà renderBox',origine:'renderBox',categorie:'boxes',firstTs:N-2*J,lastTs:N-40*60000,entreprises:[{nom:'Boulangerie Martin',t:'boulmartin-7k2q'}],versions:{'755':14},ua:'iPhone · Safari',stack:'renderBox@app.html:120'},
    {id:'i2',type:'lenteur',statut:'encours',count:4,app:'opgestion',message:'Écran Planning figé 3,2 s',origine:'planning',categorie:'planning',firstTs:N-3*J,lastTs:N-5*H,entreprises:[{nom:'Azur Nettoyage Services Professionnels de la Côte',t:'azurnet-x1p0'},{nom:'Boulangerie Martin',t:'boulmartin-7k2q'}]},
    {id:'i3',type:'reseau',statut:'nouveau',count:2,app:'opgestion',message:'Connexion perdue pendant la synchro',origine:'sync',categorie:'sync',firstTs:N-J,lastTs:N-9*H,entreprises:[{nom:'Hôtel des Pins',t:'hotelpins-77lm'}]},
    {id:'i4',type:'erreur',statut:'corrige',count:1,app:'opmessages',message:'Échec d’envoi d’une pièce jointe',origine:'pj',firstTs:N-6*J,lastTs:N-6*J,entreprises:[{nom:'Boulangerie Martin',t:'boulmartin-7k2q'}]},
    {id:'i5',type:'erreur',statut:'nouveau',count:1,app:'espace',message:'Promesse rejetée : délai dépassé',origine:'espace',firstTs:N-2*H,lastTs:N-2*H,entreprises:[]}
  ];
  var CLIENTS=[
    {email:'contact@boulangerie-martin.test',entreprise:'Boulangerie Martin',nom:'Claire Martin',metier:'Boulangerie',inscrit:N-90*J,majTs:N-2*J,apps:['OP GESTION','OP MESSAGES'],statut:'actif',demandes:[{app:'OP GESTION',formule:'business',users:4,date:N-80*J,besoin:'Suivi des interventions et du stock'}],demandesTraitees:{0:{par:'Justin'}}},
    {email:'direction.generale@azur-nettoyage-services.test',entreprise:'Azur Nettoyage Services Professionnels de la Côte',nom:'Karim Benali',metier:'Nettoyage',inscrit:N-60*J,majTs:N-J,apps:['OP GESTION'],statut:'actif',demandes:[]},
    {email:'gerance@hotel-pins.test',entreprise:'Hôtel des Pins',nom:'Léa Durand',metier:'Hôtellerie',inscrit:N-10*J,majTs:N-10*J,apps:[],statut:'essai',demandes:[{app:'OP GESTION',formule:'gratuit',users:1,date:N-10*J}]}
  ];
  var R={
    '/api/monitor/login':{token:'jeton-de-sonde',nom:'Justin',role:'patron',apps:['gestion','messages']},
    '/api/monitor/moi':{nom:'Justin',role:'patron',apps:['gestion','messages']},
    '/api/monitor/issues':{issues:ISSUES,compteurs:{nouveau:3,encours:1,corrige:1},entreprises:3},
    '/api/monitor/clients':{clients:CLIENTS,total:3},
    '/api/monitor/entreprises':{entreprises:ENTS,total:6,horsAnnuaire:2,avecErreurs:2,avecEchecs:2},
    '/api/monitor/espaces/liste':{espaces:ESPS},
    '/api/monitor/comptes-site':{comptes:[{email:'contact@boulangerie-martin.test',nom:'Claire Martin',societe:'Boulangerie Martin',entreprise:'Boulangerie Martin',aUnEspace:true,cree:N-90*J,derniere:N-2*J},{email:'visiteur@exemple.test',nom:'',cree:N-4*J}],anonymes:12},
    '/api/monitor/connexions':{espaces:[{t:'boulmartin-7k2q',nom:'Boulangerie Martin',slug:'boulmartin',resume:{derniere:N-2*H,utilisateurs7:4,connexions24:11,echecs24:1}},{t:'hotelpins-77lm',nom:'Hôtel des Pins',slug:'hotelpins',resume:{derniere:N-3*J,utilisateurs7:1,connexions24:0,echecs24:3}}],global:{actives7:3,connexions24:14,echecs24:4}},
    '/api/monitor/stripe/abos':{configured:true,abos:[{id:'sub_sondeA1',clientNom:'Boulangerie Martin',clientEmail:'contact@boulangerie-martin.test',montant:25,periodicite:'mois',statut:'active',prochaine:N+12*J,formule:'Business'},{id:'sub_sondeB2',clientNom:'Hôtel des Pins',clientEmail:'gerance@hotel-pins.test',montant:25,periodicite:'mois',statut:'past_due',prochaine:N-2*J,formule:'Business'},{id:'sub_sondeC3',clientNom:'Azur Nettoyage Services Professionnels de la Côte',clientEmail:'direction.generale@azur-nettoyage-services.test',montant:50,periodicite:'mois',statut:'trialing',prochaine:N+20*J,formule:'Business Premium'}],mrr:75,actifs:2,impayes:1},
    '/api/monitor/stripe/paiements':{configured:true,paiements:[{id:'py_sonde1',clientNom:'Boulangerie Martin',clientEmail:'contact@boulangerie-martin.test',montant:25,statut:'reussi',date:N-18*J},{id:'py_sonde0',clientNom:'Boulangerie Martin',montant:25,statut:'reussi',date:N-48*J},{id:'py_sonde9',clientNom:'Boulangerie Martin',montant:25,statut:'reussi',date:N-78*J},{id:'py_sonde2',clientNom:'Hôtel des Pins',clientEmail:'gerance@hotel-pins.test',montant:25,statut:'echoue',date:N-2*J,url:'https://example.test/facture'}],echecs:1},
    '/api/monitor/promos':{codes:[{code:'BIENVENUE3',mois:3,formule:'premium',utilisations:1,max:10,actifs:[{nom:'Azur Nettoyage Services Professionnels de la Côte',finLe:'2026-12-15'}]}],actifsTotal:1},
    '/api/monitor/journal':{journal:[{ts:N-10*60000,qui:'Justin',ok:true,appareil:'Mac · Safari'},{ts:N-5*H,qui:'Sonia',ok:true,appareil:'iPhone · Safari'},{ts:N-3*H,qui:'justine',ok:false,appareil:'Navigateur inconnu',motif:'mot de passe incorrect'},{ts:N-J-2*H,qui:'Justin',ok:true,appareil:'Mac · Safari'}]},
    '/api/monitor/users':{users:[{nom:'Justin',role:'patron',actif:true,apps:['gestion','messages'],cree:N-200*J,derniere:N-10*60000},{nom:'Sonia',role:'collaborateur',actif:true,apps:['gestion'],cree:N-30*J,derniere:N-2*J}]},
    '/api/monitor/beta':{comptes:[{login:'marc',nom:'Marc',chantier:'Écran Planning',actif:true,cree:N-20*J,derniere:N-J},{login:'sofia',nom:'Sofia',chantier:'',actif:false,cree:N-40*J}]},
    '/api/monitor/mail/dossiers':{boites:[{boite:{id:'b1',email:'support@teamop.test'},nonLus:2,dossiers:[{chemin:'INBOX',nom:'Boîte de réception',role:'inbox',nonLus:2,total:5},{chemin:'Sent',nom:'Envoyés',role:'sent',total:3}]},{boite:{id:'b2',email:'controle@teamop.test'},nonLus:0,dossiers:[{chemin:'INBOX',nom:'Boîte de réception',role:'inbox',total:1}]}]},
    '/api/monitor/mail/liste':{messages:[{uid:1,boite:'support@teamop.test',dossier:'INBOX',de:'Claire Martin',deAdr:'contact@boulangerie-martin.test',objet:'Question sur la box du dépôt',date:N-2*H,lu:false,extrait:'Bonjour, la box du dépôt n’affiche plus le stock…'},{uid:2,boite:'support@teamop.test',dossier:'INBOX',de:'Léa Durand',deAdr:'gerance@hotel-pins.test',objet:'Facture de septembre',date:N-2*J,lu:true,extrait:'Pouvez-vous me renvoyer la facture ?'}],total:2},
    '/api/monitor/mails':{mails:[{ts:N-J,a:'contact@boulangerie-martin.test',objet:'Nous avons corrigé',par:'Justin'}]},
    '/api/monitor/devisia':{equipes:{'boulmartin-7k2q':{actif:true,n:12}},noms:{'boulmartin-7k2q':'Boulangerie Martin'},entreprises:[{t:'boulmartin-7k2q',nom:'Boulangerie Martin',n:12,actif:true,derniere:N-J}],cle:true,quotaJour:100,utilises:12},
    '/api/monitor/version':{min:748,versionMin:748,ok:true},
    '/api/monitor/sauvegarde/etat':{configuree:true,derniere:{ts:N-6*H,ok:true,taille:1234567},prochaine:N+18*H,archives:7},
    '/api/monitor/messages/etat':{ouvert:false,entreprises:1},
    '/health':{ok:true,version:'755',portail:{comptes:{actif:false},dossiers:{actif:false}},socle:{actif:true}}
  };
  var POST={
    '/api/monitor/entreprise/dossier':{ok:true,t:'boulmartin-7k2q',nom:'Boulangerie Martin',utilisateurs:[{login:'claire',nom:'Claire Martin',dansAnnuaire:true,derniere:N-2*H,provisoire:false},{login:'tom',nom:'Tom Leroy',dansAnnuaire:true,derniere:0,provisoire:true}],erreurs:[],connexions:[]},
    '/api/monitor/espaces/activite':{ok:true,total:120,dernier:N-2*H,version:'755',bugs:1,vues:[{vue:'planning',n:60},{vue:'boxes',n:40},{vue:'stock',n:20}]},
    '/api/monitor/espaces/connexions':{ok:true,connexions:[{ts:N-2*H,login:'claire',ok:true,via:'identifiants',ua:'iPhone · Safari',version:'755'}]}
  };
  var orig=window.fetch.bind(window);
  window.__appels=[];
  window.fetch=function(u,o){
    var s=String(u);
    if(s.indexOf('https://api.teamop.fr')!==0) return orig(u,o);
    var p=s.slice('https://api.teamop.fr'.length).split('?')[0];
    var meth=((o&&o.method)||'GET').toUpperCase();
    window.__appels.push(meth+' '+p);
    var d=(meth==='POST'&&POST[p])||R[p], st=200;
    if(!d){ if(meth==='GET'){ st=404; d={error:'route simulée absente'}; } else d={ok:true}; }
    return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },30); });
  };
  /* compter les transitions de vue ouvertes : on ne relève jamais pendant l'une d'elles */
  window.__vt=0;
  if(document.startViewTransition){ var sv=document.startViewTransition.bind(document);
    document.startViewTransition=function(f){ var t=sv(f); window.__vt++; var fin=function(){ window.__vt--; }; t.finished.then(fin,fin); return t; }; }
})();`;

function cdpClient(ws) {
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); },
    sur(f) { E.push(f); } };
}

async function demarrer() {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'tour-theme-'));
  const PAGE = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');   // la copie À NOUS, prise maintenant (TOUR_FICHIER : une autre version, pour une contre-épreuve)
  const version = (PAGE.match(/console interne · (v[\d.]+)/) || [])[1] || '?';
  const pp = await portLibre(), pc = await portLibre();
  const statique = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    if (u === '/' || u === '/tour.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    const x = path.join(RACINE, u.replace(/^\/+/, ''));
    if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': x.endsWith('.png') ? 'image/png' : x.endsWith('.js') ? 'text/javascript' : x.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream' }); r.end(d); });
  });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--hide-scrollbars', '--lang=fr-FR',
    '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(BANC, 'ch'), 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  /* ⛔ tuer le GROUPE, pas le seul processus principal : ses enfants (GPU, rendu) lui survivaient et
     tournaient encore une heure plus tard — des fantômes qui font tomber les mesures de temps
     (règle du dépôt, 23 septembre 2026 ; retrouvés le 26 : onze processus orphelins). */
  const tuer = () => { try { process.kill(-chrome.pid, 'SIGKILL'); } catch (e) { try { chrome.kill('SIGKILL'); } catch (x) {} } };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(sig, () => { tuer(); process.exit(130); });
  process.once('exit', tuer);
  let vivant = false;
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) { vivant = true; break; } } catch (e) {} }
  if (!vivant) throw new Error('Chromium ne répond pas sur son port de débogage');
  return { BASE: 'http://127.0.0.1:' + pp, pc, version,
    fermer() { tuer(); try { statique.close(); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} } };
}

/* Un onglet neuf par (appareil, mode) : un rangement vierge, un état de page connu. */
async function onglet(S, appareil, mode, url, attendreConsole) {
  const cible = await (await fetch('http://127.0.0.1:' + S.pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const c = cdpClient(ws);
  const exceptions = [];
  c.sur(m => { if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails;
    exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n').slice(0, 2).join(' | ')); } });
  await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable');
  if (appareil === 'telephone') {
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await c.envoyer('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    /* encoches posées : sans elles env(safe-area-inset-*) vaut 0 et on valide une page que personne ne voit */
    try { await c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, topMax: 47, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } }); } catch (e) {}
  } else {
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  }
  await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
  await c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: MOCK });
  await c.envoyer('Page.navigate', { url: S.BASE + (url || '/tour.html') });
  const ev = async (expr) => {
    const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  let pret = false;
  for (let i = 0; i < 200; i++) { await dormir(150);
    try { if (await ev('return !!document.getElementById("app") && document.getElementById("app").classList.contains("on") && typeof INC!=="undefined" && INC.loaded && ENT && typeof ENT==="object"')) { pret = true; break; } } catch (e) {} }
  if (!pret && attendreConsole !== false) throw new Error('la Tour n’a pas démarré (' + appareil + ', ' + mode + ')');
  /* les fenêtres natives bloquent le pilotage : on répond NON — aucun geste ne doit écrire */
  await ev('window.confirm=()=>false; window.alert=()=>{}; window.prompt=()=>null; return 1;');
  await dormir(600);
  return { c, ev, exceptions,
    fermer: async () => { try { ws.close(); } catch (e) {} try { await fetch('http://127.0.0.1:' + S.pc + '/json/close/' + cible.id); } catch (e) {} } };
}

/* deux trames + une lecture forcée : la règle du dépôt pour toute mesure de mise en page */
const STABLE = 'await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;';
/* attendre que les transitions de vue et l'entrée des cartes soient finies */
const APAISER = 'for(let i=0;i<60;i++){ if(!window.__vt && !document.querySelector("#vue.entre")) break; await new Promise(r=>setTimeout(r,50)); } await new Promise(r=>setTimeout(r,450));' + STABLE;

/* ── LES VUES — chaque vue de la Tour, et les écrans profonds qu'on n'atteint que par un geste ── */
const VUES = [
  { cle: 'accueil', app: 'gestion' }, { cle: 'surveillance', app: 'gestion' },
  { cle: 'incident', app: 'gestion', tab: 'surveillance', geste: 'INC.sel="i1"; render();' },
  { cle: 'surv-entreprise', app: 'gestion', tab: 'surveillance', geste: 'INC.sel=null; INC.grp="Boulangerie Martin"; render();' },
  { cle: 'entreprises', app: 'gestion' },
  { cle: 'fiche-entreprise', app: 'gestion', tab: 'entreprises', geste: 'entSel("boulmartin-7k2q"); await new Promise(r=>setTimeout(r,900));' },
  { cle: 'connexions', app: 'gestion' }, { cle: 'abonnements', app: 'gestion' }, { cle: 'devisia', app: 'gestion' },
  { cle: 'support', app: 'gestion' }, { cle: 'essais', app: 'gestion' }, { cle: 'donnees', app: 'gestion' },
  { cle: 'equipe', app: 'gestion' }, { cle: 'journal', app: 'gestion' },
  { cle: 'msg-accueil', app: 'messages', tab: 'accueil' }, { cle: 'msg-surveillance', app: 'messages', tab: 'surveillance' },
  { cle: 'msg-entreprises', app: 'messages', tab: 'entreprises' }, { cle: 'msg-support', app: 'messages', tab: 'support' },
  { cle: 'msg-equipe', app: 'messages', tab: 'equipe' }, { cle: 'msg-journal', app: 'messages', tab: 'journal' }
];

/* ── mesures dans la page ── */
const MESURE_DEBORDEMENT = `
  ${STABLE}
  const y=window.scrollY; window.scrollTo(9999,y); ${STABLE} const x1=window.scrollX, sw1=document.documentElement.scrollWidth; window.scrollTo(0,y);
  await new Promise(r=>setTimeout(r,700)); ${STABLE}
  window.scrollTo(9999,y); ${STABLE} const x2=window.scrollX, sw2=document.documentElement.scrollWidth; window.scrollTo(0,y);
  /* ⛔ une page qui s'élargit emporte innerWidth avec elle (règle du dépôt) : sur un téléphone la
     fenêtre de mise en page GRANDIT au lieu de défiler, scrollX reste à 0 et la vue entière se
     réduit. On compare donc aussi à la largeur POSÉE du profil, 390. */
  const iw=innerWidth, swf=document.documentElement.scrollWidth;
  let coupable='';
  if((x1>0&&x2>0)||iw>390||swf>390){ const l=[...document.querySelectorAll('#app *')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width&&r.right>391; });
    coupable=l.slice(-3).map(e=>e.tagName+'.'+String(e.className).slice(0,40)+' →'+Math.round(e.getBoundingClientRect().right)).join(' | '); }
  return {x1,x2,sw1,sw2,iw,swf,coupable};`;

/* La ZONE QUI RÉPOND : un doigt touche un point ; on sonde la verticale et l'horizontale du centre
   à ±22 px et on regarde si le point déclenche encore l'élément (lui, un descendant, son label). */
const MESURE_CIBLES = `
  const sel='button,a[href],[onclick],input:not([type=hidden]),select,textarea,[role=button],label[for],summary';
  const vus=[...document.querySelectorAll(sel)].filter(e=>{
    if(e.closest('#login')) return false;
    const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||cs.pointerEvents==='none') return false;
    const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false;
    /* un lien EN PLEINE PHRASE est exempté par WCAG 2.5.8 — il porte une phrase, pas un geste */
    if(e.tagName==='A'&&cs.display==='inline'&&e.parentElement&&/^(P|SPAN|DIV|LI|B)$/.test(e.parentElement.tagName)&&(e.parentElement.textContent||'').length>(e.textContent||'').length+20) return false;
    if(e.closest('[hidden]')) return false;
    return true; });
  const agit=(t,e)=>{ if(!t) return false; if(t===e||e.contains(t)) return true; const lb=t.closest&&t.closest('label'); if(lb&&(lb.contains(e)||(e.id&&lb.htmlFor===e.id))) return true; return false; };
  const petits=[], recouverts=[];
  let n=0;
  for(const e of vus){
    e.scrollIntoView({block:'center',inline:'nearest'}); await new Promise(r=>requestAnimationFrame(r));
    /* un lien EN LIGNE coupé sur deux lignes : le centre de sa boîte tombe entre les deux
       morceaux, chez le parent — on vise son premier morceau, là où le doigt se pose */
    const rs=e.getClientRects(), r=(rs.length>1?rs[0]:e.getBoundingClientRect()); if(r.bottom<0||r.top>innerHeight) continue;
    /* ce qui dort sous la barre du bas ou sous l'en-tête collé n'est pas mesurable ici */
    /* amené au milieu de l'écran, son centre DOIT le toucher — sinon quelque chose est posé
       dessus, et un doigt n'atteint pas la cible : on le NOMME au lieu de l'écarter en silence */
    const t0=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    if(!agit(t0,e)){ if(r.top>70&&r.bottom<innerHeight-120) recouverts.push({t:(e.getAttribute('aria-label')||e.title||e.textContent||e.tagName).trim().replace(/\\s+/g,' ').slice(0,40),sous:t0?(t0.tagName+'.'+String(t0.className).slice(0,30)):'rien'}); continue; }
    n++;
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    let h=r.height, w=r.width;
    if(h<44){ const up=document.elementFromPoint(cx,cy-21.5), dn=document.elementFromPoint(cx,cy+21.5); if(agit(up,e)&&agit(dn,e)) h=44; }
    if(w<44){ const g=document.elementFromPoint(cx-21.5,cy), d=document.elementFromPoint(cx+21.5,cy); if(agit(g,e)&&agit(d,e)) w=44; }
    if(h<44||w<44) petits.push({t:(e.getAttribute('aria-label')||e.title||e.textContent||e.value||e.tagName).trim().replace(/\\s+/g,' ').slice(0,40),cls:String(e.className||'').slice(0,40),tag:e.tagName,w:Math.round(r.width),h:Math.round(r.height)});
  }
  window.scrollTo(0,0);
  return {n,petits,recouverts};`;

/* ⛔ v2.68 — CE QUE LA VUE COUVRE D'ELLE-MÊME À L'OUVERTURE, ET CE QU'ELLE ÉCRASE. Les deux défauts
   d'Équipe trouvés à l'œil sur les captures du 26 septembre 2026 : « Accès ouverts », en-tête collant
   dans une colonne à bords arrondis, posé sur la ligne du patron sans qu'on ait rien fait défiler ; et
   des noms réduits à « S. », « C. » par quatre commandes sur la même ligne. Rien ne débordait : aucun
   contrôle de la sonde ne pouvait les voir.
   Population : le DOM — tout élément de #vue qui porte son PROPRE texte —, jamais une liste de classes.
   Couvert = hors de la lignée ET une chaîne qui peint un fond (règle du dépôt), à défilement 0 : plus
   bas, un en-tête collant couvre ce qui passe dessous, c'est son rôle. Seul ce que la VUE pose sur
   elle-même compte ; les barres fixes du haut et du bas sont du chrome sous lequel on défile.
   Écrasé = coupé en ellipse sous 64 px, ou replié sur 4 lignes et plus à moins de 12 signes par ligne. */
const MESURE_TEXTES = `
  window.scrollTo(0,0); ${STABLE}
  const out={n:0,couverts:[],ecrases:[]};
  const alpha=bg=>{ const m=String(bg).match(/rgba?\\(([^)]+)\\)/); if(!m) return /transparent/.test(bg)?0:1; const p=m[1].split(/[ ,\\/]+/).filter(Boolean); return p.length>3?parseFloat(p[3]):1; };
  const peint=el=>{ const cs=getComputedStyle(el); return alpha(cs.backgroundColor)>.05||cs.backgroundImage!=='none'||(cs.backdropFilter&&cs.backdropFilter!=='none'); };
  const els=[...document.querySelectorAll('#vue *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>=2));
  for(const e of els){
    const r=e.getBoundingClientRect(); if(r.width<4||r.height<4) continue;
    const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity||1)<.3||e.closest('[hidden]')) continue;
    out.n++;
    const txt=e.textContent.trim().replace(/\\s+/g,' ');
    if(e.scrollWidth>e.clientWidth+1&&e.clientWidth<64&&txt.length>6&&(cs.textOverflow==='ellipsis'||cs.overflowX!=='visible'))
      out.ecrases.push({t:txt.slice(0,40),cls:String(e.className).slice(0,40),w:e.clientWidth,sw:e.scrollWidth});
    else {
      /* les LIGNES se comptent sur les boîtes du TEXTE, regroupées quand elles se chevauchent : une case
         à cocher, une pastille ou un <span> plus petit ont leur propre sommet sans faire une ligne de plus
         (« OP MESSAGES (en travaux) » comptait 4 lignes sur UNE — mesuré le 26 septembre 2026) */
      const bx=[]; const tw=document.createTreeWalker(e,NodeFilter.SHOW_TEXT); let tn;
      while((tn=tw.nextNode())){ if(!tn.textContent.trim()) continue; const rg=document.createRange(); rg.selectNodeContents(tn);
        for(const q of rg.getClientRects()) if(q.width>1) bx.push([q.top,q.bottom]); }
      bx.sort((u,w)=>u[0]-w[0]); let lignes=0, bas=-1e9; for(const [ht,bs] of bx){ if(ht>=bas-2){ lignes++; bas=bs; } else bas=Math.max(bas,bs); }
      if(lignes>=4&&txt.length/lignes<12) out.ecrases.push({t:txt.slice(0,40),cls:String(e.className).slice(0,40),lignes,w:Math.round(r.width)}); }
    if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth) continue;
    const rg2=document.createRange(); rg2.selectNodeContents(e); const q=[...rg2.getClientRects()].find(z=>z.width>1)||r;
    const x=Math.min(Math.max(q.left+Math.min(q.width,40)/2,r.left+1),r.right-1), y=Math.min(Math.max(q.top+q.height/2,r.top+1),r.bottom-1);
    /* un texte ROGNÉ par un ancêtre (description repliée à deux lignes au téléphone, liste qui défile)
       n'est pas couvert : il est caché exprès, et son point tombe sur ce qui suit (faux constat du
       26 septembre 2026 : le « Entreprises » de la 4ᵉ ligne d'une description repliée) */
    let rogne=false; for(let a=e.parentElement;a&&a.id!=='vue';a=a.parentElement){ const ca=getComputedStyle(a);
      if(ca.overflowX!=='visible'||ca.overflowY!=='visible'){ const ra=a.getBoundingClientRect(); if(x<ra.left-1||x>ra.right+1||y<ra.top-1||y>ra.bottom+1){ rogne=true; break; } } }
    if(rogne) continue;
    const t=document.elementFromPoint(x,y); if(!t||t===e||e.contains(t)||t.contains(e)||!t.closest('#vue')) continue;
    let c=t, couvre=false; while(c&&!c.contains(e)){ if(peint(c)){ couvre=true; break; } c=c.parentElement; }
    if(couvre) out.couverts.push({t:txt.slice(0,40),sous:t.tagName+'.'+String(t.className).slice(0,40)+(t.textContent?' « '+t.textContent.trim().replace(/\\s+/g,' ').slice(0,24)+' »':'')});
  }
  return out;`;

/* Les textes dont on lit le contraste AU PIXEL : une population NOMMÉE, qui doit exister. */
const FAMILLES_TEXTE = {
  titre: '#vue .ttl-page', section: '#vue .tt-section', desc: '#vue .desc',
  entete: '#vue .reg-nom, #vue .sec, #vue .tt-carte-t',
  ligne: '#vue .reg-t1, #vue .reg-l2', puce: '#vue .past',
  kpi: '#vue .kpi .l', menu: 'nav.tabs .tab .lib', onglet: '#barre-bas .bb span:not(.bdg-r)'
};
/* Les rectangles des textes VISIBLES dans la fenêtre, en coordonnées de fenêtre : on lit leurs
   pixels dans UNE capture de l'écran (une par écran relevé) — une capture par texte coûtait une
   minute par vue sur une machine chargée, sous le verre SwiftShader. */
const RECT_TEXTES = `
  const F=${JSON.stringify(FAMILLES_TEXTE)}, out=[];
  for(const [fam,sel] of Object.entries(F)){
    const l=[...document.querySelectorAll(sel)].filter(e=>{ const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      return r.width>4&&r.height>4&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity||1)>.5&&(e.textContent||'').trim().length>1; }).slice(0,6);
    for(const e of l){
      /* la boîte du TEXTE (Range), bornée à l'élément : le fond lu est celui qui entoure les lettres */
      const rg=document.createRange(); rg.selectNodeContents(e); const rr=rg.getBoundingClientRect();
      const r=e.getBoundingClientRect();
      const x=Math.max(r.left,rr.left-2), y=Math.max(r.top,rr.top-1), w=Math.min(r.right,rr.right+2)-x, h=Math.min(r.bottom,rr.bottom+1)-y;
      if(w<4||h<4) continue;
      /* recouvert (barre flottante, en-tête collé) ? on ne lit pas un texte qu'on ne voit pas */
      const t=document.elementFromPoint(x+w/2,y+h/2); if(t&&!(t===e||e.contains(t)||t.contains(e))) continue;
      out.push({fam,txt:(e.textContent||'').trim().slice(0,30),x,y,w,h});
    }
  }
  return out;`;

/* le fond = la couleur la plus fréquente du rectangle ; l'encre = le pixel le plus contrasté avec lui */
function contrasteDans(img, t, dsf) {
  const x0 = Math.max(0, Math.round(t.x * dsf)), y0 = Math.max(0, Math.round(t.y * dsf));
  const x1 = Math.min(img.w, Math.round((t.x + t.w) * dsf)), y1 = Math.min(img.h, Math.round((t.y + t.h) * dsf));
  const H = new Map(); let fond = null, max = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * img.w + x) * 4;
    const k = (img.data[i] >> 2) + ',' + (img.data[i + 1] >> 2) + ',' + (img.data[i + 2] >> 2);
    const v = (H.get(k) || 0) + 1; H.set(k, v); if (v > max) { max = v; fond = [img.data[i], img.data[i + 1], img.data[i + 2]]; } }
  let best = 1;
  if (fond) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * img.w + x) * 4;
    const c = contraste(fond, [img.data[i], img.data[i + 1], img.data[i + 2]]); if (c > best) best = c; }
  return { c: best, fond: fond || [0, 0, 0] };
}

/* Une frappe VRAIE, au centre de l'élément, par les événements d'entrée du navigateur — et
   seulement après avoir prouvé que ce point touche bien l'élément (sinon la frappe se DIT perdue :
   une sonde qui compte des clics qui n'ont pas porté ne prouve rien). */
async function frapper(o, selecteur, index) {
  /* jamais pendant une transition de vue : son calque couvre tout, elementFromPoint rend <html> */
  await o.ev(APAISER + ' return 1;');
  const p = await o.ev(`const l=[...document.querySelectorAll(${JSON.stringify(selecteur)})].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
    const e=l[${index || 0}]; if(!e) return null; e.scrollIntoView({block:'center'}); ${STABLE}
    const r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, t=document.elementFromPoint(x,y);
    return {x,y,touche:!!t&&(t===e||e.contains(t)),t:e.getAttribute('data-t')||'',n:l.length,dessous:t&&!(t===e||e.contains(t))?(t.tagName+'.'+String(t.className).slice(0,30)+'#'+t.id):''};`);
  if (!p || !p.touche) return { porte: false, p };
  for (const type of ['mousePressed', 'mouseReleased'])
    await o.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  return { porte: true, p };
}

/* Le parcours : le menu (bureau), la barre et la feuille « Plus » (téléphone), et les modes. */
async function parcours(S, v, bilan) {
  console.log('\n── parcours du menu, de la barre, de la feuille et des modes ──');
  for (const app of ['gestion', 'messages']) {
    const o = await onglet(S, 'bureau', 'dark');
    await o.ev(`setApp('${app}',true); return 1;`); await dormir(400);
    const attendu = await o.ev('return menuVisible().reduce((a,g)=>a.concat(g.vues.map(x=>x[0])),[])');
    const n = await o.ev('return document.querySelectorAll("nav.tabs .tab").length');
    let ouvertes = 0, perdues = [];
    for (let i = 0; i < n; i++) {
      const f = await frapper(o, 'nav.tabs .tab', i);
      await dormir(250); await o.ev(APAISER + ' return 1;');
      const e = await o.ev('return {tab:TAB,len:(document.getElementById("vue").textContent||"").length}');
      if (f.porte && e.tab === f.p.t && e.len > 40) ouvertes++; else perdues.push((f.p && f.p.t) + ' (' + (f.porte ? 'ouvre ' + e.tab : 'frappe perdue') + ')');
    }
    v('bureau · console ' + app + ' : les ' + attendu.length + ' vues du menu s’ouvrent depuis le menu', ouvertes === attendu.length && n === attendu.length, ouvertes + '/' + n + (perdues.length ? ' · ' + perdues.join(', ') : ''));
    const sections = await o.ev('return [...document.querySelectorAll("nav.tabs .grp span")].map(e=>e.textContent)');
    /* v2.68 : les catégories rangées par SUJET (Justin : « range tout bien… un truc pro ») */
    v('bureau · console ' + app + ' : les catégories de la Tour', sections.join('·') === 'Tour·Clients·Support·Administration', sections.join(' · '));
    o.exceptions.forEach(e => bilan.exceptions.push('parcours ' + app + ' : ' + e));
    await o.fermer();
  }
  for (const app of ['gestion', 'messages']) {
    const o = await onglet(S, 'telephone', 'light');
    await o.ev(`setApp('${app}',true); return 1;`); await dormir(400);
    const attendu = await o.ev('return menuVisible().reduce((a,g)=>a.concat(g.vues.map(x=>x[0])),[])');
    const barre = await o.ev('return [...document.querySelectorAll("#barre-bas .bb")].map(b=>b.dataset.t||"plus")');
    const libs = await o.ev('return [...document.querySelectorAll("#barre-bas .bb>span:not(.bdg-r)")].map(b=>b.textContent)');
    v('téléphone · ' + app + ' : barre d’onglets flottante à 5 onglets', barre.length === 5 && barre[4] === 'plus', libs.join(' · '));
    const flotte = await o.ev('const r=document.getElementById("barre-bas").getBoundingClientRect(); return {g:r.left,d:innerWidth-r.right,b:innerHeight-r.bottom,rayon:getComputedStyle(document.getElementById("barre-bas")).borderRadius,flou:getComputedStyle(document.getElementById("barre-bas")).backdropFilter}');
    v('téléphone · ' + app + ' : la barre flotte (décollée des bords) et elle est en verre', flotte.g >= 10 && flotte.d >= 10 && flotte.b >= 10 && /blur/.test(flotte.flou), JSON.stringify(flotte));
    let parBarre = 0;
    for (let i = 0; i < 4; i++) { const f = await frapper(o, '#barre-bas .bb[data-t]', i); await dormir(300);
      const tb = await o.ev('return TAB'); if (f.porte && tb === f.p.t) parBarre++; else console.log('     barre : ' + JSON.stringify(f.p) + ' → ' + tb); }
    v('téléphone · ' + app + ' : les 4 onglets de la barre ouvrent leur vue', parBarre === 4, parBarre + '/4');
    /* la feuille « Plus » : elle s'ouvre, elle porte TOUTES les vues, et chacune s'ouvre depuis elle */
    let f = await frapper(o, '#barre-bas .bb.plus'); await dormir(650);
    const feuille = await o.ev('const f=document.getElementById("feuille"); const r=f.getBoundingClientRect(); return {vue:!f.hidden&&f.classList.contains("on")&&r.top<innerHeight-100,items:[...f.querySelectorAll(".groupe button[data-t]")].map(b=>b.dataset.t),sections:[...f.querySelectorAll(".feuille-sec")].map(e=>e.textContent)}');
    const manque = attendu.filter(t => !feuille.items.includes(t));
    v('téléphone · ' + app + ' : « Plus » ouvre la feuille', f.porte && feuille.vue, JSON.stringify({ sections: feuille.sections }));
    v('téléphone · ' + app + ' : la feuille atteint toutes les vues (' + attendu.length + ')', feuille.items.length === attendu.length && !manque.length, feuille.items.join(',') + (manque.length ? ' · MANQUE ' + manque.join(',') : ''));
    const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(CAPTURES, 'feuille-plus-' + app + '-jour-telephone.png'), Buffer.from(cap.data, 'base64')); bilan.captures++;
    await o.ev('fermerFeuille(); return 1;'); await dormir(450);
    let parFeuille = 0;
    for (let i = 0; i < attendu.length; i++) {
      await frapper(o, '#barre-bas .bb.plus'); await dormir(650);
      const g = await frapper(o, '#feuille .groupe button[data-t]', i); await dormir(500);
      const e = await o.ev('return {tab:TAB,fermee:document.getElementById("feuille").hidden}');
      if (g.porte && e.tab === g.p.t && e.fermee) parFeuille++; else console.log('     feuille : ' + JSON.stringify(g.p) + ' → ' + JSON.stringify(e));
    }
    v('téléphone · ' + app + ' : chaque vue s’ouvre depuis la feuille', parFeuille === attendu.length, parFeuille + '/' + attendu.length);
    o.exceptions.forEach(e => bilan.exceptions.push('feuille ' + app + ' : ' + e));
    await o.fermer();
  }
  /* LES MODES — le paramètre force, sans paramètre le système décide, EN DIRECT */
  const lire = 'return {jour:document.body.classList.contains("jour"),html:getComputedStyle(document.documentElement).backgroundColor,carte:getComputedStyle(document.querySelector(".kpi,.carte,.reg-bloc,.reg-cli")).backgroundColor,libelle:(document.getElementById("tt-mode")||{}).textContent}';
  let o = await onglet(S, 'bureau', 'dark', '/tour.html?mode=light');
  let m = await o.ev(lire);
  v('?mode=light force le jour même quand le système est en nuit', m.jour && /242, 242, 247/.test(m.html), JSON.stringify(m));
  await o.fermer();
  o = await onglet(S, 'bureau', 'light', '/tour.html?mode=dark');
  m = await o.ev(lire);
  v('?mode=dark force la nuit même quand le système est en jour', !m.jour && !/242, 242, 247/.test(m.html), JSON.stringify(m));
  await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); await dormir(400);
  const m2 = await o.ev(lire);
  v('…et un mode forcé ne suit pas le système', !m2.jour, JSON.stringify(m2));
  await o.fermer();
  o = await onglet(S, 'bureau', 'dark');
  const a = await o.ev(lire);
  /* les couleurs GLISSENT (transition de la grande feuille) : on relit une fois le glissé fini */
  await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await dormir(1500);
  const b = await o.ev(lire);
  await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); await dormir(1500);
  const c = await o.ev(lire);
  v('sans paramètre : nuit quand le système est en nuit', !a.jour, JSON.stringify(a));
  v('…bascule en jour EN DIRECT quand le système passe en jour (page ouverte, sans rechargement)', b.jour && b.html !== a.html && b.carte !== a.carte, JSON.stringify(b));
  v('…et revient en nuit en direct', !c.jour && c.html === a.html, JSON.stringify(c));
  const boutons = await o.ev('return document.querySelectorAll("#lg-mode,#ap-mode,[onclick*=modeBascule]").length');
  v('aucun bouton de mode en production', boutons === 0, boutons + ' bouton(s)');
  /* mouvement réduit et transparence réduite : les préférences du système sont lues */
  await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: 'reduce' }] }); await dormir(400);
  const r = await o.ev('return {flou:getComputedStyle(document.querySelector(".kpi,.carte,.reg-cli,.reg-bloc")).backdropFilter,barre:getComputedStyle(document.querySelector(".bandeau")).backdropFilter,pouls:getComputedStyle(document.querySelector("#tt-srv>i")).animationName}');
  v('transparence réduite : plus aucun flou sur les cartes ni la barre', r.flou === 'none' && r.barre === 'none', JSON.stringify(r));
  v('mouvement réduit : le pouls du serveur s’arrête', r.pouls === 'none', r.pouls);
  o.exceptions.forEach(e => bilan.exceptions.push('modes : ' + e));
  await o.fermer();
}

async function main() {
  fs.mkdirSync(CAPTURES, { recursive: true });
  const seules = (process.env.SEULES || '').split(',').filter(Boolean);
  const APPAREILS = (process.env.APPAREILS || 'bureau,telephone').split(',');
  const MODES = (process.env.MODES || 'light,dark').split(',');
  const vues = VUES.filter(v => !seules.length || seules.includes(v.cle));
  const S = await demarrer();
  console.log('Sonde du thème de la Tour — tour.html ' + S.version + ' · ' + vues.length + ' vues × ' + APPAREILS.length + ' appareils × ' + MODES.length + ' modes');
  const bilan = { vues: 0, captures: 0, exceptions: [], debordements: [], cibles: { n: 0, petits: [], recouverts: [] }, textes: { n: 0, couverts: [], ecrases: [] }, contrastes: { n: 0, faibles: [], parFam: {} }, nav: [], modes: [] };
  const ok = [], ko = [];
  const v = (t, cond, detail) => { (cond ? ok : ko).push(t + (detail ? ' — ' + detail : '')); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail ? ' — ' + detail : '')); };
  try {
    for (const appareil of APPAREILS) for (const mode of MODES) {
      const o = await onglet(S, appareil, mode);
      console.log('\n── ' + appareil + ' · ' + mode + ' ──');
      for (const V of vues) {
        const tab = V.tab || V.cle;
        await o.ev(`if(APP!=='${V.app}') setApp('${V.app}',true); INC.sel=null; INC.grp=null; if(ENT.sel) { ENT.sel=null; } setTab('${tab}',true); return 1;`);
        await dormir(250);
        if (V.geste) await o.ev(V.geste + ' return 1;');
        await o.ev(APAISER + ' window.scrollTo(0,0); return 1;');
        await dormir(200);
        const etat = await o.ev(`return {tab:TAB,app:APP,len:(document.getElementById('vue').textContent||'').length,titre:((document.querySelector('#vue .ttl-page')||{}).textContent||'').trim()}`);
        if (etat.tab !== tab || etat.len < 40) { v(V.cle + ' (' + appareil + ', ' + mode + ') s’ouvre', false, JSON.stringify(etat)); continue; }
        bilan.vues++;
        /* RELEVE=<fichier> : un relevé ponctuel (le corps d'une fonction, « return … ») lu dans un
           fichier et joué dans la vue ouverte — pour diagnostiquer sans réécrire la sonde */
        if (process.env.RELEVE) console.log('   RELEVÉ ' + V.cle + ' : ' + JSON.stringify(await o.ev(fs.readFileSync(process.env.RELEVE, 'utf8'))));
        const nomCap = V.cle + '-' + (mode === 'dark' ? 'nuit' : 'jour') + '-' + appareil + '.png';
        const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(CAPTURES, nomCap), Buffer.from(cap.data, 'base64')); bilan.captures++;
        if (appareil === 'telephone') {
          const d = await o.ev(MESURE_DEBORDEMENT);
          if ((d.x1 > 0 && d.x2 > 0) || d.iw > 390 || d.swf > 390) bilan.debordements.push(V.cle + ' ' + mode + ' : défile ' + d.x2 + ' px, page ' + Math.max(d.iw, d.swf) + ' px pour 390 (' + d.coupable + ')');
          const t = await o.ev(MESURE_CIBLES);
          (t.recouverts || []).forEach(p => bilan.cibles.recouverts.push(V.cle + ' ' + mode + ' : « ' + p.t + ' » sous ' + p.sous));
          bilan.cibles.n += t.n; t.petits.forEach(p => bilan.cibles.petits.push(V.cle + ' ' + mode + ' : « ' + p.t + ' » ' + p.tag + '.' + p.cls + ' ' + p.w + '×' + p.h));
        }
        {
          const x = await o.ev(MESURE_TEXTES);
          bilan.textes.n += x.n;
          x.couverts.forEach(p => bilan.textes.couverts.push(V.cle + ' ' + appareil + ' ' + mode + ' : « ' + p.t + ' » sous ' + p.sous));
          x.ecrases.forEach(p => bilan.textes.ecrases.push(V.cle + ' ' + appareil + ' ' + mode + ' : « ' + p.t + ' » .' + p.cls + ' ' + (p.lignes ? p.lignes + ' lignes sur ' + p.w + ' px' : p.w + ' px visibles pour ' + p.sw)));
        }
        /* deux écrans relevés : le haut de la vue, puis un écran plus bas (les lignes, les pastilles) */
        const dsf = appareil === 'telephone' ? 3 : 1;
        for (const decal of [0, 1]) {
          await o.ev('window.scrollTo(0,' + decal + '*Math.round(innerHeight*.8)); ' + STABLE + ' await new Promise(r=>setTimeout(r,150)); return 1;');
          const textes = await o.ev(RECT_TEXTES);
          const im = decoder(Buffer.from((await o.c.envoyer('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
          for (const t of textes) {
            const m = contrasteDans(im, t, dsf);
            bilan.contrastes.n++; bilan.contrastes.parFam[t.fam] = (bilan.contrastes.parFam[t.fam] || 0) + 1;
            if (m.c < 4.5) bilan.contrastes.faibles.push(V.cle + ' ' + appareil + ' ' + mode + ' [' + t.fam + '] « ' + t.txt + ' » ' + m.c.toFixed(2) + ':1 sur rgb(' + m.fond.join(',') + ')');
          }
        }
        await o.ev('window.scrollTo(0,0); return 1;');
      }
      o.exceptions.forEach(e => bilan.exceptions.push(appareil + ' ' + mode + ' : ' + e));
      await o.fermer();
    }
    if (!process.env.SANS_NAV) await parcours(S, v, bilan);
  } finally { S.fermer(); }
  console.log('\n══ BILAN ══');
  console.log('population : ' + bilan.vues + ' vues ouvertes, ' + bilan.captures + ' captures dans ' + CAPTURES);
  console.log('exceptions JavaScript : ' + bilan.exceptions.length); bilan.exceptions.slice(0, 20).forEach(e => console.log('   ' + e));
  console.log('débordements latéraux RÉELS au téléphone : ' + bilan.debordements.length); bilan.debordements.forEach(e => console.log('   ' + e));
  console.log('cibles tactiles mesurées : ' + bilan.cibles.n + ' · sous 44 px (zone qui répond) : ' + bilan.cibles.petits.length); bilan.cibles.petits.slice(0, 60).forEach(e => console.log('   ' + e));
  console.log('cibles RECOUVERTES (le doigt touche autre chose) : ' + bilan.cibles.recouverts.length); bilan.cibles.recouverts.slice(0, 40).forEach(e => console.log('   ' + e));
  console.log('textes relevés dans le DOM : ' + bilan.textes.n + ' · couverts par la vue à l’ouverture : ' + bilan.textes.couverts.length); bilan.textes.couverts.slice(0, 40).forEach(e => console.log('   ' + e));
  console.log('textes écrasés (ellipse sous 64 px, ou 4 lignes et plus à moins de 12 signes) : ' + bilan.textes.ecrases.length); bilan.textes.ecrases.slice(0, 40).forEach(e => console.log('   ' + e));
  console.log('textes lus au pixel : ' + bilan.contrastes.n + ' ' + JSON.stringify(bilan.contrastes.parFam) + ' · sous 4,5:1 : ' + bilan.contrastes.faibles.length); bilan.contrastes.faibles.slice(0, 60).forEach(e => console.log('   ' + e));
  const faute = ko.length + bilan.textes.couverts.length + bilan.textes.ecrases.length + bilan.cibles.recouverts.length + bilan.exceptions.length + bilan.debordements.length + bilan.cibles.petits.length + bilan.contrastes.faibles.length;
  /* une population vide est un échec, pas un zéro */
  if (!bilan.vues || (!bilan.cibles.n && APPAREILS.includes('telephone')) || !bilan.contrastes.n || !bilan.textes.n) { console.log('⛔ POPULATION VIDE — la sonde n’a rien mesuré'); process.exit(1); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗  (contrôles de parcours) · ' + faute + ' défaut(s) au total');
  process.exit(faute ? 1 : 0);
}
/* Chargée par une autre sonde (`require`) : elle prête son banc — l'API simulée, le lancement, l'onglet
   piloté — sans rien lancer elle-même. */
if (require.main === module) main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
else module.exports = { MOCK, demarrer, onglet, STABLE, APAISER, dormir };
