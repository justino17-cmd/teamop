/* test-3243 — LE LOGO ET LA COULEUR VONT SUR LES DOCUMENTS, PLUS DANS L'APPLICATION : LES CONTRATS ET LES AGENTS LE DISENT (4 novembre 2026).
 *
 * Depuis OP GESTION v795 (en production), le logo, la couleur et le cachet de l'entreprise ne vont plus que sur ses documents (devis et factures :
 * logo, couleur, cachet ; bons de commande : logo, couleur), pour toutes les formules ; l'application garde le logo et la couleur d'OP GESTION.
 * Les conditions particulières Business et Business Premium promettaient encore « Logo de l'entreprise dans l'application » et « Logo et couleur
 * de l'entreprise pour toute l'équipe », et les agents de la Tour le répétaient. Justin : « ça tu changes ». Ce banc garde :
 *   1. aucune des trois conditions particulières d'OP GESTION ne promet plus le logo ni la couleur DANS l'application ; Pro dit les documents ;
 *   2. ⛔ un texte validé ne se réécrit pas : les trois pièces portent une révision NOUVELLE (`logo-documents-2026-11-04`), donc un registre déjà
 *      peuplé (celui du VPS, qui porte la révision du 23 octobre) reçoit UN brouillon de plus par pièce, avec sa note, jamais validé — et pas deux ;
 *   3. ce que les agents récitent (FORMULES d'agents-connaissance.js, l'offre d'agent-equipe.js) ne promet plus le logo dans l'application.
 * Il monte le VRAI module des contrats sur un registre jetable. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansJsCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const TEXTES = path.join(RACINE, 'server', 'contrats-textes');
const CP = ['cp_op_gestion_pro', 'cp_op_gestion_business', 'cp_op_gestion_business_premium'];
const txt = t => fs.readFileSync(path.join(TEXTES, t + '.txt'), 'utf8');
/* la promesse retirée, sous toutes ses formes déjà écrites dans ce dépôt */
const PROMESSE = /logo[^.\n]{0,60}dans l['’]application|couleur[^.\n]{0,40}dans l['’]application|logo et couleur de l['’]entreprise pour toute l['’]équipe|couleur d['’]application/i;

console.log('\n── 3243 · logo et couleur sur les documents, plus dans l’application ──');

console.log('\n1. Les conditions particulières');
vrai('(population) les trois conditions particulières d’OP GESTION sont lues', CP.every(t => txt(t).length > 400));
v('⛔ aucune ne promet plus le logo ni la couleur dans l’application', CP.filter(t => PROMESSE.test(txt(t))), []);
vrai('Pro : « Devis et factures, à votre logo, votre couleur et votre cachet »', /- Devis et factures, à votre logo, votre couleur et votre cachet\n/.test(txt('cp_op_gestion_pro')));
vrai('Pro : la « personnalisation » ne figure plus parmi les fonctions exclues', /\(stock, bons de commande, registre sanitaire, comptabilité\) ne font pas partie/.test(txt('cp_op_gestion_pro')));
vrai('Business : « Bons de commande fournisseurs : PDF à votre logo et votre couleur, envoi en un clic »', /- Bons de commande fournisseurs : PDF à votre logo et votre couleur, envoi en un clic\n/.test(txt('cp_op_gestion_business')));
vrai('…le reste du fond est intact (prix, assistance, changement de formule)', /Prix : 15 € par mois/.test(txt('cp_op_gestion_pro')) && /Prix : 25 € par mois/.test(txt('cp_op_gestion_business')) && /Prix : 50 € par mois/.test(txt('cp_op_gestion_business_premium'))
  && /traitement prioritaire, sans délai de réponse garanti\./.test(txt('cp_op_gestion_business')) && /Assistance : assistance prioritaire et accompagnement à la mise en route\./.test(txt('cp_op_gestion_business_premium')));

console.log('\n2. La révision : un registre du VPS reçoit UN brouillon par pièce, jamais validé');
const mod = require(path.join(RACINE, 'server', 'contrats.js'));
v('⛔ les trois pièces portent la révision du 4 novembre (un nom NOUVEAU : un nom réutilisé ne déposerait rien)', CP.map(t => mod.REVISIONS[t]), CP.map(() => 'logo-documents-2026-11-04'));
v('…les autres pièces gardent la leur', ['conditions_generales', 'conditions_op_messages', 'dpa', 'cp_op_messages_business_premium'].map(t => mod.REVISIONS[t]), Array(4).fill('relecture-juridique-2026-10-23'));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3243-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });
let horloge = 1e12;
const monter = (nom, textesDir) => { const D = path.join(banc, nom); fs.mkdirSync(D, { recursive: true }); return { D, m: mod({ get() {}, post() {} }, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, textesDir, maintenant: () => ++horloge }) }; };
/* le registre du VPS : les trois pièces validées, chacune déposée par la révision du 23 octobre */
const VPS = monter('vps', null);
const F = path.join(VPS.D, 'contrats-documents.json');
for (const t of CP) { VPS.m.brouillon(t, 'Texte validé du 23 octobre — ' + t + ' — Logo de l’entreprise dans l’application.', 'Rédaction (agents)', 'note', 'relecture-juridique-2026-10-23'); v('(montage) ' + t + ' validé', VPS.m.valider(t, 1, 'Justin').code, 200); }
const avant = JSON.parse(fs.readFileSync(F, 'utf8'));
VPS.m.semer(TEXTES);
const apres = JSON.parse(fs.readFileSync(F, 'utf8'));
v('⛔ chaque pièce reçoit UN brouillon de plus', CP.map(t => apres[t].length), [2, 2, 2]);
v('⛔ …marqué de la révision, en brouillon, avec le texte du fichier', CP.map(t => (apres[t][1] || {})).map((x, i) => [x.statut, x.revision, x.texte === txt(CP[i]).replace(/\r\n/g, '\n').trim()]), CP.map(() => ['brouillon', 'logo-documents-2026-11-04', true]));
vrai('…sa note dit la révision du 4 novembre, pas la relecture juridique', CP.every(t => /4 novembre 2026/.test((apres[t][1] || {}).note) && !/relecture juridique/.test((apres[t][1] || {}).note)));
v('⛔ …et ce qui est en vigueur ne bouge pas (la version 1, son empreinte)', CP.map(t => [VPS.m.enVigueur(t).n, VPS.m.enVigueur(t).empreinte === avant[t][0].empreinte]), CP.map(() => [1, true]));
VPS.m.semer(TEXTES);
v('⛔ le redémarrage suivant ne redépose rien', CP.map(t => JSON.parse(fs.readFileSync(F, 'utf8'))[t].length), [2, 2, 2]);

console.log('\n3. Ce que les agents récitent');
const CONN = sansJsCom(lire('server/agents-connaissance.js')), EQ = sansJsCom(lire('server/agent-equipe.js'));
vrai('(population) les deux sources sont lues, et les trois formules y sont', CONN.length > 5000 && /premium: \{ nom: 'OP GESTION Business Premium'/.test(CONN) && /Business Premium 50 €/.test(EQ));
v('⛔ aucune ne promet plus le logo ni la couleur dans l’application', [['agents-connaissance.js', CONN], ['agent-equipe.js', EQ]].filter(([, s]) => PROMESSE.test(s) || /logo, nom et couleur/.test(s)).map(([n]) => n), []);
vrai('Pro : les agents disent « devis et factures à son logo, sa couleur et son cachet »', /'devis et factures à son logo, sa couleur et son cachet'/.test(CONN) && /devis et factures à son logo, sa couleur et son cachet\)/.test(EQ));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
