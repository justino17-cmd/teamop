/* ══ OP MESSAGES — « ME LE RAPPELER » DEUX FOIS POUR LE MÊME MESSAGE NE CRÉE PAS DEUX ÉVÉNEMENTS (testeur « conversations@8 », 17 octobre 2026) ═══════════════════
   Deux touches identiques sur « Dans 1 heure », pour le même message, posaient deux événements « Rappel : On se fait un ciné ? » dans l'Agenda. Le rappel garde le CHEMIN
   vers son message (`source: { conv, seq }`) : on s'en sert pour reconnaître le même rappel. Le même message, à la même heure (à 5 minutes près : « Dans 1 heure » touché
   deux fois à deux minutes d'écart reste le même choix), non coché → « Déjà dans ton agenda », rien n'est créé. ⛔ Ce qui n'est PAS un doublon reste permis : le même message
   à une AUTRE heure (deux rappels voulus), un autre message, un rappel déjà coché « fait ». Et une relecture de l'agenda qui échoue ne bloque pas un rappel.

   Ce banc EXÉCUTE la vraie `rappelPoser` avec une source factice qui note ses appels (`creerEvenement`, `evenements`) et un agenda qui garde ce qu'on y pose. */
const T = require('./outils-navigation-msg');
const { v, vrai, fin } = T.compteur();
const C = 'c_' + 'a'.repeat(32);
const MIN = 60000;

function monter(opts) {
  const o = Object.assign({ lecture: 'ok' }, opts || {});
  const dispo = n => { try { T.fonction(n); return true; } catch (e) { return false; } };
  const consts = (T.PAGE.match(/  const rappelsEnVol = \[\], RAPPEL_PROCHE_MS = [^\n]*\n/) || [''])[0];
  const M = T.monter({
    avec: ['rappelPoserSuite', 'rappelPoser'].filter(dispo),
    pre: consts + `
      const T0 = Math.ceil(Date.now() / 60000) * 60000 + 3600000;
      const choix = { '1h': { cle: '1h', nom: 'Dans 1 heure', t: T0, tz: 'Europe/Paris' }, '3h': { cle: '3h', nom: 'Dans 3 heures', t: T0 + 2 * 3600000, tz: 'Europe/Paris' } };
      const rappelChoix = () => Object.values(choix);
      const MOI = { id: 'u1' }; const nomAuteur = () => 'Ben'; const nomConv = () => 'Ana et Ben';
      etat.convDonnees = { id: '${C}', type: 'direct', admins: [] }; etat.conversations = [];
      const agenda = []; const appels = { creer: 0, lire: 0 }; const dits = [];
      const source = {
        async creerEvenement(champs) { appels.creer++; const e = { id: 'e_' + appels.creer, debut: Date.parse(champs.debut + 'Z') || T0, fait: null, source: champs.source || null }; agenda.push(e); return e; },
        async evenements(du, au) { appels.lire++; if (${o.lecture === 'panne'}) throw new Error('hors ligne'); return agenda.filter(e => e.debut < au && e.debut + 15 * 60000 > du); },
      };
      const localDans = (t) => new Date(t).toISOString().slice(0, 16); const heureDans = () => '10:00';
      const modesActifs = () => false; const coteDe = () => 'perso';
      const mot = s => dits.push(['mot', s]); const avis = s => dits.push(['avis', s]); const phrase = (e, d) => d; const chargerReunions = () => {};
      this.T0 = T0; this.agenda = agenda; this.appels = appels; this.dits = dits; this.choix = choix;
      `,
  });
  return M;
}
const msg = (seq, texte) => ({ id: 'm' + seq, seq, auteur: 'u2', texte: texte || 'On se fait un ciné ?', t: Date.now() });

(async () => {
  {
    const M = monter(); M.etat.route = { vue: 'messages', conv: C };
    const m = msg(7);
    await M.ctx.rappelPoser(m, '1h');
    v('(population) le premier rappel est posé : un événement, rattaché à son message', [M.ctx.appels.creer, M.ctx.agenda[0] && M.ctx.agenda[0].source], [1, { conv: C, seq: 7 }]);
    const dit1 = M.ctx.dits.slice();
    await M.ctx.rappelPoser(m, '1h');
    v('« Me le rappeler » une SECONDE fois pour le même message, à la même heure : rien n\'est créé', M.ctx.appels.creer, 1);
    v('… la personne le lit : « Déjà dans ton agenda »', M.ctx.dits.slice(dit1.length), [['mot', 'Déjà dans ton agenda']]);
    /* le même choix touché un peu plus tard : « Dans 1 heure » glisse avec l'horloge */
    M.ctx.choix['1h'].t += 2 * MIN;
    await M.ctx.rappelPoser(m, '1h');
    v('le même choix relatif deux minutes plus tard (l\'heure a glissé) : toujours le même rappel', M.ctx.appels.creer, 1);
    /* ce qui n'est PAS un doublon */
    await M.ctx.rappelPoser(m, '3h');
    v('le même message à une AUTRE heure (3 heures) : un second rappel voulu, il est posé', M.ctx.appels.creer, 2);
    await M.ctx.rappelPoser(msg(8, 'Autre message'), '1h');
    v('un AUTRE message à la même heure : posé', M.ctx.appels.creer, 3);
    M.ctx.agenda[0].fait = Date.now();
    M.ctx.choix['1h'].t = M.ctx.T0;
    await M.ctx.rappelPoser(m, '1h');
    v('le rappel de ce message déjà coché « fait » : on peut en reposer un', M.ctx.appels.creer, 4);
  }
  {
    const M = monter({ lecture: 'panne' }); M.etat.route = { vue: 'messages', conv: C };
    await M.ctx.rappelPoser(msg(7), '1h');
    v('(population) l\'agenda est illisible : la relecture a bien été tentée', M.ctx.appels.lire >= 1, true);
    v('… une relecture qui échoue ne bloque pas le rappel : il est posé', M.ctx.appels.creer, 1);
  }
  {
    /* deux demandes dans le même instant (la première n'est pas encore revenue) : une seule est posée */
    const M = monter(); M.etat.route = { vue: 'messages', conv: C };
    const m = msg(7);
    await Promise.all([M.ctx.rappelPoser(m, '1h'), M.ctx.rappelPoser(m, '1h')]);
    v('deux touches dans le même instant (la première n\'a pas encore répondu) : UN seul événement', M.ctx.appels.creer, 1);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });
