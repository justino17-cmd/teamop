// Contre-épreuve de la sonde restes-vehtemps-tour2-recontrole.js : chaque mutation REMET un défaut corrigé au tour 2 dans une COPIE de apercu/ (sous /tmp, jamais dans le dépôt),
// et la partie de la sonde qui le garde doit tomber (sortie ≠ 0). Un remplacement qui ne touche pas EXACTEMENT une occurrence arrête le script (mutation mal visée).
// Usage : node mutations-restes-vehtemps-tour2-recontrole.js [numéros]  — un navigateur à la fois, 127.0.0.1 seulement.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..', '..', '..'), SRC = path.join(RACINE, 'apercu'), TMP = '/tmp/mut-rc2-vehtemps', SONDE = path.join(__dirname, 'restes-vehtemps-tour2-recontrole.js');
const M = [
  { n:1, nom:'le drapeau viaPaie n’est plus lu : le retour du système rouvre « Aujourd’hui »', parties:'retour', page:'prototype-op-gestion.html', de:"&& !(TT.avant === 'comptabilite' && TT.viaPaie)) { ptOnglet", vers:") { ptOnglet" },
  { n:2, nom:'« y » redevient une voyelle : « l’Yaris »', parties:'veh', page:'prototype-op-gestion.html', de:"/^(?:[aeiouàâäéèêëîïôöûüœ]|ypsilon)/i", vers:"/^[aeiouyàâéèêîôû]/i" },
  { n:3, nom:'« Ypsilon » n’élide plus', parties:'veh', page:'prototype-op-gestion.html', de:"|ypsilon)/i", vers:")/i" },
  { n:4, nom:'le départ guidé alerte de nouveau pour la semaine en cours', parties:'depart,boucle', page:'prototype-op-gestion.html', de:"const pt = ptGen && ttSemFinie(Lp) && !PT_VALIDE[k + Lp] && POINTAGES.some(o => o.qui === k && lundi(o.date) === Lp);", vers:"const pt = ptGen && !PT_VALIDE[k + L0];" },
  { n:5, nom:'la ligne grise « semaine en cours » disparaît', parties:'depart', page:'prototype-op-gestion.html', de:"const ptEnCours = ptGen && !ttSemFinie(L0) && !PT_VALIDE[k + L0];", vers:"const ptEnCours = false;" },
  { n:6, nom:'la fiche de paie de l’application parle de prototype', parties:'bulletin', page:'prototype-op-gestion.html', de:"${enApp() ? 'Conservez ce bulletin sans limitation de durée.' : `Prototype", vers:"${false ? 'Conservez ce bulletin sans limitation de durée.' : `Prototype" },
];
const filtre = process.argv.slice(2).map(Number); let tombees = 0, vivantes = 0;
for (const m of M) { if (filtre.length && !filtre.includes(m.n)) continue;
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); fs.cpSync(SRC, path.join(TMP, 'apercu'), { recursive: true });
  const f = path.join(TMP, 'apercu', m.page); const t = fs.readFileSync(f, 'utf8'); const k = t.split(m.de).length - 1;
  if (k !== 1) { console.log('✗ mutation ' + m.n + ' mal visée : ' + k + ' occurrence(s)'); process.exit(3); }
  fs.writeFileSync(f, t.replace(m.de, () => m.vers));
  const r = spawnSync('node', [SONDE], { env:{ ...process.env, RACINE:TMP, PARTIES:m.parties, PROFILS:'mac' }, encoding:'utf8', timeout:560000 });
  const sortie = (r.stdout || '').split('\n').filter(l => /^== |^ ✗/.test(l)).slice(0, 3).join(' | ').slice(0, 260);
  if (r.status === 1) { tombees++; console.log('✓ mutation ' + m.n + ' tombe : ' + m.nom + ' — ' + sortie); } else { vivantes++; console.log('✗ mutation ' + m.n + ' SURVIT (sortie ' + r.status + ') : ' + m.nom + ' — ' + sortie); } }
fs.rmSync(TMP, { recursive: true, force: true }); console.log('\n== ' + tombees + ' tombent · ' + vivantes + ' survivent'); process.exit(vivantes ? 1 : 0);
