/* ══ OP MESSAGES — UNE RÉUNION DE PLUSIEURS JOURS DIT OÙ ELLE FINIT (lot q01, q#2) ════════════════════════════════════════════════════════════
   Une réunion du vendredi 23 octobre 09:00 au lundi 26 octobre 09:00 (Paris) : la fiche disait « Vendredi 23 octobre · 09:00 – 09:00 » et la rangée de l'Agenda « 09:00 » sur « 09:00 » — une durée
   nulle à la lecture. Depuis p04 le suffixe « (été) / (hiver) » ne s'écrit plus que le MÊME jour (voir test-2650), et rien d'autre ne le remplaçait : le jour de fin n'était écrit nulle part.
   Quand la fin tombe un AUTRE jour que le début : la fiche (contact et réunion) écrit le jour de fin (« 09:00 – lun. 26 oct. 09:00 »), la rangée empilée écrit « 26/10 09:00 » sous l'heure de début
   (la forme courte qui tient dans la colonne, qui s'élargit comme pour la saison). Le même jour, rien ne change (contre-épreuves : un jour ordinaire, le dimanche du changement d'heure).
   Les VRAIES fonctions de la page sont exécutées, sous le fuseau Europe/Paris posé par le banc. ⚠️ Faire PARAÎTRE la réunion chaque jour qu'elle couvre est un changement de l'agenda : décision de Justin. */
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

const REQUIS = { esc: ligne('const esc = '), FMT_HEURE: ligne('const FMT_HEURE = '), heureSaison: entre('const heureSaison = ', '\n  };'), plageHeures: ligne('const plageHeures = '),
  heureEmpilee: entre('const heureEmpilee = ', '\n  };'), FMT_JOUR_FICHE: ligne('const FMT_JOUR_FICHE = '), quandFiche: ligne('const quandFiche = '),
  heureDans: ligne('function heureDans('), villeDe: ligne('const villeDe = '), libelleHoraire: entre('function libelleHoraire(', '\n  }') };
/* ce que le correctif ajoute : cherché s'il existe, jamais exigé ici (les comportements ci-dessous tombent sans lui) */
const OPTION = { FMT_JOUR_FIN: ligne('const FMT_JOUR_FIN = '), FMT_JJMM: ligne('const FMT_JJMM = '), autreJour: ligne('const autreJour = '), plageLongue: ligne('const plageLongue = ') };
const manquants = Object.keys(REQUIS).filter(k => !REQUIS[k]);
vrai('(population) chaque morceau existant de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);
const ctx = { Intl, Date, Math, Number, String, Array, Set, Object, console }; vm.createContext(ctx);
let F = null;
try { vm.runInContext([REQUIS.esc, REQUIS.FMT_HEURE, OPTION.FMT_JOUR_FIN, OPTION.FMT_JJMM, OPTION.autreJour, REQUIS.heureSaison, REQUIS.plageHeures, OPTION.plageLongue, REQUIS.heureEmpilee, REQUIS.FMT_JOUR_FICHE, REQUIS.quandFiche, REQUIS.heureDans, REQUIS.villeDe, REQUIS.libelleHoraire].filter(Boolean).join('\n') + '\nthis.F = { plageHeures, heureEmpilee, quandFiche, libelleHoraire };', ctx); F = ctx.F; } catch (e) { console.log('  ✗ ' + e.message); }
vrai('(population) le bac à sable exécute les vraies fonctions', !!F && typeof F.libelleHoraire === 'function');
if (!F) { fin(); } else {
  const texteDe = h => h.replace(/<[^>]*>/g, '|').replace(/\|+/g, '|').replace(/^\||\|$/g, '');
  v('(population) le banc tourne sous Europe/Paris : le 23/10 le décalage est −120, le 26/10 −60', [new Date(Date.UTC(2026, 9, 23, 7)).getTimezoneOffset(), new Date(Date.UTC(2026, 9, 26, 8)).getTimezoneOffset()], [-120, -60]);

  /* ── vendredi 23/10 09:00 (07:00Z) → lundi 26/10 09:00 (08:00Z) ── */
  const o = { debut: Date.UTC(2026, 9, 23, 7, 0), fin: Date.UTC(2026, 9, 26, 8, 0) };
  const sans = { tz: 'Europe/Paris' };
  v('⛔ la fiche d\'un contact dit le jour de fin', F.quandFiche(o), 'vendredi 23 octobre · 09:00 – lun. 26 oct. 09:00');
  v('⛔ la fiche de la réunion (l\'horaire sous le jour) dit le jour de fin', F.libelleHoraire(sans, o).h, '09:00 – lun. 26 oct. 09:00');
  v('…et n\'invente pas de « note » de fuseau (même heure, même fuseau)', F.libelleHoraire(sans, o).note, '');
  v('⛔ la rangée empilée de l\'Agenda : l\'heure de début, puis « 26/10 09:00 » — la fin est un autre jour', texteDe(F.heureEmpilee(o.debut, o.fin)), '09:00|26/10 09:00');
  vrai('…et la colonne s\'élargit (classe `jours`), comme pour la saison : « 26/10 09:00 » ne tient pas dans 48 px', /class="reunion-heure jours"/.test(F.heureEmpilee(o.debut, o.fin)));
  v('la rangée d\'un événement qui CONTINUE (« Suite ») dit aussi où il finit', texteDe(F.heureEmpilee(o.debut, o.fin, 'Suite')), 'Suite|26/10 09:00');
  v('la plage d\'HEURES seule (étiquette de pastille, chevauchement) ne change pas : le jour est dit à côté', F.plageHeures(o.debut, o.fin), '09:00 – 09:00');

  /* ── une fin qui passe minuit : un autre jour, donc dit ── */
  const nuit = { debut: Date.UTC(2026, 9, 20, 21, 0), fin: Date.UTC(2026, 9, 20, 23, 0) };       // 23:00 → 01:00 (Paris, été)
  v('une réunion de 23:00 à 01:00 dit le jour de fin', F.quandFiche(nuit), 'mardi 20 octobre · 23:00 – mer. 21 oct. 01:00');
  v('…et la rangée', texteDe(F.heureEmpilee(nuit.debut, nuit.fin)), '23:00|21/10 01:00');

  /* ── contre-épreuves : le même jour, RIEN ne change ── */
  const jour = { debut: Date.UTC(2026, 9, 20, 7, 0), fin: Date.UTC(2026, 9, 20, 8, 30) };
  v('un jour ordinaire : la fiche reste « 09:00 – 10:30 »', F.quandFiche(jour), 'mardi 20 octobre · 09:00 – 10:30');
  v('…l\'horaire de la réunion aussi', F.libelleHoraire(sans, jour).h, '09:00 – 10:30');
  v('…la rangée empilée aussi, sans classe `jours`', [texteDe(F.heureEmpilee(jour.debut, jour.fin)), /jours|saison/.test(F.heureEmpilee(jour.debut, jour.fin))], ['09:00|10:30', false]);
  const dst = { debut: Date.UTC(2026, 9, 25, 0, 30), fin: Date.UTC(2026, 9, 25, 1, 30) };           // dimanche du changement : 02:30 (été) → 02:30 (hiver)
  v('le dimanche du changement d\'heure, le MÊME jour : « 02:30 (été) – 02:30 (hiver) » reste dit (p04)', F.quandFiche(dst), 'dimanche 25 octobre · 02:30 (été) – 02:30 (hiver)');
  v('…et la rangée garde sa classe `saison`, pas `jours`', [texteDe(F.heureEmpilee(dst.debut, dst.fin)), /class="reunion-heure saison"/.test(F.heureEmpilee(dst.debut, dst.fin))], ['02:30 (été)|02:30 (hiver)', true]);
  /* un fuseau étranger : la note existante est conservée */
  v('(contre-épreuve) l\'heure d\'un autre fuseau reste dite à part (« … à Tokyo »)', F.libelleHoraire({ tz: 'Asia/Tokyo' }, jour).note.endsWith(' à Tokyo'), true);
  fin();
}
