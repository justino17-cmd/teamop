/* ══ OUTIL DES BANCS DE L'INVITÉ SANS COMPTE (tests/test-3050 à test-3059) ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pas une suite (le nom ne commence pas par `test-` : le compteur ne la lance pas). Il monte ce que tous les bancs de l'invité sans compte partagent : le VRAI service dans un processus isolé (`outils-msg`), la base
 * ouverte à côté (WAL : deux processus, une base — comme `test-724`) pour poser des comptes sans passer par la porte bêta, et les gestes d'un organisateur et d'un client :
 *   · `monter(opts)`   → { svc, S, pers, cl, programmer, entrerSalle, lien, invite }  ; `arreter()` ;
 *   · `programmer(hote, extra)` → l'identifiant d'une réunion qui commence dans deux minutes (la fenêtre d'entrée est ouverte) ;
 *   · `lien(hote, rid)` → le jeton « Invité (sans compte) » de l'organisateur ;
 *   · `invite(jeton, nom, entreprise)` → un client VIERGE (aucun cookie de compte) qui se présente : { c, rep, id, appel }.
 * ⛔ Un client d'invité est un `T.client` NEUF avec le nom de cookie de l'invité (`opm-i`) : jamais un cookie de compte.
 */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jetonCompte = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;

async function monter(opts = {}) {
  /* Les bancs relâchent les plafonds de l'invité (cinquante entrées depuis la même adresse locale) ; `test-3052` les joue à leur valeur de production (`opts.quotasProd`). */
  const detendus = { invite_apercu: 100000, invite_entrer: 100000, invite_entrer_jeton: 100000, invite_cree: 100000, invite_cree_jeton: 100000, invite_redemander: 100000, invite_regenerer: 100000 };
  const quotas = Object.assign({}, opts.quotasProd ? {} : Object.fromEntries(Object.entries(detendus).map(([k, m]) => [k, { max: m, fenetreMs: 3600000 }])), (opts.service && opts.service.config && opts.service.config.quotas) || {});
  const cfg = Object.assign({ appels: { balayageMs: 1000, perduMs: 600000 } }, (opts.service && opts.service.config) || {}, { quotas });
  const svc = await T.lancerService(Object.assign({ horloge: true }, opts.service || {}, { config: cfg }));
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() + (svc.decalage ? svc.decalage() : 0) });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jetonCompte(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  /* une réunion qui commence dans deux minutes : la fenêtre d'entrée (quinze minutes avant) est ouverte */
  const programmer = async (hote, extra) => {
    const maintenant = Date.now() + (svc.decalage ? svc.decalage() : 0);
    const r = await hote.post('/api/reunions', Object.assign({ titre: 'Devis Durand', debut: maintenant + 2 * 60000, fin: maintenant + 62 * 60000, invites: [], notifier: false }, extra || {}));
    if (r.code !== 201) throw new Error('réunion refusée : ' + r.code + ' ' + (r.j && r.j.error));
    return r.j.reunion ? r.j.reunion.id : r.j.id;
  };
  const lien = async (hote, rid) => { const r = await hote.post('/api/reunions/' + rid + '/invite/lien', {}); if (r.code !== 200) throw new Error('lien refusé : ' + r.code + ' ' + (r.j && r.j.error)); return r.j.jeton; };
  const entrerSalle = async (c, rid, type) => { const r = await c.post('/api/reunions/' + rid + '/rejoindre', { type: type || 'audio' }); if (r.code !== 200) throw new Error('entrée refusée : ' + r.code + ' ' + (r.j && r.j.error)); return r.j.appel.id; };
  const clientInvite = () => T.client(svc.base, { nomCookie: 'opm-i' });
  const invite = async (jeton, nom, entreprise, c) => {
    c = c || clientInvite();
    const rep = await c.post('/api/invite/entrer', { jeton, nom, entreprise });
    return { c, rep, id: rep.j && rep.j.invite && rep.j.invite.id, appel: rep.j && rep.j.appel && rep.j.appel.id };
  };
  return { svc, S, pers, cl, programmer, lien, entrerSalle, invite, clientInvite, sha, JOUR, async arreter() { await svc.arreter(); } };
}

module.exports = { monter, sha, jetonCompte, JOUR };
