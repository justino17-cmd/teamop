/* ══ CHOISIR UNE TRÈS GROSSE PHOTO : L'ÉCRAN DIT QU'IL RÉDUIT (lot m09, medias@5) ═══════════════════════════════════════════════════════════════════════════════════════
   Le testeur (s31.js) : une image de 3000 × 2000 px choisie dans la feuille « + » met 6 s à devenir l'aperçu — 6 077 ms mesurées entre le choix du fichier et l'ouverture, SANS un mot
   à l'écran. Une personne qui ne voit rien bouge, retouche, re-choisit : la même photo part deux fois. La réduction est un travail visible : « Réduction… ».
   ⚠️ Mesure refaite au navigateur (journal d'un MutationObserver sur l'avis, depuis l'évènement « change ») : sur cette machine la réduction elle-même dure ~0,7 s ; l'essentiel des 6 s du
   testeur est le TRANSFERT du fichier de 18 Mo par Playwright (`setInputFiles`). Le défaut reste vrai pour un téléphone lent (une photo de 12 Mpx s'y réduit en plusieurs secondes) : l'avis
   paraît à 400 ms, pas avant, et ne clignote donc pas ici.

   Ce que ce fichier garde — la VRAIE `photosChoisies` de la page (extraite et EXÉCUTÉE ; `reduireImage` est un faux dont le banc tient les promesses, l'horloge des minuteries aussi) :
     1. une réduction qui TRAÎNE (le délai de 400 ms passé) dit « Réduction… » et, une fois finie, l'avis s'efface — il ne reste pas jusqu'à ses sept secondes ;
     2. une réduction RAPIDE (une petite photo : quelques dizaines de ms) ne dit rien du tout (un avis qui clignote est un défaut de plus) ;
     3. l'avis qui suit la réduction (une image illisible, trop de photos) n'est JAMAIS effacé par le nettoyage : seul « Réduction… » l'est, et seulement s'il est encore à l'écran ;
     4. plusieurs photos : le pluriel. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(__dirname, '..', 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ seulement les blocs qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md) */
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const photosChoisies = decl('async function photosChoisies(');
vrai('(population) la fonction photosChoisies est extraite de la page', photosChoisies.length > 800);

/* un bac à sable : des minuteries que le BANC fait avancer, des réductions que le BANC termine, un avis qui garde son texte */
function monter({ ratees = 0 } = {}) {
  const ctx = { console, Promise, Math, journal: [], minuteurs: [], attente: [], ouvertures: 0, avisEl: { textContent: '', hidden: true } };
  let t = 0, n = 0;
  ctx.setTimeout = (f, ms) => { const h = ++n; ctx.minuteurs.push({ h, f, a: t + ms }); return h; };
  ctx.clearTimeout = h => { const i = ctx.minuteurs.findIndex(m => m.h === h); if (i >= 0) ctx.minuteurs.splice(i, 1); };
  ctx.avancer = ms => { t += ms; for (const m of ctx.minuteurs.filter(x => x.a <= t)) { ctx.clearTimeout(m.h); m.f(); } };
  ctx.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  vm.createContext(ctx);
  vm.runInContext(`
    const etat = { conv: 'c_1' }, ep = { ouvert: false, photos: [] };
    const $ = id => avisEl;
    const limitesPhotos = async () => ({ parMessage: 10, gifMax: 0 });
    let appel = 0;
    const reduireImage = (f) => new Promise((ok, ko) => { attente.push({ f, ok: () => ok({ blob: { size: 1 }, w: 100, h: 100 }), ko: () => ko(new Error('illisible')) }); });
    function avis(texte) { journal.push('avis:' + texte); avisEl.textContent = texte; avisEl.hidden = false; }
    function masquerAvis() { journal.push('masque'); avisEl.hidden = true; avisEl.textContent = ''; }
    const epOuvrir = () => { ouvertures++; }, epRendre = () => {};
    ${photosChoisies}
    this.photosChoisies = photosChoisies;
  `, ctx, { timeout: 3000 });
  return ctx;
}
const tick = () => new Promise(r => setImmediate(r));

(async () => {
  console.log('\n1. Une grosse photo : la réduction traîne');
  { const c = monter(); const p = c.photosChoisies([{ name: 'grosse.jpg' }]);
    await tick(); await tick();
    vrai('(population) la réduction est en cours (le banc la tient)', c.attente.length === 1);
    c.avancer(300);
    v('300 ms : rien encore (on ne clignote pas pour une petite photo)', c.avisEl.textContent, '');
    c.avancer(150);
    v('⛔ 450 ms : l\'écran DIT « Réduction… » (le testeur : six secondes sans un mot)', [c.avisEl.textContent, c.avisEl.hidden], ['Réduction de la photo…', false]);
    c.attente[0].ok(); await p;
    v('la réduction finie, l\'aperçu s\'ouvre et l\'avis s\'efface (il ne reste pas jusqu\'à ses sept secondes)', [c.ouvertures, c.avisEl.hidden, c.avisEl.textContent], [1, true, '']);
  }
  console.log('\n2. Une petite photo : rien du tout');
  { const c = monter(); const p = c.photosChoisies([{ name: 'petite.jpg' }]);
    await tick(); await tick(); c.avancer(40); c.attente[0].ok(); await p;
    v('réduite en 40 ms : aucun avis n\'a paru (ni « Réduction… » ni effacement)', [c.journal, c.ouvertures], [[], 1]);
    c.avancer(5000);
    v('…et la minuterie du délai a été retirée (rien ne part 400 ms plus tard)', c.journal, []);
  }
  console.log('\n3. L\'avis qui SUIT la réduction n\'est pas effacé');
  { const c = monter(); const p = c.photosChoisies([{ name: 'cassee.jpg' }]);
    await tick(); await tick(); c.avancer(500);
    vrai('(population) « Réduction… » est à l\'écran', /Réduction/.test(c.avisEl.textContent));
    c.attente[0].ko(); await p;
    v('⛔ l\'image illisible : SON avis est à l\'écran (le nettoyage de « Réduction… » ne l\'a pas emporté)', [c.avisEl.hidden, /n'a pas pu être lue/.test(c.avisEl.textContent)], [false, true]);
    v('…et rien ne s\'ouvre (aucune photo)', c.ouvertures, 0);
  }
  console.log('\n4. Plusieurs photos');
  { const c = monter(); const p = c.photosChoisies([{ name: 'a.jpg' }, { name: 'b.jpg' }]);
    await tick(); await tick(); c.avancer(500);
    v('deux photos : « Réduction des photos… »', c.avisEl.textContent, 'Réduction des photos…');
    c.attente[0].ok(); await tick(); await tick(); c.attente[1].ok(); await p;
    v('finies : l\'avis s\'efface, l\'aperçu s\'ouvre', [c.avisEl.hidden, c.ouvertures], [true, 1]);
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
