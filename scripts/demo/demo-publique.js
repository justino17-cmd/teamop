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
const DEMO_METIERS_FERMES = ['incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine'];
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
  try { const j = JSON.parse(localStorage.getItem(DEMO_ETAT_CLE) || 'null'); return (j && typeof j.metier === 'string' && demoPubliqueMetiers().indexOf(j.metier) >= 0) ? j.metier : ''; } catch (e) { return ''; }
}
function demoPubliqueChoixEcrire(id) { try { localStorage.setItem(DEMO_ETAT_CLE, JSON.stringify({ metier: id, v: 1 })); } catch (e) { /* le rangement est plein : la démonstration tient en mémoire */ } }
function demoTel(n) { const p = function (x) { return String(x % 100).padStart(2, '0'); }; return '01 99 00 ' + p(n) + ' ' + p(n * 7 + 3); }

/* n jours OUVRÉS avant (n < 0) ou après (n > 0) un jour : une semaine d'interventions ne tombe pas un dimanche */
function demoPubliqueJourOuvre(iso, n) {
  let d = iso; const pas = n < 0 ? -1 : 1;
  for (let k = 0; k < Math.abs(n); k++) { for (;;) { d = shiftDay(d, pas); const w = new Date(d + 'T00:00:00').getDay(); if (w !== 0 && w !== 6) break; } }
  return d;
}

/* Le semis. Rend vrai si la base est posée. Toute la base passe par les fonctions de l'application ; ce qui est écrit ici, ce sont
   les noms propres de l'exemple (scenarios.js) et la mise en forme de la semaine. */
function demoPubliqueSemer(id) {
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
  db.demoPublique = { metier: id, ts: Date.now(), v: 1 };
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

/* ── Ce que la démonstration coupe dans l'application : les appels qui n'ont de sens qu'avec un serveur ───────────────────────── */
const DEMO_FONCTIONS_COUPEES = ['annuaireDeposer', 'annuaireVeille', 'pushPropose', 'pushSubscribe', 'forfaitServeurSync', 'versionVerifier', 'ordresVerifier',
  'lienLisibleCharger', 'promoEssaiCheck', 'cnxSignaler', 'syncInit', 'syncPush', 'maybeProfilePhoto'];
function demoPubliqueBouchons() {
  DEMO_FONCTIONS_COUPEES.forEach(function (n) { if (typeof window[n] === 'function') window[n] = function () { return undefined; }; });
  /* l'envoi de courriel : jamais un envoi, jamais un brouillon qui s'ouvre dans Mail — et le document reste ce qu'il était */
  window.srvMail = function () { try { _srvMailErr = 'démonstration'; } catch (e) { /* idem */ } try { toast('✉️ ' + DEMO_MSG, 4500); } catch (e) { /* idem */ } return Promise.resolve(false); };
  /* « Déconnexion » : il n'y a pas de compte à quitter — on sort de la démonstration, vers le site (la base reste là pour y revenir) */
  window.logout = function () { location.href = 'index.html'; };
  window.syncNow = function () { try { toast('Démonstration : il n’y a pas d’équipe à synchroniser — vos essais restent sur cet appareil.', 4500); } catch (e) { /* idem */ } };
  window.syncEtat = function () { return { c: '', t: 'Démonstration — rien n’est synchronisé' }; };
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
    '.demo-bandeau button{font:inherit;font-size:12px;font-weight:600;min-height:32px;padding:4px 11px;border-radius:999px;cursor:pointer;color:var(--t1);background:transparent;border:1px solid var(--brd2)}',
    '.demo-bandeau button:hover{background:var(--hover-tint)}',
    '@media (max-width:520px){.demo-bandeau{padding:7px 10px;font-size:11.5px;gap:4px 8px;margin-bottom:10px}.demo-bandeau b{display:none}.demo-bandeau button{min-height:30px;font-size:11.5px;padding:3px 10px}}',
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
  if (c.firstElementChild && c.firstElementChild.id === 'demo-bandeau') return;
  const b = document.createElement('div'); b.id = 'demo-bandeau'; b.className = 'demo-bandeau'; b.setAttribute('role', 'note');
  b.innerHTML = '<b>Démonstration</b><span class="demo-txt">Démonstration — vos essais restent sur cet appareil, rien n\'est envoyé.</span>'
    + '<span class="demo-act"><button type="button" onclick="demoPubliqueChanger()">Changer de métier</button><button type="button" onclick="demoPubliqueRecommencer()">Recommencer</button></span>';
  c.insertBefore(b, c.firstChild);
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
  demoPubliqueEffacer();
  if (id) demoPubliqueChoixEcrire(id);
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
  try { demoPubliqueBandeau(); } catch (e) { /* idem */ }
}
function demoPubliqueBoot() {
  demoPubliqueBouchons();
  demoPubliqueStyle();
  let id = '';
  const q = (location.search.match(/[?&]metier=([a-z0-9]+)/) || [])[1];   // le bouton du site : « Essayer la démo plombier »
  if (q && demoPubliqueMetiers().indexOf(q) >= 0) id = q;
  if (!id) id = demoPubliqueChoixLire();
  if (!id) { demoPubliqueChoix(); return; }
  const semee = db.demoPublique && db.demoPublique.metier === id && (db.techniciens || []).length > 0;
  demoPubliqueChoixEcrire(id);
  if (!semee) demoPubliqueSemer(id);
  demoPubliqueOuvrir();
}
