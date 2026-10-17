/* ══ OP MESSAGES — LA FIN D'UNE RÉUNION DE PLUSIEURS JOURS SE LIT PARTOUT AVEC SON JOUR (re-test final de q01, 17 octobre 2026) ═════════════════
   q01 a fait dire le jour de fin à la fiche, à l'horaire de la réunion, à la rangée empilée de l'Agenda et à l'étiquette lue d'une pastille (test-2661). Le re-test du
   code FUSIONNÉ (agent neuf, puis un second chargé de le réfuter) a trouvé trois endroits qui écrivaient encore les heures à la main, sans `finLue` ni `plageLongue` :
     · l'aperçu du LIEN D'INVITÉ d'une réunion (`#reunion=<code>`) : « Vendredi 23 octobre · 09:00 à 09:00 » — reproduit au navigateur, compte de Dan ;
     · le COMPTE RENDU d'une séance qui a duré au-delà de minuit : « 09:00–09:00 » ;
     · `quandRdv`, le titre du menu d'un élément de l'Agenda et le « Prévu / Nouveau » de « Décaler » : « vendredi 23 octobre, 09:00 – 09:00 ».
   Puis le second agent (chargé de réfuter le correctif) en a trouvé quatre de plus, même famille, par des gestes ordinaires de « Décaler » et de l'Agenda :
     · la phrase de CHEVAUCHEMENT de « Décaler » : « ce créneau chevauche « WeekendPro » (09:00 – 09:00) » — elle ne dit le jour de l'autre événement nulle part ;
     · l'heure dans un AUTRE FUSEAU : la note « Heure de New York : 09:00 – 09:00 » de « Décaler », et la parenthèse « (09:00 – 09:00 à New York) » de la rangée
       (`libelleHoraire`) — d'où `finDans(debut, fin, tz)`, la règle de `jourFinDit` lue dans le fuseau de la réunion ;
     · le « chez eux » du formulaire d'une réunion (« de 09:00 à 09:00 »).
   Les VRAIES fonctions de la page sont exécutées sous Europe/Paris ; pour l'aperçu, l'EXPRESSION réelle de la ligne (commentaires retirés) est évaluée avec la réponse du
   service. Contre-épreuves : le même jour, rien ne change (un jour ordinaire, une soirée qui passe minuit, le dimanche du changement d'heure). */
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
  esc: ligne('const esc = '), maj1: ligne('const maj1 = '), icone: ligne('const icone = '), FMT_HEURE: ligne('const FMT_HEURE = '), FMT_JOUR_LONG: ligne('const FMT_JOUR_LONG = '),
  FMT_JOUR_FIN: ligne('const FMT_JOUR_FIN = '), autreJour: ligne('const autreJour = '), minutesDuJour: ligne('const minutesDuJour = '), jourFinDit: ligne('const jourFinDit = '),
  heureSaison: entre('const heureSaison = ', '\n  };'), plageHeures: ligne('const plageHeures = '), finLue: ligne('const finLue = '), plageLongue: ligne('const plageLongue = '),
  REPONSE_CR: ligne('const REPONSE_CR = '), dureeCr: ligne('const dureeCr = '), htmlCompteRendu: entre('function htmlCompteRendu(', "return h + '</span>';\n  }"),
  quandRdv: ligne('const quandRdv = '),
  heureDans: ligne('function heureDans('), finDans: entre('function finDans(', '\n  }'), villeDe: ligne('const villeDe = '), libelleHoraire: entre('function libelleHoraire(', '\n  }'),
  titreElt: ligne('const titreElt = '), phraseChevauche: ligne('const phraseChevauche = '),
};
const manquants = Object.keys(REQUIS).filter(k => !REQUIS[k]);
vrai('(population) chaque morceau de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);
/* l'aperçu du lien d'invité vit dans une fonction asynchrone qui parle au service et au DOM : on évalue l'EXPRESSION réelle de la ligne de la carte, telle que le code l'écrit */
const carte = /<div class="invite-carte"><h3>' \+ esc\(r\.titre \|\| 'Réunion'\) \+ '<\/h3><p>' \+ (esc\([^\n]*?\)) \+ '<\/p>' \+/.exec(JS);
vrai('(population) la ligne de la carte d\'invité est trouvée, et son texte sous le titre est une expression `esc(…)`', !!carte);

const ctx = { Intl, Date, Math, Number, String, Array, Object, console }; vm.createContext(ctx);
let F = null;
try {
  vm.runInContext(Object.values(REQUIS).filter(Boolean).join('\n')
    + '\nthis.F = { quandRdv, htmlCompteRendu, plageHeures, finDans, libelleHoraire, phraseChevauche, apercu: r => ' + (carte ? carte[1] : '""') + ' };', ctx);
  F = ctx.F;
} catch (e) { console.log('  ✗ ' + e.message); }
vrai('(population) le bac à sable exécute les vraies fonctions', !!F && typeof F.quandRdv === 'function' && typeof F.htmlCompteRendu === 'function');
if (!F) { fin(); } else {
  v('(population) le banc tourne sous Europe/Paris : le 23/10 le décalage est −120, le 26/10 −60', [new Date(Date.UTC(2026, 9, 23, 7)).getTimezoneOffset(), new Date(Date.UTC(2026, 9, 26, 8)).getTimezoneOffset()], [-120, -60]);
  const quandCr = h => ((/<span class="cr-quand">([^<]*)<\/span>/.exec(h) || [, ''])[1]).replace(/&#39;/g, "'");
  const cr = (debut, finT) => F.htmlCompteRendu({ compteRendu: { titre: 'Garde', debut, fin: finT, dureeS: 0, presents: [], presentsN: 0, absents: [], absentsN: 0, points: [], documents: 0 } }, 'recu');

  /* ── vendredi 23/10 09:00 (07:00Z) → lundi 26/10 09:00 (08:00Z) ── */
  const o = { debut: Date.UTC(2026, 9, 23, 7, 0), fin: Date.UTC(2026, 9, 26, 8, 0) };
  v('⛔ l\'aperçu du LIEN D\'INVITÉ dit le jour de fin', F.apercu({ titre: 'WeekendPro', debut: o.debut, fin: o.fin }), 'Vendredi 23 octobre · 09:00 à lun. 26 oct. 09:00');
  v('⛔ le COMPTE RENDU dit le jour de fin', quandCr(cr(o.debut, o.fin)), 'Vendredi 23 octobre · 09:00–lun. 26 oct. 09:00');
  v('⛔ `quandRdv` (menu d\'un élément, « Décaler ») dit le jour de fin', F.quandRdv(o.debut, o.fin, false, 1), 'Vendredi 23 octobre, 09:00 – lun. 26 oct. 09:00');
  /* plus de 24 h avec une fin plus tôt sur l'horloge : sans le jour, on lirait une nuit */
  const longue = { debut: Date.UTC(2026, 9, 23, 21, 0), fin: Date.UTC(2026, 9, 24, 23, 0) };     // vendredi 23:00 → dimanche 01:00 (encore l'été : le passage est à 01:00 UTC)
  v('⛔ vendredi 23:00 → dimanche 01:00 : l\'aperçu le dit (« 23:00 à 01:00 » se lirait comme une nuit)', F.apercu({ titre: 'x', debut: longue.debut, fin: longue.fin }), 'Vendredi 23 octobre · 23:00 à dim. 25 oct. 01:00');

  /* ── contre-épreuves : le même jour, rien ne change ── */
  const jour = { debut: Date.UTC(2026, 9, 20, 7, 0), fin: Date.UTC(2026, 9, 20, 8, 30) };
  v('un jour ordinaire : l\'aperçu reste « 09:00 à 10:30 »', F.apercu({ titre: 'x', debut: jour.debut, fin: jour.fin }), 'Mardi 20 octobre · 09:00 à 10:30');
  v('…le compte rendu reste « 09:00–10:30 »', quandCr(cr(jour.debut, jour.fin)), 'Mardi 20 octobre · 09:00–10:30');
  v('…`quandRdv` reste « 09:00 – 10:30 »', F.quandRdv(jour.debut, jour.fin, false, 1), 'Mardi 20 octobre, 09:00 – 10:30');
  const nuit = { debut: Date.UTC(2026, 9, 20, 21, 0), fin: Date.UTC(2026, 9, 20, 23, 0) };       // 23:00 → 01:00 (été) : la fin, plus tôt sur l'horloge, se lit seule
  v('une soirée de 23:00 à 01:00 reste « 23:00 à 01:00 » (l\'agenda de tous les jours ne bouge pas)', [F.apercu({ titre: 'x', debut: nuit.debut, fin: nuit.fin }), F.quandRdv(nuit.debut, nuit.fin, false, 1)],
    ['Mardi 20 octobre · 23:00 à 01:00', 'Mardi 20 octobre, 23:00 – 01:00']);
  const dst = { debut: Date.UTC(2026, 9, 25, 0, 30), fin: Date.UTC(2026, 9, 25, 1, 30) };          // dimanche du changement : 02:30 (été) → 02:30 (hiver)
  v('le dimanche du changement d\'heure, le MÊME jour : la saison reste dite partout (p04)', [F.apercu({ titre: 'x', debut: dst.debut, fin: dst.fin }), quandCr(cr(dst.debut, dst.fin)), F.quandRdv(dst.debut, dst.fin, false, 1)],
    ['Dimanche 25 octobre · 02:30 (été) à 02:30 (hiver)', 'Dimanche 25 octobre · 02:30 (été)–02:30 (hiver)', 'Dimanche 25 octobre, 02:30 (été) – 02:30 (hiver)']);
  v('une journée entière : `quandRdv` garde « toute la journée » et « 3 jours »', [F.quandRdv(jour.debut, jour.fin, true, 1), F.quandRdv(o.debut, o.fin, true, 3)], ['Mardi 20 octobre, toute la journée', 'Vendredi 23 octobre, 3 jours']);
  v('la plage d\'HEURES seule (étiquette du chevauchement, qui a le jour à côté) ne change pas', F.plageHeures(o.debut, o.fin), '09:00 – 09:00');
  /* une séance sans fin connue garde l'heure de début seule */
  v('un compte rendu sans fin : l\'heure de début seule', quandCr(cr(jour.debut, 0)), 'Mardi 20 octobre · 09:00');

  /* ── le second agent : le chevauchement de « Décaler », l'heure dans un autre fuseau, le « chez eux » du formulaire ── */
  const elt = (titre, x) => ({ r: { titre }, o: x });
  v('⛔ le CHEVAUCHEMENT de « Décaler » dit où l\'autre événement finit', F.phraseChevauche([elt('WeekendPro', o)]), 'Attention, ce créneau chevauche « WeekendPro » (09:00 – lun. 26 oct. 09:00).');
  v('…et un chevauchement le même jour reste « 09:00 – 10:30 »', F.phraseChevauche([elt('Court', jour)]), 'Attention, ce créneau chevauche « Court » (09:00 – 10:30).');
  /* une réunion fixée à New York, 72 h : mercredi 21/10 09:00 (13:00Z) → samedi 24/10 09:00 (13:00Z) ; à Paris, 15:00 → 15:00 */
  const ny = { debut: Date.UTC(2026, 9, 21, 13, 0), fin: Date.UTC(2026, 9, 24, 13, 0) };
  v('(population) New York est à −4 h ce jour-là : 13:00Z s\'y lit 09:00, et 15:00 à Paris', [F.finDans(ny.debut, ny.debut, 'America/New_York'), new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(ny.debut)], ['09:00', '15:00']);
  v('⛔ `finDans` : la fin d\'une réunion de 72 h à New York dit son jour, lu À New York', F.finDans(ny.debut, ny.fin, 'America/New_York'), 'sam. 24 oct. 09:00');
  const lh = F.libelleHoraire({ tz: 'America/New_York' }, ny);
  v('⛔ la rangée d\'une réunion de New York : l\'heure de Paris ET la parenthèse de New York disent le jour de fin', [lh.h, lh.hz], ['15:00 – sam. 24 oct. 15:00', '09:00 – sam. 24 oct. 09:00']);
  vrai('…et la note dit la ville', /^09:00 – sam\. 24 oct\. 09:00 à /.test(lh.note));
  /* le jour se juge DANS le fuseau : 22:00 → 23:00 à Paris est 16:00 → 17:00 à New York, même jour ; 05:00 → 07:00 à Paris (le lendemain) est 23:00 → 01:00 à New York */
  const nyJour = { debut: Date.UTC(2026, 9, 21, 13, 0), fin: Date.UTC(2026, 9, 21, 14, 30) };
  v('contre-épreuve : une réunion d\'une heure et demie à New York garde l\'heure seule', F.finDans(nyJour.debut, nyJour.fin, 'America/New_York'), '10:30');
  const nySoir = { debut: Date.UTC(2026, 9, 22, 3, 0), fin: Date.UTC(2026, 9, 22, 5, 0) };       // 23:00 → 01:00 à New York, 05:00 → 07:00 à Paris (même jour)
  v('contre-épreuve : une soirée de 23:00 à 01:00 À NEW YORK garde l\'heure seule là-bas (la fin, plus tôt sur l\'horloge, se lit)', F.finDans(nySoir.debut, nySoir.fin, 'America/New_York'), '01:00');
  v('un fuseau inconnu : `finDans` rend vide, comme `heureDans` (rien d\'inventé)', F.finDans(ny.debut, ny.fin, 'Nulle/Part'), '');
  /* la note de « Décaler » et le « chez eux » du formulaire écrivent la fin par `finDans` : leurs fonctions touchent le DOM, on lit leur CODE (commentaires retirés) */
  const dec = entre('function decalerApercu(', '\n  }'), chez = entre('function peindreChezEux(', '\n  }');
  vrai('(population) `decalerApercu` et `peindreChezEux` sont trouvées', dec.length > 300 && chez.length > 300);
  vrai('⛔ la note de fuseau de « Décaler » écrit la fin par `finDans(t, t + F.duree, F.tz)`', /' : ' \+ loin \+ ' – ' \+ finDans\(t, t \+ F\.duree, F\.tz\)/.test(dec) && !/heureDans\(t \+ F\.duree/.test(dec));
  vrai('⛔ le « chez eux » du formulaire écrit la fin par `finDans(a, b, z.value)`', /' à ' \+ finDans\(a, b, z\.value\)/.test(chez) && !/' à ' \+ heureDans\(b, z\.value\)/.test(chez));
  fin();
}
