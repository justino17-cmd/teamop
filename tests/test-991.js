/* ⛔ CE QUE CE FICHIER GARDE — PERSO+ : LE FORFAIT D'UNE PERSONNE, MODULES SEULS (famille 2 de SERVEUR.md § 3.11, Perso+ du 4 octobre 2026).

   Décision de Justin : les réunions se vendent à une PERSONNE (sans espace d'entreprise), 5 € par mois — « comme ça on ne perd pas d'argent ». Ce fichier monte les VRAIS modules, sans HTTP
   (`test-992` joue les routes, `test-993` l'outil de configuration, `test-994` la page) :

     1. LA FORMULE : `formuleDe({ personne })` décide Perso / Perso+ / Pro / impayé pour une personne, UNE seule fonction ; payé = Stripe dit `active` ou `trialing`, rien d'autre (table des neuf statuts) ;
        un abonnement personnel EN RETARD n'organise PAS, tout de suite (pas de sursis de sept jours, contrairement à un espace) ; le meilleur des deux mondes gagne (un espace Pro, Perso+) ; Perso+ n'est
        jamais « pro » (aucune fonction d'entreprise) ; `peutOrganiser` est la seule définition de « Pro OU Perso+ » ; la bêta ouvre tout MAIS `reel: true` la regarde pour de vrai ;
     2. LA FACTURATION PERSONNELLE contre un faux Stripe : inerte sans clé ou sans tarif Perso+ (et le DIT) ; le tarif vient de la CONFIGURATION (liste blanche), le corps ne nomme qu'un rythme (`constructor`,
        `__proto__` ne sont pas des tarifs) ; ce que Stripe reçoit (un siège, une référence `opmsg-perso:`, la métadonnée `opmsg_personne` et JAMAIS `espace`, l'adresse seulement si elle est confirmée) ;
        une session ouverte est réutilisée ; un seul abonnement vivant (le lien du portail) ; qui a déjà Pro ne paie pas deux fois — sur le RÉEL, pas sur le drapeau de la bêta ;
     3. CE QUE STRIPE DIT EST LA SEULE SOURCE : une session d'une autre personne, un abonnement d'un autre produit, d'un espace, d'une autre personne, au tarif de Messages Pro — rien n'est reconnu ; un statut
        qui change change la formule ; une panne ne suspend personne ;
     4. LE COMPTE EFFACÉ ANNULE SON ABONNEMENT : la demande est NOTÉE dans la transaction de l'effacement, rejouée jusqu'à la confirmation de Stripe (panne, droit manquant, abonnement inconnu : elle ne se perd
        pas), jamais faite à l'aveugle (on ne résilie pas ce qu'on ne reconnaît pas), idempotente (rejeu après restauration), et /health n'en dit que l'ÂGE ;
     5. LA MIGRATION 10 : deux tables neuves, rien de modifié, rejouable, avec sa copie ; les TROIS listes de la sauvegarde les portent ;
     6. LE PLAFOND D'UNE RÉUNION : dix personnes au plus, organisateur compris, Perso+ comme Pro (Justin, 4 octobre 2026) — UNE constante, UN endroit (`plafondReunion`) où le supplément « Grandes réunions » la lèvera
        le jour où il existera (il n'est PAS activé : sans serveur de visio, dépasser dix est impossible), le stockage refuse la onzième personne (création, invitation, lien) en nommant le plafond, une personne
        déjà invitée n'est jamais refusée, et aucune route ne recopie le nombre.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter (les appels faits à Stripe, les sessions ouvertes). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { creerFormule, NOM_PERSO_PLUS, REUNION_PERSONNES_MAX } = require(path.join(T.SERVICE, 'formule.js'));
const { creerFacturation } = require(path.join(T.SERVICE, 'facturation.js'));
const { facturationConfig } = require(path.join(T.SERVICE, 'config.js'));

/* des valeurs de banc : des lettres hors de [0-9a-f] */
const CLE = ['rk', 'test', 'BancPersoPlusZzQq9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancProMensuelAa01', annuel: 'price_BancProAnnuelBb02' };
const PRIX_PP = { mensuel: 'price_BancPersoMensuelCc03', annuel: 'price_BancPersoAnnuelDd04' };
const JOUR = 86400000;
const tick = () => new Promise(r => setImmediate(r));

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  fake.poserTarif(PRIX_PP.mensuel, { unit_amount: 500, product: { id: 'prod_bancpp', object: 'product', name: 'OP MESSAGES Perso+' } });
  fake.poserTarif(PRIX_PP.annuel, { unit_amount: 5000, recurring: { interval: 'year', interval_count: 1 }, product: { id: 'prod_bancpp', object: 'product', name: 'OP MESSAGES Perso+' } });
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-991-'));
  const h = { t: 1790000000000 };
  const kek = crypto.randomBytes(32);
  let S = null;
  try {
    S = ouvrir({ chemin: path.join(bac, 'msg.db'), scelleur: creerScelleur(kek), horloge: () => h.t });
    const formuleProd = creerFormule({ stockage: S, config: { formule: { toutOuvert: false } } });
    const formuleBeta = creerFormule({ stockage: S, config: { formule: { toutOuvert: true } } });
    const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
    const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(bac, 'msg.db'));
    const poserPerso = (uid, statut, plus) => { S.abonnementPersoPoser(uid, Object.assign({ client: 'cus_bp' + uid.slice(2, 8) + 'x', abonnement: 'sub_bp' + uid.slice(2, 10) + 'x', statut, fin_periode: h.t + 20 * JOUR, annule: false }, plus || {}), { adopter: true }); };
    const proEspace = (uid, statut) => { const e = S.espaceCreer({ nom: 'E' + crypto.randomBytes(2).toString('hex'), proprio: uid }).id; S.abonnementPoser(e, { client: 'cus_bpe' + e.slice(2, 8), abonnement: 'sub_bpe' + e.slice(2, 10), statut: statut || 'active', places: 2, fin_periode: null, annule: false, impaye: statut === 'past_due' }, { adopter: true }); return e; };

    /* ═══ 1. LA FORMULE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('La formule d\'une personne : Perso, Perso+, Pro, impayé — UNE fonction, le meilleur des deux mondes');
    {
      const sans = pers('Sans');
      v('population : une personne sans rien est Perso, ne peut pas organiser, et lit pourquoi', [formuleProd.formuleDe({ personne: sans.id }).formule, formuleProd.peutOrganiser(sans.id)], ['perso', { ok: false, formule: 'perso', motif: 'aucun', raison: 'perso' }]);
      /* la table des statuts : payé = active ou trialing, RIEN d'autre */
      const table = [['active', 'perso_plus', true], ['trialing', 'perso_plus', true], ['past_due', 'impaye', false], ['unpaid', 'impaye', false], ['canceled', 'perso', false], ['incomplete', 'perso', false],
        ['incomplete_expired', 'perso', false], ['paused', 'perso', false], ['aucun', 'perso', false]];
      const lu = table.map(([st]) => { const p = pers('St'); poserPerso(p.id, st); const f = formuleProd.formuleDe({ personne: p.id }), o = formuleProd.peutOrganiser(p.id); return [st, f.formule, o.ok]; });
      v('⛔ la table des neuf statuts Stripe : seuls `active` et `trialing` donnent Perso+ ; `past_due` et `unpaid` sont un impayé qui n\'organise pas ; les autres ne donnent rien', lu, table);
      const imp = pers('Imp'); poserPerso(imp.id, 'past_due');
      v('⛔ un abonnement personnel en retard n\'a PAS de sursis (un espace en a sept jours) : impayé dès la première lecture, la raison dite est « impaye », l\'origine « perso_plus »', [formuleProd.formuleDe({ personne: imp.id }), formuleProd.peutOrganiser(imp.id)],
        [{ formule: 'impaye', motif: 'impaye', origine: 'perso_plus' }, { ok: false, formule: 'impaye', motif: 'impaye', raison: 'impaye' }]);
      const pp = pers('Plus'); poserPerso(pp.id, 'active');
      v('Perso+ payé : « perso_plus », il organise — et ce n\'est PAS « pro » (aucune fonction d\'entreprise : le garde PRO des espaces lit `=== \'pro\'`)', [formuleProd.formuleDe({ personne: pp.id }).formule, formuleProd.peutOrganiser(pp.id).ok, formuleProd.formuleDe({ personne: pp.id }).formule === 'pro'], ['perso_plus', true, false]);
      /* le meilleur des deux mondes */
      const a = pers('A'); proEspace(a.id, 'active'); poserPerso(a.id, 'past_due');
      v('un espace Pro PAYÉ et un Perso+ en retard : Pro gagne, la personne organise (rien n\'est retiré à qui paie ailleurs)', [formuleProd.formuleDe({ personne: a.id }).formule, formuleProd.peutOrganiser(a.id).ok], ['pro', true]);
      const b = pers('B'); const eb = proEspace(b.id, 'past_due'); { const d = raw(); try { d.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(h.t - 9 * JOUR, h.t, eb); } finally { d.close(); } } poserPerso(b.id, 'active');
      v('un espace Pro IMPAYÉ depuis neuf jours et un Perso+ payé : Perso+ gagne (impayé < Perso+) — la personne organise', [formuleProd.formuleDe({ personne: b.id }).formule, formuleProd.peutOrganiser(b.id).ok], ['perso_plus', true]);
      const c = pers('C'); const ec = proEspace(c.id, 'past_due'); { const d = raw(); try { d.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(h.t - 3 * JOUR, h.t, ec); } finally { d.close(); } }
      v('un espace Pro en retard depuis TROIS jours (sursis) : encore Pro — le sursis de l\'espace est inchangé', [formuleProd.formuleDe({ personne: c.id }).formule, formuleProd.peutOrganiser(c.id).ok], ['pro', true]);
      const d2 = pers('D'); const ed = proEspace(d2.id, 'past_due'); { const d = raw(); try { d.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(h.t - 9 * JOUR, h.t, ed); } finally { d.close(); } }
      v('un espace impayé depuis neuf jours et RIEN d\'autre : impayé, il n\'organise pas — et la raison dite est « perso » (c\'est le forfait PERSONNEL qui manque, pas celui de l\'espace)', [formuleProd.formuleDe({ personne: d2.id }).formule, formuleProd.peutOrganiser(d2.id)], ['impaye', { ok: false, formule: 'impaye', motif: 'impaye', raison: 'perso' }]);
      /* la bêta ouvre tout, mais le RÉEL se regarde */
      v('⛔ la bêta ouvre tout (pro, organise) pour qui n\'a rien, MAIS `reel: true` regarde la vraie formule — c\'est ce qui laisse essayer le paiement sur la bêta', [formuleBeta.formuleDe({ personne: sans.id }).formule, formuleBeta.peutOrganiser(sans.id).ok, formuleBeta.formuleDe({ personne: sans.id, reel: true }).formule], ['pro', true, 'perso']);
      let err = null; try { formuleProd.formuleDe({}); } catch (e) { err = e.message; }
      v('une formule sans espace ni personne est une erreur de code, jamais un « perso » silencieux', err, 'formuleDe : un espace ou une personne');
      vrai('le libellé du forfait est écrit à UN endroit (`NOM_PERSO_PLUS`), nommé et non vide', typeof NOM_PERSO_PLUS === 'string' && NOM_PERSO_PLUS.length > 2);
    }

    /* ═══ 2. LA FACTURATION PERSONNELLE, CONTRE UN FAUX STRIPE ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa facturation personnelle : inerte tant qu\'elle n\'est pas branchée, le tarif vient de la configuration, un seul siège, un seul abonnement');
    const monter = (formule, plus, horloge) => {
      const cfg = facturationConfig({ facturation: Object.assign({ cle: CLE, prix: PRIX_PRO, perso: { prix: PRIX_PP }, relectureMs: 600000, timeoutMs: 3000 }, plus || {}) }, { OPMSG_TEST_STRIPE: fake.hote }, 'beta');
      const journal = [];
      return { F: creerFacturation({ stockage: S, config: { facturation: cfg }, formule, journaliser: (e, c) => journal.push([e, c]), horloge: horloge || (() => h.t) }), cfg, journal };
    };
    {
      /* — inerte — */
      const sansCle = monter(formuleProd, { cle: undefined }), sansTarif = monter(formuleProd, { perso: { prix: {} } });
      const x = pers('Inerte');
      let e1 = null, e2 = null;
      try { await sansCle.F.perso.paiement({ personne: x.id, cycle: 'mensuel', origine: 'http://x.test' }); } catch (e) { e1 = e.code; }
      try { await sansTarif.F.perso.paiement({ personne: x.id, cycle: 'mensuel', origine: 'http://x.test' }); } catch (e) { e2 = e.code; }
      v('⛔ sans clé Stripe, ou avec une clé mais SANS tarif Perso+ : le forfait est INERTE et le dit (`abonnement_non_ouvert`), même quand Messages Pro est ouvert', [e1, e2, sansCle.F.perso.ouvert(), sansTarif.F.perso.ouvert(), sansTarif.F.ouvert()], ['abonnement_non_ouvert', 'abonnement_non_ouvert', false, false, true]);
      const ei = sansTarif.F.perso.etat(x.id);
      v('… et l\'état le dit sans promettre : pas d\'offre, pas de rythme par défaut', [ei.ouvert, ei.offres, ei.defaut, ei.nom, ei.organiser], [false, [], null, NOM_PERSO_PLUS, false]);
      v('⛔ rien n\'est parti chez Stripe (population : le faux Stripe a noté ses appels)', [fake.appels.length], [0]);
      /* — la configuration — */
      const f = (bloc) => { try { return facturationConfig({ facturation: Object.assign({ cle: CLE, prix: PRIX_PRO }, bloc) }, {}, 'beta'); } catch (e) { return e.message; } };
      v('la configuration : 5 € et 50 € par défaut, aucun tarif Perso+ sans bloc', [f({}).perso.affichage, f({}).perso.prix], [{ mensuel: 5, annuel: 50 }, {}]);
      v('un tarif Perso+ valide est gardé tel quel', f({ perso: { prix: PRIX_PP } }).perso.prix, PRIX_PP);
      const mauvais = [{ prix: { mensuel: 'cher' } }, { prix: { hebdo: PRIX_PP.mensuel } }, { prix: { mensuel: PRIX_PRO.mensuel } }, { prix: { mensuel: PRIX_PP.mensuel, annuel: PRIX_PP.mensuel } }, { cle: 1 }, { prix: [PRIX_PP.mensuel] }, { affichage: { mensuel: -5 } }];
      v('⛔ une configuration absurde refuse le démarrage : un tarif mal formé, un rythme inconnu, un tarif DÉJÀ vendu par Messages Pro (un tarif ne sert qu\'à un forfait), deux rythmes sur le même tarif, une clé inconnue, un prix négatif',
        mauvais.map(m => typeof f({ perso: m }) === 'string'), mauvais.map(() => true));
      vrai('… et aucun message ne CITE un identifiant de tarif refusé', mauvais.every(m => typeof f({ perso: m }) !== 'string' || !/price_Banc/.test(f({ perso: m }))));
    }
    const { F, journal } = monter(formuleProd);
    {
      const x = pers('Payeur');
      const etat0 = F.perso.etat(x.id);
      v('l\'état d\'une personne qui n\'a rien : ouvert, mode test, deux offres (5 € par mois, 50 € par an), mensuel par défaut — ni identifiant de tarif, ni de client', [etat0.ouvert, etat0.mode, etat0.offres, etat0.defaut, etat0.formule, etat0.organiser, /price_|cus_|sub_/.test(JSON.stringify(etat0))],
        [true, 'test', [{ id: 'mensuel', par: 'mois', euros: 5 }, { id: 'annuel', par: 'an', euros: 50 }], 'mensuel', 'perso', false, false]);
      /* — le corps ne nomme qu'un rythme — */
      const avant = fake.appels.length;
      const faux = [];
      for (const cyc of ['constructor', '__proto__', 'hasOwnProperty', 'weekly', 42, null, { mensuel: 1 }, ['mensuel']]) { try { await F.perso.paiement({ personne: x.id, cycle: cyc, origine: 'http://x.test' }); faux.push('accepté'); } catch (e) { faux.push(e.code); } }
      v('⛔ le corps ne choisit pas un tarif : « constructor », « __proto__ », un rythme inconnu, un nombre, un objet — `offre_inconnue`, et RIEN n\'est parti chez Stripe', [faux, fake.appels.length - avant], [Array(8).fill('offre_inconnue'), 0]);
      /* — ce que Stripe reçoit — */
      const r1 = await F.perso.paiement({ personne: x.id, cycle: 'annuel', origine: 'http://x.test' });
      const poste = fake.dernier('POST', /\/v1\/checkout\/sessions$/), paire = (k) => (poste.paires.find(p => p[0] === k) || [])[1];
      vrai('population : une session a été ouverte chez Stripe, avec une adresse https', !!poste && /^https:\/\//.test(r1.url));
      v('le tarif ANNUEL est celui de la configuration, UN siège, la référence et la métadonnée désignent la personne', [paire('line_items[0][price]'), paire('line_items[0][quantity]'), paire('client_reference_id'), paire('metadata[opmsg_personne]'), paire('subscription_data[metadata][opmsg_personne]'), paire('subscription_data[metadata][produit]')],
        [PRIX_PP.annuel, '1', 'opmsg-perso:' + x.id, x.id, x.id, 'opmsg']);
      v('⛔ JAMAIS la métadonnée `espace` (celle qu\'OP GESTION lit pour rattacher un abonnement à une entreprise), ni `opmsg_espace`, ni un tarif de Messages Pro', [poste.paires.filter(p => /(^|\[)(opmsg_)?espace\]?$/.test(p[0])).length, poste.paires.some(p => Object.values(PRIX_PRO).includes(p[1]))], [0, false]);
      v('les adresses de retour disent « personne » (`p=1`), jamais un espace', [paire('success_url'), paire('cancel_url')], ['http://x.test/?abo=retour&p=1#reglages', 'http://x.test/?abo=annule&p=1#reglages']);
      v('⛔ sans adresse confirmée (un compte par numéro n\'en a pas), aucune `customer_email` n\'est envoyée : Checkout la demande lui-même', paire('customer_email'), undefined);
      const r2 = await F.perso.paiement({ personne: x.id, cycle: 'annuel', origine: 'http://x.test' });
      v('une session encore OUVERTE est réutilisée (même adresse, `reprise`), pas doublée', [r2.url === r1.url, r2.reprise, fake.sessionsOuvertes().length], [true, true, 1]);
      const y = pers('Adresse');
      await F.perso.paiement({ personne: y.id, cycle: 'mensuel', origine: 'http://x.test', adresse: 'yann@example.test' });
      const poste2 = fake.dernier('POST', /\/v1\/checkout\/sessions$/);
      v('avec une adresse CONFIRMÉE, elle part ; le tarif mensuel est celui du mensuel', [(poste2.paires.find(p => p[0] === 'customer_email') || [])[1], (poste2.paires.find(p => p[0] === 'line_items[0][price]') || [])[1]], ['yann@example.test', PRIX_PP.mensuel]);
      /* — payer, relire — */
      fake.payer(fake.sessionsOuvertes().find(s => s.client_reference_id === 'opmsg-perso:' + x.id).id);
      const apres = await F.perso.relire(x.id);
      v('⛔ payée chez Stripe, puis RELUE : la session devient l\'abonnement, la personne est Perso+ et organise (l\'état vient de Stripe, jamais d\'une requête)', [apres.formule, apres.organiser, apres.abonnement && apres.abonnement.statut, apres.paiement_en_attente, apres.impaye], ['perso_plus', true, 'active', false, false]);
      v('… et la ligne rangée est celle de Stripe (client, abonnement `sub_`, échéance dans la période)', [S.abonnementPersoLire(x.id).abonnement.startsWith('sub_'), S.abonnementPersoLire(x.id).client.startsWith('cus_'), S.abonnementPersoLire(x.id).fin_periode > h.t], [true, true, true]);
      /* — un seul abonnement vivant — */
      let doublon = null; try { await F.perso.paiement({ personne: x.id, cycle: 'mensuel', origine: 'http://x.test' }); } catch (e) { doublon = e; }
      vrai('⛔ un abonnement qui vit : `abonnement_existant`, AVEC le lien du portail (jamais un second prélèvement)', doublon && doublon.code === 'abonnement_existant' && /^https:\/\/billing\.stripe\.test\//.test(doublon.portail));
      const por = await F.perso.portail({ personne: x.id, origine: 'http://x.test' });
      v('le portail : un client Stripe, une adresse de retour qui dit « personne »', [/^https:\/\/billing/.test(por.url), (fake.dernier('POST', /billing_portal/).paires.find(p => p[0] === 'return_url') || [])[1]], [true, 'http://x.test/?abo=portail&p=1#reglages']);
      let sansAbo = null; try { await F.perso.portail({ personne: pers('Rien').id, origine: 'http://x.test' }); } catch (e) { sansAbo = e.code; }
      v('le portail sans paiement fait avant : `pas_d_abonnement`', sansAbo, 'pas_d_abonnement');
      v('l\'état ne montre ni identifiant de tarif, de client ni d\'abonnement', /price_|cus_|sub_/.test(JSON.stringify(F.perso.etat(x.id))), false);

      /* — qui a déjà Pro ne paie pas deux fois — */
      const pro = pers('DejaPro'); proEspace(pro.id, 'active');
      const avantPro = fake.appels.length; let incl = null; try { await F.perso.paiement({ personne: pro.id, cycle: 'mensuel', origine: 'http://x.test' }); } catch (e) { incl = e.code; }
      v('⛔ un membre d\'un espace Pro PAYÉ ne paie pas Perso+ (un second abonnement serait un prélèvement pour rien) : `formule_deja_incluse`, rien n\'est parti chez Stripe', [incl, fake.appels.length - avantPro], ['formule_deja_incluse', 0]);
      v('… et l\'état le sait (`inclus_par_pro`) : la page ne lui montrera pas de prix', F.perso.etat(pro.id).inclus_par_pro, true);
      const betaFact = monter(formuleBeta);
      const bt = pers('BetaEssai');
      const rb = await betaFact.F.perso.paiement({ personne: bt.id, cycle: 'mensuel', origine: 'http://x.test' });
      v('⛔ sur la BÊTA (tout est « pro ») le paiement s\'ESSAIE quand même : on juge le RÉEL, pas le drapeau — sinon il ne s\'éprouverait jamais', [/^https:\/\//.test(rb.url), betaFact.F.perso.etat(bt.id).formule, betaFact.F.perso.etat(bt.id).organiser, betaFact.F.perso.etat(bt.id).tout_ouvert], [true, 'pro', true, true]);
    }

    /* ═══ 3. CE QUE STRIPE DIT EST LA SEULE SOURCE ════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nCe que Stripe dit : une session ou un abonnement qui n\'est pas le sien ne donne rien, un statut qui change change la formule, une panne ne suspend personne');
    {
      const nouv = async (nom, plus) => { const p = pers(nom); await F.perso.paiement({ personne: p.id, cycle: 'mensuel', origine: 'http://x.test' }); const s = fake.derniereSession(); return { p, s, payer: (o) => fake.payer(s.id, o) }; };
      /* une session qui cite une AUTRE personne */
      const a = await nouv('Autre'); a.s.client_reference_id = 'opmsg-perso:p_' + 'a'.repeat(32); a.payer();
      const ra = await F.perso.relire(a.p.id);
      v('⛔ une session payée dont la référence cite une AUTRE personne n\'est pas adoptée : la personne reste Perso, la session est oubliée', [ra.formule, ra.organiser, S.abonnementPersoLire(a.p.id).session, journal.some(j => j[0] === 'facturation' && j[1].motif === 'session_incoherente')], ['perso', false, null, true]);
      /* un abonnement d'un autre produit, d'un espace, d'une autre personne, au tarif de Messages Pro */
      const cas = [['sans la métadonnée de produit', (sb) => { delete sb.metadata.produit; }], ['avec la métadonnée d\'un ESPACE', (sb) => { sb.metadata = { produit: 'opmsg', opmsg_espace: 'e_' + 'b'.repeat(32) }; }],
        ['désignant une AUTRE personne', (sb) => { sb.metadata.opmsg_personne = 'p_' + 'c'.repeat(32); }], ['au tarif de MESSAGES PRO', (sb) => { sb.items.data[0].price.id = PRIX_PRO.mensuel; }]];
      const issues = [];
      for (const [nom, mut] of cas) {
        const z = await nouv('Cas'); const sb = z.payer(); mut(sb);
        const r = await F.perso.relire(z.p.id);
        issues.push([nom, r.formule, r.organiser]);
      }
      v('⛔ un abonnement qui n\'est pas le sien (sans produit, d\'un espace, d\'une autre personne, au tarif de Messages Pro) ne donne PAS Perso+ — et l\'espace-ci ne gagne rien', issues, cas.map(c => [c[0], 'perso', false]));
      /* un statut qui change */
      const b = await nouv('Statut'); const sb = b.payer();
      await F.perso.relire(b.p.id);
      const suite = [];
      for (const st of ['past_due', 'active', 'unpaid', 'active', 'canceled']) { fake.statut(sb.id, st); const r = await F.perso.relire(b.p.id); suite.push([st, r.formule, r.organiser, r.impaye]); }
      v('⛔ chaque lecture de Stripe REFAIT la formule : en retard → impayé (n\'organise pas), réglé → Perso+, impayé, réglé, résilié → Perso', suite,
        [['past_due', 'impaye', false, true], ['active', 'perso_plus', true, false], ['unpaid', 'impaye', false, true], ['active', 'perso_plus', true, false], ['canceled', 'perso', false, false]]);
      /* une panne ne suspend personne */
      const c = await nouv('Panne'); c.payer(); await F.perso.relire(c.p.id);
      fake.mode = 'muet'; let pe = null; try { await F.perso.relire(c.p.id); } catch (e) { pe = e.code; } fake.mode = 'normal';
      v('⛔ Stripe muet (500) : la lecture échoue (`stripe_panne`), la personne GARDE Perso+ — rien ne se décide sur une lecture ratée', [pe, F.perso.etat(c.p.id).formule, F.perso.etat(c.p.id).organiser, F.perso.etat(c.p.id).stripe_muet], ['stripe_panne', 'perso_plus', true, true]);
      await F.perso.relire(c.p.id);
      v('… et la panne passée, l\'état n\'est plus muet', F.perso.etat(c.p.id).stripe_muet, false);
    }

    /* ═══ 4. UN COMPTE EFFACÉ ANNULE SON ABONNEMENT ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn compte effacé annule son abonnement : noté dans la transaction, rejoué jusqu\'à la confirmation de Stripe, jamais fait à l\'aveugle');
    {
      const abonne = async (nom) => { const p = pers(nom); await F.perso.paiement({ personne: p.id, cycle: 'mensuel', origine: 'http://x.test' }); const sb = fake.payer(fake.derniereSession().id); await F.perso.relire(p.id); return { p, sb }; };
      const effacer = (uid, opts) => { S.suppressionProgrammer(uid, h.t + 14 * JOUR); h.t += 15 * JOUR; return S.compteEffacer(uid, opts); };
      const resil = () => fake.resiliations.slice();
      /* — le cas ordinaire — */
      const e1 = await abonne('Efface');
      fake.vider();
      const r1 = effacer(e1.p.id);
      v('⛔ l\'effacement NOTE la demande dans sa transaction : une ligne `abonnement_a_annuler`, la ligne `abonnement_perso` part avec la personne', [r1.effacee, S.annulationsDues().map(x => x.abonnement), S.abonnementPersoLire(e1.p.id)], [true, [e1.sb.id], null]);
      v('… et RIEN n\'est encore parti chez Stripe (l\'effacement n\'attend jamais le réseau)', fake.appels.length, 0);
      const t1 = await F.perso.annulationsTraiter();
      v('la file se traite : Stripe reçoit UN DELETE de CET abonnement, la file se vide, plus d\'attente', [t1, resil(), S.annulationsDues().length, F.perso.attenteMin(h.t)], [{ faites: 1, ratees: 0 }, [e1.sb.id], 0, 0]);
      const t1b = await F.perso.annulationsTraiter();
      v('repassée, elle ne refait rien (idempotente)', [t1b, resil().length], [{ faites: 0, ratees: 0 }, 1]);
      /* — Stripe muet au moment de l'effacement — */
      const e2 = await abonne('Muet');
      effacer(e2.p.id);
      fake.mode = 'muet';
      const t2 = await F.perso.annulationsTraiter();
      fake.mode = 'normal';
      const file2 = S.annulationsDues();
      v('⛔ Stripe muet : l\'échec se NOTE (`essais`, `dernier`), la demande RESTE — elle ne se perd pas', [t2.faites, t2.ratees, file2.map(x => [x.abonnement, x.essais, x.dernier !== null])], [0, 1, [[e2.sb.id, 1, true]]]);
      h.t += 3 * 3600000;
      v('… et /health en dit l\'ÂGE en minutes (180), jamais un nombre ni un identifiant', [F.perso.attenteMin(h.t), F.annulationAttenteMin()], [180, 180]);
      const t2b = await F.perso.annulationsTraiter();
      v('Stripe revenu, la file se vide et l\'attente retombe à zéro', [t2b, S.annulationsDues().length, F.perso.attenteMin(h.t), resil().includes(e2.sb.id)], [{ faites: 1, ratees: 0 }, 0, 0, true]);
      /* — la clé n'a pas le droit de résilier — */
      const e3 = await abonne('SansDroit');
      effacer(e3.p.id);
      fake.sansDroits.add('resilier');
      const t3 = await F.perso.annulationsTraiter();
      v('⛔ une clé SANS le droit de résilier (403) : la demande reste, comptée (`essais` 1), jamais « faite » — et rien n\'est résilié', [t3.faites, t3.ratees, S.annulationsDues().map(x => x.essais), resil().includes(e3.sb.id)], [0, 1, [1], false]);
      fake.sansDroits.delete('resilier');
      await F.perso.annulationsTraiter();
      v('… le droit rendu, la demande aboutit', [S.annulationsDues().length, resil().includes(e3.sb.id)], [0, true]);
      /* — ce qu'on ne reconnaît pas ne se résilie pas — */
      const e4 = await abonne('Etranger');
      fake.abonnements.get(e4.sb.id).metadata = { produit: 'opgestion' };
      effacer(e4.p.id);
      const avantEtr = resil().length;
      const t4 = await F.perso.annulationsTraiter();
      v('⛔ un abonnement qu\'on ne reconnaît PAS comme le nôtre (autre produit) n\'est JAMAIS résilié depuis ce service : la demande reste, et c\'est l\'alarme (l\'âge) qui crie', [t4.faites, t4.ratees, resil().length - avantEtr, S.annulationsDues().map(x => x.abonnement), journal.some(j => j[1] && j[1].motif === 'annulation_non_reconnue')], [0, 1, 0, [e4.sb.id], true]);
      S.annulationFaite(e4.sb.id);
      /* — déjà résilié, ou disparu — */
      const e5 = await abonne('DejaResilie'); fake.statut(e5.sb.id, 'canceled');
      effacer(e5.p.id);
      const avant5 = fake.compter('DELETE', /subscriptions/);
      await F.perso.annulationsTraiter();
      v('un abonnement DÉJÀ résilié chez Stripe : la demande est close sans nouveau DELETE', [S.annulationsDues().length, fake.compter('DELETE', /subscriptions/) - avant5], [0, 0]);
      const e6 = await abonne('Disparu'); fake.oublier(e6.sb.id);
      effacer(e6.p.id);
      await F.perso.annulationsTraiter();
      v('un abonnement que Stripe ne connaît plus ET dont le client existe sans lui : absence CONFIRMÉE, la demande est close', S.annulationsDues().length, 0);
      const e7 = await abonne('AutreCompte'); fake.oublier(e7.sb.id); fake.oublierClient(e7.sb.customer);
      effacer(e7.p.id);
      const t7 = await F.perso.annulationsTraiter();
      v('⛔ la clé d\'un AUTRE compte (l\'abonnement ET son client répondent 404) : l\'absence n\'est PAS confirmée, la demande reste — on ne dit pas « résilié » à un compte qui ne voit rien', [t7.faites, t7.ratees, S.annulationsDues().length], [0, 1, 1]);
      S.annulationFaite(e7.sb.id);
      /* — rejeu après une restauration — */
      const e8 = await abonne('Restaure');
      effacer(e8.p.id);
      await F.perso.annulationsTraiter();
      const ap = S.abonnementPersoSession; // (référence gardée pour la lecture ci-dessous)
      /* la copie restaurée date d'AVANT l'effacement : la personne y est encore active, et son abonnement aussi */
      { const d = raw(); try { d.prepare(`UPDATE personne SET etat = 'actif' WHERE id = ?`).run(e8.p.id); d.prepare(`INSERT INTO abonnement_perso(personne, client, abonnement, statut, relu_le, cree) VALUES(?, ?, ?, 'active', ?, ?)`).run(e8.p.id, 'cus_bprest', e8.sb.id, h.t, h.t); } finally { d.close(); } }
      S.compteEffacer(e8.p.id, { rejeu: true });
      v('⛔ rejeu d\'un effacement sur une copie restaurée qui porte encore l\'abonnement : la demande est NOTÉE de nouveau (Stripe répondra « déjà résilié »), la ligne repart', [S.annulationsDues().map(x => x.abonnement), S.abonnementPersoLire(e8.p.id)], [[e8.sb.id], null]);
      const avant8 = fake.compter('DELETE', /subscriptions/);
      await F.perso.annulationsTraiter();
      v('… et le rejeu est idempotent côté Stripe : l\'abonnement est déjà résilié, aucun second DELETE', [S.annulationsDues().length, fake.compter('DELETE', /subscriptions/) - avant8, ap === S.abonnementPersoSession], [0, 0, true]);
      /* — un paiement réglé APRÈS l'effacement — */
      const tard = pers('Tardif');
      await F.perso.paiement({ personne: tard.id, cycle: 'mensuel', origine: 'http://x.test' });
      const sessionT = fake.derniereSession();
      effacer(tard.id);
      v('une session de paiement NON RÉSOLUE reste sur la ligne d\'un compte effacé (la relecture la résoudra) — rien à annuler encore', [S.abonnementPersoLire(tard.id).session !== null, S.annulationsDues().length, S.abonnementsPersoARelire(10).includes(tard.id)], [true, 0, true]);
      const sbT = fake.payer(sessionT.id);
      await F.relireTous();
      v('⛔ payée APRÈS l\'effacement, elle est reconnue par la passe de relecture et RÉSILIÉE aussitôt — jamais un abonnement vivant pour un compte qui n\'existe plus', [resil().includes(sbT.id), S.annulationsDues().length, S.abonnementPersoLire(tard.id)], [true, 0, null]);
      /* — sans clé, la file attend et le dit — */
      const sansClef = monter(formuleProd, { cle: undefined });
      const e9 = await abonne('SansCle');
      effacer(e9.p.id);
      const t9 = await sansClef.F.perso.annulationsTraiter();
      v('sans clé Stripe, la file ne fait rien (inerte) mais NE S\'EFFACE PAS : l\'âge monte — c\'est ce que /health publie, que la surveillance lit', [t9.inerte, S.annulationsDues().length, (h.t += 2 * 3600000, sansClef.F.perso.attenteMin(h.t))], [true, 1, 120]);
      S.annulationFaite(e9.sb.id);
    }

    /* ═══ 5. LA MIGRATION 10 ET LES TROIS LISTES ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa migration 10 : deux tables neuves, rien de modifié, rejouable, avec sa copie ; les trois listes de la sauvegarde les portent');
    {
      const m10 = MIGRATIONS.filter(m => m.v === 10);
      v('population : UNE migration 10, après la 9', [m10.length, MIGRATIONS.filter(m => m.v < 10).length], [1, 9]);
      const sqls = m10[0].sql;
      v('⛔ deux tables, un index, la version — et RIEN d\'autre : aucun ALTER, aucun DROP, aucune reconstruction (un retour en arrière du déploiement reste possible)', [sqls.filter(s => /^CREATE TABLE IF NOT EXISTS /.test(s)).length, sqls.filter(s => /^CREATE UNIQUE INDEX IF NOT EXISTS /.test(s)).length, sqls.filter(s => /^PRAGMA user_version = 10$/.test(s)).length, sqls.length, sqls.some(s => /\b(ALTER|DROP|RENAME|INSERT INTO|DELETE FROM|UPDATE )\b/i.test(s)), !!m10[0].sansFk], [2, 1, 1, 4, false, false]);
      const mig = pers('Mig'); poserPerso(mig.id, 'active');
      const d = raw();
      try {
        const tables = d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'abonnement%' ORDER BY name`).all().map(r => r.name);
        v('les deux tables existent à côté de `abonnement` (celui des espaces, inchangé)', tables, ['abonnement', 'abonnement_a_annuler', 'abonnement_perso']);
        v('l\'abonnement d\'un espace n\'a pas bougé d\'une colonne (la même forme qu\'avant : aucune colonne neuve)', d.prepare(`SELECT name FROM pragma_table_info('abonnement') ORDER BY cid`).all().map(r => r.name),
          ['espace', 'client', 'abonnement', 'session', 'session_le', 'statut', 'places', 'fin_periode', 'annule', 'impaye_depuis', 'relu_le', 'cree']);
        d.exec('PRAGMA user_version = 9');
      } finally { d.close(); }
      S.fermer();
      S = ouvrir({ chemin: path.join(bac, 'msg.db'), scelleur: creerScelleur(kek), horloge: () => h.t });
      v('⛔ la migration REJOUÉE sur une base qui a déjà ses tables (le compteur remis à 9) : pas d\'échec, schéma 10, l\'abonnement personnel est intact', [S.schema(), S.abonnementPersoLire(mig.id).statut], [10, 'active']);
      vrai('une copie « avant-v10 » est gardée avant de migrer une base qui a vécu', fs.existsSync(path.join(bac, 'msg.db.avant-v10')));
      const k = ouvrir.copie.controlerFichier(path.join(bac, 'msg.db'));
      const nonVides = Object.keys(S.sonde().nonVides), lignes = Object.keys(k.lignes);
      v('⛔ les TROIS listes (la sonde de la base vivante, le comptage d\'une copie, `TABLES_COMPTEES`) portent les deux tables neuves — en oublier une a déjà fait échouer chaque sauvegarde', [['abonnement_perso', 'abonnement_a_annuler'].map(t => [nonVides.includes(t), lignes.includes(t), ouvrir.copie.TABLES_COMPTEES.includes(t)])], [[[true, true, true], [true, true, true]]]);
      v('… et ces trois listes disent les MÊMES tables', [nonVides.slice().sort().join() === lignes.slice().sort().join(), nonVides.slice().sort().join() === ouvrir.copie.TABLES_COMPTEES.slice().sort().join()], [true, true]);
    }

    /* ═══ 6. LE PLAFOND D'UNE RÉUNION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus DIX personnes, organisateur compris : une constante, un endroit pour le supplément, le stockage refuse la onzième, aucune route ne recopie le nombre');
    {
      const formuleP = creerFormule({ stockage: S, config: { formule: { toutOuvert: false } } });
      const quidam = pers('Quidam'), plus = pers('PlusP'), proP = pers('ProP');
      S.abonnementPersoPoser(plus.id, { client: 'cus_bpplafx1', abonnement: 'sub_bpplafx1', statut: 'active', fin_periode: h.t + JOUR, annule: false }, { adopter: true });
      { const e = S.espaceCreer({ nom: 'Plafond', proprio: proP.id }).id; S.abonnementPoser(e, { client: 'cus_bpplafx2', abonnement: 'sub_bpplafx2', statut: 'active', places: 3, fin_periode: null, annule: false, impaye: false }, { adopter: true }); }
      v('population : le plafond est le MÊME pour une personne Perso, Perso+ et Pro — dix, organisateur compris — et c\'est la constante exportée', [formuleP.plafondReunion(quidam.id), formuleP.plafondReunion(plus.id), formuleP.plafondReunion(proP.id), REUNION_PERSONNES_MAX], [10, 10, 10, 10]);
      v('⛔ l\'endroit du supplément « Grandes réunions » existe (`plafondReunion(organisateur)`) et n\'est PAS activé : une entreprise Pro n\'a pas plus de dix (sans serveur de visio, dépasser dix est impossible)', [typeof formuleP.plafondReunion, formuleP.plafondReunion.length, formuleP.plafondReunion(proP.id) > REUNION_PERSONNES_MAX], ['function', 1, false]);
      /* — le stockage — */
      const hote = pers('HoteP'), foule = []; for (let i = 0; i < 12; i++) foule.push(pers('Foule').id);
      const j0 = h.t + 3 * JOUR;
      const creer = (invites, plafond) => S.reunionCreer({ hote: hote.id, titre: 'Plafond ' + invites.length, lieu: '', debut: j0, fin: j0 + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [15], invites, prochain: j0, finSerie: j0 + 3600000, plafond });
      const compte = (sql, ...a) => { const d = raw(); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
      const nReunions = () => compte('SELECT COUNT(*) AS n FROM reunion');
      const nPersonnes = (id) => compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id);
      const n0 = nReunions();
      let e10 = null; try { creer(foule.slice(0, 10), 10); } catch (e) { e10 = [e.code, e.max]; }
      v('⛔ créer avec dix invités + l\'organisateur = ONZE personnes : `reunion_pleine`, le plafond est porté par l\'erreur (`max` 10), rien n\'est créé', [e10, nReunions() - n0], [['reunion_pleine', 10], 0]);
      const r9 = creer(foule.slice(0, 9), 10);
      v('population : neuf invités + l\'organisateur = dix personnes — créée (le refus du dessus venait bien du nombre)', [nReunions() - n0, nPersonnes(r9.id)], [1, 10]);
      let ei = null; try { S.reunionInviter({ id: r9.id, par: hote.id, uids: [foule[9]], plafond: 10 }); } catch (e) { ei = [e.code, e.max]; }
      v('⛔ inviter une ONZIÈME personne : `reunion_pleine`, et elle n\'est PAS ajoutée (la transaction ne garde rien)', [ei, nPersonnes(r9.id)], [['reunion_pleine', 10], 10]);
      const r5 = creer(foule.slice(0, 5), 10);
      let ei2 = null; try { S.reunionInviter({ id: r5.id, par: hote.id, uids: foule.slice(5, 11), plafond: 10 }); } catch (e) { ei2 = e.code; }
      v('⛔ une invitation qui ferait DÉPASSER (six invités de plus à une réunion de six personnes) est refusée EN ENTIER — personne n\'est ajouté à moitié', [ei2, nPersonnes(r5.id)], ['reunion_pleine', 6]);
      const ok4 = S.reunionInviter({ id: r5.id, par: hote.id, uids: foule.slice(5, 9), plafond: 10 });
      v('… et celle qui TIENT (quatre de plus, dix en tout) passe', [ok4.ajoutes.length, nPersonnes(r5.id)], [4, 10]);
      /* — le lien d'invité : la onzième personne n'entre pas, celle qui est déjà dedans n'est jamais refusée — */
      const code = S.reunionLien({ id: r5.id, par: hote.id }).code, plafonds = (organisateur) => formuleP.plafondReunion(organisateur);
      const onzieme = pers('Onzieme');
      let el = null; try { S.reunionInviteParCode({ code, uid: onzieme.id, plafonds }); } catch (e) { el = [e.code, e.max]; }
      v('⛔ la onzième personne qui entre par le LIEN : `reunion_pleine` (max 10) — elle n\'est pas inscrite', [el, compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r5.id, onzieme.id)], [['reunion_pleine', 10], 0]);
      const deja = S.reunionInviteParCode({ code, uid: foule[0], plafonds });
      v('une personne DÉJÀ invitée n\'est jamais refusée par le plafond (elle compte déjà) : « déjà »', [deja.ajoute, deja.reunion === r5.id], [false, true]);
      const r8 = creer(foule.slice(0, 7), 10), code8 = S.reunionLien({ id: r8.id, par: hote.id }).code;
      const entre = S.reunionInviteParCode({ code: code8, uid: onzieme.id, plafonds });
      v('contre-épreuve : une réunion de huit personnes accueille la neuvième par le lien (le refus vient du nombre, pas du lien)', [entre.ajoute, nPersonnes(r8.id)], [true, 9]);
      v('sans plafond donné (un appelant qui n\'en sait rien) le stockage garde sa borne STRUCTURELLE de cent invités, pas dix — le dix est une règle de produit, posée par les routes', [(() => { try { creer(foule.slice(0, 11), undefined); return 'accepté'; } catch (e) { return e.code; } })()], ['accepté']);
      /* — UNE constante : aucun fichier du service ne recopie le nombre — */
      const lisent = fs.readdirSync(T.SERVICE).filter(f => f.endsWith('.js')).filter(f => /REUNION_PERSONNES_MAX/.test(T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8')))).sort();
      v('⛔ UNE constante : seuls `formule.js` (qui la définit et la rend) et `routes.js` (qui la PUBLIE à la page) la nomment — aucune route ne compare à un nombre, elle demande à `plafondReunion`', lisent, ['formule.js', 'routes.js']);
      const routesR = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes-reunions.js'), 'utf8'));
      vrai('… et les quatre usages dans les routes de réunions passent tous par `plafondReunion` (créer, inviter, entrer par le lien, la fiche)', (routesR.match(/plafondReunion\(/g) || []).length === 4);
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    process.exitCode = 1;
  }
  try { if (S) S.fermer(); } catch (e) { /* déjà fermé */ }
  try { await fake.fermer(); } catch (e) { /* déjà fermé */ }
  try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  fin();
})();
