/* ══ LES CATÉGORIES RETIRÉES — ET LES ÉCRANS QU'ON NE POSAIT PLUS PAR ERREUR (v728) ═══════
   Justin, 23 septembre 2026 : « si tu vois des catégories qui sont pas utiles ou autre, je
   t'autorise de les supprimer totalement, pour mieux faire et optimiser l'application ».

   Le critère, écrit AVANT de toucher : on retire ce qui est un DOUBLON avéré (même fonction,
   mêmes données) ou ce que PLUS RIEN n'ouvre. Jamais une catégorie qu'une entreprise
   utilise, jamais une donnée.

   1. « Audit » était le MÊME écran qu'« Historique » : même fonction (`journalView`), même
      source (`visibleJournal(db.journal)`) — seul le titre changeait. Retiré du menu ET du
      code ; un ancien lien (`#v=audit`, un onglet ou un favori mémorisé) mène à Historique.
   2. « Droits par rôle » (`views.permissions`, 95 lignes) : depuis la v585, « le dépliage d'un
      compte dans Utilisateurs EST l'éditeur de droits… Pas de bouton « par rôle » ». Plus
      rien n'y menait. Les réglages déjà posés par rôle restent LUS (`db.permissions`).
   3. Deux enregistrements posaient une liste ORPHELINE en travers de l'écran courant :
      « Donner produit » (fiche d'un véhicule) affichait « Produits donnés », et modifier un
      chantier affichait « Chantiers / Projets » — deux listes retirées du menu. Mesuré au
      navigateur sur la v727 : le titre disait « Produits donnés » pendant que `current`
      valait « vehicules », sans chemin de retour. On reste désormais où l'on était.

   La preuve de bout en bout est au navigateur : `scratchpad/sonde-categories.js` (20 ✓ sur
   la v728 ; 5 ✗ sur la v727 — la contre-épreuve tombe là où il faut).                    */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (règle du dépôt) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function corps(nom) {
  const i = SRC.indexOf(nom); if (i < 0) return '';
  let p = SRC.indexOf('{', i), n = 0;
  for (let j = p; j < SRC.length; j++) { if (SRC[j] === '{') n++; else if (SRC[j] === '}') { n--; if (!n) return SRC.slice(i, j + 1); } }
  return '';
}

console.log('\n── 775 · 1. le menu ──');
const iN = SRC.indexOf('const NAV = ['), iF = SRC.indexOf('function showAside', iN);
vrai('population : le menu est trouvé', iN > 0 && iF > iN);
const NAVK = [...SRC.slice(iN, iF).matchAll(/\{k:'(\w+)'/g)].map(m => m[1]);
vrai('population : ' + NAVK.length + ' rubriques lues', NAVK.length >= 40, NAVK.length);
vrai('⛔ « Audit » n’est plus au menu', !NAVK.includes('audit'));
vrai('« Historique » y est toujours', NAVK.includes('historique'));
const VUES = new Set([...SRC.matchAll(/^\s*views\.(\w+)\s*=/gm)].map(m => m[1]));
vrai('chaque rubrique du menu a son écran', NAVK.every(k => VUES.has(k)), NAVK.filter(k => !VUES.has(k)));

console.log('\n── 775 · 2. les écrans retirés n’existent plus ──');
vrai('⛔ plus de views.audit', !VUES.has('audit'));
vrai('⛔ plus de views.permissions (« Droits par rôle »)', !VUES.has('permissions'));
for (const f of ['permSetMod', 'permSetCap', 'permSetBox', 'permResetGrp', 'permResume'])
  vrai('… ni de ' + f + '()', !new RegExp('function ' + f + '\\(').test(SRC));
vrai('⛔ aucun appel ne vise encore un écran retiré',
  !/go\(\s*'(audit|permissions)'\s*\)|views\.(audit|permissions)\s*\(/.test(SRC),
  (SRC.match(/go\(\s*'(audit|permissions)'\s*\)|views\.(audit|permissions)\s*\(/g) || []));
vrai('les réglages par rôle déjà posés restent LUS (userSeesModule → moduleReglage → db.permissions)',
  /moduleReglage\(u,k\)/.test(corps('function userSeesModule(')) && /db\.permissions/.test(corps('function moduleReglage(')));
vrai('… et les droits d’action par rôle aussi (catDroit)', /db\.permissions/.test(corps('function catDroit(')));
vrai('les restes de carte d’« Audit » sont partis (couleur, trait, libellé traduit, forfait)',
  !/\baudit:'(gris|bouclier|Historique)'/.test(SRC) && !/'Audit':'/.test(SRC) && !/'statistiques','audit'/.test(SRC));

console.log('\n── 775 · 3. un ancien lien mène à l’écran qui remplace ──');
const mV = SRC.match(/const VUES_RETIREES=(\{[^}]*\});/);
vrai('population : la table des adresses de suite est trouvée', !!mV);
const VR = mV ? eval('(' + mV[1] + ')') : {};
vrai('audit → historique, permissions → utilisateurs', VR.audit === 'historique' && VR.permissions === 'utilisateurs', VR);
vrai('chaque adresse de suite est un écran VIVANT et au menu',
  Object.values(VR).every(k => VUES.has(k) && NAVK.includes(k)), Object.values(VR).filter(k => !VUES.has(k) || !NAVK.includes(k)));
/* on EXÉCUTE les lignes réelles de go() qui aiguillent — pas une copie */
const G = corps('function go(view){');
vrai('population : go() est trouvée', G.length > 200, G.length);
const a0 = G.indexOf('multiCapturer(); }catch(e){}'), a1 = G.indexOf('_ecranRendu=null;');
vrai('population : l’aiguillage de go() est découpé', a0 > 0 && a1 > a0);
let aiguille = null;
try { aiguille = new Function('views', 'VUES_RETIREES', 'view', G.slice(a0 + 'multiCapturer(); }catch(e){}'.length, a1) + '\nreturn view;'); } catch (e) {}
vrai('… et il s’exécute', typeof aiguille === 'function');
if (aiguille) {
  const vues = { dashboard: 1, historique: 1, utilisateurs: 1, interventions: 1 };
  vrai('go("audit") → historique', aiguille(vues, VR, 'audit') === 'historique');
  vrai('go("permissions") → utilisateurs', aiguille(vues, VR, 'permissions') === 'utilisateurs');
  vrai('un écran vivant n’est jamais détourné', aiguille(vues, VR, 'interventions') === 'interventions');
  vrai('un nom inconnu retombe sur le tableau de bord', aiguille(vues, VR, 'nexistepas') === 'dashboard');
  vrai('⛔ l’adresse de suite passe AVANT le repli sur le tableau de bord',
    G.indexOf('VUES_RETIREES[view]') > 0 && G.indexOf('VUES_RETIREES[view]') < G.indexOf("if(!views[view]) view='dashboard'"));
}

console.log('\n── 775 · 4. un enregistrement ne pose plus d’écran orphelin ──');
for (const [fn, orphelin] of [['function saveProduitDonne(', 'views.produitsDonnes('], ['function saveChantier(', 'views.chantiers('], ['function delChantier(', 'views.chantiers(']]) {
  const c = corps(fn);
  vrai('population : ' + fn.slice(9, -1) + ' est trouvée', c.length > 40, c.length);
  vrai('⛔ ' + fn.slice(9, -1) + ' ne pose plus « ' + orphelin.slice(6, -1) + ' » en travers de l’écran', c.indexOf(orphelin) < 0);
  vrai('… il redessine l’écran COURANT', /views\[current\]\(\)/.test(c));
}
vrai('« Donner produit » reste sur la fiche d’un véhicule (le geste n’est pas retiré)',
  /formProduitDonne\(null,'\$\{v\.id\}'\)/.test(SRC));
vrai('… et le don s’écrit toujours dans Mouvements', /motif:'Produit donné'/.test(corps('function saveProduitDonne(')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
