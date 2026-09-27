/* ══ LE JOUR ET LA NUIT — un seul script, pour le site ET les pages hors du site ═══════════════════════════════
   Le site (8 pages générées par scripts/site-marine.js) et les pages vers lesquelles il envoie (espace.html,
   connexion.html, reinit.html, recap-abonnement.html, mentions-legales.html, confidentialite.html) partagent ce
   fichier : le choix ☀︎/☾ fait sur l'une se retrouve sur l'autre (même clé `teamop_site_mode`). Justin, 27 septembre
   2026 au soir : « au niveau des connexions ou création de compte, j'ai pas mon thème ». Il vivait dans site.js, que
   ces pages ne chargent pas (il porte les menus, les fenêtres et le ruban d'aperçu du site) : on l'en a sorti, tel quel.
   Le mode choisi est posé AVANT le premier rendu par un script de l'en-tête (le même texte partout, test-836) ; ce
   fichier-ci branche le bouton et fait suivre ce qui ne suit pas la feuille. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── jour / nuit (Justin, 27 septembre au soir : « je veux vraiment un mode jour et un mode nuit ») ──
     Sans choix, la page suit l'appareil — c'est la feuille qui le fait. Le bouton FORCE l'autre mode et le
     garde sur l'appareil ; revenir au mode de l'appareil efface le choix, et la page le suit de nouveau.
     ⛔ Les écrans d'OP GESTION sont des <picture> dont la source de nuit porte `media="(prefers-color-scheme:
     dark)"` : cette requête suit l'APPAREIL, pas le bouton. On réécrit donc leur `media` (et celui des deux
     `theme-color`), sinon on aurait une page de nuit avec des écrans de jour. */
  var CLE_MODE = 'teamop_site_mode', racine = document.documentElement;
  var sysNuit = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var modeBtn = $('.mode');
  function forceLu() { var t = racine.getAttribute('data-theme'); return t === 'dark' || t === 'light' ? t : ''; }
  function nuitMaintenant() { var f = forceLu(); return f ? f === 'dark' : !!(sysNuit && sysNuit.matches); }
  function appliquerMode() {
    var f = forceLu(), nuit = nuitMaintenant();
    $$('source[data-nuit]').forEach(function (s) { s.media = f ? (f === 'dark' ? 'all' : 'not all') : '(prefers-color-scheme: dark)'; });
    $$('meta[name="theme-color"]').forEach(function (m) {
      var pourNuit = m.hasAttribute('data-nuit');
      m.media = f ? ((f === 'dark') === pourNuit ? 'all' : 'not all') : (pourNuit ? '(prefers-color-scheme: dark)' : '(prefers-color-scheme: light)');
    });
    if (modeBtn) {
      var dit = nuit ? 'Passer en mode jour' : 'Passer en mode nuit';
      modeBtn.classList.toggle('nuit', nuit); modeBtn.setAttribute('aria-label', dit); modeBtn.title = dit;
    }
  }
  function choisirMode() {
    var voulu = nuitMaintenant() ? 'light' : 'dark', sys = sysNuit && sysNuit.matches ? 'dark' : 'light';
    if (voulu === sys) racine.removeAttribute('data-theme'); else racine.setAttribute('data-theme', voulu);
    try { if (voulu === sys) localStorage.removeItem(CLE_MODE); else localStorage.setItem(CLE_MODE, voulu === 'dark' ? 'nuit' : 'jour'); } catch (e) {}
    appliquerMode();
  }
  if (modeBtn) {
    modeBtn.hidden = false;
    modeBtn.addEventListener('click', function () {
      /* un fondu d'une page à l'autre là où le navigateur sait le faire — et jamais quand on a demandé moins de mouvement */
      var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (document.startViewTransition && !calme) document.startViewTransition(choisirMode); else choisirMode();
    });
  }
  if (sysNuit) { var suivre = function () { appliquerMode(); }; if (sysNuit.addEventListener) sysNuit.addEventListener('change', suivre); else if (sysNuit.addListener) sysNuit.addListener(suivre); }
  appliquerMode();
})();
