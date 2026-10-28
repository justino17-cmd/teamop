/* ⛔ CE QUE CE FICHIER GARDE — QUAND L'ORGANISATEUR D'UNE RÉUNION « QUITTE », LE PARTICIPANT SUIVANT DEVIENT LE NOUVEL ORGANISATEUR, AVEC TOUS LES GESTES DE L'HÔTE (Justin, 26 octobre 2026, décision #18).

   Avant : la phrase du panneau « Quitter » promettait « le rôle passe à une autre personne », et le service donnait le grade 2 au suivant — mais `salleInterim` (grade 2 dans une salle de RÉUNION et pas
   l'organisateur de la réunion) le prenait pour un intérimaire : la porte, pas les armes. Il ne pouvait ni exclure, ni verrouiller, ni régler la salle, ni enregistrer, ni nommer de co-hôte, ni terminer pour tous.
   Maintenant : l'organisateur est ENTRÉ puis PARTI (sa ligne dit `parti`) ; la personne à qui la salle passe l'organisation est un invité NOMMÉ (`invite_par` non vide) — un co-hôte d'abord, puis le plus
   ancien — et elle a les gestes de l'organisateur, côté SERVICE (403 sinon), pas seulement à l'écran. L'intérim d'avant (l'organisateur n'est JAMAIS venu, ou la personne n'est entrée que par le lien) ne change
   pas : `test-2400`, `test-988`, `test-990`.

     1. LE SUIVANT A LES GESTES : l'organisatrice les fait dans sa salle (la référence, 200), part ; le suivant fait les MÊMES gestes et reçoit les mêmes réponses ; la salle ne le dit plus intérimaire ;
        il termine la réunion pour tous (200) ;
     2. QUI EST LE SUIVANT : un invité NOMMÉ, jamais celui qui est entré par le lien même s'il est arrivé le premier ; un co-hôte passe avant ; le suivant du suivant quand il part à son tour ;
     3. LE RETOUR : l'organisatrice revient, redevient hôte, et le successeur nommé GARDE son rôle (il lui a été confié, pas prêté) ; l'intérim, lui, s'efface (inchangé) ;
     4. CONTRE-ÉPREUVES : si seuls des invités du LIEN restent, le suivant n'a que la porte (403 sur exclure et verrouiller) ; si l'organisatrice n'est jamais venue, l'intérimaire n'a toujours pas les armes ;
     5. LA PAGE : la phrase du panneau « Quitter » dit ce que le service fait (réunion : « l'invité suivant … en devient l'organisateur, avec tous les gestes ») et ne promet plus un rôle qui « passe ».
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : les gestes de référence de l'organisatrice sont comptés (au moins six en 200) avant de comparer le suivant à eux. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-page-reunions');
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
  const reglages = (sid) => { const d = brut(); try { return d.prepare('SELECT verrou, attente, partage_ok, rec_par, etat FROM appel WHERE id = ?').get(sid); } finally { d.close(); } };
  try {
    const ana = pers('Ana'), dan = pers('Dan'), cleo = pers('Cleo'), eve = pers('Eve'), fay = pers('Fay'), gus = pers('Gus');
    const a1 = cl(ana), d1 = cl(dan), c1 = cl(cleo), e1 = cl(eve), f1 = cl(fay), g1 = cl(gus);
    for (const p of [dan, cleo, eve, gus]) S.contactLier(ana.id, p.id);
    for (const p of [ana, cleo, eve, gus]) S.contactLier(dan.id, p.id);
    const maintenant = Date.now();
    const programmer = async (extra) => (await a1.post('/api/reunions', Object.assign({ titre: 'Point', debut: maintenant + 2 * 60000, fin: maintenant + 62 * 60000, invites: [dan.id, cleo.id, eve.id, gus.id], notifier: false }, extra || {}))).j.reunion.id;
    const POST = (c, sid, geste, corps) => c.post('/api/salles/' + sid + '/' + geste, corps || {});
    const entrer = (c, rid) => c.post('/api/reunions/' + rid + '/rejoindre', { type: 'audio' });          // en audio : six places (en vidéo, quatre)
    const entrerLien = (c, code) => c.post('/api/reunions/rejoindre', { code, type: 'audio' });
    const quitter = async (c) => { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); };
    const tous = [a1, d1, c1, e1, f1, g1];
    const vider = async () => { for (const c of tous) await quitter(c); };
    const pause = () => T.dort(15);                                     // deux entrées dans la même milliseconde se départageraient au hasard : l'ordre d'arrivée est celui qu'on joue
    const moi = async (c, sid) => ((await c.get('/api/salles/' + sid)).j.appel || {}).moi || null;
    /* les gestes qui engagent les autres — ceux que l'intérim n'a pas (test-2400) — plus « terminer » à part. `victime` : qui l'on exclut, `cible` : qui l'on nomme co-hôte. */
    const gestes = (victime, cible) => [['exclure', { uid: victime }], ['verrouiller', { actif: true }], ['verrouiller', { actif: false }], ['salle_attente', { actif: true }], ['salle_attente', { actif: false }],
      ['partage', { actif: false }], ['partage', { actif: true }], ['couper_micro', { tous: true }], ['cohote', { uid: cible, actif: true }]];
    const jouer = async (c, sid, g) => { const out = []; for (const [nom, corps] of g) out.push([nom, ...dit(await POST(c, sid, nom, corps))]); return out; };

    /* ═══ 1. LE SUIVANT A LES GESTES — la référence est l'organisatrice elle-même ═════════════════════════════════════════════════════════ */
    console.log('1. Ana organise, part : Dan fait ce qu\'elle faisait, avec les mêmes réponses');
    const rid1 = await programmer();
    const ra1 = await entrer(a1, rid1), sid1 = ra1.j.appel && ra1.j.appel.id;
    vrai('(population) Ana ouvre la salle : hôte (grade 2), pas intérimaire', ra1.code === 200 && ra1.j.appel.moi.grade === 2 && !ra1.j.appel.moi.interim);
    await pause(); const rd1 = await entrer(d1, rid1); await pause(); const rc1 = await entrer(c1, rid1); await pause(); const re1 = await entrer(e1, rid1); await pause(); const rg1 = await entrer(g1, rid1);
    v('(population) Dan, Cléo, Eve et Gus entrent après elle : simples participants (grade 0), aucun intérimaire', [rd1, rc1, re1, rg1].map(r => [r.code, r.j.appel.moi.grade, !!r.j.appel.moi.interim]), [[200, 0, false], [200, 0, false], [200, 0, false], [200, 0, false]]);
    /* la RÉFÉRENCE : ce que fait l'organisatrice, dans CETTE salle, avant de partir (Gus exclu servira de « victime » — Eve reste pour la suite) */
    const refAna = await jouer(a1, sid1, gestes(g1.moi.id, c1.moi.id));
    const ok200 = refAna.filter(x => x[1] === 200).length;
    vrai('(population) l\'organisatrice fait ses neuf gestes : au moins sept répondent 200 — la référence existe (' + ok200 + ' sur ' + refAna.length + ')', ok200 >= 7);
    v('   … et RIEN n\'est refusé à l\'organisatrice (aucun 403)', refAna.filter(x => x[1] === 403), []);
    /* Cléo est co-hôte (grade 1) maintenant : on la retire pour ne pas confondre ce cas avec le 2 ci-dessous, et Gus est exclu (parti) */
    await POST(a1, sid1, 'cohote', { uid: c1.moi.id, actif: false });
    v('(population) Cléo est de nouveau simple participante, Gus exclu, Dan et Eve présents', [ligne(sid1, cleo.id), ligne(sid1, gus.id).statut, ligne(sid1, dan.id), ligne(sid1, eve.id)], [{ statut: 'present', grade: 0 }, 'exclu', { statut: 'present', grade: 0 }, { statut: 'present', grade: 0 }]);
    await quitter(a1);
    v('⛔ Ana PART : Dan (invité NOMMÉ, le plus ancien présent après elle) passe à grade 2 ; Ana, partie, est à grade 0', [ligne(sid1, dan.id), ligne(sid1, ana.id)], [{ statut: 'present', grade: 2 }, { statut: 'parti', grade: 0 }]);
    const moiD = await moi(d1, sid1);
    v('⛔ la salle ne le dit PLUS intérimaire : il est le nouvel organisateur (grade 2, `interim` absent)', [moiD.grade, !!moiD.interim], [2, false]);
    v('… Cléo, simple participante, reste sans geste (403) : la passation ne donne pas l\'organisation à tout le monde', dit(await POST(c1, sid1, 'verrouiller', { actif: true })), [403, 'interdit']);
    const repDan = await jouer(d1, sid1, gestes(e1.moi.id, c1.moi.id));
    v('⛔ Dan fait les MÊMES neuf gestes qu\'Ana, avec les MÊMES réponses (exclure, verrou, salle d\'attente, partage, couper tous les micros, nommer un co-hôte)', repDan.map(x => [x[0], x[1]]), refAna.map(x => [x[0], x[1]]));
    v('… et il a réellement fait quelque chose : Eve est exclue, Cléo est co-hôte, et la salle n\'est plus verrouillée', [ligne(sid1, eve.id).statut, ligne(sid1, cleo.id).grade, reglages(sid1).verrou], ['exclu', 1, 0]);
    v('⛔ il termine la réunion POUR TOUS (200) : la salle est finie', [dit(await POST(d1, sid1, 'terminer')), reglages(sid1).etat], [[200, undefined], 'fini']);
    await vider();

    /* ═══ 2. QUI EST LE SUIVANT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n2. Le suivant est un invité NOMMÉ — jamais celui du lien, un co-hôte d\'abord');
    const rid2 = await programmer();
    const code2 = (await a1.post('/api/reunions/' + rid2 + '/lien', {})).j.code;
    const ra2 = await entrer(a1, rid2), sid2 = ra2.j.appel.id;
    await pause(); const rf2 = await entrerLien(f1, code2);
    v('(population) Fay entre PAR LE LIEN, la PREMIÈRE après Ana : simple participante', [rf2.code, rf2.j.appel && rf2.j.appel.moi.grade, !!(rf2.j.appel && rf2.j.appel.moi.interim)], [200, 0, false]);
    await pause(); const rd2 = await entrer(d1, rid2); await pause(); const rc2 = await entrer(c1, rid2);
    v('(population) Dan et Cléo (invités nommés) entrent ensuite', [rd2.code, rc2.code, ligne(sid2, dan.id).statut, ligne(sid2, cleo.id).statut], [200, 200, 'present', 'present']);
    await quitter(a1);
    v('⛔ Ana part : Dan (nommé) devient l\'organisateur — pas Fay, entrée avant lui mais par le lien (elle reste à grade 0)', [ligne(sid2, dan.id).grade, ligne(sid2, fay.id).grade, ligne(sid2, cleo.id).grade], [2, 0, 0]);
    await quitter(d1);
    v('… Dan part à son tour : Cléo (la suivante nommée) devient l\'organisatrice, avec ses gestes (verrou : 200)', [ligne(sid2, cleo.id).grade, !!(await moi(c1, sid2)).interim, dit(await POST(c1, sid2, 'verrouiller', { actif: true }))], [2, false, [200, undefined]]);
    await vider();

    console.log('\n   Un co-hôte nommé passe avant le plus ancien');
    const rid2b = await programmer();
    const ra2b = await entrer(a1, rid2b), sid2b = ra2b.j.appel.id;
    await pause(); await entrer(d1, rid2b); await pause(); await entrer(c1, rid2b);
    await POST(a1, sid2b, 'cohote', { uid: cleo.id, actif: true });
    v('(population) Cléo, arrivée après Dan, est co-hôte (grade 1) ; Dan est simple participant', [ligne(sid2b, cleo.id).grade, ligne(sid2b, dan.id).grade], [1, 0]);
    await quitter(a1);
    v('⛔ Ana part : c\'est Cléo, la co-hôte, qui devient l\'organisatrice (grade 2) ; Dan reste à 0', [ligne(sid2b, cleo.id).grade, ligne(sid2b, dan.id).grade, !!(await moi(c1, sid2b)).interim], [2, 0, false]);
    await vider();

    /* ═══ 3. LE RETOUR DE L'ORGANISATRICE ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n3. Ana revient : elle reprend la main, le successeur nommé garde son rôle');
    const rid3 = await programmer();
    const ra3 = await entrer(a1, rid3), sid3 = ra3.j.appel.id;
    await pause(); await entrer(d1, rid3); await pause(); await entrer(c1, rid3);
    await quitter(a1);
    v('(population) Ana partie, Dan est l\'organisateur', ligne(sid3, dan.id).grade, 2);
    const rb3 = await entrer(a1, rid3);
    v('⛔ Ana REVIENT : hôte (grade 2, pas intérimaire) ; Dan GARDE son rôle (grade 2, pas intérimaire) — l\'organisation lui a été confiée, pas prêtée', [rb3.code, rb3.j.appel.moi.grade, !!rb3.j.appel.moi.interim, ligne(sid3, dan.id).grade, !!(await moi(d1, sid3)).interim], [200, 2, false, 2, false]);
    v('… Cléo, simple participante, n\'a rien gagné (grade 0)', ligne(sid3, cleo.id).grade, 0);
    await vider();

    /* ═══ 4. CONTRE-ÉPREUVES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n4. Contre-épreuves : l\'intérim d\'avant n\'a pas bougé');
    const rid4 = await programmer();
    const code4 = (await a1.post('/api/reunions/' + rid4 + '/lien', {})).j.code;
    const ra4 = await entrer(a1, rid4), sid4 = ra4.j.appel.id;
    await pause(); const rf4 = await entrerLien(f1, code4);
    v('(population) Fay n\'est entrée que par le lien, seule avec Ana', [rf4.code, ligne(sid4, fay.id)], [200, { statut: 'present', grade: 0 }]);
    await quitter(a1);
    const moiF = await moi(f1, sid4);
    v('Ana part et il ne reste que Fay (le lien) : la salle n\'est pas sans maître — Fay a la porte (grade 2) mais elle est INTÉRIMAIRE', [ligne(sid4, fay.id).grade, !!moiF.interim], [2, true]);
    v('⛔ … et elle n\'a pas les armes : exclure et verrouiller → 403 interdit (la porte, pas l\'organisation)', [dit(await POST(f1, sid4, 'exclure', { uid: gus.id })), dit(await POST(f1, sid4, 'verrouiller', { actif: true }))], [[403, 'interdit'], [403, 'interdit']]);
    await vider();

    const rid4b = await programmer();
    const rd4 = await entrer(d1, rid4b), sid4b = rd4.j.appel.id;
    v('L\'organisatrice n\'est JAMAIS venue : Dan entre le premier, intérimaire (grade 2, `interim`), sans les armes (verrou : 403)', [rd4.j.appel.moi.grade, !!rd4.j.appel.moi.interim, dit(await POST(d1, sid4b, 'verrouiller', { actif: true }))], [2, true, [403, 'interdit']]);
    await pause(); await entrer(c1, rid4b);
    await quitter(d1);
    v('Dan (intérimaire) part : Cléo reçoit la porte, intérimaire à son tour (l\'organisatrice n\'est toujours pas venue) — verrou : 403', [ligne(sid4b, cleo.id).grade, !!(await moi(c1, sid4b)).interim, dit(await POST(c1, sid4b, 'verrouiller', { actif: true }))], [2, true, [403, 'interdit']]);
    const rA = await entrer(a1, rid4b);
    v('Ana arrive alors pour la première fois : elle reprend la main, l\'intérimaire retombe à 0 (inchangé)', [rA.j.appel.moi.grade, ligne(sid4b, cleo.id).grade], [2, 0]);
    await quitter(a1);
    v('⛔ … et quand Ana, venue, repart : Cléo, nommée, devient CETTE FOIS l\'organisatrice (verrou : 200)', [ligne(sid4b, cleo.id).grade, !!(await moi(c1, sid4b)).interim, dit(await POST(c1, sid4b, 'verrouiller', { actif: true }))], [2, false, [200, undefined]]);
    await vider();

    /* ═══ 5. LA PAGE : LA PHRASE DIT CE QUE LE SERVICE FAIT ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n5. La phrase du panneau « Quitter »');
    const M = P.monter({ htmlQuitter: P.decl('function htmlQuitter(') }, {});
    vrai('(population) `htmlQuitter` est trouvée dans la page', !!M.F.htmlQuitter && M.absents.length === 0);
    const reunion = M.F.htmlQuitter({ snap: { genre: 'reunion' } }), groupe = M.F.htmlQuitter({ snap: { genre: 'groupe' } });
    vrai('⛔ une réunion : « Tu organises cette réunion … l\'invité suivant dans la salle en devient l\'organisateur, avec tous les gestes d\'un hôte »', /Tu organises cette réunion/.test(reunion) && /l'invité suivant dans la salle en devient l'organisateur, avec tous les gestes d'un hôte/.test(reunion));
    vrai('   … et elle ne promet plus « le rôle passe à une autre personne » (ce que le service ne faisait qu\'à moitié)', !/le rôle passe à une autre personne/.test(reunion) && !/le rôle passe à une autre personne/.test(groupe));
    vrai('   un appel de groupe : « hôte de cet appel … le participant suivant en devient l\'hôte, avec tous tes gestes » (la réunion n\'est pas nommée)', /hôte de cet appel/.test(groupe) && /le participant suivant en devient l'hôte, avec tous tes gestes/.test(groupe) && !/réunion/.test(groupe));
    vrai('   les trois gestes sont toujours là : quitter-simple, terminer-confirmer, panneau-fermer', ['quitter-simple', 'terminer-confirmer', 'panneau-fermer'].every(a => reunion.indexOf('data-sa="' + a + '"') > 0));
  } finally {
    await svc.arreter();
  }
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
