// Contre-épreuve du bouton « Retour » : on REMET dans une COPIE de la page un défaut que les sondes retour-*.js gardent, et on exige que la sonde concernée TOMBE.
// « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer » — et une mutation qui ne casse rien est une mutation mal visée :
// chaque remplacement doit toucher EXACTEMENT une occurrence, sinon rien n'est joué (le script s'arrête et le dit).
// node scratchpad/proto-final/sondes/retour-mutations.js [filtre]      (DRY=1 : vérifie seulement que chaque mutation vise juste)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), APERCU = path.join(REPO, 'apercu'), PAGE = 'prototype-op-gestion.html', COURRIER = 'prototype-courrier.js';
const TMP = process.env.MUT_DIR || '/tmp/mutations-retour';
const SRC = { [PAGE]: fs.readFileSync(path.join(APERCU, PAGE), 'utf8'), [COURRIER]: fs.readFileSync(path.join(APERCU, COURRIER), 'utf8') };
// [nom, fichier, ancien, neuf, [ [sonde, variables d'environnement], … ]]
const CALQ = (g, p) => ['retour-calques.js', { PROFIL: p || 'android', GENRE: g }], PARC = p => ['retour-parcours.js', { PROFIL: p || 'android' }];
const M = [
  ['1 · ouvrir un calque ne pose plus d\'entrée d\'historique', PAGE, "history.pushState({ cal:CAL.pousse + 1 }, '', location.href); CAL.pousse++;", "CAL.pousse++;", [CALQ('panneau')]],
  ['2 · aller() depuis une fenêtre laisse ses entrées derrière lui (entrée fantôme)', PAGE, "function aller(h){ if (calAvantAller(() => aller(h))) return; fermerPanneau();", "function aller(h){ fermerPanneau();", [PARC()]],
  ['3 · Avancer vers une entrée de fenêtre rouvre / laisse la page sur une entrée vide', PAGE, "} else if (n > CAL.pousse) { CAL.ignore = 1;", "} else if (false) { CAL.ignore = 1;", [CALQ('pdf')]],
  ['4 · fermer par la croix ne consomme plus l\'entrée (un Retour de plus reste en travers)', PAGE, "if (CAL.pousse > d) { const n = CAL.pousse - d; CAL.pousse = d; calReculer(n); }", "if (CAL.pousse > d) { CAL.pousse = d; }", [CALQ('pdf')]],
  ['5 · les panneaux ne sont plus reconnus comme calques', PAGE, "ouvert:() => !!document.querySelector('#calque .voile'),", "ouvert:() => false,", [CALQ('panneau (Nouveau')]],
  ['6 · rechargé fenêtre ouverte, l\'entrée orpheline n\'est plus reculée', PAGE, "if (e && typeof e.cal === 'number' && e.cal > 0) calReculer(e.cal);", ";", [PARC()]],
  ['7 · l\'atelier reprend son propre pushState (deux mécanismes à la fois)', PAGE, "document.body.style.overflow = 'hidden'; fermerPanneau(); fermerMenu(); z.hidden = false;\n", "document.body.style.overflow = 'hidden'; fermerPanneau(); fermerMenu(); z.hidden = false;\n  try { history.pushState({ opdz:1 }, '', location.href); } catch (e) {}\n", [PARC()]],
  ['8 · Retour ferme le PREMIER calque ouvert au lieu du dernier', PAGE, "const dernier = CAL.pile.pop(), g = CAL_GENRES.find(x => x.k === dernier);", "const dernier = CAL.pile.shift(), g = CAL_GENRES.find(x => x.k === dernier);", [CALQ('date')]],
  ['9 · une adresse changée à la main laisse la pile des calques en l\'état', PAGE, "function calApresNavigation(){ if (CAL.ignore === 0) { CAL.pousse = 0; CAL.pile = []; } }", "function calApresNavigation(){}", [PARC()]],
  ['10 · un historique muet ne fait pas éteindre le mécanisme (il continue d\'empiler des entrées)', PAGE, "CAL.echecs++; if (CAL.echecs >= 2) CAL.off = true; calFinRecul(); } }, 1500);", "CAL.echecs++; calFinRecul(); } }, 1500);", [PARC()]],
  ['11 · « ‹ OP GESTION » de la Comptabilité ajoute une entrée au lieu d\'en retirer une', PAGE, "calRevenirA(d) || aller(d); }", "aller(d); }", [PARC()]],
  ['12 · l\'atelier de devis n\'est plus reconnu comme calque', PAGE, "ouvert:() => !!document.querySelector('#opdz:not([hidden])'),", "ouvert:() => false,", [CALQ('atelier')]],
  ['13 · la fermeture du document en grand ne ferme plus rien', PAGE, "ferme:() => docPleinFermer() },", "ferme:() => {} },", [CALQ('pdf')]],
  ['14 · le guide des nouveautés se ferme par Retour mais reste pour la sonde (fermeture sans effet)', PAGE, "ferme:() => nvFermer() },", "ferme:() => {} },", [CALQ('nouveautes')]],
  ['15 · le module de courrier prend un Retour de l\'hôte pour un recul de ses propres niveaux', COURRIER, "if(((history.state&&history.state.opcourrier)||0)>=HIST.niv) return;", "", [['retour-courrier.js', { PROFIL: 'android' }]]],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(fichier, texte) {   // une copie du dépôt visible du serveur : apercu/ en liens, sauf le fichier muté
  const R = path.join(TMP, 'm'), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(APERCU)) if (f !== fichier) fs.symlinkSync(path.join(APERCU, f), path.join(A, f));
  fs.writeFileSync(path.join(A, fichier), texte); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, fichier, ancien, neuf, sondes] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  const c = SRC[fichier].split(ancien).length - 1;
  if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué`); process.exit(2); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const R = racine(fichier, SRC[fichier].replace(ancien, () => neuf));
  if (fs.readFileSync(path.join(R, 'apercu', fichier), 'utf8') === SRC[fichier]) { console.log('✗ la copie est identique à l\'original : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const [s, env] of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, s)], { env: { ...process.env, ...env, RACINE: R }, encoding: 'utf8', timeout: 590000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
    const premier = ((r.stdout || '').split('\n').find(l => /^ ✗/.test(l)) || '').slice(0, 120);
    detail += ` ${s}: ${bil} sortie ${r.status}${premier ? ' · ' + premier : ''}`; if (r.status === 1 && /✗/.test(r.stdout || '')) { tombe = true; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' →' + detail);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
