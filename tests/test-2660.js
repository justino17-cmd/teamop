/* ══ OP MESSAGES — LE STATUT D'UN CONTACT SANS ESPACE NE SORT PAS DE LA FICHE (lot q01, q#0/q#1) ═══════════════════════════════════════════
   Le correctif p03 (n#8) a posé `overflow-wrap: anywhere` sur `.contact-role` (la LISTE) mais pas sur son jumeau `.vc-fiche-statut` (la feuille « Contact ») : un statut de 60 « x » y faisait 450 px de large
   dans une feuille de 390 (iPhone) ou 360 (Android), centré donc rogné des deux côtés. Le nom juste au-dessus (`.vc-fiche-nom`) l'avait depuis toujours — une moitié de règle qui survit à l'autre.
   Le banc lit le CSS RÉEL de la page (commentaires retirés) et exige, pour CHAQUE règle qui vise `.vc-fiche-statut` (la base, le palier bureau, le palier tablette), que le texte puisse se couper :
   une règle plus spécifique ou plus tardive ne doit pas le reprendre (`overflow-wrap: normal`, `white-space: nowrap`). La preuve au navigateur (statut de 60 « x » sur iPhone 390, Android 360, Mac 1440,
   jour et nuit) vit dans la sonde du lot : scratchpad/messages/correctifs/q01/sonde-statut.js. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const CSS = ((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]).replace(/\/\*[\s\S]*?\*\//g, ' ');

/* chaque règle « sélecteur { corps } » — les @media sont des accolades imbriquées : on lit les règles FEUILLES (corps sans accolade), l'enveloppe @media tombe d'elle-même */
const regles = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim().replace(/\s+/g, ' '), corps: m[2] }));
const de = classe => regles.filter(r => r.sel.split(',').some(s => new RegExp('(^|[\\s>+~])' + classe.replace(/\./g, '\\.') + '$').test(s.trim())));

const statut = de('.vc-fiche-statut'), nom = de('.vc-fiche-nom');
vrai('(population) des règles visent .vc-fiche-statut (la base ET les paliers) — ' + statut.length, statut.length >= 3);
vrai('(population) le voisin .vc-fiche-nom est trouvé aussi — ' + nom.length, nom.length >= 3);
vrai('(contre-épreuve) le nom juste au-dessus se coupe déjà : la base de .vc-fiche-nom porte overflow-wrap: anywhere', nom.some(r => /overflow-wrap:\s*anywhere/.test(r.corps)));
vrai('⛔ le STATUT se coupe aussi : une règle de .vc-fiche-statut porte overflow-wrap: anywhere', statut.some(r => /overflow-wrap:\s*anywhere/.test(r.corps)));
vrai('⛔ …et la BASE (hors palier) la porte — celle qui sert sur téléphone', /overflow-wrap:\s*anywhere/.test((statut[0] || { corps: '' }).corps));
vrai('aucune règle du statut ne reprend la coupe (overflow-wrap: normal, white-space: nowrap)', !statut.some(r => /overflow-wrap:\s*normal|white-space:\s*nowrap/.test(r.corps)));
/* la jumelle de la liste ne s'est pas défaite */
vrai('(contre-épreuve) .contact-role (la liste) se coupe toujours', de('.contact-role').some(r => /overflow-wrap:\s*anywhere/.test(r.corps)));
fin();
