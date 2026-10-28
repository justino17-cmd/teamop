/* ⛔ CE QUE CE FICHIER GARDE — LE BUDGET EN DOLLARS D'UNE RACINE SE COUPE AVANT L'APPEL, PAS APRÈS (28 octobre 2026).
   Avant : `reveiller` appelait Claude, PAYAIT, puis `parler` refusait la réponse (« trop_de_messages ») — Justin voyait « limite atteinte » après avoir payé un appel qui ne servirait à rien. Désormais la
   somme des `cout` rendus par `penser` est tenue par message de Justin (4 $), et `peutParler` la lit AVANT l'appel. Les VRAIS modules (établi `banc-autonomie.js`), un faux Anthropic qui rend des
   `usage` chers (1,75 $ l'appel), pour que quatre appels suffisent à atteindre 4 $.
     · la coupe est AVANT l'appel : le compteur d'appels de Claude s'arrête, ce n'est pas une réponse jetée après coup ;
     · UNE seule ligne par racine, qui dit combien de messages et quoi faire (« réécris pour le reprendre ») — jamais « limite de messages par heure » ;
     · un nouveau message de Justin ouvre un NOUVEAU budget ;
     · un redémarrage entre deux retrouve les dollars par ce que les messages ont coûté ;
     · le coût de chaque appel est bien celui des `usage` (la somme se lit sur la racine) ;
     · une relance (un second appel dans un même réveil) ne part pas si la racine est déjà close.
   Modules joués : server/agent-equipe.js, server/conversations.js, server/cerveau.js. */
'use strict';
const { monter, rep, outil, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3115 · le budget en dollars d\'une racine : la coupe est AVANT l\'appel ──');
(async () => {
  const CV = require(S('conversations.js'));
  /* 1 750 000 jetons de sortie... non : 100 000 jetons de sortie × 17,5 $/M = 1,75 $ ; l'entrée (200 jetons) ajoute 0,0007 $ */
  const CHER = { sortie: 100000, entree: 200 };
  const SIX = '@lea @max @jules @theo @nina @ines point de chacun ?';

  console.log('\n1. Six agents cités, 1,75 $ l\'appel : la racine ferme à 4 $, AVANT le quatrième appel');
  {
    let n = 0;
    const H = monter(Object.assign({ script: (t) => rep('Réponse ' + (++n) + ' de ' + t.id + '.') }, CHER));
    const r = await H.justin('equipe', SIX);
    const id = r.corps.message.id;
    const ag = (await H.messages('equipe')).filter(m => H.REG.includes(m.de));
    v('(population) la racine est vaste (six cités) : 40 messages permis — ce n\'est donc pas le compte de messages qui coupe', [H.conv.racine(id).vaste, ag.length], [true, 3]);
    v('⛔ TROIS appels à Claude, pas six : le quatrième n\'est jamais parti (la racine avait déjà dépensé plus de 4 $)', [H.appels.length, H.appels.map(a => a.id)], [3, ['lea', 'max', 'jules']]);
    const rac = H.conv.racine(id);
    vrai('…les dollars de la racine sont ceux des `usage` (3 × ~1,75 $)', rac.usd > 5.2 && rac.usd < 5.3, rac.usd);
    const sys = (await H.messages('equipe')).filter(m => m.de === 'systeme');
    v('⛔ UNE seule ligne du système, qui dit combien de messages et comment reprendre', [sys.length, /L’échange lancé par ton message est clos \(3 messages\) : réécris pour le reprendre\./.test(sys[0].texte)], [1, true]);
    vrai('…jamais « limite de messages par heure »', !sys.some(m => /limite|par heure/i.test(m.texte)));
    v('le compteur de /health voit les trois réveils supprimés (theo, nina, ines)', H.eq.refus().chaine, 3);
    /* le même échange, un autre agent le relance sous la même racine : aucun appel, aucune seconde ligne */
    const n0 = H.appels.length;
    H.conv.parler('lea', 'equipe', '@camille encore un mot', { prof: 1, racine: id });
    await H.calme();
    v('⛔ un message d\'agent de plus sous la racine close ne réveille pas Camille (aucun appel) et ne redit pas la ligne', [H.appels.length - n0, (await H.messages('equipe')).filter(m => m.de === 'systeme').length], [0, 1]);
    H.nettoyer();
  }

  console.log('\n2. Un nouveau message de Justin ouvre un nouveau budget');
  {
    let n = 0;
    const H = monter(Object.assign({ script: (t) => rep('Réponse ' + (++n) + ' de ' + t.id + '.') }, CHER));
    await H.justin('equipe', SIX);
    const n0 = H.appels.length;
    const r2 = await H.justin('equipe', '@lea @max une autre question, courte');
    v('⛔ la seconde question est servie en entier (deux appels de plus), sa racine part de zéro avant les deux réponses', [H.appels.length - n0, H.conv.racine(r2.corps.message.id).messages], [2, 2]);
    H.nettoyer();
  }

  console.log('\n3. Un redémarrage entre deux retrouve les dollars');
  {
    let n = 0;
    const H = monter(Object.assign({ script: (t) => rep('Réponse ' + (++n) + ' de ' + t.id + '.') }, CHER));
    const r = await H.justin('equipe', SIX);
    const id = r.corps.message.id;
    const avant = H.conv.racine(id).usd;
    const app2 = { get() {}, post() {}, use() {} };
    const conv2 = CV(app2, { DATA_DIR: H.D, monAdmin() {}, monPatronStrict() {}, agents: H.agents, maintenant: () => H.horloge.t });
    vrai('une seconde instance (un redémarrage) lit sur le registre les dollars de la racine', Math.abs(conv2.racine(id).usd - avant) < 0.01 && conv2.racine(id).usd > 5, [avant, conv2.racine(id).usd].join(' / '));
    v('…et ne laisse pas un agent reparler sous cette racine (close)', conv2.peutParler('theo', 'equipe', { racine: id }).raison, 'racine_close');
    H.nettoyer();
  }

  console.log('\n4. Une relance (second appel d\'un même réveil) ne part pas si la racine est close');
  {
    /* Camille répond « RAS » à Justin qui la cite : l'agent le redemande une fois — mais seulement si la racine tient encore. Un premier appel à 4,2 $ la ferme. */
    let n = 0;
    const H = monter({ entree: 200, sortie: 240000, script: (t) => rep('RAS') });
    await H.justin('equipe', '@camille tu en penses quoi de la relance à 7 jours ?');
    v('⛔ UN appel (4,2 $) puis plus rien : la redemande « Justin t\'a cité directement » n\'est pas payée sur une racine close', [H.appels.length, H.conv.racine(H.registre().filter(m => m.de === 'justin')[0].id).usd > 4], [1, true]);
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
