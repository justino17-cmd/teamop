/* ══ test-3128 · LES PACKS CHAUFFAGE / CLIMATISATION ET PLOMBERIE, ET LE MODÈLE COMMUN DES DOCUMENTS ═══════════════════════════════════════════════════════
   Justin, 28 octobre 2026, la veille d'une réunion avec une entreprise de climatisation et de plomberie : « les 21 packs, mets-les et corrige-les, et pour demain c'est clim
   et plomberie ». Ce banc EXÉCUTE les vraies fonctions d'app.html (le bloc DOCUMENTS DU MÉTIER monté par `nett-monter.js` avec le bloc NETTOYAGE dont il emprunte la fabrique de
   PDF ; le bloc CVC monté par `cvc-monter.js` ; les autres extraites par `bac`) et ne lit jamais une phrase pour un comportement :
   1. ⛔ UNE SEULE PORTE : `metierGereDocs()` n'est vraie que pour le chauffage et la plomberie — la 3D, le nettoyage et les autres métiers ne voient ni formulaire, ni section, ni carte ;
   2. le MODÈLE COMMUN : chaque définition ouvre un formulaire lu sur ses champs, n'écrit rien à l'ouverture, refuse sans droit ou sur un client qu'on ne voit pas ;
   3. ⛔ LES MENTIONS : seule une mention LUE à sa source (`verifie`), sourcée et portant une phrase `pdf` s'imprime ; une mention « à confirmer » ne sort JAMAIS dans un PDF ;
   4. le devis de dépannage et la note avant paiement : totaux CALCULÉS, numéros jamais réutilisés, rétractation imprimée seulement si le devis est signé chez le client ;
   5. le rapport d'étanchéité écrit les relevés de l'intervention PAR LA MÊME fonction ; les suivis (gaz, vignette, amiante) et la certification TVA n'inventent aucune formule ;
   6. LES PDF : structure valide, texte relu, en-tête de la société par `docEntete`, AUCUN « ? », aucun mot d'anti-nuisibles ; l'envoi joint le PDF et ne trace que si le courriel est parti ;
   7. les PACKS : types, prestations, relevés, catégories, documents corrigés ; les libellés d'avant conservés (une coche posée les cite) ; catalogues de départ (39 et 30 articles) posés UNE fois,
      jamais tout seuls ; fournisseurs sans contact inventé ;
   8. les corrections du code CVC : « attestation » de ramonage, quinze jours ouvrés, CO ambiant, pied du PDF des pompes à chaleur, type d'étanchéité retrouvé malgré l'apostrophe ;
   9. « mon entreprise fait aussi… » : la réunion de deux packs, et la 3D qui ne change en rien ;
   10. la démonstration (types du pack, documents, parc d'appareils) et les registres (collection déclarée partout) ;
   11. ⛔ LA 3D D'ELAN ET LE NETTOYAGE NE CHANGENT EN RIEN.
   Au navigateur : scratchpad/packs-sonde. Mutations : scratchpad/mutations-packs-prio.py. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { monter, BLOC_DOCM, APP, cdc, lirePdf, texte } = require('./nett-monter.js');
const cvc = require('./cvc-monter.js');
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const ANTI = /nuisible|dératis|désinsect|rongeur|biocide|certibiocide|\bAMM\b|matière active|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|\bTP ?1[48]\b|rodonticide|insecticide|postes? d.app|box d.app|\b3D\b|haccp/i;
const { N } = lire('app.html');
const METIERS = evalue(litteral(N, 'const METIERS={'));
const DEFS = evalue(litteral(N, 'const DOCM_DEFS=[').replace(/DOCM_TVA/g, 'null').replace(/DOCM_OUI/g, 'null'));
const DEFS_TOUS = (() => { const W = monter({ metier: 'plomberie', db: {} }); return vm.runInContext('DOCM_DEFS', W); })();
/* v779 (suite) : le modèle commun sert désormais les 21 métiers (test-3129) ; CE banc garde le chauffage et la plomberie, donc les définitions qui les servent */
const DEFS_REEL = DEFS_TOUS.filter(d => d.metiers.includes('plomberie') || d.metiers.includes('chauffage'));

const BASE = () => ({
  clients: [{ id: 'c1', nom: 'M. et Mme Durand', adresse: '3 allée des Chênes', cp: '17000', ville: 'La Rochelle', email: 'durand@test.test' },
    { id: 'c2', nom: 'Sans Courriel', adresse: '1 rue X' }, { id: 'c3', nom: 'Autre équipe', adresse: '1 rue Y', email: 'x@y.test' }],
  interventions: [{ id: 'i1', num: 'INT-1', clientId: 'c1', date: '2026-10-28', heure: '09:00', duree: 60, statut: 'terminee', type: 'Test d\'étanchéité', titre: 'Essai du réseau d\'eau' },
    { id: 'i2', num: 'INT-2', clientId: 'c3', date: '2026-10-28', heure: '10:00', duree: 60, statut: 'terminee', type: 'Dépannage fuite', titre: 'Fuite' }],
  contrats: [], cahiers: [], plansPrevention: [], docsMetier: [],
  appareils: [{ id: 'a1', clientId: 'c1', nom: 'Climatiseur split Daikin', type: 'clim_split' }, { id: 'a9', clientId: 'c3', nom: 'Chaudière gaz Frisquet', type: 'chaudiere_gaz' }],
  devis: [{ id: 'd1', num: 'DEV-2026-004', clientId: 'c1', date: '2026-10-20', tva: 10, lignes: [{ designation: 'Mitigeur', qte: 1, pu: 89 }, { designation: 'Main d\'œuvre', qte: 2, pu: 54 }] }] });
const ENT = { nom: 'Aqua Thermique', couleur: '#1E7A4E', logo: '', adresse: '4 rue du Port', cp: '17000', ville: 'La Rochelle', siret: '123 456 789 00012', tel: '05 46 00 00 00', email: 'contact@aqua.test',
  societes: { 'Société B': { nom: 'Société B', siret: '987 654 321 00098', adresse: '9 quai B', cp: '33000', ville: 'Bordeaux', tel: '05 56 00 00 00', couleur: '#2563EB' } } };
const mk = (metier, o) => monter(Object.assign({ metier: metier || 'plomberie', db: BASE(), entete: ENT }, o || {}));
const ouvre = (W) => { W.__els['docm-champs'] = {}; W.__els['docm-tot'] = {}; };
/* des valeurs plausibles pour chaque champ d'une définition (jamais un « ? ») */
function remplit(W, def, plus) {
  const w = W.docmW;
  W.docmChamps(def).forEach(c => { if (c.t === 'lignes' || c.t === 'tableau') return; if (w.v[c.k]) return;
    if (c.t === 'choix') w.v[c.k] = c.options[0][0]; else if (c.t === 'date') w.v[c.k] = '2026-10-28'; else if (c.t === 'nombre') w.v[c.k] = '6'; else if (c.t === 'heure') w.v[c.k] = '09:15';
    else if (c.t === 'appareil') w.v[c.k] = 'a1'; else w.v[c.k] = 'Valeur → test ✓ «é» 😀'; });
  if (def.lignes) w.lignes = [{ id: 'l1', d: 'Mitigeur → ✓ 😀', pu: '89', u: 'pièce', q: '1' }];
  Object.keys(plus || {}).forEach(k => { if (k === 'lignes') w.lignes = plus[k]; else w.v[k] = plus[k]; });
}
const fabrique = async (W, id) => { const d = await W.nettDocFabriquer('doc', id, ''); return d; };
const tout = (pdf) => texte(pdf).join(' | ');

(async () => {
console.log('\n── 3128 · 0. population ──');
vrai('le bloc DOCUMENTS DU MÉTIER est trouvé dans app.html (' + BLOC_DOCM.length + ' signes)', BLOC_DOCM.length > 20000);
egal('sept définitions : devis, note, étanchéité, suivi gaz, vignette, certification TVA, amiante', DEFS_REEL.map(d => d.id), ['devis-depannage', 'note-depannage', 'rapport-etancheite', 'suivi-gaz', 'suivi-vignette', 'tva-reduite', 'suivi-amiante']);
vrai('chaque définition : un identifiant unique, des métiers connus, un titre, un droit, des champs lus dans la même table', DEFS_REEL.every(d => d.id && d.metiers.every(m => METIERS[m]) && d.titre && d.court && d.pdfTitre && ['ventes', 'crm', 'int'].includes(d.droit) && d.champs.length > 5 && d.pied)
  && new Set(DEFS_REEL.map(d => d.id)).size === DEFS_REEL.length);
vrai('chaque champ : une clé simple, un type connu, un libellé ; une clé n\'est pas déclarée deux fois', DEFS_REEL.every(d => d.champs.every(c => /^[a-zA-Z]+$/.test(c.k) && ['texte', 'long', 'date', 'heure', 'nombre', 'choix', 'appareil', 'lignes', 'tableau'].includes(c.t) && c.l) && new Set(d.champs.map(c => c.k)).size === d.champs.length));
vrai('chaque choix porte ses options ; chaque condition (`si`) vise un champ qui existe', DEFS_REEL.every(d => d.champs.every(c => (c.t !== 'choix' || c.options.length >= 2) && (!c.si || d.champs.some(x => x.k === c.si.k)))));
vrai('⛔ une mention : un texte, une source, un `verifie` booléen — et une phrase `pdf` SEULEMENT sur une mention lue à sa source', DEFS_REEL.every(d => (d.mentions || []).every(m => m.texte && m.source && typeof m.verifie === 'boolean' && (m.pdf === undefined || (m.verifie === true && typeof m.pdf === 'string' && m.pdf.length > 20)))));
vrai('les défauts de TVA et de statut sont des options qui existent', DEFS_REEL.every(d => d.champs.every(c => c.def === undefined || c.t !== 'choix' || c.options.some(o => o[0] === c.def))));
vrai('une définition à lignes a un champ « lignes » ET un taux de TVA (les totaux se calculent dessus)', DEFS_REEL.filter(d => d.lignes).every(d => d.champs.some(c => c.t === 'lignes') && d.champs.some(c => c.k === 'tva')));

console.log('\n── 3128 · 1. ⛔ une seule porte : metierGereDocs ──');
{ const ordre = evalue(litteral(N, 'const METIERS_ORDRE=['));
  egal('vrai pour les 21 métiers qui ont des documents (tous sauf la 3D et le nettoyage, dont les documents sont ceux du bloc NETTOYAGE)', ordre.map(m => [m, mk(m).metierGereDocs()]).filter(x => !x[1]).map(x => x[0]).sort(), ['3d', 'nettoyage']);
  for (const m of ['3d', 'nettoyage']) {
    const W = mk(m); W.docmForm('devis-depannage', { cid: 'c1' }); W.docmForm('suivi-gaz', { cid: 'c1' });
    vrai(m + ' : aucun formulaire ne s\'ouvre', W.__modals.length === 0, W.__modals.length);
    egal(m + ' : ni section client, ni carte d\'intervention, ni démonstration', [W.docmSectionClient(BASE().clients[0]), W.docmIntCard(BASE().interventions[0], true), (W.docmDemoPoser(['c1']), W.db.docsMetier.length)], ['', '', 0]); } }
{ const C = mk('chauffage'), P = mk('plomberie');
  egal('chauffage : devis, note, suivi gaz, suivi de la vignette, certification TVA réduite (la pose d\'une chaudière ou d\'une pompe à chaleur relève aussi du taux réduit — constat 2 de la relecture du 28 octobre)', C.docmDefsDuMetier().map(d => d.id), ['devis-depannage', 'note-depannage', 'suivi-gaz', 'suivi-vignette', 'tva-reduite']);
  egal('plomberie : devis, note, étanchéité, suivi gaz, certification TVA, amiante', P.docmDefsDuMetier().map(d => d.id), ['devis-depannage', 'note-depannage', 'rapport-etancheite', 'suivi-gaz', 'tva-reduite', 'suivi-amiante']);
  C.docmForm('rapport-etancheite', { cid: 'c1' }); P.docmForm('suivi-vignette', { cid: 'c1' });
  vrai('⛔ un document d\'un AUTRE métier ne s\'ouvre pas (étanchéité chez le chauffagiste, vignette chez le plombier)', C.__modals.length === 0 && P.__modals.length === 0); }

console.log('\n── 3128 · 2. le modèle commun : un formulaire lu sur la définition ──');
for (const [metier, defs] of [['plomberie', ['devis-depannage', 'note-depannage', 'rapport-etancheite', 'suivi-gaz', 'tva-reduite', 'suivi-amiante']], ['chauffage', ['devis-depannage', 'note-depannage', 'suivi-gaz', 'suivi-vignette', 'tva-reduite']]]) {
  for (const id of defs) {
    const def = DEFS_REEL.find(d => d.id === id), W = mk(metier);
    W.docmForm(id, { cid: 'c1', iid: def.portee === 'intervention' ? 'i1' : '' });
    const h = W.__modals[0] || '';
    vrai(metier + ' / ' + id + ' : le formulaire s\'ouvre, chaque champ visible y est (' + W.docmChamps(def).filter(c => !c.si).length + ')', W.__modals.length === 1 && W.docmChamps(def).filter(c => !c.si).every(c => h.indexOf('id="docm-' + c.k + '"') >= 0 || c.t === 'lignes' && h.indexOf('id="docm-lignes"') >= 0), def.champs.filter(c => !c.si && h.indexOf('id="docm-' + c.k + '"') < 0).map(c => c.k));
    vrai('   rien n\'est écrit à l\'ouverture, l\'aide du document et ses sources sont là, aucun mot d\'anti-nuisibles', W.__saves === 0 && W.db.docsMetier.length === 0 && h.indexOf(def.aide.slice(0, 40).replace(/&/g, '&amp;')) >= 0 && /Repères réglementaires et sources/.test(h) && !ANTI.test(h.replace(/Aqua/g, '')), h.match(ANTI));
    const acte = W.docmActeCreer(def), R = mk(metier, { droits: { [def.droit + '.' + acte]: false } }); R.docmForm(id, { cid: 'c1' });
    vrai('   sans la case « ' + def.droit + ' · ' + acte + ' », le formulaire ne s\'ouvre pas et le dit', R.__modals.length === 0 && R.__toasts.some(t => /n.est pas autorisé/.test(t)));
    const V = mk(metier, { clientsVisibles: ['c2'] }); V.docmForm(id, { cid: 'c1' });
    vrai('   un client qu\'on ne voit pas : refus', V.__modals.length === 0 && V.__toasts.some(t => /ne te concerne pas/.test(t))); } }
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1', iid: 'i2' });
  vrai('une intervention d\'un AUTRE client est ignorée (le document n\'est pas lié)', W.docmW.interventionId === ''); }
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' });
  vrai('départ : date du jour, adresse du client, motif de l\'intervention, TVA normale — rien d\'écrit', W.docmW.v.date === '2026-10-28' && W.docmW.v.lieu === '3 allée des Chênes, 17000 La Rochelle' && W.docmW.v.nature === 'Essai du réseau d\'eau' && W.docmW.v.tva === '20' && W.__saves === 0); }

console.log('\n── 3128 · 3. ⛔ les mentions : seule une mention LUE et sourcée s\'imprime ──');
{ const W = mk('plomberie');
  const nonVerif = DEFS_REEL.flatMap(d => d.mentions.filter(m => !m.verifie).map(m => [d.id, m]));
  vrai('(population) il y a des mentions « à confirmer » à garder hors des PDF (' + nonVerif.length + ')', nonVerif.length >= 8);
  for (const d of DEFS_REEL) {
    const imp = W.docmMentionsPdf(d, {}).map(m => m.pdf), ecran = d.mentions.filter(m => m.verifie && m.pdf && !m.si).map(m => m.pdf);
    vrai(d.id + ' : docmMentionsPdf rend exactement les mentions lues, sourcées, avec phrase et sans condition (' + imp.length + ')', JSON.stringify(imp) === JSON.stringify(ecran) && d.mentions.filter(m => !m.verifie).every(m => !imp.includes(m.pdf))); }
  const faux = { verifie: false, source: 's', pdf: 'Phrase à ne jamais imprimer ici ou ailleurs', texte: 't' }, sans = { verifie: true, source: '', pdf: 'Phrase sans source ici', texte: 't' }, sansPhrase = { verifie: true, source: 's', texte: 't' }, bon = { verifie: true, source: 's', pdf: 'Phrase lue et sourcée', texte: 't' };
  egal('⛔ non lue, sans source ou sans phrase : jamais imprimée ; lue + sourcée + phrase : imprimée', W.docmMentionsPdf({ mentions: [faux, sans, sansPhrase, bon] }, {}).map(m => m.pdf), ['Phrase lue et sourcée']);
  egal('une condition (`si`) qui ne tient pas retire la mention', [W.docmMentionsPdf({ mentions: [Object.assign({ si: { k: 'a', egal: 'x' } }, bon)] }, { a: 'y' }).length, W.docmMentionsPdf({ mentions: [Object.assign({ si: { k: 'a', egal: 'x' } }, bon)] }, { a: 'x' }).length], [0, 1]);
  /* et le PDF réel : aucune phrase d'une mention « à confirmer » n'y figure, sur CHAQUE document, entièrement rempli */
  for (const d of DEFS_REEL.filter(x => x.metiers.includes('plomberie') || x.metiers.includes('chauffage'))) {
    const M = mk(d.metiers.includes('plomberie') ? 'plomberie' : 'chauffage'); M.docmForm(d.id, { cid: 'c1', iid: d.portee === 'intervention' ? 'i1' : '' }); remplit(M, d, { lieuSignature: 'client' });
    const id = M.docmSauver(); const r = await fabrique(M, id); const t = tout(r.pdf).replace(/ \| /g, ' ');
    const fuites = d.mentions.filter(m => !m.verifie).filter(m => { const mots = m.texte.split(/\s+/).slice(0, 6).join(' '); return t.indexOf(mots) >= 0; });
    vrai(d.id + ' : aucune mention « à confirmer » dans le PDF (' + d.mentions.filter(m => !m.verifie).length + ' gardées hors du document)', !r.err && fuites.length === 0, fuites.map(m => m.texte.slice(0, 50)));
    vrai('   … les mentions lues qui portent une phrase y sont toutes (' + W.docmMentionsPdf(d, { lieuSignature: 'client' }).length + ')', W.docmMentionsPdf(d, { lieuSignature: 'client' }).every(m => t.indexOf(m.pdf.split(/\s+/).slice(0, 8).join(' ')) >= 0), W.docmMentionsPdf(d, { lieuSignature: 'client' }).map(m => m.pdf.slice(0, 40)));
    vrai('   … et les mentions lues SANS phrase (usage interne) n\'y sont pas', d.mentions.filter(m => m.verifie && !m.pdf).every(m => t.indexOf(m.texte.replace(/[.]$/, '').split(/\s+/).slice(-5).join(' ')) < 0), d.mentions.filter(m => m.verifie && !m.pdf).map(m => m.texte.slice(-40))); } }

console.log('\n── 3128 · 4. le devis de dépannage — totaux calculés, numéros, rétractation ──');
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' });
  const w = W.docmW; const L0 = [{ id: 'l1', d: 'Mitigeur', pu: '89', u: 'pièce', q: '1' }, { id: 'l2', d: 'Main-d’œuvre', pu: '54', u: 'h', q: '1,5' }, { id: 'l3', d: '   ', pu: '999', u: '', q: '9' }]; w.lignes = L0; w.v.deplacement = '35'; w.v.tva = '10';
  const T = W.docmTotaux(w);
  egal('totaux : 89 + 54 × 1,5 + 35 de déplacement = 205,00 HT ; TVA 10 % = 20,50 ; TTC 225,50 (la ligne vide ne compte pas)', [T.lignes.length, T.ht, T.tva, T.ttc, T.deplacement], [2, 205, 20.5, 225.5, 35]);
  W.docmW.v.tva = '5.5'; egal('TVA 5,5 % : 11,28 (arrondie au centime) et TTC 216,28', [W.docmTotaux(W.docmW).tva, W.docmTotaux(W.docmW).ttc], [11.28, 216.28]); W.docmW.v.tva = '10';
  W.docmW.v.nature = ''; W.docmW.v.tva = '10';
  vrai('sans nature de la réparation : refus, rien d\'écrit, la raison est dite', W.docmSauver() === null && W.db.docsMetier.length === 0 && W.__saves === 0 && W.__toasts.some(t => /Nature exacte/.test(t)));
  W.docmW.v.nature = 'Remplacement d\'un mitigeur'; W.docmW.lignes = [{ id: 'l', d: '', pu: '5', u: '', q: '1' }];
  vrai('sans ligne de décompte : refus', W.docmSauver() === null && W.db.docsMetier.length === 0 && W.__toasts.some(t => /au moins une ligne/.test(t)));
  W.docmW.lignes = L0; W.docmW.v.date = '28/10/2026';
  vrai('une date illisible n\'est pas rangée : le champ obligatoire manque, rien d\'écrit', W.docmSauver() === null && W.db.docsMetier.length === 0);
  W.docmW.v.date = '2026-10-28'; W.docmW.v.tva = 'dix';
  vrai('⛔ un taux de TVA hors liste (« dix ») ne se range pas : le champ obligatoire manque, rien n\'est écrit', W.docmSauver() === null && W.db.docsMetier.length === 0 && W.__toasts.some(t => /Taux de TVA/.test(t)));
  W.docmW.v.tva = '10'; W.docmW.v.devisPayant = 'peut-être'; W.docmW.v.deplacement = '-12';
  const id = W.docmSauver(); const r = W.db.docsMetier[0];
  vrai('enregistré : UN document, numéro DEP-2026-001, client et intervention liés, un save', !!id && W.db.docsMetier.length === 1 && r.num === 'DEP-2026-001' && r.clientId === 'c1' && r.interventionId === 'i1' && W.__saves === 1);
  vrai('⛔ une valeur hors liste (devis « peut-être ») ou négative (déplacement -12) n\'est PAS rangée', !('devisPayant' in r.v) && !('deplacement' in r.v) && r.v.tva === '10', r.v);
  vrai('… la ligne vide est retirée, les prix sont des nombres rangés en chaîne, un devis n\'écrit rien d\'autre dans l\'intervention (pas de relevé)', r.lignes.length === 2 && r.lignes[1].q === '1.5' && !W.db.interventions[0].relevesMetier && !W.db.interventions[0].histo);
  W.docmW.v.tva = '10'; W.docmSauver();
  vrai('enregistrer de nouveau ne crée ni doublon ni nouveau numéro', W.db.docsMetier.length === 1 && W.db.docsMetier[0].num === 'DEP-2026-001' && W.db.docsMetier[0].v.tva === '10');
  W.docmForm('devis-depannage', { cid: 'c1' }); W.docmW.v.nature = 'Autre'; W.docmW.lignes = [{ id: 'z', d: 'Joint', pu: '2', u: '', q: '1' }]; W.docmSauver();
  egal('le second devis reçoit DEP-2026-002 ; la note, son propre compteur', [W.db.docsMetier[1].num, (W.docmForm('note-depannage', { cid: 'c1' }), W.docmW.num = '', W.docmW.v.execLe = '2026-10-28', W.docmW.lignes = [{ id: 'q', d: 'x', pu: '1', u: '', q: '1' }], W.docmSauver(), W.db.docsMetier[2].num)], ['DEP-2026-002', 'NOT-2026-001']);
  /* ⛔ docmSauver revérifie la VISIBILITÉ du client à l'enregistrement (un formulaire resté ouvert, un second chemin) : la liste n'est pas une garde. Mutation P9 : le banc ne la voyait pas. */
  { const G = mk('plomberie', { clientsVisibles: ['c1'] }); G.docmForm('devis-depannage', { cid: 'c1' }); remplit(G, DEFS_REEL[0], {}); const w = G.docmW;
    G.db.clients.push({ id: 'cX', nom: 'Client d\'un autre', adresse: '1 rue Z', ville: 'Paris' }); w.clientId = 'cX'; const avant = G.db.docsMetier.length;
    vrai('⛔ un client qu\'on ne voit pas ne reçoit AUCUN document, même par un formulaire resté ouvert : refus dit, rien d\'écrit, aucun numéro consommé', G.docmSauver() === null && G.db.docsMetier.length === avant && G.__toasts.some(t => /ne te concerne pas/.test(t)));
    w.clientId = 'c1'; vrai('… le même formulaire, rendu à un client visible, s\'enregistre', !!G.docmSauver() && G.db.docsMetier.length === avant + 1); }
  /* ⛔ une quantité vide ou nulle vaut 1 À L'ÉCRAN comme à l'enregistrement : le total vu et le total imprimé sont les mêmes (mutation P43). */
  { const W3 = mk('plomberie'); W3.docmForm('devis-depannage', { cid: 'c1' }); const w = W3.docmW; w.v.tva = '10'; w.v.nature = 'Joint'; w.v.date = '2026-10-28'; w.v.lieu = '1 rue A';
    w.lignes = [{ id: 'q1', d: 'Joint', pu: '12', u: '', q: '' }, { id: 'q2', d: 'Collier', pu: '3', u: '', q: '0' }];
    const E = W3.docmTotaux(w); const id3 = W3.docmSauver(); const r3 = W3.db.docsMetier.find(x => x.id === id3);
    egal('⛔ quantité vide ou nulle : 1 à l\'écran (12 + 3 = 15,00 HT) ET à l\'enregistrement (q = « 1 »), et le total relu sur le document rangé est le même', [E.ht, r3 && r3.lignes.map(l => l.q), r3 && W3.docmTotaux(r3).ht], [15, ['1', '1'], 15]); }
  /* ⛔ Constat 1 de la relecture du 28 octobre 2026 : l'écran et le PDF disent le MÊME total. Une remise (prix négatif) affichait « Total HT -15,00 € » et le PDF imprimait 35,00 : deux épurations
     écrites chacune de son côté. Une seule (`docmLigneNette`), un refus dit à l'enregistrement, un avertissement à l'écran. On compare le total AFFICHÉ au total IMPRIMÉ, sur des lignes qui passent. */
  { const fmt = (n) => n.toFixed(2).replace('.', ',') + ' EUR';
    for (const [nom, L] of [['quantité à trois décimales (0,333 × 10)', [{ id: 'f1', d: 'Joint', pu: '10', u: '', q: '0,333' }]], ['prix à trois décimales (10,005)', [{ id: 'f2', d: 'Joint', pu: '10,005', u: '', q: '3' }]], ['quantité minuscule (0,0004 vaut 1, pas 0)', [{ id: 'f3', d: 'Joint', pu: '2', u: '', q: '0,0004' }, { id: 'f4', d: 'Collier', pu: '4', u: '', q: '1' }]]]) {
      const F = mk('plomberie'); F.docmForm('devis-depannage', { cid: 'c1' }); const w = F.docmW; w.v.tva = '20'; w.v.nature = 'Joint'; w.v.date = '2026-10-28'; w.v.lieu = '1 rue A'; w.lignes = L;
      const vu = F.docmTotaux(w), idF = F.docmSauver(); const rF = idF && await fabrique(F, idF), tF = rF && !rF.err ? texte(rF.pdf) : [];
      const imp = tF[tF.indexOf('Total HT :') + 1], impTtc = tF[tF.indexOf('Total TTC :') + 1];
      vrai('⛔ ' + nom + ' : le total HT et le TTC AFFICHÉS (' + fmt(vu.ht) + ' · ' + fmt(vu.ttc) + ') sont ceux du PDF (' + imp + ' · ' + impTtc + ')', !!idF && imp === fmt(vu.ht) && impTtc === fmt(vu.ttc), [vu.ht, vu.ttc, imp, impTtc]); }
    for (const [nom, pu, q, mot] of [['un prix négatif (remise)', '-50', '1', /prix négatif/], ['un prix trop grand', '20000000', '1', /prix négatif ou trop grand/], ['une quantité négative', '5', '-2', /quantité doit être positive/]]) {
      const F = mk('plomberie'); F.docmForm('devis-depannage', { cid: 'c1' }); const w = F.docmW; w.v.tva = '20'; w.v.nature = 'Joint'; w.v.date = '2026-10-28'; w.v.lieu = '1 rue A';
      w.lignes = [{ id: 'g1', d: 'Main-d’œuvre', pu: '100', u: '', q: '1' }, { id: 'g2', d: 'Ligne douteuse', pu, u: '', q }];
      const vu = F.docmTotaux(w), html = F.docmTotHtml(F.docmDef('devis-depannage')), avant = F.db.docsMetier.length, n0 = F.__saves;
      vrai('⛔ ' + nom + ' : l\'écran ne compte PAS la ligne (HT ' + vu.ht + '), le dit en rouge, et l\'enregistrement est REFUSÉ avec la raison — rien d\'écrit, aucun numéro consommé',
        vu.ht >= 100 && vu.ht < 1e6 && /role="alert"/.test(html) && /Ligne douteuse|ligne a/.test(html) && F.docmSauver() === null && F.db.docsMetier.length === avant && F.__saves === n0 && F.__toasts.some(t => mot.test(t) && /Ligne douteuse/.test(t)), [vu.ht, F.__toasts.slice(-1)]);
      ouvre(F); const ctx = F.docmContexte(''); vrai('… l\'aperçu et l\'envoi (docmContexte) la refusent aussi', !!ctx.err && /Ligne douteuse/.test(ctx.err), ctx.err); }
    { const F = mk('plomberie'); F.docmForm('devis-depannage', { cid: 'c1' }); const w = F.docmW; w.lignes = [{ id: 'h1', d: 'Joint', pu: '12', u: '', q: '' }, { id: 'h2', d: 'Collier', pu: '', u: '', q: '1' }];
      vrai('une quantité vide (1) et un prix vide (0) ne sont pas des refus : aucun avertissement, l\'enregistrement passe', !/role="alert"/.test(F.docmTotHtml(F.docmDef('devis-depannage'))) && (w.v.tva = '10', w.v.nature = 'Joint', w.v.date = '2026-10-28', w.v.lieu = '1 rue A', !!F.docmSauver())); } }
  /* ⛔ Constat 3 : le technicien n'a PAS « interventions · ajouter » mais a « modifier » : le rapport d'étanchéité (droit « int », rattaché à l'intervention) se crée avec « modifier » — c'est lui qui fait l'essai.
     Un devis (droit « ventes ») garde « ajouter ». Le droit est lu à TOUTES les portes : la carte de l'intervention, la section du client, le formulaire, l'enregistrement. */
  { const T = mk('plomberie', { droits: { 'int.ajouter': false } }), it = T.db.interventions[0];
    vrai('⛔ technicien (int · ajouter refusé, modifier permis) : la carte d\'intervention offre le Rapport d\'étanchéité ET le devis (droit ventes)', /Test d’étanchéité/.test(T.docmIntCard(it, true)) && /Devis de dépannage/.test(T.docmIntCard(it, true)), T.docmIntCard(it, true).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400));
    T.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' }); const okOuvre = !!T.docmW && T.docmW.doc === 'rapport-etancheite'; if (okOuvre) remplit(T, T.docmDef('rapport-etancheite'), {}); const idT = okOuvre && T.docmSauver();
    vrai('… le formulaire s\'ouvre et s\'enregistre (un document, les relevés écrits sur l\'intervention)', okOuvre && !!idT && T.db.docsMetier.length === 1, T.__toasts.slice(-1));
    vrai('… la section « Documents du métier » de la fiche client le propose aussi', /＋ Test d’étanchéité/.test(T.docmSectionClient(T.db.clients[0])));
    const S = mk('plomberie', { droits: { 'int.modifier': false } });
    vrai('… sans « interventions · modifier » (même avec « ajouter ») : ni carte ni formulaire pour le rapport — le droit lu est celui du geste', !/Test d’étanchéité/.test(S.docmIntCard(S.db.interventions[0], true)) && (S.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' }), !S.docmW || S.docmW.doc !== 'rapport-etancheite'));
    const V = mk('plomberie', { droits: { 'ventes.ajouter': false } });
    vrai('… un devis garde « ventes · ajouter » : refusé sans elle, absent de la carte', !/Devis de dépannage/.test(V.docmIntCard(V.db.interventions[0], true)) && (V.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' }), !V.docmW || V.docmW.doc !== 'devis-depannage'));
    vrai('docmActeCreer : « modifier » seulement pour un document d\'intervention gardé par « int »', [['rapport-etancheite', 'modifier'], ['devis-depannage', 'ajouter'], ['suivi-gaz', 'ajouter']].every(([id, a]) => T.docmActeCreer(T.docmDef(id)) === a)); }
  const D = mk('plomberie', { droits: { 'ventes.modifier': false } }); D.docmForm('devis-depannage', { cid: 'c1' });
  vrai('sans la case « ventes · modifier/ajouter », docmSauver lit elle-même la case (sa première instruction)', (() => { const E = mk('plomberie', { droits: { 'ventes.ajouter': false } }); E.docmW = cdc(W.docmW); E.docmW.id = ''; return E.docmSauver() === null && E.db.docsMetier.length === 0; })());
  { const sans = BLOC_DOCM.slice(0, BLOC_DOCM.indexOf('function docmDemoPoser(')); vrai('une seule ligne de code pousse dans db.docsMetier hors de la démonstration (docmSauver)', (sans.match(/db\.docsMetier\.push\(/g) || []).length === 1, (sans.match(/db\.docsMetier\.push\(/g) || []).length); }
  vrai('le numéro est donné par nextNum (le plafond ne redescend jamais), pas par un compteur local', /nextNum\('docsMetier',def\.prefixe,'num'\)/.test(BLOC_DOCM)); }
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1' }); remplit(W, DEFS_REEL[0], { lieuSignature: 'client' }); const a = await fabrique(W, W.docmSauver());
  const ta = tout(a.pdf);
  vrai('PDF : structure valide, une page, DEVIS, numéro, client, lieu, décompte, totaux, signature « lu et approuvé »', !a.err && lirePdf(a.pdf).pb.length === 0 && /DEVIS/.test(ta) && /N° DEP-2026-001/.test(ta) && /M\. et Mme Durand/.test(ta) && /Total TTC/.test(ta) && /114,00 EUR/.test(ta) && /lu et approuvé/.test(ta), ta.slice(0, 200));
  vrai('⛔ signé chez le client : la rétractation de 14 jours est imprimée, et la mention de l\'arrêté aussi', /droit de rétractation de 14 jours/.test(ta) && /arrêté du 24 janvier 2017/.test(ta));
  const W2 = mk('plomberie'); W2.docmForm('devis-depannage', { cid: 'c1' }); remplit(W2, DEFS_REEL[0], { lieuSignature: 'etablissement' }); const b = await fabrique(W2, W2.docmSauver());
  vrai('⛔ signé dans nos locaux : la rétractation N\'EST PAS imprimée (la mention dépend du champ), l\'arrêté reste cité', !/rétractation/.test(tout(b.pdf)) && /arrêté du 24 janvier 2017/.test(tout(b.pdf)));
  vrai('aucun « ? » (flèche, pictogramme, émoji saisis passent par _pdfTranslit), aucun mot d\'anti-nuisibles, aucune « ’ » perdue', ta.indexOf('?') < 0 && !ANTI.test(ta) && /Main-d|Mitigeur/.test(ta), [(ta.match(/.{0,20}\?.{0,10}/) || [])[0]]);
  vrai('en-tête : l\'entreprise (docEntete), son SIRET, ses coordonnées', /Aqua Thermique/.test(ta) && /SIRET 123 456 789 00012/.test(ta) && /4 rue du Port/.test(ta));
  vrai('le nom du fichier dit ce que c\'est', /^Devis-de-depannage-M-et-Mme-Durand-2026-10-28\.pdf$/.test(a.nom), a.nom);
  const S = mk('plomberie', { db: Object.assign(BASE(), { interventions: [Object.assign(BASE().interventions[0], { rapportModele: 'Société B' })] }) }); S.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' }); remplit(S, DEFS_REEL[0]); const c = await fabrique(S, S.docmSauver());
  vrai('⛔ l\'en-tête suit la société de L\'INTERVENTION : le SIRET de la société B, jamais celui de l\'entreprise principale', /Société B/.test(tout(c.pdf)) && /987 654 321 00098/.test(tout(c.pdf)) && !/123 456 789 00012/.test(tout(c.pdf)), tout(c.pdf).slice(0, 160));
  const nom = Array.from({ length: 5 }, () => 'Désignation très longue qui doit passer à la ligne sans sortir de la colonne ni du cadre').join(' ');
  const L = mk('plomberie'); L.docmForm('devis-depannage', { cid: 'c1' }); remplit(L, DEFS_REEL[0], { lignes: Array.from({ length: 40 }, (_, k) => ({ id: 'l' + k, d: nom, pu: '12,5', u: 'm', q: '3' })) }); const d = await fabrique(L, L.docmSauver());
  vrai('40 lignes très longues : le PDF reste valide et passe sur plusieurs pages', !d.err && lirePdf(d.pdf).pb.length === 0 && lirePdf(d.pdf).pages >= 3, [d.err, lirePdf(d.pdf).pages]); }
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1' }); remplit(W, DEFS_REEL[0]); W.docmW.lignes = [];
  ouvre(W); const r = await W.nettDocFabriquer('doc', '', 'c1');
  vrai('aperçu d\'un brouillon sans ligne : une erreur claire, jamais une exception ni un PDF vide', !!r.err && /au moins une ligne/.test(r.err)); }
{ const W = mk('plomberie'); const id = (W.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' }), remplit(W, DEFS_REEL[0]), W.docmSauver());
  const E = mk('plomberie', { db: W.db }); await E.docmEnvoyer(id); const o = E.db.docsMetier[0], m = E.__mails[0] || {};
  vrai('envoyer : un courriel au client, le PDF joint, le sujet dit « Devis DEP-… », la trace s\'écrit après le départ', E.__mails.length === 1 && m.to === 'durand@test.test' && /^Devis DEP-2026-001/.test(m.sub) && m.opts.atts[0].filename === 'Devis-de-depannage-M-et-Mme-Durand-2026-10-28.pdf' && /lu et approuvé/.test(m.body) && o.envoyeA === 'durand@test.test' && !!o.envoyeLe, m.sub);
  vrai('… et l\'historique de l\'intervention liée le dit (PDF joint)', (E.db.interventions[0].histo || []).some(h => /Devis de dépannage DEP-2026-001 envoyé par e-mail à durand@test.test \(PDF joint\)/.test(h)), E.db.interventions[0].histo);
  const F = mk('plomberie', { db: W.db }); F.__mailOk = false; F.db.docsMetier[0].envoyeLe = 0; delete F.db.docsMetier[0].envoyeA; await F.docmEnvoyer(id);
  vrai('⛔ le courriel ne part pas : AUCUNE trace d\'envoi n\'est écrite', F.__mails.length === 1 && !F.db.docsMetier[0].envoyeLe && !F.db.docsMetier[0].envoyeA);
  const G = mk('plomberie', { db: W.db }); G.__n = 1000; G.docmForm('devis-depannage', { cid: 'c2' }); remplit(G, DEFS_REEL[0]); const g = G.docmSauver(); await G.docmEnvoyer(g);
  vrai('client sans e-mail : le dit, rien ne part', G.__mails.length === 0 && G.__toasts.some(t => /e-mail du client/.test(t)));
  const H = mk('plomberie', { db: W.db, droits: { 'ventes.modifier': false } }); await H.docmEnvoyer(id);
  vrai('sans le droit, aucun envoi', H.__mails.length === 0);
  const J = mk('plomberie', { db: W.db }); const pa = J.docmEnvoyer(id), pb = J.docmEnvoyer(id); await pa; await pb;
  vrai('un double toucher ne part qu\'une fois', J.__mails.length === 1, J.__mails.length);
  const K = mk('plomberie', { db: W.db }); K.docmForm('devis-depannage', { id }); ouvre(K); await K.docmEnvoyer();
  vrai('depuis le formulaire ouvert : la saisie est enregistrée AVANT l\'envoi, et ce qui part est ce qu\'on voit', K.__mails.length === 1 && K.__saves >= 1);
  const st = (r) => W.docmStatut(r).l;
  egal('le statut se lit sur le document : brouillon, envoyé, signé', [st({ doc: 'devis-depannage', v: {} }), st({ doc: 'devis-depannage', v: {}, envoyeLe: 5 }), st({ doc: 'devis-depannage', v: { signeLe: '2026-10-28' }, envoyeLe: 5 })], ['Brouillon', 'Envoyé', 'Signé le 28/10/2026']); }

{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1' }); remplit(W, DEFS_REEL[0]); const id = W.docmSauver(); ouvre(W);
  W.docmW.v.nature = 'SAISIE ABANDONNÉE dans une fenêtre fermée';
  W.__els.overlay = { classList: { contains: () => false } };
  const ferme = await W.nettDocFabriquer('doc', id, ''); W.__els.overlay = { classList: { contains: () => true } };
  const ouvert = await W.nettDocFabriquer('doc', id, '');
  vrai('⛔ une fenêtre FERMÉE (son balisage reste dans la page) ne fournit pas sa saisie à l\'aperçu d\'un document de la liste ; ouverte, c\'est elle qu\'on voit', !/SAISIE ABANDONNÉE/.test(tout(ferme.pdf)) && /SAISIE ABANDONNÉE/.test(tout(ouvert.pdf)) && W.db.docsMetier[0].v.nature !== 'SAISIE ABANDONNÉE dans une fenêtre fermée'); }

console.log('\n── 3128 · 5. la note de dépannage — reprise du devis, opposition du client ──');
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1' }); remplit(W, DEFS_REEL[0], { lignes: [{ id: 'l1', d: 'Groupe de sécurité', pu: '64', u: 'pièce', q: '1' }], deplacement: '10', tva: '10', piecesConservees: 'oui' }); W.docmSauver();
  W.docmForm('note-depannage', { cid: 'c1' }); const s0 = W.docmRepriseHtml();
  vrai('« Reprendre les lignes d\'un devis » propose le devis de dépannage ET le devis OP GESTION du client', /doc:/.test(s0) && /devis:d1/.test(s0) && /DEV-2026-004/.test(s0), s0.slice(0, 200));
  W.__els['docm-reprise'] = { value: 'doc:' + W.db.docsMetier[0].id }; W.docmReprendre();
  vrai('la reprise copie les lignes, le taux, le déplacement, les pièces et le n° du devis — sans rien enregistrer', W.docmW.lignes.length === 1 && W.docmW.lignes[0].d === 'Groupe de sécurité' && W.docmW.v.tva === '10' && W.docmW.v.deplacement === '10' && W.docmW.v.devisRef === 'DEP-2026-001' && W.db.docsMetier.length === 1);
  W.__els['docm-reprise'] = { value: 'devis:d1' }; W.docmReprendre();
  egal('un devis OP GESTION (qte, pu, tva) se reprend aussi : 2 lignes, 10 %, 197 HT de lignes + 10 de déplacement déjà saisi', [W.docmW.lignes.map(l => l.d), W.docmW.v.tva, W.docmTotaux(W.docmW).ht], [['Mitigeur', 'Main d\'œuvre'], '10', 207]);
  W.__els['docm-reprise'] = { value: 'devis:d-autre-client' }; const av = W.docmW.lignes.length; W.docmReprendre();
  vrai('un devis d\'un autre client ne se reprend pas', W.docmW.lignes.length === av);
  W.docmW.v.execLe = '2026-10-28'; W.docmW.v.sansNom = 'oui'; const id = W.docmSauver(); const r = await fabrique(W, id); const t = tout(r.pdf);
  vrai('⛔ à la demande du client, son nom et son adresse ne figurent pas sur la note', !r.err && !/M\. et Mme Durand/.test(t) && !/3 allée des Chênes/.test(t.replace(/Lieu d’exécution[^|]*\| [^|]*/, '')) && /non porté/.test(t), t.slice(0, 220));
  vrai('la note imprime sa mention lue (deux exemplaires, avant paiement) et pas celle de « sous 25 € » (non confirmée)', /deux exemplaires, avant tout paiement/.test(t) && !/sous 25/i.test(t) && !/si le client la demande/.test(t));
  W.docmForm('note-depannage', { cid: 'c1' }); W.docmW.lignes = [{ id: 'a', d: 'Joint', pu: '5', u: '', q: '1' }]; W.docmW.v.tva = '10';
  vrai('l\'écran dit « à partir de 25 € TTC » à 25 € et plus, et ne l\'affirme pas en dessous', /À partir de 25 € TTC : la note est à remettre/.test((W.docmW.lignes[0].pu = '30', W.docmTotHtml(W.docmDef('note-depannage')))) && /à confirmer/.test((W.docmW.lignes[0].pu = '5', W.docmTotHtml(W.docmDef('note-depannage'))))); }

console.log('\n── 3128 · 6. le rapport d\'étanchéité — les relevés de l\'intervention s\'écrivent par la MÊME fonction ──');
{ const W = mk('plomberie'); W.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' });
  Object.assign(W.docmW.v, { installation: 'eau-froide', resultat: 'etanche', pressionDebut: '6', pressionFin: '5,8', duree: '30', fluide: 'Eau', manometre: 'Manomètre 0-10 bar n° 4521', etalonnage: '12/03/2026', vanneArret: 'Sous l\'évier', compteurAvant: '184,2', compteurApres: '184,5', terre: 'oui' });
  const id = W.docmSauver(); const i = W.db.interventions[0];
  vrai('enregistré : ETA-2026-001, les relevés pressionDebut… dureeEssai… terreReseau sont écrits sur l\'intervention', !!id && W.db.docsMetier[0].num === 'ETA-2026-001' && i.relevesMetier.pressionDebut === '6' && i.relevesMetier.pressionFin === '5.8' && i.relevesMetier.dureeEssai === '30' && i.relevesMetier.fluideEssai === 'Eau' && i.relevesMetier.manometre === 'Manomètre 0-10 bar n° 4521' && i.relevesMetier.vanneArret === 'Sous l\'évier' && i.relevesMetier.compteurAvant === '184.2' && i.relevesMetier.terreReseau === 'Oui', i.relevesMetier);
  W.docmW.v.pressionFin = '4'; W.docmSauver();
  vrai('⛔ modifier le document réécrit le relevé (jamais deux exemplaires qui divergent)', i.relevesMetier.pressionFin === '4' && W.db.docsMetier.length === 1);
  W.docmW.v.manometre = ''; W.docmSauver();
  vrai('vider un champ du document retire le relevé correspondant', !('manometre' in i.relevesMetier) && i.relevesMetier.pressionFin === '4');
  const p = tout((await fabrique(W, id)).pdf);
  vrai('PDF : titre, fluide, pressions, écarts CALCULÉS (-2 bar ; 0,3 m³), résultat, mise à la terre, aucun seuil ni « DTU » imprimé comme exigence', /RAPPORT D’ÉTANCHÉITÉ/.test(p) && /Variation de pression : \| -2 bar/.test(p) && /Écart d’index du compteur : \| 0,3 m³/.test(p) && /Étanche/.test(p) && !/conforme au DTU/i.test(p) && !/NF DTU/.test(p) && /n’atteste la conformité à aucune norme/.test(p), p.slice(0, 260));
  W.docmForm('rapport-etancheite', { id });
  vrai('rouvrir le document : les valeurs sont celles du document', W.docmW.v.pressionFin === '4' && W.docmW.v.fluide === 'Eau');
  const V = mk('plomberie'); V.db.interventions[0].relevesMetier = { pressionDebut: '7', fluideEssai: 'Air', terreReseau: 'Non' }; V.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' });
  vrai('un document NEUF part des relevés déjà saisis sur l\'intervention (la saisie de terrain n\'est pas perdue)', V.docmW.v.pressionDebut === '7' && V.docmW.v.fluide === 'Air' && V.docmW.v.terre === 'non', V.docmW.v);
  const X = mk('plomberie'); X.docmForm('rapport-etancheite', { cid: 'c1' }); Object.assign(X.docmW.v, { installation: 'gaz', resultat: 'fuite', fuiteLoc: 'Raccord du compteur', pressionDebut: '3' }); const xid = X.docmSauver();
  vrai('sans intervention liée : le document s\'enregistre, aucun relevé n\'est écrit nulle part', !!xid && X.db.interventions.every(i => !i.relevesMetier));
  const Y = mk('plomberie'); Y.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' }); Y.docmW.v.resultat = 'etanche'; Y.docmW.v.fuiteLoc = 'Ne doit pas rester'; Y.docmW.v.installation = 'eau-froide'; Y.docmSauver();
  vrai('« localisation de la fuite » ne se range que si le résultat est « fuite » (champ conditionnel)', !('fuiteLoc' in Y.db.docsMetier[0].v)); }
{ const W = mk('plomberie'); const h = W.docmIntCard(BASE().interventions[0], true), h2 = W.docmIntCard(BASE().interventions[1], true);
  vrai('la carte de l\'intervention d\'étanchéité met le rapport d\'étanchéité en avant (bouton plein) ; une autre intervention le propose en discret', /class="btn sm"[^>]*>＋ Test d’étanchéité/.test(h) && /class="btn ghost sm"[^>]*>＋ Test d’étanchéité/.test(h2) && /＋ Devis de dépannage/.test(h) && !/＋ Suivi du certificat gaz/.test(h), h.slice(-400)); }

console.log('\n── 3128 · 7. les suivis (gaz, vignette, amiante) et la certification TVA : aucune formule inventée ──');
{ const W = mk('plomberie'); W.docmForm('suivi-gaz', { cid: 'c1' }); Object.assign(W.docmW.v, { statut: 'envoye', modele: '2', motif: 'neuve', installateur: 'Nous', visaNum: '' }); const id = W.docmSauver();
  const r = W.db.docsMetier[0];
  vrai('suivi gaz : enregistré sans numéro (un suivi n\'est pas un document numéroté), statut « Envoyé à l\'organisme »', !!id && r.num === '' && W.docmStatut(r).l === 'Envoyé à l’organisme', W.docmStatut(r));
  const t = tout((await fabrique(W, id)).pdf);
  vrai('⛔ le suivi dit que le certificat est rempli par l\'installateur et visé par un organisme habilité — et qu\'il ne le remplace pas — sans Cerfa ni CCG1/2/3', /rempli par l’installateur puis visé par un organisme habilité/.test(t) && /ne le remplace pas/.test(t) && !/16026/.test(t) && !/CCG/.test(t), t.slice(0, 200));
  const statuts = DEFS_REEL.find(d => d.id === 'suivi-gaz').champs.find(c => c.k === 'statut').options.map(o => o[0]);
  egal('le visa se suit en cinq états', statuts, ['a-etablir', 'etabli', 'envoye', 'vise', 'transmis']);
  vrai('… et le menu d\'avant (« établi par un organisme agréé ») n\'existe plus nulle part', !/organisme agréé/.test(BLOC_DOCM)); }
{ const W = mk('chauffage'); W.docmForm('suivi-vignette', { cid: 'c1' }); W.docmW.v.appareilId = 'a9'; W.docmW.v.dernierControle = '2026-10-28'; W.docmW.v.couleur = 'bleue';
  vrai('⛔ vignette : un appareil d\'un AUTRE client n\'est pas rangé — et sans appareil du client, le suivi ne s\'enregistre pas', W.docmSauver() === null && W.db.docsMetier.length === 0 && W.__toasts.some(t => /Appareil/.test(t)));
  W.docmW.v.appareilId = 'a1'; W.docmSauver(); vrai('… celui du parc du client, oui, et le libellé de l\'appareil est imprimé', W.db.docsMetier[0].v.appareilId === 'a1' && /Climatiseur split Daikin/.test(JSON.stringify(W.docmSpec(W.docmDef('suivi-vignette'), W.db.docsMetier[0], BASE().clients[0]).blocs)));
  const h = W.docmChampHtml(W.docmDef('suivi-vignette').champs[0]);
  vrai('le choix d\'appareil ne propose que le parc du client (pas la chaudière de l\'autre)', /Climatiseur split Daikin/.test(h) && !/Frisquet/.test(h), h);
  const s = W.docmStatut({ doc: 'suivi-vignette', v: { couleur: 'rouge' } });
  vrai('vignette rouge : statut orange (réparation différée) ; bleue : vert', s.cls === 'st-org' && W.docmStatut({ doc: 'suivi-vignette', v: { couleur: 'bleue' } }).cls === 'st-green'); }
{ const W = mk('plomberie'); W.docmForm('tva-reduite', { cid: 'c1' }); Object.assign(W.docmW.v, { taux: '10', nature: 'Remplacement de robinetterie', habitation: 'oui' }); const id = W.docmSauver(); const r = W.db.docsMetier[0];
  vrai('certification TVA : numérotée TVR-2026-001, taux rangé', !!id && r.num === 'TVR-2026-001' && r.v.taux === '10');
  const t = tout((await fabrique(W, id)).pdf);
  vrai('⛔ sans texte de mention saisi, le PDF n\'en invente AUCUN : pas de « certifie sur l\'honneur », pas de formule de l\'administration', !/sur l’honneur/i.test(t) && !/Je soussigné/i.test(t) && !/atteste que/i.test(t) && /Local à usage d’habitation achevé depuis plus de deux ans : \| Oui/.test(t), t.slice(0, 300));
  vrai('… il imprime la phrase lue (plus d\'attestation Cerfa depuis le 16 février 2025) et la case oui / non', /16 février 2025/.test(t) && /n’est plus demandée/.test(t));
  W.docmW.v.mention = 'Texte du modèle de l’entreprise, collé tel quel.'; W.docmSauver();
  vrai('le texte que l\'entreprise colle est imprimé tel quel, rien d\'autre', /Texte du modèle de l’entreprise, collé tel quel\./.test(tout((await fabrique(W, id)).pdf)));
  W.docmW.v.taux = '20'; W.docmSauver(); vrai('un taux hors liste (20 %) n\'est pas rangé : la certification ne vaut que pour 5,5 ou 10', W.db.docsMetier[0].v.taux === '10'); }
{ const W = mk('plomberie'), C = mk('chauffage');
  egal('le conseil « taux réduit » : 5,5 % et 10 % seulement, et seulement chez un métier qui a la certification (la plomberie, le chauffage / la climatisation, les énergies, la menuiserie, le multiservices)', [W.docmNoteTauxReduit('5.5', false) !== '', W.docmNoteTauxReduit('10', false) !== '', W.docmNoteTauxReduit('20', false), W.docmNoteTauxReduit('', false), mk('3d').docmNoteTauxReduit('10', false), mk('froid').docmNoteTauxReduit('10', false)], [true, true, '', '', '', '']);
  /* ⛔ Constat 2 : une entreprise de CLIMATISATION / CHAUFFAGE SEULE (sans « fait aussi : plomberie ») avait le conseil absent alors que sa facture à 10 % s'imprimait sans rien. */
  vrai('⛔ chauffage seul : le conseil « taux réduit » paraît à 10 % et à 5,5 %, pas à 20 % ni sans taux — et la certification est dans sa liste', C.docmNoteTauxReduit('10', false) !== '' && C.docmNoteTauxReduit('5.5', false) !== '' && C.docmNoteTauxReduit('20', false) === '' && C.docmNoteTauxReduit('', false) === '' && C.docmDefsDuMetier().some(d => d.id === 'tva-reduite'));
  { const E = mk('energies'); vrai('énergies (photovoltaïque, bornes) : le conseil paraît aussi, la certification est proposée', E.docmNoteTauxReduit('10', false) !== '' && E.docmDefsDuMetier().some(d => d.id === 'tva-reduite')); }
  const h = W.docmNoteTauxReduit('10', false);
  vrai('⛔ le conseil ne dit pas ce que la mention doit contenir (texte non relu) : il renvoie à la fiche du client', /Cerfa/.test(h) && /16 février 2025/.test(h) && /Certification TVA réduite/.test(h) && !/doit contenir|formule|atteste sur l.honneur/i.test(h), h);
  W.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' }); remplit(W, DEFS_REEL[0], { tva: '10', nature: 'Remplacement de robinetterie' });
  vrai('dans le devis de dépannage, le conseil paraît avec son bouton quand le taux réduit est choisi, pas à 20 %', /docmCertifTva\(\)/.test(W.docmTotHtml(W.docmDef('devis-depannage'))) && !/docmCertifTva/.test((W.docmW.v.tva = '20', W.docmTotHtml(W.docmDef('devis-depannage')))));
  W.docmW.v.tva = '10'; W.docmCertifTva();
  vrai('⛔ « Préparer la certification » enregistre le devis D\'ABORD (numéro DEP-…), puis ouvre la certification avec le taux, la nature et le numéro du devis', W.db.docsMetier.length === 1 && W.db.docsMetier[0].num === 'DEP-2026-001' && W.docmW.doc === 'tva-reduite' && W.docmW.v.taux === '10' && W.docmW.v.refDoc === 'DEP-2026-001' && W.docmW.v.nature === 'Remplacement de robinetterie' && W.docmW.clientId === 'c1' && W.docmW.interventionId === 'i1', W.docmW);
  const R = mk('plomberie', { droits: { 'ventes.ajouter': false } }); R.docmW = cdc(W.docmW); R.docmW.id = ''; R.docmW.doc = 'devis-depannage'; R.docmW.v.tva = '10'; R.docmCertifTva();
  vrai('sans la case « ventes · ajouter », rien ne s\'écrit et rien ne s\'ouvre', R.db.docsMetier.length === 0 && R.__modals.length === 0);
  const X = mk('plomberie'); X.docmForm('devis-depannage', { cid: 'c1' }); X.docmW.v.tva = '10'; X.docmCertifTva();
  vrai('un devis incomplet (rien saisi) : la certification ne s\'ouvre pas, le devis non plus, la raison est dite', X.db.docsMetier.length === 0 && X.docmW.doc === 'devis-depannage' && X.__toasts.some(t => /À compléter|au moins une ligne/.test(t)));
  vrai('⛔ le formulaire « Nouveau devis » d\'OP GESTION porte le même conseil sous ses totaux (ligTot) quand un taux réduit est saisi', /\+\(typeof docmNoteTauxReduit==='function'\?docmNoteTauxReduit\(tva,false\):''\); \}/.test(N)); }
{ const W = mk('plomberie'); W.docmForm('suivi-amiante', { cid: 'c1' }); Object.assign(W.docmW.v, { reperage: 'requis', resultat: 'inconnu', livraison: '1985' }); const id = W.docmSauver();
  const t = tout((await fabrique(W, id)).pdf);
  vrai('amiante : le suivi imprime la phrase lue (bâtiments livrés avant le 1er janvier 1997, opérateur certifié) et rien sur le plomb', /avant le 1er janvier 1997/.test(t) && /opérateur certifié/.test(t) && !/plomb/i.test(t.replace(/Valeur/g, '')), t.slice(0, 200)); }

console.log('\n── 3128 · 8. la section client et le crochet de la fiche ──');
{ const W = mk('plomberie'); W.docmForm('devis-depannage', { cid: 'c1', iid: 'i1' }); remplit(W, DEFS_REEL[0]); W.docmSauver();
  W.docmForm('suivi-gaz', { cid: 'c1' }); W.docmSauver();
  const S = W.docmSectionClient(BASE().clients[0]);
  vrai('la section « Documents du métier » : les boutons de création (6), la liste (2 documents), le statut, les boutons Ouvrir / PDF', /Documents du métier/.test(S) && (S.match(/＋ /g) || []).length === 6 && /Devis de dépannage DEP-2026-001/.test(S) && /Suivi du certificat gaz/.test(S) && (S.match(/>PDF</g) || []).length === 2 && /Signé le 28\/10\/2026/.test(S) && /À renseigner|À établir/.test(S), S.slice(0, 300));
  const R = mk('plomberie', { db: W.db, droits: { 'ventes.ajouter': false } }); const SR = R.docmSectionClient(BASE().clients[0]);
  vrai('sans la case « ventes · ajouter », les boutons de devis, de note et de certification TVA ne paraissent pas', !/＋ Devis de dépannage/.test(SR) && /＋ Test d’étanchéité/.test(SR) && /＋ Suivi du certificat gaz/.test(SR));
  const E = W.docmSectionClient(BASE().clients[1]); vrai('un client sans document : le dit', /Aucun document pour ce client/.test(E));
  vrai('⛔ la fiche client et le détail d\'intervention appellent les deux crochets', /\$\{typeof docmSectionClient==='function'\?docmSectionClient\(c\):''\}/.test(N) && /\$\{typeof docmIntCard==='function'\?docmIntCard\(i,intEdit\):''\}/.test(N));
  vrai('l\'aperçu et l\'envoi passent par la fabrique du bloc nettoyage (nettDocContexte, kind « doc »)', /if\(kind==='doc'\) return docmContexte\(id\);/.test(N)); }

console.log('\n── 3128 · 9. les catalogues de départ : posés UNE fois, jamais tout seuls ──');
{ const CC = evalue(litteral(N, 'const CATALOGUE_CHAUF=[')), FC = evalue(litteral(N, 'const FOURNISSEURS_CHAUF=[')), CP = evalue(litteral(N, 'const CATALOGUE_PLOMB=[')), FP = evalue(litteral(N, 'const FOURNISSEURS_PLOMB=['));
  METIERS['3d'].catalogue = evalue(litteral(N, 'const CATALOGUE=[')); METIERS['3d'].fournisseurs = evalue(litteral(N, 'const FOURNISSEURS_3D=['));
  vrai('le pack chauffage est rattaché à son catalogue et à ses fournisseurs (assignation de code), le pack plomberie aussi', /METIERS\['chauffage'\]\.catalogue=CATALOGUE_CHAUF; METIERS\['chauffage'\]\.fournisseurs=FOURNISSEURS_CHAUF;/.test(N) && /METIERS\['plomberie'\]\.catalogue=CATALOGUE_PLOMB; METIERS\['plomberie'\]\.fournisseurs=FOURNISSEURS_PLOMB;/.test(N));
  METIERS.chauffage.catalogue = CC; METIERS.chauffage.fournisseurs = FC; METIERS.plomberie.catalogue = CP; METIERS.plomberie.fournisseurs = FP;
  vrai('39 articles et 6 fournisseurs pour le chauffage ; 30 articles et 5 fournisseurs pour la plomberie', CC.length === 39 && FC.length === 6 && CP.length === 30 && FP.length === 5, [CC.length, FC.length, CP.length, FP.length]);
  for (const [m, C, F] of [['chauffage', CC, FC], ['plomberie', CP, FP]]) {
    const cats = METIERS[m].produits;
    egal('⛔ ' + m + ' : chaque article est rangé dans une catégorie EXACTE de la liste du métier (jamais hors liste)', C.filter(c => cats.indexOf(c[1]) < 0), []);
    vrai(m + ' : noms uniques, aucun mot d\'anti-nuisibles, unité dans le nom (« (pièce) »), ni prix ni référence ni fournisseur imposé', new Set(C.map(c => c[0].toLowerCase())).size === C.length && !C.some(c => ANTI.test(c[0] + ' ' + c[1])) && C.every(c => /\([^()]+\)$/.test(c[0]) && c[2].length === 0 && c[3] === ''), C.filter(c => !/\([^()]+\)$/.test(c[0])).map(c => c[0]));
    vrai(m + ' : aucun guillemet droit dans un nom (un ' + '"' + ' casserait un bouton)', !C.some(c => /["]/.test(c[0])));
    vrai(m + ' : fournisseurs — identifiant déduit du nom, site public, AUCUN téléphone, e-mail, adresse ni contact', F.every(f => /^four_[a-z0-9-]+$/.test(f.id) && /^Site : [a-z0-9.\-\/]+ · /.test(f.notes) && !f.telephone && !f.email && !f.contact && !f.adresse && !f.codePostal && !f.ville), F.map(f => f.id));
    vrai(m + ' : les sites morts ou redirigés ne sont pas posés (Brossette → Cedeo ; Frans Bonhomme, domaine parqué)', !F.some(f => /brossette|frans/i.test(f.nom + f.notes))); }
  vrai('les catégories du chauffage sont toutes servies (12), celles de la plomberie aussi (11)', METIERS.chauffage.produits.every(k => CC.some(c => c[1] === k)) && METIERS.plomberie.produits.every(k => CP.some(c => c[1] === k)), METIERS.chauffage.produits.filter(k => !CC.some(c => c[1] === k)));
  const CATFOUR = evalue(litteral(N, 'const CATFOUR=[')); const CLES = new Set(CATFOUR.map(x => x[0].toLowerCase()));
  vrai('aucun nom des deux catalogues n\'est dans les catalogues fournisseurs de la 3D', !CC.concat(CP).some(c => CLES.has(c[0].toLowerCase())));
  const monde = (metier, produits, plus) => { const db = { metier, metierPlus: plus || '', produits: produits || [], fournisseurs: [], users: [] }; let n = 0;
    const init = { METIERS, CATALOGUE: METIERS['3d'].catalogue, db, BETA_ESSAI: false, PACK_METIER_AUTO: false, uid: () => 'u' + (++n), toast: () => {}, save: () => {}, confirm: () => true, console, CATFOUR,
      permGarde: () => true, canCat: () => true, currentUser: { id: 'u1', role: 'admin' }, logEvent: () => {}, views: { produits() {} }, current: 'x', STOCKAGE_ID: 'stockage', Date, JSON,
      norm: s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') };
    const noms = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'slugNom', 'idCatalogue', 'produitCle', 'cataloguePoser', 'catalogueEnPlace', 'cataloguesFournisseurs', 'catalogueDepartPoser', 'catalogueDepartProposable'];
    return { db, b: bac('app.html', noms, init) }; };
  for (const [m, C, F] of [['chauffage', CC, FC], ['plomberie', CP, FP]]) {
    const v = monde(m);
    vrai(m + ' : rien n\'est posé tout seul (base neuve : ni produit ni fournisseur) ; la carte est proposée à l\'administrateur', v.db.produits.length === 0 && v.db.fournisseurs.length === 0 && v.b.fn.catalogueDepartProposable() === true);
    v.b.fn.catalogueDepartPoser();
    vrai('⛔ ' + m + ' : le geste pose ' + C.length + ' produits et ' + F.length + ' fournisseurs, semis (cree 0), catégories du métier, quantité nulle', v.db.produits.length === C.length && v.db.fournisseurs.length === F.length && v.db.produits.every(p => p.cree === 0 && METIERS[m].produits.indexOf(p.categorie) >= 0 && p.qte === 0 && p.id.startsWith('cat_')), [v.db.produits.length, v.db.fournisseurs.length]);
    v.b.fn.catalogueDepartPoser();
    vrai('⛔ ' + m + ' : rejoué, RIEN de plus ; la proposition disparaît ; les 2 809 références de la 3D restent fermées', v.db.produits.length === C.length && v.db.fournisseurs.length === F.length && v.b.fn.catalogueDepartProposable() === false && v.b.fn.cataloguesFournisseurs() === false); }
  { const mix = monde('chauffage', [], 'plomberie'); mix.b.fn.catalogueDepartPoser(); const union = new Set(CC.map(c => c[0]).concat(CP.map(c => c[0])));
    vrai('⛔ clim ET plomberie : les deux catalogues se posent, une fiche au même nom une seule fois (' + union.size + ' articles, Cedeo et Richardson une fois)', mix.db.produits.length === union.size && mix.db.fournisseurs.filter(f => f.nom === 'Cedeo').length === 1 && mix.db.fournisseurs.length === new Set(FC.concat(FP).map(f => f.nom)).size, [mix.db.produits.length, union.size, mix.db.fournisseurs.length]); }
  { const t3 = monde('3d'); const n3 = t3.b.fn.cataloguePoser(t3.db);
    vrai('⛔ 3D : son catalogue se pose comme avant (' + METIERS['3d'].catalogue.length + ' produits, 5 fournisseurs), ALTA 7000 en tête', n3.produits === METIERS['3d'].catalogue.length && n3.fournisseurs === 5 && t3.db.produits[0].nom === 'ALTA 7000'); }
  vrai('PACK_METIER_AUTO reste faux (la décision du 23 septembre : rien ne se pose seul)', /const PACK_METIER_AUTO\s*=\s*false;/.test(N)); }

console.log('\n── 3128 · 10. les PACKS : ce qui est corrigé, ce qui est ajouté, ce qui est CONSERVÉ ──');
{ const C = METIERS.chauffage, P = METIERS.plomberie;
  const ANC_TYPES_C = ['Entretien annuel chaudière', 'Entretien pompe à chaleur', 'Entretien climatisation', 'Dépannage chauffage', 'Dépannage climatisation', 'Désembouage', 'Ramonage', 'Installation', 'Contrat d’entretien', 'Visite technique / devis', 'Mise en service', "Contrôle d'étanchéité des fluides frigorigènes", 'Récupération de fluide / démantèlement', 'Entretien chaudière fioul ou bois'];
  vrai('chauffage : 16 types — les 14 d\'avant, dans leur écriture d\'avant (une coche posée les cite), plus VMC et chauffe-eau thermodynamique', C.types.length === 16 && ANC_TYPES_C.every((t, k) => C.types[k] === t) && C.types[14] === 'Entretien VMC / ventilation' && C.types[15] === 'Entretien chauffe-eau thermodynamique', C.types);
  vrai('chauffage : 30 prestations — les 19 d\'avant conservées telles quelles, 11 de plus (CO ambiant, rendement, dimensionnement, amenée d\'air, condensats, circulateurs…)', C.presta.length === 30 && C.presta[0] === 'Nettoyage du corps de chauffe' && C.presta[17] === "Pose de la vignette de contrôle d'étanchéité" && C.presta[19] === 'Mesure du CO ambiant dans le local de la chaudière' && C.presta[29] === 'Vérification du fonctionnement des circulateurs', C.presta.length);
  vrai('chauffage : les 11 prestations NEUVES sont celles que l\'arrêté du 15 septembre 2009 (chaudières) et l\'annexe 1 de celui du 24 juillet 2020 (pompes à chaleur) font vérifier', ['Mesure du CO ambiant dans le local de la chaudière', 'Évaluation du rendement de la chaudière', 'Vérification du dimensionnement de la chaudière par rapport aux besoins', 'Contrôle de l’amenée d’air et de la ventilation du local', 'Relevé des températures des unités intérieure et extérieure', 'Contrôle de l’évacuation des condensats', 'Mesure des tensions électriques (statique et dynamique)', 'Contrôle du fonctionnement de l’inversion de cycle'].every(x => C.presta.includes(x)));
  vrai('chauffage : relevés — « CO ambiant » EN TÊTE (ppm), le CO des fumées et le CO₂ des fumées nommés pour ce qu\'ils sont', C.releves.length === 22 && C.releves[0].k === 'coAmbiant' && C.releves[0].u === 'ppm' && /ambiant/.test(C.releves[0].l) && C.releves.find(r => r.k === 'co').l === 'Teneur en CO des fumées' && C.releves.find(r => r.k === 'co2').l === 'CO₂ des fumées', C.releves.slice(0, 3));
  vrai('chauffage : 12 catégories — « Tuyauterie, liaisons frigorifiques et isolation » ajoutée avant l\'outillage, les 11 d\'avant intactes', C.produits.length === 12 && C.produits.includes('Tuyauterie, liaisons frigorifiques et isolation') && C.produits[0] === 'Pièces de chaudière (brûleurs, électrodes, thermocouples, vannes gaz)' && C.produits[11] === 'EPI', C.produits.length);
  egal('chauffage : neuf documents, dans l\'ordre voulu', C.documents.map(d => d.split(' (')[0]), ['Devis de dépannage, réparation ou entretien', 'Note de dépannage remise avant paiement', 'Rapport d’intervention chauffage / climatisation', 'Attestation d’entretien de chaudière', 'Attestation d’entretien de pompe à chaleur ou de climatisation', 'Fiche d’intervention fluides frigorigènes', 'Attestation de ramonage', 'Suivi de la vignette de contrôle d’étanchéité', 'Suivi du certificat de conformité gaz']);
  vrai('⛔ chauffage : « Attestation de ramonage » (le texte légal dit attestation), plus de « Certificat de ramonage » ; la chaudière « établie dans les 15 jours suivant la visite et remise au commanditaire » ; jamais « obligatoire » dans un titre',
    C.documents.includes('Attestation de ramonage') && !C.documents.some(d => /Certificat de ramonage/.test(d)) && C.documents.some(d => /établie dans les 15 jours suivant la visite et remise au commanditaire/.test(d)) && !C.documents.some(d => /remise sous 15 jours|obligatoire/i.test(d)) && C.documents.some(d => /établi par l’installateur, visé par un organisme habilité/.test(d)));
  vrai('plomberie : 15 types — les 13 d\'avant, plus « Dépannage urgent (nuit, week-end, jour férié) » et « Pose sanitaire (WC, lavabo, douche) »', P.types.length === 15 && ['Dépannage fuite', 'Recherche de fuite', 'Débouchage / curage', "Test d'étanchéité", 'Installation gaz', 'Remplacement de groupe de sécurité'].every(t => P.types.includes(t)) && P.types.includes('Dépannage urgent (nuit, week-end, jour férié)') && P.types.includes('Pose sanitaire (WC, lavabo, douche)'), P.types);
  vrai('⛔ plomberie : « Taux horaire et frais de déplacement annoncés… » n\'est plus une prestation (c\'est une information préalable portée par le devis) ; la pièce remplacée porte sa case oui / non', !P.presta.some(x => /Taux horaire/.test(x)) && P.presta.includes('Pièces remplacées proposées au client (conservation : oui / non)') && !P.presta.includes('Pièces remplacées proposées au client') && P.presta.length === 20, P.presta);
  vrai('plomberie : relevés d\'essai ajoutés (pression début et fin, durée, fluide, manomètre, étalonnage, vanne d\'arrêt) — LIBRES, aucun seuil ni aucune durée dans le pack', P.releves.length === 14 && ['pressionDebut', 'pressionFin', 'dureeEssai', 'fluideEssai', 'manometre', 'etalonnage', 'vanneArret'].every(k => P.releves.some(r => r.k === k)) && !P.releves.map(r => r.l).join(' ').match(/\b(maximum|minimum|seuil|norme|DTU|exigé)\b/i), P.releves.map(r => r.k));
  vrai('plomberie : sept documents — devis des arrêtés des 24 janvier et 28 février 2017, note « à partir de 25 € TTC », visa par un organisme HABILITÉ (plus « agréé »), TVA réduite, amiante', P.documents.length === 7 && /24 janvier et 28 février 2017/.test(P.documents[0]) && /à partir de 25 € TTC/.test(P.documents[1]) && !P.documents.some(d => /plus de 25|agréé/.test(d)) && P.documents.some(d => /visé par un organisme habilité/.test(d)) && P.documents.some(d => /TVA réduite/.test(d)) && P.documents.some(d => /amiante/.test(d)), P.documents);
  vrai('les deux packs gardent leurs 11 catégories d\'avant et leur masque (rien de la 3D)', P.produits.length === 11 && C.masque.includes('boxes') && P.masque.includes('registre') && !JSON.stringify([C, P]).match(ANTI));
  { const ANC_P = ['Repérage et diagnostic', 'Coupure et remise en eau', 'Remplacement de pièce', 'Soudure / raccord', 'Débouchage mécanique', 'Hydrocurage', 'Purge du réseau', 'Détartrage', 'Remplacement de joint', 'Mise en service et essai', 'Contrôle d’étanchéité', 'Nettoyage du chantier'];
    vrai('les libellés NEUFS portent l\'apostrophe typographique (’) ; ceux d\'avant restent comme ils étaient écrits (une coche posée les cite)', C.presta.slice(19).every(x => !/'/.test(x)) && C.presta.slice(0, 19).some(x => /'/.test(x)) && P.presta.filter(x => !ANC_P.includes(x)).every(x => !/'/.test(x)) && ANC_P.every(x => P.presta.includes(x)) && P.presta.filter(x => !ANC_P.includes(x)).length === 8, P.presta.filter(x => /'/.test(x))); }
  const ref = require('../metiers.json').metiers;
  egal('le pack de l\'application dit la même chose que le référentiel (types, prestations, relevés, catégories, documents)', ['chauffage', 'plomberie'].map(k => [METIERS[k].types, METIERS[k].presta, METIERS[k].releves.map(r => r.k), METIERS[k].produits, METIERS[k].documents]), ['chauffage', 'plomberie'].map(k => [ref[k].types, ref[k].presta, ref[k].releves.map(r => r.k), ref[k].produits, ref[k].documents]));
  vrai('le référentiel ne dit plus « obligation » pour ce qu\'il n\'a pas lu : la périodicité de deux ans des pompes à chaleur est « à confirmer »', ref.chauffage.obligations.some(o => /périodicité de deux ans/.test(o.texte) && o.aConfirmer === true) && ref.plomberie.obligations.every(o => !/organisme agréé/.test(o.texte)) && ref.plomberie.obligations.some(o => /TVA réduite/.test(o.texte) && o.aConfirmer === true)); }

console.log('\n── 3128 · 11. les corrections du code CVC (chauffage) ──');
{ const BASEC = { clients: [{ id: 'c1', nom: 'Maison Durand', email: 'durand@exemple.test', adresse: '3 rue des Lilas' }],
    appareils: [{ id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval' }, { id: 'a2', clientId: 'c1', type: 'pac_eau', marque: 'Atlantic', modele: 'Alféa', puissance: 11, fluide: 'R32', charge: 1.8 },
      { id: 'a3', clientId: 'c1', type: 'vmc', marque: 'Aldes' }, { id: 'a4', clientId: 'c1', type: 'cet', marque: 'Thermor' }, { id: 'a5', clientId: 'c1', type: 'clim_split', marque: 'Daikin', fluide: 'R32', charge: 3 }],
    interventions: [{ id: 'i1', clientId: 'c1', statut: 'terminee', date: '2026-10-22', appareilIds: ['a1', 'a2'], relevesMetier: { co: '180', coAmbiant: '4,5', rdt: '94,2' } }], contrats: [] };
  const W = cvc.monter({ db: cdc(BASEC) });
  const dep = W.cvcAttestationDepart(W.db.interventions[0], 'a1');
  vrai('⛔ le relevé « CO ambiant » préremplit le champ CO AMBIANT de l\'attestation (en point décimal) — et le CO des fumées reste dans le sien', dep.coAmbiant === '4.5' && dep.co === '180' && dep.rdt === '94.2', dep);
  vrai('… le verdict (10 ppm anomalie, 50 ppm danger) se lit sur le CO ambiant seul', W.cvcCoVerdict('4.5').niveau === 'normal' && W.cvcCoVerdict('12').niveau === 'anomalie' && W.cvcCoVerdict('50').niveau === 'danger');
  const W2 = cvc.monter({ db: cdc(BASEC) }); W2.cvcRamonageForm('i1', 'a1'); const f = W2.__modals[0] || '';
  vrai('⛔ l\'écran de l\'attestation de ramonage : « attestation », quinze jours OUVRÉS suivant l\'achèvement de l\'opération, conservée deux ans — plus de « certificat »', /Attestation de ramonage/.test(f) && /15 jours ouvrés suivant l’achèvement de l’opération/.test(f) && /au moins deux ans/.test(f) && !/ertificat/.test(f.replace(/Certibiocide/g, '')), f.slice(0, 300));
  const E = { nom: 'Alpha Chauffage' }, i = W.db.interventions[0], pac = W.db.appareils[1];
  const pied = pdf => lirePdf(pdf).textes.filter(t => t.y < 50).map(t => t.u).join(' ');
  const pp = pied(W.cvcAttestationPdfStr(i, pac, { genre: 'thermo', tInt: '21', points: ['x'] }, E, {}));
  vrai('⛔ le pied du PDF d\'une pompe à chaleur cite l\'arrêté et son champ (4 à 70 kW) — SANS « au moins tous les deux ans », que l\'arrêté ne dit pas', /arrêté du 24 juillet 2020/.test(pp) && /4 à 70 kW/.test(pp) && !/tous les deux ans|deux ans/.test(pp), pp);
  const pc = pied(W.cvcAttestationPdfStr(i, W.db.appareils[0], { coAmbiant: '4' }, E, {}));
  vrai('le pied du PDF d\'une chaudière garde « 2 ans au moins » de conservation (décret 2009-649, lu)', /2 ans au moins/.test(pc), pc);
  const R = pied(W.cvcAttestationPdfStr(i, W.db.appareils[0], { genre: 'ramonage', conduits: 'x', methode: 'Mécanique par le haut', vacuite: 'oui' }, E, {}));
  vrai('le pied de l\'attestation de ramonage : « Attestation établie par », décret n° 2023-641', /Attestation établie par/.test(R) && /2023-641/.test(R) && !/Certificat établi/.test(R), R);
  /* le type d'une proposition d'étanchéité : le pack publié l'écrit avec l'apostrophe DROITE, le code la cherchait courbe — il ne la trouvait JAMAIS */
  const Wt = cvc.monter({ db: cdc(BASEC) });
  vm.runInContext("function intTypes(){ return " + JSON.stringify(METIERS.chauffage.types) + "; }", Wt);
  vrai('(population) le pack publié écrit « Contrôle d\'étanchéité des fluides frigorigènes » avec une apostrophe DROITE', METIERS.chauffage.types.includes("Contrôle d'étanchéité des fluides frigorigènes"));
  vrai('⛔ cvcTypeParNom retrouve le type du pack malgré l\'apostrophe (droite ou courbe) et le rend TEL QUE LE PACK L\'ÉCRIT', Wt.cvcTypeParNom('Contrôle d’étanchéité des fluides frigorigènes') === "Contrôle d'étanchéité des fluides frigorigènes" && Wt.cvcTypeParNom("Contrôle d'étanchéité des fluides frigorigènes") === "Contrôle d'étanchéité des fluides frigorigènes" && Wt.cvcTypeParNom('Type inconnu') === '');
  const tp = k => Wt.cvcTypeInterventionPour([Wt.db.appareils.find(a => a.id === k)]);
  egal('le type proposé suit l\'appareil : chaudière gaz, pompe à chaleur, VMC, chauffe-eau thermodynamique (types ajoutés au pack), climatiseur', [tp('a1'), tp('a2'), tp('a3'), tp('a4'), tp('a5')], ['Entretien annuel chaudière', 'Entretien pompe à chaleur', 'Entretien VMC / ventilation', 'Entretien chauffe-eau thermodynamique', 'Entretien climatisation']);
  { const gros = cdc(BASEC); gros.appareils[4] = { id: 'a5', clientId: 'c1', type: 'clim_split', marque: 'Daikin', fluide: 'R410A', charge: 20, prp: 2088, miseEnService: '2024-01-01' }; gros.interventions = [{ id: 'i0', clientId: 'c1', statut: 'terminee', date: '2024-01-10', appareilIds: ['a5'] }];
    const W5 = cvc.monter({ db: gros, today: '2026-10-28' });
    vm.runInContext("function intTypes(){ return " + JSON.stringify(METIERS.chauffage.types) + "; }", W5);
    const pr = W5.cvcPropositions('2026-10-28').filter(x => x.kind === 'etancheite');
    vrai('⛔ une proposition de contrôle d\'étanchéité porte désormais son TYPE (avant : toujours vide)', pr.length >= 1 && pr.every(x => x.type === "Contrôle d'étanchéité des fluides frigorigènes"), pr.map(x => [x.kind, x.type])); } }

console.log('\n── 3128 · 12. « mon entreprise fait aussi… » : la réunion de deux packs ──');
{ const monde = (metier, plus, extra) => { const db = Object.assign({ metier, metierPlus: plus || '', clients: [], produits: [], fournisseurs: [], users: [{ id: 'u1', role: 'admin' }] }, extra || {}); const saves = []; const toasts = [];
    const init = { METIERS, INT_TYPES: ['Dératisation'], db, BETA_ESSAI: false, console, toast: m => toasts.push(m), save: () => saves.push(1), logEvent: () => {}, renderNav: () => {}, currentUser: { id: 'u1', role: 'admin' }, views: { parametres() {} }, CVC_METIERS: ['chauffage', 'froid', 'energies'], NETT_METIERS: ['nettoyage'], toastAnnuler: (m, code) => toasts.push(m + ' ⟲ ' + code) };
    const b = bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'metierActifs', 'metierPlusSet', 'metierSet', 'intTypes', 'metierGereParc', 'metierGereSites', 'estMetier3D'], init); return { db, b, saves, toasts, init }; };
  const A = monde('chauffage', 'plomberie'), f = A.b.fn, pk = f.metierPack();
  const uniq = l => new Set(l.map(x => String(x).toLowerCase())).size === l.length;
  vrai('le pack réuni : types, prestations, catégories et documents des DEUX métiers, chacun une fois', uniq(pk.types) && uniq(pk.presta) && uniq(pk.produits) && uniq(pk.documents) && pk.types.length === new Set(METIERS.chauffage.types.concat(METIERS.plomberie.types).map(x => x.toLowerCase())).size && pk.types[0] === 'Entretien annuel chaudière' && pk.types.includes('Débouchage / curage') && pk.presta.includes('Mesure du CO ambiant dans le local de la chaudière') && pk.presta.includes('Hydrocurage') && pk.produits.includes('Robinetterie et mitigeurs') && pk.produits.includes('Fluides frigorigènes (par type)'), [pk.types.length, pk.presta.length, pk.produits.length]);
  vrai('… le premier métier d\'abord (nom, icône, sous-titre), les relevés réunis par clé (CO ambiant ET pression d\'essai)', pk.nom === METIERS.chauffage.nom && pk.ic === METIERS.chauffage.ic && pk.releves.some(r => r.k === 'coAmbiant') && pk.releves.some(r => r.k === 'pressionDebut') && new Set(pk.releves.map(r => r.k)).size === pk.releves.length);
  vrai('… le masque est celui qu\'ils partagent (jamais une rubrique de la 3D ouverte)', pk.masque.includes('boxes') && pk.masque.includes('registre') && f.metierBloque === undefined);
  vrai('intTypes lit le pack réuni ; metierActifs rend les deux ; le parc d\'appareils (chauffage) reste ouvert quand le chauffage est le SECOND métier', f.intTypes().includes('Débouchage / curage') && JSON.stringify(f.metierActifs()) === '["chauffage","plomberie"]' && monde('plomberie', 'chauffage').b.fn.metierActifs().includes('chauffage'));
  const P2 = monde('plomberie', 'chauffage'); const m1 = P2.b.fn.metierPack();
  vrai('plomberie + chauffage : le premier métier est la plomberie (nom, types d\'abord), le chauffage s\'y ajoute', m1.nom === METIERS.plomberie.nom && m1.types[0] === METIERS.plomberie.types[0] && m1.types.includes('Désembouage'));
  { const S = monde('chauffage', ''), a = S.b.fn.metierPack(), b = S.b.fn.metierPackDe(S.db);
    vrai('⛔ SANS second métier : metierPack et metierPackDe rendent EXACTEMENT l\'objet d\'avant (même référence)', a === METIERS.chauffage && b === METIERS.chauffage && JSON.stringify(S.b.fn.metierActifs()) === '["chauffage"]'); }
  { const T = monde('3d', 'plomberie');
    vrai('⛔ LA 3D n\'en reçoit JAMAIS : un second métier posé sur une base 3D est sans effet (pack, types, métiers actifs) — ELAN ne change en rien', T.b.fn.metierPack() === METIERS['3d'] && T.b.fn.metierPackDe(T.db) === METIERS['3d'] && JSON.stringify(T.b.fn.metierActifs()) === '["3d"]'); }
  { const T = monde('chauffage', '3d'); vrai('… et la 3D ne peut pas être le SECOND métier non plus', T.b.fn.metierPack() === METIERS.chauffage && JSON.stringify(T.b.fn.metierActifs()) === '["chauffage"]'); }
  { const T = monde('chauffage', 'chauffage'); vrai('un métier n\'est pas son propre complément', T.b.fn.metierPack() === METIERS.chauffage && JSON.stringify(T.b.fn.metierActifs()) === '["chauffage"]'); }
  { const T = monde('chauffage', 'inexistant'); vrai('un identifiant inconnu est ignoré', T.b.fn.metierPack() === METIERS.chauffage && JSON.stringify(T.b.fn.metierActifs()) === '["chauffage"]'); }
  { const T = monde('chauffage', ''); T.b.fn.metierPlusSet('plomberie');
    vrai('metierPlusSet : l\'administrateur règle le second métier — rangé dans la base, journalisé, un save, « Annuler » proposé', T.db.metierPlus === 'plomberie' && T.saves.length === 1 && T.toasts.some(t => /fait aussi : Plomberie/.test(t)) && T.toasts.some(t => /metierPlusSet\(''\)/.test(t)), T.toasts);
    T.b.fn.metierPlusSet('plomberie'); vrai('… le même réglage rejoué n\'écrit rien', T.saves.length === 1);
    T.b.fn.metierPlusSet(''); vrai('… « rien d\'autre » le retire', T.db.metierPlus === '' && T.saves.length === 2);
    T.b.fn.metierPlusSet('3d'); T.b.fn.metierPlusSet('chauffage'); T.b.fn.metierPlusSet('nimporte'); vrai('… la 3D, le métier lui-même et un inconnu sont refusés', T.db.metierPlus === '' && T.saves.length === 2); }
  { const T = monde('3d', ''); T.b.fn.metierPlusSet('plomberie'); vrai('sur une base 3D le réglage est refusé et le dit', T.db.metierPlus === '' && T.saves.length === 0 && T.toasts.some(t => /ne concerne pas la 3D/.test(t))); }
  { const T = monde('chauffage', ''); T.init.currentUser.role = 'technicien'; T.b.fn.metierPlusSet('plomberie'); vrai('un non-administrateur ne peut pas', T.db.metierPlus === '' && T.saves.length === 0 && T.toasts.some(t => /administrateur/.test(t))); }
  { const T = monde('chauffage', 'plomberie'); T.b.fn.metierSet('plomberie'); vrai('⛔ choisir pour métier celui qui était le complément le retire du complément (jamais « plomberie + plomberie »)', T.db.metier === 'plomberie' && T.db.metierPlus === ''); }
  { const T = monde('chauffage', 'plomberie'); T.b.fn.metierSet('3d'); vrai('… et revenir à la 3D efface le complément (la 3D n\'en a pas)', T.db.metier === '3d' && T.db.metierPlus === ''); }
  vrai('la base synchronise le réglage comme le métier (OP_CLASSES : réglage de l\'entreprise)', /metier: 'reglage', metierPlus: 'reglage'/.test(N));
  vrai('le complément se règle depuis « Mon métier » (administrateur, hors 3D) et le serveur ne le connaît pas (il reste un réglage de l\'entreprise)', /id="met-plus" onchange="metierPlusSet\(this\.value\)"/.test(N) && /cur!=='3d'&&currentUser&&currentUser\.role==='admin'/.test(N));
  { const W = mk('chauffage'); W.db.metierPlus = 'plomberie';
    vm.runInContext("function metierActifs(){ return ['chauffage','plomberie']; }", W);
    egal('les documents du métier : ceux des deux (sept, sans doublon)', W.docmDefsDuMetier().map(d => d.id), ['devis-depannage', 'note-depannage', 'rapport-etancheite', 'suivi-gaz', 'suivi-vignette', 'tva-reduite', 'suivi-amiante']);
    W.docmForm('rapport-etancheite', { cid: 'c1', iid: 'i1' }); vrai('… et le rapport d\'étanchéité (plomberie) s\'ouvre chez une entreprise de chauffage qui fait aussi de la plomberie', W.__modals.length === 1); } }

console.log('\n── 3128 · 13. la démonstration : les types du pack, les documents, le parc d\'appareils ──');
{ const DEMO_PLOMB = evalue(litteral(N, 'const DEMO_PLOMB={')), DEMO_CHAUF = evalue(litteral(N, 'const DEMO_CHAUF={'));
  for (const [m, D] of [['plomberie', DEMO_PLOMB], ['chauffage', DEMO_CHAUF]]) {
    const types = METIERS[m].types, t = D.planning.map(r => r[4]);
    vrai(m + ' : 7 clients, 13 créneaux sur 3 jours, 3 techniciens, des clients qui existent', D.clients.length === 7 && D.planning.length === 13 && D.planning.every(r => r[0] >= 0 && r[0] <= 2 && r[5] >= 0 && r[5] <= 2 && r[6] >= 0 && r[6] < 7));
    egal('⛔ ' + m + ' : chaque type de la démonstration est un type du PACK (écrit comme le pack l\'écrit)', t.filter(x => types.indexOf(x) < 0), []);
    vrai(m + ' : la checklist vient des prestations du pack ; aucun mot d\'anti-nuisibles nulle part', D.checklist.every(x => METIERS[m].presta.includes(x)) && !ANTI.test(JSON.stringify(D)), JSON.stringify(D).match(ANTI));
    vrai(m + ' : un grand nombre de types du pack sont mis en scène (au moins 9 différents)', new Set(t).size >= 9, new Set(t).size); }
  vrai('chauffage : les types « entretien » du planning sont ceux que le code reconnaît (cvcEstEntretien) pour la chaudière, la climatisation et la VMC', DEMO_CHAUF.planning.filter(r => /Entretien/.test(r[4])).length >= 4);
  const monde = (metier, beta) => { const db = { metier, clients: [], interventions: [], produits: [], boxes: [], techniciens: [], enveloppes: [], mouvements: [], docsMetier: [], appareils: [] };
    const init = { METIERS, INT_TYPES: ['Dératisation'], BETA_ESSAI: !!beta, db, STOCKAGE_ID: 'stockage', console, uid: (() => { let n = 0; return () => 'u' + (++n); })(), todayISO: () => '2026-10-28', shiftDay: (d, n) => d, toast: () => {}, save: () => {}, go: () => {}, confirm: () => true,
      currentUser: { id: 'u1', role: 'admin' }, views: { parametres() {} }, planJours: [], CVC_METIERS: ['chauffage', 'froid', 'energies'], NETT_METIERS: ['nettoyage'], fullName: () => 'Test', DEMO_PLOMB, DEMO_CHAUF, DEMO_CLIENTS_3D: evalue(litteral(N, 'const DEMO_CLIENTS_3D=[')), DEMO_PLAN_3D: evalue(litteral(N, 'const DEMO_PLAN_3D=[')), DEMO_NETT: evalue(litteral(N, 'const DEMO_NETT={')) };
    const b = bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'intTypes', 'demoSemisDe', 'demoPlanGenerique', 'demoCompte', 'demoRetirer'], init); return { db, b, init }; };
  for (const [m, D] of [['plomberie', DEMO_PLOMB], ['chauffage', DEMO_CHAUF]]) egal('demoSemisDe : le jeu du métier (' + m + ') — et pas le planning générique', monde(m).b.fn.demoSemisDe() === D, true);
  egal('demoSemisDe : la 3D et le nettoyage gardent LEURS jeux', [monde('3d').b.fn.demoSemisDe().planning[0][3], monde('nettoyage').b.fn.demoSemisDe().planning[0][3]], ['Dératisation — passage 2/3', 'Nettoyage de bureaux — passage 2/3']);
  /* les documents de démonstration, par les vraies fonctions du bloc */
  for (const [m, attendus] of [['plomberie', ['devis-depannage', 'note-depannage', 'rapport-etancheite', 'suivi-gaz', 'tva-reduite', 'suivi-amiante']], ['chauffage', ['devis-depannage', 'note-depannage', 'suivi-gaz', 'suivi-vignette']]]) {
    const D = m === 'plomberie' ? DEMO_PLOMB : DEMO_CHAUF; const db = BASE(); db.metierDemo = m;
    db.clients = D.clients.map((c, k) => ({ id: 'd' + k, nom: c[0], adresse: c[1], ville: c[2], cp: '17000', demo: 1 }));
    db.interventions = D.planning.map((r, k) => ({ id: 'di' + k, clientId: 'd' + r[6], titre: r[3], type: r[4], date: '2026-10-28', statut: r[7] || 'planifiee', demo: 1 }));
    db.appareils = m === 'chauffage' ? [{ id: 'da1', clientId: 'd1', nom: 'Climatiseur Daikin', type: 'clim_split', demo: 1 }] : [];
    const W = mk(m, { db }); vm.runInContext("function cvcType(a){ return {fluide: /clim|pac/.test(a.type)}; }", W); W.docmDemoPoser(db.clients.map(c => c.id));
    egal(m + ' : « Remplir » pose les documents de démonstration du métier (et eux seuls)', W.db.docsMetier.map(d => d.doc).sort(), attendus.slice().sort());
    vrai('   tous marqués démonstration (emportés par « Retirer la démonstration »), numérotés de façon unique, liés à une intervention ou un appareil du même client', W.db.docsMetier.every(d => d.demo === 1) && new Set(W.db.docsMetier.filter(d => d.num).map(d => d.num)).size === W.db.docsMetier.filter(d => d.num).length && W.db.docsMetier.every(d => !d.interventionId || W.db.interventions.find(i => i.id === d.interventionId).clientId === d.clientId), W.db.docsMetier.map(d => [d.doc, d.num, d.interventionId]));
    W.docmDemoPoser(db.clients.map(c => c.id)); vrai('   rejoué : rien de plus', W.db.docsMetier.length === attendus.length);
    let tousPdf = true, anti = []; for (const d of W.db.docsMetier) { const r = await fabrique(W, d.id); if (r.err || lirePdf(r.pdf).pb.length) tousPdf = false; else { const t = tout(r.pdf); if (t.indexOf('?') >= 0 || ANTI.test(t)) anti.push(d.doc); } }
    vrai('   chacun des PDF de démonstration est fabriqué, valide, sans « ? » ni mot d\'anti-nuisibles', tousPdf && anti.length === 0, anti);
    if (m === 'plomberie') { const e = W.db.docsMetier.find(d => d.doc === 'rapport-etancheite'), i = W.db.interventions.find(x => x.id === e.interventionId);
      vrai('   le rapport d\'étanchéité de démonstration est lié à l\'intervention « Test d\'étanchéité » (ses relevés s\'écrivent à l\'enregistrement, pas à la pose)', /tanch/.test(i.type) && e.v.resultat === 'etanche'); } }
  { const W = mk('3d'); W.docmDemoPoser(['c1', 'c2', 'c3']); const N2 = mk('nettoyage'); N2.docmDemoPoser(['c1']); vrai('la 3D et le nettoyage ne reçoivent aucun document de ce modèle', W.db.docsMetier.length === 0 && N2.db.docsMetier.length === 0); }
  /* le parc d'appareils de démonstration du chauffage (bloc CVC) */
  { const db = { clients: cdc(BASE().clients).concat([{ id: 'c4', nom: 'Hôtel' }]), interventions: [{ id: 'x1', clientId: 'c1', demo: 1, type: 'Entretien annuel chaudière', titre: 'Entretien de la chaudière gaz', statut: 'terminee', date: '2026-10-28' }, { id: 'x2', clientId: 'c2', demo: 1, type: 'Entretien climatisation', titre: 'Clim', statut: 'planifiee', date: '2026-10-28' }, { id: 'x3', clientId: 'c4', demo: 1, type: 'Ramonage', titre: 'Ramonage — poêle', statut: 'planifiee', date: '2026-10-28' }], appareils: [], contrats: [] };
    const W = cvc.monter({ db, metier: 'chauffage' }); W.cvcDemoPoser(['c1', 'c2', 'c3', 'c4']);
    vrai('chauffage : « Remplir » pose trois appareils (chaudière gaz, climatiseur split R32, poêle à granulés) marqués démonstration, sans PRP inventé', W.db.appareils.length === 3 && W.db.appareils.every(a => a.demo === 1 && a.prp === '') && W.db.appareils.map(a => a.type).sort().join() === 'chaudiere_bois,chaudiere_gaz,clim_split', W.db.appareils.map(a => a.type));
    vrai('… cités par les interventions qui les concernent (entretien, climatisation, ramonage)', W.db.interventions.every(i => (i.appareilIds || []).length === 1), W.db.interventions.map(i => i.appareilIds));
    W.cvcDemoPoser(['c1', 'c2', 'c3', 'c4']); vrai('… rejoué : rien de plus', W.db.appareils.length === 3);
    const W2 = cvc.monter({ db: cdc(db), metier: 'plomberie' }); W2.cvcDemoPoser(['c1', 'c2', 'c3', 'c4']); vrai('la plomberie n\'a pas de parc d\'appareils de démonstration', W2.db.appareils.length === 0); } }

console.log('\n── 3128 · 14. les registres : la collection est déclarée partout, le numéro ne redescend jamais ──');
{ const reg = (nom, re) => vrai('registre : ' + nom, re.test(N), nom);
  reg('COLLECTIONS_DONNEES porte docsMetier', /const COLLECTIONS_DONNEES=\[[^\]]*'plansPrevention','docsMetier'\]/);
  reg('COLLS_GARDEES porte docsMetier (garde-fou du rétrécissement)', /const COLLS_GARDEES=\[[^\]]*'plansPrevention','docsMetier'\]/);
  reg('OP_CLASSES : une liste (fusion enregistrement par enregistrement)', /plansPrevention: 'liste', docsMetier: 'liste'/);
  reg('migrate() pose la collection (une base ancienne la reçoit vide)', /const cols = \['users'[^\]]*'plansPrevention','docsMetier'\]/);
  reg('la remise à zéro la vide', /'registres','appareils','cahiers','plansPrevention','docsMetier'\]\.forEach\(k=>\{ db\[k\]=\[\]; \}\)/);
  reg('COL_GRP : les droits de la catégorie Clients ; COLL_QUOI : le refus sait la nommer', /plansPrevention:'crm',docsMetier:'crm'/);
  reg('COLL_QUOI nomme « un document du métier »', /docsMetier:'un document du métier'/);
  reg('la suppression d\'un client compte ses documents (clientLiens)', /docs:n\('docsMetier'\)/);
  reg('« Retirer la démonstration » emporte les documents et les appareils de démonstration', /db\.docsMetier=\(db\.docsMetier\|\|\[\]\)\.filter\(x=>!x\.demo\); db\.appareils=\(db\.appareils\|\|\[\]\)\.filter\(x=>!x\.demo\);/);
  reg('le numéro d\'un document supprimé n\'est jamais rendu (numPlafondRelever lit docsMetier)', /voir\(db\.docsMetier,'num'\)/);
  reg('« Créer le planning de démonstration » pose le parc puis les documents', /cvcDemoPoser\(C\);[^\n]*\n\s*if\(typeof docmDemoPoser==='function'\) docmDemoPoser\(C\);/);
  const dbn = { docsMetier: [{ num: 'DEP-2026-007' }, { num: 'NOT-2026-003' }, { num: '' }, {}] };
  const b = bac('app.html', ['numPlafondRelever', 'numPlafond'], { db: dbn, NUM_RE: /^([A-Z]+)-(\d{4})-(\d+)$/, console });
  b.fn.numPlafondRelever();
  vrai('⛔ numPlafondRelever relève le plafond de DEP (7) et de NOT (3) depuis db.docsMetier : un document supprimé ne rend pas son numéro', dbn.numMax['DEP-2026'] === 7 && dbn.numMax['NOT-2026'] === 3 && b.fn.numPlafond('DEP', 2026) === 7, dbn.numMax); }

console.log('\n── 3128 · 15. ⛔ LA 3D D\'ELAN ET LE NETTOYAGE NE CHANGENT EN RIEN ──');
{ const EX3D = { tache: 'Ex : Rappeler le client / Commander des postes', entreprise: 'Ex : Pest Contrôle SARL', societe: 'Ex : 3D Sud-Ouest SARL', siteBon: 'Nom du site (ex : CAZABOX ST PORCHAIRE)', ville: 'ex : 17390 La Tremblade', produit: 'Ex : XILIX 1000',
    liste: 'Gel blattes Maxforce ; MABI ; 24,90\nMUSKIL bloc 10 kg ; SODIF\nGants nitrile taille 9', devis1: '« Dératisation chez Mme Martin, 12 rue des Lilas à Rochefort, 280 € TTC »', devis2: '« Punaises de lit, appartement 60 m², La Rochelle, à 650 »',
    devisIA: 'Ex : dératisation d\'un restaurant de 120 m² avec cave, 8 postes d\'appâtage, 3 passages sur 2 mois, à Strasbourg', materiel: 'Ex : 2 pièges à glu, 1 grille anti-intrusion…', produitsTitre: 'Produits utilisés (registre)', produitsAjout: '— Ajouter un produit du registre —' };
  const monde = (metier, beta) => { const db = { metier, clients: [], interventions: [], produits: [], boxes: [], techniciens: [], enveloppes: [], mouvements: [] };
    const init = { METIERS, INT_TYPES: ['Dératisation'], BETA_ESSAI: !!beta, db, STOCKAGE_ID: 'stockage', console, CVC_METIERS: ['chauffage', 'froid', 'energies'], NETT_METIERS: ['nettoyage'] };
    return { db, b: bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'metierActifs', 'estMetier3D', 'intTypes', 'metierBloque', 'sansBox', 'libBox', 'exemple', 'metierGereParc', 'metierGereSites', 'categoriesProduit'], init) }; };
  const m3 = monde('3d');
  egal('exemple(…) rend, en 3D, chacun des textes d\'avant, mot pour mot', Object.keys(EX3D).map(k => m3.b.fn.exemple(k)), Object.keys(EX3D).map(k => EX3D[k]));
  vrai('la 3D : pas de métiers actifs en plus, pas de parc d\'appareils, pas de sites, pas de box retirée, types historiques', JSON.stringify(m3.b.fn.metierActifs()) === '["3d"]' && !m3.b.fn.metierGereParc() && !m3.b.fn.metierGereSites() && !m3.b.fn.sansBox() && m3.b.fn.intTypes()[0] === 'Dératisation');
  const MJ = require('../metiers.json').metiers;
  vrai('le pack 3D du référentiel n\'a pas bougé (aucun type, aucune prestation, aucun relevé propres)', METIERS['3d'].types === null && METIERS['3d'].presta === null && METIERS['3d'].releves === null && METIERS['3d'].produits === null && METIERS['3d'].documents.length === 5);
  const n = monde('nettoyage');
  egal('le nettoyage : ses exemples, ses 24 produits de départ, ses types, son jeu de démonstration — inchangés', [n.b.fn.exemple('entreprise'), METIERS.nettoyage.types[0], METIERS.nettoyage.produits.length, JSON.stringify(n.b.fn.metierActifs()), n.b.fn.metierGereSites(), n.b.fn.metierGereParc()], ['Ex : Éclat Propreté SARL', 'Nettoyage de bureaux', 8, '["nettoyage"]', true, false]);
  const ex = (m, k) => monde(m).b.fn.exemple(k);
  vrai('plomberie et chauffage : leurs propres exemples (aucun mot d\'anti-nuisibles), la 3D et le nettoyage gardent les leurs', !ANTI.test(['entreprise', 'societe', 'produit', 'liste', 'devis1', 'devis2', 'devisIA', 'materiel', 'produitsTitre'].map(k => ex('plomberie', k) + ex('chauffage', k)).join(' ')) && /Aqua Services/.test(ex('plomberie', 'entreprise')) && /Thermo Confort/.test(ex('chauffage', 'entreprise')) && /mitigeur/.test(ex('plomberie', 'devis1')) && /chaudière gaz/.test(ex('chauffage', 'devis1')));
  vrai('chaque type, chaque prestation et chaque catégorie des deux packs est un texte simple (aucun guillemet droit, aucune balise)', ['chauffage', 'plomberie'].every(m => [].concat(METIERS[m].types, METIERS[m].presta, METIERS[m].produits, METIERS[m].documents).every(x => !/["<>]/.test(x))));
  /* un pack posé sur la base d'une AUTRE entreprise ne peut pas déborder : la réunion de deux packs n'écrit jamais dans METIERS */
  const avant = JSON.stringify([METIERS.chauffage.types, METIERS.plomberie.types, METIERS.chauffage.catalogue ? METIERS.chauffage.catalogue.length : 0]);
  const T = monde('chauffage'); T.db.metierPlus = 'plomberie'; T.b.fn.metierPack().types.push('Type ajouté après coup');
  vrai('⛔ la réunion est une COPIE : ajouter un type au pack réuni ne touche ni le pack du chauffage ni celui de la plomberie', !METIERS.chauffage.types.includes('Type ajouté après coup') && !METIERS.plomberie.types.includes('Type ajouté après coup') && avant === JSON.stringify([METIERS.chauffage.types, METIERS.plomberie.types, METIERS.chauffage.catalogue ? METIERS.chauffage.catalogue.length : 0])); }

fin();
})();
function fin() { console.log('\n════ test-3128 : ' + ok + ' ✓ ' + ko + ' ✗ ════'); process.exit(ko ? 1 : 0); }
