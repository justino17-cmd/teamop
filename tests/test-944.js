/* ⛔ CE QUE CE FICHIER GARDE — L'APPAREIL ET LE SERVICE SE PARLENT À PROPOS DES PIÈCES (famille 4, modèle `test-911`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` sont exécutées dans Node — avec un `fetch` à cookies qui
   accepte un `Blob` en corps, comme un navigateur — contre le VRAI `server-msg/index.js` lancé isolé. `test-943` prouve que le service range et sert les
   pièces ; `test-911` que le module parle au service pour le texte ; celui-ci dit que le module envoie, relit et réclame les PIÈCES comme le service les
   attend : la couture qui a déjà coûté trois fois à ce dépôt (CLAUDE.md, « la plus dangereuse »). Chaque moitié est juste seule ; les bancs de l'une ne
   voient pas la faute de l'autre.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · UNE PIÈCE DÉJÀ DÉPOSÉE N'EST PAS REDÉPOSÉE : le service tombe (503) après le dépôt, le message n'arrive jamais, le renvoi cite la pièce qui est déjà là — un seul dépôt ; et de deux
       photos dont la seconde échoue, la première ne repart pas. (La « réponse perdue » d'un message ARRIVÉ ne prouve rien là-dessus : le flux le rend, la file n'a plus rien à renvoyer.) ;
     · L'ORDRE D'ENVOI EST L'ORDRE DES MESSAGES : un texte écrit pendant le dépôt lent d'une photo arrive APRÈS elle, jamais avant — et la file vidée pendant ce dépôt ne le relance pas ;
     · UN REFUS SE DIT, AVEC SA PHRASE, ET RIEN N'EST ENVOYÉ : trop lourd (dit avant d'ouvrir une connexion), 415, 402 (« espace plein », pas « réessaie dans un
       instant »), 429 avec son attente, 413 d'un relais en HTML — et un message en file refusé APRÈS COUP le dit aussi, et libère ses adresses locales ;
     · LA MÉMOIRE DES PIÈCES EST BORNÉE ET RENDUE : jamais plus d'adresses vivantes que la borne, tout est libéré à l'arrêt, un message effacé libère les siennes ;
     · L'IMAGE QU'ON VIENT D'ENVOYER NE SE RELIT PAS : l'adresse fabriquée par la page devient la mémoire de la pièce (aucun GET) ;
     · LES 30 DERNIÈRES PHOTOS SEULES SE LISENT D'AVANCE (une conversation de cent photos ne se télécharge pas d'un coup), les autres au toucher ;
     · UN FICHIER NE SE GARDE JAMAIS EN MÉMOIRE (aucune adresse fabriquée) ; son nom est assaini PAR L'APPAREIL (lu dans la requête qu'il envoie, pas dans ce que le service rend) ;
     · UNE PHOTO DE PROFIL D'UN ÉTRANGER NE SE LIT PAS, UN BLOCAGE LA CACHE, ET UN PROFIL QUI CHANGE PRÉVIENT LES AUTRES (événement `personne`). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const blobDe = (buf, type) => new Blob([buf], { type: type || 'application/octet-stream' });
const PNG = F.png();
const PHOTO_MAX = 307200, VOCAL_MAX = 204800, FICHIER_MAX = 716800, AVATAR_MAX = 102400;   // 300, 200, 700 et 100 Kio : « 300 Ko au plus » se lit tel quel

/* Un « appareil » : un navigateur de poche (cookie, Origin) dont on peut COUPER le réseau, RETENIR une requête, PERDRE une réponse, FORCER une réponse, et dont on compte les requêtes ET les adresses blob:. */
function monter(svc, opts = {}) {
  const nav = T.navigateur(svc.base);
  const reseau = { coupe: false, requetes: [], urls: [], depots: [], tirsFile: 0, retenir: null, forcer: null, perdre: null };
  const urls = { creees: new Map(), revoquees: [] };
  const creerUrl = (b) => { const u = 'blob:http://127.0.0.1/' + crypto.randomUUID(); urls.creees.set(u, b); return u; };
  const revoquerUrl = (u) => { urls.revoquees.push(u); };
  const f = async (url, init) => {
    const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0], cle = m + ' ' + chemin;
    reseau.requetes.push(cle);
    reseau.urls.push(m + ' ' + u.replace(svc.base, ''));            // l'adresse ENTIÈRE, requête comprise : ce que l'appareil ENVOIE
    if (m === 'POST' && chemin === '/api/pieces') reseau.depots.push({ url: u.replace(svc.base, ''), entetes: Object.assign({}, (init && init.headers) || {}) });
    if (reseau.coupe) throw new TypeError('réseau coupé');
    if (reseau.retenir && reseau.retenir.re.test(cle)) { await reseau.retenir.attente; if (reseau.coupe) throw new TypeError('réseau coupé'); }
    if (reseau.forcer && reseau.forcer.re.test(cle)) {
      const x = reseau.forcer;
      if (x.saute > 0) x.saute--;                                     // les premières requêtes passent (la seconde photo échoue, pas la première)
      else if (x.fois !== undefined && --x.fois < 0) reseau.forcer = null;
      else return new Response(x.corps, { status: x.code, headers: x.entetes || { 'Content-Type': 'application/json' } });
    }
    const r = await nav.fetch(url, init);
    if (reseau.perdre && reseau.perdre.test(cle)) { reseau.perdre = null; throw new TypeError('réponse perdue'); }
    return r;
  };
  /* la minuterie de la FILE D'ENVOI (120 ms : `attenteEnvoi`) se compte quand elle tire : « la file a été vidée pendant ce temps » se prouve, elle ne se suppose pas */
  const planifier = (fn, ms) => setTimeout(() => { if (ms === 120) reseau.tirsFile++; fn(); }, ms);
  const src = creerSourceServeur(Object.assign({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, planifier, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, creerUrl, revoquerUrl, delaiReessaiPieceMs: 300 }, opts));
  const evs = [], morts = [];
  src.ecouter(e => evs.push(e));
  src.surSessionMorte(m => morts.push(m));
  const nb = (re) => reseau.requetes.filter(r => re.test(r)).length;
  return {
    src, evs, morts, reseau, nav, urls, nb,
    async entrer(login, pass) { await src.connexion(login, pass); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
    attendreEv: (pred, ms) => att(() => evs.find(pred) || null, ms),
    retenir(re) { let liberer; const attente = new Promise(ok => { liberer = ok; }); reseau.retenir = { re, attente }; return () => { reseau.retenir = null; liberer(); }; },
    vivantes: () => Array.from(urls.creees.keys()).filter(u => !urls.revoquees.includes(u)),
  };
}
const vues = async (S, conv) => (await S.src.ouvrir(conv)).messages;
const trouve = (S, conv, pred, ms) => att(async () => (await vues(S, conv)).find(pred) || null, ms);
const octets = async (S, url) => Buffer.from(await S.urls.creees.get(url).arrayBuffer());

(async () => {
  const og = await T.fauxOpGestion({
    alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Petit', actif: true }, chloe: { pass: 'pw-chloe-1234', nom: 'Chloé Durand', actif: true },
    dora: { pass: 'pw-dora-12345', nom: 'Dora Étrangère', actif: true }, eve: { pass: 'pw-eve-123456', nom: 'Eve Quota', actif: true },
  });
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-944-'));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, dossier: racine, config: {
    pulsationMs: 400, presenceGraceMs: 300, balayageMs: 150, beta: { relectureMs: 250, timeoutMs: 800 },
    pieces: { photoMax: PHOTO_MAX, vocalMax: VOCAL_MAX, fichierMax: FICHIER_MAX, avatarMax: AVATAR_MAX, bloc: 4096 },
    quotas: { piece: { max: 1000, fenetreMs: 3600000 }, moi_avatar: { max: 1000, fenetreMs: 3600000 } } } });
  const A = monter(svc), B = monter(svc), C = monter(svc), D = monter(svc);
  const appareils = [A, B, C, D];
  try {
    const ma = await A.entrer('alice', 'pw-alice-1234'), mb = await B.entrer('bruno', 'pw-bruno-1234'), mc = await C.entrer('chloe', 'pw-chloe-1234'), md = await D.entrer('dora', 'pw-dora-12345');
    const l1 = await A.src.lienContact(); const conv = (await B.src.accepterLien(l1.code)).conv;
    const l2 = await A.src.lienContact(); await C.src.accepterLien(l2.code);
    await att(() => A.src.contacts().length === 2);

    /* ═══ 1. UNE PHOTO : envoyée, vue chez l'autre, relue octet pour octet ═══════════════════════════════════════════════════════════ */
    console.log('Une photo : elle part (pièce déposée puis message), paraît chez l\'autre sans rechargement, et celui qui l\'a envoyée ne la relit pas');
    let msgPhoto = null;
    {
      const urlLocale = A.urls.creees.size, aff = creerLocale(A, PNG);
      const r = await A.src.envoyer(conv, { photos: [{ blob: aff.blob, url: aff.url, w: 8, h: 8 }] });
      vrai('envoyer rend le message (pas une file : le service a répondu)', r && r.id && !r.attente);
      v('⛔ deux requêtes, dans cet ordre : le dépôt de la pièce, puis le message qui la cite', A.reseau.requetes.filter(x => /^POST \/api\/(pieces|conversations\/c_[0-9a-f]+\/messages)$/.test(x)).map(x => x.replace(/c_[0-9a-f]+/, 'c_')), ['POST /api/pieces', 'POST /api/conversations/c_/messages']);
      msgPhoto = await trouve(B, conv, m => m.photos && m.photos.length === 1);
      vrai('population : Bruno voit le message photo, sans recharger, avec ses dimensions et le nom de la pièce', !!msgPhoto && msgPhoto.photos[0].w === 8 && msgPhoto.photos[0].h === 8 && /^f_[0-9a-f]{32}$/.test(msgPhoto.photos[0].piece));
      const lue = await trouve(B, conv, m => m.photos && m.photos[0].url);
      vrai('⛔ la photo arrive chez Bruno : une adresse blob: FABRIQUÉE par le module, et ses octets sont ceux du PNG envoyé', !!lue && /^blob:/.test(lue.photos[0].url) && (await octets(B, lue.photos[0].url)).equals(PNG));
      const mienne = (await vues(A, conv)).find(m => m.photos);
      v('⛔ chez celui qui l\'a envoyée, l\'image est celle que la page avait fabriquée (aucune relecture : zéro GET /api/pieces, aucune adresse de plus)', [mienne.photos[0].url === aff.url, A.nb(/^GET \/api\/pieces\//), A.urls.creees.size - urlLocale], [true, 0, 1]);
      v('l\'aperçu de la liste dit « Photo »', (await B.src.lister()).find(c => c.id === conv).apercu, 'Photo');
      const ban = await B.attendreEv(e => e.type === 'arrivee' && e.conv === conv);
      v('la bannière d\'un message photo dit « Photo » (jamais un texte vide)', ban && ban.texte, 'Photo');
      v('une photo ne se modifie pas, mais on y répond : la citation dit « Photo »', await (async () => {
        const rep = await B.src.envoyer(conv, { texte: 'belle photo', reponse: msgPhoto.id });
        const m = await trouve(A, conv, x => x.texte === 'belle photo');
        return [!!rep, m && m.reponse && m.reponse.texte];
      })(), [true, 'Photo']);
    }

    /* ═══ 2. DEUX PHOTOS D'UN MESSAGE, DANS L'ORDRE ═════════════════════════════════════════════════════════════════════════════ */
    {
      const a1 = creerLocale(A, F.png({ couleur: [10, 200, 10] })), a2 = creerLocale(A, F.png({ couleur: [10, 10, 200] }));
      await A.src.envoyer(conv, { photos: [{ blob: a1.blob, url: a1.url, w: 8, h: 8 }, { blob: a2.blob, url: a2.url, w: 8, h: 8 }] });
      const m = await trouve(B, conv, x => x.photos && x.photos.length === 2);
      vrai('⛔ un message de deux photos : les deux arrivent, dans l\'ordre où elles ont été choisies', !!m && await att(async () => { const k = (await vues(B, conv)).find(x => x.photos && x.photos.length === 2); return k.photos.every(p => p.url); }) &&
        (await octets(B, (await vues(B, conv)).find(x => x.photos && x.photos.length === 2).photos[1].url)).equals(a2.buf));
      const ban2 = B.evs.filter(e => e.type === 'arrivee' && e.texte === '2 photos').length;
      v('et la bannière dit « 2 photos »', ban2, 1);
    }

    /* ═══ 3. « ENVOI… », L'ORDRE, LES REPRISES ══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn dépôt lent : « Envoi… » paraît tout de suite, ce qui est écrit après attend son tour, une coupure met en file sans redéposer');
    {
      const liberer = A.retenir(/^POST \/api\/pieces$/), msgs = /^POST \/api\/conversations\/c_[0-9a-f]+\/messages$/;
      const depotsAvant = A.nb(/^POST \/api\/pieces$/), messagesAvant = A.nb(msgs);
      const loc = creerLocale(A, F.png({ couleur: [200, 200, 10] }));
      const p1 = A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      const vu = await att(async () => (await vues(A, conv)).find(m => m.attente && m.photos));
      vrai('⛔ « Envoi… » : tant que le dépôt court, la bulle est là (attente + envoi), avec l\'image de l\'appareil', !!vu && vu.envoi === true && vu.photos[0].url === loc.url && vu.photos[0].piece === null);
      v('et le compteur de messages qui n\'ont pas quitté l\'appareil le dit (la page prévient avant de fermer)', A.src.enAttente(), 1);
      const p2 = await A.src.envoyer(conv, { texte: 'après la photo' });
      vrai('⛔ un texte écrit PENDANT le dépôt rejoint la file (« en attente »), il ne double pas la photo', p2.attente === true && A.src.enAttente() === 2);
      /* ⛔ pendant que le dépôt dure, la file est VIDÉE (la minuterie tire, plusieurs fois) et ne relance rien : un seul dépôt, aucun message parti, ni la photo ni le texte.
         Sans la garde « un dépôt est en cours », la file reprenait la photo en même temps que son premier essai — deux téléversements de la même image. */
      const tirs0 = A.reseau.tirsFile;
      vrai('population : la minuterie de la file a tiré au moins deux fois pendant que le dépôt durait (la garde a vraiment été jouée)', await att(() => A.reseau.tirsFile >= tirs0 + 2));
      v('⛔ …et un SEUL dépôt a été entrepris, aucun message n\'a quitté l\'appareil', [A.nb(/^POST \/api\/pieces$/) - depotsAvant, A.nb(msgs) - messagesAvant], [1, 0]);
      liberer();
      await p1;
      const t = await trouve(B, conv, m => m.texte === 'après la photo');
      const fil = await vues(B, conv), iTexte = fil.findIndex(m => m.texte === 'après la photo');
      vrai('⛔ l\'ordre d\'envoi est l\'ordre des messages : la photo, PUIS le texte (le message juste avant le texte est la photo)', !!t && iTexte > 0 && !!fil[iTexte - 1].photos && fil[iTexte - 1].auteur === ma.id);
      vrai('et la file est vide chez Alice (rien n\'est resté en attente)', await att(() => A.src.enAttente() === 0));
    }
    {
      /* la réponse du MESSAGE se perd : la pièce est déjà déposée, le renvoi ne la redépose pas */
      const avant = A.nb(/^POST \/api\/pieces$/);
      A.reseau.perdre = /^POST \/api\/conversations\/c_[0-9a-f]+\/messages$/;
      const loc = creerLocale(A, F.png({ couleur: [90, 90, 90] }));
      const r = await A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      vrai('la réponse du message s\'est perdue : « en attente » (pas une erreur, pas un échec)', r.attente === true && r.envoi === false);
      vrai('⛔ le renvoi réussit tout seul, la file se vide, et la pièce n\'a été déposée QU\'UNE FOIS', await att(() => A.src.enAttente() === 0) && A.nb(/^POST \/api\/pieces$/) - avant === 1);
      await T.dort(200);
      v('⛔ chez Bruno, ce message-là n\'existe qu\'une fois (même `cid`)', (await vues(B, conv)).filter(m => m.photos && m.photos[0].piece && m.photos.length === 1).length, 3);
    }
    {
      /* ⛔ LE SERVICE TOMBE (503) APRÈS UN DÉPÔT RÉUSSI : le message n'arrive JAMAIS (la réponse est forcée, la requête ne part pas), donc le flux ne le rend pas et c'est bien le RENVOI qui
         travaille — ce que le cas « réponse perdue » ci-dessus ne prouve pas (là le message est arrivé, le flux le rend, et la file n'a plus rien à renvoyer). Le renvoi cite la pièce
         DÉJÀ déposée : un seul dépôt de la photo, deux envois du message. */
      const msgs = /^POST \/api\/conversations\/c_[0-9a-f]+\/messages$/;
      const dAvant = A.nb(/^POST \/api\/pieces$/), mAvant = A.nb(msgs), uneAvant = (await vues(B, conv)).filter(m => m.photos && m.photos.length === 1).length;
      A.reseau.forcer = { re: msgs, code: 503, corps: '{}', fois: 1 };
      const loc = creerLocale(A, F.png({ couleur: [200, 90, 20] }));
      const r = await A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      vrai('population : le service a refusé le message (503) APRÈS le dépôt — la photo est « en attente » et sa pièce est déjà déposée', r.attente === true && r.envoi === false && A.src.enAttente() === 1 && A.nb(/^POST \/api\/pieces$/) - dAvant === 1);
      vrai('⛔ le renvoi part tout seul et réussit : la file se vide, DEUX envois du message, UN SEUL dépôt de la photo', await att(() => A.src.enAttente() === 0) && A.nb(/^POST \/api\/pieces$/) - dAvant === 1 && A.nb(msgs) - mAvant === 2);
      v('⛔ chez Bruno, ce message-là existe UNE fois', await att(async () => (await vues(B, conv)).filter(m => m.photos && m.photos.length === 1).length === uneAvant + 1) && (await vues(B, conv)).filter(m => m.photos && m.photos.length === 1).length, uneAvant + 1);
      /* DEUX photos, la SECONDE échoue au dépôt (503) : la première est déjà déposée, elle ne repart pas */
      const d2 = A.nb(/^POST \/api\/pieces$/);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 503, corps: '{}', saute: 1, fois: 1 };
      const x1 = creerLocale(A, F.png({ couleur: [20, 90, 200] })), x2 = creerLocale(A, F.png({ couleur: [90, 20, 200] }));
      const r2 = await A.src.envoyer(conv, { photos: [{ blob: x1.blob, url: x1.url, w: 8, h: 8 }, { blob: x2.blob, url: x2.url, w: 8, h: 8 }] });
      vrai('population : la seconde photo a échoué au dépôt, la première était déjà déposée — le message est « en attente »', r2.attente === true && A.src.enAttente() === 1 && A.nb(/^POST \/api\/pieces$/) - d2 === 2);
      vrai('⛔ le renvoi dépose SEULEMENT la seconde : trois dépôts en tout (première, seconde refusée, seconde reprise), et le message arrive avec les deux photos dans l\'ordre', await att(() => A.src.enAttente() === 0) && A.nb(/^POST \/api\/pieces$/) - d2 === 3 &&
        !!(await trouve(B, conv, m => m.photos && m.photos.length === 2 && m.t >= r2.t)));
    }
    {
      /* le réseau tombe PENDANT le dépôt : en file, puis repart au retour du réseau */
      const liberer = A.retenir(/^POST \/api\/pieces$/);
      const loc = creerLocale(A, F.png({ couleur: [160, 40, 160] }));
      const p1 = A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      await att(() => A.src.enAttente() === 1);
      A.reseau.coupe = true; liberer();
      const r = await p1;
      vrai('le réseau a lâché pendant le dépôt : le message est « en attente de connexion » (pas « Envoi… »)', r.attente === true && r.envoi === false);
      A.reseau.coupe = false;
      vrai('le réseau revient : la photo part, une seule fois', await att(() => A.src.enAttente() === 0) && !!(await trouve(B, conv, m => m.photos && m.photos.length === 1 && m.photos[0].piece && m.t >= r.t)));
    }

    /* ═══ 4. UN VOCAL, UN FICHIER ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn vocal et un fichier : le vocal se lit chez l\'autre, le fichier se télécharge et ne reste JAMAIS en mémoire');
    {
      const son = F.webm(4000), lv = creerLocale(A, son, 'audio/webm');
      await A.src.envoyer(conv, { vocal: { blob: lv.blob, url: lv.url, dur: 3.4, bars: [6, 9, 14, 18, 12, 7, 6, 10, 15, 8] } });
      const m = await trouve(B, conv, x => x.vocal);
      vrai('Bruno reçoit le vocal : sa durée (arrondie), sa forme d\'onde, et la pièce', !!m && m.vocal.dur === 3 && m.vocal.bars.join() === '6,9,14,18,12,7,6,10,15,8' && /^f_[0-9a-f]{32}$/.test(m.vocal.piece));
      vrai('⛔ un des derniers vocaux est lu d\'avance : l\'adresse est là sans rien demander, et c\'est le son envoyé', await att(async () => { const k = (await vues(B, conv)).find(x => x.vocal); return k.vocal.url && (await octets(B, k.vocal.url)).equals(son); }));
      v('l\'aperçu dit « Message vocal · 0:03 »', (await B.src.lister()).find(c => c.id === conv).apercu, 'Message vocal · 0:03');
      const ban = await B.attendreEv(e => e.type === 'arrivee' && /^Message vocal/.test(e.texte));
      v('et la bannière aussi', ban && ban.texte, 'Message vocal · 0:03');
      const hors = await attrape(A.src.envoyer(conv, { vocal: { blob: blobDe(Buffer.alloc(0)), dur: 2 } }));
      v('un vocal vide est refusé sur place', hors && hors.code, 'vide');
    }
    {
      const pdf = F.pdf(9000), vivantesAvant = B.vivantes().length, adressesA = A.urls.creees.size, nom = 'Rapport été/2026\u0000.pdf';
      await A.src.envoyer(conv, { fichier: { blob: blobDe(pdf), nom, taille: pdf.length } });
      /* ⛔ ce que l'APPAREIL envoie : le service refait le même ménage (test-943), donc le nom RENDU ne dit rien de l'appareil — la page en attendant montre ce qu'elle a assaini */
      const dernier = A.reseau.depots.filter(d => /genre=fichier/.test(d.url)).pop();
      v('⛔ le nom que l\'appareil ENVOIE est déjà assaini (ni la barre ni le caractère de contrôle) ET il voyage dans un EN-TÊTE encodé — jamais dans l\'adresse, que le journal d\'accès d\'un proxy écrirait (relecture du gardien, B2)',
        [dernier && decodeURIComponent(dernier.entetes['X-OPM-Nom']), dernier && /nom=|Rapport/i.test(dernier.url)], ['Rapport été_2026 .pdf', false]);
      const m = await trouve(B, conv, x => x.fichier);
      v('⛔ Bruno reçoit le fichier : son nom ASSAINI (la barre et le caractère de contrôle ne passent pas), sa taille, la pièce', [m.fichier.nom, m.fichier.taille, /^f_[0-9a-f]{32}$/.test(m.fichier.piece)], ['Rapport été_2026 .pdf', pdf.length, true]);
      v('l\'aperçu dit « Fichier · <nom> »', (await B.src.lister()).find(c => c.id === conv).apercu, 'Fichier · Rapport été_2026 .pdf');
      const b = await B.src.pieceBlob(m.fichier.piece);
      vrai('⛔ le téléchargement rend les octets exacts', Buffer.from(await b.arrayBuffer()).equals(pdf));
      v('⛔ un fichier ne crée AUCUNE adresse en mémoire (ni à l\'envoi, ni à la réception, ni au téléchargement)', [B.vivantes().length - vivantesAvant, A.urls.creees.size - adressesA], [0, 0]);
      const fa = (await vues(A, conv)).find(x => x.fichier);
      vrai('chez l\'expéditeur aussi, le fichier est une bulle sans adresse', !!fa && fa.fichier.piece && !('url' in fa.fichier));
    }

    /* ═══ 5. LES REFUS : TOUS DITS, AVEC LEUR PHRASE ═══════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes refus : chacun arrive avec sa phrase française, et rien de ce qui est refusé n\'est resté en file ni en mémoire');
    {
      const grosse = blobDe(Buffer.alloc(FICHIER_MAX + 1, 9)), avant = A.nb(/^POST \/api\/pieces$/);
      const e1 = await attrape(A.src.envoyer(conv, { fichier: { blob: grosse, nom: 'enorme.bin' } }));
      v('⛔ un fichier plus lourd que le maximum du service : dit AVANT d\'ouvrir la moindre connexion, avec le maximum', [e1.code, e1.statut, e1.max, /700 Ko au plus/.test(e1.phrase()), A.nb(/^POST \/api\/pieces$/) - avant], ['piece_trop_lourde', 413, FICHIER_MAX, true, 0]);
      const e2 = await attrape(A.src.envoyer(conv, { photos: [{ blob: blobDe(F.svg()), url: 'blob:x', w: 8, h: 8 }] }));
      v('⛔ un SVG envoyé comme photo : le service le refuse (415), la phrase le dit, et rien n\'est en file', [e2.code, e2.statut, e2.phrase(), A.src.enAttente()], ['type_refuse', 415, OPMSG.MESSAGES.type_refuse, 0]);
      const e3 = await attrape(A.src.envoyer(conv, { photos: [{ blob: blobDe(F.webm()), url: 'blob:y', w: 8, h: 8 }] }));
      v('un son envoyé comme photo : 415 aussi', e3 && e3.code, 'type_refuse');
      const e4 = await attrape(A.src.envoyer('c_' + '0'.repeat(32), { fichier: { blob: blobDe(F.pdf()), nom: 'x.pdf' } }));
      v('une conversation qui n\'existe pas (ou plus) : « introuvable », dite', e4 && e4.code, 'introuvable');
      const e5 = await attrape(D.src.envoyer(conv, { fichier: { blob: blobDe(F.pdf()), nom: 'x.pdf' } }));
      v('⛔ un étranger qui dépose dans une conversation qui n\'est pas la sienne : le MÊME « introuvable »', e5 && e5.code, 'introuvable');
      /* un relais (nginx) qui refuse le poids répond 413 en HTML, avant que le service ne voie le corps */
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 413, corps: '<html><body>413 Request Entity Too Large</body></html>', entetes: { 'Content-Type': 'text/html' } };
      const e6 = await attrape(A.src.envoyer(conv, { photos: [{ blob: blobDe(PNG), url: 'blob:z', w: 8, h: 8 }] }));
      A.reseau.forcer = null;
      v('⛔ un relais qui répond 413 en HTML : « trop lourd » avec le maximum de la photo (300 Ko), jamais « erreur inconnue »', [e6.code, e6.max, /300 Ko au plus/.test(e6.phrase())], ['piece_trop_lourde', PHOTO_MAX, true]);
      /* 429 avec son attente, 402 : le service les dit autrement */
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 429, corps: JSON.stringify({ error: 'quota_atteint', retry: 40 }), entetes: { 'Content-Type': 'application/json', 'Retry-After': '40' } };
      const e7 = await attrape(A.src.envoyer(conv, { photos: [{ blob: blobDe(PNG), url: 'blob:w', w: 8, h: 8 }] }));
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 402, corps: JSON.stringify({ error: 'quota_atteint', portee: 'stockage', utilise: 1, max: 2 }), entetes: { 'Content-Type': 'application/json' } };
      const e8 = await attrape(A.src.envoyer(conv, { photos: [{ blob: blobDe(PNG), url: 'blob:q', w: 8, h: 8 }] }));
      A.reseau.forcer = null;
      v('⛔ 429 : « réessaie dans 40 s » ; 402 : l\'espace est plein (« supprime des messages »), PAS « réessaie dans un instant » — deux refus, deux phrases', [/réessaie dans 40 s/.test(e7.phrase()), e8.phrase() === OPMSG.MESSAGES.quota_stockage, /instant/.test(e8.phrase())], [true, true, false]);
      v('et ni l\'un ni l\'autre n\'a laissé de message en file', A.src.enAttente(), 0);
    }
    {
      /* un message en FILE refusé après coup : le refus se dit (événement `avis`) et ses adresses locales sont libérées */
      const loc = creerLocale(A, PNG);
      A.reseau.coupe = true;
      const r = await A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      vrai('population : réseau coupé, la photo est « en attente »', r.attente === true && A.src.enAttente() === 1);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 415, corps: JSON.stringify({ error: 'type_refuse' }), entetes: { 'Content-Type': 'application/json' } };
      A.reseau.coupe = false;
      const avis = await A.attendreEv(e => e.type === 'avis' && /photo/i.test(e.texte));
      A.reseau.forcer = null;
      vrai('⛔ le service refuse la reprise : l\'avis dit « Une photo n\'a pas pu être envoyée » avec SA phrase', !!avis && /^Une photo n'a pas pu être envoyée : Ce type de fichier/.test(avis.texte));
      vrai('⛔ la file est vide et l\'adresse locale de cette photo est LIBÉRÉE (la page n\'a plus de message à qui la rattacher)', A.src.enAttente() === 0 && A.urls.revoquees.includes(loc.url));
    }

    /* ═══ 6. LA MÉMOIRE DES PIÈCES ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa mémoire : 30 photos lues d\'avance, le reste au toucher ; bornée ; libérée par un message effacé et par l\'arrêt');
    {
      const E = monter(svc); await E.entrer('eve', 'pw-eve-123456');
      const lE = await E.src.lienContact(); const conv2 = (await B.src.accepterLien(lE.code)).conv;
      await att(() => B.src.contacts().some(c => c.nom === 'Eve Quota'));
      const ids = [];
      for (let i = 0; i < 35; i++) {
        const loc = creerLocale(E, F.png({ couleur: [i * 7 % 255, 100, 50] }));
        await E.src.envoyer(conv2, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      }
      const G = monter(svc); await G.entrer('bruno', 'pw-bruno-1234');
      const ouvertes = (await G.src.ouvrir(conv2)).messages.filter(m => m.photos);
      v('population : 35 messages photo dans la conversation, vus par un appareil neuf', ouvertes.length, 35);
      await att(() => G.nb(/^GET \/api\/pieces\//) >= 30, 8000);
      await T.dort(300);
      v('⛔ l\'ouverture lit d\'avance les 30 dernières photos — pas les 35 (une conversation de cent photos ne se télécharge pas d\'un coup)', G.nb(/^GET \/api\/pieces\/f_/), 30);
      const apres = (await G.src.ouvrir(conv2)).messages.filter(m => m.photos);
      v('les cinq plus anciennes attendent le toucher (`etat` « attente », pas d\'adresse), les récentes ont été demandées', [apres.slice(0, 5).map(m => m.photos[0].etat).join(), apres.slice(0, 5).every(m => m.photos[0].url === null)], ['attente,attente,attente,attente,attente', true]);
      const vieille = apres[0].photos[0].piece;
      const u = await G.src.pieceUrl(vieille);
      vrai('⛔ le toucher d\'une photo ancienne la lit à la demande : une adresse blob:, des octets qui sont une image', /^blob:/.test(u) && (await octets(G, u)).subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47])));
      const H = monter(svc, { cacheMax: 4 }); await H.entrer('bruno', 'pw-bruno-1234');
      const vH = (await H.src.ouvrir(conv2)).messages.filter(m => m.photos);
      await T.dort(300);
      v('⛔ la lecture d\'avance se plie à la borne : avec une mémoire de 4 adresses, elle ne lit que 2 photos (jamais plus que la moitié, sans quoi elle relirait sans fin ce qu\'elle vient d\'évincer)', H.nb(/^GET \/api\/pieces\/f_/), 2);
      for (const m of vH.slice(0, 9)) await H.src.pieceUrl(m.photos[0].piece);
      vrai('⛔ la mémoire est BORNÉE : 11 pièces lues, jamais plus de 4 adresses vivantes', H.urls.creees.size === 11 && H.vivantes().length <= 4);
      vrai('population : les adresses évincées ont été LIBÉRÉES (revoquées), pas seulement oubliées', H.urls.revoquees.length >= 7);
      H.src.arreter();
      v('et à l\'arrêt de cet appareil, plus rien de vivant', H.vivantes().length, 0);
      const dernier = [...(await G.src.ouvrir(conv2)).messages].reverse().find(m => m.photos);
      vrai('un message supprimé POUR TOUS libère sa pièce (et n\'en garde pas la trace)', await (async () => {
        const ur = await G.src.pieceUrl(dernier.photos[0].piece);
        const avantRev = G.urls.revoquees.length;
        await E.src.supprimer(conv2, (await vues(E, conv2)).filter(m => m.photos).pop().id, 'tous');
        const mvu = await att(async () => (await vues(G, conv2)).find(m => m.id === dernier.id && m.supprime));
        return !!mvu && !mvu.photos && G.urls.revoquees.includes(ur) && G.urls.revoquees.length > avantRev;
      })());
      const creees = G.urls.creees.size;
      G.src.arreter();
      v('⛔ à l\'arrêt TOUT est libéré : chaque adresse fabriquée a été rendue (aucune ne survit à la session)', [G.vivantes().length, creees >= 31], [0, true]);
      E.src.arreter();
      v('   et chez l\'expéditeur aussi (les adresses de l\'appareil adoptées par le module sont rendues)', E.vivantes().length, 0);
    }

    /* ═══ 7. PHOTOS DE PROFIL ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes photos de profil : posée, vue des contacts en direct, cachée aux étrangers et par un blocage, retirée');
    {
      const profil0 = await A.src.profil();
      v('population : Alice n\'a pas de photo (un compte de la porte bêta porte son nom entier dans « prénom »)', [profil0.photo, profil0.champs.prenom, profil0.champs.nom], [null, 'Alice Martin', '']);
      const getsAvant = A.nb(/^GET \/api\/pieces\//);
      const p = await A.src.poserPhotoProfil(blobDe(PNG));
      vrai('⛔ elle pose sa photo : le profil rend une adresse blob: (l\'image choisie est déjà là : aucune pièce relue)', /^blob:/.test(p.photo) && A.nb(/^GET \/api\/pieces\//) === getsAvant);
      vrai('et c\'est la photo de la barre latérale : `moi()` la rend aussi, et l\'événement `moi` a prévenu la page', A.src.moi().photo === p.photo && !!A.evs.find(e => e.type === 'moi'));
      const chez = await att(() => B.src.contacts().find(c => c.nom === 'Alice Martin' && c.photo));
      vrai('⛔ Bruno l\'apprend SANS recharger (événement `personne`) : la photo d\'Alice est dans ses contacts, et c\'est le bon fichier', !!chez && (await octets(B, chez.photo)).equals(PNG));
      vrai('et sur la ligne de leur conversation à deux', await att(async () => /^blob:/.test(((await B.src.lister()).find(c => c.id === conv) || {}).photo || '')));
      /* l'identifiant de la photo d'Alice : celui que le service rend à Bruno */
      const idAvatar = (await B.nav.client.get('/api/contacts')).j.contacts.find(c => c.id === ma.id).avatar;
      const eD2 = await attrape(D.src.pieceBlob(idAvatar));
      v('⛔ Dora, une étrangère, ne lit pas cette photo : « introuvable » (le même refus qu\'une pièce qui n\'existe pas)', [eD2 && eD2.code, eD2 && eD2.statut], ['introuvable', 404]);
      vrai('population : l\'identifiant lu chez Bruno est bien celui d\'une pièce', /^f_[0-9a-f]{32}$/.test(idAvatar));
      const r = await A.src.retirerPhotoProfil();
      v('elle la retire : le profil n\'a plus de photo', r.photo, null);
      vrai('⛔ Bruno l\'apprend aussi : plus de photo dans ses contacts', !!(await att(() => B.src.contacts().find(c => c.nom === 'Alice Martin' && !c.photo))));
      const gros = await attrape(A.src.poserPhotoProfil(blobDe(Buffer.alloc(AVATAR_MAX + 1, 3))));
      v('⛔ une photo de profil trop lourde : dite avant tout dépôt (« 100 Ko au plus »)', [gros.code, /100 Ko au plus/.test(gros.phrase())], ['piece_trop_lourde', true]);
      const svg = await attrape(A.src.poserPhotoProfil(blobDe(F.svg())));
      v('un SVG comme photo de profil : 415 dit', svg && svg.code, 'type_refuse');
      /* blocage : Bruno bloque Alice → il ne reçoit plus sa photo ; elle ne voit plus la sienne */
      await A.src.poserPhotoProfil(blobDe(F.png({ couleur: [1, 2, 3] })));
      await att(() => B.src.contacts().find(c => c.nom === 'Alice Martin' && c.photo));
      await B.src.bloquer(ma.id);
      v('⛔ Bruno bloque Alice : elle sort de ses contacts utilisables et apparaît dans « bloqués »', [B.src.contacts().some(c => c.nom === 'Alice Martin'), B.src.bloques().map(c => c.nom)], [false, ['Alice Martin']]);
      await B.src.debloquer(ma.id);
      v('il la débloque : elle revient, et la liste des bloqués est vide', [B.src.contacts().some(c => c.nom === 'Alice Martin'), B.src.bloques().length], [true, 0]);
    }

    /* ═══ 8. LA PHOTO D'UN GROUPE ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa photo d\'un groupe : posée à la création, changée et retirée par un administrateur — et un refus de la photo ne perd pas le groupe');
    {
      const g = await A.src.creerGroupe({ nom: 'Chantier', membres: [mb.id, mc.id], photoBlob: blobDe(PNG) });
      vrai('⛔ le groupe est créé AVEC sa photo : la ligne de la liste rend une adresse blob: (la photo a été déposée avant, citée à la création)', await att(async () => /^blob:/.test(((await A.src.lister()).find(c => c.id === g.id) || {}).photo || '')));
      vrai('Bruno la voit aussi (membre), sans rien demander', await att(async () => /^blob:/.test(((await B.src.lister()).find(c => c.id === g.id) || {}).photo || '')));
      const D2 = await D.src.lister();
      v('Dora (étrangère) ne voit même pas ce groupe', D2.some(c => c.id === g.id), false);
      await A.src.majConversation(g.id, { photoBlob: blobDe(F.png({ couleur: [0, 0, 0] })) });
      const sys = await att(async () => (await vues(B, g.id)).filter(m => m.systeme && /photo du groupe/.test(m.texte)).pop());
      v('⛔ l\'administrateur change la photo : un message système le dit aux membres', sys && sys.texte, 'Alice Martin a changé la photo du groupe');
      await A.src.majConversation(g.id, { photoBlob: null });
      const sys2 = await att(async () => (await vues(B, g.id)).filter(m => m.systeme && /retiré la photo/.test(m.texte)).pop());
      v('il la retire : « … a retiré la photo du groupe », et la photo disparaît de la liste', [sys2 && sys2.texte, await att(async () => ((await B.src.lister()).find(c => c.id === g.id) || {}).photo === null)], ['Alice Martin a retiré la photo du groupe', true]);
      const eNon = await attrape(B.src.majConversation(g.id, { photoBlob: blobDe(PNG) }));
      v('⛔ un membre qui n\'est pas administrateur ne change pas la photo : « interdit », dit', [eNon && eNon.code, eNon && eNon.phrase()], ['interdit', OPMSG.MESSAGES.interdit]);
      const g2 = await A.src.creerGroupe({ nom: 'Sans photo', membres: [mb.id], photoBlob: blobDe(Buffer.alloc(AVATAR_MAX + 1, 5)) });
      const av = await A.attendreEv(e => e.type === 'avis' && /^Le groupe est créé/.test(e.texte));
      vrai('⛔ une photo de groupe trop lourde : le groupe est créé QUAND MÊME, et l\'avis dit pourquoi (« Le groupe est créé, mais sa photo n\'a pas pu être envoyée »)', !!g2 && !!av && /^Le groupe est créé, mais sa photo n'a pas pu être envoyée : .*100 Ko au plus/.test(av.texte));
    }

    /* ═══ 9. LES RÉGLAGES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes réglages : profil, confidentialité réciproque, stockage, appareils, à propos — chaque refus dit, chaque réussite relue du service');
    {
      const m = await A.src.majProfil({ prenom: 'Alicia', nom: 'Martin', statut: 'En tournée' });
      v('⛔ le profil est modifié, et ce que le SERVICE a retenu est rendu', [m.champs.prenom, m.champs.statut, m.champs.nom], ['Alicia', 'En tournée', 'Martin']);
      vrai('Bruno l\'apprend en direct (événement `personne`) : son contact s\'appelle « Alicia Martin »', !!(await att(() => B.src.contacts().find(c => c.nom === 'Alicia Martin'))));
      vrai('et la barre latérale d\'Alice : `moi()` dit le nouveau nom', A.src.moi().nom === 'Alicia Martin');
      const e1 = await attrape(A.src.majProfil({ prenom: '   ' }));
      v('⛔ un prénom vide : refus dit (« Une information est incorrecte ou manquante »), rien n\'a changé', [e1.code, e1.phrase(), (await A.src.profil()).champs.prenom], ['champ_invalide', OPMSG.MESSAGES.champ_invalide, 'Alicia']);
      const e2 = await attrape(A.src.majProfil({ statut: 'x'.repeat(141) }));
      v('un statut de 141 signes : refus dit', e2 && e2.code, 'champ_invalide');
      const e3 = await attrape(A.src.majProfil({}));
      v('rien à enregistrer : refus propre', e3 && e3.code, 'vide');

      v('la confidentialité commence ouverte (comme WhatsApp)', await A.src.confidentialite(), { presence: true, accuses: true });
      const c1 = await A.src.majConfidentialite({ presence: false });
      v('⛔ Alice coupe sa présence : le service répond ce qu\'il a retenu', c1, { presence: false, accuses: true });
      v('et le service l\'a bien gardé (relecture)', await A.src.confidentialite(), { presence: false, accuses: true });
      vrai('⛔ RÉCIPROQUE : Bruno ne la voit plus en ligne, et Alice ne voit plus Bruno en ligne', await att(async () => { await B.src.rafraichirContacts(); await A.src.rafraichirContacts(); return !B.src.contacts().find(c => c.nom === 'Alicia Martin').enLigne && !A.src.contacts().find(c => c.nom === 'Bruno Petit').enLigne; }));
      const c2 = await A.src.majConfidentialite({ presence: true, accuses: false });
      v('elle rallume la présence et coupe les confirmations de lecture : les deux réglages sont rendus', c2, { presence: true, accuses: false });
      const e4 = await attrape(A.src.majConfidentialite({ presence: 'oui' }));
      v('un réglage qui n\'est pas un booléen est refusé sur place (rien n\'est envoyé), et un réglage vide aussi', [e4 && e4.code, (await attrape(A.src.majConfidentialite({}))).code], ['vide', 'vide']);
      await A.src.majConfidentialite({ accuses: true });

      const s0 = await A.src.stockage();
      v('⛔ l\'espace utilisé est celui du SERVICE (octets rangés) et son maximum de 2 Gio — rendu en POSITIF (un entier signé sur 32 bits le ferait négatif)', [s0.utilise > 0, s0.max], [true, 2147483648]);
      const pdf = F.pdf(5000);
      await A.src.envoyer(conv, { fichier: { blob: blobDe(pdf), nom: 'plus.pdf' } });
      v('un fichier de plus : exactement ses octets de plus', (await A.src.stockage()).utilise - s0.utilise, pdf.length);

      const ap = await A.src.aPropos();
      v('à propos : la version du service, l\'instance, et les maximums des pièces', [/^\d+\.\d+\.\d+/.test(ap.version), ap.instance, ap.limites.photo_max, ap.limites.fichier_max], [true, 'beta', PHOTO_MAX, FICHIER_MAX]);

      const A2 = monter(svc); await A2.entrer('alice', 'pw-alice-1234');
      const r = await A.src.deconnecterAutres();
      v('⛔ « Déconnecter les autres appareils » : le service dit combien (une session), l\'appareil d\'où on le demande reste connecté', [r.sessions, (await attrape(A.src.profil())) === null], [1, true]);
      vrai('l\'autre appareil est mort : sa session est coupée et il le sait', !!(await att(async () => { await A2.src.verifierSession(); return A2.morts.length > 0; })));
      A2.src.arreter();
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  for (const x of appareils) { try { x.src.arreter(); } catch (e) { /* déjà arrêté */ } }
  await svc.arreter(); await og.fermer();
  fs.rmSync(racine, { recursive: true, force: true });
  fin();
})();

/* ce que la page fabrique pour une photo choisie : un Blob et son adresse blob: (le module l'adoptera quand le message est parti) */
function creerLocale(S, buf, type) {
  const blob = blobDe(buf, type || 'image/png'), url = 'blob:http://127.0.0.1/' + crypto.randomUUID();
  S.urls.creees.set(url, blob);
  return { blob, url, buf };
}
