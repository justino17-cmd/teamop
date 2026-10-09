/* ══ LES CARROUSELS D'ÉCRANS DU SITE — l'aperçu seulement (voir carrousel.css) ═════════════════════════
   Ce qu'il fait, et pourquoi chaque règle :
   · l'écran suivant se PRÉPARE (son image se charge, invisible) avant d'être montré — on ne fond jamais vers un écran
     vide ; un geste qui arrive pendant l'attente l'emporte (`jeton`) ;
   · le temps d'un écran est l'animation de la pastille active : son `animationend` fait passer au suivant. Toute pause
     se résume donc à suspendre cette animation — survol de la souris, clavier dans le carrousel, carrousel hors de
     l'écran, onglet caché — et elle reprend là où elle était ;
   · le bouton ⏸ arrête pour de bon (WCAG 2.2.2 : ce qui bouge plus de 5 s doit pouvoir s'arrêter) ; « animations
     réduites » (réglage de l'appareil) part arrêté, et les gestes restent ;
   · au doigt, glisser de côté change d'écran (les événements TACTILES : Chrome annule le flux de pointeur au premier
     mouvement horizontal — règle du dépôt) ; au clavier, ← → sur les points ;
   · la légende ne s'annonce aux lecteurs d'écran que quand la personne mène (en pause), pas toutes les 4,6 s. */
(function () {
  'use strict';
  var reduit = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var tous = [];
  var liste = function (x) { return Array.prototype.slice.call(x); };

  function brancher(c) {
    var pistes = liste(c.querySelectorAll('.c-piste'));
    var vues = pistes.map(function (p) { return liste(p.children).filter(function (e) { return e.classList.contains('c-vue'); }); });
    var n = vues.length ? vues[0].length : 0;
    if (n < 2 || vues.some(function (L) { return L.length !== n; })) return null;
    var points = liste(c.querySelectorAll('.c-point'));
    var legende = c.querySelector('.c-legende'), lecture = c.querySelector('.c-lecture');
    var commandes = c.querySelector('.c-commandes'), scene = c.querySelector('.c-scene');
    var titres = vues[0].map(function (v) { return v.getAttribute('data-titre') || ''; });
    var i = 0, jeton = 0, sortie = 0, arrets = { horsvue: true }, enPause = !!(reduit && reduit.matches);

    function etat() {
      var arrete = Object.keys(arrets).some(function (k) { return arrets[k]; });
      c.classList.toggle('c-arrete', arrete);
      c.classList.toggle('c-pause', enPause);
      if (lecture) lecture.setAttribute('aria-label', enPause ? 'Lancer le défilement' : 'Mettre en pause le défilement');
      if (legende) legende.setAttribute('aria-live', enPause ? 'polite' : 'off');
    }
    function arret(raison, oui) { if (!!arrets[raison] === !!oui) return; arrets[raison] = !!oui; etat(); }

    /* préparer un écran : affiché à opacité nulle, son image paresseuse se charge — puis on attend qu'elle soit décodée */
    function charger(v) {
      if (!v.classList.contains('c-on') && !v.classList.contains('c-sort')) v.classList.add('c-prete');
      var img = v.querySelector('img');
      if (!img) return Promise.resolve();
      return new Promise(function (fin) {
        var fait = false, finir = function () { if (fait) return; fait = true; img.removeEventListener('load', charge); img.removeEventListener('error', finir); fin(); };
        var charge = function () { if (img.decode) img.decode().then(finir, finir); else finir(); };
        if (img.complete && img.naturalWidth > 0) charge();
        else { img.addEventListener('load', charge); img.addEventListener('error', finir); }
        setTimeout(finir, 2500);
      });
    }
    var prets = function (j) { return Promise.all(vues.map(function (L) { return charger(L[j]); })); };

    /* sens : en avant par défaut (le carrousel qui tourne seul passe du dernier au premier EN AVANÇANT) ; un geste vers un
       écran d'avant, ou le doigt qui glisse vers la droite, revient en arrière */
    function montrer(j, sens) {
      var vers = sens || (j < i ? -1 : 1);
      j = ((j % n) + n) % n;
      if (j === i) return;
      i = j;
      var moi = ++jeton;
      prets(j).then(function () {
        if (moi !== jeton) return;
        c.classList.add('c-anime');
        c.classList.toggle('c-avant', vers > 0); c.classList.toggle('c-arriere', vers < 0);
        vues.forEach(function (L) {
          L.forEach(function (v) { if (v.classList.contains('c-sort')) { v.classList.remove('c-sort'); v.classList.add('c-prete'); } });
          L.forEach(function (v, k) {
            if (k === j) { v.classList.remove('c-prete'); v.classList.add('c-on'); v.removeAttribute('aria-hidden'); }
            else if (v.classList.contains('c-on')) { v.classList.remove('c-on'); v.classList.add('c-sort'); v.setAttribute('aria-hidden', 'true'); }
          });
        });
        /* l'écran sorti se range quand sa glissade est finie : 0,9 s (la glissade dure 0,62 s), plus le retard que la feuille donne
           à cette glissade — celui d'une case dans sa vague (carrousel.css) ; rangé plus tôt, il disparaîtrait en pleine glissade */
        var retard = 0;
        try { retard = (parseFloat(getComputedStyle(vues[0][j]).animationDelay) || 0) * 1000; } catch (x) {}
        clearTimeout(sortie);
        sortie = setTimeout(function () {
          vues.forEach(function (L) { L.forEach(function (v) { if (v.classList.contains('c-sort')) { v.classList.remove('c-sort'); v.classList.add('c-prete'); } }); });
        }, 900 + retard);
        points.forEach(function (p, k) { if (k === j) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
        if (legende) legende.textContent = titres[j];
        prets((j + 1) % n);
      });
    }

    /* l'horloge : la pastille active a fini de se remplir → l'écran suivant */
    c.addEventListener('animationend', function (e) {
      if (e.animationName !== 'c-progres' || enPause) return;
      if (points[i] && e.target === points[i].querySelector('i')) montrer(i + 1, 1);
    });
    points.forEach(function (p, k) { p.addEventListener('click', function () { montrer(k); }); });
    if (lecture) lecture.addEventListener('click', function () { enPause = !enPause; etat(); });
    c.addEventListener('keydown', function (e) {
      if (!e.target.closest || !e.target.closest('.c-points')) return;
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); montrer(i + d, d); if (points[i]) points[i].focus();
    });
    /* la souris sur le carrousel : il attend (on regarde un écran, il ne part pas sous les yeux) */
    c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') arret('survol', true); });
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') arret('survol', false); });
    /* le clavier dans le carrousel : il attend aussi (et seulement le clavier : un clic de souris ne l'arrête pas) */
    /* (un Safari d'avant la 15.4 ne connaît pas :focus-visible et JETTE : on le prend alors pour du clavier — il attend) */
    var auClavier = function (t) { try { return !!(t && t.matches && t.matches(':focus-visible')); } catch (x) { return true; } };
    c.addEventListener('focusin', function (e) { arret('clavier', auClavier(e.target)); });
    c.addEventListener('focusout', function (e) { if (!c.contains(e.relatedTarget)) arret('clavier', false); });
    /* au doigt : glisser de côté — pas dans une case (elle n'a pas de commandes : c'est un bouton, toucher l'ouvre) */
    var x0 = null, y0 = 0;
    if (scene && commandes) {
      scene.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, { passive: true });
      scene.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) montrer(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }, { passive: true });
      scene.addEventListener('touchcancel', function () { x0 = null; }, { passive: true });
    }

    var vu = false;
    function visible(oui) {
      arret('horsvue', !oui);
      /* la première fois qu'on le voit, l'écran suivant se prépare — après le premier, qui passe d'abord */
      if (oui && !vu) { vu = true; setTimeout(function () { prets((i + 1) % n); }, 700); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (en) { visible(en.isIntersecting && en.intersectionRatio >= 0.35); }); }, { threshold: [0, 0.35, 0.6] }).observe(c);
    } else visible(true);

    if (commandes) commandes.hidden = false;
    c.classList.add('c-pret');
    etat();
    return { el: c, arret: arret, pause: function (oui) { enPause = !!oui; etat(); } };
  }

  liste(document.querySelectorAll('[data-carrousel]')).forEach(function (c) { var x = brancher(c); if (x) tous.push(x); });
  document.addEventListener('visibilitychange', function () { tous.forEach(function (x) { x.arret('cache', document.hidden); }); });

  /* le ⏸ des cases (`data-c-groupe`) : il arrête et relance toutes celles de sa section — une case est un bouton, elle ne peut pas
     porter le sien */
  var groupes = liste(document.querySelectorAll('[data-c-groupe]')).map(function (b) {
    var zone = b.closest('section') || document.body;
    var membres = tous.filter(function (x) { return zone.contains(x.el); });
    if (!membres.length) return null;
    var arrete = !!(reduit && reduit.matches);
    var maj = function () {
      b.classList.toggle('c-pause', arrete);
      b.setAttribute('aria-label', arrete ? 'Lancer le défilement des cases' : 'Mettre en pause le défilement des cases');
    };
    b.addEventListener('click', function () { arrete = !arrete; membres.forEach(function (x) { x.pause(arrete); }); maj(); });
    if (b.parentNode && b.parentNode.classList.contains('c-groupe')) b.parentNode.hidden = false;
    maj();
    return { arreter: function () { arrete = true; maj(); } };
  }).filter(Boolean);

  if (reduit) {
    var suivre = function () { if (reduit.matches) { tous.forEach(function (x) { x.pause(true); }); groupes.forEach(function (g) { g.arreter(); }); } };
    if (reduit.addEventListener) reduit.addEventListener('change', suivre); else if (reduit.addListener) reduit.addListener(suivre);
  }
})();
