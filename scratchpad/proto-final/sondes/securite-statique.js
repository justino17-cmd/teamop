// GARDE de l'audit de sécurité (étape 7 sur 8, 17 novembre 2026), sans navigateur : ce qu'on lit dans les FICHIERS.
//   S10 · chaque page porte sa politique de contenu (meta) ET sa politique de référent, et la politique est la bonne (rien d'ouvert à « * » ni à https: en bloc) ;
//   S16 · chaque bibliothèque tierce chargée au vol porte son empreinte d'intégrité, et c'est la bonne (les six ont été recalculées sur les fichiers servis) ;
//   S18 · aucune feuille de polices tierce — SAUF celle du compositeur de documents (ses treize polices), exception décidée le 17 novembre 2026 ;
//   S17 · la coque mobile : sauvegarde automatique coupée, FileProvider borné, ?auto= fermé dans la coque ;
//   fabrication : prototype-documents.html FABRIQUÉE porte la même politique que ses voisines (jamais retouchée à la main).
// Chaque contrôle compte sa population : une page absente ou une politique vide ne passe pas.
// RACINE=<copie> rejoue la lecture sur une copie mutée. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..', '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const v = (nom, cond, detail) => { if (cond) { ok++; console.log('  ✓', nom); } else { ko++; console.log('  ✗', nom, detail === undefined ? '' : '→ ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 220)); } };
const PAGES = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html'];
const HOTES = new Set(['https://cdnjs.cloudflare.com', 'https://unpkg.com', 'https://tiles.openfreemap.org', 'https://server.arcgisonline.com']);
const politique = h => { const m = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(h); if (!m) return null; const o = {}; m[1].split(';').map(s => s.trim()).filter(Boolean).forEach(d => { const [k, ...r] = d.split(/\s+/); o[k] = r; }); return o; };
const pages = {}; PAGES.forEach(p => { pages[p] = lire('apercu/' + p); });
v('population : les quatre pages sont lues', PAGES.every(p => pages[p].length > 10000), PAGES.map(p => p + ' ' + pages[p].length));
// ── S10 ──
for (const p of PAGES) {
  const pol = politique(pages[p]);
  v('S10 ' + p + ' : porte une politique de contenu (balise)', !!pol);
  if (!pol) continue;
  v('S10 ' + p + ' : par défaut RIEN (default-src \'none\'), ni objet, ni base, ni formulaire', (pol['default-src'] || []).join() === "'none'" && (pol['object-src'] || []).join() === "'none'" && (pol['base-uri'] || []).join() === "'none'" && (pol['form-action'] || []).join() === "'none'", pol);
  const tout = Object.values(pol).flat();
  v('S10 ' + p + ' : aucun joker (*), aucun « https: » en bloc, aucun hôte hors de la liste connue (cdnjs, unpkg, deux serveurs de tuiles)', !tout.includes('*') && !tout.includes('https:') && !tout.includes('http:') && tout.filter(x => /^https?:\/\//.test(x)).every(x => HOTES.has(x) || (p === 'prototype-documents.html' && ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(x))), tout.filter(x => /^https?:\/\//.test(x) && !HOTES.has(x)));   /* le compositeur : ses deux hôtes de polices, exception décidée (voir plus bas) */
  v('S10 ' + p + ' : les données ne sortent que vers soi et les deux serveurs de tuiles (connect-src)', (pol['connect-src'] || []).every(x => ["'self'", 'blob:', 'https://tiles.openfreemap.org', 'https://server.arcgisonline.com'].includes(x)) && (pol['connect-src'] || []).length >= 1, pol['connect-src']);
  /* UNE exception, décidée par le chef de chantier le 17 novembre 2026 : le compositeur de documents garde ses treize polices (feuille de
     fonts.googleapis.com, fichiers de fonts.gstatic.com) — sans elles le choix d'une police ne change plus rien, sur un écran validé par Justin ;
     dans la vraie application elles se serviront depuis notre serveur (règle de S18). La garde tient donc l'état DÉCIDÉ : ces deux hôtes, pour
     cette page-là, et rien d'autre nulle part. */
  const POLICES = p === 'prototype-documents.html';
  v('S10 ' + p + (POLICES ? ' : les polices ne viennent que de soi et de fonts.gstatic.com, les feuilles de soi, de cdnjs et de fonts.googleapis.com (le compositeur, exception décidée)' : ' : les polices ne viennent que de soi (font-src), les feuilles de style de soi et de cdnjs'),
    (pol['font-src'] || []).every(x => ["'self'", 'data:'].concat(POLICES ? ['https://fonts.gstatic.com'] : []).includes(x))
    && (pol['style-src'] || []).filter(x => /googleapis|gstatic/.test(x)).join(' ') === (POLICES ? 'https://fonts.googleapis.com' : '')
    && (!POLICES || (pol['font-src'] || []).includes('https://fonts.gstatic.com')), [pol['font-src'], pol['style-src']]);
  v('S10 ' + p + ' : politique de référent « same-origin »', /<meta name="referrer" content="same-origin">/.test(pages[p]));
  const iMeta = pages[p].indexOf('Content-Security-Policy'), iScript = pages[p].search(/<script/i);
  v('S10 ' + p + ' : la politique est posée AVANT le premier script (sinon elle ne protège pas ce qui précède)', iMeta > 0 && iMeta < iScript, [iMeta, iScript]);
}
// ── S18 ──
for (const p of PAGES) { const nu = pages[p].replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ''), corps = nu.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
  if (p !== 'prototype-documents.html') v('S18 ' + p + ' : aucune feuille de polices ni de style chez Google', !/fonts\.(googleapis|gstatic)\.com/.test(nu));
  else v('S18 ' + p + ' : UNE seule feuille de polices tierce, celle du compositeur (exception décidée), et aucun autre appel à Google',
    (corps.match(/fonts\.googleapis\.com/g) || []).length === 1 && /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=/.test(corps) && !/fonts\.gstatic\.com/.test(corps) && !/@import[^;]*googleapis/.test(corps), (corps.match(/fonts\.(googleapis|gstatic)\.com/g) || []).length); }
const src = lire('scratchpad/proto-final/atelier/page.source'), fab = lire('scratchpad/proto-final/atelier/fabriquer.sh');
v('S18 page.source (la SOURCE de l\'atelier) : une seule feuille Google, celle des treize polices du compositeur (exception décidée le 17 novembre)', (src.replace(/<!--[\s\S]*?-->/g, '').match(/<link[^>]*fonts\.googleapis\.com/g) || []).length === 1);
/* la politique du compositeur = celle des voisines, PLUS ses deux hôtes de polices, et rien d'autre */
const sansPolices = pol => pol && Object.fromEntries(Object.entries(pol).map(([k, L]) => [k, L.filter(x => !['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(x))]));
v('fabrication : fabriquer.sh écrit la même politique que les pages voisines, plus les deux hôtes de polices du compositeur (une variable POLITIQUE, jamais de retouche à la main)', /POLITIQUE="[^"]*default-src 'none'/.test(fab) && /content="%s"/.test(fab) && politique(pages['prototype-documents.html']) && JSON.stringify(sansPolices(politique(pages['prototype-documents.html']))) === JSON.stringify(politique(pages['prototype-op-gestion.html'])), 'la politique de l\'atelier diffère de celle d\'OP GESTION autrement que par ses deux hôtes de polices');
// ── S16 : les empreintes, et la bonne ──
const SRI = { 'leaflet.min.css': 'sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb', 'leaflet.min.js': 'sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO',
  'maplibre-gl.min.css': 'sha384-K282sW/zFjTkrjR/+yr1H+gCukuy4OEYrkXRybV88g7pk+kZZYpNV6SAV59NcgFg', 'maplibre-gl.min.js': 'sha384-KKgyz2mG25bKJ1O2PyqTJPlAF8Kw2BpDmsLTNBXslICOBvhTAyF5F0XhLWF2ZovY',
  'leaflet-maplibre-gl.js': 'sha384-4CB9Vtol9LN6lGgBCvmPLbUEZwilrqIvPieSRurgAXAB7FVJaLS9n8WyAIA5wjQ+', 'html2canvas.min.js': 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H' };
const og = pages['prototype-op-gestion.html'];
for (const [nom, h] of Object.entries(SRI)) { const cherche = nom === 'html2canvas.min.js' ? src : og; v('S16 ' + nom + ' : l\'empreinte attendue est dans le code (' + (nom === 'html2canvas.min.js' ? 'atelier' : 'OP GESTION') + ')', cherche.includes(h)); }
v('S16 chaque adresse de bibliothèque tierce d\'OP GESTION (cinq) est chargée avec crossOrigin', (og.match(/https:\/\/(cdnjs\.cloudflare\.com|unpkg\.com)\/[^'"]+\.(js|css)/g) || []).length === 5 && (og.match(/crossOrigin = 'anonymous'/g) || []).length >= 4, (og.match(/crossOrigin = 'anonymous'/g) || []).length);
v('S16 le « suite » de la carte passe l\'empreinte à CHAQUE chargement (3 appels, 3 empreintes)', /const suite = \(src, test, puis, sri\)/.test(og) && /x\.integrity = sri/.test(og));
v('S16 html2canvas de l\'atelier : empreinte posée quand l\'adresse est celle de cdnjs (la copie locale des essais n\'en a pas)', /if\(src===H2C_CDN\)\{ s\.integrity=H2C_SRI/.test(src));
// ── S17 : la coque mobile ──
const man = lire('mobile/android/app/src/main/AndroidManifest.xml'), fp = lire('mobile/android/app/src/main/res/xml/file_paths.xml');
v('S17 Android : la sauvegarde automatique n\'emporte pas le rangement (allowBackup=false)', /android:allowBackup="false"/.test(man) && !/allowBackup="true"/.test(man));
const fpCode = fp.replace(/<!--[\s\S]*?-->/g, '');
v('S17 Android : le FileProvider ne désigne que le dossier « partage/ » du cache (jamais toute la mémoire externe)', /<cache-path[^>]*path="partage\/"/.test(fpCode) && !/<external-path/.test(fpCode) && !/path="\."/.test(fpCode), fpCode);
const m = /const secuAutoPermis = loc => \{[\s\S]*?includes\(loc\.hostname\); \};/.exec(og);
v('population : la garde de ?auto= est trouvée dans la page', !!m);
if (m) { const fn = w => new Function('window', m[0].replace(/^const secuAutoPermis = /, 'return ').replace(/;$/, ''))(w);
  const coque = fn({ OPG_MODE_APP: true }), sonde = fn({});
  const ios = { protocol: 'capacitor:', hostname: 'localhost' }, and = { protocol: 'https:', hostname: 'localhost' }, site = { protocol: 'https:', hostname: 'teamop.fr' };
  v('S17 dans la coque (window.OPG_MODE_APP), ?auto= est refusé : capacitor://localhost (iOS) et https://localhost (Android)', coque(ios) === false && coque(and) === false, [coque(ios), coque(and)]);
  v('S17 témoin : hors coque, ?auto= marche en local (les sondes en ont besoin) et reste refusé sur le site', sonde({ protocol: 'http:', hostname: '127.0.0.1' }) === true && sonde({ protocol: 'file:' }) === true && sonde(site) === false, [sonde({ protocol: 'http:', hostname: '127.0.0.1' }), sonde(site)]); }
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
