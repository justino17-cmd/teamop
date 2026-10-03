/* ══ LES NOTIFICATIONS PUSH D'OP MESSAGES — LISTE BLANCHE, VAPID PROPRE, CHARGE MINIMALE, ACQUITTEMENT ═══════════════════════
 *
 * Une notification part sur le téléphone ou l'ordinateur d'une personne quand elle n'est pas devant l'application : un nouveau message, un ajout à
 * un groupe, un nouveau contact, un nouvel appareil connecté à son compte. Ce module est LA porte d'envoi (`pousser`) : les autres étapes (réunions, appels)
 * l'appelleront, elles ne réécriront pas leur propre envoi.
 *
 * ⛔ UN POINT D'ACCÈS PUSH EST UNE ADRESSE QUE LE SERVICE APPELLE À LA DEMANDE D'UN INCONNU. Le navigateur donne `endpoint` ; la personne l'envoie ; le service y
 * fait un POST. Sans filtre, c'est une porte vers `127.0.0.1:8080` (OP GESTION, sur la même machine) ou vers le réseau interne : une SSRF (la route d'OP GESTION,
 * `/api/subscribe`, accepte tout — c'est son défaut, pas un modèle). Ici : `https` SEULEMENT, port 443 SEULEMENT, aucun identifiant dans l'adresse, aucun fragment,
 * et un nom d'hôte pris dans une LISTE BLANCHE — le service push de Chrome et des navigateurs qui l'utilisent (FCM), de Firefox (Mozilla), d'Apple (Safari, pages
 * ajoutées à l'écran d'accueil) et de Windows (WNS). La comparaison est EXACTE ou par SUFFIXE AVEC POINT (`.push.apple.com`) : `evilpush.apple.com` et
 * `fcm.googleapis.com.evil.fr` ne passent pas, un point final non plus. La liste est RE-VÉRIFIÉE à l'envoi (une ligne ancienne, une liste resserrée depuis), aucune
 * redirection n'est suivie, le délai est court, et — défense en profondeur — l'adresse IP à laquelle le nom se résout est refusée si elle est privée.
 * ⛔ Cette liste NOMME les services push des navigateurs ; ce n'est pas Firebase (le produit) : OP MESSAGES n'utilise AUCUN service de Google en dehors de la
 * boîte aux lettres que le navigateur de la personne impose pour la réveiller. `tests/test-900.js` nomme cette exception, ici et pas ailleurs.
 *
 * ⛔ LA CHARGE EST MINIMALE PAR DÉFAUT. « Nouveau message » et l'identifiant de la conversation (pour l'ouvrir) : pas de nom, pas de texte — une notification se lit sur un écran
 * verrouillé, dans un train. La personne qui a ACTIVÉ « Aperçu du message dans la notification » (`prefs.apercu_notif`) reçoit le nom de l'auteur et les cent premiers caractères.
 * La charge est chiffrée de bout en bout vers l'appareil (RFC 8291, `web-push`) : le service push ne la lit pas.
 *
 * ⛔ UNE NOTIFICATION NE DOUBLE PAS UNE PAGE QUI EST SOUS LES YEUX. Elle part tout de suite si la personne n'a AUCUN flux ouvert. Sinon elle ATTEND `ackMs` (5 s) : la page qui a
 * reçu l'événement ET l'a montré (page visible) l'acquitte (`POST /api/flux/ack {gid}` → `acquitter`), et rien ne part. Une page cachée ne l'acquitte pas : la notification part
 * après 5 s. Plusieurs événements d'une même conversation pendant l'attente n'en font QU'UNE. Elle est RE-JUGÉE à l'instant de partir (`valide`) : sourdine posée entre-temps,
 * conversation quittée, message supprimé « pour tous » — rien de cela ne part.
 *
 * ⛔ UN 404 OU UN 410 DU SERVICE PUSH RETIRE L'ABONNEMENT (l'appareil l'a révoqué) ; tout autre échec est COMPTÉ, et l'abonnement part au `echecsMax`-ième de suite. Aucun point
 * d'accès, aucune clé, aucun texte de message, aucun nom ne va dans un journal ni dans /health : seuls des nombres.
 *
 * Aucune dépendance au-delà de `web-push` (la même version qu'OP GESTION) : le transport HTTP est fait main, pour tenir la redirection, le délai et l'adresse IP.
 */
'use strict';
const crypto = require('crypto'), https = require('https'), http = require('http'), dns = require('dns');
const webpush = require('web-push');
const { APPAREIL_ABS_MS } = require('./telephone');   // le plafond absolu d'un jeton d'appareil : une personne qui n'a que lui reste JOIGNABLE

/* ── La liste blanche ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const HOTES_EXACTS = ['fcm.googleapis.com'];
const HOTES_SUFFIXES = ['.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'];
const ETIQUETTE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ENDPOINT_MAX = 2048;

/* Un nom d'hôte est admis s'il est EXACTEMENT l'un des exacts, ou s'il se termine par l'un des suffixes (avec son point) précédé d'au moins une étiquette de nom valide. */
function hoteAutorise(h) {
  if (typeof h !== 'string' || !h || h !== h.toLowerCase()) return false;
  if (HOTES_EXACTS.includes(h)) return true;
  for (const suf of HOTES_SUFFIXES) {
    if (h.length > suf.length && h.endsWith(suf) && h.slice(0, -suf.length).split('.').every(l => ETIQUETTE.test(l))) return true;
  }
  return false;
}

/* → { ok:true, url } (l'adresse ANALYSÉE, celle qu'on appellera) ou { ok:false, raison }. `testHote` : « 127.0.0.1:<port> », la porte des bancs (config.js la refuse en production). */
function analyserEndpoint(endpoint, testHote) {
  const non = (raison) => ({ ok: false, raison });
  if (typeof endpoint !== 'string' || endpoint.length < 12 || endpoint.length > ENDPOINT_MAX) return non('forme');
  /* ni espace, ni contrôle, ni antislash : le parseur d'adresses réécrit « \ » en « / » et ignore des caractères — on ne laisse aucun flou entre ce qu'on contrôle et ce qu'on appelle */
  if (/[\u0000- \u007f-\u009f\\]/.test(endpoint)) return non('forme');
  let u;
  try { u = new URL(endpoint); } catch (e) { return non('forme'); }
  if (u.username || u.password) return non('identifiants');
  if (u.hash || endpoint.includes('#')) return non('forme');
  const canon = (schema) => endpoint.startsWith(schema + '//' + u.host + '/');   // l'adresse est DÉJÀ sous sa forme canonique (casse, port par défaut, point final : rien n'a été réécrit)
  if (testHote && u.protocol === 'http:' && u.host === testHote && canon('http:')) return { ok: true, url: u };
  if (u.protocol !== 'https:') return non('schema');
  if (u.port !== '') return non('port');
  if (!hoteAutorise(u.hostname)) return non('hote');
  if (!canon('https:')) return non('forme');
  return { ok: true, url: u };
}
/* L'adresse sous la forme qu'on RANGE (et dont on calcule l'empreinte) ; une adresse illisible reste telle quelle (elle ne retirera rien). */
function canoniser(endpoint) { try { return new URL(String(endpoint)).href; } catch (e) { return String(endpoint); } }

/* Une clé en base64 URL SANS remplissage, de la longueur attendue, sous sa forme canonique (ré-encodée, elle redonne le même texte). */
function cleBase64Url(v, longueur) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]+$/.test(v) || v.length > 200) return null;
  const b = Buffer.from(v, 'base64url');
  return b.length === longueur && b.toString('base64url') === v ? b : null;
}
/* Un abonnement tel que `PushSubscription.toJSON()` le donne → { ok:true, endpoint, p256dh, auth } ou { ok:false, code } ('champ_invalide' | 'service_push_refuse'). */
function validerAbonnement(sub, testHote) {
  if (!sub || typeof sub !== 'object' || Array.isArray(sub) || !sub.keys || typeof sub.keys !== 'object') return { ok: false, code: 'champ_invalide' };
  const e = analyserEndpoint(sub.endpoint, testHote);
  if (!e.ok) return { ok: false, code: e.raison === 'forme' ? 'champ_invalide' : 'service_push_refuse' };
  const p = cleBase64Url(sub.keys.p256dh, 65), a = cleBase64Url(sub.keys.auth, 16);
  if (!p || !a || p[0] !== 4) return { ok: false, code: 'champ_invalide' };
  /* la clé publique de l'appareil doit être un POINT de la courbe P-256 : sinon l'envoi chiffrerait vers rien et chaque tentative échouerait */
  try { const k = crypto.createECDH('prime256v1'); k.generateKeys(); k.computeSecret(p); } catch (x) { return { ok: false, code: 'champ_invalide' }; }
  return { ok: true, endpoint: e.url.href, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
}

/* ── L'adresse IP à laquelle un nom se résout : jamais une adresse privée, locale ou réservée (défense en profondeur derrière la liste blanche) ─────────────── */
const privee4 = (a, b, c) => a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
  || (a === 192 && b === 168) || (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 88 && c === 99);
/* Les 16 octets d'une adresse IPv6 écrite en texte (« :: » développé, IPv4 finale lue) ; null si elle est illisible — une adresse illisible est REFUSÉE. */
function octetsV6(texte) {
  let t = String(texte).toLowerCase().replace(/%.*$/, '');
  const m = /^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(t);
  if (m) {
    const p = m.slice(2).map(Number);
    if (p.some(n => n > 255)) return null;
    t = m[1] + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16);
  }
  const parts = t.split('::');
  if (parts.length > 2) return null;
  const groupes = (x) => x === '' ? [] : x.split(':');
  const tete = groupes(parts[0]), queue = parts.length === 2 ? groupes(parts[1]) : [];
  if (parts.length === 1 && tete.length !== 8) return null;
  const manque = 8 - tete.length - queue.length;
  if (manque < (parts.length === 2 ? 1 : 0)) return null;
  const g = tete.concat(Array(manque).fill('0'), queue);
  if (g.length !== 8 || !g.every(x => /^[0-9a-f]{1,4}$/.test(x))) return null;
  const o = [];
  for (const x of g) { const n = parseInt(x, 16); o.push(n >> 8, n & 255); }
  return o;
}
function adressePrivee(a) {
  const s = String(a);
  if (s.includes(':')) {
    const o = octetsV6(s);
    if (!o) return true;
    if (o.every(x => x === 0)) return true;                                                                  // « :: »
    if (o.slice(0, 15).every(x => x === 0) && o[15] === 1) return true;                                      // « ::1 »
    if (o[0] === 0xfc || o[0] === 0xfd) return true;                                                         // fc00::/7, adresses locales uniques
    if (o[0] === 0xfe && (o[1] & 0xc0) >= 0x80) return true;                                                 // fe80::/10 (lien local) et fec0::/10 (locale au site)
    if (o[0] === 0xff) return true;                                                                          // ff00::/8, multidiffusion
    if (o.slice(0, 10).every(x => x === 0) && ((o[10] === 0xff && o[11] === 0xff) || (o[10] === 0 && o[11] === 0))) return privee4(o[12], o[13], o[14]);   // IPv4 « mappée » ou « compatible » : on juge l'IPv4 qu'elle porte
    if (o[0] === 0x00 && o[1] === 0x64 && o[2] === 0xff && o[3] === 0x9b) return privee4(o[12], o[13], o[14]);   // NAT64 : l'IPv4 qu'il porte
    if (o[0] === 0x20 && o[1] === 0x02) return privee4(o[2], o[3], o[4]);                                    // 6to4 : l'IPv4 qu'il porte
    if (o[0] === 0x20 && o[1] === 0x01 && ((o[2] === 0 && o[3] === 0) || (o[2] === 0x0d && o[3] === 0xb8))) return true;   // Teredo (l'IPv4 est masquée) et documentation
    return false;
  }
  const p = s.split('.');
  if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || Number(x) > 255)) return true;               // illisible : refusée
  return privee4(Number(p[0]), Number(p[1]), Number(p[2]));
}
/* Le `lookup` du transport : résout, puis refuse si UNE des adresses est privée (un nom admis ne doit jamais mener chez nous). */
function lookupSur(hostname, options, cb) {
  dns.lookup(hostname, options, (err, adresse, famille) => {
    if (err) return cb(err);
    const liste = Array.isArray(adresse) ? adresse.map(x => x.address) : [adresse];
    if (liste.some(adressePrivee)) return cb(Object.assign(new Error('adresse_privee'), { code: 'ADRESSE_PRIVEE' }));
    cb(null, adresse, famille);
  });
}

/* ── Le transport : UN POST, sans redirection, avec un délai, qui ne lit que quelques octets de la réponse ──────────────────────────────────────────────── */
function transportHttp({ url, method, headers, body, timeoutMs, lookup }) {
  return new Promise((resolve) => {
    let fini = false;
    const fin = (r) => { if (fini) return; fini = true; clearTimeout(delai); resolve(r); };
    const mod = url.protocol === 'https:' ? https : http;
    const options = { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: method || 'POST', headers: Object.assign({}, headers), agent: false };
    if (url.protocol === 'https:') options.lookup = lookup || lookupSur;   // la porte des bancs (http, 127.0.0.1) n'a pas de nom à résoudre
    let req;
    const delai = setTimeout(() => { fin({ statut: 0, erreur: 'delai' }); try { req && req.destroy(); } catch (e) { /* déjà fermé */ } }, timeoutMs);
    try {
      req = mod.request(options, (res) => {
        let lus = 0;
        res.on('data', (d) => { lus += d.length; if (lus > 4096) { try { res.destroy(); } catch (e) { /* déjà fermé */ } } });   // la réponse d'un service push est vide ou minuscule
        res.on('end', () => fin({ statut: res.statusCode }));
        res.on('close', () => fin({ statut: res.statusCode }));
        res.on('error', () => fin({ statut: res.statusCode }));
      });
      req.on('error', (e) => fin({ statut: 0, erreur: e && e.code === 'ADRESSE_PRIVEE' ? 'adresse_privee' : 'reseau' }));
      if (body) req.write(body);
      req.end();
    } catch (e) { fin({ statut: 0, erreur: 'reseau' }); }
  });
}

const extrait = (t, n) => { const a = Array.from(String(t || '').replace(/\s+/g, ' ').trim()); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); };
const URGENCES = ['very-low', 'low', 'normal', 'high'];
const H = 3600000;

/* ── Le module ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function creerPush({ stockage, hub, config, horloge = Date.now, journaliser = () => {}, transport, planifier, annuler, appareilAbsMs = APPAREIL_ABS_MS }) {
  const pc = config.push;
  const envoyerHttp = transport || ((r) => transportHttp(Object.assign({ timeoutMs: pc.timeoutMs }, r)));
  const plan = planifier || ((f, ms) => { const t = setTimeout(f, ms); if (t.unref) t.unref(); return t; });
  const annule = annuler || ((t) => clearTimeout(t));

  /* La paire VAPID : celle de la base si elle y est (c'est elle qui lie les abonnements existants), sinon celle de l'installation (adoptée), sinon une neuve. */
  let vapid = null, origineVapid = null, actif = false;
  try {
    let paire = stockage.pushVapidLire();
    origineVapid = 'base';
    if (!paire) {
      if (pc.vapid) { paire = stockage.pushVapidPoser(pc.vapid); origineVapid = 'installation'; }
      else { const k = webpush.generateVAPIDKeys(); paire = stockage.pushVapidPoser({ publique: k.publicKey, privee: k.privateKey }); origineVapid = 'neuve'; }
    }
    vapid = paire; actif = true;
    journaliser('push_vapid', { etat: origineVapid });
  } catch (e) { journaliser('push_inactif', { motif: e && (e.code || e.name) }); }

  /* Le sujet VAPID : le contact de la configuration, à défaut l'origine https du service (une adresse que les services push peuvent joindre) — jamais un domaine en dur. */
  const sujet = (() => {
    if (pc.contact) return pc.contact;
    const o = (config.origines || []).find(x => /^https:/.test(x));
    return o || 'mailto:opmsg@opmsg.invalid';   // (bancs et développement seulement : en production l'installation écrit l'origine https)
  })();

  /* ── les compteurs de /health : des nombres, par heure, sur 24 h ── */
  const seaux = new Map();
  function compter(cle, n = 1) {
    const h = Math.floor(horloge() / H);
    const s = seaux.get(h) || { envoyes: 0, echecs: 0, abandons: 0, retires: 0 };
    s[cle] += n; seaux.set(h, s);
    for (const k of seaux.keys()) if (k < h - 24) seaux.delete(k);
  }
  const somme = (cle) => { const h = Math.floor(horloge() / H); let t = 0; for (const [k, s] of seaux) if (k > h - 24) t += s[cle]; return t; };

  /* ── la file d'envoi : `simultanes` à la fois, `fileMax` en attente (au-delà, on abandonne — et on le compte —, la mémoire d'un processus partagé ne se remplit pas) ── */
  const file = [];
  let enCours = 0;
  function pomper() {
    while (enCours < pc.simultanes && file.length) {
      const t = file.shift();
      enCours++;
      Promise.resolve().then(t.fn).then(t.ok, t.ko).finally(() => { enCours--; pomper(); });
    }
  }
  function soumettre(fn) {
    return new Promise((ok) => {
      if (file.length >= pc.fileMax) { compter('abandons'); ok({ statut: 0, erreur: 'file_pleine' }); return; }
      file.push({ fn, ok, ko: () => ok({ statut: 0, erreur: 'interne' }) });
      pomper();
    });
  }

  /* Envoie UNE charge à UN abonnement. → { ok, retire } */
  async function envoyerUn(abo, payload, o) {
    /* ⛔ la liste blanche est RE-VÉRIFIÉE ici, pas seulement à l'inscription : une ligne ancienne, ou une liste resserrée depuis, ne doit pas faire appeler une adresse refusée */
    const a = analyserEndpoint(abo.endpoint, pc.testHote);
    if (!a.ok) { stockage.pushRetirerId(abo.id); compter('retires'); return { ok: false, retire: true }; }
    let d;
    try {
      d = webpush.generateRequestDetails({ endpoint: a.url.href, keys: { p256dh: abo.p256dh, auth: abo.auth } }, payload,
        { vapidDetails: { subject: sujet, publicKey: vapid.publique, privateKey: vapid.privee }, TTL: o.ttl, urgency: o.urgence, contentEncoding: 'aes128gcm' });
    } catch (e) { compter('echecs'); return { ok: false, retire: stockage.pushEchec(abo.id, pc.echecsMax).retire }; }
    let r;
    try { r = await envoyerHttp({ url: a.url, method: d.method, headers: d.headers, body: d.body }); } catch (e) { r = { statut: 0, erreur: 'interne' }; }   // un transport qui lève est un échec de plus, pas une exception qui sort
    if (r && r.statut >= 200 && r.statut < 300) { stockage.pushOk(abo.id); compter('envoyes'); return { ok: true, retire: false }; }
    /* 404 et 410 : le service push dit que l'appareil n'existe plus — l'abonnement part tout de suite */
    /* (ce n'est pas un ÉCHEC pour la surveillance : un appareil qui disparaît est le fonctionnement normal — on le compte à part) */
    if (r.statut === 404 || r.statut === 410) { stockage.pushRetirerId(abo.id); compter('retires'); return { ok: false, retire: true }; }
    compter('echecs');
    return { ok: false, retire: stockage.pushEchec(abo.id, pc.echecsMax).retire };
  }

  /* Compose le texte qui part, d'après le réglage de CELUI QUI REÇOIT (lu à l'instant de partir) : minimal, ou avec l'aperçu s'il l'a activé. */
  function textesPour(moi, charge) {
    const apercu = !!(moi && moi.prefs && moi.prefs.apercu_notif === true) && charge.detail;
    const t = apercu ? charge.detail : charge;
    return { titre: extrait(t.titre, 80) || 'OP MESSAGES', corps: extrait(t.corps, 200) };
  }

  /* Envoie maintenant à TOUS les appareils de la personne. → { envoyes, appareils } */
  async function partir(uid, charge) {
    if (!actif) return { envoyes: 0, appareils: 0, raison: 'inactif' };
    if (typeof charge.valide === 'function') { let v = false; try { v = !!charge.valide(); } catch (e) { v = false; } if (!v) return { envoyes: 0, appareils: 0, raison: 'plus_valable' }; }
    const moi = stockage.personneParId(uid);
    if (!moi || moi.etat !== 'actif') return { envoyes: 0, appareils: 0, raison: 'compte' };
    /* ⛔ une personne que plus rien ne connecte (ni session vivante, ni jeton d'appareil valable) ne reçoit RIEN : un abonnement survit à la session qui l'a posé */
    if (!stockage.pushJoignable(uid, appareilAbsMs)) return { envoyes: 0, appareils: 0, raison: 'non_joignable' };
    const abos = stockage.pushListe(uid);
    if (!abos.length) return { envoyes: 0, appareils: 0, raison: 'aucun_appareil' };
    const t = textesPour(moi, charge);
    const payload = JSON.stringify({ type: charge.type, titre: t.titre, corps: t.corps, tag: charge.tag || charge.type, url: charge.url || '/', renotify: charge.renotify === true });
    const o = { ttl: Number.isInteger(charge.ttl) && charge.ttl >= 0 ? Math.min(charge.ttl, pc.ttlS) : pc.ttlS, urgence: URGENCES.includes(charge.urgence) ? charge.urgence : 'normal' };
    const r = await Promise.all(abos.map(a => soumettre(() => envoyerUn(a, payload, o)).then(x => (x && typeof x.ok === 'boolean') ? x : { ok: false, retire: false })));
    return { envoyes: r.filter(x => x.ok).length, appareils: abos.length };
  }

  /* ── l'acquittement ── */
  const acquittes = new Map();   // uid → plus grand identifiant d'événement que la page de cette personne a REÇU ET MONTRÉ
  function acquitter(uid, gid) {
    if (!Number.isInteger(gid) || gid < 0) return false;
    const e = acquittes.get(uid);
    acquittes.set(uid, { gid: e ? Math.max(e.gid, gid) : gid, t: horloge() });
    if (acquittes.size > 20000) for (const [k, v] of acquittes) { if (v.t < horloge() - H) acquittes.delete(k); if (acquittes.size <= 15000) break; }
    if (acquittes.size > 50000) acquittes.clear();
    return true;
  }
  const acquitte = (uid, gid) => { const e = acquittes.get(uid); return !!e && e.gid >= gid; };

  /* Les notifications qui ATTENDENT l'acquittement : une par (personne, étiquette) — plusieurs événements d'une conversation pendant l'attente n'en font qu'une, la dernière. */
  const attentes = new Map();

  /* ⛔ L'ENVOI D'UNE NOTIFICATION. `opts.gid` : l'identifiant de l'événement (journal) que la page acquittera. Ne rejette JAMAIS (un rejet non rattrapé ferait tomber le processus). */
  function pousser(uid, charge, opts) {
    const o = opts || {};
    try {
      if (!actif) return Promise.resolve({ envoyes: 0, raison: 'inactif' });
      if (!charge || typeof charge !== 'object') return Promise.resolve({ envoyes: 0, raison: 'charge' });
      if (stockage.pushCompterDe(uid) === 0) return Promise.resolve({ envoyes: 0, raison: 'aucun_appareil' });
      const ouverts = hub && typeof hub.fluxOuverts === 'function' ? hub.fluxOuverts(uid) : 0;
      if (charge.immediat === true || ouverts === 0) return partir(uid, charge).catch(() => ({ envoyes: 0, raison: 'erreur' }));
      /* au moins un flux est ouvert : on attend qu'une page acquitte */
      const gid = Number.isInteger(o.gid) ? o.gid : Infinity;   // sans identifiant, rien ne pourra l'acquitter : elle partira après le délai
      const cle = uid + '|' + (charge.tag || charge.type || '');
      const deja = attentes.get(cle);
      if (deja) { deja.gid = Math.max(deja.gid, gid); deja.charge = charge; return deja.promesse; }
      const a = { gid, charge };
      a.promesse = new Promise((ok) => {
        a.minuteur = plan(() => {
          attentes.delete(cle);
          if (acquitte(uid, a.gid)) { ok({ envoyes: 0, raison: 'acquittee' }); return; }
          partir(uid, a.charge).then(ok, () => ok({ envoyes: 0, raison: 'erreur' }));
        }, pc.ackMs);
      });
      attentes.set(cle, a);
      return a.promesse;
    } catch (e) { return Promise.resolve({ envoyes: 0, raison: 'erreur' }); }
  }

  /* ── ce que les routes et les événements appellent ── */
  function abonner(uid, sub) {
    if (!actif) return { ok: false, code: 'push_indisponible' };
    const v = validerAbonnement(sub, pc.testHote);
    if (!v.ok) return v;
    const r = stockage.pushPoser({ uid, endpoint: v.endpoint, p256dh: v.p256dh, auth: v.auth });
    return { ok: true, neuf: r.neuf, transfere: r.transfere, appareils: stockage.pushCompterDe(uid) };
  }
  function desabonner(uid, endpoint) { return stockage.pushRetirer(uid, canoniser(endpoint)); }

  /* La notification d'essai : à TOUS les appareils de la personne, tout de suite (elle veut voir ce qui se passe), sans attendre d'acquittement. */
  function essai(uid) {
    return partir(uid, { type: 'essai', tag: 'essai', titre: 'OP MESSAGES', corps: 'Les notifications fonctionnent sur cet appareil.', url: '/', ttl: 120 }).catch(() => ({ envoyes: 0, appareils: 0 }));
  }

  /* Un message neuf : à ceux de la conversation qui ont un appareil abonné, ne l'ont pas coupée, et ne sont pas son auteur. */
  function message({ conv, seq, gid, auteur, nomAuteur, nomConv, groupe, type, texte }) {
    let dest = [];
    try { dest = stockage.pushDestinatairesMessage({ conv, seq, auteur }); } catch (e) { return []; }
    const resume = type === 'photo' ? 'Photo' : type === 'vocal' ? 'Message vocal' : type === 'fichier' ? 'Fichier' : extrait(texte, 100);
    const de = extrait(nomAuteur, 60) || 'Quelqu\'un';
    return dest.map(uid => pousser(uid, {
      type: 'message', tag: conv, url: '/#messages/' + conv, renotify: true, titre: 'OP MESSAGES', corps: 'Nouveau message',
      detail: { titre: groupe ? de + ' · ' + extrait(nomConv, 40) : de, corps: resume },
      valide: () => stockage.pushMessageEncore({ uid, conv, seq }),
    }, { gid }));
  }

  return {
    pousser, acquitter, abonner, desabonner, essai, message,
    cle: () => vapid ? vapid.publique : null,
    actif: () => actif,
    origineVapid: () => origineVapid,
    sujet: () => sujet,
    enAttente: () => attentes.size,
    arreter() { for (const a of attentes.values()) annule(a.minuteur); attentes.clear(); },
    /* /health : des NOMBRES (+ un état) — jamais un point d'accès, une clé, une personne */
    sante: () => ({ actif, abonnements: actif ? stockage.pushCompter() : 0, envoyes24h: somme('envoyes'), echecs24h: somme('echecs') + somme('abandons') }),
  };
}

module.exports = { creerPush, hoteAutorise, analyserEndpoint, validerAbonnement, adressePrivee, transportHttp, canoniser, HOTES_EXACTS, HOTES_SUFFIXES };
