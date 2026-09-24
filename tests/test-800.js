/* ⛔ CE QUE CE FICHIER GARDE — LES PLANS D'APPÂTAGE SE FUSIONNENT POSTE PAR POSTE (v744).

   La dette (REPRISE, v740) : `plansSite[client]` est une LISTE de plans, et la fusion la prenait EN
   BLOC — deux techniciens hors ligne chez le même client, et le dernier à synchroniser effaçait les
   postes de l'autre, sans rien signaler. Depuis la v740, un plan ainsi régressé part au client
   comme « mis à jour ». La réponse est celle du stock d'une box : une date par poste, une date par
   plan pour ses propres champs, une pierre tombale par suppression (`_tombes.plansSite`).

   On EXÉCUTE les vraies fonctions, extraites du fichier livré : `plansFusionFine`, puis
   `fusionnerBases` en entier (le câblage), puis `baseSignature` (la convergence). Et on recense
   les gestes : un geste qui change un plan sans poser de marque redevient invisible à la synchro. */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

/* Une déclaration de premier niveau, entière, par appariement d'accolades (ancrée sur le CODE). */
function extraire(debut) {
  const i = BRUT.indexOf(debut);
  if (i < 0) return '';
  if (/^const /.test(debut)) return BRUT.slice(i, BRUT.indexOf('\n', i));
  let d = 0;
  for (let k = BRUT.indexOf('{', i); k < BRUT.length; k++) { if (BRUT[k] === '{') d++; else if (BRUT[k] === '}') { d--; if (!d) return BRUT.slice(i, k + 1); } }
  return '';
}
const NOMS = ['const COLLS_HORS_FUSION=', 'function collsFusion(', 'const COLLS_DICT=', 'function dictFusion(',
  'function plansFusionFine(', 'function plansSiteFusion(', 'function tombesUnion(', 'function boxFusionFine(',
  'function numMaxUnion(', 'function recEmpreinte(', 'function fusionnerBases(', 'function baseSignature('];
const morceaux = NOMS.map(extraire);
vrai('les douze déclarations sont extraites du fichier réel', morceaux.every(m => m.length > 20));
const F = new Function(morceaux.join('\n') + '\nreturn { plansFusionFine, plansSiteFusion, fusionnerBases, baseSignature };')();

const T0 = 1790000000000;
const poste = (id, num, m, extra) => Object.assign({ id, num, x: 10 * num, y: 20, type: 'appat', note: '' }, m ? { _m: m } : {}, extra || {});
const plan = (id, postes, m, extra) => Object.assign({ id, nom: 'RDC', mode: 'img', img: 'data:x', postes, version: 1, historique: [] }, m ? { _m: m } : {}, extra || {});
const nums = (arr) => (arr || []).map(pl => pl.id + ':' + (pl.postes || []).map(p => p.num + (p.x !== 10 * p.num ? '*' : '')).join(','));

console.log('\n══ 1. ⛔ LE CAS DE LA DETTE : DEUX TECHNICIENS HORS LIGNE, LE MÊME PLAN ══\n');
{
  /* Avant : 12 postes, datés. Karim pose le 13 et le 14 ; Sofia déplace le 5. */
  const base = () => Array.from({ length: 12 }, (_, k) => poste('p' + (k + 1), k + 1, T0));
  const karim = [plan('A', base().concat([poste('p13', 13, T0 + 100), poste('p14', 14, T0 + 110)]), T0)];
  const sofiaPostes = base(); sofiaPostes[4] = poste('p5', 5, T0 + 200, { x: 77 });
  const sofia = [plan('A', sofiaPostes, T0)];
  const r = F.plansFusionFine('cli-q', sofia, karim, {});
  v('⛔⛔ les postes de Karim ET le déplacement de Sofia survivent', nums(r), ['A:1,2,3,4,5*,6,7,8,9,10,11,12,13,14']);
  const r2 = F.plansFusionFine('cli-q', karim, sofia, {});
  v('   et dans l\'autre sens aussi (la priorité ne décide plus du travail des autres)', nums(r2), ['A:1,2,3,4,5*,6,7,8,9,10,11,12,13,14']);
}

console.log('\n══ 2. LE PLUS RÉCENT GAGNE — PAR POSTE, ET PAR PLAN POUR SES PROPRES CHAMPS ══\n');
{
  const a = [plan('A', [poste('p1', 1, T0 + 50, { x: 61 })], T0 + 10, { nom: 'Cave' })];
  const b = [plan('A', [poste('p1', 1, T0 + 90, { x: 99 })], T0 + 5, { nom: 'RDC' })];
  const r = F.plansFusionFine('cli-q', a, b, {});
  v('   le poste le plus récent gagne, même du côté non prioritaire', r[0].postes[0].x, 99);
  v('   le nom du plan le plus récent gagne', r[0].nom, 'Cave');
  const c = [plan('A', [poste('p1', 1, T0 + 50, { x: 61 })], T0)], d = [plan('A', [poste('p1', 1, T0 + 50, { x: 88 })], T0)];
  v('   à égalité : le côté prioritaire, comme partout', F.plansFusionFine('cli-q', c, d, {})[0].postes[0].x, 61);
  const h1 = [plan('A', [], T0, { version: 3, historique: [{ ts: 1, action: 'x' }, { ts: 3, action: 'z' }] })];
  const h2 = [plan('A', [], T0, { version: 5, historique: [{ ts: 1, action: 'x' }, { ts: 2, action: 'y' }] })];
  const rh = F.plansFusionFine('cli-q', h1, h2, {})[0];
  v('   l\'historique se réunit, sans doublon, dans l\'ordre', rh.historique.map(h => h.action), ['x', 'y', 'z']);
  v('   la version est la plus haute', rh.version, 5);
}

console.log('\n══ 3. ⛔ UNE SUPPRESSION NE REVIENT PAS — SAUF SI QUELQU\'UN A RETRAVAILLÉ APRÈS ══\n');
{
  const avec = [plan('A', [poste('p1', 1, T0), poste('p4', 4, T0)], T0)];
  const sans = [plan('A', [poste('p1', 1, T0)], T0)];
  v('⛔ un poste supprimé (tombe) ne revient pas depuis l\'autre appareil',
    nums(F.plansFusionFine('cli-q', avec, sans, { 'cli-q|A|p4': T0 + 500 })), ['A:1']);
  const retouche = [plan('A', [poste('p1', 1, T0), poste('p4', 4, T0 + 900, { x: 5 })], T0)];
  v('   mais un poste RETOUCHÉ après la suppression vit (quelqu\'un y travaillait)',
    nums(F.plansFusionFine('cli-q', retouche, sans, { 'cli-q|A|p4': T0 + 500 })), ['A:1,4*']);
  const deux = [plan('A', [poste('p1', 1, T0)], T0), plan('B', [poste('p2', 2, T0)], T0)];
  const un = [plan('A', [poste('p1', 1, T0)], T0)];
  v('⛔ un PLAN supprimé ne revient pas', nums(F.plansFusionFine('cli-q', deux, un, { 'cli-q|B': T0 + 500 })), ['A:1']);
  const bRetouche = [plan('A', [poste('p1', 1, T0)], T0), plan('B', [poste('p2', 2, T0), poste('p3', 3, T0 + 800)], T0)];
  v('   sauf si un poste y a été posé APRÈS', nums(F.plansFusionFine('cli-q', un, bRetouche, { 'cli-q|B': T0 + 500 })), ['A:1', 'B:2,3']);
  v('   un poste supprimé ne vit pas non plus dans un plan connu d\'un seul côté',
    nums(F.plansFusionFine('cli-q', un, [plan('C', [poste('p7', 7, T0), poste('p8', 8, T0)], T0)], { 'cli-q|C|p8': T0 + 1 })), ['A:1', 'C:7']);
}

console.log('\n══ 4. ⛔⛔ SANS AUCUNE MARQUE, L\'ANCIENNE RÈGLE — ON NE DEVINE PAS ══\n');
{
  /* Une donnée non datée ne dit rien de ce qui a changé : la réunir ressusciterait ce qu'une
     version d'avant a supprimé. `null` rend la main à `dictFusion` (le côté prioritaire en bloc). */
  const vieux = [plan('A', [poste('p1', 1), poste('p2', 2)])];
  const vieux2 = [plan('A', [poste('p1', 1)])];
  v('⛔⛔ rien de daté, aucune tombe : `null` (l\'ancienne règle)', F.plansFusionFine('cli-q', vieux, vieux2, {}), null);
  v('   une tombe d\'un AUTRE client ne réveille pas la maille fine', F.plansFusionFine('cli-q', vieux, vieux2, { 'cli-z|A': T0 }), null);
  vrai('   une tombe de CE client, si', Array.isArray(F.plansFusionFine('cli-q', vieux, vieux2, { 'cli-q|A|p2': T0 })));
  /* Et la collection entière : sans marque, le résultat est EXACTEMENT celui d'avant. */
  const P = { c1: vieux }, A = { c1: vieux2, c2: [plan('Z', [])] };
  const r = F.plansSiteFusion(P, A, {});
  v('   `plansSiteFusion` sans marque = l\'ancienne règle, clé par clé', [nums(r.c1), nums(r.c2)], [nums(vieux), ['Z:']]);
  v('   une valeur abîmée ne fait rien tomber', F.plansFusionFine('cli-q', 'pas une liste', [plan('A', [], T0)], {}).length, 1);
}

console.log('\n══ 5. ⛔ LE CÂBLAGE : `fusionnerBases` EN ENTIER ══\n');
{
  /* La vraie fusion des bases, telle que la synchro l'appelle : si `plansSite` n'y passait pas par
     la maille fine, tout ce qui précède serait du code mort qui a l'air d'une garde. */
  const local = { clients: [{ id: 'cli-q', nom: 'Boulangerie', _m: T0 }], plansSite: { 'cli-q': [plan('A', [poste('p1', 1, T0), poste('p13', 13, T0 + 100)], T0)] },
    _tombes: { plansSite: { 'cli-q|A|p9': T0 + 50 } } };
  const remote = { clients: [{ id: 'cli-q', nom: 'Boulangerie', _m: T0 }], plansSite: { 'cli-q': [plan('A', [poste('p1', 1, T0 + 200, { x: 3 }), poste('p9', 9, T0)], T0)] } };
  const recu = F.fusionnerBases(local, remote, false);   // à la RÉCEPTION : le nuage est prioritaire
  v('⛔⛔ à la réception, le poste posé ici (13) n\'est plus effacé par le nuage', nums(recu.plansSite['cli-q']), ['A:1*,13']);
  vrai('   la tombe voyage avec la base (le 9 supprimé ici ne revient pas)', recu._tombes && recu._tombes.plansSite && recu._tombes.plansSite['cli-q|A|p9']);
  const envoi = F.fusionnerBases(local, remote, true);   // à l'ENVOI : le local est prioritaire
  v('   à l\'envoi, le déplacement fait ailleurs (1) n\'est plus écrasé', nums(envoi.plansSite['cli-q']), ['A:1*,13']);

  console.log('\n══ 6. LA SIGNATURE VOIT CE QUE LA MAILLE FINE A RECOMPOSÉ ══\n');
  /* Sans elle, une fusion qui ramène le poste d'un collègue passait pour un non-événement, donc
     n'était jamais repoussée — le défaut déjà corrigé pour les box. */
  vrai('⛔ la base fusionnée n\'a pas la même signature que la base locale', F.baseSignature(recu) !== F.baseSignature(local));
  const bouge = JSON.parse(JSON.stringify(local)); bouge.plansSite['cli-q'][0].postes[0]._m = T0 + 999;
  vrai('   changer la date d\'UN poste change la signature', F.baseSignature(bouge) !== F.baseSignature(local));
  vrai('   et deux bases identiques ont la même', F.baseSignature(JSON.parse(JSON.stringify(local))) === F.baseSignature(local));
}

console.log('\n══ 7. ⛔ CHAQUE GESTE QUI CHANGE UN PLAN POSE SA MARQUE OU SA TOMBE ══\n');
{
  /* Recensement par la FORME du code : une fonction qui crée un plan (`plans.push(`), en supprime un
     (`plans.splice(`), ajoute ou retire un poste (`postes.push(` / `.postes=…filter`), le déplace
     (`papSetXY(`) ou change un de ses champs (`po.zone=`, `.produitId=`, `.secure=`, `.dateTubes=`,
     `pl.nom=`, `pl.img=`) doit appeler `papMarque` ou `papTombe`. Commentaires retirés d'abord. */
  const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  const fns = [...SRC.matchAll(/^(async )?function (pa[A-Za-z0-9_]*|pap[A-Za-z0-9_]*)\(/gm)].map(m => m[2]);
  const corps = (n) => { const i = SRC.search(new RegExp('^(async )?function ' + n + '\\(', 'm')); if (i < 0) return '';
    let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); } } return ''; };
  /* ⚠️ Deux faux positifs payés à la première exécution : `w.postes.push(` est l'état de l'ASSISTANT
     (des points pas encore devenus des postes), et `po.zone===z` une COMPARAISON. Le motif vise la
     forme exacte d'une écriture. */
  const ecrit = /plans\.push\(|plans\.splice\(|(?<!\bw)\.postes\.push\(|\.postes=[a-z.]*\.postes\.filter\(|papSetXY\(pl,po|po\.zone=(?!=)|\.produitId=pid|\.secure=!!v|\.dateTubes=v|pl\.nom=v|pl\.img=img/;
  const gestes = fns.filter(n => n !== 'papSetXY' && ecrit.test(corps(n)));
  vrai('   la population est là (au moins treize gestes)', gestes.length >= 13);
  v('⛔⛔ aucun geste ne change un plan sans marque ni tombe', gestes.filter(n => !/papMarque\(|papTombe\(/.test(corps(n))), []);
  console.log('     (' + gestes.length + ' gestes : ' + gestes.join(', ') + ')');
  /* ⛔ Et une suppression pose une TOMBE, pas une marque : une marque sur un poste disparu ne se voit pas. */
  v('⛔ chaque suppression pose une tombe', ['paDelPlan', 'paDelPoste', 'papDelPoste2'].filter(n => !/papTombe\(/.test(corps(n))), []);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
