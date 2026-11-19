// Contre-épreuve du recontrôle « restes vehtemps » (tour 1) : chaque mutation remet UN défaut dans une COPIE de la page (jamais dans le dépôt) et la
// sonde restes-vehtemps-tour1-recontrole.js doit tomber sur la partie qui le garde. Une mutation qui ne casse rien = un contrôle qui ne regarde pas au bon endroit.
// Usage : [PROFILS=iphone] node mutations-restes-vehtemps-recontrole.js [numéros] — la mutation 3 ne se joue qu’au téléphone (PROFILS=iphone). Une exécution à la fois (un navigateur), 127.0.0.1 seulement.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..', '..', '..'), SRC = path.join(RACINE, 'apercu', 'prototype-op-gestion.html');
const M = [
  { n:1, nom:'ttValiderUn ne refuse plus la semaine en cours', parties:'tt', de:"  if (!ttSemFinie(L0)) return toast(TT_ENCOURS);\n", vers:"" },
  { n:2, nom:'ttJoursListe écrit « Congé payé » le week-end', parties:'tt', de:"a = dObj(d).getDay() % 6 ? absDe(k, d) : null, P = ptJour(k, d)[0], pr = prevuMin(k, d), ouv = P && ptOuvert(P), cor", vers:"a = absDe(k, d), P = ptJour(k, d)[0], pr = prevuMin(k, d), ouv = P && ptOuvert(P), cor" },
  { n:3, nom:'le titre du visionneur repasse sous la croix', parties:'visionneur', de:"white-space:normal;overflow-wrap:anywhere;line-height:1.25}.dp-gestes{width:100%}", vers:"white-space:nowrap;line-height:1.25}.dp-gestes{width:100%}" },
  { n:4, nom:'la bande d\'onglets de Temps de travail est de nouveau étirée à l\'ordinateur', parties:'onglets', de:"@media (min-width:761px){.seg[aria-label=\"Temps de travail\"],.seg[aria-label=\"Véhicules\"]{align-self:flex-start}}", vers:"" },
  { n:5, nom:'« dont l\'assurance » compte une prime d\'un autre mois', parties:'veh', de:"f.achat && /^Assurance/i.test(f.lib) && f.d.slice(0, 7) === AUJ.slice(0, 7)", vers:"f.achat && /^Assurance/i.test(f.lib)" },
  { n:6, nom:'vhCourt n’élide plus devant « É » (majuscule accentuée)', parties:'veh', de:"/^[aeiouyàâéèêîôû]/i.test(m) ? 'l’' : 'le '", vers:"/^[aeiouyàâèêîôû]/i.test(m) ? 'l’' : 'le '" },
  { n:7, nom:'le retour de la Paie par la barre ne garde plus l\'onglet (garde retirée)', parties:'retour', de:"RETOUR.garde = () => { TT.garder = true; }; TT.viaPaie = true; }", vers:"TT.viaPaie = true; }" },
  { n:9, nom:'le retour du SYSTÈME depuis la Paie rouvre « Aujourd\'hui » (drapeau viaPaie ignoré)', parties:'retour', de:" && !(TT.avant === 'comptabilite' && TT.viaPaie)) { ptOnglet", vers:") { ptOnglet" },
  { n:10, nom:'vhCourt élide de nouveau devant « y » (« l’Yaris »)', parties:'veh', de:"/^(?:[aeiouàâäéèêëîïôöûüœ]|ypsilon)/i.test(m)", vers:"/^[aeiouyàâäéèêëîïôöûüœ]/i.test(m)" },
  { n:11, nom:'le départ guidé annonce de nouveau la semaine en cours comme une alerte', parties:'voisins', de:"const pt = ptGen && ttSemFinie(Lp) && !PT_VALIDE[k + Lp] && POINTAGES.some(o => o.qui === k && lundi(o.date) === Lp);", vers:"const pt = ptGen && !PT_VALIDE[k + L0];" },
  { n:8, nom:'le Mois compte la semaine en cours parmi les semaines à valider', parties:'tt', de:"nonValidees:semaines.filter(w => !w.valide && w.fini).length", vers:"nonValidees:semaines.filter(w => !w.valide).length" },
];
const veut = (process.argv[2] || '').split(',').filter(Boolean).map(Number), tombe = [];
for (const m of M.filter(x => !veut.length || veut.includes(x.n))) {
  const src = fs.readFileSync(SRC, 'utf8'), i = src.indexOf(m.de); if (i < 0 || src.indexOf(m.de, i + 1) >= 0) { console.log('  ? ' + m.n + ' · ' + m.nom + ' : la cible est ' + (i < 0 ? 'introuvable' : 'ambiguë')); tombe.push(m.n); continue; }
  const dir = fs.mkdtempSync('/tmp/mut-rv-'); fs.mkdirSync(path.join(dir, 'apercu'));
  for (const f of fs.readdirSync(path.join(RACINE, 'apercu'))) { const p = path.join(RACINE, 'apercu', f); if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(dir, 'apercu', f)); }
  fs.writeFileSync(path.join(dir, 'apercu', 'prototype-op-gestion.html'), src.slice(0, i) + m.vers + src.slice(i + m.de.length));
  const r = spawnSync('node', [path.join(__dirname, 'restes-vehtemps-tour1-recontrole.js')], { env:Object.assign({}, process.env, { RACINE:dir, PARTIES:m.parties }), encoding:'utf8', timeout:420000 });
  const bilan = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || []), ko = parseInt(bilan[2] || '0', 10), attendus = (r.stdout || '').split('\n').filter(l => /^ {2}✗/.test(l) && true).length;
  console.log((attendus > 0 ? '  ✓ ' : '  ✗ ') + m.n + ' · ' + m.nom + ' : ' + (attendus > 0 ? 'la sonde tombe (' + attendus + ' contrôle(s) neufs ✗)' : 'LA SONDE NE TOMBE PAS'));
  if (!attendus) tombe.push(m.n);
  fs.rmSync(dir, { recursive:true, force:true });
}
console.log('\n== ' + (M.filter(x => !veut.length || veut.includes(x.n)).length - tombe.length) + ' ✓ · ' + tombe.length + ' ✗');
process.exit(tombe.length ? 1 : 0);
