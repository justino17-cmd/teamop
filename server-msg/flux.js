/* ══ LE TEMPS RÉEL — UN FLUX SSE PAR ONGLET, REPRISE PAR `Last-Event-ID` ══════════════════════
 *
 * `GET /api/flux` reste ouvert ; les mutations sont des POST ordinaires. Chaque événement DURABLE
 * est une ligne du `journal` et porte `id: <gid>` : après une coupure, `EventSource` renvoie tout
 * seul `Last-Event-ID` et le serveur rejoue ce qui concerne la personne. Les événements
 * ÉPHÉMÈRES (saisie, présence) n'ont pas d'`id` et ne sont jamais écrits : ils ne sont rejoués à
 * personne — une frappe d'il y a une minute n'a aucun intérêt.
 *
 * ⛔ UN ADAPTATEUR QUI REMPLACE UNE API QUI POUSSE DOIT POUSSER SES PROPRES ÉCRITURES (règle du
 * dépôt, 21 septembre 2026). Toute écriture qui réussit appelle `reveiller()` TOUT DE SUITE : le
 * message qu'on vient d'envoyer paraît chez les autres sans attendre un passage d'interrogation.
 * Les destinataires se DÉDUISENT des membres au moment de la lecture (`evenementsPour`) : la même
 * requête sert la reprise et la diffusion, donc elles ne peuvent pas diverger.
 *
 * ⛔ UN MEMBRE RETIRÉ NE REÇOIT PLUS RIEN DÈS L'ÉCRITURE. `reveiller()` ne désigne que les
 * membres ACTIFS plus les personnes nommées explicitement (le retiré, pour son événement `retire`) ;
 * et la requête de visibilité elle-même exclut un ancien membre — même pour un événement déjà
 * écrit mais pas encore envoyé.
 *
 * ⛔ AU REPOS, UN FLUX NE COÛTE QUE SA PULSATION : un événement `pouls` toutes les 20 s,
 * aucune requête. C'est la leçon de la boucle du 25 septembre — deux appareils au repos ne doivent pas
 * s'interroger. `tests/test-907.js` compte les requêtes par minute de deux flux ouverts.
 *
 * Limites : 5 flux par personne et 200 par adresse (refus 429 avec `Retry-After`, jamais
 * « on ferme le plus ancien » : six onglets se feraient la guerre en boucle), fermeture à 24 h,
 * coupure si l'écriture retarde de plus de 1 Mio (un client qui ne lit plus ne gonfle pas la
 * mémoire du processus qui porte aussi les autres).
 *
 * La présence se calcule depuis les flux ouverts, ne s'envoie qu'aux contacts mutuels sans
 * blocage, se désactive (`prefs.presence:false`), et garde 20 s de grâce : recharger la page
 * ne fait pas clignoter « hors ligne ».
 */
const { cleReseau } = require('./quotas');
const MAX_PAR_PERSONNE = 5, MAX_PAR_IP = 200, MAX_TAMPON = 1 << 20, DUREE_MAX_MS = 24 * 3600 * 1000;

const trame = (id, event, data) => (id !== null && id !== undefined ? 'id: ' + id + '\n' : '') + 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';

function creerFlux({ stockage, config, horloge = Date.now }) {
  const flux = new Set();             // { uid, res, dernier, h, ip, ouvertA }
  const parUid = new Map();           // uid → Set<flux>
  const parIp = new Map();            // ip → nombre
  const graces = new Map();           // uid → minuteur d'absence
  let refus = 0;

  function ecrire(f, texte) {
    try {
      f.res.write(texte);
      if (f.res.writableLength > MAX_TAMPON) { fermer(f, 'lent'); return false; }
      return true;
    } catch (e) { fermer(f, 'ecriture'); return false; }
  }

  function fermer(f, motif) {
    if (!flux.has(f)) return;
    flux.delete(f);
    const s = parUid.get(f.uid); if (s) { s.delete(f); if (!s.size) parUid.delete(f.uid); }
    const n = (parIp.get(f.ip) || 1) - 1; if (n > 0) parIp.set(f.ip, n); else parIp.delete(f.ip);
    try { if (motif) f.res.write(trame(null, 'fin', { motif })); f.res.end(); } catch (e) {}
    if (!parUid.has(f.uid)) absente(f.uid);
  }

  /* Rejoue ce qui concerne ce flux depuis son dernier événement, par pages de 200. */
  function tirer(f) {
    for (;;) {
      const r = stockage.evenementsPour(f.uid, f.dernier, 200);
      for (const e of r.evenements) if (!ecrire(f, trame(e.gid, e.event, e.data))) return;
      f.dernier = r.dernier;
      if (!r.plein) return;
    }
  }

  /* Ouvre un flux : `{ ok:false, code, retry }` s'il est refusé (le gestionnaire répond alors en
     JSON et un EventSource neuf n'est pas recréé en boucle), sinon `{ ok:true }`. */
  function ouvrir({ uid, h, ip: ipBrute, req, res, lastId }) {
    const ip = cleReseau(ipBrute);   // le plafond par adresse se compte par réseau (/64 en IPv6)
    const pers = parUid.get(uid);
    if ((pers ? pers.size : 0) >= MAX_PAR_PERSONNE || (parIp.get(ip) || 0) >= MAX_PAR_IP) { refus++; return { ok: false, code: 'trop_de_flux', retry: 5 }; }
    res.status(200);
    res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    if (req.socket) { req.socket.setTimeout(0); req.socket.setNoDelay(true); }
    const f = { uid, res, dernier: 0, h, ip, ouvertA: horloge() };
    flux.add(f);
    if (!parUid.has(uid)) parUid.set(uid, new Set());
    parUid.get(uid).add(f);
    parIp.set(ip, (parIp.get(ip) || 0) + 1);
    res.on('close', () => fermer(f, null));
    ecrire(f, 'retry: 2000\n\n');

    const max = stockage.journalMax();
    /* ⛔ Le client ne reçoit JAMAIS `max` (le compteur global du journal) : seulement le dernier identifiant qui LE concerne (`gidVisible`). `f.dernier` reste, lui, le
       compteur interne : rien d'intermédiaire ne concerne cette personne (c'est ce qu'est « le dernier »), donc partir de `max` ne saute rien.
       `pouls_ms` : le rythme des pulsations, pour que la page sache combien de silence veut dire « connexion à moitié morte » (voir `pulsation` plus bas). */
    const vis = stockage.gidVisible(uid);
    /* ⛔ Un ENTIER, rien d'autre : `parseInt('1.5')` valait 1 et `parseInt('1e3')` valait 1 aussi. */
    let n = /^\d{1,15}$/.test(String(lastId)) ? parseInt(lastId, 10) : NaN;
    if (!Number.isInteger(n) || n < 0) {
      f.dernier = max;
      ecrire(f, trame(vis, 'bonjour', { gid: vis, pouls_ms: config.pulsationMs }));
    } else {
      const min = stockage.journalMin();
      /* Plus rien à rejouer sur ce point précis → `resync` : le client relit la liste. Un journal
         plus jeune que le client (base restaurée) en est un cas aussi. */
      const perdu = n > max || (min === null ? n < max : min > n + 1);
      if (perdu) { f.dernier = max; ecrire(f, trame(vis, 'resync', { gid: vis, pouls_ms: config.pulsationMs })); }
      else { f.dernier = n; ecrire(f, trame(n, 'bonjour', { gid: n, reprise: true, pouls_ms: config.pulsationMs })); tirer(f); }
    }
    if ((parUid.get(uid) || new Set()).size === 1) apparue(uid);
    return { ok: true };
  }

  /* Toute écriture appelle ceci : les membres actifs de `conv`, plus `uids` nommés. */
  function reveiller({ conv, uids } = {}) {
    const cibles = new Set(uids || []);
    if (conv) for (const u of stockage.membresActifs(conv)) cibles.add(u);
    for (const u of cibles) { const s = parUid.get(u); if (s) for (const f of Array.from(s)) tirer(f); }
  }

  /* Éphémères : sans `id`, jamais écrits, perdus pour qui n'a pas de flux ouvert. */
  function emettre(uids, event, data) {
    for (const u of uids) { const s = parUid.get(u); if (s) for (const f of Array.from(s)) ecrire(f, trame(null, event, data)); }
  }

  function enLigne(uid) { return parUid.has(uid) || graces.has(uid); }
  /* Combien de flux cette personne a-t-elle d'OUVERTS à cet instant (la grâce de 20 s d'une page qu'on recharge ne compte pas) : les notifications push en dépendent — aucun flux, elles partent
     tout de suite ; un flux ouvert, elles attendent qu'une page les acquitte (`push.js`). */
  function fluxOuverts(uid) { const s = parUid.get(uid); return s ? s.size : 0; }

  /* ⛔ LA PRÉSENCE EST RÉCIPROQUE (comme chez WhatsApp) : qui coupe « Afficher quand je suis en ligne » ne montre sa présence à personne ET ne voit celle de personne.
     La moitié « je ne montre pas » existait ; la moitié « je ne vois pas » manquait — l'événement partait vers des contacts qui avaient, eux, coupé la leur. */
  const presenceVisible = (uid) => { const p = stockage.personneParId(uid); return !!p && !(p.prefs && p.prefs.presence === false); };
  function diffuserPresence(uid, enLigneMaintenant) {
    if (!presenceVisible(uid)) return;
    emettre(stockage.contactsActifs(uid).filter(presenceVisible), 'presence', { uid, en_ligne: enLigneMaintenant });
  }
  /* Le réglage de présence vient de changer : les contacts qui peuvent me voir l'apprennent TOUT DE SUITE (« hors ligne » si je viens de couper, « en ligne » si je reviens
     et que je suis là) ; mes autres appareils relisent les contacts (leur liste de présences n'est plus la même). */
  function presenceChangee(uid) {
    if (presenceVisible(uid)) {
      if (parUid.has(uid) || graces.has(uid)) diffuserPresence(uid, true);
    } else {
      emettre(stockage.contactsActifs(uid), 'presence', { uid, en_ligne: false });
    }
    emettre([uid], 'personne', { uid });
  }
  /* Deux réglages changent ce que les AUTRES voient de moi : la présence (les contacts l'apprennent tout de suite) et les accusés de lecture (les co-membres relisent les
     « Lu » : celui de la personne qui les coupe disparaît chez eux). `avant` et `apres` sont les `prefs` de la personne. */
  function reglagesChanges(uid, avant, apres) {
    const pres = (p) => !(p && p.presence === false), acc = (p) => !(p && p.accuses === false);
    if (pres(avant) !== pres(apres)) presenceChangee(uid);
    if (acc(avant) !== acc(apres)) personneChangee(uid);
  }
  /* Mon profil (photo, nom, statut) vient de changer : mes contacts, ceux qui partagent une conversation avec moi, et mes autres appareils. Éphémère, comme la présence :
     l'identifiant seul voyage, la page relit ce qu'elle a le droit de voir. */
  function personneChangee(uid) {
    emettre(stockage.audiencePersonne(uid).concat([uid]), 'personne', { uid });
  }
  function apparue(uid) {
    const g = graces.get(uid);
    if (g) { clearTimeout(g); graces.delete(uid); return; }   // il est revenu dans la grâce : personne n'a rien vu
    diffuserPresence(uid, true);
  }
  function absente(uid) {
    if (graces.has(uid)) return;
    const t = setTimeout(() => { graces.delete(uid); if (!parUid.has(uid)) diffuserPresence(uid, false); }, config.presenceGraceMs);
    if (t.unref) t.unref();
    graces.set(uid, t);
  }

  function fermerSession(h) { for (const f of Array.from(flux)) if (f.h === h) fermer(f, 'session'); }
  function fermerPersonne(uid) { for (const f of Array.from(parUid.get(uid) || [])) fermer(f, 'session'); }

  const pulsation = setInterval(() => {
    const t = horloge();
    for (const f of Array.from(flux)) {
      if (t - f.ouvertA > DUREE_MAX_MS) { fermer(f, 'duree'); continue; }
      /* ⛔ un VRAI événement, pas un commentaire `:` — `EventSource` n'expose jamais un commentaire au JavaScript, donc la page ne pouvait pas savoir qu'une
         connexion s'était tue (câble débranché, NAT expiré, veille) : elle ne voyait plus rien arriver et ne disait rien. Sans `id` : jamais rejoué, jamais écrit. */
      ecrire(f, trame(null, 'pouls', {}));
    }
  }, config.pulsationMs);
  if (pulsation.unref) pulsation.unref();

  function arreter() {
    clearInterval(pulsation);
    for (const f of Array.from(flux)) fermer(f, 'arret');
    for (const t of graces.values()) clearTimeout(t);   // APRÈS les fermetures : elles posent chacune une grâce
    graces.clear();
  }

  return {
    ouvrir, reveiller, emettre, enLigne, fluxOuverts, fermerSession, fermerPersonne, arreter, presenceChangee, personneChangee, reglagesChanges,
    stats: () => ({ ouverts: flux.size, personnes: parUid.size, refus }),
  };
}

module.exports = { creerFlux, trame, MAX_PAR_PERSONNE, MAX_PAR_IP };
