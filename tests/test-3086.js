/* ══ test-3086 · BÊTA v777 — CHOISIR N'IMPORTE QUEL MÉTIER POUR LE TESTER ═══════════════════════════════════════════
   Justin, 28 octobre 2026 : « dans OPG bêta je veux pouvoir choisir le style d'entreprise, que ce soit de la dératisation,
   la clim, le chauffage, enfin tout… je choisis le pack directement pour tester ». Trois règles :
   1. la carte « 🧪 Outils de bêta » porte « 🧰 Tester un métier » : les packs (METIERS_ORDRE, 24 depuis la climatisation, plus les packs combinés), un geste → metierSet
      (journal, « ↩︎ Annuler ») ; et « Mon métier » montre les 23 cartes sur la bêta (`equipeTeamOP()||BETA_ESSAI`) ;
   2. ⛔ dans app.html, BETA_ESSAI vaut false : une entreprise ne voit toujours que SON métier — joué, pas relu ;
   3. « Remplir en grand nombre » prend les types du pack choisi (`intTypes()`), plus INT_TYPES (la 3D) : un pack se juge
      sur un écran plein de SES interventions. Joué : la VRAIE betaRemplir, pour trois packs.
   Au navigateur : scratchpad/metiers/sonde-choix-beta.js (17 ✓ — le sélecteur change le pack, l'écran le montre actif). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const BETA = lire('beta.html');
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
/* une déclaration de premier niveau, par appariement d'accolades */
function bloc(src, debut) {
  const i = src.indexOf(debut); if (i < 0) return '';
  let d = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } }
  return src.slice(i, j + 1);
}
function contexte(SRC, beta) {
  const C = sansCom(SRC);
  const morceaux = [bloc(C, 'const METIERS={'), C.match(/const METIERS_ORDRE=\[[^\]]*\];/)[0],
    bloc(C, 'function metierId('), bloc(C, 'function metierPack('), bloc(C, 'function estMetier3D('), bloc(C, 'function intTypes('),
    bloc(C, 'function betaOutils('), bloc(C, 'function betaRemplir(')];
  const ctx = { BETA_ESSAI: beta, INT_TYPES: ['Dératisation', 'Désinsectisation'], CATALOGUE: [], FOURNISSEURS_3D: [], console,
    db: { metier: '3d', clients: [], interventions: [], techniciens: [{ id: 't1' }] }, uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    confirm: () => true, cataloguePoser() {}, demoCharger() {}, save() {}, toast() {}, views: {}, current: '', currentUser: null };
  vm.createContext(ctx);
  vm.runInContext(morceaux.join('\n') + '\nthis.METIERS=METIERS; this.METIERS_ORDRE=METIERS_ORDRE;', ctx);
  return { ctx, morceaux, C };
}

console.log('\n── 3086 · 1. le sélecteur de la bêta ──');
const B = contexte(BETA, true);
vrai('les morceaux sont trouvés (8)', B.morceaux.every(m => m.length > 20), B.morceaux.map(m => m.length));
vrai('24 métiers dans METIERS_ORDRE (la climatisation, séparée du chauffage le 29 octobre 2026, s\'ajoute)', B.ctx.METIERS_ORDRE.length === 24, B.ctx.METIERS_ORDRE.length);
const PARAM = bloc(B.C, 'views.parametres=function(');
vrai('views.parametres est trouvée', PARAM.length > 5000, PARAM.length);
const iOutils = PARAM.indexOf('🧪 Outils de bêta'), iSel = PARAM.indexOf('id="beta-metier"'), iFin = PARAM.indexOf("</div>`:''}", iSel);
vrai('le sélecteur vit DANS la carte « Outils de bêta » (gardée par BETA_ESSAI)', iOutils > 0 && iSel > iOutils && iFin > iSel
  && /\$\{BETA_ESSAI&&currentUser&&currentUser\.role==='admin'\?`<div class="card"><div class="card-head"><h3>🧪 Outils de bêta/.test(PARAM), [iOutils, iSel, iFin]);
const SEL = PARAM.slice(iSel, iFin);
vrai('un geste sur le sélecteur appelle metierSet', /onchange="metierSet\(this\.value\)"/.test(SEL));
vrai('il propose TOUS les métiers (METIERS_ORDRE.map) et part sur le courant (sauf sous un pack combiné, que le groupe suivant désigne)', /\$\{METIERS_ORDRE\.map\(k=>`<option value="\$\{k\}"\$\{k===metierId\(\)&&!metierComboCourant\(\)\?' selected':''\}>/.test(SEL));
vrai('… puis les packs COMBINÉS (v780), un par ligne, valeur « combo:… » que metierSet aiguille', /<optgroup label="Packs combinés[^"]*">\$\{METIERS_COMBOS\.map\(c=>`<option value="combo:\$\{c\.k\}"\$\{metierComboCourant\(\)===c\.k\?' selected':''\}>/.test(SEL));

console.log('\n── 3086 · 2. « Mon métier » : 24 cartes sur la bêta, une seule chez un client ──');
const expr = c => { const m = c.match(/<div class="met-cards">\$\{\((.*?)\)\.map\(k=>/); return m ? m[1] : ''; };
const EB = expr(B.C), EA = expr(sansCom(lire('app.html')));
vrai('l\'expression des cartes est trouvée (bêta et app.html)', !!EB && !!EA, [EB, EA]);
/* app.html (la source de la bêta, ou la version publique plus ancienne servie sur main) : chez un client, sa seule carte */
const client = vm.runInNewContext(EA, { BETA_ESSAI: false, equipeTeamOP: () => false, METIERS_ORDRE: B.ctx.METIERS_ORDRE, cur: 'plomberie' });
vrai('app.html : un client ne voit que sa carte', JSON.stringify(client) === '["plomberie"]', client);
const cartes = (beta, equipe) => vm.runInNewContext(EB, { BETA_ESSAI: beta, equipeTeamOP: () => equipe, METIERS_ORDRE: B.ctx.METIERS_ORDRE, cur: 'plomberie' });
vrai('bêta (BETA_ESSAI vrai) : les 24 cartes de métier (les packs combinés en ont les leurs, à la suite)', cartes(true, false).length === 24, cartes(true, false).length);
vrai('client (BETA_ESSAI faux, pas TEAM OP) : sa seule carte', JSON.stringify(cartes(false, false)) === '["plomberie"]', cartes(false, false));
vrai('équipe TEAM OP : les 24 cartes, comme avant', cartes(false, true).length === 24);
vrai('app.html arme BETA_ESSAI à false', /const BETA_ESSAI=false;/.test(lire('app.html')));
vrai('beta.html l\'arme à true', /const BETA_ESSAI=true;/.test(BETA));

console.log('\n── 3086 · 3. « Remplir en grand nombre » suit le pack ──');
for (const k of ['piscine', 'froid', 'chauffage']) {
  const { ctx } = contexte(BETA, true); ctx.db.metier = k;
  ctx.betaRemplir(true);
  const T = ctx.METIERS[k].types, I = ctx.db.interventions;
  vrai(k + ' : 400 interventions, toutes aux types du pack', I.length === 400 && I.every(i => T.includes(i.type)), [I.length, I.filter(i => !T.includes(i.type)).length]);
  vrai(k + ' : chaque type du pack est représenté, aucune dératisation', T.every(t => I.some(i => i.type === t)) && !I.some(i => /Dératisation/.test(i.type)));
}
{ const { ctx } = contexte(BETA, true); ctx.betaRemplir(true);
  vrai('3D : les types de la 3D (INT_TYPES, le pack 3D n\'en porte pas)', ctx.db.interventions.every(i => ctx.INT_TYPES.includes(i.type))); }
{ const { ctx } = contexte(BETA, false); ctx.betaRemplir(true);
  vrai('hors bêta, betaRemplir ne remplit rien', ctx.db.interventions.length === 0); }

console.log(`\n════ test-3086 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
