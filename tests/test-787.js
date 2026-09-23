/* ══ NOUVELLES ENTREPRISES : TOUT VIDE — LES CATALOGUES FOURNISSEURS RESTENT CHEZ QUI LES A DÉJÀ ══
   Justin, 23 septembre 2026 : « chaque entreprise démarre avec tout vide, c'est à eux de remplir, on
   fait plus ce travail […] le 3D, c'est ELAN qui nous l'avait demandé, on l'a fait pour eux, on le
   fera pas pour les autres. »

   Les portes AUTOMATIQUES étaient déjà fermées (PACK_METIER_AUTO=false, mesuré le 22 septembre : un
   appareil neuf reçoit 0 produit, 0 fournisseur). Restaient trois portes MANUELLES vers les 2 809
   références des cinq catalogues (CATFOUR), ouvertes à toute entreprise : 🏭 Fournisseurs sur
   l'écran Produits, le pont de la recherche (« 12 produits dans les catalogues fournisseurs —
   ＋ Ajouter »), et l'onglet Fournisseurs de la box.

   Ce banc EXÉCUTE les vraies fonctions extraites d'app.html — la règle et chacune des portes — sur
   quatre entreprises : une neuve, une qui a tout saisi elle-même (des noms qui COÏNCIDENT avec le
   catalogue), une qui s'en sert déjà, et ELAN (pack en place). Puis il vérifie que l'écran suit. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
/* la plus courte tranche qui se compile, à partir d'une ancre de CODE */
function dec(h) { const d = APP.indexOf(h); if (d < 0) return ''; for (let i = d; i < d + 20000; i++) { if (APP[i] !== '}' && APP[i] !== ';') continue; const b = APP.slice(d, i + 1); try { new Function(b); return b; } catch (e) { } } return ''; }
function cst(n) { const i = APP.indexOf('const ' + n + '='); if (i < 0) return ''; const fin = APP.indexOf('];', i); return APP.slice(i, fin + 2); }
function obj(n) { const i = APP.indexOf('const ' + n + '={'); if (i < 0) return ''; let p = 0; const d = APP.indexOf('{', i); for (let j = d; j < APP.length; j++) { if (APP[j] === '{') p++; else if (APP[j] === '}') { p--; if (!p) return APP.slice(i, j + 2); } } return ''; }

console.log('\n── 787 · 0. la population ──');
const PIECES = {
  CATFOUR: cst('CATFOUR'), CATALOGUE: cst('CATALOGUE'), FOURNISSEURS_3D: cst('FOURNISSEURS_3D'), METIERS: obj('METIERS'),
  pack1: dec("METIERS['3d'].catalogue=CATALOGUE;"), pack2: dec("METIERS['3d'].fournisseurs=FOURNISSEURS_3D;"),
  metierPackDe: dec('function metierPackDe(base){'), produitCle: dec('function produitCle(p){'),
  catalogueEnPlace: dec('function catalogueEnPlace(){'), cles: dec('let CATFOUR_CLES=null;'), regle: dec('function cataloguesFournisseurs(){'),
  ferme: dec('const CATFOUR_FERME='), openFourCat: dec('function openFourCat(){'), fcMatches: dec('function fcMatches(){'),
  fcAdd: dec('function fcAdd(i,btn){'), fcAddAll: dec('function fcAddAll(){'), prdCatalogueTrouve: dec('function prdCatalogueTrouve(q){'),
  bxpOngletChoisir: dec('function bxpOngletChoisir(o){'),
};
v('toutes les pièces sont trouvées dans le fichier réel', Object.keys(PIECES).filter(k => !PIECES[k]), []);
v('une seule définition de la règle', SRC.split('function cataloguesFournisseurs(').length - 1, 1);
vrai('les portes AUTOMATIQUES restent fermées (PACK_METIER_AUTO)', /\nconst PACK_METIER_AUTO = false;/.test(APP));

/* Le bac à sable : les vraies fonctions, et des témoins pour ce qu'elles déclenchent. */
function entreprise(base) {
  const t = { modal: 0, crees: [], toasts: [], onglet: 'ajouter' };
  const code = Object.values(PIECES).join('\n');
  const f = new Function('etat', 't', `let db=etat.db; const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    let fcFour='', fcQ='', fcMax=80, bxpOnglet='ajouter', bxpRetPhase=0;
    const openModal=()=>{ t.modal++; }, renderFourCatChips=()=>{}, renderFourCat=()=>{}, bxpRendre=()=>{ t.onglet=bxpOnglet; };
    const toast=m=>t.toasts.push(m), save=()=>{}, logEvent=()=>{}, confirm=()=>true, rechDiffere=f=>f();
    const idCatalogue=n=>'cat_'+norm(n).replace(/[^a-z0-9]+/g,'-'), rangerCatFour=()=>'Divers';
    const produitCreer=(p)=>{ t.crees.push(p.nom); db.produits.push(p); return p; };
    ${code}
    return { cataloguesFournisseurs, catalogueEnPlace, openFourCat, fcAdd, fcAddAll, prdCatalogueTrouve, bxpOngletChoisir, CATFOUR, CATALOGUE, norm,
      fixer:(q,f)=>{ fcQ=q; fcFour=f||''; } };`);
  const g = f({ db: base }, t); g.t = t; return g;
}
const G0 = entreprise({ produits: [], fournisseurs: [] });
vrai('population : 2 809 références fournisseurs, 160 au pack 3D', G0.CATFOUR.length === 2809 && G0.CATALOGUE.length === 160, [G0.CATFOUR.length, G0.CATALOGUE.length]);
/* des noms du catalogue fournisseur qui NE SONT PAS au pack : sinon le cas « s'en sert déjà »
   passerait par catalogueEnPlace et ne jouerait pas la seconde moitié de la règle */
const packNoms = new Set(G0.CATALOGUE.map(c => G0.norm(c[0]).trim()));
const horsPack = G0.CATFOUR.filter(x => !packNoms.has(G0.norm(x[0]).trim())).map(x => x[0]);
const uniques = [...new Map(horsPack.map(n => [G0.norm(n).replace(/\s+/g, ' ').trim(), n])).values()];
vrai('population : assez de références hors du pack pour jouer les seuils', uniques.length > 2000, uniques.length);
const fiche = (nom, perso) => ({ id: 'x' + G0.norm(nom).replace(/[^a-z0-9]/g, ''), nom, ...(perso ? { perso: true } : {}) });

console.log('\n── 787 · 1. ⛔⛔ la règle : qui garde les catalogues fournisseurs ──');
v('⛔⛔ une entreprise NEUVE : non', G0.cataloguesFournisseurs(), false);
const Gsaisie = entreprise({ produits: uniques.slice(0, 12).map(n => fiche(n, true)), fournisseurs: [] });
v('⛔ une entreprise qui a SAISI douze produits aux noms du catalogue (＋ Produit, ＋ Liste) : non — une coïncidence ne rouvre rien', Gsaisie.cataloguesFournisseurs(), false);
const G4 = entreprise({ produits: uniques.slice(0, 4).map(n => fiche(n, false)), fournisseurs: [] });
v('quatre fiches venues des catalogues : pas assez (le seuil est de cinq, comme « ↻ Catalogue OP »)', G4.cataloguesFournisseurs(), false);
const G5 = entreprise({ produits: uniques.slice(0, 5).map(n => fiche(n, false)), fournisseurs: [] });
v('cinq fiches venues des catalogues : l’entreprise s’en sert déjà, elle les garde', G5.cataloguesFournisseurs(), true);
const Gelan = entreprise({ produits: G0.CATALOGUE.slice(0, 110).map(c => fiche(c[0], false)), fournisseurs: [] });
v('⛔⛔ ELAN (le pack 3D en place) : oui — on ne lui retire rien', [Gelan.catalogueEnPlace(), Gelan.cataloguesFournisseurs()], [true, true]);
const Gnet = entreprise({ metier: 'nettoyage', produits: G0.CATALOGUE.slice(0, 20).map(c => fiche(c[0], true)), fournisseurs: [] });
v('un plombier ou une entreprise de nettoyage, même avec des noms du pack saisis à la main : non', Gnet.cataloguesFournisseurs(), false);

console.log('\n── 787 · 2. ⛔⛔ chaque porte se garde elle-même (une entreprise neuve) ──');
{ const g = entreprise({ produits: [], fournisseurs: [] });
  g.openFourCat();
  vrai('⛔ 🏭 Fournisseurs, appelé directement : aucune fenêtre, et l’écran dit quoi faire', g.t.modal === 0 && g.t.toasts.some(m => /＋ Produit/.test(m) && /＋ Liste/.test(m)), g.t);
  g.fcAdd(0); g.fixer('', 'ORCAD'); g.fcAddAll();
  v('⛔⛔ ni une fiche, ni une gamme entière n’entrent par le navigateur', g.t.crees, []);
  const pont = g.prdCatalogueTrouve(g.norm('insecticide'));
  v('⛔ le pont de la recherche ne propose plus rien (et « ＋ Ajouter les N » n’a rien à poser)', pont, []);
  g.bxpOngletChoisir('four');
  v('⛔ l’onglet Fournisseurs de la box ne s’ouvre pas', g.t.onglet, 'ajouter');
  v('… et la base est restée vide', g.t.crees.length + (g.t.modal), 0); }

console.log('\n── 787 · 3. contre-épreuve : chez ELAN, tout reste ouvert ──');
{ const g = Gelan;
  g.openFourCat(); vrai('🏭 Fournisseurs s’ouvre', g.t.modal === 1, g.t);
  const pont = g.prdCatalogueTrouve(g.norm('insecticide'));
  vrai('le pont de la recherche trouve des références qui ne sont pas encore chez elle', pont.length > 5, pont.length);
  const i = g.CATFOUR.findIndex(x => x[0] === uniques[40]); g.fcAdd(i);
  v('une référence s’ajoute depuis le navigateur', g.t.crees, [uniques[40]]);
  g.bxpOngletChoisir('four'); v('l’onglet Fournisseurs de la box s’ouvre', g.t.onglet, 'four'); }
{ const g = entreprise({ produits: uniques.slice(0, 5).map(n => fiche(n, false)), fournisseurs: [] });
  g.openFourCat(); vrai('… et chez une entreprise qui s’en sert déjà aussi', g.t.modal === 1); }

console.log('\n── 787 · 4. l’écran suit la règle ──');
const vp = dec('views.produits=function(){');
vrai('population : l’écran Produits est trouvé', vp.length > 800, vp.length);
vrai('⛔ le bouton 🏭 Fournisseurs n’est rendu que si la règle le permet', /`\$\{_cf\?'<button class="btn ghost" onclick="openFourCat\(\)">🏭 Fournisseurs<\/button> ':''\}/.test(vp) && /_cf=cataloguesFournisseurs\(\)/.test(vp));
vrai('… et c’est le seul endroit de l’en-tête qui l’appelle', (vp.match(/openFourCat\(\)/g) || []).length === 1);
vrai('les onglets « Mes produits / Catalogue 3D (nuisibles) » n’existent que là où un catalogue a été posé', /\(nbC\?`<div class="filters"/.test(vp) && /if\(!nbC\) prdOnglet='tous';/.test(vp));
const rpl = dec('function renderProduitsList(){');
vrai('un catalogue vide le dit, et dit comment le remplir', /Ton catalogue est vide\. Ajoute tes produits un par un \(＋ Produit\) ou colle ta liste entière \(＋ Liste\)/.test(rpl), rpl.length);
const bxr = dec('function bxpRendre(){');
vrai('⛔ la box ne rend l’onglet Fournisseurs que si la règle le permet', /\$\{cf\?`<div class="chip \$\{bxpOnglet==='four'/.test(bxr) && /if\(!cf&&bxpOnglet==='four'\) bxpOnglet='ajouter';/.test(bxr));
const abp = dec('function renderAbpList(){');
vrai('… et son texte d’appel ne renvoie plus vers un onglet absent', /cf\?'Touche l\\'onglet <b>Fournisseurs<\/b>/.test(abp) && /Un produit qui manque se crée dans <b>Produits<\/b>/.test(abp));
const pose = dec('function bxpPoseEcrire(){');
vrai('⛔ l’écriture de la box ne pose aucune référence fournisseur hors de la règle', /const fourIdx=cataloguesFournisseurs\(\)\?\[\.\.\.bxpFourSel\]\.filter\(i=>CATFOUR\[i\]\):\[\];/.test(pose), pose.length);

console.log('\n── 787 · 5. la mesure dans une vraie page existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-tout-vide.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-tout-vide.js existe', !!SONDE);
vrai('… elle joue l’entreprise neuve PUIS la contre-épreuve (pack posé)', /cataloguePoser\(/.test(SONDE) && /bxp-onglets/.test(SONDE) && /openFourCat/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !!SONDE && !/app\.html/.test(SONDE));

console.log(`\n════ test-787 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
