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

console.log('\n═══ test-806 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
