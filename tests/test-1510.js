/* ══ i02 · r3#1 / r3#3 — LA NOTE « LES BROUILLONS NE COMPTENT PAS » PARLE LA LANGUE CHOISIE ════════════════
   La note que la vague 1 (g17, accueil#8) a posée sous les chiffres de Statistiques et d'Archives était une
   constante écrite en français : sous English / Español, c'était la seule phrase d'interface restée française
   sur ces deux écrans (mesuré au navigateur, 6 relevés sur 6). Deux défauts jumeaux :
     · aucune entrée dans I18N.en / I18N.es ;
     · une constante évaluée UNE FOIS au chargement du script : même avec une entrée, changer de langue sans
       recharger aurait gardé la langue d'avant. La note se compose donc au moment du rendu, par `t()`.

   Ce banc EXÉCUTE la vraie `t()` avec le vrai dictionnaire I18N d'app.html (les lots Object.assign compris) et
   la vraie `docsEmisNote()` ; le rendu des deux écrans par les vraies vues est joué par test-1220.          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (CLAUDE.md) — un motif vise du code. */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1510 · 0. la population ──');
const i0 = SRC.indexOf('const I18N={'), i1 = SRC.indexOf('function t(s){');
vrai('le dictionnaire et t() sont trouvés (une tranche vide passerait au vert sur tout)', i0 > 0 && i1 > i0, [i0, i1]);
const DICO = SRC.slice(i0, SRC.indexOf('\n', i1));
const NOTE = ligne('function docsEmisNote(');
vrai('la fabrique de la note existe', NOTE.length > 50, NOTE);
const TXT = ligne('const DOCS_EMIS_TXT=');
vrai('… et le texte français source est trouvé', /brouillons/.test(TXT), TXT);

function monde(lang) {
  const ctx = { __lang: lang };
  vm.createContext(ctx);
  vm.runInContext(`function prefLocalLire(){ return __lang; }\nfunction getLang(){ return prefLocalLire('elan_lang')||'fr'; }
    ${DICO}\n${TXT}\n${NOTE}`, ctx);
  return ctx;
}
const sans = h => h.replace(/<[^>]+>/g, '');
const FRANCAIS = /brouillons|devis envoyés|factures envoyées|ne comptent pas/i;
const note = w => { try { return vm.runInContext('docsEmisNote()', w); } catch (e) { return ''; } };

console.log('\n── 1510 · 1. la note dans les trois langues ──');
{ const hFr = note(monde('fr'));
  vrai('population : en français, la note est rendue, dans son élément à part', /data-regle="docs-emis"/.test(hFr) && FRANCAIS.test(hFr), hFr.slice(0, 120));
  v('⛔ en français, la phrase est exactement celle d\'avant (aucune régression)', sans(hFr), 'Les brouillons ne comptent pas : sont « émis » les devis envoyés, acceptés ou refusés, et « facturées » les factures envoyées, payées ou en retard.');
  for (const [l, mots] of [['en', /draft/i], ['es', /borrador/i]]) {
    const h = note(monde(l));
    vrai('population : ' + l + ' — la note est rendue', /data-regle="docs-emis"/.test(h), h.slice(0, 120));
    vrai('⛔ ' + l + ' — plus un mot de la phrase française', !FRANCAIS.test(sans(h)), sans(h));
    vrai(l + ' — elle est dans la langue choisie', mots.test(sans(h)), sans(h));
    vrai(l + ' — l\'élément à part et sa marque sont conservés', /data-regle="docs-emis"/.test(h) && /font-size:12\.5px/.test(h));
  }
}
console.log('\n── 1510 · 2. ⛔ la langue se change SANS recharger : la note suit (pas une constante figée au chargement) ──');
{ const w = monde('fr'); const a = sans(note(w));
  w.__lang = 'en'; const b = sans(note(w));
  w.__lang = 'es'; const c = sans(note(w));
  w.__lang = 'fr'; const d = sans(note(w));
  vrai('fr → en → es → fr : trois langues différentes, retour exact', a !== b && b !== c && a !== c && a === d, [a.slice(0, 20), b.slice(0, 20), c.slice(0, 20)]);
}
console.log('\n── 1510 · 3. les deux écrans la posent par la fabrique, plus par une constante ──');
{ const n = SRC.split('docsEmisNote()').length - 1;
  vrai('⛔ la fabrique est appelée deux fois (Statistiques, Archives) en plus de sa définition (3 occurrences)', n === 3, n);
  vrai('… et plus aucune constante ne porte le balisage entier', !/const DOCS_EMIS_NOTE\s*=/.test(SRC) && !/\$\{DOCS_EMIS_NOTE\}|\?DOCS_EMIS_NOTE/.test(SRC));
}
console.log('\n════ test-1510 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
