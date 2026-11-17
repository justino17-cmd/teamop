// Matériel, étape 1 — UNE définition par fonction (une seconde déclaration gagne en silence, sans erreur) et plus de code mort.
// Lit le TEXTE de la page (pas de navigateur) : commentaires de bloc en début de ligne et lignes « // » retirés AVANT de chercher
// (règle du dépôt : un motif doit viser du code, jamais une phrase). Compte la population avant de conclure.
// Usage : node materiel-fonctions.js [fichier]   → « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..', '..', '..');
const f = process.argv[2] || path.join(RACINE, 'apercu', 'prototype-op-gestion.html');
let src = fs.readFileSync(f, 'utf8');
const code = src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, d !== undefined ? '→ ' + d : ''); } };
const defs = nom => { const e = nom.replace(/\$/g, '\\$');
  return (code.match(new RegExp('^function ' + e + '\\(', 'gm')) || []).length + (code.match(new RegExp('^(?:const|let|var) ' + e + '\\s*=', 'gm')) || []).length + (code.match(new RegExp('^' + e + '\\s*=\\s*function', 'gm')) || []).length
    + (code.match(new RegExp('\\(\\(\\) => \\{ const [a-z0-9]+ = ' + e + '; ' + e + ' = function', 'gm')) || []).length; };
// les pièces communes et Mon camion : exactement UNE définition (ni zéro, ni deux)
const UNE = ['matEtat', 'camionsARemplir', 'matPhrase', 'matEnvoisAAccepter', 'matDejaEnvoye', 'carteAide', 'matFeuille', 'matFeuilleVue', 'matEnvoyer', 'matPrendre', 'matRetirer', 'matManque', 'matManqueVue', 'matManqueEnvoyer', 'matRecupere', 'matVider',
  'vueMonCamion', 'sxMoi', 'sxMonLieu', 'sxInterDefaut', 'sxEnvois', 'sxLigneEnvoi', 'pdxPmOuvrir', 'rlNotifsListe', 'bxDeclarer', 'sxIntProposer', 'matIntsDe', 'matMessages', 'matResultats', 'matResultatsFeuille', 'sxDepose', 'sxToast', 'stkAppliquer'];
let n = 0;
for (const nom of UNE) { const d = defs(nom); n++; if (nom === 'stkAppliquer') { v('stkAppliquer : la seule porte du stock, déclarée une fois puis enveloppée (' + d + ' formes)', d >= 1 && d <= 3, d); continue; } v(nom + ' : une définition', d === 1, d + ' définitions'); }
v('population : ' + UNE.length + ' fonctions contrôlées', n === UNE.length && UNE.length >= 30);
// Stock (lot 2) : une seule définition de la page, de la fiche d'article, du registre et des portes qui disent ce qui s'est passé
const UNE2 = ['vueStock', 'prFiche', 'sxRegistre', 'matLigneArticle', 'msArticles', 'msBandeau', 'msTuiles', 'msJournal', 'msFiltrer', 'msEnvois', 'msAccepter', 'msRefuser', 'msRefusOk', 'matGOuvrir', 'matGVue', 'matGEnvoyer', 'matCompter', 'matCVue', 'matCEnregistrer', 'msReglagesVue', 'msMenuPlus', 'msMenuOu', 'msPhraseHtml', 'msMvVisibles', 'msFormApres', 'msPoser'];
let n2 = 0; for (const nom of UNE2) { n2++; if (nom === 'msFormApres' || nom === 'msPoser') { v(nom + ' : une définition', defs(nom) === 1, defs(nom)); continue; } v(nom + ' : une définition', defs(nom) === 1, defs(nom)); }
v('population Stock : ' + UNE2.length + ' fonctions contrôlées', n2 === UNE2.length && UNE2.length >= 25);
// prFormulaire : la déclaration d'origine + les enveloppes qui l'habillent (chaînes voulues : doublon, rangement, quatre champs) — au plus quatre formes
v('prFormulaire : la déclaration puis ses enveloppes (au plus 4 formes)', defs('prFormulaire') >= 1 && defs('prFormulaire') <= 4, defs('prFormulaire'));
const MORT2 = ['sxBandeau', 'sxChips', 'sxListeStock', 'sxNbPourInter', 'sxEntree', 'sxEntreeVue', 'sxEntreeOk', 'sxToutValider', 'sxRefus', 'sxRefusOk', 'sxLigneAtt', 'stkVueValider', 'stkVueMouvements', 'pdxFicheApres', 'sxPrFiche0', 'sxVueStock0', 'sxLieuFiche0'];
for (const nom of MORT2) { const d = (code.match(new RegExp('\\b' + nom + '\\b', 'g')) || []).length; v(nom + ' : supprimée du Stock (aucune occurrence dans le code)', d === 0, d + ' occurrences'); }
// le code mort et les anciennes portes ont disparu (ni déclaration, ni appel)
const MORT = ['bxMonCamion', 'bxManquePanel', 'bxDemOk', 'sxTForm', 'sxTFormVue', 'sxEnvoi', 'sxManqueVue', 'sxManqueEnvoi', 'pdxPmEnvoyer', 'sxIntVue', 'sxIntOk'];
for (const nom of MORT) { const d = (code.match(new RegExp('\\b' + nom + '\\s*\\(', 'g')) || []).length; v(nom + ' : supprimée (aucun appel, aucune déclaration)', d === 0, d + ' occurrences'); }
for (const a of ['data-sx="prise"', 'data-sx="usage"', 'data-sx="priseun', 'data-sx="manque', 'data-sx="envoi"', 'data-sxl=', 'data-sxadd', 'data-sxis=', 'data-bxl="demok"', 'data-pdx="pmok']) v('plus de bouton ancien ' + a, !code.includes(a), code.split(a).length - 1);
v('plus de style des trois gros boutons (.sx-gb)', !/\.sx-gb\b|\.sx-gros\b/.test(code));
// les routes restent (favoris, droits d'Équipe, barre du bas) : chaque vue de rubrique existe toujours, et la route moncamion est connue
for (const k of ['vueStock', 'vueProduits', 'vueBoxes', 'vueMonCamion']) v('vue « ' + k + ' » toujours déclarée', defs(k) >= 1, defs(k));
v('route « moncamion » connue du menu et du rôle technicien', /k:'moncamion'/.test(code) && /ROLES\.tech\.routes\.push\('moncamion'\)/.test(code));
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
