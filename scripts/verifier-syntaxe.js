/* Vérifie que chaque bloc <script> des pages livrées est du JavaScript analysable.
 *
 * Pourquoi ce fichier existe : le 3 septembre 2026, un commentaire « // » inséré au milieu
 * d'une instruction tenant sur une seule ligne a transformé la fin de cette ligne — dont une
 * accolade fermante — en commentaire. app.html a cessé d'être analysable et la page est restée
 * BLANCHE en production pour toutes les entreprises. Les tests de l'époque vérifiaient le
 * comportement de fonctions simulées ; aucun ne vérifiait que le fichier livré parsait encore.
 *
 * Usage : node scripts/verifier-syntaxe.js
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const pages = fs.readdirSync(RACINE).filter(f => f.endsWith('.html')).sort();
const BLOC = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
/* ⛔ UN BLOC DE DONNÉES N'EST PAS DU CODE. Le 27 septembre 2026, le site « Marine » (elan.html, opmessages.html) a
   porté les fiches de ses fonctions dans un <script type="application/json"> : passé à `new Function`, un objet JSON
   est une erreur de syntaxe, et la CI de main serait tombée au rouge sur des pages justes. Un bloc JSON se vérifie
   par JSON.parse — plus strict que `new Function`, qui aurait accepté un objet mal fermé dans une expression. */
const TYPE = /\stype\s*=\s*["']?([^"'\s>]+)/i;

let erreurs = 0, blocs = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
  let m, n = 0;
  while ((m = BLOC.exec(html))) {
    n++; blocs++;
    const type = ((TYPE.exec(m[1]) || [])[1] || '').toLowerCase(), code = m[2];
    if (/(^|[\/+])json$/.test(type) || type === 'importmap') {
      try { JSON.parse(code); } catch (e) {
        erreurs++;
        console.error('✗ ' + page + ' — bloc <script type="' + type + '"> n°' + n + ' (vers la ligne ' + html.slice(0, m.index).split('\n').length + ') : JSON illisible — ' + e.message);
      }
      continue;
    }
    try { new Function(code); }
    catch (e) {
      // « await » à la racine d'un module est légitime : on retente dans un contexte async
      try { new Function('return (async () => {' + code + '})'); }
      catch (e2) {
        erreurs++;
        const avant = html.slice(0, m.index).split('\n').length;
        console.error('✗ ' + page + ' — bloc <script> n°' + n + ' (vers la ligne ' + avant + ') : ' + e2.message);
      }
    }
  }
}
console.log((erreurs ? '✗' : '✓') + ' ' + pages.length + ' pages, ' + blocs + ' blocs <script> inline, ' + erreurs + ' en erreur');
process.exit(erreurs ? 1 : 0);
