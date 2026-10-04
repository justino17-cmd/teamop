/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À PLUSIEURS ET LES SALLES, LES ROUTES EN HTTP (famille 2 de SERVEUR.md § 3.11, étape 8).

   Le VRAI service, isolé, parlé en HTTP et en flux : une horloge qu'on avance, une base ouverte à côté (WAL) pour poser les personnes. `test-986` dit que ce qui est RANGÉ est juste, `test-905` que chaque garde
   refuse ce qu'elle doit ; celui-ci dit ce que les routes RÉPONDENT et ce que les appareils REÇOIVENT :

     · lancer : un groupe (tous ses membres sonnent, sauf un bloqué), des personnes choisies (une seule vaut un appel à deux), la capacité qui suit le type (4 en vidéo, 6 en audio), les refus (trop grand, pas
       joignable, une conversation de réunion, soi-même, un corps mal formé) ; ⛔ Pro pour le groupe seul : le même appel à deux reste gratuit ;
     · entrer : par le bandeau (membre non invité), la salle d'attente, le verrou, la capacité, l'exclusion, un autre appel — chacun avec SA réponse ; un plafond par minute ;
     · ⛔ LE SIGNAL NE SE RELAIE QU'ENTRE PRÉSENTS, à l'appareil LIÉ du destinataire et à lui seul : ni un invité qui sonne, ni quelqu'un à la porte, ni un parti, ni un exclu ne reçoit — ni n'envoie — quoi que ce soit ;
     · l'éphémère (main, réaction, état de l'appareil, sondage, minuteur, épingle) : qui l'envoie, qui le reçoit (les présents, jamais l'expéditeur, jamais l'exclu), ce qui est refusé (2 Ko, hors liste, hors rôle) ;
     · « couper le micro » est une DEMANDE relayée à la page visée — jamais présentée comme faite ; le partage d'écran n'est pas annoncé quand l'hôte ne l'a pas permis ;
     · un plafond par geste et par minute ; la salle racontée à celui qui arrive après les autres (`GET /api/salles/:id`).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien reçu » est précédé d'un marqueur reçu APRÈS, qui prouve que le flux était vivant. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { appelsConfig } = require(path.join(T.SERVICE, 'config.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, JOUR = 86400000;
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
  return { svc, S, chemin, pers, cl, avancer, maintenant, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}
const pause = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const flux = [];
  const M = await monter({ appels: { groupeInvitesMax: 4, salleEvtMax: 30, groupeSignalMax: 12, balayageMs: 1000, perduMs: 600000, entrantsParHeure: 60 } });
  const { svc, S, pers, cl } = M;
  const ouvrirFlux = async (c) => { const f = await T.flux(c); flux.push(f); return f; };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), gus = pers('Gus'), hana = pers('Hana');
    for (const p of [ben, cleo, dan, eve, fred, gus, hana]) S.contactLier(ana.id, p.id);
    S.contactLier(ben.id, hana.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve), f1 = cl(fred), g1 = cl(gus), h1 = cl(hana);
    const c2 = cl(cleo);                                                    // un SECOND appareil de Cleo : il ne reçoit jamais un signal destiné au premier
    const fA = await ouvrirFlux(a1), fB = await ouvrirFlux(b1), fC = await ouvrirFlux(c1), fC2 = await ouvrirFlux(c2), fD = await ouvrirFlux(d1), fE = await ouvrirFlux(e1);
    const groupe = S.convCreerGroupe({ createur: ana.id, nom: 'Équipe terrain', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
    const reunion = S.reunionCreer({ hote: ana.id, titre: 'Point', lieu: '', debut: M.maintenant() + 3 * JOUR, fin: M.maintenant() + 3 * JOUR + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [ben.id], prochain: M.maintenant() + 3 * JOUR });
    /* un message d'Ana à `p` : l'événement `message` arrive sur le flux de `p` APRÈS tout ce qui devait (ou ne devait pas) lui parvenir — la preuve que ce flux était vivant */
    const marqueVers = async (p, f) => { await a1.post('/api/conversations/' + S.convDirecteObtenir(ana.id, p.id).id + '/messages', { cid: 'cid-m-' + crypto.randomBytes(5).toString('hex'), texte: 'marqueur' }); await f.attendre(e => e.event === 'message'); };
    const libere = async (...cs) => { for (const c of cs) { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };

    /* ═══════ 1. LANCER ═══════ */
    console.log('Lancer un appel à plusieurs : un groupe, des personnes choisies ; la capacité suit le type ; chaque refus a sa réponse');
    {
      const cfg = (c) => appelsConfig({ appels: c }, 'beta');
      v('la configuration BORNE les réglages des salles (un nombre absurde est refusé au démarrage)', [['maxVideo', 1], ['maxVideo', 9], ['maxAudio', 13], ['groupeInvitesMax', 0], ['groupeInvitesMax', 31], ['salleEvtMax', 9], ['groupeSignalMax', 9], ['reunionApresMin', 14]].map(([k, x]) => { try { cfg({ [k]: x }); return 'accepté'; } catch (e) { return e.code; } }), new Array(8).fill('CONFIG'));
      v('   les défauts : 4 en vidéo, 6 en audio, 12 invités, 15 min avant, 180 min après', (() => { const o = cfg({}); return [o.maxVideo, o.maxAudio, o.groupeInvitesMax, o.reunionAvantMin, o.reunionApresMin]; })(), [4, 6, 12, 15, 180]);
      const avantAppels = S.sonde().nonVides.appel || 0;
      v('⛔ le corps est lu avec rigueur : ni conversation ni personne ni liste, deux à la fois, une liste vide ou qui n\'est pas une liste, un identifiant mal formé, SOI-MÊME dans la liste → 400 `champ_invalide`',
        [(await a1.post('/api/appels', { type: 'audio' })).j, (await a1.post('/api/appels', { type: 'audio', conv: groupe, uids: [ben.id, cleo.id] })).j, (await a1.post('/api/appels', { type: 'audio', uids: [] })).j,
         (await a1.post('/api/appels', { type: 'audio', uids: 'p_x' })).j, (await a1.post('/api/appels', { type: 'audio', uids: [ben.id, 'zz'] })).j, (await a1.post('/api/appels', { type: 'audio', uids: [ben.id, ana.id] })).j,
         (await a1.post('/api/appels', { type: 'audio', uids: { $ne: 1 } })).j].map(j => j && j.error), new Array(7).fill('champ_invalide'));
      v('⛔ plus de personnes CHOISIES que la limite de la configuration (quatre ici) : 400 `champ_invalide`', dit(await a1.post('/api/appels', { type: 'audio', uids: [ben.id, cleo.id, dan.id, eve.id, fred.id] })), [400, 'champ_invalide']);
      const grand = S.convCreerGroupe({ createur: ana.id, nom: 'Grand', membres: [ben.id, cleo.id, dan.id, eve.id, fred.id], annonces_seules: false, ephemere_s: 0 }).id;
      const tg = await a1.post('/api/appels', { conv: grand, type: 'audio' });
      v('⛔ un groupe de six personnes, limite de quatre invités : 409 `groupe_trop_grand` (+ `max`), et rien n\'est écrit', [dit(tg), tg.j.max, S.sonde().nonVides.appel || 0], [[409, 'groupe_trop_grand'], 4, avantAppels]);
      const inconnue = pers('Nova');
      S.contactLier(ana.id, gus.id);
      S.contactEtat(gus.id, ana.id, 'bloque');
      const r404 = [await a1.post('/api/appels', { uids: [ben.id, inconnue.id], type: 'audio' }), await a1.post('/api/appels', { uids: [ben.id, gus.id], type: 'audio' }), await a1.post('/api/appels', { uids: [ben.id, 'p_' + '0'.repeat(32)], type: 'audio' })];
      v('⛔ des personnes qu\'on ne peut pas joindre (pas de contact, bloqué, inconnu) : la MÊME réponse (404 `introuvable`), au caractère près — un appel ne dit pas qu\'on a été bloqué', [r404.map(dit), new Set(r404.map(x => x.txt)).size], [new Array(3).fill([404, 'introuvable']), 1]);
      v('⛔ la conversation d\'une RÉUNION n\'appelle personne : 409 `appel_a_deux`', dit(await a1.post('/api/appels', { conv: reunion.conv, type: 'audio' })), [409, 'appel_a_deux']);
      v('population : aucun de ces refus n\'a écrit un appel', S.sonde().nonVides.appel || 0, avantAppels);
    }
    {
      /* LE GROUPE : tous ses membres sonnent ; la capacité suit le type ; Dan est bloqué par Ana ? non — on bloque Dan DEPUIS Ben pour voir qu'il ne dépend que de l'hôte */
      const r = await a1.post('/api/appels', { conv: groupe, type: 'video' });
      const ap = r.j && r.j.appel;
      v('lancer par le GROUPE (vidéo) : 201, la vue de l\'hôte (groupe, sortante, quatre places, un présent, hôte, appareil lié, le nom du groupe)', [r.code, ap.genre, ap.groupe, ap.sens, ap.capacite, ap.nb, ap.moi, ap.lie, ap.titre, ap.conv === groupe], [201, 'groupe', true, 'sortant', 4, 1, { statut: 'present', grade: 2, gen: 1 }, true, 'Équipe terrain', true]);
      const eB = await fB.attendre(e => e.event === 'appel'), eC = await fC.attendre(e => e.event === 'appel'), eD = await fD.attendre(e => e.event === 'appel');
      v('⛔ Ben, Cleo et Dan reçoivent l\'événement durable `appel` : « sonne », entrant, invité, aucun appareil lié — Eve (hors du groupe) ne reçoit RIEN', [[eB, eC, eD].map(e => [e.data.etat, e.data.sens, e.data.moi.statut, e.data.lie]), fE.evenements.filter(e => e.event === 'appel').length], [new Array(3).fill(['sonne', 'entrant', 'invite', false]), 0]);
      await marqueVers(eve, fE);
      v('   (marqueur reçu APRÈS : le flux d\'Eve est vivant, et il n\'y a toujours aucun `appel`)', fE.evenements.filter(e => e.event === 'appel').length, 0);
      const dejaPris = await a1.post('/api/appels', { conv: groupe, type: 'audio' });
      v('⛔ l\'hôte est déjà dans un appel : 409 `occupe` avec `moi:true`', [dit(dejaPris), dejaPris.j.moi], [[409, 'occupe'], true]);
      const occ = await b1.post('/api/appels', { uid: hana.id, type: 'audio' });
      v('⛔ Ben, qui sonne (invité), ne lance pas d\'autre appel : 409 `occupe` `moi:true`', [dit(occ), occ.j.moi], [[409, 'occupe'], true]);
      /* Ben répond ; Cleo rejoint depuis le bandeau ; Dan refuse */
      const rb = await b1.post('/api/appels/' + ap.id + '/repondre', { accepte: true });
      v('Ben répond : présent, l\'appel COURT, sa vue porte l\'état de la salle (rien d\'éphémère encore) ET dit que la salle a ses outils d\'organisateur (la bêta ouvre tout)', [rb.code, rb.j.appel.moi.statut, rb.j.etat, rb.j.salle], [200, 'present', 'en_cours', { mains: [], etats: {}, sondage: null, minuteur: null, epingle: null, outils: true }]);
      const rd = await d1.post('/api/appels/' + ap.id + '/repondre', { accepte: false });
      v('Dan REFUSE : « refusé » pour lui seul, la salle continue pour les autres', [rd.code, rd.j.appel.moi.statut, (await a1.get('/api/salles/' + ap.id)).j.appel.etat], [200, 'refuse', 'en_cours']);
      const rj = await c1.post('/api/appels/' + ap.id + '/rejoindre', {});
      v('Cleo REJOINT (la même chose que répondre, par le bandeau « Rejoindre ») : présente, passage 1', [rj.code, rj.j.appel.moi.statut, rj.j.appel.moi.gen, rj.j.appel.nb], [200, 'present', 1, 3]);
      const le = await a1.get('/api/appels');
      v('GET /api/appels : l\'appel actif de l\'hôte, et AUCUNE salle à rejoindre (elle est dedans)', [le.j.actif && le.j.actif.id === ap.id, le.j.salles], [true, []]);
      const ld = await d1.get('/api/appels');
      v('⛔ Dan (a refusé) : plus d\'appel actif, et la salle reste dans ses salles à rejoindre (membre du groupe) avec son titre et le nombre de présents', [ld.j.actif, ld.j.salles.map(s => [s.id === ap.id, s.titre, s.nb, s.capacite, s.genre])], [null, [[true, 'Équipe terrain', 3, 4, 'groupe']]]);
      const le2 = await e1.get('/api/appels');
      v('   et Eve, qui n\'est pas du groupe, n\'en voit aucune', le2.j.salles, []);
      await libere(a1, b1, c1);
      v('population : tous ont raccroché, la salle est finie', [(await a1.get('/api/appels')).j.actif, (await a1.get('/api/appels')).j.appels.length], [null, 1]);
    }
    {
      /* DES PERSONNES CHOISIES, la capacité en audio, et un seul invité = un appel à DEUX */
      const un = await a1.post('/api/appels', { uids: [hana.id], type: 'audio' });
      v('⛔ UNE seule personne choisie est un appel à DEUX (gratuit, genre « deux »)', [un.code, un.j.appel.genre, un.j.appel.groupe, un.j.appel.autre.id === hana.id], [201, 'deux', undefined, true]);
      await libere(a1);
      const pl = await a1.post('/api/appels', { uids: [ben.id, cleo.id, ben.id, hana.id], type: 'audio' });
      v('plusieurs personnes (un doublon) : un appel de groupe AUDIO à six places, trois invités, pas de conversation', [pl.code, pl.j.appel.genre, pl.j.appel.capacite, pl.j.appel.conv, pl.j.appel.titre], [201, 'groupe', 6, null, '']);
      await libere(a1);
    }

    /* ═══════ 2. ENTRER ═══════ */
    console.log('\nEntrer : le bandeau, le verrou, la capacité, la salle d\'attente, l\'exclusion — chacun sa réponse ; un plafond par minute');
    {
      /* des personnes CHOISIES : le droit d'entrer, c'est d'avoir été invité */
      const r = await a1.post('/api/appels', { uids: [ben.id, cleo.id, dan.id, eve.id], type: 'video' });
      const id = r.j.appel.id;
      v('⛔ une salle de personnes CHOISIES n\'a que ses invités pour droit : Fred (contact d\'Ana, non invité) reçoit 404 `introuvable`, au caractère près comme pour une salle qui n\'existe pas', [dit(await f1.post('/api/appels/' + id + '/rejoindre', {})), (await f1.post('/api/appels/' + id + '/rejoindre', {})).txt === (await f1.post('/api/appels/a_' + '0'.repeat(32) + '/rejoindre', {})).txt], [[404, 'introuvable'], true]);
      await b1.post('/api/appels/' + id + '/rejoindre', {});
      await a1.post('/api/salles/' + id + '/verrouiller', { actif: true });
      const avantV = [S.sonde().nonVides.appel_part];
      v('⛔ salle VERROUILLÉE : Cleo, invitée qui n\'est pas entrée, reçoit 423 `verrouillee`, et le refus n\'écrit rien', [dit(await c1.post('/api/appels/' + id + '/rejoindre', {})), S.sonde().nonVides.appel_part], [[423, 'verrouillee'], avantV[0]]);
      await a1.post('/api/salles/' + id + '/verrouiller', { actif: false });
      v('contre-épreuve : déverrouillée, Cleo entre (200)', (await c1.post('/api/appels/' + id + '/rejoindre', {})).code, 200);
      await d1.post('/api/appels/' + id + '/rejoindre', {});
      v('population : quatre présents (Ana, Ben, Cleo, Dan) sur quatre places', (await a1.get('/api/salles/' + id)).j.appel.nb, 4);
      const avantC = [S.sonde().nonVides.appel_part, fE.evenements.length];
      v('⛔ salle PLEINE : Eve, invitée, reçoit 409 `appel_complet` — le refus n\'écrit rien', [dit(await e1.post('/api/appels/' + id + '/rejoindre', {})), S.sonde().nonVides.appel_part], [[409, 'appel_complet'], avantC[0]]);
      await d1.post('/api/appels/' + id + '/quitter', {});
      v('contre-épreuve : Dan part, Eve entre (200) — la capacité ne ferme pas la route', (await e1.post('/api/appels/' + id + '/rejoindre', {})).code, 200);
      await libere(a1, b1, c1, d1, e1);
      v('population : tout le monde a raccroché', [(await a1.get('/api/appels')).j.actif, (await e1.get('/api/appels')).j.actif], [null, null]);
    }
    {
      /* un GROUPE de conversation : la salle d'attente, l'admission, le refus, l'exclusion, le plafond */
      const petit = S.convCreerGroupe({ createur: ana.id, nom: 'Petit', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
      const rp = await a1.post('/api/appels', { conv: petit, type: 'video' });
      const pid = rp.j.appel.id;
      const rbp = await b1.post('/api/appels/' + pid + '/repondre', { accepte: true });
      v('population : Ben, invité, répond et entre (la salle d\'attente n\'est pas encore allumée)', [rbp.code, rbp.j.appel && rbp.j.appel.moi.statut], [200, 'present']);
      const sa = await a1.post('/api/salles/' + pid + '/salle_attente', { actif: true });
      const rc = await c1.post('/api/appels/' + pid + '/rejoindre', {});
      v('⛔ la salle d\'attente : l\'hôte l\'allume, Cleo ATTEND (`attente:true`) — pas présente, elle ne lit pas la liste, l\'appel ne la compte pas', [sa.code, rc.code, rc.j.attente, rc.j.appel.moi.statut, rc.j.appel.participants, rc.j.appel.nb], [200, 200, true, 'attente', [], 2]);
      const vueAna = (await a1.get('/api/salles/' + pid)).j.appel;
      v('   l\'hôte voit UNE personne en salle d\'attente, et la lit dans la liste ; Ben (participant) n\'en voit pas', [vueAna.en_attente, vueAna.participants.filter(p => p.statut === 'attente').map(p => p.id), (await b1.get('/api/salles/' + pid)).j.appel.en_attente, (await b1.get('/api/salles/' + pid)).j.appel.participants.filter(p => p.statut === 'attente').length], [1, [cleo.id], 0, 0]);
      const ad = await a1.post('/api/salles/' + pid + '/admettre', { uid: cleo.id });
      v('Ana admet Cleo : 200, `admis:1`, elle est présente (la salle compte trois personnes)', [ad.code, ad.j.admis, ad.j.restent, ad.j.appel.nb, (await c1.get('/api/salles/' + pid)).j.appel.moi.statut], [200, 1, 0, 3, 'present']);
      const mal = [await a1.post('/api/salles/' + pid + '/admettre', {}), await a1.post('/api/salles/' + pid + '/admettre', { uid: 'zz' }), await a1.post('/api/salles/' + pid + '/refuser', {}), await a1.post('/api/salles/' + pid + '/exclure', { uid: ana.id })];
      v('⛔ des corps mal formés : `champ_invalide` (admettre sans cible, cible mal formée, refuser sans cible) ; s\'exclure soi-même : `introuvable`', mal.map(dit), [[400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide'], [404, 'introuvable']]);
      v('admettre quand personne n\'attend : `introuvable` (rien d\'écrit)', dit(await a1.post('/api/salles/' + pid + '/admettre', { tous: true })), [404, 'introuvable']);
      /* refuser : Dan frappe, l'hôte le refuse ; il peut redemander */
      const rd = await d1.post('/api/appels/' + pid + '/rejoindre', {});
      const rf = await a1.post('/api/salles/' + pid + '/refuser', { uid: dan.id });
      v('Dan frappe à la porte (attente), Ana le REFUSE : « refusé », il n\'est plus à la porte', [rd.j.attente, rf.code, (await a1.get('/api/salles/' + pid)).j.appel.en_attente, (await d1.get('/api/salles/' + pid)).j.appel.moi.statut], [true, 200, 0, 'refuse']);
      v('   il peut redemander (l\'hôte qui ne veut plus le voir l\'exclut)', (await d1.post('/api/appels/' + pid + '/rejoindre', {})).j.attente, true);
      const exd = await a1.post('/api/salles/' + pid + '/exclure', { uid: dan.id });
      v('Ana EXCLUT Dan (à la porte) : 200', [exd.code, exd.j.ok, exd.j.deja], [200, true, false]);
      v('⛔ Dan ne revient pas : 403 `exclu` en rejoignant ; répondre à la sonnerie ou lire la salle est le 404 d\'une salle inconnue, au caractère près', [dit(await d1.post('/api/appels/' + pid + '/rejoindre', {})), dit(await d1.post('/api/appels/' + pid + '/repondre', { accepte: true })), dit(await d1.get('/api/salles/' + pid)), (await d1.get('/api/salles/' + pid)).txt === (await d1.get('/api/salles/a_' + '0'.repeat(32))).txt], [[403, 'exclu'], [404, 'introuvable'], [404, 'introuvable'], true]);
      v('⛔ l\'exclu ne voit plus la salle parmi celles qu\'on lui propose, ni comme appel actif', [(await d1.get('/api/appels')).j.salles, (await d1.get('/api/appels')).j.actif], [[], null]);
      /* le plafond par minute, par salle et par personne : douze, la treizième est refusée 429 */
      const codes = [];
      for (let i = 0; i < 13; i++) codes.push((await d1.post('/api/appels/' + pid + '/rejoindre', {})).code);
      v('⛔ un plafond : douze demandes d\'entrée par minute, par salle et par personne — Dan, exclu, retente : 403 tant que le plafond tient, puis 429', [codes.includes(403), codes[codes.length - 1], codes.includes(429)], [true, 429, true]);
      await libere(a1, b1, c1);
    }

    /* ═══════ 3. LE SIGNAL ═══════ */
    console.log('\n⛔ Le signal ne se relaie qu\'entre PRÉSENTS, à l\'appareil LIÉ du destinataire — jamais à un invité qui sonne, à quelqu\'un à la porte, à un parti, à un exclu');
    {
      const petit = S.convCreerGroupe({ createur: ana.id, nom: 'Signal', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
      const r = await a1.post('/api/appels', { conv: petit, type: 'video' });
      const id = r.j.appel.id;
      await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      await c1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const signaux = (f) => f.evenements.filter(e => e.event === 'signal');
      const offre = { sdp: 'v=0 CANARI-OFFRE-QXZW', type: 'offer' };
      const envoye = await b1.post('/api/appels/' + id + '/signal', { a: cleo.id, type: 'offre', donnees: offre });
      await fC.attendre(e => e.event === 'signal');
      v('Ben signale à Cleo : 200 ; elle le reçoit sur l\'appareil LIÉ avec l\'identifiant de l\'appel, celui de Ben et l\'enveloppe — jamais sur son AUTRE appareil, ni chez Ana (qui n\'est pas la destinataire)', [envoye.code, signaux(fC).map(e => [e.data.appel === id, e.data.de === ben.id, e.data.type, e.data.donnees.sdp]), signaux(fC2).length, signaux(fA).length], [200, [[true, true, 'offre', 'v=0 CANARI-OFFRE-QXZW']], 0, 0]);
      v('⛔ un invité qui SONNE encore (Dan) n\'est pas un destinataire : 409 `appel_pas_en_cours`, et il n\'a rien reçu', [dit(await b1.post('/api/appels/' + id + '/signal', { a: dan.id, type: 'offre', donnees: offre })), signaux(fD).length], [[409, 'appel_pas_en_cours'], 0]);
      v('⛔ Dan, qui sonne, n\'envoie pas non plus (il n\'a pas d\'appareil lié à la salle) : 403 `appareil_non_lie`', dit(await d1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'offre', donnees: offre })), [403, 'appareil_non_lie']);
      v('⛔ soi-même, un identifiant mal formé, un inconnu, l\'absence de destinataire : `champ_invalide` ou `appel_pas_en_cours`, jamais un relais', [dit(await b1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'offre', donnees: offre })), dit(await b1.post('/api/appels/' + id + '/signal', { type: 'offre', donnees: offre })), dit(await b1.post('/api/appels/' + id + '/signal', { a: 'zz', type: 'offre', donnees: offre })), dit(await b1.post('/api/appels/' + id + '/signal', { a: eve.id, type: 'offre', donnees: offre }))], [[400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide'], [409, 'appel_pas_en_cours']]);
      v('le pouls n\'a pas de destinataire (il prouve que l\'appareil est là) : 200', (await b1.post('/api/appels/' + id + '/signal', { type: 'pouls' })).code, 200);
      v('⛔ un type inconnu, des données qui ne sont pas un objet : 400 `champ_invalide`', [dit(await b1.post('/api/appels/' + id + '/signal', { a: cleo.id, type: 'virus', donnees: {} })), dit(await b1.post('/api/appels/' + id + '/signal', { a: cleo.id, type: 'offre', donnees: [1] }))], [[400, 'champ_invalide'], [400, 'champ_invalide']]);
      v('⛔ trop gros (16 Ko) : 413 `signal_trop_gros`', dit(await b1.post('/api/appels/' + id + '/signal', { a: cleo.id, type: 'offre', donnees: { sdp: 'x'.repeat(17000) } })), [413, 'signal_trop_gros']);
      /* exclure Cleo : elle ne reçoit plus rien et n'envoie plus rien, même avec un appareil qui tient encore la salle */
      await a1.post('/api/salles/' + id + '/exclure', { uid: cleo.id });
      const avant = signaux(fC).length;
      v('⛔ Cleo EXCLUE : Ben ne peut plus lui signaler (409), elle ne signale plus (404 — la salle n\'existe plus pour elle), et rien ne lui est relayé', [dit(await b1.post('/api/appels/' + id + '/signal', { a: cleo.id, type: 'offre', donnees: offre })), dit(await c1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'offre', donnees: offre })), signaux(fC).length - avant], [[409, 'appel_pas_en_cours'], [404, 'introuvable'], 0]);
      /* le plafond du signal d'une salle : douze par minute dans ce banc */
      let dernier = 0, ok = 0;
      for (let i = 0; i < 14; i++) { const x = await a1.post('/api/appels/' + id + '/signal', { a: ben.id, type: 'candidats', donnees: { n: i } }); if (x.code === 200) ok++; dernier = x.code; }
      v('⛔ un plafond par salle et par participant (douze par minute ici) : les premiers passent, le dernier est refusé 429', [ok >= 1 && ok < 14, dernier], [true, 429]);
      await libere(a1, b1, d1);
    }

    /* ═══════ 4. L'ÉPHÉMÈRE ═══════ */
    console.log('\nL\'éphémère d\'une salle : main, réaction, état, sondage, minuteur, épingle — qui envoie, qui reçoit, ce qui est refusé');
    {
      const petit = S.convCreerGroupe({ createur: ana.id, nom: 'Ephemere', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
      const r = await a1.post('/api/appels', { conv: petit, type: 'video' });
      const id = r.j.appel.id;
      await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      await c1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const evts = (f) => f.evenements.filter(e => e.event === 'salle_evt').map(e => e.data);
      const attendreK = async (f, k) => f.attendre(e => e.event === 'salle_evt' && e.data.k === k);
      const m = await b1.post('/api/salles/' + id + '/main', { actif: true });
      await attendreK(fA, 'main'); await attendreK(fC, 'main');
      v('Ben lève la main : 200 ; Ana et Cleo le reçoivent (de, k, actif) — Ben, l\'expéditeur, non ; Dan (qui sonne) non', [m.code, evts(fA).filter(e => e.k === 'main').map(e => [e.de === ben.id, e.actif]), evts(fC).filter(e => e.k === 'main').length, evts(fB).filter(e => e.k === 'main').length, evts(fD).length], [200, [[true, true]], 1, 0, 0]);
      const snap = (await a1.get('/api/salles/' + id)).j;
      v('⛔ la salle RACONTÉE à celui qui arrive après : la main de Ben est dans l\'instantané', [snap.salle.mains, snap.appel.id === id], [[ben.id], true]);
      await b1.post('/api/salles/' + id + '/main', { actif: false });
      v('   baisser la main l\'enlève de l\'instantané', (await a1.get('/api/salles/' + id)).j.salle.mains, []);
      const avantR = evts(fA).length;
      const rx = [await b1.post('/api/salles/' + id + '/reaction', { emoji: '💩' }), await b1.post('/api/salles/' + id + '/reaction', { emoji: '<script>' }), await b1.post('/api/salles/' + id + '/reaction', {}), await b1.post('/api/salles/' + id + '/reaction', { emoji: 'pouce' })];
      await attendreK(fA, 'reaction');
      v('⛔ une réaction : la liste est FERMÉE (pouce, coeur, bravo, rire) — un autre texte, un balisage, l\'absence de texte sont refusés (`champ_invalide`) et ne sont pas diffusés ; un pouce l\'est', [rx.map(x => x.code), evts(fA).slice(avantR).filter(e => e.k === 'reaction').map(e => e.emoji)], [[400, 400, 400, 200], ['pouce']]);
      /* l'état de mon appareil */
      const et = await b1.post('/api/salles/' + id + '/etat', { camera: true, micro: false });
      await attendreK(fA, 'etat');
      v('l\'état de MON appareil (caméra, micro) : diffusé aux présents, mémorisé pour ceux qui arrivent après', [et.code, evts(fA).filter(e => e.k === 'etat').map(e => [e.de === ben.id, e.camera, e.micro, e.partage]), (await a1.get('/api/salles/' + id)).j.salle.etats[ben.id]], [200, [[true, true, false, false]], { camera: true, micro: false, partage: false }]);
      v('⛔ un état mal formé (aucun champ, un champ qui n\'est pas un booléen) : 400', [dit(await b1.post('/api/salles/' + id + '/etat', {})), dit(await b1.post('/api/salles/' + id + '/etat', { camera: 'oui' })), dit(await b1.post('/api/salles/' + id + '/etat', { micro: 1 }))], new Array(3).fill([400, 'champ_invalide']));
      /* le partage d'écran : annoncé seulement s'il est permis */
      await a1.post('/api/salles/' + id + '/partage', { actif: false });
      v('⛔ le partage NON permis par l\'hôte : un participant qui annonce « je partage » reçoit 403 `partage_interdit` (l\'état n\'est pas écrit) ; l\'hôte, lui, l\'annonce', [dit(await b1.post('/api/salles/' + id + '/etat', { partage: true })), (await a1.get('/api/salles/' + id)).j.salle.etats[ben.id].partage, (await a1.post('/api/salles/' + id + '/etat', { partage: true })).code], [[403, 'partage_interdit'], false, 200]);
      await a1.post('/api/salles/' + id + '/partage', { actif: true });
      v('   permis de nouveau : Ben l\'annonce (200)', (await b1.post('/api/salles/' + id + '/etat', { partage: true })).code, 200);
      /* le sondage */
      const ouvert = await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'On commence ?', choix: ['Oui', 'Non'] } });
      await attendreK(fB, 'sondage');
      const sd = evts(fB).filter(e => e.k === 'sondage')[0].sondage;
      v('l\'hôte ouvre un sondage : 200 ; chacun le reçoit (question, choix, décompte à zéro, ouvert) — sans qui a voté quoi', [ouvert.code, sd.question, sd.choix, sd.comptes, sd.total, sd.ouvert, 'votes' in sd], [200, 'On commence ?', ['Oui', 'Non'], [0, 0], 0, true, false]);
      v('⛔ un participant n\'ouvre pas de sondage (403 `interdit`) ; un sondage mal formé : 400 (une seule réponse, plus de huit choix, un choix vide)', [dit(await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'x', choix: ['a', 'b'] } })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'x', choix: ['a'] } })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'x', choix: ['a', ''] } })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: '', choix: ['a', 'b'] } }))], [[403, 'interdit'], [400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      const vote = await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: sd.id, choix: 0 } });
      const vote2 = await c1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: sd.id, choix: 1 } });
      v('Ben et Cleo votent : le décompte est tenu par le SERVICE (un nouvel arrivant le voit), et chacun lit SON vote seulement', [vote.code, vote2.code, (await a1.get('/api/salles/' + id)).j.salle.sondage.comptes, (await b1.get('/api/salles/' + id)).j.salle.sondage.mon_vote, (await c1.get('/api/salles/' + id)).j.salle.sondage.mon_vote, (await a1.get('/api/salles/' + id)).j.salle.sondage.mon_vote], [200, 200, [1, 1], 0, 1, null]);
      await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: sd.id, choix: 1 } });
      v('⛔ revoter REMPLACE le vote (jamais deux voix) ; un vote hors choix ou sur un autre sondage : 400', [(await a1.get('/api/salles/' + id)).j.salle.sondage.comptes, dit(await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: sd.id, choix: 7 } })), dit(await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: 'autre', choix: 0 } }))], [[0, 2], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'fermer' } });
      v('l\'hôte ferme : un vote de plus est refusé (400)', dit(await b1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'voter', id: sd.id, choix: 0 } })), [400, 'champ_invalide']);
      /* le minuteur et l'épingle : l'hôte et les co-hôtes seuls */
      const mn = await a1.post('/api/salles/' + id + '/evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 90 } });
      await attendreK(fB, 'minuteur');
      v('le minuteur : l\'hôte le démarre (200), Ben le reçoit (90 s), l\'instantané dit le temps qui RESTE ; un participant n\'en démarre pas (403) ; une durée absurde : 400', [mn.code, evts(fB).filter(e => e.k === 'minuteur')[0].minuteur.secondes, (await c1.get('/api/salles/' + id)).j.salle.minuteur.fin_dans_s, dit(await b1.post('/api/salles/' + id + '/evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 60 } })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 100000 } }))], [200, 90, 90, [403, 'interdit'], [400, 'champ_invalide']]);
      M.avancer(30 * SEC);
      v('   trente secondes plus tard : il reste soixante secondes (l\'horloge du service, pas celle de la page)', (await c1.get('/api/salles/' + id)).j.salle.minuteur.fin_dans_s, 60);
      M.avancer(61 * SEC);
      v('   passé l\'échéance, l\'instantané ne montre plus de minuteur', (await c1.get('/api/salles/' + id)).j.salle.minuteur, null);
      const ep = await a1.post('/api/salles/' + id + '/evt', { k: 'epingle', donnees: { op: 'epingler', uid: ben.id } });
      v('⛔ l\'événement REVIENT à celui qui l\'a posé (le service ne le lui pousse pas) : la réponse du minuteur et celle de l\'épingle portent ce que Ben a reçu', [mn.j.ev && mn.j.ev.k, mn.j.ev && mn.j.ev.minuteur && mn.j.ev.minuteur.secondes, ep.j.ev && ep.j.ev.k, ep.j.ev && ep.j.ev.uid], ['minuteur', 90, 'epingle', ben.id]);
      v('l\'épingle : l\'hôte épingle Ben (200), l\'instantané le dit ; épingler quelqu\'un qui n\'est pas là : 400 ; un participant n\'épingle pas (403)', [ep.code, (await c1.get('/api/salles/' + id)).j.salle.epingle, dit(await a1.post('/api/salles/' + id + '/evt', { k: 'epingle', donnees: { op: 'epingler', uid: dan.id } })), dit(await b1.post('/api/salles/' + id + '/evt', { k: 'epingle', donnees: { op: 'retirer' } }))], [200, ben.id, [400, 'champ_invalide'], [403, 'interdit']]);
      v('⛔ la limite des 2 Ko : un message plus gros est refusé 413 `evt_trop_gros` ; un type inconnu, des données absentes ou une liste : 400', [dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'x'.repeat(3000), choix: ['a', 'b'] } })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'virus', donnees: {} })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage' })), dit(await a1.post('/api/salles/' + id + '/evt', { k: 'sondage', donnees: [1] }))], [[413, 'evt_trop_gros'], [400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
      /* qui part n'a plus sa main levée ni son épingle */
      await b1.post('/api/salles/' + id + '/main', { actif: true });
      await b1.post('/api/appels/' + id + '/quitter', {});
      const apres = (await a1.get('/api/salles/' + id)).j.salle;
      v('⛔ Ben PART : sa main, son état et son épingle disparaissent de la salle (on ne laisse pas la trace d\'une personne partie)', [apres.mains, apres.etats[ben.id], apres.epingle], [[], undefined, null]);
      /* couper le micro : une DEMANDE */
      const cm = await a1.post('/api/salles/' + id + '/couper_micro', { uid: cleo.id });
      await attendreK(fC, 'couper_micro');
      v('⛔ « couper le micro » est une DEMANDE : 200 `demande:true`, relayée à la page de la personne visée seulement (Ben, parti, et Ana, l\'expéditeur, ne la reçoivent pas)', [cm.code, cm.j.demande, cm.j.atteints, evts(fC).filter(e => e.k === 'couper_micro').length, evts(fB).filter(e => e.k === 'couper_micro').length, evts(fA).filter(e => e.k === 'couper_micro').length], [200, true, 1, 1, 0, 0]);
      v('   viser quelqu\'un qui n\'est pas dans la salle : 404 ; un participant ne coupe pas le micro d\'un autre : 403', [dit(await a1.post('/api/salles/' + id + '/couper_micro', { uid: dan.id })), dit(await c1.post('/api/salles/' + id + '/couper_micro', { tous: true }))], [[404, 'introuvable'], [403, 'interdit']]);
      const tous = await a1.post('/api/salles/' + id + '/couper_micro', { tous: true });
      v('« tout couper » : la demande va à tous les présents sauf l\'hôte (ici Cleo seule)', [tous.j.atteints, tous.j.demande], [1, true]);
      /* le plafond des gestes : dix par minute et par participant dans ce banc */
      let derniere = 0, passes = 0;
      for (let i = 0; i < 40; i++) { const x = await c1.post('/api/salles/' + id + '/reaction', { emoji: 'rire' }); if (x.code === 200) passes++; derniere = x.code; }
      v('⛔ un plafond par geste éphémère et par participant (trente par minute ici) : les premiers passent, puis 429', [passes >= 1 && passes < 40, derniere], [true, 429]);
      await libere(a1, c1);
    }

    /* ═══════ 5. LES PLAFONDS DE RÉCEPTION, LES OCCUPÉS, LA FORMULE ═══════ */
    console.log('\nUn plafond d\'appels reçus ne fait pas sonner ; un occupé est « manqué » ; le groupe est Pro, l\'appel à deux reste gratuit');
    {
      const N = await monter({ appels: { entrantsParHeure: 1, balayageMs: 1000, perduMs: 600000 } });
      try {
        const A = N.pers('Ana'), B = N.pers('Ben'), C = N.pers('Cleo'), D = N.pers('Dan'), E = N.pers('Eve');
        for (const p of [B, C, D, E]) N.S.contactLier(A.id, p.id);
        const ca = N.cl(A), cb = N.cl(B), cc = N.cl(C), cd = N.cl(D), ce = N.cl(E);
        const un = await ca.post('/api/appels', { uid: B.id, type: 'audio' });
        await ca.post('/api/appels/' + un.j.appel.id + '/quitter', {});
        v('population : Ben a reçu UN appel dans l\'heure (le plafond de la configuration est un)', [un.code, N.S.appelsRecusDepuis(B.id, N.maintenant() - 3600000).n], [201, 1]);
        const gr = await ca.post('/api/appels', { uids: [B.id, C.id, D.id], type: 'audio' });
        v('⛔ Ana lance un groupe avec Ben, Cleo, Dan : 201 — Ben, dont le plafond de réception est atteint, ne SONNE pas (il ne lit rien : un plafond ne se dit pas à un tiers), Cleo et Dan sonnent', [gr.code, (await cb.get('/api/appels')).j.actif, (await cc.get('/api/appels')).j.actif && (await cc.get('/api/appels')).j.actif.id === gr.j.appel.id, (await cd.get('/api/appels')).j.actif && (await cd.get('/api/appels')).j.actif.id === gr.j.appel.id], [201, null, true, true]);
        v('   et Ben ne peut pas répondre à ce qu\'il n\'a pas reçu : 404 (il n\'a pas de ligne)', dit(await cb.post('/api/appels/' + gr.j.appel.id + '/repondre', { accepte: true })), [404, 'introuvable']);
        await ca.post('/api/appels/' + gr.j.appel.id + '/quitter', {});
        await cc.post('/api/appels/' + gr.j.appel.id + '/quitter', {}); await cd.post('/api/appels/' + gr.j.appel.id + '/quitter', {});
        const tous = await ca.post('/api/appels', { uids: [B.id, C.id, D.id], type: 'audio' });
        v('⛔ tous les invités au plafond : 409 `occupe` (`moi:false`) — l\'appelante lit « occupé », jamais le plafond de quelqu\'un d\'autre', [dit(tous), tous.j.moi], [[409, 'occupe'], false]);
        /* un invité occupé ailleurs lit « manqué » dès le lancement ; les autres sonnent */
        const N2 = await monter({ appels: { balayageMs: 1000, perduMs: 600000 } });
        try {
          const A2 = N2.pers('Ana'), B2 = N2.pers('Ben'), C2 = N2.pers('Cleo'), D2 = N2.pers('Dan');
          for (const p of [B2, C2, D2]) N2.S.contactLier(A2.id, p.id);
          N2.S.contactLier(B2.id, C2.id);
          const xa = N2.cl(A2), xb = N2.cl(B2), xc = N2.cl(C2), xd = N2.cl(D2);
          const ailleurs = await xb.post('/api/appels', { uid: C2.id, type: 'audio' });
          await xc.post('/api/appels/' + ailleurs.j.appel.id + '/repondre', { accepte: true });
          const g2 = await xa.post('/api/appels', { uids: [B2.id, D2.id], type: 'audio' });
          const mb = await xb.get('/api/appels?filtre=manques');
          v('⛔ Ben est déjà dans un appel : le groupe d\'Ana le compte « manqué » d\'emblée (il le lira dans ses manqués, avec UNE notification), Dan sonne', [g2.code, mb.j.appels.map(x => [x.id === g2.j.appel.id, x.manque, x.genre]), N2.S.notifListe(B2.id, 20).filter(x => x.type === 'appel_manque').length, (await xd.get('/api/appels')).j.actif.id === g2.j.appel.id], [201, [[true, true, 'groupe']], 1, true]);
        } finally { await N2.fermer(); }
      } finally { await N.fermer(); }
      /* la FORMULE : le service hors bêta (`toutOuvert` éteint) — un compte Perso lance un appel à plusieurs GRATUITEMENT (« comme WhatsApp », Justin, 4 octobre 2026), mais sa salle n'a pas les outils de l'organisateur (test-992 les joue un à un) */
      const F = await monter({ formule: { toutOuvert: false }, appels: { balayageMs: 1000, perduMs: 600000 } });
      try {
        const A = F.pers('Ana'), B = F.pers('Ben'), C = F.pers('Cleo');
        for (const p of [B, C]) F.S.contactLier(A.id, p.id);
        const ca = F.cl(A);
        const g = await ca.post('/api/appels', { uids: [B.id, C.id], type: 'audio' });
        const salleG = g.j && g.j.appel ? await ca.get('/api/salles/' + g.j.appel.id) : null;
        v('⛔ un compte PERSO (aucun espace payé, sans forfait) lance un appel à PLUSIEURS : GRATUIT — 201, genre « groupe » — et sa salle dit qu\'elle n\'a PAS les outils de l\'organisateur (`outils: false`)', [g.code, g.j.appel && g.j.appel.genre, salleG && salleG.j.salle.outils], [201, 'groupe', false]);
        await ca.post('/api/appels/' + g.j.appel.id + '/quitter', {});
        const d = await ca.post('/api/appels', { uid: B.id, type: 'audio' });
        v('   l\'appel à DEUX reste gratuit : 201', [d.code, d.j.appel.genre], [201, 'deux']);
        const grp = F.S.convCreerGroupe({ createur: A.id, nom: 'Groupe', membres: [B.id, C.id], annonces_seules: false, ephemere_s: 0 }).id;
        await ca.post('/api/appels/' + d.j.appel.id + '/quitter', {});
        const g3 = await ca.post('/api/appels', { conv: grp, type: 'video' });
        v('   un appel par la conversation d\'un GROUPE est aussi à plusieurs, aussi gratuit : 201, genre « groupe »', [g3.code, g3.j.appel && g3.j.appel.genre], [201, 'groupe']);
      } finally { await F.fermer(); }
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
