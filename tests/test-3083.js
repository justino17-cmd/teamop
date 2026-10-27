/* 3083 — L'EXAMEN DU 27 OCTOBRE 2026 (21 h 24) : 8 sur 9, le scénario 6 rouge.
     Dupont Plomberie resté « à revoir » pour `incoherent`, phrase citée : « nous pourrons ensuite vous ouvrir une période d'essai d'une semaine » — la phrase que les
     cahiers de Léa et de Camille IMPOSENT mot pour mot. Ce banc joue le VRAI `agents-controle.js` et garde :
       · une citation contenue dans une phrase imposée ne prouve pas une incohérence (la faute tombe, comme sans citation) ;
       · une citation ailleurs dans le courriel bloque toujours ;
       · `fait_invente` n'est pas touché : la faute reste ;
       · les phrases imposées sont bien celles des cahiers (lues dans agent-lea.js, agent-camille.js, agent-chloe.js) ;
       · le juge reçoit la règle. */
'use strict';
const fs = require('fs'), path = require('path');
const C = require(path.join(__dirname, '..', 'server', 'agents-controle.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);

const CORPS = 'Bonjour,\n\nNous vous remercions pour votre inscription sur teamop.fr. Nous avons compris que Dupont Plomberie exerce une activité de plomberie.\n\nNotre application gère vos interventions sans aucun planning.\n\n'
  + 'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d\'essai d\'une semaine.\n\nNous restons à votre disposition par retour de mail ou par téléphone.\n\nBien cordialement,';
const ESSAI = 'nous pourrons ensuite vous ouvrir une période d\'essai d\'une semaine';
const PH = 'Notre application gère vos interventions sans aucun planning';

console.log('\n1. Le verdict');
v('⛔ incoherent cité sur la phrase IMPOSÉE de l’essai (le cas de 21 h 24) : la faute tombe, le courriel passe', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : « ' + ESSAI + ' »', CORPS), { etat: 'ok' });
v('…apostrophe typographique ou droite, même verdict', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : ' + ESSAI.replace(/'/g, '’'), CORPS), { etat: 'ok' });
v('…la phrase imposée ENTIÈRE, même verdict', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : Dès réception de vos réponses, nous vous adresserons une proposition adaptée', CORPS), { etat: 'ok' });
v('…la fermeture imposée, même verdict', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : Nous restons à votre disposition par retour de mail', CORPS), { etat: 'ok' });
v('une phrase NON imposée reste une preuve : la faute bloque, avec sa phrase', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : ' + PH, CORPS), { etat: 'echec', fautes: ['incoherent'], citations: [PH], citesPar: { incoherent: [PH] } });
v('une citation qui DÉBORDE de la phrase imposée (elle prend la suite) reste une preuve', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : activité de plomberie. Notre application gère vos interventions', CORPS).etat, 'echec');
v('imposée + une vraie phrase : seule la vraie est relayée', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : ' + ESSAI + '\nCITE : ' + PH, CORPS).citesPar, { incoherent: [PH] });
v('fait_invente cité sur une phrase imposée : la faute RESTE (on ne relâche rien sur un fait)', C.lireVerdict('VERDICT : ECHEC\nFAUTE : fait_invente\nCITE : ' + ESSAI, CORPS).fautes, ['fait_invente']);
v('incoherent imposé à côté d’une autre faute : seule l’autre reste', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : ' + ESSAI + '\nFAUTE : ton_robotique', CORPS), { etat: 'echec', fautes: ['ton_robotique'] });

console.log('\n2. Les phrases imposées sont celles des cahiers');
const plat = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cahiers = ['agent-lea.js', 'agent-camille.js', 'agent-chloe.js'].map(f => plat(fs.readFileSync(path.join(__dirname, '..', 'server', f), 'utf8'))).join(' | ');
vrai('quatre phrases imposées', C.PHRASES_IMPOSEES.length === 4, C.PHRASES_IMPOSEES.length);
for (const p of C.PHRASES_IMPOSEES) vrai('dans un cahier : « ' + p.trim().slice(0, 50) + '… »', cahiers.includes(p.trim()));

console.log('\n3. Le juge reçoit la règle');
vrai('le juge sait que les phrases imposées ne sont jamais incohérentes', /phrases que le cahier IMPOSE[^\n]*ne sont jamais incohérentes/.test(C.JUGE_SYSTEM));

console.log('\n4. Le SECOND AVIS de l’examen : un critère ne tombe que si deux lectures le font tomber');
const EX = require(path.join(__dirname, '..', 'server', 'examen.js'));
const juge = rep => { const recus = []; return { recus, penser: async () => { const r = rep[recus.length]; recus.push(1); return r instanceof Error ? { ok: false, raison: 'erreur_api' } : { ok: true, texte: r }; } }; };
const CR = [{ cle: 'c1', libelle: 'a', texte: 'a' }, { cle: 'c2', libelle: 'b', texte: 'b' }, { cle: 'c3', libelle: 'c', texte: 'c' }];
(async () => {
  let J = juge(['{"c1":true,"c2":true,"c3":true,"raison":"ok"}']);
  let j = await EX.juger(J, CR, 'x');
  v('tout vrai : UN seul jugement, rien de payé en plus', [J.recus.length, j.valeurs], [1, { c1: true, c2: true, c3: true }]);
  J = juge(['{"c1":true,"c2":false,"c3":true,"raison":"c2 : non"}', '{"c1":true,"c2":true,"c3":true,"raison":"ok"}']);
  j = await EX.juger(J, CR, 'x');
  v('⛔ un critère faux à la première lecture, vrai à la seconde : il PASSE (une lubie ne fait pas tomber un scénario)', [J.recus.length, j.valeurs.c2, j.secondAvis], [2, true, true]);
  J = juge(['{"c1":true,"c2":false,"c3":false,"raison":"c2 : non ; c3 : non"}', '{"c1":true,"c2":false,"c3":true,"raison":"c2 : non"}']);
  j = await EX.juger(J, CR, 'x');
  v('⛔ faux deux fois : il TOMBE ; faux une seule fois : il passe', [j.valeurs.c2, j.valeurs.c3], [false, true]);
  J = juge(['{"c1":false,"c2":true,"c3":true,"raison":"c1 : non"}', '{"c1":true,"c2":false,"c3":true,"raison":"c2 : non"}']);
  j = await EX.juger(J, CR, 'x');
  v('un critère vrai à la première lecture reste vrai, même si la seconde le trouve faux', j.valeurs, { c1: true, c2: true, c3: true });
  J = juge(['{"c1":true,"c2":false,"c3":true,"raison":"c2 : non"}', new Error('x')]);
  j = await EX.juger(J, CR, 'x');
  v('⛔ second jugement IMPOSSIBLE : le premier verdict tient (on ne relâche rien sur un doute)', j.valeurs.c2, false);
  console.log('\ntest-3083 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
