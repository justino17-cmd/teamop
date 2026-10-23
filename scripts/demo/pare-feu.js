/* ══ LE PARE-FEU DE LA DÉMONSTRATION — premier script de demo.html, avant TOUT le reste ═══════════════════════════════════════
   La démonstration publique (demo.html, fabriquée par demo-build.js depuis app.html) n'envoie RIEN : ni courriel, ni synchro, ni
   devis par l'IA, ni rapport d'erreur, ni adresse tapée dans une recherche. Trois couches, parce qu'une seule se contourne :
   · le NAVIGATEUR — une politique de contenu posée par demo-build.js (`connect-src data: blob:`, `img-src 'self' data: blob:`,
     `form-action 'none'`…) : même un appel que ce fichier oublierait ne sort pas ;
   · ce fichier — `fetch`, XMLHttpRequest, sendBeacon, WebSocket, EventSource, Notification, service worker et `window.open`
     sont remplacés par des bouchons qui REFUSENT (et le disent : « Dans la démonstration, rien n'est envoyé. ») ;
   · le STOCKAGE — la page ne voit que les clés `elanD_…` : l'origine teamop.fr est partagée avec l'application des clients, la
     bêta et la Tour, et une clé `elan_sync_team` lue ici rattacherait la démonstration à une vraie entreprise.
   ⛔ Écrit sans la moindre dépendance à l'application (elle n'est pas encore chargée) : tout passe par `W`, la fenêtre — c'est ce
   qui permet à tests/test-2940.js de l'EXÉCUTER dans une fenêtre simulée et de prouver chaque refus.                              */
(function (W) {
  'use strict';
  var MSG = "Dans la démonstration, rien n'est envoyé.";
  var MSG_LIEN = "Dans la démonstration, les liens vers l'extérieur sont désactivés.";
  var N = W.navigator || {};
  var refus = [];
  W.__demoPublique = { msg: MSG, refus: refus, version: 1 };

  function note(genre, cible) {
    try { refus.push({ genre: genre, cible: String(cible == null ? '' : cible).slice(0, 200), t: Date.now() }); if (refus.length > 300) refus.shift(); } catch (e) { /* le journal ne doit jamais gêner */ }
  }
  /* data: et blob: ne sortent pas de la page (une photo prise ici, un PDF fabriqué ici) */
  function local(u) { return /^(data|blob):/i.test(String(u == null ? '' : u)); }
  /* Le refus se DIT quand il suit un geste de la personne (un clic sur « Envoyer »), jamais pour un appel de fond.
     Les routes ci-dessous sont des appels de fond : leur refus est attendu et muet. */
  var MUET = /\/health|\/api\/(version|op\/|usage|bug|monitor|connexions|annuaire|espaces\/(etat|ordres|ordre-fait|connexion|comptes)|doc\/attendre|subscribe|notify|promo)/;
  var dernierDit = 0;
  function dire(cible, texte) {
    try {
      var actif = N.userActivation && N.userActivation.isActive;
      if (!actif || (cible && MUET.test(String(cible)))) return;
      /* après la minute du refus : le message de l'application (« Serveur injoignable… ») s'écrit juste derrière, le nôtre doit rester */
      setTimeout(function () {
        var t = Date.now(); if (t - dernierDit < 3000) return; dernierDit = t;
        if (typeof W.toast === 'function') W.toast('ℹ️ ' + (texte || MSG), 4000);
      }, 150);
    } catch (e) { /* idem */ }
  }
  function refuser(genre, cible) {
    note(genre, cible);
    var e = new TypeError(MSG); e.demo = true; return e;
  }

  /* ── 1. LE STOCKAGE : une vue qui ne montre que `elanD_…` / `opD_…` ─────────────────────────────────────────────────────── */
  function visible(k) { return k.indexOf('elanD_') === 0 || k.indexOf('opD_') === 0; }
  function prefixe(k) { k = String(k); return visible(k) ? k : 'elanD_x_' + k; }
  function memoire() {
    var m = {};
    return {
      get length() { return Object.keys(m).length; },
      key: function (i) { var ks = Object.keys(m); return i >= 0 && i < ks.length ? ks[i] : null; },
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
      clear: function () { m = {}; }
    };
  }
  function cles(vrai) { var a = []; for (var i = 0; i < vrai.length; i++) { var k = vrai.key(i); if (k && visible(k)) a.push(k); } return a; }
  function vueStockage(vrai) {
    var api = {
      getItem: function (k) { return vrai.getItem(prefixe(k)); },
      setItem: function (k, v) { vrai.setItem(prefixe(k), String(v)); },
      removeItem: function (k) { vrai.removeItem(prefixe(k)); },
      key: function (i) { var ks = cles(vrai); return i >= 0 && i < ks.length ? ks[i] : null; },
      clear: function () { cles(vrai).forEach(function (k) { vrai.removeItem(k); }); }
    };
    return new Proxy(api, {
      get: function (t, p) {
        if (p === 'length') return cles(vrai).length;
        if (p in t) return t[p];
        if (typeof p === 'symbol') return undefined;
        var v = vrai.getItem(prefixe(p)); return v === null ? undefined : v;
      },
      set: function (t, p, v) { vrai.setItem(prefixe(p), String(v)); return true; },
      has: function (t, p) { return (p in t) || (typeof p === 'string' && vrai.getItem(prefixe(p)) !== null); },
      deleteProperty: function (t, p) { vrai.removeItem(prefixe(p)); return true; },
      ownKeys: function () { return cles(vrai); },
      getOwnPropertyDescriptor: function (t, p) {
        if (typeof p !== 'string' || !visible(p)) return undefined;
        var v = vrai.getItem(p); return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
      }
    });
  }
  function poserStockage(nom) {
    var vrai = null;
    try { vrai = W[nom]; if (vrai) vrai.length; } catch (e) { vrai = null; }   // refusé (fenêtre privée, données bloquées) : mémoire de la séance
    var vue = vueStockage(vrai || memoire());
    try { Object.defineProperty(W, nom, { value: vue, configurable: true }); } catch (e) { try { W[nom] = vue; } catch (e2) { /* rien à faire de plus */ } }
  }
  poserStockage('localStorage');
  poserStockage('sessionStorage');
  /* la sentinelle de la Tour (sentinelle technique, rapports d'erreurs) ne démarre pas : elle lit cette clé avant tout */
  try { W.localStorage.setItem('top_monitor_off', '1'); } catch (e) { /* idem */ }

  /* ── 2. LE RÉSEAU ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
  var fetchReel = W.fetch;
  W.fetch = function (u) {
    var url = (u && typeof u === 'object' && u.url) ? u.url : u;
    if (local(url) && typeof fetchReel === 'function') return fetchReel.apply(W, arguments);
    var e = refuser('fetch', url); dire(url);
    return Promise.reject(e);
  };
  if (W.XMLHttpRequest && W.XMLHttpRequest.prototype) {
    var xo = W.XMLHttpRequest.prototype.open, xs = W.XMLHttpRequest.prototype.send;
    W.XMLHttpRequest.prototype.open = function (m, u) { this.__demoU = String(u); return xo.apply(this, arguments); };
    W.XMLHttpRequest.prototype.send = function () {
      if (local(this.__demoU)) return xs.apply(this, arguments);
      note('xhr', this.__demoU); dire(this.__demoU);
      var self = this;
      setTimeout(function () { try { self.dispatchEvent(new W.Event('error')); } catch (e) { /* idem */ } }, 0);
    };
  }
  function bloqueur(nom) { return function () { throw refuser(nom, arguments[0]); }; }
  try { Object.defineProperty(W, 'WebSocket', { value: bloqueur('WebSocket'), configurable: true, writable: true }); } catch (e) { W.WebSocket = bloqueur('WebSocket'); }
  try { Object.defineProperty(W, 'EventSource', { value: bloqueur('EventSource'), configurable: true, writable: true }); } catch (e) { W.EventSource = bloqueur('EventSource'); }
  try { Object.defineProperty(N, 'sendBeacon', { value: function (u) { note('sendBeacon', u); return false; }, configurable: true, writable: true }); } catch (e) { /* idem */ }

  /* notifications et push : refusés d'avance — l'application ne propose rien (« pushSupported() » devient faux) */
  var Notif = function Notification() { throw refuser('Notification', arguments[0]); };
  Notif.permission = 'denied';
  Notif.requestPermission = function (cb) { note('Notification.requestPermission', ''); if (typeof cb === 'function') cb('denied'); return Promise.resolve('denied'); };
  try { Object.defineProperty(W, 'Notification', { value: Notif, configurable: true, writable: true }); } catch (e) { W.Notification = Notif; }
  try { delete W.PushManager; } catch (e) { /* idem */ }
  /* le service worker : aucun (une copie en cache garderait un vieux jeu de données) */
  var sw = {
    register: function (u) { note('serviceWorker.register', u); return Promise.reject(refuser('serviceWorker', u)); },
    getRegistration: function () { return Promise.resolve(undefined); },
    getRegistrations: function () { return Promise.resolve([]); },
    addEventListener: function () {}, removeEventListener: function () {},
    ready: new Promise(function () {}), controller: null
  };
  try { Object.defineProperty(N, 'serviceWorker', { get: function () { return sw; }, configurable: true }); } catch (e) { /* idem */ }

  /* ── 2 bis. LES ÉLÉMENTS : un script, une feuille de style, une image posés par le code ne partent pas non plus ─────────────────────
     La politique de contenu les refuserait — mais la requête serait DÉJÀ partie vers le filtre du navigateur (et visible à qui surveille
     le réseau). Ici l'adresse est refusée avant, et l'élément reçoit son événement « error » : le code qui l'attendait (la carte, un
     module chargé à la demande) tombe sur son chemin d'échec, comme hors ligne. */
  function externe(u) {
    u = String(u == null ? '' : u).replace(/^\s+/, '');
    if (!/^(https?:)?\/\//i.test(u)) return false;
    try { return new W.URL(u, W.location.href).origin !== W.location.origin; } catch (e) { return true; }
  }
  function echecAsync(el) { setTimeout(function () { try { el.dispatchEvent(new W.Event('error')); } catch (e) { /* idem */ } }, 0); }
  var SURVEILLES = { script: 'src', img: 'src', iframe: 'src', embed: 'src', audio: 'src', video: 'src', source: 'src', track: 'src', link: 'href', object: 'data' };
  function garder(el, attr) {
    var p = el, d = null;
    while (p && !d) { d = Object.getOwnPropertyDescriptor(p, attr); p = Object.getPrototypeOf(p); }
    if (!d || !d.set) return;
    Object.defineProperty(el, attr, { configurable: true, enumerable: true,
      get: function () { return d.get.call(this); },
      set: function (v) { if (externe(v)) { note('élément', v); echecAsync(this); return; } d.set.call(this, v); } });
    var sa = el.setAttribute;
    el.setAttribute = function (n, v) { if (String(n).toLowerCase() === attr && externe(v)) { note('élément', v); echecAsync(this); return; } return sa.apply(this, arguments); };
  }
  if (W.document && typeof W.document.createElement === 'function') {
    var creerReel = W.document.createElement;
    W.document.createElement = function (tag) {
      var el = creerReel.apply(W.document, arguments);
      try { var attr = SURVEILLES[String(tag).toLowerCase()]; if (attr) garder(el, attr); } catch (e) { /* un élément qu'on ne sait pas garder reste gardé par la politique de contenu */ }
      return el;
    };
  }
  /* le balisage écrit en ligne (innerHTML, insertAdjacentHTML) : une image à adresse externe devient une image vide AVANT d'être lue */
  function nettoyerHtml(v) {
    if (typeof v !== 'string' || v.indexOf('//') < 0) return v;
    return v.replace(/(\s(?:src|srcset|poster)\s*=\s*["'])\s*(?:https?:)?\/\/[^"']*/gi, function (m, pre) {
      var url = m.slice(pre.length).trim(); if (!externe(url)) return m;
      note('html', url); return pre + 'data:,';
    });
  }
  if (W.Element && W.Element.prototype) {
    var di = Object.getOwnPropertyDescriptor(W.Element.prototype, 'innerHTML');
    if (di && di.set) Object.defineProperty(W.Element.prototype, 'innerHTML', { configurable: true, enumerable: di.enumerable, get: di.get, set: function (v) { return di.set.call(this, nettoyerHtml(v)); } });
    var iah = W.Element.prototype.insertAdjacentHTML;
    if (typeof iah === 'function') W.Element.prototype.insertAdjacentHTML = function (pos, v) { return iah.call(this, pos, nettoyerHtml(v)); };
  }

  /* ── 3. LES LIENS : rien ne mène hors de la page ───────────────────────────────────────────────────────────────────────── */
  function memePage(u) {
    try {
      var a = new W.URL(String(u), W.location.href);
      return a.origin === W.location.origin && a.pathname === W.location.pathname;
    } catch (e) { return false; }
  }
  var ouvrirReel = W.open;
  W.open = function (u) {
    if (u == null || u === '' || u === 'about:blank' || local(u) || memePage(u)) return ouvrirReel.apply(W, arguments);   // fenêtre d'impression, PDF fabriqué ici
    note('open', u); dire('', MSG_LIEN);
    return null;
  };
  if (W.document && W.document.addEventListener) {
    W.document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null; if (!a) return;
      var h = a.getAttribute('href') || '';
      if (h === '' || h.charAt(0) === '#' || /^javascript:/i.test(h) || local(h) || memePage(a.href)) return;
      ev.preventDefault(); ev.stopPropagation();
      note('lien', a.href); dire('', /^(mailto|sms):/i.test(h) ? MSG : MSG_LIEN);
    }, true);
  }
})(window);
