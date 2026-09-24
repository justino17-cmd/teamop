/* ══ LE DOCUMENT CONTRE LE CODE ══════════════════════════════════════════════════════════
   Justin a fourni son thème FINAL le 24 septembre 2026 — « voilà mon thème final pour OP GESTION,
   je veux que tu l'appliques, que tu le vérifies, que tu le testes de A à Z ». La référence est
   `design/THEME-REFERENCE.md` ; ce banc ne garde pas des valeurs RECOPIÉES d'un document, il
   RELIT le bloc `jetons` du document et le compare à `app.html`, valeur par valeur.

   ⛔⛔ CE DÉPÔT A DÉJÀ PAYÉ LE PIÈGE INVERSE. `tests/test-757.js` exigeait un jour « le verre de
   jour est à 34 %, pas 58 % » — un réglage fait à l'œil, gardé comme une vérité. Un banc qui
   recopie des valeurs garde une croyance ; un banc qui relit la source garde un accord.

   ⛔ ET LES ÉCARTS SONT DÉCLARÉS, UN PAR UN, AVEC LEUR RAISON ET LEUR MESURE (`ECARTS`). En
   ajouter un oblige à écrire pourquoi — le même mécanisme que « vu et pas surveillé » de
   `test-726` : un écart tacite se transforme en oubli en une semaine.
   (La référence du 22 septembre et son banc sont dans l'historique : `design/archives/`.) */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
const DOC = fs.readFileSync(__dirname + '/../design/THEME-REFERENCE.md', 'utf8');
/* ⛔ On retire les commentaires du CODE avant de chercher (nettoyage SÛR : blocs qui commencent
   une ligne) — un motif qui tombe dans un commentaire garde une phrase, pas un comportement. */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      document : ' + JSON.stringify(b) + '\n      app.html : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + d : '')); } };
const net = x => String(x || '').replace(/\s+/g, '').toLowerCase();

/* ⛔ TOUT ÉCART AU DOCUMENT SE DÉCLARE ICI, AVEC SA RAISON ET SA MESURE. */
const ECARTS = {
  'le nom et le logo': `la maquette écrit « TEAM OP » (et son logo) sous le thème TEAM OP ; on garde
     « OP GESTION » et le logo OP GESTION dans les DEUX thèmes, sur tous les appareils. Décision de
     Justin, 24 septembre 2026 à 21 h 51, capture de la maquette à l'appui : « pour tous les types
     d'appareil tu mets bien OP GESTION avec le logo OP GESTION ». Le thème ne change que les
     couleurs ; le § 0 du document l'écrit désormais.`,
  'les halos': `le THEME.md du dossier parle de « trois halos animés derrière le verre » ; la source
     finale (\`OP Gestion Apple.dc.html\`) les DÉFINIT mais n'en peint aucun — aucun élément ne lit
     orb1, orb2, orb3. Mesuré sur les captures de la maquette (jour et nuit, iPhone et Mac) : pas
     un halo. On suit ce que Justin a regardé : le fond est le seul dégradé du thème, et la couche
     qui les portait est éteinte (une couche peinte en moins, qui tournait en boucle).`,
  'second plan en couleur pleine': `la maquette écrit son second plan en rgba (.62 le jour) ; on
     l'écrit en couleurs PLEINES, calculées sur la vitre posée sur la page — #454C5B et #5A616F
     le jour, #B8C0CD et #ABB3C2 la nuit (TEAM OP). Mesuré plus bas, au PIRE point de chaque
     page : ≥ 4,5:1 sur la vitre dans les quatre cas. Une encre translucide change de contraste avec tout ce qui passe dessous ;
     une encre pleine tient partout, et c'est la règle du dépôt (le calcul ment sous le verre).`,
  'second plan de nuit OP GESTION': `la maquette écrit rgba(196,224,214,.72) ; au point le plus
     clair de la page de nuit du vert forêt (le haut du dégradé, sous la diagonale), sur la vitre,
     il tombe à 3,4:1 — sous le plancher, et même 92 % n'y rend que 4,40. Mesuré : la menthe PLEINE
     (#C4E0D6) y tient 5,0:1. La teinte est gardée, seule la force change.`,
  'feuille de nuit': `la maquette pose ses feuilles de nuit sur rgba(28,28,30,.7), un gris neutre ;
     on les teinte du thème (bleu nuit pour TEAM OP, vert forêt pour OP GESTION) et on les
     densifie (.86–.88). La règle du dépôt, écrite après la capture de Justin du 22 septembre :
     « un film gris posé sur une page bleu nuit se voit, et se voit mal » ; et une fenêtre se pose
     sur une scène assombrie — son verre doit être DENSE (mesuré au pixel, 22 septembre 2026).`,
  'encre sur le vert et le graphite': `la maquette écrit du blanc sur toutes les teintes système ;
     mesuré, le blanc tombe à 2,2:1 sur le vert (#34c759) et 4,27:1 sur le bouton graphite dérivé.
     On garde la TEINTE de la maquette et on prend l'encre qui contraste le plus — la règle
     d'encreSur() — et le graphite garde le remplissage de la maquette (#636366). test-757 calcule
     chaque combinaison : toutes ≥ 4,5:1.`,
  'largeur de la sidebar': `le document dit 236 px ; on met 258. Mesuré au navigateur, tuile
     d'icône comprise : 149 px restaient au libellé et « Consommation produits » en demande 163 —
     trois rubriques passaient sur deux lignes. Les maquettes sont écrites en anglais ; la règle du
     dépôt tranche : « un libellé français est plus long — toute grille copiée d'une référence
     anglophone doit être ÉLARGIE ». Mesuré après : 171 px disponibles, zéro rubrique sur deux lignes.`,
  'une douzième teinte': `le document en nomme onze et n'a pas de rouge ; on garde \`red\` EN PLUS,
     sans le proposer. Retirer une teinte que quelqu'un a peut-être choisie laisserait --acc-src
     vide, donc tuerait les treize jetons dérivés — la panne mesurée du 11 au 22 septembre 2026.
     Il n'est montré dans « Thème et couleur » qu'à qui le porte déjà (règle du dépôt).`,
};

console.log('\n══ 0. LE DOCUMENT EST BIEN LÀ ET IL EST ENTIER ══\n');
const bloc = (DOC.match(/```jetons\n([\s\S]*?)```/) || [, ''])[1];
const J = {};
bloc.split('\n').forEach(l => { const m = l.match(/^([\w.-]+)\s*=\s*(.+)$/); if (m) J[m[1]] = m[2].trim(); });
/* ⛔ Une ancre qui ne se trouve pas rend une tranche vide, et une tranche vide passe au vert sur
   TOUT : on compte la population avant de croire le moindre verdict. */
vrai('le document existe et a de la matière', DOC.length > 6000, DOC.length + ' caractères');
vrai('⛔ le bloc « jetons » est lu, et il est entier', Object.keys(J).length >= 70, Object.keys(J).length + ' jetons');
vrai('   … il porte les deux thèmes, le verre, les teintes, les catégories et les rayons',
  ['theme.teamop.A', 'theme.opgestion.A', 'verre.jour.surface', 'teinte.teamop', 'categorie.sapin', 'rayon.carte.natif'].every(k => J[k]));
vrai('⛔ le § 0 du document dit bien « OP GESTION et son logo, partout »',
  /OP GESTION, partout/.test(DOC) && /logo OP GESTION/.test(DOC));

/* Une règle CSS de la page, trouvée par son sélecteur EXACT. */
const regle = (sel) => { const i = NU.indexOf(sel + '{'); if (i < 0) return ''; const f = NU.indexOf('}', i); return NU.slice(i + sel.length + 1, f); };
const jeton = (corps, nom) => { const m = corps.match(new RegExp('(?:^|[;\\s{])' + nom.replace(/-/g, '\\-') + ':([^;]+);')); return m ? m[1].trim() : ''; };

console.log('\n══ 1. LES DEUX THÈMES — la page et l’encre ══\n');
for (const mq of ['teamop', 'opgestion']) {
  const jour = regle('html[data-marque="' + mq + '"][data-verre][data-theme="light"]');
  const nuit = regle('html[data-marque="' + mq + '"][data-verre][data-theme="dark"]');
  vrai('⛔ les règles de jour ET de nuit du thème « ' + mq + ' » sont trouvées', jour.length > 100 && nuit.length > 100);
  v(mq + ' — encre de jour', jeton(jour, '--t1'), J['theme.' + mq + '.encre.jour']);
  v(mq + ' — encre de nuit', jeton(nuit, '--t1'), J['theme.' + mq + '.encre.nuit']);
  const pj = net(jeton(jour, '--vr-page')), pn = net(jeton(nuit, '--vr-page'));
  /* Le fond de jour : diagonale à 112°, halo A en haut à gauche, halo C en bas à droite, puis B
     vers le clair — dans CET ordre (le premier fond peint est le dernier écrit). */
  const pos = ['A', 'C', 'B', 'clair'].map(k => pj.indexOf(net(J['theme.' + mq + '.' + k]) + ' '.trim()));
  vrai(mq + ' — le fond de jour porte A, C, B et le clair, dans l’ordre de la maquette',
    pos.every(p => p > 0) && pos[0] < pos[1] && pos[1] < pos[2] && pos[2] < pos[3], JSON.stringify(pos));
  vrai(mq + ' — … et la diagonale blanche à 112° (35 % de jour)', pj.startsWith('linear-gradient(112deg,') && pj.includes('rgba(255,255,255,.35)58.2%'));
  vrai(mq + ' — le fond de nuit va du haut au bas du thème', pn.includes(net('linear-gradient(160deg,' + J['theme.' + mq + '.nuit.haut'] + ',' + J['theme.' + mq + '.nuit.bas'] + ')')));
  vrai(mq + ' — … avec la diagonale à 5 %', pn.includes('rgba(255,255,255,.05)58.2%'));
  /* ⛔ Un dégradé qui finit sur `transparent` passe par du noir (CLAUDE.md) : chaque arrêt
     transparent garde sa teinte. */
  vrai(mq + ' — aucun arrêt « transparent » dans le fond (il salit le bord)', !/transparent/.test(pj + pn));
}

console.log('\n══ 2. LE VERRE — lu dans le document (§ 4) ══\n');
{
  const jour = regle('html[data-marque][data-verre][data-theme="light"]');
  const nuit = regle('html[data-marque][data-verre][data-theme="dark"]');
  vrai('⛔ les deux règles de matière sont trouvées', jour.length > 500 && nuit.length > 500);
  const paires = [['flou', '--vr-flou'], ['surface', '--vr-fond'], ['surface2', '--vr-fond2'], ['liseret', '--vr-liseret'],
    ['reflet', '--vr-reflet'], ['ombre', '--vr-ombre'], ['ombre-barre', '--vr-ombre-barre'], ['barre', '--tf-barre'],
    ['cote', '--tf-cote'], ['kpi', '--tf-kpi'], ['curseur', '--tf-curseur'], ['entete', '--tf-entete']];
  for (const [k, css] of paires) {
    v('jour — ' + k, net(jeton(jour, css)), net(J['verre.jour.' + k]));
    v('nuit — ' + k, net(jeton(nuit, css)), net(J['verre.nuit.' + k]));
  }
  v('jour — la feuille (verre dense des fenêtres et de « Créer »)', net(jeton(jour, '--vr-fond-dense')), net(J['verre.jour.feuille']));
  /* ⛔ ÉCART DÉCLARÉ : la feuille de nuit est teintée du thème et plus dense que la maquette. */
  const fn = [regle('html[data-marque="teamop"][data-verre][data-theme="dark"]'), regle('html[data-marque="opgestion"][data-verre][data-theme="dark"]')]
    .map(c => jeton(c, '--vr-fond-dense'));
  const alphas = fn.map(x => parseFloat((x.match(/,\s*(0?\.\d+|1)\)$/) || [, '0'])[1]));
  const aDoc = parseFloat((J['verre.nuit.feuille'].match(/,\s*(0?\.\d+)\)$/) || [, '0'])[1]);
  vrai('nuit — la feuille est AU MOINS aussi dense que la maquette (écart déclaré : teinte du thème)',
    alphas.every(a => a >= aDoc) && !!ECARTS['feuille de nuit'], fn.join(' · ') + ' / document ' + J['verre.nuit.feuille']);
  v('la bulle de l’onglet choisi, jour', net(jeton(jour, '--tf-bulle')), net(J['bulle.jour']));
  v('   … nuit', net(jeton(nuit, '--tf-bulle')), net(J['bulle.nuit']));
  v('son ombre, jour', net(jeton(jour, '--tf-bulle-ombre')), net(J['bulle.jour.ombre']));
  v('   … nuit', net(jeton(nuit, '--tf-bulle-ombre')), net(J['bulle.nuit.ombre']));
  /* ⛔ Le verre ne s'applique pas qu'à moitié : les deux réglages système le retirent. */
  vrai('⛔ la transparence réduite retire le flou des nouvelles surfaces',
    /@media \(prefers-reduced-transparency: reduce\)\{\s*html\[data-marque\]\[data-verre\]\{background:var\(--tf-page-plein\)!important\}/.test(NU));
  vrai('⛔ un navigateur sans flou reçoit des surfaces PLEINES (une vitre sans flou, c’est du texte sur du texte)',
    /@supports not \(\(-webkit-backdrop-filter:blur\(1px\)\) or \(backdrop-filter:blur\(1px\)\)\)/.test(NU));
  /* ÉCART DÉCLARÉ : les halos ne sont pas peints. */
  vrai('les halos sont éteints, comme dans la source (écart déclaré)',
    /html\[data-marque\]\[data-verre\] body::after\{display:none!important\}/.test(NU) && !!ECARTS['les halos']);
}

console.log('\n══ 3. LES TEINTES — lues dans le document (§ 3) ══\n');
{
  const T = {};
  for (const [k, val] of Object.entries(J)) if (k.startsWith('teinte.')) {
    const p = val.split('/').map(x => x.trim()); T[k.slice(7)] = { jour: p[0], nuit: p[1], fillJ: p[2], fillN: p[3], rgb: p[4] };
  }
  v('⛔ le document donne bien ONZE teintes', Object.keys(T).length, 11);
  const m = NU.match(/const ACCENTS = \{[^}]+\}/);
  const ACC = m ? new Function('return ' + m[0].replace('const ACCENTS = ', '') + ';')() : {};
  const mp = NU.match(/const ACCENTS_PROPOSES = \[[^\]]+\]/);
  const PROP = mp ? new Function('return ' + mp[0].replace('const ACCENTS_PROPOSES = ', '') + ';')() : [];
  v('⛔ les teintes PROPOSÉES sont exactement les onze du document', PROP.slice().sort(), Object.keys(T).sort());
  v('   … et la palette complète n’en a qu’une de plus, DÉCLARÉE (le rouge)',
    Object.keys(ACC).filter(k => !T[k]), ECARTS['une douzième teinte'] ? ['red'] : []);
  for (const [k, t] of Object.entries(T)) {
    const sj = (NU.match(new RegExp('html\\[data-refonte\\]\\[data-accent="' + k + '"\\]\\s*\\{\\s*--acc-src:(#[0-9A-Fa-f]{6})')) || [, ''])[1].toUpperCase();
    const sn = (NU.match(new RegExp('html\\[data-refonte\\]\\[data-theme="dark"\\]\\[data-accent="' + k + '"\\]\\s*\\{\\s*--acc-src:(#[0-9A-Fa-f]{6})')) || [, ''])[1].toUpperCase();
    v('« ' + k + ' » de JOUR', sj, t.jour.toUpperCase());
    v('« ' + k + ' » de NUIT', sn, t.nuit.toUpperCase());
    if (t.fillJ !== '-') {
      const fj = (NU.match(new RegExp('html\\[data-refonte\\]\\[data-theme="light"\\]\\[data-accent="' + k + '"\\]\\s*\\{[^}]*--acc-fill:(#[0-9A-Fa-f]{6})')) || [, ''])[1].toUpperCase();
      const fn = (NU.match(new RegExp('html\\[data-refonte\\]\\[data-theme="dark"\\]\\[data-accent="' + k + '"\\]\\s*\\{[^}]*--acc-fill:(#[0-9A-Fa-f]{6})')) || [, ''])[1].toUpperCase();
      v('   son remplissage de jour (le « Créer »)', fj, t.fillJ.toUpperCase());
      v('   … et de nuit', fn, t.fillN.toUpperCase());
    }
    const rgb = (NU.match(new RegExp('html\\[data-marque\\]\\[data-accent="' + k + '"\\]\\s*\\{\\s*--tf-acc-rgb:([\\d,]+);')) || [, ''])[1];
    v('   son voile (rubrique active, action de liste)', rgb, t.rgb);
  }
  vrai('⛔ sans choix, la teinte est celle du THÈME (TEAM OP par défaut)',
    /function getAccent\(\)\{ return localStorage\.getItem\('elan_accent'\)\|\|MARQUES\[getMarque\(\)\]\.accent; \}/.test(NU)
    && /return MARQUES\[m\]\?m:'teamop'/.test(NU));
}

console.log('\n══ 4. LES CATÉGORIES — une couleur par rubrique, jour et nuit (§ 6) ══\n');
{
  const att = {};
  for (const [k, val] of Object.entries(J)) if (k.startsWith('categorie.')) att[k.slice(10)] = val.split('/').map(x => x.trim().toUpperCase());
  v('⛔ le document donne bien DOUZE familles', Object.keys(att).length, 12);
  const m = NU.match(/const CAT_TEINTES=\{[\s\S]*?\};/);
  vrai('⛔ la table CAT_TEINTES est trouvée dans app.html', !!m);
  const T = m ? new Function('return ' + m[0].replace('const CAT_TEINTES=', '').replace(/;$/, '') + ';')() : {};
  for (const [k, [j, n]] of Object.entries(att)) v('famille « ' + k + ' »', (T[k] || []).map(x => x.toUpperCase()), [j, n]);
  const mc = NU.match(/const CAT_COUL=\{[\s\S]*?\n\};/);
  const C = mc ? new Function('return ' + mc[0].replace('const CAT_COUL=', '').replace(/;$/, '') + ';')() : {};
  v('⛔ aucune rubrique ne pointe vers une famille qui n’existe pas', [...new Set(Object.values(C))].filter(x => !T[x]), []);
  vrai('   … et il y a bien de quoi compter', Object.keys(C).length > 40, Object.keys(C).length + ' rubriques');
  /* Les rubriques que la maquette nomme sont dans la famille qu'elle leur donne. */
  const maq = { dashboard: 'gris', interventions: 'bleu', planning: 'orange', enveloppes: 'orange', clients: 'indigo', utilisateurs: 'indigo',
    devis: 'violet', fournisseurs: 'violet', factures: 'vert', plans: 'vert', boxes: 'sapin', messagerie: 'sapin', produits: 'cyan',
    contrats: 'cyan', mouvements: 'rouge', demandes: 'rouge', registre: 'ambre', bons: 'ciel', rapports: 'ciel', vehicules: 'ardoise', historique: 'ardoise' };
  v('⛔ les rubriques de la maquette sont dans SA famille', Object.keys(maq).filter(k => C[k] !== maq[k]), []);
  vrai('⛔ aucune couleur de catégorie ne dépend de la teinte choisie', !/var\(--acc/.test(m ? m[0] : ''));
  /* ⛔ ET LA TUILE EST BRANCHÉE : la table, le menu (deux sites), « Créer », les tuiles chiffrées. */
  v('⛔ catVars() peint la tuile du menu aux DEUX endroits (menu et favoris)', (NU.match(/class="ico" style="\$\{catVars\(/g) || []).length, 2);
  vrai('   … la feuille « Créer »', /class="creer-ic" style="\$\{catVars\(e\.k\)\}"/.test(NU));
  vrai('   … et les tuiles du tableau de bord', /class="kpi-ico" style="\$\{catVars\(c\.view\)\}"/.test(NU));
  vrai('⛔ la feuille choisit la couleur de NUIT la nuit', /html\[data-marque\]\[data-theme="dark"\] \.nav-item \.ico,[\s\S]{0,160}\{--cat:var\(--cat-n,var\(--cat-j,#8E8E93\)\)\}/.test(NU));
  vrai('⛔ la tuile est à 13 % le jour et 20 % la nuit, comme la maquette',
    /\.nav-item \.ico,\s*html\[data-marque\]\[data-refonte\] \.nav-item\.active \.ico\{\s*background:color-mix\(in srgb,var\(--cat\) 13%,transparent\)/.test(NU)
    && /\.nav-item\.active \.ico\{background:color-mix\(in srgb,var\(--cat\) 20%,transparent\)/.test(NU));
}

console.log('\n══ 5. LES FORMES (§ 5) ══\n');
{
  const r = (sel) => jeton(regle(sel), '--rf-r-carte');
  v('carte, Liquid Glass natif', r('html[data-marque][data-verre][data-verre-natif]'), J['rayon.carte.natif']);
  v('carte, Android', r('html[data-marque][data-verre][data-os="android"]'), J['rayon.carte.android']);
  v('carte, Windows', r('html[data-marque][data-verre][data-os="windows"]'), J['rayon.carte.windows']);
  v('carte, les autres (iOS 18, macOS 14)', r('html[data-marque][data-verre]'), J['rayon.carte.autre']);
  vrai('boutons en pilule (Windows : 6 px)', /html\[data-marque\]\[data-verre\]\[data-refonte\] \.btn\{border-radius:999px!important\}/.test(NU)
    && /html\[data-os="windows"\]\[data-marque\]\[data-verre\]\[data-refonte\] \.btn\{border-radius:6px!important\}/.test(NU));
  const sb = (APP.match(/html\[data-kind="desktop"\] \.sidebar\{width:(\d+)px\}/) || [, ''])[1];
  vrai('⛔ la sidebar de bureau s’écarte du document, et l’écart est DÉCLARÉ', sb === '258' && !!ECARTS['largeur de la sidebar'], 'sidebar = ' + sb + ' px');
  vrai('⛔ cibles tactiles ≥ 44 px (la capsule du menu, « Créer »)',
    /* (le sélecteur ne porte plus `.tb-back` : le retour de la barre est caché sous la refonte —
       relecture v745, une règle posée sur un élément qui ne paraît jamais) */
    /\.topbar \.menu-btn\{\s*width:44px!important;height:44px!important/.test(NU) && /\.topbar \.creer-btn\{\s*height:44px!important;min-height:44px!important/.test(NU));
}

console.log('\n══ 6. LE SECOND PLAN SE LIT (écart déclaré : couleurs pleines) ══\n');
{
  /* On CALCULE, sur la vitre de la maquette posée sur la page de chaque thème : le second plan
     (--t3) doit tenir 4,5:1. C'est la mesure que l'écart promet. */
  const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
  const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const sur = (a, fond) => fond.map(x => 255 * a + x * (1 - a));
  const cas = [];
  /* ⛔ ON MESURE LE PIRE POINT DE LA PAGE, PAS UN POINT PRIS AU HASARD. La première version
     prenait le bas du dégradé de nuit — le plus SOMBRE, donc le plus flatteur pour un texte
     clair : une mutation qui ramenait le second plan à 4,2:1 passait (mesuré le 24 septembre
     2026). La nuit, le pire est le point le plus CLAIR (le haut du dégradé, sous la diagonale à
     5 %) ; le jour, le point le plus SOMBRE des quatre couleurs du fond. */
  for (const mq of ['teamop', 'opgestion']) {
    const nuit = regle('html[data-marque="' + mq + '"][data-verre][data-theme="dark"]');
    const pagesJ = ['A', 'B', 'C', 'clair'].map(k => hex(J['theme.' + mq + '.' + k]));
    const pJ = pagesJ.reduce((a, b) => lum(a) <= lum(b) ? a : b);
    const pN = sur(.05, hex(J['theme.' + mq + '.nuit.haut']));
    const t3J = jeton(regle('html[data-marque][data-verre][data-theme="light"]'), '--t3'), t3N = jeton(nuit, '--t3');
    cas.push([mq + ' jour (point le plus sombre du fond)', ctr(hex(t3J), sur(.42, pJ))], [mq + ' nuit (point le plus clair du fond)', ctr(hex(t3N), sur(.085, pN))]);
  }
  vrai('⛔ il y a bien quatre cas à mesurer (un zéro sur rien ne prouve rien)', cas.length === 4 && cas.every(c => isFinite(c[1])));
  for (const [nom, c] of cas) vrai('second plan sur la vitre — ' + nom, c >= 4.5, c.toFixed(2) + ':1');
  vrai('   … et les écarts qui le promettent sont déclarés', !!ECARTS['second plan en couleur pleine'] && !!ECARTS['second plan de nuit OP GESTION']);
}

console.log('\n══ 7. LES ÉCARTS SONT TOUS MOTIVÉS ══\n');
{
  for (const [k, r] of Object.entries(ECARTS))
    vrai('« ' + k + ' » porte une raison écrite', typeof r === 'string' && r.trim().length > 160, k + ' : ' + String(r).length + ' caractères');
  /* La raison doit parler du JETON concerné, pas être un paragraphe recopié. */
  vrai('⛔ l’écart du nom cite bien la phrase de Justin', /OP GESTION avec le logo OP GESTION/.test(ECARTS['le nom et le logo']));
  vrai('⛔ celui des halos dit que la source ne les peint pas', /n'en peint aucun/.test(ECARTS['les halos']));
  vrai('⛔ celui de la sidebar donne bien la mesure qui manquait', /\b163\b/.test(ECARTS['largeur de la sidebar']) && /\b149\b/.test(ECARTS['largeur de la sidebar']));
  vrai('⛔ et chaque écart cite une MESURE, une règle du dépôt ou une décision de Justin, pas un goût',
    Object.values(ECARTS).every(r => /[Mm]esuré|règle du dépôt|CLAUDE\.md|Décision de\s*\n?\s*Justin|test-757/.test(r)));
  /* ⛔ ET L'ÉCART DU NOM EST TENU DANS LE CODE : `applyBrand` écrit OP GESTION dans les deux
     branches ordinaires, jamais le nom du thème ; la connexion écrit OP GESTION. */
  /* ⚠ L'ancre de fin est du CODE (`const pl=$('brand-plan')`) : le commentaire « // Nom du
     forfait » qui la précède est retiré par le nettoyage, et une ancre dans un commentaire rendait
     une tranche VIDE — mesuré à la première exécution. */
  const ab = (NU.match(/function applyBrand\(\)\{[\s\S]*?const pl=\$\('brand-plan'\)/) || [''])[0];
  vrai('⛔ applyBrand est trouvée', ab.length > 300, ab.length + ' caractères');
  vrai('⛔ … et JAMAIS le nom du thème', !/MARQUES\[[^\]]*\]\.l/.test(ab));
  /* ⛔⛔ ET ON JOUE LA VRAIE FONCTION, FORFAIT PAR FORFAIT. La première version de ce contrôle
     comptait « deux `nm.innerHTML='OP&nbsp;GESTION'` » dans le texte — et laissait passer la
     TROISIÈME branche, celle de Business Premium, qui écrivait le nom de l'entreprise en titre :
     c'est le forfait de la bêta, et c'est ce que la capture du tiroir montrait (« ELAN GESTION »,
     « OP GESTION » dessous). Un motif qui compte des affectations ne voit pas les branches qu'il
     ne compte pas. On exécute donc `applyBrand` telle qu'elle est écrite, dans un bac à sable
     qui fournit le strict nécessaire, pour les quatre situations qu'une entreprise peut avoir. */
  const corpsAB = (APP.match(/function applyBrand\(\)\{[\s\S]*?\n(?=function brandBadgeSrc)/) || [''])[0];
  vrai('⛔ le corps complet d’applyBrand est trouvé', corpsAB.length > 800, corpsAB.length + ' caractères');
  const jouer = (forfait, entreprise) => {
    const el = () => ({ src: '', textContent: '', innerHTML: '', style: { display: '', color: '' } });
    const els = { 'brand-logo': el(), 'brand-name': el(), 'brand-sub': el(), 'brand-plan': el(), 'suite-ic-elan': el() };
    const f = new Function('$', 'db', 'forfait', 'PLAN_BADGE', 'PLANS', 'PLAN_COLOR', 'APP_VERSION', 'entrepriseNom', 'localStorage', 'entCouleur', 'applyTheme', 'document',
      corpsAB + '\n; applyBrand();');
    f(id => els[id] || null, { entreprise: entreprise }, () => forfait,
      { gratuit: 'icons/plan-gratuit.png', business: 'icons/plan-business.png', premium: 'icons/plan-premium.png' },
      { gratuit: { l: 'Gratuit' }, business: { l: 'Business' }, premium: { l: 'Business Premium' } }, {},
      '745-beta', () => ((entreprise || {}).nom || '').trim(), { getItem: () => '1' }, () => '', () => {},
      { documentElement: { style: { getPropertyValue: () => '' } } });
    const nom = (els['brand-name'].innerHTML || els['brand-name'].textContent).replace(/&nbsp;/g, ' ');
    return { nom, sous: els['brand-sub'].textContent, logo: els['brand-logo'].src };
  };
  const CAS = [
    ['gratuit, sans nom', 'gratuit', {}],
    ['gratuit, avec nom', 'gratuit', { nom: 'ELAN GESTION' }],
    ['Business avec son logo', 'business', { nom: 'ELAN GESTION', logo: 'data:image/png;base64,QQ' }],
    ['Business Premium avec nom et logo', 'premium', { nom: 'ELAN GESTION', logo: 'data:image/png;base64,QQ' }],
    ['Business Premium avec son nom seul', 'premium', { nom: 'ELAN GESTION' }],
  ];
  for (const [lib, fo, E] of CAS) {
    let r; try { r = jouer(fo, E); } catch (e) { r = { nom: 'ERREUR ' + e.message, sous: '', logo: '' }; }
    vrai('⛔ ' + lib + ' → le menu s’appelle « OP GESTION »', r.nom === 'OP GESTION', JSON.stringify(r.nom));
    if (E.nom) vrai('   … et le nom de l’entreprise s’écrit dessous', r.sous === E.nom, JSON.stringify(r.sous));
    if (E.logo) vrai('   … et le logo payé par l’entreprise reste le sien', r.logo === E.logo, r.logo.slice(0, 30));
  }
  vrai('⛔ la connexion porte le titre OP GESTION et le logo OP GESTION',
    /<img class="login-logo" src="\$\{_logo\}" alt="OP GESTION"><h2>OP GESTION<\/h2>/.test(NU) && /icons\/logo-day\.png/.test(NU));
}

console.log('\n═══ test-759 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
