/* ══ 1183 · CLÔTURE GUIDÉE : LE NIVEAU D'INFESTATION CHOISI REMPLACE CELUI DU CONSTAT ═════════════════════════════
   Rapport du testeur interventions#9 (16 octobre 2026, reproduit deux fois) : « Rédiger » avec Niveau
   d'infestation = Fort, enregistré sans « Effectuée » ; puis « Clôture guidée », jauge sur Faible, « Clôturer ».
   La fiche disait « Faible » (la jauge) et le bloc Rapport « Fort » (le constat) : assistFinish écrivait
   `infestation` mais gardait `constat.infestation` déjà saisi (`it.constat&&it.constat.infestation||…`). Le rapport
   client et le registre sanitaire reprennent le constat — le client lisait donc l'autre valeur.

   Règle : ce que la personne CHOISIT dans l'assistant remplace le constat ; sinon on garde — et on ne réécrit pas
   un libellé plus fin que la jauge (« Aucune présence » et « Critique » se rangent sous Faible et Fort) quand la
   personne n'y a pas touché.
   Ce banc EXÉCUTE la vraie assistCloture + assistFinish (tests/g05-monde.js).                                  */
const { monde, interv, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1183');

const LIB = { faible: 'Faible', moyen: 'Moyen', fort: 'Fort' };
/* ouvre l'assistant sur une intervention portant `constat`, choisit `jauge` (undefined = on n'y touche pas), clôture */
function cloture(constat, jauge, extra) {
  const W = monde(); const it = interv(Object.assign({ moyenPaiement: '', montant: 0, constat: constat }, extra || {})); W.db.interventions.push(it);
  W.assistCloture('i1');
  const depart = W.asW.infest;
  if (jauge !== undefined) W.asW.infest = jauge;
  W.assistFinish('i1');
  const r = W.db.interventions[0];
  return { jauge: r.infestation, constat: (r.constat || {}).infestation, depart, W };
}

console.log('\n── 1183 · 0. la population ──');
vrai('assistFinish et assistCloture sont trouvées, une seule fois', fonction('assistFinish').length > 500 && fonction('assistCloture').length > 300 && SRC.split('function assistFinish(').length - 1 === 1);
v('le départ de l’assistant : la jauge reprend le constat (Fort → fort)', cloture({ infestation: 'Fort' }).depart, 'fort');

console.log('\n── 1183 · 1. ⛔ le cas du rapport : constat Fort, jauge choisie Faible → UNE valeur, Faible ──');
{ const r = cloture({ infestation: 'Fort', conformite: 'Conforme' }, 'faible');
  v('jauge ET constat disent Faible (fiche, rapport client, registre sanitaire lisent la même chose)', [r.jauge, r.constat], ['faible', 'Faible']);
  v('… le reste du constat est intact (conformité)', r.W.db.interventions[0].constat.conformite, 'Conforme'); }
for (const [de, vers] of [['Faible', 'moyen'], ['Moyen', 'fort'], ['Fort', 'moyen'], ['Moyen', 'faible']]) {
  const r = cloture({ infestation: de }, vers);
  v('constat « ' + de + ' », jauge choisie « ' + vers + ' » : le constat devient « ' + LIB[vers] + ' »', [r.jauge, r.constat], [vers, LIB[vers]]);
}

console.log('\n── 1183 · 2. on ne réécrit pas ce que la personne n’a pas touché ──');
{ const r = cloture({ infestation: 'Aucune présence' });
  v('« Aucune présence » (rangé sous Faible par la jauge) : la jauge est laissée telle quelle → le constat garde son libellé', [r.jauge, r.constat], ['faible', 'Aucune présence']); }
{ const r = cloture({ infestation: 'Critique' });
  v('« Critique » (rangé sous Fort) : idem', [r.jauge, r.constat], ['fort', 'Critique']); }
{ const r = cloture({ infestation: 'Fort' });
  v('constat « Fort », jauge non touchée : « Fort » reste', [r.jauge, r.constat], ['fort', 'Fort']); }
{ const r = cloture({ infestation: 'Critique' }, 'fort');
  v('… et si la personne CHOISIT « fort » alors que le constat dit « Critique » : on garde le libellé le plus fin (même niveau)', r.constat, 'Critique'); }
{ const r = cloture({ infestation: 'Critique' }, 'faible');
  v('constat « Critique », jauge choisie « faible » : le constat suit la jauge', [r.jauge, r.constat], ['faible', 'Faible']); }

console.log('\n── 1183 · 3. sans constat, ou sans jauge ──');
{ const r = cloture({}, 'moyen');
  v('pas de constat : la jauge choisie le crée', [r.jauge, r.constat], ['moyen', 'Moyen']); }
{ const r = cloture({ infestation: 'Fort' }, '');
  v('jauge vidée par la personne : on garde le constat existant (rien n’est effacé)', r.constat, 'Fort'); }
{ const r = cloture({}, '');
  v('ni l’un ni l’autre : vide, comme avant', [r.jauge, r.constat], ['', '']); }

console.log('\n── 1183 · 4. la fiche, le rapport et le registre lisent la MÊME valeur ──');
{ const r = cloture({ infestation: 'Fort' }, 'faible'); const it = r.W.db.interventions[0];
  v('intInfOf (la jauge de la fiche) = ce que le constat dit (la cartographie du rapport)', [r.W.intInfOf(it), it.constat.infestation.toLowerCase()], ['faible', 'faible']); }

fin();
