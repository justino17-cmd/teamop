// LE TECHNICIEN FAIT SON MÉTIER : avec les droits d'un technicien (Sophie), les gestes de SA journée ne sont jamais refusés (terminer, noter, photographier, signer, « Je ne peux pas finir », noter un paiement sur place,
// prendre et déclarer dans son camion, faire une demande, une note de frais, pointer, signaler une erreur d'heures, ses tâches) ; ceux du bureau le sont (décider d'un achat, inviter, facturer, envoyer un devis, valider le
// stock des autres, clore le pointage d'un autre, retirer du stock — mais « Annuler » sur SON propre envoi est libre). Le témoin est posé après la garde et coupe la propagation. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const PERMIS = [['action', 'terminer'], ['action', 'noteOk'], ['action', 'pieceAjout'], ['action', 'noteSuppr'], ['action', 'photoSuppr'], ['action', 'sigEfface'], ['action', 'pasFini'], ['action', 'envoiePb'], ['action', 'ajoutEncOk'], ['action', 'ajoutEnc'], ['action', 'envoyer'],
  ['champ', 'trouve'], ['champ', 'compte'], ['champ', 'debut'], ['mat', 'ajoute'], ['mat', 'pris'], ['mat', 'oublie'], ['mat', 'manque'], ['axa', 'dem'], ['axa', 'demok'], ['axa', 'tickok'], ['rl', 'ndfok'], ['rl', 'ndfmodok'], ['axa', 'demannul'], ['rl', 'ndfsuppr'],
  ['ptx', 'debut'], ['ptx', 'termineok'], ['ptx', 'sigok'], ['ptx', 'plustotok'], ['ptx', 'finhierok'], ['tkxs', 'add'], ['tajout', '1'], ['tfait', 't1'], ['rg', 'ok'],
  ['mat', 'retire']];   /* « Annuler » sur SON envoi : geste libre voulu de la technicienne (la table GESTES le dit) — il était compté parmi ceux du bureau, sonde périmée (restes entreprise, tour 6) */
const REFUSE = [['ac', 'refuser'], ['ac', 'commande'], ['axa', 'toutval'], ['eq', 'inviter'], ['eqx', 'desactok'], ['action', 'nouvelleFacture'], ['action', 'creerContrat'], ['dv', 'envoyer'], ['sx', 'toutval'], ['ms', 'toutacc'], ['pt', 'clore'], ['ptx', 'corrige'], ['ent', 'identok'], ['cx', 'payer'], ['vh', 'nouveau']];
(async () => {
  const c = await ouvrirComme('sm');
  const r = await c.p.evaluate(([P, R]) => { window.__w = 0; window.addEventListener('click', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.essaiDroits) { window.__w++; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    const toucher = (fam, verbe) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + fam, verbe + '|essai'); b.dataset.essaiDroits = '1'; document.body.appendChild(b); const w0 = __w, r0 = DROITS_REFUS.length; b.click(); b.remove(); return { fire:__w - w0, refus:DROITS_REFUS.length - r0 }; };
    return { qui:acteur(), forme:droitForme(eqDe(acteur())), permis:P.map(([f, v]) => [f + '|' + v, toucher(f, v)]), refuse:R.map(([f, v]) => [f + '|' + v, toucher(f, v)]) }; }, [PERMIS, REFUSE]);
  v('on joue bien Sophie, en forme « terrain »', r.qui === 'sm' && r.forme === 'terrain', r.qui + ' ' + r.forme);
  const mal = r.permis.filter(([, t]) => !(t.fire === 1 && t.refus === 0)).map(([k, t]) => k + ' ' + JSON.stringify(t));
  v(`ses ${PERMIS.length} gestes de métier ne sont jamais refusés`, mal.length === 0, mal);
  const mal2 = r.refuse.filter(([, t]) => !(t.fire === 0 && t.refus === 1)).map(([k, t]) => k + ' ' + JSON.stringify(t));
  v(`les ${REFUSE.length} gestes du bureau sont refusés (témoin muet, refus compté)`, mal2.length === 0, mal2);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
