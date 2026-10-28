/* ⛔ CE QUE CE FICHIER GARDE — LE BUDGET EN DOLLARS PAR JOUR ET PAR AGENT (28 octobre 2026, Justin : « La limite des messages, ça va pas être possible » — l'heure était un mauvais garde-fou, le dollar est le bon).
   Les VRAIS `cerveau.js`, `agents.js`, `conversations.js`, `agent-budget-jour.js` (l'établi `banc-autonomie.js`) ; seul l'appel à Anthropic est faux, il rend des `usage` qui font 1,75 $ l'appel.
     · SANS racine (un agent seul) : refus `plafond_jour` quand l'agent a dépensé max(1,50 $, 20 % de son plafond du mois), ou quand tout le « sans racine » du jour dépasse 25 $ ;
     · AVEC racine (validée par l'appelant) : exempt du plafond d'agent du jour, compté à part ;
     · LE FILET de 60 $ par jour, pour tous : `filet_jour` ;
     · le jour repart à zéro à MINUIT à Paris — alertes comprises ; le MOIS et les 195 $ ne bougent pas ;
     · à 80 % : une notification, sans ligne ; à 100 % : une ligne dans le fil privé de l'agent (une par jour) ; au filet : une ligne dans « Équipe » et une notification urgente ;
     · `etatBudget` porte le jour.
   Modules joués : server/cerveau.js, server/agent-budget-jour.js, server/agents.js. */
'use strict';
const fs = require('fs'), path = require('path');
const { monter, rep, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();

console.log('\n── 3119 · le budget du jour : plafond sans racine, exemption avec racine, filet, minuit ──');
(async () => {
  const BUDGET = require(S('agent-budget-jour.js'));
  const CHER = { script: () => rep('Ok.'), sortie: 100000, entree: 200 };   // ≈ 1,75 $ l'appel
  const SYS = 'Tu es Noah, l’agent test.', MSG = [{ role: 'user', content: 'Bonjour' }];
  /* une instance avec le VRAI gestionnaire d'alertes branché sur la messagerie */
  const neuf = (o) => { let alertes = null; const H = monter(Object.assign({}, CHER, { sansReveil: true, surBudget: x => alertes && alertes(x) }, o || {})); alertes = BUDGET({ agents: H.agents, conversations: H.conv, pousseNotif: (t, c) => { H.pousses.push([t, c]); return Promise.resolve(); }, maintenant: () => H.horloge.t }); return H; };
  const pense = (H, id, racine) => H.cerveau.penser(id, 'Tu es ' + (H.agents.AGENTS.find(a => a.id === id).nom) + ', l’agent test.', MSG, racine ? { racine: true } : {});

  console.log('\n1. Sans racine : le plafond du jour d\'un agent est max(1,50 $, 20 % de son plafond du mois)');
  {
    const H = neuf();
    const e0 = H.budget();
    v('(population) Noah : plafond du mois 5 $ -> 1,50 $ par jour ; Camille : 35 $ -> 7 $ ; Léa : 10 $ -> 2 $', [e0.jour.plafondsAgent.noah, e0.jour.plafondsAgent.camille, e0.jour.plafondsAgent.lea], [1.5, 7, 2]);
    const a = await pense(H, 'noah'), b = await pense(H, 'noah');
    v('⛔ Noah : un premier appel (1,75 $) passe, le second est refusé « plafond_jour » (1,75 $ ≥ 1,50 $)', [a.ok, b.ok, b.raison], [true, false, 'plafond_jour']);
    v('…le second n\'a PAS atteint Claude (population : un seul appel dans le faux)', H.appels.length, 1);
    const j = H.budget().jour;
    vrai('…la dépense du jour est celle des `usage` (≈ 1,75 $ côté « sans racine », rien côté racine)', Math.abs(j.parAgent.noah - 1.7507) < 0.01 && j.racine === 0 && Math.abs(j.nonRacine - j.parAgent.noah) < 1e-9, JSON.stringify(j));
    v('un autre agent n\'est pas touché (Camille : 7 $)', (await pense(H, 'camille')).ok, true);
    v('⛔ le mois, lui, compte tout (population : 3,5 $ pour Noah + Camille)', Math.abs(H.budget().total - 3.5014) < 0.01, true);
    H.nettoyer();
  }

  console.log('\n2. Avec racine : exempt du plafond d\'agent, compté à part');
  {
    const H = neuf();
    const s1 = await pense(H, 'lea'), s2 = await pense(H, 'lea'), s3 = await pense(H, 'lea');
    v('(population) Léa (plafond du jour 2 $) : deux appels sans racine passent (1,75 $ < 2 $ avant le second), le troisième est refusé', [s1.ok, s2.ok, s3.raison], [true, true, 'plafond_jour']);
    const r1 = await pense(H, 'lea', true), r2 = await pense(H, 'lea', true);
    v('⛔ Léa a épuisé son plafond sans racine : AVEC racine elle travaille encore (deux appels)', [r1.ok, r2.ok], [true, true]);
    const j = H.budget().jour;
    vrai('…et la dépense va côté « racine » (3,5 $), pas côté « sans racine » (3,5 $ aussi, mais dans l\'autre compte)', Math.abs(j.racine - 3.5014) < 0.02 && Math.abs(j.nonRacine - 3.5014) < 0.02 && Math.abs(j.total - (j.racine + j.nonRacine)) < 1e-9, JSON.stringify(j));
    v('(contre-épreuve) sans racine, elle reste refusée', (await pense(H, 'lea')).raison, 'plafond_jour');
    H.nettoyer();
  }

  console.log('\n3. Tout le « sans racine » du jour : 25 $ au plus (ici 3 $ pour le jouer)');
  {
    const H = neuf({ plafondsJour: { nonRacine: 3 } });
    const r = []; for (const id of ['lea', 'max', 'theo']) r.push((await pense(H, id)).raison || 'ok');
    v('⛔ Léa (1,75 $), Max (3,5 $ au total) puis Théo : refusé — le total sans racine a passé 3 $', r, ['ok', 'ok', 'plafond_jour']);
    v('…mais un appel avec racine passe', (await pense(H, 'theo', true)).ok, true);
    H.nettoyer();
  }

  console.log('\n4. Le filet : 60 $ par jour pour tous, racine comprise (ici 4 $)');
  {
    const H = neuf({ plafondsJour: { filet: 4 } });
    const r = []; for (let i = 0; i < 4; i++) r.push((await pense(H, ['lea', 'max', 'theo', 'nina'][i], true)).raison || 'ok');
    v('⛔ trois appels de racine (5,25 $ ≥ 4 $ après le troisième) puis « filet_jour » — même avec racine', r, ['ok', 'ok', 'ok', 'filet_jour']);
    v('…et sans racine aussi', (await pense(H, 'camille')).raison, 'filet_jour');
    const f = H.budget().jour;
    v('le filet est dans l\'état du budget', [f.filet, f.total > 4], [4, true]);
    const lignes = (await H.messages('equipe')).filter(m => m.de === 'systeme');
    v('⛔ UNE ligne dans « Équipe » (le filet est atteint, plus aucun appel avant demain), pas une par refus', [lignes.length, /filet du jour/.test(lignes[0].texte)], [1, true]);
    vrai('…et une notification URGENTE (🔴), une seule', H.pousses.filter(p => /🔴/.test(p[0])).length === 1, JSON.stringify(H.pousses));
    vrai('…les alertes à 80 % du filet : une notification « important » (3,2 $ dépassés après le deuxième appel)', H.pousses.some(p => /80 % du filet/.test(p[0])) && H.pousses.filter(p => /80 % du filet/.test(p[0])).length === 1);
    H.nettoyer();
  }

  console.log('\n5. 80 % puis 100 % du plafond d\'un agent : une notification, puis UNE ligne dans son fil privé');
  {
    const H = neuf();
    await pense(H, 'noah');   // 1,75 $ ≥ 80 % de 1,50 $ : l'alerte part
    v('⛔ à 80 % : une notification « Budget du jour : Noah à 80 % », AUCUNE ligne dans un fil', [H.pousses.filter(p => /Noah à 80 %/.test(p[0])).length, (await H.messages('noah')).length], [1, 0]);
    await pense(H, 'noah'); await pense(H, 'noah');   // refusés : 100 %
    const ms = await H.messages('noah');
    v('⛔ à 100 % : UNE ligne dans le fil PRIVÉ de Noah, de sa part, « important », qui dit le jour et « je reprends demain matin »', [ms.length, ms[0] && ms[0].de, ms[0] && ms[0].niveau, ms[0] && /budget du jour \(28\/10\/2026\)/.test(ms[0].texte) && /demain matin/.test(ms[0].texte)], [1, 'noah', 'important', true]);
    vrai('…et Justin est notifié (niveau important)', H.pousses.some(p => /Noah te parle/.test(p[0])));
    await pense(H, 'noah'); await pense(H, 'noah');
    v('trois refus de plus dans la journée : toujours UNE ligne (une alerte par agent et par jour)', (await H.messages('noah')).length, 1);
    H.nettoyer();
  }

  console.log('\n6. Minuit à Paris : le jour repart à zéro, le mois ne bouge pas');
  {
    const H = neuf({ t0: Date.UTC(2026, 9, 28, 21, 30, 0) });   // 22 h 30 à Paris
    await pense(H, 'noah');
    v('(population) 22 h 30 : Noah a atteint son plafond du jour', (await pense(H, 'noah')).raison, 'plafond_jour');
    const mois0 = H.budget().total;
    H.avance(30 * 60 * 1000);   // 23 h 00 UTC = minuit passé à Paris ? 22 h 00 UTC = 23 h Paris : pas encore
    v('23 h 00 à Paris : le jour n\'a pas changé', (await pense(H, 'noah')).raison, 'plafond_jour');
    H.avance(61 * 60 * 1000);   // 22 h 31 UTC +… = 0 h 01 à Paris le 29
    const apres = await pense(H, 'noah');
    v('⛔ après minuit à Paris : Noah travaille de nouveau (jour neuf)', [apres.ok, H.budget().jour.j], [true, '2026-10-29']);
    vrai('…le mois, lui, a continué à compter (il n\'est pas remis à zéro)', H.budget().total > mois0 && H.budget().mois === '2026-10');
    await pense(H, 'noah'); await pense(H, 'noah');
    v('…et l\'alerte du jour se ré-arme (une seconde ligne, le lendemain)', (await H.messages('noah')).length, 2);
    H.nettoyer();
  }

  console.log('\n7. Le mois et le total restent la dernière barrière (même avec racine)');
  {
    const H = neuf();
    const r = []; for (let i = 0; i < 4; i++) r.push((await pense(H, 'noah', true)).raison || 'ok');
    v('⛔ Noah (5 $ par mois) : trois appels de racine (5,25 $) puis « plafond_agent » — la racine n\'ouvre pas le MOIS', r, ['ok', 'ok', 'ok', 'plafond_agent']);
    H.nettoyer();
  }

  console.log('\n8. Un budget qui redémarre garde son jour ; un réglage hors forme garde le défaut');
  {
    const H = neuf();
    await pense(H, 'noah');
    const CER = require(S('cerveau.js'));
    const c2 = CER({ DATA_DIR: H.D, agents: H.agents, cleApi: 'k', maintenant: () => H.horloge.t, appeler: async () => ({ texte: 'x', entree: 1, sortie: 1 }), plafondsJour: { agentMin: -3, filet: 'beaucoup', nonRacine: 0 } });
    const e = c2.etatBudget();
    vrai('un second `cerveau` sur le même fichier retrouve la dépense du jour de Noah', Math.abs(e.jour.parAgent.noah - 1.7507) < 0.01, JSON.stringify(e.jour.parAgent));
    v('…et des plafonds hors forme (négatif, texte, zéro) gardent les valeurs par défaut', [e.jour.filet, e.jour.plafondNonRacine, e.jour.plafondsAgent.noah], [60, 25, 1.5]);
    H.nettoyer();
  }

  console.log('\n9. Le gestionnaire d\'alertes ne jette jamais et ne dit que des formes fermées');
  {
    const H = neuf();
    const g = BUDGET({ agents: H.agents, conversations: H.conv, pousseNotif: () => { throw new Error('boum'); }, maintenant: () => H.horloge.t });
    v('une notification qui jette ne remonte pas', [g({ type: 'alerte_jour', agent: 'noah', depense: 1, plafond: 1.5 }).fait, g(null).fait, g({ type: 'inconnu' }).fait, g({ type: 'plafond_jour', agent: 'pierre' }).fait], ['notification', 'rien', 'rien', 'rien']);
    vrai('un agent inconnu n\'écrit aucune ligne', (await H.messages('noah')).length === 0);
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
