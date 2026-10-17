/* ══ OP MESSAGES — L'AGENDA DIT CE QU'IL AFFICHE : L'HEURE QUI SONNE DEUX FOIS, ET CE QUE CONTIENT UN JOUR (lot m05 : agenda@4, pro@10, agenda@5) ═══════════
   · agenda@4 + pro@10 — le dimanche 25 octobre 2026 (retour à l'heure d'hiver, Paris), une réunion d'une heure à 02:30 (été) finit à 02:30 (hiver) : le menu d'appui long, l'étiquette
     de la case, la ligne de la réunion et l'événement disaient « 02:30 – 02:30 ». C'est juste, mais déroutant. Quand le début et la fin s'affichent pareil sans être au même décalage,
     chaque heure dit sa saison (« 02:30 (été) – 02:30 (hiver) ») ; tous les autres jours, l'heure s'écrit comme avant. Les VRAIES fonctions de la page sont exécutées, sous le fuseau
     Europe/Paris posé par le banc lui-même.
   · agenda@5 — l'étiquette d'accessibilité d'un jour disait « 1 élément » : elle dit « 1 rendez-vous », « 2 événements », « 3 réunions » ; un jour qui mêle des sortes garde
     « éléments ». Le vide sous « Journée / Congés » n'est PAS retenu : la hauteur de 64 px d'une rangée est le plancher tactile voulu, la raccourcir déplace une mise en page que l'équipe connaît.
   · (relecture) « sur TOUTES les plages » : les rangées empilées de l'Agenda (début au-dessus de la fin), le compte rendu de séance, le message de chevauchement et la fiche contact disent
     la saison eux aussi — chacun est joué ici, et la mutation « FMT_HEURE seul » sur l'un d'eux doit tomber.
   ⛔ Une absence se prouve sur une population : le nombre d'éléments de chaque jour joué est compté, et la mutation « plus de sorte » doit tomber. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const entre = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

(async () => {
  const M = {
    esc: ligne('const esc = '), FMT_HEURE: ligne('const FMT_HEURE = '), FMT_JOUR_LONG: ligne('const FMT_JOUR_LONG = '), FMT_JOUR_COURT: ligne('const FMT_JOUR_COURT = '), maj1: ligne('const maj1 = '),
    heureSaison: entre('const heureSaison = ', '\n  };'), plageHeures: ligne('const plageHeures = '),
    heureDans: ligne('function heureDans('), villeDe: ligne('const villeDe = '), libelleHoraire: decl('function libelleHoraire('), quandRdv: ligne('const quandRdv = '),
    titreElt: ligne('const titreElt = '), journeeElt: ligne('const journeeElt = '), termineeElt: ligne('const termineeElt = '), sorteElt: ligne('const sorteElt = '), nombreElts: decl('function nombreElts('),
    etiquetteJour: ligne('const etiquetteJour = '), libelleEtat: decl('function libelleEtat('), puceAgenda: entre('function puceAgenda(', "corps + '</button>';\n  }"), caseJour: decl('function caseJour('),
    ligneEvenement: decl('function ligneEvenement('),
    heureEmpilee: entre('const heureEmpilee = ', '\n  };'), phraseChevauche: ligne('const phraseChevauche = '),
    quandFiche: ligne('const quandFiche = '), FMT_JOUR_FICHE: ligne('const FMT_JOUR_FICHE = '),
    REPONSE_CR: ligne('const REPONSE_CR = '), dureeCr: ligne('const dureeCr = '), htmlCompteRendu: decl('function htmlCompteRendu('),
    ligneReunion: decl('function ligneReunion('),
  };
  /* sans le correctif, ces morceaux n'existent pas : on le DIT (la population), et le banc tombe sur les contrôles qui suivent */
  const manquants = Object.keys(M).filter(k => !M[k]);
  vrai('(population) chaque morceau de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);

  const ctx = {
    Intl, Date, Math, Number, String, Array, Set, Object, console,
    CAP: { agenda: true }, reu: { charge: true, mois: 0, jour: 0 }, peutDecaler: () => false, premierDuMois: () => 0, texteRappels: () => '', icone: () => '', CHEVRON: '',
    occurrencesDuJour: () => ctx.__liste,
    MOI: { id: 'moi' }, nomPersonne: id => id, dureeSeance: () => '1 h', ecartJours: () => 0,
  };
  vm.createContext(ctx);
  let F = null;
  try { vm.runInContext(Object.values(M).filter(Boolean).join('\n') + '\nthis.F = { heureEmpilee, phraseChevauche, quandFiche, htmlCompteRendu, ligneReunion, libelleHoraire, quandRdv, puceAgenda, caseJour, ligneEvenement, etiquetteJour, nombreElts: typeof nombreElts === "function" ? nombreElts : null };', ctx, { timeout: 3000 }); F = ctx.F; } catch (e) { F = null; console.log('  (le bac à sable ne démarre pas : ' + e.message + ')'); }
  vrai('(population) le bac à sable exécute les vraies fonctions', !!F && typeof F.libelleHoraire === 'function');
  if (!F) return fin();

  /* ── le dimanche 25 octobre 2026, 02:30 (été) = 00:30 UTC ; 02:30 (hiver) = 01:30 UTC ── */
  const DEB = Date.UTC(2026, 9, 25, 0, 30), FIN = Date.UTC(2026, 9, 25, 1, 30);
  v('(population) le banc tourne bien sous Europe/Paris : 00:30 UTC s\'affiche 02:30 et 01:30 UTC aussi', [new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(DEB), new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(FIN), new Date(DEB).getTimezoneOffset(), new Date(FIN).getTimezoneOffset()], ['02:30', '02:30', -120, -60]);
  const reunion = { id: 'r1', titre: 'Revue hebdomadaire', tz: 'Europe/Paris', moi: { statut: 'accepte' }, occurrences: [] }, occ = { debut: DEB, fin: FIN };
  const LABEL = '02:30 (été) – 02:30 (hiver)';
  v('⛔ la ligne d\'une réunion d\'une heure ce dimanche-là : l\'heure dit sa saison', F.libelleHoraire(reunion, occ).h, LABEL);
  v('⛔ le menu d\'appui long (« Dimanche 25 octobre, … ») aussi', F.quandRdv(DEB, FIN, false, 1), 'Dimanche 25 octobre, ' + LABEL);
  ctx.__liste = [{ r: reunion, o: occ }];
  const puce = F.puceAgenda({ r: Object.assign({}, reunion, { annulee: false }), o: occ }, Date.UTC(2026, 9, 24, 22, 0));
  v('⛔ l\'étiquette de la puce de case (lecteur d\'écran) aussi', (/aria-label="([^"]*)"/.exec(puce) || [, ''])[1], 'Revue hebdomadaire, ' + LABEL);
  const evt = { id: 'e1', titre: 'Garde de nuit', debut: DEB, fin: FIN, journee: false, rappels: [], genre: 'evt' };
  v('⛔ la ligne d\'un événement : « de 02:30 (été) à 02:30 (hiver) »', (/aria-label="([^"]*)"/.exec(F.ligneEvenement(evt, Date.UTC(2026, 9, 24, 22, 0), false)) || [, ''])[1], 'Garde de nuit, de 02:30 (été) à 02:30 (hiver)');

  /* ── (relecture) les rangées EMPILÉES de l'Agenda, le compte rendu, le chevauchement et la fiche contact : la saison s'y dit aussi ── */
  const texteDe = h => h.replace(/<[^>]*>/g, '|').replace(/\|+/g, '|').replace(/^\||\|$/g, '');
  const visible = (/<span class="reunion-heure[^"]*">([\s\S]*?)<\/span>/.exec(F.ligneReunion(Object.assign({}, reunion, { lieu: '', participantsN: 2, hote: 'x', rejoignable: false, salleOuverte: false, titre: 'Revue' }), occ)) || [, ''])[1];
  v('⛔ la rangée d\'une réunion (début au-dessus de la fin) : « 02:30 (été) » puis « 02:30 (hiver) », pas « 02:30 » sur « 02:30 »', texteDe(visible), '02:30 (été)|02:30 (hiver)');
  v('⛔ la rangée d\'un événement : même chose, et la colonne s\'élargit (classe `saison`) seulement ce jour-là', [texteDe((/<span class="reunion-heure[^"]*">[\s\S]*?<\/span>/.exec(F.ligneEvenement(evt, Date.UTC(2026, 9, 24, 22, 0), false)) || [''])[0]), /class="reunion-heure saison"/.test(F.ligneEvenement(evt, Date.UTC(2026, 9, 24, 22, 0), false))], ['02:30 (été)|02:30 (hiver)', true]);
  v('(non régressé) un lundi ordinaire : « 14:00 » sur « 15:00 », colonne inchangée (pas de classe `saison`)', [F.heureEmpilee(Date.UTC(2026, 9, 26, 13, 0), Date.UTC(2026, 9, 26, 14, 0)), F.heureEmpilee(Date.UTC(2026, 9, 26, 13, 0), Date.UTC(2026, 9, 26, 14, 0), 'Suite')], ['<span class="reunion-heure">14:00<small>15:00</small></span>', '<span class="reunion-heure">Suite<small>15:00</small></span>']);
  const cr = F.htmlCompteRendu({ compteRendu: { titre: 'Revue', debut: DEB, fin: FIN, dureeS: 3600, presentsN: 0, presents: [], absentsN: 0, absents: [], points: [], documents: 0 } }, 'recu');
  v('⛔ le compte rendu de séance : « de 02:30 (été) à 02:30 (hiver) » écrit avec la saison', (/<span class="cr-quand">([^<]*)<\/span>/.exec(cr) || [, ''])[1].split(' · ')[1], '02:30 (été)–02:30 (hiver)');
  v('(non régressé) le compte rendu d\'un lundi ordinaire garde « 14:00–15:00 »', (/<span class="cr-quand">([^<]*)<\/span>/.exec(F.htmlCompteRendu({ compteRendu: { titre: 'Revue', debut: Date.UTC(2026, 9, 26, 13, 0), fin: Date.UTC(2026, 9, 26, 14, 0), dureeS: 3600, presentsN: 0, presents: [], absentsN: 0, absents: [], points: [], documents: 0 } }, 'recu')) || [, ''])[1].split(' · ')[1], '14:00–15:00');
  v('⛔ le message de chevauchement (« Attention, ce créneau chevauche… ») dit la saison', F.phraseChevauche([{ e: { titre: 'Garde de nuit' }, o: { debut: DEB, fin: FIN } }]), 'Attention, ce créneau chevauche « Garde de nuit » (02:30 (été) – 02:30 (hiver)).');
  v('⛔ la fiche d\'un contact (« Réunions à venir ensemble ») dit la saison', F.quandFiche({ debut: DEB, fin: FIN }), 'dimanche 25 octobre · 02:30 (été) – 02:30 (hiver)');

  /* ── tous les autres jours : l'heure s'écrit comme avant ── */
  const D2 = Date.UTC(2026, 9, 26, 13, 0), F2 = Date.UTC(2026, 9, 26, 14, 0);
  v('(non régressé) un lundi ordinaire : « 14:00 – 15:00 », sans saison', [F.libelleHoraire(reunion, { debut: D2, fin: F2 }).h, F.quandRdv(D2, F2, false, 1)], ['14:00 – 15:00', 'Lundi 26 octobre, 14:00 – 15:00']);
  const D3 = Date.UTC(2026, 9, 25, 0, 0), F3 = Date.UTC(2026, 9, 25, 0, 45);
  v('(non régressé) le même dimanche, avant la répétition : « 02:00 – 02:45 », sans saison (les heures diffèrent)', F.libelleHoraire(reunion, { debut: D3, fin: F3 }).h, '02:00 – 02:45');
  v('(non régressé) 24 heures pile (même heure, même décalage) : pas de saison', F.libelleHoraire(reunion, { debut: Date.UTC(2026, 9, 20, 8, 0), fin: Date.UTC(2026, 9, 21, 8, 0) }).h, '10:00 – 10:00');

  /* ── agenda@5 : ce que contient un jour ── */
  const rdv = (id) => ({ e: { id, titre: 'RDV ' + id, genre: 'rdv', debut: DEB, fin: FIN, journee: false }, o: { debut: DEB, fin: FIN } });
  const evn = (id) => ({ e: { id, titre: 'Evt ' + id, genre: 'evt', debut: DEB, fin: FIN, journee: false }, o: { debut: DEB, fin: FIN } });
  const reu = (id) => ({ r: { id, titre: 'Réunion ' + id, tz: 'Europe/Paris', moi: { statut: 'accepte' }, annulee: false }, o: { debut: DEB, fin: FIN } });
  const T0 = Date.UTC(2026, 9, 22, 0, 0);
  const cas = [[[rdv('a')], '1 rendez-vous'], [[rdv('a'), rdv('b')], '2 rendez-vous'], [[evn('a')], '1 événement'], [[evn('a'), evn('b')], '2 événements'], [[reu('a')], '1 réunion'], [[reu('a'), reu('b'), reu('c')], '3 réunions'], [[rdv('a'), evn('b')], '2 éléments']];
  const bandeau = cas.map(([l]) => (F.etiquetteJour(T0, l).split(', ').pop()));
  v('population : sept jours joués, ' + cas.length + ' étiquettes lues', bandeau.length, 7);
  v('⛔ le bandeau des jours : le nombre ET la sorte (« 1 rendez-vous », « 2 événements », « 3 réunions », et « 2 éléments » pour un jour qui mêle)', bandeau, cas.map(c => c[1]));
  v('(non régressé) un jour vide : « rien de prévu »', F.etiquetteJour(T0, []).split(', ').pop(), 'rien de prévu');
  const cases = cas.map(([l]) => { ctx.__liste = l; return (/data-jour="\d+" aria-pressed="[a-z]+" aria-label="([^"]*)"/.exec(F.caseJour(T0, 0, 3, true)) || [, ''])[1].split(', ')[1].split(' : ')[0]; });
  v('⛔ la case du mois et de la semaine : même vocabulaire que le bandeau', cases, cas.map(c => c[1]));
  fin();
})().catch(e => { console.log('  ✗ le banc a échoué : ' + (e && e.stack || e)); process.exitCode = 1; });
