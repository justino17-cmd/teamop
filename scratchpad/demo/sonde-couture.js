/* Sonde de la COUTURE site ↔ démonstration (30 octobre 2026) — la page « Créer votre application » de l'aperçu (apercu/site/creer.html) et la démonstration
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
const SCEN = [
  { id: 'plomberie-tel-jour', metier: 'plomberie', l: 390, h: 844, mobile: true, th: 'light' },
  { id: 'plomberie-bureau-nuit', metier: 'plomberie', l: 1440, h: 900, mobile: false, th: 'dark' },
  { id: 'chauffage-deux-tel-nuit', metier: 'chauffage', variante: 'deux', l: 390, h: 844, mobile: true, th: 'dark' },
  { id: 'chauffage-chauffage-bureau-jour', metier: 'chauffage', variante: 'chauffage', l: 1440, h: 900, mobile: false, th: 'light' },
  { id: 'chauffage-climatisation-bureau-jour', metier: 'chauffage', variante: 'climatisation', l: 1440, h: 900, mobile: false, th: 'light' },
  { id: 'chauffage-climatisation-tel-jour', metier: 'chauffage', variante: 'climatisation', l: 390, h: 844, mobile: true, th: 'light' }
];
const VOULUS = (process.argv[2] || '').split(',').filter(Boolean);
const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const UA_BUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };

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
  DEJA_VUS.add(cible.id);
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
  await c.envoyer('Network.enable'); await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable');
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

async function scenario(P) {
  console.log('\n══ ' + P.id + ' ══');
  const S = await ouvrir({ page: 'apercu/site/creer.html' });
  const premier = { c: S.c, ev: S.ev, attendre: S.attendre };
  try {
    await profil(premier, S, P);
    await S.c.envoyer('Page.setLifecycleEventsEnabled', { enabled: true }).catch(() => {});
    await S.goto('/apercu/site/creer.html'); await S.attendre('document.querySelectorAll(".metier-puce").length>5', 15000);
    S.urlPremier = await S.ev('return location.href');
    const nPuces = await S.ev('return document.querySelectorAll(".metier-puce").length');
    vrai('(population) la page propose des métiers (' + nPuces + ')', nPuces >= 10);
    vrai('le bouton « Tester » est caché tant qu\'aucun métier n\'est choisi', await S.ev('return document.getElementById("tester-bloc").hidden===true'));
    // 1. le métier
    let r = await clic(S, `.metier-puce[data-pack="${P.metier}"]`); vrai('clic sur le métier ' + P.metier, r.ok, r);
    await S.attendre('document.querySelectorAll("#rubriques-grille input[data-rub]").length>3', 8000);
    if (P.metier === 'chauffage') {
      vrai('chauffage : les trois options apparaissent', await S.ev('const f=document.getElementById("variante-chauffage"); return !f.hidden && f.querySelectorAll("input[name=variante]").length===3 && document.querySelector("input[name=variante]:checked").value==="deux"'));
      const v = await clic(S, `input[name="variante"][value="${P.variante}"]`); vrai('clic sur l\'option « ' + P.variante + ' »', v.ok, v);
      if (v.ok) { vrai('   cible tactile de l\'option ≥ 44 px (' + Math.round(v.h) + ' px de haut)', !P.mobile || v.h >= 44, v); }
    } else {
      vrai(P.metier + ' : AUCUNE option de variante n\'est montrée', await S.ev('return document.getElementById("variante-chauffage").hidden===true'));
    }
    const etat0 = await S.ev(`const g=document.getElementById('rubriques-grille');
      return {cochables:[...g.querySelectorAll('input[data-rub]')].map(i=>({k:i.getAttribute('data-rub'),c:i.checked,d:i.disabled})),
        base:[...g.querySelectorAll('[data-rub-base]')].map(e=>e.getAttribute('data-rub-base')),
        toujours:[...g.querySelectorAll('.rub-toujours .rub-ligne')].map(e=>e.getAttribute('data-rub-base')||e.textContent.trim().slice(0,20)),
        bases:(JSON.parse(document.getElementById('referentiel-metiers').textContent).base||[])}`);
    console.log('   cases cochables : ' + etat0.cochables.length + ' (cochées ' + etat0.cochables.filter(x => x.c).length + ') · base montrée : ' + etat0.base.join(','));
    vrai('(population) la base du référentiel compte 8 rubriques et la page les montre toutes en « incluses »', etat0.bases.length === 8 && etat0.base.length === 8 && etat0.bases.every(k => etat0.base.indexOf(k) >= 0), [etat0.bases, etat0.base]);
    vrai('⛔ aucune rubrique de base n\'est une case décochable', etat0.cochables.every(x => etat0.bases.indexOf(x.k) < 0));
    // 2. décocher deux rubriques cochées
    const aDecocher = etat0.cochables.filter(x => x.c && !x.d).slice(0, 2).map(x => x.k);
    vrai('(population) deux rubriques cochées à décocher', aDecocher.length === 2, etat0.cochables.length);
    for (const k of aDecocher) { const d = await clic(S, `input[data-rub="${k}"]`); vrai('   décoche « ' + k + ' » (clic qui touche)', d.ok, d); }
    const etat1 = await S.ev(`return [...document.querySelectorAll('#rubriques-grille input[data-rub]')].filter(i=>i.checked).map(i=>i.getAttribute('data-rub'))`);
    vrai('   les deux sont décochées, les autres non', aDecocher.every(k => etat1.indexOf(k) < 0) && etat1.length === etat0.cochables.filter(x => x.c).length - 2, etat1);
    // 3. le lien
    const href = await S.ev('const a=document.getElementById("tester-app"); return {h:a.href, r:a.getAttribute("rel"), t:a.getAttribute("target"), vis:!document.getElementById("tester-bloc").hidden, ht:a.getBoundingClientRect().height}');
    const u = new URL(href.h); const cats = (u.searchParams.get('cats') || '').split(',');
    vrai('le lien vise la démo de l\'aperçu, rel=opener, nouvel onglet', u.pathname === '/apercu/demo.html' && href.r === 'opener' && href.t === '_blank' && href.vis, href);
    vrai('le lien porte le métier' + (P.variante ? ' et la variante « ' + P.variante + ' »' : ' (et AUCUNE variante)'), u.searchParams.get('metier') === P.metier && (P.variante ? u.searchParams.get('variante') === P.variante : !u.searchParams.has('variante')), u.search);
    vrai('⛔ cats = la base (8) + les cochées, sans les deux décochées', etat0.bases.every(k => cats.indexOf(k) >= 0) && aDecocher.every(k => cats.indexOf(k) < 0) && etat1.every(k => cats.indexOf(k) >= 0), cats);
    vrai('   cible tactile du bouton « Tester » ≥ 44 px (' + Math.round(href.ht) + ')', href.ht >= 44);
    // 4. mesures sur la page du site (avant d'ouvrir la démo)
    const deb = await debordement(S, P.l); vrai('la page du site ne déborde pas de côté (2 lectures à 700 ms ; sx=' + deb.b.sx + ', scrollWidth ' + deb.b.sw + ' / posé ' + P.l + ')', !deb.deborde, deb);
    if (P.mobile) {
      const petites = await S.ev(`const out=[]; const f=document.getElementById('demande'); let n=0;
        for(const e of f.querySelectorAll('button,a[href],input[type=checkbox],input[type=radio],label.variante-opt,label.rub-ligne,.rub-ligne label,.metier-puce,.besoin')){
          const b=e.getBoundingClientRect(); if(b.width<1||b.height<1) continue; n++;
          const cible=e.closest('label')||e; const c=cible.getBoundingClientRect();
          if(Math.min(c.width,c.height)<44) out.push((e.className||e.tagName)+':'+Math.round(c.width)+'x'+Math.round(c.height)+' « '+(e.textContent||e.name||'').trim().slice(0,28)+' »');}
        return {n,out:[...new Set(out)]}`);
      vrai('(population ' + petites.n + ') cibles tactiles du formulaire toutes ≥ 44 px (hors liens dans le texte)', petites.n > 20 && petites.out.length === 0, petites.out.slice(0, 8));
    }
    // 5. patch de la cible du postMessage + ouverture de la démo
    await S.ev(`const o=window.postMessage.bind(window); window.postMessage=function(m,t){ window.__recus=(window.__recus||[]); window.__recus.push([m,t]); return o(m,location.origin); }; return 1`);
    r = await clic(S, '#tester-app', { attente: 600 }); vrai('clic sur « Tester l\'application »', r.ok, r);
    const D = await onglet(S, '127.0.0.1');
    vrai('la démonstration s\'ouvre dans un NOUVEL onglet', !!D);
    if (!D) return;
    try {
      await profil(D, S, P);
      await D.c.envoyer('Page.navigate', { url: href.h }).catch(() => {});
      const pret = await D.attendre('typeof db!=="undefined" && db && db.demoPublique && typeof currentUser!=="undefined" && currentUser && document.getElementById("content") && typeof current!=="undefined"', 40000);
      vrai('la démo est ouverte sur l\'application (pas sur le choix du métier)', pret, await D.ev('return location.href + " | " + (document.body.innerText||"").slice(0,120)').catch(() => '?'));
      if (!pret) return;
      await D.ev(`try{ closeModal(); }catch(e){} try{ const t=document.getElementById('toast'); if(t) t.classList.remove('show'); }catch(e){} return 1`);
      const info = await D.ev('return {metier:db.metier, dp:db.demoPublique, href:location.href, opener:!!window.opener, titre:document.title}');
      const attendu = P.metier === 'chauffage' ? (P.variante === 'climatisation' ? ['climatisation'] : ['chauffage']) : [P.metier];
      vrai('la démo prend le bon métier : db.metier=' + info.metier + ' (attendu ' + attendu[0] + '), exemple ' + JSON.stringify(info.dp && { metier: info.dp.metier, plus: info.dp.plus }),
        attendu.indexOf(info.metier) >= 0 && info.dp && info.dp.metier === attendu[0], info);
      if (P.metier === 'chauffage') vrai('   « les deux » = chauffage + complément climatisation ; les autres sans complément', (P.variante === 'deux') === (info.dp.plus === 'climatisation'), info.dp);
      vrai('   la démo a gardé un onglet d\'origine (window.opener)', info.opener === true);
      // 6. chaque rubrique du métier : bandeau sur les non cochées, pas sur les cochées
      const toutes = await D.ev('return catsConnues().slice()');
      const refK = await S.ev(`const r=JSON.parse(document.getElementById('referentiel-metiers').textContent); return Object.keys(r.metiers['${P.metier}']? r.rubriques : r.rubriques)`);
      const verdicts = [];
      const parents = await D.ev('return JSON.parse(JSON.stringify(typeof VUE_PARENT==="object"?VUE_PARENT:{}))');
      const parentDe = k => parents[k] || k;
      for (const k of toutes) {
        const v = await D.ev(`try{ closeModal(); }catch(e){} go(${JSON.stringify(k)}); await new Promise(r=>setTimeout(r,900));
          const n=document.getElementById('demo-nonchoisie'); const c=document.getElementById('content');
          return {k:${JSON.stringify(k)}, current:current, bandeau:!!n, dk:n&&n.getAttribute('data-k'), txt:n?n.querySelector('.demo-txt').textContent:'', bouton:n?!!n.querySelector('button.demo-ajout'):false,
            nbBandeaux:document.querySelectorAll('#demo-nonchoisie').length, haut:c&&c.firstElementChild&&c.firstElementChild.id, nav:(document.querySelector('.nav-item[data-view="${k}"]')||{}).getAttribute?document.querySelector('.nav-item[data-view="${k}"]').getAttribute('data-nonchoisie'):null}`);
        verdicts.push(v);
      }
      const atteints = verdicts.filter(v => v.current === v.k || v.bandeau);
      const nonCochees = verdicts.filter(v => cats.indexOf(parentDe(v.k)) < 0 && toutes.indexOf(parentDe(v.k)) >= 0), cochees = verdicts.filter(v => !(cats.indexOf(parentDe(v.k)) < 0 && toutes.indexOf(parentDe(v.k)) >= 0));
      console.log('   rubriques de la démo : ' + toutes.length + ' · atteintes ' + atteints.length + ' · hors demande ' + nonCochees.length + ' · dans la demande ' + cochees.length);
      vrai('(population) la démo propose des rubriques et on en a atteint la majorité', toutes.length >= 15 && atteints.length >= toutes.length * 0.6, verdicts.filter(v => v.current !== v.k).map(v => v.k + '→' + v.current));
      vrai('(population) il y a des rubriques non cochées ET des cochées à comparer', nonCochees.length >= 2 && cochees.length >= 8, [nonCochees.length, cochees.length]);
      const fauxPos = cochees.filter(v => v.bandeau), fauxNeg = nonCochees.filter(v => v.current === v.k && !v.bandeau);
      vrai('⛔ AUCUNE rubrique cochée (base comprise) ne porte le bandeau « non sélectionnée »', fauxPos.length === 0, fauxPos.map(v => v.k));
      vrai('⛔ TOUTE rubrique non cochée atteinte porte le bandeau (' + nonCochees.filter(v => v.current === v.k).length + ' vérifiées)', fauxNeg.length === 0 && nonCochees.some(v => v.bandeau), fauxNeg.map(v => v.k));
      const b0 = nonCochees.find(v => v.bandeau);
      vrai('   le texte dit « Vous n’avez pas sélectionné cette rubrique » avec le bouton « L\'ajouter à ma demande », un seul bandeau', !!b0 && /Vous n’avez pas sélectionné cette rubrique/.test(b0.txt) && b0.bouton && b0.nbBandeaux === 1, b0);
      vrai('   les deux décochées sur le site portent bien le bandeau dans la démo', aDecocher.every(k => { const v = verdicts.find(x => x.k === k); return v && v.bandeau; }), aDecocher.map(k => (verdicts.find(x => x.k === k) || {}).bandeau));
      // 7. mesures dans la démo
      const dd = await debordement(D, P.l); vrai('la démo ne déborde pas de côté sur une rubrique non cochée (sx=' + dd.b.sx + ' sw=' + dd.b.sw + ')', !dd.deborde, dd);
      // 8. « L'ajouter à ma demande » (vrai clic)
      const cible = aDecocher[0];
      await D.ev(`try{ closeModal(); }catch(e){} go(${JSON.stringify(cible)}); await new Promise(r=>setTimeout(r,700)); return current`);
      const tailleBouton = await D.ev(`const b=document.querySelector('#demo-nonchoisie button.demo-ajout'); const r=b.getBoundingClientRect(); return {w:r.width,h:r.height}`);
      console.log('   bouton « L\'ajouter » : ' + Math.round(tailleBouton.w) + ' × ' + Math.round(tailleBouton.h) + ' px');
      vrai('   cible tactile du bouton « L\'ajouter à ma demande » ≥ 44 px', tailleBouton.h >= 44, tailleBouton);
      const cl = await clic(D, '#demo-nonchoisie button.demo-ajout', { attente: 700 }); vrai('clic sur « L\'ajouter à ma demande » (' + cible + ')', cl.ok, cl);
      const apres = await S.ev(`const i=document.querySelector('#rubriques-grille input[data-rub="${cible}"]'); const m=document.getElementById('rubrique-ajoutee');
        return {coche:i&&i.checked, msg:m&&!m.hidden?m.textContent:null, href:document.getElementById('tester-app').href, recus:window.__recus||[]}`);
      vrai('⛔ retour sur le site : la case « ' + cible + ' » est cochée', apres.coche === true, apres);
      vrai('   le message le dit : « ' + apres.msg + ' »', /Rubrique ajoutée à votre demande/.test(apres.msg || ''), apres.msg);
      vrai('   le message porte {type:\'teamop-demo\', action:\'ajouter-rubrique\', rubrique, v:1} et la démo vise bien https://teamop.fr', apres.recus.length >= 1 && apres.recus[0][0].type === 'teamop-demo' && apres.recus[0][0].v === 1 && apres.recus[0][0].rubrique === cible && apres.recus[0][1] === 'https://teamop.fr', apres.recus);
      vrai('   le lien « Tester » a suivi (la rubrique est dans cats)', (new URL(apres.href).searchParams.get('cats') || '').split(',').indexOf(cible) >= 0);
      // une rubrique cochée n'a pas de bandeau ; une déjà ajoutée non plus après relecture
      await D.ev(`go(${JSON.stringify(cible)}); await new Promise(r=>setTimeout(r,500)); return 1`);
      // 9. réseau et erreurs, deux onglets
      vrai('⛔ aucune requête hors 127.0.0.1 depuis la démo (' + D.reseau.length + ' vues)', D.reseau.length > 3 && D.exterieur.length === 0, D.exterieur.slice(0, 5));
      vrai('aucune exception JavaScript dans la démo', D.exceptions.length === 0, D.exceptions.slice(0, 4));
      vrai('aucune erreur de console dans la démo', D.erreurs.length === 0, D.erreurs.slice(0, 4));
    } finally { try { await D.c.envoyer('Page.close'); } catch (e) { /* idem */ } }
    vrai('aucune exception JavaScript sur le site', S.exceptions.length === 0, S.exceptions.slice(0, 4));
    vrai('aucune erreur de console sur le site', S.erreurs.length === 0, S.erreurs.slice(0, 4));
    vrai('⛔ aucune requête hors 127.0.0.1 depuis le site (' + S.reseau.length + ' vues)', S.reseau.length > 5 && S.exterieur.length === 0, S.exterieur.slice(0, 5));
  } finally { S.fermer(); }
}

(async () => {
  for (const P of SCEN) if (!VOULUS.length || VOULUS.some(v => P.id.indexOf(v) >= 0)) await scenario(P);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
