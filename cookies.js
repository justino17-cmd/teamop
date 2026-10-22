/*
 * TEAM OP — Bandeau cookies + Google Analytics 4 (conforme CNIL)
 * --------------------------------------------------------------
 * - Google Analytics n'est chargé QUE si le visiteur clique sur « Accepter ».
 * - « Refuser » est aussi visible que « Accepter » (exigence CNIL).
 * - Le choix est mémorisé 6 mois, puis le bandeau réapparaît.
 * - Le lien « Gestion des cookies » du pied (`<a href="#" data-cookies>`) rouvre le bandeau.
 * - Posé sur les pages du site par scripts/site-marine.js (à la racine seulement) — on corrige là-bas,
 *   jamais dans une page. confidentialite.html § 2 décrit cette mesure : les deux bougent ensemble.
 */
(function () {
  var GA_ID = 'G-BW7P0K94BZ';
  var KEY = 'teamop_consent';
  var DUREE_MS = 1000 * 60 * 60 * 24 * 182; // ~6 mois

  function lireChoix() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.date < DUREE_MS) return c.valeur;
    } catch (e) {}
    return null;
  }

  function enregistrer(valeur) {
    try { localStorage.setItem(KEY, JSON.stringify({ valeur: valeur, date: Date.now() })); } catch (e) {}
  }

  function supprimerCookiesGA() {
    var noms = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); });
    var domaines = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    noms.forEach(function (n) {
      if (n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid') {
        domaines.forEach(function (d) {
          document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  var gaCharge = false;
  function chargerGA() {
    if (gaCharge) return;
    gaCharge = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function afficherBandeau() {
    if (document.getElementById('teamop-cookies')) return;

    var style = document.createElement('style');
    style.textContent =
      '#teamop-cookies{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;max-width:720px;margin:0 auto;' +
      'background:#0d1624;color:#eef1f7;border-radius:14px;padding:18px 20px;box-shadow:0 10px 30px rgba(0,0,0,.35);' +
      'font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
      '#teamop-cookies p{margin:0 0 14px}' +
      '#teamop-cookies strong{color:#f5c842}' +
      '#teamop-cookies a{color:#eef1f7;text-decoration:underline}' +
      '#teamop-cookies .tc-btns{display:flex;gap:10px;flex-wrap:wrap}' +
      '#teamop-cookies button{flex:1 1 140px;min-height:44px;padding:12px 16px;border-radius:10px;font-weight:600;font-size:15px;line-height:1;font-family:inherit;' +
      'cursor:pointer;border:1.5px solid #eef1f7}' +
      '#teamop-cookies .tc-refuser{background:transparent;color:#eef1f7}' +
      '#teamop-cookies .tc-accepter{background:#eef1f7;color:#0d1624}' +
      '#teamop-cookies button:focus-visible{outline:2px solid #f5c842;outline-offset:2px}';
    document.head.appendChild(style);

    var b = document.createElement('div');
    b.id = 'teamop-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Gestion des cookies');
    b.innerHTML =
      '<p><strong>Cookies</strong> — Nous utilisons Google Analytics pour mesurer la fréquentation du site ' +
      'et l\'améliorer. Ces cookies ne sont déposés qu\'avec votre accord. ' +
      'Vous pouvez changer d\'avis à tout moment via « Gestion des cookies » en bas de page.</p>' +
      '<div class="tc-btns">' +
      '<button type="button" class="tc-refuser">Refuser</button>' +
      '<button type="button" class="tc-accepter">Accepter</button>' +
      '</div>';
    document.body.appendChild(b);

    b.querySelector('.tc-accepter').onclick = function () {
      enregistrer('oui'); b.remove(); chargerGA();
    };
    b.querySelector('.tc-refuser').onclick = function () {
      enregistrer('non'); b.remove(); supprimerCookiesGA();
      if (gaCharge) location.reload(); // coupe GA s'il tournait déjà
    };
  }

  // Rouvre le bandeau depuis le lien « Gestion des cookies » du pied de page
  window.teamopCookies = afficherBandeau;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-cookies]');
    if (!a) return;
    e.preventDefault();
    afficherBandeau();
  });

  function demarrer() {
    var choix = lireChoix();
    if (choix === 'oui') chargerGA();
    else if (choix === null) afficherBandeau();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
