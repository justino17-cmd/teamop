/* ⛔ CE QUE CE FICHIER GARDE — « @TOUS FAITES-MOI UN POINT DE VOTRE JOURNÉE MERCI » (28 octobre 2026, 17 h 52, capture de la Tour).
   Justin écrivait cette phrase dans « Équipe TeamOP » et recevait « Victor a atteint sa limite de messages par heure : sa prochaine réponse viendra dans l'heure » ; plus haut, « Ce fil a atteint la limite de messages
   d'agents par heure ». Les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js`, `cerveau.js` (établi `banc-autonomie.js`), un faux Anthropic qui compte les appels et garde chaque requête.
   Le scénario est joué de bout en bout :
     · SEIZE réponses (quinze agents, brèves, une fois chacune) + la synthèse de Victor, en dernier ; au plus 17 messages d'agents et 18 appels ;
     · AUCUNE ligne « limite » dans le fil, AUCUNE cascade (une réponse qui cite un collègue ne le réveille pas) ;
     · la synthèse de Victor voit TOUTES les réponses, ET la demande d'origine reste dans la fenêtre qu'il lit ;
     · une réponse de tous : 300 caractères, sans outil, sans réflexion ; « RAS » ne s'écrit pas ;
     · un second @tous juste après ne trouve aucun plafond ; un message qui ne cite personne ne réveille que Victor ;
     · le budget de la racine n'est jamais atteint par un @tous normal. */
'use strict';
const { monter, rep, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3114 · « @tous faites-moi un point de votre journée merci » ──');
(async () => {
  const EQ = require(S('agent-equipe.js'));
  const DEMANDE = '@tous faites-moi un point de votre journée merci';
  const sansVictor = H => H.REG.filter(id => id !== 'victor');

  console.log('\n1. Le scénario de la capture, de bout en bout');
  {
    const vues = [];
    const H = monter({ script: (t) => {
      vues.push(t.id);
      if (t.id === 'victor') return rep('Synthèse : tout avance, rien ne bloque. Rien pour toi aujourd’hui.');
      /* chaque réponse cite un collègue ET dépasse 300 caractères : ni la citation ni la longueur ne doivent passer */
      return rep('Point de ' + t.id + ' : j’ai traité mes tâches du jour. @camille @lea tenez-vous prêts. ' + 'Détail '.repeat(80));
    } });
    const r = await H.justin('equipe', DEMANDE);
    const ms = (await H.messages('equipe')), ag = ms.filter(m => H.REG.includes(m.de));
    v('(population) la demande de Justin est au fil, avec seize agents en brouillon', [ms.filter(m => m.de === 'justin').length, H.REG.length], [1, 16]);
    v('⛔ SEIZE réponses d\'agents au fil : les quinze, puis Victor', [ag.length, ag.map(m => m.de).sort(), ag[ag.length - 1].de], [16, H.REG.slice().sort(), 'victor']);
    v('⛔ SEIZE appels à Claude, ni un de plus (aucune cascade), Victor le dernier', [H.appels.length, H.appels[H.appels.length - 1].id], [16, 'victor']);
    vrai('…au plus 17 messages d\'agents et 18 appels (la borne de la conception)', ag.length <= 17 && H.appels.length <= 18);
    vrai('⛔ AUCUNE ligne « limite » ni « par heure » dans le fil (la phrase de la capture)', !ms.some(m => /limite|par heure/i.test(m.texte)), ms.filter(m => m.de === 'systeme').map(m => m.texte));
    vrai('…aucune ligne du système du tout (population : nul agent à l\'arrêt, nul refus)', ms.filter(m => m.de === 'systeme').length === 0, ms.filter(m => m.de === 'systeme').map(m => m.texte));
    vrai('⛔ une réponse qui cite des collègues ne les réveille PAS (la cascade qui tuait le budget)', vues.length === 16 && vues.filter(x => x === 'camille').length === 1 && vues.filter(x => x === 'lea').length === 1, vues.join(','));
    vrai('…chaque réponse est brève : 300 caractères au plus (population : le faux Claude en a écrit plus de 600)', ag.filter(m => m.de !== 'victor').every(m => m.texte.length <= 300) && ag.filter(m => m.de !== 'victor').length === 15, ag.map(m => m.texte.length).join(','));
    const t0 = H.appels.find(a => a.id === 'lea'), tv = H.appels.find(a => a.id === 'victor');
    v('⛔ la réponse de tous : AUCUN outil, pas de réflexion, 400 jetons au plus (une réponse brève coûte peu)', [t0.requete.tools, t0.requete.thinking, t0.requete.max_tokens], [[], { type: 'disabled' }, 400]);
    vrai('…et le prompt dit « UNE fois », « n\'utilise aucun outil », « RAS »', /Réponds UNE fois/.test(t0.system) && /aucun outil/.test(t0.system) && /RAS/.test(t0.system));
    const lu = tv.messages.map(m => m.content).join('\n');
    vrai('⛔ la synthèse de Victor LIT les quinze réponses (chacune, avec le nom de son auteur)', sansVictor(H).every(id => lu.includes('Point de ' + id + ' :')), sansVictor(H).filter(id => !lu.includes('Point de ' + id + ' :')).join(','));
    vrai('⛔ …ET la demande d\'origine de Justin est toujours dans ce qu\'il lit (la fenêtre de quinze l\'aurait chassée : seize messages)', /faites-moi un point de votre journée/.test(lu), lu.slice(0, 200));
    vrai('…avec les outils, la réflexion et le complément « tu es le chef d\'équipe… synthèse de cinq lignes »', tv.requete.tools.includes('assigner') === false && tv.requete.tools.includes('ecrire') && tv.requete.thinking.type === 'adaptive' && /synthèse de cinq lignes/.test(tv.system), JSON.stringify(tv.requete));
    const racine = H.conv.racine(r.corps.message.id);
    vrai('le budget de la racine n\'est PAS atteint (16 messages sur 40 ; moins de 4 $)', racine && racine.messages === 16 && racine.usd < 4 && racine.vaste === true, JSON.stringify(racine));
    vrai('(population) chaque message d\'agent porte la racine de Justin', ag.every(m => H.registre().find(x => x.id === m.id).racine === r.corps.message.id));
    H.nettoyer();
  }

  console.log('\n2. « RAS » ne s\'écrit pas ; un @tous de plus ne trouve aucun plafond');
  {
    let n = 0;   // un texte neuf à chaque appel : le doublon de 24 h (gardé) refuserait deux réponses identiques
    const H = monter({ script: (t) => (t.id === 'noah' || t.id === 'lola') ? rep('RAS') : t.id === 'victor' ? rep('Synthèse numéro ' + (++n) + ' : le reste a répondu.') : rep('Mon point ' + (++n) + ' : ' + t.id + ' est à jour.') });
    await H.justin('equipe', DEMANDE);
    let ag = (await H.messages('equipe')).filter(m => H.REG.includes(m.de));
    v('Noah et Lola répondent « RAS » : rien d\'écrit pour eux, mais ils ont été appelés', [ag.length, ag.some(m => m.de === 'noah' || m.de === 'lola'), H.appels.length], [14, false, 16]);
    await H.justin('equipe', '@tous un second point, juste après');
    await H.justin('equipe', '@tous et un troisième');
    ag = (await H.messages('equipe')).filter(m => H.REG.includes(m.de));
    const sys = (await H.messages('equipe')).filter(m => m.de === 'systeme');
    v('⛔ trois @tous de suite : quarante-deux réponses (14 × 3), 48 appels, aucun refus', [ag.length, H.appels.length, sys.length], [42, 48, 0]);
    H.nettoyer();
  }

  console.log('\n3. Un message qui ne cite personne ne réveille que Victor ; deux cités ne font pas une vague');
  {
    const H = monter({ script: (t) => rep('Réponse de ' + t.id + '.') });
    await H.justin('equipe', 'Où en est-on ?');
    v('sans citer personne : Victor seul, un appel', H.appels.map(a => a.id), ['victor']);
    const n = H.appels.length;
    await H.justin('equipe', '@lea @max une question pour vous deux');
    v('deux cités : ces deux-là seulement, chacun son tour, avec outils et réflexion (ce n\'est pas un @tous)', [H.appels.slice(n).map(a => a.id).sort(), H.appels[n].requete.tools.length > 0, H.appels[n].requete.thinking.type], [['lea', 'max'], true, 'adaptive']);
    v('…et leurs réponses ne portent pas la marque d\'une vague', H.registre().filter(m => m.de === 'lea' || m.de === 'max').every(m => !m.tous), true);
    H.nettoyer();
  }

  console.log('\n4. La cible d\'un @tous : seuls les agents allumés répondent, les autres sont DITS une fois');
  {
    const H = monter({ modes: { noah: 'arret', lola: 'arret', sarah: 'arret' }, script: (t) => rep('Point de ' + t.id + '.') });
    await H.justin('equipe', DEMANDE);
    const ms = await H.messages('equipe');
    v('treize réponses (les trois à l\'arrêt se taisent), 13 appels', [ms.filter(m => H.REG.includes(m.de)).length, H.appels.length], [13, 13]);
    v('…et UNE ligne du système par agent à l\'arrêt (comme avant : « allume-le »)', ms.filter(m => m.de === 'systeme').map(m => /à l’arrêt/.test(m.texte)), [true, true, true]);
    H.nettoyer();
  }

  console.log('\n5. `destinataires` (pur) : la réponse à un @tous ne réveille personne');
  {
    const D = EQ.destinataires;
    const cl = ['camille', 'lea', 'hugo'];
    v('une réponse marquée « tous » qui cite des collègues : personne', D({ de: 'camille', prof: 1, mentions: ['lea', 'hugo'], tous: true }, { membres: cl }), []);
    v('la même sans la marque : les cités', D({ de: 'camille', prof: 1, mentions: ['lea', 'hugo'] }, { membres: cl }), ['lea', 'hugo']);
    v('la profondeur permise par la racine (6) : le message de profondeur 5 réveille, celui de 6 non', [D({ de: 'camille', prof: 5, mentions: ['lea'] }, { membres: cl, profMax: 6 }).length, D({ de: 'camille', prof: 6, mentions: ['lea'] }, { membres: cl, profMax: 6 }).length], [1, 0]);
    v('sans racine (profMax absent), la borne reste 3', [D({ de: 'camille', prof: 2, mentions: ['lea'] }, { membres: cl }).length, D({ de: 'camille', prof: 3, mentions: ['lea'] }, { membres: cl }).length], [1, 0]);
    v('une valeur hors forme ou excessive de profMax ne dépasse jamais 6', [D({ de: 'camille', prof: 6, mentions: ['lea'] }, { membres: cl, profMax: 99 }).length, D({ de: 'camille', prof: 2, mentions: ['lea'] }, { membres: cl, profMax: 'x' }).length, D({ de: 'camille', prof: 3, mentions: ['lea'] }, { membres: cl, profMax: 0 }).length], [0, 1, 0]);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
