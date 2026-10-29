/* ⛔ CE QUE CE FICHIER GARDE — LES QUATRE OUTILS DE MARGAUX, COMPTABLE DE LA TOUR (28 octobre 2026) : seul Justin, seulement son fil privé, les chiffres écrits par le CODE, jamais relus par Claude.
   Le VRAI `server/agent-compta.js` (avec le vrai `compta-stripe.js`, la vraie messagerie `agent-equipe.js`, les vrais fils `conversations.js`, les vraies annonces) sur l'établi `banc-autonomie.js` ; Stripe est un faux qui parle
   comme l'API ; Claude est un faux qui garde chaque requête reçue et joue l'outil voulu. Ce que ce fichier prouve :
     · « le point du mois » : 4 à 5 lignes « système » de 300 signes au plus, avec les bons chiffres, dans le fil privé ;
     · ⛔ AUCUN chiffre de TeamOP ne part chez Anthropic : ni dans la requête qui précède, ni dans celle du tour suivant (les lignes du système ne sont jamais relues) ; le journal des agents et l'annonce de « Équipe » n'en portent aucun ;
     · ⛔ seul Justin, seul le fil privé : Victor ou Camille qui réveillent Margaux n'obtiennent rien (Stripe n'est même pas interrogé) ; Justin qui demande dans un groupe reçoit « je te réponds dans notre fil privé » et aucun chiffre ;
     · ⛔ Margaux à l'arrêt, ou les agents en pause : rien ; une entrée hors schéma (période refusée, clé en trop) : rien n'est lu ;
     · ⛔ Stripe muet, périmé, en erreur : « Stripe illisible, je ne donne aucun chiffre » — pas un seul « 0 € » ;
     · `regler_compta` ne note QUE ce que Justin a écrit (régime, plateforme, expert-comptable), dans un fichier écrit en entier, jamais par-dessus un fichier illisible ;
     · les rappels (J-30, J-7, la question sur la plateforme) : une fois chacun, la marque posée sur disque AVANT d'écrire ; l'assembleur ne perd aucun outil ; aucun outil de la compta n'est délégable. */
'use strict';
const fs = require('fs'), path = require('path');
const { monter, rep, outil, S: SRV } = require('./banc-autonomie');
const B = require('./banc-compta');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 400) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); process.exit(1); }, 150000).unref();

const COMPTA = require(SRV('compta-stripe.js')), AGENT = require(SRV('agent-compta.js')), AG = require(SRV('agents.js'));
const R = B.reel();
/* des chiffres DISTINCTIFS : aucun ne peut se trouver par hasard dans un prompt, un journal ou une phrase de Claude */
const CHIFFRES = ['3 142,75', '3142,75', '3142.75', '487,50', '487,5', '314275'];
const JEU = () => [
  B.facture({ id: 'in_c1', cents: 199900, cree: '2026-10-03T08:00:00Z', payee: '2026-10-03T08:05:00Z', nom: 'Dupont Secrète SARL' }),
  B.facture({ id: 'in_c2', cents: 114375, cree: '2026-10-09T08:00:00Z', payee: '2026-10-09T08:05:00Z', nom: 'Martin Confidentiel' }),
  B.facture({ id: 'in_c3', status: 'open', cents: 1500, cree: '2026-10-12T08:00:00Z' }), B.facture({ id: 'in_c4', status: 'open', cents: 1500, cree: '2026-10-13T08:00:00Z' }), B.facture({ id: 'in_c5', status: 'open', cents: 1500, cree: '2026-10-14T08:00:00Z' }),
  B.facture({ id: 'in_c6', status: 'uncollectible', cents: 1500, cree: '2026-10-15T08:00:00Z' }), B.facture({ id: 'in_c7', status: 'open', attempted: true, cents: 1500, cree: '2026-10-16T08:00:00Z' }),
  B.facture({ id: 'in_c8', status: 'void', cents: 1500, cree: '2026-10-17T08:00:00Z' }),
];
const ABOS = () => [B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Business'), B.abo('actif', 'OP GESTION Business'),
  B.abo('actif', 'OP GESTION Business Premium', 50), B.abo('actif', 'OP GESTION Business Premium', 50), B.abo('essai', 'OP GESTION Pro'), B.abo('essai', 'OP GESTION Business'), B.abo('impaye', 'OP GESTION Pro')];
const ABOS_ETAT = () => ({ ok: true, configured: true, abos: ABOS(), mrr: 487.5, actifs: 9, impayes: 1 });

/* Une équipe d'essai : les vrais modules, un faux Stripe, un faux Claude qui joue `jouer(t)` pour Margaux */
function equipe(o) {
  o = o || {};
  const stripe = B.fauxStripe(o.factures || JEU());
  const etatAbos = { v: o.abos || ABOS_ETAT() };
  let compta = null;
  const H = monter(Object.assign({ outilsAgents: { get margaux() { return compta && compta.outilsEquipe; } },
    script: t => (t.id === 'margaux' ? (o.jouer ? o.jouer(t) : rep('Voilà le point, il est juste en dessous.', [outil('point_compta', { periode: 'ce_mois' })])) : rep('Ok.')) }, o.monter || {}));
  const fichier = require(SRV('agents-fichier.js'))(H.D);
  if (o.avantCompta) o.avantCompta(H.D);
  const fichierCompta = o.fichier ? o.fichier(H.D) : fichier;
  const stripeMod = COMPTA({ lire: stripe.lire, convertir: R.stripePaiement, abonnements: async () => { if (typeof etatAbos.v === 'function') return etatAbos.v(); return etatAbos.v; }, configure: () => !o.sansCle, maintenant: () => H.horloge.t });
  compta = AGENT({ agents: H.agents, conversations: o.conversations ? o.conversations(H) : H.conv, fichier: fichierCompta, stripe: stripeMod, maintenant: () => H.horloge.t,
    periodes: () => ({ ok: true, nombre: 3, prochaine: '2026-11-12' }), relances: () => ({ impayesSuivis: 2, relancesParties: 3, misesEnDemeurePreparees: 1 }) });
  return Object.assign(H, { stripe, etatAbos, compta, fichierCompta, reglages: () => { try { return JSON.parse(fs.readFileSync(path.join(H.D, 'compta-reglages.json'), 'utf8')); } catch (e) { return null; } } });
}
const lignesSysteme = async (H, fil) => (await H.messages(fil)).filter(m => m.de === 'systeme').map(m => m.texte);
const corpsRecus = H => JSON.stringify(H.appels.map(a => ({ s: a.system, m: a.messages })));

(async () => {
  console.log('\n── 3161 · Margaux comptable : les quatre outils, la porte de Justin, des chiffres que Claude ne lit jamais ──');

  console.log('\n1. « Margaux, le point du mois » : les chiffres sont écrits par le CODE, dans le fil privé');
  {
    const H = equipe();
    await H.justin('margaux', 'Margaux, fais-moi le point du mois');
    const ms = await H.messages('margaux');
    const sys = ms.filter(m => m.de === 'systeme').map(m => m.texte);
    v('l’ordre du fil : Justin, UNE phrase de Margaux, puis les lignes du système', ms.map(m => m.de).filter((x, i, a) => x !== 'systeme' || a[i - 1] !== 'systeme').join(','), 'justin,margaux,systeme');
    vrai('(population) Margaux a répondu et 4 à 6 lignes du système ont été écrites', ms.some(m => m.de === 'margaux') && sys.length >= 4 && sys.length <= 6, sys.length);
    vrai('⛔ chaque ligne tient en 300 signes ou moins — et aucune n’est coupée (elles finissent par un point ou un nombre)', sys.every(l => l.length <= 300 && /[.\d)]$/.test(l)), sys.map(l => l.length + ':' + l.slice(-12)).join(' | '));
    const tout = sys.join('\n');
    vrai('l’encaissé d’octobre : 3 142,75 € sur 2 factures payées ; 3 en attente, 2 refusées, 1 annulée', /encaissé en octobre 2026 \(mois en cours\) : 3 142,75 € \(2 factures payées\)/.test(tout) && /en attente : 3/.test(tout) && /refusées : 2/.test(tout) && /annulées : 1/.test(tout), tout);
    vrai('les abonnés : 7 payants, 2 en essai, 1 en impayé, revenu mensuel 487,50 €', /Abonnés : 7 payants, 2 en essai, 1 en impayé/.test(tout) && /revenu mensuel récurrent : 487,50 €/.test(tout), tout);
    vrai('par formule : Pro 3 · Business 2 · Business Premium 2', /Par formule \(payants\) : Pro 3 · Business 2 · Business Premium 2/.test(tout), tout);
    vrai('les périodes offertes (3, prochaine fin le 12 novembre 2026) et les relances (2 · 3 · 1)', /3 entreprises, prochaine fin le 12 novembre 2026/.test(tout) && /2 impayés suivis · 3 relances parties · 1 mise en demeure préparée/.test(tout), tout);
    vrai('⛔ la phrase de Margaux ne porte AUCUN chiffre, et aucun nom de client n’est écrit nulle part', !/\d/.test(ms.find(m => m.de === 'margaux').texte) && !/Dupont|Martin|Secr[èe]te|Confidentiel/.test(tout));
    const recu = corpsRecus(H);
    vrai('⛔ AUCUN chiffre du point dans ce que Claude a reçu (prompt, fil, tour)', CHIFFRES.every(c => !recu.includes(c)), recu.slice(0, 300));
    /* le tour SUIVANT : Justin remercie — Margaux relit le fil. Les lignes du système n'y sont pas. */
    H.appels.length = 0;
    H.appels.push(); await H.justin('margaux', 'Merci Margaux');
    const recu2 = corpsRecus(H);
    vrai('⛔ …ni au tour suivant (le point n’est pas dans l’historique que Margaux relit)', H.appels.length >= 1 && CHIFFRES.every(c => !recu2.includes(c)) && !/Encaissé|Abonnés|revenu mensuel/.test(recu2), recu2.slice(0, 300));
    const jour = JSON.stringify(H.agents.lireJournal());
    vrai('(population) le journal des agents a une ligne « point compta » de Margaux', H.agents.lireJournal().some(e => e.agent === 'margaux' && e.action === 'point compta' && e.resultat === 'ok'));
    vrai('⛔ …et pas un montant, un nombre de factures, un nom dans tout le journal', CHIFFRES.every(c => !jour.includes(c)) && !/Dupont|Martin|Secr[èe]te|Confidentiel|3 142|487/.test(jour), jour.slice(-400));
    H.conv.viderFaits();
    const eq = await H.messages('equipe');
    const annonce = eq.filter(m => m.fait === true && /compta/.test(m.texte));
    vrai('l’annonce de « Équipe » : « Je viens de faire le point de la compta » — sans un chiffre', annonce.length === 1 && /Je viens de faire le point de la compta/.test(annonce[0].texte) && !/\d/.test(annonce[0].texte), JSON.stringify(annonce.map(m => m.texte)));
    vrai('⛔ rien du point dans « Équipe » ni dans aucun groupe', CHIFFRES.every(c => !JSON.stringify(eq).includes(c)) && !/Encaissé|Abonnés/.test(JSON.stringify(eq)));
    vrai('les lignes sont des lignes du système (jamais un message de Margaux, jamais notifiées)', ms.filter(m => m.de === 'systeme').every(m => m.systeme === true && m.niveau === 'info'));
    H.nettoyer();
  }

  console.log('\n2. Les autres périodes, et une entrée hors schéma ne lit rien');
  {
    const H = equipe({ factures: [B.facture({ id: 'in_s1', cents: 2500, cree: '2026-09-10T08:00:00Z', payee: '2026-09-10T08:05:00Z' })], jouer: () => rep('Voilà.', [outil('point_compta', { periode: 'mois_dernier' })]) });
    await H.justin('margaux', 'le point de septembre');
    const l = (await lignesSysteme(H, 'margaux')).join('\n');
    vrai('« mois_dernier » : septembre 2026, 25 €, une facture payée — et ce n’est plus le « mois en cours »', /encaissé en septembre 2026 : 25 € \(1 facture payée\)/.test(l) && !/mois en cours/.test(l), l);
    H.nettoyer();
  }
  for (const [nom, entree, raison] of [['période hors des douze mois', { periode: '2019-01' }, 'periode'], ['une clé en trop', { periode: 'ce_mois', source: 'x' }, 'forme'], ['sans période', {}, 'forme'], ['période pas une chaîne', { periode: 5 }, 'forme'], ['entrée nulle', null, 'forme'], ['une liste', ['ce_mois'], 'forme']]) {
    const H = equipe();
    const r = await H.compta.outilsEquipe.executer('point_compta', entree, { de: 'justin', fil: 'margaux', texte: 'le point' });
    v('⛔ ' + nom + ' : refusé (« ' + raison + ' »), et Stripe n’est PAS interrogé', [r.ok, r.raison, H.stripe.appels.length], [false, raison, 0]);
    H.nettoyer();
  }

  console.log('\n3. ⛔ Seul Justin, seulement son fil privé');
  {
    /* Victor réveille Margaux dans « Équipe » : le message qui la réveille est de Victor */
    const H = equipe();
    H.conv.parler('victor', 'equipe', '@margaux donne-moi le point de l’argent du mois', { niveau: 'info', prof: 1 });
    await H.calme();
    const tout = JSON.stringify(await H.messages('equipe')) + JSON.stringify(await H.messages('margaux'));
    vrai('(population) Margaux a été réveillée par Victor et a bien tenté d’appeler l’outil', H.appels.some(a => a.id === 'margaux') && H.agents.lireJournal().some(e => e.agent === 'margaux' && /outil point_compta/.test(e.action)), JSON.stringify(H.agents.lireJournal().slice(-4)));
    v('⛔ un collègue : refusé, Stripe n’est pas interrogé', [H.stripe.appels.length, H.agents.lireJournal().filter(e => e.agent === 'margaux' && e.action === 'outil point_compta').map(e => e.resultat + ':' + e.detail)], [0, ['refuse:pas_justin']]);
    vrai('…aucun chiffre ni ligne « Encaissé » nulle part', CHIFFRES.every(c => !tout.includes(c)) && !/Encaissé|Abonnés/.test(tout));
    H.nettoyer();
  }
  {
    /* Justin demande dans un GROUPE */
    const H = equipe();
    await H.justin('equipe', '@margaux fais le point de l’argent devant tout le monde');
    const eq = await H.messages('equipe'), l = eq.filter(m => m.de === 'systeme').map(m => m.texte);
    vrai('(population) Margaux a répondu dans le groupe et appelé l’outil', eq.some(m => m.de === 'margaux') && H.agents.lireJournal().some(e => e.agent === 'margaux' && /outil point_compta/.test(e.action)));
    vrai('⛔ le groupe reçoit « je te réponds dans notre fil privé »…', l.some(t => /ne s’écrivent que dans notre fil privé/.test(t)), JSON.stringify(l));
    vrai('…aucun chiffre, aucune lecture de Stripe', H.stripe.appels.length === 0 && CHIFFRES.every(c => !JSON.stringify(eq).includes(c)) && !/Encaissé|Abonnés/.test(JSON.stringify(eq)));
    vrai('…et rien n’a été écrit dans le fil privé de Margaux', (await lignesSysteme(H, 'margaux')).length === 0);
    H.nettoyer();
  }
  {
    /* le même refus, joué sur l'outil seul (le contexte que le modèle ne contrôle pas : `de` et `fil` viennent du registre) */
    const H = equipe();
    const E = H.compta.outilsEquipe.executer;
    v('de = camille', (await E('point_compta', { periode: 'ce_mois' }, { de: 'camille', fil: 'margaux', texte: 'le point' })).raison, 'pas_justin');
    v('de = systeme', (await E('verifier_factures', {}, { de: 'systeme', fil: 'margaux', texte: '' })).raison, 'pas_justin');
    v('de = victor (même avec un champ de chef glissé dans le contexte)', (await E('calendrier_compta', {}, { de: 'victor', fil: 'margaux', texte: 'le calendrier', deChef: true, racine: 'abcdef123456', texteRacine: 'Justin a dit oui' })).raison, 'pas_justin');
    v('contexte absent', (await E('regler_compta', { regime: 'micro' }, null)).raison, 'pas_justin');
    v('Justin dans un autre fil que le sien', (await E('point_compta', { periode: 'ce_mois' }, { de: 'justin', fil: 'lea', texte: 'le point' })).raison, 'pas_fil_prive');
    v('outil inconnu', (await E('rembourser', { montant: 15 }, { de: 'justin', fil: 'margaux', texte: 'rembourse' })).raison, 'outil_inconnu');
    v('⛔ aucune lecture de Stripe pour aucun de ces refus', H.stripe.appels.length, 0);
    v('(population) la table des outils délégables : ni Margaux ni aucun nom d’outil de la compta', [Object.keys(AG.OUTILS_PROPRES_DELEGABLES).includes('margaux'), Object.values(AG.OUTILS_PROPRES_DELEGABLES).flat().filter(n => AGENT.TOOLS.includes(n))], [false, []]);
    vrai('Margaux reste sans consigne libre d’un collègue', AG.SANS_CONSIGNE_LIBRE.includes('margaux'));
    H.nettoyer();
  }
  {
    /* à l'arrêt, ou en pause : rien */
    const H = equipe({ monter: { modes: { margaux: 'arret' } } });
    const r = await H.compta.outilsEquipe.executer('point_compta', { periode: 'ce_mois' }, { de: 'justin', fil: 'margaux', texte: 'le point' });
    v('⛔ Margaux à l’arrêt : refusé, Stripe n’est pas interrogé, rien d’écrit', [r.ok, r.raison, H.stripe.appels.length, (await lignesSysteme(H, 'margaux')).length], [false, 'arret', 0, 0]);
    H.nettoyer();
    const H2 = equipe({ monter: { avant: D => fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: true, par: 'Justin', depuis: 1, motif: '' }, modes: { margaux: 'auto' } })) } });
    const r2 = await H2.compta.outilsEquipe.executer('verifier_factures', {}, { de: 'justin', fil: 'margaux', texte: 'vérifie' });
    v('⛔ les agents en pause : refusé, rien de lu', [r2.ok, r2.raison, H2.stripe.appels.length], [false, 'arret', 0]);
    const r3 = await H2.compta.passer();
    v('…et les rappels ne partent pas non plus', r3.saute, 'pause');
    H2.nettoyer();
  }

  console.log('\n4. ⛔ Stripe muet, périmé, en erreur : « illisible », jamais un zéro');
  {
    const H = equipe();
    H.stripe.panne = true; H.etatAbos.v = { ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0, erreur: 'Connexion à Stripe impossible pour le moment' };
    await H.justin('margaux', 'le point du mois');
    const l = await lignesSysteme(H, 'margaux'), tout = l.join('\n');
    vrai('une ligne : « Stripe illisible, je ne donne aucun chiffre »', l.some(t => /^Stripe illisible, je ne donne aucun chiffre/.test(t)), tout);
    vrai('⛔ pas un seul « 0 € », « 0 facture », « 0 payants », « revenu mensuel »', !/\b0 €|0 facture|\b0 payants|revenu mensuel récurrent|Encaissé en|Abonnés :/.test(tout), tout);
    vrai('…les deux morceaux qui ne sont pas Stripe restent dits : périodes offertes et relances', /3 entreprises/.test(tout) && /2 impayés suivis/.test(tout), tout);
    H.conv.viderFaits();
    const eq = await H.messages('equipe');
    vrai('l’annonce dit que le point n’a pas pu être fait (sans chiffre)', eq.some(m => m.fait === true && /Je n’ai pas pu faire le point de la compta/.test(m.texte)), JSON.stringify(eq.map(m => m.texte)));
    vrai('le journal dit POURQUOI, en mots (jamais un nombre)', H.agents.lireJournal().some(e => e.agent === 'margaux' && e.action === 'point compta' && e.resultat === 'erreur' && /encaissé stripe, abonnés stripe/.test(e.detail)), JSON.stringify(H.agents.lireJournal().filter(e => e.action === 'point compta')));
    H.nettoyer();
  }
  {
    /* les abonnés seuls périmés : l'encaissé reste lisible, la ligne des abonnés dit la date de la dernière lecture */
    const H = equipe();
    H.etatAbos.v = Object.assign(ABOS_ETAT(), { perime: true, majTs: Date.parse('2026-10-27T13:05:00Z'), erreur: 'Connexion à Stripe impossible' });
    await H.justin('margaux', 'le point');
    const tout = (await lignesSysteme(H, 'margaux')).join('\n');
    vrai('⛔ des chiffres périmés : la date de la dernière lecture, pas les chiffres (ni 487, ni « 7 payants »)', /Abonnés et revenu mensuel : Stripe illisible, je ne donne aucun chiffre \(dernière lecture réussie : 27 octobre à 14 h 05\)/.test(tout) && !/487|7 payants/.test(tout), tout);
    vrai('…et l’encaissé, lui, reste dit (la lecture des factures a réussi)', /3 142,75 €/.test(tout) && !/Par formule/.test(tout), tout);
    H.nettoyer();
    const H2 = equipe({ sansCle: true });
    await H2.justin('margaux', 'le point');
    const t2 = (await lignesSysteme(H2, 'margaux')).join('\n');
    vrai('clé Stripe absente : « Stripe illisible », aucune lecture', /^Stripe illisible/.test(t2) && !/Encaissé en/.test(t2) && H2.stripe.appels.length === 0, t2);
    H2.nettoyer();
    const H3 = equipe({ factures: [] });
    await H3.justin('margaux', 'le point');
    const t3 = (await lignesSysteme(H3, 'margaux')).join('\n');
    vrai('un VRAI zéro : un mois sans facture se dit « 0 facture payée », avec ses compteurs à 0', /encaissé en octobre 2026 \(mois en cours\) : 0 facture payée · en attente : 0 · refusées : 0 · annulées : 0/.test(t3), t3);
    H3.nettoyer();
  }

  console.log('\n5. Le bilan des factures Stripe (verifier_factures) : des nombres, et la liste à cocher');
  {
    const liste = [
      B.facture({ id: 'in_f1', number: 'ZZZZ0001-0001', cree: '2026-03-01T09:00:00Z', nom: 'Dupont Secrète SARL', courriel: 'secret@exemple-banc.fr', tvaClient: [{ type: 'eu_vat', value: 'FR998877665544' }] }),
      B.facture({ id: 'in_f2', number: 'ZZZZ0001-0002', cree: '2026-03-02T09:00:00Z', footer: 'Merci', adresse: null }),
    ];
    const H = equipe({ factures: liste, jouer: () => rep('Je regarde.', [outil('verifier_factures', {})]) });
    await H.justin('margaux', 'vérifie mes factures Stripe');
    const l = await lignesSysteme(H, 'margaux'), tout = l.join('\n');
    vrai('(population) des lignes ont été écrites', l.length >= 4, l.length);
    vrai('x sur y : 2 factures, numéro 2 sur 2, mention de franchise 1 sur 2, adresse du client 1 sur 2, TVA du client 1 sur 2, TVA facturée 0 €', /Factures de 2026 lues chez Stripe \(brouillons exclus\) : 2/.test(tout) && /Numéro : 2 sur 2/.test(tout) && /mention de franchise \(293 B ou CIBS\) : 1 sur 2/.test(tout) && /Adresse du client : 1 sur 2/.test(tout) && /identifiant de TVA du client : 1 sur 2/.test(tout) && /TVA facturée : 0 € \(0 attendu en franchise\)/.test(tout), tout);
    vrai('la liste à cocher dans Stripe : adresse du vendeur, SIREN, pénalités, indemnité de 40 €', /À cocher toi-même/.test(tout) && /adresse/.test(tout) && /SIREN du vendeur/.test(tout) && /pénalités de retard/.test(tout) && /indemnité forfaitaire de 40 €/.test(tout), tout);
    vrai('le niveau de preuve est dit (« extrait »)', /extrait/.test(tout) && /expert-comptable/.test(tout));
    vrai('⛔ aucun nom de client, aucune adresse, aucun numéro de facture, aucun identifiant de TVA', !/Dupont|Secr[èe]te|secret@|ZZZZ0001|FR998877665544/.test(tout) && !/Dupont|ZZZZ0001/.test(JSON.stringify(H.agents.lireJournal())) && !/Dupont|ZZZZ0001|FR998877665544/.test(corpsRecus(H)), tout);
    vrai('chaque ligne ≤ 300 signes', l.every(t => t.length <= 300), l.map(t => t.length).join(','));
    H.nettoyer();
    const H2 = equipe({ jouer: () => rep('Je regarde.', [outil('verifier_factures', {})]) });
    H2.stripe.panne = true;
    await H2.justin('margaux', 'vérifie mes factures');
    const t2 = (await lignesSysteme(H2, 'margaux')).join('\n');
    vrai('Stripe muet : « illisible » (jamais « 0 sur 0 »), la liste à cocher reste donnée', /Factures de l’année : Stripe illisible, je ne donne aucun chiffre/.test(t2) && !/ sur 0|0 sur/.test(t2) && /À cocher toi-même/.test(t2), t2);
    H2.nettoyer();
  }

  console.log('\n6. Le calendrier : les dates de la loi, le niveau de preuve de chacune');
  {
    const H = equipe({ jouer: () => rep('Voilà le calendrier.', [outil('calendrier_compta', {})]) });
    await H.justin('margaux', 'le calendrier de la compta');
    const l = await lignesSysteme(H, 'margaux'), tout = l.join('\n');
    vrai('(population) le calendrier a plusieurs lignes', l.length >= 5, l.length);
    vrai('la réception obligatoire depuis le 1er septembre 2026 (passée) — preuve « lu » — avec la question sur la plateforme', /1er septembre 2026 \(passée\) — Réception des factures électroniques/.test(tout) && /\[lu\]/.test(tout) && /plateforme désignée \? dis-le-moi/.test(tout), tout);
    vrai('l’émission le 1er septembre 2027 (« lu »), la fin de la tolérance le 31 décembre 2027 (« extrait, à confirmer »)', /1er septembre 2027 \(dans \d+ jours\) — Émission des factures électroniques/.test(tout) && /31 décembre 2027 \(dans \d+ jours\) — Fin de la tolérance sur la mention « art. 293 B »/.test(tout) && /\[extrait, à confirmer\]/.test(tout), tout);
    vrai('les e-reporting « à vérifier » sont dits comme tels', /E-reporting des encaissements.*\[à vérifier\]/s.test(tout), tout);
    vrai('le seuil de la franchise : 37 500 € et 41 250 €, et l’encaissé de l’année (3 142,75 €, sous le seuil)', /37 500 €/.test(tout) && /41 250 €/.test(tout) && /Encaissé chez Stripe depuis janvier : 3 142,75 € — sous le seuil de 37 500 €/.test(tout), tout);
    vrai('le régime inconnu : on demande, on ne suppose pas', /régime : inconnu \(dis-le-moi\)/.test(tout) && /Régime inconnu : dis-moi/.test(tout), tout);
    vrai('⛔ la fin du régime simplifié (1er janvier 2027) paraît quand le régime est inconnu', /1er janvier 2027.*Fin du régime simplifié/.test(tout));
    vrai('chaque ligne ≤ 300 signes', l.every(t => t.length <= 300), l.map(t => t.length).join(','));
    H.nettoyer();
    const H2 = equipe({ jouer: () => rep('Voilà.', [outil('calendrier_compta', {})]) });
    H2.stripe.panne = true;
    await H2.justin('margaux', 'le calendrier');
    const t2 = (await lignesSysteme(H2, 'margaux')).join('\n');
    vrai('Stripe muet : les dates restent (elles sont dans le code), le cumul dit « illisible »', /1er septembre 2027/.test(t2) && /Cumul de l’année : Stripe illisible, je ne donne aucun chiffre/.test(t2) && !/Encaissé chez Stripe depuis janvier/.test(t2), t2);
    H2.nettoyer();
  }

  console.log('\n7. regler_compta : ce que Justin a écrit, et rien d’autre');
  {
    const Z = async (texte, entree) => { const H = equipe({ jouer: () => rep('Noté.', [outil('regler_compta', entree)]) }); await H.justin('margaux', texte); const r = { H, reg: H.reglages(), l: await lignesSysteme(H, 'margaux') }; return r; };
    let r = await Z('Margaux, je suis en micro-entreprise', { regime: 'micro' });
    v('« je suis en micro-entreprise » + régime micro : noté dans un fichier JSON complet', [r.reg && r.reg.regime, r.l.some(t => /J’ai noté — régime : micro-entreprise/.test(t))], ['micro', true]);
    vrai('…sans fichier temporaire resté derrière', !fs.readdirSync(r.H.D).some(f => /compta-reglages.*\.tmp$/.test(f)));
    r.H.nettoyer();
    r = await Z('Bonjour Margaux, tu vas bien ?', { regime: 'micro' });
    v('⛔ un message qui ne parle pas de régime : la valeur de Claude est refusée, rien d’écrit', [r.reg, r.H.agents.lireJournal().filter(e => /outil regler_compta/.test(e.action)).map(e => e.resultat + ':' + e.detail)], [null, ['refuse:valeur_non_citee']]);
    r.H.nettoyer();
    r = await Z('je suis en micro-entreprise', { regime: 'reel' });
    v('⛔ « micro » dit, « réel » demandé : refusé', r.reg, null);
    r.H.nettoyer();
    r = await Z('je suis en franchise de TVA, article 293 B', { regime: 'franchise' });
    v('« franchise » dit : noté', r.reg && r.reg.regime, 'franchise');
    r.H.nettoyer();
    r = await Z('j’ai désigné une plateforme agréée pour recevoir les factures', { plateforme_reception: 'oui' });
    v('plateforme : « j’ai désigné une plateforme agréée » → oui', r.reg && r.reg.plateforme, 'oui');
    r.H.nettoyer();
    r = await Z('je n’ai pas encore désigné de plateforme', { plateforme_reception: 'oui' });
    v('⛔ « pas encore désigné » ne note pas « oui »', r.reg, null);
    r.H.nettoyer();
    r = await Z('je n’ai pas encore désigné de plateforme', { plateforme_reception: 'non' });
    v('…mais note « non »', r.reg && r.reg.plateforme, 'non');
    r.H.nettoyer();
    r = await Z('oui', { plateforme_reception: 'oui' });
    v('⛔ un « oui » seul, sans le sujet : refusé', r.reg, null);
    r.H.nettoyer();
    r = await Z('mon expert-comptable est Cabinet Durand, adresse durand@cabinet-banc.fr', { expert_comptable: { nom: 'Cabinet Durand', adresse: 'Durand@Cabinet-Banc.fr' } });
    v('expert-comptable : le nom et l’adresse figurent dans son message → noté (adresse en minuscules)', r.reg && r.reg.expert, { aucun: false, nom: 'Cabinet Durand', adresse: 'durand@cabinet-banc.fr' });
    vrai('…l’adresse de l’expert n’est écrite nulle part dans le fil ni le journal', !/durand@|Durand/.test(r.l.join(' ')) && !/durand@|Cabinet Durand/.test(JSON.stringify(r.H.agents.lireJournal())), r.l.join(' | '));
    r.H.nettoyer();
    r = await Z('mon expert-comptable est Cabinet Durand', { expert_comptable: { nom: 'Cabinet Durand', adresse: 'durand@cabinet-banc.fr' } });
    v('⛔ l’adresse n’est pas dans son message : refusé (Claude ne la devine pas)', r.reg, null);
    r.H.nettoyer();
    r = await Z('mon expert est durand@cabinet-banc.fr', { expert_comptable: { nom: 'Cabinet Durand', adresse: 'durand@cabinet-banc.fr' } });
    v('⛔ le nom n’est pas dans son message : refusé', r.reg, null);
    r.H.nettoyer();
    r = await Z('mon expert est pas-un-courriel', { expert_comptable: { nom: 'pas-un-courriel', adresse: 'pas-un-courriel' } });
    v('une adresse qui n’en est pas une : refusée', r.reg, null);
    r.H.nettoyer();
    r = await Z('je n’ai pas d’expert-comptable', { expert_comptable: { aucun: true } });
    v('« je n’ai pas d’expert-comptable » → aucun', r.reg && r.reg.expert, { aucun: true, nom: '', adresse: '' });
    r.H.nettoyer();
    r = await Z('parlons du calendrier', { expert_comptable: { aucun: true } });
    v('⛔ « aucun expert » sans que Justin l’ait dit : refusé', r.reg, null);
    r.H.nettoyer();
    r = await Z('je suis en micro, j’ai désigné une plateforme', { regime: 'micro', plateforme_reception: 'oui', exfiltrer: 'x' });
    v('⛔ une clé hors schéma : tout est refusé, même la valeur juste', r.reg, null);
    r.H.nettoyer();
    r = await Z('je suis en micro', {});
    v('rien à noter : refusé', r.reg, null);
    r.H.nettoyer();
    {
      /* TOUT OU RIEN : le régime est dit, la plateforme ne l'est pas — l'outil refuse TOUT, et le régime n'entre pas non plus dans la mémoire (un `sauve()` de rappel le ferait passer sur disque) */
      const R3 = equipe();
      const r3 = await R3.compta.outilsEquipe.executer('regler_compta', { regime: 'micro', plateforme_reception: 'oui' }, { de: 'justin', fil: 'margaux', texte: 'je suis en micro-entreprise' });
      await R3.compta.passer();   // écrit la question sur la plateforme, donc le registre (avec les marques)
      const reg3 = R3.reglages();
      v('⛔ un champ juste et un champ non dit : tout est refusé…', [r3.ok, r3.raison], [false, 'valeur_non_citee']);
      vrai('…et le champ juste n’est PAS resté en mémoire : le registre écrit ensuite par les rappels ne porte pas le régime', reg3 && reg3.regime === undefined && reg3.plateforme === undefined && Object.keys(reg3.rappels).length >= 1, JSON.stringify(reg3));
      R3.nettoyer();
    }
    r = await Z('je suis en micro, j’ai désigné une plateforme', { regime: 'micro', plateforme_reception: 'oui' });
    v('deux réglages d’un coup : les deux sont notés, une seule ligne de confirmation', [r.reg && r.reg.regime, r.reg && r.reg.plateforme, r.l.filter(t => /J’ai noté/.test(t)).length], ['micro', 'oui', 1]);
    r.H.nettoyer();
    /* seul Justin, seulement son fil */
    const H = equipe();
    const E = H.compta.outilsEquipe.executer;
    v('Victor veut noter un régime : refusé, aucun fichier', [(await E('regler_compta', { regime: 'micro' }, { de: 'victor', fil: 'margaux', texte: 'micro' })).raison, H.reglages()], ['pas_justin', null]);
    v('Justin dans un groupe : refusé, aucun fichier', [(await E('regler_compta', { regime: 'micro' }, { de: 'justin', fil: 'equipe', texte: 'micro' })).raison, H.reglages()], ['pas_fil_prive', null]);
    H.nettoyer();
    /* un fichier illisible n'est JAMAIS écrasé */
    const H2 = equipe({ avantCompta: D => fs.writeFileSync(path.join(D, 'compta-reglages.json'), '{ pas du json') });
    const r2 = await H2.compta.outilsEquipe.executer('regler_compta', { regime: 'micro' }, { de: 'justin', fil: 'margaux', texte: 'je suis en micro' });
    v('⛔ réglages illisibles : refusé, et le fichier est resté tel quel (jamais écrasé)', [r2.ok, r2.raison, fs.readFileSync(path.join(H2.D, 'compta-reglages.json'), 'utf8')], [false, 'registre_illisible', '{ pas du json']);
    await H2.compta.outilsEquipe.executer('calendrier_compta', {}, { de: 'justin', fil: 'margaux', texte: 'le calendrier' });
    vrai('…et le calendrier le dit au lieu de deviner un régime', (await lignesSysteme(H2, 'margaux')).some(t => /réglages de compta sont illisibles/.test(t)));
    v('…les rappels ne partent pas non plus', (await H2.compta.passer()).saute, 'registre_illisible');
    H2.nettoyer();
    /* le régime noté change le calendrier */
    const H3 = equipe({ jouer: () => rep('Voilà.', [outil('calendrier_compta', {})]) });
    await H3.compta.outilsEquipe.executer('regler_compta', { regime: 'micro', plateforme_reception: 'oui' }, { de: 'justin', fil: 'margaux', texte: 'je suis en micro et j’ai désigné la plateforme' });
    await H3.justin('margaux', 'le calendrier');
    const t3 = (await lignesSysteme(H3, 'margaux')).join('\n');
    vrai('en micro, plateforme désignée : « micro-entreprise », « désignée », l’Urssaf — et plus la fin du régime simplifié', /régime : micro-entreprise/.test(t3) && /plateforme de réception : désignée/.test(t3) && /Urssaf/.test(t3) && !/Fin du régime simplifié/.test(t3) && /✓ plateforme désignée/.test(t3), t3);
    H3.nettoyer();
  }

  console.log('\n8. Les rappels : J-30, J-7, la question sur la plateforme — une fois, la marque AVANT l’écriture');
  {
    const marquesVues = [];
    const H = equipe({ monter: { t0: Date.parse('2027-08-02T08:00:00Z') }, conversations: H0 => ({ systeme: H0.conv.systeme, parler: (...a) => { try { marquesVues.push(JSON.parse(fs.readFileSync(path.join(H0.D, 'compta-reglages.json'), 'utf8')).rappels); } catch (e) { marquesVues.push(null); } return H0.conv.parler(...a); } }) });
    await H.compta.outilsEquipe.executer('regler_compta', { regime: 'micro', plateforme_reception: 'oui' }, { de: 'justin', fil: 'margaux', texte: 'micro, plateforme désignée' });
    const r1 = await H.compta.passer();
    const dits = async () => (await H.messages('margaux')).filter(m => m.de === 'margaux');
    let d = await dits();
    v('2 août 2027 : UN rappel (l’émission des factures électroniques, dans 30 jours), niveau « important »', [r1.rappels, d.length, d[0] && d[0].niveau, d[0] && /dans 30 jours \(1er septembre 2027\) : Émission des factures électroniques et e-reporting/.test(d[0].texte)], [1, 1, 'important', true]);
    vrai('⛔ la marque était SUR DISQUE quand le message est parti', marquesVues.length === 1 && marquesVues[0] && marquesVues[0]['emission:j30'] > 0, JSON.stringify(marquesVues));
    const r2 = await H.compta.passer();
    v('⛔ un second passage le même jour : rien', [r2.rappels, (await dits()).length], [0, 1]);
    H.avance(10 * 86400000);   // 12 août : toujours J-20, rien de neuf
    v('dix jours plus tard (J-20) : rien de neuf', [(await H.compta.passer()).rappels], [0]);
    H.avance(15 * 86400000);   // 27 août : J-5
    const r3 = await H.compta.passer();
    d = await dits();
    v('J-5 : le rappel « 7 jours » part (une fois), le palier de 30 jours n’est pas redit', [r3.rappels, d.length, /dans 5 jours/.test(d[1] && d[1].texte)], [1, 2, true]);
    v('…et plus rien ensuite', [(await H.compta.passer()).rappels, (await dits()).length], [0, 2]);
    const reg = H.reglages();
    vrai('les marques sont au registre (j30 et j7 de l’émission)', reg.rappels['emission:j30'] > 0 && reg.rappels['emission:j7'] > 0, JSON.stringify(reg.rappels));
    vrai('⛔ le texte d’un rappel vient de la table : aucun chiffre de TeamOP, aucun nom', d.every(m => !/Dupont|3 142|487/.test(m.texte)));
    H.nettoyer();
  }
  {
    /* la question sur la plateforme : une fois, tant que Justin n'a pas dit « oui » ; jamais si c'est oui */
    const H = equipe();
    const r = await H.compta.passer();
    let d = (await H.messages('margaux')).filter(m => m.de === 'margaux');
    vrai('28 octobre 2026, plateforme inconnue : la question sur la plateforme part (la date est passée de deux mois)', r.rappels >= 1 && d.some(m => /En as-tu désigné une \?/.test(m.texte) && /1er septembre 2026/.test(m.texte)), JSON.stringify(d.map(m => m.texte.slice(0, 80))));
    const n = d.length;
    await H.compta.passer(); await H.compta.passer();
    v('⛔ …UNE fois', (await H.messages('margaux')).filter(m => m.de === 'margaux').length, n);
    /* le garde-fou du fil (« la même chose, deux fois ») aurait pu masquer un défaut de la MARQUE : on lit la marque elle-même (relevé de mutation M21 : une clé aléatoire passait inaperçue) */
    v('⛔ …et la marque est UNE seule, au registre', Object.keys((H.reglages() || { rappels: {} }).rappels).filter(k => /^question/.test(k)), ['question:plateforme']);
    H.nettoyer();
    const H2 = equipe();
    await H2.compta.outilsEquipe.executer('regler_compta', { plateforme_reception: 'oui' }, { de: 'justin', fil: 'margaux', texte: 'j’ai désigné une plateforme' });
    await H2.compta.passer();
    vrai('plateforme déjà désignée : aucune question', !(await H2.messages('margaux')).some(m => /En as-tu désigné une/.test(m.texte)));
    H2.nettoyer();
    /* un rappel de l'échéance du régime simplifié ne concerne que le réel (et l'inconnu) */
    const mk = async (regime) => { const Hx = equipe({ monter: { t0: Date.parse('2026-12-20T08:00:00Z') } }); await Hx.compta.outilsEquipe.executer('regler_compta', { regime, plateforme_reception: 'oui' }, { de: 'justin', fil: 'margaux', texte: regime === 'micro' ? 'micro, plateforme désignée' : 'au réel, plateforme désignée' }); await Hx.compta.passer(); const l = (await Hx.messages('margaux')).filter(m => m.de === 'margaux'); Hx.nettoyer(); return l.some(m => /régime simplifié/.test(m.texte)); };
    v('20 décembre 2026 (J-12) : la fin du régime simplifié est rappelée au réel, pas à la micro-entreprise', [await mk('reel'), await mk('micro')], [true, false]);
    /* un message qui ne peut pas être écrit : la marque est retirée, on réessaie */
    let refus = true;
    const Hr = equipe({ conversations: H0 => ({ systeme: H0.conv.systeme, parler: (...a) => (refus ? { ok: false, raison: 'trop_de_messages' } : H0.conv.parler(...a)) }) });
    const a1 = await Hr.compta.passer();
    vrai('écriture refusée : aucun rappel compté, aucune marque restée (sinon il ne reviendrait jamais)', a1.rappels === 0 && !Object.keys((Hr.reglages() || { rappels: {} }).rappels).length, JSON.stringify(Hr.reglages()));
    refus = false;
    const a2 = await Hr.compta.passer();
    vrai('…et il part au passage suivant', a2.rappels >= 1);
    Hr.nettoyer();
  }

  console.log('\n9. Les outils tels que le modèle les voit, et l’assembleur');
  {
    const H = equipe();
    const o = H.compta.outilsEquipe.outils;
    v('quatre outils, ces noms-là', o.map(t => t.name), ['point_compta', 'verifier_factures', 'calendrier_compta', 'regler_compta']);
    vrai('chaque schéma est FERMÉ (additionalProperties:false)', o.every(t => t.input_schema.type === 'object' && t.input_schema.additionalProperties === false));
    const periodes = o[0].input_schema.properties.periode.enum;
    v('point_compta : ce mois, le mois dernier et les douze mois (une liste fermée, qui suit la date)', [periodes.length, periodes[0], periodes[1], periodes[2], periodes[13]], [14, 'ce_mois', 'mois_dernier', '2026-10', '2025-11']);
    vrai('…aucun outil n’offre de montant, de numéro de facture ni de client en entrée', o.every(t => !JSON.stringify(t.input_schema).match(/montant|facture_id|client|numero|rembours/i)));
    vrai('…et la description dit au modèle de ne JAMAIS écrire un chiffre', /AUCUN/.test(o[0].description) && /sans chiffre/.test(o[0].description));
    const mise = { outils: [{ name: 'preparer_mise_en_demeure', description: 'x', input_schema: { type: 'object' } }], executer: async (n) => ({ ok: true, raison: 'mise:' + n }) };
    const A = AGENT.assembler(mise, H.compta.outilsEquipe);
    v('l’assembleur : la mise en demeure ET les quatre outils', A.outils.map(t => t.name), ['preparer_mise_en_demeure', 'point_compta', 'verifier_factures', 'calendrier_compta', 'regler_compta']);
    v('…chaque outil va chez son propriétaire', [(await A.executer('preparer_mise_en_demeure', {}, {})).raison, (await A.executer('point_compta', { periode: 'x' }, { de: 'justin', fil: 'margaux', texte: '' })).raison, (await A.executer('inconnu', {}, {})).raison], ['mise:preparer_mise_en_demeure', 'periode', 'outil_inconnu']);
    v('…sans le module de la compta, Margaux garde sa mise en demeure', AGENT.assembler(mise, null).outils.map(t => t.name), ['preparer_mise_en_demeure']);
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
