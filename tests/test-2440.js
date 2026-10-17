/* ══ APERÇU DES PHOTOS : LE DOUBLE TOUCHER SUR LA FLÈCHE D'ENVOI NE DÉMARRE PAS UN ENREGISTREMENT (lot m09, medias#2) ══════════════════════════════════
   Le testeur : toucher deux fois, à 150 ms, la flèche bleue de l'aperçu d'une photo. La photo part UNE fois — mais le second toucher tombe sur ce que le premier a LAISSÉ à
   sa place : l'aperçu se ferme, la barre de saisie revient, et le MICRO prend l'endroit de la flèche. Un enregistrement vocal démarre (et, sur un vrai téléphone, la demande
   d'autorisation du micro s'ouvre) sans que la personne l'ait voulu. `envoyerTexte`, l'enregistrement et la visionneuse armaient déjà `armerRetap()` ; `epEnvoyer` non.

   Ce que ce fichier garde : la VRAIE `epEnvoyer` de la page (extraite et EXÉCUTÉE avec de fausses pièces autour), sur ses chemins — la flèche (et Entrée dans la légende : la même
   fonction), l'envoi qui ne part pas (aperçu fermé, légende refusée : le micro garde alors sa place, un faux « retap » avalerait un vrai toucher). Le second toucher se joue
   avec les VRAIES `retap` / `armerRetap`, une horloge posée par le banc. La couture au navigateur (iPhone, Android) : le script du testeur relancé sur ce code (rapport du lot). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(__dirname, '..', 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md) */
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);
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
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };

const epEnvoyer = decl('async function epEnvoyer(');
vrai('(population) la fonction epEnvoyer est extraite de la page', epEnvoyer.length > 100);
vrai('(population) retap / armerRetap sont extraites', /retapJusqua/.test(ligne('const armerRetap = ')) && /retapJusqua/.test(ligne('const retap = ')));

/* de fausses pièces autour de la VRAIE fonction : l'aperçu ouvert, une photo, une légende (vide ou non), un `envoi` qui réussit ; l'horloge est celle du banc */
function monter({ ouvert = true, legende = '' } = {}) {
  const ctx = { console, Promise, nSignes: s => s.length, TEXTE_MAX: 4000, avis: () => {}, texteTropLong: () => 'trop long', envoiAppels: [], URL: { revokeObjectURL() {} }, horloge: { t: 1e12 } };
  ctx.Date = { now: () => ctx.horloge.t };
  vm.createContext(ctx);
  vm.runInContext(`
    const ep = { ouvert: ${ouvert}, envoi: false, conv: 'c_1', photos: [{ url: 'blob:x' }] };
    const $ = id => ({ value: ${JSON.stringify(legende)} });
    function epFermer() { ep.ouvert = false; }
    const envoi = async (...a) => { envoiAppels.push(a); return true; };
    let retapJusqua = 0;
    ${ligne('const armerRetap = ')}
    ${ligne('const retap = ')}
    ${epEnvoyer}
    this.epEnvoyer = epEnvoyer; this.retap = retap;
  `, ctx, { timeout: 3000 });
  return ctx;
}
(async () => {
  /* 1. la flèche : l'envoi part, et le toucher qui SUIT (celui du micro qui prend sa place) est avalé — déjà pendant l'attente de l'envoi */
  { const c = monter();
    vrai('avant tout geste, le micro répond (retap faux)', c.retap() === false);
    const p = c.epEnvoyer();
    vrai('au retour de l\'appel (l\'aperçu est fermé, le micro a pris la place), le second toucher est avalé', c.retap() === true);
    await p;
    vrai('l\'envoi est parti une fois', c.envoiAppels.length === 1);
    c.horloge.t += 399; vrai('399 ms après : toujours avalé', c.retap() === true);
    c.horloge.t += 2;   vrai('401 ms après : le micro répond de nouveau (on ne le prive pas de son vrai usage)', c.retap() === false);
  }
  /* 2. rien à envoyer (aperçu fermé) : le micro garde sa place, aucun toucher n'est avalé */
  { const c = monter({ ouvert: false }); await c.epEnvoyer(); vrai('un envoi qui ne part pas (aperçu fermé) n\'avale aucun toucher', c.retap() === false && c.envoiAppels.length === 0); }
  /* 3. la légende trop longue : refus, rien ne part, le micro garde sa place */
  { const c = monter({ legende: 'x'.repeat(5000) }); await c.epEnvoyer(); vrai('une légende refusée n\'avale aucun toucher', c.retap() === false && c.envoiAppels.length === 0); }
  /* 4. le texte de la page : la flèche ET Entrée appellent la même fonction (la garde vit dans la fonction, pas dans un seul des deux appelants) */
  vrai('la flèche et Entrée appellent la même fonction', /\$\('ep-envoyer'\)\.addEventListener\('click', \(\) => epEnvoyer\(\)\)/.test(JS) && /e\.preventDefault\(\); epEnvoyer\(\); \}/.test(JS));
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
