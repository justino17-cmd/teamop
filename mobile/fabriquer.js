#!/usr/bin/env node
/* Fabrique le contenu embarqué dans l'application mobile d'OP GESTION (dossier www/, jamais versionné).

   Pourquoi un script : l'application des stores embarque SES fichiers (elle s'ouvre sans réseau, et Apple relit exactement
   ce qui tourne). Elle ne charge donc pas teamop.fr : on recopie ici ce qu'elle doit contenir, à partir du dépôt.

   Deux contenus possibles :
     node fabriquer.js                → « prototype » : le prototype OP GESTION (entreprise et chiffres fictifs, aucun serveur).
                                        C'est ce qui se teste aujourd'hui sur Xcode et Android Studio.
     node fabriquer.js application    → la vraie application. PAS ENCORE FABRICABLE : la version « store » d'app.html
                                        (sans prix ni lien de paiement, service worker coupé, notifications natives,
                                        suppression de compte) reste à construire — voir LISEZMOI.md. Le script refuse
                                        plutôt que d'embarquer app.html tel quel : il porte le paiement, que les stores refusent. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..'), WWW = path.join(__dirname, 'www');
const mode = process.argv[2] || 'prototype';

function vider(d){ fs.rmSync(d, { recursive:true, force:true }); fs.mkdirSync(d, { recursive:true }); }
function lire(rel){ const p = path.join(RACINE, rel); if (!fs.existsSync(p)) { console.error('✗ fichier introuvable : ' + rel); process.exit(1); } return fs.readFileSync(p, 'utf8'); }

if (mode === 'application') {
  console.error('✗ La version « store » de la vraie application n’existe pas encore (voir mobile/LISEZMOI.md, « Ce qui reste »).');
  console.error('  Rien n’a été fabriqué. Pour tester la coque : node fabriquer.js');
  process.exit(2);
}
if (mode !== 'prototype') { console.error('✗ contenu inconnu : ' + mode + ' (prototype | application)'); process.exit(1); }

vider(WWW);
let page = lire('apercu/prototype-op-gestion.html');
/* dans l'application, pas de moteur de recherche : la balise robots de l'aperçu ne sert à rien, on la laisse ; mais la page
   doit se dire « application » pour que le prototype sache qu'il tourne dans la coque (encoches gérées par la coque) */
if (!/<meta name="viewport"[^>]*viewport-fit=cover/.test(page)) { console.error('✗ la page n’annonce pas viewport-fit=cover : les encoches de l’iPhone ne seraient pas gérées'); process.exit(1); }
/* ⛔ L'APPLICATION N'EST PAS LE PROTOTYPE QU'ON ÉPROUVE : dans la coque, la page se sait « application » et retire tout
   l'échafaudage (bande « Tester en tant que », « De A à Z », pastilles « faite », mentions « Prototype »). Justin, 12 novembre
   2026 : « la version finale comme si c'était l'application ; comme si j'étais un utilisateur ». `node fabriquer.js prototype essai`
   garde l'échafaudage, pour éprouver dans la coque. */
if (process.argv[3] !== 'essai') {
  if (!/var MODE_APP = !!window\.OPG_MODE_APP/.test(page)) { console.error('✗ la page ne connaît pas le mode application : l’aperçu du dépôt est trop ancien'); process.exit(1); }
  const avant = page; page = page.replace(/<body[^>]*>/, m => m + '\n<script>window.OPG_MODE_APP = true;</script>');
  if (page === avant) { console.error('✗ balise <body> introuvable : le mode application n’a pas pu être posé'); process.exit(1); }
}
fs.writeFileSync(path.join(WWW, 'index.html'), page);
/* le module de paiement en ligne vit dans un cadre : même dossier, même nom */
const paiement = lire('apercu/prototype-paiement.html');
fs.writeFileSync(path.join(WWW, 'prototype-paiement.html'), /<html/i.test(paiement) ? paiement
  : '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n' + paiement + '\n</body>\n</html>\n');

/* la Comptabilité complète s'ouvre aussi dans un cadre, depuis « Comptabilité » */
fs.writeFileSync(path.join(WWW, 'prototype-comptabilite.html'), lire('apercu/prototype-comptabilite.html'));

/* garde-fous : rien de distant, rien de payant vers l'extérieur */
const distants = [...page.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/g)].map(m => m[1]).filter(u => !/^https?:\/\/(www\.)?(teamop\.fr|w3\.org)/.test(u));
const octets = fs.readdirSync(WWW).reduce((s, f) => s + fs.statSync(path.join(WWW, f)).size, 0);
console.log('✓ contenu « prototype » (' + (process.argv[3] === 'essai' ? 'avec les outils d’essai' : 'mode application') + ') fabriqué dans mobile/www : ' + fs.readdirSync(WWW).join(', ') + ' · ' + Math.round(octets / 1024) + ' Ko');
if (distants.length) console.log('⚠ ' + distants.length + ' adresse(s) distante(s) chargée(s) par la page : ' + [...new Set(distants)].slice(0, 5).join(' , '));
