/*
 * TEAM OP — mesure d'audience SANS cookie (25 octobre 2026)
 * ---------------------------------------------------------
 * Une page vue = un petit message au serveur (`server/audience.js`) : la page, le site d'où l'on vient (le serveur n'en garde que le
 * nom de domaine), les paramètres de campagne (`utm_*`, et `de` pour les courriels des agents) et la largeur de l'écran.
 * Rien n'est rangé dans le navigateur (ni cookie, ni stockage), aucun identifiant n'est créé : c'est ce qui la dispense du
 * consentement (CNIL). Google Analytics, lui, reste derrière le bandeau (`/cookies.js`). `confidentialite.html` § 2 décrit les deux.
 * Posé par scripts/site-marine.js et scripts/blog.js, à la racine seulement : l'aperçu, la bêta et le poste de travail ne se mesurent pas.
 */
(function () {
  try {
    if (!/^(www\.)?teamop\.fr$/.test(location.hostname)) return;
    if (navigator.webdriver) return;   // navigateurs pilotés (sondes, robots) : ce ne sont pas des visiteurs
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;   // « ne me suivez pas » : on ne compte pas
    var q = new URLSearchParams(location.search);
    var corps = JSON.stringify({
      p: location.pathname,
      r: document.referrer || '',
      us: q.get('utm_source') || '', um: q.get('utm_medium') || '', uc: q.get('utm_campaign') || '',
      de: q.get('de') || '',
      l: window.innerWidth || 0
    });
    var url = 'https://api.teamop.fr/api/audience/vue';
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([corps], { type: 'text/plain' }))) return;
    fetch(url, { method: 'POST', body: corps, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () {});
  } catch (e) {}
})();
