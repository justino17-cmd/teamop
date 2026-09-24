/* ══ LE THÈME FINAL, CE QUE LA MAQUETTE NE DIT PAS ═══════════════════════════════════════════
   `test-759` compare le document de Justin au code, jeton par jeton. Ce banc-ci garde ce que la
   maquette ne peut pas dire parce qu'elle est une IMAGE : ce qui se passe quand un écran de
   l'application s'écrit, et ce qu'on a trouvé en le regardant au navigateur.

   ⛔ LA FEUILLE « CRÉER » PARLE LA MÊME LANGUE QUE LE MENU. Mesuré le 24 septembre 2026, capture
   de la feuille jour et nuit : dans un menu tout en traits, ses six tuiles restaient en ÉMOJIS —
   `#creer` est une sœur de `.main`, posée sur <body>, et le module des icônes ne balayait que
   `#content`, `#overlay`, `#nav`… Et deux tuiles avaient un autre signe que leur rubrique
   (📦 pour « Box » quand le menu écrit 🧱, 📥 pour « Demande » quand il écrit ✈️) : changés en
   traits, ils auraient donné DEUX dessins pour une même chose. On EXÉCUTE `creerIc` contre le
   vrai NAV, et on exige la feuille dans les deux listes du module (le balayage ET l'observateur :
   l'un sans l'autre ne voit qu'une ouverture sur deux). La preuve au navigateur :
   `scratchpad/tf/q-creer2.js` — six traits sur six, relevés AVANT l'observateur. */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
/* nettoyage SÛR (blocs qui commencent une ligne) : un motif ne doit jamais viser un commentaire */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (lib, c, det) => { if (c) { ok++; console.log('  ✓ ' + lib); } else { ko++; console.log('  ✗ ' + lib + (det !== undefined ? '  → ' + det : '')); } };

console.log('\n── 1. La feuille « Créer » prend le signe de sa rubrique au menu');
{
  /* le vrai NAV : on l'évalue tel qu'il est écrit (ses fonctions ne sont pas appelées) */
  const i0 = NU.indexOf('const NAV = ['), i1 = NU.indexOf('\n];', i0);
  vrai('le menu est trouvé', i0 > 0 && i1 > i0, i0 + '..' + i1);
  const NAV = new Function('return ' + NU.slice(i0 + 'const NAV = '.length, i1 + 2))();
  const items = NAV.flatMap(s => s.items || []);
  vrai('… et il porte des rubriques (population)', items.length > 30, items.length);
  const e0 = NU.indexOf('const CREER_ENTREES=['), e1 = NU.indexOf('\n];', e0);
  vrai('la liste de la feuille est trouvée', e0 > 0 && e1 > e0);
  const CREER = new Function('canCat', 'boxGerer', 'return ' + NU.slice(e0 + 'const CREER_ENTREES='.length, e1 + 2))(() => true, () => true);
  vrai('… et elle porte ses six créations', CREER.length === 6, CREER.length);
  const fc = (NU.match(/function creerIc\(e\)\{[^\n]*\n/) || [''])[0];
  vrai('creerIc existe', fc.length > 40);
  const creerIc = new Function('NAV', fc + '\nreturn creerIc;')(NAV);
  for (const e of CREER) {
    const it = items.find(x => x.k === e.k);
    vrai('« ' + e.l + ' » a le signe de « ' + (it ? it.l : '?') + ' » au menu', it && creerIc(e) === it.ic, it ? creerIc(e) + ' / ' + it.ic : 'rubrique absente');
  }
  /* ⛔ et la tuile L'ÉCRIT : une fonction juste que personne n'appelle ne change rien à l'écran */
  vrai('⛔ la tuile écrit creerIc(e), pas e.ic', /<span class="creer-ic" style="\$\{catVars\(e\.k\)\}">\$\{creerIc\(e\)\}<\/span>/.test(NU));
  const repli = new Function('NAV', fc + '\nreturn creerIc;')([]);
  vrai('une création absente du menu garde son propre signe', repli({ k: 'nulle-part', ic: '🧪' }) === '🧪');
}

console.log('\n── 2. Le module des icônes couvre la feuille');
{
  const rac = (NU.match(/var RACINES=\[([^\]]*)\]/) || ['', ''])[1];
  vrai('la liste du balayage est trouvée', rac.length > 40);
  vrai('⛔ #creer est balayé', /'#creer'/.test(rac), rac.replace(/\s+/g, ' '));
  const obs = (NU.match(/\[([^\]]*)\]\.forEach\(function\(sel\)\{\s*var el=document\.querySelector\(sel\); if\(el\) obs\.observe/) || ['', ''])[1];
  vrai('la liste de l’observateur est trouvée', obs.length > 40);
  vrai('⛔ #creer est observé', /'#creer'/.test(obs), obs);
  /* l'enveloppe : les traits sont posés À L'OUVERTURE, pas 40 ms plus tard pendant la montée */
  const env = (NU.match(/if\(typeof window\.creerOuvrir==='function'\)\{[\s\S]*?\n\s*\}\n\s*\}catch/) || [''])[0];
  vrai('⛔ l’ouverture de la feuille pose ses traits tout de suite', /icones\(document\.getElementById\('creer'\)\)/.test(env) && /creerNatif\.apply\(this,arguments\)/.test(env));
}

console.log('\n── 3. Un bouton n’est jamais plus étroit que son nom');
{
  /* ⚠ Mesuré au navigateur le 24 septembre 2026 (iPhone 393 px) : « Historique du site (1) »
     demandait 169 px et en recevait 152 — son plancher FIXE de 150 px laissait le texte insécable
     déborder sur le bouton voisin. `scratchpad/tf/q-deborde.js` parcourt les 41 rubriques et trois
     fiches : 2 débordements avant, 0 après. Ici on garde la forme du correctif, dans le CODE. */
  const ih = (NU.match(/function intHeadExtras\(i\)\{[\s\S]*?\n(?=function |\/\* ── )/) || [''])[0];
  vrai('l’en-tête de la fiche intervention est trouvé', ih.length > 800, ih.length);
  const btn = lib => (ih.match(new RegExp('<button[^>]*style="([^"]*)"[^>]*>[^<]*' + lib)) || ['', ''])[1];
  for (const lib of ["Indiquer l'arrivée", 'Historique du site']) {
    const st = btn(lib);
    vrai('« ' + lib + ' » est trouvé', st.length > 0);
    vrai('⛔ … et son plancher est son nom (max-content), pas un chiffre', /min-width:max-content/.test(st) && !/min-width:\d+px/.test(st), st);
  }
}

console.log('\n═══ test-806 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
