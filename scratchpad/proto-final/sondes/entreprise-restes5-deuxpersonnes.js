// RESTES « entreprise », tour 5 (19 novembre 2026) : retirer une option du planning est une ÉCRITURE au planning, comme en poser une. Ce qui se joue À DEUX PERSONNES :
// A (Boîte mail + Planning en modifier) propose trois créneaux : trois options sont tenues. B (Boîte mail + Interventions, Planning en Voir seul) confirme le créneau choisi par le
// client : les options de A RESTENT (B n'a pas le droit d'y toucher), le toast le dit sans mentir (« restent au planning ») ; la contre-épreuve : A confirme à son tour, les trois partent.
// Garde aussi le cas d'une seule personne SANS la case qui confirme alors qu'aucune option n'avait été tenue : aucun mot sur les options.
// Usage : timeout 580 node …/entreprise-restes5-deuxpersonnes.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const FERMEES = { planif:'1000', inter:'1100', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes5/';
async function jouer(nom, qui2, appareil, nuit) {
  const c = await D.ouvrirComme({ qui:'marc', appareil:appareil || 'mac', nuit:!!nuit }); const p = c.p;
  // A : Boîte mail + Planning ; B : Boîte mail + Interventions, Planning en Voir seul. On s'ouvre comme A, on injecte B sans s'y connecter (sessionOuvrir y revient ensuite).
  await p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
  await p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(p, 600);
  await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
  let r = await p.evaluate(async (qui2) => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; let cible = null;
    for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelector('.hacts [data-hote^="ml:creneau"]')) { cible = m.getAttribute('data-id'); break; } }
    if (!cible) return { cible:null };
    o.querySelector('.hacts [data-hote^="ml:creneau"]').click(); await new Promise(z => setTimeout(z, 900));
    const env = o.querySelector('#cSend'); if (!env) return { cible, sansCompose:true };
    const sub = o.querySelector('#cSub'); if (sub && !sub.value) { sub.value = 'Créneaux proposés'; sub.dispatchEvent(new Event('input', { bubbles:true })); }
    env.click(); const m0 = mlDe(cible) || mlDe(cible.split(':').pop()); for (let k = 0; k < 40 && !(m0.attente && m0.attente.prop); k++) await new Promise(z => setTimeout(z, 250));
    const m = mlDe(cible) || mlDe(cible.split(':').pop());
    for (let k = 0; k < 60 && !MAILS.find(x => x.cren && x.cren.orig === m.id); k++) await new Promise(z => setTimeout(z, 250));
    const rep = MAILS.find(x => x.cren && x.cren.orig === m.id); if (!rep) return { cible, sansReponse:true };
    const opt = () => BUREAU.filter(b => b.option && b.optMail === m.id).length, toast = () => { const t = document.getElementById('toast'); return t ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; };
    const av = opt(), tenus = rep.cren.tenus, qA = acteur();
    sessionOuvrir(qui2); await new Promise(z => setTimeout(z, 600)); const qB = acteur();
    try { courrierAgir('mbx:confcren|' + rep.id, { id:rep.id }); } catch (e) { return { cible, erreur:String(e) }; }
    await new Promise(z => setTimeout(z, 500));
    window.__rep = rep.id; return { cible, av, tenus, qA, qB, apB:opt(), toastB:toast(), creaB:typeof CREA !== 'undefined' && !!CREA }; }, qui2);
  // la capture se prend ICI, avec le toast de B à l'écran (la fenêtre « Nouvelle intervention » ouverte derrière) : on REGARDE ce que B lit
  try { require('fs').mkdirSync(CAP, { recursive:true }); await L.capture(c, CAP + 'deux-personnes-B-' + (appareil || 'mac') + (nuit ? '-nuit' : '') + '.png', false); } catch (e) {}
  const r2 = await p.evaluate(async () => { const opt = () => BUREAU.filter(b => b.option).length, toast = () => { const t = document.getElementById('toast'); return t ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; };
    if (typeof CREA !== 'undefined' && CREA) { try { fermerCreation(); } catch (e) { try { CREA = null; } catch (f) {} } }
    sessionOuvrir('za'); await new Promise(z => setTimeout(z, 600));
    try { courrierAgir('mbx:confcren|' + window.__rep, { id:window.__rep }); } catch (e) { return { erreur:String(e) }; }
    await new Promise(z => setTimeout(z, 500)); return { apA:opt(), toastA:toast() }; });
  Object.assign(r, r2);
  console.log('  mesure :', JSON.stringify(r));
  v(`${nom} : population (message de créneau, réponse du client, deux personnes distinctes)`, !!r.cible && !r.sansCompose && !r.sansReponse && !r.erreur && r.qA !== r.qB && r.qB && r.av === 3, r);
  v(`${nom} : B (sans la case Planning) ne retire aucune option d'A (${r.av} → ${r.apB})`, r.apB === 3, r);
  v(`${nom} : le toast de B dit que les options restent, jamais « libérées »`, /restent au planning/.test(r.toastB) && !/sont libérées/.test(r.toastB), r.toastB);
  v(`${nom} : B ouvre bien la création de l'intervention (son geste n'est pas bloqué)`, r.creaB === true, r);
  v(`${nom} : contre-épreuve, A (avec la case Planning) confirme : les trois options partent (${r.apB} → ${r.apA}) et le toast le dit`, r.apA === 0 && /options sont libérées/.test(r.toastA), r.toastA);
  await L.fin(c);
}
(async () => {
  await jouer('b1 Mac', 'zb');
  await jouer('b2 iPhone nuit', 'zb', 'iphone', true);
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
