'use strict';
/* ══ LE RÉFÉRENTIEL DES MÉTIERS, LU PAR LE SERVEUR ══════════════════════════════════════════════════════════════
   `metiers.json` (à la racine du dépôt, lu par le serveur et par le générateur du site, JAMAIS publié tel quel : il porte le travail à faire) est LA source : les 23 métiers, leurs rubriques d'OP GESTION
   (ouvertes par défaut, avec la raison de chacune), l'explication de chaque rubrique. Le serveur, la Tour, l'espace client,
   la page de paiement et le générateur du site la lisent — jamais une copie.

   ⛔ L'INTERRUPTEUR EST UN, ET IL EST LÀ : le champ `ouverts` du fichier. Un métier n'y entre que si l'application publique le
   connaît (sa clé est dans `METIERS_ORDRE`, app.html — `tests/test-2890.js` le vérifie dans les deux sens), sinon un client
   qui le choisirait recevrait le pack par défaut (anti-nuisibles 3D, `metierPackDe`) : un plombier de l'incendie lirait
   « Dératisation ». `ouvertsReglage` ouvre un métier PAR DÉCISION tant que l'application ne le connaît pas, avec sa raison.

   ⚠️ Le fichier est lu au DÉMARRAGE (le VPS redémarre à chaque déploiement). S'il manque ou ne se lit pas — un déploiement du
   serveur seul avant que le site porte `metiers.json` —, les TREIZE métiers d'avant restent ouverts, et rien d'autre : on ne
   ferme jamais ce qui marchait, on n'ouvre jamais sur un doute. Les treize sont aussi un PLANCHER quand le fichier se lit :
   un fichier tronqué ne ferme personne. */
const fs = require('fs');

const HISTORIQUES = ['3d', 'plomberie', 'electricite', 'chauffage', 'serrurerie', 'nettoyage', 'maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre'];
const LIBELLES_HISTORIQUES = { '3d': '3D — Hygiène anti-nuisibles', plomberie: 'Plomberie', electricite: 'Électricité', chauffage: 'Chauffage / Climatisation', serrurerie: 'Serrurerie', nettoyage: 'Nettoyage / Propreté',
  maconnerie: 'Maçonnerie / Gros œuvre', menuiserie: 'Menuiserie', peinture: 'Peinture / Revêtements', paysagiste: 'Paysagiste / Espaces verts', couverture: 'Couverture / Zinguerie', multiservices: 'Multiservices / Maintenance', autre: 'Autre métier de terrain' };

function lire(chemin) {
  try {
    const j = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    return j && typeof j === 'object' && j.metiers && typeof j.metiers === 'object' && j.rubriques && typeof j.rubriques === 'object' ? j : null;
  } catch (e) { return null; }
}

/* `catsOk` : la liste fermée des rubriques cochables (CATS_OK, index.js) — passée par l'appelant, pour que la liste du serveur
   reste la seule à décider de ce qui est valable. */
module.exports = function (chemin, catsOk, catsToujours, catsBase) {
  const ref = lire(chemin);
  const connu = k => typeof k === 'string' && !!ref && Object.prototype.hasOwnProperty.call(ref.metiers, k);
  const ouvertsFichier = ref && Array.isArray(ref.ouverts) ? ref.ouverts.filter(connu) : [];
  const ouverts = HISTORIQUES.concat(ouvertsFichier.filter(k => !HISTORIQUES.includes(k)));
  const ordreFichier = ref && Array.isArray(ref.ordreMetiers) ? ref.ordreMetiers : [];
  /* l'ordre du fichier d'abord, puis ce qui n'y figure pas ; jamais une clé fermée */
  const ordre = ordreFichier.filter(k => ouverts.includes(k)).concat(ouverts.filter(k => !ordreFichier.includes(k)));
  const estOuvert = k => typeof k === 'string' && ouverts.includes(k);
  const nom = k => (ref && connu(k) && ref.metiers[k].nom) || LIBELLES_HISTORIQUES[k] || '';
  const libelles = () => { const o = {}; for (const k of ordre) o[k] = nom(k); return o; };
  const cochable = k => catsOk.includes(k);
  /* le conseil d'un métier : ses rubriques ouvertes par défaut, SANS les quatre qui ne se cochent jamais, dans l'ordre du menu.
     `null` quand le fichier manque ou que le métier est inconnu : l'appelant ne devine rien. */
  const conseil = k => {
    if (!ref || !estOuvert(k) || !connu(k)) return null;
    const m = ref.metiers[k];
    return Array.isArray(m.rubriques) ? catsOk.filter(c => m.rubriques.includes(c)) : null;
  };
  let publiqueCache = null;
  /* ce qu'on SERT au public : seulement les métiers ouverts, seulement ce que l'écran d'abonnement affiche. Les relevés, les
     obligations, les fonctions à créer… restent dans le fichier (il est public aussi, mais ce n'est pas à l'API d'en faire
     un fil de 200 Ko à chaque ouverture de page). */
  const publique = () => {
    if (!ref) return null;
    if (publiqueCache) return publiqueCache;
    const rubriques = {};
    const cles = Object.keys(ref.rubriques).filter(cochable);
    for (const k of cles) {
      const r = ref.rubriques[k];
      rubriques[k] = { titre: r.titre, ic: r.ic, groupe: r.groupe, explication: r.explication };
      if (r.reserveAdmin) rubriques[k].reserveAdmin = true;
      if (Array.isArray(r.seulement)) rubriques[k].seulement = r.seulement.slice();
    }
    const metiers = {};
    for (const k of ordre) {
      if (!connu(k)) continue;
      const m = ref.metiers[k];
      const conseille = conseil(k) || [];
      const pourquoi = {}, proposees = {};
      for (const c of conseille) if (m.pourquoi && typeof m.pourquoi[c] === 'string') pourquoi[c] = m.pourquoi[c];
      for (const c of Object.keys(m.proposees || {})) if (cochable(c) && typeof m.proposees[c] === 'string') proposees[c] = m.proposees[c];
      metiers[k] = { nom: nom(k), ic: m.ic || '', sous: m.sous || '', rubriques: conseille, pourquoi, proposees };
    }
    const groupes = [];
    for (const k of cles) if (!groupes.includes(ref.rubriques[k].groupe)) groupes.push(ref.rubriques[k].groupe);
    const toujours = catsToujours.map(k => ({ k, titre: (ref.rubriques[k] || {}).titre || k, ic: (ref.rubriques[k] || {}).ic || '', explication: (ref.rubriques[k] || {}).explication || '' }));
    /* `base` : les rubriques cochées d'office et non décochables (`CATS_BASE`, index.js — le serveur les ajoute de toute façon à ce que le client coche : l'écran doit
       le DIRE, sinon il montre « Stock » décochée pendant que le serveur la range cochée). Absent = un appelant d'avant : aucune. */
    const base = Array.isArray(catsBase) ? catsBase.filter(k => cochable(k) && cles.includes(k)) : [];
    publiqueCache = { ok: true, version: ref.version || 1, ouverts: ordre.filter(connu), ordre: cles, groupes, rubriques, toujours, base, metiers };
    return publiqueCache;
  };
  return { ref, ouverts, ordre, estOuvert, connu, nom, libelles, conseil, publique, lu: !!ref };
};
module.exports.HISTORIQUES = HISTORIQUES;
