/* ══ OP MESSAGES — L'APERÇU CONTRE SON DOCUMENT ═══════════════════════════════════════════════════════════════════════════════
   Justin a fourni le paquet de design d'OP MESSAGES le 29 septembre 2026, puis a choisi le thème « 100 % Apple » le 5 octobre
   (couleurs système d'Apple, accent au bleu du logo, verre Liquid Glass ; l'ancien thème est dans `design/archives/`). La
   référence du dépôt est `design/opmessages/THEME-OPMESSAGES.md` ; la page d'aperçu est `apercu/opmessages/index.html`. Ce banc
   ne garde pas des valeurs RECOPIÉES : il RELIT les tableaux « Couleurs » et « Jetons système » du document et les compare à la
   page, jeton par jeton, JOUR ET NUIT (le modèle de `test-759` : un banc qui recopie des valeurs garde une croyance, un banc qui
   relit la source garde un accord).

   Il garde aussi ce que cette page promet sans le dire :
   · qu'elle ne charge RIEN de l'extérieur (ni feuille, ni police, ni script, ni appel réseau — et que le navigateur le refuse
     lui-même, par une politique default-src 'none') ;
   · qu'elle ne porte NI bouton de thème, NI barre d'état, NI barre d'adresse, NI feux macOS dessinés — ce sont des cadres de la
     MAQUETTE, une vraie page en aurait deux (CLAUDE.md) ;
   · qu'elle est « noindex », sans service worker, sans rangement sur l'appareil, sans nom de client réel ;
   · que ses données d'exemple sont SÉPARÉES du rendu (le jour où de vraies données arrivent, un seul bloc change) ;
   · que tout filtre de fond se déclare AVEC sa surface, et que « transparence réduite » rend un aplat plein et pas un texte nu.

   ⛔ ET LA CONTRE-ÉPREUVE EST LA MESURE : chaque garde est ÉPROUVÉE en la mutant sur une COPIE de la page (ou du document) — un
   jeton changé d'un chiffre, une feuille externe ajoutée, un bouton de thème rendu, un texte à 10 px, un nom de client — et le
   banc doit TOMBER sur le contrôle qui porte ce nom. Une copie intacte ne doit rien faire tomber (sinon le banc crie au loup).
   La page ET le document sont relus à chaque exécution : rien n'est figé ici. */
const fs = require('fs'), path = require('path');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

/* ── les jetons SYSTÈME (gris, ombres, verre, feuilles…) : depuis le thème « 100 % Apple » ils sont DANS le document, tableau
      « Jetons système » — lus par `tableauSysteme(DOC)`, plus aucune valeur recopiée ici (avant : la maquette, recopiée à la main). ── */
/* ── TROIS jetons ne sont PAS dans le document : ils sont à nous, et chacun dit pourquoi (calculés, puis lus au pixel par la sonde) ──
   · --sub-meta : le « secondaire » d'Apple (rgba(60,60,67,.6)) fait 3,3:1 sur le fond #f2f2f7, trop clair pour une légende de 11 px ;
   · --rond-bord : le contour d'une case décochée : 3:1 sur la carte (WCAG 1.4.11) ;
   · --on-fill : l'encre posée sur --fill (une surface, une encre — CLAUDE.md). */
const NOUS = {
  jour: { '--sub-meta': 'rgba(60,60,67,.8)', '--rond-bord': 'rgba(60,60,67,.6)', '--on-fill': '#ffffff' },
  nuit: { '--sub-meta': 'rgba(220,228,250,.75)', '--rond-bord': 'rgba(235,235,245,.6)', '--on-fill': '#ffffff' }
};
/* ── des jetons DÉCLARÉS que l'étape 2 n'utilise pas encore : nommés un par un, avec l'écran qui les lira. Un jeton déclaré et lu par personne est
   du code mort qui a l'air d'une garde — la règle de CLAUDE.md sur les champs de /health, appliquée aux variables CSS. Le banc exige les DEUX sens :
   tout jeton inutilisé est nommé ici, et tout jeton nommé ici est bien inutilisé (sinon la décision date d'avant). ── */
const POUR_PLUS_TARD = {
  '--sheet': 'la fiche détail de l\'agenda (étape 4)',
  '--handle': 'la barre d\'accueil d\'iOS : un cadre de la MAQUETTE, jamais dessiné (CLAUDE.md) — déclaré parce que le document le cite, lu par aucun écran'
};
/* les noms des personnes et des lieux de la MAQUETTE : inventés, ou trop proches de données réelles — aucun ne doit se retrouver
   dans une page servie publiquement (le paquet le dit lui-même : « les données des maquettes sont des exemples ») */
const NOMS_INTERDITS = ['ELAN', 'Elan', 'Dumas', 'Bernard', 'Karim', 'Julie', 'Marc ', 'Ali Sadi', 'Thomas Moreau', 'Les Pins', 'Certibiocide', 'Justin', 'DC-2026'];

/* ── petits outils de lecture ── */
const sansCommentairesCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
/* ⛔ le nettoyage des commentaires JS ne retire que ce qui est un commentaire : un bloc /* … *\/ et une fin de ligne « // … »
   précédée d'une espace — jamais une adresse (aucune dans cette page, et le banc le garde) */
const sansCommentairesJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const ech = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const net = s => String(s).replace(/\s+/g, '').toLowerCase();
function couleur(c) {
  c = c.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(c); if (m) return '#' + m[1].split('').map(x => x + x).join('');
  m = /^rgba?\(([^)]*)\)$/.exec(c);
  if (m) { const p = m[1].split(',').map(x => +x.trim()); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + (p.length > 3 ? p[3] : 1) + ')'; }
  return c;
}
const couleurs = s => (String(s).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) || []).map(couleur);
const pixels = s => String(s).match(/-?[\d.]+px/g) || [];

function jetons(css) {
  const lire1 = corps => { const o = {}; for (const m of corps.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o; };
  const jour = /(?:^|\n):root\s*\{([^}]*)\}/.exec(css), nuit = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(css);
  return { jour: jour ? lire1(jour[1]) : {}, nuit: nuit ? lire1(nuit[1]) : {} };
}
function tableauDoc(doc) {
  const i = doc.indexOf('## Couleurs'); if (i < 0) return [];
  const bloc = doc.slice(i).split(/\n## /)[0];
  return bloc.split('\n').filter(l => /^\|/.test(l)).map(l => l.split('|').slice(1, 4).map(x => x.trim()))
    .filter(r => r.length === 3 && !/^-+$/.test(r[0]) && r[0] !== 'Jeton');
}
/* le tableau « Jetons système » : | --nom | jour | nuit | — une valeur peut porter des virgules, jamais une barre verticale */
function tableauSysteme(doc) {
  const i = doc.indexOf('## Jetons système'); if (i < 0) return { jour: {}, nuit: {} };
  const bloc = doc.slice(i).split(/\n## /)[0], o = { jour: {}, nuit: {} };
  for (const l of bloc.split('\n')) { const r = l.split('|').map(x => x.trim()); if (/^--[a-z][\w-]*$/.test(r[1] || '')) { o.jour[r[1]] = r[2]; o.nuit[r[1]] = r[3]; } }
  return o;
}
/* toutes les règles qui portent EXACTEMENT ce sélecteur, mises bout à bout : `.side` est posé en deux endroits (masqué au
   téléphone, puis sa matière) et lire la première seule ne verrait pas son verre */
function regle(css, sel) {
  const re = new RegExp('(?:^|\\n)[ \\t]*' + ech(sel) + '\\s*\\{([^}]*)\\}', 'g'); let o = '';
  for (const m of css.matchAll(re)) o += m[1] + ';\n';
  return o;
}
const prop = (corps, p) => { const m = new RegExp('(?:^|[;\\s])' + ech(p) + '\\s*:\\s*([^;]+)').exec(corps); return m ? m[1].trim() : null; };

/* ══ LE CONTRÔLE — rend la liste des constats, sans rien imprimer (la contre-épreuve le rejoue sur des copies) ══ */
function controler(PAGE, DOC, SRC) {
  const R = [];
  const v = (t, a, b) => R.push([t, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) !== JSON.stringify(b) ? '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a) : '']);
  const vrai = (t, c, d) => R.push([t, !!c, c ? '' : (d ? '\n      ' + d : '')]);

  const style = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
  const CSS = sansCommentairesCss(style);
  const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
  const JS = sansCommentairesJs(script);
  const SRCJS = sansCommentairesJs(SRC);
  const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const T = jetons(CSS);

  /* 1. LES JETONS CONTRE LE DOCUMENT, jour et nuit ─────────────────────────────────────────────────────────────────── */
  const lignes = tableauDoc(DOC);
  vrai('(population) le tableau « Couleurs » du document est lu : ' + lignes.length + ' lignes (13 attendues)', lignes.length >= 13, 'lignes : ' + lignes.length);
  const SYS = tableauSysteme(DOC);
  vrai('(population) le tableau « Jetons système » du document est lu : ' + Object.keys(SYS.jour).length + ' jetons (15 attendus)', Object.keys(SYS.jour).length >= 15);
  vrai('(population) la page porte ses jetons : ' + Object.keys(T.jour).length + ' le jour, ' + Object.keys(T.nuit).length + ' la nuit', Object.keys(T.jour).length >= 30 && Object.keys(T.nuit).length >= 30);
  v('chaque jeton du jour a son jumeau de nuit, et inversement (rien ne reste sans valeur dans un des deux modes)',
    [Object.keys(T.jour).filter(k => !(k in T.nuit)), Object.keys(T.nuit).filter(k => !(k in T.jour))], [[], []]);
  const ligne = prefixe => lignes.find(r => r[0].toLowerCase().startsWith(prefixe)) || [prefixe, '', ''];
  const COMPARES = [['texte', ['--text']], ['secondaire', ['--sub']], ['accent', ['--accent']], ['fill (', ['--fill']], ['fillsoft', ['--fill-soft']],
    ['carte', ['--card']], ['champ', ['--field']], ['barre nav', ['--nav-bar']], ["barre d'onglets", ['--tab-bar']], ['séparateur', ['--sep']],
    ['bulle reçue', ['--bubble-in', '--bubble-in-fg']]];
  for (const [mode, col] of [['jour', 1], ['nuit', 2]]) {
    const vars = T[mode === 'jour' ? 'jour' : 'nuit'];
    for (const [pref, noms] of COMPARES) {
      const r = ligne(pref), cell = r[col].replace(/\bblanc(he)?\b/g, '#ffffff');
      const attendu = couleurs(cell), obtenu = [].concat(...noms.map(n => couleurs(vars[n] || '')));
      v('jeton « ' + r[0].split(' (')[0] + ' » (' + noms.join(' + ') + ') — ' + mode + ' : couleurs du document = couleurs de la page', obtenu, attendu);
      const pxDoc = pixels(r[col]);
      if (pxDoc.length) v('   et ses épaisseurs (' + pxDoc.join(' ') + ')', noms.map(n => pixels(vars[n] || '')).reduce((a, b) => a.concat(b), []), pxDoc);
    }
    /* l'onglet actif : « bulle rgba(…), texte #… » (ou « bulle blanche N % », « texte blanc ») — de la prose, lue par motif, dans les deux modes */
    const act = ligne('onglet actif')[col];
    const bb = /bulle blanche (\d+) %/.exec(act), br = /bulle (#[0-9a-fA-F]+|rgba?\([^)]*\))/.exec(act);
    const bg = bb ? 'rgba(255,255,255,' + (+bb[1] / 100) + ')' : br ? couleur(br[1]) : '?';
    const th = /texte (#[0-9a-fA-F]+)/.exec(act), fg = th ? couleur(th[1]) : (/texte blanc/.test(act) ? '#ffffff' : '?');
    v('jeton « onglet actif » — ' + mode + ' : bulle (' + bg + ') et encre (' + fg + ') du document = --tab-active-bg et --tab-active-fg', [couleur(vars['--tab-active-bg'] || ''), couleur(vars['--tab-active-fg'] || '')], [bg, fg]);
    /* le fond d'écran : UNI depuis le thème « 100 % Apple » — la couleur du document est --base, et --screen ne peint rien (plus de dégradé) */
    const fond = ligne('fond écran')[col], ecran = vars['--screen'] || '';
    const arrets = couleurs(fond);
    vrai('jeton « fond écran » — ' + mode + ' : le document dit un fond UNI d\'une couleur (' + arrets.join(' ') + '), et c\'est --base', /\buni\b/.test(fond) && arrets.length === 1 && couleur(vars['--base'] || '') === arrets[0], 'document « ' + fond + ' » · --base ' + vars['--base']);
    vrai('   et --screen ne peint rien par-dessus (none : ni dégradé, ni diagonale)', ecran.trim() === 'none', ecran);
    /* le tableau « Jetons système » du document, jeton par jeton */
    for (const [n, val] of Object.entries(SYS[mode])) v('jeton système « ' + n + ' » — ' + mode, net(vars[n] || ''), net(val));
    for (const [n, val] of Object.entries(NOUS[mode])) v('jeton À NOUS « ' + n + ' » — ' + mode + ' (ni document ni maquette)', net(vars[n] || ''), net(val));
  }
  v('les trois jetons à nous ne sont PAS dans les tableaux du document (sinon ils quittent cette liste)', Object.keys(NOUS.jour).filter(n => lignes.some(r => r.join(' ').includes(n)) || n in SYS.jour), []);
  /* (h) un jeton déclaré est lu quelque part, ou nommé « pour une étape à venir » — et inversement */
  const lu = n => new RegExp('var\\(\\s*' + ech(n) + '(?![\\w-])').test(CSS + ' ' + HTML + ' ' + script);
  const inutiles = Object.keys(T.jour).filter(n => !lu(n));
  v('(h) tout jeton déclaré mais lu par personne est NOMMÉ « pour une étape à venir » (' + Object.keys(T.jour).length + ' jetons examinés, ' + inutiles.length + ' inutilisés : ' + inutiles.join(' ') + ')',
    inutiles.filter(n => !(n in POUR_PLUS_TARD)), []);
  v('(h) et tout jeton nommé « pour une étape à venir » est bien inutilisé (sinon la décision date d\'avant)', Object.keys(POUR_PLUS_TARD).filter(n => lu(n) || !(n in T.jour)), []);
  /* statuts et avatars : les lignes de prose du document */
  v('statuts : manqué / quitter #ff453a, en ligne / parle #30d158', [couleur(T.jour['--rouge'] || ''), couleur(T.jour['--vert'] || ''), couleur(T.nuit['--rouge'] || ''), couleur(T.nuit['--vert'] || '')],
    [(/manqué (#[0-9a-f]+)/.exec(DOC) || [])[1], (/parle (#[0-9a-f]+)/.exec(DOC) || [])[1], (/manqué (#[0-9a-f]+)/.exec(DOC) || [])[1], (/parle (#[0-9a-f]+)/.exec(DOC) || [])[1]].map(c => couleur(c || '?')));
  vrai('avatars : le « bleu royal #4f78d6→#2a4a9c » du document est le premier dégradé (.av0)', /bleu royal (#[0-9a-f]+)→(#[0-9a-f]+)/.test(DOC) && (() => { const m = /bleu royal (#[0-9a-f]+)→(#[0-9a-f]+)/.exec(DOC); const r = regle(CSS, '.av0'); return couleurs(r).join() === [couleur(m[1]), couleur(m[2])].join(); })());

  /* 2. LE VERRE — « backdrop-filter: blur(30px) saturate(180%) sur barres et panneaux ; barre d'onglets blur(36px) saturate(200%) » ── */
  const verre = (sel) => (prop(regle(CSS, sel), 'backdrop-filter') || '').replace(/\s+/g, ' ');
  const verreWk = (sel) => (prop(regle(CSS, sel), '-webkit-backdrop-filter') || '').replace(/\s+/g, ' ');
  v('verre : le jumeau -webkit- de chaque vitre dit la même chose (Safari ne lit que lui sur les versions d\'avant)', ['.tabs', '.side', '.feuille', '.notif', '.conv-nav', '.composer'].filter(s => verre(s) !== verreWk(s)), []);
  v('verre : la barre de la conversation et la barre de saisie sont à blur(30px) saturate(180%) (le document : « barres et panneaux »)', [verre('.conv-nav'), verre('.composer')], ['blur(30px) saturate(180%)', 'blur(30px) saturate(180%)']);
  const verreOnglets = (/barre d'onglets `(blur\([^`]*\))`/.exec(DOC) || [, '?'])[1];
  v('verre : la barre d\'onglets suit le document (« barre d\'onglets `' + verreOnglets + '` »)', verre('.tabs'), verreOnglets);
  vrai('Liquid Glass : la barre d\'onglets FLOTTE (ombre) et son arête est un REFLET (--verre-reflet), pas un trait gris', /var\(--shadow-bar\)\s*,\s*var\(--verre-reflet\)/.test(prop(regle(CSS, '.tabs'), 'box-shadow') || '') && /^0$/.test(prop(regle(CSS, '.tabs'), 'border') || ''), regle(CSS, '.tabs'));
  vrai('Liquid Glass : la feuille et la bannière portent le reflet de leur arête', ['.feuille', '.notif'].every(s => /var\(--verre-reflet\)/.test(prop(regle(CSS, s), 'box-shadow') || '')));
  v('verre : la barre latérale à blur(30px) saturate(180%) (le document)', [/blur\(30px\) saturate\(180%\)/.test(DOC), verre('.side')], [true, 'blur(30px) saturate(180%)']);
  v('verre : la feuille et la bannière à blur(40px) saturate(180%) (la maquette : panneaux et notification)', [verre('.feuille'), verre('.notif')], ['blur(40px) saturate(180%)', 'blur(40px) saturate(180%)']);
  const filtres = [...CSS.matchAll(/([^{}]+)\{([^}]*backdrop-filter[^}]*)\}/g)].filter(m => !/@media|@supports/.test(m[1]) && !/!important/.test(m[2]));
  vrai('(population) ' + filtres.length + ' règles posent un backdrop-filter (au moins 4 : barre d\'onglets, barre latérale, feuille, bannière)', filtres.length >= 4);
  v('⛔ tout filtre de fond se déclare AVEC sa surface (un fond) ET son jumeau -webkit- — sinon c\'est une loupe sans matière',
    filtres.filter(m => !/(^|[;\s])background(-color)?\s*:/.test(m[2]) || !/-webkit-backdrop-filter/.test(m[2])).map(m => m[1].trim()), []);
  const rt = (/@media\s*\(prefers-reduced-transparency:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(CSS) || [, ''])[1];
  vrai('transparence réduite : le flou est retiré ET un aplat plein prend sa place (--solide), sur la feuille et la bannière aussi',
    /backdrop-filter:\s*none/.test(rt) && /\[data-glass\][^}]*background:\s*var\(--solide\)/.test(rt) && /\.feuille[^}]*var\(--solide-feuille\)/.test(rt) && /\.notif[^}]*var\(--solide-notif\)/.test(rt), rt.trim().slice(0, 200));
  const rm = (/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(CSS) || [, ''])[1];
  vrai('mouvement réduit : animations coupées et transitions à 0 s', /animation:\s*none\s*!important/.test(rm) && /transition-duration:\s*0s\s*!important/.test(rm), rm.trim().slice(0, 200));

  /* 3. LA TYPOGRAPHIE ET LES MESURES du document (« Typo (HIG) », « Écrans ») ── */
  const gt = regle(CSS, '.grand-titre');
  v('Large Title 34/41, .37, gras', [prop(gt, 'font-size'), prop(gt, 'line-height'), prop(gt, 'letter-spacing'), prop(gt, 'font-weight')], ['34px', '41px', '.37px', '700']);
  const cn = regle(CSS, '.conv-nom'), ca = regle(CSS, '.conv-apercu'), ch = regle(CSS, '.conv-heure');
  v('nom de conversation 17 semibold ; aperçu 15/20 sur 2 lignes ; heure 15', [prop(cn, 'font-size'), prop(cn, 'font-weight'), prop(ca, 'font-size'), prop(ca, 'line-height'), prop(ca, '-webkit-line-clamp'), prop(ch, 'font-size')], ['17px', '600', '15px', '20px', '2', '15px']);
  v('onglets à 11 px', prop(regle(CSS, '.tab'), 'font-size'), '11px');
  v('liste : lignes de 72 px minimum, avatar 50 ; épinglés : cercles de 60', [prop(regle(CSS, '.conv'), 'min-height'), prop(regle(CSS, '.conv .avatar'), 'width'), prop(regle(CSS, '.epingle .avatar'), 'width'), prop(regle(CSS, '.epingle'), 'width')], ['72px', '50px', '60px', '76px']);
  vrai('bureau : barre latérale de 236 px (grille 236px + le reste)', /grid-template-columns:\s*236px\s+minmax\(0,\s*1fr\)/.test(CSS));
  v('feuille : 30px 30px 0 0 au téléphone, fenêtre de 520 px au bureau', [prop(regle(CSS, '.feuille'), 'border-radius'), /width:\s*520px/.test(CSS)], ['30px 30px 0 0', true]);
  const sizes = [...CSS.matchAll(/font-size:\s*([\d.]+)px/g), ...HTML.matchAll(/font-size:\s*([\d.]+)px/g), ...script.matchAll(/font-size:\s*([\d.]+)px/g)].map(m => +m[1]);
  vrai('(population) ' + sizes.length + ' tailles de police écrites', sizes.length >= 40);
  v('⛔ RIEN sous 11 px (écrit dans la feuille, le balisage ou le script ; 0 = champ de fichier invisible)', [...new Set(sizes.filter(n => n > 0 && n < 11))], []);
  vrai('⛔ un champ de saisie fait 16 px au moins (Safari zoome la page en dessous)', /\.recherche input[^}]*font-size:\s*17px/.test(CSS) && /\.g-nom[^}]*font-size:\s*17px/.test(CSS));
  vrai('cibles tactiles : 44 px de zone qui répond (Modifier, Groupe, Annuler/Créer, puces) et 50 px à la barre d\'onglets',
    ['.lien-texte', '.btn-plus', '.feuille-bouton', '.puce'].every(s => parseFloat(prop(regle(CSS, s), 'min-height')) >= 44) && parseFloat(prop(regle(CSS, '.tab'), 'min-height')) >= 50);
  vrai('la durée de la bannière est de ~3,5 s (le document dit « disparaît après ~3,5 s ») : un setTimeout de 3 000 à 4 000 ms',
    [...JS.matchAll(/classList\.remove\('on'\),\s*(\d+)\)/g)].some(m => +m[1] >= 3000 && +m[1] <= 4000), '');

  /* 4. LA NAVIGATION ET LES ÉCRANS : 4 onglets, une vue par écran, des données à part ── */
  v('les 4 onglets du document, dans l\'ordre (Messages · Appels · Réunions · Réglages)', (/const ORDRE = \[([^\]]*)\]/.exec(JS) || [, ''])[1].replace(/['\s]/g, ''), 'messages,appels,reunions,reglages');
  v('   et leurs titres', ['Messages', 'Appels', 'Réunions', 'Réglages'].filter(t => !new RegExp("titre: '" + t + "'").test(JS)), []);
  vrai('la barre latérale porte le statut « Disponible »', />Disponible</.test(HTML) || /<i><\/i>Disponible/.test(HTML));
  vrai('la bulle de l\'onglet actif se place par UN numéro (--i) et le CSS : aucune largeur recopiée en JavaScript', /translate:\s*calc\(var\(--i\)/.test(CSS) && /setProperty\('--i'/.test(JS) && !/offsetWidth|getBoundingClientRect/.test(JS.replace(/function ndLettreSous\([\s\S]*?\n  \}\n/, '')));       // (hors `ndLettreSous` : l'index de « Nouvelle discussion » cherche quelle lettre est SOUS le doigt, il ne recopie la géométrie d'aucun onglet)
  /* les données d'exemple vivent dans un MODULE à part (apercu/opmessages/source.js) : la page ne contient aucun nom, aucun message — elle parle à
     window.OPMSG_SOURCE. Le jour où le serveur d'OP MESSAGES arrive, c'est ce fichier-là qui est remplacé, rien d'autre. */
  const noms = [...SRCJS.matchAll(/nom: '([^']+)'/g)].map(m => m[1]);
  vrai('(population) ' + noms.length + ' noms d\'exemple dans source.js (le module de données)', noms.length >= 12);
  v('⛔ aucun de ces noms n\'est écrit dans la PAGE (le jour où de vraies données arrivent, un seul fichier change)', noms.filter(n => PAGE.replace(/<!--[\s\S]*?-->/g, ' ').includes("'" + n + "'") || PAGE.includes('>' + n + '<')), []);
  vrai('la page lit ses données par window.OPMSG_SOURCE, chargé AVANT elle par un <script src="source.js"> (le seul script externe permis)',
    /<script src="source\.js"><\/script>/.test(PAGE) && PAGE.indexOf('<script src="source.js">') < PAGE.indexOf('<script>\n') && /window\.OPMSG_SOURCE/.test(JS) && !/\bconst (CONTACTS|CONVERSATIONS) = \[/.test(JS) && /racine\.OPMSG_SOURCE = creerSourceApercu\(\)/.test(SRCJS));
  vrai('chaque écran « bientôt » a sa coquille rendue par la même fonction (une vue par écran)', /rendreCoquille\('reunions'\)/.test(JS) && /else rendreCoquille\('reglages'\)/.test(JS) && /function rendreCoquille/.test(JS));
  vrai('la page DIT que ce sont des données d\'exemple', /Aperçu — données d'exemple/.test(HTML));

  /* 5. RIEN DE L'EXTÉRIEUR ── */
  const entier = PAGE.replace(/<!--[\s\S]*?-->/g, ' ');
  v('⛔ aucune adresse http(s):// dans la page (feuille, police, script, image, lien)', [...new Set(entier.match(/https?:\/\/[^\s"'<>)]*/g) || [])], []);
  v('⛔ aucun <script src> autre que source.js, <link> autre que l\'icône locale, <iframe>, <img> distant, @import, url(http)',
    [(entier.match(/<script[^>]*\ssrc="(?!source\.js")/g) || []).length, (entier.match(/<link\b(?![^>]*rel="icon"[^>]*href="\.\.\/\.\.\/icons\/opmsg-favicon-32\.png")[^>]*>/g) || []).length, (entier.match(/<iframe|@import|url\(\s*["']?https?:/g) || []).length], [0, 0, 0]);
  v('⛔ aucune image écrite dans le balisage qui ne soit le logo du dépôt (icons/opmsg-192.png) ; les photos et vocaux de la personne ne naissent que de blob:', [...new Set((HTML.match(/<img[^>]*\ssrc="[^"]*"/g) || []).map(s => /src="([^"]*)"/.exec(s)[1]))], ['../../icons/opmsg-192.png']);
  const reseau = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|\bimport\s*\(|serviceWorker|firebase|navigator\.connection/i;
  v('⛔ aucun appel réseau, aucun service worker, aucun Firebase dans le script', JS.match(reseau), null);
  v('⛔ ni dans le module de données (source.js) : aucun fetch, aucune socket, aucun rangement sur l\'appareil', SRCJS.match(new RegExp(reseau.source + '|localStorage|sessionStorage|indexedDB|document\\.cookie', 'i')), null);
  v('⛔ rien n\'est rangé sur l\'appareil (ni localStorage, ni sessionStorage, ni IndexedDB, ni cookie) : un aperçu ne garde rien', JS.match(/localStorage|sessionStorage|indexedDB|document\.cookie/), null);
  const csp = (/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(PAGE) || [, ''])[1];
  vrai('le NAVIGATEUR refuse lui-même tout appel : politique default-src \'none\', connect-src jamais rouvert, images limitées à la page et à blob:',
    /default-src 'none'/.test(csp) && !/connect-src/.test(csp) && /img-src 'self' blob:/.test(csp) && /media-src blob:(;|$)/.test(csp) && /script-src 'self' 'unsafe-inline'/.test(csp) && !/https?:|\*/.test(csp), csp);
  vrai('<meta name="robots" content="noindex">', /<meta name="robots" content="noindex">/.test(PAGE));
  vrai('aucune adresse canonique, aucun manifeste d\'application, aucun Open Graph (c\'est un aperçu, pas une page à référencer)', !/rel="canonical"|rel="manifest"|property="og:/.test(PAGE));
  vrai('<html lang="fr">, viewport-fit=cover (les encoches se lisent par env(safe-area-inset-*))', /<html lang="fr">/.test(PAGE) && /viewport-fit=cover/.test(PAGE) && /env\(safe-area-inset-top/.test(CSS) && /env\(safe-area-inset-bottom/.test(CSS));

  /* 6. NI BOUTON DE THÈME, NI BARRE D'ÉTAT, NI BARRE D'ADRESSE, NI FEUX macOS ── */
  v('⛔ le jour et la nuit suivent l\'appareil : aucun bouton de thème, aucune classe « mode », aucun data-theme / data-mode, aucun ☀ ☾, aucun color-scheme FORCÉ sur un seul mode',
    [/class="[^"]*\bmode\b|data-theme|data-mode|[☀☾☼🌙🌞]/.test(HTML), /(?:^|[^-\w])color-scheme\s*:\s*(?:only\s+)?(?:light|dark)\s*[;}]/.test(CSS), /<meta name="color-scheme" content="(?!light dark")/.test(PAGE), /<button[^>]*>\s*(?:jour|nuit|auto)\s*<\/button>/i.test(HTML)], [false, false, false, false]);
  vrai('(f) color-scheme déclaré AUX DEUX : <meta name="color-scheme" content="light dark"> et :root/html { color-scheme: light dark } (champs, défilement et fond de formulaire suivent l\'appareil)', /<meta name="color-scheme" content="light dark">/.test(PAGE) && /(?:^|[^-\w])color-scheme\s*:\s*light dark\s*;/.test(CSS));
  vrai('le script ne lit ni n\'écrit le mode (aucun prefers-color-scheme en JavaScript : c\'est le CSS qui suit l\'appareil)', !/prefers-color-scheme|data-theme|dataset\.theme/.test(JS) && /@media\s*\(prefers-color-scheme:\s*dark\)/.test(CSS));
  v('⛔ aucune barre d\'état, aucun îlot, aucun cadre de téléphone, aucune barre de titre ni d\'adresse DESSINÉS (classes, identifiants, feux macOS, URL de maquette)',
    [(HTML + CSS).match(/(?:class|id)="[^"]*\b(?:status-?bar|statusbar|island|bezel|url-?bar|address-?bar|titlebar|traffic|home-?indicator)\b/i), (CSS + HTML).match(/#ff5f57|#febc2e|#28c840|teamop\.fr\/messages|[┘]/i), /\.(?:status-?bar|island|bezel|url-?bar|titlebar|traffic)\b/i.test(CSS)], [null, null, false]);
  v('⛔ aucun nom de la maquette (personne, chantier, devis) : seuls des exemples INVENTÉS', NOMS_INTERDITS.filter(n => ((PAGE + SRC).replace(/<!--[\s\S]*?-->/g, ' ')).includes(n)), []);
  return R;
}

/* ══ EXÉCUTION ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
const PAGE = lire('apercu/opmessages/index.html'), DOC = lire('design/opmessages/THEME-OPMESSAGES.md'), SRC = lire('apercu/opmessages/source.js');
let ok = 0, ko = 0;
const dire = (t, bon, d) => { if (bon) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d || '')); } };

console.log('\n══ 1. LA PAGE CONTRE SON DOCUMENT ══\n');
const base = controler(PAGE, DOC, SRC);
for (const [t, bon, d] of base) dire(t, bon, d);
dire('(population) ' + base.length + ' contrôles joués sur la page réelle', base.length >= 100);

console.log('\n══ 2. LES FICHIERS DE RÉFÉRENCE SONT DANS LE DÉPÔT ══\n');
dire('design/opmessages/THEME-OPMESSAGES.md et PROMPT-CLAUDE-CODE.md existent, non vides', DOC.length > 2000 && lire('design/opmessages/PROMPT-CLAUDE-CODE.md').length > 500);
dire('le logo de la page est celui du DÉPÔT (icons/opmsg-192.png et icons/opmsg-favicon-32.png : des PNG de 192 et 32 px), plus un JPEG de 886 px de 59 Ko pour un logo de 28 px', (() => {
  const png = (f, w) => { const b = fs.readFileSync(path.join(RACINE, f)); return b.slice(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === w; };
  return png('icons/opmsg-192.png', 192) && png('icons/opmsg-favicon-32.png', 32) && !fs.existsSync(path.join(RACINE, 'apercu/opmessages/opmsg-logo.jpeg'));
})());
dire('le module de données est là (apercu/opmessages/source.js, non vide)', SRC.length > 3000);
/* ⛔ un aperçu n'est un aperçu que tant qu'AUCUN point d'entrée client ne mène à lui : ni l'application, ni la page d'OP MESSAGES
   (fermée), ni le service worker (qui la mettrait en cache), ni le plan du site */
const POINTS_D_ENTREE = ['app.html', 'beta.html', 'messages.html', 'messages-beta.html', 'opmessages.html', 'sw.js', 'sitemap.xml', 'index.html', 'tarifs.html', 'manifest-opmsg.webmanifest']
  .filter(f => fs.existsSync(path.join(RACINE, f)));
dire('(population) ' + POINTS_D_ENTREE.length + ' points d\'entrée relus', POINTS_D_ENTREE.length >= 7);
dire('aucun point d\'entrée (application, OP MESSAGES fermée, service worker, plan du site) ne mène à apercu/opmessages/',
  POINTS_D_ENTREE.filter(f => /apercu\/opmessages/.test(lire(f))).length === 0, ' — ' + POINTS_D_ENTREE.filter(f => /apercu\/opmessages/.test(lire(f))).join(', '));

console.log('\n══ 3. LA CONTRE-ÉPREUVE : ON MUTE UNE COPIE, LE BANC DOIT TOMBER SUR CE QU\'IL GARDE ══\n');
const MUTATIONS = [
  ['jeton de jour changé d\'un chiffre (--accent #2a4a9c → #2a4a9d)', 'page', p => p.replace('--accent: #2a4a9c;', '--accent: #2a4a9d;'), /« accent » .* jour/],
  ['jeton de nuit changé (--fill #3b63c4 → #3b63c5)', 'page', p => p.replace('--fill: #3b63c4;', '--fill: #3b63c5;'), /« fill » .* nuit/],
  ['la carte du jour n\'est plus blanche (#ffffff → #fefefe)', 'page', p => p.replace('--card: #ffffff;', '--card: #fefefe;'), /« carte » .* jour/],
  ['fond d\'écran de nuit : le bleu nuit change d\'un chiffre (#0b1633 → #0b1634)', 'page', p => p.replace('--base: #0b1633;', '--base: #0b1634;'), /« fond écran » .* nuit/],
  ['le dégradé revient sur le fond de jour', 'page', p => p.replace('  --screen: none;', '  --screen: linear-gradient(160deg, #eef3fb, #dfe8f8);'), /--screen ne peint rien/],
  ['une valeur du tableau système (--sheet-bg de nuit)', 'page', p => p.replace('--sheet-bg: rgba(18,31,66,.94);', '--sheet-bg: rgba(18,31,66,.9);'), /--sheet-bg/],
  ['le reflet Liquid Glass de nuit change (.2 → .3)', 'page', p => p.replace('--verre-reflet: inset 0 1px 0 rgba(255,255,255,.2)', '--verre-reflet: inset 0 1px 0 rgba(255,255,255,.3)'), /« --verre-reflet » — nuit/],
  ['la barre d\'onglets perd son reflet (Liquid Glass)', 'page', p => p.replace('box-shadow: var(--shadow-bar), var(--verre-reflet); --i: 0;', 'box-shadow: var(--shadow-bar); --i: 0;'), /arête est un REFLET/],
  ['le trait gris revient autour de la barre d\'onglets', 'page', p => p.replace('  border: 0; box-shadow: var(--shadow-bar), var(--verre-reflet); --i: 0;', '  border: var(--line); box-shadow: var(--shadow-bar), var(--verre-reflet); --i: 0;'), /arête est un REFLET/],
  ['la bannière perd son reflet', 'page', p => p.replace('box-shadow: 0 18px 44px rgba(0,0,0,.28), var(--verre-reflet);', 'box-shadow: 0 18px 44px rgba(0,0,0,.28);'), /feuille et la bannière portent le reflet/],
  ['la barre d\'onglets perd son flou (24px → 12px, la propriété standard : le -webkit- est visé à part)', 'page', p => p.replace('; backdrop-filter: blur(24px) saturate(200%);', '; backdrop-filter: blur(12px) saturate(200%);'), /barre d'onglets suit le document/],
  ['le jumeau -webkit- de la barre d\'onglets diverge', 'page', p => p.replace('-webkit-backdrop-filter: blur(24px) saturate(200%);', '-webkit-backdrop-filter: blur(18px) saturate(200%);'), /jumeau -webkit-/],
  ['le document change le verre de la barre d\'onglets', 'doc', d => d.replace('barre d\'onglets `blur(24px) saturate(200%)`', 'barre d\'onglets `blur(28px) saturate(200%)`'), /barre d'onglets suit le document/],
  ['le document change un jeton système (--group-r 22 → 20 px, jour)', 'doc', d => d.replace('| --group-r | 22px | 22px |', '| --group-r | 20px | 22px |'), /« --group-r » — jour/],
  ['un filtre de fond sans sa surface (la barre latérale perd son background)', 'page', p => p.replace('  background: var(--sidebar); -webkit-backdrop-filter', '  -webkit-backdrop-filter'), /AVEC sa surface/],
  ['« transparence réduite » retire le flou SANS rendre d\'aplat', 'page', p => p.replace('background: var(--solide) !important; }', '}'), /transparence réduite/],
  ['le mouvement réduit n\'est plus respecté', 'page', p => p.replace('animation: none !important;', ''), /mouvement réduit/],
  ['un jeton déclaré que personne ne lit et que personne ne nomme (--zz-mort)', 'page', p => p.replace('  --handle: rgba(0,0,0,.72);', '  --handle: rgba(0,0,0,.72);\n  --zz-mort: #123456;').replace('    --handle: rgba(255,255,255,.8);', '    --handle: rgba(255,255,255,.8);\n    --zz-mort: #123456;'), /\(h\) tout jeton déclaré mais lu par personne/],
  ['un jeton « pour plus tard » qu\'un écran lit déjà (--sheet utilisé)', 'page', p => p.replace('.badge { min-width: 18px;', '.badge { background-image: none; outline-color: var(--sheet); min-width: 18px;'), /\(h\) et tout jeton nommé/],
  ['un jeton à nous change d\'un chiffre (--sub-meta jour .8 → .6)', 'page', p => p.replace('--sub-meta: rgba(60,60,67,.8);', '--sub-meta: rgba(60,60,67,.6);'), /À NOUS « --sub-meta » — jour/],
  ['une feuille de style externe (Google Fonts)', 'page', p => p.replace('<title>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">\n<title>'), /aucune adresse http/],
  ['la politique du navigateur s\'ouvre (connect-src *)', 'page', p => p.replace("form-action 'none'", "form-action 'none'; connect-src *"), /NAVIGATEUR refuse/],
  ['un appel réseau dans le script', 'page', p => p.replace("'use strict';", "'use strict'; fetch('/x');"), /aucun appel réseau/],
  ['un appel réseau dans le module de données', 'src', c => c.replace("'use strict';", "'use strict'; fetch('/x');"), /ni dans le module de données/],
  ['un second script externe (un CDN)', 'page', p => p.replace('<script src="source.js"></script>', '<script src="source.js"></script><script src="app.js"></script>'), /aucun <script src> autre que source\.js/],
  ['les données reviennent dans la page (const CONVERSATIONS)', 'page', p => p.replace("  let MOI = null, CONTACTS = [];", "  const CONVERSATIONS = [];\n  let MOI = null, CONTACTS = [];"), /lit ses données par window\.OPMSG_SOURCE/],
  ['un rangement sur l\'appareil (localStorage)', 'page', p => p.replace("'use strict';", "'use strict'; localStorage.setItem('a', 1);"), /rien n'est rangé/],
  ['noindex retiré', 'page', p => p.replace('<meta name="robots" content="noindex">', ''), /noindex/],
  ['un bouton de thème rendu à la page', 'page', p => p.replace('<main class="contenu"', '<button class="mode" type="button">Nuit</button><main class="contenu"'), /aucun bouton de thème/],
  ['un color-scheme FORCÉ sur le jour dans la feuille', 'page', p => p.replace('  color-scheme: light dark;\n  background-color', '  color-scheme: light;\n  background-color'), /aucun bouton de thème/],
  ['le color-scheme n\'est plus déclaré (la meta est retirée)', 'page', p => p.replace('<meta name="color-scheme" content="light dark">', ''), /\(f\) color-scheme déclaré/],
  ['une barre d\'état dessinée', 'page', p => p.replace('<main class="contenu"', '<div class="status-bar">06:52</div><main class="contenu"'), /aucune barre d'état/],
  ['les feux macOS dessinés', 'page', p => p.replace('.vue[hidden]', '.feu { background: #ff5f57; }\n.vue[hidden]'), /aucune barre d'état/],
  ['un texte à 10 px', 'page', p => p.replace('.mention-apercu { margin: 18px 4px 0; text-align: center; font-size: 12px;', '.mention-apercu { margin: 18px 4px 0; text-align: center; font-size: 10px;'), /RIEN sous 11 px/],
  ['un nom de la maquette dans le module de données (Julie Dumas)', 'src', c => c.replace("nom: 'Camille Roux',   role", "nom: 'Julie Dumas',   role"), /aucun nom de la maquette/],
  ['un nom d\'exemple écrit dans le RENDU', 'page', p => p.replace('function rendreCoquille', "function rendreCoquille_x() { return 'Camille Roux'; }\n  function rendreCoquille"), /aucun de ces noms/],
  ['le titre grand format change (34 → 32 px)', 'page', p => p.replace('font-size: 34px; line-height: 41px', 'font-size: 32px; line-height: 41px'), /Large Title/],
  ['la bulle d\'onglet se mesure en JavaScript', 'page', p => p.replace("$('tabs').style.setProperty('--i'", "$('tabs').offsetWidth; $('tabs').style.setProperty('--i'"), /bulle de l'onglet actif/],
  ['une cible tactile rétrécie (Modifier à 30 px)', 'page', p => p.replace('.lien-texte { min-height: 44px;', '.lien-texte { min-height: 30px;'), /cibles tactiles/],
  ['le document change (la valeur du texte de jour)', 'doc', d => d.replace('| texte | #000000 |', '| texte | #000001 |'), /« texte » .* jour/],
  ['le document change (l\'accent de nuit)', 'doc', d => d.replace('#7ea2f0', '#7ea2f1'), /« accent » .* nuit/]
];
const neutre = controler(PAGE, DOC, SRC).filter(r => !r[1]).length;
dire('copie INTACTE : 0 constat rouge (le banc ne crie pas au loup)', neutre === 0, ' — ' + neutre + ' rouge(s)');
let mordent = 0;
for (const [nom, cible, f, attendu] of MUTATIONS) {
  const p2 = cible === 'page' ? f(PAGE) : PAGE, d2 = cible === 'doc' ? f(DOC) : DOC, c2 = cible === 'src' ? f(SRC) : SRC;
  const change = (cible === 'page' ? p2 !== PAGE : cible === 'doc' ? d2 !== DOC : c2 !== SRC);
  /* ⛔ une mutation qui ne change rien est une mutation MAL VISÉE : on le dit, on ne conclut rien sur le banc */
  if (!change) { dire('mutation « ' + nom + ' » : le motif ne trouve rien à muter (mutation mal visée)', false); continue; }
  const rouges = controler(p2, d2, c2).filter(r => !r[1]).map(r => r[0]);
  const nomme = rouges.some(t => attendu.test(t));
  if (nomme) mordent++;
  dire('mutation « ' + nom + ' » : ' + rouges.length + ' ✗, dont celui qui la garde', nomme, '\n      rouges : ' + JSON.stringify(rouges.slice(0, 4)));
}
dire('(population) ' + mordent + ' mutations sur ' + MUTATIONS.length + ' sont attrapées', mordent === MUTATIONS.length);

console.log('\n═══ test-856 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
