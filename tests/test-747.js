/* ⛔ CE QUE CE FICHIER GARDE — QU'UNE CASE DE PERMISSION SERVE VRAIMENT À QUELQUE CHOSE.

   MESURÉ AU NAVIGATEUR LE 21 SEPTEMBRE 2026, sur la bêta, catégorie par catégorie. Les quatre
   droits se cochent, se sauvegardent et se LISENT — `canCat()` répond juste sur les trente
   combinaisons. Mais QUATRE chemins de création ne les consultaient pas :

     · Temps & équipe   → on créait un technicien, droit « ajouter » retiré
     · Communication    → on créait un fournisseur, par DEUX portes différentes
     · Achats internes  → on remplissait un brouillon

   Une case cochée dans l'écran Permissions qui ne change rien est pire qu'une case absente :
   l'entreprise croit avoir fermé une porte.

   ⚠️ LE PIÈGE DE MESURE, À NE PAS REPAYER. Le premier relevé annonçait « appliqué » pour les
   techniciens. C'était FAUX : ce qui refusait, c'était la LIMITE DE PLACES du forfait, que le
   témoin venait lui-même de consommer. Un témoin qui mange la ressource que l'essai suivant
   réclame fabrique un faux verrou — et on classe « gardé » ce qui ne l'est pas.

   ⛔ CE QUE CE BANC EXIGE. Toute fonction qui crée dans une collection rattachée à une
   catégorie (`COLL_GRP`) doit OU BIEN consulter le droit, OU BIEN être NOMMÉE ici avec sa
   raison. C'est la règle de `test-726` pour `/health`, appliquée aux permissions : en ajouter
   une oblige à trancher, une fois, par écrit.
   ⚠️ Et toutes ne DOIVENT pas être gardées : verrouiller `savePointage` sur « Temps & équipe /
   ajouter » empêcherait un technicien de pointer. Le banc ne tranche pas à la place de
   Justin — il empêche que la question se perde. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
/* ⛔ COMMENTAIRES RETIRÉS AVANT DE CHERCHER : un motif qui vise une chaîne tombe dans
   l'explication qui la surplombe, et garde une phrase, pas un comportement.

   ⛔⛔ MAIS LE NETTOYAGE NAÏF AVALE DU VRAI CODE, ET C'EST MESURÉ. Le motif que ce dépôt
   recommande — tout bloc, de son ouverture jusqu'à la prochaine fermeture — fait
   disparaître 107 069 caractères
   d'`app.html`, dont la fonction `saveVehicule` ENTIÈRE : une ouverture non appariée (une
   règle CSS en fin de ligne, une adresse) s'apparie avec une fermeture très loin, et emporte
   tout ce qui est entre les deux. Un banc bâti dessus accuse alors le code de ne pas porter une garde qu'il
   porte — exactement ce qui est arrivé ici le 21 septembre 2026.
   ⚠️ Mesuré fichier par fichier : seuls `app.html` et `beta.html` sont touchés ; `espace.html`,
   `surveillance.js` et les fichiers de `server/` ne perdent rien (les bancs qui les lisent
   restent donc justes). On n'ôte ici que les blocs qui COMMENCENT une ligne — ce sont les
   seuls que ce dépôt utilise pour expliquer du code. */
const NU = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const VU_ET_PAS_GARDE = {
  seedFournisseurs: 'semis du pack métier', mvtDemoPoser: 'démonstration', mvtDemoGrande: 'démonstration',
  mvtDemoDeuxMois: 'démonstration', betaRemplir: 'démonstration (bêta)', demoCharger: 'démonstration',
  demoCompta: 'démonstration', demoTele: 'démonstration',
  /* ⚠️ Ces deux-là n'apparaissaient PAS tant que le nettoyage des commentaires était naïf :
     elles tombaient dans les 107 069 caractères avalés. Le banc voit plus large depuis. */
  genDemoData: 'démonstration', genTestNuisibles: 'démonstration (jeu d essai nuisibles)',
  planDup: 'duplication d une intervention existante', planNextCreate: 'récurrence automatique',
  intRecurNext: 'récurrence automatique', creerProchainPassage: 'passage suivant automatique',
  dupliquerIntervention: 'duplication d une intervention existante',
  genererInterventionContrat: 'généré depuis un contrat signé',
  factureAFacturer: 'facture dérivée d une intervention', factureAutoIntervention: 'facture dérivée',
  devisToFacture: 'facture dérivée d un devis',
  devisIAGo: 'gardé par le droit devisIA', devisIAAppliquer: 'gardé par le droit devisIA',
  aiGenDevisXylo: 'gardé par le droit devisIA', adCreerDevis: 'gardé par le droit devisIA',
  stockExportBon: 'circuit bons - peutCommander', validerDemande: 'circuit bons - validerDR',
  bonDupliquer: 'circuit bons - peutCommander', bonGarder: 'circuit bons - peutCommander',
  bonValider: 'circuit bons - peutCommander', bonSeparer: 'circuit bons - peutCommander',
  regrouperFournisseur: 'circuit bons - peutCommander',
  produitCreer: 'helper - saveProduit porte permGarde(stock)',
  saveUser: 'écran Utilisateurs, réservé admin',
  load: 'semis AUTOMATIQUE du pack métier, derrière PACK_METIER_AUTO (fermé depuis le 22 septembre 2026)',
};

/* ⛔⛔ CE QUI ATTEND UNE DÉCISION DE JUSTIN, ET QUI NE DOIT PAS SE PERDRE. Ces chemins créent
   sur un GESTE D'UTILISATEUR et ne consultent aucun droit de catégorie. Les garder n'est PAS
   évident : verrouiller `savePointage` empêcherait un technicien de pointer, ce qui serait pire
   que le trou. Le banc les NOMME, il ne tranche pas. */
const A_TRANCHER = {
  /* ⛔⛔ UN SEUL RESTE, ET C'EST UNE DÉCISION ÉCRITE, PAS UN OUBLI. Pointer n'est pas CRÉER un
     enregistrement partagé : c'est déclarer ses propres heures. Un administrateur qui décoche
     « ajouter » sur Temps & équipe veut empêcher la création de véhicules ou de conducteurs, pas
     empêcher un technicien de dire qu'il a travaillé — une journée non pointée est une journée
     non payée. Le trou coûte moins cher que le verrou. Si Justin veut l'inverse, c'est une ligne
     à ajouter dans `savePointage`, et cette entrée disparaît. */
  savePointage: 'pointer, c est declarer ses propres heures, pas creer un enregistrement partage',
  /* Même décision, même raison, l'autre porte : depuis la v704 on pointe d'un tap sur un gros
     bouton (`pointerDebut`) au lieu de remplir un formulaire. Si le droit devait fermer le
     pointage, il faudrait le poser sur LES DEUX — les séparer donnerait un verrou qui se
     contourne par le bouton, c'est-à-dire pas de verrou du tout. */
  pointerDebut: 'meme decision que savePointage : pointer ne cree pas un enregistrement partage',
};

const mg = /const COLL_GRP=\{([^}]*)\}/.exec(NU);
const GRP = {};
if (mg) for (const x of mg[1].split(',')) { const [k, g] = x.split(':').map(y => y && y.trim().replace(/'/g, '')); if (k && g) GRP[k] = g; }

console.log('\n══ 1. LA TABLE QUI RATTACHE UNE COLLECTION À UNE CATÉGORIE ══\n');
vrai('   COLL_GRP existe et est peuplée', Object.keys(GRP).length >= 10);
vrai('⛔ les collections des dix catégories y sont',
  ['clients', 'interventions', 'produits', 'boxes', 'fournisseurs', 'techniciens', 'brouillons', 'demandes', 'devis', 'vehicules'].every(c => GRP[c]));

/* ⚠️ LE DÉCOUPAGE NE DOIT PAS EXIGER UN DÉBUT DE LIGNE. Retirer les commentaires remplace un
   bloc entier par UN espace, ce qui colle parfois une déclaration à la ligne précédente : un
   motif ancré sur un saut de ligne rate alors la fonction — et le banc accuse le code de ne
   pas être gardé alors qu il l est. Pris sur saveVehicule le 21 septembre 2026. */
const fns = [...NU.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g)].map(x => ({ nom: x[1], i: x.index }));
fns.forEach((f, i) => { f.corps = NU.slice(f.i, i + 1 < fns.length ? fns[i + 1].i : NU.length); });
const colls = Object.keys(GRP);
const creatrices = [];
for (const f of fns) {
  const push = colls.filter(c => f.corps.includes('db.' + c + '.push('));
  /* ⛔⛔ v737 — CE BANC NE VOYAIT PAS LES PRODUITS. Une fiche produit naît par `produitCreer`
     (règle du dépôt : une seule ligne de code fait `db.produits.push`), donc ses APPELANTS créent
     dans « produits » sans jamais écrire `db.produits.push(` — et `produitCreer` lui-même était
     rangé ici comme « helper, saveProduit porte la garde ». Mesuré le 23 septembre 2026 : sur les
     huit chemins qui créent une fiche sur un geste, UN SEUL (saveProduit) consultait « Stock →
     Ajouter ». Justin : « les personnes qui peuvent créer dans les catégories […] tout doit être
     sélectionné ». */
  if (f.nom !== 'produitCreer' && f.corps.includes('produitCreer(') && !push.includes('produits')) push.push('produits');
  /* ⚠️ et `cataloguePoser`, le semis du pack, écrit dans `cible.produits` — un PARAMÈTRE, donc
     invisible au motif `db.produits.push(`. Ses appelants créent des fiches par centaines : pris
     par la mutation « ↻ Catalogue OP sans garde », qui passait au vert (v737). */
  if (f.nom !== 'cataloguePoser' && f.corps.includes('cataloguePoser(') && !push.includes('produits')) push.push('produits');
  if (push.length) creatrices.push({ nom: f.nom, colls: push, garde: /permGarde\(|canCat\(/.test(f.corps) });
}

console.log('\n══ 2. ⛔⛔ CHAQUE CRÉATION EST GARDÉE, OU NOMMÉE ══\n');
console.log('  ' + creatrices.length + ' fonctions créent dans une collection rattachée à une catégorie');
const orphelines = creatrices.filter(c => !c.garde && !VU_ET_PAS_GARDE[c.nom] && !A_TRANCHER[c.nom]);
v('⛔⛔ aucune création orpheline — ni gardée, ni nommée', orphelines.map(c => c.nom + ' (' + c.colls.join(',') + ')'), []);

console.log('\n══ 3. ⛔ LES QUATRE CHEMINS PRIS EN FLAGRANT DÉLIT SONT GARDÉS ══\n');
const corps = (nom) => { const i = NU.indexOf('function ' + nom + '('); return i < 0 ? '' : NU.slice(i, i + 2000); };
vrai('⛔ saveTech consulte le droit « Temps & équipe »', /permGarde\('equipe'/.test(corps('saveTech')));
vrai('⛔ saveSimple déduit la catégorie de la collection (comme delItem)',
  /const _grp=COLL_GRP\[coll\]/.test(corps('saveSimple')) && /permGarde\(_grp/.test(corps('saveSimple')));
vrai('⛔⛔ bonFourNew — la SECONDE porte du fournisseur — consulte le droit',
  /permGarde\('com'/.test(corps('bonFourNew')));
vrai('⛔ saveBrouillon consulte le droit « Achats internes »', /permGarde\('achats'/.test(corps('saveBrouillon')));
/* ⚠️ Et le droit se lit AVANT la place du forfait : les intervertir ferait proposer un
   abonnement à quelqu'un qui n'avait pas le droit de créer. */
const st = corps('saveTech');
vrai('⛔ dans saveTech, le DROIT passe avant la PLACE du forfait',
  st.indexOf("permGarde('equipe'") >= 0 && st.indexOf("permGarde('equipe'") < st.indexOf('planPlaceLibre()'));

console.log('\n══ 3 bis. ⛔ LES SIX CHEMINS FINIS LE 21 SEPTEMBRE AU SOIR ══\n');
/* Recensés par le banc lui-même, pas devinés : ils créaient sur un geste d'utilisateur sans
   consulter le droit de leur catégorie. Le pointage, lui, reste ouvert — voir A_TRANCHER. */
for (const [fn, grp] of [['saveEnv', 'stock'], ['saveProduitDonne', 'stock'], ['saveConducteur', 'equipe'],
  ['saveDemande', 'achats'], ['envoyerDemandeBox', 'achats'], ['brouillonToDemande', 'achats']]) {
  vrai('⛔ ' + fn.padEnd(20) + ' → permGarde(' + grp + ')', new RegExp("permGarde\\('" + grp + "'").test(corps(fn)));
}
/* ⚠️ ET LE CONTRÔLE INVERSE, QUI COMPTE AUTANT : le pointage NE DOIT PAS être gardé. Sans lui,
   quelqu'un « complèterait » la série un jour, en croyant bien faire, et bloquerait les heures. */
vrai('⛔⛔ savePointage n est PAS gardé — pointer reste possible sans droit de création',
  !/permGarde\(/.test(corps('savePointage')));

console.log('\n══ 3 ter. ⛔⛔ v737 : LES PORTES DE CRÉATION DES PRODUITS ══\n');
/* ⛔ DÉCOUPE BORNÉE À LA FONCTION : `corps()` prend 2 000 caractères, et la fonction qui suit
   `restoreCatalogue` (openFourCat) porte la même garde — la mutation qui retirait celle de
   restoreCatalogue passait au vert (v737). Le piège est écrit dans CLAUDE.md : « une découpe de
   banc qui déborde rend un verdict faux ». */
const corpsF = nom => { const f = fns.find(x => x.nom === nom); return f ? f.corps : ''; };
/* Recensées par le banc (section 2, qui compte désormais les appelants de produitCreer) — et
   les FENÊTRES qui préparent une création refusent dès l'ouverture : on ne fait pas remplir une
   liste qui sera refusée. */
for (const fn of ['plValider', 'fcAdd', 'fcAddAll', 'prdPontAjouter', 'bxpPoseEcrire', 't3dProdToStock', 'intToggleProd',
  'restoreCatalogue', 'cataloguePackSync', 'formProduitsListe', 'openFourCat']) {
  vrai('⛔ ' + fn.padEnd(20) + ' → permGarde(stock, ajouter)', /permGarde\('stock','ajouter'/.test(corpsF(fn)));
}
vrai('⛔ « ＋ Produit » refuse à l’ouverture (une fiche NEUVE seulement — ouvrir une fiche existante reste libre)',
  /function formProduit\(id\)\{ if\(!id&&!permGarde\('stock','ajouter','un produit'\)\) return;/.test(NU));
vrai('⛔ l’onglet Fournisseurs de la box n’existe pas sans le droit (il ne sert qu’à CRÉER des fiches)',
  /const cf=cataloguesFournisseurs\(\)&&canCat\('stock','ajouter'\);/.test(NU));
vrai('⛔ le scanner du catalogue règle un stock : « Stock → Modifier », à l’ouverture ET à l’écriture',
  /function openScanner\(\)\{ if\(!permGarde\('stock','modifier','le stock'\)\) return;/.test(NU) && /permGarde\('stock','modifier','le stock'\)/.test(corpsF('etiqAppliquerCat')));
/* ⚠️ Le contrôle inverse : « ajouter à mon stock » depuis une intervention RELIE une ligne à une
   fiche qui existe déjà sans rien créer — ce chemin-là ne doit pas demander le droit de créer. */
const t3d = corpsF('t3dProdToStock');
vrai('⚠️ t3dProdToStock ne demande le droit QU’AU moment de créer (relier une fiche existante reste libre)',
  t3d.indexOf("permGarde('stock','ajouter'") > t3d.indexOf('if(ex){'));

console.log('\n══ 3 quater. ⛔ v737 : LES GROUPES DE DISCUSSION ══\n');
/* `db.groupes` n'est rattaché à aucune catégorie : sa garde est une case à elle. Jusqu'ici seul le
   BOUTON était masqué, sur une liste de noms de rôles. */
for (const fn of ['formGroupe', 'saveGroupe', 'delGroupe'])
  vrai('⛔ ' + fn.padEnd(12) + ' → can(gererGroupes)', /if\(!can\('gererGroupes'\)\)\{ groupesRefus\(\); return; \}/.test(corpsF(fn)));

console.log('\n══ 4. ⛔ LES HUIT AUTRES GARDES N\'ONT PAS BOUGÉ ══\n');
for (const [fn, grp] of [['saveTache', 'plan'], ['saveAbsence', 'plan'], ['saveIntervention', 'int'],
  ['saveClientForm', 'crm'], ['saveProduit', 'stock'], ['saveBox', 'stock'],
  ['saveDoc', 'ventes'], ['saveContrat', 'ventes'], ['saveVehicule', 'equipe']]) {
  vrai('   ' + fn.padEnd(18) + ' → permGarde(' + grp + ')', new RegExp("permGarde\\('" + grp + "'").test(corps(fn)));
}

console.log('\n══ 5. ⛔ LA SUPPRESSION RESTE GÉNÉRIQUE ══\n');
/* `delItem` déduit la catégorie de la collection : c'est ce qui fait que « supprimer » vaut
   pour TOUTE collection rattachée, sans une ligne par écran. Ne pas le particulariser. */
vrai('⛔ delItem déduit la catégorie de la collection', /const _grp=COLL_GRP\[coll\]/.test(corps('delItem')));
vrai('   et refuse quand le droit manque', /canCat\(_grp,'supprimer'\)/.test(corps('delItem')));

console.log('\n══ 6. ⛔ LA LISTE BLANCHE NE PARLE PAS DE FANTÔMES ══\n');
/* Une entrée qui nomme une fonction disparue est une décision prise pour du vide — même
   contrôle que `test-726` sur sa propre liste blanche. */
const nomsVus = new Set(creatrices.map(c => c.nom));
const fantomes = [...Object.keys(VU_ET_PAS_GARDE), ...Object.keys(A_TRANCHER)].filter(n => !nomsVus.has(n));
v('⛔ aucune entrée ne parle d\'une fonction qui ne crée plus rien', fantomes, []);
vrai('   et la liste « à trancher » n\'est pas vide tant que Justin n\'a pas tranché', Object.keys(A_TRANCHER).length > 0);

console.log('\n══ 7. ⛔ LES TRENTE DROITS EXISTENT ET SE SAUVEGARDENT ══\n');
vrai('   les dix catégories sont déclarées', /const PERM_GRPS=\[/.test(NU) && (NU.match(/\['(tdb|plan|int|crm|ventes|stock|equipe|com|achats|admin)',/g) || []).length >= 10);
vrai('⛔ les trois droits se sauvegardent par catégorie',
  /PERM_GRPS\.forEach\(\(\[g\]\)=>\{\s*\['ajouter','modifier','supprimer'\]/.test(NU));
/* ⚠️ « voir » n'est PAS un droit de catégorie : masquer une rubrique passe par
   `acces.modules[<écran>]`, écran par écran — et `go()` le fait respecter.
   Depuis la v731 la garde est COMPOSÉE (la rubrique, OU la sous-catégorie qui a son propre
   droit : `VUE_PARENT`) : le motif accepte les deux formes, mais exige toujours la redirection. */
vrai('⛔ masquer une rubrique passe par acces.modules, et go() le fait respecter',
  /u\.acces\.modules\[m\.k\]/.test(NU) && /if\(\(?item && !canSee\(item\)\)[^{]*\{ view='dashboard';/.test(NU));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
