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
  const reseau = { coupe: false, requetes: [], urls: [], depots: [], tirsFile: 0, retenir: null, forcer: null, perdre: null, garderFile: false, fileGardee: null };
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
  const planifier = (fn, ms) => {
    if (ms === 120 && reseau.garderFile) { reseau.fileGardee = fn; return 1; }            // un rendez-vous de la file RETENU : le banc le tire quand il le décide (deux événements ne se confondent plus)
    return setTimeout(() => { if (ms === 120) reseau.tirsFile++; fn(); }, ms);
  };
  const src = creerSourceServeur(Object.assign({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, planifier, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, creerUrl, revoquerUrl, delaiReessaiPieceMs: 300 }, opts));
  const evs = [], morts = [], vuesPage = [];
  let suivi = null;
  /* ce que la PAGE verrait : à chaque événement `conversation` de la conversation suivie, elle relit le fil (`ouvrir` bâtit sa vue sur-le-champ, avant son premier `await`) — la DERNIÈRE relecture est ce
     qui reste à l'écran. C'est ce qui voit un état collé (« Envoi… » qu'aucun événement n'a éteint) : relire le fil À LA DEMANDE, comme font les autres contrôles, montre le vrai état, pas celui de la page. */
  src.ecouter(e => { evs.push(e); if (suivi && e.type === 'conversation' && e.id === suivi) vuesPage.push(src.ouvrir(e.id).then(c => c && c.messages, () => null)); });
  src.surSessionMorte(m => morts.push(m));
  const nb = (re) => reseau.requetes.filter(r => re.test(r)).length;
  return {
    src, evs, morts, reseau, nav, urls, nb,
    suivre(conv) { suivi = conv; vuesPage.length = 0; },
    async ecran() { const d = vuesPage[vuesPage.length - 1]; return d ? await d : null; },
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
      /* ⛔ 429 avec son attente, 402 : des refus qui PEUVENT RÉUSSIR PLUS TARD gardent la pièce (relecture du testeur : la bulle disparaissait, il fallait rechoisir la photo). Le service les dit
         toujours autrement, avec SA phrase — une seule invitation à réessayer — et la personne dispose d'un « Réessayer » (la source) et d'un « Annuler ». */
      const compteReessai = (t) => (t.match(/r[ée]essaie/gi) || []).length;
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 429, corps: JSON.stringify({ error: 'quota_atteint', retry: 40 }), entetes: { 'Content-Type': 'application/json', 'Retry-After': '40' } };
      const loc7 = creerLocale(A, PNG), d7 = A.nb(/^POST \/api\/pieces$/);
      A.suivre(conv);
      const r7 = await A.src.envoyer(conv, { photos: [{ blob: loc7.blob, url: loc7.url, w: 8, h: 8 }] });
      A.reseau.forcer = null;
      const av7 = await A.attendreEv(e => e.type === 'avis' && /réessaie dans 40 s/.test(e.texte));
      v('⛔ 429 : la photo RESTE (le message est rendu « en attente », avec sa phrase d\'échec), et la phrase ne dit « réessaie » qu\'UNE fois — avec l\'attente exacte, pas « dans un instant (… 40 s) »',
        [r7.attente === true, r7.echec, compteReessai(r7.echec || ''), /instant/.test(r7.echec || '')], [true, 'Trop de demandes en peu de temps (réessaie dans 40 s).', 1, false]);
      const ecran7 = ((await A.ecran()) || []).find(m => m.cid === r7.cid);
      vrai('⛔ ce que la PAGE a sous les yeux après l\'échec (sa dernière relecture du fil) est la bulle en échec AVEC sa phrase — pas un « Envoi… » collé : la source redit l\'écran quand elle met la pièce en échec', !!ecran7 && ecran7.attente === true && ecran7.envoi === false && ecran7.echec === 'Trop de demandes en peu de temps (réessaie dans 40 s).');
      vrai('⛔ …l\'avis le dit aussi (la personne peut être ailleurs), et l\'adresse locale de la photo est GARDÉE (la bulle l\'affiche)', !!av7 && /^Une photo n'a pas pu être envoyée : Trop de demandes/.test(av7.texte) && !A.urls.revoquees.includes(loc7.url) && A.src.enAttente() === 1);
      await T.dort(600);
      v('⛔ elle ne repart PAS toute seule (c\'est à la personne de dire quand) : aucun dépôt de plus en 600 ms, et le fil la montre avec son échec', [A.nb(/^POST \/api\/pieces$/) - d7, ((await vues(A, conv)).find(m => m.cid === r7.cid) || {}).echec], [1, 'Trop de demandes en peu de temps (réessaie dans 40 s).']);
      const texteApres = await A.src.envoyer(conv, { texte: 'pendant que la photo attend' });
      vrai('⛔ un texte écrit PENDANT qu\'une photo attend la personne n\'est pas bloqué derrière elle : il part tout de suite', !texteApres.attente && !!(await trouve(B, conv, m => m.texte === 'pendant que la photo attend')));
      /* ⛔ …et elle ne repart pas non plus quand la file passe pour UNE AUTRE pièce (le réseau coupe, une seconde photo attend, le réseau revient) : seule la personne dit « Réessayer » */
      const loc8 = creerLocale(A, PNG), nPhotosB = (await vues(B, conv)).filter(m => m.photos).length;
      A.reseau.coupe = true;
      const r8 = await A.src.envoyer(conv, { photos: [{ blob: loc8.blob, url: loc8.url, w: 8, h: 8 }] });
      A.reseau.coupe = false;
      vrai('population : la seconde photo attend derrière une coupure, la première est en échec (deux pièces dans la file)', r8.attente === true && A.src.enAttente() === 2);
      vrai('⛔ le réseau revient, la file passe : la SECONDE photo part (Bruno la voit) ; la première, en échec, reste là avec sa phrase — elle n\'est pas repartie toute seule', await att(async () => (await vues(B, conv)).filter(m => m.photos).length === nPhotosB + 1) && await att(() => A.src.enAttente() === 1)
        && ((await vues(A, conv)).find(m => m.cid === r7.cid) || {}).echec === 'Trop de demandes en peu de temps (réessaie dans 40 s).');
      await T.dort(300);
      v('…et trois cents millisecondes plus tard, toujours une seule photo de plus chez Bruno, et la première attend toujours la personne', [(await vues(B, conv)).filter(m => m.photos).length, A.src.enAttente()], [nPhotosB + 1, 1]);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 402, corps: JSON.stringify({ error: 'quota_atteint', portee: 'stockage', utilise: 1, max: 2 }), entetes: { 'Content-Type': 'application/json' } };
      vrai('« Réessayer » : le service refuse encore (402, l\'espace est plein) — la pièce reste, avec la phrase de l\'ESPACE (« supprime des messages »), PAS « réessaie dans un instant »', A.src.reessayer(r7.cid) === true
        && await att(async () => ((await vues(A, conv)).find(m => m.cid === r7.cid) || {}).echec === OPMSG.MESSAGES.quota_stockage) && !/instant/.test(OPMSG.MESSAGES.quota_stockage));
      A.reseau.forcer = null;
      const nPhotosB2 = (await vues(B, conv)).filter(m => m.photos).length;
      vrai('⛔ « Réessayer » quand le service accepte : la photo part (même cid, même pièce), la file est vide, et Bruno la voit UNE fois (une photo de plus, pas deux)', A.src.reessayer(r7.cid) === true && await att(() => A.src.enAttente() === 0)
        && await att(async () => (await vues(B, conv)).filter(m => m.photos).length === nPhotosB2 + 1));
      v('un « Réessayer » sur ce qui n\'est pas en échec ne fait rien', [A.src.reessayer(r7.cid), A.src.reessayer('nexistepas')], [false, false]);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 503, corps: JSON.stringify({ error: 'disque_plein' }), entetes: { 'Content-Type': 'application/json' } };
      const loc9 = creerLocale(A, PNG);
      const r9 = await A.src.envoyer(conv, { photos: [{ blob: loc9.blob, url: loc9.url, w: 8, h: 8 }] });
      A.reseau.forcer = null;
      vrai('503 (service en lecture seule) : la pièce reste aussi', r9.attente === true && r9.echec === OPMSG.MESSAGES.disque_plein);
      vrai('⛔ « Annuler » : la pièce quitte la file pour de bon, son adresse locale est RENDUE, et le fil n\'en parle plus', A.src.abandonner(r9.cid) === true && A.src.enAttente() === 0 && A.urls.revoquees.includes(loc9.url) && !(await vues(A, conv)).some(m => m.cid === r9.cid));
      v('un « Annuler » sur ce qui n\'existe plus ne fait rien', A.src.abandonner(r9.cid), false);
    }
    {
      /* un message en FILE refusé après coup : le refus se dit (événement `avis`) et ses adresses locales sont libérées */
      const loc = creerLocale(A, PNG);
      A.reseau.coupe = true;
      const r = await A.src.envoyer(conv, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      vrai('population : réseau coupé, la photo est « en attente »', r.attente === true && A.src.enAttente() === 1);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 415, corps: JSON.stringify({ error: 'type_refuse' }), entetes: { 'Content-Type': 'application/json' } };
      A.reseau.coupe = false;
      const avis = await A.attendreEv(e => e.type === 'avis' && /^Une photo n'a pas pu être envoyée : Ce type/.test(e.texte));
      A.reseau.forcer = null;
      vrai('⛔ le service refuse la reprise : l\'avis dit « Une photo n\'a pas pu être envoyée » avec SA phrase', !!avis && /^Une photo n'a pas pu être envoyée : Ce type de fichier/.test(avis.texte));
      vrai('⛔ la file est vide et l\'adresse locale de cette photo est LIBÉRÉE (la page n\'a plus de message à qui la rattacher)', A.src.enAttente() === 0 && A.urls.revoquees.includes(loc.url));
    }

    /* ═══ 5 bis. LA RELECTURE DU TESTEUR (3 octobre 2026) ════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa relecture du testeur : onze photos dites, un nom long qui garde son extension, une durée qui ne grossit pas, une panne qui se dit — et un statut qui dit vrai');
    {
      const gT = (await A.src.creerGroupe({ nom: 'Relecture', membres: [mb.id] })).id;
      await att(async () => !!(await B.src.lister()).find(c => c.id === gT));
      /* 1. onze photos dans un message */
      const locs = Array.from({ length: 11 }, (_, i) => creerLocale(A, F.png({ couleur: [i * 20, 50, 50] }))), dAvant = A.nb(/^POST \/api\/pieces$/);
      const e11 = await attrape(A.src.envoyer(gT, { photos: locs.map(l => ({ blob: l.blob, url: l.url, w: 8, h: 8 })) }));
      v('⛔ onze photos dans UN message : refusé et DIT (« 10 photos au plus par message »), au lieu de n\'en envoyer que dix en silence — et rien n\'a quitté l\'appareil', [e11 && e11.code, e11 && /10 photos au plus/.test(e11.phrase()), A.nb(/^POST \/api\/pieces$/) - dAvant, A.src.enAttente()], ['trop-de-photos', true, 0, 0]);
      v('le nombre de photos par message que le SERVICE annonce (`par_message`) est celui que la source refuse de dépasser : dix — le jour où l\'un change, ce banc tombe', (await A.src.limitesPieces()).par_message, 10);
      const r10 = await A.src.envoyer(gT, { photos: locs.slice(0, 10).map(l => ({ blob: l.blob, url: l.url, w: 8, h: 8 })) });
      vrai('contre-épreuve : DIX photos passent (dix dépôts, un message)', !r10.attente && A.nb(/^POST \/api\/pieces$/) - dAvant === 10 && !!(await trouve(B, gT, m => m.photos && m.photos.length === 10)));

      /* 2. un nom long garde son extension — la même règle que le service */
      const long = 'x'.repeat(200) + '.pdf', pdfL = F.pdf(3000);
      await A.src.envoyer(gT, { fichier: { blob: blobDe(pdfL), nom: long } });
      const depL = A.reseau.depots.filter(d => /genre=fichier/.test(d.url)).pop(), nomL = decodeURIComponent(depL.entetes['X-OPM-Nom']);
      const mL = await trouve(B, gT, x => x.fichier && x.fichier.taille === pdfL.length);
      v('⛔ un nom de 204 signes (200 « x » + « .pdf ») : l\'appareil le coupe à 120 EN GARDANT « .pdf » — le fichier téléchargé garde son type —, et le service range le même', [Array.from(nomL).length, /x\.pdf$/.test(nomL), mL && mL.fichier.nom === nomL], [120, true, true]);
      const { couperNom: couperClient } = require(path.join(T.SERVICE, 'public', 'source-serveur.js')), { couperNom: couperService } = require(path.join(T.SERVICE, 'pieces.js'));
      const noms = ['a'.repeat(300), 'a'.repeat(300) + '.pdf', 'a'.repeat(300) + '.tar.gz', 'é'.repeat(130) + '.docx', '😀'.repeat(130) + '.png', 'x'.repeat(130) + '.' + 'y'.repeat(17), 'court.txt', '', '.' + 'x'.repeat(200), 'a'.repeat(110) + '.abcdefghijklmnop', 'rapport très long avec des espaces '.repeat(6) + '.xlsx'];
      v('⛔ la règle de l\'appareil et celle du service coupent EXACTEMENT pareil (onze noms : sans extension, double extension, accents, émojis, extension trop longue, un nom qui n\'est qu\'une extension)', noms.map(n => couperClient(n, 120) === couperService(n, 120)), noms.map(() => true));
      vrai('population : la batterie contient des noms qui ont VRAIMENT été coupés, dont plusieurs qui gardent leur extension', noms.filter(n => couperClient(n, 120) !== n).length >= 8 && noms.filter(n => couperClient(n, 120) !== n && /\.(pdf|gz|docx|png|xlsx)$/.test(couperClient(n, 120))).length >= 4);

      /* 3. une durée de vocal ne grossit pas : 65,9 s s'affiche 1:05, comme le compteur de l'enregistrement */
      const durees = [[65.9, 65], [1.6, 1], [0.4, 1], [3.4, 3], [65, 65]], vus = [];
      for (const [dur] of durees) {
        const avant = (await vues(B, gT)).filter(m => m.vocal).length;
        await A.src.envoyer(gT, { vocal: { blob: blobDe(F.webm(2000), 'audio/webm'), url: null, dur, bars: [6, 9, 14] } });
        const k = await att(async () => { const l = (await vues(B, gT)).filter(m => m.vocal); return l.length > avant ? l[l.length - 1] : null; });
        vus.push(k && k.vocal.dur);
      }
      v('⛔ la durée d\'un vocal est TRONQUÉE à la seconde (le compteur de l\'enregistrement montre 1:05 à 65,9 s ; « arrondi », la bulle disait 1:06 et 0:01 devenait 0:02) — au moins une seconde', vus, durees.map(d => d[1]));

      /* 4. une SEULE invitation à réessayer */
      const e429 = new OPMSG.ErreurApi('quota_atteint', 429, 20);
      v('⛔ la phrase d\'un 429 avec attente : « Trop de demandes en peu de temps (réessaie dans 20 s). » — elle ne dit pas « réessaie » deux fois, ni « dans un instant » à côté de « 20 s »', [e429.phrase(), (e429.phrase().match(/r[ée]essaie/gi) || []).length], ['Trop de demandes en peu de temps (réessaie dans 20 s).', 1]);
      v('…sans attente, la phrase du service reste telle quelle', new OPMSG.ErreurApi('quota_atteint', 429, 0).phrase(), 'Trop de demandes en peu de temps. Réessaie dans un instant.');
      v('…et le 408 d\'un envoi trop lent a SA phrase (pas celle de la modification qui expire)', [new OPMSG.ErreurApi('envoi_trop_lent', 408, 0).phrase() === OPMSG.MESSAGES.envoi_trop_lent, /connexion trop lente/.test(OPMSG.MESSAGES.envoi_trop_lent)], [true, true]);
    }
    {
      /* 5. une panne se dit UNE fois, les tentatives s'espacent, et le statut dit vrai */
      const gT2 = (await A.src.creerGroupe({ nom: 'Panne', membres: [mb.id] })).id;
      await att(async () => !!(await B.src.lister()).find(c => c.id === gT2));
      await vues(A, gT2);                                                  // la conversation est CHARGÉE avant que le réseau tombe (un appareil coupé ne peut pas l'ouvrir)
      const loc = creerLocale(A, PNG), avisAvant = A.evs.filter(e => e.type === 'avis').length, evIdx = A.evs.length;      // ce qui précède (d'autres coupures, d'autres avis) ne compte pas ici
      A.reseau.coupe = true;
      const r = await A.src.envoyer(gT2, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
      const avis1 = await att(() => A.evs.slice(evIdx).find(e => e.type === 'avis' && /^Pas de connexion/.test(e.texte)));
      vrai('⛔ le réseau est coupé : la photo est « en attente », et la panne SE DIT (« Pas de connexion : ta photo partira dès que le réseau reviendra. ») — le seul signe n\'est plus un petit statut', r.attente === true && !!avis1 && avis1.texte === 'Pas de connexion : ta photo partira dès que le réseau reviendra.');
      const t0 = A.nb(/^POST \/api\/pieces$/);
      vrai('population : plusieurs tentatives de renvoi ont eu lieu pendant la coupure (' + (A.nb(/^POST \/api\/pieces$/) - t0) + ' en plus de la première)', await att(() => A.nb(/^POST \/api\/pieces$/) - t0 >= 3));
      await T.dort(300);
      const vuA = (await vues(A, gT2)).find(m => m.attente);
      vrai('⛔ après plusieurs renvois ratés, le message dit toujours « en attente de connexion » (`envoi` faux) : une tentative qui échoue sur-le-champ ne passe pas pour un envoi — « Envoi… » ne reste jamais collé', !!vuA && vuA.envoi === false && !vuA.echec);
      v('⛔ UNE panne, UN avis : un seul malgré les renvois', A.evs.slice(evIdx).filter(e => e.type === 'avis' && /^Pas de connexion/.test(e.texte)).length, 1);
      /* un renvoi qui DURE devient « Envoi… » (ce que la personne doit voir quand les octets partent vraiment) */
      A.suivre(gT2); A.reseau.garderFile = true;                                    // dès maintenant, ce que la page relit est noté ; et le PROCHAIN rendez-vous de la file sera tiré à la main
      const liberer = A.retenir(/^POST \/api\/pieces$/);                          // d'abord la retenue (les essais ratés continuent de tomber sur « réseau coupé »)…
      A.reseau.coupe = false;
      const n1 = A.nb(/^POST \/api\/pieces$/);                                    // …puis le réseau revient : le PROCHAIN essai est celui qui est retenu
      await att(() => A.nb(/^POST \/api\/pieces$/) > n1, 3000);
      const v1 = (await vues(A, gT2)).find(m => m.attente), nEv = A.evs.length;
      await T.dort(700);
      const v2 = (await vues(A, gT2)).find(m => m.attente), evTard = A.evs.slice(nEv).filter(e => e.type === 'conversation' && e.id === gT2).length;
      vrai('⛔ un renvoi qui part vraiment (la requête est en route, retenue ici) : juste après, « en attente » ; au bout de 400 ms, « Envoi… » — et la source REDIT l\'état à ce moment-là (un événement), sans quoi la page ne le verrait pas', !!v1 && v1.envoi === false && !!v2 && v2.envoi === true && evTard > 0);
      /* ⛔ …et quand CE renvoi-là échoue (le réseau retombe pendant que les octets partent), la source REDIT l'écran : sans cela « Envoi… » resterait affiché jusqu'au prochain essai — 3 s, 6 s… 24 s plus tard */
      A.reseau.coupe = true; liberer();
      vrai('population : l\'essai a fini d\'échouer, le prochain rendez-vous de la file est posé (et retenu)', await att(() => A.reseau.fileGardee !== null, 3000));
      const ecran = ((await A.ecran()) || []).find(m => m.attente);
      vrai('⛔ …sa dernière relecture dit « en attente » (`envoi` faux) : la page ne reste pas sur « Envoi… » pendant les secondes qui suivent un essai raté', !!ecran && ecran.envoi === false && !ecran.echec);
      A.reseau.garderFile = false; A.reseau.coupe = false;
      { const tir = A.reseau.fileGardee; A.reseau.fileGardee = null; tir(); }
      vrai('le réseau est revenu : la photo part, UNE fois chez Bruno, et la file est vide', await att(() => A.src.enAttente() === 0) && (await vues(B, gT2)).filter(m => m.photos).length === 1);
      v('…sans un avis de plus (la panne est finie, rien à dire)', A.evs.filter(e => e.type === 'avis').length - avisAvant, 1);
      /* le service qui ne répond pas (502) se dit aussi */
      const gT3 = (await A.src.creerGroupe({ nom: 'Service muet', membres: [mb.id] })).id;
      await att(async () => !!(await B.src.lister()).find(c => c.id === gT3)); await vues(A, gT3);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 502, corps: '<html>502 Bad Gateway</html>', entetes: { 'Content-Type': 'text/html' }, fois: 3 };
      const loc2 = creerLocale(A, PNG);
      const r2 = await A.src.envoyer(gT3, { photos: [{ blob: loc2.blob, url: loc2.url, w: 8, h: 8 }] });
      const avis2 = await att(() => A.evs.find(e => e.type === 'avis' && /^Le service ne répond pas/.test(e.texte)));
      vrai('⛔ le relais répond 502 : la photo est « en attente », et l\'avis dit que le SERVICE ne répond pas (ce n\'est pas la connexion de la personne)', r2.attente === true && !!avis2 && avis2.texte === 'Le service ne répond pas pour l\'instant : ta photo partira dès qu\'il répondra.');
      vrai('et elle part quand il revient', await att(() => A.src.enAttente() === 0) && (await vues(B, gT3)).filter(m => m.photos).length === 1);
    }
    {
      /* les tentatives S'ESPACENT : 3 s, 6 s, 12 s, 24 s, puis plafond (la valeur par défaut, pas celle des bancs) */
      const delais = []; let reveil = null;
      const Z = monter(svc, { attenteEnvoi: undefined, planifier: (fn, ms) => { if (ms >= 2000) { delais.push(ms); reveil = fn; return 1; } return setTimeout(fn, ms); } });
      try {
        await Z.entrer('alice', 'pw-alice-1234');
        const gZ = (await Z.src.creerGroupe({ nom: 'Espacement', membres: [mb.id] })).id;
        await vues(Z, gZ);
        Z.reseau.coupe = true;
        const loc = creerLocale(Z, PNG);
        await Z.src.envoyer(gZ, { photos: [{ blob: loc.blob, url: loc.url, w: 8, h: 8 }] });
        for (let k = 0; k < 6; k++) { await att(() => reveil !== null && delais.length > k, 3000); const f = reveil; reveil = null; if (!f) break; f(); await att(() => delais.length > k + 1, 3000); }
        v('⛔ les renvois s\'ESPACENT (3 s, 6 s, 12 s, 24 s, puis le plafond) : une photo qui n\'a pas de réseau ne martèle pas le service — la valeur par défaut, pas celle des bancs', delais.slice(0, 6), [3000, 6000, 12000, 24000, 24000, 24000]);
      } finally { Z.src.arreter(); try { Z.reseau.coupe = false; await Z.src.deconnexion(); } catch (e) { /* déjà partie */ } }      // sa session ne doit pas survivre : « déconnecter les autres appareils » en compte une
    }

    {
      /* ⛔ « Réessayer » touché PENDANT un passage de la file : le passage avait déjà dépassé la pièce (en échec, sautée) et `viderFile` rendait la main (« déjà en cours ») — la pièce restait « en attente » pour toujours */
      const gR = (await A.src.creerGroupe({ nom: 'Réessayer en plein passage', membres: [mb.id] })).id;
      await att(async () => !!(await B.src.lister()).find(c => c.id === gR)); await vues(A, gR);
      A.reseau.forcer = { re: /^POST \/api\/pieces$/, code: 429, corps: JSON.stringify({ error: 'quota_atteint', retry: 5 }), entetes: { 'Content-Type': 'application/json', 'Retry-After': '5' }, fois: 1 };
      const l1 = creerLocale(A, F.png({ couleur: [11, 22, 200] })), l2 = creerLocale(A, F.png({ couleur: [200, 22, 11] }));
      const r1 = await A.src.envoyer(gR, { photos: [{ blob: l1.blob, url: l1.url, w: 8, h: 8 }] });                 // 429 : en échec
      A.reseau.coupe = true;
      const r2 = await A.src.envoyer(gR, { photos: [{ blob: l2.blob, url: l2.url, w: 8, h: 8 }] });                 // réseau coupé : elle attend la connexion
      vrai('population : la première photo est en échec, la seconde attend la connexion (deux pièces dans la file)', !!r1.echec && r2.attente === true && !r2.echec && A.src.enAttente() === 2);
      const liberer = A.retenir(/^POST \/api\/pieces$/);
      const n0 = A.nb(/^POST \/api\/pieces$/);
      A.reseau.coupe = false;
      vrai('population : la seconde photo est EN VOL, retenue (un passage de la file est en cours, et il a déjà dépassé la première)', !!(await att(() => A.nb(/^POST \/api\/pieces$/) > n0, 5000)));
      vrai('« Réessayer » touché PENDANT ce passage', A.src.reessayer(r1.cid) === true);
      liberer();
      vrai('⛔ la première photo part QUAND MÊME (le passage en cours ne la reverra pas : la source redonne rendez-vous à sa fin) — la file est vide et Bruno reçoit les deux', !!(await att(() => A.src.enAttente() === 0, 10000)) && !!(await att(async () => (await vues(B, gR)).filter(m => m.photos).length === 2, 5000)));
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

      v('la confidentialité commence ouverte (comme WhatsApp) — trouvable par identifiant ou numéro compris (5 octobre 2026)', await A.src.confidentialite(), { presence: true, accuses: true, trouvable: true });
      v('⛔ `moi()` dit MA présence (la barre de la page : « Disponible » ou « Présence masquée ») — montrée au départ', A.src.moi().presence, true);
      const evMoi0 = A.evs.filter(e => e.type === 'moi').length;
      const c1 = await A.src.majConfidentialite({ presence: false });
      v('⛔ Alice coupe sa présence : le service répond ce qu\'il a retenu', c1, { presence: false, accuses: true, trouvable: true });
      vrai('⛔ …`moi()` redit « masquée » ET l\'événement `moi` prévient la page (sans lui la barre latérale continuait de dire « Disponible » avec son point vert, pendant que personne ne la voyait)', A.src.moi().presence === false && A.evs.filter(e => e.type === 'moi').length > evMoi0);
      v('et le service l\'a bien gardé (relecture)', await A.src.confidentialite(), { presence: false, accuses: true, trouvable: true });
      vrai('⛔ RÉCIPROQUE : Bruno ne la voit plus en ligne, et Alice ne voit plus Bruno en ligne', await att(async () => { await B.src.rafraichirContacts(); await A.src.rafraichirContacts(); return !B.src.contacts().find(c => c.nom === 'Alicia Martin').enLigne && !A.src.contacts().find(c => c.nom === 'Bruno Petit').enLigne; }));
      const c2 = await A.src.majConfidentialite({ presence: true, accuses: false });
      v('elle rallume la présence et coupe les confirmations de lecture : les deux réglages sont rendus', c2, { presence: true, accuses: false, trouvable: true });
      v('et `moi()` redit « montrée »', A.src.moi().presence, true);
      const e4 = await attrape(A.src.majConfidentialite({ presence: 'oui' }));
      v('un réglage qui n\'est pas un booléen est refusé sur place (rien n\'est envoyé), et un réglage vide aussi', [e4 && e4.code, (await attrape(A.src.majConfidentialite({}))).code], ['vide', 'vide']);
      await A.src.majConfidentialite({ accuses: true });

      const s0 = await A.src.stockage();
      v('⛔ l\'espace utilisé est celui du SERVICE (octets rangés) et son maximum de 20 Gio — rendu en POSITIF (un entier signé sur 32 bits le ferait négatif)', [s0.utilise > 0, s0.max], [true, 21474836480]);
      const pdf = F.pdf(5000);
      await A.src.envoyer(conv, { fichier: { blob: blobDe(pdf), nom: 'plus.pdf' } });
      v('un fichier de plus : exactement ses octets de plus', (await A.src.stockage()).utilise - s0.utilise, pdf.length);

      const ap = await A.src.aPropos();
      v('à propos : la version du service, l\'instance, et les maximums des pièces', [/^\d+\.\d+\.\d+/.test(ap.version), ap.instance, ap.limites.photo_max, ap.limites.fichier_max], [true, 'beta', PHOTO_MAX, FICHIER_MAX]);

      const A2 = monter(svc); await A2.entrer('alice', 'pw-alice-1234');
      /* ⛔ réglé sur UN appareil, dit sur L'AUTRE : le service prévient les autres appareils de la personne, la source relit son profil, la barre de l'autre page ne reste pas sur « Disponible » */
      v('population : l\'autre appareil d\'Alice dit sa présence montrée au départ', A2.src.moi().presence, true);
      const evMoi2 = A2.evs.filter(e => e.type === 'moi').length;
      await A.src.majConfidentialite({ presence: false });
      vrai('⛔ …la présence masquée sur ce téléphone est dite à l\'AUTRE appareil de la personne (son `moi()` redit « masquée » et sa page est prévenue)', !!(await att(() => A2.src.moi().presence === false && A2.evs.filter(e => e.type === 'moi').length > evMoi2)));
      await A.src.majConfidentialite({ presence: true });
      vrai('…et rallumée, de même', !!(await att(() => A2.src.moi().presence === true)));
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
