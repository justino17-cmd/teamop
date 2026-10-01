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
 * ⛔ AU REPOS, UN FLUX NE COÛTE QUE SA PULSATION : un commentaire `:` toutes les 20 s, aucune
 * requête. C'est la leçon de la boucle du 25 septembre — deux appareils au repos ne doivent pas
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
  function ouvrir({ uid, h, ip, req, res, lastId }) {
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
    let n = lastId === undefined || lastId === null || lastId === '' ? NaN : parseInt(lastId, 10);
    if (!Number.isInteger(n) || n < 0) {
      f.dernier = max;
      ecrire(f, trame(max, 'bonjour', { gid: max }));
    } else {
      const min = stockage.journalMin();
      /* Plus rien à rejouer sur ce point précis → `resync` : le client relit la liste. Un journal
         plus jeune que le client (base restaurée) en est un cas aussi. */
      const perdu = n > max || (min === null ? n < max : min > n + 1);
      if (perdu) { f.dernier = max; ecrire(f, trame(max, 'resync', { gid: max })); }
      else { f.dernier = n; ecrire(f, trame(n, 'bonjour', { gid: n, reprise: true })); tirer(f); }
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

  function diffuserPresence(uid, enLigneMaintenant) {
    const p = stockage.personneParId(uid);
    if (!p || (p.prefs && p.prefs.presence === false)) return;
    emettre(stockage.contactsActifs(uid), 'presence', { uid, en_ligne: enLigneMaintenant });
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
      ecrire(f, ': p\n\n');
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
    ouvrir, reveiller, emettre, enLigne, fermerSession, fermerPersonne, arreter,
    stats: () => ({ ouverts: flux.size, personnes: parUid.size, refus }),
  };
}

module.exports = { creerFlux, trame, MAX_PAR_PERSONNE, MAX_PAR_IP };
