// RECONTRÔLE ADVERSE du tour 4 « entreprise » (18 novembre 2026) : la correction « tenir un créneau en option ÉCRIT au planning » (mbxPeutTenir) ne doit pas laisser
// de phrase fausse AILLEURS dans la chaîne : après « Proposer un créneau » SANS la case Planning, « Confirmer le créneau » (case Interventions) ne doit pas dire que « les
// deux autres options sont libérées » (il n'y en a jamais eu), et ne doit rien retirer du planning ; avec la case Planning, la phrase reste (contre-épreuve).
// Sections : a (toast de la confirmation), b (le geste « Proposer » depuis un autre rôle : technicien, secrétaire de la démonstration), c (téléphone, nuit).
// Usage : timeout 580 node …/entreprise-restes4-recontrole.js [a|b|c]. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const FERMEES = { planif:'1000', inter:'1100', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const sec = process.argv[2] || 'tout';
async function jouer(nom, o, tient, appareil, nuit) {
  const c = await D.ouvrirComme({ qui:'marc', appareil:appareil || 'mac', nuit:!!nuit });
  const p = c.p;
  await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(o) }); await L.calme(p, 500);
  await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
  const r = await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; let cible = null;
    for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelector('.hacts [data-hote^="ml:creneau"]')) { cible = m.getAttribute('data-id'); break; } }
    if (!cible) return { cible:null };
    o.querySelector('.hacts [data-hote^="ml:creneau"]').click(); await new Promise(z => setTimeout(z, 900));
    const env = o.querySelector('#cSend'); if (!env) return { cible, sansCompose:true };
    const sub = o.querySelector('#cSub'); if (sub && !sub.value) { sub.value = 'Créneaux proposés'; sub.dispatchEvent(new Event('input', { bubbles:true })); }
    env.click(); const m0 = mlDe(cible) || mlDe(cible.split(':').pop()); for (let k = 0; k < 40 && !(m0.attente && m0.attente.prop); k++) await new Promise(z => setTimeout(z, 250));
    const m = mlDe(cible) || mlDe(cible.split(':').pop());
    for (let k = 0; k < 60 && !MAILS.find(x => x.cren && x.cren.orig === m.id); k++) await new Promise(z => setTimeout(z, 250));
    const rep = MAILS.find(x => x.cren && x.cren.orig === m.id); if (!rep) return { cible, sansReponse:true };
    const av = BUREAU.filter(b => b.option).length, nbInt = INTS.length; const avRef = DROITS_REFUS.length;
    try { courrierAgir('mbx:confcren|' + rep.id, { id:rep.id }); } catch (e) { return { cible, erreur:String(e) }; }
    await new Promise(z => setTimeout(z, 500));
    const t = document.getElementById('toast'); const toast = t ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const refus = DROITS_REFUS.length - avRef;
    return { cible, av, ap:BUREAU.filter(b => b.option).length, toast, creationOuverte:typeof CREA !== 'undefined' && !!CREA, refus, tenus:rep.cren.tenus }; });
  try { await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes4rc/confirm-' + (tient ? 'avec' : 'sans') + '-' + (appareil || 'mac') + (nuit ? '-nuit' : '') + '.png', false); } catch (e) {}
  console.log('  mesure :', JSON.stringify(r));
  v(`${nom} : population (message de créneau trouvé, réponse du client arrivée, confirmation lancée)`, !!r.cible && !r.sansCompose && !r.sansReponse && !r.erreur && typeof r.av === 'number', r);
  v(`${nom} : « tenus » = ${tient}`, r.tenus === tient, r);
  if (tient) { v(`${nom} : 3 options avaient été tenues, la confirmation libère les deux autres (${r.av} → ${r.ap}) ; celle du créneau choisi attend la création (tour 6)`, r.av === 3 && r.ap === 1, r); v(`${nom} : le toast dit « options libérées »`, /options sont libérées/.test(r.toast), r.toast); }
  else { v(`${nom} : aucune option au planning avant ni après (${r.av} → ${r.ap})`, r.av === 0 && r.ap === 0, r); v(`${nom} : le toast ne parle PAS d'options libérées (il n'y en a jamais eu)`, r.toast && !/option/.test(r.toast), r.toast); }
  v(`${nom} : la confirmation ouvre bien la création d'intervention`, r.creationOuverte === true, r);
  await L.fin(c);
}
(async () => {
  if (sec === 'tout' || sec === 'a') { await jouer('a1 Boîte mail + Interventions(créer), Planning en Voir seul', { ...FERMEES, com:'1110' }, false);
    await jouer('a2 + Planning (contre-épreuve)', { ...FERMEES, com:'1110', planif:'1110' }, true); }
  if (sec === 'tout' || sec === 'c') { await jouer('c1 iPhone nuit, sans Planning', { ...FERMEES, com:'1110' }, false, 'iphone', true);
    await jouer('c2 petit 320, sans Planning', { ...FERMEES, com:'1110' }, false, 'petit', false); }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
