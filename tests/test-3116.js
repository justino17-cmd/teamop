/* ⛔ CE QUE CE FICHIER GARDE — LE PING-PONG ET LA PROFONDEUR SOUS UNE RACINE (28 octobre 2026, Justin : « J'aimerais que les agents communiquent entre eux. Parce que là, il n'y a aucune communication. Tout le monde
   fait tout et rien en même temps »).
   Sous la racine d'un message de Justin, la profondeur d'une chaîne passe de 3 à 6 : deux agents peuvent donc se répondre assez pour faire avancer un travail… et assez pour vider un budget en se répétant.
   La parade n'est pas un plafond horaire, c'est un ARRÊT ANTICIPÉ : si les quatre derniers messages d'agents de la racine sont A B A B, que chacun cite l'autre et qu'AUCUN ACTE n'a eu lieu depuis le début de
   l'alternance (une tâche prise, passée, terminée, une décision), le cinquième réveil n'a pas lieu. Ce banc exige :
     · ABAB sans acte : arrêt au cinquième, UNE ligne du système par paire et par heure, Victor réveillé UNE fois pour arbitrer (s'il n'est pas l'un des deux) ;
     · ABAB AVEC un acte (une tâche prise) : pas de coupure — la chaîne va jusqu'à la profondeur 6 ;
     · la profondeur : 6 sous racine, 3 sans (le message d'un agent écrit de lui-même) ;
     · `REVEILS_AGENT_MAX` = 4, qu'aucun banc ne gardait : un message d'agent qui en cite six n'en réveille que quatre ;
     · l'arrêt est un arrêt, pas un silence : ce qui a été dit reste, et les lignes de « limite » n'existent pas. */
'use strict';
const { monter, rep, outil, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3116 · le ping-pong, la profondeur sous racine, REVEILS_AGENT_MAX ──');
(async () => {
  const EQ = require(S('agent-equipe.js'));
  /* Camille et Léa se renvoient la balle : chaque réponse cite l'autre, avec un texte NEUF à chaque fois (le doublon de 24 h refuserait le même) */
  const balle = (acte) => { const n = {}; return (t) => { n[t.id] = (n[t.id] || 0) + 1; const autre = t.id === 'camille' ? 'lea' : 'camille'; return t.id === 'victor' ? rep('Je tranche (' + n[t.id] + ') : Camille garde le courrier, Léa le suivi.') : rep('@' + autre + ' ' + 'qu’en penses-tu ' + t.id + ' ' + n[t.id] + ' ?', acte && t.id === 'camille' && n[t.id] === 1 ? [outil('prendre', { texte: 'Préparer la relance des devis' })] : []); }; };

  console.log('\n1. ABAB sans acte : le cinquième réveil n\'a pas lieu');
  {
    const H = monter({ script: balle(false) });
    await H.justin('equipe', '@camille discute avec Léa de la relance');
    const ms = await H.messages('equipe'), ag = ms.filter(m => H.REG.includes(m.de) && m.de !== 'victor');
    v('⛔ quatre messages d\'agents (Camille, Léa, Camille, Léa), profondeurs 1 à 4 — pas un cinquième', [ag.map(m => m.de), ag.map(m => m.prof)], [['camille', 'lea', 'camille', 'lea'], [1, 2, 3, 4]]);
    const sys = ms.filter(m => m.de === 'systeme');
    v('…UNE ligne du système, qui nomme les deux et dit que l\'échange s\'arrête (pas une « limite de messages par heure »)', [sys.length, /Camille/.test(sys[0].texte) && /Léa/.test(sys[0].texte) && /se répondent sans rien faire avancer/.test(sys[0].texte), /limite/.test(sys[0].texte)], [1, true, false]);
    const arb = H.appels.filter(a => /deux collègues se répondent/.test(a.system));
    v('⛔ Victor, qui n\'est ni l\'un ni l\'autre, est réveillé UNE fois pour arbitrer (le complément du prompt le dit)', [arb.length, arb[0] && arb[0].id], [1, 'victor']);
    vrai('…et il lit ce qui s\'est dit (le dernier message de Léa y est)', /qu’en penses-tu lea 2/.test(arb[0].messages.map(m => m.content).join('\n')));
    vrai('…sa réponse est dans le fil, et ne relance personne (cinq appels en tout, voir plus bas)', ms.some(m => m.de === 'victor' && /Je tranche/.test(m.texte)));
    v('au total : cinq appels (quatre échanges + l\'arbitre), et le compteur de chaînes coupées de /health a bougé', [H.appels.length, H.eq.refus().chaine], [5, 1]);
    /* le même couple, une seconde racine dans l'heure : la ligne n'est pas redite, Victor n'est pas redérangé */
    const n0 = H.appels.length;
    await H.justin('equipe', '@camille discute encore avec Léa d\'une autre relance');
    const sys2 = (await H.messages('equipe')).filter(m => m.de === 'systeme');
    v('⛔ une seconde fois dans l\'heure : l\'échange s\'arrête encore, mais la ligne n\'est PAS répétée et Victor n\'arbitre pas deux fois', [sys2.length, H.appels.slice(n0).filter(a => /deux collègues se répondent/.test(a.system)).length], [1, 0]);
    H.avance(3600 * 1000 + 5000);
    await H.justin('equipe', '@camille encore un échange avec Léa, une heure plus tard');
    v('…une heure plus tard, la paire se redit (une ligne par paire ET par heure)', (await H.messages('equipe')).filter(m => m.de === 'systeme').length, 2);
    H.nettoyer();
  }

  console.log('\n2. ABAB AVEC un acte : pas de coupure — la profondeur 6 est la borne');
  {
    const H = monter({ script: balle(true) });
    await H.justin('equipe', '@camille discute avec Léa de la relance, et prends-la');
    const ms = await H.messages('equipe'), ag = ms.filter(m => H.REG.includes(m.de) && m.de !== 'victor');
    v('⛔ Camille prend une tâche (un acte) : six messages d\'agents, profondeurs 1 à 6, jusqu\'à la borne de la racine', [ag.map(m => m.de), ag.map(m => m.prof)], [['camille', 'lea', 'camille', 'lea', 'camille', 'lea'], [1, 2, 3, 4, 5, 6]]);
    vrai('…le sixième cite Camille, qui ne répond PAS : la profondeur 6 ne réveille plus personne', ag[5].mentions.includes('camille') && H.appels.length === 6, H.appels.length);
    vrai('…aucune ligne de ping-pong ni de limite (population : une tâche a bien été prise)', !ms.some(m => m.de === 'systeme' && /se répondent|limite/.test(m.texte)) && H.taches().some(k => k.vers === 'camille' && k.statut === 'prise'));
    H.nettoyer();
  }

  console.log('\n3. Sans racine : la borne d\'avant (profondeur 3) tient');
  {
    const H = monter({ script: balle(false) });
    H.conv.parler('camille', 'equipe', '@lea on s\'y met ?', { niveau: 'info', prof: 1 });
    await H.calme(); await H.dormir(100);
    const ag = (await H.messages('equipe')).filter(m => H.REG.includes(m.de));
    v('⛔ un échange né d\'un agent : trois messages, deux appels, pas un de plus', [ag.map(m => m.prof), H.appels.map(a => a.id), ag.some(m => m.racine)], [[1, 2, 3], ['lea', 'camille'], false]);
    H.nettoyer();
  }

  console.log('\n3 bis. Sans racine, le plafond horaire d\'avant tient — mais EN SILENCE pour Justin (journal et compteur, aucune ligne « limite »)');
  {
    const H = monter({ script: () => rep('Je regarde.') });
    for (let i = 1; i <= 12; i++) H.conv.parler('lea', 'equipe', 'Message spontané de Léa numéro ' + i);
    v('(population) Léa a écrit douze messages d\'elle-même dans l\'heure', H.registre().filter(m => m.de === 'lea' && !m.racine).length, 12);
    H.conv.parler('camille', 'equipe', '@lea tu peux regarder ce dossier ?', { niveau: 'info', prof: 1 });
    await H.calme();
    const ms = await H.messages('equipe');
    v('⛔ Léa n\'est PAS appelée (le refus est connu AVANT de payer) et aucune ligne du système ne parle de limite', [H.appels.length, ms.filter(m => m.de === 'systeme').length, ms.some(m => /limite|par heure/i.test(m.texte))], [0, 0, false]);
    v('…le refus est au journal et dans le compteur de /health', [H.eq.refus().horaire, H.agents.lireJournal().some(e => e.agent === 'lea' && e.action === 'refus horaire' && e.resultat === 'refuse')], [1, true]);
    H.nettoyer();
  }

  console.log('\n4. REVEILS_AGENT_MAX = 4 : un message d\'agent qui en cite six n\'en réveille que quatre');
  {
    const H = monter({ script: (t) => rep('Reçu de ' + t.id + '.') });
    v('(la constante) quatre réveils par message d\'agent', EQ.REVEILS_AGENT_MAX, 4);
    H.conv.parler('victor', 'equipe', '@lea @max @jules @theo @nina @ines un point rapide chacun ?', { niveau: 'info', prof: 1 });
    await H.calme();
    v('⛔ six cités, quatre réveillés (les quatre premiers), quatre appels', [H.appels.map(a => a.id).sort(), H.appels.length], [['jules', 'lea', 'max', 'theo'], 4]);
    const n = H.appels.length;
    await H.justin('equipe', '@lea @max @jules @theo @nina @ines un point de Justin');
    v('…alors que Justin, lui, réveille les six', H.appels.slice(n).map(a => a.id).sort(), ['ines', 'jules', 'lea', 'max', 'nina', 'theo']);
    H.nettoyer();
  }

  console.log('\n5. L\'acte se lit au journal et aux tâches, pas au bavardage');
  {
    const H = monter({ script: () => rep('Ok.') });
    const t0 = H.horloge.t - 1000;
    v('rien n\'a eu lieu : aucun acte pour Camille et Léa', H.agents.actesDepuis(['camille', 'lea'], t0), false);
    H.agents.noter('camille', 'outil ecrire', { cible: 'conversation', resultat: 'ok' });
    v('⛔ écrire n\'est pas un acte', H.agents.actesDepuis(['camille', 'lea'], t0), false);
    H.agents.noter('lea', 'outil prendre', { cible: 'conversation', resultat: 'refuse', detail: 'doublon' });
    v('⛔ …un acte REFUSÉ non plus', H.agents.actesDepuis(['camille', 'lea'], t0), false);
    H.agents.noter('lea', 'outil prendre', { cible: 'conversation', resultat: 'ok' });
    v('un « prendre » réussi est un acte, pour l\'une des deux seulement…', [H.agents.actesDepuis(['camille', 'lea'], t0), H.agents.actesDepuis(['camille', 'max'], t0)], [true, false]);
    v('…et il ne compte que DEPUIS le début de l\'alternance', H.agents.actesDepuis(['lea'], H.horloge.t + 5000), false);
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
