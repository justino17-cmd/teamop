/* ⛔ CE QUE CE FICHIER GARDE — LE PLANIFICATEUR DE RAPPELS DES RÉUNIONS : UN RAPPEL PART UNE SEULE FOIS, À SON HEURE, À LA BONNE PERSONNE, ET RIEN NE PART QUI N'A PLUS DE SENS (famille 1 puis 3, étape 6).

   Première moitié : `server-msg/planificateur.js` monté avec le VRAI stockage — un fichier de base, une clé et une horloge INJECTÉS, un faux concentrateur et un faux service push qui NOTENT ce qu'on leur
   demande. `tour()` est synchrone : on déplace l'horloge, on appelle un tour, on lit ce qui est rangé. Pas un `sleep`.
     · un rappel part à son échéance, une seule fois (un tour de plus, un redémarrage, une seconde instance : rien de plus), en notification ET en push (charge minimale, re-jugée, durée de vie bornée) ;
     · son texte dit CE QUI RESTE (« dans 9 minutes »), dans le fuseau de celui qui le lit ; plusieurs délais échus pour la même personne font UNE notification ;
     · un rappel n'est JAMAIS dû si son échéance précède l'arrivée de la personne, son propre réglage, le changement d'horaire, ou la restauration d'une base ;
     · le rattrapage a un sens (l'occurrence n'a pas commencé) ou il est ABANDONNÉ — compté, journalisé, jamais envoyé ; un déclinant, une réunion annulée : rien ;
     · le 25 octobre 2026 à Paris : « 1 jour avant » une réunion de 00:30 est le dimanche à 00:30 de la montre (25 heures avant), la série garde son heure locale ;
     · le BAIL : une seule instance planifie, un arrêt brutal le laisse expirer, un arrêt propre le rend ; une réunion qui échoue n'arrête pas les autres ; l'élagage ; la santé ; les lots en rotation ;
     · la configuration : 10 à 15 secondes en production, un bail d'au moins deux tours.
   Seconde moitié : le VRAI service, à tour rapide, horloge décalable — le rappel arrive en direct (SSE), en push, jamais deux fois ; un arrêt BRUTAL puis un redémarrage rattrapent ce qui a un sens et
   n'envoient rien de plus ; /health dit l'âge du dernier tour sans dire une réunion ; la production refuse un tour de moins de dix secondes.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const STOCK = require(path.join(T.SERVICE, 'stockage.js'));
const { ouvrir } = STOCK;
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { creerPlanificateur, HORIZON_MS } = require(path.join(T.SERVICE, 'planificateur.js'));
const { reunionsConfig } = require(path.join(T.SERVICE, 'config.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const D0 = Date.UTC(2026, 9, 19, 12, 0);              // lundi 19 octobre 2026, 12:00 UTC = 14:00 à Paris (heure d'été) : le début des réunions du banc
const CANARI = 'TITRE-WQXZ-CANARI';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-974-'));
process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } });
let n = 0;
const KEK = crypto.randomBytes(32);
const pers = (S, nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++n), prenom: nom, nom: 'Test', origine: 'beta', verifie: true });

/* Un atelier : un stockage à horloge injectée, un faux concentrateur, un faux push, un faux journal, un planificateur — et cinq personnes (Cleo vit à New York) */
function atelier(opts = {}) {
  const chemin = opts.chemin || path.join(bac, 'msg-' + (++n) + '.db');
  const h = { t: opts.t0 !== undefined ? opts.t0 : D0 - 3 * HEURE };
  const S = ouvrir({ chemin, scelleur: creerScelleur(KEK), horloge: () => h.t, moteur: opts.moteur });
  const gens = opts.chemin ? null : { ana: pers(S, 'Ana'), ben: pers(S, 'Ben'), cleo: pers(S, 'Cleo'), dan: pers(S, 'Dan'), eli: pers(S, 'Eli') };
  if (gens) S.personneMaj(gens.cleo.id, { tz: 'America/New_York' });
  const reveils = [], pushes = [], journal = [];
  const hub = { reveiller: (o) => reveils.push(o) };
  const push = { pousser: (uid, charge, o) => { pushes.push({ uid, charge, opts: o }); return Promise.resolve({}); } };
  const journaliser = (evt, champs) => journal.push({ evt, champs: champs || {} });
  const config = { reunions: Object.assign({ planificateurMs: 12000, bailMs: 60000 }, opts.reunions || {}) };
  const planif = (extra) => creerPlanificateur(Object.assign({ stockage: opts.stockage || S, hub, config, horloge: () => h.t, journaliser, push, parTour: opts.parTour }, extra || {}));
  return Object.assign({ S, chemin, h, hub, reveils, pushes, journal, config, planif, P: planif() }, gens || {});
}
/* une réunion à D0 (14:00 à Paris), rappel de 15 minutes par défaut, Ben, Cleo et Dan invités */
function reunion(a, extra) {
  const o = Object.assign({ hote: a.ana.id, titre: 'Point ' + CANARI, lieu: '', debut: D0, fin: D0 + HEURE, tz: 'Europe/Paris', rep: 'aucune', n: null, jusqua: null, rappels: [15], invites: [a.ben.id, a.cleo.id, a.dan.id], prochain: D0 }, extra || {});
  return Object.assign({ o }, a.S.reunionCreer(o));
}
const rappels = (a, uid) => a.S.notifListe(uid, 200).filter(x => x.type === 'reunion_rappel');
const textes = (a, uid) => rappels(a, uid).map(x => x.texte);
const lance = (f) => { try { f(); return null; } catch (e) { return e.code || e.message; } };

(async () => {
  /* ═══ 1. UN RAPPEL PART À SON ÉCHÉANCE, UNE SEULE FOIS ═══════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('Un rappel part à son échéance, une seule fois — en notification et en push');
  {
    const a = atelier(), r = reunion(a);
    a.h.t = D0 - HEURE; const t1 = a.P.tour();
    a.h.t = D0 - 16 * MIN; const t2 = a.P.tour();
    v('population : la réunion est dans la fenêtre du planificateur, un tour la regarde — et rien n\'est dû (une heure avant, 16 minutes avant)', [t1.actif, t1.reunions, t1.envoyes, t2.reunions, t2.envoyes], [true, 1, 0, 1, 0]);
    a.h.t = D0 - 15 * MIN; const t3 = a.P.tour();
    v('⛔ à l\'échéance (15 minutes avant) : un rappel part pour chacun des QUATRE participants — l\'hôte aussi', [t3.envoyes, [a.ana, a.ben, a.cleo, a.dan].map(p => rappels(a, p.id).length)], [4, [1, 1, 1, 1]]);
    const nb = rappels(a, a.ben.id)[0], nc = rappels(a, a.cleo.id)[0];
    v('la notification de Ben : le type, le titre de la réunion, la réunion visée, ce qui RESTE et l\'heure de Paris', [nb.type, nb.titre, nb.cible, nb.texte], ['reunion_rappel', 'Point ' + CANARI, r.id, 'Commence dans 15 minutes — lundi 19 octobre à 14:00.']);
    v('⛔ celle de Cleo, à New York, dit la MÊME réunion à SON heure : 08:00', nc.texte, 'Commence dans 15 minutes — lundi 19 octobre à 08:00.');
    v('chacun est réveillé (le flux le porte tout de suite) — en UN seul appel pour la réunion, pas un par personne', [a.reveils.length, a.reveils.flatMap(x => x.uids).sort()], [1, [a.ana.id, a.ben.id, a.cleo.id, a.dan.id].sort()]);
    a.h.t = D0 - 15 * MIN + 12000; const t4 = a.P.tour();
    a.h.t = D0 - 5 * MIN; const t5 = a.P.tour();
    v('⛔ UN SEUL envoi : un tour de plus, puis cinq minutes avant (aucun délai de 5 minutes n\'est réglé) ne renvoient rien — et les notifications sont toujours quatre', [t4.envoyes, t5.envoyes, [a.ana, a.ben, a.cleo, a.dan].map(p => rappels(a, p.id).length)], [0, 0, [1, 1, 1, 1]]);
    const pb = a.pushes.find(x => x.uid === a.ben.id);
    v('⛔ le push de Ben : la charge est MINIMALE (« Rappel de réunion » — ni titre, ni heure), l\'étiquette est celle de LA réunion, elle renotifie, elle mène à sa fiche', pb.charge && [pb.charge.type, pb.charge.titre, pb.charge.corps, pb.charge.tag, pb.charge.url, pb.charge.renotify], ['reunion', 'OP MESSAGES', 'Rappel de réunion', 'reunion:' + r.id, '/#reunions/' + r.id, true]);
    v('… le détail (titre, phrase) ne part que pour qui a activé l\'aperçu (la couche push le juge) ; l\'événement qui l\'acquittera est celui de la notification', [pb.charge.detail, Number.isInteger(pb.opts.gid) && pb.opts.gid > 0], [{ titre: 'Point ' + CANARI, corps: 'Commence dans 15 minutes — lundi 19 octobre à 14:00.' }, true]);
    a.h.t = D0 - 15 * MIN + 1000;
    v('⛔ la charge est RE-JUGÉE à l\'instant de partir : valable avec une durée de vie qui ne dépasse pas ce qui reste avant le début (15 minutes moins une seconde)', pb.charge.valide(), { ttl: 899 });
    a.h.t = D0 + 1;
    v('… et plus valable du tout une fois la réunion commencée (un téléphone éteint ne sonne pas à midi pour une réunion de dix heures)', pb.charge.valide(), false);
    a.h.t = D0 - 14 * MIN; S_repondre(a.S, r.id, a.ben.id, 'decline');
    v('… ni pour qui a décliné entre-temps', pb.charge.valide(), false);
    v('population : quatre pushes ont été demandés, pas un de plus', a.pushes.length, 4);
    a.S.fermer();
  }

  /* ═══ 2. UN REDÉMARRAGE, UNE SECONDE INSTANCE : RIEN DE PLUS ═══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nUn redémarrage ne renvoie rien (le registre) ; une seconde instance qui n\'a pas le bail ne fait rien');
  {
    const a = atelier(), r = reunion(a);
    a.h.t = D0 - 15 * MIN; const t1 = a.P.tour();
    const apres = a.planif();
    const t2 = apres.tour();
    v('population : le premier tour a envoyé quatre rappels', t1.envoyes, 4);
    v('⛔ une AUTRE instance (le même service redémarré, mais l\'ancienne tient encore le bail) ne prend pas la main : inactive, aucun envoi', [t2.actif, t2.envoyes, apres.sante().actif], [false, 0, false]);
    a.P.arreter();
    const t3 = apres.tour();
    v('⛔ l\'ancienne REND le bail en s\'arrêtant : la suivante est active tout de suite, regarde la réunion — et le registre l\'empêche de renvoyer (zéro)', [t3.actif, t3.reunions, t3.envoyes, [a.ana, a.ben, a.cleo, a.dan].map(p => rappels(a, p.id).length)], [true, 1, 0, [1, 1, 1, 1]]);
    a.S.fermer();
  }

  /* ═══ 3. PLUSIEURS DÉLAIS : CHACUN À SON HEURE, UNE NOTIFICATION POUR TOUS CEUX QUE L'ARRÊT A ACCUMULÉS ═══════════════════════════════════════════════ */
  console.log('\nPlusieurs délais pour la même personne : chacun à son heure — et UNE seule notification quand un arrêt les a laissés s\'accumuler');
  {
    const a = atelier(), r = reunion(a);
    a.S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [60, 15] });
    a.h.t = D0 - 61 * MIN; const t0 = a.P.tour();
    a.h.t = D0 - 60 * MIN; const t1 = a.P.tour();
    v('population : à 61 minutes rien ne part ; à une heure pile, seul Ben (le seul à avoir choisi une heure) reçoit son premier rappel', [t0.envoyes, t1.envoyes, textes(a, a.ben.id), rappels(a, a.ana.id).length], [0, 1, ['Commence dans 1 heure — lundi 19 octobre à 14:00.'], 0]);
    a.h.t = D0 - 15 * MIN; const t2 = a.P.tour();
    v('à 15 minutes : le second pour Ben, le premier pour les trois autres — Ben a deux notifications en tout', [t2.envoyes, rappels(a, a.ben.id).length, rappels(a, a.cleo.id).length], [4, 2, 1]);
    /* un arrêt : le service ne passe pas de 4 h à 9 minutes avant */
    const b = atelier(), rb = reunion(b);
    b.S.reunionRappelsPoser({ id: rb.id, uid: b.ben.id, rappels: [60, 15] });
    b.h.t = D0 - 9 * MIN; const tb = b.P.tour();
    v('⛔ le service était arrêté : à 9 minutes du début, les DEUX délais de Ben (une heure, 15 minutes) sont échus — UNE notification, qui dit ce qui reste (9 minutes), pas le délai d\'origine', [tb.envoyes, textes(b, b.ben.id), textes(b, b.ana.id)], [4, ['Commence dans 9 minutes — lundi 19 octobre à 14:00.'], ['Commence dans 9 minutes — lundi 19 octobre à 14:00.']]);
    const notes = [b.S.rappelDejaEnvoye(rb.id, D0, b.ben.id, 60), b.S.rappelDejaEnvoye(rb.id, D0, b.ben.id, 15)];
    b.h.t += 12000; const tb2 = b.P.tour();
    v('… les deux sont notés au registre : le plus court ne repart pas au tour suivant', [notes, tb2.envoyes, rappels(b, b.ben.id).length], [[true, true], 0, 1]);
    v('un rappel qui reste dû à moins de 90 secondes dit « maintenant »', (() => { const c = atelier(), rc = reunion(c); c.h.t = D0 - 60000; c.P.tour(); const x = textes(c, c.ben.id)[0]; c.S.fermer(); return x; })(), 'La réunion commence maintenant — lundi 19 octobre à 14:00.');
    a.S.fermer(); b.S.fermer();
  }

  /* ═══ 4. LE RATTRAPAGE A UN SENS, OU IL EST ABANDONNÉ ═════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe rattrapage a un sens (l\'occurrence n\'a pas commencé) ou il est ABANDONNÉ — compté, journalisé, jamais envoyé');
  {
    const a = atelier(), r = reunion(a);
    a.h.t = D0 + 2 * MIN; const t = a.P.tour();
    v('population : le service revient deux minutes APRÈS le début ; quatre rappels étaient dus et ne sont jamais partis', [t.reunions, t.abandonnes], [1, 4]);
    v('⛔ aucun rappel ne part pour une réunion en cours (ni notification, ni push, ni réveil)', [t.envoyes, [a.ana, a.ben, a.cleo, a.dan].map(p => rappels(a, p.id).length), a.pushes.length, a.reveils.length], [0, [0, 0, 0, 0], 0, 0]);
    v('⛔ l\'abandon est JOURNALISÉ avec son nombre — et seulement son nombre (ni titre, ni nom) —, et la santé le compte', [a.journal.filter(x => x.evt === 'rappel_abandonne').map(x => x.champs), a.P.sante().abandonnes, JSON.stringify(a.journal).includes(CANARI)], [[{ n: 4 }], 4, false]);
    v('la réunion simple n\'a plus de prochaine occurrence', a.S.reunionPlanif(r.id).prochain, null);
    a.h.t += 12000; const t2 = a.P.tour();
    v('⛔ un tour de plus ne recompte pas, ne rejournalise pas (la réunion n\'est plus regardée)', [t2.reunions, t2.abandonnes, a.journal.filter(x => x.evt === 'rappel_abandonne').length, a.P.sante().abandonnes], [0, 0, 1, 4]);
    a.S.fermer();

    /* une série hebdomadaire : l'occurrence manquée est abandonnée, la suivante a tous ses rappels */
    const s = atelier({ t0: D0 - 3 * HEURE }), rs = reunion(s, { rep: 'hebdomadaire', n: 4, invites: [s.ben.id] });
    s.h.t = D0 + 2 * MIN; const ts = s.P.tour();
    const suiv = s.S.reunionPlanif(rs.id).prochain;
    v('⛔ une série dont la première occurrence est manquée : abandon de ses deux rappels (l\'hôte et Ben), et la prochaine occurrence est la semaine suivante à la même heure de la MONTRE — 14:00 à Paris, soit 13:00 UTC (une heure de plus que 7 × 24 h : le retour à l\'heure d\'hiver a eu lieu entre les deux)', [ts.envoyes, ts.abandonnes, suiv, suiv - D0], [0, 2, D0 + 7 * JOUR + HEURE, 7 * JOUR + HEURE]);
    s.h.t = D0 + 7 * JOUR + HEURE - 15 * MIN; const ts2 = s.P.tour();
    v('… et le rappel de la semaine suivante part, lui, à son heure (population : deux personnes)', [ts2.envoyes, textes(s, s.ben.id)], [2, ['Commence dans 15 minutes — lundi 26 octobre à 14:00.']]);
    s.S.fermer();
  }

  /* ═══ 5. JAMAIS DÛ ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nUn rappel n\'est JAMAIS dû si son échéance précède l\'arrivée de la personne, son réglage, le changement d\'horaire — ou la restauration');
  {
    const a = atelier({ t0: D0 - 10 * MIN }), r = reunion(a);
    a.h.t = D0 - 9 * MIN; const t1 = a.P.tour();
    v('⛔ une réunion programmée dix minutes avant son début n\'envoie pas de « 15 minutes avant » (échéance antérieure à sa création) — et ce n\'est pas un ABANDON (rien n\'était dû)', [t1.reunions, t1.envoyes, t1.abandonnes], [1, 0, 0]);
    a.S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [15] });
    a.h.t = D0 - 8 * MIN; a.S.reunionRappelsPoser({ id: r.id, uid: a.cleo.id, rappels: [60, 5] });
    a.h.t = D0 - 5 * MIN; const t2 = a.P.tour();
    v('⛔ Cleo règle ses rappels à 60 et 5 minutes, huit minutes avant : celui de 60 minutes est caduc, celui de 5 part à son heure ; Ben a réglé 15 minutes AVANT l\'échéance de 5 — caduc aussi (son échéance précède son réglage) ; les autres gardent le défaut caduc', [t2.envoyes, rappels(a, a.cleo.id).length, rappels(a, a.ben.id).length, rappels(a, a.ana.id).length, rappels(a, a.dan.id).length], [1, 1, 0, 0, 0]);
    a.S.fermer();

    const b = atelier({ t0: D0 - 3 * HEURE }), rb = reunion(b, { invites: [b.ben.id] });
    b.h.t = D0 - 14 * MIN; const dan = b.dan;
    b.S.reunionInviter({ id: rb.id, par: b.ana.id, uids: [dan.id] });
    b.h.t = D0 - 13 * MIN; const tb = b.P.tour();
    v('⛔ Dan est invité 14 minutes avant : le rappel de 15 minutes ne lui est PAS dû (ni abandonné), alors qu\'il l\'est — à l\'heure, depuis un moment — pour Ana et Ben', [tb.envoyes, tb.abandonnes, rappels(b, dan.id).length, rappels(b, b.ben.id).length, rappels(b, b.ana.id).length], [2, 0, 0, 1, 1]);
    b.S.fermer();

    /* son propre réglage : la réunion existe depuis longtemps, Ben règle ses rappels APRÈS l'échéance de l'un d'eux (le plancher de la création n'y peut rien : c'est la date du RÉGLAGE qui compte) */
    const e = atelier({ t0: D0 - 3 * HEURE }), re = reunion(e);
    e.h.t = D0 - 14 * MIN; e.S.reunionRappelsPoser({ id: re.id, uid: e.ben.id, rappels: [15, 5] });
    e.h.t = D0 - 13 * MIN; const te1 = e.P.tour();
    v('⛔ Ben règle « 15 et 5 minutes avant » quatorze minutes avant : celui de 15 minutes est CADUC (son échéance précède son réglage — jamais rattrapé en « dans 13 minutes »), celui de 5 n\'est pas encore dû ; Ana, Cleo et Dan, au défaut de la réunion, ont le leur à l\'heure', [te1.envoyes, te1.abandonnes, [e.ana, e.cleo, e.dan, e.ben].map(p => rappels(e, p.id).length)], [3, 0, [1, 1, 1, 0]]);
    e.h.t = D0 - 5 * MIN; const te2 = e.P.tour();
    v('… et celui de 5 minutes part à son heure, une fois, pour lui seul (population : le réglage de Ben a bien pris effet)', [te2.envoyes, textes(e, e.ben.id)], [1, ['Commence dans 5 minutes — lundi 19 octobre à 14:00.']]);
    e.S.fermer();

    /* le changement d'horaire */
    const c = atelier({ t0: D0 - 3 * HEURE }), rc = reunion(c, { invites: [c.ben.id] });
    c.h.t = D0 - 20 * MIN;
    c.S.reunionModifier({ id: rc.id, par: c.ana.id, debut: D0 + 30 * MIN, fin: D0 + 90 * MIN, prochain: D0 + 30 * MIN });
    c.h.t = D0 - 15 * MIN; const tc1 = c.P.tour();
    v('⛔ la réunion est repoussée de trente minutes : à l\'ancienne échéance (15 minutes avant l\'ancienne heure), rien ne part', tc1.envoyes, 0);
    c.h.t = D0 + 15 * MIN; const tc2 = c.P.tour();
    v('… le rappel part 15 minutes avant la NOUVELLE heure, à Ana et à Ben (population : deux)', [tc2.envoyes, textes(c, c.ben.id)], [2, ['Commence dans 15 minutes — lundi 19 octobre à 14:30.']]);
    const d = atelier({ t0: D0 - 3 * HEURE }), rd = reunion(d, { invites: [d.ben.id] });
    d.h.t = D0 - 20 * MIN;
    d.S.reunionModifier({ id: rd.id, par: d.ana.id, debut: D0 - 10 * MIN, fin: D0 + 50 * MIN, prochain: D0 - 10 * MIN });
    d.h.t = D0 - 9 * MIN; const td = d.P.tour();
    v('⛔ ramenée à dans 10 minutes alors qu\'on est 20 minutes avant : la nouvelle échéance (15 minutes avant la NOUVELLE heure, soit 25 minutes avant l\'ancienne) précède le changement — jamais due, et pas un abandon', [td.envoyes, td.abandonnes], [0, 0]);
    c.S.fermer(); d.S.fermer();
  }

  /* ═══ 6. UN DÉCLINANT, UNE RÉUNION ANNULÉE ════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nUn déclinant n\'est pas rappelé ; une réunion annulée ne l\'est pour personne');
  {
    const a = atelier(), r = reunion(a);
    S_repondre(a.S, r.id, a.cleo.id, 'decline'); S_repondre(a.S, r.id, a.dan.id, 'peutetre'); S_repondre(a.S, r.id, a.ben.id, 'accepte');
    a.h.t = D0 - 15 * MIN; const t = a.P.tour();
    v('⛔ Cleo, qui a décliné, ne reçoit rien ; Dan (« peut-être »), Ben et l\'hôte, si (population : trois rappels)', [t.envoyes, rappels(a, a.cleo.id).length, rappels(a, a.dan.id).length, rappels(a, a.ben.id).length, rappels(a, a.ana.id).length], [3, 0, 1, 1, 1]);
    a.S.fermer();
    const b = atelier(), rb = reunion(b);
    b.S.reunionAnnuler({ id: rb.id, par: b.ana.id });
    b.h.t = D0 - 15 * MIN; const tb = b.P.tour();
    v('⛔ une réunion ANNULÉE n\'est plus regardée : aucun rappel (population : sans l\'annulation, quatre étaient dus)', [tb.reunions, tb.envoyes, tb.abandonnes, [b.ana, b.ben, b.cleo, b.dan].map(p => rappels(b, p.id).length)], [0, 0, 0, [0, 0, 0, 0]]);
    b.S.fermer();
  }

  /* ═══ 7. LE 25 OCTOBRE 2026 À PARIS ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe retour à l\'heure d\'hiver (dimanche 25 octobre 2026, 03:00 → 02:00) : « 1 jour avant » est un jour de la MONTRE, la série garde son heure locale');
  {
    /* une série du lundi 00:30 à Paris : le 19 octobre à 00:30 (heure d'été, 22:30 UTC la veille), puis le 26 (heure d'hiver, 23:30 UTC la veille) */
    const A19 = Date.UTC(2026, 9, 18, 22, 30), A26 = Date.UTC(2026, 9, 25, 23, 30), A2 = Date.UTC(2026, 10, 1, 23, 30);
    const a = atelier({ t0: Date.UTC(2026, 9, 17, 8, 0) });
    const r = reunion(a, { debut: A19, fin: A19 + HEURE, prochain: A19, rep: 'hebdomadaire', n: 4, invites: [a.ben.id] });
    a.S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [1440, 15] });
    a.h.t = Date.UTC(2026, 9, 17, 22, 29); const t0 = a.P.tour();
    a.h.t = Date.UTC(2026, 9, 17, 22, 30); const t1 = a.P.tour();
    v('la première occurrence (dimanche 18 → lundi 19, 00:30 à Paris) : « 1 jour avant » est samedi à 00:30 de la montre, soit 22:30 UTC — pas une minute plus tôt', [t0.envoyes, t1.envoyes, textes(a, a.ben.id)], [0, 1, ['Commence demain — lundi 19 octobre à 00:30.']]);
    a.h.t = A19 - 15 * MIN; const t2 = a.P.tour();
    a.h.t = A19 + 5 * MIN; a.P.tour();
    v('… son rappel de 15 minutes (Ana et Ben) part, puis la réunion commence : la prochaine occurrence est celle du 26, à 23:30 UTC (00:30 À PARIS, l\'heure d\'hiver est revenue) et non 22:30 UTC', [t2.envoyes, a.S.reunionPlanif(r.id).prochain, a.S.reunionPlanif(r.id).prochain === A26], [2, A26, true]);
    const veille1 = Date.UTC(2026, 9, 24, 22, 30);          // dimanche 25 octobre, 00:30 à Paris — encore l'heure d'été
    a.h.t = veille1 - MIN; const t3 = a.P.tour();
    a.h.t = veille1; const t4 = a.P.tour();
    v('⛔ « 1 jour avant » la réunion du lundi 26 à 00:30 est le dimanche 25 à 00:30 de la montre — encore l\'heure d\'été : 22:30 UTC la veille, soit 25 HEURES avant (23:30 UTC aurait été une heure trop tard)', [t3.envoyes, t4.envoyes, textes(a, a.ben.id)[0]], [0, 1, 'Commence demain — lundi 26 octobre à 00:30.']);
    a.h.t = A26 - 15 * MIN; const t5 = a.P.tour();
    v('et le rappel de 15 minutes de cette même occurrence (Ana et Ben) part 15 minutes avant 23:30 UTC', [t5.envoyes, a.S.reunionPlanif(r.id).prochain], [2, A26]);
    const veille2 = Date.UTC(2026, 9, 31, 23, 30);          // samedi 31 octobre → dimanche 1er novembre, 00:30 CET : exactement 24 heures avant le 2 novembre 00:30
    a.h.t = A26 + 5 * MIN; a.P.tour();
    a.h.t = veille2 - MIN; const t6 = a.P.tour();
    a.h.t = veille2; const t7 = a.P.tour();
    v('la semaine suivante, sans changement d\'heure entre les deux : « 1 jour avant » redevient exactement 24 heures', [a.S.reunionPlanif(r.id).prochain, t6.envoyes, t7.envoyes], [A2, 0, 1]);
    a.S.fermer();
  }

  /* ═══ 8. LE BAIL ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe bail : une seule instance planifie ; un arrêt brutal le laisse expirer ; un arrêt propre le rend');
  {
    const a = atelier({ reunions: { planificateurMs: 12000, bailMs: 30000 } }), r = reunion(a);
    const B = a.planif();
    a.h.t = D0 - 16 * MIN;
    const ta = a.P.tour(), tb = B.tour();
    v('⛔ DEUX instances sur la même base : celle qui arrive la première planifie ; la seconde ne fait RIEN et dit qu\'elle n\'est pas active', [ta.actif, tb.actif, B.sante().actif, tb.reunions, tb.envoyes], [true, false, false, 0, 0]);
    v('le bail porte l\'identité de la première et son échéance (trente secondes)', [a.S.bailLire().proprietaire === a.P.identite, a.S.bailLire().expire], [true, a.h.t + 30000]);
    a.h.t = D0 - 15 * MIN - 10000; a.P.tour();
    v('chaque tour le renouvelle', a.S.bailLire().expire, a.h.t + 30000);
    /* la première meurt SANS rendre le bail (kill -9), dix secondes avant que le premier rappel soit dû : son bail court encore vingt secondes */
    a.h.t = D0 - 15 * MIN; const mort = B.tour();
    v('⛔ la première instance meurt brutalement (elle ne rend rien) : tant que son bail court, la seconde ne prend pas la main — un rappel DÛ (il l\'est depuis cet instant) attend', [mort.actif, mort.envoyes, rappels(a, a.ben.id).length], [false, 0, 0]);
    a.h.t = D0 - 15 * MIN + 21000; const reprise = B.tour();
    v('⛔ … il EXPIRE (trente secondes après le dernier tour de la première) et la seconde le prend : elle envoie les rappels dus (4), et le journal dit qui planifie', [reprise.actif, reprise.envoyes, a.journal.filter(x => x.evt === 'planificateur').map(x => x.champs.etat)], [true, 4, ['actif', 'actif']]);
    const revenue = a.P.tour();
    v('⛔ la première, si elle revenait (un processus gelé puis réveillé), ne reprend pas le bail et n\'envoie rien : elle apprend qu\'elle ne planifie plus — et le journal le dit', [revenue.actif, revenue.envoyes, a.P.sante().actif, rappels(a, a.ben.id).length, a.journal.filter(x => x.evt === 'planificateur').map(x => x.champs.etat)], [false, 0, false, 1, ['actif', 'actif', 'perdu']]);
    B.arreter();
    v('⛔ un arrêt PROPRE rend le bail : la ligne disparaît, la première le reprend sans attendre son échéance', [a.S.bailLire(), a.P.tour().actif], [null, true]);
    a.S.fermer();
  }

  /* ═══ 9. APRÈS UNE RESTAURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nAprès une restauration : un rappel dont l\'échéance précède la restauration est tenu pour traité');
  {
    const a = atelier(), r = reunion(a);
    a.S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [15, 5] });
    const copie = path.join(bac, 'sinistre-' + (++n) + '.db');
    await a.S.instantane(copie);
    a.S.fermer();
    const TR = D0 - 10 * MIN;
    STOCK.ouvrir.copie.apresRestauration(copie, { horloge: () => TR });
    const b = atelier({ chemin: copie, t0: TR });
    const pb = b.P;
    b.h.t = TR + MIN; const t1 = pb.tour();
    v('⛔ la base revient à 10 minutes du début : le rappel de 15 minutes (échéance antérieure à la restauration) est tenu pour traité — il ne part PAS, pour personne (population : la réunion est regardée)', [t1.reunions, t1.envoyes, t1.abandonnes], [1, 0, 0]);
    b.h.t = D0 - 5 * MIN; const t2 = pb.tour();
    v('… mais celui de 5 minutes de Ben, dû après la restauration, part à son heure', [t2.envoyes, textes(b, (b.S.reunionPlanif(r.id).participants.find(p => p.rappels !== null)).uid)], [1, ['Commence dans 5 minutes — lundi 19 octobre à 14:00.']]);
    b.S.fermer();
  }

  /* ═══ 10. UNE RÉUNION QUI ÉCHOUE N'ARRÊTE PAS LES AUTRES ═══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nUne réunion qui échoue n\'arrête pas les autres ; un tour ne lève jamais ; la panne se compte et se lève d\'elle-même');
  {
    const a = atelier();
    const bonne = reunion(a, { titre: 'Bonne ' + CANARI, invites: [a.ben.id] }), mauvaise = reunion(a, { titre: 'Mauvaise ' + CANARI, invites: [a.ben.id], debut: D0 - MIN, fin: D0 + HEURE - MIN, prochain: D0 - MIN });   // AVANT l'autre : l'ordre est celui de la prochaine occurrence
    let casse = true;
    const S2 = Object.assign({}, a.S, { reunionPlanif: (id) => { if (casse && id === mauvaise.id) throw Object.assign(new Error('boom ' + CANARI), { code: 'PANNE' }); return a.S.reunionPlanif(id); } });
    const P2 = a.planif({ stockage: S2 });
    a.h.t = D0 - 15 * MIN; const t1 = P2.tour();
    v('⛔ la réunion qui lève ne prive pas l\'autre de son rappel (Ana et Ben) ; le tour a échoué et le dit — par le NOM de l\'erreur seulement', [t1.envoyes, rappels(a, a.ben.id).length, P2.sante().echecs, a.journal.filter(x => x.evt === 'planif_echec').map(x => x.champs), JSON.stringify(a.journal).includes('boom') || JSON.stringify(a.journal).includes(CANARI)], [2, 1, 1, [{ nom: 'PANNE' }], false]);
    a.h.t += 12000; const t2 = P2.tour();
    v('la panne dure : les échecs de suite s\'additionnent (la surveillance crie à trois)', P2.sante().echecs, 2);
    casse = false; a.h.t = D0 - 14 * MIN; const t3 = P2.tour();
    v('⛔ la panne passe : le tour suivant est propre, le compteur retombe à zéro, et la réunion qui avait échoué reçoit enfin son rappel (le registre lui garde sa place)', [P2.sante().echecs, t3.envoyes, rappels(a, a.ben.id).length], [0, 2, 2]);
    const S3 = Object.assign({}, a.S, { bailPrendre: () => { throw new Error('le disque ' + CANARI); } });
    const P3 = a.planif({ stockage: S3 });
    let levee = null, bilan = null;
    try { bilan = P3.tour(); } catch (e) { levee = e; }
    v('⛔ un tour dont le bail lui-même échoue ne LÈVE pas (une exception dans une minuterie tuerait le service) : il rend un bilan vide, compte son échec, et n\'est pas actif', [levee, bilan && bilan.actif, bilan && bilan.envoyes, P3.sante().echecs, P3.sante().actif], [null, false, 0, 1, false]);
    a.S.fermer();
  }

  /* ═══ 11. LE REGISTRE NE GROSSIT PAS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe registre ne grossit pas : les rappels des occurrences anciennes et les envois de courriel de plus de huit jours sont élagués, une fois par heure');
  {
    const a = atelier(), r = reunion(a, { debut: D0 + 10 * JOUR, fin: D0 + 10 * JOUR + HEURE, prochain: D0 + 10 * JOUR });
    const brut = () => new (require('node:sqlite').DatabaseSync)(a.chemin);
    const t = D0;
    a.S.rappelEnvoyer({ reunion: r.id, occurrence: t - 3 * JOUR, uid: a.ben.id, avant: 15, titre: 'x', texte: 'y', cible: r.id });
    a.S.rappelEnvoyer({ reunion: r.id, occurrence: t - 1 * JOUR, uid: a.ben.id, avant: 15, titre: 'x', texte: 'y', cible: r.id });
    a.h.t = t - 9 * JOUR; a.S.courrierNoter({ uid: a.ana.id, destH: 'a'.repeat(64) });
    a.h.t = t - 2 * JOUR; a.S.courrierNoter({ uid: a.ana.id, destH: 'b'.repeat(64) });
    a.h.t = t;
    const compte = (tab) => { const d = brut(); try { return Number(d.prepare('SELECT COUNT(*) AS n FROM ' + tab).get().n); } finally { d.close(); } };
    v('population : deux rappels notés et deux envois de courriel avant l\'élagage', [compte('rappel'), compte('courrier_envoi')], [2, 2]);
    a.P.tour();
    v('⛔ le premier tour élague : le rappel d\'il y a trois jours et le courriel d\'il y a neuf jours partent ; ceux d\'hier et d\'avant-hier restent (un plafond de sept jours les compte encore)', [compte('rappel'), compte('courrier_envoi')], [1, 1]);
    a.S.rappelEnvoyer({ reunion: r.id, occurrence: t - 5 * JOUR, uid: a.ben.id, avant: 5, titre: 'x', texte: 'y', cible: r.id });
    a.h.t = t + 10 * MIN; a.P.tour();
    v('une fois par HEURE : dix minutes après, rien n\'est élagué', compte('rappel'), 2);
    a.h.t = t + 61 * MIN; a.P.tour();
    v('… une heure après, si', compte('rappel'), 1);
    a.S.fermer();
  }

  /* ═══ 12. LA SANTÉ ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa santé : des nombres et un booléen, jamais une réunion ni une personne');
  {
    const a = atelier(), r = reunion(a);
    v('avant le premier tour : inactif, aucun âge, aucun échec, aucun abandon', a.P.sante(), { actif: false, ageS: null, echecs: 0, abandonnes: 0 });
    a.h.t = D0 - 15 * MIN; a.P.tour();
    const s0 = a.P.sante();
    a.h.t += 90 * 1000;
    v('après un tour : actif, âge zéro, puis l\'âge dit combien de secondes ont passé (90)', [s0, a.P.sante().ageS], [{ actif: true, ageS: 0, echecs: 0, abandonnes: 0 }, 90]);
    const j = JSON.stringify(a.P.sante());
    v('⛔ rien d\'identifiant : quatre clés, des nombres et un booléen, ni le titre ni un identifiant', [Object.keys(a.P.sante()).sort(), j.includes(CANARI), j.includes(r.id), j.includes(a.ben.id)], [['abandonnes', 'actif', 'ageS', 'echecs'], false, false, false]);
    a.S.fermer();
  }

  /* ═══ 13. LES LOTS EN ROTATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLes réunions lointaines passent par lots, en rotation ; celles qui commencent dans l\'heure sont TOUJOURS regardées');
  {
    const T0 = Date.UTC(2026, 9, 20, 8, 0);
    const a = atelier({ t0: T0 - 30 * HEURE, parTour: 3 });
    const loin = [];
    for (let i = 0; i < 10; i++) {
      const d = T0 + 20 * HEURE + i * MIN;
      const x = reunion(a, { titre: 'Loin ' + i, debut: d, fin: d + HEURE, prochain: d, invites: [a.ben.id] });
      a.S.reunionRappelsPoser({ id: x.id, uid: a.ben.id, rappels: [1440] });
      loin.push(x.id);
    }
    const urgente = reunion(a, { titre: 'Urgente', debut: T0 + 10 * MIN, fin: T0 + HEURE, prochain: T0 + 10 * MIN, invites: [a.ben.id] });
    a.h.t = T0;
    const tours = [1, 2, 3, 4, 5].map(() => { const b = a.P.tour(); return [b.reunions, b.envoyes]; });
    v('population : dix réunions lointaines ont leur rappel « 1 jour avant » dû, plus une urgente (à 10 minutes) qui a le sien — onze réunions, trois par lot', loin.length + 1, 11);
    v('⛔ l\'urgente est regardée à CHAQUE tour avec trois lointaines (4 réunions) ; le premier tour envoie 2 (l\'urgente : l\'hôte et Ben) + 3 ; puis 3, 3, 1 (la dernière tranche est le bout de la liste : deux réunions regardées) ; la rotation repart du début au tour d\'après (quatre regardées, rien à envoyer) — sans la rotation, les trois mêmes occuperaient la place pour toujours', tours, [[4, 5], [4, 3], [4, 3], [2, 1], [4, 0]]);
    v('⛔ les DIX lointaines ont chacune reçu leur rappel, UNE fois (Ben : dix + celui de l\'urgente)', [rappels(a, a.ben.id).length, new Set(rappels(a, a.ben.id).map(x => x.cible)).size], [11, 11]);
    a.S.fermer();
  }

  /* ═══ 13 bis. UN TOUR A UN BUDGET ════════════════════════════════════════════════════════════════════════════════════════════════════════════
     La relecture du gardien : 300 réunions de 100 personnes, quatre rappels dus — un seul tour de 34 secondes (trente mille COMMIT, un par rappel) pendant lesquelles le service ne répondait plus.
     Ce qu'on garde ici, AU GESTE (une horloge injectée, une montre injectée, un moteur de base qui compte ses COMMIT — jamais un chronomètre) : un tour s'arrête à son budget, en rappels ou en temps ;
     une réunion s'écrit ENTIÈRE en UNE transaction ; le tour suivant reprend là où l'autre s'est arrêté, sans rien perdre ni doubler, même après un redémarrage ; les urgentes sont plafonnées. */
  console.log('\nUn tour a un BUDGET : il s\'arrête, le suivant vient vite, rien ne se perd, rien ne double — et une réunion tient en UNE transaction');
  {
    const { DatabaseSync } = require('node:sqlite');
    const commits = { n: 0 };
    class Moteur extends DatabaseSync { exec(sql) { if (/^\s*COMMIT\b/i.test(String(sql))) commits.n++; return super.exec(sql); } }
    const REUNIONS = 60, INVITES = 20, PAR = INVITES + 1;
    /* soixante réunions de vingt et une personnes (l'hôte compris), un rappel « 1 heure avant » dû à chacune, aucune commencée */
    const monter = (reunions) => {
      const a = atelier({ t0: D0 - 3 * HEURE, moteur: { DatabaseSync: Moteur }, reunions });
      const gens = []; for (let i = 0; i < INVITES; i++) gens.push(pers(a.S, 'Inv' + i).id);
      const ids = [];
      for (let i = 0; i < REUNIONS; i++) { const d = D0 + i * MIN; ids.push(reunion(a, { titre: 'Budget ' + i, debut: d, fin: d + HEURE, prochain: d, rappels: [60], invites: gens }).id); }
      a.h.t = D0 - MIN;
      return { a, ids, gens };
    };
    const vide = (a, ids) => ids.map(id => a.S.rappelsEnvoyesDe(id).size);

    {
      const { a, ids, gens } = monter();
      v('population : soixante réunions de vingt et une personnes, toutes dans la fenêtre, un rappel dû à chaque participant — 1 260 rappels à envoyer, aucun parti', [a.S.reunionsARappeler(D0 + 2 * HEURE).length, a.S.reunionPlanif(ids[0]).participants.length, REUNIONS * PAR, vide(a, ids).reduce((x, y) => x + y, 0)], [60, 21, 1260, 0]);
      const P = a.planif({ rappelsParTour: 100 });
      commits.n = 0; const b1 = P.tour(); const c1 = commits.n;
      v('⛔ le premier tour s\'ARRÊTE à son budget (100 rappels) À UNE RÉUNION PRÈS : cinq réunions, 105 rappels — et dit qu\'il a été coupé', [b1.reunions, b1.envoyes, b1.coupe], [5, 105, true]);
      v('⛔ UNE transaction par RÉUNION : cinq réunions et le bail font 6 COMMIT, pas 106 — un par rappel, c\'étaient trente-quatre secondes de service gelé sur trois cents réunions de cent personnes', c1, 6);
      const parTour = [b1.envoyes], coupes = [b1.coupe], examinees = [b1.reunions];
      for (let i = 0; i < 40; i++) { const b = P.tour(); parTour.push(b.envoyes); coupes.push(b.coupe); examinees.push(b.reunions); if (!b.envoyes && !b.coupe) break; }
      v('⛔ les tours suivants reprennent LÀ OÙ L\'AUTRE S\'EST ARRÊTÉ : douze tours de 105 rappels, tous coupés sauf le dernier (qui a fini la liste), puis un tour qui regarde tout et n\'a plus rien à envoyer', [parTour, coupes], [Array(12).fill(105).concat([0]), Array(11).fill(true).concat([false, false])]);
      v('⛔ … et par la CLÉ de reprise : chaque tour ne regarde que cinq réunions NEUVES (jamais celles que le tour d\'avant a finies — sans la clé, le deuxième en regarderait dix, le troisième quinze) ; seul le dernier repart du début et les voit toutes (60)', examinees, Array(12).fill(5).concat([60]));
      v('⛔ le retard se DIT, une fois au début (le nombre de rappels déjà partis) et une fois à la fin — jamais une réunion, jamais un nom', [a.journal.filter(x => x.evt === 'planif_retard').map(x => x.champs), JSON.stringify(a.journal).includes('Budget')], [[{ etat: 'debut', n: 105 }, { etat: 'fin' }], false]);
      v('⛔ RIEN NE SE PERD ET RIEN NE DOUBLE : les 1 260 rappels sont partis, une fois chacun — le registre de chaque réunion porte ses 21 personnes, chaque invité a soixante notifications, l\'hôte aussi', [vide(a, ids).every(x => x === PAR), parTour.reduce((x, y) => x + y, 0), rappels(a, gens[0]).length, rappels(a, gens[INVITES - 1]).length, rappels(a, a.ana.id).length, new Set(rappels(a, gens[0]).map(x => x.cible)).size], [true, 1260, 60, 60, 60, 60]);
      v('⛔ aucun tour ne dépasse le budget de plus d\'UNE réunion (le budget + vingt)', Math.max(...parTour) <= 100 + (PAR - 1), true);
      a.S.fermer();
    }
    {
      const { a, ids } = monter({ tourMaxMs: 500 });                        // le plafond de temps est LU dans la configuration du service (`reunions.tourMaxMs`, ici 500 : pas la valeur par défaut)
      let c = -1; const chrono = () => (++c) * 400;                       // une montre qui avance de 400 ms à chaque lecture : le plafond de temps se joue sans dormir
      const P = a.planif({ rappelsParTour: 100000, chrono });
      const b = P.tour();
      v('⛔ le PLAFOND DE TEMPS coupe le tour (500 ms lus dans la configuration, la montre avance de 400 ms par lecture) après DEUX réunions — le budget en rappels (100 000) était loin ; avec la valeur par défaut (1 000 ms) il en aurait regardé trois', [b.reunions, b.envoyes, b.coupe], [2, 42, true]);
      let total = b.envoyes; for (let i = 0; i < 60; i++) { c = -1; const x = P.tour(); total += x.envoyes; if (!x.coupe) break; }
      v('… et le reste suit, sans doublon : 1 260 rappels en tout, le registre complet', [total, vide(a, ids).every(x => x === PAR)], [1260, true]);
      a.S.fermer();
    }
    {
      /* le budget se lit dans la CONFIGURATION du service, sans paramètre : `reunions.rappelsParTour` coupe à 42 rappels (deux réunions), `reunions.urgentesMax` regarde trois urgentes à la fois */
      const A1 = monter({ rappelsParTour: 40 }), A2 = monter({ urgentesMax: 3 });
      const b1 = A1.a.planif().tour(), b2 = A2.a.planif().tour();
      v('⛔ `reunions.rappelsParTour: 40` (la configuration, aucun paramètre) : le tour envoie 42 rappels et s\'arrête après deux réunions ; `reunions.urgentesMax: 3` : le tour regarde trois urgentes et en envoie 63', [[b1.reunions, b1.envoyes, b1.coupe], [b2.reunions, b2.envoyes, b2.coupe]], [[2, 42, true], [3, 63, true]]);
      A1.a.S.fermer(); A2.a.S.fermer();
    }
    {
      const { a, ids } = monter();
      let c = -1; const chrono = () => (++c) * 5000;                       // un premier réunion déjà plus longue que le plafond : le tour en regarde TOUJOURS une
      const b = a.planif({ rappelsParTour: 100000, tourMaxMs: 1000, chrono }).tour();
      v('⛔ un tour regarde TOUJOURS au moins une réunion, même si le temps est déjà écoulé (sans cela, un plafond serré ferait tourner le planificateur à vide pour toujours)', [b.reunions, b.envoyes, b.coupe, vide(a, ids).filter(x => x === PAR).length], [1, 21, true, 1]);
      a.S.fermer();
    }
    {
      const { a, ids } = monter();
      const P = a.planif({ urgentesMax: 20, rappelsParTour: 100000 });
      const tours = [1, 2, 3, 4].map(() => { const b = P.tour(); return [b.reunions, b.envoyes, b.coupe]; });
      v('⛔ les URGENTES sont plafonnées (20 par tour sur 60) et reprennent à la CLÉ du tour d\'avant : trois tours de 20 réunions, 420 rappels, coupés (il y a de quoi faire derrière), puis un tour qui n\'a plus rien à voir ni à envoyer', tours, [[20, 420, true], [20, 420, true], [20, 420, true], [0, 0, false]]);
      v('… les soixante réunions ont été vues, une fois chacune', vide(a, ids).every(x => x === PAR), true);
      a.S.fermer();
    }
    {
      /* un redémarrage entre deux tours coupés : l'instance suivante reprend, sans doublon ni trou */
      const { a, ids, gens } = monter();
      let P = a.planif({ rappelsParTour: 100 });
      const avant = P.tour().envoyes + P.tour().envoyes;
      P.arreter();                                                          // un arrêt propre rend le bail
      P = a.planif({ rappelsParTour: 100 });
      let apres = 0; for (let i = 0; i < 40; i++) { const b = P.tour(); apres += b.envoyes; if (!b.envoyes && !b.coupe) break; }
      v('⛔ un REDÉMARRAGE entre deux tours coupés : la nouvelle instance finit le travail, sans doublon ni trou (210 + 1 050 = 1 260)', [avant, apres, vide(a, ids).every(x => x === PAR), rappels(a, gens[3]).length], [210, 1050, true, 60]);
      a.S.fermer();
    }
    {
      /* le tout ou rien d'une réunion : une panne au milieu de ses rappels défait tout, le tour d'après refait tout */
      const { a, ids } = monter();
      const S = a.S;
      const faux = Object.create(S);
      let casse = true;
      faux.rappelsEnvoyer = (lot) => (casse ? S.tx(() => { S.rappelEnvoyer(lot[0]); S.rappelEnvoyer(lot[1]); throw new Error('panne au milieu'); }) : S.rappelsEnvoyer(lot));
      const P = creerPlanificateur({ stockage: faux, hub: a.hub, config: a.config, horloge: () => a.h.t, journaliser: (evt, champs) => a.journal.push({ evt, champs: champs || {} }), push: null, rappelsParTour: 21 });
      const b = P.tour();
      v('⛔ une panne au MILIEU des rappels d\'une réunion défait TOUS ses rappels (et leurs lignes au registre) : aucune notification, aucune ligne — et le tour est compté en échec, par son nom seulement', [b.envoyes, vide(a, ids).reduce((x, y) => x + y, 0), P.etat.echecs, a.journal.filter(x => x.evt === 'planif_echec').length > 0, JSON.stringify(a.journal).includes('panne au milieu')], [0, 0, 1, true, false]);
      casse = false;
      const b2 = P.tour();
      v('… le tour suivant refait la réunion entière (21 rappels) — rien de la première tentative ne subsiste pour la doubler', [b2.envoyes, vide(a, ids).filter(x => x === PAR).length, P.etat.echecs], [21, 1, 0]);
      S.fermer();
    }
    {
      /* le tour suivant d'un tour coupé vient vite : la planification elle-même, sans rien attendre (le minuteur est remplacé) */
      const { a } = monter();
      const P = a.planif({ rappelsParTour: 100 });
      const delais = [], attente = [], reel = global.setTimeout;
      global.setTimeout = (f, d) => { delais.push(d); attente.push(f); return { unref() {} }; };
      try { P.demarrer(); for (let i = 0; i < 14 && attente.length; i++) attente.shift()(); } finally { global.setTimeout = reel; P.arreter(); }
      v('⛔ après un tour COUPÉ le suivant vient dans 250 ms (pas dans 12 s) ; après le tour qui a fini, on revient au rythme normal — le premier tour part une seconde après le démarrage', [delais[0], delais.slice(1, 12), delais[12]], [1000, Array(11).fill(250), 12000]);
      a.S.fermer();
    }
  }

  /* ═══ 14. LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa configuration : dix à quinze secondes en production, un bail d\'au moins deux tours');
  {
    const essai = (cfg, instance) => { try { return reunionsConfig(cfg, instance); } catch (e) { return e.code + ' ' + String(e.message).slice(0, 90); } };
    v('les valeurs de départ : un tour toutes les 12 secondes, un bail d\'une minute, un budget de 2 000 rappels, une seconde de temps réel et 2 000 urgentes par tour', [essai({}, 'prod'), essai({}, 'beta')], [{ planificateurMs: 12000, bailMs: 60000, rappelsParTour: 2000, tourMaxMs: 1000, urgentesMax: 2000 }, { planificateurMs: 12000, bailMs: 60000, rappelsParTour: 2000, tourMaxMs: 1000, urgentesMax: 2000 }]);
    v('⛔ EN PRODUCTION : 10 000 et 15 000 ms passent ; 9 999 et 15 001 sont refusés (un banc qui martèlerait la base, ou un rappel trop en retard)', [essai({ reunions: { planificateurMs: 10000 } }, 'prod').planificateurMs, essai({ reunions: { planificateurMs: 15000, bailMs: 30000 } }, 'prod').planificateurMs, /^CONFIG .*planificateurMs/.test(essai({ reunions: { planificateurMs: 9999 } }, 'prod')), /^CONFIG .*planificateurMs/.test(essai({ reunions: { planificateurMs: 15001 } }, 'prod'))], [10000, 15000, true, true]);
    v('… la bêta et les bancs peuvent presser le tour (50 ms) ou l\'endormir (cinq minutes) ; en dessous de 50 ms ou au-delà, non', [essai({ reunions: { planificateurMs: 50, bailMs: 200 } }, 'beta').planificateurMs, essai({ reunions: { planificateurMs: 300000, bailMs: 600000 } }, 'beta').planificateurMs, /^CONFIG .*planificateurMs/.test(essai({ reunions: { planificateurMs: 49 } }, 'beta')), /^CONFIG .*planificateurMs/.test(essai({ reunions: { planificateurMs: 300001 } }, 'beta'))], [50, 300000, true, true]);
    v('⛔ un bail plus court que DEUX tours est refusé (il expirerait entre deux renouvellements) ; deux tours pile passent', [/^CONFIG .*deux tours/.test(essai({ reunions: { planificateurMs: 15000, bailMs: 29999 } }, 'prod')), essai({ reunions: { planificateurMs: 15000, bailMs: 30000 } }, 'prod').bailMs], [true, 30000]);
    const refus = (k, x, instance) => new RegExp('^CONFIG .*' + k).test(essai({ reunions: { [k]: x } }, instance));
    v('⛔ le BUDGET d\'un tour a ses bornes, en production comme ailleurs : 1 à 100 000 rappels, 10 à 5 000 ms de temps réel (au-delà le réglage serait le gel qu\'il empêche), 1 à 100 000 urgentes', [
      refus('rappelsParTour', 0, 'prod'), refus('rappelsParTour', 100001, 'beta'), essai({ reunions: { rappelsParTour: 100000 } }, 'prod').rappelsParTour,
      refus('tourMaxMs', 9, 'prod'), refus('tourMaxMs', 5001, 'beta'), essai({ reunions: { tourMaxMs: 5000 } }, 'prod').tourMaxMs, essai({ reunions: { tourMaxMs: 10 } }, 'beta').tourMaxMs,
      refus('urgentesMax', 0, 'prod'), refus('urgentesMax', 100001, 'beta'), essai({ reunions: { urgentesMax: 1 } }, 'prod').urgentesMax, refus('urgentesMax', 1.5, 'beta')],
      [true, true, 100000, true, true, 5000, 10, true, true, 1, true]);
    v('une valeur qui n\'est pas un entier, ou une section qui n\'est pas un objet, refuse le démarrage', [essai({ reunions: { planificateurMs: 12000.5 } }, 'prod').slice(0, 6), essai({ reunions: { planificateurMs: '12000' } }, 'prod').slice(0, 6), essai({ reunions: [] }, 'prod').slice(0, 6), essai({ reunions: 'x' }, 'prod').slice(0, 6), essai({ reunions: { bailMs: 199 } }, 'beta').slice(0, 6)], ['CONFIG', 'CONFIG', 'CONFIG', 'CONFIG', 'CONFIG']);
  }

  await partieService();
  fin();
})().catch((err) => { console.log('  ✗ le banc a levé : ' + (err && err.stack || err)); process.exitCode = 1; fin(); });

/* une réponse d'invité rangée directement */
function S_repondre(S, id, uid, statut) { S.reunionRepondre({ id, uid, statut }); }

/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA SECONDE MOITIÉ : LE VRAI SERVICE, À TOUR RAPIDE, HORLOGE DÉCALABLE
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function partieService() {
  const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
  const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
  const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);
  const fps = await P.fauxServicePush();
  const paire = (() => { for (;;) { const e = crypto.createECDH('prime256v1'); e.generateKeys(); const priv = e.getPrivateKey(); if (priv.length === 32) return { pub: e.getPublicKey().toString('base64url'), priv: priv.toString('base64url') }; } })();
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-974s-'));
  const cle = crypto.randomBytes(32).toString('hex');
  const config = { reunions: { planificateurMs: 100, bailMs: 1000 }, push: { ackMs: 1500, echecsMax: 2, etalementMs: 1500, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' }, vapidPublicKey: paire.pub, vapidPrivateKey: paire.priv };
  const port = await T.portLibre();   // le MÊME port avant et après l'arrêt brutal : les clients (et leurs cookies) sont ceux du service redémarré
  const demarrer = () => T.lancerService({ dossier, cle, port, horloge: true, config, env: { OPMSG_TEST_PUSH: fps.hote } });
  let svc = null, S = null, flux = null;
  console.log('\n— le VRAI service —\nLe rappel arrive en direct et en push, une seule fois ; un arrêt brutal ne renvoie rien et rattrape ce qui a un sens');
  try {
    svc = await demarrer();
    let decal = ZERO - Date.now(); svc.avancer(decal);
    const ouvrirBase = () => ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() + decal });
    S = ouvrirBase();
    let k = 0;
    const personne = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
    const client = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
    const ana = personne('Ana'), ben = personne('Ben'), cleo = personne('Cleo');
    S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id);
    const a = client(ana), b = client(ben), c = client(cleo);
    await c.post('/api/moi/maj', { tz: 'America/New_York', prefs: { apercu_notif: true } });
    const avancer = (ms) => { decal += ms; svc.avancer(ms); };
    const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
    const nots = async (cli, cible) => (await cli.get('/api/notifications')).j.notifications.filter(x => x.type === 'reunion_rappel' && (!cible || x.cible === cible));
    const tours = async (nb) => { const x0 = sql('SELECT expire FROM planif_bail WHERE id = 1'), e0 = x0 ? x0.expire : 0; return T.attendre(() => { const x = sql('SELECT expire FROM planif_bail WHERE id = 1'); return x && x.expire >= e0 + nb * 100 ? true : null; }, 10000, 20); };

    /* les appareils push de Ben (charge minimale) et de Cleo (aperçu) */
    const dev = (nom) => { const x = P.appareil(fps.endpoint(nom)); x.nom = nom; x.chemin = '/push/' + nom; x.lus = 0; return x; };
    const B1 = dev('ben-1'), C1 = dev('cleo-1');
    await b.post('/api/push/abonner', { sub: B1.sub }); await c.post('/api/push/abonner', { sub: C1.sub });
    const recus = (x) => fps.envois.filter(y => y.chemin === x.chemin);
    const charge = (x, y) => JSON.parse(P.dechiffrer(x, y.corps));
    const suivant = async (x) => { const i = x.lus; const ok = await T.attendre(() => recus(x).length > i, 8000, 10); if (!ok) return null; x.lus = i + 1; return charge(x, recus(x)[i]); };

    /* une réunion à 09:00 UTC (11:00 à Paris), Ben règle ses rappels à 15 puis 5 minutes avant, Cleo garde le défaut (15 minutes) */
    const mk = async (extra) => (await a.post('/api/reunions', Object.assign({ titre: 'Revue ' + CANARI, debut: ZERO + HEURE, fin: ZERO + 2 * HEURE, tz: 'Europe/Paris', invites: [ben.id, cleo.id], notifier: false }, extra || {}))).j;
    const m1 = await mk();
    await b.post('/api/reunions/' + m1.reunion.id + '/rappels', { rappels: [15, 5] });
    v('population : la réunion est créée, personne n\'a de rappel avant l\'heure', [!!m1.reunion.id, (await nots(b)).length, (await nots(c)).length, (await nots(a)).length], [true, 0, 0, 0]);
    const pre = await tours(3);
    v('population : le planificateur tourne (le bail se renouvelle à chaque tour) et /health le dit actif, sans âge anormal', [!!pre, (await T.client(svc.base).get('/health')).j.reunions.actif], [true, true]);
    flux = await T.flux(b);

    avancer(45 * MIN + 10 * 1000);           // 08:45:10 UTC : 14 minutes 50 avant — le rappel de 15 minutes est dû (et « 14 min 50 » s'arrondit à 15 tant que le tour passe dans les vingt secondes)
    const n1 = await T.attendre(async () => { const l = await nots(b, m1.reunion.id); return l.length ? l : null; }, 8000, 20);
    v('⛔ le rappel arrive : Ben le lit dans ses notifications, avec ce qui RESTE et l\'heure de Paris (11:00 en heure d\'été)', n1 && n1.map(x => x.texte), ['Commence dans 15 minutes — lundi 19 octobre à 11:00.']);
    const nc = await T.attendre(async () => { const l = await nots(c, m1.reunion.id); return l.length ? l : null; }, 8000, 20);
    v('⛔ Cleo, à New York, lit la MÊME réunion à SON heure (05:00)', nc && nc[0].texte, 'Commence dans 15 minutes — lundi 19 octobre à 05:00.');
    const ev = flux && await flux.attendre(x => x.event === 'notification' && x.data && x.data.type === 'reunion_rappel');
    v('⛔ EN DIRECT : l\'événement `notification` du rappel arrive au flux de Ben, sans qu\'il recharge', ev && [ev.data.type, ev.data.cible], ['reunion_rappel', m1.reunion.id]);
    const pb = await suivant(B1), pc = await suivant(C1);
    v('⛔ le push de Ben est MINIMAL (« Rappel de réunion »), celui de Cleo (aperçu activé) dit le titre et la phrase, dans SON fuseau', [pb && pb.corps, pb && pb.titre, pc && pc.titre, pc && pc.corps], ['Rappel de réunion', 'OP MESSAGES', 'Revue ' + CANARI, 'Commence dans 15 minutes — lundi 19 octobre à 05:00.']);
    v('l\'hôte, qui n\'a pas d\'appareil, a aussi son rappel dans l\'application (population : trois personnes rappelées)', [(await nots(a, m1.reunion.id)).length, (await nots(b, m1.reunion.id)).length, (await nots(c, m1.reunion.id)).length], [1, 1, 1]);
    const apres1 = await tours(4);
    v('⛔ UNE SEULE fois : quatre tours de plus (le bail le prouve) — les notifications sont toujours une par personne, le registre porte trois lignes de 15 minutes (Ben avait aussi choisi 5)', [!!apres1, (await nots(b, m1.reunion.id)).length, (await nots(c, m1.reunion.id)).length, Number(sql('SELECT COUNT(*) AS n FROM rappel WHERE reunion = ? AND avant = 15', m1.reunion.id).n), recus(B1).length, recus(C1).length], [true, 1, 1, 3, 1, 1]);

    /* un arrêt BRUTAL entre le rappel de 15 minutes et celui de 5 de Ben */
    if (flux) flux.fermer();
    S.fermer(); S = null;
    const mort = new Promise((ok) => svc.enfant.once('exit', ok));
    svc.enfant.kill('SIGKILL');
    await mort;
    const bail0 = (() => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare('SELECT proprietaire, expire FROM planif_bail WHERE id = 1').get(); } finally { d.close(); } })();
    vrai('population : l\'arrêt a été brutal — le service est mort SANS rendre son bail (la ligne y est toujours)', !!bail0 && bail0.proprietaire.startsWith('pl-'));
    /* pendant l'arrêt : la réunion m1 (rappel de 5 minutes de Ben) et une seconde réunion m2 qui COMMENCE sans que personne n'ait été rappelé */
    const m2 = await (async () => { const S0 = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => ZERO + 10 * MIN }); try { return S0.reunionCreer({ hote: ana.id, titre: 'Pendant l\'arrêt ' + CANARI, lieu: '', debut: ZERO + 50 * MIN, fin: ZERO + 110 * MIN, tz: 'Europe/Paris', rep: 'aucune', n: null, jusqua: null, rappels: [15], invites: [ben.id], prochain: ZERO + 50 * MIN }); } finally { S0.fermer(); } })();
    svc = await demarrer();
    decal = (ZERO + 55 * MIN) - Date.now(); svc.avancer(decal);   // 08:55 UTC : 5 minutes avant m1, et m2 (08:50) a COMMENCÉ pendant l'arrêt
    S = ouvrirBase();
    const apresArret = await T.attendre(async () => { const l = await nots(b, m1.reunion.id); return l.length >= 2 ? l : null; }, 10000, 20);
    v('⛔ après l\'arrêt brutal et le redémarrage (le bail expire en une seconde, la nouvelle instance le prend) : le rappel de 5 minutes de Ben, dû et encore utile, part ; celui de 15 minutes, déjà parti, NE repart PAS', [apresArret && apresArret.length, apresArret && apresArret.map(x => x.texte).sort()], [2, ['Commence dans 15 minutes — lundi 19 octobre à 11:00.', 'Commence dans 5 minutes — lundi 19 octobre à 11:00.'].sort()]);
    const tAp = await tours(3);
    v('⛔ une réunion qui a COMMENCÉ pendant l\'arrêt (08:50, il est 08:55) ne reçoit AUCUN rappel : ni l\'hôte ni Ben — l\'abandon est journalisé par son nombre (2), la santé le compte', [!!tAp, (await nots(a, m2.id)).length, (await nots(b, m2.id)).length, /"evt":"rappel_abandonne","n":2/.test(svc.sortie.texte()), (await T.client(svc.base).get('/health')).j.reunions.abandonnes], [true, 0, 0, true, 2]);
    v('… et Cleo, qui n\'avait rien de dû, n\'a toujours que son premier rappel (population : deux mesures plus haut)', (await nots(c)).length, 1);
    /* modifier l'horaire PAR LA ROUTE déplace les rappels : m3 (10:00 UTC) est repoussée à 11:00 UTC, il est 08:55 */
    const m3 = await mk({ titre: 'Déplacée ' + CANARI, debut: ZERO + 2 * HEURE, fin: ZERO + 3 * HEURE, invites: [ben.id] });
    const mod = await a.post('/api/reunions/' + m3.reunion.id + '/modifier', { debut: '2026-10-19T13:00', fin: '2026-10-19T14:00', notifier: false });
    avancer(HEURE + 55 * MIN);               // 10:50 UTC : l'ANCIENNE heure a commencé il y a cinquante minutes ; la nouvelle (11:00) est dans dix minutes
    const n3 = await T.attendre(async () => { const l = await nots(b, m3.reunion.id); return l.length ? l : null; }, 10000, 20);
    const a3 = await T.attendre(async () => { const l = await nots(a, m3.reunion.id); return l.length ? l : null; }, 10000, 20);
    v('⛔ la réunion repoussée par la ROUTE est rappelée à sa NOUVELLE heure : Ben et l\'hôte lisent « dans 10 minutes … 13:00 » (la route a posé la nouvelle prochaine occurrence) — et rien n\'est abandonné pour l\'ancienne', [mod.code, n3 && n3.map(x => x.texte), a3 && a3.length], [200, ['Commence dans 10 minutes — lundi 19 octobre à 13:00.'], 1]);
    const sante = (await T.client(svc.base).get('/health')).j;
    v('⛔ /health dit l\'état du planificateur par des NOMBRES seulement : actif, âge du dernier tour (petit), aucun échec, deux abandons — rien de la réunion', [sante.reunions.actif, sante.reunions.ageS < 5, sante.reunions.echecs, JSON.stringify(sante).includes(CANARI), JSON.stringify(sante).includes(m1.reunion.id), Object.keys(sante.reunions).sort()], [true, true, 0, false, false, ['abandonnes', 'actif', 'ageS', 'echecs']]);
    vrai('⛔ le journal du service ne porte ni titre, ni nom, ni texte de rappel — seulement des états et des nombres', !svc.sortie.texte().includes(CANARI) && !/Commence dans/.test(svc.sortie.texte()));
    const lignesBail = () => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return Number(d.prepare('SELECT COUNT(*) AS n FROM planif_bail').get().n); } finally { d.close(); } };
    const avantArret = lignesBail();
    S.fermer(); S = null;
    const racine = svc.data;
    await svc.arreter(false);
    const code = svc.sorti();
    const bailApresArret = (() => { const d = T.lireBase(path.join(racine, 'msg.db')); try { return Number(d.prepare('SELECT COUNT(*) AS n FROM planif_bail').get().n); } finally { d.close(); } })();
    svc = null;
    v('⛔ un arrêt PROPRE (SIGTERM) REND le bail : la ligne existait pendant que le service tournait (population), elle a disparu après, et le service est sorti proprement (0)', [avantArret, bailApresArret, code], [1, 0, 0]);
  } catch (err) {
    console.log('  ✗ la partie service a levé : ' + (err && err.stack || err)); process.exitCode = 1;
  } finally {
    try { if (flux) flux.fermer(); } catch (e) { /* déjà fermé */ }
    try { if (S) S.fermer(); } catch (e) { /* déjà fermée */ }
    if (svc) await svc.arreter(false);
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
    await fps.fermer();
  }

  /* ── la production refuse un tour de moins de dix secondes ── */
  console.log('\nLa production refuse un tour de moins de dix secondes (le démarrage échoue, rien n\'est écrit)');
  {
    const refus = async (nom, opts, motif) => {
      let s = null;
      try {
        s = await T.lancerService(Object.assign({ attendreSante: false }, opts));
        const sortie = await T.attendre(() => s.sorti() !== null, 8000, 20);
        v('⛔ ' + nom + ' : le service refuse de démarrer (sortie non nulle) et dit pourquoi', [sortie ? s.sorti() !== 0 : null, motif.test(s.sortie.texte())], [true, true]);
      } finally { if (s) await s.arreter(); }
    };
    await refus('un tour toutes les 5 secondes en production', { instance: 'prod', config: { reunions: { planificateurMs: 5000, bailMs: 60000 } } }, /reunions\.planificateurMs/);
    await refus('un bail plus court que deux tours', { config: { reunions: { planificateurMs: 1000, bailMs: 1500 } } }, /reunions\.bailMs/);
  }
}
