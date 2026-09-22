/* ══════════════════════════════════════════════════════════════════════════════════════
   test-772 — LA PASSE DE CLICS : CE QU'APPUYER SUR CHAQUE BOUTON A TROUVÉ

   22 septembre 2026, étape 2 de « 1 après 2 après 3 » : chaque commande de chaque rubrique
   ET de chaque fenêtre qu'elle ouvre, frappée pour de vrai (scratchpad/audit-clics2.js),
   au téléphone puis au bureau. Au téléphone : 957 clics dans les rubriques, 736 dans
   51 fenêtres, 0 clic qui jette. Les 143 clics « sans effet observable » ont été rejoués
   un par un en regardant PARTOUT (scratchpad/sonde-inertes.js) : segment déjà actif,
   confirmation refusée par la sonde, filtre déjà posé, sélecteur de fichier natif…
   Deux vrais défauts, gardés ici :

   · ÉCHAP FERMAIT LA MAUVAISE COUCHE. Le tableau des quantités d'un bon (#bon-qty) se pose
     par-dessus la fenêtre du bon et n'écoutait pas Échap : l'écouteur général fermait le
     BON en dessous et laissait le tableau à l'écran, sans rien derrière où revenir. Mesuré
     au navigateur après correction : 1ᵉʳ Échap → le tableau se ferme, le bon reste ;
     2ᵉ Échap → le bon se ferme.
   · « Envoyer » sur un champ vide (Messagerie) ne faisait RIEN, sans un signe. Il rend
     désormais la main au champ.

   ⛔ L'écouteur d'Échap est EXTRAIT de la page et EXÉCUTÉ : un geste se mesure à ce qu'il
   fait, pas au texte qui le nomme.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  /* ── 1. Échap sur le tableau des quantités ── */
  const m = SRC.match(/function bonQtyEchap\(e\)\{([^\n]*)\}\n/);
  vrai('population : l’écouteur d’Échap du tableau des quantités est trouvé', !!m);
  vrai('⛔ il est posé en CAPTURE, sur window — avant l’écouteur général qui fermerait le bon',
    /window\.addEventListener\('keydown',bonQtyEchap,true\);/.test(SRC));
  if (m) {
    const gerer = new Function('e', 'document', 'bonQtyClose', m[1]);
    const ev = (key) => ({ key, arrete: 0, empeche: 0, stopPropagation() { this.arrete++; }, preventDefault() { this.empeche++; } });
    const doc = (present) => ({ getElementById: id => (present && id === 'bon-qty') ? {} : null });
    { let ferme = 0; const e = ev('Escape'); gerer(e, doc(true), () => ferme++);
      vrai('⛔ Échap, tableau ouvert : il se ferme — et SEULEMENT lui (la propagation s’arrête)', ferme === 1 && e.arrete === 1 && e.empeche === 1); }
    { let ferme = 0; const e = ev('Escape'); gerer(e, doc(false), () => ferme++);
      vrai('⛔ … tableau fermé : il ne touche à rien (l’écouteur général reprend la main)', ferme === 0 && e.arrete === 0); }
    { let ferme = 0; const e = ev('Enter'); gerer(e, doc(true), () => ferme++);
      vrai('… une autre touche ne ferme rien', ferme === 0 && e.arrete === 0); }
  }
  vrai('« ← Retour au bon » et Échap font la même chose (bonQtyClose)',
    /function bonQtyClose\(\)\{ const ov=\$\('bon-qty'\); if\(ov\) ov\.remove\(\); renderBonLignes\(\); \}/.test(SRC));

  /* ── 2. « Envoyer » sur un champ vide ── */
  vrai('⛔ « Envoyer » sur un champ vide rend la main au champ au lieu de ne rien faire',
    /function envoyerMsg\(\)\{ const inp=\$\('msg-input'\); const v=inp\?inp\.value\.trim\(\):''; if\(!v && !msgPhoto\)\{ if\(inp\) inp\.focus\(\); return; \}/.test(SRC));
}

console.log('\n═══ test-772 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
