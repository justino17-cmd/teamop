// Contre-épreuve des restes « vehtemps » (tour 1) : on REMET, dans une COPIE de la page, chaque défaut corrigé, et la sonde restes-vehtemps-1.js doit TOMBER.
// Chaque remplacement doit toucher EXACTEMENT une occurrence (sinon le script s'arrête et le dit : une mutation qui ne casse rien est peut-être mal visée).
// Jamais sur le fichier du dépôt : une copie sous /tmp. DRY=1 : vérifie seulement que chaque mutation vise juste. Un filtre (numéro ou mot) en argument.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html'), TMP = process.env.MUT_DIR || '/tmp/mutations-restes-vehtemps';
const SRC = fs.readFileSync(PAGE, 'utf8'), SONDE = path.join(__dirname, 'restes-vehtemps-1.js');
const VEH = 'veh', TT = 'tt', RET = 'retour', VIS = 'visionneur';
const M = [
  ['1 · « comptés 4 moiss » revient', [["vxN(c.nbMois, 'mois', 'mois')", "vxN(c.nbMois, 'mois')"]], VEH],
  ['2 · « Les dépenses · N » ne compte plus la ligne d’assurance', [["Les dépenses · ${F.length + (liss ? 1 : 0)}", "Les dépenses · ${F.length}"]], VEH],
  ['3 · le toast du rapport de contrôle redit « ajoutée »', [["ajouté${k === 'ct' ? '' : 'e'} pour", "ajoutée pour"]], VEH],
  ['4 · le toast redit « le procès-verbal de contrôle »', [["ct:'le rapport du contrôle technique' }", "ct:'le procès-verbal de contrôle' }"]], VEH],
  ['5 · le garage pour le contrôle technique couvre aussi la courroie', [["e.urg !== 'v' && (!v.immo || v.immo.motif !== 'Contrôle technique' && v.immo.motif !== 'Entretien' || v.immo.motif === (e.k === 'ct' ? 'Contrôle technique' : 'Entretien'));", "e.urg !== 'v';"]], VEH],
  ['6 · « le Expert » revient (plus d’élision)', [["(/^[aeiouyàâéèêîôû]/i.test(m) ? 'l’' : 'le ')", "'le '"]], VEH],
  ['7 · le chiffre du haut redit « dépensés » au lieu de « payés »', [["kpi('cout', eur0(dep), 'payés en '", "kpi('cout', eur0(dep), 'dépensés en '"]], VEH],
  ['8 · la part « dont l’assurance de l’année » n’est plus dite sur la tuile', [["return a > 0 ? `<i class=\"vh-dont\">", "return false ? `<i class=\"vh-dont\">"]], VEH],
  ['9 · la fenêtre « Ce que coûtent les véhicules » ne nomme plus la part d’assurance (et redit « dépensés »)', [["payés en ${ST_MOIS_L[dObj(AUJ).getMonth()]} (hors taxes)${vehDontAssur()}</span>", "dépensés en ${ST_MOIS_L[dObj(AUJ).getMonth()]} (hors taxes)</span>"]], VEH],
  ['10 · la bande d’onglets de Véhicules et de Temps de travail est de nouveau étirée à l’ordinateur', [["@media (min-width:761px){.seg[aria-label=\"Temps de travail\"],.seg[aria-label=\"Véhicules\"]{align-self:flex-start}}", ""]], VEH],
  ['11 · la phrase du haut de Temps de travail oublie les « pas encore commencé »', [["  if (att && P.length) P.push(att + ' pas encore commencé');", ""]], TT],
  ['12 · une personne « pas encore commencé » dont l’intervention tourne redit « devait commencer à »', [["sous = (e.tourne ? (e.tourne.st", "sous = (false ? (e.tourne.st"]], TT],
  ['13 · la semaine en cours a de nouveau des personnes « en règle à valider »', [["else if (fini) ok.push(k); });", "else ok.push(k); });"]], TT],
  ['14 · la pastille d’une semaine en cours redit « À valider »', [["  if (a && !S.fini) return { cl:'st-g', lib:'En cours', pts };\n", ""]], TT],
  ['15 · valider une personne d’une semaine en cours n’est plus refusé (geste forgé)', [["  if (!ttSemFinie(L0)) return toast(TT_ENCOURS);\n", ""]], TT],
  ['16 · la phrase de la semaine en cours disparaît', [["!S.fini ? TT_ENCOURS + (S.reste.length", "false ? TT_ENCOURS + (S.reste.length"]], TT],
  ['17 · la feuille d’une personne propose de valider une semaine en cours', [["val ? '<div class=\"ok-bloc petit\">✓ Cette semaine est validée pour la paie.</div>' : !S.fini ? `<div class=\"info petit\">${TT_ENCOURS}</div>` : `<div class=\"actions\">", "val ? '<div class=\"ok-bloc petit\">✓ Cette semaine est validée pour la paie.</div>' : `<div class=\"actions\">"]], TT],
  ['18 · « Valider ce qui est en règle » (Mois) valide aussi la semaine en cours', [["if (w.valide || !w.fini) return; if (w.alertes", "if (w.valide) return; if (w.alertes"]], TT],
  ['19 · un congé s’écrit de nouveau le week-end sur la feuille d’une personne', [["const a = dObj(d).getDay() % 6 ? absDe(k, d) : null, P = ptJour(k, d)[0]", "const a = absDe(k, d), P = ptJour(k, d)[0]"]], TT],
  ['20 · un jour à venir redit « pas encore »', [["a ? a.type : futur ? 'à venir' :", "a ? a.type : futur ? 'pas encore' :"]], TT],
  ['21 · la feuille Mois d’une personne ne dit plus « dont X en octobre »', [["${w.mois !== w.tot ? ' · dont ' + ttHL(w.mois) + ' en ' + ttMois() : ''}", ""]], TT],
  ['22 · le mois fermé dit « elle sera régularisée » pour un homme', [["(ttFem(k) ? 'elle sera régularisée' : 'il sera régularisé')", "'elle sera régularisée'"]], TT],
  ['23 · la Paie redit « sup. » sur la ligne d’une semaine', [["'+' + ptH(sup) + ' en plus'", "'+' + ptH(sup) + ' sup.'"]], TT],
  ['24 · la Paie redit « se termine en novembre »', [["w.report ? `payée avec ${paieMoisVoisin(1)}` : ''", "w.report ? `se termine en ${paieMoisVoisin(1)}` : ''"]], TT],
  ['25 · le retour de la Paie ne rouvre plus l’onglet Mois', [["RETOUR.garde = () => { TT.garder = true; }", "RETOUR.garde = () => {}"]], RET],
  ['26 · le titre du visionneur de fiche de paie passe de nouveau sous la croix', [["padding-right:52px;white-space:normal;overflow-wrap:anywhere;line-height:1.25}", "padding-right:52px}"]], VIS, { PROFILS:'iphone' }],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, paires, partie, env] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  let page = SRC;
  for (const [ancien, neuf] of paires) { const c = page.split(ancien).length - 1;
    if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué\n   ${ancien.slice(0, 90)}`); process.exit(2); }
    page = page.split(ancien).join(neuf); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const R = racine('m', page); if (page === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  const r = cp.spawnSync('node', [SONDE], { env: { ...process.env, RACINE: R, PROFILS:'mac', NUIT:'0', PARTIES:partie, ...(env || {}) }, encoding: 'utf8', timeout: 400000 });
  const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
  const tombe = (r.status === 1 || r.status === 2) && /^  ✗/m.test(r.stdout || '');
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' → ' + bil + ' sortie ' + r.status);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(x => console.log(' ✗ vivante :', x));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
