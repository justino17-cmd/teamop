/* ⛔ LE SITE SUIT L'APPAREIL POUR LE JOUR ET LA NUIT — CE QUE test-835 ET test-836 VÉRIFIENT ENSEMBLE, UNE SEULE FOIS.
   Justin, 29 septembre 2026, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux que
   ça soit automatique ». Ce fichier n'est pas une suite (il ne commence pas par « test- ») : il porte les contrôles que les
   deux bancs partagent, pour qu'une règle ne s'écrive pas deux fois — deux copies d'un contrôle divergent toujours.
   Il est né de la relecture adverse du 29 septembre au soir, qui a fait passer à travers les deux bancs, par mutation :
   un bouton `class="mode on"`, un bouton `id="bascule">☾`, un script `src="vitrine/v2/mode.js"` sans barre, une tête
   qui perd ses couleurs de barre, un mode.js entièrement commenté par `//`, un script `type="text/plain"` qui ne
   s'exécute jamais, un second bloc `:root` ou de nuit en fin de feuille, `color-scheme: light`, un `color:#0b1426` figé.
   D'où trois règles :
   · on cherche dans le CODE (commentaires retirés), jamais dans le texte brut, et par la FONCTION (un bouton de mode,
     quelle que soit sa classe), pas par une chaîne exacte ;
   · un script se juge en l'EXÉCUTANT (node:vm), pas en y cherchant un motif ;
   · une feuille se juge sur TOUS ses blocs, pas sur le premier. */
'use strict';
const vm = require('vm');

/* le code d'une page : ni commentaire HTML, ni commentaire de bloc (dans <style> et <script>) */
const codeDe = s => String(s || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ce qui, dans une page, ressemble à un bouton ou à un mode forcé — la tête du mode retirée d'abord (elle, et elle
   seule, nomme la clé de l'ancien bouton : pour l'effacer) */
function restesDeMode(page, TETE_MODE) {
  const brut = String(page || '').split(TETE_MODE).join(' ');
  const c = codeDe(brut), vu = [];
  for (const m of c.matchAll(/\bclass\s*=\s*("|')(.*?)\1/g)) {
    const t = m[2].split(/\s+/);
    if (t.includes('mode') || t.includes('coin-mode')) vu.push('classe « ' + m[2] + ' »');
  }
  if (/[☀☾☼🌙🌞]/u.test(c)) vu.push('le dessin ☀︎/☾');
  if (/(?:aria-label|title)\s*=\s*("|')[^"']*\b(?:mode (?:jour|nuit|sombre|clair)|thème (?:sombre|clair))/i.test(c)) vu.push('un nom « mode jour / nuit »');
  if (/(?:aria-label|title)\s*=\s*("|')\s*(?:thème|theme|mode)\s*\1/i.test(c)) vu.push('un groupe nommé « Thème »');
  if (/<button\b[^>]*>\s*(?:jour|nuit|auto|mode (?:jour|nuit))\s*<\/button>/i.test(c)) vu.push('un bouton « Jour / Nuit »');
  if (/v2\/mode\.js/.test(c)) vu.push('le script mode.js');
  if (/data-theme/.test(c)) vu.push('data-theme');
  if (/\bdata-mode\b/.test(c)) vu.push('data-mode');
  if (/teamop_site_mode/.test(c)) vu.push('la clé teamop_site_mode hors de la tête');
  if (/localStorage\s*\.\s*(?:getItem|setItem)\s*\(\s*("|')[^"']*(?:mode|theme|thème)/i.test(c)) vu.push('une clé de mode rangée sur l\'appareil');
  if (/(?<![-\w])color-scheme\s*:/.test(c)) vu.push('une déclaration color-scheme dans la page (la feuille la porte)');
  if (/<meta\s+name\s*=\s*("|')color-scheme\1/i.test(c)) vu.push('une seconde meta color-scheme');
  return vu;
}

/* une fausse page : ce que les deux scripts du mode touchent, noté — et rien d'autre n'existe (toute autre API jette) */
function bac(rangement, attributs) {
  const note = { set: [], retire: [], attrPose: [], attrRetire: [], appels: [] };
  const localStorage = {
    getItem: k => { note.appels.push('getItem'); return k in rangement ? rangement[k] : null; },
    setItem: (k, v) => { note.set.push(k); rangement[k] = String(v); },
    removeItem: k => { note.retire.push(k); delete rangement[k]; },
  };
  const documentElement = {
    getAttribute: a => (a in attributs ? attributs[a] : null),
    setAttribute: (a, v) => { note.attrPose.push(a); attributs[a] = String(v); },
    removeAttribute: a => { note.attrRetire.push(a); delete attributs[a]; },
    hasAttribute: a => a in attributs,
    get dataset() { note.appels.push('dataset'); return new Proxy({}, { set: (o, k) => { note.attrPose.push('data-' + k); return true; } }); },
    classList: { add: () => note.appels.push('classList'), remove: () => note.appels.push('classList'), toggle: () => note.appels.push('classList') },
    style: new Proxy({}, { set: (o, k) => { note.appels.push('style.' + String(k)); return true; } }),
  };
  const document = new Proxy({ documentElement }, { get: (o, k) => {
    if (k in o) return o[k];
    note.appels.push('document.' + String(k));
    return () => { throw new Error('document.' + String(k) + ' : rien d\'autre n\'est permis au script du mode'); };
  } });
  const window = { localStorage, document, matchMedia: () => { note.appels.push('matchMedia'); return { matches: false, addEventListener() {}, addListener() {} }; } };
  window.window = window;
  return { ctx: vm.createContext(Object.assign(window, { console: { log() {} } })), note };
}

/* le script de la TÊTE, exécuté : il efface la clé de l'ancien bouton, et c'est tout ; balise <script> nue (un
   `type` quelconque le rendrait inerte) */
function jouerTete(TETE_MODE) {
  const scripts = [...String(TETE_MODE || '').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const r = { scripts: scripts.length, balise: scripts.map(m => m[1].trim()).filter(Boolean) };
  if (scripts.length !== 1) return r;
  const rangement = { teamop_site_mode: 'nuit', autre: 'garde' }, attributs = { 'data-theme': 'dark' };
  const { ctx, note } = bac(rangement, attributs);
  try { vm.runInContext(scripts[0][2], ctx, { timeout: 1000 }); r.ok = true; } catch (e) { r.erreur = String(e.message || e); }
  Object.assign(r, { cleEffacee: !('teamop_site_mode' in rangement), autreGardee: rangement.autre === 'garde', note });
  return r;
}

/* mode.js, exécuté sur une page restée en cache (vieille tête : clé rangée, data-theme posé) */
function jouerModeJs(MODEJS) {
  const rangement = { teamop_site_mode: 'jour', autre: 'garde' }, attributs = { 'data-theme': 'light' };
  const { ctx, note } = bac(rangement, attributs);
  const r = {};
  try { vm.runInContext(String(MODEJS || ''), ctx, { timeout: 1000 }); r.ok = true; } catch (e) { r.erreur = String(e.message || e); }
  return Object.assign(r, { cleEffacee: !('teamop_site_mode' in rangement), autreGardee: rangement.autre === 'garde',
    modeRetire: !('data-theme' in attributs), note });
}

/* ── une feuille : tous ses blocs ── */
const cssCode = css => String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
/* les règles à plat : un @media rend ses règles intérieures (avec sa requête), un @supports aussi */
function reglesAPlat(css) {
  const c = cssCode(css), out = [];
  let i = 0;
  const lire = (texte, media) => {
    let k = 0;
    while (k < texte.length) {
      const o = texte.indexOf('{', k);
      if (o < 0) break;
      const sel = texte.slice(k, o).trim();
      let prof = 1, j = o + 1;
      while (j < texte.length && prof) { if (texte[j] === '{') prof++; else if (texte[j] === '}') prof--; j++; }
      const corps = texte.slice(o + 1, j - 1);
      if (/^@(media|supports|layer|container)/.test(sel)) lire(corps, sel);
      else out.push({ sel, corps, media });
      k = j;
    }
  };
  lire(c, '');
  return out;
}
const NOMMEES = 'white|black|red|green|blue|gray|grey|silver|navy|yellow|orange|purple|pink|brown|teal|maroon|olive|lime|aqua|fuchsia|gold|beige|ivory|khaki|coral|crimson|indigo|violet|tomato|salmon|snow|linen|wheat|tan|plum|orchid';
const PROP_COULEUR = /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?|box-shadow|text-shadow|-webkit-text-fill-color)$/;
/* les déclarations de couleur écrites EN DUR (hors :root) : [sélecteur, propriété, valeur] */
function couleursEnDurFeuille(css) {
  const trouvees = [];
  for (const r of reglesAPlat(css)) {
    if (/^:root\b/.test(r.sel)) continue;
    for (const d of r.corps.split(';')) {
      const m = d.match(/^\s*([a-z-]+)\s*:\s*([\s\S]+?)\s*$/i);
      if (!m || !PROP_COULEUR.test(m[1].toLowerCase())) continue;
      const v = m[2].replace(/var\([^)]*\)/g, ' ');
      if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(v) || new RegExp('(^|[\\s,(])(?:' + NOMMEES + ')(?=$|[\\s,)!])', 'i').test(v))
        trouvees.push([r.sel.replace(/\s+/g, ' '), m[1].toLowerCase(), m[2].trim()]);
    }
  }
  return trouvees;
}
/* la forme d'une feuille qui suit l'appareil : UN bloc :root de jour, UN @media de nuit qui ne contient que :root, puis
   plus rien qui redéfinisse les jetons ; `color-scheme: light dark` une fois, sur le :root de jour ; aucune règle du
   bouton hors de la garde qui le cache */
function formeFeuille(css) {
  const c = cssCode(css), r = {};
  r.racines = (c.match(/(^|[\s,}]):root\b/g) || []).length;
  r.nuits = (c.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g) || []).length;
  r.jours = (c.match(/prefers-color-scheme\s*:\s*light/g) || []).length;
  const iJour = c.search(/(^|\n):root\s*\{/), iNuit = c.search(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/);
  r.ordre = iJour >= 0 && iNuit > iJour;
  const nuit = reglesAPlat(css).filter(x => /prefers-color-scheme\s*:\s*dark/.test(x.media));
  r.nuitSeulementRacine = nuit.length === 1 && nuit[0].sel === ':root';
  const jour = reglesAPlat(css).filter(x => x.sel === ':root' && !x.media);
  r.schemes = (c.match(/(^|[;{\s])color-scheme\s*:/g) || []).length;
  r.schemeJour = jour.length === 1 && /(^|;)\s*color-scheme\s*:\s*light dark\s*(;|$)/.test(jour[0].corps);
  r.reglesMode = reglesAPlat(css).filter(x => /\.(?:coin-)?mode\b/.test(x.sel)).map(x => (x.sel + ' { ' + x.corps.trim() + ' }').replace(/\s+/g, ' '));
  r.gardeSeule = r.reglesMode.length === 1 && r.reglesMode[0] === '.mode, .coin-mode { display: none !important; }';
  r.dataTheme = /data-theme/.test(c);
  return r;
}

module.exports = { codeDe, restesDeMode, jouerTete, jouerModeJs, reglesAPlat, couleursEnDurFeuille, formeFeuille };
