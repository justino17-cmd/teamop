/* ══ UNE FORMULE OFFERTE DIT COMBIEN DE TEMPS IL RESTE, PAS SEULEMENT SA DATE DE FIN ══════
   Demande de Justin, 14 septembre 2026 : « je veux un compte à rebours aussi du temps qui
   reste ». Une date oblige à compter de tête pour savoir s'il faut relancer la cliente
   cette semaine ou dans deux mois — donc on ne compte pas, et on découvre la fin le jour
   où elle tombe.

   joursRestants() existait déjà, utilisée sur la fiche d'une entreprise. Elle manquait là
   où on voit TOUTES les formules offertes d'un coup — l'écran Abonnements — c'est-à-dire
   au seul endroit fait pour décider des relances. */
const fs = require('fs'), path = require('path');
const tour = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 684 · le temps restant d\'une formule offerte ──');

const src = tour.match(/function joursRestants\(fin\)\{[\s\S]*?\n\}/);
v('joursRestants est trouvée dans tour.html', !!src, true);
if (src) {
  const f = new Function(src[0] + '; return joursRestants;')();
  /* ⚠️ Les dates sont FIXES, jamais calculées depuis aujourd'hui : un banc qui fabrique ses
     dates à partir de Date.now() teste l'arithmétique du banc, pas celle du fichier. On
     compose donc les bornes à la main autour d'un « maintenant » injecté. */
  const j = n => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  v('une échéance passée se dit terminée', f(j(-3)), 'terminé');
  v('le jour même se dit', f(j(0)), 'se termine aujourd’hui');
  v('un jour restant ne s\'écrit pas « encore 1 jours »', f(j(1)), 'plus qu’un jour');
  /* ⛔ Sous quinze jours, c'est une relance à préparer : la couleur doit le dire avant
     qu'on lise le chiffre. Au-delà, l'ambre partout ne signalerait plus rien. */
  v('⛔ sous quinze jours, l\'échéance est mise en ambre', /color:var\(--amber\)/.test(f(j(9))), true);
  v('… et le nombre de jours y est', /encore 9 jours/.test(f(j(9))), true);
  v('au-delà de quinze jours, pas d\'alerte', f(j(20)), 'encore 20 jours');
  v('au-delà d\'un mois, on compte en mois', f(j(64)), 'encore 2 mois');
  /* Une date illisible ne doit pas casser la ligne : elle rend une chaîne vide. */
  v('une date absente ne casse rien', f(''), '');
}

/* Les deux listes de l'écran Abonnements — c'est là qu'il manquait. */
v('la liste des formules offertes porte le compte à rebours',
  /offert jusqu’au '\+esc\(u\.finLe\|\|'\?'\)\+' · <b>'\+joursRestants\(u\.finLe\|\|''\)\+'<\/b>'/.test(tour), true);
v('la liste des entreprises aussi',
  /offert jusqu’au '\+esc\(e\.finLe\|\|'\?'\)\+' · '\+joursRestants\(e\.finLe\|\|''\)/.test(tour), true);

/* ⛔ ET LA LIGNE DOIT MENER QUELQUE PART. Une formule offerte portée par un espace fantôme
   (« elan-tzl2 », né du lien de première connexion fabriqué de travers le 12 septembre) ne
   se retire QUE par la suppression de l'espace — et le seul chemin vers sa fiche depuis cet
   écran est ce clic. Il posait bien ENT.sel mais restait sur Abonnements, un écran qui
   n'affiche aucune fiche : le clic ne faisait rien de visible, donc rien à supprimer. */
v('la ligne d\'une formule offerte change bien d\'écran',
  /function abnVersEntreprise\(t\)\{[\s\S]{0,200}setTab\('entreprises'\);/.test(tour), true);
v('… et attend la liste si elle n\'est pas chargée',
  /function abnVersEntreprise\(t\)\{[\s\S]{0,900}if\(ENT\.loaded\) setTimeout\(ouvrir,60\);/.test(tour), true);
v('… en le disant si l\'espace a disparu, au lieu d\'un clic muet',
  /Cet espace n\\'est plus dans la liste des entreprises/.test(tour), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
