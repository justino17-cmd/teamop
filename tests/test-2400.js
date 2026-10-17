/* ⛔ CE QUE CE FICHIER GARDE — L'HÔTE PAR INTÉRIM N'A PAS LES GESTES QU'ON NE DÉFAIT PAS (salle d'une réunion programmée, contre le VRAI service).

   Le 16 octobre 2026 (testeur, `securite#0`) : le premier INVITÉ NOMMÉ qui entre dans la salle d'une réunion, avant l'organisatrice, devenait hôte par intérim (grade 2, voulu : « une salle n'est jamais sans
   maître » — sans hôte, la salle d'attente n'a personne pour admettre). Mais le grade 2 ouvrait TOUS les gestes d'hôte : il EXCLUAIT un autre invité (sans retour : `exclu` est définitif, et `admettre` ne
   rouvre pas une ligne `exclu`), verrouillait, coupait les micros de tous, ouvrait ou fermait la salle d'attente et le partage, nommait des co-hôtes (pour toujours) — et l'organisatrice qui arrivait ensuite
   faisait de lui un CO-HÔTE PERMANENT. Ce banc joue l'histoire de bout en bout :

     1. L'INTÉRIMAIRE GARDE LA PORTE : il admet et refuse à l'entrée (salle d'attente allumée par l'organisatrice) ; la salle dit qu'il est intérimaire (`moi.interim`) ;
     2. IL PERD CE QUI ENGAGE LES AUTRES : exclure, verrouiller, salle d'attente, partage, enregistrer, couper les micros de TOUS, nommer un co-hôte — 403 `interdit`, et RIEN n'est écrit ;
     3. L'ORGANISATRICE QUI ARRIVE REPREND LA MAIN : l'ex-intérimaire retombe à grade 0 (il n'est PAS co-hôte) ; l'invité qu'il n'a pas pu exclure peut toujours entrer ;
     4. UN CO-HÔTE NOMMÉ PAR ELLE N'EST PAS UN INTÉRIMAIRE : il garde ses gestes (exclure un participant), quand elle part comme quand elle revient ;
     5. CONTRE-ÉPREUVE : si l'organisatrice entre la première, les mêmes gestes d'un invité font 403 (l'état d'avant), et elle, elle les fait.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : avant chaque « rien n'est écrit », la population qu'il aurait pu changer est comptée. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const JOUR = 86400000;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const dit = (rep) => [rep.code, rep.j && rep.j.error];

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { quotas: { reunion: { max: 1000, fenetreMs: 3600000 }, rejoindre_code: { max: 1000, fenetreMs: 3600000 } }, appels: { balayageMs: 1000, perduMs: 600000 } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const ligne = (sid, uid) => { const d = brut(); try { return d.prepare('SELECT statut, grade FROM appel_part WHERE appel = ? AND uid = ?').get(sid, uid) || null; } finally { d.close(); } };
  const reglages = (sid) => { const d = brut(); try { return d.prepare('SELECT verrou, attente, partage_ok, rec_par FROM appel WHERE id = ?').get(sid); } finally { d.close(); } };
  try {
    const ana = pers('Ana'), dan = pers('Dan'), cleo = pers('Cleo'), eve = pers('Eve');
    const a1 = cl(ana), d1 = cl(dan), c1 = cl(cleo), e1 = cl(eve);
    for (const p of [dan, cleo, eve]) S.contactLier(ana.id, p.id);
    for (const p of [ana, cleo, eve]) S.contactLier(dan.id, p.id);
    const maintenant = Date.now();
    const programmer = async (extra) => (await a1.post('/api/reunions', Object.assign({ titre: 'Point', debut: maintenant + 2 * 60000, fin: maintenant + 62 * 60000, invites: [dan.id, cleo.id, eve.id], notifier: false }, extra || {}))).j.reunion.id;
    const POST = (c, sid, geste, corps) => c.post('/api/salles/' + sid + '/' + geste, corps || {});
    const quitter = async (c) => { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); };

    /* ═══ 1 et 2. L'INTÉRIMAIRE : LA PORTE, PAS LES GESTES IRRÉVERSIBLES ═══════════════════════════════════════════════════════════════════ */
    console.log('Dan, invité nommé, entre avant l\'organisatrice : la porte, pas les gestes qu\'on ne défait pas');
    const rid = await programmer({ salle_attente: true });
    vrai('la réunion est programmée avec ses trois invités nommés', typeof rid === 'string' && rid.length > 0);
    const rd = await d1.post('/api/reunions/' + rid + '/rejoindre', {});
    const sid = rd.j.appel && rd.j.appel.id;
    v('Dan entre le premier : il tient la porte (grade 2, la salle n\'est pas sans maître) et la salle DIT qu\'il est intérimaire', [rd.code, rd.j.appel.moi.grade, rd.j.appel.moi.interim], [200, 2, true]);
    const rc = await c1.post('/api/reunions/' + rid + '/rejoindre', {});
    v('Cléo arrive : elle attend à la porte (salle d\'attente allumée à la création)', [rc.code, rc.j.appel.moi.statut], [200, 'attente']);
    const avant = reglages(sid);
    v('… la population de la salle : Dan présent, Cléo à la porte, aucun verrou ni REC, partage permis par défaut', [ligne(sid, dan.id), ligne(sid, cleo.id), avant.verrou, avant.partage_ok, avant.rec_par], [{ statut: 'present', grade: 2 }, { statut: 'attente', grade: 0 }, 0, 1, null]);

    const gestes = [['exclure', { uid: cleo.id }], ['verrouiller', { actif: true }], ['salle_attente', { actif: false }], ['partage', { actif: false }], ['rec', { actif: true }], ['couper_micro', { tous: true }], ['cohote', { uid: cleo.id, actif: true }]];
    const rep = [];
    for (const [g, corps] of gestes) rep.push([g, ...dit(await POST(d1, sid, g, corps))]);
    v('⛔ Dan (intérim) : exclure, verrouiller, salle d\'attente, partage, enregistrer, couper les micros de TOUS, nommer un co-hôte → 403 interdit, un par un',
      rep, gestes.map(([g]) => [g, 403, 'interdit']));
    const apres = reglages(sid);
    v('… et RIEN n\'est écrit : Cléo n\'est pas exclue, ni verrou, ni partage, ni REC, ni co-hôte', [ligne(sid, cleo.id), apres.verrou, apres.attente, apres.partage_ok, apres.rec_par], [{ statut: 'attente', grade: 0 }, 0, 1, 1, null]);
    v('… mais il garde la PORTE : il admet Cléo (200), qui entre', [(await POST(d1, sid, 'admettre', { uid: cleo.id })).code, ligne(sid, cleo.id)], [200, { statut: 'present', grade: 0 }]);
    v('… et refuse un autre qui attend (Eve, 200)', [(await e1.post('/api/reunions/' + rid + '/rejoindre', {})).j.appel.moi.statut, (await POST(d1, sid, 'refuser', { uid: eve.id })).code, ligne(sid, eve.id).statut], ['attente', 200, 'refuse']);
    v('… et Cléo (simple participante) ne peut toujours rien de tout cela (403)', [dit(await POST(c1, sid, 'verrouiller', { actif: true })), dit(await POST(c1, sid, 'exclure', { uid: eve.id }))], [[403, 'interdit'], [403, 'interdit']]);
    v('… ni lui ne peut exclure une personne qui n\'attend plus (même 403, la ligne reste : Cléo présente)', [dit(await POST(d1, sid, 'exclure', { uid: cleo.id })), ligne(sid, cleo.id).statut], [[403, 'interdit'], 'present']);

    /* ═══ 3. L'ORGANISATRICE REPREND LA MAIN ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nAna arrive : elle reprend la main, Dan n\'est pas co-hôte pour autant');
    const ra = await a1.post('/api/reunions/' + rid + '/rejoindre', {});
    v('Ana (l\'organisatrice) entre : hôte (grade 2), pas intérimaire', [ra.code, ra.j.appel.moi.grade, !!ra.j.appel.moi.interim], [200, 2, false]);
    v('⛔ Dan retombe à grade 0 — il n\'est PAS devenu co-hôte permanent (avant : grade 1)', ligne(sid, dan.id), { statut: 'present', grade: 0 });
    v('… et il ne tient plus la porte : admettre, refuser, exclure → 403', [dit(await POST(d1, sid, 'admettre', { tous: true })), dit(await POST(d1, sid, 'refuser', { uid: eve.id })), dit(await POST(d1, sid, 'exclure', { uid: cleo.id }))], [[403, 'interdit'], [403, 'interdit'], [403, 'interdit']]);
    v('… Ana, elle, a tous les gestes : elle verrouille (200), puis déverrouille', [(await POST(a1, sid, 'verrouiller', { actif: true })).code, (await POST(a1, sid, 'verrouiller', { actif: false })).code], [200, 200]);

    /* ═══ 4. UN CO-HÔTE NOMMÉ N'EST PAS UN INTÉRIMAIRE ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn co-hôte nommé par l\'organisatrice garde ses gestes');
    v('Ana nomme Cléo co-hôte (200, grade 1)', [(await POST(a1, sid, 'cohote', { uid: cleo.id, actif: true })).code, ligne(sid, cleo.id).grade], [200, 1]);
    v('… Cléo (co-hôte) exclut un participant : Dan (200) — le geste qu\'on refuse à l\'intérimaire reste celui d\'un co-hôte nommé', [(await POST(c1, sid, 'exclure', { uid: dan.id })).code, ligne(sid, dan.id).statut], [200, 'exclu']);
    await quitter(a1);
    v('Ana PART : Cléo reste co-hôte (grade 1 — personne n\'est promu par-dessus elle), et Ana, partie, est à grade 0', [ligne(sid, cleo.id), ligne(sid, ana.id).grade], [{ statut: 'present', grade: 1 }, 0]);
    const rb = await a1.post('/api/reunions/' + rid + '/rejoindre', {});
    v('Ana REVIENT : hôte de nouveau, et Cléo est TOUJOURS co-hôte (l\'arrivée de l\'organisatrice ne touche pas un co-hôte nommé)', [rb.code, rb.j.appel.moi.grade, ligne(sid, cleo.id).grade], [200, 2, 1]);
    await quitter(a1); await quitter(c1);

    /* ═══ 5. CONTRE-ÉPREUVE : L'ORGANISATRICE ENTRE LA PREMIÈRE ══════════════════════════════════════════════════════════════════════════ */
    console.log('\nContre-épreuve : Ana entre la première, Dan n\'a aucun geste d\'hôte');
    const rid2 = await programmer();
    const ra2 = await a1.post('/api/reunions/' + rid2 + '/rejoindre', {});
    const sid2 = ra2.j.appel.id;
    const rd2 = await d1.post('/api/reunions/' + rid2 + '/rejoindre', {}), rc2 = await c1.post('/api/reunions/' + rid2 + '/rejoindre', {});
    v('Dan et Cléo entrent après elle : grade 0, aucune étiquette d\'intérim (c\'est l\'organisatrice qui tient la salle)', [ra2.j.appel.moi.grade, rd2.j.appel.moi.grade, !!rd2.j.appel.moi.interim, rc2.j.appel.moi.grade], [2, 0, false, 0]);
    const rep2 = [];
    for (const [g, corps] of [['exclure', { uid: cleo.id }], ['verrouiller', { actif: true }], ['salle_attente', { actif: true }], ['partage', { actif: false }], ['couper_micro', { tous: true }]]) rep2.push([g, ...dit(await POST(d1, sid2, g, corps))]);
    v('Dan : les mêmes gestes → 403 interdit (l\'état d\'avant, resté tel quel)', rep2, ['exclure', 'verrouiller', 'salle_attente', 'partage', 'couper_micro'].map(g => [g, 403, 'interdit']));
    v('… Ana exclut Cléo (200) : le geste existe bien, il est à elle', [(await POST(a1, sid2, 'exclure', { uid: cleo.id })).code, ligne(sid2, cleo.id).statut], [200, 'exclu']);

    /* ═══ 6. QUAND L'ORGANISATRICE PART SEULE, LA SALLE RESTE À UN INTÉRIMAIRE — SA PORTE, PAS SES ARMES ═══════════════════════════════════
       (Dan est seul avec Ana ; elle part : il est promu pour que la salle ait quelqu'un à la porte, et il est intérimaire.) */
    console.log('\nL\'organisatrice part : le suivant tient la porte, en intérimaire');
    await quitter(a1);
    const apresDepart = await d1.get('/api/salles/' + sid2);
    v('Ana part : Dan (le seul présent) passe à grade 2 ET la salle le dit intérimaire', [ligne(sid2, dan.id).grade, apresDepart.j.appel && apresDepart.j.appel.moi.grade, apresDepart.j.appel && apresDepart.j.appel.moi.interim], [2, 2, true]);
    v('… et il ne peut toujours pas verrouiller (403)', dit(await POST(d1, sid2, 'verrouiller', { actif: true })), [403, 'interdit']);
  } finally {
    await svc.arreter();
  }
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
