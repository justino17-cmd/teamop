/* ⛔ CE QUE CE FICHIER GARDE — DEUX APPELS QUI SE CROISENT SE REJOIGNENT (lot m18, 17 octobre 2026).

   Ana appelle Ben pendant que Ben appelle Ana. Avant : le second lancement arrivé voyait la SONNERIE du premier comme « appel actif » de son appelant → 409 `occupe` (moi:true), la page d'Ana
   disait « Tu es déjà dans un appel » alors qu'elle n'était dans aucun, et Ben sonnait dans le vide jusqu'à « Pas de réponse ». Maintenant : l'appel INVERSE qui sonne encore est PRIS par celui qui
   lance (une seule transaction, `appelInverseQuiSonne`) — les deux ordres d'arrivée donnent UN appel en cours, lié aux deux appareils, sans second appel écrit ni second push.

   Le VRAI service, isolé, parlé en HTTP, plus le module de stockage pour lire la base. Contre-épreuves : une personne occupée par un appel SANS RAPPORT reste « occupée » (`occupe`, moi:true pour
   l'appelante, appel manqué pour l'appelée), et un appel inverse dont la sonnerie est ÉCHUE ne se rejoint pas.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé d'un cas qui réussit. */
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000, SONNERIE = 45000;

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { appels: { sonnerieMs: SONNERIE, balayageMs: 1000, perduMs: 600000 } } });
  const ZERO = Date.UTC(2026, 9, 17, 8, 0, 0);
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const chemin = path.join(svc.data, 'msg.db');
  const S = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const lanceur = (c, vers, type) => c.post('/api/appels', { type: type || 'audio', uid: vers.id });
  const manques = (uid) => S.notifListe(uid, 50).filter(x => x.type === 'appel_manque').length;
  const dernierEtat = (uid) => { const e = S.evenementsPour(uid, 0, 1000).evenements.filter(x => x.event === 'appel'); return e.length ? e[e.length - 1].data.etat : null; };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo');
    S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); S.contactLier(ben.id, cleo.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo);

    /* ── 1. L'ordre « Ben d'abord » : Ben appelle Ana (elle sonne), PUIS Ana appelle Ben ── */
    const r1 = await lanceur(b1, ana);
    v('population : Ben appelle Ana, l\'appel SONNE chez elle (le cas qui réussit, avant le croisement)', [r1.code, r1.j.appel && r1.j.appel.etat, r1.j.joint], [201, 'sonne', undefined]);
    const idBen = r1.j.appel.id;
    const r2 = await lanceur(a1, ben);
    v('⛔ Ana appelle Ben pendant que l\'appel de Ben sonne chez elle : 201 (et non 409), c\'est l\'appel de Ben', [r2.code, r2.j.joint, r2.j.appel && r2.j.appel.id === idBen], [201, true, true]);
    v('   sa vue : ENTRANTE (Ben est l\'appelant), EN COURS, son appareil lié', [r2.j.appel && r2.j.appel.sens, r2.j.appel && r2.j.appel.etat, r2.j.appel && r2.j.appel.lie], ['entrant', 'en_cours', true]);
    const vueBen = S.appelVue(ben.id, idBen);
    v('   côté Ben (relu au service) : son appel sortant est EN COURS — plus de sonnerie dans le vide', [vueBen && vueBen.etat, vueBen && vueBen.sens], ['en_cours', 'sortant']);
    v('⛔ UN SEUL appel existe pour la paire (aucun second appel écrit, aucun manqué fantôme)', [S.appelsActifs().length, S.appelActifDe(ana.id) === idBen, S.appelActifDe(ben.id) === idBen, manques(ana.id), manques(ben.id)], [1, true, true, 0, 0]);
    v('⛔ chaque changement d\'état a son événement durable : Ben apprend que l\'appel est en cours (sinon sa page resterait en « Sonnerie… »)', [dernierEtat(ben.id), dernierEtat(ana.id)], ['en_cours', 'en_cours']);
    const f1 = await b1.post('/api/appels/' + idBen + '/quitter', {});
    v('   (l\'appel se raccroche normalement)', f1.code, 200);

    /* ── 2. L'autre ordre : Ana d'abord, puis Ben ── */
    const r3 = await lanceur(a1, ben, 'video');
    const idAna = r3.j.appel.id;
    v('population : Ana appelle Ben, ça sonne chez lui, un appel NEUF', [r3.code, r3.j.appel.etat, idAna !== idBen], [201, 'sonne', true]);
    const r4 = await lanceur(b1, ana, 'video');
    v('⛔ dans l\'autre ordre, Ben qui appelle Ana pendant qu\'elle l\'appelle prend SON appel', [r4.code, r4.j.joint, r4.j.appel && r4.j.appel.id === idAna, r4.j.appel && r4.j.appel.etat, r4.j.appel && r4.j.appel.type], [201, true, true, 'en_cours', 'video']);
    v('   un seul appel actif', [S.appelsActifs().length, S.appelActifDe(ben.id) === idAna], [1, true]);
    await a1.post('/api/appels/' + idAna + '/quitter', {});

    /* ── 3. Les contre-épreuves : ce qui doit RESTER occupé ── */
    const rc = await lanceur(c1, ana);
    const idC = rc.j.appel.id;
    const rr = await a1.post('/api/appels/' + idC + '/repondre', { accepte: true });
    v('population : Cléo appelle Ana, elle répond — Ana est DANS un appel sans rapport avec Ben', [rc.code, rr.code, rr.j.appel && rr.j.appel.etat], [201, 200, 'en_cours']);
    const rb = await lanceur(b1, ana);
    v('Ben appelle Ana, occupée avec Cléo : 409 `occupe` (moi:false), comme avant', [rb.code, rb.j.error, rb.j.moi], [409, 'occupe', false]);
    v('   et Ana a un appel manqué de Ben dans ses notifications', manques(ana.id), 1);
    const ra = await lanceur(a1, ben);
    v('   Ana, dans l\'appel de Cléo, n\'en lance pas un autre : 409 `occupe` (moi:true) — « Tu es déjà dans un appel » reste VRAI quand il l\'est', [ra.code, ra.j.error, ra.j.moi, ra.j.joint], [409, 'occupe', true, undefined]);
    v('   rien n\'a été pris à tort : l\'appel de Cléo court toujours, seul', [S.appelActifDe(ana.id) === idC, S.appelsActifs().length], [true, 1]);
    await c1.post('/api/appels/' + idC + '/quitter', {});

    /* l'appel inverse dont la sonnerie est ÉCHUE ne se rejoint pas */
    const rd = await lanceur(b1, ana);
    v('population : Ben rappelle Ana, ça sonne', [rd.code, rd.j.appel.etat], [201, 'sonne']);
    decal += SONNERIE + 5000; svc.avancer(SONNERIE + 5000);
    const re = await lanceur(a1, ben);
    v('la sonnerie de l\'appel de Ben est ÉCHUE : l\'appel d\'Ana n\'y répond pas — un appel NEUF, qui sonne chez Ben', [re.code, re.j.joint, re.j.appel && re.j.appel.id !== rd.j.appel.id, re.j.appel && re.j.appel.etat], [201, undefined, true, 'sonne']);
  } finally { try { S.fermer(); } catch (e) { /* déjà fermé */ } await svc.arreter(); }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });
