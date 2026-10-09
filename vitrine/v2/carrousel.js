/* ══ LES CARROUSELS D'ÉCRANS DU SITE — l'aperçu seulement (voir carrousel.css) ═════════════════════════
   Chaque carrousel (et chaque case) montre une paire : le Mac, puis le téléphone, qui se remplacent en glissant — « et c'est tout,
   et ça ne fait que ça » (Justin, 9 octobre 2026). Ce qu'il fait, et pourquoi chaque règle :
   · l'écran suivant se PRÉPARE (son image se charge, invisible) avant d'être montré — on ne glisse jamais vers un écran vide ; un
     geste qui arrive pendant l'attente l'emporte (`jeton`) ;
   · le temps d'un écran est l'animation d'une pastille INVISIBLE (`c-horloge`) : sa fin fait passer au suivant. Toute pause se
     résume donc à suspendre cette animation — souris posée dessus, carrousel hors de l'écran, onglet caché — et elle reprend là
     où elle était ;
   · « animations réduites » (réglage de l'appareil) : rien ne défile tout seul, le Mac reste ; au doigt, on peut encore glisser ;
   · au doigt, glisser de côté change d'appareil (les événements TACTILES : Chrome annule le flux de pointeur au premier mouvement
     horizontal — règle du dépôt) — pas dans une case : c'est un bouton, toucher l'ouvre. */
(function () {
  'use strict';
  var reduit = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var tous = [];
  var liste = function (x) { return Array.prototype.slice.call(x); };

  function brancher(c) {
    var vues = liste(c.querySelectorAll('.c-vue'));
    var n = vues.length;
    var points = liste(c.querySelectorAll('.c-point'));
    if (n < 2 || points.length !== n) return null;
    var scene = c.querySelector('.c-scene');
    var i = 0, jeton = 0, sortie = 0, arrets = { horsvue: true }, enPause = !!(reduit && reduit.matches);

    function etat() {
      c.classList.toggle('c-arrete', Object.keys(arrets).some(function (k) { return arrets[k]; }));
      c.classList.toggle('c-pause', enPause);
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

    /* sens : en avant par défaut (le carrousel qui tourne seul repasse du téléphone au Mac EN AVANÇANT) ; le doigt qui glisse vers
       la droite revient en arrière */
    function montrer(j, sens) {
      var vers = sens || (j < i ? -1 : 1);
      j = ((j % n) + n) % n;
      if (j === i) return;
      i = j;
      var moi = ++jeton;
      charger(vues[j]).then(function () {
        if (moi !== jeton) return;
        c.classList.add('c-anime');
        c.classList.toggle('c-avant', vers > 0); c.classList.toggle('c-arriere', vers < 0);
        vues.forEach(function (v) { if (v.classList.contains('c-sort')) { v.classList.remove('c-sort'); v.classList.add('c-prete'); } });
        vues.forEach(function (v, k) {
          if (k === j) { v.classList.remove('c-prete'); v.classList.add('c-on'); v.removeAttribute('aria-hidden'); }
          else if (v.classList.contains('c-on')) { v.classList.remove('c-on'); v.classList.add('c-sort'); v.setAttribute('aria-hidden', 'true'); }
        });
        /* l'écran sorti se range quand sa glissade est finie : 0,9 s (la glissade dure 0,62 s), plus le retard que la feuille donne
           à cette glissade — celui d'une case dans sa vague (carrousel.css) ; rangé plus tôt, il disparaîtrait en pleine glissade */
        var retard = 0;
        try { retard = (parseFloat(getComputedStyle(vues[j]).animationDelay) || 0) * 1000; } catch (x) {}
        clearTimeout(sortie);
        sortie = setTimeout(function () {
          vues.forEach(function (v) { if (v.classList.contains('c-sort')) { v.classList.remove('c-sort'); v.classList.add('c-prete'); } });
        }, 900 + retard);
        points.forEach(function (p, k) { if (k === j) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
        charger(vues[(j + 1) % n]);
      });
    }

    /* l'horloge : la pastille active a fini de se remplir → l'autre appareil */
    c.addEventListener('animationend', function (e) {
      if (e.animationName !== 'c-progres' || enPause) return;
      if (points[i] && e.target === points[i].querySelector('i')) montrer(i + 1, 1);
    });
    /* la souris sur le carrousel : il attend (on regarde un écran, il ne part pas sous les yeux) */
    c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') arret('survol', true); });
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') arret('survol', false); });
    /* au doigt : glisser de côté — pas dans une case (c'est un bouton : toucher l'ouvre) */
    var x0 = null, y0 = 0;
    if (scene && !c.closest('button')) {
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
      /* la première fois qu'on le voit, l'autre appareil se prépare — après le premier, qui passe d'abord */
      if (oui && !vu) { vu = true; setTimeout(function () { charger(vues[(i + 1) % n]); }, 700); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (en) { visible(en.isIntersecting && en.intersectionRatio >= 0.35); }); }, { threshold: [0, 0.35, 0.6] }).observe(c);
    } else visible(true);

    c.classList.add('c-pret');
    etat();
    return { arret: arret, pause: function (oui) { enPause = !!oui; etat(); } };
  }

  liste(document.querySelectorAll('[data-carrousel]')).forEach(function (c) { var x = brancher(c); if (x) tous.push(x); });
  document.addEventListener('visibilitychange', function () { tous.forEach(function (x) { x.arret('cache', document.hidden); }); });
  if (reduit) {
    var suivre = function () { tous.forEach(function (x) { x.pause(reduit.matches); }); };
    if (reduit.addEventListener) reduit.addEventListener('change', suivre); else if (reduit.addListener) reduit.addListener(suivre);
  }
})();
