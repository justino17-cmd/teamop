/* ══ LE THÈME FINAL, CE QUE LA MAQUETTE NE DIT PAS ═══════════════════════════════════════════
   `test-759` compare le document de Justin au code, jeton par jeton. Ce banc-ci garde ce que la
   maquette ne peut pas dire parce qu'elle est une IMAGE : ce qui se passe quand un écran de
   l'application s'écrit, et ce qu'on a trouvé en le regardant au navigateur.

   ⛔ LA FEUILLE « CRÉER » PARLE LA MÊME LANGUE QUE LE MENU. Mesuré le 24 septembre 2026, capture
   de la feuille jour et nuit : dans un menu tout en traits, ses six tuiles restaient en ÉMOJIS —
   `#creer` est une sœur de `.main`, posée sur <body>, et le module des icônes ne balayait que
   `#content`, `#overlay`, `#nav`… Et deux tuiles avaient un autre signe que leur rubrique
   (📦 pour « Box » quand le menu écrit 🧱, 📥 pour « Demande » quand il écrit ✈️) : changés en
   traits, ils auraient donné DEUX dessins pour une même chose. On EXÉCUTE `creerIc` contre le
   vrai NAV, et on exige la feuille dans les deux listes du module (le balayage ET l'observateur :
   l'un sans l'autre ne voit qu'une ouverture sur deux). La preuve au navigateur :
   `scratchpad/tf/q-creer2.js` — six traits sur six, relevés AVANT l'observateur. */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
/* nettoyage SÛR (blocs qui commencent une ligne) : un motif ne doit jamais viser un commentaire */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (lib, c, det) => { if (c) { ok++; console.log('  ✓ ' + lib); } else { ko++; console.log('  ✗ ' + lib + (det !== undefined ? '  → ' + det : '')); } };

console.log('\n── 1. La feuille « Créer » prend le signe de sa rubrique au menu');
{
  /* le vrai NAV : on l'évalue tel qu'il est écrit (ses fonctions ne sont pas appelées) */
  const i0 = NU.indexOf('const NAV = ['), i1 = NU.indexOf('\n];', i0);
  vrai('le menu est trouvé', i0 > 0 && i1 > i0, i0 + '..' + i1);
  const NAV = new Function('return ' + NU.slice(i0 + 'const NAV = '.length, i1 + 2))();
  const items = NAV.flatMap(s => s.items || []);
  vrai('… et il porte des rubriques (population)', items.length > 30, items.length);
  const e0 = NU.indexOf('const CREER_ENTREES=['), e1 = NU.indexOf('\n];', e0);
  vrai('la liste de la feuille est trouvée', e0 > 0 && e1 > e0);
  const CREER = new Function('canCat', 'boxGerer', 'return ' + NU.slice(e0 + 'const CREER_ENTREES='.length, e1 + 2))(() => true, () => true);
  vrai('… et elle porte ses six créations', CREER.length === 6, CREER.length);
  const fc = (NU.match(/function creerIc\(e\)\{[^\n]*\n/) || [''])[0];
  vrai('creerIc existe', fc.length > 40);
  const creerIc = new Function('NAV', fc + '\nreturn creerIc;')(NAV);
  for (const e of CREER) {
    const it = items.find(x => x.k === e.k);
    vrai('« ' + e.l + ' » a le signe de « ' + (it ? it.l : '?') + ' » au menu', it && creerIc(e) === it.ic, it ? creerIc(e) + ' / ' + it.ic : 'rubrique absente');
  }
  /* ⛔ et la tuile L'ÉCRIT : une fonction juste que personne n'appelle ne change rien à l'écran */
  vrai('⛔ la tuile écrit creerIc(e), pas e.ic', /<span class="creer-ic" style="\$\{catVars\(e\.k\)\}">\$\{creerIc\(e\)\}<\/span>/.test(NU));
  const repli = new Function('NAV', fc + '\nreturn creerIc;')([]);
  vrai('une création absente du menu garde son propre signe', repli({ k: 'nulle-part', ic: '🧪' }) === '🧪');
}

console.log('\n── 2. Le module des icônes couvre la feuille');
{
  const rac = (NU.match(/var RACINES=\[([^\]]*)\]/) || ['', ''])[1];
  vrai('la liste du balayage est trouvée', rac.length > 40);
  vrai('⛔ #creer est balayé', /'#creer'/.test(rac), rac.replace(/\s+/g, ' '));
  const obs = (NU.match(/\[([^\]]*)\]\.forEach\(function\(sel\)\{\s*var el=document\.querySelector\(sel\); if\(el\) obs\.observe/) || ['', ''])[1];
  vrai('la liste de l’observateur est trouvée', obs.length > 40);
  vrai('⛔ #creer est observé', /'#creer'/.test(obs), obs);
  /* l'enveloppe : les traits sont posés À L'OUVERTURE, pas 40 ms plus tard pendant la montée */
  const env = (NU.match(/if\(typeof window\.creerOuvrir==='function'\)\{[\s\S]*?\n\s*\}\n\s*\}catch/) || [''])[0];
  vrai('⛔ l’ouverture de la feuille pose ses traits tout de suite', /icones\(document\.getElementById\('creer'\)\)/.test(env) && /creerNatif\.apply\(this,arguments\)/.test(env));
}

console.log('\n── 3. Un bouton n’est jamais plus étroit que son nom');
{
  /* ⚠ Mesuré au navigateur le 24 septembre 2026 (iPhone 393 px) : « Historique du site (1) »
     demandait 169 px et en recevait 152 — son plancher FIXE de 150 px laissait le texte insécable
     déborder sur le bouton voisin. `scratchpad/tf/q-deborde.js` parcourt les 41 rubriques et trois
     fiches : 2 débordements avant, 0 après. Ici on garde la forme du correctif, dans le CODE. */
  const ih = (NU.match(/function intHeadExtras\(i\)\{[\s\S]*?\n(?=function |\/\* ── )/) || [''])[0];
  vrai('l’en-tête de la fiche intervention est trouvé', ih.length > 800, ih.length);
  const btn = lib => (ih.match(new RegExp('<button[^>]*style="([^"]*)"[^>]*>[^<]*' + lib)) || ['', ''])[1];
  for (const lib of ["Indiquer l'arrivée", 'Historique du site']) {
    const st = btn(lib);
    vrai('« ' + lib + ' » est trouvé', st.length > 0);
    vrai('⛔ … et son plancher est son nom (max-content), pas un chiffre', /min-width:max-content/.test(st) && !/min-width:\d+px/.test(st), st);
  }
}

console.log('\n── 4. La barre « Reprendre » : le nom d’abord, la durée entière');
{
  /* ⚠ Mesuré le 24 septembre 2026 : en une seule phrase (« ↩︎ Tu avais commencé : … · il y a N min »),
     la barre passait sur QUATRE lignes sur un iPhone de 393 px. Elle en a deux : le nom en gras, la
     fraîcheur dessous. Et un brouillon vit douze heures : « il y a 700 min » ne se lit pas. On JOUE
     la vraie `multiProposer` dans un bac à sable qui capture ce qu'elle insère. */
  const corps = (APP.match(/function multiProposer\(vue\)\{[\s\S]*?\n\}/) || [''])[0];
  vrai('multiProposer est trouvée', corps.length > 300, corps.length);
  const jouer = (minutes) => {
    let pose = null;
    const contenu = { querySelector: () => null, firstChild: null, insertBefore: d => { pose = d; } };
    const doc = { createElement: () => ({ className: '', innerHTML: '' }) };
    const f = new Function('multiTout', 'multiFrais', 'multiPoserDefil', '$', 'document', 'esc', 'Date',
      corps + '\n; multiProposer("clients");');
    const maintenant = 1_800_000_000_000;
    f(() => ({ clients: { ts: maintenant - minutes * 60000, html: '<div>x</div>', titre: 'Nouveau client' } }),
      () => true, () => {}, id => (id === 'content' ? contenu : null), doc, x => String(x),
      { now: () => maintenant });
    return pose ? pose.innerHTML : '';
  };
  const h5 = jouer(5), h180 = jouer(180);
  vrai('⛔ la barre est posée, et c’est bien la barre', /class="multi-txt"/.test(h5) && /Reprendre/.test(h5), h5.slice(0, 80));
  vrai('⛔ le NOM vient d’abord, en gras', /<span class="multi-txt"><b>Nouveau client<\/b><small>/.test(h5));
  vrai('⛔ 5 minutes s’écrivent en minutes', /il y a 5 min</.test(h5), (h5.match(/<small>[^<]*/) || [''])[0]);
  vrai('⛔ 3 heures s’écrivent en heures, pas « 180 min »', /il y a 3 h</.test(h180) && !/180 min/.test(h180), (h180.match(/<small>[^<]*/) || [''])[0]);
  vrai('la croix a un nom (elle n’a que son ✕)', /aria-label="Oublier"/.test(h5));
}

console.log('\n── 5. Les listes prennent la rangée de la maquette');
{
  /* ⚠ Mesuré le 24 septembre 2026 (iPhone 393 px, thème final) : la carte « façon Organilog » d'une
     intervention écrivait titre et client EN CAPITALES sur quatre lignes à icônes (170 px) ; un
     client portait ✎ et 🗑 sur sa carte (200 px) ; les trois listes ne ressemblaient pas à la
     maquette de Justin. Elles passent toutes par la même pièce, `.tf-rangee` dans un `.tf-groupe`.
     La ligne de box est JOUÉE (elle est pure) ; les deux autres sont lues dans le code. */
  const i0 = APP.indexOf('function boxLigneHtml(b,nv){'), i1 = APP.indexOf('function renderBoxesList(', i0);
  const corpsBox = i0 > 0 && i1 > i0 ? APP.slice(i0, i1) : '';
  vrai('la ligne de box est trouvée', corpsBox.length > 800, corpsBox.length);
  const ligne = (b, stock) => new Function('estStockage', 'boxADuStock', 'boxNouveautes', 'boxTotalStock', 'esc',
    corpsBox + '\nreturn boxLigneHtml;')(x => !!x.stockage, () => stock > 0, () => [], () => ({ u: stock, c: 0 }),
      x => String(x == null ? '' : x))(b, () => []);
  const pleine = ligne({ id: 'b1', numero: 'BX-012', nom: 'Poste cuisine', ville: 'Marseille' }, 40);
  const vide = ligne({ id: 'b2', numero: 'BX-007', nom: 'Camion 2', ville: 'Lyon' }, 0);
  const eteinte = ligne({ id: 'b3', numero: 'BX-003', nom: 'Dépôt', ville: 'Lyon', actif: false }, 0);
  vrai('⛔ c’est une rangée, et elle ouvre la box', /class="tf-rangee" onclick="openBox\('b1'\)"/.test(pleine));
  vrai('⛔ la pastille porte le NUMÉRO en chasse fixe (« 012 » pour BX-012)', /<span class="tf-badge">012<\/span>/.test(pleine), (pleine.match(/tf-badge[^<]*<\/span>/) || [''])[0]);
  vrai('⛔ vert quand la box a du stock, gris quand elle est vide, rouge désactivée',
    /--tf-c:var\(--green\)/.test(pleine) && /--tf-c:var\(--t3\)/.test(vide) && /--tf-c:var\(--red\)/.test(eteinte));
  vrai('⛔ … et le mot « Inactif » est écrit (la couleur ne parle pas seule)', /Inactif/.test(eteinte) && !/Inactif/.test(pleine));
  vrai('la pastille du stock total reste, et rien quand il n’y a rien', /title="Stock total de cette box">40 u</.test(pleine) && !/Stock total/.test(vide));
  vrai('le numéro complet est à droite du nom', /<span class="tf-fin mono"[^>]*>BX-012<\/span>/.test(pleine));
  vrai('⛔ un seul chevron (le dessiné), jamais un « › » écrit', (pleine.match(/class="tf-chev"/g) || []).length === 1 && !/›/.test(pleine));
  const ab = APP.slice(APP.indexOf('function renderBoxesList('), APP.indexOf('function renderBoxesList(') + 6000);
  vrai('⛔ chaque groupe de box est un groupe de verre sous son en-tête', /<div class="tf-entete">\$\{esc\(g==='Sans groupe'\?'Sans groupe':g\)\}<\/div><div class="tf-groupe">`\+groups\[g\]\.map\(b=>boxLigneHtml\(b,candsNv\)\)\.join\(''\)\+'<\/div>'/.test(ab));

  /* les interventions du jour (vue semaine) */
  /* bornée sur sa propre fin (« </div>`; }; ») : une fin plus vague emportait le code d'après */
  const co = (NU.match(/const cardOrg=i=>\{[\s\S]*?<\/div>`; \};/) || [''])[0];
  vrai('la rangée d’intervention est trouvée', co.length > 600, co.length);
  vrai('⛔ plus aucune CAPITALE forcée (titre et client s’écrivent comme ils sont saisis)', !/toUpperCase/.test(co));
  vrai('⛔ la pastille porte le numéro, à la couleur du statut', /<span class="tf-badge">\$\{esc\(String\(i\.num\|\|'—'\)\)\}<\/span>/.test(co) && /--tf-c:\$\{sc\}/.test(co));
  vrai('⛔ le mot du statut est écrit, sauf pour l’état ordinaire', /\$\{i\.statut==='planifiee'\?'':esc\(st\)\+' · '\}/.test(co));
  vrai('⛔ rien n’est perdu : le glisser, « Voir au planning », le compte à rebours, la distance',
    /draggable="true"/.test(co) && /aria-label="Voir au planning"/.test(co) && /fmtCountdownLong/.test(co) && /à \$\{dist\} km/.test(co));
  vrai('   … le bouton rond sur tablette et bureau, le chevron sur téléphone', /class="tf-act tf-large"/.test(co) && /class="tf-chev tf-etroit"/.test(co)
    && /@media\(max-width:599px\)\{ \.tf-rangee \.tf-large\{display:none\} \}/.test(NU) && /@media\(min-width:600px\)\{ \.tf-rangee \.tf-etroit\{display:none\} \}/.test(NU));
  vrai('   … et les passages du jour sont dans UN groupe de verre', /`<div class="tf-groupe">\$\{dayInts\.map\(cardOrg\)\.join\(''\)\}<\/div>`/.test(NU));

  /* les clients */
  const vc = (NU.match(/views\.clients=function\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
  vrai('la liste des clients est trouvée', vc.length > 600, vc.length);
  vrai('⛔ plus de ✎ ni de 🗑 sur chaque client', !/formClient\('\$\{c\.id\}'\)/.test(vc) && !/delItem\('clients'/.test(vc));
  vrai('⛔ la rangée ouvre la fiche', /class="tf-rangee" onclick="ficheClient\('\$\{c\.id\}'\)"/.test(vc));
  const fc = (NU.match(/function ficheClient\(id\)\{[\s\S]*?\n\}\n/) || [''])[0];
  vrai('⛔ … et la FICHE porte « Modifier » et « Supprimer », ce dernier gardé par sa case',
    /onclick="closeModal\(\);formClient\('\$\{c\.id\}'\)">Modifier/.test(fc)
    && /\$\{canCat\('crm','supprimer'\)\?`<button class="btn danger" onclick="closeModal\(\);delItem\('clients','\$\{c\.id\}'\)">Supprimer<\/button>`:''\}/.test(fc));
  vrai('le segmenté Tous · Pros · Particuliers ne paraît que s’il trie quelque chose', /const typeBar=\(nPro&&nPro<_tous\.length\)\?/.test(vc));
}

console.log('\n── 6. La connexion prend le fond du thème');
{
  /* ⚠ Mesuré le 24 septembre 2026 : sous le thème TEAM OP, la connexion peignait encore
     `radial-gradient(… rgba(74,222,128,.14) …), var(--deep)` — une lueur VERTE du temps où
     l'application était verte, sur un aplat. Elle prend la page du thème, comme l'application. */
  vrai('⛔ la connexion peint la page du thème (diagonale et dégradés)', /html\[data-marque\]\[data-verre\] \.login\{background:var\(--vr-page\)!important\}/.test(NU));
}

console.log('\n── 7. Ce que la relecture et l’audit profond ont relevé sur la v745');
{
  /* ⚠ Relecture (24 septembre 2026, nuit) : « Terminée » est passée au vert, mais le « ✓ Oui » de la
     fiche restait à la teinte (marine par défaut) juste en dessous — deux couleurs pour un état. */
  vrai('⛔ le « ✓ Oui » d’une intervention terminée est vert, comme son statut', /'<b style="color:var\(--green\)">✓ Oui<\/b>'/.test(NU) && !/'<b style="color:var\(--acc-txt\)">✓ Oui<\/b>'/.test(NU));
  vrai('⛔ la croix d’une couleur perso répond sur 38 px (24 dessinés + 7 de chaque côté)', /\.tc-retirer::after\{content:'';position:absolute;inset:-7px/.test(NU));
  /* ⚠ Audit profond (iPhone 390 et Android 360, valeurs longues) : 39 titres et métas coupés par
     « … » SANS infobulle dans les nouvelles rangées. Chaque texte coupable porte son texte entier. */
  const co = (NU.match(/const cardOrg=i=>\{[\s\S]*?<\/div>`; \};/) || [''])[0];
  const vc = (NU.match(/views\.clients=function\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
  const bl = NU.slice(NU.indexOf('function boxLigneHtml('), NU.indexOf('function renderBoxesList('));
  vrai('⛔ intervention : titre, statut·client et adresse portent leur infobulle',
    /<b class="tf-titre" title="\$\{esc\(i\.titre\|\|'Intervention'\)\}">/.test(co) && /<span title="\$\{esc\(l2t\)\}">/.test(co) && /<span title="\$\{esc\(l3t\)\}">/.test(co));
  vrai('⛔ client : nom et « ville · téléphone » portent leur infobulle', /<b class="tf-titre" title="\$\{esc\(c\.nom\)\}">/.test(vc) && /<span title="\$\{esc\(metaT\|\|'Fiche à compléter'\)\}">/.test(vc));
  vrai('⛔ box : nom et ville portent leur infobulle', /<b class="tf-titre" title="\$\{esc\(b\.nom\|\|b\.adresse\|\|b\.numero\|\|'Box'\)\}">/.test(bl) && /<div class="tf-l2"><span title="/.test(bl));
}

console.log('\n── 8. Les contrastes relevés AU PIXEL, par le vrai flou (SwiftShader)');
{
  /* ⚠ `scratchpad/audit-pixel.js` (TEL=1, TH=dark,light, MARQUE=opgestion puis TEAM OP, 5 écrans) :
     OP GESTION de nuit rendait 30 textes sous 4,5 (la vitre verte saturée à 220 % s'éclaircissait),
     TEAM OP 1 (le sous-titre de page) ; et la pastille de la cloche 3,58 dans les deux. Après : 0 et 0.
     Ce banc garde la FORME des correctifs ; la preuve reste la mesure au pixel. */
  const lum = h => { const n = parseInt(h.replace('#', ''), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const rf = (NU.match(/html\[data-marque\]\[data-verre\]\{ --red-fill:(#[0-9A-Fa-f]{6}); --on-red:(#[0-9A-Fa-f]{6}); \}/) || []);
  vrai('⛔ la pastille de la cloche prend l’aplat rouge du thème et SON encre', rf.length === 3 && /\.topbar \.bell-count\{\s*background:var\(--red-fill\)!important;color:var\(--on-red\)!important/.test(NU));
  vrai('   … et son blanc tient 4,5 sur ce rouge (calculé)', rf.length === 3 && ctr(rf[1], rf[2]) >= 4.5, rf.length === 3 ? ctr(rf[1], rf[2]).toFixed(2) : '?');
  vrai('⛔ le sous-titre de page s’écrit au second plan (--t2)', /html\[data-marque\]\[data-refonte\] \.ph-sub\{font-size:15px!important;color:var\(--t2\)!important/.test(NU));
  vrai('⛔ l’heure d’une carte de la frise : un quart de sa couleur, le reste à l’encre du thème', /html\[data-marque\] \.tdb-pc b \.hh\{color:color-mix\(in srgb,var\(--cc\) 25%,var\(--t1\)\)!important\}/.test(NU));
  vrai('⛔ les en-têtes de la frise et la charge d’un technicien au second plan (le jour du jour garde la teinte)', /html\[data-marque\] \.tdb-jh:not\(\.auj\),html\[data-marque\] \.tdb-tec small\{color:var\(--t2\)!important\}/.test(NU));
  vrai('⛔ de nuit, les initiales d’un avatar : un tiers de teinte', /html\[data-marque\]\[data-theme="dark"\] \.avatar\{color:color-mix\(in srgb,var\(--acc\) 35%,var\(--t1\)\)!important\}/.test(NU));
  const opgN = (NU.match(/html\[data-marque="opgestion"\]\[data-verre\]\[data-theme="dark"\]\{[\s\S]*?\n\}/) || [''])[0];
  vrai('⛔ OP GESTION de nuit : le curseur du segmenté à 15 % et l’orange éclairci', /--tf-curseur:rgba\(255,255,255,\.15\)/.test(opgN) && /--org:#F0B96E/.test(opgN));
  vrai('⛔ OP GESTION de nuit : second verre à 8 %, boutons secondaires à 6 %, pastille du menu assombrie', /--vr-fond2:rgba\(255,255,255,\.08\)/.test(opgN) && /--tint-gris:rgba\(0,0,0,\.22\)/.test(opgN) && /--rf-2nd:rgba\(255,255,255,\.06\)/.test(opgN));
  vrai('⛔ de nuit, le compteur d’une rubrique active est une pastille sombre', /html\[data-marque\]\[data-theme="dark"\] \.nav-item\.active \.badge\{background:rgba\(0,0,0,\.28\)!important/.test(NU));
  vrai('⛔ OP GESTION de nuit : la teinte de marque s’écrit à 66 % de blanc', /\[data-accent="opgestion"\]\{--acc-txt:color-mix\(in srgb,#fff 66%,var\(--acc-src\)\)\}/.test(NU));
  vrai('⛔ de jour, l’orange des statuts un cran plus sombre (#7A4900)', /--org:#7A4900;/.test(NU));
}

console.log('\n── 9. La passe des DOUZE teintes, au pixel (les deux thèmes, jour et nuit)');
{
  /* ⚠ `scratchpad/audit-pixel.js` (TEL=1, ACC = les douze, TH=dark,light, MARQUE=teamop puis
     opgestion, Planning, Stock et l'écran « Thème et couleur » compris) : 8 402 textes, 207 sous le
     seuil sous TEAM OP et 76 sous OP GESTION — et, sur la barre d'onglets, 49 et 36 de plus.
     Ce banc garde la FORME des correctifs et REFAIT le calcul de la barre ; la preuve reste le pixel. */
  const lum = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const bloc = sel => { const i = NU.indexOf(sel + '{'); return i < 0 ? '' : NU.slice(i, NU.indexOf('\n}', i)); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgba = t => { const m = String(t).match(/rgba\((\d+),(\d+),(\d+),(\.\d+|1)\)/); return m ? { c: [+m[1], +m[2], +m[3]], a: +m[4] } : null; };
  /* la barre : les fonds relevés AU PIXEL sous 10 % de blanc (la maquette), les pires de la passe */
  const PIRES = { teamop: [[50, 90, 170], [54, 90, 162], [46, 82, 158]], opgestion: [[62, 118, 102], [66, 118, 102], [58, 114, 98]] };
  for (const M of ['teamop', 'opgestion']) {
    const b = bloc('html[data-marque="' + M + '"][data-verre][data-theme="dark"]');
    const barre = rgba((b.match(/--tf-barre:(rgba\([^)]*\))/) || [])[1]);
    const t3 = (b.match(/--t3:(#[0-9A-Fa-f]{6})/) || [])[1];
    vrai('⛔ ' + M + ' de nuit : la pilule d’onglets porte un voile SOUS son blanc (--tf-barre)', !!barre && barre.a >= .5 && !!t3, b ? (barre ? JSON.stringify(barre) : 'absent') : 'bloc introuvable');
    if (barre && t3) {
      /* ce qui passe SOUS la vitre, retrouvé depuis le relevé (fond = dessous × .9 + blanc × .1) */
      const pire = Math.min(...PIRES[M].map(F => { const des = F.map(v => (v - 25.5) / .9); return ctr(hex(t3), des.map((d, i) => d * (1 - barre.a) + barre.c[i] * barre.a)); }));
      vrai('   … et les libellés des onglets y tiennent 4,5 sur le pire bloc relevé (calculé)', pire >= 4.5, pire.toFixed(2));
    }
  }
  vrai('⛔ le Planning : un jour sur deux au second plan, plus en bleu sur sa teinte', /html\[data-marque\] \.plm-bande\.alt:not\(\.pers\)\{color:var\(--t2\)!important\}/.test(NU));
  vrai('   … le bandeau d’une PERSONNE garde sa couleur (la règle l’écarte)', !/html\[data-marque\] \.plm-bande\.alt\{color/.test(NU));
  vrai('⛔ de nuit, le nom et le total d’une fenêtre de planning à l’encre du thème', /html\[data-marque\]\[data-theme="dark"\] \.plt-bh \.qui,html\[data-marque\]\[data-theme="dark"\] \.plt-bh \.tot\{color:var\(--t1\)!important\}/.test(NU));
  vrai('⛔ « Thème et couleur » de nuit : cartes au premier verre, sans reflet', /html\[data-verre\]\[data-theme="dark"\] \.tc-carte,html\[data-verre\]\[data-theme="dark"\] \.tc-rangee\{background:var\(--vr-fond\)\}/.test(NU));
  vrai('   … libellés, sous-titres et groupes au second plan', /\.tc-nom,\.tc-rangee-txt span,\.tc-groupe\{color:var\(--t2\)\}/.test(NU));
  vrai('   … le curseur de Jour / Nuit / Auto à 12 % de nuit', /\[data-theme="dark"\] \.filters\.tc-modes \.chip\.active\{background:rgba\(255,255,255,\.12\)!important\}/.test(NU));
  vrai('⛔ le fondu « il y a une suite » ne va qu’à ce qui défile (tc-modes et segmentés qui tiennent)', /html\[data-refonte\] \.filters\.tc-modes,html\[data-refonte\] \.filters\.seg-on:not\(\.seg-deborde\)\{-webkit-mask-image:none!important;mask-image:none!important\}/.test(NU));
  /* segInit pose `seg-deborde` AVANT le curseur, et seulement sur un groupe qui défile vraiment */
  const si = NU.slice(NU.indexOf('function segInit('), NU.indexOf('\nfunction segGeste('));
  vrai('   … et segInit le pose sur un groupe qui défile vraiment', si.length > 200 && /o\.deborde=o\.g\.scrollWidth>o\.g\.clientWidth\+1;/.test(si) && /g\.classList\.toggle\('seg-deborde', o\.deborde\);/.test(si));
  vrai('⛔ OP GESTION de nuit : l’indigo à 70 % de blanc (la teinte la plus sombre)', /\[data-accent="indigo"\]\{--acc-txt:color-mix\(in srgb,#fff 70%,var\(--acc-src\)\)\}/.test(NU));
  vrai('⛔ de nuit, un texte à la teinte ne se pose pas sur un voile de la même teinte (frise, bandeau du jour)', /html\[data-marque\]\[data-theme="dark"\] \.tdb-jh\.auj,html\[data-marque\]\[data-theme="dark"\] \.plm-bande:not\(\.alt\):not\(\.pers\)\{color:var\(--t1\)!important\}/.test(NU));
  vrai('⛔ TEAM OP de nuit : l’indigo à 58 % de blanc', /html\[data-marque="teamop"\]\[data-verre\]\[data-theme="dark"\]\[data-accent="indigo"\]\{--acc-txt:color-mix\(in srgb,#fff 58%,var\(--acc-src\)\)\}/.test(NU));
  vrai('⛔ de jour, l’encre de l’orange foncée d’un cran (50 % de noir)', /\[data-theme="light"\]\[data-accent="orange"\]\{--acc-txt:color-mix\(in srgb,#000 50%,var\(--acc-src\)\)\}/.test(NU));
  vrai('⛔ de jour, l’encre du graphite foncée d’un cran (42 % de noir)', /\[data-theme="light"\]\[data-accent="graphite"\]\{--acc-txt:color-mix\(in srgb,#000 42%,var\(--acc-src\)\)\}/.test(NU));
  vrai('⛔ de jour, l’encre du vert système foncée d’un cran (48 % de noir)', /\[data-theme="light"\]\[data-accent="green"\]\{--acc-txt:color-mix\(in srgb,#000 48%,var\(--acc-src\)\)\}/.test(NU));
}

console.log('\n═══ test-806 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
