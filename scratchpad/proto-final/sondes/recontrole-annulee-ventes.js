// RECONTRÔLE ADVERSE (18 novembre 2026) de l'intervention ANNULÉE et du droit « Ventes › Voir » : portes que le correcteur n'avait pas rejouées.
//   A : une intervention déjà TERMINÉE (et facturée) ne s'annule pas par un clic : sinon sa facture reste en vie, son dossier disparaît de la comptabilité et la fiche dit « aucune facture »
//   B : aucune porte ne prépare une facture / n'envoie un compte rendu pour une intervention annulée (prepFacture, « dosfac », envoiMailOk)
//   C : « Rétablir » puis re-annuler : une seule notification, une seule ligne d'Historique, aucun envoi en double
//   D : sans « Ventes › Voir » (Julie), la Comptabilité ne montre aucune facture de client en dehors de ses rubriques propres, et les portes directes refusent
// PROFIL=… ⛔ 127.0.0.1 seulement. Rend « N ✓ · M ✗ ».
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
(async () => {
  let c;
  await P.sec('recontrôle annulée + ventes', async () => {
    c = await P.demarrer(); const p = c.p;
    /* ── A : annuler une intervention terminée ── */
    const A0 = await S(c, () => { const i = INTS.find(o => o.st === 'fait' && FACTURES.some(f => f.int === o.id && f.num !== '—' && f.st !== 'annulee')); if (!i) return null;
      const items = []; const o = ouvrirMenu; window.ouvrirMenu = function (x, y, t, its) { items.push(...its.filter(Boolean).map(z => z.l || z)); return o.apply(this, arguments); }; menuCarte(i.id, 100, 100); window.ouvrirMenu = o; fermerMenu();
      return { id:i.id, items, nf:FACTURES.length }; });
    v('A0 population : une intervention terminée ET facturée existe', !!A0, A0);
    if (A0) {
      v('A1 (écran) le menu d’une intervention terminée ne propose pas « Annuler l’intervention… » (elle se remet « à faire » d’abord ; une facture partie se défait par un avoir)', !A0.items.some(l => /Annuler l’intervention/.test(l)), A0.items);
      const A2 = await S(c, id => { const i = INTS.find(o => o.id === id); planConfirmer('annuler', id); const b = document.querySelector('[data-planconf="annuler|' + id + '"]'); if (b) b.click(); return { st:INTS.find(o => o.id === id).st }; }, A0.id);
      await p.waitForTimeout(400); const tA = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
      v('A2 (donnée) même forcée par la porte de derrière, une intervention terminée reste « fait »', A2.st === 'fait', A2);
      v('A3 (écran) le refus dit pourquoi (terminée, avoir)', /terminée/i.test(tA) && /avoir|à faire/i.test(tA), tA);
    }
    /* ── C : annuler, rétablir, re-annuler une intervention à venir ── */
    const id = await S(c, () => { const i = INTS.find(o => o.tech === 'sm' && o.d >= AUJ && (o.st === 'planifiee') && CLIENTS[o.cli]); return i && i.id; });
    v('C0 population : une intervention planifiée de Sophie existe', !!id, id);
    if (id) {
      const lire = () => S(c, i => ({ st:INTS.find(o => o.id === i).st, nN:NOTIFS.filter(n => /annul/i.test(n.txt) && n.txt.includes(CLIENTS[INTS.find(o => o.id === i).cli].nom)).length, nJ:JOURNAL.filter(j => JSON.stringify(j).includes(i) && /annul/i.test(JSON.stringify(j))).length, att:MVTS_ATT.length }), id);
      const a0 = await lire();
      for (let k = 0; k < 2; k++) {
        await S(c, i => { memo(); annulerInt(INTS.find(o => o.id === i)); }, id); await p.waitForTimeout(300);
        const a1 = await lire(); if (k === 0) v('C1 (donnée) 1re annulation : « annulee », 1 notification, 1 ligne d’Historique', a1.st === 'annulee' && a1.nN === a0.nN + 1 && a1.nJ === a0.nJ + 1, { a0, a1 });
        await S(c, () => { const b = [...document.querySelectorAll('#toast button, .toast button')].find(x => /Rétablir/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(300);
        const a2 = await lire(); v('C' + (2 + k) + ' (donnée) « Rétablir » n°' + (k + 1) + ' rend tout : état d’avant, notification et ligne d’Historique retirées, file d’envois intacte', a2.st === a0.st && a2.nN === a0.nN && a2.nJ === a0.nJ && a2.att === a0.att, { a0, a2 });
      }
      /* annulée pour de bon : B */
      await S(c, i => { memo(); annulerInt(INTS.find(o => o.id === i)); }, id); await p.waitForTimeout(300);
      const B = await S(c, i => { const n0 = FACTURES.length, m0 = (typeof MAILS !== 'undefined' ? MAILS.length : 0), j0 = JOURNAL.length;
        try { ACTIONS.prepFacture({ dataset:{ id:i } }); } catch (e) {} try { factureDepuis(INTS.find(o => o.id === i)); } catch (e) {} try { ACTIONS.envoiMailOk({ dataset:{ id:i } }); } catch (e) {}
        const f = INTS.find(o => o.id === i); return { st:f.st, facs:FACTURES.length - n0, mails:(typeof MAILS !== 'undefined' ? MAILS.length : 0) - m0, journal:JOURNAL.length - j0, envoye:!!fiche(i).envoye, etat:fiche(i).etat }; }, id);
      v('B1 (donnée) prepFacture / factureDepuis / envoiMailOk sur une intervention annulée : aucune facture, aucun courriel, aucune ligne « compte rendu envoyé », fiche non « envoyée »', B.facs === 0 && B.mails === 0 && !B.envoye && B.st === 'annulee', B);
      /* changer la personne / la date d'une annulée ne la ressuscite pas */
      const R = await S(c, i => { const o = INTS.find(x => x.id === i); poser(o, '', o.d, o.h); const a = o.st; o.st = 'annulee'; return a; }, id);
      v('B2 (donnée) « Changer de personne » sur une annulée (personne) ne la remet pas « à planifier »', R === 'annulee', R);
      await S(c, i => { const o = INTS.find(x => x.id === i); if (o.st !== 'annulee') o.st = 'annulee'; }, id);
    }
    /* ── D : sans « Ventes › Voir » ── */
    const D0 = await S(c, () => { const j = eqDe('julie'); j.droits.cats.ventes = Object.assign({}, j.droits.cats.ventes, { v:false }); return { v:peut('ventes', 'v', j), compta:!!(j.droits.cats.compta && j.droits.cats.compta.v) }; });
    v('D0 population : Julie n’a plus « Ventes › Voir » mais a « Comptabilité › Voir »', D0.v === false && D0.compta === true, D0);
    await P.passer(c, 'julie', 'comptabilite'); await p.waitForTimeout(500);
    const tabs = ['ensemble', 'cloture', 'paiements', 'caisse', 'enligne', 'banque', 'fachats', 'ndf', 'fournisseurs', 'balance'];
    const res = {};
    for (const o of tabs) { await S(c, o => { try { cxAller(o); } catch (e) {} }, o); await p.waitForTimeout(350); res[o] = net(await txt(c, '#contenu')); }
    const FUITE = /Préparée, sans numéro|Comptes clients|Factures & avoirs|Par intervention/;   /* les numéros FAC- dans Paiements, Caisse, Banque et Clôture sont ceux de l'argent reçu et du rapprochement : c'est la Comptabilité, pas la rubrique Ventes (voir le compte rendu) */
    for (const o of tabs) v('D1-' + o + ' (écran) l’onglet « ' + o + ' » ne montre aucune facture de client ni rubrique de Ventes', !FUITE.test(res[o]), (res[o].match(FUITE) || [])[0] + ' · ' + res[o].slice(0, 160));
    const portes = await S(c, () => { const r = {}; for (const h of ['devis', 'factures', 'facture-x-' + FACTURES[0].id, 'contrats', 'encaissements']) { try { aller(h); } catch (e) {} r[h] = route; } return r; });
    v('D2 (donnée) les adresses #devis, #factures, une fiche facture, #contrats, #encaissements ne s’ouvrent pas', Object.entries(portes).every(([h, r]) => !/^(devis|factures|facture|contrats|encaissements)$/.test(r)), portes);
    await cap(c, 'recontrole-ventes-' + P.PROFIL);
  });
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
