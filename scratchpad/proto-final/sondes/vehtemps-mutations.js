// Contre-épreuve de la voie « Temps de travail » (étape 1) : on REMET, dans une COPIE de la page, un défaut que les sondes vehtemps-* gardent,
// et on exige que la sonde concernée TOMBE. Chaque remplacement doit toucher EXACTEMENT une occurrence (sinon le script s'arrête et le dit) :
// « une mutation qui ne casse rien est peut-être une mutation mal visée ». Jamais sur le fichier du dépôt : une copie sous /tmp.
// node scratchpad/proto-final/sondes/vehtemps-mutations.js [filtre]      DRY=1 : vérifie seulement que chaque mutation vise juste
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-vehtemps';
const SRC = fs.readFileSync(PAGE, 'utf8');
const G = 'gestes', S = 'structure';
const M = [
  ['1 · « Terminer à… » écrit l\'heure qu\'il est au lieu de la fin d\'habitude (et la garde de l\'heure proposée tombe)', [
    ["act:'terminer|' + p.id + '|' + f.h }", "act:'terminer|' + p.id + '|' + hNow() }"],
    ["if (!f.src || f.h !== h) return toast('L’heure proposée a changé : ouvre « Choisir une autre heure ».');", ""]], [G]],
  ['2 · terminer la journée ne retire plus la validation de la semaine (ptDevalide)', [["ptDevalide(k, p.date); delete PAIE.confirmes[k]; if (dem)", "delete PAIE.confirmes[k]; if (dem)"]], [G]],
  ['3 · terminer la journée n\'écrit plus la trace (qui, quand, pourquoi)', [["PT_TRACE.push({ pid:p.id, qui:k, date:p.date, champ:'fin', avant:'journée pas terminée'", "0 && PT_TRACE.push({ pid:p.id, qui:k, date:p.date, champ:'fin', avant:'journée pas terminée'"]], [G]],
  ['4 · terminer une journée d\'un mois fermé n\'est plus refusé', [["if (paieMoisVerrou(p.date)) return toast(ttFerme());\n  if (!h)", "if (!h)"]], [G]],
  ['5 · « Ajouter une journée » n\'exige plus le motif', [["if (!motif) return toast('Écris d’abord pourquoi", "if (false) return toast('Écris d’abord pourquoi"]], [G]],
  ['6 · « Ajouter une journée » dans un mois fermé n\'est plus refusé', [["if (paieMoisVerrou(d)) return toast(ttFerme());\n  if (!deb", "if (!deb"]], [G]],
  ['7 · le toast de « Terminer à… » perd son « Annuler »', [["{ lib:'Annuler', fn:() => {\n    Object.keys(p).forEach(x => delete p[x]);", "{ lib:'Défaire', fn:() => {\n    Object.keys(p).forEach(x => delete p[x]);"]], [G]],
  ['8 · la demande de Tom propose « Accepter la correction » au lieu de « Accepter 17:40 »', [["lib:seul ? 'Accepter ' + seul : 'Accepter la correction'", "lib:'Accepter la correction'"]], [G]],
  ['9 · valider le lot dans un mois fermé n\'est plus refusé', [["if (S.J.some(paieMoisVerrou)) { fermerPanneau(); return toast(ttFerme()); }", "if (false) { fermerPanneau(); return toast(ttFerme()); }"]], [G]],
  ['10 · le bouton de la semaine redevient « Valider 4 semaines » (personnes et semaines mêlées)', [["'Valider les ' + S.ok.length + ' personnes en règle'", "'Valider ' + S.ok.length + ' semaines'"]], [G]],
  ['11 · la pastille de l\'onglet Aujourd\'hui ne compte plus ce qui attend', [["${k === 'auj' && R.length ?", "${false && R.length ?"]], [S]],
  ['12 · le bandeau bleu « La paie du mois est dans Comptabilité » reparaît', [["<span class=\"gris\">${esc(ttPhrase(E))}</span></div>", "<span class=\"gris\">${esc(ttPhrase(E))}</span><span class=\"gris\">La paie du mois est dans Comptabilité › Paie</span></div>"]], [S]],
  ['13 · la grille de sept jours et la liste paraissent ENSEMBLE (le seuil de conteneur saute)', [["@container ttsem (min-width:1000px){\n  .tt-grille{display:block}.tt-liste{display:none}", "@container ttsem (min-width:1000px){\n  .tt-grille{display:block}"]], [S]],
  ['14 · les flèches de la semaine rétrécissent de nouveau sous 44 px au doigt', [["@media (pointer:coarse){.tt-barre .st-nav button{width:44px;height:44px;flex:none}}", "@media (pointer:coarse){.tt-barre .st-nav button{width:44px;height:44px}}"]], [S], { PROFILS:'petit' }],
  ['15 · le mois ne propose plus « Valider ce qui est en règle » quand des semaines attendent', [["else if (B.aValider) { bouton = `<button type=\"button\" class=\"btn\" data-tt=\"validertout\">Valider ce qui est en règle</button>`", "else if (false) { bouton = `<button type=\"button\" class=\"btn\" data-tt=\"validertout\">Valider ce qui est en règle</button>`"]], [G]],
  ['16 · la journée oubliée de Tom est dite DEUX fois (une rangée en plus)', [["  /* 2. une demande de correction du salarié", "  POINTAGES.filter(p => ptOuvert(p) && p.qui !== 'marc').forEach(p => R.push({ rang:0, g:'r', lib:'À terminer', k:p.qui, texte:'Tom n’a pas terminé sa journée du ' + jlong(p.date) + '.', bouton:{ lib:'Voir la journée', act:'jour|' + p.qui + '|' + p.date }, liens:[] }));\n  /* 2. une demande de correction du salarié"]], [S]],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, paires, sondes, env] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  let page = SRC;
  for (const [ancien, neuf] of paires) { const c = page.split(ancien).length - 1;
    if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué\n   ${ancien.slice(0, 90)}`); process.exit(2); }
    page = page.replace(ancien, () => neuf); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const R = racine('m', page); if (page === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const s of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, 'vehtemps-t1-' + (s === G ? 'gestes' : 'structure') + '.js')], { env: { ...process.env, RACINE: R, PROFILS:'mac,iphone', NUIT:'0', ...(env || {}) }, encoding: 'utf8', timeout: 400000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if (r.status === 1 && /✗/.test(r.stdout || '')) { tombe = true; break; }
    if (r.status === 2 && /TypeError: Cannot (read|set) properties of null/.test(r.stderr || '')) { tombe = true; detail += ' (la sonde meurt faute de l\'élément gardé)'; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' →' + detail);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
