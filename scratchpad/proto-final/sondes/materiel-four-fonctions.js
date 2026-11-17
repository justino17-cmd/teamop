// Matériel, étape 4 (Fournisseurs, matériel & produits) — UNE définition par fonction (une seconde déclaration gagne en silence) et plus de code mort.
// Lit le TEXTE de la page (pas de navigateur) : commentaires de bloc en début de ligne et lignes « // » retirés AVANT de chercher (un motif vise du code, jamais une phrase).
// Usage : node materiel-four-fonctions.js [fichier]   → « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const f = process.argv[2] || path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-op-gestion.html');
const code = fs.readFileSync(f, 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, d !== undefined ? '→ ' + d : ''); } };
const defs = nom => (code.match(new RegExp('^function ' + nom + '\\(', 'gm')) || []).length + (code.match(new RegExp('^(?:const|let|var) ' + nom + '\\s*=', 'gm')) || []).length + (code.match(new RegExp('^' + nom + '\\s*=\\s*function', 'gm')) || []).length;
const enveloppes = nom => (code.match(new RegExp('\\(\\(\\) => \\{ const [a-z0-9]+ = ' + nom + '; ' + nom + ' = function', 'gm')) || []).length;
// la page, ses trois onglets, la fiche d'un fournisseur et « Ajouter un fournisseur » : exactement UNE définition, et AUCUNE enveloppe qui les retouche après coup
const UNE = ['vueProduits', 'fxTete', 'fxOnglets', 'fxCommandes', 'fxPanier', 'fxLigneCmd', 'fxPastille', 'fxBoutonCmd', 'fxArticles', 'fxLigneArt', 'fxFournisseurs', 'fournFiche', 'fournListe', 'foLocal', 'foAjouterDir', 'cmdEdVue', 'cmdEdOuvrir', 'cmdEnvoyer', 'cmdFiche', 'cmdEtapes', 'cmdReception', 'cmdRappro', 'fxMenuPlus', 'fxMenuCmd', 'fxMenuFournisseur', 'fxHabituels', 'fxManqueMaj'];
let n = 0; for (const nom of UNE) { n++; v(nom + ' : une définition', defs(nom) === 1, defs(nom) + ' définitions'); }
v('population : ' + UNE.length + ' fonctions contrôlées', n === UNE.length && UNE.length >= 25);
for (const nom of ['vueProduits', 'fournFiche', 'fournListe', 'cmdFiche', 'cmdEtapes']) v(nom + ' : aucune enveloppe qui la retouche', enveloppes(nom) === 0, enveloppes(nom));
// enveloppes voulues, une chacune : le fournisseur non enregistré (cmdEdVue), l'effet d'un écart sur le prix de vente (cmdRappro), la tâche qui revient à Tâches (cmdEnvoyer)
for (const nom of ['cmdEdVue', 'cmdRappro', 'cmdEnvoyer', 'cmdReception']) v(nom + ' : au plus UNE enveloppe voulue', enveloppes(nom) <= 1, enveloppes(nom));
// ce qui est enveloppé exprès (les écritures et les calculs gardent leurs chaînes) : la déclaration puis au plus deux enveloppes
v('cmdReceptionner : la déclaration puis ses enveloppes (rangement, annulation) — au plus 4 formes', defs('cmdReceptionner') >= 1 && defs('cmdReceptionner') + enveloppes('cmdReceptionner') <= 4, defs('cmdReceptionner') + ' + ' + enveloppes('cmdReceptionner'));
// le code mort a disparu : ni déclaration, ni appel
const MORT = ['vueCommandes', 'vueFournisseurs', 'cmdEnvoiVue', 'foBandeau', 'cmdLigne', 'cmdTrouve', 'pdxFournApres'];
for (const nom of MORT) { const d = (code.match(new RegExp('\\b' + nom + '\\b', 'g')) || []).length; v(nom + ' : supprimée (aucune occurrence)', d === 0, d + ' occurrences'); }
for (const a of ['data-ce="envoi"', 'data-ce="envoi|', 'data-ce^="go|', 'data-cm="filtre|', 'class="cmd-table"', 'class="fo-fc"', 'class="fo-outils"', 'class="pr-pack"', 'data-pdx="etat|']) v('plus de repère de l’ancien écran ' + a, !code.includes(a), code.split(a).length - 1);
// les routes et les clés restent : favoris, menu, droits d'Équipe
for (const k of ['vueProduits']) v('vue « ' + k + ' » toujours déclarée', defs(k) === 1, defs(k));
v('la route « produits » est toujours dans vues()', /produits:vueProduits/.test(code));
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
