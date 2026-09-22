/* ⛔ CE QUE CE FICHIER GARDE — LE FILTRE DE LECTURE, ET SURTOUT CE QU'IL POURRAIT CACHER.

   `/api/op/depuis` rendait TOUT ce que l'espace contient. Mesuré le 20 septembre 2026 : une
   entreprise qui utilise les DEUX applications télécharge sa base OP GESTION entière pour
   ouvrir une conversation — 1 200 fiches produit (338 Ko) contre 300 messages (44 Ko), soit
   **88,5 % de transfert inutile**, sur un téléphone de terrain en 4G. Et ça empire : la base
   d'ELAN a déjà dépassé le mégaoctet du document Firestore.

   ⛔⛔ MAIS UN FILTRE QUI OUBLIE UNE COLLECTION EST PIRE QUE LE GASPILLAGE QU'IL ÉVITE : c'est
   un écran vide, en silence, chez quelqu'un qui attend sa conversation. Le cœur de ce banc
   n'est donc PAS l'économie — c'est la garde qui empêche l'oubli : il extrait tous les
   `.collection('…')` de `messages.html` et exige que la liste déclarée les couvre TOUS.
   Mesuré avant d'écrire : 200 appels, 200 littéraux, **zéro dynamique** — sans ça le filtre
   n'aurait pas été écrit du tout, parce qu'aucun banc ne peut voir un nom calculé.

   ⚠️ ET LE DÉFAUT LE PLUS VICIEUX N'EST PAS LÀ NON PLUS. `curseur` et `reste` se calculent en
   base : filtrer les lignes APRÈS la lecture les laisserait parler de la base entière, et
   l'appareil repagerait pour toujours. Les deux requêtes portent le même filtre, et ce banc
   le vérifie en jouant la pagination pour de vrai. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));

const PAGE = fs.readFileSync(path.join(RACINE, 'messages.html'), 'utf8');
const OPFS = fs.readFileSync(path.join(RACINE, 'op-fs.js'), 'utf8');

/* ⚠️ LE SOCLE SE MONTE PAR L'ENVIRONNEMENT, ET AVANT LE `require` : il lit `TEAMOP_DATA` et
   `TEAMOP_KEK` au chargement du module. Les poser après ne servirait à rien — et le banc
   écrirait alors dans le dossier de données de la machine. */
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'filtre-744-'));
const DATA = path.join(BANC, 'data');
fs.mkdirSync(DATA, { recursive: true });
process.env.TEAMOP_DATA = DATA;
process.env.TEAMOP_KEK = crypto.randomBytes(32).toString('hex');
const socle = require(path.join(RACINE, 'server', 'socle.js'));

console.log('\n══ 1. ⛔⛔ LA LISTE NE SE TAPE PAS À LA MAIN — ELLE SE DÉRIVE DU CODE ══\n');
let GENRES = [];
{
  /* ⛔ COMMENTAIRES RETIRÉS D'ABORD. Ce dépôt est très commenté : un `.collection('x')` cité
     dans une explication ferait croire à une collection qui n'existe pas, et la liste
     déclarée aurait alors l'air trop courte — ou trop longue. */
  const nu = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const tous = [...nu.matchAll(/\.collection\s*\(([^)]*)\)/g)].map(m => m[1].trim());
  const litt = tous.filter(a => /^(['"]).*\1$/.test(a));
  const dyn = tous.filter(a => !/^(['"]).*\1$/.test(a));
  /* ⛔⛔ LE CONTRÔLE QUI AUTORISE TOUT LE RESTE. Un nom de collection CALCULÉ (`.collection(x)`)
     serait invisible à ce banc : le filtre cacherait alors des documents sans que rien ne le
     dise. Le jour où quelqu'un en écrit un, ce contrôle tombe et le filtre doit être RETIRÉ,
     pas rafistolé. */
  v('⛔⛔ aucun nom de collection CALCULÉ dans messages.html', dyn.length, 0);
  vrai('   et il y en a bien (le motif ne cherche pas dans le vide)', litt.length > 50);
  GENRES = [...new Set(litt.map(a => a.slice(1, -1)))].sort();
  console.log('     (' + litt.length + ' appels, ' + GENRES.length + ' genres : ' + GENRES.join(', ') + ')');

  /* ⛔⛔ LE CONTRÔLE QUI EMPÊCHE L'ÉCRAN VIDE. On compare la liste DÉCLARÉE dans `op-fs.js` à
     celle DÉRIVÉE de la page, dans LES DEUX SENS :
     · un genre de la page absent de la liste → ses documents n'arriveraient jamais, et
       l'écran resterait vide sans une erreur. C'est le sens qui coûte cher.
     · un genre de la liste absent de la page → du filtre mort, donc une liste que plus
       personne ne relit — et c'est comme ça qu'on rate le premier sens.
     ⚠️ `require` d'op-fs.js : il s'exporte en CommonJS autant qu'il se pose sur `globalThis`,
     donc on lit la VRAIE liste du VRAI fichier, pas une copie. */
  const opFs = require(path.join(RACINE, 'op-fs.js'));
  const declares = (opFs.GENRES_OP_MESSAGES || []).slice().sort();
  vrai('   la liste est déclarée dans op-fs.js', declares.length > 0);
  v('⛔⛔ aucun genre de la page ne MANQUE à la liste (sinon : écran vide, en silence)',
    GENRES.filter(g => declares.indexOf(g) < 0), []);
  v('⛔ et la liste ne parle d\'aucun genre disparu de la page',
    declares.filter(g => GENRES.indexOf(g) < 0), []);
  /* ⚠️ Et elle tient sous la borne du serveur : au-delà, `socle.depuis` tronque la liste
     SILENCIEUSEMENT, ce qui ramène exactement le défaut qu'on vient de fermer. */
  vrai('⛔ et elle tient sous la borne du serveur (COLLS_FILTRE_MAX = 20)', declares.length <= 20);
}

console.log('\n══ 1 bis. ⛔⛔ LES APPELS STATIQUES — CE QUE L\'ÉCHANGE DE `fs` NE COUVRE PAS ══\n');
/* ⛔⛔ CETTE SECTION EXISTE PARCE QUE SON ABSENCE A LAISSÉ PASSER UNE AFFIRMATION FAUSSE.
   L'en-tête d'`op-fs.js` disait : « CE QUI N'EST PAS REPRODUIT … `FieldPath` … `messages.html`
   n'en utilise aucun — MESURÉ ». Recompté le 22 septembre 2026 sur le fichier réel : la page
   en fait UN appel, `messages.html:10615`, sur le bouton de RÉACTION à un message. La mesure
   n'avait jamais eu lieu — ce banc extrayait les `.collection('…')` et RIEN d'autre.

   Le piège est structurel, pas distrait : remplacer `fs` par l'adaptateur couvre les 104
   `fs.collection(…)`, et laisse intacts les 16 `firebase.firestore.<X>` écrits en dur, qui
   continueraient de viser le VRAI SDK. Une page à moitié branchée, sans une erreur.

   On dérive donc la liste du CODE, comme pour les genres, et on exige que l'adaptateur couvre
   chaque nom. En ajouter un à la page sans l'ajouter ici fait tomber ce banc. */
{
  /* ⛔ LE NETTOYAGE SÛR, ET LA MESURE QUI LE JUSTIFIE. Le motif naïf (tout bloc jusqu'à la
     prochaine fermeture) avale 27 961 caractères de PLUS sur `messages.html` — mesuré. Il se
     trouve que la liste des genres en sort identique, mais c'est une chance, pas une garantie :
     `CLAUDE.md` n'avait mesuré que `app.html` et `beta.html`. */
  const nu = PAGE.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const bruts = [...nu.matchAll(/firebase\.firestore\.([A-Za-z]+)(?:\.([A-Za-z]+))?/g)];
  const noms = [...new Set(bruts.map(m => m[1] + (m[2] ? '.' + m[2] : '')))].sort();
  vrai('⛔ il y a bien des appels statiques à examiner (un zéro sur rien ne prouve rien)', bruts.length >= 10);
  console.log('     (' + bruts.length + ' appels, ' + noms.length + ' noms : ' + noms.join(', ') + ')');

  /* ⛔ ON VISE LE CODE DE L'ADAPTATEUR, PAS SON COMMENTAIRE — la règle de ce dépôt. `FieldValue`
     se prouve par une clé de son objet, `FieldPath` par sa déclaration de fonction. */
  const nuFs = OPFS.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const couvert = (nom) => {
    const p = nom.split('.');
    if (p.length === 2) return new RegExp('\\b' + p[1] + '\\s*:').test(nuFs);
    return new RegExp('function\\s+' + p[0] + '\\s*\\(').test(nuFs);
  };
  const orphelins = noms.filter(n => !couvert(n));
  v('⛔⛔ aucun appel statique de la page n\'est absent de l\'adaptateur', orphelins, []);

  /* Et le sens inverse : `opFs` doit EXPOSER ce que la page ira chercher sur lui après la
     bascule, sinon `new opFs.FieldPath(...)` serait `undefined is not a constructor`. */
  vrai('⛔ opFs expose FieldValue', /opFs\.FieldValue\s*=/.test(nuFs));
  vrai('⛔ opFs expose FieldPath', /opFs\.FieldPath\s*=/.test(nuFs));
}

console.log('\n══ 1 ter. ⛔⛔ UN CHEMIN POINTÉ VISE UN CHAMP IMBRIQUÉ, PAS UN CHAMP NOMMÉ « a.b » ══\n');
/* ⛔⛔ LE SECOND DÉFAUT SILENCIEUX, ET LE PLUS COÛTEUX DES DEUX. Quatre `update()` de la page
   passent des clés POINTÉES — `live.jusqu`, `loc.la`, `loc.lo`, `loc.maj` : c'est le PARTAGE
   DE POSITION EN DIRECT. `resoudre` ne découpait pas sur le point : il aurait posé un champ
   nommé littéralement « loc.la » À CÔTÉ de l'objet `loc`, que personne ne lit. La position
   aurait cessé de bouger à l'écran, sans erreur, sans ligne de journal.
   ⚠️ `champ()` — qui, lui, découpe — ne sert qu'à `where` et `orderBy` : la LECTURE marchait,
   l'ÉCRITURE non. C'est ce décalage qui rend la panne invisible à la relecture. */
{
  const opFs = require(path.join(RACINE, 'op-fs.js'));
  const F = opFs.FieldValue, P = opFs.FieldPath;
  const poserChemin = opFs._poserChemin, entreesUpdate = opFs._entreesUpdate;
  const outils = !!(F && P && poserChemin && entreesUpdate);
  /* ⛔ UN BANC QUI MEURT NE NOMME PAS LE COUPABLE. Sans ce garde, retirer `opFs.FieldPath`
     faisait tomber la section sur une pile d'appels au lieu d'un ✗ lisible — le code de sortie
     l'attrapait, mais il fallait lire une trace pour savoir QUELLE garde avait sauté. */
  vrai('l\'adaptateur se charge et rend ses outils RÉELS', outils);
  if (!outils) { console.log('     (section sautée : ' + ['FieldValue','FieldPath','_poserChemin','_entreesUpdate']
    .filter((n, i) => ![F, P, poserChemin, entreesUpdate][i]).join(', ') + ' manque à op-fs.js)'); }
  else {

  /* ⛔ ON APPELLE LE VRAI CODE, PAS UNE COPIE. Rejouer ici la résolution de chemin donnerait un
     banc qui reste vert le jour où celle d'`op-fs.js` change — c'est la règle du dépôt :
     un comportement se mesure à ce qu'il PRODUIT, pas au texte qui le nomme.
     `entreesUpdate` est la VRAIE normalisation des arguments d'`update`, `poserChemin` la
     VRAIE écriture au bout du chemin : ensemble, c'est exactement ce que fait `update()`. */
  const appliquer = (avant, args) => {
    let cur = avant;
    for (const e of entreesUpdate(args)) cur = poserChemin(cur, e.seg, e.v, 1000);
    return cur;
  };
  const r = appliquer({ loc: { la: 1, lo: 2, maj: 10 }, live: { jusqu: 0 } },
    [{ 'loc.la': 48.8, 'loc.lo': 2.35, 'loc.maj': 99, 'live.jusqu': 1234 }]);
  v('⛔ la latitude atterrit DANS loc, pas dans un champ « loc.la »', r.loc && r.loc.la, 48.8);
  v('   la longitude aussi', r.loc && r.loc.lo, 2.35);
  v('   et l\'horodatage', r.loc && r.loc.maj, 99);
  v('   « live.jusqu » atterrit dans live', r.live && r.live.jusqu, 1234);
  v('⛔⛔ AUCUN champ littéral « loc.la » n\'a été créé', Object.keys(r).sort(), ['live', 'loc']);
  v('   les frères non visés survivent', !!(r.loc && r.loc.lo !== undefined && r.live && r.live.jusqu !== undefined), true);

  /* ── FieldPath : segments VERBATIM, jamais découpés ── */
  const emoji = '👍';
  const r2 = appliquer({ reactions: {} }, [new P('reactions', emoji), F.arrayUnion('u1')]);
  v('⛔ FieldPath pose la réaction sous son emoji', r2.reactions && r2.reactions[emoji], ['u1']);
  const r3 = appliquer(r2, [new P('reactions', emoji), F.arrayUnion('u2')]);
  v('   un second utilisateur s\'ajoute', r3.reactions && r3.reactions[emoji], ['u1', 'u2']);
  const r4 = appliquer(r3, [new P('reactions', emoji), F.arrayRemove('u1')]);
  v('   et se retire', r4.reactions && r4.reactions[emoji], ['u2']);

  /* ⛔ LA DIFFÉRENCE ENTRE LES DEUX FORMES, QUI EST TOUTE LEUR RAISON D'ÊTRE : un segment qui
     contient un point ne se coupe PAS. Aujourd'hui les emojis n'en ont pas — le jour où une
     clé en aura un, ce contrôle dira lequel des deux chemins a été pris. */
  const rA = appliquer({}, [new P('a.b'), 1]);
  v('⛔ FieldPath(\'a.b\') pose UN champ nommé « a.b »', Object.keys(rA), ['a.b']);
  const rB = appliquer({}, [{ 'a.b': 1 }]);
  v('⛔ la chaîne \'a.b\', elle, pose a → b', rB.a && rB.a.b, 1);

  /* ⛔ `delete()` au bout d'un chemin doit retirer LE champ, pas l'objet parent. */
  const rD = appliquer({ loc: { la: 1, lo: 2 } }, [{ 'loc.la': F.delete() }]);
  v('⛔ delete() au bout d\'un chemin ne retire que la feuille', Object.keys(rD.loc || {}), ['lo']);

  /* ⛔ UN NOMBRE IMPAIR D'ARGUMENTS EST UNE ERREUR, PAS UNE VALEUR MANQUANTE. Se taire
     écrirait un document à moitié modifié sans que rien ne le dise — Firestore jette, nous
     aussi. C'est le contre-contrôle de `entreesUpdate`. */
  let jete = false;
  try { entreesUpdate([new P('a'), 1, new P('b')]); } catch (e) { jete = true; }
  v('⛔ un couple (chemin, valeur) incomplet JETTE au lieu d\'écrire à moitié', jete, true);
  v('   et un couple complet passe', entreesUpdate([new P('a'), 1]).length, 1);
  v('   la forme OBJET reste acceptée telle quelle', entreesUpdate([{ x: 1, y: 2 }]).length, 2);
  }
}

console.log('\n══ 2. ⛔ LE DÉFAUT PAR DÉFAUT EST « TOUT », JAMAIS « RIEN » ══\n');
{
  const nu = OPFS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  /* ⛔ SANS `genres`, AUCUN FILTRE. C'est ce qui rend ce changement sûr pour un parc mélangé :
     une version qui ne connaît pas le paramètre ne l'envoie pas, donc reçoit tout, donc se
     comporte exactement comme avant. « Les appareils d'abord, la porte ensuite » tient ici
     PARCE QUE l'allègement est demandé par l'appareil et jamais imposé par le serveur. */
  vrai('⛔ `genres` absent ⇒ chaîne de filtre VIDE, donc aucun filtre',
    /const filtreQ = genres\.length \? '&coll=' \+ [^:]+ : '';/.test(nu));
  vrai('   et la lecture y colle la chaîne telle quelle', /\/api\/op\/depuis\?seq='\s*\+\s*seq\s*\+\s*filtreQ/.test(nu));
  vrai('⛔ le curseur se jette quand le filtre change', /seq = 0; filtreVu = vu;/.test(nu));
  vrai('   et le miroir aussi — sinon il garderait ce que le nouveau filtre ne ramène plus',
    /miroir\.clear\(\); parColl\.clear\(\);/.test(nu));
}

console.log('\n══ 3. ⛔ LE FILTRE EST DANS LE `WHERE`, ET LES DEUX REQUÊTES LE PORTENT ══\n');
{
  const SOCLE = fs.readFileSync(path.join(RACINE, 'server', 'socle.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ la LECTURE porte le filtre', /SELECT coll,id,maj_le,seq,supprime_le,corps,empreinte FROM enr WHERE seq>\?' \+ ou/.test(SOCLE));
  /* ⛔ UNE SEULE DES DEUX FILTRÉE EST PIRE QUE ZÉRO : c'est un compteur qui ment, donc un
     appareil qui repage éternellement sur un écran de chargement. */
  vrai('⛔ le COMPTE aussi — sinon `reste` ment et l\'appareil repage sans fin',
    /SELECT COUNT\(\*\) AS n FROM enr WHERE seq>\?' \+ ou/.test(SOCLE));
  vrai('   le nombre de collections est borné', /COLLS_FILTRE_MAX/.test(SOCLE));
  vrai('   et chaque nom aussi', /x\.length <= COLL_MAX/.test(SOCLE));
}

/* ── LE VRAI SERVEUR ───────────────────────────────────────────────────────────────────── */
let enfant = null;
const arreter = async () => {
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
  enfant = null;
};

(async () => {
  const T = 'bernard-filtre01';
  console.log('\n══ 4. ⛔ CE QUE LE FILTRE ÉCONOMISE, MESURÉ ══\n');
  {
    const produit = (i) => ({ c: 'produits', id: 'p' + i, m: Date.now(), r: {
      nom: 'Produit de traitement numéro ' + i, cat: 'TP14', unite: 'L', stock: 12, prix: 24.9,
      fournisseur: 'ARMOSA', ref: 'ARM-' + i, notes: 'Dose de 25 mL par litre, masque obligatoire.' } });
    const message = (i) => ({ c: 'messages', id: 'conv1/messages/m' + i, m: Date.now(), r: {
      de: 'u1', texte: 'Message de chantier numéro ' + i + ' — RAS sur le site.', ts: Date.now() } });

    const lot = [];
    for (let i = 0; i < 300; i++) lot.push(produit(i));
    for (let i = 0; i < 60; i++) lot.push(message(i));
    /* Mélangé exprès : dans la vraie vie les deux applications écrivent en alternance, et un
       filtre qui ne marcherait que sur des blocs contigus ne marcherait pas du tout. */
    lot.sort((a, b) => (a.id + b.id).length % 3 - 1);
    const r = socle.pousser(T, lot, { app_id: 'banc', origine: 'banc' });
    v('   les lignes sont écrites', r.acceptes, lot.length);

    const tout = socle.depuis(T, 0, 400);
    const filtre = socle.depuis(T, 0, 400, ['messages']);
    const poids = (d) => Buffer.byteLength(JSON.stringify(d.enr), 'utf8');
    vrai('   sans filtre, les deux applications arrivent',
      tout.enr.some(x => x.c === 'produits') && tout.enr.some(x => x.c === 'messages'));
    /* ⛔ LE CONTRÔLE QUI COMPTE : plus une seule ligne de l'autre application. */
    v('⛔ avec le filtre, AUCUNE fiche produit ne traverse',
      filtre.enr.filter(x => x.c !== 'messages').length, 0);
    v('   et les 60 messages sont tous là', filtre.enr.length, 60);
    const gain = 100 - (poids(filtre) / poids(tout) * 100);
    vrai('⛔ et l\'économie est réelle (> 70 %)', gain > 70);
    console.log('     (sans filtre ' + Math.round(poids(tout) / 1024) + ' Ko · avec ' +
      Math.round(poids(filtre) / 1024) + ' Ko · économie ' + gain.toFixed(1) + ' %)');

    console.log('\n══ 5. ⛔ `curseur` ET `reste` PARLENT DU FILTRE, PAS DE LA BASE ══\n');
    /* ⛔ C'EST ICI QUE SE JOUE LA PANNE LA PLUS VICIEUSE. Un `reste` non filtré dirait à un
       appareil de messagerie qu'il lui reste 300 fiches produit à lire : il repagerait pour
       rien, éternellement, et l'écran resterait sur « chargement ». */
    const page1 = socle.depuis(T, 0, 10, ['messages']);
    v('   une page bornée à 10 rend 10 messages', page1.enr.length, 10);
    v('⛔ et `reste` compte les MESSAGES restants, pas la base', page1.reste, 50);
    vrai('   le curseur est celui de la dernière ligne rendue', page1.curseur === page1.enr[9].s);
    /* ⛔ ET LA PAGINATION ARRIVE AU BOUT. Sans les deux requêtes filtrées, cette boucle ne
       terminerait pas — ou sauterait des messages. On la joue pour de vrai. */
    let cur = 0, vus = 0, tours = 0;
    while (tours++ < 50) {
      const pg = socle.depuis(T, cur, 10, ['messages']);
      vus += pg.enr.length;
      if (!pg.enr.length) break;
      cur = pg.curseur;
      if (!pg.reste) break;
    }
    v('⛔ la pagination filtrée ramène TOUS les messages', vus, 60);
    vrai('   et elle s\'arrête (pas de boucle sans fin)', tours < 20);
    /* Le contre-test : sans filtre, la même boucle ramène tout. */
    let cur2 = 0, vus2 = 0, t2 = 0;
    while (t2++ < 200) {
      const pg = socle.depuis(T, cur2, 50);
      vus2 += pg.enr.length;
      if (!pg.enr.length) break;
      cur2 = pg.curseur;
      if (!pg.reste) break;
    }
    v('   et sans filtre, tout arrive toujours', vus2, 360);

    /* ⛔ L'EMPREINTE DU FILTRE : stable, et différente d'un filtre à l'autre. */
    v('   sans filtre, l\'empreinte est vide', socle.depuis(T, 0, 1).filtre, '');
    const e1 = socle.depuis(T, 0, 1, ['messages', 'rooms']).filtre;
    const e2 = socle.depuis(T, 0, 1, ['rooms', 'messages']).filtre;
    vrai('   elle ne dépend pas de l\'ORDRE des collections', e1 === e2 && !!e1);
    vrai('⛔ et deux filtres différents ne partagent pas la même', e1 !== socle.depuis(T, 0, 1, ['messages']).filtre);

    /* ⛔ UN FILTRE MAL FORMÉ REND TOUT, IL NE COUPE JAMAIS LA SYNCHRO. Entre « trop » et
       « rien », on choisit trop : un 400 ici couperait l'appareil de ses données. */
    const troplong = 'x'.repeat(200);
    const sale = socle.depuis(T, 0, 400, [troplong]);
    v('⛔ un nom de collection trop long est ÉCARTÉ, pas refusé', sale.enr.length, 360);
    v('   et l\'empreinte dit qu\'aucun filtre n\'a été appliqué', sale.filtre, '');
    const mixte = socle.depuis(T, 0, 400, ['messages', troplong]);
    v('   un filtre à moitié valable garde la part valable', mixte.enr.length, 60);
  }

  console.log('\n══ 6. ⛔ LA COUTURE — LA ROUTE PASSE VRAIMENT LE FILTRE AU MODULE ══\n');
  {
    const nu = fs.readFileSync(path.join(RACINE, 'server', 'op-socle.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    /* ⛔ ANCRÉ SUR LA FORME DU CODE. Un `grep` sur « coll » tomberait dans `journalDe`, qui
       porte un paramètre du même nom pour une tout autre raison. */
    vrai('⛔ la route lit `coll` et le passe à `socle.depuis`',
      /socle\.depuis\(req\.op\.t, req\.query\.seq, req\.query\.max, colls\.length \? colls : null\)/.test(nu));
    vrai('   et elle rend l\'empreinte du filtre appliqué', /filtre: d\.filtre \|\| ''/.test(nu));
    /* ⚠️ Le sens de cette ligne : le paramètre est FACULTATIF côté route. Une version d'avant
       ne l'envoie pas et reçoit tout — c'est ce qui rend le parc mélangé sûr. */
    vrai('   le filtre est facultatif (`req.query.coll || \'\'`)', /String\(req\.query\.coll \|\| ''\)/.test(nu));
  }

  console.log('\n══ 7. ⛔⛔ LA COUTURE JOUÉE : LE VRAI `op-fs.js` CONTRE LE VRAI SERVEUR ══\n');
  {
    /* ⛔ LES SECTIONS 3 et 6 LISENT DU TEXTE ; celle-ci FAIT PARLER les deux moitiés. C'est la
       règle cardinale de CLAUDE.md, et ce dépôt l'a payée quatre fois en deux jours : deux
       côtés justes, chacun avec ses bancs verts, qui ne se parlent pas. Un nom de paramètre
       qui change d'un côté (`coll` contre `colls`) rendrait TOUT à l'appareil sans une erreur
       — le filtre serait mort, et personne ne le verrait avant la facture de données. */
    const cfg = path.join(BANC, 'cfg.json');
    const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
      apiKey: 'banc', adminPassHash: crypto.createHash('sha256').update('x').digest('hex'), socle: { actif: true } }));
    /* ⛔ L'ANNUAIRE : sans lui, `/api/op/session` refuse et le banc éprouverait le vide. */
    const CLE = 'cle-du-banc-744';
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
    fs.writeFileSync(path.join(DATA, 'espaces.json'), JSON.stringify({
      bancfiltre744: { slug: 'bancfiltre744', nom: 'Banc du filtre', email: 'b@exemple.fr',
        t: T, code: b64({ t: T, k: CLE }), ts: 1 } }));
    const port = await new Promise(res => { const x = require('net').createServer();
      x.listen(0, '127.0.0.1', () => { const q = x.address().port; x.close(() => res(q)); }); });
    /* ⚠️ LE MÊME `TEAMOP_DATA` ET LA MÊME CLÉ que le module de la section 4 : le serveur doit
       ouvrir LA base qu'on vient de remplir, sinon on éprouverait un espace vide et tout
       passerait au vert pour rien. */
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: DATA, PORT: String(port),
        TEAMOP_KEK: process.env.TEAMOP_KEK }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    let jrn = ''; enfant.stdout.on('data', d => { jrn += d; }); enfant.stderr.on('data', d => { jrn += d; });
    const B = 'http://127.0.0.1:' + port;
    let vivant = false;
    for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
    vrai('   le serveur répond', vivant);
    if (vivant) {
      const sess = await (await fetch(B + '/api/op/session', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: T, kh: crypto.createHash('sha256').update(CLE).digest('hex'), app_id: 'banc-744' }) })).json().catch(() => ({}));
      const jeton = sess && sess.jeton ? sess.jeton : '';
      vrai('   une session s\'ouvre', /^[a-f0-9]{64}$/.test(jeton));
      if (jeton) {
        const opFs = require(path.join(RACINE, 'op-fs.js'));
        /* ⛔ DEUX APPAREILS : l'un déclare ses genres, l'autre non. Le second est le témoin —
           sans lui, un filtre qui ne filtre RIEN passerait au vert. */
        const msg = opFs({ base: B, jeton: jeton, appId: 'messagerie', genres: opFs.GENRES_OP_MESSAGES });
        const tout = opFs({ base: B, jeton: jeton, appId: 'tout' });
        await msg.demarrer(); await tout.demarrer();
        for (let i = 0; i < 60 && msg._miroir.size === 0; i++) await dormir(100);
        for (let i = 0; i < 60 && tout._miroir.size === 0; i++) await dormir(100);
        const genresDe = (f) => new Set([...f._miroir.keys()].map(k => k.slice(0, k.indexOf('\u0000'))));
        const gMsg = genresDe(msg), gTout = genresDe(tout);
        vrai('   l\'appareil SANS filtre reçoit les fiches produit', gTout.has('produits'));
        v('⛔⛔ l\'appareil de MESSAGERIE n\'en reçoit AUCUNE', gMsg.has('produits'), false);
        v('   et il reçoit bien ses messages', gMsg.has('messages'), true);
        v('⛔ il a exactement 60 documents, pas 360', msg._miroir.size, 60);
        v('   le témoin, lui, en a 360', tout._miroir.size, 360);
        /* ⛔⛔ ET LA COUTURE QUI COMPTE VRAIMENT : le VRAI `update()` contre le VRAI serveur,
           avec les deux formes que `messages.html` emploie. Les contrôles de la section 1 ter
           éprouvent les fonctions ; celui-ci éprouve le CHEMIN COMPLET — normalisation des
           arguments, écriture au bout du chemin, envoi au socle, relecture. C'est la règle de
           `CLAUDE.md` : les deux moitiés se lisent très bien séparément. */
        {
          const ref = msg.collection('op_companies').doc('ent-A').collection('channels').doc('c1')
            .collection('messages').doc('seam-1');
          await ref.set({ txt: 'bonjour', loc: { la: 1, lo: 2 }, reactions: {} });
          await ref.update({ 'loc.la': 48.8566, 'loc.lo': 2.3522 });
          await ref.update(new opFs.FieldPath('reactions', '👍'), opFs.FieldValue.arrayUnion('u1'));
          const d = (await ref.get()).data() || {};
          v('⛔⛔ bout en bout : la position atterrit DANS loc', [d.loc && d.loc.la, d.loc && d.loc.lo], [48.8566, 2.3522]);
          v('   et aucun champ littéral « loc.la » n\'a traversé le serveur',
            Object.keys(d).filter(k => k.indexOf('.') >= 0), []);
          v('⛔⛔ bout en bout : la réaction atterrit sous son emoji', d.reactions && d.reactions['👍'], ['u1']);
          v('   le texte du message n\'a pas bougé', d.txt, 'bonjour');
        }
        try { msg.arreter(); tout.arreter(); } catch (e) {}
      }
    }
    if (!vivant) console.log(jrn.slice(0, 400));
  }

  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
