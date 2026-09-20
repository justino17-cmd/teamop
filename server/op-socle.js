/* ══ LES ROUTES DU SOCLE — `/api/op/*` ══════════════════════════════════════════════════════
 *
 * Étape 1 du `PLAN-OP-SOCLE.md` (§2.4 routes et contrats, §2.5 temps réel, §2.7 numéros).
 * Le stockage vit dans `server/socle.js` ; ce fichier-ci ne fait qu'ouvrir des portes dessus.
 *
 * ⛔ LIVRÉ INERTE. Sans `"socle": {"actif": true}` dans `/opt/teamop/config.json` — qui vit sur
 * le VPS, pas dans le dépôt — AUCUNE route n'est déclarée. C'est ce qui rend l'étape serveur
 * compatible avec la règle du dépôt : un push de `server/**` sur `main` DÉPLOIE
 * (`.github/workflows/deploiement.yml`), donc « prêt mais non déployé » n'existe pas. « Déployé
 * et inerte » existe, et il se rallume sans push — donc le retour arrière aussi.
 *
 * ⛔ AUCUNE ROUTE NE LIT `t` DANS LE CORPS, sauf `/api/op/session` qui le prouve par la clé
 * d'équipe. C'est la règle de `CLAUDE.md` — « une valeur du CORPS ne décide jamais de ce qu'une
 * entreprise a payé » — généralisée aux données. Partout ailleurs, `t` sort du jeton.
 *
 * ⛔ AUCUNE GARDE RÉÉCRITE. `sauvRefus` et `cleEstPublique` sont reçus en dépendances et
 * appelés TELS QUELS. La leçon des quatre portes de `fbRevoquerEquipe` : deux contrôles de
 * sécurité qui disent la même chose finissent toujours par ne plus la dire pareil, et c'est
 * celui qu'on a oublié de corriger qui décide.
 *
 * ⛔ CE QUI N'EST PAS ICI, ET POURQUOI :
 *   · `POST/GET /api/op/fichier` → étape 3, avec la table `fichier` et la déduplication sha256.
 *   · `POST /api/op/atteste`     → étape 7, l'attestation de complétude.
 *   · `POST /api/monitor/op/revenir` → **volontairement absent tant que `cleCodeExiger` n'est
 *     pas factorisé.** C'est la seule route qui ÉCRIVE dans la base d'un client depuis la Tour,
 *     et le plan exige le code à six chiffres envoyé à l'adresse de l'entreprise — par la
 *     fonction existante, pas par une copie. Cette fonction n'existe pas encore : elle est
 *     écrite à la main dans `/api/espaces/cle/code`. Livrer la route sans le code, même inerte,
 *     serait poser un chemin d'écriture dont la garde est « à faire ». Changer la clé d'équipe,
 *     geste qui n'écrit AUCUNE donnée métier, l'exige déjà ; écrire dans la base d'un client ne
 *     peut pas être moins gardé.
 */
const crypto = require('crypto');

/* Le long-poll est tenu 25 s : sous les 30 s au-delà desquelles un proxy coupe sans prévenir,
   et assez long pour que le coût au repos reste bas (~2,4 req/min/appareil). */
const FLUX_MS = 25000;
const JETON_VIE_MS = 30 * 86400000;   // 30 jours. Un jeton sans échéance n'est pas révocable.
const LOT_MAX = 400;                  // lignes par pousse ; `express.json` est à 6 Mo au-dessus.
const DIAG_VIE_MS = 30 * 60000;       // une ouverture de diagnostic dure 30 minutes.

function monterOpSocle(app, deps) {
  const { config, socle, sauvRefus, cleEstPublique, quotaOk, monStr, garde, cnxAppareils, espaceConnu, espaceBloque, espaceSuspendu } = deps;
  const actif = !!(config && config.socle && config.socle.actif === true);
  const etat = { actif, routes: [] };
  if (!actif) return etat;   // ⛔ inerte : pas une seule route déclarée.

  /* ⛔ LE CONTRÔLE DE DOUBLE DÉCLARATION. `/api/devis/etat` était déclarée dans
     `agent-devis.js` ET dans `index.js` ; la seconde, plus riche, n'a JAMAIS répondu — panne
     silencieuse, personne ne l'a vue pendant des mois. Avec 121 routes sur quatre fichiers, une
     API de données ajoutée ici peut être masquée sans un mot. On REFUSE de démarrer plutôt que
     de servir une route fantôme.
     ⚠️ On compare (méthode, chemin) : `GET /x` et `POST /x` sont deux routes distinctes. */
  const dejaDeclarees = new Set();
  for (const c of (app._router && app._router.stack) || []) {
    if (!c.route || !c.route.path) continue;
    for (const m of Object.keys(c.route.methods || {})) dejaDeclarees.add(m.toUpperCase() + ' ' + c.route.path);
  }
  /* ⛔ DEUX PASSES : ON COLLECTE, ON VALIDE TOUT, PUIS SEULEMENT ON ENREGISTRE. La première
     version enregistrait au fur et à mesure et ne jetait qu'en ARRIVANT sur le doublon —
     REPRODUIT le 18 septembre 2026 : `monterOpSocle` jetait, `index.js` attrapait, `opSocle`
     restait `null`, et il restait VIVANTES `/api/op/session`, `/depuis`, `/pousser`, `/flux`,
     `/etat` — toute la surface de lecture ET d'écriture. Express n'a aucun moyen de retirer une
     route déjà posée : il n'y avait donc plus d'interrupteur du tout.
     ⛔ LE COÛT EXACT : `socleCouper()` teste `if (!opSocle || !opSocle.actif) return {fait:true}`.
     Les QUATRE portes de fermeture répondaient donc « coupure OK » à la Tour pendant que les
     appareils lisaient et écrivaient par les routes restées ouvertes. C'est mot pour mot la
     panne que ce fichier dénonce, avec l'écran qui la maquille. En prime, ni la minuterie
     d'ancre ni celle de purge n'étaient créées, et `etat.fermer` n'était jamais câblé — donc
     SIGTERM ne fermait plus les bases.
     ⚠️ Le compteur global `routesDoublons` de `/health` NE COUVRE PAS ce cas : il compte les
     chemins réellement enregistrés deux fois, or ici le second `poser()` ne va jamais jusqu'à
     `app.post(...)`. Il n'y a donc jamais deux entrées physiques. C'est pour ça que la garde
     doit être ici, en deux passes, et pas seulement là-bas. */
  const aPoser = [];
  const poser = (methode, chemin, ...suite) => {
    const cle = methode.toUpperCase() + ' ' + chemin;
    if (dejaDeclarees.has(cle)) {
      throw new Error('⛔ ' + cle + ' est DÉJÀ déclarée ailleurs dans le serveur. La première '
        + 'enregistrée gagne : celle-ci ne répondrait jamais, en silence. Renommer ou retirer '
        + "l'autre — c'est la panne de /api/devis/etat, restée invisible des mois.");
    }
    dejaDeclarees.add(cle);
    aPoser.push({ methode: methode.toLowerCase(), chemin, suite, cle });
  };
  /* Appelée UNE FOIS, tout à la fin, quand plus rien ne peut jeter. Avant elle, aucune route
     du socle n'existe sur `app` — donc un échec de montage laisse le serveur exactement comme
     si le drapeau était éteint, ce qui est le seul état sûr. */
  const enregistrer = () => {
    /* ⛔ LE CHRONO EST POSÉ ICI, PAS ROUTE PAR ROUTE. L'ajouter à la main devant chaque
       gestionnaire, c'est garantir qu'on l'oubliera sur la prochaine — et une route non
       mesurée est exactement celle qui sera lente. Un seul endroit, toutes les routes. */
    for (const r of aPoser) { app[r.methode](r.chemin, chrono, ...r.suite); etat.routes.push(r.cle); }
  };

  /* ══ LE TEMPS RÉEL — LE FLUX NE TRANSPORTE QUE `{seq}` ════════════════════════════════════
     ⛔ AUCUNE DONNÉE dans une connexion tenue ouverte pendant des heures. L'appareil réveillé
     rappelle `/api/op/depuis`. Conséquence : un message perdu, doublé, réordonné ou coupé ne
     peut RIEN casser, une reconnexion reprend exactement où elle en était, et le serveur n'a
     pas à re-chiffrer le même corps pour chaque auditeur. */
  /* ⛔ UNE ENTREPRISE QUI CESSE DE SE DÉCHIFFRER NE FAISAIT SONNER AUCUNE ALARME. Le journal du
     serveur ne nomme aucun espace — c'est la bonne règle — mais du coup on savait « il y a des
     lignes illisibles » et jamais « chez qui ». On compte donc par entreprise EN MÉMOIRE (la
     Tour le lit, elle est déjà gardée) et on publie l'AGRÉGÉ sur `/health` (publique : un
     nombre, jamais un nom). Une ligne qui cesse de se déchiffrer, c'est un incident — trafic,
     restauration mal ciblée, bloc abîmé — et il doit réveiller quelqu'un. */
  const illisibles = new Map();     // t -> nombre vu depuis le démarrage
  const illisiblesDe = t => illisibles.get(t) || 0;
  const noterIllisibles = (t, n) => { if (n) illisibles.set(t, (illisibles.get(t) || 0) + n); };
  /* ⛔ LES REFUS D'ÉCRITURE SE COMPTENT PAR MOTIF, ET LE NOMBRE SORT SUR `/health`. Relevé par
     la cinquième vérification, et c'est la pire famille de pannes de ce dépôt : celle qui ne
     se voit pas. Deux scénarios MESURÉS, tous deux totalement muets avant ce compteur.
       · Le disque du VPS se remplit — journaux, pièces jointes, un temporaire oublié. À partir
         de cet instant CHAQUE pousse de CHAQUE appareil de CHAQUE entreprise rend 503 et rien
         n'est écrit. Pendant ce temps `/health` répondait `ok:true` avec un bloc socle
         rigoureusement identique à celui d'un serveur sain, et `journalctl` restait vide.
         Personne ne l'apprenait — on le découvrait par un client qui appelle.
       · L'horloge du VPS recule (NTP décroche, saut au redémarrage). Les téléphones ont
         l'heure juste, donc CHAQUE ligne dépasse `maintenant + 5 min` et se fait refuser :
         100 % des écritures de tout le monde, refusées, pour une panne côté serveur.
     ⛔ UN NOMBRE, JAMAIS UN NOM D'ESPACE — `/health` est publique, y nommer une entreprise
     dirait au monde lesquelles existent. C'est le même dessin que `mailRefus`, déjà publié
     par `/health` pour la même raison. `surveillance.js` peut alors alarmer sur le MOTIF :
     `disque_plein` est une panne de plateforme (tout le monde à l'arrêt), `horlogeAvancee`
     une horloge à remettre, `espace_plein` un seul client dont le plafond est à régler. */
  const refus = new Map();          // motif -> nombre depuis le démarrage
  /* ⛔ ET SUR LE DISQUE AUSSI — ÉTAPE 6. Cette `Map` repart à zéro à chaque redémarrage, donc à
     chaque déploiement, donc plusieurs fois par jour les jours chargés. L'étape 6 demande de
     « regarder les compteurs de refus » pendant UNE SEMAINE : un compteur qui s'oublie ne
     montre rien, et il montre ZÉRO — ce qui est pire, parce qu'on en conclurait que tout va
     bien. `obsNoter` verse dans l'annuaire, par jour et par motif, sans nommer personne. */
  const noterRefus = (liste) => { for (const x of (liste || [])) { const m = String((x && x.motif) || 'autre');
    refus.set(m, (refus.get(m) || 0) + 1);
    try { socle.obsNoter('refus', m, 1); } catch (e) {} } };
  const attentes = new Map();       // t -> Set<{resoudre, app_id, minuteur}>
  const diagSessions = new Map();   // t -> { qui, exp } — une ouverture de diagnostic motivée
  function sessionDiag(t) { const d = diagSessions.get(t); return (d && Date.now() < d.exp) ? d : null; }
  function reveiller(t, seq, sauf) {
    const s = attentes.get(t); if (!s) return;
    for (const a of Array.from(s)) {
      /* L'appareil qui vient d'écrire est exclu par son `app_id` : il connaît déjà son
         changement, le réveiller lui ferait faire un aller-retour pour rien. L'identité vient
         du jeton, pas d'une valeur qu'il aurait choisie. */
      if (sauf && a.app_id === sauf) continue;
      s.delete(a); clearTimeout(a.minuteur); a.resoudre({ seq });
    }
    if (!s.size) attentes.delete(t);
  }

  /* ══ LE JETON D'APPAREIL ══════════════════════════════════════════════════════════════════
     32 octets tirés au hasard ; SEUL son sha256 est rangé. Une base volée ne donne aucune
     session utilisable. Le porteur se présente en `Authorization: Bearer`, jamais en query —
     une query part dans les journaux d'accès du proxy et dans l'historique du navigateur,
     interdit que le dépôt s'impose déjà pour `kh`. */
  const opQuota = new Map();
  function opJeton(req, res, next) {
    const m = /^Bearer\s+([0-9a-f]{64})$/.exec(String(req.headers.authorization || ''));
    if (!m) return res.status(401).json({ error: 'session requise', motif: 'jeton_absent' });
    let s = null;
    try { s = socle.sessionParJeton(crypto.createHash('sha256').update(m[1]).digest('hex')); } catch (e) { s = null; }
    if (!s) return res.status(401).json({ error: 'session expirée — reconnecte-toi', motif: 'jeton_invalide' });
    /* ⛔ L'ÉTAT DE L'ENTREPRISE SE RELIT À CHAQUE REQUÊTE, JAMAIS DANS LE JETON. Sinon une
       entreprise fermée continue de lire et d'écrire pendant les 30 jours de validité du
       jeton, et personne ne le voit — la leçon de Firebase (« un jeton s'échange contre une
       session renouvelable ») rejouée sur notre propre stockage. Même règle que `monAdmin`,
       qui relit rôle/actif/apps dans `monUsers` à chaque appel. */
    let e;
    try { e = socle.entrepriseEtat(s.t); } catch (err) { return res.status(503).json({ error: 'état indisponible', motif: 'base' }); }
    if (e.etat !== 'actif') return res.status(403).json({ error: 'Cet espace est fermé.', motif: 'ferme' });
    req.op = s;
    try { socle.sessionVue(s.t, s.app_id); } catch (e) {}
    /* Le budget par espace se compte APRÈS la preuve. Avant, ce serait une arme de déni de
       service : n'importe qui épuiserait le quota d'une entreprise en tapant son identifiant.
       ⚠️ `quotaOk` vit en mémoire et repart à zéro à chaque redémarrage, donc à chaque push
       touchant `server/**`. C'est un quota de CONFORT, pas une détection. */
    /* ⛔ LE BUDGET PAR ESPACE PLAFONNAIT LA SYNCHRO À ENVIRON 27 APPAREILS. Au repos, un
       appareil fait ~2,4 sondages/minute, soit ~144 lectures/heure : 4 000 lectures/h par
       entreprise tombent à 27 appareils sans qu'une seule écriture ait lieu. ELAN en a 36. Le
       plafond aurait donc étranglé le client pilote le jour de l'allumage, et le motif
       (`quota`) aurait ressemblé à une attaque. Réglable sur le VPS — une entreprise qui
       grossit se règle, elle ne se dépanne pas en urgence. */
    const cfg = (config && config.socle) || {};
    /* ⛔ TROIS BUDGETS, PARCE QUE CES ROUTES NE COÛTENT PAS LA MÊME CHOSE. Relever le budget de
       lecture à 40 000/h pour que 36 appareils tiennent, c'est aussi autoriser 40 000 appels à
       `/api/op/etat` — qui relit et SIGNE toute la base, 42 ms sur 20 000 lignes. Un seul jeton
       parfaitement légitime gelait alors le serveur pour tous les clients. Le long-poll et le
       delta sont bon marché et fréquents ; `etat()` est cher et rare (c'est un contrôle de
       non-régression, pas un chemin de synchro) ; l'écriture est au milieu. */
    /* ⛔ LE CHEMIN DÉCLARÉ DE LA ROUTE, PAS L'URL REÇUE. Express est monté sans `strict routing`
       ni `case sensitive routing` : `/api/op/etat/` et `/API/OP/ETAT` atteignent le MÊME
       gestionnaire et font le MÊME travail — mais `req.path` rend l'orthographe brute, donc une
       comparaison exacte les classait « bon marché ». MESURÉ sur le vrai serveur, budget cher
       abaissé à 5/h : 20 appels à `/api/op/etat` → 5 passent, 15 refusés ; 20 appels à
       `/api/op/etat/` → **20 passent**. Le budget se contournait avec une barre oblique, et on
       retrouvait les 28 minutes de gel par heure que ce budget existe pour empêcher.
       ⛔ `server/index.js` porte DÉJÀ cette leçon, écrite noir sur blanc dans `monAppDeRoute` :
       « Le chemin DÉCLARÉ de la route (req.route.path), pas l'URL reçue ». On applique la même
       règle, avec le même repli normalisé si le garde tournait un jour hors d'une route. */
    const chemin = String(req.route && typeof req.route.path === 'string' ? req.route.path : req.path)
      .toLowerCase().replace(/\/+$/, '');
    const cher = chemin === '/api/op/etat';
    const cle = cher ? 'c:' : req.method === 'GET' ? 'l:' : 'e:';
    /* 500/h : le plan appelle `etat()` UNE FOIS PAR NUIT ET PAR APPAREIL (le contrôle de
       non-régression de l'étape 5), donc 36 appareils en consomment 36. Cinq cents laisse la
       place aux reprises, à la Tour et à un mauvais jour, et coûte au pire 21 s de boucle par
       HEURE (42 ms × 500) — contre 28 MINUTES par heure au budget des lectures bon marché,
       qui est le chiffre qui rendait cette route capable de tuer le serveur. */
    const cout = cher ? (parseInt(cfg.etatsParHeure, 10) || 500)
      : req.method === 'GET' ? (parseInt(cfg.lecturesParHeure, 10) || 40000)
      : (parseInt(cfg.ecrituresParHeure, 10) || 6000);
    if (!quotaOk(opQuota, cle + s.t, cout, 3600000)) {
      return res.status(429).json({ error: 'trop de demandes — réessaie dans une heure', motif: 'quota' });
    }
    next();
  }

  /* ══ LA LATENCE — « ET LA CHARGE » DE L'ÉTAPE 6 ═══════════════════════════════════════════
     ⛔ LE SERVEUR N'AVAIT AUCUNE MÉTRIQUE DE LATENCE, et l'annexe du plan le reproche depuis le
     début : « la synchro devient plus vive » est affirmé sans mesure, alors que le schéma va
     dans l'autre sens (`synchronous=FULL`, c'est un fsync par pousse sur le disque partagé d'un
     VPS). On ne peut pas arbitrer, ni savoir si le socle tient la charge d'ELAN, sans le
     chiffre. On le prend donc là où il est vrai : sur la VRAIE réponse, en production.
     ⚠️ `res.on('finish')` et pas un `await` autour du gestionnaire : on veut le temps que le
     CLIENT attend, en-têtes et corps écrits — pas celui que la fonction met à rendre la main.
     Le long-poll est exclu : il DORT 25 secondes par construction, l'y inclure noierait tous
     les quantiles sous une valeur qui ne dit rien d'une lenteur. */
  function chrono(req, res, next) {
    if (req.route && String(req.route.path) === '/api/op/flux') return next();
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      try {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        socle.latNoter(String((req.route && req.route.path) || req.path).replace(/^\/api\/op\//, ''), ms);
      } catch (e) {}
    });
    next();
  }

  /* ══ POST /api/op/session ═════════════════════════════════════════════════════════════════
     La seule route qui reçoive `t` dans le corps, parce que c'est elle qui le PROUVE. */
  poser('POST', '/api/op/session', (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase() || String(req.headers['x-teamop-kh'] || '').toLowerCase();
    if (!t) return res.status(400).json({ error: 't requis', motif: 'identite' });

    /* `sauvRefus` LUI-MÊME : espace de repli (403), espace fermé (403), espace inconnu (404),
       clé d'équipe incorrecte (403). Pas une copie. */
    let refus = sauvRefus(t, kh, 'session');
    /* ⛔ UNE ENTREPRISE SUSPENDUE TRAVAILLE — DÉCISION DE JUSTIN, 20 SEPTEMBRE 2026.
       `sauvRefus` refuse `entFermes.espaces` en bloc, et cette liste contient DEUX choses très
       différentes : les espaces FERMÉS, et les espaces simplement SUSPENDUS pour impayé. Pour
       la sauvegarde et le courrier, les confondre était sans grande conséquence. Ici, ça l'est :
       le jour où le socle est la seule copie à jour d'une entreprise, refuser la session à un
       impayé la coupe de ses propres données — en contradiction directe avec
       `mentions-legales.html:74`, qui promet qu'un impayé « n'entraîne aucune suppression » et
       que le client « retrouve l'intégralité de ses données s'il revient ».
       La règle décidée : sept jours de délai, puis les onglets PAYANTS grisent et l'entreprise
       revient au forfait gratuit. Rien n'est perdu, aucune tâche en cours, rien dans leurs
       catégories. Ce qui change est l'ABONNEMENT, donc des écrans — jamais le stockage.
       ⚠️ On ne lève QUE le refus de fermeture, et seulement quand l'espace est nommément
       suspendu : une clé fausse, un espace inconnu ou l'espace de repli restent refusés, parce
       que ces trois-là ne sont pas des questions de facturation. */
    if (refus && /ferm/i.test(String(refus.error || '')) && typeof espaceSuspendu === 'function') {
      try { if (espaceSuspendu(t) === true) refus = null; } catch (e) {}
    }
    if (refus) {
      const motif = refus.code === 404 ? 'inconnu' : /repli/.test(refus.error) ? 'repli' : /ferm/.test(refus.error) ? 'ferme' : 'cle';
      /* ⛔ LE COMPTEUR D'ÉCHECS D'ENRÔLEMENT VIT DANS `meta` DE LA BASE, pas dans une Map : une
         Map repart à zéro à chaque redémarrage, donc à chaque déploiement, donc une campagne
         d'énumération ne laisserait aucune trace. Il ne crée jamais de base — un espace qui
         n'existe pas ne se met pas à exister parce qu'on a frappé à sa porte. */
      if (motif === 'cle') { try { socle.echecEnrolement(t); } catch (e) {} }
      return res.status(refus.code).json({ error: refus.error, motif });
    }
    /* ⛔ ET L'ÉTAT DU SOCLE, QUE `sauvRefus` NE CONNAÎT PAS. `sauvRefus` lit `entFermes`, qui
       est la fermeture côté annuaire ; `entrepriseEtat` est la coupure côté socle, posée par
       `/api/monitor/op/couper`. Sans ce contrôle, couper ne coupait RIEN : l'appareil rappelait
       cette route avec la même clé dans la seconde et repartait pour 30 jours. Reproduit par
       `gardien` le 18 septembre 2026. */
    try {
      if (socle.entrepriseEtat(t).etat !== 'actif') return res.status(403).json({ error: 'Cet espace est fermé.', motif: 'ferme' });
    } catch (e) { return res.status(503).json({ error: 'état indisponible', motif: 'base' }); }
    /* ⛔ UNE CLÉ ÉCRITE EN CLAIR DANS `app.html` NE PROUVE RIEN QUAND ON LA PRÉSENTE. Un espace
       resté sur la clé partagée peut être ouvert par n'importe qui l'ayant lue dans le fichier
       public — il n'a donc pas sa place sur le socle, dont tout le cloisonnement repose sur
       cette preuve. 409 : ce n'est pas un refus d'accès, c'est un état à corriger. */
    if (cleEstPublique(t)) {
      return res.status(409).json({ motif: 'cle_partagee',
        error: 'Cette entreprise utilise encore la clé de synchronisation partagée. '
          + 'Elle doit recevoir sa propre clé avant de pouvoir utiliser le nouveau stockage.' });
    }
    /* Le plafond par espace vient APRÈS la preuve, pour la même raison que plus haut. */
    if (!quotaOk(opQuota, 's:' + t, 120, 3600000)) return res.status(429).json({ error: 'trop de sessions ouvertes — réessaie plus tard', motif: 'quota' });

    /* ⛔ `vide` A TROIS ÉTATS, ET LE TROISIÈME N'EST PAS `false`. Ce dépôt a payé DEUX fois
       pour cette confusion précise : `_mailboxes`/`_mailReplies` (« Connecte ta boîte mail »
       affiché à quelqu'un dont la boîte marchait), et `syncDecrypt` qui rend `null` pour trois
       causes distinctes. Ici l'enjeu est pire : `vide:true` fait croire l'espace neuf, donc
       recréer « OP Admin » et amorcer avec la base locale — c'est ce qui a fabriqué
       @florent-2, -3, -4 chez ELAN. Une base qui ne s'ouvre pas répond 503 et N'ÉNONCE PAS
       `vide` du tout. On ne devine pas, on se tait et on le dit. */
    let e = null;
    try { e = socle.etat(t); }
    catch (err) {
      console.error('socle: base illisible pour un espace (session refusée)');
      return res.status(503).json({ motif: 'base_illisible',
        error: 'Le stockage de cette entreprise ne répond pas. Rien n\'a été modifié. Contacte TEAM OP.' });
    }

    const jeton = crypto.randomBytes(32).toString('hex');
    let ouverte;
    try {
      ouverte = socle.sessionOuvrir(t, {
        jetonSha: crypto.createHash('sha256').update(jeton).digest('hex'),
        appId: monStr(b.app_id, 32), nom: monStr(b.nom, 60), exp: Date.now() + JETON_VIE_MS,
      });
    } catch (err) {
      console.error('socle: session non ouverte —', err.code || 'erreur');
      return res.status(503).json({ error: 'session impossible — réessaie', motif: 'session' });
    }
    /* ⛔ C'EST LE SERVEUR QUI DIT SI CET ESPACE EST EN DOUBLE ÉCRITURE, JAMAIS L'APPAREIL.
       C'est la marche arrière de l'étape 4, et elle doit coûter UNE REQUÊTE. Un drapeau côté
       client demanderait de publier une version et d'attendre que vingt téléphones se mettent
       à jour : ce n'est pas un retour arrière, c'est une panne longue.
       ⚠️ Il vaut `false` par défaut, et `false` aussi quand l'annuaire ne connaît pas l'espace.
       L'appareil qui ne le lit pas n'écrit nulle part : c'est le bon sens du défaut. */
    let dbl = false;
    try { dbl = !!socle.entrepriseEtat(t).double; } catch (err) {}
    /* ⛔ ET C'EST LE SERVEUR QUI DIT OÙ L'APPAREIL LIT — étape 5, même raison exactement que
       `double`, avec un enjeu plus grand : `double` décide où l'on écrit EN PLUS, celui-ci
       décide de la SOURCE DE VÉRITÉ. Il vaut `firestore` tant que personne n'a tranché, et
       `firestore` aussi quand on ne sait pas : servir le socle à une entreprise dont la
       bascule n'a pas été décidée, ce serait lui donner une base peut-être incomplète à la
       place de la sienne. */
    let lec = 'firestore';
    try { lec = socle.entrepriseEtat(t).lecture === 'socle' ? 'socle' : 'firestore'; } catch (err) {}
    res.json({ jeton, exp: ouverte.exp, app_id: ouverte.app_id, nouveau: ouverte.nouveau,
      seq: e.seq, vide: e.seq === 0, etat: 'actif', lotMax: LOT_MAX, double: dbl, lecture: lec });
  });

  /* ══ GET /api/op/depuis ═══════════════════════════════════════════════════════════════════ */
  poser('GET', '/api/op/depuis', opJeton, (req, res) => {
    let d;
    try { d = socle.depuis(req.op.t, req.query.seq, req.query.max); }
    catch (e) { console.error('socle: lecture impossible —', e.code || 'erreur'); return res.status(503).json({ error: 'lecture indisponible', motif: 'base' }); }
    /* ⛔ LES LIGNES ILLISIBLES SONT COMPTÉES ET REMONTÉES, PAS AVALÉES. Une ligne qui ne se
       déchiffre plus est un incident (trafic, restauration mal ciblée, bloc abîmé) : elle ne
       doit ni faire tomber la synchro de l'entreprise, ni disparaître sans bruit. L'écran peut
       dire « 1 enregistrement illisible » ; le journal du serveur ne nomme personne. */
    if (d.illisibles.length) { noterIllisibles(req.op.t, d.illisibles.length); console.error('socle: ' + d.illisibles.length + ' ligne(s) illisible(s) à la lecture'); }
    res.json({ seq: d.seq, curseur: d.curseur, reste: d.reste, enr: d.enr, illisibles: d.illisibles.length });
  });

  /* ══ POST /api/op/pousser ═════════════════════════════════════════════════════════════════ */
  poser('POST', '/api/op/pousser', opJeton, (req, res) => {
    const b = req.body || {};
    const lignes = Array.isArray(b.enr) ? b.enr : null;
    if (!lignes) return res.status(400).json({ error: 'enr attendu', motif: 'forme' });
    if (lignes.length > LOT_MAX) return res.status(413).json({ error: 'lot trop grand — ' + LOT_MAX + ' lignes au plus', motif: 'lot', lotMax: LOT_MAX });
    let r;
    try {
      r = socle.pousser(req.op.t, lignes, { app_id: req.op.app_id, utilisateur: monStr(b.u, 60), ver: monStr(b.ver, 12), origine: 'appareil',
        /* Les deux plafonds sont réglables sur le VPS sans toucher au code : une entreprise
           qui grossit se règle, elle ne se dépanne pas en urgence. */
        octetsMax: (config.socle && config.socle.octetsMax), disquePlancher: (config.socle && config.socle.disquePlancher) });
    }
    catch (e) { console.error('socle: pousse impossible —', e.code || 'erreur'); return res.status(503).json({ error: 'écriture indisponible — rien n\'a été enregistré', motif: 'base' }); }
    if (r.acceptes) reveiller(req.op.t, r.seq, req.op.app_id);
    noterRefus(r.refus);
    /* ⛔ UN REFUS TOTAL NE SORT PAS EN 200. Quand la place manque, RIEN n'a été écrit : rendre
       200 avec une liste de refus laisse l'écran libre de n'y voir qu'un détail, et c'est
       exactement « un refus ne se montre pas tout seul ». Deux codes distincts parce que les
       deux causes appellent deux gestes différents : 507 c'est CETTE entreprise qui déborde
       (on règle son plafond), 503 c'est le DISQUE du serveur (personne n'écrit plus, c'est
       nous qui devons agir). Le motif voyage dans les deux cas. */
    if (!r.acceptes && r.refus.length && r.refus.every(x => x.motif === 'espace_plein'))
      return res.status(507).json(Object.assign({}, r, { error: 'L\'espace de stockage de cette entreprise est plein. Rien n\'a été enregistré. Contacte TEAM OP.' }));
    if (!r.acceptes && r.refus.length && r.refus.every(x => x.motif === 'disque_plein'))
      return res.status(503).json(Object.assign({}, r, { error: 'Le serveur manque de place. Rien n\'a été enregistré, ton travail est conservé sur l\'appareil. Réessaie plus tard.' }));
    /* ⛔ ET L'HORLOGE EST LE TROISIÈME REFUS TOTAL, OUBLIÉ DES DEUX AUTRES. Il sortait en 200
       avec `acceptes:0` — donc l'écran était libre de n'y voir qu'un détail, alors que RIEN
       n'avait été écrit. Quand le serveur retarde, c'est 100 % des écritures de TOUS les
       appareils qui tombent ici : le pire moment pour se taire. 409 parce que ce n'est ni un
       manque de place (507/503) ni un refus d'accès — c'est un DÉSACCORD sur l'heure, et
       l'écart est dit en minutes pour que le message nomme la cause réelle. */
    if (!r.acceptes && r.refus.length && r.refus.every(x => x.motif === 'horlogeAvancee')) {
      const ecart = Math.max(...r.refus.map(x => parseInt(x.ecartMin, 10) || 0));
      return res.status(409).json(Object.assign({}, r, { ecartMin: ecart,
        error: 'L\'heure de cet appareil ou celle du serveur est fausse de ' + ecart + ' minute(s). '
          + 'Rien n\'a été enregistré, ton travail est conservé sur l\'appareil. Contacte TEAM OP.' }));
    }
    res.json(r);
  });

  /* ══ POST /api/op/controle ════════════════════════════════════════════════════════════════
     L'appareil dit si SA signature et celle du serveur coïncident. C'est la seule source
     possible de la condition (d) de l'étape 5 : le serveur connaît la sienne, jamais celle de
     Firestore. Bon marché exprès — il ne déchiffre RIEN, il range un verdict. */
  poser('POST', '/api/op/controle', opJeton, (req, res) => {
    const b = req.body || {};
    let n = 0;
    try { n = socle.controleNoter(req.op.t, { app_id: req.op.app_id, ok: b.ok === true, ecarts: b.ecarts }); }
    catch (e) { console.error('socle: verdict de contrôle non noté —', e.code || 'erreur'); return res.status(503).json({ error: 'verdict non enregistré', motif: 'base' }); }
    /* ⚠️ Un verdict EN ÉCHEC se voit dans le journal du serveur, sans nommer l'espace :
       `/health` est publique et le journal du VPS n'a pas à porter d'identifiant de client.
       Ce qui nomme l'espace, c'est l'écran de la Tour, derrière le mot de passe du patron. */
    if (b.ok !== true) console.error('socle : un appareil signale une DIVERGENCE de signature');
    res.json({ ok: true, gardes: n });
  });

  /* ══ POST /api/op/atteste ═════════════════════════════════════════════════════════════════
     ⛔ L'ÉTAPE 7 : chaque appareil dépose ce qu'il a relu et ce qu'il détient. C'est la
     dernière étape avant le retrait de Firestore, donc la dernière où un oubli se rattrape —
     et on ne la ferme pas sur un chiffre agrégé. Bon marché : elle range des nombres, elle ne
     déchiffre rien. */
  poser('POST', '/api/op/atteste', opJeton, (req, res) => {
    const b = req.body || {};
    let n = 0;
    try { n = socle.attesterNoter(req.op.t, Object.assign({}, b, { app_id: req.op.app_id })); }
    catch (e) {
      if (e && e.code === 'DEV') return res.status(400).json({ error: 'dev requis', motif: 'identite' });
      console.error('socle: attestation non notée —', (e && e.code) || 'erreur');
      return res.status(503).json({ error: 'attestation non enregistrée', motif: 'base' });
    }
    /* ⚠️ Une relecture EN ÉCHEC se voit dans le journal du serveur, sans nommer l'espace. */
    if (b.relu && b.relu.ok !== true) console.error('socle : un appareil a relu et signale un MANQUE');
    res.json({ ok: true, attestations: n });
  });

  /* ══ GET /api/op/flux ═════════════════════════════════════════════════════════════════════ */
  poser('GET', '/api/op/flux', opJeton, (req, res) => {
    const t = req.op.t;
    /* ⛔ `rang()` ET PAS `etat()`. `etat()` relit et hache TOUTE la base : MESURÉ 42 ms sur
       20 000 enregistrements, en synchrone, et c'est la route la plus appelée de toutes
       (chaque appareil, en permanence). À 1 200 sondages/min ça bloquait 50 secondes de boucle
       d'événements sur 60 — le serveur mort pour TOUS les clients, depuis un seul jeton
       parfaitement légitime. `rang()` lit un entier dans `meta`. `gardien`, 18 septembre. */
    let seq;
    try { seq = socle.rang(t); } catch (err) { return res.status(503).json({ error: 'flux indisponible', motif: 'base' }); }
    const depuis = parseInt(req.query.depuis, 10) || 0;
    if (seq > depuis) return res.json({ seq });   // déjà en retard : on répond tout de suite
    const e = { seq };

    const s = attentes.get(t) || (attentes.set(t, new Set()), attentes.get(t));
    /* Borne mémoire : un appareil qui rouvrirait mille flux sans les fermer ne doit pas faire
       grossir cette liste sans fin. Au-delà, on répond immédiatement — l'appareil repassera. */
    if (s.size > 200) return res.json({ seq: e.seq });
    const a = { app_id: req.op.app_id, resoudre: null, minuteur: null };
    a.resoudre = (o) => { if (!res.headersSent) res.json(o); };
    a.minuteur = setTimeout(() => { s.delete(a); if (!s.size) attentes.delete(t); a.resoudre({ seq: e.seq }); }, FLUX_MS);
    a.minuteur.unref && a.minuteur.unref();
    /* Un appareil qui ferme son onglet ne doit pas laisser un minuteur et une réponse en l'air. */
    req.on('close', () => { s.delete(a); clearTimeout(a.minuteur); if (!s.size) attentes.delete(t); });
    s.add(a);
  });

  /* ══ GET /api/op/etat — le contrôle de non-régression ═════════════════════════════════════ */
  poser('GET', '/api/op/etat', opJeton, (req, res) => {
    try {
      const e = socle.etat(req.op.t);
      /* ⛔ LA SIGNATURE CANONIQUE, À CÔTÉ DE L'AUTRE ET PAS À SA PLACE. `etat().signature` hache
         `coll|id|maj_le|supprime_le` : elle voit une ligne manquante ou une date qui change,
         mais PAS un contenu différent à date égale — c'est-à-dire justement ce qu'un
         `syncAlleger` mal placé produirait (même identifiant, même `maj_le`, une photo en
         moins). Le contrôle de l'étape 4 serait passé au vert sur la panne qu'il existe pour
         voir. `canon` porte l'empreinte du corps, et le détail par collection : une alerte qui
         dit « ça diverge » sans dire OÙ fait chercher une heure.
         ⚠️ Elle ne déchiffre rien : l'empreinte est déjà en clair dans la colonne. */
      try { e.canon = socle.signatureCanonique(req.op.t); } catch (x) { e.canon = null; }
      res.json(e);
    }
    catch (e) { res.status(503).json({ error: 'état indisponible', motif: 'base' }); }
  });

  /* ══ POST /api/op/numero — une PLAGE, jamais un numéro ════════════════════════════════════ */
  poser('POST', '/api/op/numero', opJeton, (req, res) => {
    const b = req.body || {};
    const annee = parseInt(b.annee, 10) || 0, plancher = parseInt(b.plancher, 10) || 0;
    /* ⛔ `plancher` VIENT DU CORPS ET DÉCIDE D'UN ÉTAT IRRÉVERSIBLE — le compteur ne redescend
       jamais, par conception. Sans borne, `{plancher: 999999999}` poussait définitivement la
       numérotation d'une entreprise à un milliard, et rien ne pouvait la ramener. La borne est
       très au-dessus de tout usage réel et referme quand même la porte. Même chose pour
       `annee`, qui ouvrirait autant de lignes qu'on lui envoie de valeurs. */
    if (annee < 2000 || annee > 2200) return res.status(400).json({ error: 'année hors bornes', motif: 'numero' });
    if (plancher < 0 || plancher > 1000000) return res.status(400).json({ error: 'plancher hors bornes', motif: 'numero' });
    /* ⚠️ Jamais `e.message` au client : sur une erreur SQLite il porte le chemin du fichier. */
    try { res.json(socle.numeroReserver(req.op.t, monStr(b.prefixe, 16), annee, b.n, plancher)); }
    catch (e) { console.error('socle: numéro non réservé —', e.code || 'erreur'); res.status(400).json({ error: 'réservation impossible', motif: 'numero' }); }
  });

  /* ══ LES ROUTES DE LA TOUR ════════════════════════════════════════════════════════════════
     `garde` est `monPatronStrict`, qui relit rôle/actif/apps à CHAQUE requête. Les chemins
     tombent dans la Tour GESTION par défaut (`monAppDeRoute`), où l'oubli FERME. */

  /* ⛔ ALLUMER OU COUPER LA DOUBLE ÉCRITURE D'UN ESPACE — LA MARCHE ARRIÈRE DE L'ÉTAPE 4.
     Espace par espace, jamais en bloc : on allume UNE entreprise, on la regarde une semaine,
     et on décide. Allumer tout le monde d'un coup, c'est se priver du seul moment où une
     divergence se rattrape encore à la main.
     ⚠️ Elle ne fait PAS naître d'entreprise : un `t` mal tapé rend 404 et ne crée ni ligne
     d'annuaire ni clé. Et elle rend l'ÉTAT OBTENU, pas un `ok` — croire une entreprise coupée
     alors qu'elle ne l'est pas est la panne silencieuse type de ce dépôt. */
  poser('POST', '/api/monitor/op/double', garde, (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    /* `actif` vient du corps et décide d'un état : on le lit comme un booléen STRICT, jamais
       en vérité JavaScript. `{actif:'false'}` vaut vrai en JS — et allumerait la double
       écriture d'une entreprise à qui on croyait la couper. */
    const actif = b.actif === true || b.actif === 1;
    let r;
    try { r = socle.entrepriseDouble(t, actif); }
    catch (e) { console.error('socle: double écriture non réglée —', e.code || 'erreur'); return res.status(503).json({ error: 'réglage impossible', motif: 'base' }); }
    if (!r.connue) return res.status(404).json({ error: 'aucun stockage pour cet espace', motif: 'inconnu' });
    console.log('socle : double écriture ' + (r.double ? 'ALLUMÉE' : 'coupée') + ' pour un espace');
    res.json({ ok: true, double: r.double });
  });

  /* ⛔ LE NIVEAU QUI RÉPOND À HUIT QUESTIONS DE DÉPANNAGE SUR DIX, SANS AUCUN CONTENU. C'est
     LUI la vraie protection de la vie privée des clients : pas la session de 30 minutes, mais
     le fait qu'on n'en ait presque jamais besoin. Il ne rend JAMAIS un `id` ni un login. */
  /* ⛔ BASCULER LA LECTURE D'UN ESPACE — L'ÉTAPE 5, ET SON RETOUR ARRIÈRE EN UNE REQUÊTE.
     ⚠️ ELLE NE VÉRIFIE PAS LES QUATRE CONDITIONS, ET C'EST DÉLIBÉRÉ : elles se CONSTATENT sur
     `/api/monitor/op/pret`, elles se décident par un humain, et le retour arrière doit rester
     inconditionnel — une garde qui empêcherait de revenir à `firestore` un jour de panne
     serait exactement la garde qu'il ne faut pas. La route dit donc ce que la bascule vaut
     AUJOURD'HUI, pour que la Tour puisse refuser d'elle-même de l'allumer. */
  poser('POST', '/api/monitor/op/lecture', garde, (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    /* `source` vient du CORPS et décide de la source de vérité d'une entreprise : on le lit en
       chaîne EXACTE, jamais en vérité JavaScript. Tout le reste retombe sur `firestore`. */
    const src = String(b.source || '') === 'socle' ? 'socle' : 'firestore';
    let r;
    try { r = socle.entrepriseLecture(t, src); }
    catch (e) { console.error('socle: lecture non basculée —', e.code || 'erreur'); return res.status(503).json({ error: 'bascule impossible', motif: 'base' }); }
    if (!r.connue) return res.status(404).json({ error: 'aucun stockage pour cet espace', motif: 'inconnu' });
    console.log('socle : lecture d\'un espace basculée sur ' + r.lecture);
    res.json({ ok: true, lecture: r.lecture });
  });

  /* ══ GET /api/monitor/op/pret ═════════════════════════════════════════════════════════════
     ⛔ LES QUATRE CONDITIONS DE L'ÉTAPE 5, CALCULÉES — PAS RÉCITÉES. Le plan les écrit ; sans
     cette route elles resteraient une intention, et on basculerait « parce que ça avait l'air
     bon ». Chacune rend son verdict ET sa PREUVE, parce qu'un `false` tout seul coûte une
     heure et finit par être contourné.
     ⚠️ (a) est celle qui a failli ne jamais converger. Elle compare deux listes : les appareils
     qui parlent au SOCLE (`appareil.nom` porte le `dev-…` local) et ceux qui se connectent à
     l'API (`cnxData`, même `dev`). Un appareil vu par l'API et absent du socle est un appareil
     qui travaille SANS pousser — et c'est exactement ce qu'il faut savoir avant de basculer.
     Les deux côtés emploient la MÊME fenêtre : sinon l'un vieillit et l'autre non, et la
     condition devient inatteignable. */
  poser('GET', '/api/monitor/op/pret', garde, (req, res) => {
    const t = monStr(req.query.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    if (!socle.existe(t)) return res.status(404).json({ error: 'aucun stockage pour cet espace' });
    const FENETRE = 14 * 86400000;   // la fenêtre du plan : « vus dans les 14 jours »
    const depuis = Date.now() - FENETRE;

    let socleDevs = [], etatEnt = null, suite = null;
    try {
      socleDevs = socle.appareilsVivants(t, FENETRE).map(a => String(a.nom || '')).filter(Boolean);
      etatEnt = socle.entrepriseEtat(t);
      suite = socle.controleSuite(t, 7);
    } catch (e) { return res.status(503).json({ error: 'stockage illisible' }); }

    /* Les appareils vus par l'API, même fenêtre. `cnxAppareils` est injecté par `index.js` :
       `cnxData` y vit, et le socle n'a pas à connaître le format d'un journal de connexions. */
    const apiDevs = typeof cnxAppareils === 'function' ? cnxAppareils(t, depuis) : null;
    const dansSocle = new Set(socleDevs);
    /* ⚠️ `null` VEUT DIRE « ON N'A PAS PU SAVOIR », ET CE N'EST PAS UNE LISTE VIDE. Sans ce
       troisième état, un journal de connexions illisible ferait dire « aucun appareil en
       retard » — donc « tu peux basculer » — au moment précis où on ne sait rien. Ce dépôt a
       déjà payé cette confusion deux fois (`_mailboxes`, `syncDecrypt`). */
    const muets = apiDevs === null ? null : apiDevs.filter(d => !dansSocle.has(d));

    const a = { ok: muets !== null && muets.length === 0 && socleDevs.length > 0,
      vusParLApi: apiDevs === null ? null : apiDevs.length, surLeSocle: socleDevs.length,
      enRetard: muets === null ? null : muets.length,
      /* Un identifiant d'appareil est un jeton local tiré au hasard, pas une donnée
         personnelle — et la Tour est derrière le mot de passe du patron. On les nomme, sinon
         « 3 appareils en retard » ne se traite pas. */
      lesquels: muets === null ? null : muets.slice(0, 20),
      pourquoi: apiDevs === null ? 'journal de connexions illisible — on ne sait pas'
        : !socleDevs.length ? 'aucun appareil ne parle encore au socle' : '' };

    const annuaire = typeof espaceConnu === 'function' ? espaceConnu(t) : null;
    const b2 = { ok: annuaire === true, connu: annuaire,
      pourquoi: annuaire === null ? 'annuaire non consultable ici' : annuaire ? '' : 'espace absent de l\'annuaire' };
    const c = { ok: !cleEstPublique(t), partagee: cleEstPublique(t),
      pourquoi: cleEstPublique(t) ? 'espace encore sur la clé partagée' : '' };
    const d = { ok: !!(suite && suite.ok), jours: 7, joursMuets: suite ? suite.joursMuets : 7,
      joursEnEchec: suite ? suite.joursEnEchec : 0, verdictsGardes: suite ? suite.controles : 0,
      pourquoi: !suite ? 'aucun verdict'
        : suite.joursEnEchec ? suite.joursEnEchec + ' jour(s) avec une divergence'
        : suite.joursMuets ? suite.joursMuets + ' jour(s) sans aucun contrôle — on ne sait pas' : '' };

    /* Une cinquième ligne, que le plan n'écrivait pas parce qu'elle n'existait pas encore :
       un espace fermé ou suspendu ne pousse plus rien, donc son socle se périme. Le basculer
       lui servirait une base figée au jour de sa suspension. */
    const bloque = typeof espaceBloque === 'function' ? espaceBloque(t) : null;
    const e5 = { ok: bloque === false && etatEnt.etat === 'actif', bloqueParLAnnuaire: bloque, etatSocle: etatEnt.etat,
      pourquoi: bloque === null ? 'état d\'annuaire non consultable ici'
        : bloque ? 'espace fermé — il ne pousse plus rien'
        : etatEnt.etat !== 'actif' ? 'socle coupé pour cet espace' : '' };

    res.json({ t, fenetreJours: 14,
      lecture: etatEnt.lecture, double: etatEnt.double, etat: etatEnt.etat,
      conditions: { a, b: b2, c, d, ouvert: e5 },
      /* ⛔ UNE SEULE FAUSSE = ON NE BASCULE PAS. Le plan l'écrit ; on le CALCULE, pour que
         personne n'ait à recompter quatre booléens un soir de fatigue. */
      pret: !!(a.ok && b2.ok && c.ok && d.ok && e5.ok) });
  });

  /* ══ GET /api/monitor/op/attestations ═════════════════════════════════════════════════════
     ⛔ LA TOUR NOMME LES MANQUANTS. « 9 appareils sur 12 ont attesté » ne dit pas quoi faire ;
     « il manque ces trois-là » permet de demander à ces trois personnes d'ouvrir l'application.
     ⚠️ Un identifiant d'appareil est un jeton local tiré au hasard, pas une personne — et cette
     route est derrière le mot de passe du patron. */
  poser('GET', '/api/monitor/op/attestations', garde, (req, res) => {
    const t = monStr(req.query.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    if (!socle.existe(t)) return res.status(404).json({ error: 'aucun stockage pour cet espace' });
    let e;
    try { e = socle.attestationEtat(t, 14 * 86400000); }
    catch (err) { return res.status(503).json({ error: 'stockage illisible' }); }
    res.json(e);
  });

  poser('GET', '/api/monitor/op/apercu', garde, (req, res) => {
    const t = monStr(req.query.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    /* ⛔ `existe()` ET PAS `try { etat(t) } catch`. `ouvrir()` CRÉE la base : la garde était du
       code mort, et `?t=faute-de-frappe` répondait 200 avec un état vide — la Tour affichait un
       stockage sain pour un espace inexistant, écrivait une ligne au journal opposable pour un
       `t` fantôme, et laissait une base vide sur le disque. `gardien`, 18 septembre 2026. */
    let e, appareils, etatEnt, verif = null;
    try {
      if (!socle.existe(t)) return res.status(404).json({ error: 'aucun stockage pour cet espace' });
      e = socle.etat(t); appareils = socle.appareilsDe(t); etatEnt = socle.entrepriseEtat(t);
      /* ⛔ LE CONTRÔLE COMPLET NE SE FAIT PAS À L'OUVERTURE D'UN ÉCRAN. `verifier()` DÉCHIFFRE
         toute la base : MESURÉ 368 ms de boucle d'événements gelée — pour TOUS les clients, à
         chaque fois que quelqu'un ouvre cet écran de la Tour. C'est le défaut que les pièces
         jointes ont déjà payé, une troisième fois. Il se demande explicitement (`?verifier=1`),
         il ne se subit pas. Le compteur pas cher (`illisiblesVus`) suffit à savoir s'il faut
         le demander. */
      if (req.query.verifier === '1') verif = socle.verifier(t);
    } catch (err) { return res.status(503).json({ error: 'stockage illisible' }); }
    res.json({ seq: e.seq, octets: e.octets, signature: e.signature, parColl: e.parColl,
      etat: etatEnt.etat, ferme_le: etatEnt.ferme_le, horlogeAvancee: e.horlogeAvancee,
      /* ⛔ ÉCRIT ET JAMAIS LU EST AUSSI GRAVE QUE CRÉÉ ET JAMAIS ÉCRIT. Le compteur d'échecs
         d'enrôlement existait sur le disque et AUCUNE route ne le rendait : quelqu'un cherchant
         si un espace est mitraillé aurait conclu qu'il ne l'était pas. Il est ici, avec le
         nombre de lignes qu'on n'a pas su déchiffrer depuis le démarrage. */
      echecsEnrolement: e.echecsEnrolement, illisiblesVus: illisiblesDe(t),
      verif: verif ? { lues: verif.lues, illisibles: verif.illisibles, ok: verif.ok } : null,
      appareils: appareils.map(a => ({ nom: a.nom, cree_le: a.cree_le, vu_le: a.vu_le, revoque: !!a.revoque_le })),
      ouvert: !!sessionDiag(t) });
  });

  /* ⛔ PAS DE MOTIF ÉCRIT, PAS DE LECTURE. Le motif fait dix caractères au moins, il part dans
     le journal chaîné, et le journal est lisible PAR LE CLIENT depuis son espace. C'est le seul
     geste qui rende vérifiable la promesse de `sous-traitance.html`. */
  poser('POST', '/api/monitor/op/ouvrir', garde, (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), motif = monStr(b.motif, 300).trim();
    if (!t) return res.status(400).json({ error: 't requis' });
    if (motif.length < 10) return res.status(400).json({ error: 'Un motif d\'au moins 10 caractères est obligatoire : il sera lisible par le client.' });
    let existe = false;
    try { existe = socle.existe(t); } catch (e) {}
    if (!existe) return res.status(404).json({ error: 'aucun stockage pour cet espace' });
    const qui = String((req.tourUser && req.tourUser.nom) || 'tour').slice(0, 60);
    let ligne;
    /* ⛔ LA TRACE D'ABORD, L'OUVERTURE ENSUITE. Si le journal n'écrit pas, on n'ouvre pas :
       une lecture non tracée vaut moins que pas de lecture du tout. */
    try { ligne = socle.diagnostic(t, { qui, motif, portee: 'ouverture', ipH: hachIp(req) }); }
    catch (e) { return res.status(503).json({ error: 'journal indisponible — ouverture refusée' }); }
    diagSessions.set(t, { qui, exp: Date.now() + DIAG_VIE_MS });
    res.json({ ok: true, jusqua: Date.now() + DIAG_VIE_MS, trace: ligne.id });
  });

  /* L'historique d'un enregistrement, version par version. C'est la route qui justifie le
     chantier : « qui a vidé cette box, et quand » devient une réponse en trois secondes. */
  poser('GET', '/api/monitor/op/journal', garde, (req, res) => {
    const t = monStr(req.query.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    const d = sessionDiag(t);
    if (!d) return res.status(403).json({ error: 'Ouvre d\'abord un accès de diagnostic sur cet espace, avec un motif.' });
    let l;
    try { l = socle.journalDe(t, monStr(req.query.coll, 40), monStr(req.query.id, 80), req.query.max); }
    catch (e) { return res.status(503).json({ error: 'journal indisponible' }); }
    /* ⛔ ON TRACE CELUI QUI LIT, PAS CELUI QUI A OUVERT. La session de diagnostic dure 30
       minutes et n'est pas nominative : attribuer la lecture à `d.qui` (celui qui a saisi le
       motif) nommerait la mauvaise personne dans le SEUL journal opposable au client, dès
       qu'il y aura deux comptes dans la Tour. `req.tourUser` est relu à chaque requête par
       `monPatronStrict` — c'est lui qui dit qui est devant l'écran maintenant. */
    const lecteur = String((req.tourUser && req.tourUser.nom) || d.qui || 'tour').slice(0, 60);
    try { socle.diagnostic(t, { qui: lecteur, motif: 'lecture du journal', portee: monStr(req.query.coll, 40) || 'tout', n: l.length, ipH: hachIp(req) }); } catch (e) {}
    res.json({ lignes: l });
  });

  /* ⛔ COUPER DOIT COUPER, ET SI ÇA ÉCHOUE, L'APPELANT LE REMONTE. Croire une entreprise
     coupée alors qu'elle ne l'est pas est la panne silencieuse type de ce dépôt. */
  poser('POST', '/api/monitor/op/couper', garde, (req, res) => {
    const t = monStr((req.body || {}).t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    /* ⛔ LA QUATRIÈME PORTE AVAIT OUBLIÉ LA GARDE. `apercu` et `ouvrir` vérifiaient `existe()`,
       pas `couper` — et `entrepriseOuvrir()` fait un INSERT qui CRÉE la ligne d'annuaire ET une
       clé pour un `t` qui n'existe pas. MESURÉ : une faute de frappe (`elan-34oX`) faisait
       naître l'espace fantôme, la route répondait `{ok:true, etat:'ferme'}`, et le journal
       chaîné — le seul dispositif opposable au client — portait pour toujours la fermeture
       d'une entreprise qui n'a jamais existé. Pendant ce temps la vraie, correctement
       orthographiée, lisait et écrivait toujours. */
    let la = false;
    try { la = socle.existe(t); } catch (e) {}
    if (!la) return res.status(404).json({ error: 'aucun stockage pour cet espace' });
    /* ⛔ ON FERME L'ENTREPRISE, ON NE COUPE PAS QUE SES SESSIONS. Couper les sessions seules
       ne coupait RIEN : l'appareil rappelait `/api/op/session` avec la même clé d'équipe dans
       la seconde et repartait pour 30 jours, pendant que la Tour affichait « révoqué ». Le
       droit d'ouvrir une session vient de la CLÉ ; la coupure doit donc porter sur l'ÉTAT. */
    const ouvrir = (req.body || {}).ouvrir === true;
    let r;
    try { r = socle.entrepriseOuvrir(t, ouvrir); }
    catch (e) { return res.status(503).json({ ok: false, error: 'coupure IMPOSSIBLE — les appareils de cet espace lisent et écrivent toujours. NE PAS considérer cet espace comme coupé.' }); }
    if (!ouvrir) { diagSessions.delete(t); reveiller(t, -1); }
    try { socle.diagnostic(t, { qui: String((req.tourUser && req.tourUser.nom) || 'tour'), motif: ouvrir ? 'réouverture de l\'espace' : 'fermeture de l\'espace', portee: 'couper', n: r.coupees, ipH: hachIp(req) }); } catch (e) {}
    res.json({ ok: true, etat: r.etat, coupees: r.coupees });
  });

  /* ⚠️ PAS ENCORE LISIBLE PAR LE CLIENT — et il faut l'écrire au futur tant que ça l'est. Une
     version de ce commentaire l'affirmait au présent ; aucune route client n'expose ce journal
     aujourd'hui. C'est pourtant le seul geste qui rendrait vérifiable ce que promet
     `sous-traitance.html`, donc c'est une dette nommée, à livrer avant d'allumer le drapeau
     chez un client. ⛔ Ne pas re-écrire cette phrase au présent avant que la route existe. */
  poser('GET', '/api/monitor/op/diagnostics', garde, (req, res) => {
    const t = monStr(req.query.t, 80);
    if (!t) return res.status(400).json({ error: 't requis' });
    try { res.json({ lignes: socle.diagnosticsDe(t, req.query.max), chaine: socle.ancreVerifier() }); }
    catch (e) { res.status(503).json({ error: 'journal indisponible' }); }
  });

  /* ⚠️ `ip_h` est un HACHÉ SALÉ, jamais une adresse : ce journal est destiné à être lu par le
     client, et une adresse IP y désignerait une personne. Le sel vit en mémoire et change à
     chaque redémarrage — on peut donc comparer deux lignes de la même session, jamais
     remonter à quelqu'un. C'est exactement ce qu'on veut : détecter « la même origine », pas
     « qui ». */
  const SEL_IP = crypto.randomBytes(16);
  function hachIp(req) {
    return crypto.createHmac('sha256', SEL_IP).update(String(req.ip || '?')).digest('hex').slice(0, 32);
  }

  /* ══ L'ANCRE DU JOUR ══════════════════════════════════════════════════════════════════════
     ⛔ UN JOURNAL ÉCRIT PAR CELUI QU'IL SURVEILLE, SUR LA MACHINE QU'IL SURVEILLE, N'EST
     OPPOSABLE À PERSONNE. La chaîne d'empreintes rend une MODIFICATION détectable ; seule une
     ancre SORTIE DE LA MACHINE rend une RÉÉCRITURE COMPLÈTE détectable. Deux nombres et une
     empreinte partent par courriel : aucun nom d'entreprise, aucun motif, aucune adresse. */
  let minuteurAncre = null;
  const ANCRE_MS = 86400000;
  function ancreEnvoyer(force) {
    let a; try { a = socle.ancre(); } catch (e) { return; }
    if (!a.lignes) return;   // rien à ancrer : on n'envoie pas un courriel vide chaque jour
    /* ⛔ UNE MINUTERIE DE 24 HEURES NE SE DÉCLENCHE JAMAIS SUR CE SERVEUR. Un push sur `main`
       touchant `server/**` déploie, donc redémarre — plusieurs fois par jour les jours chargés,
       et le minuteur repart de zéro à chaque fois. L'ancre ne serait donc JAMAIS partie, en
       silence, alors que c'est elle qui rend le journal chaîné opposable. La date du dernier
       envoi vit sur DISQUE et on regarde toutes les heures s'il est temps. Même famille de
       défaut que le compteur d'horloge : ce qui doit survivre au déploiement ne tient pas dans
       une variable. */
    /* ⛔ DEUX DATES, ET C'EST TOUT LE SUJET. `ancre_tentee_le` porte la CADENCE — sinon une
       boîte mail en panne ferait réessayer toutes les heures, pour toujours. `ancre_envoyee_le`
       porte la VÉRITÉ : elle n'est posée que si l'ancre a réellement QUITTÉ LA MACHINE.
       La première version posait `ancre_envoyee_le` inconditionnellement, APRÈS le `catch` —
       donc un envoi qui jetait, ou une absence totale de courriel configuré, laissait quand
       même « envoyée aujourd'hui » sur le disque. Or l'ancre est la SEULE moitié opposable du
       journal chaîné : la chaîne rend une modification détectable, seule l'ancre sortie de la
       machine rend une RÉÉCRITURE COMPLÈTE détectable. Un dispositif qui se déclare vivant
       sans l'être est pire que pas de dispositif — on cesse de le surveiller. */
    if (!force) {
      let dernier = 0;
      try { dernier = parseInt(socle.reglageLire('ancre_tentee_le'), 10) || 0; } catch (e) {}
      if (Date.now() - dernier < ANCRE_MS) return;
    }
    try { socle.reglagePoser('ancre_tentee_le', Date.now()); } catch (e) {}
    const texte = 'Ancre du journal de diagnostic OP SOCLE\n\n'
      + 'lignes : ' + a.lignes + '\nrang   : ' + a.rang + '\nempreinte : ' + a.sha
      + '\n\nConserver ce message. Il ne contient aucune donnée de client.\n'
      + 'Si une ancre future ne se raccorde pas à celle-ci, le journal a été réécrit.\n';
    /* ⛔ LE RÉGLAGE S'APPELLE `notifDemandes`, ET C'EST LE SEUL QUI EXISTE. La première version
       lisait `config.alerteEmail` — un nom que j'avais inventé, que `install.sh` n'écrit pas et
       qui n'apparaît nulle part ailleurs dans le dépôt. La garde était donc TOUJOURS fausse :
       l'ancre ne sortait jamais de la machine, une fois par jour, pour toujours, en silence.
       Or c'est précisément la sortie par courriel qui rend le journal chaîné opposable — la
       chaîne rend une modification détectable, seule l'ancre rend une RÉÉCRITURE COMPLÈTE
       détectable. Le dispositif se réduisait à sa moitié inutile. `gardien`, 18 septembre 2026.
       ⛔ ET `mailerEnvoi` JETTE EN SYNCHRONE si le courriel n'est pas configuré (`mailer` n'est
       créé que si `config.smtp.host`) : le `.catch()` ne s'attachait jamais, l'exception
       remontait d'un `setInterval`, et LE PROCESSUS SORTAIT. D'où le `try` autour de l'appel
       lui-même, et pas seulement autour de la promesse. */
    const dest = String((config && config.notifDemandes) || '').trim();
    const reussi = () => { try { socle.reglagePoser('ancre_envoyee_le', Date.now()); } catch (e) {} };
    if (deps.mailerEnvoi && dest) {
      try {
        const envoi = deps.mailerEnvoi({ from: (config.smtp && (config.smtp.from || config.smtp.user)) || dest, to: dest,
          subject: '🔗 Ancre du journal OP SOCLE — ' + a.lignes + ' lignes', text: texte, trace: 'ancre socle' });
        /* ⛔ ON NE MARQUE « ENVOYÉE » QUE QUAND L'ENVOI A ABOUTI. Une promesse : on attend son
           issue. Autre chose sans jeter : l'appel est passé, on l'accepte. Un jet : rien n'est
           posé, et la prochaine tentative aura lieu demain — la cadence est portée par
           `ancre_tentee_le`, pas par celle-ci. */
        if (envoi && typeof envoi.then === 'function') {
          envoi.then(reussi, e => console.error('ancre non envoyée :', e.code || 'erreur'));
        } else reussi();
      } catch (e) { console.error('ancre non envoyée :', e.code || 'erreur'); }
    } else {
      /* ⚠️ Sans courriel configuré, l'ancre ne part qu'au journal système — qui vit sur la MÊME
         machine, donc ne prouve rien contre elle. On le DIT plutôt que de laisser croire que
         le dispositif tourne. */
      console.log('ancre socle (NON SORTIE DE LA MACHINE — notifDemandes non configuré) : ' + a.lignes + ' lignes, ' + a.sha);
    }
  }
  /* Toutes les heures on REGARDE s'il est temps ; c'est la date sur disque qui décide, pas le
     minuteur. Et un premier regard 90 s après le démarrage, pour qu'un serveur redémarré à
     répétition finisse quand même par envoyer son ancre. */
  const premier = setTimeout(() => { try { ancreEnvoyer(); } catch (e) {} try { purger(); } catch (e) {} }, 90000);
  premier.unref && premier.unref();
  minuteurAncre = setInterval(() => { try { ancreEnvoyer(); } catch (e) {} }, 3600000);
  minuteurAncre.unref && minuteurAncre.unref();

  /* ⛔ LA PURGE À 90 JOURS, QUI N'EXISTAIT PAS ALORS QUE DEUX COMMENTAIRES L'AFFIRMAIENT AU
     PRÉSENT. Sans elle, chaque version de chaque enregistrement reste déchiffrable POUR
     TOUJOURS par `/api/monitor/op/journal`, et le disque porte deux copies de tout. Ce qu'un
     client supprime doit finir par disparaître : c'est ce que promet `sous-traitance.html`.
     ⚠️ Seul le CORPS part ; l'historique de qui a fait quoi reste, sans le contenu. */
  /* ⛔ MÊME DÉFAUT QUE L'ANCRE, ET IL FALLAIT LE VOIR DEUX FOIS : une minuterie de 6 h sur un
     serveur qui redémarre à chaque déploiement ne se déclenche jamais un jour chargé. La date
     du dernier passage vit sur DISQUE, et on regarde toutes les heures. Une purge qui ne tourne
     pas, c'est la promesse de conservation bornée de `sous-traitance.html` qui ne tient pas —
     en silence, et d'autant plus les jours où l'on travaille le plus. */
  const PURGE_MS = 6 * 3600000;
  const purger = () => {
    try {
      const dernier = parseInt(socle.reglageLire('purge_faite_le'), 10) || 0;
      if (Date.now() - dernier < PURGE_MS) return;
      const r = socle.purgerToutesLesEntreprises();
      socle.reglagePoser('purge_faite_le', Date.now());
      if (r.purgees) console.log('socle: journal purgé — ' + r.purgees + ' corps sur ' + r.bases + ' base(s)');
    } catch (e) { console.error('socle: purge du journal impossible —', e.code || 'erreur'); }
  };
  const minuteurPurge = setInterval(purger, 3600000);
  minuteurPurge.unref && minuteurPurge.unref();

  /* ⛔ ICI, ET NULLE PART AVANT : c'est la seule ligne qui fasse exister les routes. Tout ce qui
     précède ne fait que les décrire. Si quoi que ce soit a jeté au-dessus, le serveur est
     exactement dans l'état « drapeau éteint », qui est le seul état sûr. */
  enregistrer();

  etat.sante = () => {
    const s = socle.sante();
    /* ⛔ `/health` est PUBLIQUE : un NOMBRE de lignes illisibles, jamais chez qui. Le « chez
       qui » est dans la Tour, qui est gardée. Mais le nombre doit sortir : sans lui, une
       entreprise dont les données cessent de se déchiffrer ne réveille personne. */
    let ill = 0; for (const n of illisibles.values()) ill += n;
    /* Agrégé par motif, sans aucun espace nommé — voir le commentaire de `refus` plus haut. */
    const parMotif = {}; for (const [m, n] of refus) parMotif[m] = n;
    /* ⛔ L'ÂGE DE LA DERNIÈRE ANCRE RÉELLEMENT SORTIE DE LA MACHINE, en jours. Rien ne le
       surveillait : le journal chaîné pouvait cesser d'être opposable pendant des semaines
       sans que personne l'apprenne. Un ENTIER, qui ne dit rien de personne. `null` quand
       aucune n'est jamais partie — l'état d'un socle qu'on vient d'allumer. */
    let ancreJours = null;
    try { const d = parseInt(socle.reglageLire('ancre_envoyee_le'), 10) || 0; if (d) ancreJours = Math.floor((Date.now() - d) / 86400000); } catch (e) {}
    /* ══ LES TROIS INSTRUMENTS DE L'ÉTAPE 6 ══════════════════════════════════════════════
       ⛔ Aucun ne nomme une entreprise : `/health` est publique, et y faire figurer un espace
       dirait au monde quelles entreprises existent. Des motifs, des nombres, des durées. */
    /* `refus` depuis le démarrage sert au diagnostic immédiat ; `refus7j` est celui qu'on
       REGARDE pendant la semaine de l'étape 6, parce qu'il survit aux déploiements. */
    let refus7j = {}, div = null;
    try { refus7j = socle.obsTotaux('refus', 7); } catch (e) {}
    /* ⛔ LE COMPTEUR QUE L'ÉTAPE 6 DEMANDE DE VOIR RESTER À ZÉRO. `avecEcart` est le nombre
       d'entreprises dont un appareil a signalé une divergence cette semaine — jamais
       lesquelles. `muets` compte celles dont AUCUN appareil n'a contrôlé : « on ne sait pas »
       n'est pas « tout va bien », et c'est la confusion que ce dépôt a payée deux fois. */
    try { div = socle.divergences(7); } catch (e) {}
    /* ⚠️ LA LECTURE VIDE LE RÉSERVOIR : ce que `/health` publie est la fenêtre depuis la
       dernière lecture. La surveillance passe toutes les heures, c'est donc « la dernière
       heure » — exactement ce qu'on veut voir. Corollaire à connaître : deux lectures
       rapprochées donnent la seconde presque vide, et ce n'est pas une panne. */
    let lat = {}; try { lat = socle.latQuantiles(true); } catch (e) {}
    return { actif: true, bases: s.bases, cle: s.cle, flux: attentes.size, routes: etat.routes.length,
      illisibles: ill, refus: parMotif, ancreJours,
      refus7j, divergences: div, latence: lat };
  };
  /* ⛔ DEUX TEMPS, ET L'ORDRE EST TOUT. `serveur.close()` ne rend la main qu'une fois TOUTES les
     connexions terminées — or un long-poll est tenu 25 secondes, et en production il y a
     TOUJOURS au moins un appareil qui en tient un. La première version appelait `etat.fermer()`
     DANS le rappel de `close()` : MESURÉ sur le vrai serveur avec UN SEUL flux ouvert, sortie
     forcée après 5 009 ms, « socle fermé » jamais écrit, et le `-wal` laissé sur le disque —
     exactement ce que le bloc était censé empêcher, à chaque déploiement.
     On libère donc les flux D'ABORD (`relacher`), ce qui laisse `close()` aboutir, et on ferme
     les bases ENSUITE (`fermer`). */
  etat.relacher = () => {
    clearInterval(minuteurAncre); clearInterval(minuteurPurge); clearTimeout(premier);
    let n = 0;
    for (const [t, s] of attentes) for (const a of s) {
      clearTimeout(a.minuteur);
      /* ⛔ PAS DE `seq: 0`. L'appareil lit `seq` pour savoir où il en est : un zéro à l'arrêt
         lui dit « le serveur est revenu au début » et déclenche un rembobinage COMPLET de la
         base — à chaque déploiement, sur chaque appareil connecté. On n'annonce donc aucun
         rang : `arret:true` seul, que l'appareil traite comme « rappelle plus tard ». */
      a.resoudre({ arret: true }); n++;
    }
    attentes.clear();
    return n;
  };
  etat.fermer = () => { etat.relacher(); return socle.fermer(); };
  etat.ancreEnvoyer = ancreEnvoyer;
  return etat;
}

module.exports = { monterOpSocle, FLUX_MS, JETON_VIE_MS, LOT_MAX, DIAG_VIE_MS };
