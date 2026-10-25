/* test-3005 — Chauffage / climatisation : le RAPPEL D'ENTRETIEN au client, à 30 jours puis à 7 jours (25 octobre 2026).
   Le VRAI bloc CVC (cvc-monter.js). La ligne d'un entretien à planifier propose « ✉️ Rappel au client » (un toucher : les données sont chiffrées, le
   serveur ne peut pas envoyer seul) ; le courriel part au client, la trace se pose sur l'appareil SEULEMENT s'il est parti, et le même rappel ne repart
   jamais ; à 7 jours, un second rappel est proposé. */
const vm = require('vm');
const { monter, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const BASE = { clients: [{ id: 'c1', nom: 'Maison Durand', email: 'durand@exemple.test', contact: 'M. Durand' }, { id: 'c2', nom: 'Sans Courriel' }],
  appareils: [{ id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', miseEnService: '2025-11-15' },
    { id: 'a2', clientId: 'c2', type: 'chaudiere_gaz', marque: 'Chaffoteaux', miseEnService: '2025-11-15' }],
  interventions: [], contrats: [] };
const mk = (today, o) => { const W = monter(Object.assign({ db: cdc(BASE), today }, o || {}));
  vm.runInContext("function socDuClient(){ return 'Alpha Chauffage'; } function rapportSociete(s){ return s+'\\n2 quai Alpha'; } function docMailOpts(s){ return {societe:s}; } var __rafr=0; function refreshEcran(){ __rafr++; }", W); return W; };
const ligne = (W, cle) => { const p = W.cvcPropositions().find(x => x.cle === cle); return p ? W.cvcLigneProposition(p, true) : ''; };
(async () => {
  { const W = mk('2026-10-25'); const L = W.cvcPropositions(); const p = L.find(x => x.clientId === 'c1');
    vrai('(population) l’entretien de la chaudière est proposé, à 21 jours de son échéance', !!p && p.kind === 'entretien' && p.j === 21, JSON.stringify(L));
    vrai('à 30 jours : étape « j30 »', W.cvcRappelEtape(p) === 'j30');
    const h = ligne(W, p.cle);
    vrai('la ligne propose « ✉️ Rappel au client »', h.includes("cvcRappelEnvoyer('" + p.cle + "')") && /Rappel au client/.test(h));
    const sansMail = L.find(x => x.clientId === 'c2');
    vrai('   un client sans e-mail : pas de bouton', !ligne(W, sansMail.cle).includes('cvcRappelEnvoyer'));
    const t = W.cvcRappelTexte(p);
    vrai('le courriel : la date, l’appareil, comment prendre rendez-vous, la signature de la société du client', /avant le 15\/11\/2026/.test(t.sujet) && /Bonjour M\. Durand,/.test(t.corps) && /Chaudière gaz · Saunier Duval/.test(t.corps) && /répondez simplement à ce message/.test(t.corps) && /Cordialement,\nAlpha Chauffage/.test(t.corps), JSON.stringify(t));
    await W.cvcRappelEnvoyer(p.cle);
    vrai('envoyer : un courriel au client, et la trace « j30 » sur l’appareil', W.__mails.length === 1 && W.__mails[0].to === 'durand@exemple.test' && JSON.stringify(W.db.appareils[0].rappels) === JSON.stringify({ '2026-11-15': ['j30'] }) && W.__saves === 1);
    vrai('   la ligne dit « rappel à 30 jours envoyé », plus de bouton', /rappel à 30 jours envoyé/.test(ligne(W, p.cle)) && !ligne(W, p.cle).includes('cvcRappelEnvoyer'));
    await W.cvcRappelEnvoyer(p.cle);
    vrai('⛔ le même rappel ne repart JAMAIS deux fois', W.__mails.length === 1 && W.__toasts.some(x => /déjà parti/.test(x)));
    W.__today = '2026-11-10';
    const p7 = W.cvcPropositions().find(x => x.clientId === 'c1');
    vrai('à 7 jours (5 jours avant) : un SECOND rappel est proposé', W.cvcRappelEtape(p7) === 'j7' && ligne(W, p7.cle).includes('cvcRappelEnvoyer'));
    await W.cvcRappelEnvoyer(p7.cle);
    vrai('   envoyé : les deux étapes sont gardées', W.__mails.length === 2 && JSON.stringify(W.db.appareils[0].rappels['2026-11-15']) === JSON.stringify(['j30', 'j7']));
  }
  { const W = mk('2026-10-25'); W.__mailOk = false; const p = W.cvcPropositions().find(x => x.clientId === 'c1');
    await W.cvcRappelEnvoyer(p.cle);
    vrai('⛔ un courriel qui ne part pas n’écrit AUCUNE trace (le bouton reste)', !W.db.appareils[0].rappels && W.__saves === 0 && ligne(W, p.cle).includes('cvcRappelEnvoyer')); }
  { const W = mk('2026-10-25'); const p = W.cvcPropositions().find(x => x.clientId === 'c1');
    await Promise.all([W.cvcRappelEnvoyer(p.cle), W.cvcRappelEnvoyer(p.cle)]);
    vrai('   deux touches rapides : un seul courriel', W.__mails.length === 1); }
  { const W = mk('2026-10-25', { droits: { 'int.ajouter': false } }); const p = W.cvcPropositions().find(x => x.clientId === 'c1');
    await W.cvcRappelEnvoyer(p.cle);
    vrai('⛔ la fonction qui envoie lit elle-même la case (planifier une intervention)', W.__mails.length === 0); }
  { const W = mk('2026-12-01'); const p = W.cvcPropositions().find(x => x.clientId === 'c1'); const t = W.cvcRappelTexte(p);
    vrai('une échéance dépassée : le courriel le dit sans dramatiser, et c’est l’étape « j7 »', W.cvcRappelEtape(p) === 'j7' && /devait être fait avant le 15\/11\/2026/.test(t.corps) && /rapidement/.test(t.sujet)); }
  { const W = mk('2027-10-25'); W.db.appareils[0].rappels = { '2026-11-15': ['j30', 'j7'] }; W.db.interventions.push({ id: 'iz', clientId: 'c1', statut: 'terminee', date: '2026-11-12', type: 'Entretien annuel chaudière', appareilIds: ['a1'] });
    const p = W.cvcPropositions().find(x => x.clientId === 'c1');
    vrai('(population) l’année suivante, la nouvelle échéance est proposée', !!p && p.date === '2027-11-12', JSON.stringify(p));
    await W.cvcRappelEnvoyer(p.cle);
    vrai('   l’échéance passée s’oublie : la fiche de l’appareil ne grossit pas', JSON.stringify(W.db.appareils[0].rappels) === JSON.stringify({ '2027-11-12': ['j30'] }), JSON.stringify(W.db.appareils[0].rappels)); }
  console.log(`\ntest-3005 : ${ok} ✓ ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
