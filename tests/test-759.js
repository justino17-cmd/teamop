/* ══ LE DOCUMENT CONTRE LE CODE ══════════════════════════════════════════════════════════
   Justin a fourni `design/THEME-REFERENCE.md` le 22 septembre 2026 : « regarde bien que tout
   le reste soit comme le thème ». Ce banc ne garde pas des valeurs RECOPIÉES d'un document —
   il RELIT le document et le compare à `app.html`. La différence compte :

   ⛔⛔ CE DÉPÔT A DÉJÀ PAYÉ EXACTEMENT CE PIÈGE. `tests/test-757.js` exigeait « le verre de
   jour est à 34 %, pas 58 % » — un réglage fait à l'œil, gardé comme une vérité. Le document
   dit .58, et il dit AUSSI liseré .72, reflet .85, ombre 0 10px 28px : c'est un ENSEMBLE.
   À .34 avec un liseré à .85, le liseré était plus opaque que la vitre qu'il borde. Le banc
   gardait une moitié d'accord, et il l'a gardée sans que personne ne puisse s'en apercevoir.
   La règle de CLAUDE.md, appliquée à un thème : « une garde décrite dans un fichier n'est pas
   une garde — aller lire le code qui crie. » Ici, le fichier EST relu.

   ⛔ ET LES ÉCARTS SONT DÉCLARÉS, UN PAR UN, AVEC LEUR RAISON. Trois jetons du document ne
   sont pas repris tels quels ; chacun figure dans `ECARTS` ci-dessous. En ajouter un oblige à
   écrire pourquoi — c'est le même mécanisme que « vu et pas surveillé » de `test-726`, et il
   existe pour la même raison : un écart tacite se transforme en oubli en une semaine.       */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
const DOC = fs.readFileSync(__dirname + '/../design/THEME-REFERENCE.md', 'utf8');
/* ⛔ On retire les commentaires du CODE avant de chercher : ce dépôt cite ses propres valeurs
   dans les commentaires qui les expliquent, et un motif qui tombe dans un commentaire garde
   une phrase, pas un comportement. Nettoyage SÛR (blocs qui commencent une ligne) — le motif
   naïf avale 107 069 caractères d'app.html, dont `saveVehicule` entière. */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      document : ' + JSON.stringify(b) + '\n      app.html : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + d : '')); } };

/* ⛔ TOUT ÉCART AU DOCUMENT SE DÉCLARE ICI, AVEC SA RAISON ET SA MESURE. */
const ECARTS = {
  'fond de nuit': `le document dit #0a0a0c→#000 ; on garde le bleu nuit #101A2E→#0A1120.
     Deux raisons, et la première est une mesure : Justin, 22 septembre 2026, capture à
     l'appui sur son Mac — « revois les nuances de couleur, je la trouve moins belle l'app »,
     sur la version qui portait le noir du document. La seconde est écrite dans CLAUDE.md
     (apple-visual-craft § 8) : pas de noir pur — halation du blanc sur OLED, contraste dur.
     Le document lui-même l'applique à sa palette Marine (« jamais noir pur »).`,
  'teinte de la surface de nuit': `le document dit rgba(44,44,46,.55), un gris neutre ; on
     garde son ALPHA (.55) et on teinte en bleu nuit rgba(44,56,84,.55). Conséquence directe
     de l'écart ci-dessus, lui-même mesuré : un film gris posé sur une page bleu
     nuit se voit, et se voit mal. L'ALPHA du document, lui, est tenu — c'est exactement
     ce que ce banc vérifie plus bas.`,
  'force du reflet': `le document décrit le reflet comme un inset 0 1px 0 rgba(255,255,255,.85)
     — on le POSE bien, dans --vr-ombre. Mais ce dépôt peint EN PLUS un dégradé à 135°, qui
     donne la matière et s'AJOUTE à la surface. Empilé tel quel sur .58, le coin clair montait
     à .58 + .42×.65 = .85 : un aplat blanc. Ramené à .22, il plafonne à .67, sous le liseré
     (.72), qui redevient la ligne la plus lumineuse de la carte. Mesuré au navigateur après
     coup : la carte est peinte en rgba(255,255,255,0.58), dégradé à .22 par-dessus.`,
  'largeur de la sidebar': `le document dit 236 px ; on met 258. Mesuré au navigateur, tuile
     d'icône comprise : 149 px restaient au libellé et « Consommation produits » en demande
     163 — trois rubriques passaient sur deux lignes (59 px contre 44). Les maquettes du
     document sont écrites en anglais ; la règle du dépôt tranche : « un libellé français est
     plus long — toute grille copiée d'une référence anglophone doit être ÉLARGIE. »
     Mesuré après : 171 px disponibles, zéro rubrique sur deux lignes.`,
  'une neuvième teinte': `le document en nomme huit et n'a pas de rouge ; on garde \`red\`
     EN PLUS de \`graphite\`. Retirer une teinte que quelqu'un a peut-être choisie laisserait
     --acc-src vide, donc tuerait les treize jetons dérivés — la panne exacte du 11 au
     22 septembre 2026, mesurée au navigateur (--acc-src vide, les treize dérivés morts). Une couleur ne se retire pas d'une palette que des gens utilisent.
     Sa valeur est alignée sur le rouge système iOS du document (#ff3b30 / #ff453a).`,
  'encre sur accent': `le document dit « #fff, et #0b1426 sur les teintes claires ». Appliqué
     tel quel, le blanc tombe à 3,41:1 sur le rouge de nuit et 3,52:1 sur le rose — sous le
     plancher. On garde la TEINTE du document et on prend l'encre qui contraste le plus, ce
     qui est déjà la règle d'encreSur() pour « Ma couleur » : la palette nommée et la couleur
     personnalisée obéissent ainsi au même principe. Tout est ≥ 4,4:1, mesuré.`,
};

console.log('\n══ 0. LE DOCUMENT EST BIEN LÀ ET IL EST ENTIER ══\n');
/* ⛔ Une ancre qui ne se trouve pas rend une tranche vide, et une tranche vide passe au vert
   sur TOUT. On prouve d'abord qu'il y a de quoi comparer. */
vrai('le fichier de référence existe et a de la matière', DOC.length > 20000, DOC.length + ' caractères');
vrai('   … et il porte bien la section des jetons', /## 1\. Typographie/.test(DOC) && /## 4\. Verre/.test(DOC));

console.log('\n══ 1. LES TEINTES D’ACCENT — LUES DANS LE DOCUMENT ══\n');
{
  /* « défaut vert : jour `#1f7a5c`, nuit `#4fd18a`. Autres : bleu #007aff/#0a84ff · … » */
  const L = DOC.split('\n').find(x => /défaut vert\s*:/.test(x));
  vrai('⛔ la ligne des accents est trouvée dans le document', !!L, L || '—');
  const attendu = {};
  if (L) {
    const g = L.match(/défaut vert\s*:\s*jour\s*`?(#[0-9a-f]{6})`?,\s*nuit\s*`?(#[0-9a-f]{6})`?/i);
    if (g) attendu.green = [g[1].toUpperCase(), g[2].toUpperCase()];
    const NOM = { bleu:'blue', indigo:'indigo', violet:'purple', rose:'pink',
                  orange:'orange', teal:'teal', graphite:'graphite' };
    for (const [fr, cle] of Object.entries(NOM)) {
      const m = L.match(new RegExp(fr + '\\s*(#[0-9a-f]{6})\\s*/\\s*(#[0-9a-f]{6})', 'i'));
      if (m) attendu[cle] = [m[1].toUpperCase(), m[2].toUpperCase()];
    }
  }
  v('⛔ le document donne bien HUIT teintes, chacune avec sa paire jour/nuit',
    Object.keys(attendu).length, 8);

  const jour = {}, nuit = {};
  for (const m of NU.matchAll(/html\[data-refonte\]\[data-accent="([a-z]+)"\]\s*\{\s*--acc-src:\s*(#[0-9A-Fa-f]{6})/g))
    jour[m[1]] = m[2].toUpperCase();
  for (const m of NU.matchAll(/html\[data-refonte\]\[data-theme="dark"\]\[data-accent="([a-z]+)"\]\s*\{\s*--acc-src:\s*(#[0-9A-Fa-f]{6})/g))
    nuit[m[1]] = m[2].toUpperCase();

  for (const [k, [j, n]] of Object.entries(attendu)) {
    v('« ' + k +' » de JOUR', jour[k] || '(absente)', j);
    v('« ' + k +' » de NUIT', nuit[k] || '(absente)', n);
  }
  /* ⛔ LA NEUVIÈME EST DÉCLARÉE, PAS TOLÉRÉE. */
  const enTrop = Object.keys(jour).filter(k => !attendu[k]);
  v('⛔ la seule teinte hors document est celle qui est DÉCLARÉE dans ECARTS',
    enTrop, ECARTS['une neuvième teinte'] ? ['red'] : []);
  v('   … et elle a aussi sa valeur de nuit', !!nuit.red, true);
}

console.log('\n══ 2. LE VERRE — LU DANS LE DOCUMENT (§ 4) ══\n');
{
  const ligne = (m) => DOC.split('\n').find(x => m.test(x)) || '';
  const flou = ligne(/backdrop-filter\s*:\s*blur/).match(/blur\([^)]+\)[^`]*/);
  vrai('⛔ la ligne du flou est trouvée', !!flou, ligne(/backdrop-filter/));
  v('le flou est celui du document',
    (NU.match(/--vr-flou:([^;]+);/) || [,''])[1].trim(),
    (flou ? flou[0] : '').replace(/`/g, '').trim());

  const surf = ligne(/^- Surface jour/);
  vrai('⛔ la ligne des surfaces est trouvée', !!surf, surf);
  const s4 = surf.match(/jour\s*`(rgba\([^)]+\))`,\s*secondaire\s*`(rgba\([^)]+\))`\s*;\s*nuit\s*`(rgba\([^)]+\))`,\s*secondaire\s*`(rgba\([^)]+\))`/);
  const sansEspace = (x) => (x || '').replace(/\s+/g, '');
  vrai('⛔ les quatre surfaces se lisent', !!s4, surf);
  if (s4) {
    v('surface de JOUR', sansEspace((NU.match(/html\[data-verre="1"\]\{[\s\S]*?--vr-fond:([^;]+);/) || [,''])[1]), sansEspace(s4[1]));
    v('surface secondaire de JOUR', sansEspace((NU.match(/html\[data-verre="1"\]\{[\s\S]*?--vr-fond2:([^;]+);/) || [,''])[1]), sansEspace(s4[2]));
    /* ⛔ ÉCART DÉCLARÉ : l'alpha du document, la teinte du dépôt. On garde l'ALPHA. */
    const fn = sansEspace((NU.match(/html\[data-verre="1"\]\[data-theme="dark"\]\{[\s\S]*?--vr-fond:([^;]+);/) || [,''])[1]);
    v('surface de NUIT — même ALPHA que le document (la teinte est un écart déclaré)',
      (fn.match(/,(\.[0-9]+)\)$/) || [,''])[1], (sansEspace(s4[3]).match(/,(\.[0-9]+)\)$/) || [,''])[1]);
    vrai('   … et l’écart de teinte est bien déclaré', !!ECARTS['teinte de la surface de nuit']);
    v('surface secondaire de NUIT (voile blanc du document)',
      sansEspace((NU.match(/html\[data-verre="1"\]\[data-theme="dark"\]\{[\s\S]*?--vr-fond2:([^;]+);/) || [,''])[1]), sansEspace(s4[4]));
  }

  const lis = ligne(/^- Liseré/);
  const l2 = lis.match(/`\.5px solid (rgba\([^)]+\))`\s*\(jour\)\s*\/\s*`(rgba\([^)]+\))`/);
  vrai('⛔ la ligne du liseré se lit', !!l2, lis);
  if (l2) {
    v('liseré de JOUR', sansEspace((NU.match(/html\[data-verre="1"\]\{[\s\S]*?--vr-liseret:([^;]+);/) || [,''])[1]), sansEspace(l2[1]));
    v('liseré de NUIT', sansEspace((NU.match(/html\[data-verre="1"\]\[data-theme="dark"\]\{[\s\S]*?--vr-liseret:([^;]+);/) || [,''])[1]), sansEspace(l2[2]));
  }
  /* ⛔ LE POINT QUI A ÉTÉ MANQUÉ PENDANT UNE JOURNÉE : le liseré doit rester MOINS opaque que
     la vitre, sinon il est plus lumineux que ce qu'il borde et la carte cesse d'être une vitre. */
  const aFond = parseFloat((sansEspace(s4 ? s4[1] : '').match(/,(\.[0-9]+)\)/) || [,'0'])[1]);
  const aRefl = parseFloat(((NU.match(/--vr-reflet:linear-gradient\(135deg,rgba\(255,255,255,(\.[0-9]+)\)/) || [,'0'])[1]));
  const aLis  = parseFloat((sansEspace(l2 ? l2[1] : '').match(/,(\.[0-9]+)\)/) || [,'0'])[1]);
  const pointClair = aFond + (1 - aFond) * aRefl;
  vrai('⛔⛔ le point le plus clair de la vitre reste SOUS le liseré',
    pointClair < aLis, 'vitre+reflet = ' + pointClair.toFixed(3) + ' · liseré = ' + aLis);

  const omb = ligne(/^- Ombre carte/);
  /* ⚠ LE DOCUMENT PORTE DEUX FOIS CETTE LIGNE — un résumé au § 4 et la version détaillée plus
     bas — et elles ne sont pas écrites pareil (« (jour) » n'est que dans la seconde). Un motif
     calé sur la seconde ne trouvait rien dans la première : tranche vide, donc vert sur tout.
     On vise ce que les DEUX ont en commun. */
  const o2 = omb.match(/`(0 \d+px \d+px rgba\([^)]+\))`[\s\S]*?barres\s*`(0 \d+px \d+px rgba\([^)]+\))`/);
  vrai('⛔ la ligne des ombres se lit', !!o2, omb);
  if (o2) {
    vrai('ombre de carte du document', new RegExp('--vr-ombre:' + o2[1].replace(/[()]/g, c => '\\' + c) + ',').test(sansEspace(NU).replace(/,/g, ',')) || NU.includes('--vr-ombre:' + o2[1] + ','), o2[1]);
    vrai('ombre de barre du document', NU.includes('--vr-ombre-barre:' + o2[2] + ','), o2[2]);
  }
  const ref = ligne(/^- Reflet interne/);
  const r2 = ref.match(/`(inset 0 1px 0 rgba\([^)]+\))`/);
  vrai('⛔ le reflet interne du document est POSÉ (dans l’ombre)', !!r2 && NU.includes(r2[1]), ref);
}

console.log('\n══ 3. LES COULEURS DE CATÉGORIE — PALETTE iOS DU DOCUMENT ══\n');
{
  /* « palette iOS : bleu #007aff, vert #34c759, orange #ff9500, rouge #ff3b30, violet
     #af52de, indigo #5856d6, teal #30b0c7, rose #ff2d55, gris #8e8e93 » */
  const L = DOC.split('\n').find(x => /palette iOS\s*:/.test(x) && /#34c759/i.test(x)) || '';
  vrai('⛔ la ligne de la palette de catégories est trouvée', !!L, L.slice(0, 90));
  const att = {};
  for (const m of L.matchAll(/(bleu|vert|orange|rouge|violet|indigo|teal|rose|gris)\s*`?(#[0-9a-f]{6})/gi))
    att[m[1].toLowerCase()] = m[2].toUpperCase();
  v('⛔ le document donne bien NEUF couleurs de catégorie', Object.keys(att).length, 9);
  const m = NU.match(/const CAT_COUL_IOS=\{[\s\S]*?\};/);
  vrai('⛔ la table CAT_COUL_IOS est trouvée dans app.html', !!m);
  const T = m ? new Function('return ' + m[0].replace('const CAT_COUL_IOS=', '').replace(/;$/, '') + ';')() : {};
  for (const [k, hx] of Object.entries(att)) v('catégorie « ' + k + ' »', (T[k] || '(absente)'), hx);

  /* ⛔ UNE COULEUR DÉCLARÉE ET JAMAIS EMPLOYÉE EST DU STYLE MORT ; UNE RUBRIQUE QUI POINTE
     VERS UNE COULEUR ABSENTE REND `undefined` ET LA TUILE DEVIENT GRISE SANS UN MOT. */
  const mc = NU.match(/const CAT_COUL=\{[\s\S]*?\n\};/);
  vrai('⛔ la table CAT_COUL est trouvée', !!mc);
  const C = mc ? new Function('return ' + mc[0].replace('const CAT_COUL=', '').replace(/;$/, '') + ';')() : {};
  const inconnues = [...new Set(Object.values(C))].filter(x => !T[x]);
  v('⛔ aucune rubrique ne pointe vers une couleur qui n’existe pas', inconnues, []);
  vrai('   … et il y a bien de quoi compter', Object.keys(C).length > 30, Object.keys(C).length + ' rubriques');

  /* ⛔ LA COULEUR DE RUBRIQUE NE SE PERSONNALISE PAS : c'est un repère d'emplacement. Si elle
     suivait --acc, tout le menu deviendrait violet et on perdrait « Interventions, c'est le
     vert en haut ». On vérifie que la table ne contient aucune variable. */
  vrai('⛔ aucune couleur de catégorie ne dépend de la teinte choisie par la personne',
    !/var\(--acc/.test(m ? m[0] : ''), m ? m[0].slice(0, 80) : '');
  /* ⛔ ET LA TUILE EST BRANCHÉE — déclarer une table que personne n'appelle est du code mort
     qui a l'air d'une garde. */
  vrai('⛔ catCoul() est appelée au rendu du menu', /class="ico" style="--cat:\$\{catCoul\(/.test(NU));
  vrai('⛔ et la tuile a bien un style qui la peint',
    /\.nav-item \.ico\{[\s\S]{0,300}var\(--cat/.test(APP));
  /* ⛔ Le filtre de désaturation général rendait TOUT gris : la tuile doit le neutraliser. */
  vrai('⛔ la désaturation générale est neutralisée sur la tuile',
    /\.nav-item \.ico\{[\s\S]{0,300}filter:none/.test(APP));
}

console.log('\n══ 4. RAYONS ET TAILLES DU DOCUMENT (§ 5) ══\n');
{
  vrai('carte en verre : 26 px', /html\[data-verre="1"\]\{ --rf-r-carte:26px/.test(APP));
  vrai('Android : 28 px', /--rf-r-carte:28px/.test(APP));
  vrai('Windows : 8 px de carte, 9 px de fenêtre', /--rf-r-carte:8px;\s*--rf-r-fenetre:9px/.test(APP));
  vrai('boutons en pilule', /--r-pill:999px/.test(APP));
  /* ⛔ ÉCART DÉCLARÉ : la sidebar. */
  const sb = (APP.match(/html\[data-kind="desktop"\] \.sidebar\{width:(\d+)px\}/) || [,''])[1];
  vrai('⛔ la sidebar de bureau s’écarte du document, et l’écart est DÉCLARÉ',
    sb === '258' && !!ECARTS['largeur de la sidebar'], 'sidebar = ' + sb + ' px');
  vrai('⛔ cibles tactiles ≥ 44 px', /min-height:44px/.test(APP));
}

console.log('\n══ 5. LES ÉCARTS SONT TOUS MOTIVÉS ══\n');
{
  /* ⛔ Un écart sans raison écrite est un oubli qui a l'air d'une décision. */
  for (const [k, r] of Object.entries(ECARTS))
    vrai('« ' + k + ' » porte une raison écrite', typeof r === 'string' && r.trim().length > 120,
      k + ' : ' + String(r).length + ' caractères');
  vrai('⛔ et chaque écart cite une MESURE ou une règle du dépôt, pas un goût',
    Object.values(ECARTS).every(r => /[Mm]esuré|CLAUDE\.md|règle du dépôt|capture à\s*\n?\s*l'appui|plancher/.test(r)));
}

console.log('\n═══ test-759 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
