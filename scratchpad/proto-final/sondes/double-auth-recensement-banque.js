// Sonde « double-auth-recensement-banque » (tour 3 du lot, constat 1 du recontrôle) : la garde « compta-banque » (S5) ne couvrait que l'onglet Banque. Mais la banque se LIT ailleurs :
// les lignes du relevé (libellé, montant), le solde du compte et la trésorerie qui l'additionne s'écrivent dans la Vue d'ensemble, la Clôture du mois, la liste « À faire »,
// le panneau « Expliquer », les mouvements, les lignes de frais des Achats, les écritures qu'une ligne expliquée a posées au journal — et dans le cadre de la Comptabilité (iframe).
// Règle : une donnée de la banque ne s'écrit nulle part tant que la fenêtre de 5 minutes est fermée ; elle revient à la confirmation, et se RE-MASQUE à l'expiration.
// ⛔ Le recensement part des DONNÉES (les libellés de CP_RELEVE, les soldes), JAMAIS d'une liste de vues écrite à la main : on visite tout (rubriques, 25 onglets, panneaux, cadre).
// Population d'abord : fenêtre OUVERTE, les mêmes marques se lisent (sinon « aucune » prouverait un ensemble vide).
// Usage : node double-auth-recensement-banque.js   (PROFIL=mac|iphone|…, NUIT=1)
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = process.env.NUIT === '1';
const avancer = async (c, n) => { await c.p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles:true }))); await S.avancer(c, n); };
/* ce que la page de l'ordinateur écrit : le texte visible (les scripts n'y sont pas), le HTML du contenu et des panneaux */
const MARQUES = () => {
  const n = s => String(s).replace(/[  ]/g, ' '), t = n(document.body.innerText), h = n((document.getElementById('contenu') || {}).innerHTML || '') + n((document.getElementById('calque') || {}).innerHTML || '');
  const K = cxChiffres(), libs = CP_RELEVE.map(r => r.lib);   // le JOURNAL et le grand livre (les livres de l'entreprise, qu'une ligne expliquée a alimentés) ne sont pas dans ce recensement : décision à soumettre à Justin
  const soldes = [eur(K.soldeBq), eur(K.treso)].map(n);
  return { lignes:[...new Set(libs.filter(l => t.includes(l) || h.includes(l)))], soldes:soldes.filter(s => t.includes(s)), verrou:!!document.querySelector('[data-secvue]'), conf:!!document.getElementById('sec-conf') };
};
const MARQUES_CADRE = () => { const n = s => String(s).replace(/[  ]/g, ' '), t = n(document.body.innerText);
  const libs = RELEVE.filter(r => !r.nouveau).map(r => r.lib), nouv = RELEVE.filter(r => r.nouveau).map(r => r.lib), s = n(eur(soldeReleve(AUJ)));
  return { lignes:[...new Set([...libs, ...nouv].filter(l => t.includes(l)))], soldes:t.includes(s) ? [s] : [], route:UI.route }; };
const vu = x => x.lignes.length > 0 || x.soldes.length > 0;
const dire = (nom, x) => nom + ' ' + JSON.stringify({ l:x.lignes.slice(0, 3), s:x.soldes });
(async () => {
  const c = await S.ouvrir({ profil:PROFIL, nuit:NUIT }); await S.tous(c);
  const rg = await S.entrer(c, 'marc'); v('Marc est connecté par le nombre (session non automatique)', rg.ok && await c.p.evaluate(() => SESSION === 'marc' && SECU.sessions.marc.auto === false));
  const fermerConf = async () => { await c.p.evaluate(() => { const b = document.querySelector('#sec-conf [data-sec3="annuler"]'); if (b) b.click(); }); await c.p.waitForTimeout(200); };
  const fermerTout = async () => { await fermerConf(); await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); };
  await avancer(c, 6); await c.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="revenir"], #opsec [data-ops="cacher"]'); if (b && b.offsetParent) b.click(); });
  v('population : la fenêtre de 5 minutes est fermée', await c.p.evaluate(() => !secuFenetreValide('marc') && secuMasqueActif()));
  const pop = await c.p.evaluate(() => ({ libs:CP_RELEVE.length, nonExpliquees:cpRapprocher().aExpliquer.length, K:cxChiffres().soldeBq }));
  v('population : 20 lignes de relevé, des lignes à expliquer, un solde', pop.libs >= 20 && pop.nonExpliquees >= 3 && pop.K > 0, JSON.stringify(pop));
  const routes = await c.p.evaluate(() => CATS.flatMap(g => g[1].map(x => x[0])));
  const onglets = await c.p.evaluate(() => CX_NAV.flatMap(g => g[3].map(x => x[0])));
  v('population : au moins 20 rubriques et 20 onglets recensés (depuis CATS et CX_NAV)', routes.length >= 20 && onglets.length >= 20, routes.length + '/' + onglets.length);
  const fuites = [];
  // deux états de données : rien d'expliqué, puis deux lignes de frais expliquées (elles posent une écriture au journal et une ligne aux achats et aux mouvements)
  for (const etat of ['aexpliquer', 'frais']) {
    await fermerTout(); await c.p.evaluate(e => { CP.frais = e === 'frais' ? { r19:true, r20:true } : {}; }, etat);
    for (const r of routes) { await fermerTout(); try { await L.aller(c.p, r); } catch (e) { continue; } await c.p.waitForTimeout(250); await fermerTout(); const x = await c.p.evaluate(MARQUES); if (vu(x)) fuites.push(dire(etat + ':rubrique:' + r, x)); }
    for (const o of onglets) { await avancer(c, 6); await fermerTout(); await c.p.evaluate(() => { cpSysteme = false; }); await L.aller(c.p, 'comptabilite'); await c.p.evaluate(o => { cpSysteme = false; CP.onglet = o; rendre(); }, o); await c.p.waitForTimeout(300);
      const x = await c.p.evaluate(MARQUES); if (vu(x) && !x.verrou) fuites.push(dire(etat + ':onglet:' + o, x)); await fermerTout(); }
  }
  v('aucune rubrique ni onglet n\'écrit une ligne du relevé ou le solde de la banque, fenêtre fermée (rien d\'expliqué, puis des frais expliqués)', fuites.length === 0, fuites.join(' | '));
  // les gestes qui OUVRENT une lecture de la banque : « Expliquer » (À faire), la carte de la clôture
  await c.p.evaluate(() => { CP.frais = {}; cpSysteme = false; }); await avancer(c, 6); await fermerTout();
  const gestes = [];
  for (const o of ['ensemble', 'cloture']) { await avancer(c, 6); await fermerTout(); await L.aller(c.p, 'comptabilite'); await c.p.evaluate(o => { cpSysteme = false; CP.onglet = o; rendre(); }, o); await c.p.waitForTimeout(300);
    const n = await c.p.evaluate(() => document.querySelectorAll('[data-cxaf="expliquer"], [data-cx="sec|banque"], [data-cp="onglet|banque"]').length);
    for (let i = 0; i < n; i++) { await fermerTout(); await c.p.evaluate(({ i }) => { const e = document.querySelectorAll('[data-cxaf="expliquer"], [data-cx="sec|banque"], [data-cp="onglet|banque"]')[i]; if (e) e.click(); }, { i }); await c.p.waitForTimeout(350);
      const x = await c.p.evaluate(MARQUES), conf = await S.conf(c); if (vu(x) && !x.verrou) gestes.push(dire(o + ':geste' + i, x)); if (!conf && !x.verrou && !vu(x)) { /* rien ne s'ouvre : accepté seulement si rien n'est écrit */ } await fermerTout(); } }
  v('« Expliquer » et les cartes qui mènent à la banque n\'écrivent rien avant la confirmation', gestes.length === 0, gestes.join(' | '));
  await avancer(c, 6); await fermerTout(); await L.aller(c.p, 'comptabilite'); await c.p.evaluate(() => { cpSysteme = false; CP.onglet = 'ensemble'; rendre(); }); await c.p.waitForTimeout(300);
  await c.p.evaluate(() => { const b = document.querySelector('[data-cxaf="expliquer"]'); if (b) b.click(); }); await c.p.waitForTimeout(500);
  const conf = await S.conf(c); v('« Expliquer » (À faire) ouvre la confirmation, avec la phrase de la banque', !!conf && /banque/.test(conf.texte), conf && conf.texte.slice(0, 140));
  // le cadre de la Comptabilité : l'iframe est un second document ; sa banque a sa propre garde, mais ses autres écrans lisent le même relevé
  const cadre = [];
  await fermerTout(); await avancer(c, 6); await c.p.evaluate(() => { cpSysteme = true; cpSysDe = 'accueil'; aller('comptabilite'); }); await c.p.waitForTimeout(2500);
  const fr = c.p.frames().find(f => /prototype-comptabilite/.test(f.url()));
  v('population : le cadre de la Comptabilité est ouvert', !!fr);
  if (fr) {
    await fr.waitForFunction(() => typeof UI !== 'undefined' && typeof RELEVE !== 'undefined' && RELEVE.length > 10, null, { timeout:15000 }).catch(() => {});
    const routesCadre = await fr.evaluate(() => (typeof ROUTES !== 'undefined' ? Object.keys(ROUTES) : [...document.querySelectorAll('#menu [data-r]')].map(b => b.dataset.r)));
    v('population : des écrans du cadre recensés', routesCadre.length >= 8, routesCadre.length);
    for (const r of routesCadre) { if (r === 'banque') continue; await fermerConf(); try { await fr.evaluate(r => { aller(r); }, r); } catch (e) { continue; } await c.p.waitForTimeout(250); const x = await fr.evaluate(MARQUES_CADRE); if (vu(x)) cadre.push(dire('cadre:' + r, x)); }
    v('aucun écran du cadre (hors son onglet Banque, gardé) n\'écrit une ligne du relevé ou le solde, fenêtre fermée', cadre.length === 0, cadre.join(' | '));
    await fermerConf(); await fr.evaluate(() => { aller('banque'); }); await c.p.waitForTimeout(500);
    const xb = await fr.evaluate(MARQUES_CADRE); v('le cadre : son onglet Banque ne s\'écrit pas non plus avant la confirmation', !vu(xb), dire('banque', xb));
  }
  // la contre-épreuve : la fenêtre OUVERTE, les mêmes marques se lisent (population non vide), puis se re-masquent à l'expiration
  await c.p.evaluate(() => { cpSysteme = false; }); await avancer(c, 6); await fermerTout(); await L.aller(c.p, 'comptabilite'); await c.p.evaluate(() => { cpSysteme = false; CP.onglet = 'banque'; rendre(); }); await c.p.waitForTimeout(500);
  const cf = await S.conf(c); v('contre-épreuve : la confirmation s\'ouvre sur la Banque', !!cf); await S.confirmer(c, 'marc'); await c.p.waitForTimeout(600);
  let x = await c.p.evaluate(MARQUES); v('contre-épreuve : fenêtre ouverte, la banque se lit (lignes ET solde)', x.lignes.length >= 15 && x.soldes.length >= 1, dire('banque', x));
  for (const o of ['ensemble', 'cloture']) { await c.p.evaluate(o => { CP.onglet = o; rendre(); }, o); await c.p.waitForTimeout(1500); /* la fenêtre se surveille à la seconde : le tic doit la voir ouverte avant de la voir fermée */ x = await c.p.evaluate(MARQUES);
    v('fenêtre ouverte : « ' + o + ' » montre les lignes à expliquer', x.lignes.length >= 3, dire(o, x)); await avancer(c, 6); await c.p.waitForTimeout(600); x = await c.p.evaluate(MARQUES);
    v('à l\'expiration des 5 minutes, « ' + o + ' » se re-masque tout seul (rien de la banque ne reste écrit)', !vu(x), dire(o, x)); await fermerTout(); await c.p.evaluate(() => { SECU.confirmeA.marc = secuMaint(); }); }
  await c.p.evaluate(() => { CP.onglet = 'ensemble'; rendre(); }); await c.p.waitForTimeout(300); await c.p.evaluate(() => { const b = document.querySelector('[data-cxaf="expliquer"]'); if (b) b.click(); }); await c.p.waitForTimeout(1500);
  x = await c.p.evaluate(MARQUES); v('fenêtre ouverte : le panneau « Expliquer » montre les lignes', x.lignes.length >= 3, dire('panneau', x));
  await avancer(c, 6); await c.p.waitForTimeout(600); x = await c.p.evaluate(MARQUES); v('à l\'expiration, le panneau « Expliquer » se ferme (rien de la banque ne reste écrit)', !vu(x), dire('panneau', x));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('EXC', e.message.slice(0, 600)); process.exit(1); });
