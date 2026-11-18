// RESTES « entreprise », tour 4 (18 novembre 2026) : « Proposer un créneau » / « Proposer une visite » tient les créneaux en OPTION au planning (BUREAU) — c'est une écriture au planning.
// Sans la case Planning (modifier), la réponse part (c'est un courriel) mais rien n'est bloqué, ET aucun texte ne dit « tenu en option » (statut du message, journal, note du choix du client).
// Avec la case Planning, l'ancien comportement reste entier (contre-épreuve : 3 options, « tenus en option » partout).
// Usage : timeout 580 node …/entreprise-restes4-creneaux.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes4/';
const FERMEES = { planif:'1000', inter:'1000', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
(async () => {
  for (const [nom, o, tient] of [['Boîte mail seule (Planning en Voir seul)', { ...FERMEES, com:'1110' }, false], ['Boîte mail + Planning (contre-épreuve)', { ...FERMEES, com:'1110', planif:'1110' }, true]]) {
    const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
    await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(o) }); await L.calme(p, 500);
    await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; let cible = null;
      for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelector('.hacts [data-hote^="ml:creneau"]')) { cible = m.getAttribute('data-id'); break; } }
      if (!cible) return { cible:null };
      const av = BUREAU.filter(b => b.option).length; const mid = cible.split(':').pop(); o.querySelector('.hacts [data-hote^="ml:creneau"]').click(); await new Promise(z => setTimeout(z, 900));
      const env = o.querySelector('#cSend'); if (!env) return { cible, sansCompose:true };
      const sub = o.querySelector('#cSub'); if (sub && !sub.value) { sub.value = 'Créneaux proposés'; sub.dispatchEvent(new Event('input', { bubbles:true })); }
      env.click(); const m0 = mlDe(cible) || mlDe(mid); for (let k = 0; k < 40 && !(m0.attente && m0.attente.prop); k++) await new Promise(z => setTimeout(z, 250));
      const m = mlDe(cible) || mlDe(mid), statut = mbxStatutTextes(m).join(' | ');
      const att0 = JSON.stringify(m.attente), mo0 = mlRep && mlRep.modele; const nbProp = m.attente && m.attente.prop ? m.attente.prop.length : 0;
      for (let k = 0; k < 60 && !MAILS.find(x => x.cren && x.cren.orig === m.id); k++) await new Promise(z => setTimeout(z, 250));   // la réponse du client arrive 4 s après l'envoi
      const rep = MAILS.find(x => x.cren && x.cren.orig === m.id); let note = null;
      if (rep) { note = mlLire(rep).sujet + ' / ' + (typeof mlLire(rep).note === 'string' ? mlLire(rep).note : ''); }
      return { att0, mo0, cible, av, ap:BUREAU.filter(b => b.option).length, statut, nbProp, tenus:JSON.parse(att0).tenus, bandeau:rep ? JSON.stringify(courrierBandeau(rep)).replace(/\s+/g, ' ').slice(0, 900) : null, reponse:!!rep, note, reptenus:rep ? rep.cren.tenus : null }; });
    try { require('fs').mkdirSync(CAP, { recursive:true }); await L.capture(c, CAP + 'creneaux-' + (tient ? 'avec' : 'sans') + '-planning.png', false); } catch (e) { console.log('  (capture : ' + e.message + ')'); }
    v(`${nom} : population (un message à « Proposer un créneau » : ${r.cible}, ${r.nbProp} créneaux proposés)`, !!r.cible && !r.sansCompose && r.nbProp >= 1, r);
    console.log('  mesure :', JSON.stringify(r));
    v(`${nom} : options au planning ${r.av} → ${r.ap}`, tient ? r.ap > r.av : r.ap === r.av, r);
    v(`${nom} : le statut du message ${tient ? 'dit « en option »' : 'ne dit pas « en option » mais « proposé »'}`, tient ? /en option/.test(r.statut) : (!/option/.test(r.statut) && /proposé/.test(r.statut)), r.statut);
    v(`${nom} : l'indicateur « tenus » du message vaut ${tient}`, r.tenus === tient, r.tenus);
    v(`${nom} : le bandeau du choix du client dit « ${tient ? 'tenus en option' : 'proposés'} »`, tient ? /tenus en option/.test(r.bandeau) : (/proposés/.test(r.bandeau) && !/option/.test(r.bandeau)), r.bandeau);
    v(`${nom} : la réponse du client est arrivée (population) et porte « tenus » = ${tient}`, r.reponse && r.reptenus === tient, r);
    await L.fin(c);
  }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
