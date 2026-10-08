/* ⛔ CE QUE CE FICHIER GARDE — LES SALLES VIVENT AVEC LE TEMPS : LA SONNERIE ÉCHUE, L'APPAREIL PERDU, LE REDÉMARRAGE, L'EFFACEMENT D'UN COMPTE, LA RESTAURATION (famille 3 + 5, étape 8).

   Le VRAI service, son balayeur qui tourne pour de bon, une horloge qu'on AVANCE au geste (`svc.avancer` : les dates avancent, les minuteries non) — jamais un sommeil. Les pushs sont DÉCHIFFRÉS (RFC 8291) sur un
   faux service push : c'est la seule preuve de ce qui part vraiment, et on les reconnaît à leur ÉTIQUETTE (`appel:<identifiant>`), pas à leur rang.

     · la sonnerie d'un appel de groupe : UN push par invité qui sonne (« Appel de groupe de … » avec l'aperçu), AUCUN pour l'hôte, un « manqué » pour celui qui était occupé ;
     · +45 s : UN manqué par invité resté sans réponse — un push, une notification — jamais deux, ni au passage suivant, ni après un redémarrage ; celui qui est entré n'a rien ;
     · un redémarrage ne coupe pas une salle qui court (les appareils liés tiennent), et rattrape la sonnerie échue pendant l'arrêt ;
     · l'appareil PERDU sort de la salle seul — elle continue pour les autres, l'hôte perdu passe la main, le dernier perdu la finit ; les `pouls` gardent en vie ;
     · la demande de suppression d'un compte fait SORTIR la personne de la salle à l'instant (elle continue pour les autres), ses sessions sont coupées ;
     · ⛔ une restauration rend leur place aux lignes d'une salle (plus personne « présent », « à la porte » ni « appelé »), sans sonner, sans notifier, sans bandeau REC — et le registre des purges rejoue la mort
       d'un lien d'invité renouvelé depuis l'archive, SANS doublon.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de ce qu'il aurait pu compter. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const STOCK = require(path.join(T.SERVICE, 'stockage.js'));
const { ouvrir } = STOCK;
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);
const PUSH_CFG = { ackMs: 2500, echecsMax: 2, etalementMs: 1500, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' };
function paireVapid() {
  for (;;) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const priv = e.getPrivateKey();
    if (priv.length === 32) return { pub: e.getPublicKey().toString('base64url'), priv: priv.toString('base64url') };
  }
}
const dit = (rep) => [rep.code, rep.j && rep.j.error];

async function monter(config, env) {
  const M = { config, env: env || {}, decal: 0 };
  M.maintenant = () => Date.now() + M.decal;
  const lancer = async (reprise) => {
    const svc = await T.lancerService(Object.assign({ horloge: true, config: M.config, env: M.env }, reprise ? { dossier: M.svc.racine, port: M.svc.port, cle: M.svc.cle, decalageInitial: M.decal } : {}));
    if (!reprise) { M.decal = ZERO - Date.now(); svc.avancer(M.decal); }
    M.svc = svc;
    M.chemin = path.join(svc.data, 'msg.db');
    M.S = ouvrir({ chemin: M.chemin, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: M.maintenant });
  };
  M.avancer = (ms) => { M.decal += ms; M.svc.avancer(ms); };
  M.sql = (req, ...args) => { const d = T.lireBase(M.chemin); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  M.redemarrer = async (avancerPendantArret) => {
    try { M.S.fermer(); } catch (x) { /* déjà fermé */ }
    await M.svc.arreter(false);
    if (avancerPendantArret) M.decal += avancerPendantArret;
    await lancer(true);
  };
  M.pers = (nom) => M.S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  M.cl = (p) => { const c = T.client(M.svc.base); const j = jeton(); M.S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  M.passage = async () => {
    const c = T.client(M.svc.base);
    return T.attendre(async () => { const h = (await c.get('/health')).j; return h && h.appels && typeof h.appels.ageS === 'number' && h.appels.ageS <= 1 ? h : null; }, 8000, 40);
  };
  M.fermer = async () => { try { M.S.fermer(); } catch (x) { /* déjà fermé */ } await M.svc.arreter(); };
  await lancer(false);
  return M;
}

(async () => {
  const fps = await P.fauxServicePush();
  const PAIRE = paireVapid();
  const CONFIG = { appels: { balayageMs: 300, perduMs: 45000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000, groupeSignalMax: 5000, salleEvtMax: 1000 }, balayageMs: 400, push: PUSH_CFG, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE.priv };
  const M = await monter(CONFIG, { OPMSG_TEST_PUSH: fps.hote });
  const { pers, cl, sql } = M;
  const flux = [];
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  const dev = (nom) => { const x = P.appareil(fps.endpoint(nom)); x.nom = nom; x.chemin = '/push/' + nom; return x; };
  const tous = (x) => fps.envois.filter(y => y.chemin === x.chemin).map(y => ({ charge: JSON.parse(P.dechiffrer(x, y.corps)), entetes: y.entetes, t: y.t }));
  const trouver = (x, pred, plafond = 8000) => T.attendre(() => tous(x).find(pred) || null, plafond, 15);
  const compterPush = (x, pred) => tous(x).filter(pred).length;
  const deAppel = (id, corps) => (p) => p.charge.tag === 'appel:' + id && (corps === undefined || p.charge.corps === corps);
  const nManques = (uid) => Number(sql(`SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'appel_manque'`, uid).n);
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
  for (const p of [ben, cleo, dan, eve]) M.S.contactLier(ana.id, p.id);
  M.S.contactLier(eve.id, dan.id);
  const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan), e = cl(eve);
  const A1 = dev('ana-1'), B1 = dev('ben-1'), C1 = dev('cleo-1'), D1 = dev('dan-1');
  const groupe = M.S.convCreerGroupe({ createur: ana.id, nom: 'Équipe terrain', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
  const etatSalle = (id, uid) => { const x = M.S.appelVue(uid, id); return x && x.etat; };
  const statuts = (id, uids) => uids.map(u => (M.S.appelAcces(id, u) || { statut: null }).statut);
  const pouls = async (id, ...cs) => { for (const cc of cs) await cc.post('/api/appels/' + id + '/signal', { type: 'pouls' }); };       // le signe de vie d'un appareil lié
  const libere = async (...cs) => { for (const cc of cs) { const r = await cc.get('/api/appels'); if (r.j && r.j.actif) await cc.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };
  try {
    for (const [cli, ap] of [[a, A1], [b, B1], [c, C1], [d, D1]]) await cli.post('/api/push/abonner', { sub: ap.sub });

    /* ═══════ 1. LA SONNERIE D'UN GROUPE ═══════ */
    console.log('La sonnerie d\'un appel de groupe : un push par invité qui sonne, aucun pour l\'hôte, un « manqué » pour l\'occupé');
    let idRing = null;
    {
      /* Dan est déjà dans un appel avec Eve */
      const ailleurs = await e.post('/api/appels', { uid: dan.id, type: 'audio' });
      await d.post('/api/appels/' + ailleurs.j.appel.id + '/repondre', { accepte: true });
      await b.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      const r = await a.post('/api/appels', { conv: groupe, type: 'video' });
      idRing = r.j.appel.id;
      const pb = await trouver(B1, deAppel(idRing, 'Appel vidéo')), pc = await trouver(C1, deAppel(idRing, 'Appel entrant'));
      v('⛔ Ben (aperçu activé) lit « Appel de groupe de Ana Banc » et le type ; Cleo, sans aperçu, la charge MINIMALE « Appel entrant » — rien de l\'appelante', [r.code, pb && pb.charge.detail === undefined ? pb.charge.titre : null, pb && pb.charge.corps, pc && pc.charge.corps, pc && pc.charge.titre], [201, 'Appel de groupe de Ana Banc', 'Appel vidéo', 'Appel entrant', 'OP MESSAGES']);
      v('⛔ `Urgency: high` et 30 s de vie au plus pour la sonnerie, comme un appel à deux', [pb.entetes.urgency, Number(pb.entetes.ttl) <= 30], ['high', true]);
      const pm = await trouver(D1, deAppel(idRing, 'Appel manqué'));
      v('⛔ Dan, occupé dans un autre appel, ne SONNE pas : il reçoit « Appel manqué » tout de suite (même étiquette), une seule notification', [!!pm, compterPush(D1, deAppel(idRing, 'Appel entrant')), nManques(dan.id)], [true, 0, 1]);
      v('⛔ l\'hôte ne reçoit aucun push de sa propre salle (population : Ben et Cleo ont reçu les leurs par la même route)', [compterPush(A1, p => p.charge.tag === 'appel:' + idRing), compterPush(B1, deAppel(idRing)), compterPush(C1, deAppel(idRing))], [0, 1, 1]);
      await b.post('/api/moi/maj', { prefs: { apercu_notif: false } });
    }

    /* ═══════ 2. LA SONNERIE ÉCHUE ═══════ */
    console.log('\n+45 s : UN manqué par invité resté sans réponse — un push, une notification — jamais deux ; celui qui est entré n\'a rien');
    {
      const fB = await ouvrirFlux(b), fC = await ouvrirFlux(c);
      void fB;
      await b.post('/api/appels/' + idRing + '/repondre', { accepte: true });
      const avantB = nManques(ben.id), avantC = nManques(cleo.id);
      M.avancer(23 * SEC); await pouls(idRing, a, b);              // Ana et Ben donnent signe de vie (sans cela, 46 s de silence les feraient « perdus »)
      M.avancer(23 * SEC); await pouls(idRing, a, b);
      const pm = await trouver(C1, deAppel(idRing, 'Appel manqué'));
      await M.passage();
      v('⛔ Cleo, qui n\'a pas répondu, a MANQUÉ : un push « Appel manqué », UNE notification ; Ben, qui est entré, rien ; la salle COURT toujours (Ana et Ben)', [!!pm, nManques(cleo.id) - avantC, nManques(ben.id) - avantB, etatSalle(idRing, ana.id), statuts(idRing, [ana.id, ben.id, cleo.id])], [true, 1, 0, 'en_cours', ['present', 'present', 'manque']]);
      const ev = await fC.attendre(x => x.event === 'appel' && x.data.id === idRing && x.data.moi.statut === 'manque');
      v('   la page de Cleo l\'apprend par l\'événement durable (« manqué », sa ligne)', [ev.data.moi.statut, ev.data.manque], ['manque', true]);
      const compte = [compterPush(C1, deAppel(idRing, 'Appel manqué')), nManques(cleo.id)];
      M.avancer(10 * SEC); await pouls(idRing, a, b);
      await M.passage();
      v('⛔ un SECOND passage du balayeur (qui a eu lieu APRÈS) ne refait rien : ni push ni notification', [compterPush(C1, deAppel(idRing, 'Appel manqué')), nManques(cleo.id)], compte);
      await M.redemarrer();
      await M.passage();
      await pouls(idRing, a, b);
      v('⛔ un REDÉMARRAGE ne refait rien non plus, et la salle qui court n\'est pas coupée (Ana et Ben y sont toujours)', [compterPush(C1, deAppel(idRing, 'Appel manqué')), nManques(cleo.id), etatSalle(idRing, ana.id), statuts(idRing, [ana.id, ben.id])], [compte[0], compte[1], 'en_cours', ['present', 'present']]);
      /* les appareils liés tiennent : Ben signale, Ana le reçoit encore */
      const sB = await b.post('/api/appels/' + idRing + '/signal', { type: 'pouls' });
      v('   les appareils sont toujours liés après le redémarrage : le pouls de Ben passe (200)', sB.code, 200);
      await libere(a, b);
      void fC;
    }

    /* ═══════ 3. L'APPAREIL PERDU ═══════ */
    console.log('\nL\'appareil perdu sort de la salle SEUL — elle continue pour les autres, l\'hôte perdu passe la main, le dernier perdu la finit ; les pouls gardent en vie');
    {
      const r = await a.post('/api/appels', { uids: [ben.id, cleo.id], type: 'video' });
      const id = r.j.appel.id;
      await b.post('/api/appels/' + id + '/repondre', { accepte: true });
      await c.post('/api/appels/' + id + '/repondre', { accepte: true });
      const fA = await ouvrirFlux(a);
      /* Ana et Ben donnent signe de vie toutes les 20 s ; Cleo se tait */
      for (let i = 0; i < 3; i++) {
        M.avancer(20 * SEC);
        await a.post('/api/appels/' + id + '/signal', { type: 'pouls' }); await b.post('/api/appels/' + id + '/signal', { type: 'pouls' });
        await M.passage();
      }
      const ev = await fA.attendre(x => x.event === 'appel' && x.data.id === id && x.data.nb === 2 && !x.data.participants.some(p => p.id === cleo.id));
      v('⛔ Cleo, sans signe de vie depuis plus de 45 s, SORT (« parti ») — Ana et Ben, qui ont donné leurs pouls, restent ; la salle court ; Ana l\'apprend par l\'événement durable', [statuts(id, [ana.id, ben.id, cleo.id]), etatSalle(id, ana.id), ev.data.nb], [['present', 'present', 'parti'], 'en_cours', 2]);
      v('   et son appareil est DÉLIÉ : plus un signal ne lui serait relayé', M.S.appelAcces(id, cleo.id).session, null);
      /* l'hôte se tait à son tour : Ben prend la main */
      for (let i = 0; i < 3; i++) { M.avancer(20 * SEC); await b.post('/api/appels/' + id + '/signal', { type: 'pouls' }); await M.passage(); }
      v('⛔ Ana, l\'HÔTE, se tait : elle sort, Ben (seul à avoir donné signe de vie) devient hôte, la salle court', [statuts(id, [ana.id, ben.id]), M.S.appelAcces(id, ben.id).grade, etatSalle(id, ben.id)], [['parti', 'present'], 2, 'en_cours']);
      for (let i = 0; i < 3; i++) { M.avancer(20 * SEC); await M.passage(); }
      v('⛔ le DERNIER se tait aussi : la salle finit (« fini », motif « perdu »), plus personne n\'est « actif »', [etatSalle(id, ben.id), M.S.appelVue(ben.id, id).motif, M.S.appelActifDe(ben.id)], ['fini', 'perdu', null]);
    }

    /* ═══════ 4. L'EFFACEMENT D'UN COMPTE ═══════ */
    console.log('\nLa demande de suppression d\'un compte fait SORTIR la personne de la salle à l\'instant ; elle continue pour les autres');
    {
      const r = await a.post('/api/appels', { uids: [ben.id, cleo.id], type: 'audio' });
      const id = r.j.appel.id;
      await b.post('/api/appels/' + id + '/repondre', { accepte: true });
      await c.post('/api/appels/' + id + '/repondre', { accepte: true });
      const fB = await ouvrirFlux(b);
      const q = await a.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      const ev = await fB.attendre(x => x.event === 'appel' && x.data.id === id && x.data.nb === 2 && !x.data.participants.some(p => p.id === ana.id));
      v('⛔ Ana (l\'hôte) demande la suppression de son compte PENDANT la salle : elle en sort à l\'instant, ses sessions sont coupées (401), Ben et Cleo continuent — Ben, le plus ancien, devient hôte', [q.code, dit(await a.get('/api/appels')), statuts(id, [ana.id, ben.id, cleo.id]), M.S.appelAcces(id, ben.id).grade, etatSalle(id, ben.id), ev.data.nb], [200, [401, 'session_requise'], ['parti', 'present', 'present'], 2, 'en_cours', 2]);
      /* ⛔ ON AVANCE L'ÉCHÉANCE, PAS L'HORLOGE (8 octobre 2026, déploiement du 3f4cf467 bloqué : « [0,[],"fini",null] »). Avancer l'horloge de quatorze jours, c'était aussi
         quatorze jours sans un signe de Ben ni de Cleo : le balayeur des appels (300 ms, pour de vrai) avait le DROIT de les dire « perdus », et la salle finissait — selon qu'il
         passait avant ou après la lecture. Une course, gagnée presque toujours, perdue une fois en CI. Le délai lui-même (J+14) est gardé par test-950 ; ici, on lit qu'il est
         POSÉ, puis on le rend échu, et le VRAI service efface le compte à son passage. */
      const ech = M.S.suppressionLe(ana.id);
      vrai('population : la demande a posé l\'échéance à J+14', ech !== null && ech > M.maintenant() + 13 * JOUR && ech <= M.maintenant() + 15 * JOUR, String(ech));
      { const d = new DatabaseSync(M.chemin); try { d.exec('PRAGMA busy_timeout = 5000'); d.prepare('UPDATE personne SET suppression_le = ? WHERE id = ?').run(M.maintenant() - SEC, ana.id); } finally { d.close(); } }
      const efface = await T.attendre(() => M.sql('SELECT etat FROM personne WHERE id = ?', ana.id).etat === 'supprime', 10000, 40);
      vrai('population : le compte d\'Ana a été effacé par le service, à son échéance', !!efface);
      const lignes = Number(M.sql('SELECT COUNT(*) AS n FROM appel_part WHERE uid = ?', ana.id).n);
      const vb = (await b.get('/api/salles/' + id));
      v('⛔ l\'effacement retire sa ligne de la salle : Ben et Cleo la voient sans elle, sans nom, et la salle COURT toujours', [lignes, vb.j.appel.participants.map(p => p.prenom).sort(), vb.j.appel.etat, vb.j.appel.autre], [0, ['Ben', 'Cleo'], 'en_cours', null]);
      await libere(b, c);
    }
  } catch (err) {
    console.log('  ✗ le banc est mort : ' + (err && err.stack || err));
    console.log(M.svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  for (const f of flux) { try { f.fermer(); } catch (x) { /* fermé */ } }
  await M.fermer();
  await fps.fermer();

  /* ═══════ 5. LA RESTAURATION ═══════ */
  console.log('\n⛔ Une restauration rend leur place aux lignes d\'une salle — sans sonner, sans notifier, sans bandeau REC ; une salle restaurée « en cours » n\'occupe personne');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-989-'));
    try {
      const chemin = path.join(bac, 'msg.db'), kek = crypto.randomBytes(32), h = { t: ZERO };
      const S = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t });
      const mk = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Test', origine: 'beta', verifie: true });
      const A = mk('Ana'), B = mk('Ben'), C = mk('Cleo'), D = mk('Dan'), E = mk('Eve');
      for (const p of [B, C, D, E]) S.contactLier(A.id, p.id);
      const ses = () => crypto.randomBytes(16).toString('hex');
      /* une salle qui court : Ana hôte (elle enregistre), Ben présent, Cleo à la porte (salle d'attente), Dan appelé qui sonne encore, Eve exclue */
      const r = S.appelCreerGroupe({ appelant: A.id, invites: [B.id, C.id, D.id, E.id], type: 'video', session: ses(), sonnerieMs: 45000, capacite: 4, conv: null, attente: false });
      h.t += 1000; S.appelRepondre({ id: r.id, uid: B.id, session: ses(), accepte: true });
      S.salleAttente(r.id, A.id, true);
      h.t += 1000; S.appelRepondre({ id: r.id, uid: C.id, session: ses(), accepte: true });
      S.salleExclure({ id: r.id, par: A.id, uid: E.id });
      S.salleRec(r.id, A.id, true);
      const avant = [S.appelVue(A.id, r.id).rec, S.appelVue(A.id, r.id).etat, ['present', 'present', 'attente', 'invite', 'exclu'].every((x, i) => S.appelAcces(r.id, [A, B, C, D, E][i].id) === null ? x === 'exclu' : S.appelAcces(r.id, [A, B, C, D, E][i].id).statut === x)];
      v('population : la salle courait — Ana enregistrait, Ben était dedans, Cleo à la porte, Dan appelé, Eve exclue', avant, [{ par: A.id }, 'en_cours', true]);
      /* un lien d'invité renouvelé APRÈS l'archive, et une réunion de plus */
      const debutR = h.t + 2 * JOUR;
      const R = S.reunionCreer({ hote: A.id, titre: 'Réunion', lieu: '', debut: debutR, fin: debutR + HEURE, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [B.id], prochain: debutR }).id;
      const codeVieux = S.reunionLien({ id: R, par: A.id }).code;
      S.fermer();
      const archive = path.join(bac, 'archive.db');
      for (const s of ['', '-wal', '-shm']) { try { fs.copyFileSync(chemin + s, archive + s); } catch (x) { /* absent */ } }
      /* la vie continue : le lien est renouvelé (le registre le note) */
      const S2 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t });
      h.t += HEURE;
      const neuf = S2.reunionLienRenouveler({ id: R, par: A.id });
      const registre = STOCK.ouvrir.copie.purgeLire(chemin).filter(x => x.genre === 'reunion_lien');
      v('population : le renouvellement a noté UNE ligne au registre des purges (genre `reunion_lien`), et le code neuf diffère de l\'ancien', [registre.length, neuf.code !== codeVieux], [1, true]);
      S2.fermer();
      /* la restauration de l'archive */
      const restauree = path.join(bac, 'restauree.db');
      for (const s of ['', '-wal', '-shm']) { try { fs.copyFileSync(archive + s, restauree + s); } catch (x) { /* absent */ } }
      const brut = new DatabaseSync(restauree);
      const notifs = Number(brut.prepare('SELECT COUNT(*) AS n FROM notification').get().n), evts = Number(brut.prepare('SELECT COUNT(*) AS n FROM journal').get().n);
      brut.close();
      const bilan = STOCK.ouvrir.copie.apresRestauration(restauree, { horloge: () => h.t + JOUR });
      v('la restauration ferme la salle (1 appel vivant)', bilan.appels, 1);
      const Rr = ouvrir({ chemin: restauree, scelleur: creerScelleur(kek), horloge: () => h.t + JOUR });
      v('⛔ la salle est « fini » (motif « restauration »), plus personne n\'est « présent », « à la porte » ni « appelé » : Ana et Ben « partis », Cleo « refusée », Dan « manqué », Eve toujours « exclue » ; aucun appareil lié', [Rr.appelVue(A.id, r.id).etat, Rr.appelVue(A.id, r.id).motif, ['A', 'B', 'C', 'D'].map((k, i) => { const x = Rr.appelAcces(r.id, [A, B, C, D][i].id); return x ? x.statut + ':' + x.session : 'null'; }), Rr.appelVue(E.id, r.id).moi.statut], ['fini', 'restauration', ['parti:null', 'parti:null', 'refuse:null', 'manque:null'], 'exclu']);
      v('⛔ le bandeau REC est éteint, personne n\'est « occupé » (aucun appel actif, aucune salle à rejoindre) et chacun peut appeler', [Rr.appelVue(A.id, r.id).rec, Rr.appelsActifs().length, [A, B, C, D].map(p => Rr.appelActifDe(p.id))], [null, 0, [null, null, null, null]]);
      const apres = new DatabaseSync(restauree);
      v('⛔ et RIEN n\'a été écrit pour faire sonner ou notifier : mêmes notifications, même journal qu\'avant', [Number(apres.prepare('SELECT COUNT(*) AS n FROM notification').get().n), Number(apres.prepare('SELECT COUNT(*) AS n FROM journal').get().n)], [notifs, evts]);
      apres.close();
      v('rejouée, la restauration ne trouve plus rien à fermer', STOCK.ouvrir.copie.apresRestauration(restauree, { horloge: () => h.t + JOUR }).appels, 0);
      /* le lien : l'archive date d'AVANT le renouvellement — l'ancien code y vit encore */
      v('l\'ancien lien VIT dans l\'archive restaurée (c\'est le risque : la porte rouverte à qui le connaissait)', Rr.reunionParCode(codeVieux) !== null, true);
      Rr.fermer();
      const b1 = STOCK.ouvrir.copie.rejouerPurge(restauree, registre);
      const Rr2 = ouvrir({ chemin: restauree, scelleur: creerScelleur(kek), horloge: () => h.t + JOUR });
      v('⛔ le registre des purges rejoue la mort du lien : l\'ancien code ne désigne plus rien (la réunion elle-même est intacte, son hôte en obtient un neuf)', [b1.liensReunionRetires, Rr2.reunionParCode(codeVieux), Rr2.reunionPourMembre(R, A.id).reunion.titre, /^[A-Za-z0-9_-]{22}$/.test(Rr2.reunionLien({ id: R, par: A.id }).code)], [1, null, 'Réunion', true]);
      Rr2.fermer();
      const b2 = STOCK.ouvrir.copie.rejouerPurge(restauree, registre);
      const lignes = new DatabaseSync(restauree);
      v('⛔ rejoué une SECONDE fois : rien de plus à retirer, et pas de ligne de plus au registre de la copie (aucun doublon)', [b2.liensReunionRetires, Number(lignes.prepare(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'reunion_lien'`).get().n)], [0, 1]);
      lignes.close();
      /* une archive d'AVANT la migration 9 (une base réelle, retrogradée au schéma 8) : pas de colonne de lien, rien à retirer, la ligne est recopiée */
      const vieille = path.join(bac, 'vieille.db');
      const S3 = ouvrir({ chemin: vieille, scelleur: creerScelleur(kek), horloge: () => h.t });
      const A3 = mk3(S3, 'Ana'); S3.fermer();
      const g = new DatabaseSync(vieille);
      g.exec('DROP INDEX IF EXISTS reunion_code; DROP INDEX IF EXISTS appel_salle; DROP INDEX IF EXISTS appel_reunion;');
      for (const col of ['genre', 'conv', 'reunion', 'capacite', 'verrou', 'attente', 'partage_ok', 'rec_par']) g.exec('ALTER TABLE appel DROP COLUMN ' + col);
      for (const col of ['statut', 'grade', 'entre', 'gen']) g.exec('ALTER TABLE appel_part DROP COLUMN ' + col);
      for (const col of ['attente', 'code_h', 'code_ch', 'code_le']) g.exec('ALTER TABLE reunion DROP COLUMN ' + col);
      g.exec('PRAGMA user_version = 8');
      g.close();
      const b3 = STOCK.ouvrir.copie.rejouerPurge(vieille, registre);
      v('une archive d\'avant la migration 9 (pas de colonne de lien) : rien à retirer, la ligne est recopiée, aucune erreur', [b3.liensReunionRetires, b3.ajoutees, A3 !== null], [0, 1, true]);
      const b4 = STOCK.ouvrir.copie.apresRestauration(vieille, { horloge: () => h.t });
      v('   et la restauration d\'une telle archive passe (pas de colonne de salle à remettre en place : aucune erreur)', b4.appels, 0);
    } finally { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (x) { /* déjà parti */ } }
  }
  fin();
})();

function mk3(S, nom) { return S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Test', origine: 'beta', verifie: true }); }
