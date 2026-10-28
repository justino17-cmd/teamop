/* ⛔ CE QUE CE FICHIER GARDE — « @TOUS » À 17 H 52 : LES RÉVEILS FINISSENT DANS LES 45 MINUTES APRÈS LA FERMETURE, PAS PLUS (28 octobre 2026).
   Justin a écrit à 17 h 52 : l'équipe ferme à 18 h. Un échange né AVANT la fermeture ne se coupe pas au milieu d'une réponse ; il finit dans les 45 minutes qui suivent. Passé ce délai, ou pour un échange né
   APRÈS la fermeture, rien ne change : « hors des heures de travail », dit une fois.
   Les VRAIS `agents.js` + `agents-horaires.js` (l'horloge est injectée : mercredi 28 octobre 2026, heure d'hiver — Paris = UTC + 1), `conversations.js`, `agent-equipe.js`, `cerveau.js` ; un faux Anthropic.
     · l'agent qui répond après 18 h le fait SOUS `sousRacine` : il agit, MAIS `peutAgir` rend `horsHeures:true` — la même chose que l'astreinte — donc toute porte qui écrit à un client le refuse encore ;
     · à 18 h 37 (45 min après 17 h 52) et au-delà : plus de tolérance ;
     · une racine née après la fermeture ne donne rien ; l'arrêt, la pause et le budget restent bloquants.
   Modules joués : server/agent-equipe.js, server/agents.js, server/agents-horaires.js. */
'use strict';
const { monter, rep, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3122 · « @tous » à 17 h 52 : les réveils finissent dans les 45 minutes après la fermeture ──');
(async () => {
  const MIN = 60 * 1000;
  const T1752 = Date.UTC(2026, 9, 28, 16, 52, 0);   // 17 h 52 à Paris (CET)
  const T1800 = Date.UTC(2026, 9, 28, 17, 0, 0);   // 18 h 00 à Paris : l'heure de la fermeture
  const T1930 = Date.UTC(2026, 9, 28, 18, 30, 0);   // 19 h 30 à Paris
  const DEMANDE = '@tous faites-moi un point de votre journée merci';
  const parHeure = (H, t) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(t);
  const astreinte = ['max', 'theo'];

  console.log('\n1. Les horaires du banc : 17 h 52 ouvert, 18 h 20 fermé');
  {
    const H = monter({ horaires: true, t0: T1752, script: () => rep('Ok.') });
    v('à 17 h 52 Paris, Léa travaille ; à 18 h 20, non', [H.agents.peutAgir('lea').ok, (() => { H.horloge.t = T1752 + 28 * MIN; return H.agents.peutAgir('lea'); })().raison], [true, 'hors_heures']);
    v('(population) l\'heure du banc est bien celle de Paris', parHeure(H, T1752), '17:52');
    v('⛔ sous `sousRacine`, la même Léa à 18 h 20 AGIT… mais le dit (horsHeures) : les portes qui écrivent à un client la refusent', H.agents.sousRacine(() => H.agents.peutAgir('lea')), { ok: true, mode: 'brouillon', horsHeures: true, racine: true });
    v('…et hors de `sousRacine`, rien n\'a changé', H.agents.peutAgir('lea'), { ok: false, raison: 'hors_heures', prochaineOuverture: H.agents.peutAgir('lea').prochaineOuverture });
    v('Léa travaillait-elle à 17 h 52 ? à 18 h 20 ?', [H.agents.ouvertA('lea', T1752), H.agents.ouvertA('lea', T1752 + 28 * MIN)], [true, false]);
    H.nettoyer();
  }

  console.log('\n2. Justin écrit à 17 h 52 : les réveils qui tombent après 18 h finissent');
  {
    let n = 0, H = null;
    H = monter({ horaires: true, t0: T1752, script: (t) => {
      n++;
      if (n === 3) H.horloge.t = T1800 + 20 * MIN;           // 18 h 20 : 28 minutes après la demande de Justin — l'équipe a fermé en cours de route
      return t.id === 'victor' ? rep('Synthèse : la journée est close, tout est à jour.') : rep('Mon point ' + n + ' : ' + t.id + ' a terminé.');
    } });
    await H.justin('equipe', DEMANDE);
    const ms = await H.messages('equipe'), ag = ms.filter(m => H.REG.includes(m.de));
    v('⛔ SEIZE réponses, dont celles écrites après 18 h (le troisième appel tombe à 18 h 20)', [ag.length, H.appels.length], [16, 16]);
    vrai('(population) le banc a bien franchi la fermeture : des appels avant 18 h ET après', H.appels.some(a => a.ts < T1800) && H.appels.some(a => a.ts >= T1800), H.appels.map(a => parHeure(H, a.ts)).join(' '));
    vrai('…et aucune ligne « hors des heures de travail » (personne n\'a été refusé)', !ms.some(m => m.de === 'systeme' && /hors des heures/.test(m.texte)), ms.filter(m => m.de === 'systeme').map(m => m.texte));
    vrai('AUCUNE ligne de limite', !ms.some(m => /limite|par heure/i.test(m.texte)));
    H.nettoyer();
  }

  console.log('\n3. Passé les 45 minutes, plus de tolérance : « hors des heures », dit une fois par agent');
  {
    let n = 0, H = null;
    H = monter({ horaires: true, t0: T1752, script: (t) => {
      n++;
      if (n === 3) H.horloge.t = T1752 + 46 * MIN;           // 18 h 38 : 46 minutes après la racine
      return rep('Point ' + n + ' de ' + t.id + '.');
    } });
    await H.justin('equipe', DEMANDE);
    const ms = await H.messages('equipe'), ag = ms.filter(m => H.REG.includes(m.de));
    const hors = ms.filter(m => m.de === 'systeme' && /hors des heures de travail/.test(m.texte));
    vrai('⛔ seuls les agents réveillés AVANT 18 h 37 ont parlé (deux avant la coupure + la permanence du soir), les autres sont DITS fermés', ag.length < 16 && hors.length > 0 && ag.length + hors.length >= 14, [ag.length, hors.length].join('/'));
    vrai('…chaque agent fermé n\'est dit qu\'UNE fois', new Set(hors.map(m => m.texte)).size === hors.length);
    vrai('…l\'astreinte (Max, Théo) répond toujours : elle veille hors des heures', astreinte.every(id => ag.some(m => m.de === id)), ag.map(m => m.de).join(','));
    H.nettoyer();
  }

  console.log('\n4. Une racine née APRÈS la fermeture ne donne rien ; l\'arrêt et la pause restent bloquants');
  {
    const H = monter({ horaires: true, t0: T1930, modes: { noah: 'arret' }, script: (t) => rep('Réponse de ' + t.id + '.') });
    await H.justin('equipe', DEMANDE);
    const ms = await H.messages('equipe'), ag = ms.filter(m => H.REG.includes(m.de));
    v('⛔ Justin écrit à 19 h 30 : seuls les agents d\'astreinte répondent (Max, Théo) — et Victor, à qui personne ne refuse rien, est dit fermé', [ag.map(m => m.de).sort(), H.appels.map(a => a.id).sort()], [['max', 'theo'], ['max', 'theo']]);
    vrai('…tous les autres sont DITS fermés, une fois', ms.filter(m => m.de === 'systeme' && /hors des heures de travail/.test(m.texte)).length >= 12);
    H.nettoyer();
    const H2 = monter({ horaires: true, t0: T1752, modes: { noah: 'arret' }, script: () => rep('Ok.') });
    H2.horloge.t = T1752 + 30 * MIN;
    v('⛔ un agent à l\'ARRÊT ne parle pas, même sous une racine tolérée', H2.agents.sousRacine(() => H2.agents.peutAgir('noah')).raison, 'arret');
    v('(population) sans pause, Léa agit sous `sousRacine` après 18 h', H2.agents.sousRacine(() => H2.agents.peutAgir('lea')).ok, true);
    await H2.post('/api/monitor/agents/pause', { pause: true, motif: 'banc' });
    v('⛔ …et la PAUSE générale bloque encore tout, sous `sousRacine` comme ailleurs', H2.agents.sousRacine(() => H2.agents.peutAgir('lea')).raison, 'pause');
    H2.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
