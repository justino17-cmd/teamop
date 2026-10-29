/* CE QUE JUSTIN VOIT QUAND UN BUDGET DU JOUR SE REMPLIT (28 octobre 2026) — le pendant, côté messagerie, du budget du jour de `cerveau.js`.
 *
 * Justin : « La limite des messages, ça va pas être possible. » Il n'y a plus de limite de messages contre lui ; il y a un budget en DOLLARS, par jour, et ce fichier dit ce qui doit se voir quand il se
 * remplit — rien d'autre :
 *   · 80 % du plafond d'un agent (appels sans racine) : une NOTIFICATION « important », sans ligne dans un fil ;
 *   · 100 % : UNE ligne dans le fil PRIVÉ de l'agent, de sa part (niveau « important » : Justin est notifié), avec le jour dans le texte — elle ne se répète donc pas dans la journée (le doublon de 24 h)
 *     et se redit le lendemain ;
 *   · 80 % du filet de 60 $ : une notification « important » ;
 *   · le FILET (60 $, tous appels confondus) : UNE ligne dans « Équipe » (une fois par jour) et une notification « urgent ».
 * ⛔ Tout est composé ICI, à partir de NOMBRES et d'un identifiant d'agent du registre : jamais un texte venu d'ailleurs. Les dépendances sont INJECTÉES, et une panne de notification ne remonte
 *    jamais vers `cerveau.js` (le budget se tient quoi qu'il arrive).
 */
'use strict';
const { parisParties } = require('./agents-horaires');

module.exports = function alertesBudget(ctx) {
  const { agents, conversations } = ctx || {};
  const pousse = ctx && typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  const nom = id => ((agents && Array.isArray(agents.AGENTS) ? agents.AGENTS : []).find(a => a.id === id) || {}).nom || '';
  const dollars = x => (typeof x === 'number' && Number.isFinite(x) ? x : 0).toFixed(2).replace('.', ',') + ' $';
  const notifier = (titre, corps) => { if (!pousse) return; try { Promise.resolve(pousse(titre, corps, '/tour.html#agents')).catch(() => {}); } catch (e) {} };
  /* le jour de PARIS (comme `cerveau.js`) : à 0 h 01 le 29, la ligne du 28 ne se redirait pas, et le lendemain n'aurait pas la sienne */
  const jourDe = () => { const p = parisParties(typeof ctx.maintenant === 'function' ? ctx.maintenant() : Date.now()); return p.annee + '-' + String(p.mois).padStart(2, '0') + '-' + String(p.jour).padStart(2, '0'); };

  /* `x` : ce que `cerveau` dit — `{type, agent?, depense?, plafond?, total?, filet?}`. Rend ce qui a été fait (pour les bancs), jamais ne jette. */
  return function surBudget(x) {
    try {
      if (!x || typeof x !== 'object') return { fait: 'rien' };
      if (x.type === 'alerte_jour' && nom(x.agent)) {
        notifier('Budget du jour : ' + nom(x.agent) + ' à 80 %', nom(x.agent) + ' a dépensé ' + dollars(x.depense) + ' sur ' + dollars(x.plafond) + ' aujourd’hui (appels sans message de Justin).');
        return { fait: 'notification' };
      }
      if (x.type === 'plafond_jour' && nom(x.agent) && conversations && typeof conversations.parler === 'function') {
        const r = conversations.parler(x.agent, x.agent, 'J’ai atteint mon budget du jour (' + jourDe().split('-').reverse().join('/') + ') : je reprends demain matin. Ce que tu m’écris reste toujours servi.', { niveau: 'important', prof: 1 });
        return { fait: 'ligne', ok: !!(r && r.ok), raison: r && r.raison };
      }
      if (x.type === 'alerte_filet') {
        notifier('Budget du jour : 80 % du filet', 'L’équipe a dépensé ' + dollars(x.total) + ' sur ' + dollars(x.filet) + ' aujourd’hui.');
        return { fait: 'notification' };
      }
      if (x.type === 'filet_jour') {
        let r = null;
        if (conversations && typeof conversations.systeme === 'function') r = conversations.systeme('equipe', 'Le filet du jour (' + dollars(x.filet) + ') est atteint : plus aucun appel à Claude avant demain matin, pour personne. Rien n’est perdu.', { cle: 'filet:' + jourDe(), unique: true });
        notifier('🔴 Budget du jour : filet atteint', 'L’équipe a dépensé ' + dollars(x.total) + ' aujourd’hui : plus aucun appel avant demain matin.');
        return { fait: 'ligne+notification', ok: !!(r && r.ok), raison: r && r.raison };
      }
    } catch (e) { console.error('alerte de budget :', e && e.message); }
    return { fait: 'rien' };
  };
};
