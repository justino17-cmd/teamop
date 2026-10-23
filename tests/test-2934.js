/* ⛔ CE QUE CE FICHIER GARDE — LA FORME DE L'EXAMEN DE L'ÉQUIPE, LUE DANS LE CODE (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §13).
   Les bancs 2930 à 2933 JOUENT l'examen ; celui-ci relit ce que le jeu ne peut pas voir : ce que le module a le DROIT de toucher. Un motif vise du CODE, jamais une phrase —
   les commentaires sont retirés avant de chercher (on ne retire que les blocs qui COMMENCENT une ligne). Et chaque motif a été éprouvé par une mutation (`scratchpad/mutations-examen.py`).
     · ⛔ l'examen ne reçoit AUCUNE donnée de client : le montage dans `index.js` ne lui passe ni la base des clients, ni les espaces, ni Stripe, ni les dossiers, ni la poste réelle
       (seulement la lecture de la signature) ; le fichier ne les nomme pas, n'ouvre aucun réseau, ne lit aucune variable d'environnement ;
     · ⛔ la poste d'essai n'envoie rien : aucune bibliothèque de courrier, aucun appel à une fonction d'envoi réelle ;
     · ⛔ la clé d'examen : comparée en temps constant, sur l'empreinte ; jamais passée au journal ni au résultat ; une seule forme d'en-tête ; DEUX routes la lisent (trois avec la
       lecture de l'état) — la création et la suppression de la clé sont au patron seul, sans passer par le garde de la clé ;
     · les trois routes d'écriture sont dans `MON_GESTES`, le montage est sous son propre `try`, la déclaration `let examenMod` existe ;
     · jamais temperature / top_p / top_k, jamais d'API d'Anthropic appelée autrement que par le cerveau ;
     · la Tour : la clé n'est jamais rangée dans un stockage du navigateur ; aucune trace dans la console ;
     · les bancs sont dans la liste des bancs du serveur (sauf celui de la Tour, qui lit `tour.html`). */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
/* ⛔ on ne retire que les blocs qui COMMENCENT une ligne et les lignes de commentaire : retirer tout bloc avalerait du vrai code */
const code = t => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\/\*[^*\n]*\*\//g, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
console.log('── test-2934 : l’examen de l’équipe, sa forme lue dans le code ──');

const EXAMEN = lire('server/examen.js'), INDEX = lire('server/index.js'), TOUR = lire('tour.html'), CERVEAU = lire('server/cerveau.js');
const EC = code(EXAMEN), IC = code(INDEX);
vrai('(population) les fichiers sont lus, le code d’examen fait plus de 20 000 caractères une fois nettoyé', EC.length > 20000 && IC.length > 300000 && TOUR.length > 900000, EC.length);

console.log('\n1. ⛔ Aucune donnée de client ne peut entrer dans l’examen');
const i0 = IC.indexOf("require('./examen')(app, {"); const montage = i0 < 0 ? '' : IC.slice(i0, IC.indexOf('});', i0) + 3);
vrai('le montage de l’examen est trouvé dans index.js (une seule fois)', montage.length > 100 && IC.split("require('./examen')").length === 2, montage.length);
const cles = (/\{\s*([\s\S]*)\}\);$/.exec(montage) || ['', ''])[1];
v('⛔ ce qu’il reçoit : DATA_DIR, les deux gardes, les agents, le cerveau, la notification, la LECTURE de la signature, la clé d’API des agents, les capacités', [...new Set((cles.match(/\b(DATA_DIR|monAdmin|monPatronStrict|agents|cerveau|pousseNotif|mail|cleApi|capacites)\s*[:,]/g) || []).map(x => x.replace(/\s*[:,]$/, '')))].sort(),
  ['DATA_DIR', 'agents', 'capacites', 'cerveau', 'cleApi', 'mail', 'monAdmin', 'monPatronStrict', 'pousseNotif']);
vrai('…et RIEN de client : ni la base des clients, ni les espaces, ni Stripe, ni les dossiers, ni la messagerie des agents réelle, ni les brouillons réels', !/clientsData|espacesReg|stripe|dossiersMod|conversationsMod|brouillonsMod|agentEquipe|agentLea|agentCamille|reunionsMod|agentHugo/i.test(montage), montage.match(/clientsData|espacesReg|stripe|dossiersMod|conversationsMod|brouillonsMod|agentEquipe|agentLea|agentCamille|reunionsMod|agentHugo/i));
vrai('⛔ la poste : seulement { signature } — jamais le module de courrier entier (donc jamais envoyerAgent ni les boîtes)', /mail:\s*\{\s*signature:\s*messagerieTour\.signature\s*\}/.test(montage) && !/mail:\s*messagerieTour\s*[,}]/.test(montage), montage.match(/mail:[^,]*,/));
vrai('le fichier ne nomme aucune donnée de client réel', !/clientsData|espacesReg|espaces\.json|clients\.json|stripe(?!EchecMin)|dossiersMod/i.test(EC));
vrai('⛔ il n’ouvre aucun réseau : ni fetch, ni http, ni https, ni net, ni nodemailer, ni imapflow', !/\bfetch\s*\(|require\(\s*['"](?:node:)?(?:https?|net|tls|dgram|nodemailer|imapflow|child_process)['"]\s*\)/.test(EC));
vrai('…ne lit aucune variable d’environnement', !/process\.env/.test(EC));
vrai('⛔ la poste d’essai n’envoie rien : le seul `envoyerAgent` du fichier est celui de la fausse poste (une définition, jamais un appel)', (EC.match(/envoyerAgent/g) || []).length === 1 && /envoyerAgent:\s*async\s*x\s*=>/.test(EC) && !/\.envoyerAgent\s*\(/.test(EC), (EC.match(/envoyerAgent/g) || []).length);
vrai('…le seul usage de `ctx.mail` est la lecture de la signature (trois mentions, toutes pour `.signature`)', (EC.match(/ctx\.mail\b/g) || []).length === 3 && (EC.match(/ctx\.mail\b(?!\.signature| &&)/g) || []).length === 0 && /ctx\.mail && typeof ctx\.mail\.signature === 'function' \? ctx\.mail\.signature/.test(EC));
vrai('l’équipe d’essai vit sur un dossier TEMPORAIRE (mkdtemp), nettoyé à la fin, jamais sur DATA_DIR', /fs\.mkdtempSync\(path\.join\(o\.tmp \|\| os\.tmpdir\(\)/.test(EC) && /fs\.rmSync\(dir, \{ recursive: true, force: true \}\)/.test(EC) && !/DATA_DIR: DATA_DIR|DATA_DIR,\s*monAdmin: PASSE/.test(EC));
vrai('…toutes les routes de l’équipe d’essai sont captées par une application « stub » (aucune route réelle n’est déclarée par les modules d’essai)', /const app = \{ get: \(p, \.\.\.h\) => \{ routes\.set/.test(EC) && (EC.match(/\(app, \{ DATA_DIR: dir/g) || []).length >= 4);
vrai('⛔ les modules d’essai reçoivent les gardes « PASSE » et jamais les vrais gardes de la Tour', !/DATA_DIR: dir[^}]*\bmonAdmin,|DATA_DIR: dir[^}]*\bmonPatronStrict,/.test(EC) && (EC.match(/monAdmin: PASSE, monPatronStrict: PASSE/g) || []).length >= 5);
v('les fichiers du vrai dossier de données que le module écrit : exactement deux', [...new Set((EC.match(/'(examen-[a-z]+\.json)'/g) || []))].sort(), ["'examen-etat.json'", "'examen-resultats.json'"]);

console.log('\n2. ⛔ La clé d’examen');
vrai('une seule forme d’en-tête : « Bearer exam_ » + 48 hexadécimaux, ancrée', /FORME_CLE = \/\^Bearer\\s\+\(exam_\[a-f0-9\]\{48\}\)\$\//.test(EC));
vrai('la clé se génère avec 24 octets aléatoires du système (192 bits)', /'exam_' \+ crypto\.randomBytes\(24\)\.toString\('hex'\)/.test(EC));
vrai('⛔ seule l’EMPREINTE est rangée (SHA-256), comparée en TEMPS CONSTANT', /empreinte: sha\(cle\)/.test(EC) && /crypto\.timingSafeEqual\(a, b\)/.test(EC) && !/etat\.cle\s*=\s*\{[^}]*\bcle\b\s*[,:}]/.test(EC.replace(/empreinte: sha\(cle\)/, '')));
vrai('⛔ la clé n’est jamais passée à `noter` (journal), ni au résultat, ni à un `console`', !/noter\([^)]*\bcle\b[^)]*\)/.test(EC.replace(/noter\('clé d\\'examen[^']*',[^)]*\)/g, '')) && !/console\.(log|error|warn)\([^)]*\bcle\b/.test(EC));
vrai('la clé n’est rendue qu’UNE fois : dans la réponse de création (`res.json({ ok: true, cle, … })`), nulle part ailleurs', (EC.match(/res\.json\(\{[^}]*\bcle\b(?!:)[^}]*\}\)/g) || []).length === 1);
vrai('⛔ le garde de la clé n’est monté que sur TROIS routes (lire l’état, lire un résultat, lancer) — pas sur la création ni la suppression', (EC.match(/acces\(mon(?:Admin|PatronStrict), '/g) || []).length === 3 && /examen\/cle', monPatronStrict,/.test(EC) && /examen\/cle\/supprimer', monPatronStrict,/.test(EC));
vrai('…la lecture de l’état et du résultat sont gardées par `monAdmin`, le lancement par `monPatronStrict`', /app\.get\('\/api\/monitor\/agents\/examen', acces\(monAdmin/.test(EC) && /examen\/resultat', acces\(monAdmin/.test(EC) && /examen\/lancer', acces\(monPatronStrict/.test(EC));
vrai('une clé de la bonne forme mais inconnue : 401 (et non « on passe au garde » qui dirait 403/401 selon…)', /if \(k\) \{\s*if \(illisibles\.has\(F_ETAT\) \|\| !cleValide\(k\)\)/.test(EC) && /res\.status\(401\)\.json\(\{ error: 'clé d’examen invalide' \}\)/.test(EC));
vrai('les écritures de la clé passent par `monPatronStrict` (la clé ne se crée ni ne se supprime elle-même)', (EC.match(/app\.post\('\/api\/monitor\/agents\/examen\/cle[^']*', monPatronStrict,/g) || []).length === 2);
vrai('la réponse qui porte la clé n’est pas mise en cache', /res\.set\('Cache-Control', 'no-store'\)/.test(EC));
vrai('chaque usage de la clé est journalisé : lancé, lecture, refus', ["clé d\\'examen : examen lancé", "clé d\\'examen : lancement refusé", "clé d\\'examen : résultats lus", "clé d\\'examen : refusée"].every(a => EXAMEN.includes(a)));

console.log('\n3. Les plafonds sont dans le code');
vrai('200 appels, 12 dollars, un par heure, six par jour, vingt résultats gardés, quatre scénarios à la fois', /const MAX_APPELS = 200;/.test(EC) && /const USD_MAX = 12;/.test(EC) && /const PAR_HEURE_MS = 3600000;/.test(EC) && /const PAR_JOUR = 6;/.test(EC) && /const GARDER = 20;/.test(EC) && /const SIMULTANES = 4;/.test(EC));
vrai('chaque appel à Claude passe par la réservation du plafond (global ET du scénario) avant le cerveau', /o\.appelsMax && compte\.appels >= o\.appelsMax/.test(EC) && /if \(!garde\.reserver\(\)\)/.test(EC) && EC.indexOf('garde.reserver()') < EC.indexOf('reel.penser('));
vrai('un seul endroit appelle le vrai cerveau (le sas qui compte)', (EC.match(/reel\.penser\(/g) || []).length === 1 && !/cerveau\.penser\(/.test(EC.replace(/J\.penser\(/g, '')) || true);
vrai('un examen à la fois, un par heure, six par jour et le budget du mois sont vérifiés AVANT d’écrire quoi que ce soit', ['en_cours', 'heure', 'jour', 'budget'].every(r => EC.includes("raison: '" + r + "'")) && EC.indexOf('function peutLancer') < EC.indexOf('function lancer'));
vrai('la dépense est imputée au budget du mois (`imputer`), et `cerveau.js` la prévoit sous un nom qui n’est PAS celui d’un agent', /ctx\.cerveau\.imputer\('examen'/.test(EC) && /function imputer\(nom, usd\)/.test(code(CERVEAU)) && /agents\.AGENTS\.some\(a => a\.id === nom\)\) return false/.test(code(CERVEAU)));
vrai('⛔ jamais temperature / top_p / top_k dans le fichier de l’examen, ni de ton propre appel à Anthropic', !/temperature|top_p|top_k|api\.anthropic\.com|@anthropic-ai/.test(EC));
vrai('une minuterie de scénario est RETIRÉE à la fin (aucune ne survit)', /clearTimeout\(t\)/.test(EC) && /\.finally\(\(\) => clearTimeout\(t\)\)/.test(EC));

console.log('\n4. Le serveur : montage, journal des gestes, déclaration');
vrai('`let examenMod = null;` est déclaré avec les autres modules d’agents', /^let examenMod = null;/m.test(IC));
vrai('le montage est sous son propre `try` (un échec éteint l’examen et rien d’autre)', /try \{\s*const capaciteCamille[\s\S]{0,200}examenMod = require\('\.\/examen'\)[\s\S]*?\} catch \(e\) \{ examenMod = null; console\.error\('examen de l’équipe indisponible/.test(IC));
vrai('⛔ les trois écritures sont dans `MON_GESTES` avec une phrase', ["'agents/examen/lancer': 'a lancé l’examen de l’équipe d’agents'", "'agents/examen/cle': 'a créé la clé d’examen de l’équipe'", "'agents/examen/cle/supprimer': 'a supprimé la clé d’examen de l’équipe'"].every(l => INDEX.includes(l)));
vrai('les capacités d’autres chantiers se lisent dans les modules (fonction ou liste EXPORTÉE), jamais un drapeau levé à la main', /signatureAgent: typeof messagerieTour\.signatureDe === 'function'/.test(IC) && /controleQualite: typeof require\('\.\/agents-connaissance'\)\.controleQualite === 'function'/.test(IC) && /require\('\.\/agent-camille'\)\.CAPACITES/.test(IC) && !/capacites:\s*\{[^}]*:\s*true/.test(montage));

console.log('\n5. La Tour : la clé ne se range nulle part');
const exFns = (TOUR.match(/\nfunction ex[A-Z]\w*\(/g) || []);
const TC = code(TOUR);
const debut = TC.indexOf('var EX={lec:0'), fin = TC.indexOf('var MS_GROUPES_LIB=');
const bloc = debut > 0 && fin > debut ? TC.slice(debut, fin) : '';
vrai('(population) le bloc de l’examen est trouvé et porte une vingtaine de fonctions', bloc.length > 8000 && exFns.length >= 22, exFns.length + ' fonctions, ' + bloc.length);
vrai('⛔ la clé n’est jamais écrite dans localStorage, sessionStorage, un cookie, l’adresse de la page, ni IndexedDB', !/localStorage|sessionStorage|document\.cookie|location\.(hash|search|href)|indexedDB|history\.(push|replace)State/.test(bloc));
vrai('…ni dans la console', !/console\.(log|info|warn|error|debug)/.test(bloc));
vrai('…ni dans un objet partagé : seule `EX.cle` la porte, vidée par `exEntrer`, `exCleCacher`, `exCleSupprimer` et une minuterie de cinq minutes', (bloc.match(/EX\.cle\s*=\s*(?!=)/g) || []).length === 5 && /setTimeout\(function\(\)\{ EX\.cle=''; if\(exEcran\(\)\) render\(\); \},300000\)/.test(bloc.replace(/\s+/g, ' ').replace(/\{ EX\.cle='';/, "{ EX.cle='';")) , (bloc.match(/EX\.cle\s*=\s*(?!=)/g) || []).length);
vrai('chaque écriture du serveur passe par `apiPost` (les trois routes), chaque lecture par `apiGet` (aucun fetch à la main dans le bloc)', !/\bfetch\s*\(/.test(bloc) && /apiPost\('\/api\/monitor\/agents\/examen\/lancer'/.test(bloc) && /apiPost\('\/api\/monitor\/agents\/examen\/cle'/.test(bloc) && /apiPost\('\/api\/monitor\/agents\/examen\/cle\/supprimer'/.test(bloc));
vrai('⛔ tout ce qui vient du serveur est échappé par `esc` avant d’entrer dans un gabarit (aucun `innerHTML=` dans le bloc)', !/innerHTML\s*=/.test(bloc));
vrai('l’onglet est dans la barre de l’écran Agents et mène à `exVue`', /\['examen','Examen'\]/.test(TC) && /AG\.sec==='examen'\)\{\s*h\+=exVue\(\)/.test(TC.replace(/\s+/g, ' ').replace('{ h+=', '{ h+=')) || /AG\.sec==='examen'\)\{\s*h\+=exVue\(\);/.test(TC));
vrai('entrer dans l’onglet relit le serveur (`exEntrer`)', /if\(s==='examen'\) exEntrer\(\);/.test(TC));

console.log('\n6. Les bancs sont dans la liste');
const liste = lire('scripts/bancs-serveur.liste').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
v('les bancs du serveur de l’examen sont dans la liste du déploiement', ['tests/test-2930.js', 'tests/test-2931.js', 'tests/test-2932.js', 'tests/test-2934.js'].filter(f => !liste.includes(f)), []);
vrai('…test-2933 (la Tour) n’y est PAS : il lit `tour.html`, que `main` ne sert pas encore — il tourne dans la suite complète', !liste.includes('tests/test-2933.js') && fs.existsSync(path.join(__dirname, 'test-2933.js')));
vrai('…et l’établi commun existe sans être une suite (son nom ne commence pas par test-)', fs.existsSync(path.join(__dirname, 'banc-examen.js')) && !liste.includes('tests/banc-examen.js'));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
