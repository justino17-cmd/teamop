/* ⛔ CE QUE CE FICHIER GARDE — L'ONGLET « RÉUNIONS » D'OP MESSAGES PRO, ET LE LIEN INVITÉ QU'ON TROUVE (Justin, 26 octobre 2026, capture à l'appui : « pourquoi dans OP MESSAGES j'ai pas Réunions ? »
   puis « je veux un onglet Réunion et je trouve pas le lien inviter »).

   Les VRAIES fonctions de la page (`apercu/opmessages/index.html`) sont extraites et exécutées — jamais une copie réécrite :
     1. LA LISTE (`htmlListeReunions`, `partagerListeReunions`, `ligneReunion`) : ce qui VIENT (en cours comprise, la plus proche en tête, un intertitre par jour) et ce qui est PASSÉ (terminée, ou finie) ;
        « Rejoindre » seulement quand la salle est ouverte ; « Lien invité » sur chaque réunion de l'ORGANISATEUR qui vit — ⛔ ni sur celle d'un autre, ni sur une annulée, ni sur une passée, ni sans
        `CAP.salles`, ni quand la source ne sait pas faire le lien — et ⛔ jamais dans l'AGENDA (la ligne d'avant garde sa forme) ; l'état vide dit quoi faire ; le côté (Perso / Pro) filtre comme l'Agenda ;
        plus de soixante lignes : « Voir les N autres dans l'Agenda » ;
     2. LA LECTURE (`chargerListeReunions`) : deux fenêtres sous la limite du service (62 jours chacune), une réunion lue deux fois n'est qu'une, une moitié qui manque se DIT (jamais une liste vide qui
        ment) et une lecture périmée ne remplace pas la neuve ;
     3. LA FICHE (`htmlFiche`) : « Invité (sans compte) » vient juste après « Rejoindre » — avant « Participants », « Organisateur » et « Salle » — UNE fois ; rien pour une annulée, une finie, un invité,
        sans salle ; la proposition « Copier le lien invité » de la création n'est là que pour la fiche NEUVE (`ouvrirFicheEtat` la consomme : une seule fois) ;
     4. LA CRÉATION (`enregistrerReunion`) : la fiche s'ouvre sur la proposition, l'onglet se relit ; et le geste (`lienInviteGeste`) copie bien `…/invite.html#i=<jeton>` ;
     5. LA NAVIGATION : `navPour` (le côté Pro seulement), `routeDepuisHash` (« #reunions-liste » est une route quand l'onglet existe), et le câblage de `demarrer` / `appliquer` (lu dans le CODE, commentaires
        retirés — la preuve au doigt est la sonde `tests/sonde-opmessages-onglet-reunions.js`).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « pas de lien » est précédé du cas où il y en a un. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const NOW = Date.now(), H = 3600000, JOUR = 86400000;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ID = (n) => 'r_' + String(n).padStart(32, '0');

/* une réunion à la forme que le service la rend : ce que la page lit (moi.hote, rejoignable, annulee, occurrences…) */
function reunion(n, titre, occ, o) {
  o = o || {};
  return { id: ID(n), conv: 'c_' + n, titre, lieu: '', hote: 'u_' + (o.hote || 'ana'), cote: o.cote || 'pro', annulee: !!o.annulee, rejoignable: !!o.rejoignable, salleOuverte: !!o.salleOuverte, participantsN: o.n || 2,
    moi: { hote: o.organisateur !== false, statut: 'accepte', rappels: [], trajet: null }, occurrences: occ };
}
const dans = (ms, duree) => ({ debut: NOW + ms, fin: NOW + ms + (duree || H) });
/* ⛔ un jour se compte du MINUIT de l'appareil, jamais en multiples de 24 h (un banc lancé à 21 h 30 dirait « après-demain » pour « demain ») : demain à telle heure, dans deux jours à telle heure */
const minuit = new Date(NOW).setHours(0, 0, 0, 0);
const jourPlus = (n, h) => { const d = new Date(minuit); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.getTime(); };
const le = (t) => ({ debut: t, fin: t + H });

/* le bac à sable : les vraies fonctions de la page, avec ce que la page leur fournit */
function monter(opts) {
  const o = opts || {};
  const sortie = { copiees: [], mots: [], appels: [], fenetres: [] };
  const etat = { pro: true, mode: o.mode || 'pro', conversations: [], route: o.route || { vue: 'reunions-liste' } };
  const CAP = Object.assign({ salles: true, modes: true, agenda: true, reunions: true }, o.cap || {});
  const source = Object.assign({ choisirMode: () => {}, lienInviteReunion: async () => 'JETON' + 'x'.repeat(26), regenererLienInviteReunion: async () => ({ jeton: 'R', coupes: 0 }) }, o.source || {});
  if (o.sansLien) delete source.lienInviteReunion;
  const morceaux = {
    esc: P.ligne('const esc ='), maj1: P.ligne('const maj1 ='), minuitDe: P.ligne('const minuitDe ='), plusJours: P.ligne('const plusJours ='), debutDeJour: P.ligne('const debutDeJour ='), ecartJours: P.ligne('const ecartJours ='),
    FMT_JOUR_LONG: P.ligne('const FMT_JOUR_LONG ='), libelleJourBord: P.decl('function libelleJourBord('), occTerminee: P.ligne('const occTerminee ='), dureeSeance: P.ligne('const dureeSeance ='),
    libelleEtat: P.decl('function libelleEtat('), lienInvitePossible: P.ligne('const lienInvitePossible ='), ligneReunion: P.decl('function ligneReunion('),
    modesActifs: P.ligne('const modesActifs ='), coteDe: P.ligne('const coteDe ='), coteReu: P.ligne('const coteReu ='), duCote: P.ligne('const duCote ='),
    LR: P.ligne('const LR_AVENIR_JOURS ='), lr: P.ligne('const lr ='), fenetresListeReunions: P.decl('function fenetresListeReunions('), fusionReunions: P.decl('function fusionReunions('),
    partagerListeReunions: P.decl('function partagerListeReunions('), htmlListeReunions: P.decl('function htmlListeReunions('), chargerListeReunions: P.decl('async function chargerListeReunions('),
    htmlInviteSansCompte: P.decl('function htmlInviteSansCompte('), htmlFiche: P.decl('function htmlFiche('), ouvrirFicheEtat: P.ligne('function ouvrirFicheEtat('),
    urlInvite: P.ligne('const urlInvite ='), lienInviteGeste: P.decl('async function lienInviteGeste('), enregistrerReunion: P.decl('async function enregistrerReunion('),
    VUES_PRO: P.ligne('const VUES_PRO ='), navPour: P.ligne('const navPour ='),
  };
  const donnees = {
    CAP, source, etat, MOI: { id: 'u_ana' }, icone: (n) => '<svg data-i="' + n + '"></svg>', CHEVRON: '', CHEVRON_UD: '',
    FMT_HEURE: { format: () => '10:00' }, heureEmpilee: (d, f) => '<span class="reunion-heure">' + d + '</span>', libelleHoraire: () => ({ h: '10:00 – 11:00', note: '', hz: '', ville: '' }),
    nomPersonne: () => 'Ana Martin', phrase: (e, d) => d, rendreListeReunions: () => { sortie.appels.push('rendreListeReunions'); },
    chargerListeReunionsAppel: null,
    copier: async (t) => { sortie.copiees.push(t); return true; }, mot: (t) => { sortie.mots.push(t); },
    location: { href: 'http://127.0.0.1:1234/index.html#reunions-liste' }, navigator: {},
    LR_TEST: true,
  };
  Object.assign(donnees, o.donnees || {});
  for (const k of (o.sans || [])) delete morceaux[k];       // un morceau remplacé par un espion (le banc le dit)
  const M = P.monter(morceaux, donnees);
  return Object.assign(M, { sortie, etat, CAP, source });
}
const comptes = (html, re) => (html.match(re) || []).length;
const lignesDe = (html) => html.split('<li').slice(1).filter((x) => /class="reunion-titre"/.test(x)).map((x) => ({ titre: (/class="reunion-titre">([^<]*)</.exec(x) || [])[1], rejoindre: /data-rejoindre=/.test(x), lien: /data-lien-invite=/.test(x), annulee: /reunion-ligne presse annulee|reunion-ligne annulee/.test(x), ouvre: /data-reunion=/.test(x) }));

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées');
  const base = monter();
  v('(population) chaque morceau est trouvé', base.absents, []);

  /* sept réunions : trois à venir qui vivent et que j'organise (l'une en cours), une d'un AUTRE, une annulée, une passée terminée pour tous, une passée sans séance */
  const REUNIONS = [
    reunion(1, 'Point client', [dans(5 * 60000)], { rejoignable: true, salleOuverte: true }),
    reunion(2, 'Revue devis', [le(jourPlus(1, 10))]),
    reunion(3, 'En cours', [{ debut: NOW - 10 * 60000, fin: NOW + 50 * 60000 }], { rejoignable: true }),
    reunion(4, 'De Cléo', [le(jourPlus(1, 14))], { organisateur: false, hote: 'cleo' }),
    reunion(5, 'Annulée', [le(jourPlus(2, 10))], { annulee: true }),
    reunion(6, 'Finie', [{ debut: NOW - 3 * H, fin: NOW - 2 * H, seance: { debut: NOW - 3 * H, fin: NOW - 2 * H, dureeS: 3000, n: 2, pourTous: true } }]),
    reunion(7, 'Hier sans séance', [{ debut: NOW - JOUR - 2 * H, fin: NOW - JOUR - H }]),
  ];
  const H1 = base.F.htmlListeReunions(REUNIONS, NOW);
  const av = lignesDe(H1.avenir), pa = lignesDe(H1.passees), A = Object.fromEntries(av.map((x) => [x.titre, x]));

  console.log('\n1. La liste : ce qui vient, ce qui est passé');
  v('(population) cinq occurrences à venir, deux passées', [H1.nAvenir, H1.nPassees, av.length, pa.length], [5, 2, 5, 2]);
  v('⛔ à venir : l\'en cours d\'abord, puis par date (la terminée et la passée n\'y sont pas)', av.map((x) => x.titre), ['En cours', 'Point client', 'Revue devis', 'De Cléo', 'Annulée']);
  v('passées : la plus récente d\'abord', pa.map((x) => x.titre), ['Finie', 'Hier sans séance']);
  vrai('un intertitre « En cours » devant l\'en cours, « Demain » devant la suite', /bord-jour[^>]*>En cours</.test(H1.avenir) && /bord-jour[^>]*>Demain</.test(H1.avenir));
  /* « Aujourd'hui » : « Point client » commence dans cinq minutes — à moins de dix minutes de minuit, c'est demain, et le contrôle ne dit rien (il ne crie pas faux) */
  if (new Date(minuit + JOUR).getTime() - NOW > 10 * 60000) vrai('« Aujourd\'hui » devant ce qui commence dans cinq minutes', /bord-jour[^>]*>Aujourd(?:'|&#39;)hui</.test(H1.avenir));
  v('« Rejoindre » : seulement les réunions dont la salle s\'ouvre (population : il y en a deux)', Object.keys(A).filter((t) => A[t].rejoindre).sort(), ['En cours', 'Point client']);
  v('⛔ « Lien invité » : chaque réunion de l\'ORGANISATEUR qui vit — pas celle de Cléo, pas l\'annulée', Object.keys(A).filter((t) => A[t].lien).sort(), ['En cours', 'Point client', 'Revue devis']);
  vrai('population : la réunion de Cléo et l\'annulée SONT dans la liste (l\'absence de lien ne vient pas d\'une absence de ligne)', !!A['De Cléo'] && !!A['Annulée'] && A['Annulée'].annulee);
  vrai('⛔ aucune ligne passée ne porte de « Lien invité » ni de « Rejoindre » (population : la liste des passées a deux lignes)', pa.length === 2 && pa.every((x) => !x.lien && !x.rejoindre));
  vrai('la passée terminée pour tous ne s\'ouvre plus (règle de l\'Agenda), celle sans séance s\'ouvre', !pa[0].ouvre && pa[1].ouvre);
  vrai('les gestes sont rangés DANS UNE rangée sous le texte (`reunion-gestes`), pas à côté : deux pastilles et un titre ne tiennent pas à 360 px', /<span class="reunion-gestes"><button[^>]*data-rejoindre[^>]*>Rejoindre<\/button><button[^>]*data-lien-invite/.test(H1.avenir));
  vrai('« Lien invité » porte un nom complet (aria-label : « Copier le lien invité de Point client »)', /aria-label="Copier le lien invité de Point client"/.test(H1.avenir));

  console.log('\n2. Les conditions du lien (chacune jouée, population à l\'appui)');
  vrai('population : avec la salle et la source, trois liens', comptes(H1.avenir, /data-lien-invite=/g) === 3);
  vrai('⛔ sans `CAP.salles` : aucun lien (une salle, ce n\'est pas là)', comptes(monter({ cap: { salles: false } }).F.htmlListeReunions(REUNIONS, NOW).avenir, /data-lien-invite=/g) === 0);
  vrai('⛔ une source qui ne sait pas faire le lien (l\'aperçu) : aucun lien', comptes(monter({ sansLien: true }).F.htmlListeReunions(REUNIONS, NOW).avenir, /data-lien-invite=/g) === 0);
  { const M = monter(), r = REUNIONS[1];
    vrai('⛔ l\'AGENDA garde sa ligne (`ligneReunion` sans le quatrième paramètre) : aucun lien — et la même ligne, dans l\'onglet, en porte un', !/data-lien-invite/.test(M.F.ligneReunion(r, r.occurrences[0], null)) && /data-lien-invite/.test(M.F.ligneReunion(r, r.occurrences[0], null, true)));
    vrai('… et « Rejoindre » reste dans l\'Agenda comme avant (le même bouton, sans rangée)', /<li class="reunion-li"><button[^>]*data-reunion=[\s\S]*<\/button><button[^>]*data-rejoindre/.test(M.F.ligneReunion(REUNIONS[0], REUNIONS[0].occurrences[0], null)) && !/reunion-gestes/.test(M.F.ligneReunion(REUNIONS[0], REUNIONS[0].occurrences[0], null))); }
  { const fini = reunion(8, 'Terminée aujourd\'hui', [{ debut: NOW - H, fin: NOW + H, seance: { debut: NOW - H, fin: NOW - 10, dureeS: 3000, n: 2, pourTous: true } }]), M = monter();
    const h = M.F.htmlListeReunions([fini], NOW);
    vrai('⛔ une occurrence dont la séance est terminée pour tous est PASSÉE même si sa fin prévue ne l\'est pas : ni à venir, ni lien', h.nAvenir === 0 && h.nPassees === 1 && !/data-lien-invite/.test(h.passees)); }

  console.log('\n3. Le côté : la même règle que l\'Agenda');
  { const mixte = REUNIONS.concat([reunion(9, 'Dîner perso', [dans(3 * H)], { cote: 'perso' })]);
    v('population : côté Pro, « Dîner perso » n\'est pas dans la liste', monter({ mode: 'pro' }).F.htmlListeReunions(mixte, NOW).nAvenir, 5);
    v('… côté Perso, elle y est (et les réunions Pro n\'y sont plus)', monter({ mode: 'perso' }).F.htmlListeReunions(mixte, NOW).nAvenir, 1); }

  console.log('\n4. L\'état vide dit quoi faire ; la liste est plafonnée');
  { const vide = monter().F.htmlListeReunions([], NOW);
    /* (28 octobre 2026, capture de Justin : deux boutons « Nouvelle réunion ») Le geste est UNE fois, en tête de l'onglet ; l'état vide renvoie vers lui sans le répéter. */
    vrai('⛔ « Aucune réunion prévue. » dit quoi faire, SANS répéter le bouton du haut', /Aucune réunion prévue\./.test(vide.avenir) && /Nouvelle réunion/.test(vide.avenir) && !/data-lr="nouvelle"/.test(vide.avenir) && vide.nAvenir === 0 && vide.nPassees === 0);
    vrai('population : une liste qui a des réunions ne dit PAS « Aucune réunion prévue »', !/Aucune réunion prévue/.test(H1.avenir));
    const soixante = []; for (let i = 0; i < 70; i++) soixante.push(reunion(100 + i, 'Série ' + i, [dans((i + 1) * H)]));
    const g = monter().F.htmlListeReunions(soixante, NOW);
    vrai('⛔ soixante-dix réunions : soixante lignes, puis « Voir les 10 autres dans l\'Agenda »', g.nAvenir === 70 && lignesDe(g.avenir).length === 60 && /Voir les 10 autres dans l(?:'|&#39;)Agenda/.test(g.avenir) && /data-lr="agenda"/.test(g.avenir)); }

  console.log('\n5. La lecture : deux fenêtres, une moitié qui manque se dit, une lecture périmée ne gagne pas');
  { const M = monter({ source: { reunions: async (du, au) => { M.sortie.fenetres.push([du, au]); return du < NOW - JOUR ? [REUNIONS[5], REUNIONS[6]] : [REUNIONS[0], REUNIONS[5]]; } } });
    await M.F.chargerListeReunions();
    const f = M.sortie.fenetres, lr = M.F.lr;
    v('population : deux lectures, une devant et une derrière', f.length, 2);
    vrai('⛔ chaque fenêtre tient sous les 62 jours du service (' + f.map((x) => Math.round((x[1] - x[0]) / JOUR)).join(' et ') + ' jours)', f.every((x) => x[1] - x[0] <= 62 * JOUR && x[1] > x[0]));
    vrai('l\'une commence à minuit aujourd\'hui, l\'autre finit à minuit demain (le passé du jour est lu)', f.some((x) => x[0] === new Date(new Date(NOW).setHours(0, 0, 0, 0)).getTime()) && f.some((x) => { const d = new Date(NOW); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return x[1] === d.getTime(); }));
    v('⛔ « Finie », lue dans les DEUX fenêtres, n\'est qu\'une réunion (3 réunions, pas 4)', [lr.reunions.length, lr.charge, lr.panne], [3, true, null]);
    vrai('la liste se redessine', M.sortie.appels.includes('rendreListeReunions')); }
  { let n = 0;
    const M = monter({ source: { reunions: async () => { if (++n === 2) throw Object.assign(new Error('x'), { dit: true }); return [REUNIONS[0]]; } } });
    await M.F.chargerListeReunions();
    vrai('⛔ une lecture qui échoue : la panne est DITE (`panne`), la liste d\'avant n\'est pas écrasée par du vide', M.F.lr.panne !== null && M.F.lr.charge === true && M.F.lr.reunions.length === 0); }
  { let rendre = null;
    const M = monter({ source: { reunions: (du) => new Promise((ok) => { if (!rendre) rendre = ok; else ok([REUNIONS[1]]); }) } });
    const premiere = M.F.chargerListeReunions(); const seconde = M.F.chargerListeReunions();
    await seconde; rendre([REUNIONS[0]]); await premiere;
    vrai('⛔ une lecture PÉRIMÉE (rendue après une plus neuve) ne remplace pas la neuve', M.F.lr.reunions.length === 1 && M.F.lr.reunions[0].id === REUNIONS[1].id); }
  { const F = monter().F, a = reunion(1, 'Série', [dans(H), dans(2 * H)]), b = reunion(1, 'Série', [dans(2 * H), dans(3 * H)]);
    v('une série lue des deux côtés : ses occurrences s\'unissent, sans doublon', F.fusionReunions([[a], [b]])[0].occurrences.map((o) => o.debut - NOW), [H, 2 * H, 3 * H]);
    vrai('… et la fusion ne modifie pas la réunion d\'origine', a.occurrences.length === 2); }

  console.log('\n6. La fiche : « Invité (sans compte) » en haut, une seule fois');
  const DEB = NOW + 10 * 60000;
  function fiche(opts) {
    const o = opts || {};
    const d = { id: ID(1), conv: 'c_1', titre: 'Point client', lieu: '', hote: 'u_ana', version: 1, repetition: 'aucune', debut: DEB, fin: DEB + H, prochaine: { debut: DEB, fin: DEB + H }, annulee: !!o.annulee,
      moi: { hote: o.hote !== false, rappels: [15], statut: 'accepte' }, invites: [{ id: 'u_ana', statut: 'accepte', hote: true }], ordreDuJour: [{ id: 'p1', texte: 'Budget', fait: false }], attente: false, plafond: null,
      salle: { rejoignable: true, ouverte: false, occurrence: { debut: DEB, fin: DEB + H } } };
    const F = { id: d.id, donnees: d, seance: o.seance || null, neuve: !!o.neuve, confirme: null, courriel: null, prevenir: true, presence: null, occurrence: null };
    const M = monter({ cap: Object.assign({ presenceRapport: true }, o.cap || {}), sansLien: o.sansLien, donnees: { reu: { fiche: F }, RAPPELS_REUNION: [[15, '15 minutes avant']], libelleRepetition: () => '', rappelCourt: (t) => t, indexAvatarPage: () => 0, estUrl: () => false,
      STATUTS_REPONSE: [['accepte', 'Accepter']], snapDecalage: () => ({ peut: true, debut: DEB }), candidats: () => [], htmlParticipant: () => '<div class="contact"></div>', htmlConfirmation: () => '', htmlCourriel: () => '', FMT_SUIVI: { format: () => 'lundi' }, presenceLignes: () => ({ venus: [], absents: [] }) } });
    return { html: M.F.htmlFiche(d), M, d, F };
  }
  const rub = (html) => Array.from(html.matchAll(/<div class="rubrique"><span>([^<]*)<\/span>/g)).map((m) => m[1]);
  const pos = (html, motif) => html.search(motif);
  const vive = fiche();
  v('(population) la fiche d\'un organisateur compte « Participants », « Organisateur » et « Salle »', ['Participants', 'Organisateur', 'Salle'].map((t) => rub(vive.html).includes(t)), [true, true, true]);
  vrai('⛔ « Invité (sans compte) » vient APRÈS « Rejoindre » (la salle) et AVANT l\'ordre du jour, « Participants », « Organisateur » et « Salle »', (() => {
    const i = pos(vive.html, />Invité \(sans compte\)</), r = pos(vive.html, /data-reu="rejoindre"/);
    return r >= 0 && i > r && ['Ordre du jour', 'Me rappeler', 'Participants', 'Organisateur', 'Salle'].every((t) => i < pos(vive.html, new RegExp('>' + t + '<'))); })());
  v('⛔ UNE carte « Invité (sans compte) » et UN « Copier le lien invité » (l\'ancienne, sous « Salle », est retirée)', [comptes(vive.html, />Invité \(sans compte\)</g), comptes(vive.html, /data-reu="inv-copier"/g), comptes(vive.html, /data-reu="inv-regenerer"/g)], [1, 1, 1]);
  vrai('le lien AVEC compte (« Copier le lien d\'invité », « Renouveler ») reste sous « Salle »', pos(vive.html, /data-reu="lien-copier"/) > pos(vive.html, />Salle</) && pos(vive.html, /data-reu="lien-renouveler"/) > pos(vive.html, />Salle</));
  vrai('(population) la proposition de la création n\'y est pas : cette fiche n\'est pas neuve', comptes(vive.html, /data-reu="inv-neuf"/g) === 0);
  vrai('⛔ rien pour une réunion ANNULÉE (la fiche garde pourtant ses titres)', rub(fiche({ annulee: true }).html).length >= 3 && comptes(fiche({ annulee: true }).html, /inv-/g) === 0);
  vrai('⛔ rien pour un INVITÉ (seul l\'organisateur) — population : sa fiche est rendue', rub(fiche({ hote: false }).html).includes('Participants') && comptes(fiche({ hote: false }).html, /inv-/g) === 0);
  vrai('⛔ rien pour une séance FINIE (`F.seance`) — population : sa fiche dit « terminée »', /Cette réunion est terminée/.test(fiche({ seance: { dureeS: 600, n: 2 } }).html) && comptes(fiche({ seance: { dureeS: 600, n: 2 } }).html, /inv-/g) === 0);
  vrai('⛔ sans `CAP.salles` : rien', comptes(fiche({ cap: { salles: false } }).html, /inv-/g) === 0 && rub(fiche({ cap: { salles: false } }).html).includes('Participants'));
  vrai('⛔ sans la source du lien : rien (pas un bouton qui répond « pas disponible »)', comptes(fiche({ sansLien: true }).html, /inv-/g) === 0);
  const neuve = fiche({ neuve: true });
  vrai('⛔ la fiche NEUVE propose « Copier le lien invité » AVANT la carte « Invité (sans compte) » — et après « Rejoindre »', (() => { const n = pos(neuve.html, /data-reu="inv-neuf"/), i = pos(neuve.html, />Invité \(sans compte\)</), r = pos(neuve.html, /data-reu="rejoindre"/); return r >= 0 && n > r && n < i; })());
  vrai('… et jamais pour un invité, une annulée ou une finie, même neuve', ['hote', 'annulee', 'seance'].every((k) => comptes(fiche(Object.assign({ neuve: true }, k === 'hote' ? { hote: false } : k === 'annulee' ? { annulee: true } : { seance: { dureeS: 600, n: 2 } })).html, /inv-neuf/g) === 0));

  console.log('\n7. La création : la fiche s\'ouvre sur la proposition (une seule fois), l\'onglet se relit, le geste copie le lien');
  { const M = monter({ sans: ['chargerListeReunions'], route: { vue: 'reunions-liste' }, source: { programmer: async () => ({ id: ID(42), parLien: 0, nonInvites: 0 }) },
      donnees: { reu: { form: { id: null, choisis: [], initial: {} }, occurrences: {}, neuve: null }, lireFormReunion: () => ({ debut: '2026-10-27T10:00', titre: 'T' }), dateDeChaine: () => 1, allerAuJour: () => {}, remplacer: (r) => M.sortie.appels.push('remplacer:' + r.feuille),
        chargerListeReunions: () => M.sortie.appels.push('chargerListeReunions') } });
    const b = { _a: {}, getAttribute(k) { return this._a[k]; }, setAttribute(k, x) { this._a[k] = x; }, removeAttribute(k) { delete this._a[k]; } };
    await M.F.enregistrerReunion(b);
    vrai('⛔ la fiche s\'ouvre (`remplacer`) sur la réunion créée, la marque « neuve » est posée AVANT, et l\'onglet Réunions se relit', M.sortie.appels.includes('remplacer:reunion:' + ID(42)) && M.sortie.appels.includes('chargerListeReunions') && M.donnees.reu.neuve === ID(42));
    M.donnees.reu.occurrences = {};
    const O = monter({ donnees: { reu: { neuve: ID(42), occurrences: {}, fiche: null } } });
    O.F.ouvrirFicheEtat(ID(42));
    vrai('⛔ `ouvrirFicheEtat` consomme la marque : la fiche de la création est neuve', O.donnees.reu.fiche.neuve === true && O.donnees.reu.neuve === null);
    O.F.ouvrirFicheEtat(ID(42));
    vrai('⛔ … et la même fiche rouverte ne l\'est plus (une seule fois)', O.donnees.reu.fiche.neuve === false);
    O.F.ouvrirFicheEtat(ID(43));
    vrai('une autre réunion n\'est pas neuve non plus', O.donnees.reu.fiche.neuve === false); }
  { const M = monter();
    await M.F.lienInviteGeste('copier', ID(1), 'Point client');
    vrai('⛔ « Copier le lien invité » copie `…/invite.html#i=<jeton>` et le dit', M.sortie.copiees.length === 1 && /^http:\/\/127\.0\.0\.1:1234\/invite\.html#i=JETONx{26}$/.test(M.sortie.copiees[0]) && M.sortie.mots.includes('Lien invité copié'));
    const S = monter({ sansLien: true }); await S.F.lienInviteGeste('copier', ID(1), 'x');
    vrai('une source sans lien : rien n\'est copié, la page le dit', S.sortie.copiees.length === 0 && S.sortie.mots.some((t) => /pas disponible/.test(t))); }

  console.log('\n8. La navigation : le côté Pro seulement, une route valide, le câblage');
  { const ORDRE = ['accueil', 'messages', 'contacts', 'appels', 'reunions-liste', 'reunions', 'courrier', 'reglages'];
    const nav = (mode) => monter({ mode, donnees: { ORDRE } }).F.navPour();
    v('⛔ côté Pro : « Réunions » JUSTE AVANT « Agenda » (population : les huit rubriques moins le profil)', nav('pro'), ['accueil', 'messages', 'contacts', 'appels', 'reunions-liste', 'reunions', 'courrier']);
    v('⛔ côté Perso : plus d\'onglet Réunions (ni tableau de bord, ni Courrier) — l\'Agenda reste', nav('perso'), ['messages', 'contacts', 'appels', 'reunions']); }
  { const route = (hash, ordre) => { const M = P.monter({ routeDepuisHash: P.decl('function routeDepuisHash(') }, { location: { hash }, VUES: { 'reunions-liste': {}, messages: {}, reunions: {}, reglages: {} }, ORDRE: ordre, CAP: { reunions: true, agenda: true }, ID_REUNION: /^r_[0-9a-f]{32}$/, ID_EVT: /^e_[0-9a-f]{32}$/, REG_SECTIONS: [] }); return M.F.routeDepuisHash().vue; };
    v('« #reunions-liste » est une route quand l\'onglet existe', route('#reunions-liste', ['messages', 'reunions-liste', 'reunions']), 'reunions-liste');
    v('⛔ … et retombe sur Messages quand il n\'existe pas (un compte sans espace)', route('#reunions-liste', ['messages', 'reunions']), 'messages'); }
  { const CODE = P.JS;
    vrai('`demarrer` insère l\'onglet juste avant l\'Agenda, côté Pro seulement (dans le bloc `etat.pro`)', (() => { const a = CODE.indexOf("ORDRE = ['accueil'].concat(ORDRE)"), b = CODE.indexOf("ORDRE.splice(ORDRE.indexOf('reunions'), 0, 'reunions-liste')"), c = CODE.indexOf('NAV = navPour();', a); return a > 0 && b > a && c > b; })());
    vrai('`appliquer` entre dans l\'onglet à l\'ouverture de la vue', /if \(r\.vue === 'reunions-liste'\) entrerListeReunions\(\);/.test(CODE));
    vrai('le service qui change une réunion relit l\'onglet (`surReunions`) ; passer du côté Pro au côté Perso le redessine ou le quitte (`changerMode`)', /if \(etat\.route && etat\.route\.vue === 'reunions-liste'\) chargerListeReunions\(\); else lr\.charge = false;/.test(CODE) && /VUES_PRO\.includes\(etat\.route\.vue\) && m === 'perso'\) remplacer\(/.test(CODE));
    vrai('la section existe dans la page, et la barre à sept onglets se resserre (`dense`)', /<section class="vue" id="vue-reunions-liste"/.test(P.PAGE) && /classList\.toggle\('dense', NAV\.length >= 7\)/.test(CODE)); }
  fin();
})().catch((e) => { console.error(e); process.exit(2); });
