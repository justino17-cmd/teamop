/* ══ CE QUE L'APP.HTML DE CETTE BRANCHE A D'AVANCE SUR LES PIÈCES PUBLIQUES — DÉCLARÉ ICI, ET NULLE PART AILLEURS ═══════════════
   23 octobre 2026. Sur cette branche, `app.html` est la BÊTA : elle précède la version publique. Les pièces qui servent le public
   (`metiers.json` et son interrupteur `ouverts`, le serveur `METIERS_OK`, la Tour `MET_L` et `CAT_L`/`CATS_APPLIQUEES`, le portail
   `METIER_L`, le site, la page de paiement) disent ce que la version PUBLIQUE fait. Les bancs qui comparent `app.html` à ces pièces
   (2890, 2893, 2871, 2950, 835, 837, 846, 848) étaient écrits pour le cas où les deux sont la même version : sur `main`, c'est le
   cas et ils y sont justes ; sur cette branche, ils tombaient sur un écart voulu.

   Cette déclaration dit EXACTEMENT les trois écarts, un par un — et rien d'autre :
     1. `metiers` : les métiers que l'application connaît (`METIERS_ORDRE`) et que les pièces publiques n'ouvrent pas encore ;
     2. `libelles` : les rubriques dont le libellé du menu d'`app.html` n'est pas celui que le public lit encore
        (`beta` = ce que dit app.html, `public` = ce que disent `metiers.json`, la Tour et le portail) ;
     3. `categoriesAppliquees` : `app.html` applique les catégories retenues pour l'entreprise (`/api/espaces/etat`, champ `cats`)
        alors que le drapeau `CATS_APPLIQUEES` de la Tour — la promesse faite au client — dit encore faux.

   ⛔ LE GESTE DE PUBLICATION (le jour où Justin dit « publie ») : VIDER cette déclaration ET OUVRIR les pièces publiques ENSEMBLE,
   dans le même commit — les dix clés dans `ouverts` de `metiers.json`, `METIERS_OK`/`MET_L`/`METIER_L` et le site ; le titre
   `validations` de `metiers.json` devient « Validation des mouvements » (puis `node scripts/metiers-generer.js`) ; `CATS_APPLIQUEES`
   passe à `true`. Une déclaration vidée sans que les pièces suivent fait tomber les bancs (l'écart n'est plus toléré) ; des pièces
   ouvertes sans que la déclaration soit vidée aussi (la déclaration devient fausse : `mensongesMetiers` etc. le disent).

   ⛔ UN ÉCART DÉCLARÉ EST TOLÉRÉ, MAIS JAMAIS ÉLARGI : un métier hors de cette liste doit être partout, un libellé hors de cette liste
   est celui du public, et chaque ligne doit être VRAIE (un métier déclaré « pas encore ouvert » qui est ouvert, un libellé que
   `app.html` ne porte plus, des catégories que `app.html` n'applique pas : le banc `test-2956` tombe). Les fonctions `mensonges…`
   rendent la liste de ce qui est faux ; une liste vide veut dire « la déclaration dit vrai ».
   `scripts/metiers-generer.js` lit aussi `libelles` : c'est lui qui écrit « Validation des mouvements » dans `RUBRIQUES_INFO`
   d'app.html tant que la déclaration le demande, et le titre PUBLIC une fois vidée.                                              */
'use strict';

const BETA_EN_AVANCE = {
  /* VIDÉE le 23 octobre 2026, au geste de publication de la v772 (Justin : « oui publie ») : les dix métiers sont ouverts dans
     `metiers.json`, « Validation des mouvements » est le titre public, et la Tour promet les catégories appliquées (`CATS_APPLIQUEES`). */
  /* 29 octobre 2026 (v780) : « climatisation » est séparée du chauffage (Justin : « sépare clim et chauffage ») — app.html la connaît, la version PUBLIQUE non : un client qui la choisirait y
     recevrait le pack par défaut. Elle n'est donc PAS dans `ouverts` de metiers.json, ni chez le serveur, la Tour, le portail et le site, jusqu'au geste de publication. */
  metiers: ['climatisation'],
  libelles: {},
  categoriesAppliquees: false,
  /* v779 (bêta seule, 29 octobre 2026) : les packs métier que la BÊTA porte plus riches que `metiers.json` (production, v773) — plomberie et
     chauffage (documents, catalogue, obligations), nettoyage (relevés). Leur contenu exact est dans `tests/metiers-beta-avance.json` ; le banc
     2950 compare beta.html à `metiers.json` AVEC ces trois packs substitués, et exige que le reste soit identique à app.html. Le jour où
     `metiers.json` porte ces packs : vider cette liste ET supprimer le fichier, ensemble. */
  /* 29 octobre 2026 (menu allégé, bêta) : Justin, « les messageries dans OP GESTION, tu les supprimes ; la télécollecte, il faudra
     qu'ils nous la demandent » — les rubriques cochées d'office changent pour TOUS les métiers : tous sont en avance. */
  metiersBeta: ['3d', 'plomberie', 'electricite', 'chauffage', 'serrurerie', 'nettoyage', 'maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre', 'incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'piscine', 'energies', 'alarme', 'eau'],
  /* 29 octobre 2026 (v780, bêta seule) : « climatisation » est séparée du chauffage (Justin : « sépare clim et chauffage »). Un métier que SEULE LA
     BÊTA connaît : il est dans METIERS/METIERS_ORDRE de beta.html, et ABSENT d'app.html (production, 23 métiers), de `metiers.json` (`ouverts`,
     `ordreMetiers`, `metiers`), du serveur, de la Tour, du portail. Différent de `metiers` (ci-dessus, vide) : celui-là parle d'un métier qu'APP.HTML
     connaît déjà et que le public n'ouvre pas encore. Ici app.html ne le connaît pas : les bancs qui lisent app.html (2890, 2956, 835, 848…)
     ne le voient pas, et ne doivent pas le voir. Son pack vit dans `tests/metiers-beta-avance.json`. Le jour de la publication : app.html le
     reçoit, `metiers.json` l'ouvre, et cette liste se vide avec le fichier. */
  metiersBetaSeule: ['climatisation'],
  /* ce que la bêta ajoute de neuf et que la production ne connaît pas : le « pack combiné » (METIERS_COMBOS) et ce qu'il écrit (`db.metierPlus2`),
     une collection synchronisée de plus (à côté de `metierPlus`, déjà déclarée par le banc 731). */
  collectionsBeta: ['metierPlus2'],
};
/* Le référentiel tel que la BÊTA le porte : celui de la production, moins l'avance déclarée ci-dessus. */
function referentielBeta(REF) {
  const R = JSON.parse(JSON.stringify(REF));
  if (!BETA_EN_AVANCE.metiersBeta.length) return R;
  const A = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'metiers-beta-avance.json'), 'utf8'));
  BETA_EN_AVANCE.metiersBeta.forEach(k => { R.metiers[k] = A.metiers[k]; });
  /* les métiers que seule la bêta connaît : leur pack et leur place dans l'ordre (celui de la bêta). Chacun doit être dans le fichier. */
  BETA_EN_AVANCE.metiersBetaSeule.forEach(k => { R.metiers[k] = A.metiers[k]; });
  if (BETA_EN_AVANCE.metiersBetaSeule.length) R.ordreMetiers = A.ordreMetiers.slice();
  return R;
}

const PAS_ENCORE_OUVERTS = BETA_EN_AVANCE.metiers;
const BETA_SEULE = BETA_EN_AVANCE.metiersBetaSeule;
const COLLECTIONS_BETA = BETA_EN_AVANCE.collectionsBeta;
const LIBELLES = BETA_EN_AVANCE.libelles;

/* L'ordre des métiers que connaît l'application PUBLIQUE : celui d'app.html, sans les métiers déclarés. */
function ordrePublic(ordreApp) { return ordreApp.filter(k => PAS_ENCORE_OUVERTS.indexOf(k) < 0); }

/* Le libellé de menu qu'une pièce PUBLIQUE doit porter pour la rubrique `k`, sachant ce que dit app.html : l'écart déclaré
   (exactement celui-là) se lit comme le libellé public ; tout autre libellé reste tel quel, donc fait tomber la comparaison. */
function libellePublic(k, libelleApp) {
  const d = Object.prototype.hasOwnProperty.call(LIBELLES, k) ? LIBELLES[k] : null;
  return d && libelleApp === d.beta ? d.public : libelleApp;
}

/* Ce que lit l'application PUBLIQUE des catégories : ce que lit app.html, moins l'avance déclarée. */
function categoriesLuesParPublique(appLitCats) { return !!appLitCats && !BETA_EN_AVANCE.categoriesAppliquees; }

/* ── la déclaration est-elle VRAIE ? Chaque fonction rend la liste de ses mensonges (vide = vrai). ───────────────────────── */

/* ordreApp : METIERS_ORDRE d'app.html ; ouverts : `ouverts` de metiers.json. (Un métier de la liste que le serveur, la Tour ET le portail
   connaissent tous se signale ailleurs : `ouvertsPartout`, dans tests/metiers-publics.js.) */
function mensongesMetiers(ordreApp, ouverts) {
  const L = [];
  PAS_ENCORE_OUVERTS.forEach(k => {
    if (ordreApp.indexOf(k) < 0) L.push('« ' + k + ' » est déclaré en avance mais app.html ne le connaît pas');
    if (ouverts.indexOf(k) >= 0) L.push('« ' + k + ' » est déclaré « pas encore ouvert » mais metiers.json l\'ouvre');
  });
  return L;
}

/* ordreApp : METIERS_ORDRE d'app.html ; ordreBeta : celui de beta.html ; ouverts : `ouverts` de metiers.json ; ordreRef : `ordreMetiers` de metiers.json.
   Un métier « que seule la bêta connaît » doit être dans la bêta, et nulle part ailleurs. */
function mensongesBetaSeule(ordreApp, ordreBeta, ouverts, ordreRef) {
  const L = [];
  BETA_SEULE.forEach(k => {
    if (ordreBeta.indexOf(k) < 0) L.push('« ' + k + ' » est déclaré « seulement bêta » mais beta.html ne le connaît pas');
    if (ordreApp.indexOf(k) >= 0) L.push('« ' + k + ' » est déclaré « seulement bêta » mais app.html le connaît');
    if (ouverts.indexOf(k) >= 0 || ordreRef.indexOf(k) >= 0) L.push('« ' + k + ' » est déclaré « seulement bêta » mais metiers.json le porte');
  });
  return L;
}

/* libNav : { cle: {l: libellé du menu d'app.html} } ; titresPublics : { cle: titre } tel que le dit la pièce publique (metiers.json). */
function mensongesLibelles(libNav, titresPublics) {
  const L = [];
  Object.keys(LIBELLES).forEach(k => {
    const d = LIBELLES[k], app = libNav[k] && libNav[k].l, pub = titresPublics[k];
    if (app !== d.beta) L.push('« ' + k + ' » : app.html dit « ' + app + ' », la déclaration annonce « ' + d.beta + ' »');
    if (pub !== d.public) L.push('« ' + k + ' » : la pièce publique dit « ' + pub + ' », la déclaration annonce « ' + d.public + ' »');
    if (d.beta === d.public) L.push('« ' + k + ' » : la déclaration ne déclare aucun écart');
  });
  return L;
}

/* appLitCats : app.html lit-elle `cats` dans la réponse de /api/espaces/etat ; drapeauTour : valeur de CATS_APPLIQUEES (true/false/undefined). */
function mensongesCategories(appLitCats, drapeauTour) {
  const L = [];
  if (BETA_EN_AVANCE.categoriesAppliquees) {
    if (!appLitCats) L.push('les catégories sont déclarées appliquées par app.html, qui ne les lit pas');
    if (drapeauTour === true) L.push('CATS_APPLIQUEES de la Tour est vrai : la promesse est publique, la déclaration est périmée');
    if (drapeauTour !== true && drapeauTour !== false) L.push('CATS_APPLIQUEES n\'est pas lu dans la Tour');
  }
  return L;
}

module.exports = { referentielBeta, BETA_EN_AVANCE, PAS_ENCORE_OUVERTS, BETA_SEULE, COLLECTIONS_BETA, mensongesBetaSeule, LIBELLES, ordrePublic, libellePublic, categoriesLuesParPublique, mensongesMetiers, mensongesLibelles, mensongesCategories };
