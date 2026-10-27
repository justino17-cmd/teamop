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

console.log('\ntest-3083 : ' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
