/* ══ LE SITE VITRINE — les gestes, et rien d'autre ═════════════════════════════════════════════════
   Les pages sont du HTML statique complet (générées par `scripts/site-marine.js`) : sans ce fichier, tout
   se lit et tous les liens mènent quelque part. Il ajoute les volets du menu, le menu du téléphone, la
   fenêtre d'une fonction, les questions qui s'ouvrent, le choix OP GESTION / OP MESSAGES des tarifs, la
   formule qu'on choisit au toucher et la demande « Créer » — qui part par e-mail : il
   n'y a PAS de route serveur, l'écran ne dit donc jamais « demande envoyée » (c'est la messagerie de la
   personne qui l'envoie). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ══ DEMANDE_SITE:DEBUT ══ « Créer votre application » : la demande part AU SERVEUR (30 octobre 2026). Avant, la page ouvrait le logiciel de courrier du visiteur (`mailto:`) : sans
     logiciel configuré, ou sans clic sur « Envoyer », la demande se perdait en silence pendant que la page laissait croire qu'elle était partie (un client réel l'a vécu).
     ⛔ `fetch` NE JETTE PAS SUR UN REFUS : la page n'annonce « envoyée » que sur un 200 dont le corps dit `ok:true` — un 4xx, un 5xx, une coupure ou un corps illisible sont un ÉCHEC,
     et la page propose alors l'e-mail à la place. Aucun en-tête maison (la requête reste « Content-Type: application/json » : CORS). Ce bloc ne touche pas au DOM : le banc le joue seul. */
  var DemandeSite = {
    url: function () { var b = (typeof window.TEAMOP_API === 'string' && /^https?:\/\/[^\s]+$/.test(window.TEAMOP_API)) ? window.TEAMOP_API : 'https://api.teamop.fr'; return b.replace(/\/+$/, '') + '/api/site/demande'; },
    emailOk: function (v) { v = String(v || '').trim(); return v.length <= 120 && /^[^\s@<>"',;:()\[\]\\]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(v); },
    /* ce que la page a rempli → le corps envoyé ; les champs vides ne partent pas */
    corps: function (f) {
      var o = {}, t = function (v) { return String(v == null ? '' : v).trim(); };
      ['nom', 'prenom', 'email', 'tel', 'entreprise', 'equipe', 'message'].forEach(function (c) { var v = t(f[c]); if (v) o[c] = v; });
      o.metiers = Array.isArray(f.metiers) ? f.metiers.slice(0, 3) : [];
      if (f.variante) o.variante = String(f.variante);
      if (Array.isArray(f.cats) && f.cats.length) o.cats = f.cats.slice();
      if (Array.isArray(f.besoins) && f.besoins.length) o.besoins = f.besoins.slice(0, 10).map(t);
      if (t(f.piege)) o.site_web = t(f.piege);
      return o;
    },
    /* → Promise<{ ok, etat, status }> ; etat : 'envoyee' | 'invalide' | 'trop' | 'serveur' | 'reseau' */
    envoyer: function (corps) {
      var ctl = (typeof AbortController === 'function') ? new AbortController() : null, minuteur = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
      return fetch(DemandeSite.url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          if (minuteur) clearTimeout(minuteur);
          if (r.status === 200) return r.json().then(function (j) { return j && j.ok === true ? { ok: true, etat: 'envoyee', status: 200 } : { ok: false, etat: 'serveur', status: 200 }; }, function () { return { ok: false, etat: 'serveur', status: 200 }; });
          return { ok: false, etat: (r.status === 400 || r.status === 413) ? 'invalide' : r.status === 429 ? 'trop' : 'serveur', status: r.status };
        }, function () { if (minuteur) clearTimeout(minuteur); return { ok: false, etat: 'reseau', status: 0 }; });
    }
  };
  window.TeamOpDemande = DemandeSite;
  /* ══ DEMANDE_SITE:FIN ══ */

  /* ── jour / nuit : la page suit l'appareil, la feuille le fait seule (plus de bouton depuis le 29 septembre 2026) ── */

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

  /* ── créer : un métier (un seul, OBLIGATOIRE), ses rubriques (pré-cochées, expliquées), des besoins (plusieurs), et la demande part par e-mail ──
     Justin, 23 octobre 2026 : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; ils cochent les catégories ; et
     quand ils cochent, ça explique la catégorie ». Sans métier, la demande NE PART PAS (le message le dit, la liste reprend le focus). Les rubriques
     viennent du référentiel embarqué dans la page (le même que celui du serveur) et de `rubriques-choix.js` ; un métier encore fermé n'en a pas :
     la demande part quand même, « à construire sur mesure ». */
  var demande = $('#demande');
  if (demande) {
    var refBrut = $('#referentiel-metiers'), REF = null;
    try { REF = refBrut ? JSON.parse(refBrut.textContent) : null; } catch (e) { REF = null; }
    var zoneRub = $('#rubriques-demande'), grille = $('#rubriques-grille'), erreur = $('#erreur-metier'), bientot = $('#metier-bientot'), etatRub = null;
    /* 30 octobre 2026 (Justin) : la VARIANTE du chauffage / climatisation (trois choix, « Les deux » par défaut) et le bouton « Tester l'application » (la
       démonstration, avec ce qui est coché). Absents de la page publiée tant que Justin ne l'a pas dit : tout est gardé par la présence des éléments. */
    var blocVar = $('#variante-chauffage'), blocTest = $('#tester-bloc'), lienTest = $('#tester-app');
    /* ── PLUSIEURS MÉTIERS (30 octobre 2026, Justin : « le client peut choisir plusieurs métiers » ; « 3 métiers maximum » ; « plus 10 € par métier, toutes taxes comprises ») ──
       `choix` : les clés, LE PREMIER EST LE MÉTIER PRINCIPAL (celui qui règle l'application au départ, et celui dont la grille de rubriques s'affiche). La 3D est seule :
       l'application refuse '3d' comme métier EN PLUS. Le mode ne s'allume que si la page porte `#metiers-recap` (l'aperçu) : la page publiée garde son métier unique. */
    var recap = $('#metiers-recap'), multi = !!recap, choix = [];   // les règles (3 au plus, la 3D seule, le prix) sont dans OpRub : `basculerMetier`, `faireLePrincipal`, `prixEnPlus`
    var refusMetier = $('#metiers-refus'), listeOrdre = $('#metiers-ordre'), totalPlus = $('#metiers-total');
    var puceDe = function (k) { return $('.metier-puce[data-pack="' + k + '"]', demande); };
    var metiersCourants = function () {
      if (multi) return choix.slice();
      var m = $('.metier-puce[aria-pressed="true"]', demande); return m ? [m.getAttribute('data-pack')] : [];
    };
    var metierCourant = function () { return metiersCourants()[0] || ''; };
    /* la variante se lit dès que le chauffage est DANS la sélection, quel que soit son rang */
    var varianteCourante = function () {
      if (!blocVar || !window.OpRub || metiersCourants().indexOf('chauffage') < 0) return '';
      var r = $('input[name="variante"]:checked', demande); return window.OpRub.variante('chauffage', r && r.value);
    };
    /* l'adresse de la démonstration : tous les métiers, la variante, et les rubriques SEULEMENT si le client y a touché (sinon la démonstration montre tout) */
    var adresseDemo = function (base) {
      var ms = metiersCourants(); if (!ms.length || !window.OpRub) return base;
      return window.OpRub.lienDemo(base, ms[0], varianteCourante(), etatRub && etatRub.touche ? window.OpRub.liste(etatRub) : null, ms);
    };
    var majTest = function () {
      var ms = metiersCourants();
      if (blocVar) blocVar.hidden = !(window.OpRub && window.OpRub.varianteVisible(ms));
      if (blocTest && !multi) blocTest.hidden = !ms.length;
      $$('[data-tester]', document).forEach(function (a) { a.href = adresseDemo(a.getAttribute('data-demo') || '/demo.html'); });
    };
    var rubPour = '';
    var dire = function (t) { if (!refusMetier) return; refusMetier.textContent = t || ''; refusMetier.hidden = !t; };
    /* repeint la sélection : états des puces, rang « 1, 2, 3 », ordre, prix, rubriques du métier principal */
    var appliquerChoix = function () {
      $$('.metier-puce', demande).forEach(function (p) {
        var i = choix.indexOf(p.getAttribute('data-pack')), r = $('.rang', p);
        p.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
        if (i >= 0) { if (!r) { r = document.createElement('span'); r.className = 'rang'; r.setAttribute('aria-hidden', 'true'); p.appendChild(r); } r.textContent = String(i + 1); }
        else if (r) r.remove();
      });
      if (listeOrdre) {
        listeOrdre.textContent = '';
        choix.forEach(function (k, i) {
          var p = puceDe(k), li = document.createElement('li'), n = document.createElement('b'), nom = document.createElement('span');
          n.textContent = String(i + 1); nom.className = 'ordre-nom'; nom.textContent = p ? p.getAttribute('data-nom') : k;
          li.appendChild(n); li.appendChild(nom);
          if (i === 0) { var t = document.createElement('em'); t.textContent = 'métier principal'; li.appendChild(t); }
          else {
            var b = document.createElement('button'); b.type = 'button'; b.className = 'ordre-principal'; b.setAttribute('data-principal', k);
            b.textContent = 'En faire le métier principal'; b.setAttribute('aria-label', 'Faire de ' + (p ? p.getAttribute('data-nom') : k) + ' le métier principal');
            li.appendChild(b);
          }
          listeOrdre.appendChild(li);
        });
        listeOrdre.hidden = !choix.length;
      }
      if (totalPlus) {
        var plus = window.OpRub.metiersEnPlus(choix);
        totalPlus.textContent = plus ? ' Vous en ajoutez ' + plus + ' : +' + window.OpRub.prixEnPlus(choix) + ' € TTC par mois.' : '';
      }
      if (choix.length && erreur) erreur.hidden = true;
      var princ = choix[0] ? puceDe(choix[0]) : null;
      if (bientot) bientot.hidden = !(princ && princ.getAttribute('data-pret') !== '1');
      if (choix[0] !== rubPour) { rubPour = choix[0] || ''; montrerRubriques(princ); }
      majTest(); garder();
    };
    var basculerMetier = function (k) {
      var r = window.OpRub.basculerMetier(choix, k);
      dire(r.refus); if (r.refus) return;
      choix = r.choix; appliquerChoix();
    };
    var montrerRubriques = function (m) {
      var k = m && m.getAttribute('data-pack'), pret = !!m && m.getAttribute('data-pret') === '1';
      if (bientot) bientot.hidden = !(m && !pret);
      if (!(m && pret && REF && window.OpRub && grille && zoneRub && REF.metiers && REF.metiers[k])) { etatRub = null; if (zoneRub) zoneRub.hidden = true; return; }
      etatRub = window.OpRub.etat(REF, k, depart);
      zoneRub.hidden = false;
      montage = window.OpRub.monter(grille, etatRub, 'cr', function () { majTest(); garder(); });
      if (enAttente) { var c = enAttente; enAttente = ''; ajouterDepuisDemo(c); }
    };
    /* ── « AJOUTER CETTE RUBRIQUE » DEPUIS LA DÉMONSTRATION (30 octobre 2026) ─────────────────────────────────────────────────────────────
       Le bouton « Tester l'application » ouvre la démonstration dans un onglet qui GARDE `window.opener` (`rel="opener"`) : une rubrique non cochée y propose
       « l'ajouter à ma demande », et le message revient ici. Contrat fixé avec la démonstration : `{type:'teamop-demo', action:'ajouter-rubrique', rubrique:<clé>, v:1}`,
       reçu SEULEMENT de l'origine de CETTE page (`location.origin` : le domaine du site en production, 127.0.0.1 pour les bancs — la démonstration est du même site, et un
       littéral de production ferait refuser la fabrication de l'espace de test) : jamais `*`, jamais une autre origine. Sans onglet d'origine, la démonstration navigue vers `creer.html?ajouter=<clé>` : même geste au chargement, et le reste du formulaire revient
       (rangé dans la session de l'onglet par `garder`). Une rubrique inconnue ou non proposée au métier ne coche rien, et le dit. */
    var avisAjout = $('#rubrique-ajoutee'), montage = null, enAttente = '', depart = null;
    var CLE = /^[A-Za-z0-9]{1,30}$/;
    var direAjout = function (t) { if (avisAjout) { avisAjout.textContent = t; avisAjout.hidden = false; } };
    var ajouterDepuisDemo = function (cle) {
      if (!window.OpRub || typeof cle !== 'string' || !CLE.test(cle)) return false;
      if (!etatRub) { enAttente = cle; direAjout('Choisissez d’abord votre métier : la rubrique demandée y sera ajoutée aussitôt.'); return false; }
      var r = window.OpRub.ajouter(etatRub, cle);
      if (!r.ok) { direAjout('Cette rubrique n’est pas proposée pour votre métier : elle n’a pas été ajoutée.'); return false; }
      if (montage) montage.repeindre();
      majTest(); garder();
      direAjout((r.deja ? 'Cette rubrique était déjà dans votre demande' : 'Rubrique ajoutée à votre demande') + ' : ' + r.titre + '.');
      var ligne = grille && (grille.querySelector('[data-rub="' + cle + '"]') || grille.querySelector('[data-rub-base="' + cle + '"]'));
      var bloc = ligne && (ligne.closest ? ligne.closest('.rub-ligne') : null);
      if (bloc) { bloc.classList.add('vient-dajouter'); try { bloc.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) { bloc.scrollIntoView(); } }
      return true;
    };
    if (lienTest) {
      window.addEventListener('message', function (ev) {
        if (ev.origin !== location.origin) return;
        var d = ev.data;
        if (!d || typeof d !== 'object' || d.type !== 'teamop-demo' || d.action !== 'ajouter-rubrique' || d.v !== 1) return;
        ajouterDepuisDemo(d.rubrique);
      });
    }
    /* le formulaire dans la session de l'ONGLET (jamais ailleurs) : un onglet ouvert depuis celui-ci en reçoit une copie, ce qui le fait revenir tel quel */
    var CLE_SESSION = 'teamop_creer_v1';
    var garder = function () {
      if (!lienTest) return;
      try {
        var champs = {}; $$('input[type="text"], input[type="email"], input[type="tel"], textarea', demande).forEach(function (c) { if (c.name) champs[c.name] = c.value; });
        var rv = $('input[name="variante"]:checked', demande);
        sessionStorage.setItem(CLE_SESSION, JSON.stringify({ metier: metierCourant(), metiers: metiersCourants(), variante: rv ? rv.value : '', cats: etatRub && window.OpRub ? window.OpRub.liste(etatRub) : null, champs: champs,
          besoins: $$('.besoin[aria-pressed="true"]', demande).map(function (b) { return b.textContent.trim(); }) }));
      } catch (x) {}
    };
    var restaurer = function () {
      var s = null; try { s = JSON.parse(sessionStorage.getItem(CLE_SESSION) || 'null'); } catch (x) { s = null; }
      if (!s || typeof s !== 'object') return;
      $$('input[type="text"], input[type="email"], input[type="tel"], textarea', demande).forEach(function (c) { if (c.name && s.champs && typeof s.champs[c.name] === 'string') c.value = s.champs[c.name]; });
      $$('.besoin', demande).forEach(function (b) { if ((s.besoins || []).indexOf(b.textContent.trim()) >= 0) b.setAttribute('aria-pressed', 'true'); });
      var cles = Array.isArray(s.metiers) && s.metiers.length ? s.metiers : (typeof s.metier === 'string' && s.metier ? [s.metier] : []), bons = [];
      cles.forEach(function (k) {
        if (typeof k !== 'string' || !/^[a-z0-9]{1,20}$/.test(k) || bons.indexOf(k) >= 0 || !puceDe(k)) return;
        if (!multi && bons.length) return;
        var r = window.OpRub.basculerMetier(bons, k); if (!r.refus) bons = r.choix;
      });
      if (!bons.length) return;
      if (blocVar && s.variante) { var rv = $('input[name="variante"][value="' + String(s.variante).replace(/[^a-z]/g, '') + '"]', demande); if (rv) rv.checked = true; }
      depart = Array.isArray(s.cats) ? s.cats.filter(function (k) { return typeof k === 'string' && CLE.test(k); }) : null;
      if (multi) { choix = bons; appliquerChoix(); }
      else { var m = puceDe(bons[0]); m.setAttribute('aria-pressed', 'true'); if (erreur) erreur.hidden = true; montrerRubriques(m); }
      depart = null; majTest();
    };
    demande.addEventListener('input', garder);
    $$('.metier-puce', demande).forEach(function (m) {
      m.addEventListener('click', function () {
        if (multi) { basculerMetier(m.getAttribute('data-pack')); return; }
        var on = m.getAttribute('aria-pressed') !== 'true';
        $$('.metier-puce', demande).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        m.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on && erreur) erreur.hidden = true;
        montrerRubriques(on ? m : null);
        majTest(); garder();
      });
    });
    /* « En faire le métier principal » : le métier choisi passe en tête (rang 1), les autres gardent leur ordre */
    if (listeOrdre) listeOrdre.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-principal]') : null; if (!b) return;
      var k = b.getAttribute('data-principal'); if (choix.indexOf(k) < 1) return;
      choix = window.OpRub.faireLePrincipal(choix, k); dire(''); appliquerChoix();
      var nouveau = $('.ordre-principal', listeOrdre); if (!nouveau) { var pr = puceDe(k); if (pr) pr.focus(); }
    });
    $$('input[name="variante"]', demande).forEach(function (r) { r.addEventListener('change', function () { majTest(); garder(); }); });
    var ajoutDemande = (/[?&]ajouter=([A-Za-z0-9]{1,30})(?:&|$)/.exec(location.search) || [])[1];
    if (ajoutDemande && lienTest) { restaurer(); ajouterDepuisDemo(ajoutDemande); }
    $$('.besoin', demande).forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); if (lienTest) garder(); });
    });
    /* L'interface de l'envoi : les pages d'aujourd'hui la portent (aperçu), la page de la racine date d'avant — on complète ce qui manque, on ne double rien. */
    var envoiEnCours = false;
    var creer = function (tag, cls, txt, avant) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; var ref = avant === null ? null : (avant || $('.envoi', demande)); if (ref && ref.parentNode) ref.parentNode.insertBefore(n, ref); else demande.appendChild(n); return n; };
    if (!$('[name="site_web"]', demande)) {
      var pg = creer('div', 'piege'); pg.setAttribute('aria-hidden', 'true'); pg.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden';
      var pl = document.createElement('label'); pl.textContent = 'Site web'; var pi = document.createElement('input'); pi.type = 'text'; pi.name = 'site_web'; pi.tabIndex = -1; pi.setAttribute('autocomplete', 'off'); pl.appendChild(pi); pg.appendChild(pl);
    }
    var mauvaisMail = $('#erreur-email', demande);
    if (!mauvaisMail) { mauvaisMail = creer('p', 'erreur-metier erreur-email', 'Indiquez une adresse e-mail valide : c\'est par elle que nous vous répondons. Si vous préférez, ajoutez aussi votre téléphone.'); mauvaisMail.id = 'erreur-email'; mauvaisMail.setAttribute('role', 'alert'); mauvaisMail.hidden = true; }
    var succes = $('.avis-envoi:not(.echec-envoi)', demande), echec = $('.echec-envoi', demande);
    if (!succes) { succes = creer('p', 'avis-envoi', '', null); succes.setAttribute('role', 'status'); succes.hidden = true; }
    succes.textContent = 'Demande envoyée, on vous rappelle sous 48 h. Merci !'; succes.setAttribute('aria-live', 'polite');
    if (!echec) {
      echec = creer('div', 'avis-envoi echec-envoi', '', null); echec.setAttribute('role', 'alert'); echec.hidden = true;
      var e1 = document.createElement('p'); e1.className = 'echec-texte'; var e2 = document.createElement('p'), eb = document.createElement('button'); eb.type = 'button'; eb.className = 'bouton'; eb.setAttribute('data-mailto', ''); eb.textContent = 'Envoyer par e-mail à la place'; e2.appendChild(eb);
      var e3 = document.createElement('p'); e3.appendChild(document.createTextNode('Ou écrivez-nous directement à ')); var ea = document.createElement('a'); ea.href = 'mailto:contact@teamop.fr'; ea.textContent = 'contact@teamop.fr'; e3.appendChild(ea); e3.appendChild(document.createTextNode('.'));
      echec.appendChild(e1); echec.appendChild(e2); echec.appendChild(e3);
    }
    var echecTexte = $('.echec-texte', echec), echecMail = $('[data-mailto]', echec);
    var bEnvoi = $('.envoi button[type="submit"]', demande), pEnvoi = $('.envoi small', demande);
    if (bEnvoi) bEnvoi.textContent = 'Envoyer ma demande';
    if (pEnvoi) pEnvoi.textContent = 'Elle nous parvient tout de suite, sans passer par votre messagerie. On vous rappelle sous 48 h.';
    demande.addEventListener('submit', function (e) {
      e.preventDefault();
      /* Le métier part EN TÊTE et sous une forme sans ambiguïté : c'est lui qui décide du pack
         activé à la création de l'espace (même lecture que l'ancienne page). */
      var lignes = [], ms = metiersCourants(), m = ms.length ? puceDe(ms[0]) : null;
      if (!m) {
        /* ⛔ pas de métier, pas de demande : le message se DIT (lecteur d'écran compris) et on ramène sur la liste */
        if (erreur) erreur.hidden = false;
        var premiere = $('.metier-puce', demande);
        if (premiere) { try { premiere.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} premiere.focus(); }
        return;
      }
      lignes.push('MÉTIER CHOISI : ' + m.getAttribute('data-nom') + '  [pack ' + m.getAttribute('data-pack') + ']');
      if (ms.length > 1) {
        lignes.push('METIERS : ' + ms.map(function (k) { return puceDe(k).getAttribute('data-nom'); }).join(' + ') + '  [metiers ' + ms.join(',') + ']  (le premier est le métier principal)');
        lignes.push('Métiers en plus : ' + (ms.length - 1) + ' (+' + (window.OpRub.prixEnPlus(ms)) + ' € TTC par mois)');
      }
      lignes.push('Pack : ' + (m.getAttribute('data-pret') === '1' ? 'prêt — activable dès la création' : 'à construire sur mesure'));
      var vr = varianteCourante();
      if (vr) lignes.push('VARIANTE : ' + window.OpRub.libelleVariante(vr) + '  [variante ' + vr + ']');
      var choisies = etatRub && window.OpRub ? window.OpRub.liste(etatRub) : null;
      if (choisies) {
        lignes.push('RUBRIQUES CHOISIES (' + choisies.length + ' sur ' + etatRub.ref.ordre.length + ') : ' + choisies.map(function (c) { return etatRub.ref.rubriques[c].titre; }).join(', '));
        lignes.push('Clés des rubriques : ' + choisies.join(','));
      } else if (etatRub) lignes.push('RUBRIQUES CHOISIES : aucune cochée — partir du conseil du métier');
      lignes.push('');
      $$('input, textarea', demande).forEach(function (c) {
        if (c.name === 'site_web') return;   // le champ piège n'est pas une réponse
        if (c.type === 'checkbox') return;   // les cases de la grille des rubriques sont dites plus haut
        var v = (c.value || '').trim(); if (!v) return;
        lignes.push((c.getAttribute('data-libelle') || c.name) + ' : ' + v);
      });
      var besoins = $$('.besoin[aria-pressed="true"]', demande).map(function (b) { return b.textContent.trim(); });
      if (besoins.length) lignes.push('Besoins cochés : ' + besoins.join(', '));
      var mail = 'mailto:contact@teamop.fr?subject=' + encodeURIComponent('Demande de création d\'application — TEAM OP') + '&body=' + encodeURIComponent(lignes.join('\n'));
      var val = function (n) { var c = $('[name="' + n + '"]', demande); return c ? c.value : ''; };
      var email = val('c2'), tel = val('c3');
      if (!DemandeSite.emailOk(email)) {
        /* ⛔ pas d'adresse valable, pas de demande : c'est par elle qu'on répond */
        if (mauvaisMail) { mauvaisMail.hidden = false; }
        var cm = $('[name="c2"]', demande); if (cm) { try { cm.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} cm.focus(); }
        return;
      }
      if (mauvaisMail) mauvaisMail.hidden = true;
      if (envoiEnCours) return;   // pas de double demande
      envoiEnCours = true;
      var bouton = $('.envoi button[type="submit"]', demande), libelle = bouton ? bouton.textContent : '';
      if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi en cours…'; }
      if (succes) succes.hidden = true;
      if (echec) echec.hidden = true;
      var corps = DemandeSite.corps({ nom: val('c0'), prenom: val('c1'), email: email, tel: tel, entreprise: val('c4'), equipe: val('c5'), message: val('quotidien'),
        metiers: ms, variante: vr, cats: choisies, besoins: besoins, piege: val('site_web') });
      DemandeSite.envoyer(corps).then(function (r) {
        envoiEnCours = false;
        if (r.ok) {
          /* ⛔ « envoyée » SEULEMENT sur un 200 : le bouton reste éteint (la demande est partie), et le formulaire gardé en session s'efface */
          if (bouton) bouton.textContent = 'Demande envoyée';
          try { sessionStorage.removeItem(CLE_SESSION); } catch (x) {}
          if (succes) { succes.hidden = false; try { succes.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} }
          return;
        }
        if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
        if (echecTexte) echecTexte.textContent = r.etat === 'invalide' ? 'Le serveur a refusé la demande (un champ est incorrect ou trop long). Vérifiez l\'adresse e-mail et le téléphone, ou envoyez-la par e-mail.'
          : r.etat === 'trop' ? 'Trop de demandes depuis cette connexion : réessayez dans une heure, ou envoyez-la par e-mail.'
          : r.etat === 'reseau' ? 'Votre demande n\'a pas pu être envoyée : la connexion a échoué. Réessayez, ou envoyez-la par e-mail.'
          : 'Votre demande n\'a pas pu être envoyée : notre serveur ne répond pas pour le moment. Réessayez, ou envoyez-la par e-mail.';
        if (echecMail) echecMail.onclick = function () { location.href = mail; };
        if (echec) { echec.hidden = false; try { echec.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} }
      });
    });
  }
})();
