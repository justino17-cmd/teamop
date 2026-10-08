/* ══ LE SERVICE WORKER D'OP MESSAGES — LES NOTIFICATIONS, ET RIEN D'AUTRE ═══════════════════════════════════════════════════════
 *
 * Il existe pour une seule raison : recevoir un push quand la page est fermée, et ouvrir la bonne conversation au toucher de la notification.
 * Portée : `/` (celle de l'origine du service, jamais celle d'OP GESTION — le `sw.js` de la racine du dépôt n'est pas celui-ci).
 *
 * ⛔ AUCUN GESTIONNAIRE `fetch`, AUCUN CACHE. Ce service worker ne s'interpose entre la page et le réseau pour RIEN : il ne peut donc jamais servir une page ou un
 * script périmés (le défaut classique d'un service worker, et celui qu'on corrige en y ajoutant un numéro de version qu'on oublie). La page se recharge du service à
 * chaque ouverture, comme avant. `tests/test-941.js` (le générateur) REFUSE ce fichier s'il écoute `fetch`, touche à `caches`, ou charge un script d'ailleurs.
 * ⛔ TOUTE NOTIFICATION REÇUE EST AFFICHÉE. Safari (iPhone, page ajoutée à l'écran d'accueil) exige qu'un push montre une notification : un push silencieux fait retirer
 * l'abonnement. Une charge illisible ou absente (un essai lancé depuis les outils du navigateur, un champ de la charge qui manque) montre donc « Nouveau message ».
 * ⛔ LA CHARGE N'EST PAS CRUE SUR PAROLE : elle arrive chiffrée de bout en bout depuis le service, mais ce fichier borne tout de même chaque champ, et n'ouvre
 * qu'une adresse de CETTE origine (`adresseSure`) — jamais une adresse d'ailleurs.
 */
'use strict';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

/* Une adresse à ouvrir : relative à l'origine du service, ou « / ». Le service n'envoie que `/`, `/#messages/<conversation>`, `/#reunions/<réunion>` et `/#reunions/<événement>` (un rappel de
   l'agenda) — c'est la page qui reconnaît ces formes, et elle seule. */
function adresseSure(brut) {
  try {
    const u = new URL(typeof brut === 'string' ? brut : '/', self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search + u.hash : '/';
  } catch (e) { return '/'; }
}
const texte = (v, defaut, max) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : defaut);

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  if (!d || typeof d !== 'object') d = {};
  const titre = texte(d.titre, 'OP MESSAGES', 120);
  const options = {
    body: texte(d.corps, 'Nouveau message', 300),
    tag: texte(d.tag, 'opmsg', 80),               // un tag par conversation : deux messages de la même conversation n'empilent pas deux notifications
    icon: '/opmsg-192.png',
    lang: 'fr',
    renotify: d.renotify === true,                // (renotify exige un tag : il y en a toujours un)
    data: { url: adresseSure(d.url), type: texte(d.type, '', 20) },
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

/* Toucher la notification : une fenêtre du service déjà ouverte passe au premier plan et ouvre la conversation (la page écoute `message`) ; sinon on en ouvre une. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = adresseSure(event.notification.data && event.notification.data.url);
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of fenetres) {
      let meme = false;
      try { meme = new URL(c.url).origin === self.location.origin; } catch (e) { meme = false; }
      if (!meme) continue;
      try { await c.focus(); } catch (e) { /* une fenêtre qui refuse le focus reçoit quand même le message */ }
      c.postMessage({ type: 'ouvrir', url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
