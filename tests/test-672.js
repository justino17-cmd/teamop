/* ⛔ CE QUE CE FICHIER GARDE — d'un incident à la personne qui l'a vécu.

   Justin, 13 septembre 2026, capture du dossier d'un incident à l'appui : « je veux voir
   pourquoi, qui, le lien qu'il a utilisé pour se connecter, l'appareil et les navigateurs et
   la version — en gros pour aller plus vite à régler les problèmes ».

   ── LE FAIT QUI A DÉCIDÉ DE TOUT : RIEN DE NOUVEAU N'EST COLLECTÉ ─────────────────────────
   L'application n'envoie avec une erreur que { teamId, app, version, msg, src, line, stack,
   ua } — son propre commentaire le dit : « anonyme : aucune donnée métier ». Ajouter
   l'identité à ce flux aurait voulu dire modifier app.html, donc publier en production, donc
   attendre la phrase de Justin. Or tout était DÉJÀ là, dans le journal des connexions que la
   même application écrit depuis des mois : login, nom, rôle, via, appareil, os, navigateur,
   PWA, version. La console tenait les deux côte à côte — la fiche d'une entreprise montre ses
   connexions ET ses erreurs — sans jamais les relier. Ce lot ne fait que les rapprocher.

   ── POURQUOI CE N'EST PAS UNE FENÊTRE DE ±15 MINUTES ─────────────────────────────────────
   Une connexion ne s'enregistre qu'à l'ENTRÉE (connexion, reprise de session) et à la sortie,
   jamais à chaque page. Chercher « ce qui s'est passé autour de l'erreur » ne trouverait donc
   presque rien : quelqu'un entré à 8 h plante à 16 h. On prend la DERNIÈRE session ouverte
   AVANT l'erreur — et on rend l'écart, parce que « connecté 3 h avant » n'est pas « connecté
   à l'instant », et qu'un écran qui tait cet écart laisse croire à une précision qu'on n'a pas.

   ── LES TROIS ÉTATS, ENCORE ──────────────────────────────────────────────────────────────
   « On n'a pas pu lire le journal » n'est pas « personne n'était connecté ». C'est la faute
   du 11 septembre (on réclamait son mot de passe à quelqu'un dont la boîte marchait), et elle
   se rejouerait ici à l'identique : un écran qui affiche « personne » sur une erreur réseau
   envoie chercher un coupable qui n'existe pas. Trois états, trois phrases. */

const fs = require('fs');
const TOUR = fs.readFileSync(__dirname + '/../tour.html', 'utf8');
const SRV  = fs.readFileSync(__dirname + '/../server/index.js', 'utf8');
const APP  = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

function corps(src, entete) {
  const i = src.indexOf(entete);
  if (i < 0) return '';
  let j = src.indexOf('{', i), p = 0;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (c === '{') p++;
    else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); }
  }
  return '';
}

console.log('D’un incident à la personne qui l’a vécu');

// ══ 1) RIEN DE NOUVEAU N'EST COLLECTÉ — le contrôle qui protège la décision ══════════════
/* Si un jour quelqu'un « complétait » le signalement d'erreur avec l'identité, il ferait
   voyager des données personnelles sur une route publique et sans authentification. Ce
   contrôle-ci le verrait. */
{
  const rep = APP.slice(APP.indexOf('function rep(msg,src,line,stack)'), APP.indexOf('function rep(msg,src,line,stack)') + 1600);
  v('le rapporteur d’erreur existe toujours', rep.length > 400, true);
  v('⛔ il n’envoie toujours ni identifiant, ni nom, ni rôle',
    /login|prenom|\bnom\b|role/.test(rep.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  v('…et le serveur ne stocke toujours que les huit champs connus',
    /const entry = \{ ts: Date\.now\(\), team, app: [^}]*ua: String\(ua \|\| ''\)\.slice\(0, 150\) \};/.test(SRV), true);
}

// ══ 2) LA ROUTE DE CONTEXTE — ce qu'elle exige et ce qu'elle rend ════════════════════════
{
  const r = corps(SRV, "app.get('/api/monitor/issues/contexte'");
  v('la route existe', r.length > 600, true);
  v('⛔ elle est réservée aux comptes de la Tour', /app\.get\('\/api\/monitor\/issues\/contexte', monAdmin,/.test(SRV), true);
  /* Un compte OP MESSAGES ne doit pas apprendre qui travaillait chez un client OP GESTION :
     le même garde que les autres routes d'incident, pas un de moins. */
  v('⛔ et elle refuse un incident qui n’est pas de son application',
    /if \(monIssueRefuse\(req, res, issue\)\) return;/.test(r), true);
  v('un incident inconnu rend 404, pas un tableau vide',
    /if \(!issue\) return res\.status\(404\)/.test(r), true);

  v('⛔ la session retenue est la DERNIÈRE AVANT l’erreur',
    /const s0 = l\.find\(x => SESSION\.includes\(x\.ev\) && \(x\.ts \|\| 0\) <= quand\);/.test(r), true);
  v('…et l’écart voyage avec elle', /avantMs: quand - \(s0\.ts \|\| 0\)/.test(r), true);
  v('⛔ « connexion » et « session » comptent, pas un échec',
    /const SESSION = \['connexion', 'session'\];/.test(r), true);
  v('les échecs qui suivent sont bornés à une heure', /const APRES = 3600000;/.test(r), true);
  v('…et plafonnés', /apres\.slice\(0, MAX_SUITE\)\.map\(pub\)/.test(r), true);
  v('…les deux bornes sont nommées, pas semées', /const MAX_ENT = 12, MAX_SUITE = 5;/.test(r), true);
  v('le nombre d’entreprises croisées est borné', /\(issue\.entreprises \|\| \[\]\)\.slice\(0, MAX_ENT\)/.test(r), true);

  /* ⛔ LE PONT NOM → IDENTIFIANT TECHNIQUE. Un incident porte le NOM de l'entreprise, le
     journal des connexions est rangé par identifiant technique. Sans ce pont, la route rendrait
     « sansJournal » pour tout le monde et personne ne saurait pourquoi. */
  /* Le pont compare des SLUGS depuis la relecture du gardien : « ELAN » et « elan » sont la
     même entreprise, et les comparer à l'octet près rendait « pas de journal » pour l'une. */
  v('⛔ le pont nom → t est bien fait', /if \(cle\(e\.nom \|\| slug\) !== veut\) continue;/.test(r), true);
  v('…et une entreprise hors annuaire le DIT au lieu de disparaître', /sansJournal: true/.test(r), true);

  /* Ce que la route a le droit de rendre, champ par champ : une route de console qui renvoie
     l'objet brut finit par laisser passer un champ qu'on n'avait pas prévu. */
  const pub = r.slice(r.indexOf('const pub = x =>'), r.indexOf('const pub = x =>') + 420);
  v('⛔ la réponse est construite champ par champ, pas recopiée', pub.length > 200, true);
  for (const champ of ['login', 'nom', 'role', 'via', 'appareil', 'os', 'nav', 'pwa', 'version'])
    v('…elle porte ' + champ, new RegExp('\\b' + champ + ':').test(pub), true);
  v('⛔ et PAS l’identifiant d’appareil, qui ne dit rien à personne', /\bdev\b/.test(pub), false);
}

// ══ 3) LA TOUR : trois états, jamais deux ════════════════════════════════════════════════
{
  const c = corps(TOUR, 'function incCtxCharger(');
  v('le chargeur existe', c.length > 200, true);
  v('⛔ il ne redemande pas un dossier déjà demandé', /if\(!id \|\| INC\.ctx\[id\]\) return;/.test(c), true);
  v('…et pose l’état « en route » avant de partir', /INC\.ctx\[id\]=\{charge:true\};/.test(c), true);
  v('⛔ un échec pose une ERREUR, pas une liste vide', /INC\.ctx\[id\]=\{err:msgErreur\(e\)\}/.test(c), true);
  /* ⛔ Défaut trouvé PAR LA SONDE, pas par la lecture : le serveur rendait `total` et
     `rendues`, le chargeur ne les gardait pas, et l'avertissement de troncature ne
     s'affichait jamais. Les deux côtés avaient l'air justes séparément. */
  v('⛔ le chargeur garde le total, pas seulement la tranche',
    /total:d\.total\|\|0,rendues:\(d\.rendues!=null\?d\.rendues:\(d\.entreprises\|\|\[\]\)\.length\)/.test(c), true);

  const f = corps(TOUR, 'function vueIncident(');
  v('⛔ « on ne sait pas » se dit, et ne se confond pas avec « personne »',
    /Ce n’est pas « personne n’était connecté » : on ne sait pas/.test(f), true);
  v('« aucune session » a sa propre phrase', /Aucune session ouverte avant cette erreur dans le journal/.test(f), true);
  v('« hors annuaire » aussi', /ne correspond à aucune entreprise de l’annuaire : rien à relier/.test(f), true);
  v('…et « dans l’annuaire mais jamais connectée » est encore autre chose',
    /aucune connexion n’y a jamais été enregistrée/.test(f), true);
  v('…et l’attente aussi', /Recherche des sessions ouvertes au moment de l’erreur/.test(f), true);

  /* ⚠️ Les chaînes de tour.html sont en UTF-8 LITTÉRAL depuis la refonte, plus en \uXXXX.
     Une garde écrite avec les échappements passait au rouge sur du code juste — vu en
     rejouant ce lot sur la bonne branche. On vise le texte tel qu'il est écrit. */
  /* ⚠️ LA CARTE A CHANGÉ DE CONTENU, PAS DE RAISON D'ÊTRE. Le 15 septembre 2026 elle ne
     montrait qu'une DÉDUCTION — la dernière session ouverte avant l'horodatage — et Justin a
     demandé à voir la vraie personne. Elle porte donc maintenant le FAIT (`quiExact`, envoyé
     par l'application depuis la v683) AVANT la déduction. Ce test épinglait `carte('QUI ÉTAIT
     CONNECTÉ',quiHtml` : il est tombé alors que la carte s'était enrichie. On vérifie
     l'invariant — la carte existe, et les deux sources y sont — pas l'ordre des caractères. */
  v('⛔ la carte est dans le dossier', /carte\('QUI ÉTAIT CONNECTÉ',/.test(f), true);
  v('⛔ elle porte la déduction…', /quiHtml,/.test(f), true);
  v('⛔ …et le fait, quand l’application l’a dit', /carte\('QUI ÉTAIT CONNECTÉ',quiExact/.test(f), true);
  v('…et on ne peut pas confondre les deux', /Ce qui suit est une <b>déduction<\/b>/.test(f), true);

  /* Le chemin d'entrée traduit en français : « adresse » ou « identifiants » ne se lit pas
     dans une console qu'on ouvre à 7 h du matin. */
  v('les cinq chemins de connexion sont traduits',
    (TOUR.match(/CNX_VIA_L=\{adresse:[^}]*sms:[^}]*\}/g) || []).length, 1);
  const e = corps(TOUR, 'function incEcart(');
  v('l’écart se dit en français', /au même moment/.test(e) && /min avant/.test(e) && /h avant/.test(e) && /j avant/.test(e), true);
}


// ══ 4) CE QUE L'AGENT `gardien` A TROUVÉ, ET QUI EST RÉPARÉ ══════════════════════════════
/* Relecture du 13 septembre 2026 au soir. Rien de bloquant, mais quatre points importants —
   dont un qui rejouait, à la virgule près, une faute que ce dépôt a déjà payée. */
{
  const r = corps(SRV, "app.get('/api/monitor/issues/contexte'");

  /* ⛔ (1) « AUCUNE SESSION » NE SE DÉDUIT PAS D'UN JOURNAL PLEIN.
     cnxData est plafonné à 500 entrées par entreprise. Chez une cliente active, une erreur
     de trois jours en est déjà sortie : `find` rend undefined, et dire « personne n'était
     connecté » est alors un mensonge. C'est la faute du 11 septembre (« jamais connecté »
     déduit d'un journal plafonné, corrigée une heure après publication) rejouée à
     l'identique. Le cinquième état existe maintenant. */
  v('⛔ le journal plein est distingué du journal vide',
    /const horsJournal = !s0 && plein && plusVieux > quand;/.test(r), true);
  v('…et « plein » se mesure sur le plafond réel', /cnxData\[t\]\.length >= 500/.test(r), true);
  const f = corps(TOUR, 'function vueIncident(');
  /* Même leçon : la phrase peut être dans le fichier sans que la branche qui la choisit
     existe encore. On garde la BRANCHE, et la phrase avec. */
  v('⛔ …et l’écran a une branche pour le dire', /if\(x\.horsJournal\) +return dit\(/.test(f), true);
  v('…dont la phrase est juste', /ne remonte pas jusqu’à cette erreur/.test(f), true);
  v('…sans laisser croire que personne n’était là', /Ce n’est pas « personne n’était là » : on ne sait pas/.test(f), true);
  /* Les cinq états ont chacun leur branche : les compter empêche d'en perdre un en silence. */
  v('⛔ les cinq causes de « rien » ont chacune leur branche',
    (f.match(/if\(x\.(inconnue|sansJournal|sansDate|horsJournal)\)|if\(!x\.session\)/g) || []).length, 5);

  /* ⛔ (2+3) LE CLOISONNEMENT ENTRE LES DEUX TOURS, qui se corrige des DEUX côtés à la fois.
     La route n'était pas dans ROUTES_COMMUNES : un compte OP MESSAGES prenait un 403 sur un
     incident qui lui appartient. Mais l'ouvrir SEUL creusait une fuite — cnxData porte l'app
     de chaque événement, et sans filtre un compte MESSAGES aurait reçu les sessions
     OP GESTION des salariés. Les deux vont ensemble, et ce contrôle les tient ensemble. */
  v('⛔ la route est commune aux deux Tours',
    /issues\(\\\/\(archive\|contexte\)\)\?/.test(SRV), true);
  /* ⚠️ GARDER LA DÉFINITION NE GARDE RIEN. Première écriture de ce contrôle : il cherchait
     `const memeApp = …`. Une mutation qui retirait son EMPLOI (`cnxData[t].filter(memeApp)`
     → `cnxData[t]`) laissait la définition en place et passait au vert — la fuite exacte que
     le gardien avait signalée serait revenue sans que rien ne rougisse. On vise l'emploi. */
  v('⛔ …ET le journal est VRAIMENT filtré par application',
    /const l = cnxData\[t\]\.filter\(memeApp\);/.test(r), true);
  v('…sur la définition qui va avec', /const memeApp = x => \(x\.app \|\| 'gestion'\) === appIssue;/.test(r), true);
  v('…et le filtre est posé avant la recherche de session', r.indexOf('.filter(memeApp)') < r.indexOf('const s0 ='), true);

  /* ⛔ (4) UNE TRONCATURE MUETTE SE LIT COMME UN TOTAL. */
  v('⛔ le total voyage avec la tranche', /total: \(issue\.entreprises \|\| \[\]\)\.length, rendues: sortie\.length/.test(r), true);
  v('…et les échecs aussi', /suiteTotal: apres\.length/.test(r), true);
  v('…et l’écran annonce ce qu’il ne montre pas', /autre\(s\) entreprise\(s\) touchée\(s\) — non croisées ici/.test(f), true);

  /* (5) Sans horodatage, la fenêtre devient « epoch » et rend un vide indiscernable. */
  v('un incident sans date le dit', /sansDate: true/.test(r), true);
  /* (8) Deux causes distinctes ne se disent plus d'une seule voix. */
  v('⛔ « pas dans l’annuaire » et « pas de journal » sont deux états, pas un',
    /inconnue: true/.test(r) && /sansJournal: true/.test(r), true);
  v('…et l’appariement des noms est normalisé, pas à l’octet près',
    /const cle = n => espSlug\(String\(n \|\| ''\)\);/.test(r), true);
  /* (9) Le contexte ne se calcule pas sur un incident que la liste aurait purgé. */
  v('la purge est faite comme sur la liste', /monPurge\(\);/.test(r), true);

  /* (6) Le gardien a vérifié que `motif`, `nom` et `login` ne portent rien de secret — mais
     ils viennent d'une route SANS authentification, donc c'est du texte libre. Ils ne doivent
     jamais atteindre le DOM autrement qu'échappés. */
  v('⛔ tout champ libre passe par esc() dans la carte',
    /esc\(q\.nom\|\|q\.login\|\|'—'\)/.test(f) && /esc\(q\.login\)/.test(f) && /esc\(q\.role\)/.test(f), true);
  v('…et esc() échappe bien les cinq caractères', /replace\(\/\[&<>"'\]\/g/.test(TOUR), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
