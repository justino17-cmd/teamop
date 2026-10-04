/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS PROGRAMMÉES ONT UNE SALLE : LA FENÊTRE, LE LIEN D'INVITÉ, LA SALLE D'ATTENTE (famille 2 de SERVEUR.md § 3.11, étape 8).

   Le VRAI service, isolé, parlé en HTTP, une horloge qu'on avance. Une réunion programmée (étape 6) s'ouvre en salle (étape 8) :

     · ⛔ LA FENÊTRE : on entre de quinze minutes avant le début à trois heures après la fin — le service l'IMPOSE (409 `reunion_hors_horaire`, avec l'heure d'ouverture), une série a une fenêtre par occurrence,
       une annulée n'a plus de salle ;
     · la salle est ouverte par le PREMIER qui entre (elle n'appelle personne), dans le type qu'il a choisi ; l'organisateur qui arrive REPREND la main ; la salle d'attente de la réunion s'applique aux invités ;
     · ⛔ LE LIEN D'INVITÉ : 128 bits, jamais rangé en clair (empreinte + scellé), lu et RENOUVELÉ par l'hôte seul — le renouvellement tue l'ancien, qui est noté au registre des purges ; mort aussi à l'annulation ;
       l'aperçu est PUBLIC et limité : de quoi décider, jamais un nom ; un code inconnu, renouvelé, annulé ou échu reçoit la MÊME réponse ;
     · entrer par le lien exige un compte, inscrit la personne (invitée « acceptée », membre de la discussion) — mais ⛔ UN REFUS N'ÉCRIT RIEN : venue hors fenêtre, elle n'est encore rien ;
     · l'annulation, la suppression d'une réunion ou la sortie de son hôte ferment la salle.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé d'un cas qui réussit. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);
const dit = (rep) => [rep.code, rep.j && rep.j.error];

async function monter(config) {
  const svc = await T.lancerService({ horloge: true, config });
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const chemin = path.join(svc.data, 'msg.db');
  const S = ouvrir({ chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom, origine) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: origine || 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  const brut = (req, ...a) => { const d = T.lireBase(chemin); try { return d.prepare(req).all(...a); } finally { d.close(); } };
  return { svc, S, chemin, pers, cl, avancer, maintenant, brut, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}
const octetsBase = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };

(async () => {
  const flux = [];
  const M = await monter({ appels: { balayageMs: 1000, perduMs: 600000 } });
  const { svc, S, pers, cl } = M;
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
    for (const p of [ben, cleo, dan, eve]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve), anon = T.client(svc.base);
    const programmer = async (c, o) => {
      const debut = o.debut === undefined ? M.maintenant() + 2 * HEURE : o.debut;
      const r = await c.post('/api/reunions', Object.assign({ titre: 'Point d\'équipe', debut, fin: debut + HEURE, invites: [ben.id] }, o.corps || {}));
      if (r.code !== 201) throw new Error('programmer : ' + r.code + ' ' + JSON.stringify(r.j));
      const fiche = (await c.get('/api/reunions/' + r.j.reunion.id)).j.reunion;
      return { id: fiche.id, conv: fiche.conv, debut: fiche.debut, fin: fiche.fin };
    };
    const lien = async (c, r) => (await c.post('/api/reunions/' + r.id + '/lien', {})).j.code;

    /* ═══════ 1. LA FENÊTRE ═══════ */
    console.log('La fenêtre : quinze minutes avant le début, trois heures après la fin — le service l\'impose');
    const R1 = await programmer(a1, {});
    {
      const tot = await b1.post('/api/reunions/' + R1.id + '/rejoindre', {});
      v('⛔ deux heures avant : 409 `reunion_hors_horaire` avec l\'heure d\'ouverture (quinze minutes avant le début) — et rien n\'est écrit', [dit(tot), tot.j.ouvre_a === R1.debut - 15 * MIN, S.salleDeReunion(R1.id)], [[409, 'reunion_hors_horaire'], true, null]);
      const fiche = (await b1.get('/api/reunions/' + R1.id)).j;
      v('la fiche le dit : pas rejoignable, pas ouverte', [fiche.salle.rejoignable, fiche.salle.ouverte, fiche.salle.occurrence], [false, false, null]);
      M.avancer(2 * HEURE - 15 * MIN - SEC);
      v('une seconde avant l\'ouverture : toujours 409', dit(await b1.post('/api/reunions/' + R1.id + '/rejoindre', {})), [409, 'reunion_hors_horaire']);
      M.avancer(SEC);
      const ouv = await b1.post('/api/reunions/' + R1.id + '/rejoindre', {});
      v('⛔ à l\'ouverture : Ben entre (200) — il a ouvert la salle, personne n\'y sonne, la salle COURT d\'emblée ; il en est l\'hôte PAR INTÉRIM (une salle n\'est jamais sans maître : personne d\'autre ne pourrait admettre qui frappe)', [ouv.code, ouv.j.appel.genre, ouv.j.etat, ouv.j.appel.moi, ouv.j.appel.reunion === R1.id, ouv.j.appel.capacite], [200, 'reunion', 'en_cours', { statut: 'present', grade: 2, gen: 1 }, true, 4]);
      v('⛔ personne n\'a été appelé : aucun événement `appel` chez Ana (l\'hôte), aucune sonnerie', [S.evenementsPour(ana.id, 0, 1000).evenements.filter(e => e.event === 'appel' && e.data.id === ouv.j.appel.id).length], [0]);
      const fiche2 = (await a1.get('/api/reunions/' + R1.id)).j;
      v('la fiche d\'Ana : la salle est OUVERTE (« Rejoindre » avec une salle qui existe), rejoignable', [fiche2.salle.rejoignable, fiche2.salle.ouverte, fiche2.salle.occurrence.debut === R1.debut], [true, true, true]);
      const ag = (await a1.get('/api/reunions?du=' + (M.maintenant() - JOUR) + '&au=' + (M.maintenant() + JOUR))).j.reunions.find(x => x.id === R1.id);
      v('l\'agenda le dit aussi (`rejoignable`)', ag.rejoignable, true);
      const sa = await a1.get('/api/appels');
      v('⛔ Ana, l\'organisatrice, voit la salle OUVERTE parmi ses salles à rejoindre (la bannière « Rejoindre »)', [sa.j.salles.map(x => [x.id === ouv.j.appel.id, x.genre, x.reunion === R1.id, x.nb, x.titre])], [[[true, 'reunion', true, 1, 'Point d\'équipe']]]);
      /* l'organisatrice entre : elle REPREND la main */
      const ra = await a1.post('/api/reunions/' + R1.id + '/rejoindre', {});
      v('⛔ l\'organisatrice arrive : elle REPREND la main (hôte, grade 2) ; Ben, l\'hôte par intérim, devient co-hôte (grade 1) ; la salle court (deux présents)', [ra.j.appel.moi.grade, S.appelAcces(ouv.j.appel.id, ben.id).grade, ra.j.appel.nb, ra.j.etat], [2, 1, 2, 'en_cours']);
      const rb = await b1.post('/api/reunions/' + R1.id + '/rejoindre', {});
      v('le MÊME appareil de Ben rejoint deux fois : `deja`, sans rien écrire', [rb.code, rb.j.deja], [200, true]);
      v('⛔ un non-invité (Dan) reçoit le MÊME 404 qu\'une réunion qui n\'existe pas', [dit(await d1.post('/api/reunions/' + R1.id + '/rejoindre', {})), (await d1.post('/api/reunions/' + R1.id + '/rejoindre', {})).txt === (await d1.post('/api/reunions/r_' + '0'.repeat(32) + '/rejoindre', {})).txt], [[404, 'introuvable'], true]);
      v('le type : `audio` ou `video` — autre chose est refusé (400)', dit(await a1.post('/api/reunions/' + R1.id + '/rejoindre', { type: 'hologramme' })), [400, 'champ_invalide']);
      /* après la fin */
      await a1.post('/api/appels/' + ouv.j.appel.id + '/quitter', {}); await b1.post('/api/appels/' + ouv.j.appel.id + '/quitter', {});
      v('population : la salle est finie (plus personne dedans)', [S.salleDeReunion(R1.id), S.appelVue(ana.id, ouv.j.appel.id).etat], [null, 'fini']);
    }
    {
      /* — le bord haut de la fenêtre (3 h après la fin) — */
      const R2 = await programmer(a1, { debut: M.maintenant() + 20 * MIN });
      M.avancer(20 * MIN + HEURE + 3 * HEURE);
      M.avancer(-2 * SEC);                                             // l'horloge du service court pendant les requêtes : deux secondes de marge avant le bord
      const au_bord = await b1.post('/api/reunions/' + R2.id + '/rejoindre', {});
      M.avancer(4 * SEC);
      const apres = await b1.post('/api/reunions/' + R2.id + '/rejoindre', {});
      v('⛔ la fenêtre se ferme trois heures après la fin : deux secondes avant le bord, 200 ; deux secondes après, 409 (et la fiche dit « pas rejoignable »)', [au_bord.code, dit(apres), (await b1.get('/api/reunions/' + R2.id)).j.salle.rejoignable], [200, [409, 'reunion_hors_horaire'], false]);
      v('   pour une réunion PASSÉE, l\'heure d\'ouverture est null (aucune prochaine)', apres.j.ouvre_a, null);
      await b1.post('/api/appels/' + au_bord.j.appel.id + '/quitter', {});
    }
    {
      /* — une SÉRIE : une fenêtre par occurrence — */
      const R3 = await programmer(a1, { debut: M.maintenant() + 3 * HEURE, corps: { repetition: 'quotidienne' } });
      const debut = R3.debut;
      const tot = await b1.post('/api/reunions/' + R3.id + '/rejoindre', {});
      M.avancer(3 * HEURE - 10 * MIN);
      const ok1 = await b1.post('/api/reunions/' + R3.id + '/rejoindre', {});
      await b1.post('/api/appels/' + ok1.j.appel.id + '/quitter', {});
      M.avancer(HEURE + 10 * MIN + 6 * HEURE);                       // le milieu de la nuit : bien après la fenêtre d'hier, bien avant celle de demain
      const entre = await b1.post('/api/reunions/' + R3.id + '/rejoindre', {});
      v('⛔ une série quotidienne : fermée avant, ouverte dix minutes avant la première occurrence, FERMÉE entre deux (409, avec l\'ouverture de la suivante) — puis la nuit', [dit(tot), ok1.code, dit(entre), entre.j.ouvre_a === debut + JOUR - 15 * MIN], [[409, 'reunion_hors_horaire'], 200, [409, 'reunion_hors_horaire'], true]);
    }
    {
      /* — une réunion ANNULÉE n'a plus de salle — */
      const debut = M.maintenant() + 5 * MIN;
      const R4 = await programmer(a1, { debut });
      const salle = await b1.post('/api/reunions/' + R4.id + '/rejoindre', {});
      await a1.post('/api/reunions/' + R4.id + '/rejoindre', {});
      const an = await a1.post('/api/reunions/' + R4.id + '/annuler', {});
      v('⛔ l\'hôte ANNULE la réunion pendant que la salle est ouverte : la salle est fermée pour tous, plus personne n\'est « actif »', [an.code, S.appelVue(ana.id, salle.j.appel.id).etat, S.appelActifDe(ben.id), S.appelActifDe(ana.id), S.salleDeReunion(R4.id)], [200, 'fini', null, null, null]);
      v('   la fin de la salle est dite aux pages de ceux qui y étaient (un événement `appel` pour Ben), et son motif est « annulée »', [S.evenementsPour(ben.id, 0, 1000).evenements.filter(e => e.event === 'appel' && e.data.id === salle.j.appel.id).map(e => e.data.etat).pop(), S.appelVue(ben.id, salle.j.appel.id).motif], ['fini', 'annulee']);
      v('   et personne n\'y rentre plus : 409 `reunion_annulee`', dit(await b1.post('/api/reunions/' + R4.id + '/rejoindre', {})), [409, 'reunion_annulee']);
      const R5 = await programmer(a1, { debut: M.maintenant() + 5 * MIN });
      const s5 = await b1.post('/api/reunions/' + R5.id + '/rejoindre', {});
      const su = await a1.post('/api/reunions/' + R5.id + '/supprimer', {});
      v('⛔ l\'hôte SUPPRIME la réunion pendant que la salle est ouverte : la salle se ferme (l\'historique de l\'appel reste à ceux qui y étaient)', [su.code, S.appelVue(ben.id, s5.j.appel.id).etat, S.appelActifDe(ben.id), S.salleDeReunion(R5.id)], [200, 'fini', null, null]);
    }

    /* ═══════ 2. LA SALLE D'ATTENTE DE LA RÉUNION ═══════ */
    console.log('\nLa salle d\'attente d\'une réunion : les invités attendent, l\'organisateur et ses co-hôtes passent');
    {
      const debut = M.maintenant() + 5 * MIN;
      const R = await programmer(a1, { debut, corps: { salle_attente: true, invites: [ben.id, cleo.id], type: undefined } });
      const fiche = (await a1.get('/api/reunions/' + R.id)).j;
      v('la réunion porte le réglage `attente` (créée avec `salle_attente:true`) ; un autre type de valeur est refusé (400)', [fiche.reunion.attente, dit(await a1.post('/api/reunions', { titre: 'x', debut: debut + JOUR, fin: debut + JOUR + HEURE, invites: [], salle_attente: 'oui' }))], [true, [400, 'champ_invalide']]);
      const rb = await b1.post('/api/reunions/' + R.id + '/rejoindre', {});
      v('⛔ Ben est le premier : personne ne tient la porte — la salle d\'attente ne l\'arrête pas (il serait attendu pour toujours) : il entre, hôte par intérim', [rb.code, rb.j.attente, rb.j.appel.moi.statut, rb.j.appel.moi.grade], [200, false, 'present', 2]);
      const rc = await c1.post('/api/reunions/' + R.id + '/rejoindre', {});
      v('⛔ Cleo, la seconde : la salle d\'attente s\'applique — elle ATTEND (`attente:true`), pas encore présente, elle ne lit pas la liste', [rc.code, rc.j.attente, rc.j.appel.moi.statut, rc.j.appel.participants, rc.j.appel.nb], [200, true, 'attente', [], 1]);
      const ra = await a1.post('/api/reunions/' + R.id + '/rejoindre', {});
      v('l\'organisatrice, elle, passe la porte (hôte, elle reprend la main) et VOIT Cleo à la porte', [ra.j.attente, ra.j.appel.moi.statut, ra.j.appel.moi.grade, ra.j.appel.en_attente], [false, 'present', 2, 1]);
      const ad = await a1.post('/api/salles/' + ra.j.appel.id + '/admettre', { uid: cleo.id });
      v('elle admet Cleo : présente, la salle COURT', [ad.code, ad.j.admis, (await c1.get('/api/salles/' + ra.j.appel.id)).j.appel.moi.statut, (await c1.get('/api/salles/' + ra.j.appel.id)).j.appel.etat], [200, 1, 'present', 'en_cours']);
      await a1.post('/api/reunions/' + R.id + '/modifier', { salle_attente: false });
      v('modifier la réunion (`salle_attente:false`) : le réglage change pour la PROCHAINE salle, pas celle qui est ouverte', [(await a1.get('/api/reunions/' + R.id)).j.reunion.attente, (await a1.get('/api/salles/' + ra.j.appel.id)).j.appel.attente], [false, true]);
      await a1.post('/api/appels/' + ra.j.appel.id + '/quitter', {}); await b1.post('/api/appels/' + ra.j.appel.id + '/quitter', {}); await c1.post('/api/appels/' + ra.j.appel.id + '/quitter', {});
    }

    /* ═══════ 3. LE LIEN D'INVITÉ ═══════ */
    console.log('\nLe lien d\'invité : 128 bits, jamais en clair, lu et renouvelé par l\'hôte seul — l\'aperçu est public et ne dit rien de plus qu\'il ne faut');
    const R6 = await programmer(a1, { debut: M.maintenant() + 6 * HEURE, corps: { titre: 'Visio client CANARI-LIEN', invites: [ben.id] } });
    let code6 = null;
    {
      code6 = await lien(a1, R6);
      v('l\'hôte obtient son lien : 22 caractères base64url (128 bits), et le MÊME code la fois suivante', [/^[A-Za-z0-9_-]{22}$/.test(code6), await lien(a1, R6) === code6], [true, true]);
      v('⛔ un invité qui n\'est pas l\'hôte ne lit PAS le lien (403 `interdit`), un non-invité reçoit le 404 d\'une réunion inconnue', [dit(await b1.post('/api/reunions/' + R6.id + '/lien', {})), dit(await c1.post('/api/reunions/' + R6.id + '/lien', {}))], [[403, 'interdit'], [404, 'introuvable']]);
      const lien_res = await a1.post('/api/reunions/' + R6.id + '/lien', {});
      v('   `Cache-Control: no-store` (un lien ne se met pas en cache)', lien_res.h.get('cache-control'), 'no-store');
      const base = octetsBase(M.chemin);
      v('⛔ le code n\'est JAMAIS rangé en clair : ni dans la base ni dans son journal (l\'empreinte et le scellé y sont)', [base.includes(Buffer.from(code6)), M.brut('SELECT code_h, length(code_ch) AS l FROM reunion WHERE id = ?', R6.id).map(x => [typeof x.code_h, x.code_h.length, x.l > 22])], [false, [['string', 64, true]]]);
      v('   l\'empreinte n\'est pas le code (un HMAC à clé : on ne retrouve pas le code depuis la base)', M.brut('SELECT code_h FROM reunion WHERE id = ?', R6.id)[0].code_h === sha(code6), false);
      /* l'aperçu */
      const ap = await anon.post('/api/reunions/apercu', { code: code6 });
      v('⛔ l\'aperçu est PUBLIC (aucun cookie) : titre, horaire, en cours ?, salle d\'attente ? — et `compte_requis`', [ap.code, Object.keys(ap.j.reunion).sort(), ap.j.reunion.titre, ap.j.reunion.debut === R6.debut, ap.j.reunion.en_cours, ap.j.compte_requis], [200, ['attente', 'debut', 'en_cours', 'fin', 'titre'], 'Visio client CANARI-LIEN', true, false, true]);
      const txt = JSON.stringify(ap.j);
      v('⛔ … jamais un nom, un identifiant de personne, la conversation, le lieu, l\'identifiant de la réunion', [txt.includes('Ana'), txt.includes(ana.id), txt.includes(R6.id), txt.includes(R6.conv), /"(hote|lieu|conv|invites|participants)"/.test(txt)], [false, false, false, false, false]);
      v('   `Cache-Control: no-store`', ap.h.get('cache-control'), 'no-store');
      const inconnus = [await anon.post('/api/reunions/apercu', { code: 'A'.repeat(22) }), await anon.post('/api/reunions/apercu', { code: 'court' }), await anon.post('/api/reunions/apercu', { code: 42 }), await anon.post('/api/reunions/apercu', {}), await anon.post('/api/reunions/apercu', { code: code6 + 'x' }), await anon.post('/api/reunions/apercu', { code: { $ne: 1 } })];
      v('⛔ un code inconnu, mal formé, d\'un autre type, absent : TOUS la même réponse (410 `lien_invalide`, au caractère près)', [inconnus.map(dit), new Set(inconnus.map(x => x.txt)).size], [new Array(6).fill([410, 'lien_invalide']), 1]);
      /* renouveler */
      const avantPurge = M.brut(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'reunion_lien'`)[0].n;
      const ren = await a1.post('/api/reunions/' + R6.id + '/lien/renouveler', {});
      v('⛔ l\'hôte RENOUVELLE : un code neuf, l\'ancien MEURT (aperçu et entrée : 410), et l\'ancien est noté au registre des purges (une ligne, son empreinte)', [ren.code, ren.j.code !== code6 && /^[A-Za-z0-9_-]{22}$/.test(ren.j.code), ren.j.ancien, dit(await anon.post('/api/reunions/apercu', { code: code6 })), dit(await c1.post('/api/reunions/rejoindre', { code: code6 })), M.brut(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'reunion_lien'`)[0].n - avantPurge], [200, true, true, [410, 'lien_invalide'], [410, 'lien_invalide'], 1]);
      v('   le nouveau code marche (aperçu 200) ; le registre porte l\'empreinte de l\'ANCIEN, jamais son code', [(await anon.post('/api/reunions/apercu', { code: ren.j.code })).code, octetsBase(M.chemin).includes(Buffer.from(code6))], [200, false]);
      v('⛔ un invité ne renouvelle pas (403), un non-invité non plus (404) — et rien n\'est écrit', [dit(await b1.post('/api/reunions/' + R6.id + '/lien/renouveler', {})), dit(await c1.post('/api/reunions/' + R6.id + '/lien/renouveler', {})), M.brut(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'reunion_lien'`)[0].n - avantPurge], [[403, 'interdit'], [404, 'introuvable'], 1]);
      code6 = ren.j.code;
      /* l'annulation tue le lien */
      const R7 = await programmer(a1, { debut: M.maintenant() + 6 * HEURE });
      const c7 = await lien(a1, R7);
      await a1.post('/api/reunions/' + R7.id + '/annuler', {});
      v('⛔ une réunion ANNULÉE : son lien est mort (410), comme un code inconnu', dit(await anon.post('/api/reunions/apercu', { code: c7 })), [410, 'lien_invalide']);
      /* le plafond de l'aperçu */
      const codes = [];
      for (let i = 0; i < 32; i++) codes.push((await anon.post('/api/reunions/apercu', { code: code6 })).code);
      v('⛔ l\'aperçu est limité (trente par minute et par réseau) : les premiers passent, puis 429 `quota_atteint`', [codes[0], codes.includes(429)], [200, true]);
    }

    /* ═══════ 4. ENTRER PAR LE LIEN ═══════ */
    console.log('\nEntrer par le lien : un compte, une inscription — et un refus n\'écrit rien');
    {
      const R = await programmer(a1, { debut: M.maintenant() + 3 * HEURE, corps: { invites: [] } });
      const code = await lien(a1, R);
      const avant = [M.brut('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', R.id)[0].n, M.brut('SELECT COUNT(*) AS n FROM membre WHERE conv = ?', R.conv)[0].n];
      const tot = await c1.post('/api/reunions/rejoindre', { code });
      v('⛔ Cleo suit le lien TROP TÔT : 409 `reunion_hors_horaire` avec l\'heure d\'ouverture — et elle n\'est RIEN (ni invitée, ni membre de la discussion)', [dit(tot), tot.j.ouvre_a === R.debut - 15 * MIN, M.brut('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', R.id)[0].n, M.brut('SELECT COUNT(*) AS n FROM membre WHERE conv = ?', R.conv)[0].n], [[409, 'reunion_hors_horaire'], true, avant[0], avant[1]]);
      v('⛔ sans compte : 401 `session_requise` (en v1, le lien ne suffit pas à entrer)', dit(await anon.post('/api/reunions/rejoindre', { code })), [401, 'session_requise']);
      v('⛔ un code inconnu, renouvelé ou mal formé : 410 `lien_invalide` ; un corps sans code : 400', [dit(await c1.post('/api/reunions/rejoindre', { code: 'B'.repeat(22) })), dit(await c1.post('/api/reunions/rejoindre', { code: 'x' })), dit(await c1.post('/api/reunions/rejoindre', {}))], [[410, 'lien_invalide'], [410, 'lien_invalide'], [400, 'champ_invalide']]);
      M.avancer(3 * HEURE - 15 * MIN);
      const ok = await c1.post('/api/reunions/rejoindre', { code, type: 'audio' });
      v('à l\'ouverture : Cleo entre par le lien (200), elle ouvre la salle EN AUDIO (six places), elle est présente, et l\'identifiant de la réunion lui est rendu', [ok.code, ok.j.reunion === R.id, ok.j.appel.type, ok.j.appel.capacite, ok.j.appel.moi.statut], [200, true, 'audio', 6, 'present']);
      v('⛔ elle est désormais INVITÉE (« accepté ») et MEMBRE de la discussion : elle la lit, l\'agenda la liste, la fiche s\'ouvre', [M.brut(`SELECT statut FROM reunion_invite WHERE reunion = ? AND uid = ?`, R.id, cleo.id).map(x => x.statut), (await c1.get('/api/conversations/' + R.conv + '/messages')).code, (await c1.get('/api/reunions?du=' + (M.maintenant() - JOUR) + '&au=' + (M.maintenant() + JOUR))).j.reunions.some(x => x.id === R.id), (await c1.get('/api/reunions/' + R.id)).code], [['accepte'], 200, true, 200]);
      v('   elle entre aussi par l\'identifiant, désormais (R : invitée)', (await c1.post('/api/reunions/' + R.id + '/rejoindre', {})).j.deja, true);
      v('Dan, lui, n\'a pas le lien : la réunion est pour lui le 404 d\'une réunion inconnue', dit(await d1.post('/api/reunions/' + R.id + '/rejoindre', {})), [404, 'introuvable']);
      await c1.post('/api/appels/' + ok.j.appel.id + '/quitter', {});
      const essais = [];
      for (let i = 0; i < 24; i++) essais.push((await d1.post('/api/reunions/rejoindre', { code: 'C'.repeat(22) })).code);
      v('⛔ l\'entrée par le lien est limitée (vingt par heure et par compte) : les premiers essais sont des 410 (code inconnu), puis 429 `quota_atteint` — un code de 128 bits ne se devine pas, mais le service ne se laisse pas marteler', [essais[0], essais.indexOf(429) >= 15 && essais.indexOf(429) <= 21, essais[essais.length - 1]], [410, true, 429]);
    }
    {
      /* — le lien meurt avec la série : un jour après la fin de la dernière occurrence — */
      const debut = M.maintenant() + 2 * HEURE;
      const R = await programmer(a1, { debut, corps: { invites: [], repetition: 'quotidienne', n: 2 } });
      const code = await lien(a1, R);
      v('une série de DEUX occurrences : le lien vit', (await anon.post('/api/reunions/apercu', { code })).code, 200);
      M.avancer(2 * HEURE + JOUR + HEURE + 24 * HEURE - MIN);
      const encore = (await anon.post('/api/reunions/apercu', { code })).code;
      M.avancer(2 * MIN);
      const mort = await anon.post('/api/reunions/apercu', { code });
      v('⛔ le lien meurt un jour après la fin de la DERNIÈRE occurrence (une minute avant : vivant ; une minute après : 410)', [encore, dit(mort)], [200, [410, 'lien_invalide']]);
      /* une réunion SEULE : un jour après sa fin (la fenêtre d'entrée, elle, s'est fermée trois heures après) */
      const R8 = await programmer(a1, { debut: M.maintenant() + 2 * HEURE, corps: { invites: [] } });
      const c8 = await lien(a1, R8);
      M.avancer(2 * HEURE + HEURE + 24 * HEURE - MIN);
      const vivant = (await anon.post('/api/reunions/apercu', { code: c8 })).code;
      const horsFenetre = await c1.post('/api/reunions/rejoindre', { code: c8 });
      M.avancer(2 * MIN);
      const mort8 = await anon.post('/api/reunions/apercu', { code: c8 });
      v('⛔ une réunion SEULE : son lien vit encore un jour après sa fin (mais la salle est fermée depuis trois heures : 409, sans heure de réouverture), puis meurt (410)', [vivant, dit(horsFenetre), horsFenetre.j.ouvre_a, dit(mort8)], [200, [409, 'reunion_hors_horaire'], null, [410, 'lien_invalide']]);
    }

    /* ═══════ 5. LA SORTIE DE L'HÔTE, LA SUPPRESSION D'UN COMPTE ═══════ */
    console.log('\nUn invité qu\'on retire n\'entre plus ; la salle suit la réunion');
    {
      const R = await programmer(a1, { debut: M.maintenant() + 5 * MIN, corps: { invites: [ben.id, cleo.id] } });
      const rb = await b1.post('/api/reunions/' + R.id + '/rejoindre', {});
      const rc = await c1.post('/api/reunions/' + R.id + '/rejoindre', {});
      await c1.post('/api/appels/' + rc.j.appel.id + '/quitter', {});
      v('population : Cleo est entrée dans la salle puis en est sortie (elle y a une ligne « parti »), la salle court pour Ben', [rc.code, S.appelAcces(rb.j.appel.id, cleo.id).statut, S.appelVue(ben.id, rb.j.appel.id).etat], [200, 'parti', 'en_cours']);
      await a1.post('/api/reunions/' + R.id + '/retirer', { uid: cleo.id });
      v('⛔ Cleo, RETIRÉE de la réunion, n\'entre plus — ni par la réunion ni par l\'identifiant de l\'appel, bien qu\'elle y ait une ligne « parti » (404) — et la salle n\'est plus dans ses salles à rejoindre', [dit(await c1.post('/api/reunions/' + R.id + '/rejoindre', {})), dit(await c1.post('/api/appels/' + rb.j.appel.id + '/rejoindre', {})), (await c1.get('/api/appels')).j.salles.filter(x => x.reunion === R.id)], [[404, 'introuvable'], [404, 'introuvable'], []]);
      await b1.post('/api/appels/' + rb.j.appel.id + '/quitter', {});
      v('⛔ Ben, qui avait ouvert la salle, part : la salle se ferme avec son dernier occupant', [S.salleDeReunion(R.id), S.appelVue(ben.id, rb.j.appel.id).etat], [null, 'fini']);
      const rb2 = await b1.post('/api/reunions/' + R.id + '/rejoindre', {});
      v('… et la fenêtre étant toujours ouverte, une NOUVELLE salle s\'ouvre à la prochaine entrée (une autre ligne d\'appel)', [rb2.code, rb2.j.appel.id !== rb.j.appel.id, S.salleDeReunion(R.id) === rb2.j.appel.id], [200, true, true]);
      await b1.post('/api/appels/' + rb2.j.appel.id + '/quitter', {});
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
  await M.fermer();
  fin();
})();
