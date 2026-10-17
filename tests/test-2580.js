/* ⛔ CE QUE CE FICHIER GARDE — QUAND UNE SÉANCE DE RÉUNION FINIT, TOUS CEUX QUI EN SONT LE SAVENT (lot m16, bug « salle#1 », 17 octobre 2026 ; famille 3 : le VRAI service, parlé en HTTP).

   Constat du testeur : Ana, Dan et Cléo sont dans la salle d'une réunion, Ana « Termine pour tous » ; la salle se ferme chez Dan et Cléo, qui atterrissent sur l'agenda — et leur ligne dit
   encore « À répondre » avec « Rejoindre », huit secondes plus tard comme dix minutes plus tard. Après un rechargement : « Durée 1 min · 3 présents · Terminée ». Le service disait juste
   (`GET /api/reunions` porte la séance) ; c'est la page qui ne savait pas qu'il fallait relire : la fin d'une séance n'envoyait aux participants que le COMPTE RENDU (un événement de
   conversation), jamais l'événement `reunion` qui fait relire l'agenda et la fiche. Un participant sur l'agenda ne relit pas une liste qui ne bouge pas.

   Ce banc garde, contre le vrai service :
     1. « Terminer pour tous » envoie un événement `reunion` (l'identifiant de la réunion) à CHAQUE participant — l'hôte, ceux qui étaient en salle, ceux qui n'y étaient pas —, après la fin
        de la séance (la liste relue à ce moment dit « terminée ») ;
     2. ⛔ la séance qui finit parce que le DERNIER s'en va (personne n'a touché « Terminer ») prévient de même ;
     3. ⛔ dans le cercle des participants SEULEMENT : quelqu'un qui n'est pas dans la réunion ne reçoit rien (un événement `reunion` dirait à un étranger qu'une réunion existe) ;
     4. une séance qui ne finit pas (un participant sort, les autres restent) ne prévient personne : pas de relecture pour rien.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « rien reçu » est précédé de ce qui AURAIT pu l'être (le flux de l'étranger est ouvert et vivant). */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const MIN = 60000, HEURE = 3600000, JOUR = 86400000;

(async () => {
  const svc = await T.lancerService({ horloge: true });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() });
  const pers = (prenom) => S.personneCreer({ identifiant: 'beta:' + prenom + crypto.randomBytes(3).toString('hex'), prenom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); return c; };
  const ouverts = [];
  const ecoute = async (c) => { const f = await T.flux(c); ouverts.push(f); return f; };
  const reunionPour = (f, R) => f.evenements.filter(e => e.event === 'reunion' && e.data && e.data.id === R);
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
    for (const p of [ben, cleo, dan]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve);
    const fa = await ecoute(a1), fb = await ecoute(b1), fc = await ecoute(c1), fd = await ecoute(d1), fe = await ecoute(e1);
    vrai('population : les cinq flux sont ouverts (200), dont celui d\'Eve, qui n\'est dans aucune réunion', [fa, fb, fc, fd, fe].every(f => f.statut === 200));

    /* ── 1. Terminer pour tous ── */
    console.log('« Terminer pour tous » : tous les participants relisent');
    const debut = Date.now() + 5 * MIN;
    const cr = await a1.post('/api/reunions', { titre: 'Point du lundi', debut, fin: debut + HEURE, invites: [ben.id, cleo.id, dan.id] });
    vrai('population : la réunion est programmée avec trois invités', cr.code === 201);
    const R = cr.j.reunion.id;
    const s1 = await a1.post('/api/reunions/' + R + '/rejoindre', {});
    await b1.post('/api/reunions/' + R + '/rejoindre', {}); await c1.post('/api/reunions/' + R + '/rejoindre', {});
    vrai('population : Ana, Ben et Cléo sont en salle (Dan est invité, pas entré)', s1.code === 200 && s1.j.appel && s1.j.appel.id);
    /* le point de départ : tout ce qui s'est dit jusqu'ici est mis de côté — on ne compte que ce que la FIN envoie */
    await T.dort(150);
    const avant = new Map([fa, fb, fc, fd].map(f => [f, reunionPour(f, R).length]));
    const t = await a1.post('/api/salles/' + s1.j.appel.id + '/terminer', {});
    v('Ana termine pour tous', t.code, 200);
    for (const [nom, f] of [['Ana (l\'hôte)', fa], ['Ben (en salle)', fb], ['Cléo (en salle)', fc], ['Dan (invité, jamais entré)', fd]])
      vrai('⛔ ' + nom + ' reçoit l\'événement `reunion` de cette réunion — sans lui, son agenda garde « Rejoindre » jusqu\'au rechargement', !!await T.attendre(() => reunionPour(f, R).length > avant.get(f), 4000, 10));
    /* l'ordre : au moment où l'événement arrive, la liste relue dit « terminée » (la séance est écrite AVANT d'être annoncée) */
    const liste = ((await c1.get('/api/reunions?du=' + (debut - JOUR) + '&au=' + (debut + JOUR))).j.reunions || []).find(x => x.id === R);
    v('la liste que Cléo relit alors dit la séance finie pour tous (plus de salle ouverte)', liste && [liste.salle_ouverte, liste.occurrences[0].seance && liste.occurrences[0].seance.pour_tous], [false, true]);
    await T.dort(300);
    v('⛔ Eve (étrangère à la réunion) ne reçoit rien de cette réunion — alors que son flux est vivant (il a reçu des pulsations ou est resté ouvert)', [reunionPour(fe, R).length, fe.ferme], [0, false]);

    /* ── 2. le dernier s'en va ── */
    console.log('\nLa séance qui finit parce que le dernier s\'en va');
    const debut2 = Date.now() + 5 * MIN;
    const cr2 = await a1.post('/api/reunions', { titre: 'Point express', debut: debut2, fin: debut2 + HEURE, invites: [ben.id, dan.id] });
    const R2 = cr2.j.reunion.id;
    const s2 = await a1.post('/api/reunions/' + R2 + '/rejoindre', {});
    await b1.post('/api/reunions/' + R2 + '/rejoindre', {});
    await T.dort(150);
    const n0 = reunionPour(fd, R2).length, nb0 = reunionPour(fb, R2).length;
    await b1.post('/api/appels/' + s2.j.appel.id + '/quitter', {});
    await T.dort(300);
    v('⛔ une séance qui ne finit pas (Ben sort, Ana reste) ne prévient pas Dan : il n\'y a rien de neuf à relire', reunionPour(fd, R2).length - n0, 0);
    const dernier = await a1.post('/api/appels/' + s2.j.appel.id + '/quitter', {});
    v('Ana, la dernière, quitte', dernier.code, 200);
    vrai('⛔ Dan (jamais entré) reçoit l\'événement `reunion` : la séance a fini sans que personne ne touche « Terminer »', !!await T.attendre(() => reunionPour(fd, R2).length > n0, 4000, 10));
    vrai('   Ben, sorti avant la fin, le reçoit aussi (il est participant)', !!await T.attendre(() => reunionPour(fb, R2).length > nb0, 4000, 10));
    await T.dort(200);
    v('   et Eve, toujours rien', reunionPour(fe, R2).length, 0);
  } finally {
    for (const f of ouverts) try { f.fermer(); } catch (e) { /* déjà fermé */ }
    try { S.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
