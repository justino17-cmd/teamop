/* L'aide partagée des bancs qui jouent la PAGE DE PAIEMENT (recap-abonnement.html) ou la demande d'accès : le référentiel des métiers tel
   que le vrai serveur le sert (`server/metiers.js` sur `metiers.json`), la vraie grille de rubriques (`rubriques-choix.js`) et un
   rangement de session qui porte déjà un choix de métier. Ce n'est pas une suite (le compteur ne la lance pas) : `test-837`, `test-838`
   et `test-839` la chargent.
   Pourquoi un fichier : depuis le 23 octobre 2026 la page de paiement lit `/api/metiers` et demande un métier avant de payer. Chaque banc
   qui l'exécute doit répondre à cet appel (et ne pas le compter parmi les appels de compte) ; trois copies de la même réponse divergent. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SRV = nu(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
const lit = nom => { const i = SRV.indexOf('const ' + nom + ' = ['); return vm.runInNewContext('(' + SRV.slice(SRV.indexOf('[', i), SRV.indexOf('];', i) + 1) + ')'); };
const CATS_OK = lit('CATS_OK'), CATS_TOUJOURS = lit('CATS_TOUJOURS');
const module_ = require(path.join(RACINE, 'server', 'metiers.js'))(path.join(RACINE, 'metiers.json'), CATS_OK, CATS_TOUJOURS);
const REFERENTIEL = module_.publique();
const OPRUB = require(path.join(RACINE, 'rubriques-choix.js'));
const rep = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (corps === undefined) throw new Error('pas du JSON'); return corps; } });
/* la réponse du serveur à `GET /api/metiers` */
const reponseMetiers = () => rep(200, REFERENTIEL);
const estMetiers = url => /\/api\/metiers(\?.*)?$/.test(String(url));
/* un rangement de session (sessionStorage) qui porte le choix d'un métier, comme au retour du portail */
const sessionAvecChoix = (metier, cats) => { const m = new Map(); if (metier) m.set('teamop_abo_choix', JSON.stringify({ metier, cats: cats || null })); return m; };
const rangementDe = m => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, x) => m.set(k, String(x)), removeItem: k => m.delete(k) });
module.exports = { REFERENTIEL, OPRUB, CATS_OK, CATS_TOUJOURS, rep, reponseMetiers, estMetiers, sessionAvecChoix, rangementDe };
