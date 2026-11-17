// RECONTRÔLE ADVERSE (étape 8) de S15 : le corps d'un courriel devient du HTML par corpsLu() du module de courrier. On extrait les VRAIES fonctions
// (H, entitesLues, adresseVue, corpsLu) du fichier servi et on les fait mâcher 60 000 chaînes tirées d'un vocabulaire hostile (entités, guillemets,
// schémas, retournements bidi, adresses internationales). Invariant : la sortie ne contient que du texte, des <br> et des liens <a class="rlien" href="http(s)://…">
// dont l'adresse n'a ni guillemet, ni espace, ni chevron, ni identifiant (user@), et dont le texte affiché est la forme réelle (xn--) d'une adresse non latine.
// Un décodeur d'entités nommées minimal remplace le <textarea> du navigateur (qui ne fait que décoder). Population : nombre de liens produits, nombre de sorties rejetées.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-courrier.js'), 'utf8');
const prendre = (debut, fin) => { const i = src.indexOf(debut); if (i < 0) throw new Error('introuvable : ' + debut); const j = src.indexOf(fin, i); return src.slice(i, j + fin.length); };
const H = src.split('\n').find(l => l.trim().startsWith('var H=function(s)')).trim();
const ent = src.slice(src.indexOf('var _deco=null;'), src.indexOf('function corpsLu'));
const corps = prendre('function corpsLu', 'return h.replace(/\\n/g,"<br>"); }');
const TA = { set innerHTML(t) { const m = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', Eacute: 'É', eacute: 'é', hellip: '…', colon: ':', sol: '/', Tab: '\t', NewLine: '\n', lpar: '(', rpar: ')', num: '#', semi: ';', commat: '@' }; this.value = (m[t.slice(1, -1)] !== undefined) ? m[t.slice(1, -1)] : t; }, value: '' };
const document = { createElement: () => Object.create(TA, {}) };
const mod = new Function('document', H + '\n' + ent + '\n' + corps + '\nreturn { corpsLu: corpsLu, H: H };')(document);
const V = ['&', '&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&#x3c;', '&#60;', '&#x22;', '&apos;', '&colon;', '&sol;', '&Tab;', '&NewLine;', '"', "'", '<', '>', '`', '\\', 'http://', 'https://', 'HTTP://', 'x.fr', 'a.b.c', 'javascript:', 'data:text/html,', 'vbscript:', '//', 'user:pw@', '@', '#', '?', '=', '%22', '%3E', 'onerror=', 'onmouseover=', ' ', ' ', '\n', '\t', '‮', '⁦', '​', 'аррӏе.com', 'münchen.de', '日本.jp', 'xn--abc', '.', ',', ')', ']', '(', '[', 'img src=x', 'script', 'svg/onload=', '/', ':', ';', ' ', '\r'];
let graine = 8801; const r = n => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine % n; };
const OK = /^(?:[^<>]|<br>|<a class="rlien" href="https?:\/\/[^"<>\s]+" target="_blank" rel="noopener noreferrer nofollow">[^<>]*<\/a>)*$/;
let vides = 0, nb = 0, liens = 0, rejets = [], idn = 0;
for (let i = 0; i < 60000; i++) { const n = 1 + r(14); let s = ''; for (let k = 0; k < n; k++) s += V[r(V.length)];
  if (i % 3 === 0) s = 'Voir ' + V[r(V.length)] + 'https://' + s;
  let out; try { out = mod.corpsLu(s, true); } catch (e) { rejets.push({ s, erreur: e.message }); continue; } nb++;
  const m = out.match(/<a [^>]*>/g) || []; liens += m.length;
  if (!OK.test(out)) rejets.push({ s, out: out.slice(0, 200) });
  for (const a of m) { const h = /href="([^"]*)"/.exec(a)[1]; if (/^https?:\/\/[^\/?#]*@/.test(h) || !/^https?:\/\//.test(h)) rejets.push({ s, out: a.slice(0, 160), motif: 'adresse avec identifiants ou schéma autre' }); else if (!/^https?:\/\/[^\/?#]+/.test(h)) vides++; }
  const aff = [...out.matchAll(/<a [^>]*>([^<]*)<\/a>/g)]; for (const x of aff) if (/[^\x00-\x7f]/.test(x[1].replace(/^https?:\/\/[^\/?#]*/, m0 => m0).split(/[\/?#]/)[2] || '')) idn++; }
// témoins : un lien ordinaire est bien produit ; l'IDN s'affiche en xn-- ; un lien avec identifiants n'est pas cliquable ; « javascript: » n'est jamais un lien
const t1 = mod.corpsLu('Voir https://exemple.fr/devis?a=1&b=2 merci', true), t2 = mod.corpsLu('https://аррӏе.com/x', true), t3 = mod.corpsLu('https://u:p@exemple.fr/x', true), t4 = mod.corpsLu('javascript:alert(1) et data:text/html,<b>x</b>', true), t5 = mod.corpsLu('https://exemple.fr/&quot;onmouseover=alert(1)', true), t6 = mod.corpsLu('&lt;https://exemple.fr&gt;', true);
const v = (nom, c, d) => { console.log((c ? '  ✓ ' : '  ✗ ') + nom + (c ? '' : ' → ' + JSON.stringify(d))); if (!c) ko++; else okn++; }; let ko = 0, okn = 0;
v('population : 60 000 chaînes hostiles passées par la vraie corpsLu (' + nb + ')', nb >= 59990, nb);
v('population : au moins 5 000 liens produits (' + liens + ') — sinon l\'invariant ne regarde rien', liens >= 5000, liens);
v('AUCUNE sortie hors de la forme « texte, <br>, lien http(s) sans guillemet ni identifiant » — rejetées : ' + rejets.length, rejets.length === 0, rejets.slice(0, 4));
v('témoin : un lien ordinaire sort cliquable', /<a class="rlien" href="https:\/\/exemple\.fr\/devis\?a=1&amp;b=2"/.test(t1), t1);
v('un lien en lettres non latines affiche sa forme réelle (xn--)', /xn--/.test(t2), t2);
v('un lien qui porte des identifiants n\'est pas cliquable', !/<a /.test(t3), t3);
v('« javascript: » et « data: » ne deviennent jamais des liens', !/<a /.test(t4) && !/<b>/.test(t4), t4);
v('un guillemet décodé (&quot;) ne sort pas de l\'attribut href', !/onmouseover=alert\(1\)"/.test(t5) && !/ onmouseover=/.test(t5.replace(/href="[^"]*"/, '')), t5);
v('une adresse entre chevrons écrits en entités reste du texte', !/<https/.test(t6), t6);
console.log('  · liens sans nom d\'hôte (« http:/// », « https://# ») : ' + vides + ' — inoffensifs (le navigateur ne va nulle part) mais cliquables : observation, pas défaut');
console.log('\n== ' + okn + ' ✓ · ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
