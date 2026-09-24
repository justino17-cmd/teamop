/* ⛔ beta.html EST LA GÉNÉRATION D'app.html — ET CE BANC EST LE SEUL ENDROIT OÙ ÇA SE COMPARE
   SUR LA BRANCHE (24 septembre 2026, à la demande de Justin : « corrige le contrôle »).

   L'étape « beta.html est bien la génération de app.html » de verification.yml ne tourne que sur
   `main` et les demandes de fusion. Or sur `main`, la bêta est EN AVANCE par construction : elle se
   publie seule depuis la branche de travail pendant que la production reste gelée (v744 contre
   v695 ce jour-là). Y régénérer fabriquerait une bêta plus vieille que celle qu'on publie —
   `beta-build.js` le refuse, et l'étape rougissait donc à CHAQUE poussée (runs 456 à 463 au moins).
   Corrigée le même jour pour s'arrêter en disant « en avance ». Mais la comparaison devait vivre
   quelque part, sinon « la génération se contrôle sur la branche » aurait été une phrase et pas une
   garde : elle vit ici, dans la suite complète que `ci.yml` lance à chaque poussée de la branche,
   là où les deux versions sont ÉGALES.

   Ce qui se joue : la même commande (`node beta-build.js <fichier temporaire>`, sans toucher à
   beta.html), puis une comparaison À L'OCTET. Une bêta retouchée à la main, ou pas régénérée après
   un changement d'app.html, fait tomber le banc.
   ⚠️ Sur `main` (bêta en avance), la génération n'a pas sa source : le banc le DIT, vérifie que la
   bêta n'est pas EN RETARD, et ne compare rien. */
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { lireApp, lireBeta, etatBeta } = require('../scripts/verifier-version.js');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

console.log('beta.html est la génération d’app.html');
const app = lireApp(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'));
const betaTxt = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
const beta = lireBeta(betaTxt);
vrai('les deux versions se lisent (app v' + app.n + ', bêta v' + beta.n + ')', !app.erreur && !beta.erreur);
const etat = etatBeta(app.n, beta.n);
vrai('⛔ la bêta n’est pas EN RETARD sur app.html (état : ' + etat + ')', etat === 'avance' || etat === 'egale');

if (etat === 'avance') {
  console.log('  · bêta v' + beta.n + ' EN AVANCE sur app.html v' + app.n + ' — publiée depuis la branche de travail, production gelée :'
    + ' la génération se compare sur la branche, où les deux versions sont égales');
} else if (etat === 'egale') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b804-'));
  const sortie = path.join(dir, 'beta.html');
  try {
    const r = cp.spawnSync(process.execPath, [path.join(RACINE, 'beta-build.js'), sortie], { cwd: RACINE, encoding: 'utf8' });
    v('beta-build.js génère sans refus (code 0)', r.status, 0);
    const neuf = fs.existsSync(sortie) ? fs.readFileSync(sortie, 'utf8') : '';
    /* La population d'abord : une génération vide serait « différente » pour une mauvaise raison,
       et une comparaison entre deux vides passerait pour de bonnes. */
    vrai('la bêta générée pèse plus d’un million de caractères et porte v' + beta.n + '-beta', neuf.length > 1e6 && lireBeta(neuf).n === beta.n);
    const pareil = neuf === betaTxt;
    v('⛔ beta.html est À L’OCTET la génération d’app.html', pareil, true);
    if (!pareil && neuf) {
      let i = 0; while (i < neuf.length && neuf[i] === betaTxt[i]) i++;
      const ligne = betaTxt.slice(0, i).split('\n').length;
      console.log('      première différence : ligne ' + ligne + ' de beta.html — retouchée à la main, ou app.html a changé sans « node beta-build.js »');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
