// Angle « ponts » · sonde 7 : LA COQUE MOBILE (mobile/) lue contre ce qu'elle embarque. Pas de navigateur : on fabrique le contenu (node mobile/fabriquer.js, qui écrit dans mobile/www,
// dossier jamais versionné), puis on lit le manifeste Android, l'Info.plist, la configuration Capacitor, le projet Xcode et les pages embarquées.
// Chaque contrôle dit CE QU'IL LIT ; un ✗ est un constat à corriger dans la coque (ou la règle à retenir pour la vraie application).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..', '..'), M = path.join(RACINE, 'mobile');   // RACINE=<copie> : la même lecture sur une copie corrigée (contre-épreuve)
let ok = 0, ko = 0; const echecs = [];
const v = (nom, cond, detail) => { if (cond) { ok++; console.log('  ✓', nom); } else { ko++; console.log('  ✗', nom, detail === undefined ? '' : '→ ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))); echecs.push(nom); } };
const lire = f => fs.readFileSync(path.join(M, f), 'utf8');
const sortie = cp.spawnSync('node', ['fabriquer.js'], { cwd: M, encoding: 'utf8' });
v('population : la coque se fabrique (mobile/www)', sortie.status === 0 && fs.existsSync(path.join(M, 'www', 'index.html')), sortie.stderr.slice(0, 200));
const index = fs.readFileSync(path.join(M, 'www', 'index.html'), 'utf8');
const cfg = JSON.parse(lire('capacitor.config.json')), man = lire('android/app/src/main/AndroidManifest.xml'), plist = lire('ios/App/App/Info.plist'), xcode = lire('ios/App/App.xcodeproj/project.pbxproj'), fp = lire('android/app/src/main/res/xml/file_paths.xml'), gradle = lire('android/app/build.gradle');
// ── configuration Capacitor ──
v('aucun serveur distant chargé dans la coque (pas de server.url : la page vient du paquet)', !(cfg.server && cfg.server.url), cfg.server);
v('aucune navigation autorisée vers d\'autres hôtes (pas de server.allowNavigation)', !(cfg.server && cfg.server.allowNavigation), cfg.server);
v('contenu mixte refusé sur Android (allowMixedContent false)', cfg.android && cfg.android.allowMixedContent === false, cfg.android);
v('pas de trafic en clair sur Android (usesCleartextTraffic absent ou false, aucune configuration réseau permissive)', !/usesCleartextTraffic="true"/.test(man) && !/networkSecurityConfig/.test(man), man.match(/usesCleartext[^ ]*/));
v('iOS : aucune exception de transport (NSAllowsArbitraryLoads / NSExceptionDomains absents)', !/NSAllowsArbitraryLoads|NSExceptionDomains/.test(plist));
const confs = [...xcode.matchAll(/\w+ \/\* (Debug|Release) \*\/ = \{\s*isa = XCBuildConfiguration;\s*(baseConfigurationReference = \w+ \/\* (\S+) \*\/;)?/g)].map(x => [x[1], x[3] || null]);
v('population : le projet Xcode compte deux configurations Release et deux Debug', confs.filter(x => x[0] === 'Release').length === 2 && confs.filter(x => x[0] === 'Debug').length === 2, confs);
v('débogage du navigateur intégré coupé en version diffusée : debug.xcconfig (CAPACITOR_DEBUG = true) n\'est lié à AUCUNE configuration Release', confs.filter(x => x[0] === 'Release').every(x => x[1] !== 'debug.xcconfig'), confs);
// ── sauvegarde par le système ──
v('Android : la sauvegarde automatique du système n\'emporte pas le rangement de l\'application (android:allowBackup="false" ou règles d\'extraction)', /android:allowBackup="false"/.test(man) || /dataExtractionRules|fullBackupContent/.test(man),
  'allowBackup="true" : le localStorage et IndexedDB de la WebView (documents, brouillons de courrier) partent dans la sauvegarde cloud du téléphone et se restaurent sur un autre appareil');
v('Android : le FileProvider ne partage pas toute la mémoire externe (external-path path="." = racine entière)', !/<external-path[^>]*path="\."/.test(fp), 'external-path path="." et cache-path path="." : tout le stockage externe est adressable par le fournisseur (non exporté, mais accordable par URI)');
v('Android : le code est obscurci en version diffusée (minifyEnabled true)', /minifyEnabled true/.test(gradle), 'minifyEnabled false (gabarit Capacitor) : le paquet se relit en clair');
// ── schéma d'adresse ──
const sd = lire('ios/App/App/SceneDelegate.swift');
v('iOS : le lien opgestion://e/<entreprise> ne laisse passer que lettres ASCII, chiffres et tirets avant d\'être écrit dans du JavaScript', /filter\s*\{[^}]*isASCII[^}]*isLetter[^}]*isNumber[^}]*\|\|\s*\$0 == "-"/.test(sd) && /count <= 60/.test(sd));
v('iOS : le pont de fenêtres (opgFenetre) ne lit que {a:\'titre\'|\'fenetre\'}, le titre est borné à 60 caractères', /prefix\(60\)/.test(sd) && /action == "titre"/.test(sd) && /action == "fenetre"/.test(sd));
v('Android : aucun filtre d\'intention hors le lancement (pas de lien profond ouvert au système)', (man.match(/<intent-filter>/g) || []).length === 1, (man.match(/<intent-filter>/g) || []).length);
// ── ce que la coque embarque ──
const m = /const secuAutoPermis = loc => \{[^\n]*\};/.exec(index);
v('population : la garde de ?auto= est dans la page embarquée', !!m);
if (m) { const fab = w => new Function('window', m[0].replace(/^const secuAutoPermis = /, 'return ').replace(/;$/, ''))(w);   // la page de la coque porte window.OPG_MODE_APP = true (posé par fabriquer.js) ; celle d'une sonde non
  const coque = fab({ OPG_MODE_APP: true }), sonde = fab({});
  const cas = { ios: { protocol: 'capacitor:', hostname: 'localhost' }, android: { protocol: 'https:', hostname: 'localhost' }, site: { protocol: 'https:', hostname: 'teamop.fr' } };
  const r = Object.fromEntries(Object.entries(cas).map(([k, l]) => [k, coque(l)]));
  v('population : hors coque la garde donne bien OUI en local et NON sur le site (témoin : les sondes en ont besoin)', sonde({ protocol: 'https:', hostname: 'teamop.fr' }) === false && sonde({ protocol: 'http:', hostname: '127.0.0.1' }) === true, r);
  v('?auto=<personne> (session SANS mot de passe ni téléphone) reste refusé dans la coque : capacitor://localhost (iOS) et https://localhost (Android)', r.ios === false && r.android === false, r); }
const distants = []; for (const f of ['index.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-courrier.js']) { const t = fs.readFileSync(path.join(M, 'www', f), 'utf8');
  for (const x of t.matchAll(/(?:s\.src|j\.src|\.src)\s*=\s*['"](https:\/\/[^'"]+\.js)['"]|suite\('(https:\/\/[^']+\.js)'|const H2C_CDN\s*=\s*'(https:[^']+)'/g)) distants.push(f + ' ← ' + (x[1] || x[2] || x[3])); }
console.log('  · scripts tiers chargés au vol :', distants.length, JSON.stringify(distants));
v('population : la coque charge des scripts tiers au vol (sinon le contrôle suivant ne prouve rien)', distants.length >= 3, distants.length);
const avecIntegrite = fs.readdirSync(path.join(M, 'www')).filter(f => /\.(html|js)$/.test(f)).some(f => /integrity\s*=|\.integrity\s*=/.test(fs.readFileSync(path.join(M, 'www', f), 'utf8')));
v('les scripts tiers chargés au vol (Leaflet, MapLibre, html2canvas) portent une empreinte d\'intégrité (SRI) ou sont embarqués dans la coque', avecIntegrite, 'aucun attribut integrity dans les pages embarquées : un CDN compromis exécuterait du code dans l\'origine de l\'application (et, dans la coque, avec accès au pont natif)');
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
