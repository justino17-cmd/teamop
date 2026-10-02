/* ══ OP MESSAGES — LA SOURCE DE DONNÉES DU SERVICE ═══════════════════════════════════════════════════════════════════════════
   C'est le module qui REMPLACE `apercu/opmessages/source.js` dans la version servie par le service (`scripts/opmsg-public.js` copie
   l'interface de l'aperçu et ne change que cette pièce) : mêmes méthodes, mêmes formes, les écrans ne bougent pas. Il parle au
   service par `api.js` (le client : routes, en-têtes, codes de refus) et rien d'autre — jamais de `fetch` ici, jamais de jeton :
   la session est un cookie `HttpOnly` que le JavaScript ne voit pas.

   LE CONTRAT est celui de `apercu/opmessages/source.js` (en-tête de ce fichier), PLUS ce qu'un vrai service impose :
     demarrer()            → { connecte:true } | { connecte:false, motif, phrase } : lit la session (cookie), charge la personne, les contacts, la
                             liste, ouvre le flux. `connecte:false` + `motif:'session_requise'` n'est PAS une panne : personne n'est connecté.
     connexion(login,pass) → la personne (la porte bêta : l'identifiant et le mot de passe d'accès donnés par la Tour). La page repart de zéro ensuite.
     deconnexion()         → ferme la session côté service PUIS le flux ; si le service refuse, le flux reste ouvert et l'erreur se dit.
     surSessionMorte(cb)   → cb(motif) quand la session est morte (coupée, expirée) ou que la personne n'est plus la même : la page REPART DE ZÉRO.
     verifierSession()     → relit /api/moi : une autre personne ou plus de session déclenche `surSessionMorte`.
     capacites             → { service, connexion, photos, vocaux, fichiers, avatars, reglages, appels, reunions, actionsMessage, groupeInfos, liens, presence, saisie,
                               historique, texteMax } : ce que le service SAIT faire. Ce qu'il ne sait pas encore (appels, réunions) dit « bientôt ».
     personne(id)          → { id, nom, prenom, initiales, avatar, photo } d'une personne déjà vue (contact, membre, auteur), sinon null.
     répondre, modifier, supprimer, réagir, saisie, infos de groupe, liens de contact : voir plus bas.
   LES PIÈCES (étape 4). `envoyer(id, brouillon)` accepte aussi `{ photos:[{blob,url,w,h}] }`, `{ vocal:{blob,url,dur,bars} }` et `{ fichier:{blob,nom,taille} }` : chaque pièce est
   DÉPOSÉE (`POST /api/pieces`, corps binaire) puis le message la cite ; un envoi lent est dans la file locale, affiché « Envoi… », et un renvoi ne redépose pas ce qui l'est
   déjà. Un message rendu porte `photos:[{url,w,h,piece,etat}]`, `vocal:{url,dur,bars,piece}` ou `fichier:{nom,taille,piece}` : `url` est une adresse `blob:` FABRIQUÉE ICI
   (la pièce est lue par `GET /api/pieces/:id` puis gardée EN MÉMOIRE, jamais sur l'appareil), `null` tant qu'elle n'est pas arrivée (`etat` : 'chargement' | 'indisponible').
     pieceUrl(piece)       → l'adresse `blob:` d'une image ou d'un son (gardée en mémoire, rendue à la fermeture) ;  pieceBlob(piece) → le Blob d'un fichier (jamais gardé).
   LES RÉGLAGES (capacité `reglages`) : profil, majProfil, poserPhotoProfil, retirerPhotoProfil, confidentialite, majConfidentialite, bloques, bloquer, debloquer,
   deconnecterAutres, stockage, aPropos — voir plus bas. Chacun rend une promesse (sauf `bloques`) et lève une erreur qui se DIT.
   Les événements de `ecouter(cb)` : 'liste', 'conversation' (id), 'contacts', 'presence', 'reseau' (etat), 'arrivee' (un message d'un autre : de quoi
   afficher une bannière), 'notification', 'retire' (id : la personne n'est plus dans cette conversation), 'avis' (texte : un refus arrivé après coup),
   'moi' (mon profil a changé : nom, statut ou photo, ici ou sur un autre appareil).

   ⛔ TOUT REFUS SE DIT. Chaque appel qui échoue rend une `ErreurApi` d'`api.js` (`code`, `statut`, `retry`, `phrase()` en français, `dit:true`) ; les refus
   LOCAUX de ce module (message vide, trop long, « bientôt ») ont la même forme. Un écran n'a jamais à inventer une phrase pour un refus qu'il ne comprend pas.
   ⛔ UN ENVOI NE SE PERD PAS ET NE SE DOUBLE PAS. Un message qui part pendant une coupure (réseau, 5xx) reste dans une FILE locale, affiché « En attente »,
   et repart avec le MÊME `cid` à la reprise : le service ne crée jamais deux messages pour le même `cid`, donc une réponse perdue puis un renvoi ne font qu'un.
   ⛔ RIEN N'EST RANGÉ SUR L'APPAREIL : tout vit en mémoire. Un autre compte, dans le même onglet, ne peut rien y retrouver — et la page repart de zéro
   à la déconnexion (`location.replace`), ce module avec elle.
   ⛔ Un texte venu d'un tiers (nom, message, nom de fichier) est rendu TEL QUEL : l'échapper est le travail de l'écran. Ce module n'invente aucune adresse d'image :
   les seules adresses qu'il rend sont des `blob:` qu'il fabrique lui-même à partir d'un Blob LU du service (jamais une adresse venue du service).
   ⛔ RIEN N'EST RANGÉ SUR L'APPAREIL, PIÈCES COMPRISES : les adresses `blob:` vivent en mémoire, bornées (nombre et octets), libérées à la déconnexion et à l'arrêt. */
(function (racine) {
  'use strict';
  const MIN = 60000;

  /* Un refus qui ne vient pas du service mais de ce module : même forme qu'une `ErreurApi`. */
  const PHRASES_LOCALES = {
    vide: 'Le message est vide.',
    'trop-long': 'Ce message est trop long (8 000 signes au plus).',
    bientot: 'Cette fonction arrive bientôt.',
    introuvable: 'Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus).',
    invalide: 'La demande est incorrecte.',
  };
  function erreurLocale(code) {
    const e = new Error(PHRASES_LOCALES[code] || PHRASES_LOCALES.invalide);
    e.name = 'ErreurLocale'; e.code = code; e.statut = 0; e.retry = 0; e.dit = true; e.phrase = () => e.message;
    return e;
  }

  const initialesDe = (nom) => {
    const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return '?';
    const a = Array.from(mots[0]), b = mots.length > 1 ? Array.from(mots[mots.length - 1]) : a.slice(1);
    return (a[0] + (b[0] || '')).toUpperCase();
  };
  const indexAvatar = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 6007; return h % 6; };
  const nomComplet = (p) => p ? ((p.prenom || '') + ' ' + (p.nom || '')).trim() || 'Quelqu\'un' : 'Quelqu\'un';
  const extrait = (t, n) => { const a = Array.from(String(t || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n).join('') + '…' : a.join(''); };
  const duree = (s) => s % 86400 === 0 ? (s / 86400) + (s === 86400 ? ' jour' : ' jours') : s + ' s';

  function creerSourceServeur(options) {
    const o = options || {};
    const OPMSG = o.OPMSG || racine.OPMSG;
    if (!OPMSG || typeof OPMSG.creer !== 'function') throw new Error('api.js doit être chargé avant source-serveur.js');
    const api0 = o.api || OPMSG.creer({ base: o.base || '', fetch: o.fetch, EventSource: o.EventSource, attente: o.attente });
    const maintenant = o.maintenant || (() => Date.now());
    const planifier = o.planifier || ((f, ms) => setTimeout(f, ms));
    const annuler = o.annuler || ((h) => clearTimeout(h));
    const delaiSaisieMs = o.delaiSaisieMs == null ? 6000 : o.delaiSaisieMs;       // une frappe sans nouvelle depuis ce temps s'éteint toute seule
    const delaiRelireMs = o.delaiRelireMs == null ? 60 : o.delaiRelireMs;          // la liste se relit en un coup après une rafale d'événements
    const attenteEnvoi = typeof o.attenteEnvoi === 'function' ? o.attenteEnvoi : (n) => Math.min(30000, 1500 * Math.pow(2, Math.min(n, 4)));
    const creerUrl = typeof o.creerUrl === 'function' ? o.creerUrl : (b) => URL.createObjectURL(b);
    const revoquerUrl = typeof o.revoquerUrl === 'function' ? o.revoquerUrl : (u) => { try { URL.revokeObjectURL(u); } catch (e) { /* déjà libérée */ } };
    const cacheMax = o.cacheMax > 0 ? o.cacheMax : 150, cacheOctetsMax = o.cacheOctetsMax > 0 ? o.cacheOctetsMax : 96 * 1048576;   // bornes de la mémoire des pièces lues
    const chargesMax = o.chargesMax > 0 ? o.chargesMax : 3;                                                                         // lectures de pièces en même temps
    const delaiReessaiPieceMs = o.delaiReessaiPieceMs == null ? 15000 : o.delaiReessaiPieceMs;                                      // une pièce illisible n'est pas redemandée à chaque rendu

    let moiApi = null, mort = false, enMarche = false, ecoute = null, suiviMort = null;
    const registre = new Map();            // uid → { id, prenom, nom, statut }
    const enLigne = new Set();
    let contactsApi = [], contactsTous = [], convsApi = [], listeFraiche = false;
    const convs = new Map();               // id → { detail, messages[], aPlus, charge }
    const saisies = new Map();             // conv → Map(uid → minuterie)
    const lecture = new Map();             // conv → Map(uid → { seq, ts })
    const file = [];                       // l'envoi en attente : { cid, conv, texte, reponse, t, essais }
    let minuterieFile = null, enRelecture = null, derniereSaisie = new Map();
    const ecouteurs = [];
    const emettre = (ev) => ecouteurs.slice().forEach(f => { try { f(Object.assign({}, ev)); } catch (e) { /* un écouteur fautif n'arrête pas les autres */ } });

    /* ── l'API, enveloppée : une session morte se voit partout, d'un seul endroit ── */
    const A = {};
    for (const k of Object.keys(api0)) {
      if (typeof api0[k] !== 'function' || k === 'ecouter' || k === 'appel') continue;
      A[k] = async (...a) => {
        try { return await api0[k](...a); }
        catch (e) { if (e && e.code === 'session_requise' && enMarche) sessionMorte('session_requise'); throw e; }
      };
    }
    A.appel = api0.appel;
    function sessionMorte(motif) {
      if (mort) return;
      mort = true; arreter();
      if (typeof suiviMort === 'function') suiviMort(motif || 'session_requise');
    }

    /* ── les pièces : lues par le service (GET /api/pieces/:id), gardées EN MÉMOIRE sous forme d'adresses blob:, jamais sur l'appareil ──
       ⛔ Le service ne sert une pièce qu'à qui a le droit de la lire (sinon 404, le même qu'une pièce inexistante) : une adresse n'est donc jamais devinée, elle est fabriquée ici
       à partir d'un Blob que le service vient de rendre. La mémoire est BORNÉE (nombre et octets : la moins récemment vue part d'abord) et LIBÉRÉE à l'arrêt et à la déconnexion. */
    const cachePieces = new Map();       // id de pièce → { url, octets, vu }
    const lectures = new Map();          // id → Promise<url> : une seule lecture à la fois par pièce
    const echecs = new Map();            // id → { t, definitif } : une pièce qui n'a pas pu être lue n'est pas redemandée à chaque rendu (15 s), ni du tout si elle n'existe plus (404)
    const attentePieces = [];            // les pièces à lire, la plus récente d'abord
    let lecturesEnCours = 0, tickCache = 0, octetsCache = 0, signalPlanifie = false, generation = 0;
    const PHOTOS_AUTO = 30, VOCAUX_AUTO = 6, PHOTOS_PAR_MESSAGE = 10;   // ce que l'ouverture d'une conversation lit toute seule ; le reste se lit au toucher
    const LIMITES_DEFAUT = { photo_max: 12582912, vocal_max: 10485760, fichier_max: 26214400, avatar_max: 2097152, par_message: 10, quota: 2147483648 };
    let limitesPieces = null;
    /* Les maximums du service (GET /api/config), lus à la première utilisation : la page refuse AVANT d'envoyer un fichier trop lourd, sans lui faire parcourir le réseau pour rien. */
    async function limites() {
      if (limitesPieces) return limitesPieces;
      try { const c = await A.config(); limitesPieces = Object.assign({}, LIMITES_DEFAUT, c && c.limites && c.limites.pieces); }
      catch (e) { return LIMITES_DEFAUT; }          // pas de mémoire d'un échec : on redemandera la prochaine fois (le service refusera de toute façon ce qui est trop lourd)
      return limitesPieces;
    }
    const maxDe = (l, genre) => genre === 'photo' ? l.photo_max : genre === 'vocal' ? l.vocal_max : genre === 'avatar' ? l.avatar_max : l.fichier_max;
    /* Prévient l'écran qu'une adresse est arrivée : une seule rafale, quel que soit le nombre de pièces lues d'un coup. */
    function signalerPieces() {
      if (signalPlanifie || mort) return;
      signalPlanifie = true;
      planifier(() => {
        signalPlanifie = false;
        if (mort) return;
        emettre({ type: 'moi' }); emettre({ type: 'contacts' }); emettre({ type: 'liste' });
        for (const id of convs.keys()) emettre({ type: 'conversation', id });
      }, delaiRelireMs);
    }
    function poserCache(id, url, octets) {
      const avant = cachePieces.get(id);
      if (avant) { octetsCache -= avant.octets; if (avant.url !== url) revoquerUrl(avant.url); }
      cachePieces.set(id, { url, octets, vu: ++tickCache }); octetsCache += octets;
      while (cachePieces.size > cacheMax || octetsCache > cacheOctetsMax) {
        let plus = null;
        for (const [k, e] of cachePieces) if (k !== id && (!plus || e.vu < plus.e.vu)) plus = { k, e };
        if (!plus) break;
        revoquerUrl(plus.e.url); octetsCache -= plus.e.octets; cachePieces.delete(plus.k);
      }
    }
    function oublierPieces() {
      generation++;
      for (const e of cachePieces.values()) revoquerUrl(e.url);
      cachePieces.clear(); lectures.clear(); echecs.clear(); attentePieces.length = 0; octetsCache = 0; lecturesEnCours = 0;
    }
    function liberer(id) {
      const e = cachePieces.get(id);
      if (e) { revoquerUrl(e.url); octetsCache -= e.octets; cachePieces.delete(id); }
      echecs.delete(id);
    }
    /* un message effacé (pour tous, pour moi, échu) : ses pièces n'ont plus rien à faire en mémoire */
    function oublierMeta(meta) {
      if (!meta) return;
      if (Array.isArray(meta.pieces)) meta.pieces.forEach(p => p && liberer(p.id));
      if (typeof meta.piece === 'string') liberer(meta.piece);
    }
    function lirePieceUrl(id) {
      const deja = cachePieces.get(id);
      if (deja) { deja.vu = ++tickCache; return Promise.resolve(deja.url); }
      if (lectures.has(id)) return lectures.get(id);
      const gen = generation;
      lecturesEnCours++;
      const p = A.lirePiece(id).then(({ blob }) => {
        if (gen !== generation) throw erreurLocale('introuvable');       // la session a été fermée pendant la lecture : rien n'est gardé
        const url = creerUrl(blob); poserCache(id, url, blob.size || 0); echecs.delete(id);
        return url;
      }, (er) => { if (gen === generation) echecs.set(id, { t: maintenant(), definitif: !!er && er.statut === 404 }); throw er; });
      lectures.set(id, p);
      const fin = () => { if (gen !== generation) return; lectures.delete(id); lecturesEnCours--; signalerPieces(); pomperPieces(); };
      p.then(fin, fin);
      return p;
    }
    function pomperPieces() {
      while (lecturesEnCours < chargesMax && attentePieces.length && !mort) {
        const id = attentePieces.shift();
        if (cachePieces.has(id) || lectures.has(id)) continue;
        lirePieceUrl(id).catch(() => {});
      }
    }
    function demanderPiece(id) {
      if (typeof id !== 'string' || cachePieces.has(id) || lectures.has(id) || mort) return;
      const e = echecs.get(id);
      if (e && (e.definitif || maintenant() - e.t < delaiReessaiPieceMs)) return;
      const i = attentePieces.indexOf(id); if (i >= 0) attentePieces.splice(i, 1);
      attentePieces.unshift(id);                                           // la dernière demandée (la plus récente d'une conversation) part la première
      pomperPieces();
    }
    /* l'adresse d'une pièce déjà lue, ou null (sans rien demander) */
    function urlSiLue(id) {
      const e = typeof id === 'string' ? cachePieces.get(id) : null;
      if (e) { e.vu = ++tickCache; return e.url; }
      return null;
    }
    /* l'adresse d'une pièce, ou null — et sa lecture est demandée en arrière-plan : l'écran est prévenu (événements) quand elle arrive */
    function photoPiece(id) {
      const u = urlSiLue(id);
      if (u || typeof id !== 'string') return u;
      demanderPiece(id);
      return null;
    }
    const etatPiece = (id) => cachePieces.has(id) ? 'pret' : (lectures.has(id) || attentePieces.includes(id)) ? 'chargement' : echecs.has(id) ? 'indisponible' : 'attente';
    /* l'adresse d'une image ou d'un son, lue maintenant s'il le faut (le toucher d'une photo ou d'un vocal pas encore arrivés) */
    const pieceUrl = (id) => typeof id === 'string' ? lirePieceUrl(id) : Promise.reject(erreurLocale('introuvable'));
    /* un fichier : le Blob, JAMAIS gardé (25 Mo en mémoire pour un clic de téléchargement serait un gaspillage) */
    const pieceBlob = async (id) => { if (typeof id !== 'string') throw erreurLocale('introuvable'); return (await A.lirePiece(id)).blob; };

    /* ── les personnes ── */
    function noter(p) {
      if (!p || typeof p.id !== 'string') return;
      const avant = registre.get(p.id) || {};
      registre.set(p.id, { id: p.id, prenom: p.prenom !== undefined ? p.prenom : avant.prenom, nom: p.nom !== undefined ? p.nom : avant.nom, statut: p.statut !== undefined ? p.statut : avant.statut,
        avatar: p.avatar !== undefined ? p.avatar : avant.avatar });
    }
    /* `avatar` d'une vue = l'indice de couleur du repli (un nombre) ; `photo` = l'adresse blob: de la photo de profil quand elle est arrivée, sinon null */
    const vuePersonne = (p) => { const n = nomComplet(p); return { id: p.id, nom: n, prenom: (p.prenom || n).split(' ')[0] || n, initiales: initialesDe(n), avatar: indexAvatar(p.id), photo: photoPiece(p.avatar) }; };
    const personne = (id) => { const p = registre.get(id); return p ? vuePersonne(p) : null; };
    const estMoi = (id) => !!moiApi && id === moiApi.id;
    const prenomDe = (id) => estMoi(id) ? 'Vous' : (registre.has(id) ? vuePersonne(registre.get(id)).prenom : 'Quelqu\'un');
    const nomDe = (id) => estMoi(id) ? 'Vous' : (registre.has(id) ? vuePersonne(registre.get(id)).nom : 'Quelqu\'un');

    /* ── les contacts ── */
    const vueContact = (c) => Object.assign(vuePersonne(c), { role: enLigne.has(c.id) ? 'En ligne' : (c.statut || ''), enLigne: enLigne.has(c.id) });
    function installerContacts(liste) {
      contactsTous = liste.slice();
      contactsApi = liste.filter(c => c.mutuel && !c.bloque);
      enLigne.clear();
      for (const c of liste) { noter(c); if (c.en_ligne) enLigne.add(c.id); }
    }
    async function rafraichirContacts() {
      installerContacts(await A.contacts());
      emettre({ type: 'contacts' });
    }

    /* ── la liste ── */
    function resume(c) {
      const direct = c.type === 'direct';
      if (direct && c.autre) noter(c.autre);
      if (c.apercu && c.apercu.par) noter(c.apercu.par);   // ⛔ l'auteur du dernier message d'un GROUPE : son nom vient avec l'aperçu (sinon « Quelqu'un » tant que la conversation n'est pas ouverte)
      const nom = direct ? nomComplet(c.autre) : (c.nom || 'Groupe');
      let apercu = '';
      if (c.apercu) {
        const a = c.apercu;
        let corps = a.supprime ? 'Message supprimé' : a.illisible ? 'Message illisible' : a.type === 'systeme' ? 'Activité du groupe' : (a.texte || '');
        corps = corps.replace(/\s+/g, ' ').slice(0, 160);
        const prefixe = a.type === 'systeme' ? '' : estMoi(a.auteur) ? 'Vous : ' : (c.type === 'groupe' ? prenomDe(a.auteur) + ' : ' : '');
        apercu = prefixe + corps;
      }
      const loc = convs.get(c.id);
      const nonLus = loc && loc.luLocal !== undefined && loc.luLocal >= c.dernier_seq ? 0 : c.non_lus;
      return {
        id: c.id, type: c.type, nom, court: nom, initiales: direct ? initialesDe(nom) : '#', avatar: indexAvatar(c.id), photo: direct ? photoPiece(c.autre && c.autre.avatar) : photoPiece(c.avatar), epingle: !!c.epingle,
        membres: [], admins: c.role === 'admin' && moiApi ? [moiApi.id] : [], annoncesSeulement: !!c.annonces_seules, ephemeres: c.ephemere_s || 0,
        nonLu: nonLus > 0, nonLus, apercu, t: c.dernier_ts, enLigne: direct && c.autre ? enLigne.has(c.autre.id) : false,
        autre: direct && c.autre ? c.autre.id : null,
      };
    }
    async function relireListe() {
      const liste = await A.conversations();
      convsApi = liste; listeFraiche = true;
      for (const c of liste) if (c.autre) noter(c.autre);
    }
    /* Plusieurs événements d'affilée ne font qu'UNE relecture de la liste. */
    function relireListePlusTard() {
      listeFraiche = false;
      if (enRelecture) return enRelecture;
      enRelecture = new Promise((ok) => {
        planifier(async () => {
          enRelecture = null;
          /* ⛔ une relecture que le service refuse (429, 503) ne se perd PAS en silence : l'écran garde sa liste et DIT pourquoi elle n'est plus à jour (« Réessayer » la relit) */
          try { await relireListe(); emettre({ type: 'liste' }); } catch (e) { emettre({ type: 'liste', erreur: e }); }
          ok();
        }, delaiRelireMs);
      });
      return enRelecture;
    }
    /* `forcer` : relire même si la liste est fraîche (le bouton « Réessayer » d'un refus ne doit pas se contenter de la copie qu'il a déjà) */
    const lister = async (forcer) => {
      if (forcer || !listeFraiche) await relireListe();
      return convsApi.map(resume).sort((x, y) => y.t - x.t);
    };

    /* ── les messages ── */
    function lecteursDe(id) { return lecture.get(id) || lecture.set(id, new Map()).get(id); }
    /* « Lu » : mon message est lu quand l'autre (une directe) ou tous les autres (un groupe) sont allés au moins jusqu'à lui. `true` si l'heure est inconnue. */
    function luDe(conv, c, m) {
      if (!estMoi(m.auteur) || m.type === 'systeme' || !c.detail) return null;
      const autres = c.detail.membres.filter(x => !estMoi(x.id) && x.lu_seq !== null && x.lu_seq !== undefined);
      if (!autres.length || !autres.every(x => x.lu_seq >= m.seq)) return null;
      const L = lecture.get(conv);
      let ts = 0;
      for (const x of autres) { const e = L && L.get(x.id); if (e && e.seq >= m.seq && e.ts > ts) ts = e.ts; else { ts = 0; break; } }
      return ts || true;
    }
    function texteSysteme(m) {
      const k = m.meta && m.meta.k, u = m.meta && m.meta.uid, a = m.auteur;
      switch (k) {
        case 'groupe_cree': return estMoi(a) ? 'Vous avez créé le groupe' : nomDe(a) + ' a créé le groupe';
        case 'membre_ajoute': return estMoi(a) ? 'Vous avez ajouté ' + nomDe(u) : nomDe(a) + ' a ajouté ' + (estMoi(u) ? 'vous' : nomDe(u));
        case 'rejoint': return estMoi(u) ? 'Vous avez rejoint le groupe' : nomDe(u) + ' a rejoint le groupe';
        case 'membre_retire': return estMoi(a) ? 'Vous avez retiré ' + nomDe(u) : estMoi(u) ? nomDe(a) + ' vous a retiré du groupe' : nomDe(a) + ' a retiré ' + nomDe(u);
        case 'membre_parti': return estMoi(u) ? 'Vous avez quitté le groupe' : nomDe(u) + ' a quitté le groupe';
        case 'admin_promu': return estMoi(u) ? 'Vous êtes maintenant administrateur' : nomDe(u) + ' est maintenant administrateur';
        case 'admin_retire': return estMoi(u) ? 'Vous n\'êtes plus administrateur' : nomDe(u) + ' n\'est plus administrateur';
        case 'renomme': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' renommé le groupe';
        case 'avatar': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' changé la photo du groupe';
        case 'avatar_retire': return (estMoi(a) ? 'Vous avez' : nomDe(a) + ' a') + ' retiré la photo du groupe';
        case 'annonces_seules': return m.meta.valeur ? 'Seuls les administrateurs peuvent écrire' : 'Tout le monde peut écrire';
        case 'ephemere': return m.meta.valeur ? 'Les messages disparaissent après ' + duree(m.meta.valeur) : 'Les messages éphémères sont désactivés';
        default: return 'Le groupe a été modifié';
      }
    }
    /* ce que dit de lui-même un message qui n'est pas du texte : dans une citation, une bannière */
    function resumeMedia(type, meta) {
      if (type === 'photo') { const n = meta && Array.isArray(meta.pieces) ? meta.pieces.length : 1; return n > 1 ? n + ' photos' : 'Photo'; }
      if (type === 'vocal') { const d = meta && meta.dur > 0 ? Math.round(meta.dur) : 0; return 'Message vocal' + (d ? ' · ' + Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : ''); }
      if (type === 'fichier') return 'Fichier' + (meta && meta.nom ? ' · ' + meta.nom : '');
      return '';
    }
    function citation(c, seq) {
      const q = c.messages.find(x => x.seq === seq);
      if (!q) return { seq, auteur: null, nom: 'Message plus ancien', texte: '', introuvable: true };
      return { seq, id: q.id, auteur: q.auteur, nom: nomDe(q.auteur), texte: q.supprime ? 'Message supprimé' : extrait(q.type === 'systeme' ? texteSysteme(q) : (q.texte || resumeMedia(q.type, q.meta)), 120), supprime: !!q.supprime };
    }
    /* Les pièces d'un message : l'adresse est celle d'une pièce DÉJÀ LUE (sinon null, et `etat` dit où on en est). `auto` : les pièces que l'ouverture lit toute seule — les plus
       récentes ; les autres attendent le toucher (une conversation de cent photos ne se télécharge pas d'un coup sur un téléphone). */
    function vuePieces(m, auto) {
      const meta = m.meta || {}, lue = (id) => auto && auto.has(id) ? photoPiece(id) : urlSiLue(id);
      if (m.type === 'photo' && Array.isArray(meta.pieces) && meta.pieces.length) return { photos: meta.pieces.map(p => ({ url: lue(p.id), w: p.w | 0, h: p.h | 0, piece: p.id, etat: etatPiece(p.id) })) };
      if (m.type === 'vocal' && typeof meta.piece === 'string') return { vocal: { url: lue(meta.piece), dur: Math.max(1, Math.round(meta.dur) || 1), bars: Array.isArray(meta.bars) ? meta.bars.slice(0, 64) : [], piece: meta.piece } };
      if (m.type === 'fichier' && typeof meta.piece === 'string') return { fichier: { nom: String(meta.nom || 'Fichier'), taille: meta.taille | 0, piece: meta.piece } };
      return { texte: 'Pièce illisible' };
    }
    /* quelles pièces l'ouverture d'une conversation lit toute seule : les 30 dernières photos, les 6 derniers vocaux (le plus récent d'abord).
       ⛔ Jamais plus que la moitié de la mémoire : lire d'avance plus de pièces qu'elle n'en garde ferait relire sans fin celles qu'elle vient d'évincer. */
    function piecesAuto(messages) {
      const s = new Set(); let photos = 0, vocaux = 0;
      const maxPhotos = Math.max(1, Math.min(PHOTOS_AUTO, cacheMax >> 1)), maxVocaux = Math.max(1, Math.min(VOCAUX_AUTO, cacheMax >> 2));
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]; if (m.supprime || !m.meta) continue;
        if (m.type === 'photo' && Array.isArray(m.meta.pieces)) { for (const p of m.meta.pieces) if (photos < maxPhotos) { s.add(p.id); photos++; } }
        else if (m.type === 'vocal' && typeof m.meta.piece === 'string' && vocaux < maxVocaux) { s.add(m.meta.piece); vocaux++; }
      }
      return s;
    }
    const MEDIAS = ['photo', 'vocal', 'fichier'];
    function vueMessage(conv, c, m, auto) {
      const base = { id: m.id, seq: m.seq, auteur: m.auteur, t: m.ts, lu: luDe(conv, c, m) };
      if (m.type === 'systeme') return Object.assign(base, { systeme: true, texte: texteSysteme(m) });
      const media = MEDIAS.includes(m.type);
      const v = Object.assign(base, { texte: m.supprime ? '' : (m.illisible ? 'Message illisible' : (media ? '' : (m.texte === null || m.texte === undefined ? '…' : m.texte))) });
      if (m.supprime) v.supprime = true;
      else if (media && !m.illisible) Object.assign(v, vuePieces(m, auto));
      if (m.modifie) v.modifie = m.modifie;
      if (m.repond_a) v.reponse = citation(c, m.repond_a);
      if (m.reactions && m.reactions.length) {
        const par = new Map();
        for (const r of m.reactions) { const e = par.get(r.emoji) || { emoji: r.emoji, n: 0, moi: false, noms: [] }; e.n++; if (estMoi(r.uid)) e.moi = true; e.noms.push(prenomDe(r.uid)); par.set(r.emoji, e); }
        v.reactions = Array.from(par.values());
      }
      return v;
    }
    /* un message qui n'a pas encore quitté l'appareil : `envoi` = un essai est en cours (« Envoi… »), sinon il attend la reprise du réseau. Ses pièces sont celles de l'appareil. */
    function vueEnAttente(p) {
      const v = { id: 'p:' + p.cid, seq: null, auteur: moiApi.id, t: p.t, lu: null, texte: p.texte || '', attente: true, envoi: !!p.enVol, cid: p.cid };
      if (p.type === 'photo') v.photos = p.photos.map(x => ({ url: x.url, w: x.w, h: x.h, piece: null }));
      else if (p.type === 'vocal') v.vocal = { url: p.vocal.url, dur: p.vocal.dur, bars: p.vocal.bars.slice(), piece: null };
      else if (p.type === 'fichier') v.fichier = { nom: p.fichier.nom, taille: p.fichier.taille, piece: null };
      return v;
    }

    /* Range un message dans la copie d'une conversation : sans doublon, trié par `seq`. */
    function ranger(c, m) {
      const i = c.messages.findIndex(x => x.seq === m.seq);
      if (i >= 0) c.messages[i] = Object.assign({}, c.messages[i], m);
      else { c.messages.push(m); c.messages.sort((x, y) => x.seq - y.seq); }
    }
    async function charger(id) {
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      const c = convs.get(id) || { messages: [], aPlus: false, charge: false, detail: null };
      c.detail = d;
      const r = await A.messages(id, { limite: 100 });
      c.messages = r.messages.slice(); c.aPlus = !!r.a_plus; c.charge = true;
      convs.set(id, c);
      return c;
    }
    async function ouvrir(id) {
      let c = convs.get(id);
      if (!c || !c.charge) {
        try { c = await charger(id); }
        catch (e) { if (e && e.code === 'introuvable') { convs.delete(id); return null; } throw e; }
      }
      const resumeConv = (convsApi.find(x => x.id === id));
      const d = c.detail, base = resumeConv ? resume(resumeConv) : { id, type: d.conversation.type, nom: d.conversation.nom || 'Groupe', court: d.conversation.nom || 'Groupe', initiales: '#', avatar: indexAvatar(id), photo: null, epingle: false, nonLu: false, nonLus: 0, apercu: '', t: d.conversation.dernier_ts };
      const autre = d.conversation.type === 'direct' ? d.membres.find(x => !estMoi(x.id)) : null;
      if (autre) { Object.assign(base, { nom: nomComplet(autre), court: nomComplet(autre), initiales: initialesDe(nomComplet(autre)), enLigne: enLigne.has(autre.id), autre: autre.id, photo: photoPiece(autre.avatar) }); }
      else if (d.conversation.type === 'groupe') { base.nom = base.court = d.conversation.nom || 'Groupe'; base.photo = photoPiece(d.conversation.avatar); }
      base.membres = d.membres.map(x => x.id); base.admins = d.membres.filter(x => x.role === 'admin').map(x => x.id);
      base.annoncesSeulement = !!d.conversation.annonces_seules; base.ephemeres = d.conversation.ephemere_s || 0;
      const auto = piecesAuto(c.messages);
      const vues = c.messages.map(m => vueMessage(id, c, m, auto));
      for (const p of file) if (p.conv === id) vues.push(vueEnAttente(p));
      const S = saisies.get(id); let qui = null;
      if (S) for (const u of S.keys()) { if (!estMoi(u)) { qui = u; break; } }
      return Object.assign(base, { messages: vues, saisie: qui ? { contact: qui } : null, aPlus: c.aPlus });
    }
    async function precedents(id) {
      const c = convs.get(id); if (!c || !c.charge || !c.aPlus || !c.messages.length) return false;
      const r = await A.messages(id, { avant_seq: c.messages[0].seq, limite: 100 });
      for (const m of r.messages) ranger(c, m);
      c.aPlus = !!r.a_plus;
      emettre({ type: 'conversation', id });
      return true;
    }

    /* ── l'envoi, et sa file ── */
    const erreurCoupure = (e) => !!e && (e.code === 'reseau' || e.code === 'serveur' || e.code === 'reponse_illisible');
    function valider(texte) {
      if (typeof texte !== 'string' || !texte.trim()) throw erreurLocale('vide');
      const t = texte.replace(/\r\n?/g, '\n').trim();
      if (Array.from(t).length > 8000) throw erreurLocale('trop-long');
      return t;
    }
    function apresEnvoi(conv, m) {
      const c = convs.get(conv);
      if (c && c.charge) ranger(c, m);
      emettre({ type: 'conversation', id: conv });
      relireListePlusTard();
    }
    /* ⛔ `retirer` : l'envoi qui a réussi QUITTE la file AVANT que l'écran soit redit. Sinon l'événement émis par `apresEnvoi` redessinait le fil pendant que le message
       était encore dans la file : le vrai message (rangé) ET sa copie « En attente de connexion… » paraissaient ensemble, et rien ne redessinait après le retrait
       (relecture du testeur, D1 : réponse perdue, renvoi réussi, le message resté en double 35 s). */
    async function poster(p, retirer) {
      const r = await A.envoyer(p.conv, p.texte, { cid: p.cid, reponse_a: p.reponse || undefined });
      if (retirer) retirer();
      apresEnvoi(p.conv, { seq: r.seq, id: r.id, auteur: moiApi.id, ts: r.ts, type: 'texte', texte: p.texte, repond_a: p.reponse || null, supprime: false, modifie: null, reactions: [] });
      return r;
    }
    /* ── les messages de pièces : photo, vocal, fichier ──
       Chaque pièce est DÉPOSÉE (POST /api/pieces, corps binaire) puis le message la cite. Le message entre dans la file DÈS L'ENVOI (affiché « Envoi… » tant qu'un essai court) :
       un dépôt lent ne laisse pas l'écran muet, et ce qui est écrit après lui attend son tour (l'ordre d'envoi est l'ordre des messages). ⛔ Une pièce DÉJÀ déposée n'est pas
       redéposée à un renvoi (`x.id`) : la réponse perdue d'un envoi réussi ne coûte pas un second téléversement, et le `cid` fait le reste. */
    const SUJETS = { photo: ['Une photo', 'envoyée'], vocal: ['Un message vocal', 'envoyé'], fichier: ['Un fichier', 'envoyé'] };
    const sujetEnvoi = (p) => SUJETS[p.type] || ['Un message', 'envoyé'];
    const lesPieces = (p) => p.type === 'photo' ? p.photos : p.type === 'vocal' ? [p.vocal] : p.type === 'fichier' ? [p.fichier] : [];
    function metaDe(p) {
      if (p.type === 'photo') return { pieces: p.photos.map(x => ({ id: x.id, w: x.w, h: x.h, taille: x.blob.size })) };
      if (p.type === 'vocal') return { piece: p.vocal.id, dur: p.vocal.dur, bars: p.vocal.bars.slice(), taille: p.vocal.blob.size };
      return { piece: p.fichier.id, nom: p.fichier.nom, taille: p.fichier.blob.size };
    }
    async function posterPieces(p, retirer) {
      p.enVol = true;
      try {
        const l = await limites();
        for (const x of lesPieces(p)) {
          if (x.id) continue;
          const d = await A.deposer(x.blob, { conv: p.conv, genre: p.type, nom: p.type === 'fichier' ? x.nom : undefined, max: maxDe(l, p.type) });
          x.id = d.id;
        }
        const champs = p.type === 'photo' ? { pieces: p.photos.map(x => ({ id: x.id, w: x.w, h: x.h })) } : p.type === 'vocal' ? { piece: p.vocal.id, dur: p.vocal.dur, bars: p.vocal.bars } : { piece: p.fichier.id };
        const r = await A.envoyerPieces(p.conv, p.type, champs, { cid: p.cid });
        if (retirer) retirer();
        /* l'adresse que la page avait fabriquée devient la mémoire de cette pièce : l'image qui s'affichait ne change pas, rien n'est relu */
        if (p.type === 'photo') p.photos.forEach(x => { if (x.url) poserCache(x.id, x.url, x.blob.size); });
        else if (p.type === 'vocal' && p.vocal.url) poserCache(p.vocal.id, p.vocal.url, p.vocal.blob.size);
        apresEnvoi(p.conv, { seq: r.seq, id: r.id, auteur: moiApi.id, ts: r.ts, type: p.type, texte: null, meta: metaDe(p), repond_a: null, supprime: false, modifie: null, reactions: [] });
        return r;
      } finally { p.enVol = false; }
    }
    const livrer = (p, retirer) => (p.type === 'photo' || p.type === 'vocal' || p.type === 'fichier') ? posterPieces(p, retirer) : poster(p, retirer);
    function planifierFile(n) {
      if (minuterieFile || !file.length || mort) return;
      minuterieFile = planifier(() => { minuterieFile = null; viderFile(); }, attenteEnvoi(n || 0));
    }
    let viderEnCours = false;
    async function viderFile() {
      if (viderEnCours || mort) return;
      viderEnCours = true;
      try {
        for (const p of file.slice()) {
          if (p.enVol) { planifierFile(0); break; }              // ⛔ un dépôt de pièce est en cours (un autre appel) : ce qui est derrière lui attend son tour
          try { await livrer(p, () => { const i = file.indexOf(p); if (i >= 0) file.splice(i, 1); }); }
          catch (e) {
            if (mort) return;
            if (erreurCoupure(e)) { p.essais++; planifierFile(p.essais); break; }
            /* un refus DÉFINITIF (le groupe est devenu « annonces seules », on n'en est plus membre…) : le message ne partira jamais, on le DIT */
            file.splice(file.indexOf(p), 1);
            lesPieces(p).forEach(x => { if (x.url) revoquerUrl(x.url); });   // la page ne sait plus que ce message existe : ses adresses locales n'ont plus de propriétaire
            emettre({ type: 'conversation', id: p.conv });
            const [sujet, accord] = sujetEnvoi(p);
            emettre({ type: 'avis', texte: sujet + ' n\'a pas pu être ' + accord + ' : ' + (e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.') });
          }
        }
      } finally { viderEnCours = false; }
    }
    /* Un message de pièces. Les refus qu'on peut juger ICI (rien à envoyer, trop lourd) tombent avant tout dépôt ; un refus du service rejette (la page le DIT et libère ses adresses) ;
       une coupure met le message dans la file (« En attente de connexion… »), où il repart avec le même `cid`. */
    async function envoyerMedia(id, type, b) {
      const p = { cid: OPMSG.nouveauCid(), conv: id, type, texte: '', t: maintenant(), essais: 0, enVol: false, reponse: null };
      if (type === 'photo') {
        const liste = (b.photos || []).slice(0, PHOTOS_PAR_MESSAGE).filter(x => x && x.blob && x.blob.size > 0);
        if (!liste.length) throw erreurLocale('vide');
        p.photos = liste.map(x => ({ blob: x.blob, url: x.url || null, w: Math.max(1, x.w | 0), h: Math.max(1, x.h | 0), id: null }));
      } else if (type === 'vocal') {
        const v = b.vocal;
        if (!v || !v.blob || !(v.blob.size > 0) || !(v.dur > 0)) throw erreurLocale('vide');
        const barres = (Array.isArray(v.bars) ? v.bars : []).slice(0, 64).map(n => Math.max(0, Math.min(100, Math.round(+n) || 0)));
        p.vocal = { blob: v.blob, url: v.url || null, dur: Math.max(1, Math.min(600, Math.round(v.dur))), bars: barres.length ? barres : [8], id: null };
      } else {
        const f = b.fichier;
        if (!f || !f.blob || !(f.blob.size > 0)) throw erreurLocale('vide');
        const nom = Array.from(String(f.nom || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[\/\\]/g, '_').trim()).slice(0, 120).join('') || 'fichier';
        p.fichier = { blob: f.blob, nom, taille: f.blob.size, id: null };
      }
      const l = await limites(), max = maxDe(l, type);
      for (const x of lesPieces(p)) if (x.blob.size > max) throw new OPMSG.ErreurApi('piece_trop_lourde', 413, 0, { max });
      if (!moiApi || mort) throw erreurLocale('introuvable');
      const attend = file.some(x => x.conv === id);
      file.push(p);
      if (attend) { emettre({ type: 'conversation', id }); planifierFile(0); return vueEnAttente(p); }
      emettre({ type: 'conversation', id });                      // la bulle « Envoi… » paraît tout de suite
      const retirer = () => { const i = file.indexOf(p); if (i >= 0) file.splice(i, 1); };
      try { await posterPieces(p, retirer); return { id: p.cid, auteur: moiApi.id, t: p.t, lu: null }; }
      catch (e) {
        if (erreurCoupure(e)) { p.essais++; planifierFile(p.essais); emettre({ type: 'conversation', id }); return vueEnAttente(p); }
        retirer(); emettre({ type: 'conversation', id });
        throw e;
      } finally { if (file.length) planifierFile(0); }
    }
    async function envoyer(id, brouillon) {
      brouillon = brouillon || {};
      const media = brouillon.photos && brouillon.photos.length ? 'photo' : brouillon.vocal ? 'vocal' : brouillon.fichier ? 'fichier' : null;
      if (media) return envoyerMedia(id, media, brouillon);
      const texte = valider(brouillon.texte);
      const c = convs.get(id);
      let reponse = null;
      if (brouillon.reponse) { const q = c && c.messages.find(x => x.id === brouillon.reponse); if (q) reponse = q.seq; }
      const p = { cid: OPMSG.nouveauCid(), conv: id, texte, reponse, t: maintenant(), essais: 0 };
      /* Tant qu'une file attend pour cette conversation, le suivant la REJOINT : l'ordre d'envoi est l'ordre des messages. */
      if (file.some(x => x.conv === id)) { file.push(p); emettre({ type: 'conversation', id }); planifierFile(0); return vueEnAttente(p); }
      try { await poster(p); return { id: p.cid, auteur: moiApi.id, t: p.t, texte, lu: null }; }
      catch (e) {
        if (!erreurCoupure(e)) throw e;
        file.push(p); emettre({ type: 'conversation', id }); planifierFile(0);
        return vueEnAttente(p);
      }
    }

    /* ── lu, saisie ── */
    async function marquerLu(id) {
      const c = convs.get(id), r = convsApi.find(x => x.id === id);
      const dernier = c && c.messages.length ? c.messages[c.messages.length - 1].seq : (r ? r.dernier_seq : 0);
      if (!dernier) return;
      const connu = Math.max(c && c.luLocal !== undefined ? c.luLocal : 0, r ? r.lu_seq : 0, c && c.detail ? c.detail.moi.lu_seq : 0);
      if (dernier <= connu) return;
      if (c) c.luLocal = dernier;
      try { await A.marquerLu(id, dernier); }
      catch (e) {
        if (c) c.luLocal = connu;
        /* ⛔ UN « LU » REFUSÉ SE DIT (relecture du gardien, remarque 2) : l'écran appelle `marquerLu` sans attendre de réponse et jette l'erreur (« la source le dira par
           ecouter ») — or la source ne disait rien : disque plein (503) ou 429, aucun avis, le point « non lu » revenait au retour à la liste et l'autre ne verrait jamais « Lu ».
           Une session morte a son propre écran, et une coupure son bandeau « Connexion perdue » : pas d'avis par-dessus. */
        if (!mort && e && e.code !== 'session_requise' && e.code !== 'reseau') emettre({ type: 'avis', texte: 'Ton accusé de lecture n\'a pas pu être envoyé : ' + (e.dit ? (e.phrase ? e.phrase() : e.message) : 'erreur inattendue.') });
        throw e;
      }
      if (r) { r.lu_seq = dernier; r.non_lus = 0; }
      emettre({ type: 'liste' });
    }
    function saisie(id, actif) {
      const t = maintenant();
      if (actif && t - (derniereSaisie.get(id) || 0) < 2500) return Promise.resolve();   // le service n'accepte qu'une frappe par 2 s
      derniereSaisie.set(id, actif ? t : 0);
      return A.saisie(id, !!actif).then(() => {}, () => { /* une frappe perdue n'est pas une erreur à montrer */ });
    }
    function poserSaisie(conv, uid, actif) {
      let S = saisies.get(conv);
      if (!actif) { if (S && S.has(uid)) { annuler(S.get(uid)); S.delete(uid); emettre({ type: 'conversation', id: conv }); } return; }
      if (!S) saisies.set(conv, S = new Map());
      if (S.has(uid)) annuler(S.get(uid));
      S.set(uid, planifier(() => { S.delete(uid); emettre({ type: 'conversation', id: conv }); }, delaiSaisieMs));
      emettre({ type: 'conversation', id: conv });
    }

    /* ── les gestes sur un message ── */
    const trouver = (id, mid) => { const c = convs.get(id); const m = c && c.messages.find(x => x.id === mid); if (!m) throw erreurLocale('introuvable'); return { c, m }; };
    async function modifier(id, mid, texte) {
      const t = valider(texte), { c, m } = trouver(id, mid);
      const r = await A.modifier(id, m.seq, t);
      ranger(c, { seq: m.seq, texte: t, modifie: r.modifie || maintenant() });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function supprimer(id, mid, pour) {
      const { c, m } = trouver(id, mid);
      await A.supprimer(id, m.seq, pour === 'moi' ? 'moi' : 'tous');
      oublierMeta(m.meta);
      if (pour === 'moi') c.messages = c.messages.filter(x => x.seq !== m.seq);
      else ranger(c, { seq: m.seq, supprime: true, texte: null, meta: null, reactions: [], modifie: null });
      emettre({ type: 'conversation', id }); relireListePlusTard();
    }
    async function reagir(id, mid, emoji) {
      const { c, m } = trouver(id, mid);
      const r = await A.reagir(id, m.seq, emoji || '');
      ranger(c, { seq: m.seq, reactions: r.reactions || [] });
      emettre({ type: 'conversation', id });
    }

    /* ── groupes, contacts, liens ── */
    /* une photo de profil (d'une personne ou d'un groupe) : trop lourde, on le dit AVANT de la déposer ; rend l'identifiant de la pièce déposée */
    async function deposerAvatar(blob) {
      const l = await limites();
      if (blob.size > l.avatar_max) throw new OPMSG.ErreurApi('piece_trop_lourde', 413, 0, { max: l.avatar_max });
      return (await A.deposer(blob, { genre: 'avatar', max: l.avatar_max })).id;
    }
    async function creerGroupe(spec) {
      spec = spec || {};
      const membres = (spec.membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (!membres.length) throw erreurLocale('vide');
      /* la photo du groupe se dépose AVANT (une pièce « avatar » n'a pas de conversation). Si ce dépôt est refusé, le groupe est créé quand même — et le refus est DIT : une photo
         perdue en silence serait pire qu'un groupe sans photo. */
      let pieceAvatar = null, refusPhoto = null;
      if (spec.photoBlob && spec.photoBlob.size > 0) {
        try { pieceAvatar = await deposerAvatar(spec.photoBlob); }
        catch (e) { if (e && e.code === 'session_requise') throw e; refusPhoto = e; }
      }
      const r = await A.groupe({ nom: String(spec.nom || '').trim().slice(0, 80) || 'Nouveau groupe', membres, annonces_seules: !!spec.annonces, ephemere_s: spec.ephemeres | 0, avatar_piece: pieceAvatar || undefined });
      if (refusPhoto) emettre({ type: 'avis', texte: 'Le groupe est créé, mais sa photo n\'a pas pu être envoyée : ' + (refusPhoto.dit ? (refusPhoto.phrase ? refusPhoto.phrase() : refusPhoto.message) : 'erreur inattendue.') });
      await relireListe(); emettre({ type: 'liste' });
      const c = convsApi.find(x => x.id === r.conversation.id);
      return c ? resume(c) : { id: r.conversation.id, type: 'groupe', nom: r.conversation.nom || 'Groupe', court: r.conversation.nom || 'Groupe', initiales: '#', avatar: indexAvatar(r.conversation.id), photo: null, epingle: false, membres: [], admins: [], annoncesSeulement: false, ephemeres: 0, nonLu: false, nonLus: 0, apercu: '', t: maintenant(), enLigne: false };
    }
    async function ouvrirDirecte(uid) {
      const r = await A.directe(uid);
      await relireListe(); emettre({ type: 'liste' });
      return r.conversation.id;
    }
    async function conversationPour(membres) {
      const ids = (membres || []).filter((x, i, t) => t.indexOf(x) === i);
      if (ids.length !== 1) throw erreurLocale('bientot');
      const id = await ouvrirDirecte(ids[0]);
      const c = convsApi.find(x => x.id === id);
      return c ? resume(c) : { id };
    }
    const vueMembre = (c, x) => Object.assign(vuePersonne(x), { role: x.role, moi: estMoi(x.id), enLigne: enLigne.has(x.id), contact: contactsApi.some(k => k.id === x.id) });
    async function infos(id) {
      let c = convs.get(id);
      if (!c || !c.detail) { try { const d = await A.conversation(id); for (const m of d.membres) noter(m); c = convs.get(id) || { messages: [], aPlus: false, charge: false }; c.detail = d; convs.set(id, c); } catch (e) { if (e && e.code === 'introuvable') return null; throw e; } }
      const d = c.detail, autre = d.conversation.type === 'direct' ? d.membres.find(x => !estMoi(x.id)) : null;
      const nom = autre ? nomComplet(autre) : (d.conversation.nom || 'Groupe');
      return {
        id, type: d.conversation.type, nom, initiales: autre ? initialesDe(nom) : '#', avatar: indexAvatar(autre ? autre.id : id), photo: autre ? photoPiece(autre.avatar) : photoPiece(d.conversation.avatar),
        membres: d.membres.map(x => vueMembre(c, x)), moiAdmin: d.moi.role === 'admin', annoncesSeulement: !!d.conversation.annonces_seules, ephemeres: d.conversation.ephemere_s || 0,
        enLigne: autre ? enLigne.has(autre.id) : false,
      };
    }
    async function rafraichirDetail(id) {
      const c = convs.get(id); if (!c) return;
      const d = await A.conversation(id);
      for (const m of d.membres) noter(m);
      c.detail = d;
    }
    async function majConversation(id, champs) {
      const o2 = {};
      if (champs.annonces !== undefined) o2.annonces_seules = !!champs.annonces;
      if (champs.ephemeres !== undefined) o2.ephemere_s = champs.ephemeres | 0;
      if (champs.nom !== undefined) o2.nom = String(champs.nom);
      if (champs.photoBlob !== undefined) o2.avatar_piece = champs.photoBlob === null ? null : await deposerAvatar(champs.photoBlob);
      await A.majConversation(id, o2);
      await rafraichirDetail(id); await relireListe();
      emettre({ type: 'conversation', id }); emettre({ type: 'liste' });
    }
    async function retirerMembre(id, uid) { await A.retirerMembre(id, uid); await rafraichirDetail(id); emettre({ type: 'conversation', id }); relireListePlusTard(); }
    async function nommerAdmin(id, uid, admin) { await A.admin(id, uid, !!admin); await rafraichirDetail(id); emettre({ type: 'conversation', id }); }
    async function ajouterMembres(id, uids) { const r = await A.ajouterMembres(id, uids); await rafraichirDetail(id); emettre({ type: 'conversation', id }); return r; }
    async function quitter(id) { await A.quitter(id); convs.delete(id); await relireListe(); emettre({ type: 'liste' }); }
    async function lienGroupe(id) { const r = await A.lienGroupe(id, { max: 20, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    /* ⛔ un lien de CONTACT sert UNE fois : celui qui s'échappe (historique synchronisé, transfert) ajoutait jusqu'à dix inconnus aux contacts mutuels de son auteur, sans son
       accord à l'acceptation (relecture du gardien, remarque 6). Un lien de GROUPE garde plusieurs usages — une invitation s'envoie à plusieurs, et l'administrateur la révoque. */
    async function lienContact() { const r = await A.lienContact({ max: 1, jours: 7 }); return { code: r.code, expireLe: r.expire_le }; }
    async function revoquerLiens() { const r = await A.revoquerLiensContact(); return r.n | 0; }
    async function lireLien(code) {
      const a = await A.lireLien(code);
      noter(a.par);
      return { genre: a.genre, de: nomComplet(a.par), groupe: a.groupe ? { nom: a.groupe.nom, membres: a.groupe.membres } : null };
    }
    async function accepterLien(code) {
      const r = await A.accepterLien(code);
      if (r.genre === 'contact') {
        noter(r.contact);
        await rafraichirContacts();
        const id = await ouvrirDirecte(r.contact.id);
        return { genre: 'contact', conv: id, deja: !!r.deja };
      }
      await relireListe(); emettre({ type: 'liste' });
      return { genre: 'groupe', conv: r.conversation.id, deja: !!r.deja };
    }

    /* ── le temps réel ── */
    function marquerTout() { for (const c of convs.values()) c.charge = false; listeFraiche = false; }
    function surMessage(d) {
      if (!convsApi.some(x => x.id === d.conv)) relireListePlusTard();   // une conversation neuve (quelqu'un nous a écrit, ou ajoutés)
      const c = convs.get(d.conv);
      const moi = estMoi(d.auteur);
      if (d.cid) { const i = file.findIndex(p => p.cid === d.cid); if (i >= 0) file.splice(i, 1); }   // notre propre envoi, revenu par le flux : la file n'a plus rien à renvoyer
      if (c && c.charge) {
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else ranger(c, { seq: d.seq, id: d.id, auteur: d.auteur, ts: d.ts, type: d.type, repond_a: d.repond_a || null, texte: d.texte === undefined ? null : d.texte, meta: d.meta || null, supprime: !!d.supprime, illisible: !!d.illisible, reactions: [], modifie: null });
        if (c.detail && d.type === 'systeme') rafraichirDetail(d.conv).then(() => emettre({ type: 'conversation', id: d.conv }), () => {});
      }
      if (d.type === 'systeme' && !(c && c.charge)) { const cc = convs.get(d.conv); if (cc && cc.detail) rafraichirDetail(d.conv).catch(() => {}); }
      if (d.auteur) { const S = saisies.get(d.conv); if (S && S.has(d.auteur)) { annuler(S.get(d.auteur)); S.delete(d.auteur); } }
      emettre({ type: 'conversation', id: d.conv });
      relireListePlusTard();
      if (!moi && d.type !== 'systeme') {
        const r = convsApi.find(x => x.id === d.conv);
        emettre({ type: 'arrivee', conv: d.conv, de: nomDe(d.auteur), convNom: r ? resume(r).nom : null, groupe: r ? r.type === 'groupe' : false, texte: d.supprime ? '' : (d.texte === undefined || d.texte === null ? resumeMedia(d.type, d.meta) : extrait(d.texte, 140)) });
      }
    }
    const gestionnaires = {
      message: surMessage,
      message_modifie: (d) => {
        const c = convs.get(d.conv); if (!c || !c.charge) return;
        if (d.relis) A.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => ranger(c, m)); emettre({ type: 'conversation', id: d.conv }); }, () => {});
        else { ranger(c, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true, modifie: d.modifie || maintenant() }); emettre({ type: 'conversation', id: d.conv }); }
        relireListePlusTard();
      },
      message_supprime: (d) => {
        const c = convs.get(d.conv);
        if (c && c.charge) {
          const m = c.messages.find(x => x.seq === d.seq); if (m) oublierMeta(m.meta);
          if (d.pour === 'moi' || d.pour === 'expire') c.messages = c.messages.filter(x => x.seq !== d.seq);
          else ranger(c, { seq: d.seq, supprime: true, texte: null, meta: null, reactions: [], modifie: null });
          emettre({ type: 'conversation', id: d.conv });
        }
        relireListePlusTard();
      },
      reaction: (d) => { const c = convs.get(d.conv); if (!c || !c.charge) return; ranger(c, { seq: d.seq, reactions: d.reactions || [] }); emettre({ type: 'conversation', id: d.conv }); },
      conversation: (d) => {
        const c = convs.get(d.conv);
        const fin = () => { emettre({ type: 'conversation', id: d.conv }); relireListePlusTard(); };
        if (c && c.detail) rafraichirDetail(d.conv).then(fin, fin); else fin();
      },
      retire: (d) => { convs.delete(d.conv); const S = saisies.get(d.conv); if (S) { for (const h of S.values()) annuler(h); saisies.delete(d.conv); } emettre({ type: 'retire', id: d.conv }); relireListePlusTard(); },
      lu: (d) => {
        if (estMoi(d.uid)) { const r = convsApi.find(x => x.id === d.conv); if (r && d.seq > r.lu_seq) { r.lu_seq = d.seq; relireListePlusTard(); } const c = convs.get(d.conv); if (c) c.luLocal = Math.max(c.luLocal || 0, d.seq); return; }
        lecteursDe(d.conv).set(d.uid, { seq: d.seq, ts: d.ts || maintenant() });
        const c = convs.get(d.conv);
        if (c && c.detail) { const x = c.detail.membres.find(m => m.id === d.uid); if (x && (x.lu_seq === null || x.lu_seq === undefined || d.seq > x.lu_seq)) x.lu_seq = d.seq; emettre({ type: 'conversation', id: d.conv }); }
      },
      notification: (d) => {
        emettre({ type: 'notification', titre: d.titre, texte: d.texte, nature: d.type, cible: d.cible });
        if (d.type === 'contact_ajoute') rafraichirContacts().catch(() => {});
        if (d.type === 'groupe_ajoute') relireListePlusTard();
      },
      saisie: (d) => { if (!estMoi(d.uid)) poserSaisie(d.conv, d.uid, !!d.actif); },
      personne: (d) => {
        if (estMoi(d.uid)) api0.moi().then(m => { moiApi = m; noter(m); emettre({ type: 'moi' }); }, () => {});
        rafraichirContacts().catch(() => {});
        for (const [id, c] of convs) if (c.detail && c.detail.membres.some(m => m.id === d.uid)) rafraichirDetail(id).then(() => emettre({ type: 'conversation', id }), () => {});
        relireListePlusTard();
      },
      presence: (d) => {
        if (d.en_ligne) enLigne.add(d.uid); else enLigne.delete(d.uid);
        emettre({ type: 'presence', id: d.uid }); emettre({ type: 'contacts' }); emettre({ type: 'liste' });
        for (const [id, c] of convs) if (c.detail && c.detail.membres.some(m => m.id === d.uid)) emettre({ type: 'conversation', id });
      },
      resync: () => {
        marquerTout();
        Promise.all([relireListe(), rafraichirContacts()]).then(() => { emettre({ type: 'liste' }); for (const id of convs.keys()) emettre({ type: 'conversation', id }); }, () => {});
      },
      reseau: (etat) => {
        emettre({ type: 'reseau', etat });
        if (etat === 'ok') { verifierSession(); planifierFile(0); }
      },
      erreur: (e) => {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return; }
        emettre({ type: 'avis', texte: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le temps réel a rencontré une erreur.' });
      },
    };
    function demarrerFlux() {
      ecoute = api0.ecouter(gestionnaires);
    }
    function arreter() {
      enMarche = false;
      oublierPieces();
      if (ecoute) { try { ecoute.fermer(); } catch (e) { /* déjà fermé */ } ecoute = null; }
      if (minuterieFile) { annuler(minuterieFile); minuterieFile = null; }
      for (const S of saisies.values()) for (const h of S.values()) annuler(h);
      saisies.clear();
    }

    /* ── la session ── */
    async function verifierSession() {
      if (!enMarche || mort) return true;
      try {
        const m = await api0.moi();
        if (moiApi && m.id !== moiApi.id) { sessionMorte('identite'); return false; }
        return true;
      } catch (e) {
        if (e && e.code === 'session_requise') { sessionMorte('session_requise'); return false; }
        return true;   // une coupure n'est pas une session morte : on ne sait pas, on ne sort personne
      }
    }
    /* La page revient (onglet visible, réseau revenu) : le flux est rouvert si une pulsation est en retard (`force` : toujours) — une connexion à moitié morte ne se
       détecte pas toute seule avant des minutes (relecture du testeur, D3). */
    function reveiller(force) {
      if (!enMarche || mort || !ecoute || typeof ecoute.rouvrir !== 'function') return false;
      return ecoute.rouvrir({ force: !!force });
    }
    async function demarrer() {
      let m;
      try { m = await api0.moi(); }
      catch (e) { return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : '' }; }
      moiApi = m; noter(m);
      try {
        installerContacts(await api0.contacts());
        await relireListe();
      } catch (e) {
        if (e && e.code === 'session_requise') return { connecte: false, motif: 'session_requise', phrase: '' };
        /* Un échec de chargement n'est PAS « personne n'est connecté » : on le dit tel quel (le gardien : un 429 ou un 503 devenait un écran de connexion muet). */
        return { connecte: false, motif: (e && e.code) || 'inconnue', phrase: e && e.dit ? (e.phrase ? e.phrase() : e.message) : 'Le chargement a échoué.', connectee: true };
      }
      enMarche = true;
      demarrerFlux();
      return { connecte: true };
    }
    async function connexion(login, pass) {
      const m = await api0.connexionBeta(String(login || ''), String(pass || ''));
      return m;
    }
    async function deconnexion() {
      await api0.deconnexion();   // ⛔ d'abord le service : s'il refuse, le flux reste ouvert et l'écran n'a pas menti
      mort = true; arreter();
      return true;
    }

    /* ── les réglages du compte (capacité `reglages`) ──
       ⛔ Chaque geste rend ce que le SERVICE a retenu (jamais ce que la page croit avoir demandé) : un réglage refusé lève l'erreur et la page garde l'état d'avant. */
    const vueProfil = (m) => Object.assign(vuePersonne(m), { champs: { prenom: m.prenom || '', nom: m.nom || '', statut: m.statut || '' }, origine: m.origine || '' });
    function adopterMoi(m) { moiApi = m; noter(m); emettre({ type: 'moi' }); relireListePlusTard(); }
    async function profil() { const m = await A.moi(); moiApi = m; noter(m); return vueProfil(m); }
    async function majProfil(champs) {
      champs = champs || {};
      const c = {};
      for (const k of ['prenom', 'nom', 'statut']) if (champs[k] !== undefined) c[k] = String(champs[k]);
      if (!Object.keys(c).length) throw erreurLocale('vide');
      const m = await A.majMoi(c);
      adopterMoi(m);
      return vueProfil(m);
    }
    async function poserPhotoProfil(blob) {
      if (!blob || !(blob.size > 0)) throw erreurLocale('vide');
      const ancien = moiApi && moiApi.avatar;
      const piece = await deposerAvatar(blob);
      const r = await A.poserAvatar(piece);
      poserCache(piece, creerUrl(blob), blob.size);                          // l'image qu'on vient de choisir est déjà là : rien à relire
      if (ancien && ancien !== piece) liberer(ancien);
      adopterMoi(r.moi);
      return vueProfil(r.moi);
    }
    async function retirerPhotoProfil() {
      const ancien = moiApi && moiApi.avatar;
      const r = await A.poserAvatar(null);
      if (ancien) liberer(ancien);
      adopterMoi(r.moi);
      return vueProfil(r.moi);
    }
    const etatConfidentialite = (r) => ({ presence: r.presence !== false, accuses: r.accuses !== false });
    async function confidentialite() { return etatConfidentialite(await A.confidentialite()); }
    async function majConfidentialite(champs) {
      const c = {};
      for (const k of ['presence', 'accuses']) if (champs && typeof champs[k] === 'boolean') c[k] = champs[k];
      if (!Object.keys(c).length) throw erreurLocale('vide');
      const r = etatConfidentialite(await A.majConfidentialite(c));
      /* ce que je vois des autres change avec mes réglages (leur présence, leur « Lu ») : tout se relit */
      rafraichirContacts().catch(() => {});
      for (const id of convs.keys()) rafraichirDetail(id).then(() => emettre({ type: 'conversation', id }), () => {});
      relireListePlusTard();
      return r;
    }
    const bloques = () => contactsTous.filter(c => c.bloque).map(c => Object.assign(vuePersonne(c), { bloque: true }));
    async function bloquer(uid) { await A.bloquer(uid); await rafraichirContacts(); relireListePlusTard(); }
    async function debloquer(uid) { await A.debloquer(uid); await rafraichirContacts(); relireListePlusTard(); }
    async function deconnecterAutres() { const r = await A.deconnecterAutres(); return { sessions: r.sessions | 0, appareils: r.appareils | 0 }; }
    /* ⛔ pas `| 0` : le quota est de 2 Gio (2 147 483 648 octets), un entier signé sur 32 bits le rendrait NÉGATIF */
    const entierPositif = (x) => Number.isFinite(+x) ? Math.max(0, Math.floor(+x)) : 0;
    async function stockageUtilise() { const r = await A.stockage(); return { utilise: entierPositif(r.utilise), max: entierPositif(r.max) }; }
    async function aPropos() { const c = await A.config(); return { version: String(c.version || ''), instance: String(c.instance || ''), limites: Object.assign({}, c.limites && c.limites.pieces) }; }

    const rejeter = (code) => () => Promise.reject(erreurLocale(code));
    /* ⛔ combien de messages n'ont PAS encore quitté l'appareil (réseau coupé, service muet) : la page les perd quand elle repart de zéro ou qu'on la ferme — rien n'est rangé sur
       l'appareil, c'est voulu —, donc elle DOIT le dire (relectures du gardien, remarque 1, et du testeur, D8). */
    const enAttente = () => file.length;
    const source = {
      capacites: { service: true, connexion: true, photos: true, vocaux: true, fichiers: true, avatars: true, reglages: true, appels: false, reunions: false, actionsMessage: true, groupeInfos: true, liens: true, presence: true, saisie: true, historique: true, texteMax: 8000 },
      demarrer, connexion, deconnexion, verifierSession, arreter, enAttente, reveiller,
      surSessionMorte: (cb) => { suiviMort = cb; },
      moi: () => moiApi ? Object.assign(vuePersonne(moiApi), { id: moiApi.id }) : null,
      contacts: () => contactsApi.map(vueContact).sort((x, y) => x.nom.localeCompare(y.nom, 'fr')),
      personne, rafraichirContacts,
      lister, ouvrir, precedents, envoyer, marquerLu, saisie,
      modifier, supprimer, reagir,
      creerGroupe, ouvrirDirecte, conversationPour, infos, majConversation, retirerMembre, nommerAdmin, ajouterMembres, quitter, lienGroupe,
      lienContact, revoquerLiens, lireLien, accepterLien,
      /* ── les pièces et les réglages ── */
      pieceUrl, pieceBlob,
      profil, majProfil, poserPhotoProfil, retirerPhotoProfil, confidentialite, majConfidentialite, bloques, bloquer, debloquer, deconnecterAutres, stockage: stockageUtilise, aPropos,
      /* ── ce que le service ne sait pas encore : les appels (étape 7) — la page dit « bientôt », ces méthodes refusent proprement ── */
      appels: () => Promise.resolve([]),
      demarrerAppel: rejeter('bientot'), appel: () => Promise.resolve(null), terminerAppel: rejeter('bientot'),
      ecouter(cb) {
        ecouteurs.push(cb);
        return () => { const i = ecouteurs.indexOf(cb); if (i >= 0) ecouteurs.splice(i, 1); };
      },
    };
    return source;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { creerSourceServeur, erreurLocale, initialesDe };
  else { racine.OPMSG_creerSourceServeur = creerSourceServeur; racine.OPMSG_SOURCE = creerSourceServeur(); }
})(typeof window !== 'undefined' ? window : globalThis);
