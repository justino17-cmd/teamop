/* ⛔ CE QUE CE FICHIER GARDE — LES SALLES, LA PAGE ET LE SERVICE SE PARLENT : LE MOTEUR EN MAILLE (famille 4, étape 8).

   Les VRAIES fonctions de la page (`public/source-serveur.js`, `creerMoteurSalle`) contre le VRAI service, dans Node : chaque « appareil » est un navigateur de poche (cookie, flux, `fetch`) branché sur sa propre
   fausse connexion pair à pair (`bac-webrtc.js`, étendue : une ORIGINE par connexion, des débits posés, des niveaux de voix). `test-987` dit ce que les routes répondent, `test-986` ce qui est rangé ; celui-ci dit
   que les deux moitiés SE PARLENT — la couture où naissent les pires défauts de ce dépôt :

     · une MAILLE : N − 1 connexions par page, et chacune est RÉCIPROQUE (A croit parler à B, B croit parler à A) — jamais une réponse envoyée à la mauvaise paire ;
     · ⛔ QUI OFFRE : le plus petit identifiant, toujours — une seule offre par paire, l'autre répond ; personne n'offre deux fois ; l'arrivée d'une troisième personne ne touche pas les liaisons existantes ;
     · le débit PLAFONNÉ par flux (la voix à 32 kbit/s, l'image à ce que la maille permet : 600 à trois, 400 à quatre), remis à jour quand le nombre de présents change ;
     · qui parle (le niveau de voix de la liaison), la main levée, la réaction, l'état de l'appareil — dits aux autres par le service, jamais inventés ici ;
     · la salle d'attente, l'exclusion, le départ de l'hôte, le retour de quelqu'un (sa liaison est REFAITE, l'ancienne fermée) ;
     · ⛔ DIRECT D'ABORD, RELAIS EN REPLI, PAIRE PAR PAIRE : une liaison qui s'établit seule ne reçoit JAMAIS de serveur de relais ; celle qui ne passe pas en reçoit un, et l'autre côté la suit ;
     · la salle d'une réunion programmée, le lien d'invité (aperçu public, entrée par le code) ; l'historique d'un appel de groupe ; un onglet = un appel.

   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre ; chaque « zéro » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { creerMonde } = require('./bac-webrtc');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 8);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const codeDe = (e) => e ? e.code : null;
const phrase = (e) => e && e.dit ? e.phrase() : '';

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

/* les délais du MOTEUR, raccourcis pour le banc */
const DELAIS = { pouls: 150, candidats: 5, veille: 3000, deconnecte: 250, reessai: [40, 80], iceMax: 1500, quitter: [40, 80], marge: 600000, renouvMin: 600000, nettoyage: 600000,
  relaisApres: 400, reoffre: 800, reprise: 400, niveau: 40, tenuParle: 150, etat: 20 };

(async () => {
  const MDP = { ana: 'pw-ana-1234567', ben: 'pw-ben-1234567', cleo: 'pw-cleo-123456', dan: 'pw-dan-1234567', eve: 'pw-eve-1234567' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const SECRET = crypto.randomBytes(24).toString('hex');
  const RELAIS = { secret: SECRET, hote: 'turn.exemple.invalid', port: 3478, portTls: 5349, ttlS: 60 };
  const APPELS = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000, groupeSignalMax: 5000, salleEvtMax: 1000 };
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels: Object.assign({ relais: RELAIS }, APPELS) } });
  const sources = [];

  function monter(login, opts) {
    const o = opts || {};
    const nav = T.navigateur(svc.base);
    const monde = creerMonde(login);
    const D = { login, nav, monde, requetes: [], recus: {}, evs: [], fermees: [] };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null, fermerNotifications: async (tag) => { D.fermees.push(tag); } };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0]; D.requetes.push({ m, chemin, corps: init && typeof init.body === 'string' ? init.body : null });
      /* `D.devancer` : la réponse du service à « Répondre » n'est RENDUE qu'APRÈS l'événement que le service pousse à tout le monde dès que la personne est admise — l'ordre qu'un vrai navigateur a eu (mesuré : le flux gagne la course) */
      if (D.devancer && m === 'POST' && /\/repondre$/.test(chemin)) { const avant = D.recus.appel || 0, r = await nav.fetch(url, init); D.devance = !!(await att(() => (D.recus.appel || 0) > avant, 4000)); return r; }
      return nav.fetch(url, init);
    };
    const ES = class extends nav.EventSource {
      addEventListener(t, g) { super.addEventListener(t, (ev) => { D.recus[t] = (D.recus[t] || 0) + 1; g(ev); }); }
    };
    D.src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: ES, navigateur: faux, webrtc: monde, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 20, appelsDelais: Object.assign({}, DELAIS, o.delais || {}), alea: o.alea });
    sources.push(D.src);
    D.src.ecouter(e => { D.evs.push(e); });
    D.entrer = async () => { await D.src.connexion(login, MDP[login]); const d = await D.src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); D.moi = D.src.moi(); return D.moi; };
    D.attendreEv = (pred, ms) => att(() => D.evs.find(pred) || null, ms);
    D.snap = (id) => D.src.appel(id);
    D.attendreSnap = async (id, pred, ms) => { let s = null; await att(async () => { s = await D.src.appel(id); return s && pred(s) ? s : null; }, ms); return s && pred(s) ? s : null; };
    D.nbRequetes = (re) => D.requetes.filter(r => re.test(r.m + ' ' + r.chemin)).length;
    return D;
  }
  /* un geste de la PAGE : des pistes (micro, caméra) comme `getUserMedia` les rendrait */
  const pisteDe = (D, kind) => D.monde.piste(kind, D.login + '-' + kind);
  const donnerPistes = (D, id, video) => D.src.appelPistes(id, { audio: pisteDe(D, 'audio'), video: video ? pisteDe(D, 'video') : null });

  try {
    const A = monter('ana'), B = monter('ben'), C = monter('cleo'), N = monter('dan'), E = monter('eve');
    const ana = await A.entrer(), ben = await B.entrer(), cleo = await C.entrer(), dan = await N.entrer(), eve = await E.entrer();
    const tous = [A, B, C, N];
    const mondes = tous.map(D => D.monde);
    const parId = new Map([[ana.id, A], [ben.id, B], [cleo.id, C], [dan.id, N]]);
    const l1 = await A.src.lienContact(); await B.src.accepterLien(l1.code);
    const l2 = await A.src.lienContact(); await C.src.accepterLien(l2.code);
    const l3 = await A.src.lienContact(); await N.src.accepterLien(l3.code);
    const l4 = await A.src.lienContact(); await E.src.accepterLien(l4.code);

    /* ═══ 1. LE CONTRAT ═══ */
    console.log('Le contrat : les capacités et les méthodes de la page');
    {
      v('le module annonce les appels à plusieurs et les salles', [A.src.capacites.appelsGroupe, A.src.capacites.salles, A.src.capacites.appels, A.src.capacites.appelsMedias], [true, true, true, true]);
      v('chaque méthode que la page appelle existe', ['sallesOuvertes', 'rejoindreAppel', 'rejoindreReunion', 'rejoindreParCode', 'apercuReunion', 'lienReunion', 'renouvelerLienReunion', 'salleAction', 'accuserMicro'].filter(k => typeof A.src[k] !== 'function'), []);
    }

    /* ═══ 2. LA MAILLE ═══ */
    console.log('\nUne salle de trois : une liaison par paire, réciproque ; le plus petit identifiant offre ; l\'arrivée d\'un troisième ne touche pas la première liaison');
    const groupe = await A.src.creerGroupe({ nom: 'Équipe terrain', membres: [ben.id, cleo.id, dan.id] });
    let id = null;
    {
      const snapA = await A.src.demarrerAppel({ membres: [], video: true, conv: groupe.id });
      id = snapA.id;
      v('Ana lance l\'appel par le GROUPE : une salle vidéo, elle en est l\'hôte, appel « sortant », pas encore de liaison ; la page sait que c\'est un groupe', [snapA.groupe, snapA.salle, snapA.genre, snapA.type, snapA.sens, snapA.moi.hote, snapA.moi.proprietaire, snapA.nom, snapA.capacite], [true, true, 'groupe', 'video', 'sortant', true, true, 'Équipe terrain', 4]);
      const rB = await B.attendreEv(e => e.type === 'appel-entrant' && e.id === id), rC = await C.attendreEv(e => e.type === 'appel-entrant' && e.id === id), rD = await N.attendreEv(e => e.type === 'appel-entrant' && e.id === id);
      vrai('⛔ Ben, Cleo et Dan l\'apprennent sans recharger : l\'événement `appel-entrant` (Eve, hors du groupe, rien)', !!(rB && rC && rD) && !E.evs.some(e => e.type === 'appel-entrant'));
      const sb = await B.src.appel(id);
      v('Ben : une sonnerie de groupe — entrante, c\'est à lui de répondre, du nom du groupe', [sb.entrant, sb.sens, sb.groupe, sb.nom, sb.etat, sb.attente], [true, 'entrant', true, 'Équipe terrain', 'sonne', false]);
      v('⛔ AUCUNE connexion n\'existe avant les réponses (ni chez l\'hôte, ni chez les invités)', [A.monde.pcs.length, B.monde.pcs.length, C.monde.pcs.length], [0, 0, 0]);
      donnerPistes(A, id, true);
      const rb = await B.src.repondreAppel(id, true);
      donnerPistes(B, id, true);
      v('Ben répond : présent, l\'appel court, sa liste montre Ana', [rb.entrant, rb.etat, rb.moi.statut, rb.membres.filter(m => m.statut === 'present').map(m => m.id)], [false, 'en-cours', 'present', [ana.id]]);
      vrai('⛔ la liaison Ana–Ben s\'établit (réciproque : chacune nomme l\'autre)', !!(await att(() => A.monde.appariees(mondes).length === 1 && B.monde.appariees(mondes).length === 1 && A.monde.vivants()[0].iceConnectionState === 'connected')));
      const pAB = A.monde.vivants()[0], pBA = B.monde.vivants()[0];
      const premiereOffre = pAB.localDescription && pAB.localDescription.sdp, premiereOrigine = pAB.origine;
      v('⛔ UNE connexion de chaque côté, le plus petit identifiant a OFFERT (l\'autre a répondu) — jamais deux offres', (() => {
        const petit = ana.id < ben.id ? 'ana' : 'ben', off = petit === 'ana' ? pAB : pBA, rep = petit === 'ana' ? pBA : pAB;
        return [A.monde.pcs.length, B.monde.pcs.length, off.journal.filter(x => x === 'createOffer').length, rep.journal.filter(x => /^createOffer/.test(x)).length, rep.journal.includes('createAnswer')];
      })(), [1, 1, 1, 0, true]);
      const rc = await C.src.repondreAppel(id, true);
      donnerPistes(C, id, true);
      vrai('Cleo répond : la maille complète (trois liaisons réciproques : Ana–Ben, Ana–Cleo, Ben–Cleo), deux connexions par page', !!(await att(() => [A, B, C].every(D => D.monde.vivants().length === 2 && D.monde.vivants().every(p => p.iceConnectionState === 'connected')) && A.monde.appariees(mondes).length === 2 && B.monde.appariees(mondes).length === 2 && C.monde.appariees(mondes).length === 2)));
      v('⛔ les connexions identifient la BONNE paire : chaque page est liée à chacune des deux autres, une fois', tous.slice(0, 3).map(D => D.monde.appariees(mondes).map(x => x.monde).sort()), [['ben', 'cleo'], ['ana', 'cleo'], ['ana', 'ben']]);
      v('⛔ l\'arrivée de Cleo n\'a PAS touché la liaison Ana–Ben : la même connexion, la même offre, rien de refait', [A.monde.pcs.find(p => p.origine === premiereOrigine).fermee, A.monde.pcs.find(p => p.origine === premiereOrigine).localDescription.sdp === premiereOffre, A.monde.pcs.length], [false, true, 2]);
      v('⛔ pour CHAQUE paire, exactement une connexion a offert et c\'est celle du plus petit identifiant', (() => {
        const sorties = [];
        for (const [x, y] of [[A, B], [A, C], [B, C]]) {
          const px = x.monde.vivants().find(p => p.distantOrigine() && p.distantOrigine().startsWith('faux-' + y.login + '-')), py = y.monde.vivants().find(p => p.distantOrigine() && p.distantOrigine().startsWith('faux-' + x.login + '-'));
          const idx = x.moi.id, idy = y.moi.id, offrant = idx < idy ? px : py, autre = idx < idy ? py : px;
          sorties.push([offrant.journal.filter(j => j === 'createOffer').length, autre.journal.filter(j => /^createOffer/.test(j)).length]);
        }
        return sorties;
      })(), [[1, 0], [1, 0], [1, 0]]);
      const sa = await A.src.appel(id), sc = await C.src.appel(id);
      v('l\'hôte voit deux personnes connectées (Ben, Cleo) et Dan qui sonne encore ; Cleo voit Ana, Ben, et Dan qui sonne', [sa.membres.map(m => m.etat + ':' + m.statut).sort(), sc.membres.length, sc.liaison], [['connecte:present', 'connecte:present', 'sonne:invite'], 3, 'connecte']);
      v('⛔ chacun REÇOIT l\'image et la voix de chacun des deux autres (un flux par personne, deux pistes)', tous.slice(0, 3).map(D => D.monde.vivants().map(p => p.recues().join('+')).join('|')), new Array(3).fill('audio+video|audio+video'));
      v('   et `appelFlux(id, uid)` rend le flux d\'UNE personne (jamais de la salle entière), nul pour un absent', [A.src.appelFlux(id, ben.id).getTracks().length, A.src.appelFlux(id, cleo.id) !== A.src.appelFlux(id, ben.id), A.src.appelFlux(id, dan.id), A.src.appelFlux(id, ana.id)], [2, true, null, null]);
    }

    /* ═══ 3. LE DÉBIT ═══ */
    console.log('\nLe débit est plafonné par flux, et suit le nombre de présents');
    {
      const debits = (D) => D.monde.vivants().map(p => [p.debitMax('audio'), p.debitMax('video')]);
      v('⛔ à trois : la voix à 32 kbit/s, l\'image à 600 kbit/s — sur CHAQUE liaison de chaque page', tous.slice(0, 3).map(debits), new Array(3).fill([[32000, 600000], [32000, 600000]]));
      /* Dan répond : à quatre l'image tombe à 400 kbit/s — ET l'événement du service DEVANCE la réponse HTTP (l'ordre d'un vrai navigateur) : la personne n'est pas « prise sur un autre appareil » */
      N.devancer = true;
      const rd = await N.src.repondreAppel(id, true);
      N.devancer = false;
      v('⛔ l\'événement « présent » a bien DEVANCÉ la réponse HTTP (population de la course), et Dan n\'est pas raccroché : il est présent, l\'appel court, aucune issue « pris ailleurs »', [N.devance, rd.entrant, rd.moi.statut, rd.etat, rd.issue, rd.avis], [true, false, 'present', 'en-cours', null, null]);
      donnerPistes(N, id, true);
      vrai('Dan répond : quatre pages, trois connexions chacune', !!(await att(() => tous.every(D => D.monde.vivants().length === 3 && D.monde.vivants().every(p => p.iceConnectionState === 'connected')))));
      await att(() => tous.every(D => debits(D).every(x => x[1] === 400000)));
      v('⛔ à quatre : l\'image à 400 kbit/s sur chaque liaison (le débit sortant total d\'une page reste borné : trois liaisons × 400 + voix)', tous.map(debits), new Array(4).fill([[32000, 400000], [32000, 400000], [32000, 400000]]));
      v('   le débit sortant d\'une page à quatre : 3 × (32 + 400) = 1 296 kbit/s au plus', debits(A).reduce((s, x) => s + x[0] + x[1], 0), 3 * (32000 + 400000));
    }

    /* ═══ 4. QUI PARLE, LA MAIN, LA RÉACTION ═══ */
    console.log('\nQui parle (le niveau de la voix de la liaison), la main levée, la réaction, l\'état de l\'appareil');
    {
      const pBA = B.monde.vivants().find(p => p.distantOrigine() && p.distantOrigine().startsWith('faux-ana-'));
      pBA.niveauDistant = 0.4;
      const parle = await B.attendreSnap(id, s => s.membres.find(m => m.id === ana.id).parle, 4000);
      v('⛔ la voix d\'Ana arrive sur la liaison de Ben : sa tuile PARLE chez lui (contour vert) — et chez lui seul', [!!parle, (await C.src.appel(id)).membres.find(m => m.id === ana.id).parle], [true, false]);
      pBA.niveauDistant = 0;
      const tait = await B.attendreSnap(id, s => !s.membres.find(m => m.id === ana.id).parle, 4000);
      vrai('elle se tait : le contour s\'éteint (après la tenue de 150 ms du banc)', !!tait);
      await A.src.salleAction(id, 'main', { actif: true });
      const main = await B.attendreSnap(id, s => s.membres.find(m => m.id === ana.id).main, 4000);
      v('Ana lève la main : tous la voient (`main` sur sa tuile), elle aussi', [!!main, (await A.src.appel(id)).moi.main, (await C.src.appel(id)).membres.find(m => m.id === ana.id).main], [true, true, true]);
      await A.src.salleAction(id, 'main', { actif: false });
      vrai('elle la baisse : elle disparaît partout', !!(await B.attendreSnap(id, s => !s.membres.find(m => m.id === ana.id).main, 4000)));
      B.evs.length = 0;
      await A.src.salleAction(id, 'reaction', { emoji: 'bravo' });
      const ev = await B.attendreEv(e => e.type === 'salle-reaction', 4000);
      v('⛔ une réaction : l\'événement `salle-reaction` (de qui, quoi) arrive à Ben', [ev && ev.uid === ana.id, ev && ev.emoji], [true, 'bravo']);
      const e = await attrape(A.src.salleAction(id, 'reaction', { emoji: '💩' }));
      v('⛔ une réaction hors liste est REFUSÉE par le service, et la page le dit tel quel', [codeDe(e), phrase(e) !== ''], ['champ_invalide', true]);
      const eInconnu = await attrape(A.src.salleAction(id, 'explosion', {}));
      v('une action inconnue : refus local', codeDe(eInconnu), 'invalide');
      /* l'état de MON appareil : la caméra de Ben s'éteint, la tuile de Ben change chez Ana */
      B.src.appelPistes(id, { audio: pisteDe(B, 'audio'), video: null });
      const sansCam = await A.attendreSnap(id, s => s.membres.find(m => m.id === ben.id).camera === false, 4000);
      B.src.appelPistes(id, { audio: pisteDe(B, 'audio'), video: pisteDe(B, 'video') });
      const avecCam = await A.attendreSnap(id, s => s.membres.find(m => m.id === ben.id).camera === true, 4000);
      v('⛔ la caméra de Ben s\'éteint puis se rallume : l\'état part au service, les autres le lisent (l\'image de sa tuile)', [!!sansCam, !!avecCam], [true, true]);
      /* le micro coupé par l'hôte : une DEMANDE */
      const cm = await A.src.salleAction(id, 'couperMicro', { uid: ben.id });
      const dem = await B.attendreEv(e2 => e2.type === 'salle-micro', 4000);
      v('⛔ « couper le micro » est une DEMANDE : le service la relaie (`demande:true`), la page de Ben reçoit `salle-micro` et la garde dans sa vue ; elle ne coupe rien d\'elle-même', [cm.demande, dem && dem.de === ana.id, (await B.src.appel(id)).demandeMicro && (await B.src.appel(id)).demandeMicro.de === ana.id, pisteDe(B, 'audio').enabled], [true, true, true, true]);
      B.src.accuserMicro(id);
      v('   Ben l\'accuse (la demande s\'efface de sa vue)', (await B.src.appel(id)).demandeMicro, null);
    }

    /* ═══ 4 bis. L'ÉPINGLE ET LE MINUTEUR : celui qui les pose les VOIT ═══ */
    console.log('\nL\'épingle et le minuteur : le service ne les pousse pas à celui qui les pose — il les lui rend');
    {
      await A.src.salleAction(id, 'evt', { k: 'epingle', donnees: { op: 'epingler', uid: ben.id } });
      await A.src.salleAction(id, 'evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 90 } });
      const sa = await A.src.appel(id);
      v('⛔ l\'hôte qui épingle Ben et lance un minuteur de 90 s les voit AUSSITÔT dans son propre cliché (sinon il ne trouverait ni « Retirer l\'épingle » ni « Arrêter »)', [sa.epingle, sa.minuteur && sa.minuteur.secondes], [ben.id, 90]);
      vrai('… et Ben, lui, les reçoit par le flux', !!(await B.attendreSnap(id, s => s.epingle === ben.id && s.minuteur && s.minuteur.secondes === 90, 6000)));
      await A.src.salleAction(id, 'evt', { k: 'epingle', donnees: { op: 'retirer' } });
      await A.src.salleAction(id, 'evt', { k: 'minuteur', donnees: { op: 'arreter' } });
      const sb = await A.src.appel(id);
      v('⛔ il les RETIRE : son cliché ne les porte plus (l\'ordre est suivi dans les deux sens), et Ben le sait', [sb.epingle, sb.minuteur, !!(await B.attendreSnap(id, s => s.epingle === null && s.minuteur === null, 6000))], [null, null, true]);
    }

    /* ═══ 5. LA SALLE D'ATTENTE, L'EXCLUSION, LE DÉPART DE L'HÔTE ═══ */
    console.log('\nLa salle d\'attente, l\'exclusion, le départ de l\'hôte, le retour de quelqu\'un');
    {
      /* Eve rejoint : elle n'est pas du groupe ni invitée → introuvable */
      const eE = await attrape(E.src.rejoindreAppel(id));
      v('⛔ Eve (ni invitée ni membre du groupe) : « introuvable », comme pour une salle qui n\'existe pas — aucune connexion n\'a été ouverte', [codeDe(eE), E.monde.pcs.length, E.src.appelActif()], ['introuvable', 0, null]);
      /* sallesOuvertes : Cleo (qui y est) n'en a pas ; Eve non plus */
      v('les salles à rejoindre : aucune pour ceux qui y sont, aucune pour qui n\'est pas du groupe', [(await A.src.sallesOuvertes()).length, (await E.src.sallesOuvertes()).length], [0, 0]);
      /* exclure Cleo */
      const px = tous.map(D => D.monde.vivants().length);
      await A.src.salleAction(id, 'exclure', { uid: cleo.id });
      const fin_ = await C.attendreSnap(id, s => s.etat === 'termine', 6000);
      v('⛔ Ana EXCLUT Cleo : sa page l\'apprend (`termine`, issue « exclu », la phrase de l\'hôte), toutes ses connexions sont fermées, plus de flux', [fin_ && fin_.issue, fin_ && fin_.avis, C.monde.vivants().length, C.src.appelFlux(id, ana.id)], ['exclu', 'L\'hôte t\'a retiré de l\'appel.', 0, null]);
      vrai('   et chez les autres, les liaisons avec Cleo sont fermées (deux connexions restent à chacun) — les autres n\'ont pas bougé', !!(await att(() => [A, B, N].every(D => D.monde.vivants().length === 2))));
      v('population : avant l\'exclusion, chacun avait trois connexions', px, [3, 3, 3, 3]);
      const eR = await attrape(C.src.rejoindreAppel(id));
      v('⛔ l\'exclue ne revient pas : « exclu », avec sa phrase, aucune connexion rouverte', [codeDe(eR), phrase(eR), C.monde.pcs.filter(p => !p.fermee).length], ['exclu', 'L\'hôte t\'a retiré de cette salle : tu ne peux pas y revenir.', 0]);
      /* le départ de l'hôte */
      const pb0 = B.monde.vivants().map(p => p.origine).sort();
      await A.src.terminerAppel(id);
      const succ = await B.attendreSnap(id, s => s.moi.hote, 6000);
      v('⛔ Ana QUITTE : Ben (le plus ancien) devient hôte, la salle court, ses liaisons avec Dan n\'ont pas bougé', [!!succ, succ && succ.moi.proprietaire, A.monde.vivants().length, B.monde.vivants().filter(p => pb0.includes(p.origine)).length], [true, true, 0, 1]);
      v('   Ana n\'est plus dans la salle : plus d\'appel actif chez elle, et la page n\'en garde plus que l\'enregistrement', [A.src.appelActif(), await A.src.appel(id)], [null, null]);
      /* son retour : liaison REFAITE */
      const pdAvant = N.monde.vivants().map(p => p.origine).sort();
      const rj = await A.src.rejoindreAppel(id);
      donnerPistes(A, id, true);
      v('Ana REVIENT par le bandeau : présente, hôte pas (Ben l\'est), passage 2', [rj.moi.statut, rj.moi.hote, rj.salle], [ 'present', false, true]);
      vrai('⛔ ses liaisons sont NEUVES (une nouvelle connexion avec Ben et Dan), et l\'ancienne côté Dan est fermée', !!(await att(() => A.monde.vivants().length === 2 && N.monde.vivants().length === 2 && N.monde.pcs.filter(p => p.fermee).some(p => p.distantOrigine() && p.distantOrigine().startsWith('faux-ana-')) && A.monde.appariees(mondes).length === 2)));
      vrai('   la liaison Ben–Dan, elle, est la MÊME (rien n\'a été refait entre eux)', B.monde.vivants().some(p => p.distantOrigine() && p.distantOrigine().startsWith('faux-dan-') && pb0.includes(p.origine)));
      void pdAvant;
    }

    /* ═══ 6. LE VERROU, LA SALLE D'ATTENTE, LA FIN POUR TOUS ═══ */
    console.log('\nLe verrou, la salle d\'attente, la fin pour tous : chaque refus a sa phrase, chaque admission forme ses liaisons');
    {
      await A.src.ajouterMembres(groupe.id, [eve.id]);
      const ouvertes = await E.src.sallesOuvertes();
      v('⛔ Eve, désormais membre du groupe, voit la salle parmi celles à rejoindre (le bandeau « Appel en cours · Rejoindre »), avec son titre et le nombre de présents ; ceux qui y sont ne la voient plus', [ouvertes.map(x => [x.id === id, x.titre, x.nb, x.capacite, x.genre]), (await B.src.sallesOuvertes()).length], [[[true, 'Équipe terrain', 3, 4, 'groupe']], 0]);
      const hote = A.src.appelActif() ? A : B;
      void hote;
      await B.src.salleAction(id, 'verrouiller', { actif: true });
      const eV = await attrape(E.src.rejoindreAppel(id));
      v('⛔ salle VERROUILLÉE : Eve est refusée avec sa phrase, aucune connexion ouverte', [codeDe(eV), phrase(eV), E.monde.pcs.length, E.src.appelActif()], ['verrouillee', 'L\'hôte a verrouillé la salle : personne ne peut plus y entrer.', 0, null]);
      v('   la salle le dit à ses occupants (`verrou` vrai dans leur vue)', (await A.attendreSnap(id, s2 => s2.verrou, 4000)) !== null, true);
      await B.src.salleAction(id, 'verrouiller', { actif: false });
      await B.src.salleAction(id, 'attente', { actif: true });
      const sE = await E.src.rejoindreAppel(id);
      v('⛔ la salle d\'attente : Eve ATTEND — pas présente, aucune connexion ouverte, la page le dit (`attente`) ; l\'hôte voit UNE personne à la porte', [sE.attente, sE.moi.statut, E.monde.pcs.length, ((await B.attendreSnap(id, s2 => s2.enAttente === 1, 4000)) || {}).enAttente], [true, 'attente', 0, 1]);
      v('   ceux qui sont dedans n\'ont pas de connexion avec elle', [A, B, N].map(D => D.monde.vivants().length), [2, 2, 2]);
      await B.src.salleAction(id, 'admettre', { uid: eve.id });
      donnerPistes(E, id, true);
      vrai('⛔ Eve est admise : les liaisons se forment avec les TROIS autres (la maille à quatre), chacun a trois connexions', !!(await att(() => [A, B, N, E].every(D => D.monde.vivants().length === 3 && D.monde.vivants().every(p => p.iceConnectionState === 'connected')) && E.monde.appariees(mondes.concat([E.monde])).length === 3)));
      v('   à quatre, le débit de l\'image retombe à 400 kbit/s sur les liaisons d\'Eve aussi', E.monde.vivants().map(p => p.debitMax('video')), [400000, 400000, 400000]);
      /* la fin pour tous */
      const fe = [A, B, N, E].map(D => D.monde.vivants().length);
      await B.src.salleAction(id, 'terminerPourTous', {});
      const fins = await Promise.all([A, N, E].map(D => D.attendreSnap(id, s2 => s2.etat === 'termine', 6000)));
      v('⛔ l\'hôte TERMINE pour tous : chacun apprend « l\'hôte a mis fin à l\'appel », toutes les connexions sont fermées', [fins.map(x => x && x.issue), fins.map(x => x && x.avis), [A, B, N, E].map(D => D.monde.vivants().length)], [['termine', 'termine', 'termine'], new Array(3).fill('L\'hôte a mis fin à l\'appel.'), [0, 0, 0, 0]]);
      v('population : avant la fin, chacun avait trois connexions', fe, [3, 3, 3, 3]);
      await Promise.all([A, B, N, E].map(D => D.src.terminerAppel(id).catch(() => null)));
    }

    /* ═══ 7. DIRECT D'ABORD, RELAIS EN REPLI, PAIRE PAR PAIRE ═══ */
    console.log('\nDirect d\'abord, relais en repli, paire par paire : une liaison qui passe seule ne reçoit JAMAIS de serveur de relais');
    {
      A.monde.exigeRelais = ['dan']; N.monde.exigeRelais = ['ana'];                      // aucun trajet direct entre Ana et Dan (un réseau d'entreprise) ; Ana–Ben et Ben–Dan passent seuls
      const iceAvant = [A, B, N].map(D => D.nbRequetes(/GET \/api\/ice/));
      const s2 = await A.src.demarrerAppel({ membres: [ben.id, dan.id], video: true });
      const id2 = s2.id;
      v('une salle de personnes CHOISIES (deux invités, pas de conversation) : groupe, vidéo, sans nom de groupe — les prénoms', [s2.groupe, s2.conv, s2.nom.split(', ').sort()], [true, null, ['Ben', 'Dan']]);
      await B.attendreEv(e => e.type === 'appel-entrant' && e.id === id2); await N.attendreEv(e => e.type === 'appel-entrant' && e.id === id2);
      donnerPistes(A, id2, true);
      await B.src.repondreAppel(id2, true); donnerPistes(B, id2, true);
      await N.src.repondreAppel(id2, true); donnerPistes(N, id2, true);
      vrai('⛔ les trois liaisons s\'établissent : Ana–Ben et Ben–Dan seules, Ana–Dan APRÈS le repli sur le relais (les deux côtés le prennent)', !!(await att(() => [A, B, N].every(D => D.monde.vivants().length === 2 && D.monde.vivants().every(p => p.iceConnectionState === 'connected')), 10000)));
      const rel = (D) => D.monde.vivants().map(p => [p.distantOrigine().split('-')[1], p.avecRelais()]).sort((x, y) => x[0] < y[0] ? -1 : 1);
      v('⛔ SEULE la paire Ana–Dan a un relais dans sa configuration — des DEUX côtés ; Ana–Ben et Ben–Dan n\'en ont JAMAIS reçu (aucune allocation inutile)', [rel(A), rel(B), rel(N)], [[['ben', false], ['dan', true]], [['ana', false], ['dan', false]], [['ana', true], ['ben', false]]]);
      v('   la configuration des liaisons directes ne porte que le STUN du service ; celle du repli porte le relais ET le STUN', [A.monde.vivants().find(p => p.distantOrigine().startsWith('faux-ben-')).confs.map(c => c.iceServers.length), A.monde.vivants().find(p => p.distantOrigine().startsWith('faux-dan-')).conf.iceServers.length], [[1], 2]);
      v('⛔ l\'offre du repli porte l\'ICE redémarré, et l\'autre côté a SUIVI : un seul redémarrage, côté offrant', (() => {
        const pa = A.monde.vivants().find(p => p.distantOrigine().startsWith('faux-dan-')), pd = N.monde.vivants().find(p => p.distantOrigine().startsWith('faux-ana-'));
        const petit = ana.id < dan.id ? pa : pd, autre = ana.id < dan.id ? pd : pa;
        return [petit.journal.filter(x => x === 'createOffer:restart').length, autre.journal.filter(x => x === 'createOffer:restart').length];
      })(), [1, 0]);
      v('chaque page n\'a demandé ses identifiants de relais qu\'UNE fois pour cette salle (pas une fois par paire)', [A, B, N].map((D, i) => D.nbRequetes(/GET \/api\/ice/) - iceAvant[i]), [1, 1, 1]);
      A.monde.exigeRelais = false; N.monde.exigeRelais = false;
      await A.src.terminerAppel(id2);
      await B.attendreSnap(id2, s3 => s3.etat === 'termine' || s3.nb <= 2, 5000);
      await B.src.terminerAppel(id2); await N.src.terminerAppel(id2);
    }

    /* ═══ 8. LA SALLE D'UNE RÉUNION ET LE LIEN D'INVITÉ ═══ */
    console.log('\nLa salle d\'une réunion programmée : « Rejoindre », l\'hôte par intérim, le lien d\'invité — aperçu public, entrée par le code, renouvellement');
    {
      const debut = Date.now() + 5 * 60000;
      const r = await A.src.programmer({ titre: 'Point d\'équipe', debut, fin: debut + 3600000, invites: [ben.id], salle_attente: false });
      const fiche = await A.src.reunion(r.id);
      v('la fiche de la réunion porte sa salle : rejoignable (la fenêtre s\'ouvre quinze minutes avant), pas encore ouverte', [fiche.salle.rejoignable, fiche.salle.ouverte, fiche.attente], [true, false, false]);
      const sb = await B.src.rejoindreReunion(r.id, 'video');
      donnerPistes(B, sb.id, true);
      v('⛔ Ben ouvre la salle avant l\'organisatrice : présent, hôte PAR INTÉRIM, genre « reunion » ; personne n\'a sonné (aucun `appel-entrant` chez Ana)', [sb.moi.statut, sb.moi.hote, sb.genre, sb.reunion === r.id, A.evs.some(e => e.type === 'appel-entrant')], ['present', true, 'reunion', true, false]);
      const sa = await A.src.rejoindreReunion(r.id, 'video');
      donnerPistes(A, sa.id, true);
      vrai('l\'organisatrice entre : la liaison Ana–Ben s\'établit', !!(await att(() => A.monde.vivants().length === 1 && B.monde.vivants().length === 1 && A.monde.vivants()[0].iceConnectionState === 'connected')));
      v('⛔ elle REPREND la main : hôte propriétaire ; Ben reste co-hôte (il garde le pouvoir d\'admettre)', [(await A.src.appel(sa.id)).moi.proprietaire, (await B.src.appel(sa.id)).moi.hote, (await B.src.appel(sa.id)).moi.proprietaire], [true, true, false]);
      /* le lien */
      const code = await A.src.lienReunion(r.id);
      v('l\'hôte lit le lien (22 caractères) ; un invité qui n\'est pas l\'hôte ne le lit pas', [/^[A-Za-z0-9_-]{22}$/.test(code), codeDe(await attrape(B.src.lienReunion(r.id)))], [true, 'interdit']);
      const ap = await C.src.apercuReunion(code);
      v('⛔ l\'APERÇU est lisible par Cleo (qui n\'a aucun lien avec la réunion) : le titre, l\'horaire, « en cours », « compte requis » — rien d\'autre', [ap.titre, ap.enCours, ap.attente, ap.compteRequis, Object.keys(ap).sort()], ['Point d\'équipe', true, false, true, ['attente', 'compteRequis', 'debut', 'enCours', 'fin', 'titre']]);
      const sc = await C.src.rejoindreParCode(code, 'video');
      donnerPistes(C, sc.id, true);
      v('⛔ Cleo entre PAR LE CODE : présente dans LA salle de la réunion (pas une autre), la réunion est dans son agenda', [sc.moi.statut, sc.id === sa.id, (await C.src.reunions(Date.now() - 86400000, Date.now() + 86400000)).some(x => x.id === r.id)], ['present', true, true]);
      vrai('⛔ la maille à trois se forme (Cleo a une connexion avec chacun)', !!(await att(() => [A, B, C].every(D => D.monde.vivants().length === 2 && D.monde.vivants().every(p => p.iceConnectionState === 'connected')) && C.monde.appariees(mondes).length === 2)));
      const code2 = await A.src.renouvelerLienReunion(r.id);
      v('⛔ l\'hôte RENOUVELLE : un code neuf, l\'ancien MEURT (aperçu et entrée refusés, avec sa phrase) — et ceux qui sont déjà dans la salle y restent', [code2 !== code, /^[A-Za-z0-9_-]{22}$/.test(code2), codeDe(await attrape(E.src.apercuReunion(code))), codeDe(await attrape(E.src.rejoindreParCode(code, 'audio'))), (await C.src.appel(sa.id)).etat], [true, true, 'lien_invalide', 'lien_invalide', 'en-cours']);
      const ap2 = await E.src.apercuReunion(code2);
      v('   le nouveau code marche (aperçu)', ap2.titre, 'Point d\'équipe');
      /* pendant qu'on est dans une salle, on ne lance ni n'entre ailleurs : un onglet, un appel */
      const lancesAvant = A.nbRequetes(/POST \/api\/appels$/);
      const dedans = await attrape(A.src.demarrerAppel({ membres: [eve.id], video: false }));
      v('⛔ UN ONGLET, UN APPEL : Ana, dans une salle, n\'en lance pas un autre — refus LOCAL « occupé » (`moi:true`), aucune requête de plus', [codeDe(dedans), dedans && dedans.moi, A.nbRequetes(/POST \/api\/appels$/) - lancesAvant], ['occupe', true, 0]);
      const dedans2 = await attrape(A.src.rejoindreAppel('a_' + '0'.repeat(32)));
      v('   ni n\'entre dans une autre : refus local', codeDe(dedans2), 'occupe');
      await Promise.all([A, B, C].map(D => D.src.terminerAppel(sa.id)));
      /* l'historique d'un appel de groupe */
      const hist = await A.src.appels('tous');
      const lignes = hist.filter(x => x.groupe);
      v('⛔ l\'historique d\'Ana porte les appels de GROUPE (une ligne par appel), avec leur nom (le groupe, les prénoms, la réunion), leur type et les participants', [lignes.length >= 3, lignes.map(x => x.nom.split(', ').sort().join(', ')).slice(0, 3).sort(), lignes[0].membres.every(m => typeof m === 'string'), lignes.every(x => x.groupe === true && Number.isFinite(x.t))], [true, ['Ben, Dan', 'Point d\'équipe', 'Équipe terrain'].sort(), true, true]);
      const manques = await B.src.appels('manques');
      v('   et le filtre « manqués » ne garde que les entrants non pris (population : Ben a tout pris)', manques.length, 0);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
  await svc.arreter(); await og.fermer();
  fin();
})();
