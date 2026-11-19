// Contre-épreuve de la sonde restes-vehtemps-tour2-recontrole.js : chaque mutation REMET un défaut corrigé au tour 2 dans une COPIE de apercu/ (sous /tmp, jamais dans le dépôt),
// et la partie de la sonde qui le garde doit tomber (sortie ≠ 0). Un remplacement qui ne touche pas EXACTEMENT une occurrence arrête le script (mutation mal visée).
// Usage : node mutations-restes-vehtemps-tour2-recontrole.js [numéros]  — un navigateur à la fois, 127.0.0.1 seulement.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..', '..', '..'), SRC = path.join(RACINE, 'apercu'), TMP = '/tmp/mut-rc3-vehtemps', SONDE = path.join(__dirname, 'restes-vehtemps-tour2-recontrole.js');
const M = [
  { n:1, nom:'le drapeau viaPaie n’est plus lu : le retour du système rouvre « Aujourd’hui »', parties:'retour', page:'prototype-op-gestion.html', de:"!(TT.avant === 'comptabilite' && TT.viaPaie && TT.sys)) { ptOnglet", vers:"false) { ptOnglet" },
  { n:2, nom:'le menu garde le drapeau : « Temps de travail » pris dans le menu rouvre Mois (la porte de lireHash retirée)', parties:'retour', page:'prototype-op-gestion.html', de:"if (!TT.sys) TT.viaPaie = TT.viaPaie === 'neuf'; }", vers:"}" },
  { n:3, nom:'le drapeau ne survit plus à un retour : retour, avance, retour rouvre « Aujourd’hui »', parties:'retour', page:'prototype-op-gestion.html', de:"TT.garder = false; if (!TT.sys) TT.viaPaie = false;", vers:"TT.garder = false; TT.viaPaie = false;" },
  { n:4, nom:'le départ guidé ne compte que la dernière semaine finie', parties:'depart,boucle', page:'prototype-op-gestion.html', de:".filter(L => ttSemFinie(L) && !PT_VALIDE[k + L] && !ptxJours(L).every(d => paieMoisVerrou(d)))", vers:".filter(L => L === Lp && ttSemFinie(L) && !PT_VALIDE[k + L])" },
  { n:5, nom:'la ligne grise paraît même sans pointage cette semaine', parties:'depart', page:'prototype-op-gestion.html', de:" && !PT_VALIDE[k + L0] && POINTAGES.some(o => o.qui === k && lundi(o.date) === L0);", vers:" && !PT_VALIDE[k + L0];" },
  { n:6, nom:'l’alerte alerte de nouveau pour la semaine en cours', parties:'depart,boucle', page:'prototype-op-gestion.html', de:".filter(L => ttSemFinie(L) && !PT_VALIDE[k + L] &&", vers:".filter(L => !PT_VALIDE[k + L] &&" },
  { n:7, nom:'le retour du système ne se distingue plus d’un clic de menu (navClic ignoré)', parties:'retour', page:'prototype-op-gestion.html', de:"TT.sys = cpProg === null && Date.now() - navClic > 700;", vers:"TT.sys = cpProg === null;" },
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
