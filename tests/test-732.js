/* ⛔ CE QUE CE FICHIER GARDE — LE CONVERTISSEUR DU SOCLE. ÉTAPE 2, BANCS N° 1 ET N° 3.

   `opRecomposer(opDecomposer(db))` doit rendre EXACTEMENT `db`. Pas « à peu près », pas
   « les données importantes » : champ pour champ, clé pour clé. Une clé oubliée, un
   `undefined` devenu `0`, une collection vide évaporée — et ce sont les données d'un client
   qui disparaissent à la première synchro, sans message et sans pierre tombale.

   ⛔ CE BANC A DÉJÀ TROUVÉ DEUX DÉFAUTS, AU PREMIER PASSAGE, DANS LE CODE ÉCRIT POUR LUI :

     1. ONZE COLLECTIONS VIDES s'évanouissaient — `absences`, `brouillons`, `chantiers`,
        `groupes`, `indispos`, `interventionsArchive`, `planJournal`, `planNotes`,
        `plansSite`, `registres`, `taches`. Elles ne portent aucun enregistrement, donc aucune
        ligne, donc la recomposition ne les recréait pas. Ce n'est pas cosmétique :
        `collsFusion` énumère « toute clé qui se trouve être un tableau », et une base sans
        elles n'a plus la même forme que celle qu'on a décomposée.
     2. UNE BOX À STOCK VIDE revenait SANS stock. `stock` absent et `stock:{}` ne sont pas la
        même chose : poser un `{}` change l'empreinte de la box, donc son `_m`, donc la fusion.
        Et la présence de `_ms`, même vide, décide d'un COMPORTEMENT dans `estampiller()`.

   C'est la démonstration de pourquoi ce banc vient avant tout branchement : les deux défauts
   étaient invisibles à la lecture, et aucun des 87 autres bancs ne pouvait les voir.

   ⛔ LE BANC N° 3 — LA PAGINATION — EST CELUI QU'ON OUBLIERAIT. L'aller-retour complet y est
   STRUCTURELLEMENT AVEUGLE : il applique toutes les lignes d'un coup. Or le serveur sert des
   PAGES. Une box de 200 lignes de stock dont 60 seulement sont arrivées, si la recomposition
   RECONSTRUIT au lieu de FUSIONNER, perd 140 lignes — et `estampiller()` pose alors 140
   marques de RETRAIT au premier geste du technicien, qui partent chez toute l'équipe. C'est
   la panne du 15 septembre par la porte d'à côté. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, a) => v(t, !!a, true);

console.log('\n── 732 · le convertisseur du socle : aller-retour et pagination ──');

/* On extrait les VRAIES fonctions du fichier livré et on les exécute. Rien n'est recopié :
   si l'une change de dépendances, ce banc tombe — et c'est le comportement voulu. */
const bloc = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(i, f); };
const ligne = (sig) => { const i = SRC.indexOf(sig); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const objet = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '{}';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(SRC.indexOf('{', i), f); };

const iCat = SRC.indexOf('const CATALOGUE=');
const code = [
  iCat < 0 ? '' : SRC.slice(iCat, SRC.indexOf('\n', SRC.indexOf('];', iCat))),
  ligne('const PH_MARQUE='), ligne('const isoDe = d =>'), ligne('const todayISO = () =>'),
  bloc('function slugNom('), bloc('function idCatalogue('), bloc('function defaultPerms('),
  bloc('function seed('), bloc('function migrate('), bloc('function recEmpreinte('),
  'const OP_CLASSES = ' + objet('const OP_CLASSES = {') + ';',
  ligne('const OP_ID_DE ='), ligne("const OP_REGLAGES ="), ligne("const OP_BOX_FORME ="), ligne("const OP_VIDES ="),
  bloc('function opSansTampon('), bloc('function opCanon('), bloc('function opEmpreinte('),
  bloc('function opFichiersDe('), bloc('function opAmpute('), bloc('function syncSortirPieces('),
  bloc('function opIdDerive('), bloc('function opSignature('),
  bloc('function opDecomposer('), bloc('function opRecomposer('),
].join('\n');

let n = 0, api = null;
try {
  api = new Function('uid', 'BETA_ESSAI', 'ID_ADMIN_DEPART', 'CAT_LIST', 'DASH_DEFAULT', 'FOURS_VER', 'PRIX_VER', 'db', 'console',
    code + '\nreturn {seed,migrate,opDecomposer,opRecomposer,recEmpreinte,opEmpreinte,opSignature,opAmpute,syncSortirPieces,OP_CLASSES};')
    (() => 'u' + (++n), false, 'admin0', [], [], 1, 1, {}, { log() {}, warn() {}, error() {} });
} catch (e) { console.log('      (extraction : ' + e.message + ')'); }
vrai('⛔ les VRAIES fonctions du fichier livré s\'extraient et s\'exécutent', !!(api && api.opDecomposer && api.opRecomposer));
if (!api) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exitCode = 1; return; }

/* Comparaison à CLÉS TRIÉES : l'ordre d'insertion d'un objet n'est pas une donnée, et le
   comparer ferait crier le banc pour rien — donc on finirait par le débrancher. */
const tri = (o) => JSON.stringify(o, (k, val) => {
  if (val && typeof val === 'object' && !Array.isArray(val)) { const t = {}; Object.keys(val).sort().forEach(x => { t[x] = val[x]; }); return t; }
  return val;
});
/* Quand deux bases diffèrent, on veut savoir OÙ — un « false » tout seul coûte une heure. */
const diff = (a, b) => {
  const A = JSON.parse(tri(a)), B = JSON.parse(tri(b)), out = [];
  Object.keys(A).forEach(k => { if (!(k in B)) out.push('MANQUE ' + k); });
  Object.keys(B).forEach(k => { if (!(k in A)) out.push('EN TROP ' + k); });
  Object.keys(A).forEach(k => { if (k in B && tri(A[k]) !== tri(B[k])) out.push('DIFFÈRE ' + k); });
  return out;
};

/* ══ 1. (a) LE SEMIS RÉEL ═════════════════════════════════════════════════════════════════ */
console.log('\n⛔ Aller-retour sur le semis RÉEL');
{
  const base = api.seed(); api.migrate(base);
  const lignes = api.opDecomposer(base);
  vrai('le semis produit des lignes', lignes.length > 100);
  const refait = api.opRecomposer(lignes, {});
  v('⛔ opRecomposer(opDecomposer(semis)) est IDENTIQUE au semis', diff(base, refait), []);
  /* Les lignes doivent être poussables telles quelles : c'est le format de
     `/api/op/pousser`, éprouvé par test-723. Un second format à traduire quelque part
     finirait par diverger de celui-ci. */
  const malFormees = lignes.filter(l => !l || !l.c || l.id == null || (!l.sup && !('r' in l)));
  v('⛔ toute ligne a la forme que le serveur accepte ({c,id,m,r,e} ou {c,id,m,sup})', malFormees.length, 0);
  v('   et aucune ne porte `seq` (il re-tamponnerait tout à chaque envoi)', lignes.filter(l => 'seq' in l).length, 0);
  const tampons = lignes.filter(l => l.r && typeof l.r === 'object' && ('_m' in l.r || '_ms' in l.r));
  v('⛔ aucun corps ne porte `_m` ni `_ms` (ils entreraient dans recEmpreinte)', tampons.length, 0);
}

/* ══ 1. (b) UNE BASE SYNTHÉTIQUE PORTANT LES 83 CLÉS ══════════════════════════════════════
   Le semis n'en a que 34 : les autres naissent à l'usage. Sans ce cas-ci, la moitié du
   classement ne serait jamais exercée — et c'est la moitié exotique. */
console.log('\n⛔ Aller-retour sur une base SYNTHÉTIQUE portant toutes les clés');
function synthetique() {
  const syn = {}; let z = 0; const zid = () => 'z' + (++z);
  Object.keys(api.OP_CLASSES).forEach(k => {
    const g = api.OP_CLASSES[k];
    if (g === 'liste') syn[k] = [{ id: zid(), nom: 'A ' + k, n: 1, _m: 1700000000000 }, { id: zid(), nom: 'B ' + k, n: 2, _m: 1700000000001 }];
    else if (g === 'liste_cle') syn[k] = [{ cle: 'r1', nom: 'Rôle 1', _m: 1700000000002 }];
    else if (g === 'liste_ts') syn[k] = [{ ts: 1700000000100, t: 'un' }, { ts: 1700000000200, t: 'deux', _m: 1700000000201 }];
    else if (g === 'dict') syn[k] = { a: { x: 1 }, b: [1, 2, 3] };
    else if (g === 'reglage') syn[k] = (k === 'entreprise') ? { nom: 'Ent', ville: 'La Rochelle' }
      : (k === 'societes' ? ['S1', 'S2'] : (k === 'dashLayout' ? ['a', 'b'] : 'val-' + k));
  });
  /* Les trois formes de box qui comptent, et qui ne se ressemblent pas : celle qui date ses
     lignes ET porte une marque de RETRAIT, celle qui ne date rien, et celle dont le stock et
     les marques sont vides mais PRÉSENTS. */
  syn.boxes = [
    { id: 'bx1', nom: 'Box 1', _m: 1700000000300, stock: { p1: { ctn: 1, u: 2 }, p2: { ctn: 0, u: 5 } }, _ms: { p1: 1700000000301, p2: 1700000000302, pRetire: 1700000000303 } },
    { id: 'bx2', nom: 'Box 2 sans marques', stock: { p9: { ctn: 3, u: 0 } } },
    { id: 'bx3', nom: 'Box 3 vide mais présente', _m: 1700000000400, stock: {}, _ms: {} },
  ];
  syn._tombes = { clients: { 'c-mort': 1700000000500 }, produits: { 'p-mort': 1700000000501 } };
  syn.usersSupprimes = [{ id: 'u-mort', ts: 1700000000600 }];
  return syn;
}
{
  const syn = synthetique();
  v('la base synthétique porte bien toutes les clés classées', Object.keys(syn).length, Object.keys(api.OP_CLASSES).length);
  const lignes = api.opDecomposer(syn);
  const refait = api.opRecomposer(lignes, {});
  v('⛔ aller-retour IDENTIQUE sur les 83 clés', diff(syn, refait), []);

  /* ⛔ LA MARQUE DE RETRAIT. Oubliée, le socle naît sans aucune trace des retraits — et un
     appareil resté trois semaines au fond d'un camion RESSUSCITE chez toute l'équipe les
     produits qu'on avait retirés à la main. */
  const retraits = lignes.filter(l => l.c === 'box_stock' && l.sup);
  v('⛔ le produit RETIRÉ de bx1 voyage comme une tombe', retraits.map(l => l.id), ['bx1|pRetire']);
  v('   datée du RETRAIT, pas de maintenant', retraits[0] && retraits[0].sup, 1700000000303);
  const bx1 = refait.boxes.find(b => b.id === 'bx1');
  v('   et la marque revient dans `_ms`, sans revenir dans le stock',
    [bx1._ms.pRetire, 'pRetire' in bx1.stock], [1700000000303, false]);

  /* La maille fine : une ligne de stock par produit, chacune avec SA date. C'est tout le
     chantier — deux personnes sur deux produits de la même box ne se marchent plus dessus. */
  const stock = lignes.filter(l => l.c === 'box_stock' && !l.sup);
  v('⛔ le stock voyage LIGNE PAR LIGNE, pas en bloc', stock.map(l => l.id).sort(), ['bx1|p1', 'bx1|p2', 'bx2|p9']);
  v('   et chaque ligne porte SA date', stock.filter(l => l.c === 'box_stock').map(l => [l.id, l.m]).sort().map(x => x[1]),
    [1700000000301, 1700000000302, 0]);

  /* Les dictionnaires clé par clé : les réunir en bloc écrasait le plan d'appâtage de
     24 postes d'un client par celui de 18 postes d'un autre, en entier, sans tombe. */
  v('⛔ un dictionnaire voyage CLÉ PAR CLÉ', lignes.filter(l => l.c === 'plansSite').map(l => l.id).sort(), ['a', 'b']);

  /* Les tombes : ce ne sont pas des données, ce sont des absences datées. Et celles des
     comptes ont leur mécanique propre — les confondre les mélangerait. */
  v('⛔ les pierres tombales voyagent', lignes.filter(l => l.sup && l.c !== 'box_stock').map(l => l.c + ':' + l.id).sort(),
    ['clients:c-mort', 'produits:p-mort', 'users_sup:u-mort']);

  /* ⛔⛔ LE MÊME DÉCOUPAGE DEUX FOIS DOIT DONNER LES MÊMES IDENTIFIANTS. Sans ce contrôle,
     le banc est AVEUGLE à la faute qui compte pour `mailSent` et `planJournal` : leur
     identifiant est dérivé du contenu justement parce qu'un `uid()` changerait à chaque
     passage — et chaque synchro recréerait alors une copie de chaque ligne, pour toujours.
     ⚠️ C'EST UNE LEÇON DE MÉTHODE, pas seulement un contrôle de plus : remettre `Math.random()`
     dans `opIdDerive` ne faisait tomber AUCUN des 28 contrôles d'alors. L'aller-retour est un
     passage UNIQUE, et un identifiant aléatoire y reste cohérent avec lui-même. Une mutation
     qui ne casse rien ne prouve pas que le code est bon : elle peut prouver que le banc ne
     regarde pas au bon endroit. */
  {
    const a1 = api.opDecomposer(syn).map(l => l.c + '|' + l.id).sort();
    const a2 = api.opDecomposer(syn).map(l => l.c + '|' + l.id).sort();
    v('⛔ décomposer DEUX FOIS la même base donne les MÊMES identifiants', a1, a2);
    /* Et le contre-test : ils doivent quand même être uniques, sinon deux lignes écraseraient
       la même. Un identifiant stable ET collisionnant serait pire qu'un aléatoire. */
    v('   et ils sont tous distincts', a1.length, new Set(a1).size);
    /* Deux enregistrements de même date mais de contenu différent ne se confondent pas. */
    const deux = api.opDecomposer({ mailSent: [{ ts: 42, t: 'un' }, { ts: 42, t: 'deux' }] })
      .filter(l => l.c === 'mailSent').map(l => l.id);
    v('   deux envois à la même milliseconde restent distincts', deux.length, new Set(deux).size);
  }

  /* ⛔ Un enregistrement JAMAIS daté part avec `m:0`, que le serveur refuse (`non_date`) —
     et c'est JUSTE : un enregistrement sans `_m` est tuable par n'importe quelle tombe de
     n'importe quelle époque. Le pousser serait pire que le refuser. */
  const sansDate = lignes.filter(l => !l.sup && !l.m);
  vrai('⛔ un enregistrement jamais daté part avec m:0 (le serveur le refusera, et c\'est juste)', sansDate.length > 0);
}

/* ══ 1. (c) LA BASE RÉELLE D'UN CLIENT — SI ELLE EST LÀ ══════════════════════════
   Le semis a 34 clés, la base synthétique les 83 — mais aucune des deux n'a les DONNéES d'une
   entreprise qui travaille depuis un an : des interventions à photos, des box à deux cents
   produits, des enregistrements écrits par des versions qui n'existent plus. C'est là que
   vivent les formes qu'on n'a pas imaginées.
   ⛔ CE FICHIER NE SE COMMITE JAMAIS : ce sont les données réelles d'un client. Il se produit
   par `exportData()` sur un appareil et se dépose dans le scratchpad, qui est hors du dépôt.
   Sans lui, ce contrôle se tait — et le dit, pour qu'on sache que l'étape 2 n'est pas
   complètement prouvée tant que personne ne l'a fourni. */
{
  const chemins = [process.env.TEAMOP_BASE_REELLE, path.join(RACINE, 'scratchpad', 'base-reelle.json')].filter(Boolean);
  const trouve = chemins.find(c => { try { return fs.existsSync(c); } catch (e) { return false; } });
  if (!trouve) {
    console.log('\n  … base réelle absente : le contrôle (c) du banc n° 1 ATTEND un export.');
    console.log('    `exportData()` sur un appareil → scratchpad/base-reelle.json (jamais commité).');
  } else {
    console.log('\n⛔ Aller-retour sur une base RÉELLE');
    let reelle = null;
    try { reelle = JSON.parse(fs.readFileSync(trouve, 'utf8')); } catch (e) {}
    vrai('la base réelle se lit', !!reelle);
    if (reelle) {
      const b = reelle.db || reelle;   // l'export enveloppe parfois la base
      const cles = Object.keys(b);
      v('⛔ toutes ses clés sont classées', cles.filter(k => !api.OP_CLASSES[k]), []);
      const l = api.opDecomposer(b);
      console.log('      ' + cles.length + ' clés, ' + l.length + ' lignes');
      v('⛔ aller-retour IDENTIQUE sur la base réelle', diff(b, api.opRecomposer(l, {})), []);
      let parPages = {};
      for (let i = 0; i < l.length; i += 400) parPages = api.opRecomposer(l.slice(i, i + 400), parPages);
      v('⛔ et par pages de 400 aussi', diff(b, parPages), []);
    }
  }
}

/* ══ 3. ⛔ LA PAGINATION — LE BANC QUE L'ALLER-RETOUR NE PEUT PAS FAIRE ═══════════════════ */
console.log('\n⛔ Pagination : les lignes arrivent par pages, et rien ne doit se perdre');
{
  const syn = synthetique();
  /* Une box LOURDE : 200 lignes de stock, comme chez un vrai client. C'est le cas où la
     coupure tombe forcément au milieu. */
  const gros = { id: 'bxGros', nom: 'Box de 200 produits', _m: 1700000001000, stock: {}, _ms: {} };
  for (let i = 0; i < 200; i++) { gros.stock['pg' + i] = { ctn: i % 3, u: i }; gros._ms['pg' + i] = 1700000001000 + i; }
  syn.boxes.push(gros);

  const lignes = api.opDecomposer(syn);
  vrai('la base de pagination est bien grosse', lignes.length > 300);

  for (const taille of [1, 7, 50, 400]) {
    let refait = {};
    for (let i = 0; i < lignes.length; i += taille) refait = api.opRecomposer(lignes.slice(i, i + taille), refait);
    v('⛔ par pages de ' + taille + ' : la base recomposée est IDENTIQUE', diff(syn, refait), []);
  }

  /* ⛔ LE CONTRÔLE QUI COMPTE, ET QUI N'EST PAS LE MÊME QUE CI-DESSUS. Après une page
     PARTIELLE, la box ne doit pas avoir perdu ses autres lignes — sinon `estampiller()` pose
     autant de marques de RETRAIT qu'il manque de produits, et elles partent chez toute
     l'équipe au premier geste du technicien. On applique donc UNE SEULE page au milieu d'une
     base DÉJÀ complète, et on exige que rien n'ait bougé. */
  const complet = api.opRecomposer(lignes, {});
  const avant = complet.boxes.find(b => b.id === 'bxGros');
  v('   la box complète porte bien ses 200 lignes', Object.keys(avant.stock).length, 200);
  const page = lignes.filter(l => l.c === 'box_stock' && l.id.indexOf('bxGros|') === 0).slice(60, 120);
  const apres = api.opRecomposer(page, complet).boxes.find(b => b.id === 'bxGros');
  v('⛔ une page de 60 lignes appliquée SUR la base complète n\'en retire AUCUNE', Object.keys(apres.stock).length, 200);
  v('⛔ et elle ne crée AUCUNE marque de retrait', Object.keys(apres._ms).filter(p => !(p in apres.stock)).length, 0);

  /* Et l'inverse, qui prouve que le contrôle n'est pas vide : appliquer la même page sur une
     base VIDE ne donne bien que 60 lignes. Sans cette ligne, une recomposition qui ne ferait
     rien du tout passerait les deux contrôles ci-dessus. */
  const seule = api.opRecomposer(page, {}).boxes.find(b => b.id === 'bxGros');
  v('   (contrôle du contrôle : la même page sur une base vide n\'en donne que 60)', Object.keys(seule.stock).length, 60);

  /* ⛔ UNE LIGNE DE STOCK PEUT ARRIVER AVANT SA BOX, ET C'EST LE VRAI PIÈGE DE LA PAGINATION.
     La coupure tombe où elle tombe. Une recomposition qui refuse la ligne parce que la box
     n'est pas encore là perd le stock d'une box entière, en silence, une page sur deux.
     ⚠️ On ne teste PAS un envoi intégralement inversé : l'ordre des enregistrements DANS une
     collection porte du sens (`journal` et `telecollectes` sont en `unshift`, du plus récent
     au plus ancien) et le serveur sert par `seq` croissant, donc dans l'ordre. Exiger
     l'identité sur un ordre que le système ne produit jamais ferait crier le banc pour rien —
     et un banc qui crie pour rien finit débranché. On teste donc ce qui arrive vraiment :
     les lignes d'une box servies AVANT la ligne de la box. */
  const desBox = lignes.filter(l => l.c === 'box_stock' || l.c === 'boxes' || l.c === '_box_forme');
  const stockDAbord = desBox.filter(l => l.c !== 'boxes').concat(desBox.filter(l => l.c === 'boxes'));
  const r2 = api.opRecomposer(stockDAbord, {});
  const parId = (b) => { const o = {}; (b.boxes || []).forEach(x => { o[x.id] = x; }); return o; };
  v('⛔ stock servi AVANT sa box : les box sont quand même complètes', diff(parId(syn), parId(r2)), []);
}

/* ══ 4. ⛔ LA SIGNATURE CANONIQUE — BANC N° 4 DU PLAN ════════════════════════════
   C'est le SEUL garde-fou du chantier : l'étape 4 ne se juge que par lui, chaque nuit, en
   comparant ce que l'appareil a à ce que le serveur a. S'il est bruyant, on le débranche —
   et on perd la seule chose qui dit que la double écriture est saine.
   Sa qualité tient à une propriété et une seule : deux machines qui ont LA MÊME CHOSE
   calculent LA MÊME VALEUR, quel que soit l'ordre dans lequel elles l'ont reçue ou rangée. */
console.log('\n⛔ La signature canonique : deux machines, la même chose, la même valeur');
{
  const syn = synthetique();
  const lignes = api.opDecomposer(syn);
  const s1 = api.opSignature(lignes);
  vrai('la signature rend une valeur', !!(s1 && s1.sig));
  /* ⛔ ELLE NOMME LA COLLECTION ET LE NOMBRE. Une alerte qui dit « ça diverge » sans dire
     OÙ fait chercher une heure — et c'est ce que la Tour doit afficher à l'étape 4. */
  vrai('   et le détail par collection, avec le nombre de lignes',
    s1.par && s1.par.clients && s1.par.clients.n > 0 && !!s1.par.clients.sig);
  /* ⚠️ Le compte est celui des LIGNES, tombes comprises — pas celui des enregistrements
     vivants. `clients` a deux fiches ET une pierre tombale : trois lignes. C'est la bonne
     maille, parce que c'est celle que le serveur compte de son côté ; comparer des
     enregistrements vivants à des lignes ferait diverger les deux tous les soirs. */
  v('   (le compte est celui des LIGNES, tombes comprises)',
    s1.par.clients.n, syn.clients.length + Object.keys(syn._tombes.clients).length);

  /* L'ORDRE DE SERVICE NE DOIT RIEN CHANGER. Le serveur rend ses lignes par `seq`, le client
     les a dans l'ordre de `db` : sans indépendance à l'ordre, les deux divergeraient
     TOUJOURS, dès le premier soir, et pour rien. */
  const melange = lignes.slice().reverse();
  v('⛔ les mêmes lignes dans un AUTRE ordre donnent la MÊME signature', api.opSignature(melange).sig, s1.sig);

  /* ⛔ ET L'ORDRE D'INSERTION DES CLÉS D'UN OBJET NON PLUS — c'est la raison précise pour
     laquelle on n'a pas réutilisé `recEmpreinte`, qui passe par `JSON.stringify` et en
     dépend. `msElaguer` et la fusion reconstruisent cet ordre : deux appareils au stock
     identique auraient produit deux empreintes différentes. */
  const meme = { a: 1, b: { x: 1, y: 2 }, c: [1, 2] };
  const autreOrdre = { c: [1, 2], b: { y: 2, x: 1 }, a: 1 };
  v('⛔ deux objets identiques aux clés rangées autrement ont la MÊME empreinte',
    api.opEmpreinte(meme), api.opEmpreinte(autreOrdre));
  vrai('   (et `recEmpreinte`, elle, les distingue — c\'est pour ça qu\'elle ne convient pas)',
    api.recEmpreinte(meme) !== api.recEmpreinte(autreOrdre));
  /* Les tampons de transport n'entrent pas dans l'empreinte canonique : sinon chaque
     enregistrement rebattrait sa propre pierre tombale, la règle que test-639 surveille. */
  v('   et `_m` / `_ms` n\'y entrent pas', api.opEmpreinte({ a: 1 }), api.opEmpreinte({ a: 1, _m: 99, _ms: { p: 1 } }));

  /* LE CONTRE-TEST, sans lequel tout ce qui précède serait satisfait par une fonction qui
     rend toujours la même chose : un vrai changement DOIT se voir, et se voir OÙ il est. */
  const syn2 = synthetique();
  syn2.clients[0].nom = 'Changé';
  const s2 = api.opSignature(api.opDecomposer(syn2));
  vrai('⛔ un seul champ modifié change la signature', s2.sig !== s1.sig);
  vrai('   et il change celle de SA collection', s2.par.clients.sig !== s1.par.clients.sig);
  v('   sans toucher aux autres', s2.par.produits.sig, s1.par.produits.sig);
  const syn3 = synthetique(); syn3.clients[0]._m = 1700000009999;
  vrai('⛔ une date de modification qui change se voit aussi (c\'est elle qui arbitre)',
    api.opSignature(api.opDecomposer(syn3)).sig !== s1.sig);
  const syn4 = synthetique(); syn4.boxes[0].stock.p1 = { ctn: 9, u: 9 };
  vrai('⛔ une LIGNE de stock qui change se voit (baseSignature ne la regardait pas)',
    api.opSignature(api.opDecomposer(syn4)).par.box_stock.sig !== s1.par.box_stock.sig);
  const syn5 = synthetique(); syn5.entreprise = { nom: 'Autre' };
  vrai('⛔ un RÉGLAGE qui change se voit (baseSignature ne les regardait pas non plus)',
    api.opSignature(api.opDecomposer(syn5)).sig !== s1.sig);
}

/* ══ 4. LA BÊTA PORTE LE MÊME CONVERTISSEUR ═══════════════════════════════════════════════ */
{
  const B = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
  const memeQue = (sig) => { const a = bloc(sig); const i = B.indexOf(sig);
    if (i < 0 || !a) return false;
    let d = 0, f = -1; for (let k = B.indexOf('{', i); k < B.length; k++) { if (B[k] === '{') d++; else if (B[k] === '}') { d--; if (!d) { f = k + 1; break; } } }
    return B.slice(i, f) === a; };
  vrai('⛔ la bêta porte le MÊME opDecomposer', memeQue('function opDecomposer('));
  vrai('⛔ et le MÊME opRecomposer', memeQue('function opRecomposer('));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
