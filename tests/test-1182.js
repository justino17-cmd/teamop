/* ══ 1182 · TERMINER UNE INTERVENTION SANS LA CASE « INTERVENTIONS → MODIFIER » ══════════════════════════════════
   Rapport du testeur interventions#2 (16 octobre 2026, reproduit deux fois) : un compte « compta » dont
   l'administrateur a retiré la case cat_int_modifier voyait le menu de statut le refuser (« Changer ce statut
   n'est pas autorisé »)… puis cliquait « Rédiger » → « Intervention effectuée », ou « Clôture guidée » →
   « Clôturer », et l'intervention passait « Terminée », le compte-rendu était réécrit, la facture partait.

   Règle du dépôt (CLAUDE.md, v738) : la case se lit DANS LA FONCTION QUI ÉCRIT, en première instruction — le
   bouton caché ne garde rien, un second chemin suffit. Ce que le terrain garde : un technicien rattaché à
   l'intervention peut toujours la démarrer et la terminer (intStatutPermis, la règle du menu de statut) — et donc
   rédiger SON rapport.

   Ce banc EXÉCUTE les vraies saveRapport, assistCloture, assistFinish, intEffToggle, formRapport.               */
const { monde, interv, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1182');

const compta = { id: 'uC', role: 'compta', prenom: 'Cora', nom: 'Compta' };
const tech = { id: 'uT', role: 'technicien', prenom: 'Karim', nom: 'Benali' };
/* le compte de la capture : « Interventions → Modifier » retiré, étranger à l'intervention */
const sansDroit = () => { const W = monde({ moi: compta, droits: { 'int.modifier': false }, moiTech: '' }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0, compteRendu: 'ORIGINAL' })); return W; };
const rapport = (W, effectuee) => W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: effectuee }, __data: { compteRendu: 'Modif par compta sans droit', montant: '0', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1');
const lit = W => { const i = W.db.interventions[0]; return { statut: i.statut, cr: i.compteRendu, histo: (i.histo || []).length, saves: W.__saves }; };

console.log('\n── 1182 · 0. la population ──');
vrai('les cinq fonctions sont trouvées, chacune une seule fois', ['saveRapport', 'assistCloture', 'assistFinish', 'intEffToggle', 'formRapport'].every(n => fonction(n).length > 80 && SRC.split('function ' + n + '(').length - 1 === 1));
{ const W = sansDroit();
  v('le compte de la capture : cat_int_modifier retiré, rattaché à rien', [W.canCat('int', 'modifier'), W.intStatutPermis(W.db.interventions[0], 'terminee')], [false, false]); }

console.log('\n── 1182 · 1. ⛔ sans la case : rien ne s’écrit, et le refus se DIT ──');
{ const W = sansDroit(); const av = lit(W); rapport(W, true);
  v('« Rédiger » + Effectuée : l’intervention reste planifiée, le compte-rendu intact', lit(W), av);
  vrai('… et le refus est dit', W.__toasts.length === 1 && /pas autoris/.test(W.__toasts[0]), W.__toasts); }
{ const W = sansDroit(); const av = lit(W); rapport(W, false);
  v('« Rédiger » sans Effectuée : rien non plus (réécrire un rapport est une modification)', lit(W), av); }
{ const W = sansDroit(); const av = lit(W); W.assistCloture('i1');
  v('« Clôture guidée » : l’assistant ne s’ouvre pas', [W.asW, lit(W)], [null, av]);
  vrai('… et le refus est dit', W.__toasts.length === 1, W.__toasts);
  /* l’assistant forcé à la main (un second chemin) : assistFinish refuse aussi */
  W.exec('asW={id:"i1",step:5,absent:false,obs:"ECRASE",noteInterne:"",materiel:"",zones:"",infest:"fort",reco:"",sig:"",sigT:""}');
  W.assistFinish('i1');
  v('assistFinish appelée sans passer par l’ouverture : rien n’est écrit', lit(W), av); }
{ const W = sansDroit(); const av = lit(W); W.intEffToggle('i1', true);
  v('la case « Effectué ? » : refusée aussi, et l’écran est redessiné (la case se décoche)', [lit(W), W.__rendus.length], [av, 1]); }
{ const W = sansDroit(); try { W.formRapport('i1'); } catch (e) { /* l'ancien code construit tout le formulaire : le bac à sable n'a pas tout l'écran */ W.__modals = 1; }
  v('le formulaire « Rédiger » ne s’ouvre pas', [W.__modals, W.__toasts.length], [0, 1]); }

console.log('\n── 1182 · 2. contre-épreuves : qui a la case, et le technicien du terrain, passent ──');
{ const W = monde({ moi: { id: 'uA', role: 'admin', prenom: 'A', nom: 'B' } }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0 })); rapport(W, true);
  v('l’administrateur termine par « Rédiger »', W.db.interventions[0].statut, 'terminee'); }
{ const W = monde({ moi: compta, droits: { 'int.modifier': true } }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0 })); W.assistCloture('i1');
  vrai('avec la case, la Clôture guidée s’ouvre', W.asW && W.asW.id === 'i1', W.asW); }
{ const W = monde({ moi: tech, droits: { 'int.modifier': false }, moiTech: 'tK' }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0 })); rapport(W, true);
  v('⛔ le technicien RATTACHÉ, sans la case, termine SON intervention par « Rédiger » (le terrain n’est pas bloqué)', W.db.interventions[0].statut, 'terminee'); }
{ const W = monde({ moi: tech, droits: { 'int.modifier': false }, moiTech: 'tK' }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0 })); W.assistCloture('i1'); W.assistFinish('i1');
  v('… et par la Clôture guidée', W.db.interventions[0].statut, 'terminee'); }
{ const W = monde({ moi: tech, droits: { 'int.modifier': false }, moiTech: 'tZ' }); W.db.interventions.push(interv({ moyenPaiement: '', montant: 0 })); rapport(W, true);
  v('… mais pas l’intervention d’un collègue', W.db.interventions[0].statut, 'planifiee'); }

console.log('\n── 1182 · 3. ⛔ la garde est la PREMIÈRE instruction utile, avant toute écriture ──');
for (const n of ['saveRapport', 'assistCloture', 'assistFinish', 'intEffToggle', 'formRapport']) {
  const c = fonction(n), g = c.indexOf("intStatutPermis("), w = ['save()', '.push(', '.unshift(', 'openModal(', 'srvMail(', '.splice(', 'statut=', 'rapPhotos=', 'asW=', 'compteRendu='].map(x => c.indexOf(x)).filter(x => x >= 0);
  vrai(n + ' : la garde précède la première écriture', g >= 0 && g < Math.min(...w), [g, Math.min(...w)]);
}

console.log('\n── 1182 · 4. les boutons « Rédiger » et « Clôture guidée » se cachent à qui ne peut pas (le code de la fiche) ──');
{ const lignes = SRC.split('\n').filter(l => /(formRapport|assistCloture)\('\$\{id\}'\)/.test(l));
  vrai('population : les boutons de la fiche (4 lignes)', lignes.length >= 4, lignes.length);
  /* un bouton = un segment jusqu'au </button> qui le ferme : CHAQUE segment qui appelle l'une des deux fonctions lit peutClore
     (une ligne qui en porte deux ne doit pas laisser le second sans garde — mutation « Rédiger toujours visible ») */
  const segments = lignes.flatMap(l => l.split('</button>')).filter(sg => /(formRapport|assistCloture)\('\$\{id\}'\)/.test(sg));
  vrai('population : 5 boutons (carte Rapport ×2, Autres ×2, Rédiger / modifier)', segments.length === 5, segments.length);
  v('… chacun lit peutClore (= intStatutPermis(i,\'terminee\'))', segments.filter(sg => !/peutClore/.test(sg)).map(sg => sg.slice(-90)), []);
  vrai('peutClore est défini dans renderIntDetail par la même règle que le menu de statut', /const peutClore=intStatutPermis\(i,'terminee'\)/.test(fonction('renderIntDetail'))); }

fin();
