/* ══ test-2804 : le corps d'un mail se LIT — entités décodées, liens cliquables, rien d'exécutable (20 octobre 2026) ══
   Justin, capture de la Tour : « &Eacute;QUIPE », « &nbsp; », « &lt;https://…&gt; » écrits tels quels, et « quand il y a des liens dans les
   mails qu'on puisse cliquer dessus ». On EXÉCUTE les vraies `entitesLues` et `corpsLu` d'`opcourrier.js` (le <textarea> du navigateur est
   remplacé par un décodeur des entités nommées les plus courantes : ce banc garde la mécanique, la sonde au navigateur garde le décodage réel).
   ⛔ Rien d'exécutable ne sort d'un mail : un « <script> » écrit en entités reste du texte, `javascript:` n'est jamais un lien, une adresse
   s'arrête devant un guillemet (pas d'attribut injecté), et les indésirables ne reçoivent AUCUN lien. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => { const b = JSON.stringify(obtenu) === JSON.stringify(attendu); b ? ok++ : ko++; console.log((b ? '  ✓ ' : '  ✗ ') + nom + (b ? '' : '\n      attendu : ' + JSON.stringify(attendu) + '\n      obtenu  : ' + JSON.stringify(obtenu))); };
console.log('── test-2804 : le corps d\'un mail se lit ──');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'opcourrier.js'), 'utf8');
const tranche = (debut, fin) => { const i = SRC.indexOf(debut), j = SRC.indexOf(fin, i + 1); return i > 0 && j > i ? SRC.slice(i, j) : ''; };
const H = tranche('  var H=function', '\n');
const F = tranche('  var _deco=null;', '    return h.replace(/\\n/g,"<br>"); }') + '    return h.replace(/\\n/g,"<br>"); }';
v('(population) les trois pièces sont trouvées dans le fichier livré', [H.length > 50, /function entitesLues/.test(F), /function corpsLu/.test(F)], [true, true, true]);
const NOMMEES = { '&Eacute;': 'É', '&eacute;': 'é', '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&rsquo;': '’' };
const document = { createElement: () => { const t = { _v: '' }; Object.defineProperty(t, 'innerHTML', { set(x) { t._v = NOMMEES[x] !== undefined ? NOMMEES[x] : x; } }); Object.defineProperty(t, 'value', { get() { return t._v; } }); return t; } };
const ctx = vm.createContext({ document, String, parseInt });
vm.runInContext(H + '\n' + F + '\nthis.entitesLues=entitesLues; this.corpsLu=corpsLu;', ctx);
const { entitesLues, corpsLu } = ctx;
v('les entités nommées, décimales et hexadécimales deviennent des lettres', entitesLues('&Eacute;QUIPE &#233;t&#xE9; &rsquo;'), 'ÉQUIPE été ’');
v('un texte sans « & » ressort tel quel', entitesLues('Bonjour'), 'Bonjour');
v('une entité inconnue reste lisible (rien n\'est mangé)', entitesLues('&zzzinconnu;'), '&zzzinconnu;');
v('« &nbsp; » devient une espace ordinaire, les retours à la ligne des <br>', corpsLu('a&nbsp;b\nc', true), 'a b<br>c');
const l = corpsLu('voir https://exemple.fr/p?a=1&b=2. Et &lt;https://exemple.org/x&gt;', true);
v('une adresse devient UN lien, la ponctuation finale reste hors du lien', /<a class="rlien" href="https:\/\/exemple\.fr\/p\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow">https:\/\/exemple\.fr\/p\?a=1&amp;b=2<\/a>\. /.test(l), true);
v('« <https://…> » : le lien s\'arrête avant le chevron', /href="https:\/\/exemple\.org\/x"[^>]*>https:\/\/exemple\.org\/x<\/a>&gt;$/.test(l), true);
const m = corpsLu('&lt;script&gt;alert(1)&lt;/script&gt; javascript:alert(2) https://x.fr/&quot;onmouseover=&quot;alert(3)', true);
v('⛔ un <script> écrit en entités reste du TEXTE', [/<script/i.test(m), /&lt;script&gt;/.test(m)], [false, true]);
v('⛔ javascript: n\'est jamais un lien', /href="javascript/i.test(m), false);
v('⛔ une adresse s\'arrête devant un guillemet : aucun attribut injecté', [/href="https:\/\/x\.fr\/"/.test(m), /<a [^>]*onmouseover/i.test(m)], [true, false]);
v('⛔ sans liens (les indésirables) : aucune balise <a>', /<a /.test(corpsLu('https://arnaque.example/connexion', false)), false);
v('les deux affichages du corps passent par corpsLu, et les indésirables y sont exclus',
  [(SRC.match(/corpsLu\(/g) || []).length >= 3, /var li=m\.folder!=="junk"/.test(SRC), /corpsLu\(Array\.isArray\(p\)\?p\[1\]:p,m\.folder!=="junk"\)/.test(SRC)], [true, true, true]);
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
