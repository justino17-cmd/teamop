/* ══ OP MESSAGES — « (ÉTÉ) / (HIVER) » NE SE POSE QUE LE JOUR MÊME (lot p04 : agenda n#0) ═══════════════════════════════════════════════════════════════
   Une réunion du vendredi 23 octobre 09:00 au lundi 26 octobre 09:00 (Paris) traverse le changement d'heure : début et fin s'affichent « 09:00 » avec deux décalages, et `heureSaison` posait
   « 09:00 (été) / 09:00 (hiver) » — alors que début et fin tombent des JOURS DIFFÉRENTS : aucune ambiguïté à lever. Le commentaire de la fonction le promet (« tous les autres jours :
   l'heure s'écrit comme avant »). Le suffixe ne sert que le dimanche du changement, où la même heure sonne deux fois LE MÊME JOUR.
   Les VRAIES fonctions de la page (`heureSaison`, `plageHeures`, `heureEmpilee`) sont exécutées, sous le fuseau Europe/Paris posé par le banc lui-même. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const entre = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const M = { esc: ligne('const esc = '), FMT_HEURE: ligne('const FMT_HEURE = '), heureSaison: entre('const heureSaison = ', '\n  };'), plageHeures: ligne('const plageHeures = '),
  /* (lot q01) la rangée empilée dit le jour de fin d'une réunion de plusieurs jours : `heureEmpilee` lit `autreJour` et `FMT_JJMM` */
  FMT_JOUR_FIN: ligne('const FMT_JOUR_FIN = '), FMT_JJMM: ligne('const FMT_JJMM = '), autreJour: ligne('const autreJour = '), plageLongue: ligne('const plageLongue = '), heureEmpilee: entre('const heureEmpilee = ', '\n  };') };
const manquants = Object.keys(M).filter(k => !M[k]);
vrai('(population) chaque morceau de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);
const ctx = { Intl, Date, Math, Number, String, Array, Set, Object, console }; vm.createContext(ctx);
let F = null;
try { vm.runInContext(Object.values(M).filter(Boolean).join('\n') + '\nthis.F = { heureSaison, plageHeures, heureEmpilee };', ctx); F = ctx.F; } catch (e) { console.log('  ✗ ' + e.message); }
vrai('(population) le bac à sable exécute les vraies fonctions', !!F && typeof F.plageHeures === 'function');
if (!F) { fin(); } else {
  const texteDe = h => h.replace(/<[^>]*>/g, '|').replace(/\|+/g, '|').replace(/^\||\|$/g, '');
  const H = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  v('(population) le banc tourne sous Europe/Paris : le 23/10 le décalage est −120, le 26/10 −60', [new Date(Date.UTC(2026, 9, 23, 7)).getTimezoneOffset(), new Date(Date.UTC(2026, 9, 26, 8)).getTimezoneOffset()], [-120, -60]);

  /* ── plusieurs jours : 23/10 09:00 (07:00Z) → 26/10 09:00 (08:00Z) ── */
  const D = Date.UTC(2026, 9, 23, 7, 0), E = Date.UTC(2026, 9, 26, 8, 0);
  v('(population) début et fin s\'affichent pareil (« 09:00 ») malgré deux décalages — c\'est le cas qui posait le suffixe', [H.format(D), H.format(E)], ['09:00', '09:00']);
  v('⛔ la plage d\'une réunion de plusieurs jours : « 09:00 – 09:00 », sans saison', F.plageHeures(D, E), '09:00 – 09:00');
  /* (lot q01) la rangée disait « 09:00 » sur « 09:00 », une durée nulle : elle dit désormais le jour de fin (« 26/10 09:00 », test-2661). Ce que p04 garantit reste : AUCUNE saison (« (été) / (hiver) »). */
  v('⛔ la rangée empilée de l\'Agenda : pas de saison (le jour de fin est dit à la place, voir test-2661)', texteDe(F.heureEmpilee(D, E)), '09:00|26/10 09:00');
  v('⛔ …et la colonne ne prend pas la classe `saison` (elle prend `jours`)', [/class="reunion-heure saison"/.test(F.heureEmpilee(D, E)), /class="reunion-heure jours"/.test(F.heureEmpilee(D, E))], [false, true]);
  v('⛔ chaque bout, un par un', [F.heureSaison(D, E), F.heureSaison(E, D)], ['09:00', '09:00']);

  /* ── le dimanche 25 octobre 02:30 (été) → 02:30 (hiver) : le suffixe reste (contre-épreuve : il ne faut pas l'avoir supprimé) ── */
  const DEB = Date.UTC(2026, 9, 25, 0, 30), FIN = Date.UTC(2026, 9, 25, 1, 30);
  v('le dimanche du changement, le MÊME jour : « 02:30 (été) – 02:30 (hiver) » reste dit', F.plageHeures(DEB, FIN), '02:30 (été) – 02:30 (hiver)');
  v('…et la rangée empilée aussi, avec sa classe `saison`', [texteDe(F.heureEmpilee(DEB, FIN)), /class="reunion-heure saison"/.test(F.heureEmpilee(DEB, FIN))], ['02:30 (été)|02:30 (hiver)', true]);
  v('un jour ordinaire : « 09:00 – 10:30 »', F.plageHeures(Date.UTC(2026, 9, 20, 7, 0), Date.UTC(2026, 9, 20, 8, 30)), '09:00 – 10:30');
  fin();
}
