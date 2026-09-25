/* ══ LA SYNCHRO D'ELAN ÉTAIT ARRÊTÉE POUR 1,1 Ko ══════════════════════════════════════════
   Export réel d'ELAN, 15 septembre 2026 : base 621,1 Ko pour 620,0 Ko permis. Un dépassement
   de 1,1 Ko, et toute l'entreprise à l'arrêt — plus une seule écriture, les box et les stocks
   divergeant en silence d'un téléphone à l'autre.

   Et syncAlleger n'avait RIEN à retirer : le poids n'est pas dans les pièces jointes (zéro
   retirée) mais dans le contenu — box 195 Ko, mouvements 156 Ko, journal 104 Ko. Elle
   abandonnait donc, et personne n'écrivait plus.

   ⛔ CE QU'ON COUPE ET CE QU'ON NE COUPE PAS. Les journaux d'ACTIVITÉ, et seulement eux, et
   seulement dans la COPIE POUSSÉE. Jamais les mouvements — registre biocide, dossier
   sanitaire — ni les box, ni rien qui décrive le travail : ceux-là ne s'amputent pas pour
   faire tenir un document, ça se règle par la compression.
   La fusion étant une UNION par identifiant, une copie poussée plus courte ne retire rien à
   personne : chaque appareil garde son propre journal.

   MESURÉ sur l'export réel (scratchpad/preuve-alleger.js), avec la fonction EXTRAITE du
   fichier livré : 621,1 Ko → 570,8 Ko, 237 lignes de journal non poussées, et mouvements,
   box, produits, comptes, registres intacts. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 690 · la copie poussée raccourcit les journaux, et RIEN d\'autre ──');

/* La vraie fonction, extraite du fichier livré — la recopier ne prouverait rien. */
const d = APP.indexOf('function syncAlleger(base, budget){');
v('syncAlleger est trouvée dans app.html', d > 0, true);
let n = 0, f = d;
for (let i = APP.indexOf('{', d); i < APP.length; i++) {
  if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) { f = i; break; } } }
const BUDGET = 620 * 1024;
/* ⛔ ET SA DÉPENDANCE, depuis le point 4 de l'étape 0 : `syncAlleger` sort d'abord les pièces
   déjà déposées sur le VPS. Sans elle, le banc plante au lieu de mesurer. */
const dsp = APP.indexOf('function syncSortirPieces(base){');
v('syncSortirPieces est trouvée dans app.html', dsp > 0, true);
let nsp = 0, fsp = dsp;
for (let i = APP.indexOf('{', dsp); i < APP.length; i++) {
  if (APP[i] === '{') nsp++; else if (APP[i] === '}') { nsp--; if (!nsp) { fsp = i; break; } } }
/* v749 : et la liste des journaux qu'elle coupe, lue dans syncJournaux (une seule liste, que la
   réception écarte aussi de sa décision de renvoi). */
const dj = APP.indexOf('function syncJournaux(){');
v('syncJournaux est trouvée dans app.html', dj > 0, true);
const fj = APP.indexOf('}', dj);
const syncAlleger = new Function('NUAGE_BUDGET', 'TextEncoder', APP.slice(dj, fj + 1) + '\n' + APP.slice(dsp, fsp + 1) + '\n' + APP.slice(d, f + 1) + '; return syncAlleger;')(BUDGET, TextEncoder);

/* Une base fabriquée à l'image de celle d'ELAN : le poids est du CONTENU, pas des pièces. */
const gros = (k, nb, taille) => Array.from({ length: nb }, (_, i) =>
  ({ id: k + i, ts: 1757000000000 + i * 1000, texte: 'x'.repeat(taille) }));
/* ⚠️ LA BASE D'ESSAI DOIT VRAIMENT DÉPASSER, sinon syncAlleger sort avant d'agir et le banc
   vérifie qu'il ne se passe rien — ce qui passe au vert pour la mauvaise raison. Taillée à
   l'image de celle d'ELAN : le poids est dans les box et les mouvements, le journal pèse
   assez pour que le raccourcir suffise. */
const base = { journal: gros('j', 700, 220), mouvements: gros('m', 500, 300),
  boxes: gros('b', 17, 18000), produits: gros('p', 170, 250), users: gros('u', 32, 1500) };
const avant = Buffer.byteLength(JSON.stringify(base), 'utf8');
v('la base d\'essai dépasse bien le budget', avant > BUDGET, true);

const r = syncAlleger(base);
v('⛔ la copie poussée passe sous le budget', r.impossible, false);
v('… et elle est réellement plus légère', r.taille < avant, true);
v('des lignes de journal ont été écartées', (r.journalCoupe || 0) > 0, true);
/* ⛔ LE CONTRÔLE QUI COMPTE : rien d'autre n'est amputé. */
v('⛔ les mouvements sont INTACTS (registre biocide)', r.copie.mouvements.length, base.mouvements.length);
v('⛔ les box sont intactes', r.copie.boxes.length, base.boxes.length);
v('⛔ les produits sont intacts', r.copie.produits.length, base.produits.length);
v('⛔ les comptes sont intacts', r.copie.users.length, base.users.length);
/* ⛔ ET LA BASE LOCALE N'EST JAMAIS TOUCHÉE : c'est la copie POUSSÉE qu'on allège. */
v('⛔ la base locale garde tout son journal', base.journal.length, 700);
v('… et la copie en garde moins', r.copie.journal.length < 700, true);
/* On ne descend jamais sous un plancher : un journal vide ne dit plus rien à personne. */
v('un plancher de 50 lignes est tenu', r.copie.journal.length >= 50, true);
/* Les plus récentes d'abord : ce qu'on coupe est ce qu'on regarde le moins. */
v('⛔ ce sont les PLUS ANCIENNES qui partent',
  r.copie.journal[0].ts >= r.copie.journal[r.copie.journal.length - 1].ts, true);

/* Une base qui tient déjà ne doit rien perdre du tout. */
const petite = { journal: gros('j', 80, 100), mouvements: gros('m', 10, 100) };
const r2 = syncAlleger(petite);
v('⛔ une base qui tient n\'est jamais raccourcie', r2.copie.journal.length, 80);
v('… et elle se déclare intacte', [r2.retirees, r2.journalCoupe || 0], [0, 0]);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
