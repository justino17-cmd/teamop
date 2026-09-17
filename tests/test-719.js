/* ══ test-719 — LE RENOMMAGE DE L'ESPACE BÊTA, ET SURTOUT CE QU'IL NE DOIT PAS EMPORTER ═════
 *
 * Justin, 17 septembre 2026 : « on peut pas le renommer ça elan-gestion-beta ». Oui — le nom
 * ment depuis que le dépôt s'appelle TeamOP. Nouveau nom : `opgestion-beta` (la bêta de
 * l'application OP GESTION, pas de la société TEAM OP).
 *
 * ⛔ CE BANC EXISTE SURTOUT POUR CE QU'IL INTERDIT. `CLAUDE.md` décrit le piège en toutes
 * lettres : `SYNC_SECRET_DEFAULT` et `SYNC_SALT` CONTIENNENT « ELAN-GESTION » mais ne sont pas
 * des noms — le premier est le mot de passe de chiffrement, le second est le sel (base64 de
 * `ELAN-GESTION-salt-v1`). Un remplacement global de « elan » les emporterait et rendrait les
 * données de TOUTES les entreprises sans clé personnalisée définitivement illisibles, sur tous
 * leurs appareils à la fois. « Le piège se referme dans les deux sens » : invisible à une
 * recherche de « elan » pour le sel, évident pour qui décode le base64. Ce banc le ferme.
 *
 * ⛔ ET LA SECONDE CHOSE QU'IL INTERDIT : que le renommage touche `elan-gestion` TOUT COURT.
 * Celui-là est le document PARTAGÉ de toutes les entreprises sans clé personnalisée. Le
 * renommer les orphelinerait toutes d'un coup. Seule la bêta déménage.
 */
const fs = require('fs'), path = require('path');
const L = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const APP = L('app.html'), BETA = L('beta.html'), TOUR = L('tour.html'), CNX = L('connexion.html');
const SRV = L('server/index.js'), BUILD = L('beta-build.js'), RULES = L('firestore.rules');

let ok = 0, ko = 0;
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };
const eq = (nom, a, b) => { if (a === b) ok++; else { ko++; console.log('  ✗ ' + nom + '\n      obtenu  : ' + JSON.stringify(a) + '\n      attendu : ' + JSON.stringify(b)); } };

const NEUF = 'opgestion-beta', VIEUX = 'elan-gestion-beta', PROD = 'elan-gestion';

/* ── 1. ⛔ LE CHIFFREMENT — la partie qui ne pardonne pas ─────────────────────────────────── */
console.log('1. ⛔ Le mot de passe et le sel de chiffrement sont INTACTS');
/* Écrits ici caractère par caractère : si quelqu'un renomme, ce banc rougit AVANT publication. */
vrai('SYNC_SECRET_DEFAULT est inchangé, au caractère près',
  APP.indexOf("const SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026';") > 0);
vrai('SYNC_SALT est inchangé, au caractère près',
  APP.indexOf("const SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE=';") > 0);
/* Le sel décodé DOIT rester « ELAN-GESTION-salt-v1 » : c'est la forme sous laquelle une
   relecture consciencieuse serait tentée de le « corriger ». */
eq('le sel décodé est toujours ELAN-GESTION-salt-v1',
  Buffer.from('RUxBTi1HRVNUSU9OLXNhbHQtdjE=', 'base64').toString('utf8'), 'ELAN-GESTION-salt-v1');
/* Et la bêta les porte aussi, à l'identique : beta-build ne doit pas les avoir réécrits. */
vrai('la bêta porte le même mot de passe', BETA.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") > 0);
vrai('la bêta porte le même sel', BETA.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") > 0);
/* ⛔ Le générateur refuse de produire une bêta qui les aurait perdus — dernière barrière. */
vrai('beta-build.js refuse une app au mot de passe modifié', /SYNC_SECRET_DEFAULT[^]{0,80}process\.exit\(1\)/.test(BUILD));
vrai('beta-build.js refuse une app au sel modifié', /SYNC_SALT[^]{0,80}process\.exit\(1\)/.test(BUILD));

/* ── 2. ⛔ LA PRODUCTION N'A PAS BOUGÉ ────────────────────────────────────────────────────── */
console.log('2. ⛔ L\'espace de PRODUCTION n\'a pas bougé d\'un caractère');
vrai('app.html pointe toujours sur elan-gestion', APP.indexOf("const FB_TEAM='" + PROD + "';") > 0);
vrai('… et jamais sur le nom de la bêta', APP.indexOf("const FB_TEAM='" + NEUF + "'") < 0);
vrai('elan-gestion reste protégé côté serveur', SRV.indexOf("'" + PROD + "'") > 0);
vrai('… et reste technique dans la Tour', TOUR.indexOf("'" + PROD + "'") > 0);

/* ── 3. La bêta a bien déménagé ───────────────────────────────────────────────────────────── */
console.log('3. La bêta est sur son nouvel espace');
vrai('beta.html porte le nouveau nom', BETA.indexOf("const FB_TEAM='" + NEUF + "';") > 0);
vrai('… et plus l\'ancien', BETA.indexOf("FB_TEAM='" + VIEUX + "'") < 0);
vrai('beta-build.js réécrit vers le nouveau nom', BUILD.indexOf('"FB_TEAM=\'' + NEUF + '\'"') > 0);
vrai('… et sa garde vérifie le nouveau nom', BUILD.indexOf('s.indexOf("FB_TEAM=\'' + NEUF + '\'") < 0') > 0);
vrai('le contrôle de la route PROPOSE suit', L('scripts/verifier-propose.js').indexOf("FB_TEAM='" + NEUF + "'") > 0);
/* L'isolation du stockage local, elle, ne change pas : elle tient au préfixe, pas à l'espace. */
vrai('le stockage local reste isolé par elanB_', BETA.indexOf("'elanB_gestion_v2'") > 0);

/* ── 4. ⛔ LA PORTE AVANT LE DÉMÉNAGEMENT ─────────────────────────────────────────────────── */
console.log('4. ⛔ Tout ce qui protège la bêta connaît le nouveau nom');
/* Si la bêta déménageait sans que le serveur connaisse son nouveau nom, le nouvel espace
   deviendrait supprimable comme une entreprise ordinaire — 11 points de refus le manqueraient. */
const listeSrv = /const ESPACES_INTOUCHABLES = (\[[^\]]*\]);/.exec(SRV);
vrai('ESPACES_INTOUCHABLES est trouvée', !!listeSrv);
if (listeSrv) {
  const l = JSON.parse(listeSrv[1].replace(/'/g, '"'));
  vrai('elle protège le nouveau nom', l.includes(NEUF));
  vrai('elle protège encore l\'ancien (le document existe toujours)', l.includes(VIEUX));
  vrai('elle protège toujours la production', l.includes(PROD));
  eq('et rien d\'autre ne s\'y est glissé', l.length, 3);
}
const listeTour = /var ESPACES_TECHNIQUES=(\[[^\]]*\]);/.exec(TOUR);
vrai('ESPACES_TECHNIQUES est trouvée', !!listeTour);
if (listeTour) {
  const l = JSON.parse(listeTour[1].replace(/'/g, '"'));
  [NEUF, VIEUX, PROD].forEach(x => vrai('la Tour connaît « ' + x + ' »', l.includes(x)));
}
vrai('connexion.html connaît le nouveau nom', CNX.indexOf("'" + NEUF + "'") > 0);
vrai('… et garde l\'ancien', CNX.indexOf("'" + VIEUX + "'") > 0);

/* ── 5. Les deux espaces bêta se nomment à l'écran, et se distinguent ─────────────────────── */
console.log('5. La Tour sait nommer les deux, sans les confondre');
vrai('le nouveau s\'appelle « Bêta TEAM OP »', /t==='opgestion-beta'\) return 'Bêta TEAM OP';/.test(TOUR));
vrai('l\'ancien se dit ancien', /t==='elan-gestion-beta'\) return 'Bêta TEAM OP \(ancien espace\)';/.test(TOUR));
/* ⛔ Deux lignes qui rendraient le MÊME texte laisseraient croire à un doublon dans la Tour. */
vrai('les deux noms affichés sont différents',
  (TOUR.match(/return 'Bêta TEAM OP'/g) || []).length === 1);

/* ── 6. La règle Firestore dit le vrai nom ────────────────────────────────────────────────── */
console.log('6. Le commentaire de la règle Firestore ne ment plus');
vrai('firestore.rules nomme le nouvel espace', RULES.indexOf(NEUF) > 0);
vrai('… et dit depuis quand il a changé', /17 septembre 2026/.test(RULES));

/* ── 7. Aucun renommage sauvage ailleurs ──────────────────────────────────────────────────── */
console.log('7. Le renommage n\'a pas débordé');
/* Le préfixe de stockage local elan_ / elanB_ ne doit PAS avoir bougé : neuf clés sont
   construites à la volée, et perdre elan_vierge_v1 vide 28 collections d'une base pleine. */
vrai('le préfixe de stockage elan_ est intact dans app.html', /'elan_vierge_v1'/.test(APP));
vrai('… et devenu elanB_ dans la bêta, comme avant', /'elanB_vierge_v1'/.test(BETA));
vrai('elan_repli_v1 est intact', /'elan_repli_v1'/.test(APP));
vrai('le nom du projet Firebase n\'a pas été touché', /'elan-gestion'/.test(SRV));

console.log('\n════ test-719 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
if (ko) process.exit(1);
