/* ⛔ CE QUE CE FICHIER GARDE — L'APPLICATION XCODE DU PROTOTYPE D'OP MESSAGES EMBARQUE LA PAGE DU PROTOTYPE, PAS UNE COPIE QUI A VIEILLI (13 novembre 2026).

   Justin : « prépare tout pour Xcode, pour que je puisse tester en application sur Mac et iPhone ». `apple/OPMessages/` est un projet à une cible
   (iPhone, iPad, Mac) dont la vue web ouvre `OPMessages/Web/index.html`. Cette page est FABRIQUÉE par `apple/OPMessages/synchroniser.js` depuis
   `apercu/prototype-op-messages.html`, le module de courrier mis en ligne. Sans garde, on corrige le prototype et l'application montre l'ancien —
   la règle du dépôt sur les aperçus (« un aperçu plus vieux que la page qu'il double est pire que pas d'aperçu »).
   Ce banc REJOUE la fabrication et compare ; il relit aussi le fichier de projet avec les contrôles de `fabriquer-projet.py` quand Python est là.
   ⚠️ Il ne compile rien : Xcode n'existe pas dans une session Linux (voir apple/OPMessages/LISEZMOI.md). */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const R = path.join(__dirname, '..'), A = path.join(R, 'apple', 'OPMessages');
let ok = 0, ko = 0;
const vrai = (m, c, d) => { if (c) { ok++; console.log('  ✓ ' + m); } else { ko++; console.log('  ✗ ' + m + (d === undefined ? '' : ' — ' + String(d).slice(0, 240))); } };

const { fabriquer, SORTIE } = require(path.join(A, 'synchroniser.js'));
const attendu = fabriquer(), embarque = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
vrai('(population) la page embarquée existe et pèse son poids (le prototype et le module de courrier)', embarque.length > 400000, embarque.length);
vrai('⛔ la page embarquée est EXACTEMENT celle que fabrique synchroniser.js aujourd\'hui (sinon : node apple/OPMessages/synchroniser.js)', embarque === attendu,
  embarque.length + ' caractères contre ' + attendu.length);
vrai('⛔ elle tient en UN fichier : aucun script ni feuille chargés à côté d\'elle', !/<script[^>]+\bsrc=/.test(embarque) && !/<link[^>]+rel=["']?stylesheet/.test(embarque));
vrai('elle porte le module de courrier en ligne et dit qu\'elle est fabriquée', /OPCourrier\.monter|window\.OPCourrier\s*=/.test(embarque) && /FABRIQUÉ par apple\/OPMessages\/synchroniser\.js/.test(embarque));
vrai('elle s\'étend sous l\'encoche (viewport-fit=cover) : c\'est la page qui s\'écarte des bords', /viewport-fit=cover/.test(embarque));

const swift = ['OPMessagesApp.swift', 'VueWeb.swift'].map(f => fs.readFileSync(path.join(A, 'OPMessages', f), 'utf8'));
const code = swift.join('\n').replace(/^\s*\/\/.*$/gm, '');
vrai('l\'application ouvre le fichier embarqué (index.html du paquet), jamais une adresse du réseau', /Bundle\.main\.url\(forResource: "index", withExtension: "html"\)/.test(code) && /loadFileURL\(/.test(code) && !/URL\(string: "https?:/.test(code));
vrai('⛔ un lien vers l\'extérieur ne remplace pas le prototype : la navigation hors fichier est annulée et ouverte dehors', /decisionHandler\(\.cancel\)/.test(code) && /ouvrirDehors\(adresse\)/.test(code) && /adresse\.isFileURL/.test(code));
vrai('une seule cible pour iPhone, iPad et Mac', /SUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx";/.test(fs.readFileSync(path.join(A, 'OPMessages.xcodeproj', 'project.pbxproj'), 'utf8')));

const icones = JSON.parse(fs.readFileSync(path.join(A, 'OPMessages', 'Assets.xcassets', 'AppIcon.appiconset', 'Contents.json'), 'utf8')).images;
vrai('chaque image d\'icône déclarée existe (iPhone : 1024 px ; Mac : dix tailles)', icones.length === 11 && icones.every(i => fs.existsSync(path.join(A, 'OPMessages', 'Assets.xcassets', 'AppIcon.appiconset', i.filename))),
  icones.filter(i => !fs.existsSync(path.join(A, 'OPMessages', 'Assets.xcassets', 'AppIcon.appiconset', i.filename))).map(i => i.filename).join(' '));

const py = spawnSync('python3', [path.join(A, 'fabriquer-projet.py'), '--verifier'], { encoding: 'utf8' });
if (py.error) console.log('  (python3 absent : le fichier de projet n\'est pas recontrôlé ici)');
else vrai('⛔ le fichier de projet est celui que fabrique fabriquer-projet.py, et passe ses contrôles (accolades, références)', py.status === 0, (py.stdout + py.stderr).trim());

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
