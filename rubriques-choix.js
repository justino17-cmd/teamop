/* ══ « VOS RUBRIQUES » — LA GRILLE QUE LE CLIENT COCHE QUAND IL PREND UN ABONNEMENT ═════════════════════════════════
   Justin, 23 octobre 2026 : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; ils cochent les
   catégories ; et quand ils cochent, ça explique la catégorie ». UNE seule pièce, lue par les trois endroits où un abonnement
   commence : la demande d'accès de l'espace client (`espace.html`), la page de paiement (`recap-abonnement.html`) et la
   demande de création du site (`creer.html`, générée). La feuille qui l'habille est `rubriques-choix.css`.

   CE QU'ELLE LIT : le référentiel que sert l'API (`GET /api/metiers`, tiré de `metiers.json`) — jamais une copie : les métiers
   OUVERTS, pour chacun ses rubriques conseillées avec la raison de chacune, et l'explication de chaque rubrique. Elle n'invente
   rien : une rubrique que le référentiel ne décrit pas n'est pas affichée.

   CE QU'ELLE RÈGLE (et que les bancs jouent, `tests/test-2892.js`) :
     · les rubriques sont PRÉ-COCHÉES selon le métier ; changer de métier recale sur le conseil du nouveau métier ;
     · les quatre rubriques qui ne se cochent jamais (tableau de bord, utilisateurs, modules OP, paramètres) sont montrées comme
       INCLUSES, non décochables : l'administrateur ne pourrait plus rouvrir ce qu'on a fermé ;
     · « Tout cocher » et « Revenir au conseil du métier » ;
     · chaque rubrique porte son titre et son explication, VISIBLES sans survol (un téléphone n'a pas de survol), et, pour une
       rubrique conseillée, la raison propre au métier ;
     · ce qui part avec la demande est la liste des clés COCHÉES (`liste`), dans l'ordre du menu, sans les quatre « toujours » ;
       rien de coché = `null` : « le client n'a rien choisi », et la Tour part du conseil de son métier.
   Le DOM est mince : l'état (`etat`) et le texte HTML sont des fonctions pures, jouées par les bancs sans navigateur. */
(function (racine) {
  'use strict';
  var OpRub = {};

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* les insécables de la typographie française (« : ; ! ? » et guillemets), comme le reste du site */
  function fr(s) { return esc(s).replace(/ ([:;!?])/g, ' $1').replace(/« /g, '« ').replace(/ »/g, ' »'); }

  /* Le conseil d'un métier : ses rubriques ouvertes par défaut (déjà sans les quatre « toujours » côté serveur). `[]` quand le
     métier est inconnu du référentiel ou fermé — on ne devine rien. */
  OpRub.conseil = function (ref, metier) {
    var m = ref && ref.metiers && Object.prototype.hasOwnProperty.call(ref.metiers, metier) ? ref.metiers[metier] : null;
    return m && Array.isArray(m.rubriques) ? m.rubriques.slice() : [];
  };

  /* ⛔ LA BASE (30 octobre 2026, Justin : « planning, rendez-vous, suivi de chantier, stock, encaissement, facturation, photo et compte rendu, gestion
     client, contrat, c'est obligatoire qu'on le pose… s'il décoche tout sans faire exprès, ils vont avoir une application vide »). Les clés viennent du
     référentiel que la page embarque (`ref.base`, tirée de `CATS_BASE` côté serveur) : cochées d'office, jamais décochables — ni à la main, ni par
     « Tout cocher » —, montrées à part comme INCLUSES. Sans `ref.base` (l'espace client et la page de paiement d'aujourd'hui), rien ne change ; le
     serveur les ajoute de toute façon à ce que le client coche. */
  OpRub.base = function (ref) {
    if (!(ref && Array.isArray(ref.base) && ref.rubriques)) return [];
    return ref.base.filter(function (k) { return Object.prototype.hasOwnProperty.call(ref.rubriques, k); });
  };
  function poserBase(e) { var b = OpRub.base(e.ref); for (var i = 0; i < b.length; i++) e.choisies[b[i]] = true; return e; }

  /* L'état de la grille. `depart` : une liste de clés déjà choisies (une demande qu'on modifie), sinon le conseil du métier. */
  OpRub.etat = function (ref, metier, depart) {
    var e = { ref: ref || null, metier: metier || '', choisies: {}, touche: false };
    var l = Array.isArray(depart) && depart.length ? depart : OpRub.conseil(ref, metier);
    for (var i = 0; i < l.length; i++) e.choisies[l[i]] = true;
    e.touche = Array.isArray(depart) && depart.length > 0;
    return poserBase(e);
  };
  /* les rubriques que la grille MONTRE pour ce métier : toutes, sauf celles qui n'existent que pour d'autres métiers (`seulement` : aujourd'hui les
     rubriques de la 3D, masquées dans l'application hors 3D) — à moins que le métier ne les conseille ou ne les propose */
  function visible(e, k) {
    var r = e.ref.rubriques && e.ref.rubriques[k]; if (!r) return false;
    if (!Array.isArray(r.seulement) || r.seulement.indexOf(e.metier) >= 0) return true;
    var m = e.ref.metiers && e.ref.metiers[e.metier];
    return !!m && ((m.rubriques || []).indexOf(k) >= 0 || !!(m.proposees && m.proposees[k]));
  }
  function cles(e) {
    if (!(e && e.ref && Array.isArray(e.ref.ordre))) return [];
    var r = []; for (var i = 0; i < e.ref.ordre.length; i++) if (visible(e, e.ref.ordre[i])) r.push(e.ref.ordre[i]);
    return r;
  }
  /* Changer de métier recale sur son conseil : les cases d'un autre métier n'ont plus de raison d'être cochées. */
  OpRub.changerMetier = function (e, metier) {
    e.metier = metier || ''; e.choisies = {}; e.touche = false;
    var l = OpRub.conseil(e.ref, e.metier);
    for (var i = 0; i < l.length; i++) e.choisies[l[i]] = true;
    return poserBase(e);
  };
  OpRub.bascule = function (e, k) {
    if (OpRub.base(e.ref).indexOf(k) >= 0) return e;   // la base ne se décoche pas
    if (cles(e).indexOf(k) < 0) return e;   // une clé que le référentiel ne décrit pas ne se coche pas
    if (e.choisies[k]) delete e.choisies[k]; else e.choisies[k] = true;
    e.touche = true; return e;
  };
  OpRub.tout = function (e) { e.choisies = {}; var c = cles(e); for (var i = 0; i < c.length; i++) e.choisies[c[i]] = true; e.touche = true; return poserBase(e); };
  OpRub.revenirAuConseil = function (e) { return OpRub.changerMetier(e, e.metier); };
  /* ce qui part avec la demande : les clés cochées, dans l'ordre du menu. `null` : rien de coché (le client n'a rien choisi) */
  OpRub.liste = function (e) {
    var c = cles(e), r = [];
    for (var i = 0; i < c.length; i++) if (e.choisies[c[i]]) r.push(c[i]);
    return r.length ? r : null;
  };
  OpRub.compte = function (e) { var l = OpRub.liste(e); return { choisies: l ? l.length : 0, total: cles(e).length }; };
  OpRub.texteCompte = function (e) {
    var n = OpRub.compte(e);
    if (!n.choisies) return 'Rien de coché : nous partirons du conseil de votre métier.';
    return n.choisies + ' rubrique' + (n.choisies > 1 ? 's' : '') + ' sur ' + n.total;
  };

  /* Le texte de la grille. `id` préfixe les identifiants (deux grilles sur une page ne se heurtent pas). */
  OpRub.html = function (e, id) {
    var ref = e && e.ref;
    id = id || 'rub';
    if (!ref || !Array.isArray(ref.ordre) || !ref.rubriques) return '';
    var m = ref.metiers && ref.metiers[e.metier] ? ref.metiers[e.metier] : null;
    var conseillees = m ? m.rubriques : [], raisons = m ? (m.pourquoi || {}) : {}, proposees = m ? (m.proposees || {}) : {};
    var nom = m && m.nom ? m.nom : '';
    var h = '<div class="rub" data-rub-racine="' + esc(id) + '">';
    h += '<div class="rub-tete"><b class="rub-titre">Vos rubriques</b><span class="rub-compte" id="' + esc(id) + '-compte" role="status" aria-live="polite">' + fr(OpRub.texteCompte(e)) + '</span></div>';
    /* ⛔ une promesse VRAIE (23 octobre 2026) : l'application publique ne lit pas encore les rubriques d'une entreprise — elle les reçoit, mais ne les applique pas.
       Le choix part avec la demande, et c'est nous qui ouvrons l'espace en le lisant. Le jour où l'application les applique, ce texte le dira
       (`tests/test-2893.js` compare ce texte à ce que lit app.html). */
    h += '<p class="rub-aide">Cochez ce dont vous avez besoin : votre choix part avec votre demande et nous sert à ouvrir votre espace. '
      + (nom ? 'Elles sont pré-cochées pour <b>' + fr(nom) + '</b>. ' : '')
      + 'Vous pourrez toujours en ouvrir d’autres ensuite, et rien de ce que vous aurez saisi n’est perdu.</p>';
    h += '<div class="rub-actions"><button type="button" class="rub-btn" data-rub-act="tout">Tout cocher</button>'
      + (m ? '<button type="button" class="rub-btn" data-rub-act="conseil">Revenir au conseil du métier</button>' : '') + '</div>';
    /* les rubriques groupées comme le menu d'OP GESTION */
    var groupes = Array.isArray(ref.groupes) ? ref.groupes : [];
    var base = OpRub.base(ref);
    for (var g = 0; g < groupes.length; g++) {
      var dans = [];
      var vis = cles(e);
      for (var i = 0; i < vis.length; i++) if (ref.rubriques[vis[i]].groupe === groupes[g] && base.indexOf(vis[i]) < 0) dans.push(vis[i]);
      if (!dans.length) continue;
      var cochees = 0; for (var c = 0; c < dans.length; c++) if (e.choisies[dans[c]]) cochees++;
      h += '<div class="rub-groupe" role="group" aria-labelledby="' + esc(id) + '-g' + g + '"><div class="rub-gt" id="' + esc(id) + '-g' + g + '"><span>' + fr(groupes[g]) + '</span><small>' + cochees + '\u00a0/\u00a0' + dans.length + '</small></div>';
      for (var j = 0; j < dans.length; j++) {
        var k = dans[j], r = ref.rubriques[k], coche = !!e.choisies[k];
        var champ = esc(id) + '-' + esc(k);
        h += '<label class="rub-ligne' + (coche ? ' coche' : '') + '" for="' + champ + '">'
          + '<input type="checkbox" id="' + champ + '" data-rub="' + esc(k) + '"' + (coche ? ' checked' : '') + '>'
          + '<span class="rub-corps"><span class="rub-nom"><i aria-hidden="true">' + esc(r.ic || '') + '</i>' + fr(r.titre)
          + (r.reserveAdmin ? '<em class="rub-tag">Réservé à l’administrateur</em>' : '')
          + (!conseillees.includes(k) && proposees[k] ? '<em class="rub-tag propose">Proposée</em>' : '') + '</span>'
          + '<span class="rub-expl">' + fr(r.explication) + '</span>'
          + (conseillees.includes(k) && raisons[k] ? '<span class="rub-raison"><b>Pour votre métier</b> ' + fr(raisons[k]) + '</span>' : '')
          + (!conseillees.includes(k) && proposees[k] ? '<span class="rub-raison propose"><b>Au choix</b> ' + fr(proposees[k]) + '</span>' : '')
          + '</span></label>';
      }
      h += '</div>';
    }
    /* la base : incluse dans toutes les applications, avant les quatre « toujours » */
    if (base.length) {
      h += '<div class="rub-groupe rub-toujours rub-base" role="group" aria-labelledby="' + esc(id) + '-gb"><div class="rub-gt" id="' + esc(id) + '-gb"><span>Incluses dans toutes les applications</span><small>' + base.length + '\u00a0incluses</small></div>';
      for (var b = 0; b < base.length; b++) {
        var rb = ref.rubriques[base[b]];
        h += '<div class="rub-ligne inclus" data-rub-base="' + esc(base[b]) + '"><span class="rub-fixe" aria-hidden="true">✓</span><span class="rub-corps"><span class="rub-nom"><i aria-hidden="true">' + esc(rb.ic || '') + '</i>' + fr(rb.titre)
          + '<em class="rub-tag inclus">Incluse</em></span><span class="rub-expl">' + fr(rb.explication) + '</span></span></div>';
      }
      h += '</div>';
    }
    /* les quatre qui ne se cochent jamais : incluses, jamais décochables */
    var tj = Array.isArray(ref.toujours) ? ref.toujours : [];
    if (tj.length) {
      h += '<div class="rub-groupe rub-toujours" role="group" aria-labelledby="' + esc(id) + '-gt"><div class="rub-gt" id="' + esc(id) + '-gt"><span>Toujours présentes</span><small>incluses</small></div>';
      for (var t = 0; t < tj.length; t++) {
        h += '<div class="rub-ligne inclus"><span class="rub-fixe" aria-hidden="true">✓</span><span class="rub-corps"><span class="rub-nom"><i aria-hidden="true">' + esc(tj[t].ic || '') + '</i>' + fr(tj[t].titre)
          + '<em class="rub-tag inclus">Incluse</em></span><span class="rub-expl">' + fr(tj[t].explication) + '</span></span></div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  };

  /* Le fil au DOM, mince : un seul écouteur sur le conteneur (la grille se réécrit à chaque geste, ses cases changent). Le clavier
     ne perd pas sa place — la case ou le bouton touché reprend le focus après la réécriture. `quand(etat)` prévient la page. */
  OpRub.monter = function (conteneur, e, id, quand) {
    if (!conteneur) return null;
    function peindre(focus) {
      conteneur.innerHTML = OpRub.html(e, id);
      if (focus && conteneur.querySelector) { var n = conteneur.querySelector(focus); if (n && n.focus) { try { n.focus({ preventScroll: true }); } catch (x) { n.focus(); } } }
    }
    if (conteneur._opRubEcoute) conteneur.removeEventListener('click', conteneur._opRubEcoute);
    if (conteneur._opRubChange) conteneur.removeEventListener('change', conteneur._opRubChange);
    conteneur._opRubChange = function (ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      var k = t.getAttribute('data-rub'); if (!k) return;
      OpRub.bascule(e, k); peindre('[data-rub="' + k + '"]'); if (quand) quand(e);
    };
    conteneur._opRubEcoute = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-rub-act]') : null; if (!b) return;
      var a = b.getAttribute('data-rub-act');
      if (a === 'tout') OpRub.tout(e); else if (a === 'conseil') OpRub.revenirAuConseil(e); else return;
      peindre('[data-rub-act="' + a + '"]'); if (quand) quand(e);
    };
    conteneur.addEventListener('change', conteneur._opRubChange);
    conteneur.addEventListener('click', conteneur._opRubEcoute);
    peindre('');
    return { etat: e, repeindre: function () { peindre(''); } };
  };

  /* ── LA VARIANTE DU CHAUFFAGE / CLIMATISATION et le lien « Tester l'application » ──────────────────────────────────────────────
     `VARIANTES` : la liste FERMÉE que le serveur valide aussi (`VARIANTES_CHAUFFAGE`, index.js) ; `deux` est le défaut. Elle n'existe que pour
     le métier `chauffage` : tout autre métier n'en a pas (`variante` rend alors ''). */
  OpRub.VARIANTES = [['deux', 'Les deux', 'Chauffage et climatisation'], ['chauffage', 'Chauffage seulement', 'Pas de climatisation'], ['climatisation', 'Climatisation seulement', 'Pas de chauffage']];
  OpRub.variante = function (metier, v) {
    if (metier !== 'chauffage') return '';
    for (var i = 0; i < OpRub.VARIANTES.length; i++) if (OpRub.VARIANTES[i][0] === v) return v;
    return 'deux';
  };
  OpRub.libelleVariante = function (v) { for (var i = 0; i < OpRub.VARIANTES.length; i++) if (OpRub.VARIANTES[i][0] === v) return OpRub.VARIANTES[i][1]; return ''; };
  /* L'adresse de la démonstration, avec ce que le client a coché : <démo>?metier=<id>&variante=<deux|chauffage|climatisation>&cats=<clés,séparées,par,des,virgules>.
     Tout est ENCODÉ et BORNÉ : un identifiant de métier ou de rubrique qui n'a pas la forme d'une clé (lettres et chiffres) est jeté, jamais recopié ;
     60 rubriques au plus. Sans métier valide, l'adresse nue. */
  OpRub.lienDemo = function (demo, metier, variante, cats) {
    var cle = /^[A-Za-z0-9]{1,30}$/;
    if (typeof metier !== 'string' || !/^[a-z0-9]{1,20}$/.test(metier)) return demo;
    var q = ['metier=' + encodeURIComponent(metier)];
    var v = OpRub.variante(metier, variante); if (v) q.push('variante=' + encodeURIComponent(v));
    if (Array.isArray(cats)) {
      var ok = [];
      for (var i = 0; i < cats.length && ok.length < 60; i++) if (typeof cats[i] === 'string' && cle.test(cats[i]) && ok.indexOf(cats[i]) < 0) ok.push(cats[i]);
      if (ok.length) q.push('cats=' + ok.map(encodeURIComponent).join(','));
    }
    return demo + (demo.indexOf('?') < 0 ? '?' : '&') + q.join('&');
  };

  racine.OpRub = OpRub;
  if (typeof module !== 'undefined' && module.exports) module.exports = OpRub;
})(typeof window !== 'undefined' ? window : globalThis);
