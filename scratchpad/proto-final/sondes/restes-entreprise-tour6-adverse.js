// RECONTRÔLE ADVERSE des restes « entreprise », tour 6 (19 novembre 2026) : ce que le correctif du créneau (CREA.optCren) peut casser À CÔTÉ.
// a1  B (sans Planning) confirme puis DÉPLACE le brouillon avant de créer : où est l'intervention, que reste-t-il des options ?
// a2  le technicien du créneau est devenu absent : la confirmation est refusée par refusAbsent, que devient-on (options libérées sans formulaire ?) ?
// a3  un refus de validation (titre trop long) ne retire RIEN ; la création qui suit retire l'option.
// Rend « N ✓ · M ✗ ». 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes6-adverse/';
require('fs').mkdirSync(CAP, { recursive:true });
const FERMEES = { planif:'1000', inter:'1100', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const PROPOSER = async (p) => p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; let cible = null;
  for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelector('.hacts [data-hote^="ml:creneau"]')) { cible = m.getAttribute('data-id'); break; } }
  if (!cible) return { cible:null };
  o.querySelector('.hacts [data-hote^="ml:creneau"]').click(); await new Promise(z => setTimeout(z, 900));
  const env = o.querySelector('#cSend'); if (!env) return { cible, sansCompose:true };
  const sub = o.querySelector('#cSub'); if (sub && !sub.value) { sub.value = 'Créneaux proposés'; sub.dispatchEvent(new Event('input', { bubbles:true })); }
  env.click(); const m0 = mlDe(cible) || mlDe(cible.split(':').pop()); for (let k = 0; k < 40 && !(m0.attente && m0.attente.prop); k++) await new Promise(z => setTimeout(z, 250));
  const m = mlDe(cible) || mlDe(cible.split(':').pop());
  for (let k = 0; k < 60 && !MAILS.find(x => x.cren && x.cren.orig === m.id); k++) await new Promise(z => setTimeout(z, 250));
  const rep = MAILS.find(x => x.cren && x.cren.orig === m.id); if (!rep) return { cible, sansReponse:true };
  window.__rep = rep.id; window.__orig = m.id; window.__ch = rep.cren.choix;
  return { cible, rep:rep.id, orig:m.id, tenus:rep.cren.tenus, choix:{ t:rep.cren.choix.t, d:rep.cren.choix.d, h:rep.cren.choix.h }, opt:BUREAU.filter(b => b.option && b.optMail === m.id).length }; });
// confirme (en refermant d'abord un formulaire resté ouvert), rend l'état des options et le toast
const CONFIRMER = async (p, qui) => p.evaluate(async (qui) => { if (typeof CREA !== 'undefined' && CREA) { try { fermerCreation(); } catch (e) { try { CREA = null; } catch (f) {} } }
  if (qui) { sessionOuvrir(qui); await new Promise(z => setTimeout(z, 600)); }
  const opt = () => BUREAU.filter(b => b.option && b.optMail === window.__orig).length, a0 = opt(); const t0 = document.getElementById('toast'); if (t0) t0.classList.remove('on');
  try { courrierAgir('mbx:confcren|' + window.__rep, { id:window.__rep }); } catch (e) { return { erreur:String(e) }; }
  await new Promise(z => setTimeout(z, 500)); const t = document.getElementById('toast');
  return { qui:acteur(), avant:a0, apres:opt(), texte:t ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : '', crea:typeof CREA !== 'undefined' && !!CREA }; }, qui);
// valide le formulaire par le vrai bouton ; rend les options restantes, dont celle du créneau choisi
const CREER = async (p) => p.evaluate(async () => { const f = document.getElementById('fenetre'); const bt = f && f.querySelector('[data-action="cCreer"]'); if (!bt || bt.disabled) return { pasPret:true };
  const n0 = INTS.filter(i => i.id !== 'brouillon').length; window.__n0 = n0; bt.click(); await new Promise(z => setTimeout(z, 800)); const ch = window.__ch;
  const nouv = INTS.filter(i => i.id !== 'brouillon').slice(-1)[0];
  return { cree:INTS.filter(i => i.id !== 'brouillon').length - n0, id:nouv && nouv.id, d:nouv && nouv.d, h:nouv && nouv.h, tech:nouv && nouv.tech,
    opts:BUREAU.filter(b => b.option && b.optMail === window.__orig).map(b => b.tech + '|' + b.d + '|' + b.h),
    surChoix:BUREAU.filter(b => b.option && b.optMail === window.__orig && b.tech === ch.t && b.d === ch.d && b.h === ch.h).length }; });


async function a1() {
  const nom = 'a1 mac';
  const c = await D.ouvrirComme({ qui:'marc', appareil:'mac', nuit:false });
  await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) }); await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); const b = await CONFIRMER(c.p, 'zb');
  const dep = await c.p.evaluate(() => { const br = INTS.find(i => i.id === 'brouillon'); if (!br) return { sansBrouillon:true }; const av = { d:br.d, h:br.h, tech:br.tech }; br.h = br.h === '08:00' ? '09:00' : '08:00'; return { av, ap:{ d:br.d, h:br.h, tech:br.tech } }; });
  const cr = await CREER(c.p);
  console.log('  mesure', nom, JSON.stringify({ pr, b, dep, cr }));
  v(`${nom} : population (3 options, formulaire ouvert avec un brouillon)`, pr.opt === 3 && b.avant === 3 && !!dep.av, { pr, dep });
  v(`${nom} : intervention créée à une autre heure que le créneau choisi (déplacée à la main) — mesure : que reste-t-il ?`, !!cr.id, cr);
  console.log('  INFO a1 :', JSON.stringify({ interventionA:cr.d + ' ' + cr.h, creneauChoisi:pr.choix, optionsRestantes:cr.opts, surChoix:cr.surChoix }));
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
async function a2() {
  const nom = 'a2 mac';
  const c = await D.ouvrirComme({ qui:'marc', appareil:'mac', nuit:false });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p);
  await c.p.evaluate(() => { ABSENCES.push({ tech:window.__ch.t, du:window.__ch.d, au:window.__ch.d, type:'Congé' }); });
  const a = await CONFIRMER(c.p, 'za');
  const apres = await c.p.evaluate(() => ({ crea:typeof CREA !== 'undefined' && !!CREA, opts:BUREAU.filter(o => o.option && o.optMail === window.__orig).map(o => o.tech + '|' + o.d + '|' + o.h) }));
  console.log('  mesure', nom, JSON.stringify({ pr, a, apres }));
  v(`${nom} : population (3 options, le technicien du créneau est absent ce jour-là)`, pr.opt === 3 && a.avant === 3, { pr, a });
  v(`${nom} : refus clair (« absent »), aucun formulaire`, /absent/.test(a.texte) && !apres.crea, { a, apres });
  console.log('  INFO a2 : options restantes après refus =', JSON.stringify(apres.opts), '; toast =', a.texte);
  v(`${nom} : un refus ne retire AUCUNE option (3 restantes) — sinon les créneaux tenus disparaissent sans formulaire`, apres.opts.length === 3, apres);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
async function a3() {
  const nom = 'a3 mac';
  const c = await D.ouvrirComme({ qui:'marc', appareil:'mac', nuit:false });
  await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) }); await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); const b = await CONFIRMER(c.p, 'zb');
  const refus = await c.p.evaluate(async () => { CREA.titre = 'x'.repeat(300); const f = document.getElementById('fenetre'); const bt = f && f.querySelector('[data-action="cCreer"]'); if (!bt) return { sansBouton:true }; bt.click(); await new Promise(z => setTimeout(z, 500));
    return { crea:!!CREA, opts:BUREAU.filter(o => o.option && o.optMail === window.__orig).length, ints:INTS.filter(i => i.id !== 'brouillon').length - (window.__n0 || INTS.filter(i => i.id !== 'brouillon').length) }; });
  await c.p.evaluate(() => { CREA.titre = 'Dépannage clim'; rendreCreation(); });
  const cr = await CREER(c.p);
  console.log('  mesure', nom, JSON.stringify({ b, refus, cr }));
  v(`${nom} : titre trop long : refus, formulaire toujours ouvert, les 3 options sont toujours là`, refus.crea && refus.opts === 3, refus);
  v(`${nom} : puis création valide : l'option du créneau part (3 → 2)`, !!cr.id && cr.opts.length === 2 && cr.surChoix === 0, cr);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}

// a5 : captures À REGARDER — le toast de confirmation (le plus long : « options tenues par un collègue ») et le planning après création, Mac jour et iPhone nuit
async function a5(profil, nuit) {
  const nom = `a5 ${profil}${nuit ? ' nuit' : ''}`;
  const c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
  await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); const b = await CONFIRMER(c.p, 'zb');
  await L.capture(c, CAP + `toast-${profil}${nuit ? '-nuit' : ''}.png`);
  const bbox = await c.p.evaluate(() => { const t = document.getElementById('toast'); const r = t.getBoundingClientRect(); return { g:Math.round(r.left), d:Math.round(r.right), h:Math.round(r.height), L:innerWidth, sc:document.documentElement.scrollWidth }; });
  v(`${nom} : le toast long tient dans la largeur (${JSON.stringify(bbox)})`, bbox.g >= 0 && bbox.d <= bbox.L && bbox.sc <= bbox.L, bbox);
  const cr = await CREER(c.p); await L.aller(c.p, 'planning'); await L.calme(c.p, 1500);
  await c.p.evaluate((d) => { try { plVue = 'semaine'; plRef = d; rendre(); } catch (e) {} }, pr.choix && pr.choix.d); await L.calme(c.p, 800);
  await L.capture(c, CAP + `planning-${profil}${nuit ? '-nuit' : ''}.png`);
  v(`${nom} : population et création`, pr.opt === 3 && !!cr.id && cr.surChoix === 0, { pr, cr });
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
// a6 : créer une intervention DEPUIS le planning ne propose pas « Voir au planning » ; depuis la boîte mail, si (contre-épreuve)
async function a6() {
  const nom = 'a6 mac';
  const c = await D.ouvrirComme({ qui:'marc', appareil:'mac', nuit:false });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); await CONFIRMER(c.p, 'za');
  const ailleurs = await c.p.evaluate(async () => { document.getElementById('toast') && document.getElementById('toast').classList.remove('on'); const bt = document.getElementById('fenetre').querySelector('[data-action="cCreer"]'); if (!bt || bt.disabled) return { pasPret:true }; bt.click(); await new Promise(z => setTimeout(z, 800)); const t = document.getElementById('toast'); return { route:route, texte:t ? t.textContent.replace(/\s+/g, ' ') : '', voir:/Voir au planning/.test(t ? t.textContent : '') }; });
  v(`${nom} : population (créé depuis la boîte mail, hors planning)`, pr.opt === 3 && ailleurs.route !== 'planning' && /Intervention créée/.test(ailleurs.texte), ailleurs);
  v(`${nom} : hors du planning, « Voir au planning » est proposé`, ailleurs.voir === true, ailleurs);
  await c.p.evaluate(async () => { aller('planning'); await new Promise(z => setTimeout(z, 600)); ouvrirCreation({ cli:Object.keys(CLIENTS)[0], tid:TECHS[0] && (TECHS[0].id || TECHS[0]), d:AUJ, h:540 }); await new Promise(z => setTimeout(z, 400)); if (CREA) { CREA.titre = 'Dépannage depuis le planning'; CREA.titreTouche = true; rendreCreation(); } });
  const dedans = await c.p.evaluate(async () => { document.getElementById('toast') && document.getElementById('toast').classList.remove('on'); const f = document.getElementById('fenetre'); const bt = f && f.querySelector('[data-action="cCreer"]'); if (!bt || bt.disabled) return { pasPret:true, route:route }; bt.click(); await new Promise(z => setTimeout(z, 800)); const t = document.getElementById('toast'); return { route:route, texte:t ? t.textContent.replace(/\s+/g, ' ') : '', voir:/Voir au planning/.test(t ? t.textContent : '') }; });
  v(`${nom} : population (créé depuis le planning)`, dedans.route === 'planning' && /Intervention créée/.test(dedans.texte || ''), dedans);
  v(`${nom} : dans le planning, on ne propose pas d'aller au planning`, dedans.voir === false, dedans);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
(async () => {
  await a1(); await a2(); await a3(); await a5('mac', false); await a5('iphone', true); await a6();
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
