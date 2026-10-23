/* ══ UN RÉFÉRENTIEL DE BANC OÙ DES MÉTIERS RESTENT FERMÉS (23 octobre 2026) ═══════════════════════════════════════════════════════
   Le geste de publication de la v772 a ouvert les vingt-trois métiers : `metiers.json` n'en ferme plus aucun. Les refus d'un métier
   FERMÉ (`metier_ferme` de la demande et du paiement, « métier inconnu » de la Tour, la liste donnée à Claude) restent du code
   VIVANT : le jour où un métier entre au référentiel avant d'être ouvert, c'est lui qui empêche un client de recevoir le pack par
   défaut. Les bancs qui le prouvent jouent donc un référentiel FABRIQUÉ — le vrai fichier, seul `ouverts` réduit : les dix métiers
   ouverts le 23 octobre y sont refermés, l'état d'avant la publication. Le vrai fichier n'est jamais modifié.
   Pour le VRAI serveur, `preload()` rend le code d'un `--require` qui lui fait lire ce fichier à la place de `<racine>/metiers.json`,
   et rien d'autre (le chemin est comparé résolu ; tout autre fichier passe tel quel). Un banc qui s'en sert PROUVE que la redirection
   a pris (le serveur sert treize métiers ouverts) avant de croire un refus. */
'use strict';
const fs = require('fs'), path = require('path');

const DIX = ['incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine'];

function referentielFerme(racine) {
  const reel = JSON.parse(fs.readFileSync(path.join(racine, 'metiers.json'), 'utf8'));
  const json = JSON.parse(JSON.stringify(reel));
  json.ouverts = json.ouverts.filter(k => DIX.indexOf(k) < 0);
  return { json, reel, fermes: json.ordreMetiers.filter(k => !json.ouverts.includes(k)) };
}

/* Écrit le référentiel fabriqué dans `dossier` (le bac du banc) et rend { json, reel, fermes, chemin }. */
function ecrire(racine, dossier) {
  const r = referentielFerme(racine);
  r.chemin = path.join(dossier, 'metiers-fermes.json');
  fs.writeFileSync(r.chemin, JSON.stringify(r.json, null, 1));
  return r;
}

function preload(racine, chemin) {
  return '(function () { const fs = require(\'fs\'), path = require(\'path\'); const cible = ' + JSON.stringify(path.resolve(racine, 'metiers.json'))
    + ', remplace = ' + JSON.stringify(chemin) + '; const lire = fs.readFileSync;\n'
    + '  fs.readFileSync = function (p, ...reste) { if (typeof p === \'string\' && path.resolve(p) === cible) p = remplace; return lire.call(fs, p, ...reste); }; })();\n';
}

module.exports = { DIX, referentielFerme, ecrire, preload };
