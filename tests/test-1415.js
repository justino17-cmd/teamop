/* ══ test-1415 — LES INITIALES D'UN NOM QUI COMMENCE PAR UN ÉMOJI (robustesse#11) ═════════════
   `initials` prenait `w[0]` : la première UNITÉ UTF-16 de chaque mot. Un émoji hors du plan de base
   (🐀 😀 🧑‍🔧) s'écrit sur DEUX unités, et `w[0]` n'en rend que la moitié : une demi-paire de
   substitution, que l'écran dessine « � ». initials('🐀 Dératisation Express') rendait "\ud83dD",
   initials('😀') rendait "\ud83d" — dans l'avatar des clients, fournisseurs, techniciens,
   utilisateurs, planning (34 appels).

   Ce banc EXÉCUTE la vraie fonction (extraite d'app.html) : la première lettre ou chiffre de
   chaque mot (2 au plus), l'émoji ENTIER quand il n'y a rien d'autre, « ? » pour un nom vide —
   et jamais une moitié de paire. Il garde aussi les trois autres endroits qui coupaient un nom
   en avatar par `[0]` / `charAt(0)` : la tuile d'une box, l'avatar d'un e-mail et la pastille de
   la liste de courriels passent par la MÊME fonction (une seule définition : une fonction déclarée
   deux fois, la seconde gagne en silence). */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const ligne = debut => { const i = APP.indexOf(debut); return i < 0 ? '' : APP.slice(i, APP.indexOf('\n', i)); };

console.log('\n── 1415 · 0. la population ──');
const SRC = ligne('const initials = name =>') || ligne('const initials = (name');
vrai('la fonction est trouvée (sur UNE ligne : test-822 l’extrait ainsi)', SRC.length > 30 && !/\n/.test(SRC), SRC.length);
vrai('une seule définition', (CODE.match(/const initials\s*=/g) || []).length === 1 && !/function initials\(/.test(CODE));
if (!SRC) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }
const initials = new Function(SRC.replace('const initials', 'var initials') + '\nreturn initials;')();
const demi = s => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s);

console.log('\n── 1415 · 1. un émoji ne se coupe plus en deux ──');
v('« 🐀 Dératisation Express » → DE (les lettres des mots, l’émoji laissé)', initials('🐀 Dératisation Express'), 'DE');
v('« 😀 » seul → l’émoji ENTIER', initials('😀'), '😀');
v('« 🧑‍🔧 Léo Martin » → LM', initials('🧑‍🔧 Léo Martin'), 'LM');
v('trois émojis → le premier, entier', initials('😀😀😀'), '😀');
v('trois mots-émojis → le premier, entier', initials('🐀 😀 🦟'), '🐀');
v('une séquence ZWJ (famille) reste ENTIÈRE', initials('👨‍👩‍👧'), '👨‍👩‍👧');
v('un drapeau (deux indicateurs régionaux) reste ENTIER', initials('🇫🇷'), '🇫🇷');
v('« 🙂 Admin » (prénom émoji + nom) → A', initials('🙂 Admin'), 'A');
for (const n of ['🐀 Dératisation Express', '😀', '🧑‍🔧 Léo Martin', '🐜 Fourmis & Cie', '🙂 Admin', '😀😀😀', '👨‍👩‍👧', '🇫🇷', 'a😀 b😀'])
  vrai('aucune moitié de paire de substitution pour « ' + n + ' »', !demi(initials(n)), initials(n));

console.log('\n── 1415 · 2. ce qui marchait avant marche encore ──');
v('« Éric Dupont » → ÉD', initials('Éric Dupont'), 'ÉD');
v('« élodie » → É (un seul mot)', initials('élodie'), 'É');
v('« Jean Dupont » → JD', initials('Jean Dupont'), 'JD');
v('« jean dupont » → JD (majuscules)', initials('jean dupont'), 'JD');
v('trois mots → deux initiales au plus', initials('Jean Pierre Dupont'), 'JP');
v('« Jean-Pierre Martin » → JM', initials('Jean-Pierre Martin'), 'JM');
v('un chiffre compte : « 2 Rue » → 2R', initials('2 Rue'), '2R');
v('espaces doublés : « Jean  Dupont » → JD (avant : J)', initials('Jean  Dupont'), 'JD');
v('espaces autour : «  Jean Dupont  » → JD', initials('  Jean Dupont  '), 'JD');
v('« OP » → OP… deux mots courts : « Op Admin » → OA', initials('Op Admin'), 'OA');
v('« Équipe Sud » → ÉS', initials('Équipe Sud'), 'ÉS');
v('de la ponctuation autour : « (Dupont) » → D', initials('(Dupont)'), 'D');
v('alphabet non latin : « Дмитрий Иванов » → ДИ', initials('Дмитрий Иванов'), 'ДИ');

console.log('\n── 1415 · 3. le nom vide ──');
v('chaîne vide → ?', initials(''), '?');
v('null → ?', initials(null), '?');
v('undefined → ?', initials(undefined), '?');
v('que des espaces → ?', initials('   '), '?');
v('ponctuation seule : le premier signe, pas de trou', initials('---'), '-');

console.log('\n── 1415 · 4. le nombre d’initiales demandé (la tuile d’une box n’en veut qu’une) ──');
v('initials(x,1) : « Cuisine Resto » → C', initials('Cuisine Resto', 1), 'C');
vrai('initials(x,1) : un émoji en tête → la lettre du mot, jamais une moitié', !demi(initials('🐀 Rat', 1)) && initials('🐀 Rat', 1) === 'R', initials('🐀 Rat', 1));
v('initials(x,1) : « 😀 » seul → l’émoji entier', initials('😀', 1), '😀');
v('par défaut deux initiales', initials('Jean Pierre Dupont').length, 2);

console.log('\n── 1415 · 5. les autres coupes d’avatar passent par la même fonction ──');
vrai('la tuile d’une box ne coupe plus par [0]', !/String\(b\.nom\|\|b\.numero\|\|'B'\)\.trim\(\)\[0\]/.test(CODE));
vrai('… elle appelle initials(…,1)', /initials\(String\(b\.nom\|\|b\.numero\|\|'B'\)\.trim\(\),1\)/.test(CODE));
vrai('l’avatar d’un courriel ne coupe plus par charAt(0)', !/\(who\|\|'\?'\)\.trim\(\)\.charAt\(0\)/.test(CODE));
vrai('… il appelle initials(…,1)', /initials\(\(who\|\|'\?'\)\.trim\(\),1\)/.test(CODE) || /initials\(who\|\|'\?',1\)/.test(CODE));
vrai('la pastille de la liste de courriels ne coupe plus par charAt(0)', !/\(t\.charAt\(0\)\|\|'\?'\)/.test(CODE));
vrai('… elle appelle initials(t,1)', /initials\(t,1\)/.test(CODE));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
