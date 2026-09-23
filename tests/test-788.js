/* ══ LE SCANNER LIT L'ÉTIQUETTE, PLUS LE CODE-BARRES — ET NE PROPOSE QUE CE QUI EST ENREGISTRÉ ══
   Justin, 23 septembre 2026 (capture du scanner à l'appui, réduit sur iPhone au champ « Référence
   produit ») : « que ça fasse un scan d'étiquette à la place des codes-barres, pour éviter les
   problèmes d'erreur ; vu que les noms sont renseignés dans Produits, ils pourront scanner, ajouter
   ou déduire ».

   Ce banc EXÉCUTE la correspondance réelle d'app.html (etiqCandidats, etiqChercher) sur le pack 3D
   — 160 fiches, dont des sœurs qui ne diffèrent que d'un mot ou d'un format (MAGNUM GEL CAFARDS /
   FOURMIS / OPTIMUM, DOBOL 20 g / 100 g, XILIX 1000 / 3000) — avec des lectures telles qu'un moteur
   les rend : lettres fausses, O pris pour 0, mots collés ou coupés, mentions légales autour. Puis il
   vérifie le câblage : plus de code-barres, et l'écriture passe par le chemin du « ± » de la box
   (validation du DR, « pour qui ? », bon de remise). Le geste complet, caméra et vrai moteur
   compris : `scratchpad/sonde-scanner.js`. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function dec(h) { const d = APP.indexOf(h); if (d < 0) return ''; for (let i = d; i < d + 20000; i++) { if (APP[i] !== '}' && APP[i] !== ';') continue; const b = APP.slice(d, i + 1); try { new Function(b); return b; } catch (e) { } } return ''; }
function cst(n) { const i = APP.indexOf('const ' + n + '='); if (i < 0) return ''; const fin = APP.indexOf('];', i); return APP.slice(i, fin + 2); }

console.log('\n── 788 · 0. la population ──');
const PIECES = { vides: dec('const ETIQ_VIDES='), mots: dec('function etiqMots(s){'), canon: dec('function etiqCanon(t){'), dist: dec('function etiqDist(a,b,max){'),
  proche: dec('function etiqProche(w,x){'), cand: dec('function etiqCandidats(texte,produits){'), cherche: dec('function etiqChercher(q,produits){') };
v('les fonctions de correspondance sont trouvées', Object.keys(PIECES).filter(k => !PIECES[k]), []);
for (const n of ['function etiqCandidats(', 'function etiqChercher(', 'function etiqAppliquerBox(', 'function openBoxScanner(', 'function openScanner(', 'function stopBoxScanCamera('])
  v('… une seule définition de ' + n.slice(9, -1), SRC.split(n).length - 1, 1);
const G = new Function(`const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
  ${cst('CATALOGUE')}
  ${cst('CATFOUR')}
  ${Object.values(PIECES).join('\n')}
  return { etiqCandidats, etiqChercher, etiqProche, CATALOGUE, CATFOUR };`)();
const CAT = G.CATALOGUE.map((c, i) => ({ id: 'p' + i, nom: c[0], ref: '' }))
  .concat([{ id: 'plb', nom: 'Plaque de bois', ref: 'PLB-001', perso: true }, { id: 'mib', nom: 'MIB 80', ref: '' }].filter(p => !G.CATALOGUE.some(c => c[0] === p.nom)));
vrai('population : le pack 3D (160 fiches) et deux fiches de l’entreprise', CAT.length >= 161, CAT.length);
const premier = t => { const c = G.etiqCandidats(t, CAT); return c.length ? c[0].p.nom : null; };
const noms = t => G.etiqCandidats(t, CAT).map(c => c.p.nom);

console.log('\n── 788 · 1. ⛔⛔ la bonne fiche, devant ses sœurs ──');
v('l’étiquette lue telle quelle, mentions autour', premier('INSECTICIDE GEL APPÂT MAGNUM GEL CAFARDS SERINGUE 40 G Tenir hors de portée des enfants'), 'MAGNUM GEL CAFARDS SERINGUE 40G');
v('⛔ lue avec des fautes (N pour M, O pour D, 1 pour I, O pour 0) : toujours CAFARDS, pas FOURMIS', premier('MAGNUN GEL CAFAROS SER1NGUE 4O G'), 'MAGNUM GEL CAFARDS SERINGUE 40G');
v('⛔ DOBOL 100 g : le 100 g devant le 20 g', premier('FUMIGATEUR INSECTICIDE DOBOL FUMIGATEUR PROFESSIONNEL 100 g Nocif en cas d’ingestion'), 'DOBOL FUMIGATEUR PROFESSIONNEL (100g)');
v('… et DOBOL 20 g : le 20 g devant le 100 g', premier('DOBOL FUMIGATEUR PROFESSIONNEL 20 g'), 'DOBOL FUMIGATEUR PROFESSIONNEL (20g)');
v('un O lu pour un 0 : « ALTA 7OOO »', premier('ALTA 7OOO'), 'ALTA 7000');
v('deux mots collés à la lecture : « MAGNUMGEL CAFARDS »', premier('MAGNUMGEL CAFARDS SERINGUE'), 'MAGNUM GEL CAFARDS SERINGUE 40G');
v('un mot coupé à la lecture : « ADVI ON GEL BLATTES 30 G »', premier('ADVI ON GEL BLATTES 30 G'), 'ADVION GEL BLATTES 30G');
/* ⚠️ les deux cas qui DÉCIDENT : sans eux, retirer « mot collé » ou « mot coupé » ne faisait rien
   tomber (les autres mots suffisaient à classer) — deux mutations passaient au vert */
v('⛔ un nom collé qui est TOUT le nom : « ALTA7000 »', premier('ALTA7000'), 'ALTA 7000');
v('⛔ le mot coupé qui départage deux sœurs : « FOUR MIS » → FOURMIS, pas CAFARDS', premier('MAGNUM GEL FOUR MIS SERINGUE 40 G'), 'MAGNUM GEL FOURMIS SERINGUE 40G');
v('la référence de l’entreprise lue sur l’étiquette', premier('Réf. PLB-001 — lot 44'), 'Plaque de bois');
v('un nom sans mot de quatre lettres (« MIB 80 ») se lit par ses deux mots', premier('MIB 80 traitement du bois'), 'MIB 80');

console.log('\n── 788 · 2. ⛔⛔ ce qui ne doit RIEN proposer ──');
v('⛔⛔ une étiquette qui n’est pas au catalogue', noms('ENTRETIEN SAVON NOIR À L’HUILE D’OLIVE Biodégradable 1 litre'), []);
v('⛔ des mots génériques seulement (« gel », « insecticide », « professionnel »)', noms('GEL INSECTICIDE POUR USAGE PROFESSIONNEL'), []);
v('⛔⛔ un nombre seul ne désigne personne (« 1000 » ne fait pas un XILIX 1000)', noms('Contenance 1000 ml'), []);
vrai('⛔ un nombre ne se lit pas « à un chiffre près » : l’étiquette 100 g ne propose pas XILIX 1000', !noms('DOBOL FUMIGATEUR PROFESSIONNEL 100 g').includes('XILIX 1000'), noms('DOBOL FUMIGATEUR PROFESSIONNEL 100 g'));
v('… ni « 20 » pour « 200 »', G.etiqProche('200', '20'), 0);
v('⛔ … ni « 100 » pour « 1000 », ni « 7001 » pour « 7000 » (une lettre près, oui ; un chiffre près, non)', [G.etiqProche('1000', '100'), G.etiqProche('7000', '7001'), G.etiqProche('cafards', 'cafaros') > 0], [0, 0, true]);
/* la RARETÉ : « pâte » que six fiches portent pèse moins que « placedex » qu'une seule porte — sans
   ce poids, une étiquette « VULCANO PÂTE » proposait PLACEDEX PÂTE (un mot sur deux lu) */
vrai('⛔ un mot courant ne suffit pas à désigner une fiche : « VULCANO PÂTE » ne propose pas PLACEDEX PÂTE', !noms('VULCANO PÂTE').includes('PLACEDEX PÂTE') && noms('VULCANO PÂTE')[0] === 'VULCANO PATE', noms('VULCANO PÂTE'));
v('un texte vide', noms(''), []);
v('⛔ jamais plus de six propositions', G.etiqCandidats('VULCANO SPECIAL', CAT).length <= 6, true);

console.log('\n── 788 · 3. ce qu’on TAPE se cherche comme une recherche ──');
const tape = q => G.etiqChercher(q, CAT).map(c => c.p.nom);
v('« magnum caf »', tape('magnum caf'), ['MAGNUM GEL CAFARDS SERINGUE 40G']);
v('« alta »', tape('alta'), ['ALTA 7000']);
v('la référence « plb »', tape('plb'), ['Plaque de bois']);
v('un long texte (collé par « Scanner le texte » de l’iPhone) se lit comme une étiquette', tape('INSECTICIDE GEL APPÂT MAGNUM GEL CAFARDS SERINGUE 40 G')[0], 'MAGNUM GEL CAFARDS SERINGUE 40G');
v('rien de ressemblant : rien', tape('zzqx'), []);

console.log('\n── 788 · 4. le coût, sur un gros catalogue ──');
{ const GROS = G.CATFOUR.map((x, i) => ({ id: 'f' + i, nom: x[0], ref: '' }));
  const lecture = 'INSECTICIDE GEL APPÂT MAGNUM GEL CAFARDS SERINGUE 40 G Tenir hors de portée des enfants Utilisez les biocides avec précaution Lot 2231 Numéro d’autorisation FR-2019-0042';
  G.etiqCandidats(lecture, GROS);   // chauffe
  const t0 = process.hrtime.bigint(); const r = G.etiqCandidats(lecture, GROS); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log('    ' + GROS.length + ' fiches, une lecture de ' + lecture.split(' ').length + ' mots : ' + ms.toFixed(1) + ' ms');
  vrai('population : 2 809 fiches', GROS.length === 2809);
  vrai('moins de 150 ms (un téléphone de terrain est trois à cinq fois plus lent)', ms < 150, ms); }

console.log('\n── 788 · 5. ⛔⛔ le câblage : plus de code-barres, et le chemin du « ± » de la box ──');
vrai('⛔ plus aucun BarcodeDetector dans le code', !/BarcodeDetector/.test(SRC));
vrai('… ni l’ancien scanner (boxScan, scanLookup, scanAdjust)', !/\bboxScan\b|boxScanSel|function scanLookup|function scanAdjust/.test(SRC));
const box = dec('function etiqAppliquerBox(){');
vrai('population : l’écriture dans la box est trouvée', box.length > 900, box.length);
vrai('⛔⛔ la quantité passe par boxSaisir (validation du DR, « pour qui ? », bon de remise)', /if\(!boxSaisir\(pid,ajout\?n:-n\)\) return;/.test(box));
vrai('⛔⛔ … et jamais par une écriture directe du stock', !/b\.stock\[[^\]]+\]\s*=/.test(box) && !/\.u\s*=/.test(box));
vrai('un produit absent de la box y entre comme par « Produits de la box » (garde d’identité par nom)', /boxPoserProduits\(b,\[p\.id\],\{\}\)/.test(box));
vrai('⛔ retirer un produit absent de la box ne sort rien', /if\(!pid\)\{ if\(!ajout\)\{ etiqSuivant\(/.test(box));
vrai('⛔ « pour qui ? » : la caméra est coupée AVANT que la fenêtre prenne sa place', /const pourQui=!ajout&&!lot&&!db\.bonsRemiseOff&&!boxDonneNom\(b\.id\);\s*if\(pourQui\) stopBoxScanCamera\(\);\s*if\(!boxSaisir/.test(box));
vrai('⛔ boxSaisir travaille sur la box AFFICHÉE : le scanner refuse d’écrire ailleurs', /if\(boxView!==b\.id\)\{ toast\(/.test(box));
const cat = dec('function etiqAppliquerCat(){');
vrai('le stock du catalogue : la trace dit ce qui a BOUGÉ (l’ancien scanner écrivait toujours 1)', /qte:Math\.abs\(reel\)/.test(cat) && !/qte:1\b/.test(cat));
vrai('⛔ le moteur de lecture est ÉPINGLÉ (5.1.1), jamais « la dernière »', /tesseract\.js@5\.1\.1\/dist\/tesseract\.min\.js/.test(SRC) && /tesseract\.js-core@5\.1\.1/.test(SRC) && !/tesseract\.js@5\//.test(SRC));
vrai('le Stock scanne dans une BOX (on la choisit), plus dans le stock du catalogue', /onclick="openScannerStock\(\)">Scanner<\/button>/.test(SRC) && !/setHeader\('Stock'[^\n]*openScanner\(\)/.test(SRC));
vrai('closeModal coupe toujours la caméra, et la mise à jour automatique la voit', /function closeModal\(force\)\{[^\n]*stopBoxScanCamera\(\);/.test(SRC) && /if\(typeof scanStream!=='undefined'&&scanStream\) return 'la caméra tourne';/.test(SRC));
const ouvre = dec('function etiqOuvrir(mode,boxId){');
vrai('l’écran ne parle plus de code-barres ni de « Référence produit »', ouvre.length > 500 && !/code-barres|Référence produit/i.test(ouvre));
vrai('sur iPhone, il dit que l’appareil sait lire aussi (« Scanner le texte »)', /Scanner le texte/.test(ouvre) && /etiqIos\(\)/.test(ouvre));

console.log('\n── 788 · 6. la mesure dans une vraie page existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-scanner.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-scanner.js existe', !!SONDE);
vrai('… elle fait lire le VRAI moteur (servi en local) sur une caméra simulée, flux neuf à chaque ouverture', /servir: \{ '\/ocr\/'/.test(SONDE) && /captureStream/.test(SONDE) && /getUserMedia=async\(\)=>\{/.test(SONDE));
vrai('… elle joue ajout, sœurs, inconnu, retrait (« pour qui ? »), technicien soumis au DR, Stock et Produits', ['GEL CAFARDS', '100 g', 'SAVON NOIR', 'pour qui', 'boxBrouillonLigne', 'openScannerStock', "openScanner()"].every(m => SONDE.includes(m)));
vrai('… sur la BÊTA, jamais sur app.html', !!SONDE && !/app\.html/.test(SONDE));

console.log(`\n════ test-788 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
