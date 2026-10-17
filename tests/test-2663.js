/* ══ OP MESSAGES — LE RAPPORT DE PRÉSENCE D'UNE SÉANCE QUI PASSE LA JOURNÉE DIT SES JOURS (balayage du re-test final, 17 octobre 2026) ═══════════════════════
   Le balayage complet d'OP MESSAGES (page et service) cherchait toute heure de fin écrite sans son jour ; un second agent l'a rejoué contre le vrai service, horloge avancée. Un seul reste :
   le RAPPORT DE PRÉSENCE (fiche de la réunion pour l'organisateur, panneau de la salle, export CSV). D'une séance du vendredi 23/10 09:00 au lundi 26/10 09:00, il écrivait
   « Dan Roux 10:00 → 09:00 · 72 h 00 » sous « Ven. 23 oct., 09:00 » — un départ qui se lit avant l'arrivée — et, Dan entré le samedi, ni le jour d'arrivée ni celui du départ.
   Le CSV n'avait que FMT_HEURE dans « Arrivée » et « Départ ». Désormais : l'arrivée dit son jour quand ce n'est pas celui de la séance (en direct : pas aujourd'hui), le départ quand
   `jourFinDit` le veut — la règle de la fin d'une réunion. Le même jour, rien ne change.
   Les VRAIES fonctions de la page sont exécutées sous Europe/Paris ; l'export CSV est joué avec un faux Blob qui garde ce qu'on lui donne. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = T.sansCommentaires((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const entre = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const REQUIS = {
  FMT_HEURE: ligne('const FMT_HEURE = '), FMT_JOUR_FIN: ligne('const FMT_JOUR_FIN = '), FMT_SUIVI: ligne('const FMT_SUIVI = '), autreJour: ligne('const autreJour = '),
  minutesDuJour: ligne('const minutesDuJour = '), jourFinDit: ligne('const jourFinDit = '), dureeCourte: ligne('const dureeCourte = '),
  REPONSES_INVITE: ligne('const REPONSES_INVITE = '), ABSENCES_APPEL: ligne('const ABSENCES_APPEL = '),
  presenceLignes: entre('function presenceLignes(', '\n  }'), presenceCsv: entre('function presenceCsv(', '\n  }'),
};
/* ce que le correctif ajoute : cherché, jamais exigé (sans lui, les comportements ci-dessous tombent) */
const OPTION = { heurePresence: ligne('const heurePresence = '), departPresence: ligne('const departPresence = ') };
const manquants = Object.keys(REQUIS).filter(k => !REQUIS[k]);
vrai('(population) chaque morceau de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);

const ecrit = [];
const ctx = { Intl, Date, Math, Number, String, Array, Object, console,
  Blob: function (parts) { ecrit.push(parts.join('')); }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  document: { createElement: () => ({ style: {}, click() {}, remove() {} }), body: { appendChild() {} } }, setTimeout: () => 0, mot: () => {} };
vm.createContext(ctx);
let F = null;
try { vm.runInContext(Object.values(REQUIS).concat(Object.values(OPTION)).filter(Boolean).join('\n') + '\nthis.F = { presenceLignes, presenceCsv };', ctx); F = ctx.F; } catch (e) { console.log('  ✗ ' + e.message); }
vrai('(population) le bac à sable exécute les vraies fonctions', !!F && typeof F.presenceLignes === 'function');
if (!F) { fin(); } else {
  v('(population) le banc tourne sous Europe/Paris : 07:00Z le 23/10 s\'affiche 09:00', new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(Date.UTC(2026, 9, 23, 7)), '09:00');
  const H = (j, h, m) => Date.UTC(2026, 9, j, h, m || 0);    // UTC : +2 h jusqu'au 25/10 01:00Z, +1 h ensuite
  const seance = (venus) => ({ debut: H(23, 7), fin: H(26, 8), venus, absents: [{ id: 'z', nom: 'Zoé', statut: 'manque', reponse: null }] });
  /* vendredi 23/10 09:00 → lundi 26/10 09:00 (Paris) ; Ana arrive à l'ouverture, Dan le vendredi 10:00, Cléo le samedi 10:00 */
  const longue = seance([
    { id: 'a', nom: 'Ana', arrivee: H(23, 7), depart: H(26, 8), duree: 73 * 3600, present: false },
    { id: 'd', nom: 'Dan', arrivee: H(23, 8), depart: H(26, 8), duree: 72 * 3600, present: false },
    { id: 'c', nom: 'Cléo', arrivee: H(24, 8), depart: H(26, 8), duree: 48 * 3600, present: false },
  ]);
  const L = F.presenceLignes(longue).venus.map(x => x.detail);
  v('⛔ Ana (arrivée le jour de la séance) : le départ dit son jour', L[0], '09:00 → lun. 26 oct. 09:00 · 73 h 00');
  v('⛔ Dan : « 10:00 → lun. 26 oct. 09:00 », plus « 10:00 → 09:00 » (un départ qui se lit avant l\'arrivée)', L[1], '10:00 → lun. 26 oct. 09:00 · 72 h 00');
  v('⛔ Cléo, arrivée le samedi : l\'arrivée ET le départ disent leur jour', L[2], 'sam. 24 oct. 10:00 → lun. 26 oct. 09:00 · 48 h 00');
  v('les absents ne changent pas', F.presenceLignes(longue).absents.map(x => x.detail), ['N\'a pas répondu']);

  /* contre-épreuves : le même jour, rien ne change ; une soirée de moins de 24 h garde l'heure seule (la règle de `jourFinDit`) */
  const ordinaire = { debut: H(20, 7), fin: H(20, 8, 30), venus: [{ id: 'a', nom: 'Ana', arrivee: H(20, 7, 2), depart: H(20, 8, 30), duree: 5280, present: false }], absents: [] };
  v('une séance ordinaire reste « 09:02 → 10:30 · 1 h 28 »', F.presenceLignes(ordinaire).venus[0].detail, '09:02 → 10:30 · 1 h 28');
  const soiree = { debut: H(20, 21), fin: H(20, 23), venus: [{ id: 'a', nom: 'Ana', arrivee: H(20, 21), depart: H(20, 23), duree: 7200, present: false }], absents: [] };
  v('une soirée 23:00 → 01:00 reste « 23:00 → 01:00 · 2 h 00 » (la fin, plus tôt sur l\'horloge, se lit)', F.presenceLignes(soiree).venus[0].detail, '23:00 → 01:00 · 2 h 00');
  /* en direct : « Depuis » dit le jour quand l'arrivée n'est pas d'aujourd'hui */
  const maintenant = Date.now();
  const direct = { debut: maintenant - 3 * 86400000, fin: null, venus: [
    { id: 'a', nom: 'Ana', arrivee: maintenant - 3 * 86400000, depart: null, duree: 3 * 86400, present: true },
    { id: 'b', nom: 'Ben', arrivee: maintenant - 60000, depart: null, duree: 60, present: true }], absents: [] };
  const D = F.presenceLignes(direct).venus.map(x => x.detail);
  vrai('⛔ en direct, une arrivée d\'il y a trois jours dit son jour : « Depuis <jour> HH:MM »', /^Depuis \S+\. \d+ \S+\.? \d\d:\d\d · en ce moment · 72 h 00$/.test(D[0]));
  const memeJour = new Date(maintenant - 60000).toDateString() === new Date(maintenant).toDateString();   // (le banc lancé à minuit pile : la minute d'avant est hier, le jour s'écrit à bon droit)
  vrai('…et une arrivée d\'il y a une minute garde l\'heure seule', !memeJour || /^Depuis \d\d:\d\d · en ce moment · 1 min$/.test(D[1]));

  /* ── l'export CSV ── */
  ecrit.length = 0; F.presenceCsv('Week-end', [longue, ordinaire]);
  vrai('(population) le CSV a été écrit', ecrit.length === 1 && /^\ufeff"Séance";"Nom"/.test(ecrit[0]));
  const lignes = (ecrit[0] || '').replace(/^\ufeff/, '').split('\r\n').filter(Boolean).map(l => l.split(';').map(c => c.replace(/^"|"$/g, '')));
  const de = nom => lignes.find(l => l[1] === nom && l[2] === 'oui') || [];
  v('⛔ CSV : Dan, « Arrivée 10:00 ; Départ lun. 26 oct. 09:00 »', [de('Dan')[3], de('Dan')[4]], ['10:00', 'lun. 26 oct. 09:00']);
  v('⛔ CSV : Cléo, l\'arrivée du samedi dit son jour', [de('Cléo')[3], de('Cléo')[4]], ['sam. 24 oct. 10:00', 'lun. 26 oct. 09:00']);
  const ord = lignes.filter(l => l[1] === 'Ana' && l[2] === 'oui')[1] || [];
  v('CSV : la séance ordinaire garde l\'heure seule', [ord[3], ord[4]], ['09:02', '10:30']);
  vrai('CSV : la colonne « Séance » dit toujours le jour du début, et les absents restent', lignes.some(l => l[1] === 'Zoé' && l[2] === 'non') && /^ven\. 23 oct\./.test(de('Dan')[0] || ''));
  fin();
}
