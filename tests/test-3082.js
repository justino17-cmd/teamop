/* 3082 — L'EXAMEN DU 27 OCTOBRE 2026 (19 h 07) : 8 sur 9, le scénario 6 rouge.
     Brillance Services et Dupont Plomberie restés « à revoir » : le juge disait `incoherent` (« se contredit ou comporte une erreur de sens »), sans dire OÙ. Deux
     courriels justes, bloqués ; et une réécriture à l'aveugle ne pouvait rien corriger. Ce banc joue le VRAI `agents-controle.js` et garde :
       · le juge doit CITER la phrase incohérente (un fragment vérifié du courriel) ; sans phrase, la faute tombe (et un ECHEC qui n'avait qu'elle devient OK) ;
       · `fait_invente` garde sa règle : sans citation, la faute RESTE (on ne relâche rien sur un fait) ;
       · la réécriture reçoit la phrase incohérente, à part de celles de `fait_invente` ;
       · le juge réel (`juger`) : un incoherent sans phrase laisse passer le courriel ; cité, il bloque avec sa phrase. */
'use strict';
const path = require('path');
const C = require(path.join(__dirname, '..', 'server', 'agents-controle.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);

const CORPS = 'Bonjour,\n\nNous comprenons que Dupont Plomberie exerce dans le domaine de la plomberie.\n\nNotre application gère vos interventions sans aucun planning.\n\nBien cordialement,';
const PH = 'Notre application gère vos interventions sans aucun planning';
console.log('\n1. Le verdict');
v('incoherent CITÉ (une phrase du courriel) : la faute reste, avec sa phrase rangée à part',
  C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : « ' + PH + ' »', CORPS), { etat: 'echec', fautes: ['incoherent'], citations: [PH], citesPar: { incoherent: [PH] } });
v('⛔ incoherent SANS phrase : la faute tombe — un ECHEC qui n’avait qu’elle devient OK', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent', CORPS), { etat: 'ok' });
v('⛔ incoherent avec une phrase qui N’EST PAS dans le courriel : la faute tombe aussi', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : le client a déjà payé trois fois', CORPS), { etat: 'ok' });
v('incoherent sans phrase à côté d’une autre faute : seule l’autre reste', C.lireVerdict('VERDICT : ECHEC\nFAUTE : incoherent\nFAUTE : ton_robotique', CORPS), { etat: 'echec', fautes: ['ton_robotique'] });
v('fait_invente SANS citation : la faute RESTE (on ne relâche rien sur un fait)', C.lireVerdict('VERDICT : ECHEC\nFAUTE : fait_invente', CORPS), { etat: 'echec', fautes: ['fait_invente'] });
v('les deux cités : chacune sa phrase', C.lireVerdict('VERDICT : ECHEC\nFAUTE : fait_invente\nCITE : Nous comprenons que Dupont Plomberie exerce\nFAUTE : incoherent\nCITE : ' + PH, CORPS).citesPar,
  { fait_invente: ['Nous comprenons que Dupont Plomberie exerce'], incoherent: [PH] });
v('une ligne CITE après une autre faute (ton_robotique) rend toujours la réponse « indisponible »', C.lireVerdict('VERDICT : ECHEC\nFAUTE : ton_robotique\nCITE : ' + PH, CORPS), { etat: 'indisponible' });
vrai('le juge reçoit la règle : citer pour incoherent, sinon pas d’incoherent', /pour incoherent, la phrase qui se contredit/.test(C.JUGE_SYSTEM) && /pas de fait_invente ni d’incoherent/.test(C.JUGE_SYSTEM));

console.log('\n2. La réécriture');
const m = C.messagesReecriture('Écris le courriel.', 'Objet : x\n\n' + CORPS, ['incoherent'], [PH], { incoherent: [PH] });
const dernier = m[m.length - 1].content;
vrai('la phrase incohérente est rendue à l’auteur, avec la consigne de la rendre cohérente', /concernée\(s\) par « incoherent » : « Notre application gère vos interventions sans aucun planning »/.test(dernier) && /cohérentes avec le reste du courriel/.test(dernier), dernier);
vrai('…et pas sous l’étiquette de fait_invente', !/par « fait_invente »/.test(dernier));
const m2 = C.messagesReecriture('Écris.', 'x', ['fait_invente', 'incoherent'], ['A b c d', PH], { fait_invente: ['A b c d'], incoherent: [PH] });
const d2 = m2[m2.length - 1].content;
vrai('les deux fautes : chacune SES phrases', /par « fait_invente » : « A b c d »\./.test(d2) && /par « incoherent » : « Notre application/.test(d2), d2);
const m3 = C.messagesReecriture('Écris.', 'x', ['ton_robotique'], null, null);
vrai('sans citation : la réécriture d’avant, sans bloc « phrase concernée »', !/concernée/.test(m3[m3.length - 1].content));

console.log('\n3. Le juge réel (`juger`), cerveau scripté');
(async () => {
  const jg = texte => C.juger({ cerveau: { penser: async () => ({ ok: true, texte }) }, agent: 'lea', objet: 'Bienvenue', corps: CORPS, contexte: [] });
  v('juger : un incoherent sans phrase ne bloque pas', await jg('VERDICT : ECHEC\nFAUTE : incoherent'), { etat: 'ok' });
  v('juger : cité, il bloque, avec sa phrase', await jg('VERDICT : ECHEC\nFAUTE : incoherent\nCITE : ' + PH), { etat: 'echec', fautes: ['incoherent'], citations: [PH], citesPar: { incoherent: [PH] } });
  console.log('\ntest-3082 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
