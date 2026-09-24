/* ⛔ CE QUE CE FICHIER GARDE — UN CHEVRON PAR LIGNE, ET UN CHEVRON À DEUX CÔTÉS.

   Mesuré le 24 septembre 2026 dans la vraie page (bêta, iPhone 402 px), liste des box :
     · chaque ligne portait DEUX chevrons — un « › » écrit dans le gabarit, et celui que la refonte
       pose en CSS sur toute `.pl-row[onclick]` ;
     · et le chevron CSS lui-même avait TROIS côtés (haut, droite, bas). Deux règles visaient le
       MÊME `::after` : « LES LISTES DISENT QU'ELLES S'OUVRENT » pose le trait du HAUT (chevron
       absolu, à droite, là où rien n'occupe la droite), « Une ligne qui s'ouvre le DIT » celui du
       BAS (chevron en bout de ligne). Une propriété qui n'est pas en conflit ne s'écrase pas, elle
       s'AJOUTE — sur CHAQUE ligne cliquable de l'application.
   C'est « une moitié de règle survit à l'autre » (CLAUDE.md), par un chemin de plus. La parade :
   les deux règles se PARTAGENT les lignes (avec bouton / sans bouton) au lieu de se superposer.
   La preuve au pixel près vit dans `scratchpad/sonde-chevron.js` (bordures calculées). */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* Seuls les blocs qui COMMENCENT une ligne sont retirés (règle du dépôt : le motif naïf avale du code). */
const APP = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

console.log('\n══ 1. LES DEUX RÈGLES DU CHEVRON SE PARTAGENT LES LIGNES ══\n');
{
  /* Toutes les règles qui peignent le `::after` d'une ligne cliquable, par leur sélecteur. */
  const sels = [...APP.matchAll(/([^{}]*\.pl-row\[onclick\][^{}]*::after)\s*\{/g)].map(m => m[1].trim())
    .filter(s => !/:hover|:focus|:active/.test(s));
  vrai('   la population est là (au moins deux règles)', sels.length >= 2);
  const sansBouton = sels.filter(s => /:not\(:has\(\.btn\)\):not\(:has\(button\)\)::after/.test(s));
  const avecBouton = sels.filter(s => /:is\(:has\(\.btn\),:has\(button\)\)::after/.test(s));
  v('   une règle pour les lignes SANS bouton', sansBouton.length, 1);
  v('   une règle pour les lignes AVEC bouton', avecBouton.length, 1);
  /* ⛔ Et aucune troisième qui viserait TOUTES les lignes : c'est elle qui ajoutait son trait du
     bas au chevron de l'autre. */
  v('⛔⛔ aucune règle ne vise toutes les lignes à la fois', sels.filter(s => !sansBouton.includes(s) && !avecBouton.includes(s)), []);
}

console.log('\n══ 2. ⛔ PAS DE « › » ÉCRIT DANS UNE LIGNE QUI PORTE DÉJÀ CELUI DE LA FEUILLE ══\n');
{
  /* Recensement par LIGNE DE CODE : une ligne qui ouvre une `.pl-row` cliquable et écrit un « › ». */
  const lignes = BRUT.split('\n').map((l, i) => ({ l, n: i + 1 }))
    .filter(x => /class="pl-row[ "]/.test(x.l) && /onclick=/.test(x.l));
  vrai('   la population est là', lignes.length >= 5);
  v('⛔ aucune ligne cliquable n\'écrit son propre « › »', lignes.filter(x => />›</.test(x.l)).map(x => x.n), []);
  /* La liste des box écrit sa ligne sur plusieurs lignes de code : on la lit en entier. */
  const i = BRUT.indexOf('function boxLigneHtml(');
  const corps = i > 0 ? BRUT.slice(i, BRUT.indexOf('function renderBoxesList(', i)) : '';
  vrai('   la ligne de box est trouvée', corps.length > 200);
  v('⛔ la ligne de box non plus', />›<\/span>/.test(corps), false);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
