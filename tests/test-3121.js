/* ⛔ CE QUE CE FICHIER GARDE — LES POINTS DE LA JOURNÉE ET LE SUIVI DES TÂCHES (28 octobre 2026, Justin : « faites-moi un point de votre journée » ; « Tout le monde fait tout et rien en même temps »).
   Les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js`, `agent-victor.js`, `plateforme-etat.js`, `cerveau.js` (établi `banc-autonomie.js`) ; un faux Anthropic qui GARDE ce qu'il reçoit.
     · chaque rôle reçoit « Ton journal du jour » — des NOMBRES du serveur (tâches terminées, en cours, demandes déposées, refus) : Emma, Sarah, Lola et Noah n'avaient AUCUN fait et répondaient « RAS » ou
       inventaient ; ces nombres sont ceux de `agents.bilan`, et rien d'autre ;
     · Victor reçoit « Journée de l'équipe » (les seize, compilée par le code) : il fait le point SANS réveiller personne, même quand des agents sont à l'arrêt ;
     · le jour est celui de PARIS : ce qui a été terminé hier n'est pas « aujourd'hui » ;
     · le suivi : une tâche prise sans mouvement depuis quatre heures est relancée UNE fois, dans UN message groupé qui cite trois titulaires au plus, jamais Hugo ni Margaux par « @ ».
   Modules joués : server/agent-equipe.js, server/agent-victor.js, server/agents.js. */
'use strict';
const { monter, rep, outil, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3121 · les points de la journée et le suivi ──');
(async () => {
  const HEURE = 3600 * 1000;

  console.log('\n1. `agents.bilan` : des nombres, du jour de Paris');
  {
    const H = monter({ script: () => rep('Ok.') });
    v('un agent qui n\'a rien fait : tout à zéro', H.agents.bilan('noah'), { terminees: 0, echouees: 0, enCours: 0, propositions: 0, acceptees: 0, refus: 0 });
    H.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-111111' }); H.agents.terminer(H.agents.prendre('emma').id, 'emma', 'ok', 'fait');
    H.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-222222' }); H.agents.terminer(H.agents.prendre('emma').id, 'emma', 'echec', 'non');
    H.agents.consigner('justin', 'emma', 'Préparer le planning de la semaine');
    H.agents.proposer('emma', 'publier', 'Une publication', { canal: 'instagram', brouillon: 'abc123' });
    H.agents.noter('emma', 'quelque chose', { cible: 'x', resultat: 'refuse' });
    v('Emma : une tâche terminée, une échouée, une en cours, une demande déposée, un refus', H.agents.bilan('emma'), { terminees: 1, echouees: 1, enCours: 1, propositions: 1, acceptees: 0, refus: 1 });
    v('(population) elle n\'est pas la seule : Noah n\'a toujours rien', H.agents.bilan('noah').terminees, 0);
    v('un inconnu : null', H.agents.bilan('pierre'), null);
    H.avance(14 * HEURE);   // 0 h 00 UTC = 1 h à Paris le lendemain : un jour neuf
    v('⛔ le lendemain (minuit passé à Paris) : le jour a changé — plus rien de terminé « aujourd\'hui », la tâche en cours reste', [H.agents.bilan('emma').terminees, H.agents.bilan('emma').echouees, H.agents.bilan('emma').enCours, H.agents.bilan('emma').propositions], [0, 0, 1, 0]);
    H.nettoyer();
  }

  console.log('\n2. Chaque rôle reçoit son journal — Emma, Sarah, Lola, Noah compris');
  {
    const H = monter({ script: (t) => rep('Mon point (' + t.id + ').') });
    H.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-111111' }); H.agents.terminer(H.agents.prendre('emma').id, 'emma', 'ok', 'fait');
    for (const id of ['emma', 'sarah', 'lola', 'noah']) await H.justin(id, 'Ton point de la journée ?');
    const par = id => H.appels.find(a => a.id === id).system;
    v('⛔ Emma : « tâches terminées 1 » — son journal, pas une invention', /Ton journal du jour[^\n]*tâches terminées 1 ; échouées 0 ; en cours 0/.test(par('emma')), true);
    v('⛔ Sarah, Lola, Noah (aucun fait jusqu\'ici) : un journal à zéro, nommé', ['sarah', 'lola', 'noah'].map(id => /Ton journal du jour[^\n]*tâches terminées 0 ; échouées 0 ; en cours 0/.test(par(id))), [true, true, true]);
    v('…et le bloc Faits le dit : aucun fait client, mais le journal du jour', ['emma', 'sarah', 'lola', 'noah'].map(id => /aucun fait n’est fourni à ton rôle — tu ne connais que ta mission et ton journal du jour/.test(par(id))), [true, true, true, true]);
    vrai('…et c\'est DU NOMBRE : aucune phrase libre (l\'activité d\'un client, un nom) n\'entre par ce bloc', ['emma', 'sarah', 'lola', 'noah'].every(id => /Ton journal du jour[^\n]*\.\n/.test(par(id) + '\n') && !/@|DOS-/.test(par(id).split('Ton journal du jour')[1].split('\n')[0])));
    H.nettoyer();
  }

  console.log('\n3. Victor fait le point sans réveiller personne — même quand les autres sont à l\'arrêt');
  {
    const H = monter({ mode: 'brouillon', script: (t) => rep('Voici le point : rien ne bouge.') });
    H.agents.consigner('justin', 'victor', 'Suivre la relance des devis');
    H.agents.consigner('justin', 'camille', 'Reprendre le courrier');   // la tâche naît quand Camille travaille…
    for (const id of ['camille', 'lea', 'hugo', 'margaux', 'chloe', 'emma', 'max', 'jules', 'theo', 'nina', 'ines', 'louis', 'sarah', 'lola', 'noah']) await H.post('/api/monitor/agents/mode', { agent: id, mode: 'arret' });   // …puis Justin éteint tous les autres
    await H.justin('equipe', 'Victor, fais-moi un point de la journée');
    v('⛔ UN seul appel (Victor) : personne d\'autre n\'est réveillé pour faire le point', H.appels.map(a => a.id), ['victor']);
    const sv = H.appels[0].system;
    vrai('⛔ « Journée de l\'équipe » : une ligne par agent (seize), chacune avec son mode — Camille y est « (arrêt) » avec sa tâche en cours', (sv.split('Journée de l’équipe (relevé')[1].match(/^- [a-z]+ \(/gm) || []).length === 16 && /- camille \(arrêt\) : terminées 0, en cours 1/.test(sv) && /- victor \(brouillon\) : terminées 0, en cours 1/.test(sv));
    vrai('…le texte de la tâche, lui, n\'y est pas (des NOMBRES)', !/Reprendre le courrier/.test(sv.split('Journée de l’équipe (relevé')[1].split('Bloc Faits')[0]) || /Tâches en cours de l’équipe/.test(sv));
    const ligne = id => (new RegExp('^- ' + id + ' \\((\\S+)\\) : terminées (\\d+), en cours (\\d+), validations déposées (\\d+), refus (\\d+)', 'm').exec(sv.split('Journée de l’équipe (relevé')[1]) || []).slice(2).map(Number);
    v('⛔ ces nombres sont ceux de `agents.bilan` (Camille, Victor)', [ligne('camille'), ligne('victor')], [[H.agents.bilan('camille').terminees, H.agents.bilan('camille').enCours, H.agents.bilan('camille').propositions, H.agents.bilan('camille').refus], [H.agents.bilan('victor').terminees, H.agents.bilan('victor').enCours, H.agents.bilan('victor').propositions, H.agents.bilan('victor').refus]]);
    vrai('…les autres agents n\'ont reçu aucun appel, aucune ligne « à l\'arrêt » (personne n\'a été cité)', (await H.messages('equipe')).filter(m => m.de === 'systeme').length === 0);
    H.nettoyer();
  }

  console.log('\n4. Le suivi : une relance groupée, une fois par tâche, trois titulaires au plus');
  {
    const H = monter({ script: (t) => rep('Où j\'en suis (' + t.id + ') : je m\'y remets.') });
    const V = H.victor();
    for (const [vers, txt] of [['camille', 'Reprendre le courrier de la semaine'], ['lea', 'Écrire aux nouveaux inscrits'], ['hugo', 'Vérifier les paiements du mois'], ['theo', 'Vérifier les sauvegardes'], ['jules', 'Corriger l\'erreur de l\'agenda']]) { H.agents.consigner('justin', vers, txt); H.avance(60000); }
    H.avance(3 * HEURE);
    v('3 h 05 après la première : rien à suivre (moins de quatre heures)', await V.suivre(), { saute: 'rien_a_suivre' });
    H.avance(2 * HEURE);   // 5 h 10 après la première, 5 h 05 après la dernière : toutes en retard
    const n0 = H.appels.length;
    const r = await V.suivre();
    await H.calme();
    const m1 = (await H.messages('equipe')).filter(m => m.de === 'victor');
    v('⛔ UN message groupé, trois tâches (les plus anciennes : Camille, Léa, Hugo)', [r, m1.length], [{ relancees: 3 }, 1]);
    vrai('…il cite @camille et @lea par « @ » ; Hugo (l\'argent, les accès) est NOMMÉ, jamais cité', /@camille/.test(m1[0].texte) && /@lea/.test(m1[0].texte) && !/@hugo/.test(m1[0].texte) && /Hugo « Vérifier les paiements du mois »/.test(m1[0].texte), m1[0].texte);
    vrai('…avec le nombre d\'heures sans mouvement et la consigne de répondre (terminer, ou dire sur quoi ça bloque)', /\(5 h sans mouvement\)/.test(m1[0].texte) && /dites-le avec terminer/.test(m1[0].texte), m1[0].texte);
    v('⛔ Camille et Léa sont réveillées par ce message ; Hugo non', H.appels.slice(n0).map(a => a.id).sort(), ['camille', 'lea']);
    v('trop tôt (moins d\'une heure) : pas de second message', await V.suivre(), { saute: 'trop_tot' });
    H.avance(61 * 60000);
    const r2 = await V.suivre();
    await H.calme();
    const m2 = (await H.messages('equipe')).filter(m => m.de === 'victor');
    v('⛔ une heure plus tard : les DEUX tâches restantes (Théo, Jules), jamais celles déjà relancées', [r2, m2.length, /@theo/.test(m2[1].texte) && /@jules/.test(m2[1].texte) && !/@camille|@lea|Hugo/.test(m2[1].texte)], [{ relancees: 2 }, 2, true]);
    H.avance(61 * 60000);
    v('…ensuite plus rien : chaque tâche n\'est relancée qu\'UNE fois', await V.suivre(), { saute: 'rien_a_suivre' });
    vrai('(population) le passage complet de Victor fait aussi le suivi', 'suivi' in (await V.passer()));
    H.nettoyer();
  }

  console.log('\n5. Le suivi se tait quand Victor ne peut pas agir, et une tâche qui bouge n\'est pas relancée');
  {
    const H = monter({ modes: { victor: 'arret' }, script: () => rep('Ok.') });
    H.agents.consigner('justin', 'camille', 'Une tâche ancienne'); H.avance(6 * HEURE);
    v('Victor à l\'arrêt : « arret », aucun message', [(await H.victor().suivre()).saute, (await H.messages('equipe')).length], ['arret', 0]);
    const H2 = monter({ script: () => rep('Ok.') });
    H2.agents.consigner('justin', 'camille', 'Une tâche'); H2.agents.consigner('justin', 'lea', 'Une autre tâche'); H2.avance(3 * HEURE);
    H2.agents.consigner('justin', 'theo', 'Une tâche toute fraîche');
    const T = H2.agents.tachesDe('camille')[0].id;
    H2.agents.passerConsigne('victor', T, 'noah');   // un MOUVEMENT : la tâche change de main, son compteur repart
    H2.avance(2 * HEURE);
    const r = await H2.victor().suivre();
    v('⛔ la tâche passée à Noah il y a 2 h n\'est pas relancée (elle a bougé), celle de Léa l\'est ; la toute fraîche non', [r, (await H2.messages('equipe')).filter(m => m.de === 'victor').map(m => /@lea/.test(m.texte) && !/@noah|@camille|@theo/.test(m.texte))], [{ relancees: 1 }, [true]]);
    H.nettoyer(); H2.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
