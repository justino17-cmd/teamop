/* ══ MUTATIONS — L'ONGLET « RÉUNIONS » ET LE LIEN INVITÉ QU'ON TROUVE (26 octobre 2026) ═══════════════════════════════════════════════════════════
   Chaque mutation REMET le défaut que `tests/test-3070.js` garde, dans le VRAI fichier de la page, puis relance la suite : elle DOIT tomber. Le fichier est restauré par `git checkout HEAD -- <fichier>` après chaque essai —
   ⛔ ce qui suppose que le correctif soit COMMITÉ (CLAUDE.md : « correctif → banc → git commit → mutation → git checkout »), sinon la restauration emporte aussi le correctif.
   Chaque ancre doit se trouver EXACTEMENT UNE FOIS (une mutation qui frappe la mauvaise occurrence ne prouve rien). `de` et `vers` peuvent être des tableaux : une mutation à plusieurs gestes (le défaut n'existe que si deux lignes changent ensemble).
   Lancer :   node tests/mutations-onglet-reunions.js [filtre]      Code 1 si une mutation SURVIT (la suite reste verte), 2 si une ancre est introuvable ou ambiguë. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const PAGE = 'apercu/opmessages/index.html', BANC = ['tests/test-3070.js'];
const M = [
  ['L1', '« Lien invité » aussi sur la réunion d\'un AUTRE (l\'organisateur n\'est plus exigé)', "r.moi && r.moi.hote && !r.annulee && o && o.fin > Date.now()", "r.moi && !r.annulee && o && o.fin > Date.now()"],
  ['L2', '« Lien invité » sur une réunion ANNULÉE', "r.moi.hote && !r.annulee && o && o.fin", "r.moi.hote && o && o.fin"],
  ['L3', '« Lien invité » sur une réunion PASSÉE (la fin n\'est plus regardée)', "o && o.fin > Date.now() && !occTerminee(r, o));", "o && !occTerminee(r, o));"],
  ['L4', '« Lien invité » sur une séance terminée pour tous dont la fin prévue n\'est pas passée', "o.fin > Date.now() && !occTerminee(r, o));", "o.fin > Date.now());"],
  ['L5', 'le lien paraît AUSSI dans l\'Agenda (la ligne d\'avant change de forme)', ["const lien = liste && lienInvitePossible(r, o) ?", ": rej;"], ["const lien = lienInvitePossible(r, o) ?", ": rej + lien;"]],
  ['L6', '« Lien invité » sans `CAP.salles` (la salle n\'est plus exigée)', "const lienInvitePossible = (r, o) => !!(CAP.salles && typeof", "const lienInvitePossible = (r, o) => !!(typeof"],
  ['L7', '« Lien invité » proposé quand la source ne sait pas le faire', "typeof source.lienInviteReunion === 'function' && r.moi && r.moi.hote", "r.moi && r.moi.hote"],
  ['L8', 'les gestes retombent À CÔTÉ du texte (plus de rangée dessous)', "'<span class=\"reunion-gestes\">' + rej + lien + '</span>'", "rej + lien"],
  ['A1', 'à venir : la plus lointaine d\'abord', "avenir.sort((x, y) => x.o.debut - y.o.debut", "avenir.sort((x, y) => y.o.debut - x.o.debut"],
  ['A2', 'une séance terminée pour tous reste « à venir » (la fin prévue décide seule)', "(o.fin > now && !occTerminee(r, o) ? avenir : passees)", "(o.fin > now ? avenir : passees)"],
  ['A3', 'le côté (Perso / Pro) ne filtre plus la liste', "for (const r of reunions) if (duCote(coteReu(r))) for", "for (const r of reunions) for"],
  ['A4', 'la liste n\'est plus plafonnée (soixante-dix lignes)', "const vus = avenir.slice(0, LR_MAX)", "const vus = avenir.slice(0)"],
  ['A5', 'la fenêtre de devant dépasse la limite du service (62 jours)', "const LR_AVENIR_JOURS = 60,", "const LR_AVENIR_JOURS = 90,"],
  ['A6', 'une réunion lue dans les deux fenêtres paraît deux fois (occurrences doublées)', "if (!vue.occurrences.some(x => x.debut === o.debut)) vue.occurrences.push(o);", "vue.occurrences.push(o);"],
  ['A7', 'une moitié de lecture qui échoue ne se dit pas', "if (a.status === 'rejected' || p.status === 'rejected') lr.panne", "if (false) lr.panne"],
  ['A8', 'une lecture périmée remplace la neuve', "if (n !== lr.jeton) return;                      // une lecture plus récente", "if (false) return;                      // une lecture plus récente"],
  ['A9', 'l\'état vide ne dit plus quoi faire', "<span>Aucune réunion prévue.</span><button type=\"button\" class=\"lr-nouvelle presse\" data-lr=\"nouvelle\">", "<span>Rien.</span><button type=\"button\" class=\"lr-nouvelle presse\" data-lr=\"x\">"],
  ['A10', 'l\'intertitre « En cours » devient la date du début', "x => x.o.debut <= now ? -1 : minuitDe(x.o.debut)", "x => minuitDe(x.o.debut)"],
  ['F1', 'la carte « Invité (sans compte) » n\'est plus posée en haut de la fiche', "    if (inviteHaut) s += htmlInviteSansCompte();\n", "\n"],
  ['F2', 'la carte invité sur une fiche de séance FINIE', "const inviteHaut = hote && !d.annulee && !finie && CAP.salles", "const inviteHaut = hote && !d.annulee && CAP.salles"],
  ['F3', 'la carte invité pour un INVITÉ (l\'organisateur n\'est plus exigé)', "const inviteHaut = hote && !d.annulee", "const inviteHaut = !d.annulee"],
  ['F4', 'la carte invité sur une réunion ANNULÉE', "const inviteHaut = hote && !d.annulee && !finie", "const inviteHaut = hote && !finie"],
  ['F5', 'la carte invité quand la source ne sait pas faire le lien', " && CAP.salles && typeof source.lienInviteReunion === 'function';", " && CAP.salles;"],
  ['F6', 'la proposition de la création paraît sur TOUTE fiche', "const neuve = !!(reu.fiche && reu.fiche.neuve);", "const neuve = true;"],
  ['F7', 'la proposition de la création ne se consomme pas (elle reparaît à chaque ouverture)', "const neuve = reu.neuve === id; reu.neuve = null;", "const neuve = reu.neuve === id;"],
  ['F8', 'la création ne pose plus la marque « neuve »', "reu.neuve = r.id;", ""],
  ['F9', 'la création ne relit plus l\'onglet Réunions', "if (etat.route && etat.route.vue === 'reunions-liste') chargerListeReunions();       // l'onglet Réunions montre", "if (false) chargerListeReunions();       // l'onglet Réunions montre"],
  ['N1', 'l\'onglet Réunions reste côté Perso (il n\'est plus rangé parmi les vues du côté Pro)', "const VUES_PRO = ['accueil', 'courrier', 'reunions-liste'];", "const VUES_PRO = ['accueil', 'courrier'];"],
  ['N2', '`demarrer` n\'insère plus l\'onglet avant l\'Agenda', "if (CAP.reunions) ORDRE.splice(ORDRE.indexOf('reunions'), 0, 'reunions-liste');", ""],
  ['N3', '`appliquer` n\'entre plus dans l\'onglet (la liste reste vide)', "if (r.vue === 'reunions-liste') entrerListeReunions();", ""],
  ['N4', 'le service qui change une réunion ne relit plus l\'onglet', "if (etat.route && etat.route.vue === 'reunions-liste') chargerListeReunions(); else lr.charge = false;", ""],
  ['N5', 'passer à Perso depuis l\'onglet ne le quitte plus', "VUES_PRO.includes(etat.route.vue) && m === 'perso') remplacer(", "(etat.route.vue === 'accueil' || etat.route.vue === 'courrier') && m === 'perso') remplacer("],
  ['N6', 'la barre à sept onglets ne se resserre plus', "classList.toggle('dense', NAV.length >= 7)", "classList.toggle('dense', NAV.length >= 99)"],
  ['N7', 'la section de la vue n\'existe plus dans la page', '<section class="vue" id="vue-reunions-liste" aria-labelledby="titre-reunions-liste" hidden></section>', ''],
].map(([id, label, de, vers]) => [id, label, PAGE, de, vers, BANC]);

const filtre = process.argv[2] || '';
let survivantes = 0, ancres = 0, essais = 0;
for (const [id, label, fichier, de, vers, suites] of M) {
  if (filtre && !id.startsWith(filtre)) continue;
  const chemin = path.join(RACINE, fichier), src = fs.readFileSync(chemin, 'utf8');
  const des = [].concat(de), verss = [].concat(vers);
  const comptes = des.map(x => src.split(x).length - 1);
  if (comptes.some(n => n !== 1)) { console.log('✗ ' + id + ' : l\'ancre se trouve ' + comptes.join('/') + ' fois dans ' + fichier + ' (il en faut UNE)'); ancres++; continue; }
  let neuf = src; des.forEach((x, i) => { neuf = neuf.replace(x, () => verss[i]); });
  fs.writeFileSync(chemin, neuf);
  const diff = spawnSync('git', ['diff', '--stat', '--', fichier], { cwd: RACINE, encoding: 'utf8' }).stdout;
  const tombees = [];
  try {
    for (const s of suites) {
      const r = spawnSync(process.execPath, [s], { cwd: RACINE, encoding: 'utf8', timeout: 120000 });
      const m = /(\d+) ✓ +(\d+) ✗/.exec((r.stdout || '').split('\n').filter(l => /\d+ ✓ +\d+ ✗/.test(l)).pop() || '');
      if (r.status !== 0 || (m && +m[2] > 0) || !m) tombees.push(path.basename(s) + (m ? '(' + m[1] + ' ✓ ' + m[2] + ' ✗)' : '(sans total)'));
    }
  } finally { spawnSync('git', ['checkout', 'HEAD', '--', fichier], { cwd: RACINE, encoding: 'utf8' }); }
  essais++;
  if (!/\| *\d+/.test(diff)) console.log('⚠ ' + id + ' : le fichier n\'a pas changé (la mutation n\'a rien frappé)');
  if (tombees.length) console.log('✓ ' + id + ' ' + label + ' — tombe : ' + tombees.join(', '));
  else { console.log('✗ ' + id + ' ' + label + ' — SURVIT (la suite reste verte)'); survivantes++; }
}
console.log('\n' + essais + ' mutations jouées, ' + survivantes + ' survivante(s), ' + ancres + ' ancre(s) fautive(s)');
process.exit(ancres ? 2 : survivantes ? 1 : 0);
