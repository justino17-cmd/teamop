// Outils communs des sondes « compta-reste » (campagne du 17 novembre 2026) : la seconde moitié de la Comptabilité d'OP GESTION —
// achats, notes de frais, fournisseurs, banque, paiement en ligne, TVA, journal et états, envoi au comptable, normes, archives,
// paie, clôture — et les cadres voisins (OP COMPTABLE, Paiement en ligne). Même socle que compta-ventes-outils.js.
const V = require('./compta-ventes-outils.js');
const L = V.L;
exports.L = L; exports.V = V; exports.O = V.O;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-compta-reste/';
for (const k of ['marquer', 'neuf', 'lire', 'diff', 'doigtsReel', 'texte', 'panneau', 'compta', 'saisir', 'toasts', 'cadreOuvert']) exports[k] = V[k];
// les onglets de ma partie, dans l'ordre du menu de la Comptabilité (CX_NAV d'OP GESTION)
exports.ONGLETS = [
  ['fachats', 'Achats › Factures & dépenses', 'achats'], ['ndf', 'Achats › Notes de frais', 'achats'], ['fournisseurs', 'Achats › Comptes fournisseurs', 'achats'],
  ['paiemois', 'Paie › Le mois', 'paie'], ['fiches', 'Paie › Fiches de paie', 'paie'], ['salaries', 'Paie › Salariés', 'paie'], ['charges', 'Paie › Charges et déclarations', 'paie'],
  ['banque', 'Trésorerie › Banque', 'tresorerie'], ['enligne', 'Trésorerie › Paiement en ligne', 'tresorerie'],
  ['tva', 'Fiscal › TVA', 'fiscal'], ['ecritures', 'Fiscal › Journal', 'fiscal'], ['balance', 'Fiscal › Balance', 'fiscal'], ['grandlivre', 'Fiscal › Grand livre', 'fiscal'], ['resultat', 'Fiscal › Résultat', 'fiscal'], ['envoi', 'Fiscal › Envoi au comptable', 'fiscal'],
  ['normes', 'Conformité › Aux normes', 'conformite'], ['archives', 'Conformité › Archives & exports', 'conformite'],
  ['cloture', 'Pilotage › Clôture du mois', 'pilotage']];
