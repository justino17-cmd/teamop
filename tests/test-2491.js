/* ══ LA BARRE « APPEL EN COURS » NE COUPE PLUS LA DURÉE (lot m19, appels#3) ══════════════════════════════════════════════════════════════
   Un seul texte portait « Appel en cours · Ben Durand · 00:03 » et une seule ellipse : à 360 px (197 px reçus pour 258 voulus) on lisait « Appel en cours · Ben Dur… » — la durée,
   la SEULE information qui change dans la barre, était la première perdue. La page écrit désormais deux morceaux : le nom (il prend l'ellipse) et la durée (`flex: none`).

   Ce que ce fichier garde :
   1. la VRAIE fonction `textesBarreAppel` (extraite de la page, exécutée) : le nom d'un côté, la durée de l'autre ; « ça sonne… » pendant la sonnerie ; rien quand l'appel n'a pas de début ;
      un nom de 60 signes reste ENTIER dans `nom` (la coupe est l'affaire du CSS, jamais du texte : le lecteur d'écran lit le nom complet) ;
   2. la cascade rejouée sur les deux morceaux : la durée ne rétrécit pas ni ne se coupe (`flex: none`, `white-space: nowrap`), le nom rétrécit et prend l'ellipse (`min-width: 0`,
      `text-overflow: ellipsis`), le conteneur est un flex qui n'a PAS d'ellipse à lui (sinon c'est lui qui couperait la fin) ;
   2 bis. (relecture du lot m19) le préfixe « Appel en cours · » est un morceau À PART, caché sous 480 px de large : déplacer la coupe de la durée vers le nom laissait, à 360 px, « Appel en cours · … · 00:03 » —
      le nom disparaissait entièrement, même court. Le banc exige que le préfixe parte (média ≤ 479.98px, `display: none`) et que le nom ne soit jamais le premier sacrifié ;
   3. `majBarreAppel` écrit les morceaux, jamais un texte unique dans le conteneur ; l'étiquette vocale du bouton garde le nom ET la durée.
   La mesure au navigateur (360, 390, bureau, nom de 60 signes, deux fois) : scratchpad/messages/correctifs/m19/sonde-m19.js. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(process.env.OPMSG_RACINE || path.join(__dirname, '..'), 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = C.sansCommJs(script);
const style = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

/* 1. la fonction réelle */
const src = C.ligne(JS, 'const dureeAppel = ') + '\n' + C.decl(JS, 'function textesBarreAppel(');
vrai('(population) dureeAppel et textesBarreAppel sont extraites de la page (' + src.length + ' caractères)', /const dureeAppel/.test(src) && /function textesBarreAppel/.test(src));
let textes = null;
try { textes = new Function(src + '\nreturn textesBarreAppel;')(); } catch (e) { textes = null; }
vrai('textesBarreAppel est exécutable', typeof textes === 'function');
if (textes) {
  const T0 = 1700000000000;
  const r = textes({ etat: 'en-cours', debut: T0, nom: 'Ben Durand', membres: [] }, T0 + 3000);
  v('en cours : le nom d\'un côté (« Appel en cours · Ben Durand »), la durée de l\'autre (« · 00:03 »)', [r.nom, r.duree], ['Appel en cours · Ben Durand', ' · 00:03']);
  v('le préfixe et le nom propre sont rendus À PART (le préfixe peut partir sans emporter le nom ; `nom` garde les deux pour l\'étiquette vocale)', [r.prefixe, r.qui], ['Appel en cours · ', 'Ben Durand']);
  v('une heure et plus : « · 1:02:05 »', textes({ etat: 'en-cours', debut: T0, nom: 'Ben' }, T0 + 3725000).duree, ' · 1:02:05');
  v('sonnerie : « · ça sonne… » à la place de la durée', textes({ etat: 'sonne', debut: 0, nom: 'Ben Durand' }, T0).duree, ' · ça sonne…');
  v('en cours mais sans début connu : pas de durée inventée', textes({ etat: 'en-cours', debut: 0, nom: 'Ben' }, T0).duree, '');
  const long = 'Bartholomew-Alexandre-Maximilien de la Tour-Maubourg-Saint-Germain';
  const l = textes({ etat: 'en-cours', debut: T0, nom: long }, T0 + 42000);
  vrai('un nom de ' + long.length + ' signes reste ENTIER dans le nom (la coupe est affaire de CSS) et la durée reste dite à part', l.nom === 'Appel en cours · ' + long && l.duree === ' · 00:42');
  v('un groupe sans titre : les deux premiers participants', textes({ etat: 'en-cours', debut: T0, membres: [{ prenom: 'Ana' }, { nom: 'Ben Durand' }, { prenom: 'Cléo' }] }, T0).nom, 'Appel en cours · Ana, Ben Durand');
  v('rien à nommer : « Appel en cours · Appel »', textes({ etat: 'en-cours', debut: T0 }, T0).nom, 'Appel en cours · Appel');
}

/* 2. la cascade sur les deux morceaux */
const R = C.regles(style);
vrai('(population) la feuille est lue : ' + R.length + ' règles rejouables', R.length > 300);
const BTN = { tag: 'button', classes: ['appel-barre-revenir', 'presse'] }, TEXTE = { tag: 'span', classes: ['texte'] };
const NOM = [BTN, TEXTE, { tag: 'span', classes: ['texte-nom'] }], DUREE = [BTN, TEXTE, { tag: 'span', classes: ['texte-duree'] }], CONT = [BTN, TEXTE];
vrai('la page écrit le texte de la barre en deux morceaux : <span id="appel-barre-nom" class="texte-nom"> puis <span id="appel-barre-duree" class="texte-duree"> dans <span id="appel-barre-texte" class="texte">',
  /<span class="texte" id="appel-barre-texte"><span class="texte-prefixe" id="appel-barre-prefixe">Appel en cours · <\/span><span class="texte-nom" id="appel-barre-nom"><\/span><span class="texte-duree" id="appel-barre-duree"><\/span><\/span>/.test(HTML));
v('⛔ la durée ne rétrécit pas : flex: none', C.gagne(R, DUREE, 'flex'), 'none');
v('⛔ la durée ne passe pas à la ligne ET garde son espace de tête (« · 00:03 » : un élément flex l\'effacerait en `nowrap`, le nom coupé toucherait le point) : white-space: pre', C.gagne(R, DUREE, 'white-space'), 'pre');
vrai('le nom rétrécit (flex-shrink 1, min-width 0) et prend l\'ellipse (overflow hidden + text-overflow ellipsis + nowrap)',
  /^0 1 auto$/.test(C.gagne(R, NOM, 'flex') || '') && C.gagne(R, NOM, 'min-width') === '0' && C.gagne(R, NOM, 'overflow') === 'hidden' && C.gagne(R, NOM, 'text-overflow') === 'ellipsis' && C.gagne(R, NOM, 'white-space') === 'nowrap');
const PREFIXE = [BTN, TEXTE, { tag: 'span', classes: ['texte-prefixe'] }];
v('le préfixe ne rétrécit pas et garde son espace final (flex: none, white-space: pre) : il part en entier ou reste en entier, jamais coupé en « Appel en c… »', [C.gagne(R, PREFIXE, 'flex'), C.gagne(R, PREFIXE, 'white-space')], ['none', 'pre']);
const MEDIA_PREFIXE = /@media \(max-width: 479\.98px\) \{ \.appel-barre-revenir \.texte-prefixe \{ display: none; \} \}/.exec(style);
vrai('⛔ sous 480 px de large (téléphone : 197 px de texte à 360, 227 à 390 pour « Appel en cours · Ben Durand · 00:03 » en demandant ≈ 258) le préfixe disparaît — sans quoi le NOM disparaît à sa place', !!MEDIA_PREFIXE);
vrai('et il ne disparaît pas au-dessus (ni tablette ni bureau : pas de règle `display: none` du préfixe hors de ce média)', (style.match(/texte-prefixe[^{]*\{[^}]*display: none/g) || []).length === 1);
v('le conteneur est un flex (nom et durée côte à côte)', C.gagne(R, CONT, 'display'), 'flex');
vrai('⛔ le conteneur n\'a PAS d\'ellipse à lui : c\'est elle qui mangeait la fin, durée comprise', C.gagne(R, CONT, 'text-overflow') === undefined);
vrai('le conteneur peut rétrécir dans la barre (flex: 1, min-width: 0) — sinon « Revenir » et le rond rouge sortiraient', C.gagne(R, CONT, 'flex') === '1' && C.gagne(R, CONT, 'min-width') === '0');

/* 3. le code qui écrit */
const maj = C.decl(JS, 'function majBarreAppel(');
vrai('(population) majBarreAppel est trouvée', maj.length > 100);
vrai('majBarreAppel écrit le nom et la durée dans LEURS morceaux', /\$\('appel-barre-nom'\)/.test(maj) && /\$\('appel-barre-duree'\)/.test(maj) && /\.textContent !== t\.qui/.test(maj) && /\.textContent !== t\.duree/.test(maj));
vrai('⛔ elle n\'écrit plus un texte unique dans le conteneur (ça effacerait les deux morceaux)', !/\$\('appel-barre-texte'\)/.test(maj));
vrai('l\'étiquette vocale du bouton « Revenir » garde le nom ET la durée', /setAttribute\('aria-label', 'Revenir à l\\'appel — ' \+ t\.nom \+ t\.duree\)/.test(maj));

fin();
