/* ══ LE SITE VITRINE — les gestes, et rien d'autre ═════════════════════════════════════════════════
   Les pages sont du HTML statique complet (générées par `scripts/site-marine.js`) : sans ce fichier, tout
   se lit et tous les liens mènent quelque part. Il ajoute les volets du menu, le menu du téléphone, la
   fenêtre d'une fonction, les questions qui s'ouvrent, le choix OP GESTION / OP MESSAGES des tarifs, la
   formule qu'on choisit au toucher, le bouton jour / nuit et la demande « Créer » — qui part par e-mail : il
   n'y a PAS de route serveur, l'écran ne dit donc jamais « demande envoyée » (c'est la messagerie de la
   personne qui l'envoie). */
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

  /* ── l'aperçu se signale, et seulement lui : le même fichier sert à la racine le jour du remplacement ── */
  if (/\/apercu\//.test(location.pathname)) {
    var r = document.createElement('div'); r.className = 'ruban-apercu'; r.textContent = 'Aperçu — pas encore en ligne';
    document.body.appendChild(r);
  }

  /* ── les volets du menu (bureau) : au survol ou au clavier, jamais au seul clic (le lien mène à sa page) ── */
  var entete = $('.entete'), voile = $('.voile'), minuterie = null;
  function volet(k) {
    clearTimeout(minuterie);
    $$('.fly').forEach(function (f) { f.classList.toggle('ouvert', f.id === 'fly-' + k); });
    $$('.nav-liens a[data-fly]').forEach(function (a) { var on = a.getAttribute('data-fly') === k; a.classList.toggle('ouvert', on); a.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    if (entete) entete.classList.toggle('fly-ouvert', !!k);
    if (voile) voile.classList.toggle('ouvert', !!k);
  }
  /* la SOURIS ouvre au survol ; un doigt touche le lien et va à la page. On regarde le pointeur de CE geste,
     pas une détection au chargement (un écran tactile avec souris, ou un navigateur qui ne dit rien). */
  $$('.nav-liens a[data-fly]').forEach(function (a) {
    a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') volet(a.getAttribute('data-fly')); });
    a.addEventListener('focus', function () { volet(a.getAttribute('data-fly')); });
  });
  if (entete) {
    entete.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') minuterie = setTimeout(function () { volet(null); }, 120); });
    entete.addEventListener('pointerenter', function () { clearTimeout(minuterie); });
    entete.addEventListener('focusout', function (e) { if (!entete.contains(e.relatedTarget)) volet(null); });
  }
  $$('.marque, .nav-droite a').forEach(function (a) { a.addEventListener('pointerenter', function () { volet(null); }); });

  /* ── le menu plein écran (téléphone) ── */
  var burger = $('.burger');
  if (burger && entete) burger.addEventListener('click', function () {
    var ouvert = !entete.classList.contains('menu-ouvert');
    entete.classList.toggle('menu-ouvert', ouvert);
    burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    document.documentElement.style.overflow = ouvert ? 'hidden' : '';
  });
  $$('.menu-mobile a').forEach(function (a) { a.addEventListener('click', function () {
    if (!entete) return; entete.classList.remove('menu-ouvert'); document.documentElement.style.overflow = '';
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }); });

  /* ── la fenêtre d'une fonction ── */
  var fen = $('.fenetre'), donnees = null, courant = null, retourFocus = null;
  /* ⚠️ l'identifiant des DONNÉES n'est pas celui de la section (#fonctions, cible des liens « Fonctions ») :
     avec deux fois le même, on lisait le texte de la section et aucune fenêtre ne s'ouvrait. */
  try { donnees = JSON.parse(($('#fonctions-donnees') || {}).textContent || 'null'); } catch (e) { donnees = null; }
  function afficher(i) {
    var L = donnees.liste, n = L.length; i = (i + n) % n; courant = i; var f = L[i];
    $('.ic', fen).innerHTML = f.ic;
    $('.app', fen).textContent = donnees.app;
    $('h2', fen).textContent = f.titre;
    $('.st', fen).textContent = f.sous;
    $('ul', fen).innerHTML = f.points.map(function (p) { return '<li>' + donnees.coche + '<span></span></li>'; }).join('');
    $$('ul li span', fen).forEach(function (s, k) { s.textContent = f.points[k]; });
    $('.prec', fen).textContent = '‹ ' + L[(i - 1 + n) % n].titre;
    $('.suiv', fen).textContent = L[(i + 1) % n].titre + ' ›';
    $('.pos', fen).textContent = (i + 1) + ' / ' + n;
  }
  function ouvrir(i, depuis) {
    if (!fen || !donnees) return;
    retourFocus = depuis || document.activeElement; afficher(i);
    fen.classList.add('ouverte'); fen.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    /* le focus entre TOUT DE SUITE dans la fenêtre (visible dès le premier instant de sa transition) :
       le poser plus tard laissait une fenêtre ouverte avec le clavier encore sur la tuile d'en dessous */
    var bf = $('.fermer', fen); if (bf) bf.focus({ preventScroll: true });
  }
  function fermer() {
    if (!fen || courant === null) return;
    fen.classList.remove('ouverte'); fen.setAttribute('aria-hidden', 'true'); courant = null;
    document.documentElement.style.overflow = '';
    if (retourFocus && retourFocus.focus) retourFocus.focus();
  }
  $$('.tuile-f[data-i]').forEach(function (b) { b.addEventListener('click', function () { ouvrir(+b.getAttribute('data-i'), b); }); });
  if (fen) {
    fen.addEventListener('click', function (e) { if (e.target === fen) fermer(); });
    $('.fermer', fen).addEventListener('click', fermer);
    $('.prec', fen).addEventListener('click', function () { afficher(courant - 1); });
    $('.suiv', fen).addEventListener('click', function () { afficher(courant + 1); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (courant !== null) fermer();
      else if (entete && entete.classList.contains('menu-ouvert') && burger) burger.click();
      else volet(null);
    }
    if (courant !== null && e.key === 'ArrowRight') afficher(courant + 1);
    if (courant !== null && e.key === 'ArrowLeft') afficher(courant - 1);
    /* la fenêtre garde le clavier chez elle */
    if (courant !== null && e.key === 'Tab') {
      var f = $$('button', fen); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ── les questions ── */
  $$('.faq .q button').forEach(function (b) {
    b.addEventListener('click', function () {
      var q = b.closest('.q'), ouverte = !q.classList.contains('ouverte');
      q.classList.toggle('ouverte', ouverte); b.setAttribute('aria-expanded', ouverte ? 'true' : 'false');
    });
  });

  /* ── tarifs : OP GESTION / OP MESSAGES, et l'ancre de la page choisit ── */
  var onglets = $$('.segment [role="tab"]');
  function choisir(cible) {
    onglets.forEach(function (o) {
      var on = o.getAttribute('aria-controls') === cible;
      o.setAttribute('aria-selected', on ? 'true' : 'false'); o.tabIndex = on ? 0 : -1;
      var p = document.getElementById(o.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
  }
  if (onglets.length) {
    onglets.forEach(function (o) { o.addEventListener('click', function () { choisir(o.getAttribute('aria-controls')); }); });
    var suivreAncre = function () {
      var h = location.hash.replace('#', '');
      if (h === 'opmessages') choisir('formules-msg'); else if (h === 'elan') choisir('formules-gestion');
    };
    suivreAncre(); window.addEventListener('hashchange', suivreAncre);
  }

  /* ── tarifs : la formule qu'on touche devient la bleue (Justin, 27 septembre au soir) ──
     Au départ, la bleue est la recommandée (écrite dans la page, donc vraie aussi sans ce fichier). Toucher
     une carte — ou y arriver au clavier — la choisit, dans SON groupe seulement : OP GESTION et OP MESSAGES
     gardent chacun la leur. Le bouton garde son rôle : « Choisir Pro » mène toujours à la page d'abonnement. */
  $$('.formules').forEach(function (g) {
    var cartes = $$('.formule', g);
    if (!cartes.length) return;
    g.classList.add('choix');
    cartes.forEach(function (c) {
      var prendre = function () { cartes.forEach(function (x) { x.classList.toggle('phare', x === c); }); };
      c.addEventListener('click', prendre);
      c.addEventListener('focusin', prendre);
    });
  });

  /* ── créer : un métier (un seul), des besoins (plusieurs), et la demande part par e-mail ── */
  var demande = $('#demande');
  if (demande) {
    $$('.metier-puce', demande).forEach(function (m) {
      m.addEventListener('click', function () {
        var on = m.getAttribute('aria-pressed') !== 'true';
        $$('.metier-puce', demande).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        m.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
    $$('.besoin', demande).forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });
    demande.addEventListener('submit', function (e) {
      e.preventDefault();
      /* Le métier part EN TÊTE et sous une forme sans ambiguïté : c'est lui qui décide du pack
         activé à la création de l'espace (même lecture que l'ancienne page). */
      var lignes = [], m = $('.metier-puce[aria-pressed="true"]', demande);
      if (m) {
        lignes.push('MÉTIER CHOISI : ' + m.getAttribute('data-nom') + '  [pack ' + m.getAttribute('data-pack') + ']');
        lignes.push('Pack : ' + (m.getAttribute('data-pret') === '1' ? 'prêt — activable dès la création' : 'à construire sur mesure'));
      } else lignes.push('MÉTIER CHOISI : aucun sélectionné');
      lignes.push('');
      $$('input, textarea', demande).forEach(function (c) {
        var v = (c.value || '').trim(); if (!v) return;
        lignes.push((c.getAttribute('data-libelle') || c.name) + ' : ' + v);
      });
      var besoins = $$('.besoin[aria-pressed="true"]', demande).map(function (b) { return b.textContent.trim(); });
      if (besoins.length) lignes.push('Besoins cochés : ' + besoins.join(', '));
      location.href = 'mailto:support@teamop.fr?subject=' + encodeURIComponent('Demande de création d\'application — TEAM OP') +
        '&body=' + encodeURIComponent(lignes.join('\n'));
      var avis = $('.avis-envoi', demande); if (avis) avis.hidden = false;
    });
  }
})();
