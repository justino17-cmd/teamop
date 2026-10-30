/* ══ DÉMONSTRATION PUBLIQUE D'OP GESTION — le semis, le choix du métier, le bandeau ═════════════════════════════════════════════
   Ce bloc n'existe QUE dans demo.html : demo-build.js le pose dans le script d'app.html, juste avant `boot()`, et appelle
   `demoPubliqueBoot()` À LA PLACE de `boot()`. Rien d'ici n'est dans app.html, rien n'y est lu par un client.
   Ce que la démonstration est — Justin : « sur le site il faudrait faire un système de simulation des applications, qu'ils puissent
   tester » : la vraie application (celle d'app.html, fabriquée telle quelle), sans réseau, sans compte, sur UN appareil, avec un
   exemple fictif propre au métier choisi. Ce qu'elle n'est pas : la bêta (aucun outil d'équipe), ni la version publique (aucune
   entreprise, aucune synchro, aucun forfait à payer).
   Règles :
   · le métier choisi règle l'application par `metierServeurAppliquer` (la fonction que la Tour déclenche chez un vrai client) ;
     types d'intervention, prestations, relevés et catégories de produits se LISENT ensuite dans `intTypes()`, `METIERS[id]` et
     `categoriesProduit()` — jamais une copie ici ;
   · un produit naît par `produitCreer(…,{semis:true})`, jamais `db.produits.push` ;
   · aucun client n'a de courriel réel (« .invalid ») et aucun numéro n'est joignable (01 99 00 xx xx, réservé à la fiction) ;
   · tout ce que le semis pose porte `demo:1` ; « Recommencer » efface le préfixe elanD_ et resème.                               */
// Vidée le 23 octobre 2026 avec la déclaration de tests/beta-en-avance.js : les dix nouveaux métiers ont leur exemple. Le 29 octobre, la climatisation (séparée du chauffage) rejoint la déclaration : app.html la connaît,
// le site ne l'ouvre pas encore, la démonstration ne la propose donc pas — son exemple s'écrit le jour où la déclaration se vide.
const DEMO_METIERS_FERMES = ['climatisation'];
const DEMO_ETAT_CLE = 'elanD_demo_etat';
const DEMO_ID_ADMIN = 'demo-admin';
const DEMO_MSG = "Dans la démonstration, rien n'est envoyé.";
const DEMO_COULEURS = ['#1E7A4E', '#2563EB', '#7C3AED'];
const DEMO_NOMS = ['Hugo Lambert', 'Inès Morel', 'Yanis Fabre', 'Camille Roche', 'Nolan Girard', 'Manon Perrin', 'Théo Lacroix', 'Jade Fontaine', 'Louis Marchand'];
/* les décalages (en degrés) des six clients autour du centre de la ville : quelques centaines de mètres, pas une adresse */
const DEMO_DECALAGES = [[0, 0], [0.012, -0.008], [-0.010, 0.014], [0.020, 0.010], [-0.016, -0.012], [0.006, 0.020]];

/* Les métiers que la démonstration propose : ceux de la page (`METIERS_ORDRE`) que le site ouvre au public. */
function demoPubliqueMetiers() { return METIERS_ORDRE.filter(function (k) { return METIERS[k] && DEMO_METIERS_FERMES.indexOf(k) < 0; }); }
function demoPubliqueChoixLire() {
  /* la climatisation n'est « fermée » que comme carte du choix : elle s'ouvre quand le visiteur l'a demandée par l'adresse (variante=climatisation) */
  try { const j = JSON.parse(localStorage.getItem(DEMO_ETAT_CLE) || 'null'); return (j && typeof j.metier === 'string' && (demoPubliqueMetiers().indexOf(j.metier) >= 0 || (j.metier === 'climatisation' && j.variante === 'climatisation'))) ? j.metier : ''; } catch (e) { return ''; }
}
function demoPubliqueChoixEcrire(id, extra) {
  const o = { metier: id, v: 1 };
  if (extra) {
    if (extra.plus) o.plus = extra.plus;
    if (extra.variante) o.variante = extra.variante;
    if (extra.cats && extra.cats.length) o.cats = extra.cats;
  }
  try { localStorage.setItem(DEMO_ETAT_CLE, JSON.stringify(o)); } catch (e) { /* le rangement est plein : la démonstration tient en mémoire */ }
}

/* ── Ce que le visiteur a coché sur le site (creer.html) : demo.html?metier=…&variante=…&cats=… ─────────────────────────────────
   Justin : « ils ont aussi les cases qu'ils n'ont pas sélectionnées, et ça met : vous n'avez pas sélectionné cette case, mais vous pouvez
   la visualiser ». Rien n'est FERMÉ ici (toutes les rubriques du métier restent ouvertes, ce n'est pas le réglage `cats` de l'application
   qui, lui, ferme) : la liste retenue ne sert qu'à dire, en tête de l'écran, « non choisie ». Elle vit dans le rangement de la démonstration
   (elanD_demo_etat), jamais dans `db` ni dans la clé `cats` de l'application. Liste FERMÉE : seules les clés de NAV comptent, le reste est ignoré. */
const DEMO_CATS_MAX = 60, DEMO_VARIANTES = ['deux', 'chauffage', 'climatisation'];
function demoPubliqueCatsConnues() {
  try { if (typeof catsConnues === 'function') return catsConnues().slice(); } catch (e) { /* idem */ }
  return [];
}
/* l'adresse, sans rien en croire : un métier (a-z0-9), une variante de la liste, des clés connues (longueur bornée) ; `cats` vaut null quand rien d'utilisable n'est donné */
function demoPubliqueAdresse(search, connues) {
  const lire = function (n) { const m = String(search || '').match(new RegExp('[?&]' + n + '=([^&#]*)')); return m ? m[1] : ''; };
  const metier = (lire('metier').match(/^[a-z0-9]+$/) || [''])[0];
  const v = lire('variante');
  const brut = lire('cats').slice(0, 800);
  let cats = null;
  if (brut) {
    let txt = ''; try { txt = decodeURIComponent(brut); } catch (e) { txt = ''; }
    const l = [];
    txt.split(',').forEach(function (x) { x = x.trim(); if (l.length < DEMO_CATS_MAX && (connues || []).indexOf(x) >= 0 && l.indexOf(x) < 0) l.push(x); });
    if (l.length) cats = l;
  }
  return { metier: metier, variante: DEMO_VARIANTES.indexOf(v) >= 0 ? v : '', cats: cats };
}
/* chauffage / climatisation : « deux » = le chauffage et, en complément, la climatisation (le mécanisme `metierPlus` de l'application, pack réuni) ;
   « cvc » est le nom du pack combiné de l'application, accepté comme « deux ». Pour tout autre métier la variante ne dit rien. */
function demoPubliquePack(metier, variante) {
  if (metier === 'cvc') { metier = 'chauffage'; variante = 'deux'; }
  if (metier === 'chauffage' || metier === 'climatisation') {
    if (variante === 'deux') return { metier: 'chauffage', plus: 'climatisation', variante: 'deux' };
    if (variante === 'climatisation') return { metier: 'climatisation', plus: '', variante: 'climatisation' };
    if (variante === 'chauffage') return { metier: 'chauffage', plus: '', variante: 'chauffage' };
  }
  return { metier: metier, plus: '', variante: '' };
}
/* le choix rangé (métier, complément, variante, rubriques cochées) — relu avec les mêmes règles que l'adresse */
function demoPubliqueEtatLire() {
  try {
    const j = JSON.parse(localStorage.getItem(DEMO_ETAT_CLE) || 'null') || {}, connues = demoPubliqueCatsConnues(), o = {};
    if (typeof j.plus === 'string' && j.plus !== j.metier && j.plus !== '3d' && METIERS[j.plus]) o.plus = j.plus;
    if (DEMO_VARIANTES.indexOf(j.variante) >= 0) o.variante = j.variante;
    if (Array.isArray(j.cats)) { const l = []; j.cats.forEach(function (x) { if (l.length < DEMO_CATS_MAX && connues.indexOf(x) >= 0 && l.indexOf(x) < 0) l.push(x); }); if (l.length) o.cats = l; }
    return o;
  } catch (e) { return {}; }
}
let _demoSel = null;   // { cats: [clés cochées sur le site] } — null : pas de choix du site, aucun bandeau « non choisie »
/* la rubrique (clé de NAV) de cet écran si le visiteur ne l'a PAS cochée sur le site, sinon '' — le parent d'une sous-rubrique, comme `catBloque` */
function demoPubliqueNonChoisie(view) {
  try {
    if (!_demoSel || !_demoSel.cats || !_demoSel.cats.length) return '';
    const p = (typeof VUE_PARENT === 'object' && VUE_PARENT && VUE_PARENT[view]) || view;
    return (demoPubliqueCatsConnues().indexOf(p) >= 0 && _demoSel.cats.indexOf(p) < 0) ? p : '';
  } catch (e) { return ''; }
}
/* « L'ajouter à ma demande » : l'onglet du site qui a ouvert la démonstration, s'il existe (message vers teamop.fr SEULEMENT, aucun envoi réseau) ;
   sinon on revient à la page de commande. */
function demoPubliqueAjouter(k) {
  k = String(k || '');
  if (demoPubliqueCatsConnues().indexOf(k) < 0) return;
  try {
    const o = window.opener;
    if (o && !o.closed) {
      o.postMessage({ type: 'teamop-demo', action: 'ajouter-rubrique', rubrique: k, v: 1 }, 'https://teamop.fr');
      try { o.focus(); } catch (e) { /* idem */ }
      try { toast('✓ Envoyé à votre demande — retournez sur l’onglet du site.', 4500); } catch (e) { /* idem */ }
      return;
    }
  } catch (e) { /* pas d'onglet d'origine : le lien ci-dessous */ }
  location.href = 'creer.html?ajouter=' + encodeURIComponent(k);
}
function demoTel(n) { const p = function (x) { return String(x % 100).padStart(2, '0'); }; return '01 99 00 ' + p(n) + ' ' + p(n * 7 + 3); }

/* n jours OUVRÉS avant (n < 0) ou après (n > 0) un jour : une semaine d'interventions ne tombe pas un dimanche */
function demoPubliqueJourOuvre(iso, n) {
  let d = iso; const pas = n < 0 ? -1 : 1;
  for (let k = 0; k < Math.abs(n); k++) { for (;;) { d = shiftDay(d, pas); const w = new Date(d + 'T00:00:00').getDay(); if (w !== 0 && w !== 6) break; } }
  return d;
}

/* Le semis. Rend vrai si la base est posée. Toute la base passe par les fonctions de l'application ; ce qui est écrit ici, ce sont
   les noms propres de l'exemple (scenarios.js) et la mise en forme de la semaine. */
function demoPubliqueSemer(id, plus) {
  const M = METIERS[id]; if (!M) return false;
  const sc = DEMO_SCENARIOS[id] || DEMO_SCENARIO_DEFAUT;
  /* une base propre : les collections de données de l'application, par SA liste (celle du vidage de load()) */
  COLLECTIONS_DONNEES.forEach(function (c) { db[c] = []; });
  db.users = [{ id: DEMO_ID_ADMIN, prenom: 'Alex', nom: 'Démo', login: 'demo', role: 'admin', actif: true, sansMdp: true, pinHash: '', email: 'alex.demo@exemple.invalid', demo: 1 }];
  db.usersSupprimes = [];
  /* le métier : la même fonction que la Tour déclenche chez un vrai client (« Application réglée pour : … ») */
  db.metier = '';
  try { metierServeurAppliquer({ metier: id }); } catch (e) { /* l'écran n'est pas encore là : db.metier est posé avant */ }
  if (db.metier !== id) db.metier = id;
  /* le complément (chauffage + climatisation) : le mécanisme « Mon entreprise fait aussi… » de l'application, posé AVANT les types, prestations et catégories qui s'en lisent */
  db.metierPlus = (plus && plus !== id && plus !== '3d' && METIERS[plus]) ? plus : ''; db.metierPlus2 = '';
  /* toutes les rubriques du métier : pas de verrou de forfait (premium ne bloque rien) et assez de places pour essayer */
  db.forfait = 'premium'; db.forfaitQty = 10;
  db.entreprise = { nom: sc.ent, adresse: '', cp: sc.ville[1], ville: sc.ville[0], tel: demoTel(1) };
  const techs = [0, 1, 2].map(function (j) {
    const o = { id: uid(), nom: DEMO_NOMS[(Math.max(0, METIERS_ORDRE.indexOf(id)) * 3 + j) % DEMO_NOMS.length], tel: demoTel(10 + j), email: '', metier: sc.fonc[j] || 'Technicien', departements: '', couleur: DEMO_COULEURS[j], capMin: 420, demo: 1 };
    db.techniciens.push(o); return o;
  });
  const clients = sc.cli.map(function (c, k) {
    const o = { id: uid(), nom: c[0], contact: c[3] || '', tel: demoTel(30 + k), email: 'contact' + (k + 1) + '@exemple.invalid', adresse: c[2], codePostal: sc.ville[1], cp: sc.ville[1], ville: sc.ville[0],
      lat: Math.round((sc.ville[2] + DEMO_DECALAGES[k % 6][0]) * 1e4) / 1e4, lng: Math.round((sc.ville[3] + DEMO_DECALAGES[k % 6][1]) * 1e4) / 1e4, typeClient: c[1], demo: 1 };
    db.clients.push(o); return o;
  });
  /* les types de la semaine : ceux du métier (`intTypes()`), et seulement eux — un nom de l'exemple que le métier ne connaît pas
     est remplacé par un type de SA liste, jamais gardé */
  const T = intTypes(), types = (sc.types || []).map(function (t, i) { return T.indexOf(t) >= 0 ? t : T[i % T.length]; });
  if (!types.length) T.slice(0, 6).forEach(function (t) { types.push(t); });
  /* les prestations : les courtes de la fiche du métier (les phrases longues sont des mentions, pas des lignes de devis) */
  const P = (M.presta || []).filter(function (x) { return x.length <= 44; });
  const prestas = P.length >= 3 ? P : T.filter(function (x) { return x.length <= 44; });
  const today = todayISO();
  const PLAN = [[-2, '08:30', 0], [-2, '14:00', 1], [-1, '09:00', 2], [-1, '15:30', 0], [0, '08:00', 1], [0, '10:30', 2], [0, '14:00', 0], [1, '09:00', 1], [1, '11:00', 2], [2, '08:30', 0], [3, '10:00', 1], [4, '14:30', 2]];
  const DUREES = [60, 90, 120, 60, 90, 60];
  const RELEVE = { 'bar': '1.8', 'L/min': '11', '°C': '55', 'm³': '1248', 'ppm': '8', '%': '92', 'kg': '2.4', 'Pa': '18', 'm²': '120', 'h': '3.5', 't': '1.6' };
  PLAN.forEach(function (p, i) {
    const cli = clients[i % clients.length], tech = techs[p[2]], type = types[i % types.length];
    const date = demoPubliqueJourOuvre(today, p[0]);
    /* hier et avant : terminées ; aujourd'hui : une terminée, une en cours ; ensuite : planifiées */
    const statut = p[0] < 0 ? 'terminee' : (p[0] === 0 ? (p[1] < '09:00' ? 'terminee' : (p[1] < '12:00' ? 'encours' : 'planifiee')) : 'planifiee');
    const it = { id: uid(), num: intNum(), titre: type + ' · ' + cli.nom, type: type, date: date, heure: p[1], duree: DUREES[i % DUREES.length], techId: tech.id, techIds: [tech.id], statut: statut,
      clientId: cli.id, adresse: cli.adresse + ', ' + cli.cp + ' ' + cli.ville, prio: i % 5 === 2 ? 'haute' : 'normale', desc: '', compteRendu: '', checklist: [], produitsUtilises: [], demo: 1 };
    if (statut === 'terminee') {
      it.compteRendu = 'Intervention réalisée, client informé. ' + (prestas.length ? 'Prestations : ' + prestas.slice(0, 3).join(', ') + '.' : '');
      if (P.length >= 3) it.prestaMetier = P.slice(0, 3);
      const R = (M.releves || []).filter(function (r) { return !r.txt && RELEVE[r.u]; }).slice(0, 2);
      if (R.length) { it.relevesMetier = {}; R.forEach(function (r) { it.relevesMetier[r.k] = RELEVE[r.u]; }); }
    }
    db.interventions.push(it);
  });
  /* une intervention à planifier, sans date : le statut « À planifier » existe, autant le montrer */
  db.interventions.push({ id: uid(), num: intNum(), titre: types[0] + ' · ' + clients[3].nom, type: types[0], date: '', heure: '', duree: 60, techId: '', techIds: [], statut: 'aplanifier',
    clientId: clients[3].id, adresse: clients[3].adresse + ', ' + clients[3].cp + ' ' + clients[3].ville, prio: 'normale', desc: 'À répartir.', compteRendu: '', checklist: [], produitsUtilises: [], demo: 1 });
  /* le catalogue du métier : une fiche par produit, rangée dans une catégorie de LA liste du métier */
  db.fournisseurs.push({ id: uid(), nom: sc.four, contact: '', email: 'commandes@exemple.invalid', telephone: demoTel(60), adresse: '', codePostal: sc.ville[1], ville: sc.ville[0], notes: '', demo: 1 });
  const cats = categoriesProduit();
  sc.prod.forEach(function (p) {
    produitCreer({ id: idProduit(p[0]), ref: '', nom: p[0], categorie: cats[p[1] % cats.length], fournisseurs: [sc.four], unite: p[2], prix: p[3], qteCarton: 0, qte: p[4], seuil: p[5], demo: 1 }, { semis: true });
  });
  /* deux véhicules (les plaques de l'exemple de l'application, jamais une plaque réelle) */
  [['AB-123-CD', 'Renault', 'Trafic', 2021, 84200, 45], ['EF-456-GH', 'Citroën', 'Jumpy', 2019, 51230, 12]].forEach(function (v, k) {
    const t = techs[k], mots = t.nom.split(' ');
    db.vehicules.push({ id: uid(), plaque: v[0], marque: v[1], modele: v[2], annee: v[3], kilometrage: v[4], statut: 'service', titulaire: sc.ent, compagnieAssurance: 'Assureur fictif',
      typeGarantie: 'Tous risques', dateEcheanceAssurance: shiftDay(today, v[5]), conducteurPrenom: mots[0], conducteurNom: mots.slice(1).join(' '), conducteurTelephone: t.tel, conducteurTechnicienId: t.id, demo: 1 });
  });
  /* des devis et des factures, dont les lignes sont les prestations du métier */
  const lignes = function (k) {
    const a = prestas[k % Math.max(1, prestas.length)] || 'Intervention', b = prestas[(k + 2) % Math.max(1, prestas.length)] || 'Fournitures';
    return [{ designation: a, qte: 1, pu: 90 + 15 * k }, { designation: b, qte: 1, pu: 55 + 10 * k }, { designation: 'Déplacement', qte: 1, pu: 35 }];
  };
  [[0, 'accepte', -6], [2, 'envoye', -2], [4, 'brouillon', 0]].forEach(function (d, k) {
    db.devis.push({ id: uid(), num: nextNum('devis', 'DEV', 'num'), clientId: clients[d[0]].id, date: shiftDay(today, d[2]), statut: d[1], tva: 20, notes: types[k % types.length], lignes: lignes(k), demo: 1 });
  });
  [[1, 'payee', -9], [3, 'envoyee', -3], [5, 'retard', -45], [2, 'brouillon', 0]].forEach(function (f, k) {
    db.factures.push({ id: uid(), num: nextNum('factures', 'FAC', 'num'), clientId: clients[f[0]].id, devisId: '', date: shiftDay(today, f[2]), statut: f[1], tva: 20, notes: types[(k + 3) % types.length], lignes: lignes(k + 3), demo: 1 });
  });
  [[2, 'trimestriel', 450], [4, 'annuel', 240]].forEach(function (c) {
    db.contrats.push({ id: uid(), num: nextNum('contrats', 'CTR', 'num'), clientId: clients[c[0]].id, titre: (M.nom || 'Contrat').split(/ [—\/] /)[0] + ' · contrat d’entretien', frequence: c[1],
      dateDebut: shiftDay(today, -60), dateFin: shiftDay(today, 300), montant: c[2], statut: 'actif', notes: '', demo: 1 });
  });
  db.demoPublique = { metier: id, plus: db.metierPlus || '', ts: Date.now(), v: 1 };
  try { logEvent('Démonstration', 'Exemple « ' + (M.nom || id) + ' » posé', 'admin'); } catch (e) { /* le journal ne doit pas arrêter le semis */ }
  save();
  try { ombreRelever(); } catch (e) { /* idem */ }
  return true;
}

/* La zone d'une carte, quand le fond de carte ne peut pas venir : une phrase, pas un blanc */
function demoPubliqueCarteMessage() {
  setTimeout(function () {
    ['map', 'plm-map'].forEach(function (id) {
      const e = document.getElementById(id); if (!e || e.children.length) return;
      e.innerHTML = '<div style="height:100%;min-height:160px;display:flex;align-items:center;justify-content:center;padding:18px;text-align:center;color:var(--t2);font-size:13.5px;line-height:1.6">'
        + '🗺️ Dans la démonstration, le fond de carte ne se charge pas : rien ne sort de cette page. Les adresses et la tournée restent dans le planning.</div>';
    });
  }, 80);
}

/* ── Les liens sms: et mailto: écrits par l'application (`location.href = …`) : jamais une messagerie qui s'ouvre avec le contenu de l'exemple ──
   demo-build.js remplace ces sept affectations par `demoNav.href = …` (et refuse de générer s'il en reste une). Un lien <a href="mailto:"> est déjà
   arrêté par le pare-feu ; `location.href` ne se remplace pas depuis un script, d'où le remplacement dans le texte de l'application. */
const demoNav = {
  get href() { return location.href; },
  set href(u) {
    try { toast('✉️ ' + DEMO_MSG + ' Votre messagerie ne s’ouvre pas.', 4500); } catch (e) { /* idem */ }
    try { if (window.__demoPublique) window.__demoPublique.refus.push({ genre: 'lien-message', cible: String(u).slice(0, 12), t: Date.now() }); } catch (e) { /* idem */ }
  }
};

/* ── Les écrans qui promettaient une fonction absente d'ici : une phrase de démonstration, ou rien ─────────────────────────────── */
function demoPubliqueAssistantDevis() {
  document.getElementById('content').innerHTML = '<div class="card"><div class="card-head"><h3>🤖 Assistant devis</h3></div>'
    + '<p style="font-size:13px;color:var(--t2);line-height:1.6">Dans la démonstration, l’assistant ne répond pas : la rédaction par l’IA passe par un serveur, et rien n’est envoyé d’ici. '
    + 'Dans l’application complète, vous décrivez le chantier en une phrase et il compose le devis, que vous relisez avant de l’envoyer.</p>'
    + '<button class="btn" style="margin-top:12px" onclick="go(\'devis\')">Voir les devis d’exemple</button></div>';
}
function demoPubliqueDevisIAEtat() {
  const el = document.getElementById('dia-etat'); if (!el) return;
  el.textContent = 'Démonstration : la rédaction par l’IA n’est pas branchée ici, rien n’est envoyé.';
}
function demoPubliqueDevisIAMessage() { return 'Dans la démonstration, la rédaction par l’IA n’est pas branchée : rien n’est envoyé. Les devis d’exemple, eux, se modifient et s’impriment.'; }
/* Paramètres : les cartes dont le geste n'a de sens qu'avec un serveur ou une vraie boîte mail, retirées de l'écran ; la carte « Forfait » dit ce qu'il en est.
   Les titres se lisent dans le <h3> sans son pictogramme (il devient une icône après coup). tests/test-2940.js exige que chacun existe dans app.html. */
const DEMO_PARAM_RETIREES = ['Notifications', 'Mon e-mail professionnel', 'Devis IA', 'Installer l\'application', 'Synchronisation de l\'équipe', 'Le lien de connexion de ton entreprise',
  'Mes envois', 'E-mails aux clients'];
const DEMO_PARAM_FORFAIT = 'Forfait de l\'espace';
function demoPubliqueParametres() {
  const c = document.getElementById('content'); if (!c) return;
  const titre = function (card) { const h = card.querySelector('.card-head h3'); return h ? h.textContent.replace(/^[^A-Za-zÀ-ÿ]+/, '').trim() : ''; };
  Array.prototype.slice.call(c.querySelectorAll('.card')).forEach(function (card) {
    const t = titre(card);
    if (DEMO_PARAM_RETIREES.indexOf(t) >= 0) { card.parentNode.removeChild(card); return; }
    if (t === DEMO_PARAM_FORFAIT) {
      card.innerHTML = '<div class="card-head"><h3>Formule</h3></div>'
        + '<p style="color:var(--t2);font-size:13.5px;line-height:1.6;margin-bottom:12px">Dans la démonstration, toutes les rubriques sont ouvertes, comme avec la formule la plus complète. Aucun abonnement n’existe ici. Les formules et leurs prix se lisent sur la page des tarifs.</p>'
        + '<button class="btn ghost sm" onclick="location.href=\'tarifs.html\'">Voir les tarifs</button>';
    }
  });
}
function demoPubliqueParametresPoser() {
  if (!views || typeof views.parametres !== 'function' || views.parametres.__demo) return;
  const v = views.parametres;
  views.parametres = function () { const r = v.apply(this, arguments); try { demoPubliqueParametres(); } catch (e) { /* un écran qui change de forme ne doit pas casser la navigation */ } return r; };
  views.parametres.__demo = 1;
}

/* ── Ce que la démonstration coupe dans l'application : les appels qui n'ont de sens qu'avec un serveur ───────────────────────── */
const DEMO_FONCTIONS_COUPEES = ['annuaireDeposer', 'annuaireVeille', 'pushPropose', 'pushSubscribe', 'forfaitServeurSync', 'versionVerifier', 'ordresVerifier',
  'lienLisibleCharger', 'promoEssaiCheck', 'cnxSignaler', 'syncInit', 'syncPush', 'syncReactivate', 'maybeProfilePhoto'];
function demoPubliqueBouchons() {
  /* ⛔ une fonction `async` coupée rend une PROMESSE, comme l'originale : `syncInit().then(…)` (syncReactivate) levait une TypeError sur `undefined` */
  DEMO_FONCTIONS_COUPEES.forEach(function (n) {
    const f = window[n]; if (typeof f !== 'function') return;
    window[n] = (f.constructor && f.constructor.name === 'AsyncFunction') ? function () { return Promise.resolve(undefined); } : function () { return undefined; };
  });
  /* l'envoi de courriel : jamais un envoi, jamais un brouillon qui s'ouvre dans Mail — et le document reste ce qu'il était */
  window.srvMail = function () { try { _srvMailErr = 'démonstration'; } catch (e) { /* idem */ } try { toast('✉️ ' + DEMO_MSG, 4500); } catch (e) { /* idem */ } return Promise.resolve(false); };
  /* « Déconnexion » : il n'y a pas de compte à quitter — on sort de la démonstration, vers le site (la base reste là pour y revenir) */
  window.logout = function () { location.href = 'index.html'; };
  window.syncNow = function () { try { toast('Démonstration : il n’y a pas d’équipe à synchroniser — vos essais restent sur cet appareil.', 4500); } catch (e) { /* idem */ } };
  window.syncEtat = function () { return { c: '', t: 'Démonstration — rien n’est synchronisé' }; };
  demoPubliqueParametresPoser();
}

/* ── Le bandeau, permanent, en tête de chaque écran ─────────────────────────────────────────────────────────────────────────── */
function demoPubliqueStyle() {
  if (document.getElementById('demo-css')) return;
  const s = document.createElement('style'); s.id = 'demo-css';
  s.textContent = [
    '#sync-btn{display:none!important}',
    '.demo-bandeau{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:0 0 14px;padding:8px 12px;border-radius:12px;font-size:12.5px;line-height:1.4;color:var(--t2);',
    ' background:color-mix(in srgb,var(--org) 11%,var(--card));border:1px solid color-mix(in srgb,var(--org) 38%,transparent)}',
    '.demo-bandeau b{color:var(--t1);font-weight:700;letter-spacing:.04em;font-size:11px;text-transform:uppercase}',
    '.demo-bandeau .demo-txt{flex:1 1 220px;min-width:0}',
    '.demo-bandeau .demo-act{display:flex;gap:6px;flex-wrap:wrap}',
    '.demo-bandeau button{font:inherit;font-size:12px;font-weight:600;min-height:44px;padding:6px 14px;border-radius:999px;cursor:pointer;color:var(--t1);background:transparent;border:1px solid var(--brd2)}',
    '.demo-bandeau button:hover{background:var(--hover-tint)}',
    '.demo-bandeau.demo-nc{margin-top:-6px;background:color-mix(in srgb,var(--acc) 9%,var(--card));border:1px solid color-mix(in srgb,var(--acc) 34%,transparent)}',
    '.demo-bandeau.demo-nc .demo-txt{color:var(--t1)}',
    '.demo-bandeau .demo-ajout{color:var(--on-fill,#fff);background:var(--acc-fill,var(--acc));border-color:transparent}',
    '.demo-bandeau .demo-ajout:hover{background:var(--acc-fill,var(--acc));filter:brightness(1.08)}',
    '.nav-item[data-nonchoisie]::after{content:"";margin-left:auto;flex:none;width:9px;height:9px;box-sizing:border-box;border-radius:50%;border:1.5px dashed var(--t3)}',
    '.demo-legende{display:flex;align-items:center;gap:8px;margin:2px 14px 8px;font-size:11.5px;line-height:1.35;color:var(--t3)}',
    '.demo-legende i{flex:none;width:9px;height:9px;box-sizing:border-box;border-radius:50%;border:1.5px dashed var(--t3)}',
    '@media (max-width:520px){.demo-bandeau{padding:7px 10px;font-size:11.5px;gap:4px 8px;margin-bottom:10px}.demo-bandeau b{display:none}.demo-bandeau button{min-height:44px;font-size:12px;padding:6px 12px}}',
    '.demo-choix{width:min(980px,100%);margin:0 auto;padding:28px 18px 40px;text-align:center;color:var(--t1)}',
    '.demo-choix h2{font-size:26px!important;letter-spacing:-.02em;margin:6px 0 8px}',
    '.demo-choix p{color:var(--t2);font-size:14.5px;line-height:1.6;max-width:640px;margin:0 auto 6px}',
    '.demo-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin:22px 0 18px;text-align:left}',
    '.demo-carte{font:inherit;text-align:left;align-items:flex-start;display:flex;flex-direction:column;gap:3px;padding:14px 15px;border-radius:16px;cursor:pointer;color:var(--t1);background:var(--card);border:1px solid var(--cardline);min-height:92px}',
    '.demo-carte:hover,.demo-carte:focus-visible{border-color:var(--acc);background:var(--hover-tint);outline:none}',
    '.demo-carte .demo-ic{font-size:22px;line-height:1}',
    '.demo-carte b{font-size:15px;letter-spacing:-.01em}',
    '.demo-carte small{font-size:12px;line-height:1.45;color:var(--t3)}',
    '.demo-note{font-size:12.5px!important;color:var(--t3)!important}',
    '#login:has(.demo-choix){align-items:flex-start;overflow:auto}',
    '#login:has(.demo-choix) .login-box{max-width:none;width:100%;background:none;box-shadow:none;border:0}'
  ].join('\n');
  document.head.appendChild(s);
}
function demoPubliqueBandeau() {
  const c = document.getElementById('content'); if (!c || !currentUser) return;
  let b = c.firstElementChild;
  if (!(b && b.id === 'demo-bandeau')) {
    b = document.createElement('div'); b.id = 'demo-bandeau'; b.className = 'demo-bandeau'; b.setAttribute('role', 'note');
    b.innerHTML = '<b>Démonstration</b><span class="demo-txt">Démonstration — vos essais restent sur cet appareil, rien n\'est envoyé. Toutes les rubriques sont ouvertes ; l’IA, la synchro et le courrier ne fonctionnent pas ici.</span>'
      + '<span class="demo-act"><button type="button" onclick="demoPubliqueChanger()">Changer de métier</button><button type="button" onclick="demoPubliqueRecommencer()">Recommencer</button></span>';
    c.insertBefore(b, c.firstChild);
  }
  /* la rubrique que le visiteur n'a pas cochée sur le site : un second bandeau, juste dessous. Posé ICI — là où l'écran s'écrit vraiment (l'observateur
     ci-dessous le repose après chaque écriture de #content) — et non depuis go(), dont la barre est balayée par rendreVueAnimee. */
  const k = demoPubliqueNonChoisie(current), n = document.getElementById('demo-nonchoisie');
  if (!k) { if (n && n.parentNode) n.parentNode.removeChild(n); return; }
  if (n && n.getAttribute('data-k') === k && n.previousElementSibling === b) return;
  if (n && n.parentNode) n.parentNode.removeChild(n);
  const m = document.createElement('div'); m.id = 'demo-nonchoisie'; m.className = 'demo-bandeau demo-nc'; m.setAttribute('role', 'note'); m.setAttribute('data-k', k);
  m.innerHTML = '<span class="demo-txt">Vous n’avez pas sélectionné cette rubrique — vous pouvez la visualiser ici.</span>'
    + '<span class="demo-act"><button type="button" class="demo-ajout" onclick="demoPubliqueAjouter(\'' + k + '\')">L’ajouter à ma demande</button></span>';
  c.insertBefore(m, b.nextSibling);
}
/* le menu : une petite marque discrète sur les rubriques non cochées (un attribut, écrit après chaque dessin du menu ; le rond pointillé vient du CSS — un MOT dans la ligne
   débordait dès qu'une pastille de nombre s'y trouvait déjà, « Interventions 13 »), et UNE ligne de légende qui dit ce que le rond veut dire */
function demoPubliqueMenu() {
  const n = document.getElementById('nav'); if (!n || !n.querySelectorAll) return;
  if (_demoSel && _demoSel.cats && _demoSel.cats.length && !n.querySelector('.demo-legende') && n.querySelector('.nav-item[data-view]')) {
    const l = document.createElement('div'); l.className = 'demo-legende'; l.innerHTML = '<i aria-hidden="true"></i><span>Rubrique non choisie dans votre demande</span>';
    const premier = Array.prototype.find.call(n.children, function (x) { return !(x.classList.contains('nav-loupe') || x.id === 'nav-rien'); });
    n.insertBefore(l, premier || null);
  }
  Array.prototype.forEach.call(n.querySelectorAll('.nav-item[data-view]'), function (el) {
    if (demoPubliqueNonChoisie(el.getAttribute('data-view'))) { el.setAttribute('data-nonchoisie', '1'); el.setAttribute('title', 'Non choisie dans votre demande'); }
  });
}
let _demoObsNav = null;
function demoPubliqueObserverMenu() {
  const n = document.getElementById('nav'); if (!n || _demoObsNav || typeof MutationObserver !== 'function') return;
  _demoObsNav = new MutationObserver(function () { try { demoPubliqueMenu(); } catch (e) { /* idem */ } });
  _demoObsNav.observe(n, { childList: true });
  demoPubliqueMenu();
}
let _demoObs = null;
function demoPubliqueObserver() {
  const c = document.getElementById('content'); if (!c || _demoObs || typeof MutationObserver !== 'function') return;
  /* les écrans qui réécrivent #content sans passer par la navigation (une fiche, un onglet) emportent le bandeau : on le repose */
  _demoObs = new MutationObserver(function () { _demoObs.disconnect(); try { demoPubliqueBandeau(); } catch (e) { /* idem */ } _demoObs.observe(c, { childList: true }); });
  _demoObs.observe(c, { childList: true });
}

/* ── Le choix du métier ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
function demoPubliqueChoix() {
  demoPubliqueStyle();
  const logo = (typeof effectiveTheme === 'function' && effectiveTheme() === 'dark') ? 'icons/logo-night.png' : 'icons/logo-day.png';
  const cartes = demoPubliqueMetiers().map(function (k) {
    const m = METIERS[k];
    return '<button type="button" class="demo-carte" data-metier="' + k + '" onclick="demoPubliqueChoisir(\'' + k + '\')"><span class="demo-ic" aria-hidden="true">' + m.ic + '</span><b>' + esc(m.nom) + '</b><small>' + esc(m.sous || '') + '</small></button>';
  }).join('');
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  document.getElementById('login-box').innerHTML = '<div class="demo-choix"><img class="login-logo" src="' + logo + '" alt="OP GESTION">'
    + '<h2>Essayez OP GESTION</h2>'
    + '<p>Choisissez votre métier : l’application se règle comme pour un vrai client — types d’interventions, prestations, catégories de produits, rubriques — et se remplit d’un exemple fictif.</p>'
    + '<div class="demo-grille">' + cartes + '</div>'
    + '<p class="demo-note">Données fictives, rangées sur cet appareil seulement. Aucun compte, aucune synchro : rien n’est envoyé.</p></div>';
}
function demoPubliqueChoisir(id) {
  if (demoPubliqueMetiers().indexOf(id) < 0) return;
  demoPubliqueChoixEcrire(id);
  demoPubliqueSemer(id);
  demoPubliqueOuvrir();
}
function demoPubliqueEffacer() {
  /* le préfixe elanD_ seulement (la vue du stockage ne montre rien d'autre), puis les bases de l'appareil */
  try { localStorage.clear(); } catch (e) { /* idem */ }
  try { sessionStorage.clear(); } catch (e) { /* idem */ }
  try { ['elanD_photo', 'elanD_cote'].forEach(function (n) { indexedDB.deleteDatabase(n); }); } catch (e) { /* idem */ }
}
function demoPubliqueRecommencer() {
  if (!confirm('Recommencer ?\n\nVos essais sur cet appareil sont effacés et l’exemple revient comme au début.')) return;
  const id = (db.demoPublique && db.demoPublique.metier) || demoPubliqueChoixLire();
  const etat = demoPubliqueEtatLire();   // lu AVANT l'effacement : le complément, la variante et les rubriques cochées sur le site se gardent
  demoPubliqueEffacer();
  if (id) demoPubliqueChoixEcrire(id, etat);
  location.reload();
}
function demoPubliqueChanger() {
  if (!confirm('Changer de métier ?\n\nVos essais sur cet appareil sont effacés : l’exemple du nouveau métier les remplace.')) return;
  demoPubliqueEffacer();
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* idem */ }
  location.reload();
}

/* ── L'ouverture : une session locale, sans écran de connexion ni campagne de sécurité ──────────────────────────────────────── */
function demoPubliqueOuvrir() {
  const u = (db.users || []).find(function (x) { return x.id === DEMO_ID_ADMIN; }) || db.users[0];
  try {
    /* ni langue à choisir, ni photo de profil à proposer, ni notifications à activer : rien d'une première connexion réelle */
    localStorage.setItem('elanD_lang', 'fr');
    localStorage.setItem('elanD_photo_prompt_' + u.id, '1'); localStorage.setItem('elanD_push_ask_' + u.id, '1');
  } catch (e) { /* idem */ }
  demoPubliqueBouchons();
  demoPubliqueStyle();
  _cnxVia = 'session';
  enterApp(u);
  demoPubliqueObserver();
  demoPubliqueObserverMenu();
  try { demoPubliqueBandeau(); } catch (e) { /* idem */ }
}
/* Le pare-feu n'a pas pu poser sa vue du stockage (navigateur qui refuse la redéfinition) : la page lirait et écrirait les clés de l'application des clients. On n'ouvre RIEN. */
function demoPubliqueNonPris() {
  demoPubliqueStyle();
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  document.getElementById('login-box').innerHTML = '<div class="demo-choix"><h2>Navigateur non pris en charge</h2>'
    + '<p>La démonstration ne peut pas isoler ses données de celles de l’application sur ce navigateur, alors elle ne s’ouvre pas. Essayez avec une version récente de Safari, Chrome ou Firefox.</p></div>';
}
function demoPubliqueBoot() {
  if (window.__demoPublique && window.__demoPublique.stockageIsole === false) { demoPubliqueNonPris(); return; }
  demoPubliqueBouchons();
  demoPubliqueStyle();
  let id = '', plus = '', variante = '', cats = null;
  /* le bouton du site : « Essayer la démo plombier » (métier seul) ou « Tester l'application » de la page de commande (métier, variante, rubriques cochées) */
  const adr = demoPubliqueAdresse(location.search, demoPubliqueCatsConnues());
  const pk = adr.metier ? demoPubliquePack(adr.metier, adr.variante) : null;
  if (pk && (demoPubliqueMetiers().indexOf(pk.metier) >= 0 || (pk.metier === 'climatisation' && pk.variante === 'climatisation'))) {
    id = pk.metier; plus = pk.plus; variante = pk.variante; cats = adr.cats;
    /* ⛔ suivre le lien d'un AUTRE métier remplace les essais du visiteur : on le demande, comme « Changer de métier » */
    const deja = demoPubliqueChoixLire(), etat = demoPubliqueEtatLire();
    if (deja && (deja !== id || (etat.plus || '') !== plus) && db.demoPublique && db.demoPublique.metier === deja && !confirm('Passer à ce métier ?\n\nVos essais sur cet appareil sont remplacés par l’exemple du nouveau métier.')) {
      id = deja; plus = etat.plus || ''; variante = etat.variante || ''; cats = etat.cats || null;
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* idem */ }
    }
  } else {
    id = demoPubliqueChoixLire();
    if (id) { const etat = demoPubliqueEtatLire(); plus = etat.plus || ''; variante = etat.variante || ''; cats = etat.cats || null; }
  }
  if (!id) { demoPubliqueChoix(); return; }
  const semee = db.demoPublique && db.demoPublique.metier === id && (db.demoPublique.plus || '') === plus && (db.techniciens || []).length > 0;
  demoPubliqueChoixEcrire(id, { plus: plus, variante: variante, cats: cats });
  _demoSel = cats ? { cats: cats } : null;
  if (!semee) demoPubliqueSemer(id, plus);
  demoPubliqueOuvrir();
}
