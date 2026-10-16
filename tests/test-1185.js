/* ══ 1185 · LE MOYEN DE PAIEMENT DE LA FICHE (MODE STYLO) PROPOSE LA LISTE DU FORMULAIRE ET PRÉSÉLECTIONNE LA BASE ═
   Rapport du testeur interventions#12 (16 octobre 2026, reproduit deux fois) : créée avec « C) Espèces », la
   fiche affichait « Aucun » dans « Informations complémentaires » en mode stylo — alors que la base et la lecture
   seule disaient « C) Espèces ». Le select proposait une liste à lui [Aucun, Espèces, Chèque, Carte bancaire,
   Virement] (les huit moyens du formulaire sont dans MOYENS_PAIEMENT, « A) Carte bancaire »…) : aucune option ne
   correspondait à la valeur enregistrée, donc « Aucun » s'affichait — et le premier toucher aurait effacé le moyen.

   La liste est UNE constante (MOYENS_PAIEMENT) : ce banc exécute la vraie intMoyenPaiementOptions, et lit le code
   de la fiche pour vérifier qu'elle s'en sert (renderIntDetail est trop lourde pour être exécutée).             */
const { monde, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1185');

const W = monde();
const analyse = html => [...html.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map(m => ({ texte: m[2].replace(/&amp;/g, '&'), choisi: /\bselected\b/.test(m[1]) }));
const MOYENS = W.exec('MOYENS_PAIEMENT');
const opts = val => { try { return W.intMoyenPaiementOptions(val); } catch (e) { return ''; } };   // avant le correctif la fonction n'existe pas : le banc doit TOMBER, pas mourir

console.log('\n── 1185 · 0. la population ──');
vrai('la liste du formulaire existe (8 moyens, « A) Carte bancaire » en tête) et une seule constante la porte',
  MOYENS.length === 8 && MOYENS[0] === 'A) Carte bancaire' && MOYENS[2] === 'C) Espèces' && SRC.split('const MOYENS_PAIEMENT =').length - 1 === 1, MOYENS);
vrai('la fonction qui construit les options est trouvée, une seule fois', fonction('intMoyenPaiementOptions').length > 80 && SRC.split('function intMoyenPaiementOptions(').length - 1 === 1);

console.log('\n── 1185 · 1. ⛔ la valeur enregistrée est présélectionnée, parmi LA liste du formulaire ──');
{ const o = analyse(opts('C) Espèces'));
  v('« Aucun » en tête, puis les huit moyens du formulaire, dans l’ordre', o.map(x => x.texte), ['Aucun'].concat(MOYENS));
  v('« C) Espèces » (la valeur de la base) est la seule option sélectionnée', o.filter(x => x.choisi).map(x => x.texte), ['C) Espèces']); }
for (const m of MOYENS) {
  const o = analyse(opts(m));
  v('« ' + m + ' » : présélectionné, et lui seul', o.filter(x => x.choisi).map(x => x.texte), [m]);
}

console.log('\n── 1185 · 2. sans moyen : « Aucun » ; une valeur d’AVANT la liste n’est pas perdue ──');
for (const vide of ['', undefined, null]) {
  const o = analyse(opts(vide));
  v('moyen vide (' + JSON.stringify(vide) + ') : « Aucun » est sélectionné', o.filter(x => x.choisi).map(x => x.texte), ['Aucun']);
}
{ const o = analyse(opts('Espèces'));
  v('⛔ une valeur d’avant (« Espèces », sans lettre) reste sélectionnée et proposée — la toucher sans le vouloir ne l’efface pas', [o.filter(x => x.choisi).map(x => x.texte), o.map(x => x.texte).includes('Espèces')], [['Espèces'], true]);
  v('… et les huit moyens du formulaire sont toujours là', o.filter(x => MOYENS.includes(x.texte)).length, 8); }
{ const o = opts('<b>"x"</b>');
  vrai('une valeur étrange est échappée (jamais de balise dans la fiche)', !/<b>/.test(o) && /&lt;b&gt;/.test(o), o.slice(0, 200)); }

console.log('\n── 1185 · 3. la fiche (renderIntDetail) se sert de cette fonction, et « Aucun » reste « pas de moyen » ──');
{ const rid = fonction('renderIntDetail');
  const ligneSel = rid.split('\n').find(l => /Moyen de paiement :/.test(l) && /intEdit/.test(l)) || rid.split('\n').find(l => /<select onchange="\(db\.interventions\.find/.test(l) && /moyenPaiement/.test(l)) || '';
  vrai('population : le select du mode stylo est trouvé', /<select onchange="\(db\.interventions\.find\(x=>x\.id==='\$\{id\}'\)\|\|\{\}\)\.moyenPaiement=/.test(rid), ligneSel.slice(0, 80));
  vrai('il construit ses options par intMoyenPaiementOptions(i.moyenPaiement)', /\$\{intMoyenPaiementOptions\(i\.moyenPaiement\)\}/.test(rid));
  vrai('⛔ l’ancienne liste à lui (Espèces/Chèque/Carte bancaire/Virement) a disparu du code', !/\['Aucun','Espèces','Chèque','Carte bancaire','Virement'\]/.test(SRC));
  vrai('choisir « Aucun » écrit un moyen VIDE (pas la chaîne « Aucun »)', /moyenPaiement=this\.value==='Aucun'\?'':this\.value;save\(\)/.test(rid)); }

fin();
