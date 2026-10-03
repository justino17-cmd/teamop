(function () {
  'use strict';

  /* ═══ 1. LA SOURCE — l'UNIQUE porte vers les données ═══════════════════════════════════════════════════════════════════════
     ⛔ Cette page ne contient AUCUNE donnée et n'en modifie AUCUNE : tout ce qu'elle sait des personnes et des conversations vient de
     `window.OPMSG_SOURCE` (source.js), et tout ce qu'elle change passe par une de ses méthodes (envoyer, marquerLu, creerGroupe).
     Brancher le serveur d'OP MESSAGES, plus tard, c'est remplacer ce seul objet : les écrans ci-dessous ne bougent pas.
     Ce que la page garde est un INSTANTANÉ de ce que la source a rendu, rafraîchi quand elle le dit (`ecouter`). */
  const $ = id => document.getElementById(id);
  const source = window.OPMSG_SOURCE;
  if (!source) { $('contenu').innerHTML = '<p class="vide">Les données n\'ont pas pu être chargées.</p>'; return; }
  /* ⛔ CE QUE LA SOURCE SAIT FAIRE. La source de l'aperçu n'annonce rien : photos, vocaux et appels y sont SIMULÉS, aucun service, aucune action sur un message. Celle du
     service annonce ses capacités (`source.capacites`) : ce qu'elle ne sait pas encore dit « bientôt » au lieu de faire semblant. */
  const CAP = Object.assign({ service: false, connexion: false, photos: true, vocaux: true, fichiers: false, avatars: false, reglages: false, appels: true, reunions: false, actionsMessage: false, groupeInfos: false, liens: false, presence: false, saisie: false, historique: false, notifications: false, compte: false, espaces: false, texteMax: 4000 }, source.capacites || {});
  /* la personne et ses contacts : posés au démarrage (une source de service ne sait qui est connecté qu'après avoir lu la session), relus quand elle le dit */
  let MOI = null, CONTACTS = [];
  const SUFFIXE_TITRE = CAP.service ? ' — OP MESSAGES' : ' — OP MESSAGES, aperçu';
  if (CAP.service) document.documentElement.dataset.service = '1';
  if (typeof source.demarrer === 'function') $('app').hidden = true;     // jamais l'écran d'un autre avant de savoir qui est là
  const VUES = {
    messages: { titre: 'Messages',  icone: 'i-chat' },
    appels:   { titre: 'Appels',    icone: 'i-phone', texte: 'L\'historique des appels, les appels audio et vidéo.' },
    reunions: { titre: 'Réunions',  icone: 'i-video', texte: 'L\'agenda, la programmation, les invités et les rappels.' },
    reglages: { titre: 'Réglages',  icone: 'i-gear',  texte: 'Le compte, les notifications et la confidentialité.' }
  };
  const ORDRE = ['messages', 'appels', 'reunions', 'reglages'];
  const EPHEMERES = [[0, 'Désactivés'], [86400, '24 heures'], [604800, '7 jours'], [7776000, '90 jours']];
  const VOCAL_MIN_MS = 800, VOCAL_MAX_MS = 180000, TENU_MS = 600, TEXTE_MAX = CAP.texteMax;

  /* ═══ 2. L'ÉTAT — un seul objet, que des instantanés et des gestes en cours ════════════════════════════════════════════════ */
  const etat = {
    route: null,                  // { vue, conv, feuille, photo } — c'est elle qui est écrite dans l'historique
    conversations: [],            // la liste, telle que la source l'a rendue
    conv: null, convDonnees: null, jeton: 0,
    recherche: '', neuves: new Set(), brouillons: {}, scrollListe: 0, posVues: {}, forcerBas: false, envoiEnCours: false,
    groupe: groupeVierge(), garderPhoto: false, photo: null, creation: false,
    appels: [], filtreAppels: 'tous', jetonAppels: 0,        // l'historique tel que la source l'a rendu pour le filtre choisi
    contexte: null, menu: null, codeLien: null,     // une réponse ou une modification en cours de composition ; le menu d'un message ouvert ; le lien lu dans l'adresse
    appelId: null, appelUI: null, jetonAppel: 0, appelDemarre: false, declencheurAppel: null     // l'appel en cours : son identifiant (celui de la route), l'état local (médias, minuterie), un jeton qui périme les attentes
  };
  /* `mode` : ce que la feuille est en train d'être — 'chat' (Nouveau groupe), 'appel' (Appel de groupe : audio ou vidéo), 'info' (les détails d'un appel de l'historique),
     'contact' (mes contacts et leurs liens), 'convinfo' (les infos d'une conversation), 'profil' (mon profil : photo, nom, statut), et — capacité `espaces` — 'entreprise' (mes espaces :
     créer, rejoindre par un lien), 'espace' (UN espace : contacts de l'entreprise, canaux, invitations) ou 'abo' (l'abonnement Messages Pro de cet espace) */
  function groupeVierge() { return { ouvert: false, mode: 'chat', cle: null, convId: null, espaceId: null, nom: '', photo: null, photoBlob: null, choisis: [], recherche: '', ephemeres: 0, annonces: false, video: false, info: null }; }

  /* ═══ 3. OUTILS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* la recherche ignore accents et casse : « ines » trouve « Inès » */
  const norme = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const contactDe = id => CONTACTS.find(c => c.id === id) || (typeof source.personne === 'function' ? source.personne(id) : null) || null;      // un auteur peut n'être le contact de personne : la source connaît ceux qu'elle a vus
  const prenom = c => c.nom.split(' ')[0];
  /* une conversation à plusieurs : un groupe, ou un CANAL d'espace (mêmes messages, même fil : le nom de l'auteur se montre) ; un canal se nomme « # nom » */
  const multi = c => !!c && (c.type === 'groupe' || c.type === 'canal');
  const nomConv = c => (c.type === 'canal' ? '# ' : '') + c.nom;
  const genreConv = c => c.type === 'canal' ? 'canal' : c.type === 'groupe' ? 'groupe' : 'contact';
  const icone = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  const CHEVRON = '<svg class="chev" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5"/></svg>';
  /* ⛔ UNE ADRESSE `blob:` VRAIE, et rien d'autre : schéma, hôte, identifiant — ni parenthèse, ni guillemet, ni espace. Une chaîne qui COMMENCE par « blob: » passait, et `esc()` laisse
     passer les parenthèses : venue du service, elle aurait fermé le `url(…)` d'un avatar et injecté du CSS (relecture du gardien, remarque 6). */
  const blob = u => typeof u === 'string' && /^blob:https?:\/\/[A-Za-z0-9.:\[\]-]{1,80}\/[0-9a-fA-F-]{8,64}$/.test(u);
  /* une erreur DIT quelque chose : la phrase française du service si l'erreur en porte une, sinon la phrase de l'écran — jamais un message technique */
  const phrase = (e, defaut) => e && e.dit ? (typeof e.phrase === 'function' ? e.phrase() : e.message) : (defaut || 'Une erreur est survenue.');
  /* l'avatar d'une photo choisie s'écrit en style direct : l'adresse est un blob: fabriqué par la page, vérifié, puis échappé */
  const avatar = c => '<span class="avatar av' + (((c.avatar | 0) % 6 + 6) % 6) + (c.enLigne ? ' en-ligne' : '') + '"' + (blob(c.photo) ? ' style="background-image:url(' + esc(c.photo) + ')"' : '') + ' aria-hidden="true">' + (blob(c.photo) ? '' : esc(c.initiales || '')) + (c.enLigne ? '<i class="presence" title="En ligne"></i>' : '') + '</span>';

  /* les dates : l'heure du jour, « Hier », le jour de la semaine, puis la date — tout se calcule sur l'horloge de l'appareil */
  const FMT_HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const FMT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const FMT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const maj1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const debutDeJour = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const ecartJours = (t, ref) => Math.round((debutDeJour(ref) - debutDeJour(t)) / 86400000);
  function libelleListe(t) {
    const now = Date.now(), j = ecartJours(t, now);
    if (now - t < 60000 && now >= t) return 'maintenant';
    if (j <= 0) return FMT_HEURE.format(t);
    if (j === 1) return 'Hier';
    return j < 7 ? maj1(FMT_JOUR.format(t)) : FMT_DATE.format(t);
  }
  function libelleDatage(t) {
    const j = ecartJours(t, Date.now()), h = FMT_HEURE.format(t);
    if (j <= 0) return 'Aujourd\'hui ' + h;
    if (j === 1) return 'Hier ' + h;
    return (j < 7 ? maj1(FMT_JOUR.format(t)) : FMT_DATE.format(t)) + ' ' + h;
  }
  const duree = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  /* un nombre d'octets en mots : « 850 Ko », « 12,3 Mo », « 2 Go » */
  const tailleTexte = o => { o = +o || 0; return o >= 1073741824 ? (Math.round(o / 107374182.4) / 10).toString().replace('.', ',') + ' Go' : o >= 1048576 ? (Math.round(o / 104857.6) / 10).toString().replace('.', ',') + ' Mo' : o >= 1024 ? Math.round(o / 1024) + ' Ko' : o + ' o'; };

  /* ═══ 4. LA LISTE MESSAGES ════════════════════════════════════════════════════════════════════════════════════════════════ */
  function ligneConv(c, neuve) {
    const sel = etat.conv === c.id;
    return '<li' + (neuve ? ' class="conv-neuve"' : '') + '><button type="button" class="conv presse" data-ouvrir="' + esc(c.id) + '"' + (sel ? ' aria-current="true"' : '') + '>' +
      '<span class="conv-point">' + (c.nonLu ? '<i class="point"></i><span class="sr-seul">Non lu</span>' : '') + '</span>' + avatar(c) +
      '<span class="conv-corps"><span class="conv-ligne"><span class="conv-nom">' + esc(nomConv(c)) + (c.type === 'canal' && c.prive ? '<span class="sr-seul"> (canal privé)</span>' : '') + '</span><span class="conv-heure" data-t="' + (+c.t || 0) + '">' + esc(libelleListe(c.t)) + '</span>' + CHEVRON + '</span>' +
      '<span class="conv-apercu" dir="auto">' + esc(c.apercu) + '</span></span></button></li>';
  }
  function rendreListe() {
    const q = norme(etat.recherche);
    const vues = etat.conversations.filter(c => !q || norme(c.nom).includes(q) || norme(c.apercu).includes(q));
    /* ⛔ une conversation neuve s'anime UNE fois : le drapeau est consommé par ce rendu, pas gardé — sinon chaque frappe dans la
       recherche (qui refait toute la liste) rejouerait l'entrée de chaque groupe créé depuis le début */
    const neuves = new Set(etat.neuves); etat.neuves.clear();
    $('liste-conv').innerHTML = vues.length ? vues.map(c => ligneConv(c, neuves.has(c.id))).join('') :
      (!q && !etat.conversations.length && CAP.service ? '<li class="vide">Aucune conversation pour l\'instant. Ajoute un contact (Réglages), puis écris-lui ou crée un groupe.</li>' : '<li class="vide">Aucun résultat pour « ' + esc(etat.recherche.trim()) + ' »</li>');
    /* épinglés : les conversations marquées, une colonne de 76 px chacune (nom court, jamais coupé en deux) */
    const pins = etat.conversations.filter(c => c.epingle);
    $('epingles').innerHTML = pins.map(c => '<li class="epingle"><button type="button" class="epingle-bouton" data-ouvrir="' + esc(c.id) + '"' + (etat.conv === c.id ? ' aria-current="true"' : '') + '>' +
      avatar(c) + '<span class="epingle-nom">' + esc(c.court || c.nom) + '</span></button></li>').join('');
    $('epingles').hidden = !pins.length;
    majBadge();
  }
  /* ⛔ UN ÉCHEC DE CHARGEMENT SE DIT. Un 429 ou un 503 sur la liste faisait retomber la page de l'étape 1 sur son écran de connexion, sans un mot (relecture du gardien,
     remarque 2) : la liste reste celle d'avant, une phrase explique pourquoi elle n'est pas à jour et « Réessayer » la relit. Une réussite efface le refus d'avant. */
  function montrerErreurListe(e) { $('liste-erreur-texte').textContent = phrase(e, 'La liste n\'a pas pu être mise à jour.'); $('liste-erreur').hidden = false; }
  function masquerErreurListe() { $('liste-erreur').hidden = true; $('liste-erreur-texte').textContent = ''; }
  async function rafraichirListe(forcer) {
    let l; try { l = await source.lister(forcer === true); } catch (e) { montrerErreurListe(e); return; }
    etat.conversations = l; masquerErreurListe();
    rendreListe();
  }
  $('liste-erreur-bouton').addEventListener('click', () => rafraichirListe(true));

  /* ═══ 5. LES AUTRES ÉCRANS — des coquilles « bientôt » (étapes 3 à 5) ═════════════════════════════════════════════════════
     Ajouter un écran = remplir UNE entrée de VUES et écrire une fonction de rendu ici ; la navigation, l'état et les
     jetons ne bougent pas. */
  function rendreCoquille(cle) {
    const v = VUES[cle], sec = $('vue-' + cle);
    sec.innerHTML = '<div class="entete-vue"></div><h1 class="grand-titre" id="titre-' + cle + '">' + esc(v.titre) + '</h1>' +
      '<div class="coquille"><span class="coquille-icone">' + icone(v.icone) + '</span><h2>Bientôt disponible</h2><p>' + esc(v.texte) + (CAP.service ? ' Cet écran arrive bientôt.' : ' Cet écran n\'est pas encore dessiné dans l\'aperçu.') + '</p></div>';
  }
  function construireNavigation() {
    const lien = (cle, cls) => '<a href="#' + cle + '" class="' + cls + '" data-vue="' + cle + '">' + icone(VUES[cle].icone) + '<span>' + esc(VUES[cle].titre) + '</span></a>';
    $('nav-side').innerHTML = ORDRE.map(c => lien(c, 'side-lien')).join('');
    $('tabs').insertAdjacentHTML('beforeend', ORDRE.map(c => lien(c, 'tab')).join(''));
  }

  /* ═══ 6. LA NAVIGATION — UNE ROUTE, UNE ENTRÉE D'HISTORIQUE PAR COUCHE ═════════════════════════════════════════════════════
     La route dit tout ce qui est ouvert : la vue, la conversation, la feuille « Nouveau groupe », la photo agrandie. Chaque couche
     qu'on ouvre POUSSE une entrée (le retour système — Android, le geste d'iOS, le bouton du navigateur — la referme au lieu de
     quitter la page) ; chaque couche qu'on ferme à la main REND cette entrée (`history.back()`), et c'est `popstate` — un seul
     chemin — qui ferme vraiment. ⛔ « UN GESTE, UNE NAVIGATION » (CLAUDE.md) : cette page n'écoute AUCUN geste de balayage à elle,
     donc le navigateur n'a pas de second retour à jouer ; et un bouton qui ferme ne ferme pas ET ne navigue pas — il navigue, et
     la fermeture suit. Une entrée neuve n'est posée que si quelque chose s'ouvre : passer d'une conversation à l'autre (au bureau)
     REMPLACE l'entrée au lieu d'en empiler. */
  const memeRoute = (a, b) => !!a && !!b && a.vue === b.vue && (a.conv || null) === (b.conv || null) && !!a.feuille === !!b.feuille && (a.photo || null) === (b.photo || null) && (a.appel || null) === (b.appel || null);
  const urlDe = r => '#' + r.vue + (r.conv ? '/' + encodeURIComponent(r.conv) : '');
  function routeDepuisHash() {
    const p = location.hash.slice(1).split('/');
    let conv = null; try { conv = p[1] ? decodeURIComponent(p[1]) : null; } catch (e) { conv = null; }
    /* ⛔ `VUES[p[0]]` lit aussi la chaîne de prototypes : « #constructor » ou « #__proto__ » passaient pour des vues et laissaient les quatre masquées */
    const vue = Object.prototype.hasOwnProperty.call(VUES, p[0]) ? p[0] : 'messages';
    return { vue, conv: vue === 'messages' && p[0] === 'messages' ? conv : null, feuille: false, photo: null, appel: null };
  }
  const entree = () => (history.state && history.state.opmsg) ? history.state : null;
  function parentDe(r) {
    if (r.appel) return Object.assign({}, r, { appel: null });
    if (r.photo) return Object.assign({}, r, { photo: null });
    if (r.feuille) return Object.assign({}, r, { feuille: false });
    if (r.conv) return Object.assign({}, r, { conv: null });
    return null;
  }
  function pousser(r) {
    const h = entree();
    history.pushState({ opmsg: 1, n: h ? h.n + 1 : 1, r, p: etat.route }, '', urlDe(r));
    appliquer(r);
  }
  function remplacer(r) {
    const h = entree();
    history.replaceState({ opmsg: 1, n: h ? h.n : 0, r, p: h ? h.p : null }, '', urlDe(r));
    appliquer(r);
  }
  /* fermer la couche du dessus : on rend l'entrée qu'on avait posée — ou, arrivé par un lien direct (aucune entrée à rendre), on
     remplace par la route d'en dessous */
  function fermerCouche() {
    const parent = parentDe(etat.route); if (!parent) return;
    const h = entree();
    if (h && h.n > 0 && h.p && memeRoute(h.p, parent)) history.back(); else remplacer(parent);
  }
  /* la position de la liste est rendue PAR LA PAGE (etat.scrollListe, au retour), pas par la restauration native de l'historique : celle-ci diffère d'un
     navigateur à l'autre (Safari iOS ne la rend pas toujours sur un retour système) et masquait, ici, le retrait de notre propre mémoire (sonde, S04) */
  try { history.scrollRestoration = 'manual'; } catch (e) { /* un navigateur sans l'option garde la sienne */ }
  window.addEventListener('popstate', e => appliquer(e.state && e.state.opmsg ? e.state.r : routeDepuisHash()));

  /* appliquer(route) : l'écran DIT la route, rien d'autre. Elle ne pousse jamais d'historique — elle est jouée aussi par popstate. */
  function appliquer(r) {
    const prec = etat.route; etat.route = r;
    const racine = document.documentElement;
    if (!prec || prec.vue !== r.vue) {
      /* ⛔ la position se LIT avant de masquer la vue : une fois masquée, le document raccourcit et la fenêtre est ramenée à la hauteur de la vue d'arrivée (mesuré : 500 px lus 106) */
      if (prec) etat.posVues[prec.vue] = prec.vue === 'messages' && etat.conv ? etat.scrollListe : window.scrollY;
      ORDRE.forEach(k => { $('vue-' + k).hidden = k !== r.vue; });
      document.querySelectorAll('[data-vue]').forEach(a => { if (a.dataset.vue === r.vue) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      $('tabs').style.setProperty('--i', ORDRE.indexOf(r.vue));
      document.title = VUES[r.vue].titre + SUFFIXE_TITRE;
      if (r.vue === 'reglages' && CAP.reglages && prec && typeof chargerReglages === 'function') chargerReglages();
      /* chaque vue garde SA position (comme une barre d'onglets d'iPhone) : la liste défilée, un tour par Appels, et elle est là où on l'a laissée.
         ⛔ avec une conversation ouverte la fenêtre n'est plus la liste (iOS la ramène en haut pour le clavier) : la position de la liste est celle gardée à l'ouverture */
      if (prec) window.scrollTo(0, etat.posVues[r.vue] || 0);
    }
    racine.dataset.vue = r.vue;
    const veutConv = r.vue === 'messages' ? (r.conv || null) : null;
    if (veutConv !== etat.conv) { if (veutConv) ouvrirConv(veutConv); else fermerConv(); }
    if (r.feuille && (!etat.groupe.ouvert || etat.groupe.cle !== cleFeuille(r.feuille))) ouvrirFeuilleDom(r.feuille); else if (!r.feuille && etat.groupe.ouvert) fermerFeuilleDom();
    const cle = r.photo || null;
    if (cle !== etat.photo) { if (cle) ouvrirPhotoDom(cle); else fermerPhotoDom(); }
    /* l'appel est la couche du DESSUS : la route qui n'en porte plus le raccroche (retour système, Échap, onglet, bouton — un seul chemin, comme la photo) */
    const veutAppel = r.appel || null;
    if (veutAppel !== etat.appelId) { if (veutAppel) afficherAppel(veutAppel); else quitterAppel(); }
    synchroInert();
  }
  /* ce qui n'est pas au premier plan ne reçoit ni le focus ni le lecteur d'écran : la feuille et la photo rendent TOUT inerte,
     la conversation rend la liste inerte quand elle la recouvre (jusqu'à 1 099 px) */
  const largeBureau = matchMedia('(min-width: 1100px)');
  function synchroInert() {
    $('app').inert = !!(etat.groupe.ouvert || etat.photo || etat.menu);
    /* un appel recouvre la liste ET la conversation (au bureau, la barre latérale reste, et reste active : l'onglet qu'on touche raccroche) */
    $('contenu').inert = !!(etat.appelId || (etat.conv && !largeBureau.matches));
    $('conv-ecran').inert = !!etat.appelId; $('conv-vide').inert = !!etat.appelId;
  }
  if (largeBureau.addEventListener) largeBureau.addEventListener('change', synchroInert);

  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-vue]');
    if (a) {
      e.preventDefault();
      const r = { vue: a.dataset.vue, conv: null, feuille: false, photo: null, appel: null };
      /* un onglet touché PENDANT un appel prend la place de l'entrée de l'appel (il raccroche) : pas d'entrée morte « appel terminé » qu'un retour ferait retomber dessus */
      if (memeRoute(etat.route, r)) window.scrollTo(0, 0); else if (etat.appelId) remplacer(r); else pousser(r);
      return;
    }
    const o = e.target.closest('[data-ouvrir]');
    if (o) ouvrirDepuisListe(o.dataset.ouvrir, o);
  });

  /* ═══ 7. LA CONVERSATION ════════════════════════════════════════════════════════════════════════════════════════════════════ */
  function majBadge() {
    const n = etat.conversations.filter(c => c.id !== etat.conv && c.nonLu).length;
    const b = $('conv-badge');
    b.hidden = n === 0; b.textContent = n;
    $('conv-retour').setAttribute('aria-label', n ? 'Retour aux conversations, ' + n + (n === 1 ? ' autre conversation non lue' : ' autres conversations non lues') : 'Retour aux conversations');
  }
  function ouvrirDepuisListe(id, declencheurEl) {
    etat.declencheurConv = declencheurEl;
    const r = Object.assign({}, etat.route, { vue: 'messages', conv: id, feuille: false, photo: null, appel: null });
    if (etat.conv) remplacer(r); else pousser(r);
  }
  function rendreEntete(c) {
    $('conv-titre').innerHTML = avatar(c) + '<span class="conv-titre-nom"><span>' + esc(nomConv(c)) + '</span>' + CHEVRON + '</span>';
    $('conv-titre').setAttribute('aria-label', nomConv(c) + ' — infos du ' + genreConv(c) + (CAP.groupeInfos ? '' : ' (bientôt)'));
    $('conv-cam').setAttribute('aria-label', 'Appel vidéo avec ' + c.nom);
  }
  const nomAuteur = id => { const c = contactDe(id); return c ? prenom(c) : '?'; };

  /* un message rend { h, st } : h = son balisage SANS le statut, st = « Lu 14:06 » / « Envoyé » / null. Le statut change seul (la lecture arrive après l'envoi) :
     il se met à jour EN PLACE, sans refaire la bulle ni recréer sa photo (peindreMessages) */
  function htmlMessage(c, m, premier, estDernierEnvoye) {
    const moi = m.auteur === MOI.id;
    const sens = moi ? 'envoyee' : 'recue';
    let h = '<div class="msg ' + (moi ? 'de-moi' : 'de-autre') + (premier ? '' : ' suite') + '" data-mid="' + esc(m.id) + '">';
    if (!moi && multi(c) && premier) h += '<span class="msg-nom">' + esc(nomAuteur(m.auteur)) + '</span>';
    if (m.reponse && !m.supprime) h += citationHtml(m.reponse);
    const debutCorps = h.length;
    if (m.photos) {
      const une = m.photos.length === 1;
      h += '<span class="photos' + (une ? ' une' : '') + '">' + m.photos.map((p, i) => blob(p.url) ?
        '<button type="button" class="photo presse" data-photo="' + esc(m.id) + '|' + i + '"' + (une ? styleUne(p) : '') + ' aria-label="Agrandir la photo ' + (i + 1) + ' sur ' + m.photos.length + '"><img src="' + esc(p.url) + '" alt="Photo envoyée par ' + esc(moi ? 'vous' : nomAuteur(m.auteur)) + '"></button>' :
        photoAttente(p, i, m.photos.length, une)).join('') + '</span>';
    } else if (m.vocal) {
      h += '<button type="button" class="vocal ' + sens + ' presse" data-lire="' + esc(m.id) + '" aria-label="Lire le message vocal de ' + duree(m.vocal.dur) + '">' +
        '<span class="vocal-disque">' + icone('i-play', 'plein play') + icone('i-pause', 'plein pause') + '</span>' +
        '<span class="onde" aria-hidden="true">' + (m.vocal.bars && m.vocal.bars.length ? m.vocal.bars : [8, 14, 18, 10, 16, 6, 12, 18, 9, 14]).map(n => '<i style="height:' + Math.max(4, Math.min(20, n | 0)) + 'px"></i>').join('') + '</span>' +
        '<span class="vocal-duree">' + duree(m.vocal.dur) + '</span></button>';
    } else if (m.fichier) {
      h += '<button type="button" class="fichier ' + sens + ' presse" data-fichier="' + esc(m.id) + '"' + (m.fichier.piece ? '' : ' aria-disabled="true"') + ' aria-label="Télécharger le fichier ' + esc(m.fichier.nom) + ', ' + esc(tailleTexte(m.fichier.taille)) + '">' +
        '<span class="fichier-icone">' + icone('i-fichier') + '</span><span class="fichier-texte"><span class="fichier-nom" dir="auto">' + esc(m.fichier.nom) + '</span><span class="fichier-taille">' + esc(tailleTexte(m.fichier.taille)) + '</span></span></button>';
    } else if (m.supprime) {
      h += '<span class="bulle supprimee ' + sens + '" dir="auto">Message supprimé</span>';
    } else {
      h += '<span class="bulle ' + sens + '" dir="auto">' + esc(m.texte) + '</span>';
    }
    /* version servie : le corps du message et son bouton d'actions vont dans UNE rangée (le bouton se pose à côté de la bulle) ; l'aperçu garde son balisage d'origine, octet pour octet */
    if (CAP.actionsMessage && !m.attente) h = h.slice(0, debutCorps) + '<span class="msg-rang">' + h.slice(debutCorps) + '<button type="button" class="msg-plus presse" data-actions="' + esc(m.id) + '" aria-haspopup="dialog" aria-label="Actions du message">' + icone('i-points') + '</button></span>';
    if (m.attente && m.echec && typeof source.reessayer === 'function') h += echecHtml(m);
    if (m.reactions && m.reactions.length) h += reactionsHtml(m);
    if (m.modifie && !m.supprime) h += '<span class="mention-modifie">Modifié</span>';
    /* le statut DIT VRAI : « Envoi… » seulement quand des octets partent vraiment (la source le sait), « En attente de connexion… » quand rien ne part ; une pièce en échec a sa phrase et ses deux boutons, pas de statut */
    return { h: h + '</div>', st: estDernierEnvoye ? (m.attente ? (m.echec ? null : m.envoi ? 'Envoi…' : 'En attente de connexion…') : m.lu ? (m.lu === true ? 'Lu' : 'Lu ' + FMT_HEURE.format(m.lu)) : 'Envoyé') : null };
  }
  /* ⛔ UNE PHOTO SEULE GARDE SES PROPORTIONS (relecture du testeur) : sa boîte tient dans 240 × 320 ; une image minuscule est agrandie du double au plus, mais jamais laissée sous 72 px de côté ; un panorama
     extrême garde sa largeur — il est vu ENTIER (`contain`), jamais coupé. La largeur et le rapport sont posés en ligne (la boîte d'une photo à peine arrivée est déjà la bonne : rien ne saute). Sans dimensions
     connues (l'aperçu), c'est la boîte d'avant (200 × 150, en CSS). Les nombres viennent du service (entiers bornés) et sont ramenés à des entiers ici. */
  const UNE_LARGE = 240, UNE_HAUTE = 320, UNE_PLANCHER = 72, UNE_AGRANDIR = 2;
  function styleUne(p) {
    const w = p ? p.w | 0 : 0, h = p ? p.h | 0 : 0;
    if (!(w > 0 && h > 0)) return '';
    const k = Math.min(UNE_AGRANDIR, UNE_LARGE / w, UNE_HAUTE / h);
    const lg = Math.max(UNE_PLANCHER, Math.round(w * k)), ht = Math.max(UNE_PLANCHER, Math.round(h * k));
    return ' style="width:' + lg + 'px;aspect-ratio:' + lg + ' / ' + ht + '"';
  }
  /* une pièce que le service refuse POUR L'INSTANT (trop de demandes, espace plein, lecture seule, envoi trop lent) : elle reste, avec la phrase du service — qui peut être ailleurs que sur l'avis,
     lequel disparaît seul — et c'est à la personne de dire quand réessayer ou d'y renoncer */
  function echecHtml(m) {
    return '<span class="echec"><span class="echec-texte" dir="auto">Pas envoyé : ' + esc(m.echec) + '</span><span class="echec-actions">' +
      '<button type="button" class="mini presse" data-reessayer="' + esc(m.cid) + '">Réessayer</button><button type="button" class="mini danger presse" data-annuler="' + esc(m.cid) + '">Annuler</button></span></span>';
  }
  /* une photo dont l'adresse n'est pas (encore) là : la case garde la taille de la photo. Dans l'aperçu, c'est un exemple ; avec le service, elle se charge toute seule (« chargement »),
     attend le toucher (« attente » : seules les dernières photos d'une conversation sont lues d'avance) ou dit qu'elle n'est plus disponible. */
  function photoAttente(p, i, n, une) {
    const st = une ? styleUne(p) : '';       // la case d'une photo seule a déjà SES proportions : rien ne saute quand l'image arrive
    if (!p.piece) return '<span class="photo"' + st + ' role="img" aria-label="Photo d\'exemple">' + icone('i-image') + '</span>';
    /* ⛔ « Photo indisponible » se LIT (relecture du testeur : une icône seule, un libellé pour le seul lecteur d'écran) : le texte est dans la case */
    if (p.etat === 'indisponible') return '<span class="photo indisponible"' + st + ' role="img" aria-label="Photo indisponible">' + icone('i-image') + '<span class="photo-etat" aria-hidden="true">Photo indisponible</span></span>';
    return '<button type="button" class="photo ' + (p.etat === 'chargement' ? 'chargement' : 'attente') + ' presse" data-charger="' + esc(p.piece) + '"' + st + ' aria-label="' + (p.etat === 'chargement' ? 'Photo en cours de chargement' : 'Charger la photo ' + (i + 1) + ' sur ' + n) + '">' + icone('i-image') + '</button>';
  }
  /* la réponse citée au-dessus de la bulle, et les réactions dessous : du texte venu d'un tiers, échappé comme tout le reste */
  function citationHtml(r) { return '<span class="citation" dir="auto"><b>' + esc(r.nom || '') + '</b>' + esc(r.texte || '') + '</span>'; }
  function reactionsHtml(m) {
    return '<span class="reactions">' + m.reactions.map(r => '<button type="button" class="reac' + (r.moi ? ' moi' : '') + '" data-reagir="' + esc(m.id) + '" data-emoji="' + esc(r.emoji) + '" aria-pressed="' + (r.moi ? 'true' : 'false') +
      '" aria-label="' + esc(r.emoji + ', ' + r.n + (r.n > 1 ? ' réactions' : ' réaction') + (r.moi ? ', dont la tienne' : '')) + '">' + esc(r.emoji) + (r.n > 1 ? ' ' + r.n : '') + '</button>').join('') + '</span>';
  }
  function partiesMessages(c) {
    const P = []; let prec = null;
    const dernierEnvoye = c.messages.filter(m => m.auteur === MOI.id && !m.systeme).pop();
    c.messages.forEach(m => {
      const coupure = !prec || m.t - prec.t >= 3600000 || debutDeJour(m.t) !== debutDeJour(prec.t);
      if (coupure) P.push({ h: '<div class="datage">' + esc(libelleDatage(m.t)) + '</div>', st: null });
      if (m.systeme) { P.push({ h: '<div class="systeme">' + esc(m.texte) + '</div>', st: null }); prec = m; return; }
      const serie = !coupure && prec && !prec.systeme && prec.auteur === m.auteur && m.t - prec.t < 300000;
      P.push(htmlMessage(c, m, !serie, dernierEnvoye && m.id === dernierEnvoye.id));
      prec = m;
    });
    if (c.saisie) P.push({ h: '<div class="saisie-ind" role="img" aria-label="' + esc(nomAuteur(c.saisie.contact)) + ' est en train d\'écrire"><i></i><i></i><i></i></div>', st: null });
    return P;
  }
  function majStatut(el, st) {
    let s = el.querySelector(':scope > .statut');
    if (st == null) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('span'); s.className = 'statut'; el.appendChild(s); }
    if (s.textContent !== st) s.textContent = st;
  }
  /* ⛔ on ne refait pas le fil à chaque événement : refaire `innerHTML` recréait les photos (scintillement), perdait le focus d'une bulle et la sélection d'un
     texte. Chaque morceau garde le balisage qui l'a produit (`__h`) ; seul ce qui a CHANGÉ est remplacé, le reste est le même nœud. */
  function peindreMessages(parts) {
    const col = $('conv-messages'), tpl = document.createElement('template');
    const actif = document.activeElement, cle = actif && col.contains(actif) ? (actif.dataset.lire ? 'lire' : actif.dataset.photo ? 'photo' : null) : null, val = cle ? actif.dataset[cle] : null;
    for (let i = 0; i < parts.length; i++) {
      const vieux = col.children[i];
      if (vieux && vieux.__h === parts[i].h) { majStatut(vieux, parts[i].st); continue; }
      tpl.innerHTML = parts[i].h; const neuf = tpl.content.firstElementChild; neuf.__h = parts[i].h; majStatut(neuf, parts[i].st);
      if (vieux) col.replaceChild(neuf, vieux); else col.appendChild(neuf);
    }
    while (col.children.length > parts.length) col.removeChild(col.lastChild);
    if (cle && !col.contains(document.activeElement)) { const b = col.querySelector('[data-' + cle + '="' + val.replace(/"/g, '') + '"]'); if (b) b.focus({ preventScroll: true }); }
  }
  /* pourquoi on ne peut pas écrire ici (le texte), ou '' : un groupe d'annonces dont on n'est pas admin, un compte supprimé */
  const compoFerme = c => !c ? '' : c.supprime ? 'Ce compte a été supprimé : tu ne peux plus lui écrire.' : (c.annoncesSeulement && c.admins.indexOf(MOI.id) < 0 ? 'Seuls les admins peuvent écrire dans ce groupe.' : '');
  function rendreConv(c, force) {
    const fil = $('conv-fil');
    const colle = force || etat.forcerBas || (fil.scrollHeight - fil.scrollTop - fil.clientHeight < 80);
    etat.forcerBas = false;
    etat.convDonnees = c;
    rendreEntete(c);
    peindreMessages(partiesMessages(c));
    $('conv-messages').setAttribute('aria-busy', 'false');
    $('precedents').hidden = !(CAP.historique && c.aPlus);
    /* « Seuls les admins écrivent » : une personne qui n'est pas admin lit, elle n'écrit pas */
    const ferme = !!compoFerme(c);
    $('compo').hidden = ferme || !!enr.etat && enr.etat !== 'repos'; $('compo-ferme').hidden = !ferme;
    if (ferme) $('compo-ferme').textContent = compoFerme(c);
    appliquerLecture();
    if (colle) defilerBas();
  }
  function defilerBas() { const f = $('conv-fil'); f.scrollTop = f.scrollHeight; }
  const trouverMessage = mid => etat.convDonnees && etat.convDonnees.messages.find(m => m.id === mid);

  async function ouvrirConv(id) {
    const jeton = ++etat.jeton;
    /* ⛔ passer d'une conversation à l'autre (maître-détail) ne passe PAS par fermerConv : la prise de son et la lecture de l'ancienne se coupent ici,
       sinon le vocal enregistré chez Camille partait chez Hugo (mesuré au bureau, 1er octobre 2026) */
    if (etat.conv && etat.conv !== id) { arreterLecture(); annulerEnregistrement(); }
    if (!etat.conv) etat.scrollListe = window.scrollY;
    etat.conv = id; etat.convDonnees = null; etat.contexte = null; majContexte(); fermerMenu();
    document.documentElement.dataset.conv = '1';
    const resume = etat.conversations.find(c => c.id === id);
    if (resume) rendreEntete(resume);
    $('conv-messages').innerHTML = ''; $('conv-messages').setAttribute('aria-busy', 'true');
    $('saisie').value = etat.brouillons[id] || ''; ajusterSaisie(); majBoutons(); masquerAvis();
    rendreListe();
    let c = null, panne = null; try { c = await source.ouvrir(id); } catch (e) { panne = e; }
    if (jeton !== etat.jeton) return;                       // une autre conversation (ou la liste) a pris la place pendant l'attente
    /* ⛔ un échec de chargement (réseau, refus du service) n'est PAS « cette conversation n'existe plus » : on dit ce qui s'est passé */
    if (panne) { remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }); mot(phrase(panne, 'La conversation n\'a pas pu être ouverte.')); return; }
    if (!c) { remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }); mot('Cette conversation n\'existe plus.'); return; }
    rendreConv(c, true);
    synchroInert();
    if (matchMedia('(pointer: fine)').matches) $('saisie').focus({ preventScroll: true }); else $('conv-ecran').focus({ preventScroll: true });
    try { await source.marquerLu(id); } catch (e) { /* la source le dira par ecouter */ }
  }
  function fermerConv() {
    etat.jeton++;
    const id = etat.conv;
    if (id) etat.brouillons[id] = $('saisie').value;
    etat.conv = null; etat.convDonnees = null; etat.contexte = null; majContexte(); fermerMenu();
    delete document.documentElement.dataset.conv;
    arreterLecture(); annulerEnregistrement();
    rendreListe();
    synchroInert();
    const dec = etat.declencheurConv; etat.declencheurConv = null;
    requestAnimationFrame(() => {
      if (etat.route && etat.route.vue === 'messages') window.scrollTo(0, etat.scrollListe);
      const ligne = id && document.querySelector('[data-ouvrir="' + id.replace(/"/g, '') + '"]');
      if (ligne) ligne.focus({ preventScroll: true }); else if (dec && dec.isConnected && dec.focus) dec.focus({ preventScroll: true });
    });
  }
  async function rafraichirConv() {
    const id = etat.conv; if (!id) return;
    const jeton = etat.jeton;
    let c; try { c = await source.ouvrir(id); } catch (e) { if (jeton === etat.jeton) avis(phrase(e, 'La conversation n\'a pas pu être mise à jour.')); return; }
    if (jeton !== etat.jeton || !c) return;
    /* ce qui est arrivé d'un AUTRE depuis le dernier rendu : annoncé au lecteur d'écran, et lu (la conversation est sous les yeux) — sinon le point « non lu »
       restait à côté de la conversation affichée. Jamais au premier rendu (ouvrirConv le marque lu lui-même). */
    const avant = etat.convDonnees ? new Set(etat.convDonnees.messages.map(m => m.id)) : null;
    const recus = avant ? c.messages.filter(m => !avant.has(m.id) && m.auteur !== MOI.id && !m.systeme) : [];
    rendreConv(c, false);
    if (recus.length) {
      annoncer(recus[recus.length - 1]);
      if (document.visibilityState === 'visible') { try { await source.marquerLu(id); } catch (e) { /* la source le dira par ecouter */ } }
    }
  }
  /* ⛔ ce qui est arrivé pendant que l'onglet était CACHÉ se lit au retour : `rafraichirConv` ne marque lu que si la page est visible À L'ARRIVÉE, et rien ne le refaisait
     ensuite — le point restait « non lu », et l'autre ne voyait jamais « Lu » (relecture du testeur, D4). */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !etat.conv || typeof source.marquerLu !== 'function') return;
    Promise.resolve().then(() => source.marquerLu(etat.conv)).catch(() => { /* la source le dit si c'est refusé */ });
  });
  function annoncer(m) {
    const corps = m.texte || (m.photos ? (m.photos.length > 1 ? m.photos.length + ' photos' : 'une photo') : m.vocal ? 'un message vocal de ' + duree(m.vocal.dur) : m.fichier ? 'le fichier ' + m.fichier.nom : '');
    const r = $('conv-annonce'); r.textContent = '';
    setTimeout(() => { r.textContent = nomAuteur(m.auteur) + ' : ' + corps; }, 60);
  }
  $('conv-retour').addEventListener('click', fermerCouche);        // ⛔ pas de garde ici : « Retour » est en haut à gauche, rien de ce que la garde protège n'a jamais été là — la garder avalait un « Retour » tapé juste après un envoi
  /* la caméra de la conversation lance l'appel VIDÉO de CETTE conversation (les autres membres, jamais moi) ; raccrocher revient ici, d'où l'appel est parti */
  $('conv-cam').addEventListener('click', () => {
    if (retap()) return;
    if (!CAP.appels) { mot('Les appels arrivent bientôt'); return; }
    const c = etat.convDonnees || etat.conversations.find(x => x.id === etat.conv); if (!c) return;
    lancerAppel({ membres: c.membres.filter(x => x !== MOI.id), video: true, conv: c.id }, $('conv-cam'));
  });
  $('conv-titre').addEventListener('click', () => {
    if (CAP.groupeInfos && etat.conv) { declencheur = $('conv-titre'); pousser(Object.assign({}, etat.route, { feuille: 'convinfo:' + etat.conv })); return; }
    mot('Les infos du ' + (etat.convDonnees ? genreConv(etat.convDonnees) : 'contact') + ' arrivent bientôt');
  });

  /* ── la saisie : un VRAI champ, qui grandit jusqu'à 5 lignes ── */
  function ajusterSaisie() {
    const ta = $('saisie');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, parseFloat(getComputedStyle(ta).maxHeight) || 124) + 'px';
  }
  function majBoutons() {
    const a = $('saisie').value.trim().length > 0;
    $('envoyer').hidden = !a; $('compo-micro').hidden = a;
  }
  const MESSAGES_ERREUR = { interdit: 'Seuls les admins peuvent écrire dans ce groupe.', 'trop-long': 'Ce message est trop long (4 000 signes au plus).', introuvable: 'Cette conversation n\'existe plus.' };
  let minAvis = 0;
  function avis(texte) {
    clearTimeout(minAvis);
    const a = $('avis'); a.textContent = texte; a.hidden = false;
    minAvis = setTimeout(masquerAvis, 7000);
  }
  function masquerAvis() { clearTimeout(minAvis); $('avis').hidden = true; $('avis').textContent = ''; }
  /* `cible` : la conversation POUR laquelle le geste a commencé (un vocal démarré chez Camille part chez Camille, même si l'on a changé de conversation entre-temps) */
  async function envoi(brouillon, cible) {
    const id = cible || etat.conv; if (!id) return false;
    if (id === etat.conv) etat.forcerBas = true;
    try { await source.envoyer(id, brouillon); return true; }
    catch (e) { etat.forcerBas = false; avis(e && e.dit ? phrase(e) : (MESSAGES_ERREUR[e && e.code] || 'Le message n\'a pas pu être envoyé.')); return false; }   // ⛔ un refus du service se dit avec SA phrase (« réessaie dans 40 s ») : seule une erreur de l'aperçu garde les trois phrases d'avant
  }
  async function envoyerTexte() {
    if (etat.envoiEnCours) { etat.envoiSuivant = true; return; }     // deux clics dans le même instant ne postent pas deux messages ; un toucher pendant l'attente n'est pas perdu : le message suivant part ensuite
    const ta = $('saisie'), t = ta.value.replace(/\s+$/, '');
    if (!t.trim()) return;
    const nt = nSignes(t);
    if (nt > TEXTE_MAX) { avis(texteTropLong(nt)); return; }
    etat.envoiEnCours = true;
    let refuse = false;
    const id = etat.conv, ctx = etat.contexte;
    /* ⛔ le champ se vide AVANT l'attente, pas après : la réponse du service peut mettre une seconde (4G), et ce qu'on a tapé entre-temps — le message SUIVANT — était effacé
       quand elle arrivait (mesuré : deux messages enchaînés, le second disparaissait du champ). Un envoi refusé rend le texte à la personne, sauf si elle a déjà écrit autre chose. */
    ta.value = ''; delete etat.brouillons[id]; ajusterSaisie(); majBoutons();
    try {
      let ok;
      if (ctx && ctx.type === 'modif') {
        try { await source.modifier(id, ctx.mid, t); ok = true; }
        catch (e) { ok = false; avis(phrase(e, 'La modification n\'a pas pu être enregistrée.')); }
      } else ok = await envoi(ctx && ctx.type === 'reponse' ? { texte: t, reponse: ctx.mid } : { texte: t });
      if (!ok) {
        refuse = true;
        if (etat.conv === id && !ta.value) { ta.value = t; etat.brouillons[id] = t; ajusterSaisie(); majBoutons(); }
        else if (!etat.brouillons[id]) etat.brouillons[id] = t;
        return;
      }
      if (ctx && etat.contexte === ctx) { etat.contexte = null; majContexte(); }
      masquerAvis();
    } finally {
      etat.envoiEnCours = false;
      const suivant = etat.envoiSuivant; etat.envoiSuivant = false;
      /* ⛔ un texte attendait : il part — SAUF s'il est celui qu'on vient de voir REFUSER (le renvoyer en boucle). Un envoi RÉUSSI ne bloque pas un message identique : « ok » puis « ok »
         250 ms plus tard, c'est deux messages (le second était avalé, relecture du testeur, D2) */
      if (suivant && ta.value.trim() && !(refuse && ta.value.replace(/\s+$/, '') === t)) envoyerTexte();
    }
  }
  /* ⛔ une réponse ou une modification se compose DANS la saisie : une bande au-dessus dit laquelle, une croix l'abandonne (Échap aussi) */
  function majContexte() {
    const x = etat.contexte, boite = $('compo-contexte');
    boite.hidden = !x;
    const t = $('compo-contexte-texte'); t.textContent = '';
    if (!x) return;
    const b = document.createElement('b'); b.textContent = x.type === 'modif' ? 'Modifier le message' : 'Réponse à ' + x.nom;
    t.appendChild(b); t.appendChild(document.createTextNode(' ' + x.texte));
  }
  function annulerContexte() {
    const x = etat.contexte; etat.contexte = null; majContexte();
    if (x && x.type === 'modif') { $('saisie').value = etat.brouillons[etat.conv] || ''; ajusterSaisie(); majBoutons(); }
  }
  $('compo-contexte-x').addEventListener('click', () => { annulerContexte(); $('saisie').focus({ preventScroll: true }); });
  /* ⛔ un texte plus long que la limite ne se COUPE pas en silence (le champ garde ce qu'on a collé, la fin comprise) : on le dit tout de suite, et l'envoi attend */
  /* ⛔ des SIGNES, pas des unités UTF-16 : le service compte les points de code (8 000 émojis passent), et la page refusait dès 4 001 en annonçant un chiffre faux */
  const nSignes = t => t.length <= TEXTE_MAX ? t.length : Array.from(t).length;
  const texteTropLong = n => 'Ce message est trop long : ' + (n - TEXTE_MAX).toLocaleString('fr-FR') + ' signes en trop (' + TEXTE_MAX.toLocaleString('fr-FR') + ' au plus).';
  $('saisie').addEventListener('input', () => {
    ajusterSaisie(); majBoutons(); if (etat.conv) etat.brouillons[etat.conv] = $('saisie').value;
    const n = nSignes($('saisie').value);
    if (n > TEXTE_MAX) avis(texteTropLong(n)); else if (/trop long/.test($('avis').textContent)) masquerAvis();
    /* la frappe part aux autres (éphémère, jamais stockée) : la source la limite à une par 2 s */
    if (CAP.saisie && etat.conv && $('saisie').value.trim() && !(etat.contexte && etat.contexte.type === 'modif') && typeof source.saisie === 'function') source.saisie(etat.conv, true);
  });
  $('saisie').addEventListener('blur', () => { if (CAP.saisie && etat.conv && typeof source.saisie === 'function') source.saisie(etat.conv, false); });
  /* un second toucher qui suit de près le premier tombe sur ce que le premier a LAISSÉ à sa place : la flèche d'envoi disparue, c'est le micro qui reçoit le
     toucher (et démarre une prise de son) ; la croix de la photo fermée, c'est la caméra. Pendant 400 ms après un geste qui change ce qu'il y a sous le doigt,
     les commandes qui prennent SA place (micro, « + », caméra) ne répondent pas (mesuré : double toucher sur la flèche → enregistrement lancé, sur iPhone, Android et au bureau). */
  let retapJusqua = 0;
  const armerRetap = () => { retapJusqua = Date.now() + 400; };
  const retap = () => Date.now() < retapJusqua;
  $('saisie').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    /* au bureau (une souris) : Entrée envoie, Maj+Entrée va à la ligne ; au doigt, Entrée va à la ligne (la flèche envoie) ;
       Ctrl/Cmd+Entrée envoie partout */
    if ((matchMedia('(pointer: fine)').matches && !e.shiftKey && !e.altKey) || e.ctrlKey || e.metaKey) { e.preventDefault(); envoyerTexte(); }
  });
  $('envoyer').addEventListener('mousedown', e => e.preventDefault());        // la flèche ne vole pas le focus (le clavier reste ouvert)
  $('envoyer').addEventListener('click', () => { armerRetap(); envoyerTexte(); });

  /* ── une photo : réduite par un canvas (le fichier d'origine ne part nulle part), validée par son décodage ──
     ⛔ SAUF UN GIF (relecture du testeur : un GIF animé devenait une image fixe, sans que rien ne le dise) : jusqu'au poids maximum d'une photo, il part TEL QUEL — le service en retire les
     commentaires et les extensions inconnues, et GARDE l'animation. Au-delà, ou démesuré, il part en image fixe et la page le DIT. */
  /* un fichier INCOMPLET (téléchargement interrompu) se décode quand même en partie : on en envoyait la moitié, grise. Là où la fin d'un format est sans ambiguïté
     (PNG : le morceau IEND ; GIF : l'octet 0x3B ; WebP : la taille annoncée), on la vérifie. Pas pour le JPEG : des octets peuvent suivre légitimement son marqueur de fin
     (photos « en mouvement », vignettes) et on refuserait de vraies photos. */
  async function fichierTronque(f) {
    const oct = async (a, b) => new Uint8Array(await f.slice(a, b).arrayBuffer()), egal = (t, m, o) => m.every((x, i) => t[o + i] === x);
    const tete = await oct(0, 12), fin = await oct(Math.max(0, f.size - 12), f.size);
    if (egal(tete, [0x89, 0x50, 0x4e, 0x47], 0)) return !(fin.length >= 8 && egal(fin, [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], fin.length - 8));
    if (egal(tete, [0x47, 0x49, 0x46], 0)) return fin[fin.length - 1] !== 0x3b;
    if (egal(tete, [0x52, 0x49, 0x46, 0x46], 0) && egal(tete, [0x57, 0x45, 0x42, 0x50], 8)) return (tete[4] | tete[5] << 8 | tete[6] << 16 | tete[7] << 24) + 8 > f.size;
    return false;
  }
  /* `cible` (octets) : on baisse la qualité par pas, puis la taille, jusqu'à l'atteindre — un plancher (qualité .5, 640 px) évite de rendre une bouillie. Sans cible (l'aperçu), un seul passage. */
  const estGif = async f => { const t = new Uint8Array(await f.slice(0, 6).arrayBuffer()); return t[0] === 0x47 && t[1] === 0x49 && t[2] === 0x46 && t[3] === 0x38 && (t[4] === 0x37 || t[4] === 0x39) && t[5] === 0x61; };
  const GIF_PIXELS_MAX = 16e6;      // 4 000 × 4 000 : au-delà, même un petit fichier se décompresse en centaines de Mo chez celui qui le reçoit
  async function reduireImage(fichier, cote, qualite, cible, gifMax) {
    if (!fichier || fichier.size > 40 * 1048576) throw new Error('trop-lourd');
    if (await fichierTronque(fichier)) throw new Error('illisible');
    let img;
    try { img = await createImageBitmap(fichier, { imageOrientation: 'from-image' }); }
    catch (e) {
      /* ⛔ `onload` suffit à une image dont l'EN-TÊTE est bon et le corps abîmé : elle « charge », mesure 300 × 200, et ne dessine RIEN — une photo blanche partait
         comme si de rien n'était (mesuré le 1er octobre 2026). `decode()` rejette, lui, une image qu'on ne peut pas décoder. */
      img = await new Promise((ok, ko) => {
        const u = URL.createObjectURL(fichier), i = new Image(), fini = bon => { URL.revokeObjectURL(u); if (bon) ok(i); else ko(new Error('illisible')); };
        i.src = u;
        if (i.decode) i.decode().then(() => fini(true), () => fini(false)); else { i.onload = () => fini(true); i.onerror = () => fini(false); }
      });
    }
    const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
    if (!w0 || !h0 || w0 * h0 > 100e6) throw new Error('illisible');       // une image « vide » ou démesurée (bombe de décompression)
    let gifTropLourd = false;
    if (gifMax > 0 && await estGif(fichier)) {
      if (fichier.size <= gifMax && w0 * h0 <= GIF_PIXELS_MAX) { if (img.close) img.close(); return { blob: fichier, w: w0, h: h0, gif: true, gifTropLourd: false }; }
      gifTropLourd = true;
    }
    const k = Math.min(1, cote / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const peindre = (lg, ht, verifier) => {
      const cv = document.createElement('canvas'); cv.width = lg; cv.height = ht;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, lg, ht);
      /* la preuve qu'il y avait une image : le dessin a posé au moins un point (le fond blanc, lui, se pose APRÈS — un JPEG n'a pas de transparence à garder) */
      if (verifier) {
        const px = cx.getImageData(0, 0, lg, ht).data; let dessine = false;
        for (let i = 3; i < px.length; i += 4 * 29) if (px[i]) { dessine = true; break; }
        if (!dessine) throw new Error('illisible');
      }
      cx.globalCompositeOperation = 'destination-over'; cx.fillStyle = '#fff'; cx.fillRect(0, 0, lg, ht);
      return cv;
    };
    const enBlob = (cv, q) => new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    let cv; try { cv = peindre(w, h, true); } catch (er) { if (img.close) img.close(); throw er; }
    let q = qualite, b = await enBlob(cv, q);
    if (cible) {
      for (let tours = 0; b && b.size > cible && tours < 8; tours++) {
        if (q > .52) q = Math.max(.5, q - .08);
        else if (Math.max(cv.width, cv.height) > 640) cv = peindre(Math.max(1, Math.round(cv.width * .8)), Math.max(1, Math.round(cv.height * .8)), false);
        else break;
        b = await enBlob(cv, q);
      }
    }
    if (img.close) img.close();
    if (!b) throw new Error('illisible');
    return { blob: b, w: cv.width, h: cv.height, gif: false, gifTropLourd };
  }
  /* ce que le service accepte d'un envoi de photos : combien par message, et le poids d'un GIF gardé tel quel (= le maximum d'une photo). L'aperçu n'a pas de service : dix photos, jamais de GIF animé. */
  async function limitesPhotos() {
    let l = null;
    try { l = typeof source.limitesPieces === 'function' ? await source.limitesPieces() : null; } catch (er) { l = null; }
    return { parMessage: l && l.par_message > 0 ? l.par_message | 0 : 10, gifMax: l && l.photo_max > 0 ? l.photo_max : 0 };
  }
  $('compo-plus').addEventListener('click', () => {          // la corbeille de la barre d'enregistrement est juste là, au même endroit
    if (retap()) return;
    if (!CAP.photos) { mot('Les photos arrivent bientôt'); return; }
    if (CAP.fichiers) { ouvrirMenuPlus(); return; }
    $('compo-fichier').click();
  });
  /* « + » avec des fichiers : une petite feuille Photo / Fichier, le même cadre que le menu d'un message (Échap, le fond et chaque geste la referment) */
  function ouvrirMenuPlus() {
    if (etat.menu || !etat.conv) return;
    etat.menu = { plus: true, declencheur: $('compo-plus'), t: Date.now() };
    $('menu-msg').setAttribute('aria-label', 'Joindre');
    $('menu-msg').innerHTML = '<button type="button" class="menu-action" data-plus="photo">Photo</button><button type="button" class="menu-action" data-plus="fichier">Fichier</button>';
    $('menu-fond').hidden = false;
    synchroInert();
    $('menu-msg').querySelector('button').focus({ preventScroll: true });
  }
  $('compo-fichier').addEventListener('change', async e => {
    const choisies = Array.from(e.target.files || []); e.target.value = '';
    const id = etat.conv; if (!id || !choisies.length) return;
    const lim = await limitesPhotos();
    /* ⛔ jamais « les dix premières, le reste en silence » (relecture du testeur : la onzième disparaissait sans un mot) */
    const fichiers = choisies.slice(0, lim.parMessage), enTrop = choisies.length - fichiers.length;
    const bonnes = []; let ratees = 0, lourds = 0;
    for (const f of fichiers) {
      try { const r = await reduireImage(f, 1600, .82, 250 * 1024, lim.gifMax); if (r.gifTropLourd) lourds++; bonnes.push({ blob: r.blob, url: URL.createObjectURL(r.blob), w: r.w, h: r.h }); } catch (er) { ratees++; }
    }
    const dits = [];
    if (enTrop) dits.push(lim.parMessage + ' photos au plus par envoi : ' + (enTrop === 1 ? 'la ' + (lim.parMessage + 1 === 11 ? 'onzième' : (lim.parMessage + 1) + 'e') + ' n\'a pas été envoyée.' : 'les ' + enTrop + ' dernières n\'ont pas été envoyées.'));
    if (ratees) dits.push(ratees === 1 ? 'Une image n\'a pas pu être lue — elle n\'a pas été envoyée.' : ratees + ' images n\'ont pas pu être lues — elles n\'ont pas été envoyées.');
    if (lourds) dits.push(lourds === 1 ? 'Un GIF était trop lourd pour rester animé : il est parti sans mouvement.' : lourds + ' GIF étaient trop lourds pour rester animés : ils sont partis sans mouvement.');
    if (dits.length) avis(dits.join(' '));
    if (bonnes.length && id === etat.conv && !(await envoi({ photos: bonnes }))) bonnes.forEach(p => URL.revokeObjectURL(p.url));
  });
  /* un fichier : n'importe quoi, tel quel (le service juge ce que c'est, le sert toujours en pièce jointe, jamais en ligne). Trop lourd, il est refusé par la source AVANT tout envoi. */
  $('compo-doc').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    const id = etat.conv; if (!id || !f) return;
    if (!(f.size > 0)) { avis('Ce fichier est vide : il n\'a pas été envoyé.'); return; }
    await envoi({ fichier: { blob: f, nom: f.name || 'fichier', taille: f.size } });
  });
  /* télécharger un fichier reçu : lu du service à la demande, jamais gardé (l'adresse est rendue une minute après) */
  async function telechargerFichier(mid, bouton) {
    const m = trouverMessage(mid);
    if (!m || !m.fichier || !m.fichier.piece || bouton.getAttribute('aria-disabled') === 'true') return;
    bouton.setAttribute('aria-disabled', 'true');
    try {
      const b = await source.pieceBlob(m.fichier.piece), u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = m.fichier.nom; a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 60000);
      masquerAvis();
    } catch (er) { avis(phrase(er, 'Le fichier n\'a pas pu être téléchargé.')); }
    finally { bouton.removeAttribute('aria-disabled'); }
  }

  /* ── la photo agrandie ── */
  $('conv-messages').addEventListener('click', e => {
    const p = e.target.closest('[data-photo]');
    if (p) { etat.declencheurPhoto = p; pousser(Object.assign({}, etat.route, { photo: p.dataset.photo })); return; }
    const v = e.target.closest('[data-lire]');
    if (v) { lireVocal(v.dataset.lire); return; }
    const re = e.target.closest('[data-reessayer]');
    if (re) { if (typeof source.reessayer === 'function' && source.reessayer(re.dataset.reessayer)) masquerAvis(); return; }
    const an = e.target.closest('[data-annuler]');
    if (an) { if (typeof source.abandonner === 'function') source.abandonner(an.dataset.annuler); return; }
    const c = e.target.closest('[data-charger]');
    if (c) { source.pieceUrl(c.dataset.charger).then(masquerAvis, er => avis(phrase(er, 'La photo n\'a pas pu être chargée.'))); return; }
    const f = e.target.closest('[data-fichier]');
    if (f) telechargerFichier(f.dataset.fichier, f);
  });
  function ouvrirPhotoDom(cle) {
    const [mid, i] = cle.split('|'), m = trouverMessage(mid), p = m && m.photos && m.photos[+i];
    if (!p || !blob(p.url)) { remplacer(Object.assign({}, etat.route, { photo: null })); return; }
    etat.photo = cle;
    $('visionneuse-img').src = p.url;
    $('visionneuse-img').alt = 'Photo envoyée par ' + (m.auteur === MOI.id ? 'vous' : nomAuteur(m.auteur));
    $('visionneuse').hidden = false;
    $('visionneuse-fermer').focus({ preventScroll: true });
  }
  function fermerPhotoDom() {
    etat.photo = null;
    $('visionneuse').hidden = true; $('visionneuse-img').removeAttribute('src');
    const d = etat.declencheurPhoto; etat.declencheurPhoto = null;
    requestAnimationFrame(() => { const b = d && d.isConnected ? d : null; if (b) b.focus({ preventScroll: true }); });
  }
  $('visionneuse-fermer').addEventListener('click', () => { armerRetap(); fermerCouche(); });      // la croix est juste au-dessus de la caméra de la conversation
  $('visionneuse').addEventListener('click', e => { if (e.target === $('visionneuse')) { armerRetap(); fermerCouche(); } });
  $('visionneuse').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); $('visionneuse-fermer').focus(); } });   // un seul contrôle : le focus ne sort pas

  /* ── le vocal : lecture ──
     Un vocal ENREGISTRÉ ici se relit par `Audio`. Un vocal d'EXEMPLE (aucun fichier sonore dans l'aperçu) rejoue sa durée sans son :
     la barre avance, le bouton passe en pause — c'est ce que verra la personne avec un vrai fichier. */
  const lect = { mid: null, audio: null, minut: null, t0: 0 };
  function progres(p) {
    const b = document.querySelector('[data-lire="' + (lect.mid || '').replace(/"/g, '') + '"]'); if (!b) return;
    const barres = b.querySelectorAll('.onde i'), n = Math.round(p * barres.length);
    barres.forEach((x, i) => x.classList.toggle('joue', i < n));
  }
  function appliquerLecture() {
    if (!lect.mid) return;
    const b = document.querySelector('[data-lire="' + lect.mid.replace(/"/g, '') + '"]');
    if (!b) { arreterLecture(); return; }
    b.setAttribute('data-lecture', '1'); b.setAttribute('aria-label', 'Mettre en pause le message vocal');
    progres(lect.audio && lect.audio.duration > 0 && isFinite(lect.audio.duration) ? lect.audio.currentTime / lect.audio.duration : (Date.now() - lect.t0) / 1000 / Math.max(1, dureeVocal(lect.mid)));
  }
  const dureeVocal = mid => { const m = trouverMessage(mid); return m && m.vocal ? m.vocal.dur : 1; };
  function arreterLecture() {
    clearInterval(lect.minut);
    if (lect.audio) { try { lect.audio.pause(); } catch (e) { /* rien */ } lect.audio = null; }
    const mid = lect.mid; lect.mid = null;
    document.querySelectorAll('[data-lecture]').forEach(b => { b.removeAttribute('data-lecture'); b.setAttribute('aria-label', 'Lire le message vocal de ' + duree(dureeVocal(b.dataset.lire))); b.querySelectorAll('.onde i.joue').forEach(x => x.classList.remove('joue')); });
    return mid;
  }
  function lireVocal(mid) {
    const dejaCe = lect.mid === mid;
    arreterLecture();
    if (dejaCe) return;
    const m = trouverMessage(mid); if (!m || !m.vocal) return;
    lect.mid = mid; lect.t0 = Date.now();
    const jouer = url => {
      const a = new Audio(url); lect.audio = a;
      a.addEventListener('timeupdate', () => { if (lect.audio === a) progres(m.vocal.dur ? a.currentTime / m.vocal.dur : 0); });
      a.addEventListener('ended', () => { if (lect.audio === a) arreterLecture(); });
      a.addEventListener('error', () => { if (lect.audio === a) { arreterLecture(); avis('Ce message vocal n\'a pas pu être lu.'); } });
      /* ⛔ un navigateur peut refuser de démarrer un son qui n'a pas été lancé dans le geste (iOS, quand le vocal vient d'être téléchargé) : il est alors EN MÉMOIRE, un second toucher le lit */
      const p = a.play(); if (p && p.catch) p.catch(er => { if (lect.audio === a) { arreterLecture(); avis(er && er.name === 'NotAllowedError' ? 'Touche encore le message vocal pour le lire.' : 'Ce message vocal n\'a pas pu être lu.'); } });
    };
    if (blob(m.vocal.url)) jouer(m.vocal.url);
    else if (m.vocal.piece && typeof source.pieceUrl === 'function') {
      /* un vocal du service qui n'est pas encore arrivé (seuls les derniers sont lus d'avance) : on le lit maintenant, le bouton passe en « lecture » tout de suite */
      source.pieceUrl(m.vocal.piece).then(url => { if (lect.mid === mid && !lect.audio) { if (blob(url)) jouer(url); else arreterLecture(); } },
        er => { if (lect.mid === mid) { arreterLecture(); avis(phrase(er, 'Ce message vocal n\'a pas pu être lu.')); } });
    } else {
      lect.minut = setInterval(() => { const x = (Date.now() - lect.t0) / 1000 / m.vocal.dur; if (x >= 1) arreterLecture(); else progres(x); }, 100);
    }
    appliquerLecture();
  }

  /* ── le vocal : enregistrement (MediaRecorder) ──
     Toucher le micro démarre un enregistrement qui DURE (la flèche l'envoie, la corbeille l'annule) ; le MAINTENIR plus d'une
     demi-seconde l'envoie au relâcher. Le micro refusé, absent ou indisponible se DIT en une phrase — jamais une erreur dans la
     console, jamais un bouton qui ne répond rien. */
  const enr = { etat: 'repos', conv: null, flux: null, rec: null, morceaux: [], t0: 0, minut: null, niveaux: [], ctx: null, ana: null, annule: false, tenu: false, tenuAuDebut: false, geste: 0, msVu: 0 };
  function afficherEnregistrement(on) {
    $('enreg').hidden = !on;
    const c = etat.convDonnees, ferme = !!compoFerme(c);
    $('compo').hidden = on || !!ferme;
  }
  function nettoyerFlux() {
    clearInterval(enr.minut);
    if (enr.flux) enr.flux.getTracks().forEach(t => t.stop());
    if (enr.ctx && enr.ctx.close) enr.ctx.close().catch(() => {});
    enr.flux = null; enr.rec = null; enr.ctx = null; enr.ana = null;
  }
  function messageMicro(e) {
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Le micro est refusé : autorisez-le dans les réglages de votre navigateur, puis réessayez.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Aucun micro n\'a été trouvé sur cet appareil.';
    if (n === 'NotReadableError' || n === 'AbortError') return 'Le micro est utilisé par une autre application : fermez-la, puis réessayez.';
    return 'Le micro n\'a pas pu démarrer.';
  }
  async function demarrerEnregistrement() {
    if (!CAP.vocaux) { mot('Les messages vocaux arrivent bientôt'); return; }
    if (enr.etat !== 'repos' || !etat.conv) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { avis('L\'enregistrement vocal n\'est pas disponible sur ce navigateur.'); return; }
    enr.etat = 'demande'; enr.annule = false; enr.conv = etat.conv;
    let flux;
    try { flux = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { enr.etat = 'repos'; avis(messageMicro(e)); return; }
    if (enr.etat !== 'demande' || !etat.conv) { flux.getTracks().forEach(t => t.stop()); enr.etat = 'repos'; return; }   // annulé (retour, Échap) pendant la demande
    try {
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const type = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      enr.rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
    } catch (e) { flux.getTracks().forEach(t => t.stop()); enr.etat = 'repos'; avis('L\'enregistrement vocal n\'est pas disponible sur ce navigateur.'); return; }
    enr.flux = flux; enr.morceaux = []; enr.niveaux = [];
    enr.rec.ondataavailable = ev => { if (ev.data && ev.data.size) enr.morceaux.push(ev.data); };
    enr.rec.onstop = finirEnregistrement;
    /* le niveau sonore : de quoi dessiner la forme d'onde. Si le navigateur refuse l'analyse, la barre reste plate — le vocal part quand même. */
    let buf = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      enr.ctx = new AC(); enr.ana = enr.ctx.createAnalyser(); enr.ana.fftSize = 256;
      enr.ctx.createMediaStreamSource(flux).connect(enr.ana); buf = new Uint8Array(enr.ana.fftSize);
    } catch (e) { enr.ana = null; }
    enr.rec.start(250);
    enr.etat = 'enregistre'; enr.t0 = Date.now(); enr.tenuAuDebut = enr.tenu;
    afficherEnregistrement(true);
    $('enreg-duree').textContent = '0:00'; $('enreg-onde').innerHTML = ''; enr.msVu = 0;
    enr.minut = setInterval(() => {
      const ms = Date.now() - enr.t0;
      enr.msVu = ms;                                          // ce que le compteur vient de MONTRER : la bulle dira exactement cela
      $('enreg-duree').textContent = duree(ms / 1000);
      let niv = 0;
      if (enr.ana && buf) { enr.ana.getByteTimeDomainData(buf); for (let i = 0; i < buf.length; i++) niv = Math.max(niv, Math.abs(buf[i] - 128) / 128); }
      enr.niveaux.push(niv);
      const o = $('enreg-onde'); o.insertAdjacentHTML('beforeend', '<i style="height:' + (4 + Math.round(Math.min(1, niv * 3) * 22)) + 'px"></i>');
      while (o.children.length > 60) o.removeChild(o.firstChild);
      if (ms >= VOCAL_MAX_MS) envoyerEnregistrement();
    }, 100);
  }
  function envoyerEnregistrement() { if (enr.etat === 'enregistre' && enr.rec && enr.rec.state !== 'inactive') { enr.etat = 'arret'; enr.rec.stop(); } }
  function annulerEnregistrement() {
    if (enr.etat === 'demande') { enr.etat = 'repos'; return; }
    if (enr.etat !== 'enregistre') return;
    enr.annule = true; enr.etat = 'arret';
    if (enr.rec && enr.rec.state !== 'inactive') enr.rec.stop(); else finirEnregistrement();
  }
  async function finirEnregistrement() {
    const cible = enr.conv, ms = Date.now() - enr.t0, msVu = Math.min(ms, enr.msVu || ms), morceaux = enr.morceaux, type = enr.rec && enr.rec.mimeType, annule = enr.annule, niveaux = enr.niveaux.slice();
    nettoyerFlux(); enr.etat = 'repos'; enr.annule = false;
    afficherEnregistrement(false);
    if (annule) return;
    if (ms < VOCAL_MIN_MS || !morceaux.length) { avis('Vocal trop court — il n\'a pas été envoyé.'); return; }
    const b = new Blob(morceaux, { type: type || 'audio/webm' });
    const n = 10, bars = [];
    for (let i = 0; i < n; i++) { const part = niveaux.slice(Math.floor(i * niveaux.length / n), Math.floor((i + 1) * niveaux.length / n)); const v = part.length ? Math.max.apply(null, part) : 0; bars.push(6 + Math.round(Math.min(1, v * 3) * 12)); }
    const url = URL.createObjectURL(b);
    /* ⛔ la durée de la bulle est celle que le COMPTEUR montrait quand on a envoyé (relecture du testeur : 1:05 devenait 1:06, 0:01 devenait 0:02) — pas celle, 100 ms plus tard, de l'arrêt du micro */
    if (!(await envoi({ vocal: { blob: b, url, dur: msVu / 1000, bars } }, cible))) URL.revokeObjectURL(url);
  }
  const micro = $('compo-micro');
  micro.addEventListener('contextmenu', e => e.preventDefault());
  micro.addEventListener('pointerdown', e => {
    if (e.button) return;
    if (!CAP.vocaux) { e.preventDefault(); mot('Les messages vocaux arrivent bientôt'); return; }
    if (retap()) { e.preventDefault(); return; }
    enr.geste = Date.now(); enr.tenu = true;
    try { micro.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    demarrerEnregistrement();
  });
  const relache = () => {
    if (!enr.tenu) return;
    enr.tenu = false;
    /* maintenu depuis le DÉBUT de l'enregistrement et assez longtemps : le relâcher envoie. Relâché plus tôt (un simple toucher, ou le
       temps d'une demande d'autorisation) : l'enregistrement DURE, la flèche l'enverra. */
    if (enr.etat === 'enregistre' && enr.tenuAuDebut && Date.now() - enr.t0 >= TENU_MS) envoyerEnregistrement();
  };
  micro.addEventListener('pointerup', relache); micro.addEventListener('pointercancel', relache);
  micro.addEventListener('click', e => { if (e.detail === 0 && !retap()) demarrerEnregistrement(); });          // au clavier (Entrée, Espace) : un clic sans pointeur
  /* la barre d'enregistrement occupe la place du champ : après l'envoi ou l'annulation, un second toucher tomberait sur le micro (ou le « + ») qui la remplace */
  $('enreg-envoyer').addEventListener('click', () => { armerRetap(); envoyerEnregistrement(); });
  $('enreg-annuler').addEventListener('click', () => { armerRetap(); annulerEnregistrement(); });

  /* ═══ 8. LA BANNIÈRE ET LE PETIT MOT ═══════════════════════════════════════════════════════════════════════════════════════ */
  let minNotif = 0, minMot = 0;
  function notifier(texte, aide) {
    clearTimeout(minNotif);
    $('notif-texte').textContent = texte;
    $('notif-aide').textContent = aide || '';
    $('notif').classList.add('on');
    minNotif = setTimeout(() => $('notif').classList.remove('on'), 3600);   // ~3,5 s : le paquet dit 3,6 dans la maquette
  }
  function mot(texte) {
    clearTimeout(minMot);
    $('mot').textContent = texte; $('mot').classList.add('on');
    minMot = setTimeout(() => $('mot').classList.remove('on'), 2400);
  }

  /* ═══ 9. LA FEUILLE « NOUVEAU GROUPE » ══════════════════════════════════════════════════════════════════════════════════════ */
  let declencheur = null;
  const g = () => etat.groupe;
  function construireContacts() {
    $('g-contacts').innerHTML = (CAP.liens ? '<button type="button" class="reglage presse" data-lien="1"><span class="avatar av0" aria-hidden="true" style="width:38px;height:38px;font-size:14px">' + icone('i-groupe') + '</span><span class="reglage-texte">Inviter par un lien<small>Ajoute quelqu\'un qui n\'est pas encore dans tes contacts</small></span>' + CHEVRON + '</button>' : '') + CONTACTS.map(c =>
      '<button type="button" class="contact presse" role="checkbox" aria-checked="false" data-id="' + esc(c.id) + '">' + avatar(c) +
      '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span><span class="contact-role">' + esc(c.role) + '</span></span>' +
      '<span class="rond" aria-hidden="true">' + icone('i-coche') + '</span></button>').join('') +
      '<p class="vide" id="g-aucun" hidden>' + (CONTACTS.length || !CAP.liens ? 'Aucun contact ne correspond.' : 'Tu n\'as pas encore de contact : invite quelqu\'un par un lien.') + '</p>';
  }
  function synchroFeuille() {
    const G = g();
    document.querySelectorAll('#g-contacts .contact').forEach(b => {
      const c = contactDe(b.dataset.id);
      b.setAttribute('aria-checked', G.choisis.includes(b.dataset.id) ? 'true' : 'false');
      b.hidden = !!G.recherche && !norme(c.nom + ' ' + c.role).includes(norme(G.recherche));
    });
    $('g-aucun').hidden = Array.from(document.querySelectorAll('#g-contacts .contact')).some(b => !b.hidden);
    $('g-puces').innerHTML = G.choisis.map(id => { const c = contactDe(id);
      return '<li><button type="button" class="puce presse" data-retirer="' + esc(id) + '" aria-label="Retirer ' + esc(prenom(c)) + (G.mode === 'appel' ? ' de l\'appel' : ' du groupe') + '">' + avatar(c) +
        '<span class="puce-x" aria-hidden="true">' + icone('i-croix') + '</span><span class="puce-nom">' + esc(prenom(c)) + '</span></button></li>'; }).join('');
    $('g-compteur').textContent = G.choisis.length + ' / ' + CONTACTS.length;
    $('g-creer').setAttribute('aria-disabled', G.choisis.length ? 'false' : 'true');
    /* la même feuille, trois visages : le titre, les deux boutons du haut, le corps et les réglages en dépendent */
    const appel = G.mode === 'appel', info = G.mode === 'info', corpsInfo = info || G.mode === 'contact' || G.mode === 'convinfo' || G.mode === 'profil' || G.mode === 'suppression' || G.mode === 'entreprise' || G.mode === 'espace' || G.mode === 'abo';
    $('feuille').dataset.mode = G.mode;
    $('feuille-titre').textContent = info ? 'Détails' : G.mode === 'contact' ? 'Contacts' : G.mode === 'convinfo' ? 'Infos' : G.mode === 'profil' ? 'Profil' : G.mode === 'suppression' ? 'Supprimer mon compte' : G.mode === 'entreprise' ? 'Entreprise' : G.mode === 'espace' ? 'Espace' : G.mode === 'abo' ? 'Abonnement' : appel ? 'Appel de groupe' : 'Nouveau groupe';
    $('g-annuler').textContent = corpsInfo ? 'Fermer' : 'Annuler';
    $('g-creer').textContent = appel ? 'Appeler' : 'Créer';
    $('g-creer').style.visibility = corpsInfo ? 'hidden' : '';
    $('g-creer').tabIndex = corpsInfo ? -1 : 0; if (corpsInfo) $('g-creer').setAttribute('aria-hidden', 'true'); else $('g-creer').removeAttribute('aria-hidden');
    $('feuille-corps').hidden = corpsInfo; $('info-corps').hidden = !corpsInfo;
    $('g-reglages').hidden = appel; $('g-choix').hidden = !appel; $('g-resume').hidden = !appel;
    $('g-resume').textContent = G.choisis.length ? G.choisis.length + (G.choisis.length > 1 ? ' participants' : ' participant') : 'Choisir les participants';
    document.querySelectorAll('#g-choix .g-pilule').forEach(b => b.setAttribute('aria-checked', (b.dataset.type === 'video') === G.video ? 'true' : 'false'));
    $('g-ephemeres-val').textContent = EPHEMERES.find(e => e[0] === G.ephemeres)[1];
    $('g-annonces').setAttribute('aria-checked', G.annonces ? 'true' : 'false');
    $('g-photo').classList.toggle('avec-image', !!G.photo);
    $('g-photo').style.backgroundImage = G.photo ? 'url(' + G.photo + ')' : '';
  }
  /* ouvrir = pousser la route ; l'écran suit dans ouvrirFeuilleDom (jouée aussi par le retour système) */
  function ouvrirFeuille(mode) { declencheur = document.activeElement; pousser(Object.assign({}, etat.route, { feuille: mode || 'chat' })); }
  /* la route dit QUELLE feuille : 'chat' (Nouveau groupe), 'appel' (Appel de groupe), 'info:<id d'un appel>' (ses détails) */
  const cleFeuille = f => String(f === true ? 'chat' : f);
  function ouvrirFeuilleDom(f) {
    const [mode, arg] = cleFeuille(f).split(':');
    if (!declencheur) declencheur = document.activeElement;
    etat.groupe = groupeVierge();
    etat.groupe.cle = cleFeuille(f);
    etat.groupe.mode = mode === 'appel' || mode === 'info' || (mode === 'contact' && CAP.liens) || (mode === 'convinfo' && CAP.groupeInfos) || (mode === 'profil' && CAP.reglages) || (mode === 'suppression' && CAP.compte)
      || (CAP.espaces && (mode === 'entreprise' || ((mode === 'espace' || mode === 'abo') && ID_ESPACE.test(arg || '')))) ? mode : 'chat';
    if (etat.groupe.mode === 'convinfo') etat.groupe.convId = arg || null;
    if (etat.groupe.mode === 'espace' || etat.groupe.mode === 'abo') etat.groupe.espaceId = arg;
    if (etat.groupe.mode === 'chat' || etat.groupe.mode === 'appel') { CONTACTS = typeof source.contacts === 'function' ? source.contacts() : CONTACTS; construireContacts(); }
    if (etat.groupe.mode === 'info') {
      etat.groupe.info = etat.appels.find(x => x.id === arg) || null;
      /* un appel qui n'est plus dans la liste (lien d'historique ancien, filtre changé) : pas de feuille vide, on rend la route d'en dessous */
      if (!etat.groupe.info) { declencheur = null; setTimeout(() => { if (etat.route && etat.route.feuille) remplacer(parentDe(etat.route)); }, 0); return; }
    }
    etat.groupe.ouvert = true;
    $('g-nom').value = ''; $('g-recherche').value = ''; $('g-photo-fichier').value = '';
    $('feuille-corps').scrollTop = 0; $('info-corps').scrollTop = 0;
    if (etat.groupe.mode === 'info') rendreInfo(etat.groupe.info);
    if (etat.groupe.mode === 'contact') rendreFeuilleContact();
    if (etat.groupe.mode === 'convinfo') { $('info-corps').dataset.sig = ''; $('info-corps').innerHTML = ''; rendreConvInfo(); }
    if (etat.groupe.mode === 'profil') rendreProfil();
    if (etat.groupe.mode === 'suppression') rendreSuppression();
    if (etat.groupe.mode === 'entreprise') rendreEntreprise();
    if (etat.groupe.mode === 'espace') { $('info-corps').dataset.sig = ''; $('info-corps').innerHTML = ''; rendreEspace(); }
    if (etat.groupe.mode === 'abo') { $('info-corps').dataset.sig = ''; $('info-corps').innerHTML = ''; rendreAbonnement(); }
    synchroFeuille();
    $('feuille').inert = false;
    document.documentElement.classList.add('feuille-ouverte');
    /* le focus va à la feuille, pas au champ : sur un téléphone, un champ focalisé ouvre le clavier et cache la moitié du
       contenu avant que la personne ait rien vu */
    requestAnimationFrame(() => $('feuille').focus({ preventScroll: true }));
  }
  function fermerFeuille(garderPhoto) { if (!etat.groupe.ouvert) return; etat.garderPhoto = !!garderPhoto; fermerCouche(); }
  function fermerFeuilleDom() {
    if (etat.groupe.photo && !etat.garderPhoto) URL.revokeObjectURL(etat.groupe.photo);
    etat.garderPhoto = false;
    etat.groupe = groupeVierge();
    document.documentElement.classList.remove('feuille-ouverte');
    $('feuille').inert = true;
    synchroInert();
    const d = declencheur; declencheur = null;
    if (d && d.isConnected && d.focus) d.focus({ preventScroll: true });
  }
  function basculer(id) {
    const G = g(), i = G.choisis.indexOf(id);
    if (i < 0) G.choisis.push(id); else G.choisis.splice(i, 1);
    synchroFeuille();
  }
  /* « Appeler » : l'appel part avec les contacts choisis, et la feuille cède la place à l'écran d'appel (son entrée d'historique est REMPLACÉE : raccrocher revient à la liste) */
  async function appelerDepuisFeuille() {
    const G = g();
    if (!G.choisis.length) { $('g-compteur').textContent = 'Choisissez au moins un contact'; setTimeout(synchroFeuille, 1600); return; }
    if (etat.creation) return;
    etat.creation = true;
    try { await lancerAppel({ membres: G.choisis.slice(), video: G.video }, $('btn-nouvel-appel'), true); } finally { etat.creation = false; }
  }
  async function creerGroupe() {
    const G = g();
    if (!G.choisis.length) { $('g-compteur').textContent = 'Choisissez au moins un contact'; setTimeout(synchroFeuille, 1600); return; }
    if (etat.creation) return;
    etat.creation = true;
    const prenoms = G.choisis.map(id => prenom(contactDe(id)));
    const nom = G.nom.trim() || 'Nouveau groupe';
    let c = null, refus = null;
    try { c = await source.creerGroupe({ nom: G.nom, membres: G.choisis, photo: G.photo, photoBlob: G.photoBlob, annonces: G.annonces, ephemeres: G.ephemeres }); }
    catch (e) { c = null; refus = e; }
    etat.creation = false;
    if (!c) { mot(phrase(refus, 'Le groupe n\'a pas pu être créé.')); return; }
    etat.neuves.add(c.id);
    await rafraichirListe();
    fermerFeuille(!CAP.avatars);          // l'aperçu GARDE l'adresse de la photo (elle sert d'image à la conversation) ; le service la rend : il lit la photo déposée, pas celle-là
    /* 300 ms plus tard, comme la maquette : la feuille a le temps de partir, la bannière arrive dans une liste déjà visible */
    if (!CAP.service) setTimeout(() => notifier('Vous avez été ajouté au groupe « ' + nom + ' »', 'Aperçu de la notification que reçoivent ' + prenoms.join(', ')), 300);
  }

  $('btn-groupe').addEventListener('click', () => ouvrirFeuille('chat'));
  $('g-annuler').addEventListener('click', () => fermerFeuille(false));
  $('voile').addEventListener('click', () => fermerFeuille(false));
  $('g-creer').addEventListener('click', () => { if (g().mode === 'appel') appelerDepuisFeuille(); else if (g().mode === 'chat') creerGroupe(); });
  $('g-choix').addEventListener('click', e => { const b = e.target.closest('.g-pilule'); if (!b) return; g().video = b.dataset.type === 'video'; synchroFeuille(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (etat.menu) { e.preventDefault(); fermerMenu(); return; }
    /* dans le champ de recherche de la liste, Échap EFFACE la recherche (puis ne fait rien) : il ne ferme pas la conversation affichée à côté */
    if (e.target === $('recherche-conv') && !etat.photo && !etat.groupe.ouvert) { if (e.target.value) { e.preventDefault(); e.target.value = ''; etat.recherche = ''; rendreListe(); } return; }
    /* Échap ferme la couche du dessus : la photo, la feuille, un appel (il raccroche), un enregistrement en cours, la conversation */
    if (etat.photo || etat.groupe.ouvert) { e.preventDefault(); fermerCouche(); }
    else if (etat.appelId) { e.preventDefault(); fermerCouche(); }
    else if (enr.etat === 'enregistre' || enr.etat === 'demande') { e.preventDefault(); annulerEnregistrement(); }
    else if (etat.contexte) { e.preventDefault(); annulerContexte(); }
    else if (etat.conv) { e.preventDefault(); fermerCouche(); }
  });
  /* la feuille est modale : Tab tourne DANS la feuille (le fond est inerte, le focus ne passerait sinon que par l'interface du navigateur) */
  $('feuille').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $('feuille'), liste = Array.from(f.querySelectorAll('button, input, [tabindex="0"]')).filter(x => !x.disabled && !x.closest('[hidden]') && x.getClientRects().length);
    if (!liste.length) return;
    const premier = liste[0], dernier = liste[liste.length - 1], a = document.activeElement;
    if (e.shiftKey && (a === premier || a === f)) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && a === dernier) { e.preventDefault(); premier.focus(); }
  });
  $('g-contacts').addEventListener('click', e => {
    if (e.target.closest('[data-lien]')) { remplacer(Object.assign({}, etat.route, { feuille: 'contact' })); return; }
    const b = e.target.closest('.contact'); if (b) basculer(b.dataset.id);
  });
  $('g-puces').addEventListener('click', e => {
    const b = e.target.closest('[data-retirer]'); if (!b) return;
    const id = b.dataset.retirer; basculer(id);
    const ligne = document.querySelector('#g-contacts .contact[data-id="' + id.replace(/"/g, '') + '"]');
    if (ligne && !ligne.hidden) ligne.focus({ preventScroll: true });
  });
  $('g-nom').addEventListener('input', e => { g().nom = e.target.value; });
  $('g-nom').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  $('g-recherche').addEventListener('input', e => { g().recherche = e.target.value; synchroFeuille(); });
  $('g-ephemeres').addEventListener('click', () => { const G = g(); const i = EPHEMERES.findIndex(e => e[0] === G.ephemeres); G.ephemeres = EPHEMERES[(i + 1) % EPHEMERES.length][0]; synchroFeuille(); });
  $('g-annonces').addEventListener('click', () => { g().annonces = !g().annonces; synchroFeuille(); });
  /* la photo du groupe : réduite à 512 px par un canvas et VALIDÉE par son décodage — une image illisible laisse la pastille de repli, et le dit */
  $('g-photo-fichier').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    let r = null;
    try { r = await reduireImage(f, 512, .85, 90 * 1024); } catch (er) { r = null; }
    if (!etat.groupe.ouvert) return;                          // la feuille s'est fermée pendant le décodage
    if (!r) { e.target.value = ''; mot(g().photo ? 'Cette image n\'a pas pu être lue : la photo choisie avant est conservée.' : 'Cette image n\'a pas pu être lue : le groupe garde sa pastille.'); return; }
    if (g().photo) URL.revokeObjectURL(g().photo);
    g().photo = URL.createObjectURL(r.blob); g().photoBlob = r.blob; synchroFeuille();
  });
  $('recherche-conv').addEventListener('input', e => { etat.recherche = e.target.value; rendreListe(); });
  $('btn-modifier').addEventListener('click', () => mot('« Modifier » arrive bientôt'));

  /* ── glisser la feuille vers le bas (téléphone) : elle suit le doigt 1:1, et à la fin on PROJETTE où le geste allait
        (apple-design §6) au lieu de juger la seule position de relâchement. Le relâchement rend la main au CSS, qui repart
        de la valeur visible : un geste repris au vol ne saute pas. ── */
  (function () {
    const tete = $('feuille-tete'), f = $('feuille'), mobile = matchMedia('(max-width: 699.98px)');
    let d = null;
    tete.addEventListener('pointerdown', e => {
      if (!mobile.matches || !etat.groupe.ouvert || e.target.closest('button')) return;
      d = { y0: e.clientY, h: [[e.timeStamp, e.clientY]], dy: 0 };
      tete.setPointerCapture(e.pointerId); f.style.transition = 'none';
    });
    tete.addEventListener('pointermove', e => {
      if (!d) return;
      const dy = e.clientY - d.y0;
      d.dy = dy > 0 ? dy : dy * 0.15;                      // au-dessus du point de départ : une résistance, pas un mur
      f.style.transform = 'translateY(' + d.dy + 'px)';
      d.h.push([e.timeStamp, e.clientY]); if (d.h.length > 6) d.h.shift();
    });
    const fin = e => {
      if (!d) return;
      const a = d.h[0], b = d.h[d.h.length - 1], dt = Math.max(1, b[0] - a[0]);
      const v = (b[1] - a[1]) / dt * 1000;                  // px/s au relâché
      const projete = d.dy + (v / 1000) * 0.99 / (1 - 0.99);
      const ferme = e.type !== 'pointercancel' && projete > f.offsetHeight * 0.35;
      d = null; f.style.transition = ''; f.style.transform = '';
      if (ferme) fermerFeuille(false);
    };
    tete.addEventListener('pointerup', fin); tete.addEventListener('pointercancel', fin);
  })();

  /* sur iOS, :active ne se pose qu'avec un écouteur de toucher quelque part : sans lui, la réponse au doigt attend le relâché */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* le clavier d'un iPhone ne rétrécit pas la page, il rétrécit la fenêtre VISUELLE : la conversation suit celle-là, sinon le champ
     de saisie reste caché derrière (mesuré impossible dans ce navigateur de test : écrit d'après la spécification, dit dans le rapport) */
  if (window.visualViewport) {
    const vv = window.visualViewport, root = document.documentElement.style;
    const suivre = () => {
      if (vv.scale <= 1.01 && vv.height < window.innerHeight - 80) { root.setProperty('--vvh', vv.height + 'px'); root.setProperty('--vvt', vv.offsetTop + 'px'); if (etat.conv) defilerBas(); }
      else { root.removeProperty('--vvh'); root.removeProperty('--vvt'); }
    };
    vv.addEventListener('resize', suivre); vv.addEventListener('scroll', suivre);
  }

  /* « maintenant » n'est vrai qu'une minute : la liste ne se refait que sur événement, donc l'heure de chaque ligne se remet à jour toute seule */
  setInterval(() => { document.querySelectorAll('#liste-conv .conv-heure[data-t], #liste-appels .appel-heure[data-t]').forEach(e => { const x = libelleListe(+e.dataset.t); if (e.textContent !== x) e.textContent = x; }); }, 20000);

  /* ═══ 10. LES APPELS — l'historique, la feuille « Nouvel appel », l'écran d'appel ═══════════════════════════════════════════════════
     ⛔ Ce que la SOURCE sait d'un appel : qui, quand, combien de temps, qui a répondu. Ce qu'elle ne sait pas, et ne saura jamais : les médias. Le micro et la caméra
     sont à l'APPAREIL (getUserMedia) : cette page les demande, les tient, et les RELÂCHE — chaque piste est arrêtée (readyState « ended ») à la fin de l'appel, par
     QUEL QUE SOIT le chemin qui le termine (raccrocher, retour système, Échap, un autre onglet, « Message »). Un chemin qui oublierait de les arrêter laisserait
     le voyant de la caméra allumé après l'appel : c'est la faute que ce bloc garde en un seul endroit (`quitterAppel`). */
  const dureeAppel = s => { s = Math.max(0, Math.floor(+s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p = n => String(n).padStart(2, '0'); return (h ? h + ':' + p(m) : p(m)) + ':' + p(x); };
  const dureeCourte = s => { s = Math.max(0, Math.floor(+s || 0)); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
  const SENS_APPEL = { entrant: ' entrant', sortant: ' sortant', manque: ' manqué' };
  function libelleAppel(a) {
    let t = (a.groupe ? 'Appel de groupe' : 'Appel') + (a.type === 'video' ? ' vidéo' : '') + (SENS_APPEL[a.sens] || '');
    if (a.sens === 'manque' && a.repetitions > 1) t += ' (' + a.repetitions + ')';
    if (a.groupe) t += ' · ' + (a.membres.length + 1) + ' participants';
    if (a.duree > 0) t += ' · ' + dureeCourte(a.duree);
    return t;
  }
  function ligneAppel(a) {
    const manque = a.sens === 'manque', ic = a.type === 'video' ? 'i-video' : a.sens === 'sortant' ? 'i-sortant' : 'i-entrant';
    return '<li class="appel-item"><button type="button" class="appel-ligne presse" data-rappeler="' + esc(a.id) + '" aria-label="' + esc('Rappeler ' + a.nom + ' — ' + libelleAppel(a) + ', ' + libelleListe(a.t)) + '">' + avatar(a) +
      '<span class="appel-corps"><span class="appel-nom-ligne' + (manque ? ' manque' : '') + '">' + esc(a.nom) + '</span><span class="appel-kind">' + icone(ic) + '<span>' + esc(libelleAppel(a)) + '</span></span></span>' +
      '<span class="appel-heure" data-t="' + (+a.t || 0) + '">' + esc(libelleListe(a.t)) + '</span></button>' +
      '<button type="button" class="appel-info presse" data-infos="' + esc(a.id) + '" aria-label="' + esc('Détails de l\'appel avec ' + a.nom) + '">' + icone('i-info') + '</button></li>';
  }
  function rendreAppels() {
    const actif = document.activeElement, cle = actif && actif.closest && actif.closest('#liste-appels') ? (actif.dataset.rappeler ? 'rappeler' : actif.dataset.infos ? 'infos' : null) : null, val = cle ? actif.dataset[cle] : null;
    $('liste-appels').innerHTML = etat.appels.length ? etat.appels.map(ligneAppel).join('') : '<li class="vide">' + (etat.filtreAppels === 'manques' ? 'Aucun appel manqué' : 'Aucun appel') + '</li>';
    document.querySelectorAll('#seg-appels [data-filtre]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filtre === etat.filtreAppels ? 'true' : 'false'));
    $('seg-appels').style.setProperty('--i', etat.filtreAppels === 'manques' ? 1 : 0);
    if (cle) { const b = $('liste-appels').querySelector('[data-' + cle + '="' + val.replace(/"/g, '') + '"]'); if (b) b.focus({ preventScroll: true }); }
  }
  async function rafraichirAppels() {
    const n = ++etat.jetonAppels;
    let l = null; try { l = await source.appels(etat.filtreAppels); } catch (e) { l = null; }
    if (n !== etat.jetonAppels || !l) return;               // un filtre plus récent a pris la place pendant l'attente
    etat.appels = l; rendreAppels();
  }
  $('seg-appels').addEventListener('click', e => {
    const b = e.target.closest('[data-filtre]'); if (!b || b.dataset.filtre === etat.filtreAppels) return;
    etat.filtreAppels = b.dataset.filtre; rafraichirAppels();
  });
  $('liste-appels').addEventListener('click', e => {
    const r = e.target.closest('[data-rappeler]'), i = e.target.closest('[data-infos]');
    if (r) { const a = etat.appels.find(x => x.id === r.dataset.rappeler); if (a) rappeler(a, a.type, false, r); }
    else if (i) { const a = etat.appels.find(x => x.id === i.dataset.infos); if (a) { declencheur = i; pousser(Object.assign({}, etat.route, { feuille: 'info:' + a.id })); } }
  });
  $('btn-nouvel-appel').addEventListener('click', () => ouvrirFeuille('appel'));
  $('btn-modifier-appels').addEventListener('click', () => mot('« Modifier » arrive bientôt'));

  /* les détails d'un appel : la même feuille, un autre corps — qui, quand, combien de temps, et les trois gestes (rappeler, l'autre type d'appel, écrire) */
  function rendreInfo(a) {
    const autre = a.type === 'video' ? 'audio' : 'video', ligne = (act, ic, txt) => '<button type="button" class="reglage presse" data-info-act="' + act + '">' + icone(ic) + '<span class="reglage-texte">' + txt + '</span>' + CHEVRON + '</button>';
    $('info-corps').innerHTML =
      '<div class="info-tete">' + avatar(a) + '<div><h3 class="info-nom">' + esc(a.nom) + '</h3><p class="info-sous">' + esc(libelleAppel(a)) + '</p><p class="info-sous">' + esc(libelleDatage(a.t)) + '</p></div></div>' +
      '<div class="carte">' + ligne('rappeler', a.type === 'video' ? 'i-video' : 'i-phone', 'Rappeler') + ligne('autre', autre === 'video' ? 'i-video' : 'i-phone', autre === 'video' ? 'Appel vidéo' : 'Appel audio') + ligne('message', 'i-chat', 'Message') + '</div>' +
      (a.groupe ? '<div class="rubrique"><span>Participants</span><span>' + (a.membres.length + 1) + '</span></div><div class="carte">' +
        '<div class="contact"><span class="avatar av0" aria-hidden="true">' + esc(MOI.initiales) + '</span><span class="contact-texte"><span class="contact-nom">Vous</span></span></div>' +
        a.membres.map(id => { const c = contactDe(id); return c ? '<div class="contact">' + avatar(c) + '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span><span class="contact-role">' + esc(c.role) + '</span></span></div>' : ''; }).join('') + '</div>' : '');
  }
  $('info-corps').addEventListener('click', e => {
    const b = e.target.closest('[data-info-act]'), a = g().info; if (!b || !a) return;
    if (b.dataset.infoAct === 'message') ouvrirConversationAvec(a.membres, a.conv);
    else rappeler(a, b.dataset.infoAct === 'autre' ? (a.type === 'video' ? 'audio' : 'video') : a.type, true, b);
  });

  /* « Message » (pendant ou après un appel) : la conversation de ces personnes — la source la CRÉE si elle n'existe pas. Si l'on vient d'elle, c'est un retour d'historique
     (l'écran d'avant), sinon la route est remplacée : jamais deux entrées pour la même conversation. */
  async function ouvrirConversationAvec(membres, conv) {
    let id = conv || null;
    let refus = null;
    if (!id) { try { const c = await source.conversationPour(membres); id = c && c.id; } catch (e) { id = null; refus = e; } }
    if (!id) { mot(phrase(refus, 'La conversation n\'a pas pu être ouverte.')); return; }
    const cible = { vue: 'messages', conv: id, feuille: false, photo: null, appel: null }, h = entree();
    if (h && h.n > 0 && h.p && memeRoute(h.p, cible)) history.back(); else remplacer(cible);
  }
  function rappeler(a, type, depuisFeuille, declencheurEl) { return lancerAppel({ membres: a.membres.slice(), video: type === 'video', conv: a.conv }, declencheurEl || document.activeElement, !!depuisFeuille); }
  /* lancer = demander à la source, PUIS pousser la route (l'écran suit dans afficherAppel, jouée aussi par le retour système). Depuis une feuille, l'entrée de la feuille est remplacée. */
  async function lancerAppel(spec, declencheurEl, depuisFeuille) {
    if (etat.appelId || etat.appelDemarre) return false;           // deux touchers dans le même instant ne lancent pas deux appels
    etat.appelDemarre = true;
    let c = null; try { c = await source.demarrerAppel(spec); } catch (e) { c = null; }
    etat.appelDemarre = false;
    if (!c) { mot('L\'appel n\'a pas pu être lancé.'); return false; }
    etat.declencheurAppel = declencheurEl && declencheurEl.id ? '#' + declencheurEl.id : declencheurEl && declencheurEl.dataset && declencheurEl.dataset.rappeler ? '[data-rappeler="' + declencheurEl.dataset.rappeler.replace(/"/g, '') + '"]' : null;
    const r = Object.assign({}, etat.route, { feuille: false, photo: null, appel: c.id });
    if (depuisFeuille && etat.route.feuille) remplacer(r); else pousser(r);
    return true;
  }

  /* ── l'écran d'appel ── */
  const annonceAppel = t => { const r = $('annonce-appel'); r.textContent = ''; setTimeout(() => { r.textContent = t; }, 60); };
  function messageMedia(e, quoi) {
    const n = e && e.name, cam = quoi === 'camera';
    if (n === 'NotAllowedError' || n === 'SecurityError') return cam ? 'La caméra est refusée : autorisez-la dans les réglages de votre navigateur, puis touchez Caméra.' : 'Le micro est refusé : autorisez-le dans les réglages de votre navigateur, puis touchez Micro.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return cam ? 'Aucune caméra n\'a été trouvée sur cet appareil.' : 'Aucun micro n\'a été trouvé sur cet appareil.';
    if (n === 'NotReadableError' || n === 'AbortError') return (cam ? 'La caméra' : 'Le micro') + ' est utilisé' + (cam ? 'e' : '') + ' par une autre application : fermez-la, puis réessayez.';
    return cam ? 'La caméra n\'a pas pu démarrer.' : 'Le micro n\'a pas pu démarrer.';
  }
  let minAvisAppel = 0;
  function avisAppel(texte) {
    clearTimeout(minAvisAppel);
    const a = $('appel-avis'); a.textContent = texte; a.hidden = false;
    minAvisAppel = setTimeout(() => { a.hidden = true; }, 12000);
  }
  const gum = c => navigator.mediaDevices.getUserMedia(c);
  const mediasDispo = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  /* poser des pistes : chacune est GARDÉE (A.pistes) pour être arrêtée, et une caméra débranchée en cours d'appel se voit (« ended ») */
  function poserPistes(A, flux) {
    flux.getTracks().forEach(t => {
      A.pistes.push(t);
      if (t.kind === 'audio') { A.audio = t; t.enabled = A.micro; }
      else { A.video = t; t.addEventListener('ended', () => { if (A.video === t && !A.fini) { A.video = null; majCamera(A); rendreAppel(); } }); }
    });
    majCamera(A);
  }
  /* ⛔ LE SEUL ENDROIT QUI RELÂCHE : toute piste, tout flux, l'élément vidéo. Appelé de quitterAppel, et seulement de là (et de l'arrivée tardive d'une piste, ci-dessous). */
  function arreterPistes(A) {
    A.pistes.forEach(t => { try { t.stop(); } catch (e) { /* déjà arrêtée */ } });
    A.pistes = []; A.audio = null; A.video = null; A.camera = false;
    const v = $('appel-video-local'); try { v.pause(); } catch (e) { /* rien */ } v.srcObject = null;
  }
  function majCamera(A) {
    A.camera = !!(A.video && A.video.readyState === 'live');
    const v = $('appel-video-local'), vous = $('appel-vous');
    vous.dataset.camera = A.camera ? 'on' : 'off';
    if (A.camera) { if (!v.srcObject || v.srcObject.getVideoTracks()[0] !== A.video) v.srcObject = new MediaStream([A.video]); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else v.srcObject = null;
  }
  /* un flux obtenu APRÈS la fin de l'appel (la demande d'autorisation était en cours) est arrêté tout de suite : jamais une caméra allumée pour un appel qui n'existe plus */
  const perime = A => A.fini || etat.appelUI !== A;
  async function acquerirMedias(A, veutVideo) {
    if (!mediasDispo()) { A.mediaPret = true; avisAppel('Le micro et la caméra ne sont pas disponibles sur ce navigateur : l\'appel continue sans eux.'); rendreAppel(); return; }
    let flux = null, errCombine = null, errAudio = null;
    if (veutVideo) { try { flux = await gum({ audio: true, video: true }); } catch (e) { errCombine = e; } if (perime(A)) { if (flux) flux.getTracks().forEach(t => t.stop()); return; } }
    if (!flux) { try { flux = await gum({ audio: true }); } catch (e) { errAudio = e; } if (perime(A)) { if (flux) flux.getTracks().forEach(t => t.stop()); return; } }
    let dit = '';
    if (flux) { poserPistes(A, flux); if (veutVideo && !A.video) dit = messageMedia(errCombine, 'camera') + ' L\'appel continue en audio.'; }
    else {
      dit = messageMedia(errAudio, 'micro') + ' L\'appel continue sans micro.';
      if (veutVideo) {
        let fv = null; try { fv = await gum({ video: true }); } catch (e) { fv = null; }
        if (perime(A)) { if (fv) fv.getTracks().forEach(t => t.stop()); return; }
        if (fv) poserPistes(A, fv); else dit += ' La caméra n\'a pas pu démarrer non plus.';
      }
    }
    A.mediaPret = true;
    if (dit) avisAppel(dit);
    rendreAppel();
  }
  async function basculerMicro() {
    const A = etat.appelUI; if (!A || !A.snap) return;
    if (!A.audio) {                                                // pas de micro (refusé, absent) : toucher le bouton RÉESSAIE — la personne a pu changer l'autorisation
      try {
        const f = await gum({ audio: true });
        if (perime(A)) { f.getTracks().forEach(t => t.stop()); return; }
        A.micro = true; poserPistes(A, f); avisAppelEffacer(); rendreAppel(); annonceAppel('Micro activé');
      } catch (e) { if (!perime(A)) avisAppel(messageMedia(e, 'micro') + ' L\'appel continue sans micro.'); }
      return;
    }
    A.micro = !A.micro; A.audio.enabled = A.micro; rendreAppel(); annonceAppel(A.micro ? 'Micro activé' : 'Micro coupé');
  }
  const avisAppelEffacer = () => { clearTimeout(minAvisAppel); $('appel-avis').hidden = true; };
  async function basculerCamera() {
    const A = etat.appelUI; if (!A || !A.snap || A.cameraEnCours) return;
    if (A.camera) {                                                 // éteindre = ARRÊTER la piste (le voyant s'éteint), pas seulement la masquer
      if (A.video) { A.pistes = A.pistes.filter(t => t !== A.video); try { A.video.stop(); } catch (e) { /* rien */ } A.video = null; }
      majCamera(A); rendreAppel(); annonceAppel('Caméra coupée'); return;
    }
    A.cameraEnCours = true;
    try {
      const f = await gum({ video: true });
      if (perime(A)) { f.getTracks().forEach(t => t.stop()); return; }
      poserPistes(A, f); avisAppelEffacer(); rendreAppel(); annonceAppel('Caméra activée');
    } catch (e) { if (!perime(A)) { avisAppel(messageMedia(e, 'camera') + ' L\'appel continue en audio.'); rendreAppel(); } }
    finally { A.cameraEnCours = false; }
  }
  function statutAppel(A) {
    const s = A.snap; if (!s) return '';
    if (s.etat === 'sonne') return 'Sonnerie…';
    const muet = A.mediaPret && (!A.micro || !A.audio);
    return (muet ? 'Micro coupé' : A.camera ? 'Vidéo activée' : 'Appel en cours') + ' · ' + dureeAppel((Date.now() - (s.debut || Date.now())) / 1000);
  }
  /* ⛔ la durée se relit quatre fois par seconde, pas une : une minuterie à 1 s, lancée AVANT que l'autre réponde, n'est pas calée sur le début de l'appel et affiche un chiffre en retard de près d'une seconde */
  const majStatutAppel = () => { const A = etat.appelUI; if (!A) return; const t = statutAppel(A), e = $('appel-statut'); if (e.textContent !== t) e.textContent = t; };
  /* l'écran DIT l'état : la mise en page, le nom, les vignettes (refaites seulement quand ce qui les décide change), les commandes */
  function rendreAppel() {
    const A = etat.appelUI; if (!A || !A.snap) return;
    const s = A.snap, E = $('appel-ecran'), mise = s.membres.length >= 2 ? 'groupe' : (A.camera ? 'video' : 'audio');
    E.dataset.mise = mise;
    const scene = $('appel-scene'); if (mise === 'groupe') scene.tabIndex = 0; else scene.removeAttribute('tabindex');
    $('appel-nom').textContent = s.nom;
    const av = $('appel-avatar'); av.className = 'avatar appel-avatar av' + (((s.avatar | 0) % 6 + 6) % 6);
    av.textContent = blob(s.photo) ? '' : (s.initiales || ''); av.style.backgroundImage = blob(s.photo) ? 'url("' + s.photo.replace(/["\\]/g, '') + '")' : '';
    const sig = mise + '|' + s.membres.map(m => m.id + ':' + m.etat).join(',');
    if (A.sig !== sig) {
      A.sig = sig;
      scene.querySelectorAll('.tuile:not(.vous)').forEach(t => t.remove());
      const vous = $('appel-vous');
      s.membres.forEach(m => {
        const t = document.createElement('div');
        t.className = 'tuile av' + (((m.avatar | 0) % 6 + 6) % 6); t.setAttribute('role', 'listitem'); t.dataset.membre = m.id; t.dataset.etat = m.etat;
        t.innerHTML = '<span class="tuile-av" aria-hidden="true">' + esc(m.initiales) + '</span><span class="tuile-nom">' + esc(mise === 'video' ? 'Vidéo de ' + m.prenom : m.prenom) + '</span>' + (m.etat === 'sonne' ? '<span class="tuile-etat">Sonnerie…</span>' : '');
        scene.insertBefore(t, vous);
      });
    }
    $('appel-vous-av').textContent = MOI.initiales;
    const muet = A.mediaPret && (!A.micro || !A.audio);
    const bm = $('appel-micro'); bm.setAttribute('aria-pressed', muet ? 'true' : 'false'); bm.setAttribute('aria-label', muet ? 'Activer le micro' : 'Couper le micro');
    bm.querySelector('.appel-cmd-texte').textContent = muet ? 'Muet' : 'Micro'; bm.querySelector('use').setAttribute('href', muet ? '#i-mic-off' : '#i-mic');
    $('appel-hp').setAttribute('aria-pressed', A.haut ? 'true' : 'false');
    const bc = $('appel-cam'); bc.setAttribute('aria-pressed', A.camera ? 'true' : 'false'); bc.setAttribute('aria-label', A.camera ? 'Couper la caméra' : 'Activer la caméra');
    bc.querySelector('use').setAttribute('href', A.camera ? '#i-video' : '#i-video-off');
    majStatutAppel();
  }
  async function afficherAppel(id) {
    const jeton = ++etat.jetonAppel;
    etat.appelId = id;
    document.documentElement.dataset.appel = '1';
    const A = etat.appelUI = { id, jeton, snap: null, micro: true, haut: false, camera: false, pistes: [], audio: null, video: null, minut: 0, fini: false, cameraEnCours: false, mediaPret: false, sig: '' };
    $('appel-nom').textContent = ''; $('appel-statut').textContent = ''; $('appel-avis').hidden = true;
    $('appel-ecran').dataset.mise = 'audio';
    synchroInert();
    let snap = null; try { snap = await source.appel(id); } catch (e) { snap = null; }
    if (jeton !== etat.jetonAppel) return;                       // raccroché pendant l'attente
    if (!snap || snap.etat === 'termine') { remplacer(parentDe(etat.route)); mot('Cet appel est terminé.'); return; }
    A.snap = snap; rendreAppel();
    A.minut = setInterval(majStatutAppel, 250);
    $('appel-ecran').focus({ preventScroll: true });
    acquerirMedias(A, snap.type === 'video');
  }
  /* un changement dit par la source (quelqu'un répond, l'appel est fini ailleurs) */
  async function rafraichirAppel() {
    const A = etat.appelUI; if (!A || !A.snap) return;
    let snap = null; try { snap = await source.appel(A.id); } catch (e) { snap = null; }
    if (perime(A) || !snap) return;
    const avant = A.snap.etat; A.snap = snap;
    if (snap.etat === 'termine') { fermerCouche(); return; }
    if (avant === 'sonne' && snap.etat === 'en-cours') annonceAppel('Appel connecté');
    rendreAppel();
  }
  /* ⛔ LA SORTIE UNIQUE : tout chemin qui retire la couche « appel » de la route passe ici, et rien d'autre ne raccroche. Les pistes sont arrêtées d'ABORD, de façon synchrone ;
     la source l'apprend ensuite (terminerAppel crée la ligne d'historique), et l'écran en garde une phrase pour le lecteur d'écran. */
  function quitterAppel() {
    const A = etat.appelUI, id = etat.appelId, cle = etat.declencheurAppel;
    etat.jetonAppel++; etat.appelId = null; etat.appelUI = null; etat.declencheurAppel = null;
    if (A) { A.fini = true; clearInterval(A.minut); arreterPistes(A); }
    avisAppelEffacer();
    delete document.documentElement.dataset.appel;
    synchroInert();
    requestAnimationFrame(() => { const b = cle && document.querySelector(cle); if (b && !etat.appelId && b.getClientRects().length) b.focus({ preventScroll: true }); });
    if (id) source.terminerAppel(id).then(rec => annonceAppel('Appel terminé · ' + dureeAppel(rec.duree)), () => { /* l'appel n'existait plus chez la source */ });
  }
  $('appel-raccrocher').addEventListener('click', fermerCouche);
  $('appel-micro').addEventListener('click', basculerMicro);
  $('appel-hp').addEventListener('click', () => { const A = etat.appelUI; if (!A || !A.snap) return; A.haut = !A.haut; rendreAppel(); annonceAppel(A.haut ? 'Haut-parleur activé' : 'Haut-parleur coupé'); });
  $('appel-cam').addEventListener('click', basculerCamera);
  $('appel-msg').addEventListener('click', () => { const A = etat.appelUI; if (A && A.snap) ouvrirConversationAvec(A.snap.membres.map(m => m.id), A.snap.conv); });
  /* la page qu'on ferme libère le micro et la caméra elle-même ; on le fait aussi tout de suite : un onglet mis en cache (bfcache) garderait sinon ses pistes vivantes */
  window.addEventListener('pagehide', () => { if (etat.appelUI) arreterPistes(etat.appelUI); });

  /* ═══ 12. LA VERSION SERVIE — la connexion, la session, les actions sur un message, les infos, les liens, les contacts ═══════════════════════════
     ⛔ Tout ce bloc dort dans l'aperçu : il ne s'éveille que si la source l'annonce (`source.capacites`). Les écrans de l'aperçu n'en savent rien.
     ⛔ LA PAGE REPART DE ZÉRO (`location.replace`) à la déconnexion, quand le service dit que la session est morte (coupée depuis la Tour, expirée), et dès que la
     personne n'est plus la même : l'état d'une page n'est que MASQUÉ quand on change d'écran — le compte suivant, dans le même onglet, lisait la conversation, les
     messages et le lien de contact du précédent (relecture du gardien, remarque 1, bloquante). Une page neuve ne porte rien : ni DOM, ni mémoire du module. */
  const PHRASES_MOTIF = {
    session_requise: 'Ta session a pris fin : elle a expiré, ou l\'accès a été coupé depuis la Tour de contrôle. Reconnecte-toi.',
    identite: 'Une autre personne s\'est connectée dans ce navigateur : cette page a été fermée. Reconnecte-toi.',
    deconnecte: 'Tu es déconnecté.',
    suppression: 'Ton compte est en cours de suppression. Si tu changes d\'avis, reconnecte-toi avant la date prévue : la suppression sera annulée.',
    suppression_annulee: 'Bon retour : la suppression de ton compte est annulée.'
  };
  /* « 17 octobre 2026 à 14:05 » : la date dite à la personne est celle que le SERVICE a posée, jamais une date recalculée ici */
  const dateLongue = ts => { try { return new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(ts).toISOString(); } };
  const motifConnu = m => typeof m === 'string' && Object.prototype.hasOwnProperty.call(PHRASES_MOTIF, m);
  /* ⛔ LE CHEMIN SE REFAIT SUR L'ORIGINE, jamais sur `location.pathname` seul : le service répond aussi à `//index.html` (`express.static` normalise), et
     `location.replace('//index.html?m=…')` est une adresse SANS SCHÉMA — le navigateur la lit comme l'hôte « index.html » (relecture du gardien, remarque 4). */
  const cheminSur = () => location.pathname.replace(/^\/{2,}/, '/');
  function lireMotif() {
    let m = null, n = 0, d = 0;
    try { const q = new URLSearchParams(location.search); m = q.get('m'); n = /^\d{1,2}$/.test(q.get('n') || '') ? parseInt(q.get('n'), 10) : 0; d = /^\d{12,14}$/.test(q.get('d') || '') ? parseInt(q.get('d'), 10) : 0; } catch (e) { m = null; }
    if (location.search) { try { history.replaceState(null, '', cheminSur() + location.hash); } catch (e) { /* rien */ } }
    etat.perdus = motifConnu(m) ? n : 0;
    etat.dateSuppression = m === 'suppression' ? d : 0;           // la date d'effacement que le service a posée (en millisecondes) : elle traverse l'adresse, jamais autre chose
    return motifConnu(m) ? m : null;
  }
  /* ⛔ un message qui n'a PAS quitté l'appareil (réseau coupé, service muet) ne survit ni à la déconnexion ni à une session morte : la page repart de zéro. Elle le DIT
     à l'écran de connexion (le nombre seulement, jamais le texte : il traverse l'adresse) au lieu de le perdre en silence (gardien, remarque 1 ; testeur, D8). */
  function repartir(motif, date) {
    etat.partir = true;                                   // la garde « fermer la page » ne se met pas en travers de ce départ-là
    let n = 0; try { n = typeof source.enAttente === 'function' ? Math.min(99, source.enAttente() | 0) : 0; } catch (e) { n = 0; }
    location.replace(location.origin + cheminSur() + (motifConnu(motif) ? '?m=' + motif + (n > 0 ? '&n=' + n : '') + (motif === 'suppression' && Number.isSafeInteger(date) && date > 0 ? '&d=' + date : '') : ''));
  }
  /* fermer ou recharger la page avec un message encore « En attente » le perdrait : le navigateur demande confirmation (rien n'est rangé sur l'appareil, c'est voulu) */
  window.addEventListener('beforeunload', e => {
    if (etat.partir || typeof source.enAttente !== 'function' || !(source.enAttente() > 0)) return;
    e.preventDefault(); e.returnValue = '';
  });
  const erreurConnexion = t => { const e = $('connexion-erreur'); e.textContent = t || ''; e.hidden = !t; };
  function afficherConnexion(motif, d) {
    $('app').hidden = true; $('connexion').hidden = false;
    document.title = 'Connexion' + SUFFIXE_TITRE;
    let t = motif ? PHRASES_MOTIF[motif] : '';
    if (motif === 'suppression' && etat.dateSuppression > 0) t = 'Ton compte sera supprimé le ' + dateLongue(etat.dateSuppression) + '. Si tu changes d\'avis, reconnecte-toi avant cette date : la suppression sera annulée.';
    if (t && etat.perdus > 0) t += ' ' + (etat.perdus === 1 ? 'Un message n\'était pas encore parti : il n\'a pas été envoyé, écris-le de nouveau.' : etat.perdus + ' messages n\'étaient pas encore partis : ils n\'ont pas été envoyés, écris-les de nouveau.');
    if (!t && d && d.motif && d.motif !== 'session_requise') t = d.phrase || phrase(null, 'Le service ne répond pas.');
    erreurConnexion(t);
  }
  let fluxPerdu = false;                                  // le temps réel est-il rompu ? (dit par la source)
  let connexionEnCours = false;
  $('f-connexion').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (connexionEnCours) return;
    erreurConnexion('');                                    // ⛔ chaque essai écrit SON verdict : le refus d'avant ne survit pas à l'essai suivant
    const login = $('c-login').value.trim(), pass = $('c-pass').value;
    if (!login || !pass) { erreurConnexion('Saisis l\'identifiant et le mot de passe.'); return; }
    connexionEnCours = true; $('c-entrer').setAttribute('aria-disabled', 'true');
    try {
      const moi = await source.connexion(login, pass); $('c-pass').value = '';
      /* se reconnecter avant l'échéance ANNULE la suppression du compte : le service le dit, la personne doit l'apprendre — la page repart avec le motif (une bannière à l'arrivée) */
      if (moi && moi.suppression_annulee === true) location.replace(location.origin + cheminSur() + '?m=suppression_annulee' + location.hash); else location.reload();
    }
    catch (e) { $('c-pass').value = ''; erreurConnexion(phrase(e, 'La connexion n\'a pas pu se faire.')); }
    finally { connexionEnCours = false; $('c-entrer').removeAttribute('aria-disabled'); }
  });
  /* la session se relit quand on revient sur la page ou que le réseau revient : une autre personne dans le même navigateur, une session coupée */
  function surveillerSession() {
    if (typeof source.verifierSession !== 'function') return;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { source.verifierSession(); if (typeof source.reveiller === 'function') source.reveiller(false); } });
    /* le réseau qui tombe se DIT tout de suite (le navigateur le sait avant que le flux n'échoue : une connexion déjà ouverte peut mettre longtemps à se rompre) ;
       rendu, il ne retire la bannière que si le flux n'est pas perdu — c'est le flux qui, en se rouvrant, dit « ok » */
    window.addEventListener('offline', () => { $('hors-ligne').hidden = false; });
    window.addEventListener('online', () => { if (!fluxPerdu) $('hors-ligne').hidden = true; source.verifierSession(); if (typeof source.reveiller === 'function') source.reveiller(true); });   // le réseau a changé : le flux d'avant est suspect, on le rouvre sans regarder
  }
  /* une page revenue du cache de navigation (bfcache) après une déconnexion rendrait l'écran d'avant : on la recharge */
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

  const lienDansAdresse = () => { const m = /(?:^|[#&])lien=([A-Za-z0-9_-]{20,64})/.exec(location.hash || ''); return m ? m[1] : null; };
  /* ⛔ un lien ouvert dans un onglet DÉJÀ ouvert (seul le fragment change : aucun rechargement) ne faisait rien — la page n'écoutait le fragment qu'au démarrage (relecture du
     testeur). Le changement de fragment a posé une entrée d'historique et fermé ce qui était ouvert (`popstate`) : on la DÉFAIT (`history.back()`, qui rend la route d'avant —
     la conversation ouverte revient, et le code ne reste ni dans la barre ni dans l'historique), puis la feuille s'ouvre dessus. */
  window.addEventListener('hashchange', () => {
    const c = CAP.liens && etat.route ? lienDansAdresse() : null;
    if (!c) return;
    window.addEventListener('popstate', () => { etat.codeLien = c; declencheur = null; ouvrirFeuille('contact'); }, { once: true });
    history.back();
  });
  const ouvrirConvId = id => remplacer({ vue: 'messages', conv: id, feuille: false, photo: null, appel: null });
  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); return true; }
    catch (e) {
      try { const t = document.createElement('textarea'); t.value = texte; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; }
      catch (e2) { return false; }
    }
  }
  const erreurInfo = t => { const e = $('info-erreur'); if (e) { e.textContent = t || ''; e.hidden = !t; } };

  /* ── les réglages du compte : profil, confidentialité, contacts, appareils, stockage, à propos, sortie ──
     ⛔ Chaque réglage montre ce que le SERVICE a retenu, jamais ce qu'on lui a demandé : un interrupteur ne tourne qu'après la réponse, un refus se dit à côté de lui — et la réussite
     suivante l'efface. Chaque bloc a son propre état (chargement, refus, contenu) : un bloc en panne ne cache pas les autres. */
  const reg = { jeton: 0, conf: null, confErreur: '', stock: null, stockErreur: '', propos: null, proposErreur: '', occupe: false,
    notif: null, notifLecture: '', notifErreur: '', notifMsg: '', notifOccupe: false, exportMsg: '', exportErreur: '', exportOccupe: false };
  const LIEUX = { beta: 'Bêta', prod: 'Production' };
  const refusBloc = t => '<p class="info-erreur" role="alert">' + esc(t) + '</p><button type="button" class="mini reg-relire" data-reg-relire="1">Réessayer</button>';
  function peindreMoi() {
    const a = $('moi-avatar'), ph = blob(MOI.photo);
    a.textContent = ph ? '' : MOI.initiales; a.style.backgroundImage = ph ? 'url("' + MOI.photo + '")' : '';
    $('moi-nom').textContent = MOI.nom;
    /* ⛔ MA présence : coupée, la barre ne dit plus « Disponible » avec un point vert pendant que personne ne me voit (relecture du testeur). L'aperçu n'a pas ce réglage : `presence` y est absente. */
    const masquee = MOI.presence === false;
    $('moi-statut').classList.toggle('masque', masquee);
    $('moi-statut-texte').textContent = masquee ? 'Présence masquée' : 'Disponible';
  }
  function peindreProfilReglage() {
    const c = $('reg-profil'); if (!c || !MOI) return;
    c.innerHTML = '<button type="button" class="contact presse" id="reg-profil-bouton">' + avatar(MOI) + '<span class="contact-texte"><span class="contact-nom">' + esc(MOI.nom) + '</span><span class="contact-role">' + esc(MOI.statut || 'Modifier mon profil') + '</span></span>' + CHEVRON + '</button>';
  }
  function peindreConf() {
    const c = $('reg-conf'); if (!c) return;
    if (!reg.conf) { c.innerHTML = reg.confErreur ? '<div class="carte-pad">' + refusBloc(reg.confErreur) + '</div>' : '<p class="vide">Chargement…</p>'; return; }
    const sw = (cle, titre, aide) => '<button type="button" class="reglage presse" role="switch" data-reg-cle="' + cle + '" aria-checked="' + (reg.conf[cle] ? 'true' : 'false') + '"' + (reg.occupe ? ' aria-disabled="true"' : '') +
      '><span class="reglage-texte">' + esc(titre) + '<small>' + esc(aide) + '</small></span><span class="interrupteur" aria-hidden="true"></span></button>';
    c.innerHTML = sw('presence', 'Afficher quand je suis en ligne', 'Réciproque : si tu le coupes, tu ne vois plus non plus qui est en ligne.') +
      sw('accuses', 'Confirmations de lecture', 'Réciproque : si tu les coupes, ton « Lu » n\'est montré à personne et tu ne vois pas celui des autres.') +
      (reg.confErreur ? '<div class="carte-pad"><p class="info-erreur" role="alert">' + esc(reg.confErreur) + '</p></div>' : '');
  }
  /* ── Notifications : l'interrupteur de CET appareil (ce que le navigateur et le service ont retenu), l'aperçu (valable pour tous mes appareils), l'essai ──
     ⛔ Un état où l'interrupteur ne peut pas tourner DIT pourquoi, à côté de lui, et comment en sortir (la phrase vient de la source). Un refus du geste se dit en dessous ; la réussite suivante l'efface. */
  function peindreNotif() {
    const c = $('reg-notif'); if (!c) return;
    const n = reg.notif;
    if (!n) { c.innerHTML = reg.notifLecture ? '<div class="carte-pad">' + refusBloc(reg.notifLecture) + '</div>' : '<p class="vide">Chargement…</p>'; return; }
    const occ = reg.notifOccupe ? ' aria-disabled="true"' : '';
    let h = '<button type="button" class="reglage presse" role="switch" id="reg-notif-sw" aria-checked="' + (n.active ? 'true' : 'false') + '"' + (n.possible ? occ : ' aria-disabled="true"') + '><span class="reglage-texte">Notifications sur cet appareil<small>' +
      esc(!n.possible ? n.phrase : n.active ? 'Activées : tu reçois une notification quand un message arrive et que cette page n\'est pas sous tes yeux.' : 'Désactivées sur cet appareil. Le navigateur te demandera ton autorisation.') + '</small></span><span class="interrupteur" aria-hidden="true"></span></button>';
    if (n.raison !== 'service') h += '<button type="button" class="reglage presse" role="switch" id="reg-notif-apercu" aria-checked="' + (n.apercu ? 'true' : 'false') + '"' + occ + '><span class="reglage-texte">Aperçu du message<small>' +
      esc(n.apercu ? 'La notification montre le nom et le début du message (tous tes appareils).' : 'La notification dit seulement « Nouveau message » : ni nom ni texte, même écran verrouillé (tous tes appareils).') + '</small></span><span class="interrupteur" aria-hidden="true"></span></button>';
    if (n.possible && n.active) h += '<button type="button" class="reglage presse" id="reg-notif-essai"' + occ + '><span class="reglage-texte">Envoyer une notification d\'essai<small>Elle part vers tous tes appareils abonnés.</small></span></button>';
    if (reg.notifMsg) h += '<div class="carte-pad"><p class="info-note" role="status">' + esc(reg.notifMsg) + '</p></div>';
    if (reg.notifErreur) h += '<div class="carte-pad"><p class="info-erreur" role="alert">' + esc(reg.notifErreur) + '</p></div>';
    c.innerHTML = h;
  }
  const dirAppareils = k => k + (k > 1 ? ' appareils' : ' appareil');
  async function actionNotif(quoi) {
    if (reg.notifOccupe || !reg.notif) return;
    if (quoi === 'sw' && !reg.notif.possible) return;                          // l'état dit déjà pourquoi, à côté de l'interrupteur
    reg.notifOccupe = true; reg.notifErreur = ''; reg.notifMsg = ''; peindreNotif();           // ⛔ chaque essai écrit SON verdict
    try {
      if (quoi === 'sw') reg.notif = reg.notif.active ? await source.notifDesactiver() : await source.notifActiver();
      else if (quoi === 'apercu') reg.notif = await source.notifApercu(!reg.notif.apercu);
      else if (quoi === 'essai') {
        const r = await source.notifEssai();
        reg.notifMsg = r.appareils === 0 ? 'Aucun appareil n\'est abonné : active d\'abord les notifications.'
          : r.envoyes === r.appareils ? 'Notification envoyée à ' + dirAppareils(r.appareils) + '. Si tu ne la vois pas, regarde les réglages de notification de ton navigateur.'
          : r.envoyes === 0 ? 'La notification n\'a atteint aucun de tes ' + dirAppareils(r.appareils) + ' : le service de notification du navigateur ne répond pas. Réessaie dans un moment.'
          : 'La notification a atteint ' + r.envoyes + ' de tes ' + r.appareils + ' appareils ; les autres ne répondent pas.';
      }
    } catch (x) { reg.notifErreur = phrase(x, 'Ce réglage n\'a pas pu être enregistré.'); }
    try { reg.notif = await source.notifEtat(); } catch (x) { /* l'état d'avant reste affiché : le geste, lui, a dit son verdict */ }       // ce que l'écran montre est ce qui EST, pas ce qu'on a demandé
    reg.notifOccupe = false; peindreNotif();
    const b = document.getElementById('reg-notif-' + quoi); if (b) b.focus({ preventScroll: true });
  }
  /* ── Compte : exporter mes données (un fichier téléchargé), supprimer mon compte (une feuille qui dit tout) ── */
  function peindreCompte() {
    const c = $('reg-compte'); if (!c) return;
    c.innerHTML = '<button type="button" class="reglage presse" id="reg-export"' + (reg.exportOccupe ? ' aria-disabled="true"' : '') + '><span class="reglage-texte">Exporter mes données<small>Un fichier avec ton profil, tes contacts et tes conversations. Un export par jour.</small></span></button>' +
      (reg.exportMsg ? '<div class="carte-pad"><p class="info-note" role="status">' + esc(reg.exportMsg) + '</p></div>' : '') +
      (reg.exportErreur ? '<div class="carte-pad"><p class="info-erreur" role="alert">' + esc(reg.exportErreur) + '</p></div>' : '') +
      '<button type="button" class="reglage presse danger" id="reg-supprimer"><span class="reglage-texte">Supprimer mon compte<small>Ton compte est effacé après un délai ; te reconnecter avant annule la suppression.</small></span>' + CHEVRON + '</button>';
  }
  async function exporterDonnees() {
    if (reg.exportOccupe) return;
    reg.exportOccupe = true; reg.exportMsg = ''; reg.exportErreur = ''; peindreCompte();                // ⛔ chaque essai écrit SON verdict
    try {
      const r = await source.exporterDonnees();                                                       // { blob, nom }
      const url = URL.createObjectURL(r.blob), a = document.createElement('a');
      a.href = url; a.download = r.nom; a.rel = 'noopener'; a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      reg.exportMsg = 'Le fichier « ' + r.nom + ' » (' + tailleTexte(r.blob.size) + ') a été téléchargé. Tu pourras en demander un autre demain.';
    } catch (x) { reg.exportErreur = phrase(x, 'L\'export n\'a pas pu se faire. Réessaie dans un moment.'); }
    reg.exportOccupe = false; peindreCompte();
    const b = $('reg-export'); if (b) b.focus({ preventScroll: true });
  }
  function peindreStock() {
    const c = $('reg-stock'); if (!c) return;
    if (reg.stockErreur && !reg.stock) { c.innerHTML = refusBloc(reg.stockErreur); return; }
    if (!reg.stock) { c.innerHTML = '<p class="reg-ligne">Chargement…</p>'; return; }
    const pct = reg.stock.max > 0 ? Math.min(100, Math.max(0, reg.stock.utilise / reg.stock.max * 100)) : 0;
    c.innerHTML = '<p class="reg-ligne"><b>' + esc(tailleTexte(reg.stock.utilise)) + '</b> utilisés sur ' + esc(tailleTexte(reg.stock.max)) + '</p>' +
      '<div class="jauge" role="img" aria-label="' + Math.round(pct) + ' % de ton espace utilisé"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<p class="info-note">Les photos, vocaux et fichiers que tu envoies comptent ici ; supprimer le message qui les porte rend la place.</p>';
  }
  function peindreApropos() {
    const c = $('reg-apropos'); if (!c) return;
    if (reg.proposErreur && !reg.propos) { c.innerHTML = refusBloc(reg.proposErreur); return; }
    if (!reg.propos) { c.innerHTML = '<p class="reg-ligne">Chargement…</p>'; return; }
    const p = reg.propos, l = p.limites || {};
    c.innerHTML = '<p class="reg-ligne"><b>Service</b> ' + esc(LIEUX[p.instance] || p.instance || '—') + ', version ' + esc(p.version || '—') + '</p>' +
      '<p class="reg-ligne"><b>Adresse</b> ' + esc(location.host) + '</p>' +
      (l.photo_max ? '<p class="reg-ligne"><b>Au plus</b> photo ' + esc(tailleTexte(l.photo_max)) + ' · vocal ' + esc(tailleTexte(l.vocal_max)) + ' · fichier ' + esc(tailleTexte(l.fichier_max)) + '</p>' : '') +
      '<p class="info-note">Rien n\'est rangé sur cet appareil : les messages, les photos et les fichiers sont relus du service. Les photos sont réduites, et le lieu et l\'appareil qui les ont prises sont retirés avant qu\'elles soient rangées.</p>';
  }
  function peindreBloquesN() { const n = $('reg-bloques-n'); if (!n || typeof source.bloques !== 'function') return; const k = source.bloques().length; n.textContent = k ? String(k) : ''; }
  async function chargerReglages() {
    if (CAP.espaces) chargerEspaces();
    const jeton = ++reg.jeton;
    const [c, s2, a, nt] = await Promise.allSettled([source.confidentialite(), source.stockage(), source.aPropos(), CAP.notifications ? source.notifEtat() : Promise.resolve(null)]);
    if (jeton !== reg.jeton || !$('reg-conf')) return;
    if (CAP.notifications) { reg.notif = nt.status === 'fulfilled' ? nt.value : reg.notif; reg.notifLecture = nt.status === 'rejected' ? phrase(nt.reason, 'L\'état des notifications n\'a pas pu être lu.') : ''; peindreNotif(); }
    reg.conf = c.status === 'fulfilled' ? c.value : reg.conf; reg.confErreur = c.status === 'rejected' ? phrase(c.reason, 'Les réglages de confidentialité n\'ont pas pu être lus.') : '';
    reg.stock = s2.status === 'fulfilled' ? s2.value : reg.stock; reg.stockErreur = s2.status === 'rejected' ? phrase(s2.reason, 'L\'espace utilisé n\'a pas pu être lu.') : '';
    reg.propos = a.status === 'fulfilled' ? a.value : reg.propos; reg.proposErreur = a.status === 'rejected' ? phrase(a.reason, 'Les informations du service n\'ont pas pu être lues.') : '';
    peindreConf(); peindreStock(); peindreApropos();
  }
  function rendreReglages() {
    Object.assign(reg, { conf: null, confErreur: '', stock: null, stockErreur: '', propos: null, proposErreur: '', occupe: false, notif: null, notifLecture: '', notifErreur: '', notifMsg: '', notifOccupe: false, exportMsg: '', exportErreur: '', exportOccupe: false });
    $('vue-reglages').innerHTML = '<div class="entete-vue"></div><h1 class="grand-titre" id="titre-reglages">Réglages</h1>' +
      '<div class="carte" id="reg-profil"></div>' +
      (CAP.espaces ? '<div class="rubrique"><span>Entreprise</span><span id="reg-esp-n"></span></div><div class="carte" id="reg-esp"></div><div class="rubrique"><span>Abonnement</span></div><div class="carte" id="reg-abo"></div>' : '') +
      '<div class="rubrique"><span>Confidentialité</span></div><div class="carte" id="reg-conf"></div>' +
      (CAP.notifications ? '<div class="rubrique"><span>Notifications</span></div><div class="carte" id="reg-notif"></div>' : '') +
      '<div class="rubrique"><span>Contacts</span></div><div class="carte">' +
        '<button type="button" class="reglage presse" id="reg-contact">' + icone('i-groupe') + '<span class="reglage-texte">Ajouter un contact<small>Par un lien d\'invitation</small></span>' + CHEVRON + '</button>' +
        '<button type="button" class="reglage presse" id="reg-bloques"><span class="reglage-texte">Contacts bloqués</span><span class="reglage-valeur" id="reg-bloques-n"></span>' + CHEVRON + '</button></div>' +
      '<div class="rubrique"><span>Appareils</span></div><div class="carte"><button type="button" class="reglage presse" id="reg-autres"><span class="reglage-texte">Déconnecter les autres appareils<small>Ta session reste ouverte ici ; les autres doivent se reconnecter.</small></span></button></div>' +
      '<div class="rubrique"><span>Stockage</span></div><div class="carte carte-pad" id="reg-stock"></div>' +
      (CAP.compte ? '<div class="rubrique"><span>Compte</span></div><div class="carte" id="reg-compte"></div>' : '') +
      '<div class="rubrique"><span>À propos</span></div><div class="carte carte-pad" id="reg-apropos"></div>' +
      '<div class="carte"><button type="button" class="reglage presse danger" id="reg-sortir"><span class="reglage-texte">Se déconnecter</span></button></div>' +
      '<p class="info-erreur" id="reg-erreur" role="alert" hidden></p>';
    peindreProfilReglage(); peindreConf(); peindreStock(); peindreApropos(); peindreBloquesN();
    if (CAP.espaces) peindreEspaces();
    if (CAP.notifications) peindreNotif();
    if (CAP.compte) peindreCompte();
    chargerReglages();
  }
  /* revenir sur la page (après avoir autorisé les notifications dans les réglages du navigateur, par exemple) relit l'état affiché dans Réglages */
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && CAP.notifications && etat.route && etat.route.vue === 'reglages' && !reg.notifOccupe && $('reg-notif')) chargerReglages(); });
  $('vue-reglages').addEventListener('click', async e => {
    const er = $('reg-erreur'), nette = () => { er.hidden = true; er.textContent = ''; }, dit = (x, defaut) => { er.textContent = phrase(x, defaut); er.hidden = false; };
    const bouton = e.target.closest('button'); if (!bouton) return;
    if (bouton.id === 'reg-profil-bouton') { declencheur = bouton; ouvrirFeuille('profil'); return; }
    if (bouton.id === 'reg-contact' || bouton.id === 'reg-bloques') { declencheur = bouton; ouvrirFeuille('contact'); return; }
    if (bouton.dataset.espOuvrir) { declencheur = bouton; ouvrirFeuille('espace:' + bouton.dataset.espOuvrir); return; }
    if (bouton.dataset.espAbo) { declencheur = bouton; ouvrirFeuille('abo:' + bouton.dataset.espAbo); return; }
    if (bouton.id === 'reg-esp-gerer') { declencheur = bouton; ouvrirFeuille('entreprise'); return; }
    if (bouton.dataset.regRelire) { chargerReglages(); return; }
    if (bouton.id === 'reg-notif-sw' || bouton.id === 'reg-notif-apercu' || bouton.id === 'reg-notif-essai') { actionNotif(bouton.id.slice(10)); return; }
    if (bouton.id === 'reg-export') { exporterDonnees(); return; }
    if (bouton.id === 'reg-supprimer') { declencheur = bouton; ouvrirFeuille('suppression'); return; }
    if (bouton.dataset.regCle) {
      if (reg.occupe || !reg.conf) return;
      const cle = bouton.dataset.regCle;
      nette(); reg.occupe = true; reg.confErreur = ''; peindreConf();
      try { reg.conf = await source.majConfidentialite({ [cle]: !reg.conf[cle] }); }
      catch (x) { reg.confErreur = phrase(x, 'Ce réglage n\'a pas pu être enregistré.'); }
      reg.occupe = false; peindreConf();
      const b = document.querySelector('#reg-conf [data-reg-cle="' + cle + '"]'); if (b) b.focus({ preventScroll: true });
      return;
    }
    if (bouton.id === 'reg-autres') {
      if (bouton.getAttribute('aria-disabled') === 'true') return;
      nette();
      const t = bouton.querySelector('.reglage-texte').firstChild, normal = 'Déconnecter les autres appareils';
      if (bouton.dataset.pret !== '1') { bouton.dataset.pret = '1'; t.textContent = 'Toucher encore pour déconnecter les autres appareils'; setTimeout(() => { if (bouton.isConnected && bouton.dataset.pret === '1') { bouton.dataset.pret = ''; t.textContent = normal; } }, 4000); return; }
      bouton.dataset.pret = ''; t.textContent = normal; bouton.setAttribute('aria-disabled', 'true');
      try { const r = await source.deconnecterAutres(); mot((r.sessions > 1 ? r.sessions + ' autres appareils déconnectés' : r.sessions === 1 ? 'Un autre appareil déconnecté' : 'Aucun autre appareil n\'était connecté') + (r.notifications > 0 ? ' · leurs notifications sont coupées' : '')); }
      catch (x) { dit(x, 'Les autres appareils n\'ont pas pu être déconnectés.'); }
      finally { bouton.removeAttribute('aria-disabled'); }
      return;
    }
    if (bouton.id !== 'reg-sortir' || bouton.getAttribute('aria-disabled') === 'true') return;
    nette();                                                                 // ⛔ chaque essai écrit SON verdict
    bouton.setAttribute('aria-disabled', 'true');
    try { await source.deconnexion(); repartir('deconnecte'); }
    catch (x) { bouton.removeAttribute('aria-disabled'); dit(x, 'La déconnexion n\'a pas pu se faire : tu restes connecté.'); }
  });

  /* ── Supprimer mon compte : une feuille qui DIT ce qui part, ce qui reste chez les autres et quand ; la confirmation est une question, une case à cocher et un bouton ──
     ⛔ Le délai vient du SERVICE (`aPropos`), jamais d'un nombre écrit ici. Le bouton ne tourne pas tant que la case n'est pas cochée, et un refus du service se dit dans la feuille. */
  async function rendreSuppression() {
    const corps = $('info-corps');
    corps.dataset.sig = ''; corps.innerHTML = '<p class="vide">Chargement…</p>';
    let jours = null, panne = null;
    try { const p = await source.aPropos(); jours = p && p.suppressionJours; } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'suppression') return;           // la feuille s'est fermée pendant l'attente
    if (panne || !(jours > 0)) { corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(panne ? phrase(panne, 'Le délai de suppression n\'a pas pu être lu.') : 'Le délai de suppression n\'a pas pu être lu : réessaie dans un moment.') + '</p>'; return; }
    corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="rubrique"><span>Ce qui sera effacé</span></div><div class="carte carte-pad"><ul class="info-liste"><li>ton profil, ta photo et tes réglages ;</li><li>tes contacts et tes liens d\'invitation ;</li><li>tes notifications, et la liste de tes appareils connectés ;</li><li>les photos, vocaux et fichiers que tu as déposés sans les envoyer.</li></ul></div>' +
      '<div class="rubrique"><span>Ce qui reste chez les autres</span></div><div class="carte carte-pad"><p class="info-note">Les messages que tu as envoyés restent dans les conversations des autres, signés « Compte supprimé », avec leurs photos, vocaux et fichiers. Si tu étais le seul administrateur d\'un groupe, un autre membre le devient.</p></div>' +
      '<div class="rubrique"><span>Quand</span></div><div class="carte carte-pad"><p class="reg-ligne">Tu es déconnecté de tous tes appareils <b>tout de suite</b>. Ton compte est effacé dans <b>' + jours + (jours > 1 ? ' jours' : ' jour') + '</b>, vers le ' + esc(dateLongue(Date.now() + jours * 86400000)) + '.</p><p class="info-note">Jusque-là, il te suffit de te reconnecter pour annuler la suppression.</p></div>' +
      '<p class="reg-ligne" id="sp-question"><b>Supprimer définitivement ton compte ?</b></p>' +
      '<label class="case-conf"><input type="checkbox" id="sp-case"><span>Je comprends que mon compte sera effacé, et que les messages que j\'ai envoyés resteront chez les autres.</span></label>' +
      '<div class="info-actions"><button type="button" class="mini danger" data-act="suppression-confirmer" id="sp-oui" aria-disabled="true">Oui, supprimer mon compte</button><button type="button" class="mini" data-act="suppression-annuler">Non, garder mon compte</button></div>';
  }
  $('info-corps').addEventListener('change', e => {
    if (!e.target || e.target.id !== 'sp-case') return;
    const oui = $('sp-oui'); if (oui) { if (e.target.checked) oui.removeAttribute('aria-disabled'); else oui.setAttribute('aria-disabled', 'true'); }
    erreurInfo('');
  });

  /* ── Mon profil : la photo, le prénom, le nom, le statut ── */
  async function rendreProfil() {
    const corps = $('info-corps');
    corps.dataset.sig = ''; corps.innerHTML = '<p class="vide">Chargement…</p>';
    let p = null, panne = null;
    try { p = await source.profil(); } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'profil') return;           // la feuille s'est fermée pendant l'attente
    if (panne) { corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(phrase(panne, 'Ton profil n\'a pas pu être chargé.')) + '</p>'; return; }
    peindreProfil(p);
  }
  function peindreProfil(p) {
    const ph = blob(p.photo);
    $('info-corps').innerHTML = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="profil-photo">' + avatar(p) + '<div class="info-actions"><button type="button" class="mini" data-act="profil-photo">' + (ph ? 'Changer la photo' : 'Ajouter une photo') + '</button>' + (ph ? '<button type="button" class="mini danger" data-act="profil-photo-retirer">Retirer</button>' : '') + '</div></div>' +
      '<label class="champ-profil"><span>Prénom</span><input id="pf-prenom" type="text" maxlength="60" autocomplete="given-name" value="' + esc(p.champs.prenom) + '"></label>' +
      '<label class="champ-profil"><span>Nom</span><input id="pf-nom" type="text" maxlength="60" autocomplete="family-name" value="' + esc(p.champs.nom) + '"></label>' +
      '<label class="champ-profil"><span>Statut</span><input id="pf-statut" type="text" maxlength="140" autocomplete="off" placeholder="Ce que tes contacts voient sous ton nom" value="' + esc(p.champs.statut) + '"></label>' +
      '<div class="info-actions"><button type="button" class="mini" data-act="profil-enregistrer">Enregistrer</button></div>';
  }
  /* une photo de profil (la mienne, ou celle d'un groupe que j'administre) : réduite à 512 px et ~90 Ko, VALIDÉE par son décodage ; une image illisible ne change rien et le dit */
  $('profil-photo-fichier').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f || !etat.groupe.ouvert || etat.groupe.mode !== 'profil') return;
    erreurInfo('');
    try { const r = await reduireImage(f, 512, .85, 90 * 1024); peindreProfil(await source.poserPhotoProfil(r.blob)); mot('Photo enregistrée'); }
    catch (er) { erreurInfo(er && er.dit ? phrase(er) : 'Cette image n\'a pas pu être lue : ta photo n\'a pas changé.'); }
  });
  $('groupe-photo-fichier').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f || !etat.groupe.ouvert || etat.groupe.mode !== 'convinfo') return;
    const id = etat.groupe.convId;
    erreurInfo('');
    try { const r = await reduireImage(f, 512, .85, 90 * 1024); await source.majConversation(id, { photoBlob: r.blob }); mot('Photo du groupe changée'); if (etat.groupe.ouvert && etat.groupe.convId === id) rendreConvInfo(); }
    catch (er) { erreurInfo(er && er.dit ? phrase(er) : 'Cette image n\'a pas pu être lue : la photo du groupe n\'a pas changé.'); }
  });

  /* ── Contacts et liens : la feuille « Contacts » ── */
  function rendreFeuilleContact() {
    const code = etat.codeLien; etat.codeLien = null;
    $('info-corps').innerHTML = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="rubrique"><span>Mon lien d\'invitation</span></div><div class="carte carte-pad">' +
        '<p class="info-note">Envoie ce lien à quelqu\'un : en l\'ouvrant, il devient ton contact. Il ne sert qu\'une fois et reste valable 7 jours.</p><div id="ct-lien"></div>' +
        '<div class="info-actions"><button type="button" class="mini" data-act="lien-creer">Créer un lien</button><button type="button" class="mini danger" data-act="lien-revoquer">Révoquer mes liens</button></div></div>' +
      '<div class="rubrique"><span>J\'ai reçu un lien</span></div><div class="carte carte-pad">' +
        '<div class="info-champ"><input id="ct-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Coller le lien reçu" aria-label="Lien reçu"><button type="button" class="mini" data-act="lien-lire">Voir</button></div><div id="ct-apercu"></div></div>' +
      '<div class="rubrique"><span>Mes contacts</span><span id="ct-n"></span></div><div class="carte" id="ct-liste"></div>' +
      (typeof source.bloques === 'function' ? '<div class="rubrique"><span>Contacts bloqués</span><span id="ct-nb"></span></div><div class="carte" id="ct-bloques"></div>' : '');
    rendreListeContacts();
    if (code) { $('ct-code').value = code; lireLienSaisi().catch(e => erreurInfo(phrase(e, 'Ce lien n\'a pas pu être lu.'))); }
  }
  function rendreListeContacts() {
    const L = $('ct-liste'); if (!L) return;
    $('ct-n').textContent = CONTACTS.length ? String(CONTACTS.length) : '';
    L.innerHTML = CONTACTS.length ? CONTACTS.map(c => '<button type="button" class="contact presse" data-act="ecrire" data-uid="' + esc(c.id) + '">' + avatar(c) + '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span>' +
      (c.role ? '<span class="contact-role">' + esc(c.role) + '</span>' : '') + '</span>' + CHEVRON + '</button>').join('') : '<p class="vide">Aucun contact pour l\'instant.</p>';
    rendreListeBloques(); peindreBloquesN();
  }
  /* ⛔ un contact bloqué ne peut plus écrire ni être vu : ils se débloquent ICI (la liste vient de la source, sans réseau) */
  function rendreListeBloques() {
    const L = $('ct-bloques'); if (!L || typeof source.bloques !== 'function') return;
    const B = source.bloques();
    $('ct-nb').textContent = B.length ? String(B.length) : '';
    L.innerHTML = B.length ? B.map(c => '<div class="contact avec-actions">' + avatar(c) + '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span></span><span class="contact-actions"><button type="button" class="mini" data-act="debloquer" data-uid="' + esc(c.id) + '">Débloquer</button></span></div>').join('') : '<p class="vide">Aucun contact bloqué.</p>';
  }
  async function lireLienSaisi() {
    /* ⛔ ce qu'on colle est TOUT ce qu'on a reçu : une adresse suivie d'un point, entre guillemets, au milieu d'une phrase d'un message. Le code se lit derrière « lien= » ;
       à défaut, le DERNIER mot qui ressemble à un code (jamais le premier : « Voici mon lien : … »). */
    const brut = ($('ct-code').value || '').trim();
    const m = /lien=([A-Za-z0-9_-]{20,64})/.exec(brut) || /(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{20,64})(?![A-Za-z0-9_-])(?!.*[^A-Za-z0-9_-][A-Za-z0-9_-]{20,64}(?![A-Za-z0-9_-]))/.exec(brut);
    $('ct-apercu').innerHTML = '';
    if (!m) { erreurInfo('Ce lien n\'est pas valable : colle le lien reçu en entier.'); return; }
    const a = await source.lireLien(m[1]);
    $('ct-apercu').innerHTML = '<p class="info-note"><b>' + esc(a.de) + '</b> ' + (a.genre === 'groupe' ? 't\'invite dans le groupe « ' + esc((a.groupe && a.groupe.nom) || 'Groupe') + ' ».' : 'veut t\'ajouter à ses contacts.') +
      '</p><button type="button" class="mini" data-act="lien-accepter" data-code="' + esc(m[1]) + '">Accepter l\'invitation</button>';
  }
  const boiteLien = (id, code) => '<div class="lien-boite"><input id="' + id + '" type="text" readonly value="' + esc(location.origin + '/#lien=' + code) + '" aria-label="Ton lien d\'invitation"><button type="button" class="mini" data-act="copier" data-champ="' + id + '">Copier</button></div>';

  /* ── Les infos d'une conversation : membres, rôles, réglages, lien, sortie. Rien ne se redessine tant que ce que la source dit n'a pas changé (sinon une frappe lointaine ferait perdre le focus). ── */
  async function rendreConvInfo() {
    const id = etat.groupe.convId, corps = $('info-corps');
    let i = null, panne = null;
    try { i = await source.infos(id); } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.convId !== id) return;                // la feuille s'est fermée pendant l'attente
    if (panne) { corps.dataset.sig = ''; corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(phrase(panne, 'Les infos n\'ont pas pu être chargées.')) + '</p>'; return; }
    if (!i) { mot('Cette conversation n\'existe plus.'); fermerCouche(); return; }
    /* un canal PRIVÉ que j'administre : les collègues que je peux y ajouter sont ceux de son espace (« Contacts de l'entreprise »), jamais mes seuls contacts */
    let collegues = null;
    if (CAP.espaces && i.type === 'canal' && i.prive && i.moiAdmin && i.espace) {
      try { collegues = (await source.espaceContacts(i.espace)).contacts; } catch (e) { collegues = []; }
      if (!etat.groupe.ouvert || etat.groupe.convId !== id) return;                // la feuille s'est fermée pendant l'attente
    }
    const sig = JSON.stringify([i.nom, !!i.photo, i.moiAdmin, i.annoncesSeulement, i.ephemeres, i.enLigne, i.sourdine || 0, i.membres.map(m => [m.id, m.nom, m.role, m.enLigne])]) + '|' + CONTACTS.map(c => c.id).join(',') + '|' + (collegues ? collegues.map(c => c.id).join(',') : '');
    if (corps.dataset.sig === sig && corps.children.length) return;
    corps.dataset.sig = sig;
    const actif = document.activeElement, cle = actif && corps.contains(actif) && actif.dataset.act ? actif.dataset.act + '|' + (actif.dataset.uid || '') : null;
    const g = i.type === 'groupe', canal = i.type === 'canal', eph = EPHEMERES.find(e => e[0] === i.ephemeres) || [i.ephemeres, i.ephemeres + ' s'], off = i.moiAdmin ? '' : ' disabled';
    corps.dataset.espace = canal && i.espace ? i.espace : '';
    const sd = CAP.notifications && !i.supprime ? (Number(i.sourdine) || 0) : -1;           // -1 : pas de sourdine à proposer ; 0 : pas en sourdine ; sinon l'échéance
    let h = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="info-tete">' + avatar(i) + '<div><h3 class="info-nom">' + esc(i.nom) + '</h3><p class="info-sous">' + (g ? 'Groupe · ' + i.membres.length + (i.membres.length > 1 ? ' membres' : ' membre') : canal ? 'Canal ' + (i.prive ? 'privé' : 'public') + ' · ' + i.membres.length + (i.membres.length > 1 ? ' membres' : ' membre') : (i.enLigne ? 'En ligne' : 'Conversation à deux')) + '</p></div></div>' +
      (g && i.moiAdmin && CAP.avatars ? '<div class="info-actions info-photo-actions"><button type="button" class="mini" data-act="groupe-photo">' + (blob(i.photo) ? 'Changer la photo' : 'Ajouter une photo') + '</button>' + (blob(i.photo) ? '<button type="button" class="mini danger" data-act="groupe-photo-retirer">Retirer la photo</button>' : '') + '</div>' : '') +
      (canal ? '' : '<div class="carte">') + (g ? '<button type="button" class="reglage presse" data-act="annonces" role="switch" aria-checked="' + (i.annoncesSeulement ? 'true' : 'false') + '"' + off + '><span class="reglage-texte">Seuls les admins écrivent<small>Groupe d\'annonces</small></span><span class="interrupteur" aria-hidden="true"></span></button>' : '') +
      (canal ? '' : '<button type="button" class="reglage presse" data-act="ephemeres"' + off + '><span class="reglage-texte">Messages éphémères</span><span class="reglage-valeur">' + esc(eph[1]) + '</span>' + (i.moiAdmin ? CHEVRON : '') + '</button></div>');
    /* la sourdine : plus de notification pour CETTE conversation (8 heures, une semaine, toujours) — le service ne l'envoie pas, la page continue de recevoir */
    if (sd > Date.now()) h += '<div class="carte"><div class="reglage"><span class="reglage-texte">Notifications coupées<small>' + esc(sd - Date.now() > 5 * 365 * 86400000 ? 'En sourdine pour toujours' : 'En sourdine jusqu\'au ' + dateLongue(sd)) + '</small></span><button type="button" class="mini" data-act="sourdine" data-duree="off">Réactiver</button></div></div>';
    else if (sd >= 0) h += '<div class="carte"><div class="reglage"><span class="reglage-texte">Mettre en sourdine<small>Plus de notification pour cette conversation</small></span></div><div class="carte-pad info-actions"><button type="button" class="mini" data-act="sourdine" data-duree="8h">8 heures</button><button type="button" class="mini" data-act="sourdine" data-duree="1s">1 semaine</button><button type="button" class="mini" data-act="sourdine" data-duree="tj">Toujours</button></div></div>';
    if (g) {
      h += '<div class="rubrique"><span>Membres</span><span>' + i.membres.length + '</span></div><div class="carte">' + i.membres.map(m =>
        '<div class="contact' + (i.moiAdmin && !m.moi ? ' avec-actions' : '') + '">' + avatar(m) + '<span class="contact-texte"><span class="contact-nom">' + esc(m.moi ? 'Vous' : m.nom) + (m.role === 'admin' ? '<span class="badge-admin">Admin</span>' : '') + '</span>' + (m.enLigne && !m.moi ? '<span class="contact-role">En ligne</span>' : '') + '</span>' +
        (i.moiAdmin && !m.moi ? '<span class="contact-actions"><button type="button" class="mini" data-act="admin" data-uid="' + esc(m.id) + '" data-admin="' + (m.role === 'admin' ? '0' : '1') + '">' + (m.role === 'admin' ? 'Retirer l\'admin' : 'Nommer admin') +
          '</button><button type="button" class="mini danger" data-act="retirer" data-uid="' + esc(m.id) + '">Retirer</button></span>' : '') + '</div>').join('') + '</div>';
      if (i.moiAdmin) {
        const ajoutables = CONTACTS.filter(c => !i.membres.some(m => m.id === c.id));
        h += '<div class="rubrique"><span>Ajouter au groupe</span></div><div class="carte">' + ajoutables.map(c => '<div class="contact">' + avatar(c) + '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span></span><button type="button" class="mini" data-act="ajouter" data-uid="' + esc(c.id) + '">Ajouter</button></div>').join('') +
          '<button type="button" class="reglage presse" data-act="lien-groupe">' + icone('i-groupe') + '<span class="reglage-texte">Inviter par un lien</span>' + CHEVRON + '</button></div><div id="ci-lien"></div>';
      }
      h += '<div class="carte"><button type="button" class="reglage presse danger" data-act="quitter"><span class="reglage-texte">Quitter le groupe</span></button></div>';
    } else if (canal) {
      /* un canal : son rôle est celui de l'ESPACE (l'administrateur de l'espace modère, les membres lisent et écrivent). Public : tous les membres de l'espace, on y entre et on en sort avec lui ;
         privé : ceux qu'un administrateur y a mis. Les gestes de l'administrateur passent par les routes de l'espace (`espace` vient du canal lui-même, jamais de la page). */
      const modifiable = CAP.espaces && i.moiAdmin && !!i.espace;
      /* ⛔ la hiérarchie de l'espace vaut dans ses canaux (le service la fait respecter) : seul le PROPRIÉTAIRE retire un administrateur, et personne ne retire le propriétaire — l'écran ne propose que ce qui peut marcher */
      const moiProprio = !!(esp.liste || []).find(x => x.id === i.espace && x.proprio);
      const retirable = m => modifiable && i.prive && !m.moi && (m.role !== 'admin' || moiProprio);
      h += '<div class="rubrique"><span>Membres</span><span>' + i.membres.length + '</span></div><div class="carte">' + i.membres.map(m =>
        '<div class="contact' + (retirable(m) ? ' avec-actions' : '') + '">' + avatar(m) + '<span class="contact-texte"><span class="contact-nom">' + esc(m.moi ? 'Vous' : m.nom) + (m.role === 'admin' ? '<span class="badge-admin">Admin</span>' : '') + '</span>' + (m.enLigne && !m.moi ? '<span class="contact-role">En ligne</span>' : '') + '</span>' +
        (retirable(m) ? '<span class="contact-actions"><button type="button" class="mini danger" data-act="can-retirer-membre" data-uid="' + esc(m.id) + '">Retirer</button></span>' : '') + '</div>').join('') + '</div>';
      if (!i.prive) h += '<p class="info-note">Un canal public réunit tous les membres de l\'espace : on y entre et on en sort avec l\'espace.</p>';
      if (modifiable && i.prive) {
        const ajoutables = (collegues || []).filter(c => !c.moi && !i.membres.some(m => m.id === c.id));
        h += '<div class="rubrique"><span>Ajouter au canal</span></div><div class="carte">' + (ajoutables.length ? ajoutables.map(c => '<div class="contact">' + avatar(c) + '<span class="contact-texte"><span class="contact-nom">' + esc(c.nom) + '</span></span><button type="button" class="mini" data-act="can-ajouter-membre" data-uid="' + esc(c.id) + '">Ajouter</button></div>').join('') : '<p class="vide">Tous les membres de l\'espace sont déjà dans ce canal.</p>') + '</div>';
      }
      if (modifiable) h += '<div class="rubrique"><span>Renommer</span></div><div class="carte carte-pad"><div class="info-champ"><input id="cn-renom" type="text" maxlength="80" autocomplete="off" value="' + esc(i.nom) + '" aria-label="Nom du canal"><button type="button" class="mini" data-act="can-renommer">Enregistrer</button></div></div>';
      if (i.prive) h += '<div class="carte"><button type="button" class="reglage presse danger" data-act="can-quitter"><span class="reglage-texte">Quitter le canal</span></button></div>';
      if (modifiable) h += '<div class="carte"><button type="button" class="reglage presse danger" data-act="can-supprimer"><span class="reglage-texte">Supprimer le canal<small>Ses messages sont effacés pour tous.</small></span></button></div>';
    } else if (CAP.reglages) {
      const autre = i.membres.find(m => !m.moi);
      if (autre) h += '<div class="carte"><button type="button" class="reglage presse danger" data-act="bloquer" data-uid="' + esc(autre.id) + '"><span class="reglage-texte">Bloquer ce contact</span></button></div>';
    }
    corps.innerHTML = h;
    if (cle) { const [a, u] = cle.split('|'); const b = Array.from(corps.querySelectorAll('[data-act]')).find(x => x.dataset.act === a && (x.dataset.uid || '') === u); if (b) b.focus({ preventScroll: true }); }
  }

  /* ── Une seule écoute pour les gestes des feuilles « Contacts » et « Infos » (chaque geste efface le refus d'avant avant de travailler) ── */
  $('info-corps').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const act = b.dataset.act, id = etat.groupe.convId;
    erreurInfo('');
    try {
      if (act === 'lien-creer') { const r = await source.lienContact(); $('ct-lien').innerHTML = boiteLien('ct-lien-champ', r.code); }
      else if (act === 'lien-revoquer') { const n = await source.revoquerLiens(); $('ct-lien').innerHTML = ''; mot(n ? n + (n > 1 ? ' liens révoqués' : ' lien révoqué') : 'Aucun lien à révoquer'); }
      else if (act === 'copier') { const c = $(b.dataset.champ); mot(c && await copier(c.value) ? 'Lien copié' : 'Copie impossible : sélectionne le lien et copie-le'); }
      else if (act === 'lien-lire') await lireLienSaisi();
      else if (act === 'lien-accepter') { const r = await source.accepterLien(b.dataset.code); mot(r.deja ? 'Déjà dans tes contacts' : r.genre === 'groupe' ? 'Tu as rejoint le groupe' : 'Contact ajouté'); ouvrirConvId(r.conv); }
      else if (act === 'ecrire') { const c = await source.ouvrirDirecte(b.dataset.uid); ouvrirConvId(c); }
      else if (act === 'annonces') await source.majConversation(id, { annonces: b.getAttribute('aria-checked') !== 'true' });
      else if (act === 'ephemeres') { const i = EPHEMERES.findIndex(x => x[1] === b.querySelector('.reglage-valeur').textContent); await source.majConversation(id, { ephemeres: EPHEMERES[(i + 1) % EPHEMERES.length][0] }); }
      else if (act === 'admin') await source.nommerAdmin(id, b.dataset.uid, b.dataset.admin === '1');
      else if (act === 'retirer') await source.retirerMembre(id, b.dataset.uid);
      else if (act === 'ajouter') await source.ajouterMembres(id, [b.dataset.uid]);
      else if (act === 'lien-groupe') { const r = await source.lienGroupe(id); $('ci-lien').innerHTML = boiteLien('ci-lien-champ', r.code); }
      else if (act === 'debloquer') { await source.debloquer(b.dataset.uid); rendreListeBloques(); peindreBloquesN(); mot('Contact débloqué'); }
      else if (act === 'bloquer') {
        if (b.dataset.pret !== '1') { b.dataset.pret = '1'; b.querySelector('.reglage-texte').textContent = 'Toucher encore pour bloquer ce contact'; setTimeout(() => { if (b.isConnected) { b.dataset.pret = ''; b.querySelector('.reglage-texte').textContent = 'Bloquer ce contact'; } }, 4000); return; }
        await source.bloquer(b.dataset.uid); mot('Contact bloqué');
        remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null });
      }
      else if (act === 'sourdine') { await source.sourdine(id, b.dataset.duree); mot(b.dataset.duree === 'off' ? 'Notifications réactivées' : 'Conversation en sourdine'); }
      else if (act === 'suppression-annuler') { fermerFeuille(false); return; }
      else if (act === 'suppression-confirmer') {
        if (b.getAttribute('aria-disabled') === 'true') { if (!$('sp-case').checked) erreurInfo('Coche la case pour confirmer la suppression de ton compte.'); return; }
        b.setAttribute('aria-disabled', 'true');
        try { const r = await source.supprimerCompte(); repartir('suppression', r.suppression_le); return; }
        catch (er) { b.removeAttribute('aria-disabled'); erreurInfo(phrase(er, 'La suppression n\'a pas pu se faire : ton compte est inchangé.')); return; }
      }
      else if (act === 'profil-photo') $('profil-photo-fichier').click();
      else if (act === 'profil-photo-retirer') { peindreProfil(await source.retirerPhotoProfil()); mot('Photo retirée'); }
      else if (act === 'profil-enregistrer') {
        const prenomSaisi = $('pf-prenom').value.trim();
        if (!prenomSaisi) { erreurInfo('Le prénom ne peut pas être vide.'); $('pf-prenom').focus(); return; }
        peindreProfil(await source.majProfil({ prenom: prenomSaisi, nom: $('pf-nom').value.trim(), statut: $('pf-statut').value.trim() })); mot('Profil enregistré');
      }
      else if (act === 'groupe-photo') $('groupe-photo-fichier').click();
      else if (act === 'groupe-photo-retirer') await source.majConversation(id, { photoBlob: null });
      else if (act === 'quitter') {
        if (b.dataset.pret !== '1') { b.dataset.pret = '1'; b.querySelector('.reglage-texte').textContent = 'Toucher encore pour quitter le groupe'; setTimeout(() => { if (b.isConnected) { b.dataset.pret = ''; b.querySelector('.reglage-texte').textContent = 'Quitter le groupe'; } }, 4000); return; }
        await source.quitter(id); mot('Tu as quitté le groupe');
        remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null });
      }
      if (etat.groupe.ouvert && etat.groupe.mode === 'convinfo' && !/lien|copier|quitter/.test(act)) rendreConvInfo();
    } catch (er) { erreurInfo(phrase(er, 'Cette action n\'a pas pu se faire.')); }
  });
  function surContacts() {
    if (typeof source.contacts !== 'function') return;
    CONTACTS = source.contacts();
    peindreBloquesN(); peindreProfilReglage();
    if (!etat.groupe.ouvert) return;
    if (etat.groupe.mode === 'chat' || etat.groupe.mode === 'appel') { construireContacts(); synchroFeuille(); }
    else if (etat.groupe.mode === 'contact') rendreListeContacts();      // la liste des contacts ET celle des bloqués
    else if (etat.groupe.mode === 'convinfo') rendreConvInfo();
  }

  /* ═══ 13. LES ESPACES PROFESSIONNELS ET MESSAGES PRO — « Contacts de l'entreprise », les canaux, les invitations, l'abonnement ═════════════════════════
     ⛔ Tout ce bloc dort dans l'aperçu : il ne s'éveille que si la source annonce la capacité `espaces`. UN ESPACE EST UNE ENTREPRISE : on y voit ses collègues (« Contacts de l'entreprise ») et
     personne d'autre — aucune recherche par nom hors de l'espace : le champ de la feuille ne FILTRE que la liste déjà reçue. Le SERVICE décide de tout (rôle, formule, places) ; la page montre
     ce qu'il a dit. ⛔ Un refus se DIT (`phraseEspace`) : un administrateur lit POURQUOI une fonction Pro refuse (paiement en retard, jamais abonné), un membre lit « fonction Pro » et rien de
     plus ; et une fonction refusée ne retire RIEN — ni les messages, ni les canaux, ni les membres, et la page le dit. L'espace se lit dans la ROUTE de la feuille (`espace:<id>`, validée), jamais
     dans un champ de la page ; les confirmations graves se font en DEUX touches, dites sur le bouton ; les adresses de paiement viennent de la source (https seulement). */
  const ID_ESPACE = /^e_[0-9a-f]{32}$/;
  const esp = { liste: null, formule: 'perso', ouvert: false, erreur: '', jeton: 0, forme: { prive: false, choisis: [] }, abo: null, lien: null };
  /* le lien qu'on vient de créer fait partie de ce que la feuille MONTRE : créer un lien change le nombre d'invitations de l'espace, le service le dit à la page, et le redessin qui suit ne doit pas l'effacer
     (relevé au navigateur : le lien paraissait puis disparaissait avant qu'on puisse le copier) */
  const htmlLienInvitation = X => X ? '<div class="lien-boite"><input id="esp-lien-champ" type="text" readonly value="' + esc(location.origin + '/#invitation=' + X.code) + '" aria-label="Ton lien d\'invitation"><button type="button" class="mini" data-act="copier" data-champ="esp-lien-champ">Copier</button></div>' +
    '<p class="info-note">Valable jusqu\'au ' + esc(dateLongue(X.expireLe)) + ', pour ' + X.max + (X.max > 1 ? ' personnes' : ' personne') + ' au plus.</p>' : '';
  const aboEtat = { cycle: null, places: 0 };           // le formulaire de paiement (le propriétaire seul) : il survit à un redessin de la feuille
  const initialesEspace = nom => { const m = String(nom).trim().split(/\s+/).filter(Boolean); return m.length ? (Array.from(m[0])[0] + (m[1] ? Array.from(m[1])[0] : '')).toUpperCase() : '?'; };
  const avatarEspace = x => ({ avatar: Array.from(String(x.id)).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 6007, 0) % 6, initiales: initialesEspace(x.nom), photo: null });
  const nMembres = n => n + (n > 1 ? ' membres' : ' membre');
  /* « 5 membres pour 3 places » : les DEUX nombres que le service a comptés, jamais un seul (l'administrateur doit savoir de combien il manque) */
  const membresPourPlaces = (n, p) => nMembres(n) + ' pour ' + p + (p > 1 ? ' places' : ' place');
  const roleEspace = x => x.proprio ? 'Propriétaire' : (x.moiAdmin || x.role === 'admin') ? 'Administrateur' : 'Membre';
  const FORMULE_LBL = { pro: 'Messages Pro', perso: 'Messages Perso', impaye: 'Messages Pro — paiement en retard' };
  const STATUT_ABO = { active: 'Actif', trialing: 'Période d\'essai', past_due: 'Paiement en retard', unpaid: 'Impayé', canceled: 'Résilié', incomplete: 'Paiement non terminé', incomplete_expired: 'Paiement expiré', paused: 'En pause' };
  const dateCourte = ts => { try { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  const euros = n => { try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n); } catch (e) { return n + ' €'; } };
  function phraseEspace(e, defaut) {
    let t = phrase(e, defaut);
    if (e && e.code === 'formule_requise' && e.raison === 'impaye') t += ' L\'abonnement de l\'espace est en retard : règle-le (Réglages › Abonnement) pour les retrouver. Rien n\'est perdu : les messages, les canaux et les membres restent.';
    else if (e && e.code === 'formule_requise' && e.raison === 'perso') t += ' Cet espace n\'a pas d\'abonnement Messages Pro (Réglages › Abonnement).';
    else if (e && e.code === 'places_invalides' && e.min > 0) t = 'Le nombre de places est incorrect : au moins ' + e.min + ' (le nombre de membres), 500 au plus.';
    else if (e && e.code === 'places_epuisees' && e.places > 0) t += ' (' + e.membres + ' membres pour ' + e.places + ' places.)';
    return t;
  }
  /* une action grave demande une SECONDE touche, dite sur le bouton lui-même ; vrai à la seconde (le libellé d'origine revient au bout de 4 s sans elle) */
  function armer(b, pret) {
    if (b.dataset.pret === '1') { b.dataset.pret = ''; return true; }
    const t = b.querySelector('.reglage-texte') || b, n = t.firstChild, normal = n ? n.textContent : '';
    b.dataset.pret = '1'; if (n) n.textContent = pret;
    setTimeout(() => { if (b.isConnected && b.dataset.pret === '1') { b.dataset.pret = ''; if (n) n.textContent = normal; } }, 4000);
    return false;
  }

  /* ── Réglages › Entreprise et Abonnement ── */
  function peindreEspaces() {
    const c = $('reg-esp'), a = $('reg-abo'), n = $('reg-esp-n'); if (!c || !a) return;
    if (!esp.liste) { c.innerHTML = esp.erreur ? '<div class="carte-pad">' + refusBloc(esp.erreur) + '</div>' : '<p class="vide">Chargement…</p>'; a.innerHTML = ''; if (n) n.textContent = ''; return; }
    const L = esp.liste;
    if (n) n.textContent = L.length ? String(L.length) : '';
    c.innerHTML = L.map(x => '<button type="button" class="contact presse" data-esp-ouvrir="' + esc(x.id) + '">' + avatar(avatarEspace(x)) + '<span class="contact-texte"><span class="contact-nom">' + esc(x.nom) + '</span><span class="contact-role">' + esc(roleEspace(x) + ' · ' + nMembres(x.membres)) + '</span></span>' + CHEVRON + '</button>').join('') +
      '<button type="button" class="reglage presse" id="reg-esp-gerer">' + icone('i-groupe') + '<span class="reglage-texte">Créer ou rejoindre un espace<small>Un espace réunit les personnes d\'une entreprise</small></span>' + CHEVRON + '</button>' +
      (esp.erreur ? '<div class="carte-pad"><p class="info-erreur" role="alert">' + esc(esp.erreur) + '</p></div>' : '');
    const admins = L.filter(x => x.moiAdmin);
    a.innerHTML = '<div class="carte-pad"><p class="reg-ligne"><b>Ta formule</b> ' + esc(FORMULE_LBL[esp.formule] || FORMULE_LBL.perso) + '</p>' +
      (esp.ouvert ? '' : '<p class="info-note">L\'abonnement n\'est pas encore ouvert sur ce service.</p>') +
      (esp.formule === 'perso' ? '<p class="info-note">Messages Pro s\'ajoute à un espace d\'entreprise : il ouvre les canaux et les liens d\'invitation à tout l\'espace.</p>' : '') + '</div>' +
      admins.map(x => '<button type="button" class="reglage presse" data-esp-abo="' + esc(x.id) + '"><span class="reglage-texte">' + esc(x.nom) + '<small>' + esc(x.proprio ? 'Tu gères l\'abonnement de cet espace' : 'Lecture seule : seul le propriétaire paie') + '</small></span>' + CHEVRON + '</button>').join('');
  }
  async function chargerEspaces() {
    const jeton = ++esp.jeton;
    let r = null, panne = '';
    try { r = await source.espaces(); } catch (x) { panne = phrase(x, 'Tes espaces n\'ont pas pu être lus.'); }
    if (jeton !== esp.jeton || !$('reg-esp')) return;
    if (r) { esp.liste = r.espaces; esp.formule = r.formule; esp.ouvert = r.abonnementOuvert; esp.erreur = ''; } else esp.erreur = panne;
    peindreEspaces();
  }

  /* ── La feuille « Entreprise » : mes espaces, en créer un, en rejoindre un par un lien ── */
  const CODE_INVITATION = /invitation=([A-Za-z0-9_-]{20,64})/;
  const invitationDansAdresse = () => { const m = /(?:^|[#&])invitation=([A-Za-z0-9_-]{20,64})/.exec(location.hash || ''); return m ? m[1] : null; };
  const basculerFeuille = cle => remplacer(Object.assign({}, etat.route, { feuille: cle }));
  async function rendreEntreprise() {
    const corps = $('info-corps'), code = etat.codeInvitation; etat.codeInvitation = null;
    corps.dataset.sig = ''; corps.innerHTML = '<p class="vide">Chargement…</p>';
    let r = null, panne = null;
    try { r = await source.espaces(); } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'entreprise') return;           // la feuille s'est fermée pendant l'attente
    if (panne) { corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(phrase(panne, 'Tes espaces n\'ont pas pu être lus.')) + '</p>'; return; }
    esp.liste = r.espaces; esp.formule = r.formule; esp.ouvert = r.abonnementOuvert;
    corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="rubrique"><span>Mes espaces</span><span>' + (r.espaces.length || '') + '</span></div><div class="carte">' + (r.espaces.length ? r.espaces.map(x => '<button type="button" class="contact presse" data-act="esp-ouvrir" data-id="' + esc(x.id) + '">' + avatar(avatarEspace(x)) +
        '<span class="contact-texte"><span class="contact-nom">' + esc(x.nom) + '</span><span class="contact-role">' + esc(roleEspace(x) + ' · ' + nMembres(x.membres)) + '</span></span>' + CHEVRON + '</button>').join('') : '<p class="vide">Tu n\'es dans aucun espace pour l\'instant.</p>') + '</div>' +
      '<div class="rubrique"><span>Créer un espace</span></div><div class="carte carte-pad"><p class="info-note">Un espace réunit les personnes d\'une entreprise : elles se retrouvent dans « Contacts de l\'entreprise » et dans les canaux de l\'espace. Créer un espace fait partie de Messages Pro.</p>' +
        '<div class="info-champ"><input id="en-nom" type="text" maxlength="80" autocomplete="organization" placeholder="Nom de l\'entreprise" aria-label="Nom de l\'espace"><button type="button" class="mini" data-act="esp-creer">Créer</button></div></div>' +
      '<div class="rubrique"><span>J\'ai reçu un lien</span></div><div class="carte carte-pad"><p class="info-note">Colle le lien d\'invitation que l\'administrateur de ton entreprise t\'a envoyé.</p>' +
        '<div class="info-champ"><input id="en-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Coller le lien reçu" aria-label="Lien d\'invitation reçu"><button type="button" class="mini" data-act="esp-lien-lire">Voir</button></div><div id="en-apercu"></div></div>';
    if (code) { $('en-code').value = code; lireInvitationSaisie().catch(e => erreurInfo(phraseEspace(e, 'Ce lien n\'a pas pu être lu.'))); }
  }
  async function lireInvitationSaisie() {
    /* le lien se lit comme celui d'un contact : derrière « invitation= », sinon le DERNIER mot qui ressemble à un code (jamais le premier : « Voici mon lien : … ») */
    const brut = ($('en-code').value || '').trim();
    const m = CODE_INVITATION.exec(brut) || /(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{20,64})(?![A-Za-z0-9_-])(?!.*[^A-Za-z0-9_-][A-Za-z0-9_-]{20,64}(?![A-Za-z0-9_-]))/.exec(brut);
    $('en-apercu').innerHTML = '';
    if (!m) { erreurInfo('Ce lien n\'est pas valable : colle le lien reçu en entier.'); return; }
    const a = await source.invitationLire(m[1]);
    $('en-apercu').innerHTML = '<p class="info-note"><b>' + esc(a.de) + '</b> t\'invite dans l\'espace « ' + esc(a.espace.nom) + ' » (' + esc(nMembres(a.espace.membres)) + ').</p>' +
      '<button type="button" class="mini" data-act="esp-rejoindre" data-code="' + esc(m[1]) + '">Rejoindre l\'espace</button>';
  }

  /* ── La feuille d'UN espace : contacts de l'entreprise, canaux, invitations, abonnement, sortie ── */
  function ligneMembreEspace(p, d) {
    /* le propriétaire ne se retire ni ne se rétrograde ; seul le propriétaire touche à un administrateur (le service refuse sinon : l'écran ne propose que ce qui peut marcher) */
    const agit = d.moiAdmin && !p.moi && !p.proprio && (p.role !== 'admin' || d.proprio), act = [];
    if (!p.moi) act.push('<button type="button" class="mini" data-act="ecrire" data-uid="' + esc(p.id) + '">Écrire</button>');
    if (agit) act.push('<button type="button" class="mini" data-act="esp-role" data-uid="' + esc(p.id) + '" data-admin="' + (p.role === 'admin' ? '0' : '1') + '">' + (p.role === 'admin' ? 'Retirer l\'admin' : 'Nommer admin') + '</button>');
    if (agit) act.push('<button type="button" class="mini danger" data-act="esp-retirer" data-uid="' + esc(p.id) + '">Retirer</button>');
    if (d.proprio && !p.moi) act.push('<button type="button" class="mini danger" data-act="esp-transferer" data-uid="' + esc(p.id) + '">Passer la propriété</button>');
    return '<div class="contact' + (act.length ? ' avec-actions' : '') + '" data-nom="' + esc(norme(p.nom)) + '">' + avatar(p) + '<span class="contact-texte"><span class="contact-nom">' + esc(p.moi ? 'Vous' : p.nom) +
      (p.proprio ? '<span class="badge-admin">Propriétaire</span>' : p.role === 'admin' ? '<span class="badge-admin">Admin</span>' : '') + '</span>' + (p.enLigne || p.statut ? '<span class="contact-role">' + esc(p.enLigne ? 'En ligne' : p.statut) + '</span>' : '') + '</span>' +
      (act.length ? '<span class="contact-actions">' + act.join('') + '</span>' : '') + '</div>';
  }
  /* le champ de la feuille FILTRE la liste reçue (accents et casse ignorés) ; il ne cherche nulle part ailleurs */
  function appliquerFiltreEspace() {
    const f = $('esp-filtre'), q = f ? norme(f.value) : '', lignes = Array.from(document.querySelectorAll('#esp-contacts .contact[data-nom]'));
    lignes.forEach(l => { l.hidden = !!q && !l.dataset.nom.includes(q); });
    const a = $('esp-aucun'); if (a) a.hidden = !lignes.length || lignes.some(l => !l.hidden);
  }
  async function rendreEspace() {
    const id = etat.groupe.espaceId, corps = $('info-corps');
    let d = null, c = null, panne = null;
    try { [d, c] = await Promise.all([source.espace(id), source.espaceContacts(id)]); } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'espace' || etat.groupe.espaceId !== id) return;           // la feuille s'est fermée pendant l'attente
    if (panne) {
      if (panne.code === 'introuvable') { mot('Cet espace n\'existe plus, ou tu n\'en fais plus partie.'); fermerCouche(); chargerEspaces(); rafraichirListe(); return; }
      corps.dataset.sig = ''; corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(phrase(panne, 'Cet espace n\'a pas pu être chargé.')) + '</p>'; return;
    }
    if (!corps.children.length) { esp.forme = { prive: false, choisis: [] }; esp.lien = null; }   // une feuille neuve repart d'un formulaire vierge, sans le lien de la feuille d'avant
    const lien = esp.lien && esp.lien.espace === id ? esp.lien : null;
    /* rien ne se redessine tant que ce que la source dit n'a pas changé (sinon un événement lointain ferait perdre le focus) ; ce que la personne a TAPÉ et le champ actif survivent au redessin */
    const sig = JSON.stringify([d, c.contacts.map(p => [p.id, p.nom, p.role, p.proprio, p.enLigne, p.statut, !!p.photo]), esp.forme, lien]);
    if (corps.dataset.sig === sig && corps.children.length) return;
    const champs = {}; corps.querySelectorAll('input[id]').forEach(x => { champs[x.id] = x.value; });
    const actif = document.activeElement, cle = actif && corps.contains(actif) ? (actif.id ? '#' + actif.id : actif.dataset.act ? actif.dataset.act + '|' + (actif.dataset.uid || actif.dataset.id || '') : null) : null;
    corps.dataset.sig = sig;
    const admin = d.moiAdmin, a = d.admin, f = esp.forme;
    let h = '<p class="info-erreur" id="info-erreur" role="alert" hidden></p>' +
      '<div class="info-tete">' + avatar(avatarEspace(d)) + '<div><h3 class="info-nom">' + esc(d.nom) + '</h3><p class="info-sous">' + esc(roleEspace(d) + ' · ' + nMembres(d.membres)) + '</p></div></div>';
    if (admin) h += '<div class="carte"><button type="button" class="reglage presse" data-act="abo-ouvrir"><span class="reglage-texte">Messages Pro<small>' +
      esc(a && a.formule === 'pro' ? 'Les fonctions Pro de l\'espace sont disponibles' : a && a.formule === 'impaye' ? 'Paiement en retard : les fonctions Pro sont suspendues' : 'Pas d\'abonnement : les fonctions Pro sont indisponibles') + '</small></span>' + CHEVRON + '</button></div>';
    else if (!d.fonctionsPro) h += '<p class="info-note">Les fonctions Pro de l\'espace (créer des canaux, inviter des collègues) ne sont pas disponibles pour l\'instant. Rien n\'est perdu : tes messages, les canaux et les membres restent.</p>';
    /* ⛔ DES PLACES BAISSÉES SOUS LE NOMBRE DE MEMBRES (le portail de Stripe ne connaît pas nos membres) ne retirent PERSONNE : l'administrateur le lit ICI, chiffres à l'appui, là où il travaille — et non seulement dans l'abonnement */
    if (admin && a && a.placesDepassees) h += '<p class="info-note" role="status" id="esp-depasse"><b>' + esc(membresPourPlaces(d.membres, a.places)) + '.</b> Personne n\'est retiré et chacun garde son accès, mais plus aucun lien d\'invitation ne marche tant que les places ne suffisent pas.' + (d.proprio ? ' Ajoute des places dans « Messages Pro ».' : ' Seul le propriétaire peut ajouter des places.') + '</p>';
    h += '<div class="rubrique"><span>Canaux</span><span>' + (d.canaux.length || '') + '</span></div><div class="carte">' + (d.canaux.length ? d.canaux.map(k => '<button type="button" class="contact presse" data-act="can-ouvrir" data-id="' + esc(k.id) + '">' +
      avatar({ avatar: 0, initiales: '#' }) + '<span class="contact-texte"><span class="contact-nom"># ' + esc(k.nom) + '</span><span class="contact-role">' + esc((k.prive ? 'Privé' : 'Public') + ' · ' + nMembres(k.membres)) + '</span></span>' + CHEVRON + '</button>').join('') : '<p class="vide">Aucun canal pour l\'instant.</p>') + '</div>';
    if (admin) h += '<div class="rubrique"><span>Nouveau canal</span></div><div class="carte carte-pad">' +
      '<div class="info-champ"><input id="cn-nom" type="text" maxlength="80" autocomplete="off" placeholder="Nom du canal" aria-label="Nom du canal"></div>' +
      '<div class="g-choix" role="radiogroup" aria-label="Qui voit ce canal ?"><button type="button" class="g-pilule presse" role="radio" aria-checked="' + (f.prive ? 'false' : 'true') + '" data-act="can-type" data-prive="0">Public</button><button type="button" class="g-pilule presse" role="radio" aria-checked="' + (f.prive ? 'true' : 'false') + '" data-act="can-type" data-prive="1">Privé</button></div>' +
      '<p class="info-note">' + (f.prive ? 'Seules les personnes choisies ci-dessous voient ce canal (tu en fais partie).' : 'Tous les membres de l\'espace voient ce canal, et ceux qui arrivent plus tard le trouvent aussi.') + '</p>' +
      (f.prive ? '<div class="carte">' + (c.contacts.filter(p => !p.moi).map(p => '<button type="button" class="contact presse" role="checkbox" aria-checked="' + (f.choisis.includes(p.id) ? 'true' : 'false') + '" data-act="can-choisir" data-uid="' + esc(p.id) + '">' + avatar(p) +
        '<span class="contact-texte"><span class="contact-nom">' + esc(p.nom) + '</span></span><span class="rond" aria-hidden="true">' + icone('i-coche') + '</span></button>').join('') || '<p class="vide">Personne d\'autre dans l\'espace pour l\'instant.</p>') + '</div>' : '') +
      '<div class="info-actions"><button type="button" class="mini" data-act="can-creer">Créer le canal</button></div></div>';
    h += '<div class="rubrique"><span>Contacts de l\'entreprise</span><span>' + c.contacts.length + '</span></div><div class="carte carte-pad"><p class="info-note">Les membres de cet espace, et personne d\'autre : il n\'y a pas d\'annuaire public.</p>' +
      '<div class="info-champ"><input id="esp-filtre" type="search" autocomplete="off" placeholder="Filtrer la liste" aria-label="Filtrer les contacts de l\'entreprise"></div></div>' +
      '<div class="carte" id="esp-contacts">' + c.contacts.map(p => ligneMembreEspace(p, d)).join('') + '</div><p class="vide" id="esp-aucun" hidden>Aucun contact ne correspond.</p>';
    if (admin) h += '<div class="rubrique"><span>Inviter des collègues</span></div><div class="carte carte-pad"><p class="info-note">Un lien d\'invitation : en l\'ouvrant, un collègue rejoint l\'espace et ses canaux publics. Il vaut 7 jours, dans la limite des places de l\'abonnement.</p><div id="esp-lien">' + htmlLienInvitation(lien) + '</div>' +
      '<div class="info-actions"><button type="button" class="mini" data-act="esp-lien-creer">Créer un lien</button><button type="button" class="mini danger" data-act="esp-lien-revoquer">Révoquer les liens' + (a && a.invitations ? ' (' + a.invitations + ' actif' + (a.invitations > 1 ? 's' : '') + ')' : '') + '</button></div></div>';
    if (d.proprio) h += '<div class="rubrique"><span>Nom de l\'espace</span></div><div class="carte carte-pad"><div class="info-champ"><input id="esp-nom" type="text" maxlength="80" autocomplete="off" value="' + esc(d.nom) + '" aria-label="Nom de l\'espace"><button type="button" class="mini" data-act="esp-renommer">Enregistrer</button></div></div>';
    h += '<div class="carte">' + (d.proprio ? '<button type="button" class="reglage presse danger" data-act="esp-dissoudre"><span class="reglage-texte">Supprimer l\'espace<small>Les canaux et leurs messages sont effacés pour tous. Résilie d\'abord l\'abonnement.</small></span></button>'
      : '<button type="button" class="reglage presse danger" data-act="esp-quitter"><span class="reglage-texte">Quitter l\'espace<small>Tu sors aussi de ses canaux.</small></span></button>') + '</div>';
    corps.innerHTML = h;
    for (const k of Object.keys(champs)) { const x = $(k); if (x && champs[k]) x.value = champs[k]; }
    appliquerFiltreEspace();
    if (cle) { const b = cle[0] === '#' ? $(cle.slice(1)) : Array.from(corps.querySelectorAll('[data-act]')).find(x => x.dataset.act + '|' + (x.dataset.uid || x.dataset.id || '') === cle); if (b) b.focus({ preventScroll: true }); }
  }
  $('info-corps').addEventListener('input', e => {
    if (e.target && e.target.id === 'esp-filtre') appliquerFiltreEspace();
    if (e.target && e.target.id === 'ab-places') { aboEtat.places = parseInt(e.target.value, 10) || 0; majTotalAbo(); }
  });

  /* ── La feuille « Abonnement » : l'état de Messages Pro pour cet espace, payer, gérer, « J'ai réglé — vérifier » ──
     ⛔ L'état est celui que le SERVICE a relu chez Stripe ; « J'ai réglé — vérifier » le relit, il ne croit pas la page. Le retour de Stripe (`?abo=retour`) relit tout seul. Seul le propriétaire paie ; un
     administrateur lit l'état. Aucune promesse que le service ne tient pas : « mode test » dit qu'aucun vrai prélèvement n'a lieu, « pas encore ouvert » dit qu'aucun paiement n'est possible. */
  async function relireAbonnement(id, depuisRetour) {
    const X = esp.abo; if (!X) return;
    X.erreur = '';
    try {
      const ab = await source.abonnementRelire(id);
      X.ab = ab;
      const st = ab.abonnement && ab.abonnement.statut;
      X.note = st === 'active' || st === 'trialing' ? (depuisRetour ? 'Merci ! ' : '') + 'Abonnement confirmé par Stripe : l\'espace est en Messages Pro.'
        : st === 'past_due' || st === 'unpaid' ? 'Stripe signale un paiement en retard pour cet abonnement.'
        : ab.paiementEnAttente ? 'Stripe n\'a pas encore confirmé le paiement. Si tu viens de payer, patiente un instant puis touche « J\'ai réglé — vérifier ».'
        : 'Stripe ne montre pas d\'abonnement actif pour cet espace.';
    } catch (er) { X.note = ''; X.erreur = phraseEspace(er, 'L\'abonnement n\'a pas pu être relu chez Stripe : l\'état affiché est le dernier connu.'); }
  }
  /* `garder` : un redessin DÉCLENCHÉ PAR UN ÉVÉNEMENT (l'espace a changé) garde le verdict que la personne vient de lire (« Abonnement confirmé… ») et l'écran en place pendant la relecture */
  async function rendreAbonnement(garder) {
    const id = etat.groupe.espaceId, corps = $('info-corps');
    const retour = etat.retourAbo && etat.retourAbo.espace === id ? etat.retourAbo : null; if (retour) etat.retourAbo = null;
    const avant = garder && esp.abo && esp.abo.d && esp.abo.d.id === id ? esp.abo : null;
    if (!avant) corps.innerHTML = '<p class="vide">Chargement…</p>';
    let d = null, ab = null, of = null, panne = null;
    try { [d, ab, of] = await Promise.all([source.espace(id), source.abonnement(id), source.abonnementOffres()]); } catch (e) { panne = e; }
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'abo' || etat.groupe.espaceId !== id) return;           // la feuille s'est fermée pendant l'attente
    if (panne) { corps.innerHTML = '<p class="info-erreur" id="info-erreur" role="alert">' + esc(phraseEspace(panne, 'L\'abonnement n\'a pas pu être lu.')) + '</p>'; return; }
    esp.abo = { d, ab, of, note: avant ? avant.note : '', erreur: avant ? avant.erreur : '' };
    if (!aboEtat.cycle || !of.offres.some(o => o.id === aboEtat.cycle)) aboEtat.cycle = of.offres.some(o => o.id === of.defaut) ? of.defaut : (of.offres[0] ? of.offres[0].id : null);
    if (!(aboEtat.places >= 1)) aboEtat.places = Math.max(ab.membres, of.places.min || 1, ab.abonnement ? ab.abonnement.places : 1);
    if (retour && retour.motif === 'annule') esp.abo.note = 'Paiement annulé : rien n\'a été prélevé.';
    else if (retour) await relireAbonnement(id, retour.motif === 'retour');          // le retour de Stripe : le verdict est RELU chez Stripe, jamais cru sur parole
    if (!etat.groupe.ouvert || etat.groupe.mode !== 'abo' || etat.groupe.espaceId !== id) return;
    peindreAbonnement();
  }
  function peindreAbonnement() {
    const corps = $('info-corps'), X = esp.abo; if (!X || !etat.groupe.ouvert || etat.groupe.mode !== 'abo') return;
    const { d, ab, of } = X, st = ab.abonnement ? ab.abonnement.statut : '', vivant = ['active', 'trialing', 'past_due', 'unpaid'].includes(st);
    const offre = of.offres.find(o => o.id === aboEtat.cycle);
    let h = '<p class="info-erreur" id="info-erreur" role="alert"' + (X.erreur ? '' : ' hidden') + '>' + esc(X.erreur) + '</p>' +
      '<div class="info-tete">' + avatar(avatarEspace(d)) + '<div><h3 class="info-nom">Messages Pro</h3><p class="info-sous">' + esc(d.nom) + '</p></div></div>' +
      (X.note ? '<p class="info-note" role="status">' + esc(X.note) + '</p>' : '') +
      '<div class="rubrique"><span>État</span></div><div class="carte carte-pad">' +
      '<p class="reg-ligne"><b>Formule</b> ' + esc(FORMULE_LBL[ab.formule] || FORMULE_LBL.perso) + '</p>' +
      (ab.abonnement ? '<p class="reg-ligne"><b>Abonnement</b> ' + esc((STATUT_ABO[st] || st) + ' · ' + ab.abonnement.places + (ab.abonnement.places > 1 ? ' places' : ' place')) + '</p>' +
        (ab.abonnement.finPeriode ? '<p class="reg-ligne"><b>' + (ab.abonnement.annule ? 'Fin de l\'abonnement' : 'Prochaine échéance') + '</b> ' + esc(dateCourte(ab.abonnement.finPeriode)) + '</p>' : '') : '') +
      '<p class="reg-ligne"><b>Places</b> ' + esc(ab.places === null ? 'illimitées pendant la bêta' : ab.places === 0 ? 'aucune place payée (' + nMembres(ab.membres) + ' dans l\'espace)' : ab.membres + ' utilisée' + (ab.membres > 1 ? 's' : '') + ' sur ' + ab.places) + '</p>' +
      (ab.sursisJusqua ? '<p class="info-note">Paiement en retard : les fonctions Pro restent disponibles jusqu\'au ' + esc(dateCourte(ab.sursisJusqua)) + '. Règle l\'abonnement pour les garder.</p>' : '') +
      (ab.formule === 'impaye' ? '<p class="info-erreur" role="alert">Les fonctions Pro (créer un canal, inviter un collègue) sont suspendues tant que le paiement n\'est pas réglé. Rien n\'est perdu : les messages, les canaux et les membres restent.</p>' : '') +
      (ab.abonnement && ab.abonnement.annule ? '<p class="info-note">Résilié à la fin de la période : l\'espace repasse en Perso après cette date.</p>' : '') +
      (ab.placesDepassees ? '<p class="info-note" role="status" id="ab-depasse"><b>' + esc(membresPourPlaces(ab.membres, ab.places)) + '.</b> Personne n\'est retiré et chacun garde son accès, mais on ne peut plus inviter. ' + (d.proprio ? 'Ajoute des places (« Gérer l\'abonnement ») pour inviter de nouveau.' : 'Seul le propriétaire peut ajouter des places.') + '</p>' : '') +
      (ab.paiementEnAttente ? '<p class="info-note">Un paiement a été commencé chez Stripe. Si tu l\'as réglé, touche « J\'ai réglé — vérifier ».</p>' : '') +
      (ab.stripeMuet ? '<p class="info-note">Le service de paiement ne répond pas : l\'état affiché est le dernier connu.</p>' : '') +
      (!ab.ouvert ? '<p class="info-note">L\'abonnement n\'est pas encore ouvert sur ce service : aucun paiement n\'est possible.</p>' : ab.toutOuvert ? '<p class="info-note">Pendant la bêta, les fonctions Pro sont ouvertes à tous les espaces.</p>' : ab.mode === 'test' ? '<p class="info-note">Mode test : aucun vrai prélèvement.</p>' : '') + '</div>';
    if (!d.proprio) h += '<p class="info-note">Seul le propriétaire de l\'espace paie et gère l\'abonnement. Tu peux en lire l\'état ici.</p>';
    else if (ab.ouvert) {
      if (!vivant && offre) {
        const total = aboEtat.places * offre.eurosParPlace;
        h += '<div class="rubrique"><span>S\'abonner</span></div><div class="carte carte-pad"><p class="info-note">Messages Pro se paie par place : une place par membre de l\'espace. Le paiement se fait chez Stripe ; tu reviens ici ensuite.</p>' +
          '<div class="g-choix" role="radiogroup" aria-label="Rythme de paiement">' + of.offres.map(o => '<button type="button" class="g-pilule presse" role="radio" aria-checked="' + (o.id === aboEtat.cycle ? 'true' : 'false') + '" data-act="abo-cycle" data-cycle="' + esc(o.id) + '">' + esc(o.par === 'an' ? 'Par an' : 'Par mois') + '</button>').join('') + '</div>' +
          '<label class="champ-profil"><span>Nombre de places</span><input id="ab-places" type="number" inputmode="numeric" min="' + Math.max(1, ab.membres) + '" max="' + (of.places.max || 500) + '" value="' + aboEtat.places + '"></label>' +
          '<p class="reg-ligne" id="ab-total"><b>Total</b> ' + esc(euros(total) + ' par ' + (offre.par === 'an' ? 'an' : 'mois') + ' (' + aboEtat.places + ' × ' + euros(offre.eurosParPlace) + ')') + '</p>' +
          '<div class="info-actions"><button type="button" class="mini" data-act="abo-payer">Payer avec Stripe</button></div></div>';
      }
      if (vivant) h += '<div class="carte"><button type="button" class="reglage presse" data-act="abo-portail"><span class="reglage-texte">Gérer l\'abonnement<small>Changer les places ou la carte, résilier : chez Stripe</small></span>' + CHEVRON + '</button></div>';
      h += '<div class="carte"><button type="button" class="reglage presse" data-act="abo-relire"><span class="reglage-texte">J\'ai réglé — vérifier<small>Relit l\'abonnement chez Stripe</small></span></button></div>';
    }
    h += '<div class="carte"><button type="button" class="reglage presse" data-act="abo-espace"><span class="reglage-texte">Retour à l\'espace</span>' + CHEVRON + '</button></div>';
    corps.innerHTML = h;
  }
  /* le total suit la frappe : « 5 × 15,00 € » */
  function majTotalAbo() {
    const X = esp.abo, t = $('ab-total'), offre = X && X.of.offres.find(o => o.id === aboEtat.cycle); if (!t || !offre) return;
    t.innerHTML = '<b>Total</b> ' + esc(euros(aboEtat.places * offre.eurosParPlace) + ' par ' + (offre.par === 'an' ? 'an' : 'mois') + ' (' + aboEtat.places + ' × ' + euros(offre.eurosParPlace) + ')');
  }

  /* ── Les gestes des feuilles « Entreprise », « Espace » et « Abonnement », et ceux d'un canal (feuille « Infos ») : chaque geste efface le refus d'avant avant de travailler ── */
  $('info-corps').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled || !/^(esp|can|abo)-/.test(b.dataset.act) || !CAP.espaces) return;
    if (b.getAttribute('aria-disabled') === 'true') return;
    const act = b.dataset.act, id = etat.groupe.espaceId, cid = etat.groupe.convId, espCanal = $('info-corps').dataset.espace || '';
    const relire = () => { $('info-corps').dataset.sig = ''; if (etat.groupe.ouvert && etat.groupe.mode === 'espace') return rendreEspace(); };
    erreurInfo('');
    try {
      if (act === 'esp-ouvrir') { basculerFeuille('espace:' + b.dataset.id); return; }
      if (act === 'esp-creer') {
        const nom = ($('en-nom').value || '').trim();
        if (!nom) { erreurInfo('Donne un nom à l\'espace.'); $('en-nom').focus(); return; }
        b.setAttribute('aria-disabled', 'true');
        try { const d = await source.espaceCreer(nom); mot('Espace créé'); basculerFeuille('espace:' + d.id); chargerEspaces(); } finally { b.removeAttribute('aria-disabled'); }
        return;
      }
      if (act === 'esp-lien-lire') { await lireInvitationSaisie(); return; }
      if (act === 'esp-rejoindre') {
        b.setAttribute('aria-disabled', 'true');
        try { const r = await source.invitationAccepter(b.dataset.code); mot(r.deja ? 'Tu es déjà dans cet espace' : 'Tu as rejoint « ' + r.espace.nom + ' »'); basculerFeuille('espace:' + r.espace.id); chargerEspaces(); } finally { b.removeAttribute('aria-disabled'); }
        return;
      }
      if (act === 'esp-renommer') { await source.espaceRenommer(id, $('esp-nom').value); mot('Nom enregistré'); chargerEspaces(); await relire(); return; }
      if (act === 'esp-role') { await source.membreRole(id, b.dataset.uid, b.dataset.admin === '1'); await relire(); return; }
      if (act === 'esp-retirer') { if (!armer(b, 'Toucher encore pour retirer')) return; const r = await source.membreRetirer(id, b.dataset.uid); mot(r && r.liensRevoques ? 'Membre retiré · liens d\'invitation révoqués' : 'Membre retiré de l\'espace'); esp.lien = null; await relire(); return; }
      if (act === 'esp-transferer') { if (!armer(b, 'Toucher encore pour passer la propriété')) return; await source.espaceTransferer(id, b.dataset.uid); mot('Tu n\'es plus propriétaire : la propriété est passée'); chargerEspaces(); await relire(); return; }
      if (act === 'esp-lien-creer') {
        const r = await source.invitationCreer(id);
        esp.lien = { espace: id, code: r.code, expireLe: r.expireLe, max: r.max };
        if (etat.groupe.ouvert && etat.groupe.mode === 'espace' && etat.groupe.espaceId === id && $('esp-lien')) $('esp-lien').innerHTML = htmlLienInvitation(esp.lien);
        relire();
        return;
      }
      if (act === 'esp-lien-revoquer') { const n = await source.invitationsRevoquer(id); esp.lien = null; $('esp-lien').innerHTML = ''; mot(n ? n + (n > 1 ? ' liens révoqués' : ' lien révoqué') : 'Aucun lien à révoquer'); await relire(); return; }
      if (act === 'esp-quitter') { if (!armer(b, 'Toucher encore pour quitter l\'espace')) return; await source.espaceQuitter(id); mot('Tu as quitté l\'espace'); chargerEspaces(); fermerFeuille(false); return; }
      if (act === 'esp-dissoudre') { if (!armer(b, 'Toucher encore pour supprimer l\'espace')) return; await source.espaceDissoudre(id); mot('Espace supprimé'); chargerEspaces(); fermerFeuille(false); return; }
      if (act === 'can-ouvrir') { ouvrirConvId(b.dataset.id); return; }
      if (act === 'can-type') { esp.forme.prive = b.dataset.prive === '1'; await relire(); return; }
      if (act === 'can-choisir') { const u = b.dataset.uid, i = esp.forme.choisis.indexOf(u); if (i < 0) esp.forme.choisis.push(u); else esp.forme.choisis.splice(i, 1); await relire(); return; }
      if (act === 'can-creer') {
        const nom = ($('cn-nom').value || '').trim();
        if (!nom) { erreurInfo('Donne un nom au canal.'); $('cn-nom').focus(); return; }
        b.setAttribute('aria-disabled', 'true');
        try { const r = await source.canalCreer(id, { nom, prive: esp.forme.prive, membres: esp.forme.choisis }); esp.forme = { prive: false, choisis: [] }; $('cn-nom').value = ''; mot('Canal créé'); ouvrirConvId(r.id); } finally { b.removeAttribute('aria-disabled'); }
        return;
      }
      if (act === 'abo-ouvrir') { basculerFeuille('abo:' + id); return; }
      if (act === 'abo-espace') { basculerFeuille('espace:' + id); return; }
      if (act === 'abo-cycle') { aboEtat.cycle = b.dataset.cycle; peindreAbonnement(); return; }
      if (act === 'abo-payer') {
        const X = esp.abo, offre = X && X.of.offres.find(o => o.id === aboEtat.cycle), v = parseInt(($('ab-places') || {}).value, 10);
        const min = Math.max(1, X ? X.ab.membres : 1), max = (X && X.of.places.max) || 500;
        if (!offre || !(v >= min && v <= max)) { erreurInfo('Le nombre de places doit être entre ' + min + ' (le nombre de membres) et ' + max + '.'); return; }
        aboEtat.places = v; b.setAttribute('aria-disabled', 'true');
        try { const r = await source.abonnementPayer(id, { places: v, cycle: offre.id }); mot('Direction le paiement chez Stripe…'); location.assign(r.url); }
        catch (er) {
          b.removeAttribute('aria-disabled');
          if (er && er.code === 'abonnement_existant') { await relireAbonnement(id, false); peindreAbonnement(); }       // un autre appareil a déjà payé : l'écran se met à jour
          throw er;
        }
        return;
      }
      if (act === 'abo-portail') {
        b.setAttribute('aria-disabled', 'true');
        try { const r = await source.abonnementPortail(id); location.assign(r.url); } catch (er) { b.removeAttribute('aria-disabled'); throw er; }
        return;
      }
      if (act === 'abo-relire') {
        b.setAttribute('aria-disabled', 'true');
        try { await relireAbonnement(id, false); } finally { b.removeAttribute('aria-disabled'); }
        peindreAbonnement();
        chargerEspaces();
        return;
      }
      /* ── les gestes d'un canal : la feuille « Infos » d'une conversation de type canal ── */
      if (act === 'can-renommer') { await source.canalRenommer(espCanal, cid, $('cn-renom').value); mot('Canal renommé'); return; }
      if (act === 'can-ajouter-membre') { await source.canalAjouterMembres(espCanal, cid, [b.dataset.uid]); return; }
      if (act === 'can-retirer-membre') { await source.canalRetirerMembre(espCanal, cid, b.dataset.uid); return; }
      if (act === 'can-quitter') {
        if (!armer(b, 'Toucher encore pour quitter le canal')) return;
        await source.quitter(cid); mot('Tu as quitté le canal');
        remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null });
        return;
      }
      if (act === 'can-supprimer') {
        if (!armer(b, 'Toucher encore pour supprimer le canal')) return;
        await source.canalSupprimer(espCanal, cid); mot('Canal supprimé');
        return;
      }
    } catch (er) { erreurInfo(phraseEspace(er, 'Cette action n\'a pas pu se faire.')); }
  });
  /* l'espace change (un membre arrive ou part, un rôle, un nom, un canal, l'abonnement) : Réglages et la feuille ouverte se relisent — sans effacer ce que la personne est en train de taper */
  function surEspaces(ev) {
    if (!CAP.espaces) return;
    if ($('reg-esp')) chargerEspaces();
    if (!etat.groupe.ouvert) return;
    const m = etat.groupe.mode;
    if (m === 'espace' && (!ev.id || ev.id === etat.groupe.espaceId)) rendreEspace();
    else if (m === 'abo' && (!ev.id || ev.id === etat.groupe.espaceId) && !document.activeElement.closest('#info-corps input')) rendreAbonnement(true);
  }
  /* un lien d'invitation ouvert dans un onglet DÉJÀ ouvert (seul le fragment change) : même traitement que le lien d'un contact (voir plus haut) */
  window.addEventListener('hashchange', () => {
    const c = CAP.espaces && etat.route ? invitationDansAdresse() : null;
    if (!c) return;
    /* Le changement de fragment a d'abord FERMÉ la feuille (popstate sans état) ; le retour en arrière la ROUVRE si elle l'était, et son rendu prend le code tout de suite (`etat.codeInvitation`, posé AVANT le retour).
       Le code est donc consommé — rien à faire. Sinon (aucune feuille « Entreprise » rouverte) on ouvre la feuille ; et si elle est ouverte et déjà dessinée, le code reste là : on le pose dans son champ.
       (Relevé au navigateur : le poser APRÈS le retour, quand le rendu de la feuille rouverte avait déjà commencé, le perdait — l'aperçu ne venait jamais.) */
    etat.codeInvitation = c;
    window.addEventListener('popstate', () => {
      if (etat.codeInvitation !== c) return;
      declencheur = null;
      if (etat.groupe.ouvert && etat.groupe.mode === 'entreprise' && $('en-code')) { etat.codeInvitation = null; $('en-code').value = c; erreurInfo(''); lireInvitationSaisie().catch(e => erreurInfo(phraseEspace(e, 'Ce lien n\'a pas pu être lu.'))); return; }
      ouvrirFeuille('entreprise');
    }, { once: true });
    history.back();
  });
  /* le retour de Stripe : `?abo=retour|annule|portail&e=<espace>` — lu AVANT que l'adresse ne soit nettoyée, jamais cru (la feuille relit chez Stripe) */
  function lireRetourAbo() {
    if (!CAP.espaces) return null;
    try {
      const q = new URLSearchParams(location.search), motif = q.get('abo'), e = q.get('e');
      return ['retour', 'annule', 'portail'].includes(motif) && ID_ESPACE.test(e || '') ? { motif, espace: e } : null;
    } catch (x) { return null; }
  }

  /* ── Le menu d'un message : réagir, répondre, copier, modifier, supprimer — au bouton (souris), à l'appui long (doigt) ou au clic droit ── */
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'], DELAI_MODIF_MS = 15 * 60000;
  function fermerMenu() {
    if (!etat.menu) return;
    const d = etat.menu.declencheur; etat.menu = null;
    $('menu-fond').hidden = true; $('menu-msg').innerHTML = ''; $('menu-msg').setAttribute('aria-label', 'Actions du message');
    synchroInert();
    if (d && d.isConnected && d.focus) d.focus({ preventScroll: true });
  }
  function ouvrirMenuMessage(mid, declencheurEl) {
    const m = trouverMessage(mid), c = etat.convDonnees;
    if (!CAP.actionsMessage || !m || !c || m.systeme || m.attente || (etat.menu && etat.menu.mid === mid)) return;
    const moi = m.auteur === MOI.id, admin = multi(c) && c.admins.indexOf(MOI.id) >= 0, ferme = !!compoFerme(c);
    const mienne = (m.reactions || []).find(r => r.moi);
    etat.menu = { mid, declencheur: declencheurEl || null, t: Date.now() };
    let h = '<div class="menu-emojis" role="group" aria-label="Réagir">' + (m.supprime ? '' : REACTIONS.map(x => '<button type="button" class="menu-emoji" data-menu-reac="' + x + '" aria-pressed="' + (mienne && mienne.emoji === x ? 'true' : 'false') + '" aria-label="Réagir avec ' + x + '">' + x + '</button>').join('')) + '</div>';
    if (!m.supprime && !ferme) h += '<button type="button" class="menu-action" data-menu="repondre">Répondre</button>';
    if (!m.supprime && m.texte) h += '<button type="button" class="menu-action" data-menu="copier">Copier le texte</button>';
    if (moi && !m.supprime && Date.now() - m.t < DELAI_MODIF_MS) h += '<button type="button" class="menu-action" data-menu="modifier">Modifier</button>';
    h += '<button type="button" class="menu-action danger" data-menu="supprimer-moi">Supprimer pour moi</button>';
    if ((moi || admin) && !m.supprime) h += '<button type="button" class="menu-action danger" data-menu="supprimer-tous">Supprimer pour tous</button>';
    $('menu-msg').innerHTML = h;
    $('menu-fond').hidden = false;
    synchroInert();
    const premier = $('menu-msg').querySelector('button'); if (premier) premier.focus({ preventScroll: true });
  }
  $('menu-fond').addEventListener('click', async e => {
    if (!etat.menu) return;
    /* ⛔ le relâcher d'un appui long ne tombe ni dans le menu qu'il vient d'ouvrir NI sur le fond qui le ferme : le navigateur produit le clic de ce qui est SOUS le doigt au
       relâcher, c'est-à-dire le fond, qui fermait le menu à peine ouvert (mesuré au doigt : « le menu ne s'ouvre pas »). On avale le premier clic qui suit le relâcher, OÙ QU'IL
       TOMBE et seulement lui — passé une demi-seconde, c'est un nouveau geste */
    const m0 = etat.menu;
    if (Date.now() - m0.t < 350 || (m0.appuiLong && !m0.avale && m0.relache && Date.now() - m0.relache < 500)) { m0.avale = true; return; }
    if (m0.plus) {                                  // « + » : Photo ou Fichier — le choix ouvre le sélecteur de l'appareil (le clic en cours est encore le geste de la personne)
      const x = e.target.closest('[data-plus]');
      if (e.target === $('menu-fond') || x) { fermerMenu(); if (x) $(x.dataset.plus === 'photo' ? 'compo-fichier' : 'compo-doc').click(); }
      return;
    }
    if (e.target === $('menu-fond')) { fermerMenu(); return; }
    const mid = etat.menu.mid, id = etat.conv, m = trouverMessage(mid);
    const r = e.target.closest('[data-menu-reac]'), a = e.target.closest('[data-menu]');
    if (!m || !id || (!r && !a)) return;
    if (r) { fermerMenu(); try { await source.reagir(id, mid, r.dataset.menuReac); masquerAvis(); } catch (er) { avis(phrase(er, 'La réaction n\'a pas pu être enregistrée.')); } return; }
    const act = a.dataset.menu;
    if (act === 'supprimer-tous' && a.dataset.pret !== '1') {                  // une suppression pour tous demande une seconde touche, dite
      $('menu-msg').innerHTML = '<p class="menu-question">Supprimer ce message pour tous ?</p><button type="button" class="menu-action danger" data-menu="supprimer-tous" data-pret="1">Supprimer pour tous</button><button type="button" class="menu-action" data-menu="annuler">Annuler</button>';
      $('menu-msg').querySelector('button').focus({ preventScroll: true }); return;
    }
    fermerMenu();
    if (act === 'repondre') { etat.contexte = { type: 'reponse', mid, nom: nomAuteur(m.auteur), texte: (m.texte || '').replace(/\s+/g, ' ').slice(0, 80) }; majContexte(); $('saisie').focus({ preventScroll: true }); }
    else if (act === 'copier') mot(await copier(m.texte || '') ? 'Texte copié' : 'Copie impossible');
    else if (act === 'modifier') { etat.contexte = { type: 'modif', mid, nom: '', texte: (m.texte || '').replace(/\s+/g, ' ').slice(0, 80) }; majContexte(); $('saisie').value = m.texte || ''; ajusterSaisie(); majBoutons(); $('saisie').focus({ preventScroll: true }); }
    else if (act === 'supprimer-moi' || act === 'supprimer-tous') { try { await source.supprimer(id, mid, act === 'supprimer-moi' ? 'moi' : 'tous'); masquerAvis(); } catch (er) { avis(phrase(er, 'Le message n\'a pas pu être supprimé.')); } }
  });
  $('menu-msg').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const l = Array.from($('menu-msg').querySelectorAll('button')); if (!l.length) return;
    const a = document.activeElement, i = l.indexOf(a);
    if (e.shiftKey && i <= 0) { e.preventDefault(); l[l.length - 1].focus(); } else if (!e.shiftKey && i === l.length - 1) { e.preventDefault(); l[0].focus(); }
  });
  /* les gestes sur le fil : le bouton ⋯ et les pastilles de réaction (clic), le clic droit (souris), l'appui long (doigt) */
  $('conv-messages').addEventListener('click', e => {
    const p = e.target.closest('[data-actions]');
    if (p) { ouvrirMenuMessage(p.dataset.actions, p); return; }
    const r = e.target.closest('[data-reagir]');
    if (r && etat.conv) source.reagir(etat.conv, r.dataset.reagir, r.dataset.emoji).then(masquerAvis, er => avis(phrase(er, 'La réaction n\'a pas pu être enregistrée.')));
  });
  $('conv-messages').addEventListener('contextmenu', e => {
    if (!CAP.actionsMessage) return;
    const msg = e.target.closest('.msg[data-mid]'); if (!msg) return;
    e.preventDefault(); ouvrirMenuMessage(msg.dataset.mid, msg.querySelector('.msg-plus') || msg);
  });
  (function () {
    let lp = null;
    const annule = () => { if (lp) { clearTimeout(lp.h); lp = null; } };
    $('conv-messages').addEventListener('pointerdown', e => {
      if (!CAP.actionsMessage || e.pointerType === 'mouse' || e.button) return;
      const msg = e.target.closest('.msg[data-mid]'); if (!msg || e.target.closest('button')) return;
      annule(); lp = { x: e.clientX, y: e.clientY, h: setTimeout(() => { lp = null; ouvrirMenuMessage(msg.dataset.mid, msg.querySelector('.msg-plus') || msg); if (etat.menu) etat.menu.appuiLong = true; }, 480) };
    });
    $('conv-messages').addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) annule(); });
    $('conv-messages').addEventListener('pointerup', annule); $('conv-messages').addEventListener('pointercancel', annule);
    /* le doigt qui se lève APRÈS l'ouverture du menu : on note l'heure, le clic qui suit est avalé (voir le menu) */
    document.addEventListener('pointerup', e => { if (etat.menu && etat.menu.appuiLong && e.pointerType !== 'mouse') etat.menu.relache = Date.now(); }, true);
    $('conv-fil').addEventListener('scroll', annule, { passive: true });
  })();
  $('precedents').addEventListener('click', async () => {
    const id = etat.conv; if (!id || typeof source.precedents !== 'function') return;
    const fil = $('conv-fil'), h0 = fil.scrollHeight, t0 = fil.scrollTop;
    try { await source.precedents(id); } catch (e) { avis(phrase(e, 'Les messages précédents n\'ont pas pu être chargés.')); return; }
    await rafraichirConv();
    fil.scrollTop = t0 + (fil.scrollHeight - h0);
  });

  /* ── les bannières du temps réel ── */
  function surArrivee(ev) {
    if (ev.conv === etat.conv && document.visibilityState === 'visible') return;      // la conversation est sous les yeux : le message y paraît, pas de bannière
    notifier(ev.groupe && ev.convNom ? ev.de + ' · ' + ev.convNom : ev.de, ev.texte || 'Nouveau message');
  }
  function surRetire(id) {
    if (etat.groupe.ouvert && etat.groupe.convId === id) remplacer(Object.assign({}, etat.route, { feuille: false }));
    if (etat.conv === id) { remplacer({ vue: 'messages', conv: null, feuille: false, photo: null, appel: null }); mot('Tu n\'es plus dans cette conversation.'); }
    rafraichirListe();
  }

  /* ═══ 11. LE DÉMARRAGE ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
  async function demarrer() {
    const retourAbo = lireRetourAbo();                                       // lu AVANT que `lireMotif` ne nettoie l'adresse
    const motif = typeof source.demarrer === 'function' ? lireMotif() : null;
    if (typeof source.demarrer === 'function') {
      let d; try { d = await source.demarrer(); } catch (e) { d = { connecte: false, motif: (e && e.code) || 'inconnue', phrase: phrase(e, 'Le service ne répond pas.') }; }
      if (!d || !d.connecte) { afficherConnexion(motif, d); return; }
      if (typeof source.surSessionMorte === 'function') source.surSessionMorte(repartir);
      $('connexion').hidden = true; $('app').hidden = false;
      surveillerSession();
      if (motif === 'suppression_annulee') avis(PHRASES_MOTIF.suppression_annulee);
    }
    MOI = source.moi(); CONTACTS = source.contacts();
    peindreMoi();
    if (CAP.fichiers) $('compo-plus').setAttribute('aria-label', 'Joindre une photo ou un fichier');
    const codeLien = CAP.liens ? lienDansAdresse() : null;       // lu AVANT que la route ne réécrive l'adresse
    const codeInvitation = CAP.espaces ? invitationDansAdresse() : null;
    construireNavigation();
    construireContacts();
    if (!CAP.appels) rendreCoquille('appels');
    rendreCoquille('reunions');
    if (CAP.reglages) rendreReglages(); else rendreCoquille('reglages');
    $('g-photo').hidden = !CAP.photos;
    try { etat.conversations = await source.lister(); } catch (e) { etat.conversations = []; montrerErreurListe(e); }
    if (CAP.appels) { etat.appels = await source.appels('tous'); rendreAppels(); }
    const r0 = routeDepuisHash();
    history.replaceState({ opmsg: 1, n: 0, r: r0, p: null }, '', urlDe(r0));
    rendreListe();
    appliquer(r0);
    /* la source dit quand quelque chose change : la liste et la conversation ouverte se refont, rien d'autre */
    source.ecouter(ev => {
      if (ev.type === 'liste') { if (ev.erreur) montrerErreurListe(ev.erreur); else rafraichirListe(); }   // une relecture refusée par le service se DIT
      if (ev.type === 'conversation') {
        if (ev.id === etat.conv) rafraichirConv();
        if (etat.groupe.ouvert && etat.groupe.mode === 'convinfo' && etat.groupe.convId === ev.id) rendreConvInfo();
      }
      if (ev.type === 'appels' && CAP.appels) rafraichirAppels();
      if (ev.type === 'appel' && ev.id === etat.appelId) rafraichirAppel();
      if (ev.type === 'contacts') surContacts();
      if (ev.type === 'espaces') surEspaces(ev);
      if (ev.type === 'moi') { MOI = source.moi() || MOI; peindreMoi(); peindreProfilReglage(); }          // mon nom, mon statut ou ma photo a changé (ici, ou sur un autre appareil)
      if (ev.type === 'reseau') { fluxPerdu = ev.etat !== 'ok'; $('hors-ligne').hidden = ev.etat === 'ok'; }
      if (ev.type === 'arrivee') surArrivee(ev);
      if (ev.type === 'notification') notifier(ev.titre || 'OP MESSAGES', ev.texte || '');
      if (ev.type === 'retire') surRetire(ev.id);
      if (ev.type === 'avis') avis(ev.texte);
      if (ev.type === 'ouvrir') ouvrirConvId(ev.conv);                                                // une notification touchée : la source n'a laissé passer qu'une conversation
    });
    if (codeLien) { etat.codeLien = codeLien; declencheur = null; ouvrirFeuille('contact'); }
    else if (codeInvitation) { etat.codeInvitation = codeInvitation; declencheur = null; ouvrirFeuille('entreprise'); }
    else if (retourAbo) { etat.retourAbo = retourAbo; declencheur = null; ouvrirFeuille('abo:' + retourAbo.espace); }       // de retour de chez Stripe : la feuille de l'abonnement relit tout de suite
  }
  demarrer();
})();
