/* ══ 1301 · RÔLES : UN NOM DE RÔLE EST UNIQUE, ET LE RENOMMER SUIT JUSQU'À LA FICHE TECHNICIEN (admin#5) ══
   Rapport du testeur, 16 octobre 2026 : « Applicateur 3D » créé deux fois, puis « Technicien » (identique au
   rôle fourni) — « ✓ Rôle enregistré » à chaque fois, et la liste du formulaire de compte montrait trois
   lignes indistinguables. Et renommer « Applicateur 3D » en « Applicateur Pro » mettait le compte à jour mais
   laissait `métier = Applicateur 3D` sur sa fiche technicien, alors que la fenêtre promet « le renommer change
   ce qui s'affiche partout ».

   Ce banc EXÉCUTE la vraie `roleValider` avec les vraies `roleDef`, `roleLbl`, `rolesPerso`, `nomNorm`.      */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1301 · 0. la population ──');
const PIECES = [ligne('const ROLE = {'), ligne('const ROLE_TECH_BASE='), ligne('const ROLE_CHEF_BASE='), ligne('const ROLE_PROTEGE='),
  bloc('function nomNorm(s){'), bloc('function rolesPerso(){'), bloc('function roleDef(cle){'), bloc('function roleLbl(cle){'), bloc('function roleCle(nom){'), bloc('function roleValider(cle){')];
vrai('les dix pièces sont trouvées', PIECES.every(p => p.length > 20), PIECES.map(p => p.length));
vrai('⛔ une seule définition de roleValider', SRC.split('function roleValider(').length === 2);

function monde(extra) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp,
    db: Object.assign({ users: [], techniciens: [], roles: [] }, extra || {}), currentUser: { id: 'uA', role: 'admin' }, __toasts: [], __saves: 0,
    __champ: { 'rl-nom': { value: '' }, 'rl-tech': { checked: false }, 'rl-chef': { checked: false } } };
  vm.createContext(ctx);
  vm.runInContext(`var document={getElementById:function(i){ return __champ[i]||null; }};
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function logEvent(){} function rolesGerer(){}
    ${PIECES.join('\n')}`, ctx);
  return ctx;
}
const valider = (W, cle, nom, tech) => { W.__champ['rl-nom'].value = nom; W.__champ['rl-tech'].checked = !!tech;
  const n0 = W.__saves; vm.runInContext(`roleValider(${JSON.stringify(cle || '')})`, W); return { saves: W.__saves - n0, toasts: W.__toasts.slice() }; };
const noms = W => vm.runInContext('rolesPerso().map(function(r){ return r.nom; })', W);

(async () => {
  console.log('\n── 1301 · 1. ⛔ un nom de rôle déjà pris est refusé ──');
  { const W = monde();
    const a = valider(W, '', 'Applicateur 3D', true);
    v('le premier « Applicateur 3D » est créé', [a.saves, noms(W)], [1, ['Applicateur 3D']]);
    const b = valider(W, '', 'Applicateur 3D', true);
    v('⛔⛔ le second « Applicateur 3D » est refusé : rien d’écrit, toujours un seul', [b.saves, noms(W).length], [0, 1]);
    vrai('… et on dit lequel existe déjà', b.toasts.some(t => /existe déjà/.test(t) && /Applicateur 3D/.test(t)), b.toasts);
    const c = valider(W, '', '  applicateur   3d ', true);
    v('⛔ casse, accents et espaces confondus : même refus', [c.saves, noms(W).length], [0, 1]);
    const d = valider(W, '', 'Technicien', false);
    v('⛔⛔ « Technicien » (rôle FOURNI) est refusé aussi', [d.saves, noms(W).length], [0, 1]);
    vrai('… en nommant le rôle fourni', d.toasts.some(t => /existe déjà/.test(t) && /Technicien/.test(t)), d.toasts);
    const e = valider(W, '', 'Chef d\'équipe', false);
    v('⛔ « Chef d’équipe » (fourni) aussi', [e.saves, noms(W).length], [0, 1]);
    const f = valider(W, '', 'Technicien 3D', true);
    v('contre-épreuve : un nom différent est créé', [f.saves, noms(W)], [1, ['Applicateur 3D', 'Technicien 3D']]);
    const cle = vm.runInContext('rolesPerso()[0].cle', W);
    const g = valider(W, cle, 'Applicateur 3D', false);
    v('contre-épreuve : ré-enregistrer un rôle sous SON propre nom (changer une case) reste possible', [g.saves], [1]);
    const h = valider(W, cle, 'Technicien 3D', false);
    v('⛔ … mais le renommer sur le nom d’un AUTRE rôle perso est refusé', [h.saves, noms(W)], [0, ['Applicateur 3D', 'Technicien 3D']]);
    const i = valider(W, 'commercial', 'Gestion compta', false);
    v('⛔ renommer un rôle FOURNI sur le nom d’un autre fourni est refusé', [i.saves, vm.runInContext('db.roleNoms', W)], [0, undefined]);
    const j = valider(W, 'commercial', 'Vendeur', false);
    v('contre-épreuve : renommer un rôle fourni sur un nom libre passe', [j.saves, vm.runInContext('db.roleNoms.commercial', W)], [1, 'Vendeur']);
    const k = valider(W, '', 'Commercial', false);
    v('⛔ … et l’ANCIEN nom d’un rôle fourni renommé est de nouveau libre (il ne porte plus ce nom)', [k.saves], [1]); }

  console.log('\n── 1301 · 1 bis. ⛔ un rôle fourni MASQUÉ ne réserve plus son nom (relecture) ──');
  { const W = monde({ roleMasques: { technicien: true } });
    const a = valider(W, '', 'Technicien', true);
    v('⛔⛔ « Technicien » (fourni, retiré de la liste) peut être recréé en rôle maison', [a.saves, noms(W)], [1, ['Technicien']]);
    const b = valider(W, '', 'Technicien', true);
    v('… mais le doublon du rôle maison, lui, reste refusé', [b.saves, noms(W).length], [0, 1]);
    const c = valider(W, '', 'Commercial', false);
    v('contre-épreuve : un fourni NON masqué (« Commercial ») réserve toujours son nom', [c.saves, noms(W).length], [0, 1]);
    vrai('… et le refus nomme le rôle', c.toasts.some(t => /existe déjà/.test(t) && /Commercial/.test(t)), c.toasts); }

  console.log('\n── 1301 · 2. ⛔ renommer un rôle met à jour le métier des fiches techniciens liées ──');
  { const W = monde({ users: [{ id: 'u1', role: 'r_x', techId: 't1' }, { id: 'u2', role: 'r_x', techId: 't2' }, { id: 'u3', role: 'technicien', techId: 't3' }, { id: 'u4', role: 'r_x', techId: '' }],
      techniciens: [{ id: 't1', nom: 'Ana', metier: 'Applicateur 3D' }, { id: 't2', nom: 'Bob', metier: 'Spécialiste choisi à la main' }, { id: 't3', nom: 'Cyril', metier: 'Technicien' }],
      roles: [{ cle: 'r_x', nom: 'Applicateur 3D', tech: true, chef: false }] });
    const a = valider(W, 'r_x', 'Applicateur Pro', true);
    const t = id => vm.runInContext(`db.techniciens.find(function(x){ return x.id==='${id}'; }).metier`, W);
    v('rôle renommé et enregistré', [a.saves, noms(W)], [1, ['Applicateur Pro']]);
    v('⛔⛔ la fiche liée au compte suit le nouveau nom', t('t1'), 'Applicateur Pro');
    v('… une fiche dont le métier a été réglé À LA MAIN n’est pas écrasée', t('t2'), 'Spécialiste choisi à la main');
    v('… la fiche d’un compte d’un AUTRE rôle n’est pas touchée', t('t3'), 'Technicien');
    const b = valider(W, 'r_x', 'Applicateur Pro', false);
    v('contre-épreuve : enregistrer sans renommer ne change rien (et ne casse pas)', [b.saves, t('t1')], [1, 'Applicateur Pro']);
    const c = valider(W, 'technicien', 'Opérateur', true);
    v('⛔ un rôle FOURNI renommé fait suivre aussi ses fiches', [c.saves, t('t3')], [1, 'Opérateur']); }

  console.log(`\n════ test-1301 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log(`\n════ test-1301 : ${ok} ✓ ${ko + 1} ✗ ════\n`); process.exit(1); });
