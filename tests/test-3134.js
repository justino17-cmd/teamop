/* ⛔ CE QUE CE FICHIER GARDE — LES PAGES D'UN CODE PROMO RÉSERVÉ À DES MÉTIERS (28 octobre 2026). Le serveur est gardé par `test-3133` (le vrai serveur) ; ici
   ce que les PAGES en disent, et il est HORS de la liste du serveur seul : la Tour et la page du portail ne partent pas avec lui (le serveur d'abord, la Tour
   ensuite — « aucun code réservé n'entre dans config.promos tant que la Tour réordonnée n'est pas servie »).

   · la Tour pose le MÉTIER avant d'appliquer le CODE (`tourAccepterDemande`) : le serveur juge sur le métier que l'annuaire porte, l'ancien ordre
     (code, formule, métier) refusait tout code réservé pour un espace neuf ;
   · la liste des codes de la Tour montre « Réservé : … » avec les libellés que le serveur fournit, et la restriction illisible — sans que la Tour
     puisse créer ou régler un code (lecture seule) ;
   · la page du portail DIT le refus d'un code réservé (`code_reserve_metiers`) : ce n'est pas une panne ;
   · le refus de la Tour (`error`) s'affiche, il n'est pas avalé. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const ESPACE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const bloc = (src, debut, fin) => { const i = src.indexOf(debut); const j = i < 0 ? -1 : src.indexOf(fin, i + debut.length); return (i < 0 || j < 0) ? '' : src.slice(i, j); };

console.log('\n── 3134 · les pages d\'un code promo réservé à des métiers ──');
{
  const acc = sansCommentaires(bloc(TOUR, 'async function tourAccepterDemande(', '\n}\n'));
  const iM = acc.indexOf("/api/monitor/espaces/metier'"), iP = acc.indexOf("/api/monitor/espaces/promo'"), iF = acc.indexOf("/api/monitor/espaces/formule'"), iC = acc.indexOf("/api/monitor/espaces/cats'");
  vrai('(population) l\'acceptation d\'une demande est trouvée, avec ses quatre appels', acc.length > 2000 && iM > 0 && iP > 0 && iF > 0 && iC > 0);
  vrai('⛔ l\'ordre : métier → code → formule → rubriques (le métier AVANT le code)', iM < iP && iP < iF && iF < iC);
  vrai('   … le métier se pose en `siVide` (une seconde demande ne change pas le métier d\'une entreprise ouverte)', /espaces\/metier',\{nom:e\.nom,metier:metierDem,siVide:true\}/.test(acc));
  vrai('   … et le refus du code (`error` du serveur) s\'affiche dans le panneau (`promoErr`), il n\'est pas avalé', /else promoErr=\(rp&&rp\.d&&rp\.d\.error\)\|\|'refusé'/.test(acc) && /non appliqué : '\+esc\(promoErr\)/.test(acc));

  const pastille = sansCommentaires(bloc(TOUR, 'function blocPromos(){', '\n}\n'));
  vrai('(population) la liste des codes est trouvée', pastille.length > 1500);
  vrai('la liste des codes montre « Réservé : … » avec les libellés du serveur', /Réservé : /.test(pastille) && /c\.metiers\.join\(', '\)/.test(pastille));
  vrai('   … et signale la restriction illisible (code fermé), en rouge', /c\.metiersIllisible/.test(pastille) && /p-rouge[\s\S]{0,300}Restriction illisible/.test(pastille));
  vrai('   … avant le « +n » : la restriction ne se cache pas derrière lui', pastille.indexOf('Réservé : ') < pastille.indexOf("if(reste) p.push("));
  vrai('⛔ en lecture seule : la Tour ne crée et ne règle aucun code (aucun POST vers `/api/monitor/promos`)', !/apiPost\('\/api\/monitor\/promos/.test(TOUR));

  const portail = sansCommentaires(ESPACE);
  vrai('la page du portail DIT le refus d\'un code réservé, avant le message générique « impossible de vérifier »', /r\.code===403&&r\.j&&r\.j\.error==='code_reserve_metiers'/.test(portail)
    && portail.indexOf("code_reserve_metiers") < portail.lastIndexOf("Impossible de vérifier le code pour le moment"));
  vrai('   … et ce message n\'est pas une panne (« réservé à certains métiers », « à l\'ouverture de votre espace »)', /réservé à certains métiers/.test(portail) && /ouverture de votre espace/.test(portail));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
