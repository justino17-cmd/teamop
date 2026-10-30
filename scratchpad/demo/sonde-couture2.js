/* Sonde de la COUTURE (suite : tout décocher, démo sans cats, ?ajouter=, deux métiers) site ↔ démonstration (30 octobre 2026) — la page « Créer votre application » de l'aperçu (apercu/site/creer.html) et la démonstration
   (apercu/demo.html), servies en 127.0.0.1, vrais clics (Input.dispatchMouseEvent, après avoir prouvé que le point touché est la cible), deux onglets pilotés.
   Usage : node scratchpad/demo/sonde-couture.js [scénarios séparés par des virgules]   (défaut : tous)
   ⚠️ La démonstration envoie `postMessage(…, 'https://teamop.fr')` : sur 127.0.0.1 le navigateur jetterait le message (origine cible différente). Pour ne pas
   mesurer cet écart, la sonde réécrit la cible EN `location.origin` sur la page du site (un enrobage du `postMessage` de CETTE fenêtre) ; le littéral de production
   est contrôlé à part (il doit valoir l'origine du site en ligne). Ce que la sonde prouve, par scénario (population comptée avant de croire un zéro) :
   · le métier choisi → les cases, la base verrouillée, le lien « Tester » (métier, variante, cats) ;
   · la démonstration prend le bon métier ; le bandeau « non sélectionnée » est sur CHAQUE rubrique non cochée et sur AUCUNE cochée ;
   · « L'ajouter à ma demande » → la case est cochée sur le site et le message le dit ;
   · aucune exception, aucune erreur de console, aucune requête hors 127.0.0.1, aucun débordement latéral (deux lectures à 700 ms, contre la largeur posée) ;
   · les cibles tactiles du formulaire (≥ 44 px sur téléphone).                                                                                         */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('./lib.js');
/* un second onglet piloté (celui que le site ouvre) — même mécanique que lib.js */
const DEJA_VUS = new Set();
async function onglet(S, urlContient, avecCreer) {
  let cible = null;
  for (let i = 0; i < 200 && !cible; i++) {
    const l = await (await fetch('http://127.0.0.1:' + S.pc + '/json/list')).json();
    cible = l.find(x => x.type === 'page' && x.url !== 'about:blank' && x.url.indexOf(urlContient) >= 0 && !DEJA_VUS.has(x.id) && (avecCreer || x.url.indexOf('creer.html') < 0)) || null;
    if (!cible) await dormir(100);
  }
  if (!cible) return null;
  DEJA_VUS.add(cible.id); if (process.env.DEBUG) console.log('   onglet pris : ' + cible.id + ' ' + cible.url.slice(0, 90) + ' | cibles : ' + (await (await fetch('http://127.0.0.1:' + S.pc + '/json/list')).json()).map(x => x.type + ':' + x.url.slice(0, 50)).join(' ; '));
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) { /* idem */ } }); });
  /* une commande qui ne répond pas en 30 s est une page figée (une fenêtre de dialogue, un onglet mort) : on le DIT au lieu d'attendre pour toujours */
  const c = { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { const t = setTimeout(() => { A.delete(i); rej(new Error('sans réponse en 30 s : ' + me)); }, 30000); A.set(i, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } };
  const O = { c, exterieur: [], exceptions: [], erreurs: [], dialogues: [], reseau: [] };
  const dehors = u => !(/^(data|blob|about):/i.test(u) || u.indexOf(S.BASE + '/') === 0 || u === S.BASE);
  c.sur(m => {
    if (m.method === 'Network.requestWillBeSent') { const u = m.params.request.url; O.reseau.push(u); if (dehors(u)) O.exterieur.push(m.params.type + ' ' + u); }
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; O.exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n').slice(0, 2).join(' | ')); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') O.erreurs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 200));
    if (m.method === 'Page.javascriptDialogOpening') { O.dialogues.push(m.params.message.slice(0, 80)); c.envoyer('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); }
  });
  /* une fenêtre « Passer à ce métier ? » déjà ouverte AVANT notre arrivée fige la page (même Network.enable ne répond plus) : on l'accepte d'abord */
  await c.envoyer('Page.enable').catch(() => {});
  for (let t = 0; t < 8; t++) { try { await c.envoyer('Page.handleJavaScriptDialog', { accept: true }); O.dialogues.push('(déjà ouverte à l\'arrivée)'); break; } catch (e) { await dormir(250); } }
  await c.envoyer('Network.enable'); await c.envoyer('Runtime.enable'); 
  await c.envoyer('Page.enable');
  /* une fenêtre « Passer à ce métier ? » déjà ouverte AVANT notre arrivée bloque toute évaluation : on l'accepte d'emblée (et on la compte) */
  O.ev = async expr => { const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
  O.attendre = async (expr, ms) => { const fin = Date.now() + (ms || 25000); while (Date.now() < fin) { try { if (await O.ev('return !!(' + expr + ')')) return true; } catch (e) { /* chargement */ } await dormir(100); } return false; };
  return O;
}

/* un VRAI clic : l'élément est amené au milieu, le point touché est prouvé (lui, un descendant ou son label), puis souris enfoncée / relâchée */
async function clic(T, sel, opts) {
  opts = opts || {};
  const p = await T.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return {err:'absent'};
    e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const b=e.getBoundingClientRect(); if(b.width<1||b.height<1) return {err:'sans taille'};
    const x=b.left+b.width/2, y=b.top+b.height/2, t=document.elementFromPoint(x,y);
    const lie=t&&(t===e||e.contains(t)||t.contains(e)||(t.closest&&t.closest('label')&&t.closest('label').contains(e)));
    return {x,y,lie:!!lie,tag:t?t.tagName+'.'+(t.className&&t.className.baseVal===undefined?t.className:''):'',w:b.width,h:b.height}`);
  if (p.err) return { ok: false, raison: p.err, sel };
  if (!p.lie) return { ok: false, raison: 'le point touché est ' + p.tag, sel, p };
  await T.c.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await T.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await dormir(opts.attente || 250);
  return { ok: true, w: p.w, h: p.h };
}
/* un débordement se confirme à la SECONDE lecture, et se tranche en demandant à la PAGE si elle bouge (CLAUDE.md) */
async function debordement(T, largeurPosee) {
  const lire = () => T.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    window.scrollTo(9999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,window.scrollY);
    return {sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, sx, iw:innerWidth}`);
  const a = await lire(); await dormir(700); const b = await lire();
  return { a, b, deborde: b.sx > 0 || b.sw > largeurPosee + 1 };
}
async function profil(T, S, P) {
  await T.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.l, height: P.h, deviceScaleFactor: P.mobile ? 2 : 1, mobile: !!P.mobile });
  if (P.mobile) await T.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
  await T.c.envoyer('Emulation.setUserAgentOverride', { userAgent: P.mobile ? UA_TEL : UA_BUR });
  await T.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: P.th }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
}

const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const UA_BUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const P0 = { l: 1440, h: 900, mobile: false, th: 'light' };
async function ouvrirSite(P, url) {
  const S = await ouvrir({ page: 'apercu/site/creer.html' });
  await profil({ c: S.c }, S, P);
  await S.goto(url || '/apercu/site/creer.html'); await S.attendre('document.querySelectorAll(".metier-puce").length>5', 15000);
  return S;
}
const prete = D => D.attendre('typeof db!=="undefined" && db && db.demoPublique && typeof currentUser!=="undefined" && currentUser && document.getElementById("content") && typeof current!=="undefined"', 40000);
const patchMsg = S => S.ev(`const o=window.postMessage.bind(window); window.postMessage=function(m,t){ return o(m,location.origin); }; return 1`);

(async () => {
  /* X1 : tout décocher à la main — la base reste ; « Tout cocher » ; « Revenir au conseil du métier » ; la démo n'a de rubrique choisie que la base */
  console.log('\n══ X1 · tout décocher à la main (il n\'existe pas de bouton « Tout décocher »), tout cocher, retour au conseil ══');
  let S = await ouvrirSite(P0);
  try {
    let r = await clic(S, '.metier-puce[data-pack="plomberie"]'); vrai('métier plomberie', r.ok, r);
    await S.attendre('document.querySelectorAll("#rubriques-grille input[data-rub]").length>3', 8000);
    const act = await S.ev('return [...document.querySelectorAll("#rubriques-grille [data-rub-act]")].map(b=>b.getAttribute("data-rub-act")+":"+b.textContent.trim())');
    console.log('   boutons d\'action de la grille : ' + act.join(' | '));
    vrai('(population) deux boutons seulement : tout cocher / conseil — AUCUN « Tout décocher »', act.length === 2 && act.some(x => /^tout:/.test(x)) && act.some(x => /^conseil:/.test(x)), act);
    const n0 = await S.ev('return document.querySelectorAll("#rubriques-grille input[data-rub]").length');
    const coches = await S.ev('return [...document.querySelectorAll("#rubriques-grille input[data-rub]")].filter(i=>i.checked).map(i=>i.getAttribute("data-rub"))');
    for (const k of coches) { const d = await clic(S, `input[data-rub="${k}"]`, { attente: 80 }); if (!d.ok) vrai('décoche ' + k, false, d); }
    const apres = await S.ev('return [...document.querySelectorAll("#rubriques-grille input[data-rub]")].filter(i=>i.checked).length');
    vrai('(population ' + coches.length + ' décochées sur ' + n0 + ') plus aucune case cochée', coches.length >= 10 && apres === 0, apres);
    const u = new URL(await S.ev('return document.getElementById("tester-app").href')); const cats = (u.searchParams.get('cats') || '').split(',').filter(Boolean);
    const base = await S.ev('return JSON.parse(document.getElementById("referentiel-metiers").textContent).base');
    vrai('⛔ le lien « Tester » garde EXACTEMENT la base (' + cats.length + ' rubriques)', cats.length === base.length && base.every(k => cats.indexOf(k) >= 0), cats);
    const garde = await S.ev('return [...document.querySelectorAll("#rubriques-grille [data-rub-base]")].length');
    vrai('   et la page montre toujours les 8 « incluses »', garde === 8, garde);
    await clic(S, '[data-rub-act="tout"]');
    const tout = await S.ev('return [...document.querySelectorAll("#rubriques-grille input[data-rub]")].filter(i=>i.checked).length');
    vrai('« Tout cocher » : toutes les cases (' + tout + '/' + n0 + ')', tout === n0, tout);
    await clic(S, '[data-rub-act="conseil"]');
    const cons = await S.ev('return [...document.querySelectorAll("#rubriques-grille input[data-rub]")].filter(i=>i.checked).length');
    vrai('« Revenir au conseil du métier » : retour aux cochées d\'arrivée (obtenu ' + cons + ', arrivée ' + coches.length + ')', cons === coches.length, cons);
    // démo avec la base seule : toute rubrique hors base porte le bandeau
    for (const k of coches) await clic(S, `input[data-rub="${k}"]`, { attente: 60 });
    await patchMsg(S);
    r = await clic(S, '#tester-app', { attente: 600 }); vrai('Tester (base seule)', r.ok, r);
    const D = await onglet(S, '127.0.0.1');
    vrai('la démo s\'ouvre', !!D);
    if (D) { try {
      await profil(D, S, P0); await D.c.envoyer('Page.navigate', { url: S.BASE + '/apercu/demo.html?' + u.searchParams.toString() });
      vrai('la démo (base seule) est prête', await prete(D));
      const toutes = await D.ev('return catsConnues().slice()'); const parents = await D.ev('return JSON.parse(JSON.stringify(typeof VUE_PARENT==="object"?VUE_PARENT:{}))');
      let sans = 0, avec = 0, bornes = 0;
      for (const k of toutes) {
        const v = await D.ev(`try{closeModal()}catch(e){} go(${JSON.stringify(k)}); await new Promise(r=>setTimeout(r,800)); return {cur:current, b:!!document.getElementById('demo-nonchoisie')}`);
        if (v.cur !== k) { bornes++; continue; }
        const p = parents[k] || k; const attendu = base.indexOf(p) < 0 && toutes.indexOf(p) >= 0;
        if (v.b !== attendu) vrai('rubrique ' + k + ' : bandeau ' + v.b + ' (attendu ' + attendu + ')', false); else if (v.b) avec++; else sans++;
      }
      vrai('(population) ' + toutes.length + ' rubriques : ' + avec + ' avec bandeau, ' + sans + ' sans (la base + les toujours), ' + bornes + ' non atteintes — aucune erreur de verdict', avec >= 10 && sans >= 8);
      vrai('aucune exception dans la démo', D.exceptions.length === 0, D.exceptions);
    } finally { try { await D.c.envoyer('Page.close'); } catch (e) { /* idem */ } } }
  } finally { S.fermer(); }

  /* X2 : la démo SANS cats (lien des pages métier) : aucun bandeau, aucune marque dans le menu */
  console.log('\n══ X2 · la démo sans `cats` (lien « Essayer la démo plombier ») ══');
  S = await ouvrirSite(P0, '/apercu/demo.html?metier=plomberie');
  try {
    vrai('la démo (sans cats) est prête', await prete(S));
    const toutes = await S.ev('return catsConnues().slice()');
    let b = 0, atteintes = 0;
    for (const k of toutes) { const v = await S.ev(`try{closeModal()}catch(e){} go(${JSON.stringify(k)}); await new Promise(r=>setTimeout(r,500)); return {cur:current, b:document.querySelectorAll('#demo-nonchoisie').length}`); if (v.cur === k) atteintes++; b += v.b; }
    const menu = await S.ev('return {legende:document.querySelectorAll(".demo-legende").length, marques:document.querySelectorAll("[data-nonchoisie]").length, items:document.querySelectorAll(".nav-item[data-view]").length}');
    vrai('(population) ' + atteintes + ' rubriques visitées sur ' + toutes.length + ', menu de ' + menu.items + ' entrées', atteintes >= 20 && menu.items >= 15);
    vrai('⛔ aucun bandeau « non sélectionnée », aucune légende, aucune marque dans le menu', b === 0 && menu.legende === 0 && menu.marques === 0, { b, menu });
    vrai('aucune exception', S.exceptions.length === 0, S.exceptions); vrai('aucune requête hors 127.0.0.1', S.exterieur.length === 0 && S.reseau.length > 3, S.exterieur);
    await S.goto('/apercu/demo.html?metier=plomberie&variante=<script>&cats=zzz,__proto__,planning,../x');
    vrai('une adresse piégée ne casse rien', await prete(S) && S.exceptions.length === 0, S.exceptions);
  } finally { S.fermer(); }

  /* X3 : creer.html?ajouter=<clé> — la sortie de secours quand la démo n'a pas d'onglet d'origine */
  console.log('\n══ X3 · creer.html?ajouter=<clé> ══');
  S = await ouvrirSite(P0, '/apercu/site/creer.html?ajouter=historique');
  try {
    const m0 = await S.ev('const m=document.getElementById("rubrique-ajoutee"); return m&&!m.hidden?m.textContent:null');
    vrai('sans métier choisi, la page le dit : ' + m0, /Choisissez d.abord votre métier/.test(m0 || ''), m0);
    let r = await clic(S, '.metier-puce[data-pack="plomberie"]'); vrai('métier plomberie', r.ok, r);
    await dormir(400);
    const m1 = await S.ev('const m=document.getElementById("rubrique-ajoutee"); const i=document.querySelector("input[data-rub=historique]"); return {t:m&&!m.hidden?m.textContent:null, c:i&&i.checked}');
    vrai('⛔ le métier choisi, la rubrique en attente est cochée et le message le dit (« historique » est déjà dans le conseil : « déjà dans votre demande »)', m1.c === true && /(Rubrique ajoutée|déjà dans votre demande)/.test(m1.t || ''), m1);
    await S.goto('/apercu/site/creer.html'); await S.attendre('document.querySelectorAll(".metier-puce").length>5', 8000);
    await clic(S, '.metier-puce[data-pack="plomberie"]');
    await S.goto('/apercu/site/creer.html?ajouter=zzzInconnue'); await S.attendre('document.querySelectorAll(".metier-puce").length>5', 8000);
    const m2 = await S.ev('const m=document.getElementById("rubrique-ajoutee"); return m&&!m.hidden?m.textContent:null');
    vrai('une clé inconnue ne coche rien et le dit : ' + m2, /n.est pas proposée/.test(m2 || '') || /Choisissez d.abord/.test(m2 || ''), m2);
    await S.goto('/apercu/site/creer.html?ajouter=%3Cimg%20src=x%3E'); await dormir(300);
    vrai('une clé hostile est ignorée sans exception', S.exceptions.length === 0, S.exceptions);
    await S.goto('/apercu/site/creer.html'); await S.attendre('document.querySelectorAll(".metier-puce").length>5', 8000);
    await clic(S, '.metier-puce[data-pack="plomberie"]'); await S.attendre('document.querySelectorAll("#rubriques-grille input[data-rub]").length>3', 8000);
    await clic(S, 'input[data-rub="taches"]'); await S.ev('const t=document.querySelector("input[name=c0]"); t.value="Dupont"; t.dispatchEvent(new Event("input",{bubbles:true})); return 1');
    const avantCoche = await S.ev('return document.querySelector("input[data-rub=taches]").checked');
    await S.ev('const a=document.createElement("a"); a.id="zz-secours"; a.href="/apercu/site/creer.html?ajouter=historique"; a.target="_blank"; a.rel="opener"; a.textContent="secours"; a.style.cssText="display:block;padding:20px;position:relative;z-index:99999;background:#fff;color:#000"; document.getElementById("tester-bloc").appendChild(a); return 1');
    await clic(S, '#zz-secours', { attente: 600 });
    const T = await onglet(S, 'creer.html?ajouter', true);
    if (T) { try { await profil(T, S, P0); await dormir(1500);
      const e = await T.ev('const g=(k)=>{const i=document.querySelector("input[data-rub="+k+"]");return i&&i.checked}; const mp=document.querySelector(".metier-puce[aria-pressed=true]"); return {nom:document.querySelector("input[name=c0]").value, taches:g("taches"), historique:g("historique"), metier:mp&&mp.getAttribute("data-pack")}');
      vrai('⛔ l\'onglet ouvert depuis le site retrouve le formulaire (métier, nom saisi, case décochée) ET coche la rubrique ajoutée (avant : taches=' + avantCoche + ')', avantCoche === false && e.metier === 'plomberie' && e.nom === 'Dupont' && e.taches === false && e.historique === true, e);
    } finally { try { await T.c.envoyer('Page.close'); } catch (e) { /* idem */ } } } else vrai('onglet de repli ouvert', false);
  } finally { S.fermer(); }

  /* X4 : changer de métier d'un onglet de démo à l'autre (la fenêtre « Passer à ce métier ? ») */
  console.log('\n══ X4 · deux essais de métiers différents dans le même navigateur ══');
  S = await ouvrirSite(P0);
  try {
    await clic(S, '.metier-puce[data-pack="plomberie"]'); await patchMsg(S);
    await clic(S, '#tester-app', { attente: 600 });
    const D1 = await onglet(S, '127.0.0.1'); await profil(D1, S, P0);
    const href1 = await S.ev('return document.getElementById("tester-app").href'); await D1.c.envoyer('Page.navigate', { url: href1 });
    vrai('première démo (plomberie) prête', await prete(D1));
    /* le même onglet de démonstration passe à un AUTRE métier (celui qu'on a choisi ensuite sur le site) : la page demande « Passer à ce métier ? », on accepte */
    await S.c.envoyer('Page.bringToFront');   // un onglet masqué ne rend aucune image : requestAnimationFrame n'y répond plus
    await clic(S, '.metier-puce[data-pack="chauffage"]'); await clic(S, 'input[name="variante"][value="climatisation"]');
    const href2 = await S.ev('return document.getElementById("tester-app").href');
    await D1.c.envoyer('Page.navigate', { url: href2 });
    vrai('seconde démo (chauffage / climatisation) prête', await prete(D1));
    const D2 = D1;
    const m = await D2.ev('return db.metier');
    vrai('la seconde démo est bien en climatisation (db.metier=' + m + '), fenêtre de confirmation : ' + JSON.stringify(D2.dialogues), m === 'climatisation');
    vrai('aucune exception', D2.exceptions.length === 0 && S.exceptions.length === 0, D2.exceptions.concat(S.exceptions));
    try { await D2.c.envoyer('Page.close'); } catch (e) { /* idem */ }
  } finally { S.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
