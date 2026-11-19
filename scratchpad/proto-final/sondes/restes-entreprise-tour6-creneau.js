// RESTES « entreprise », tour 6 (19 novembre 2026), consigne a : « Confirmer le créneau » transforme CETTE option en intervention.
// L'option du créneau choisi disparaît TOUJOURS à la création de l'intervention, quelle que soit la case Planning de la personne ; les AUTRES options restent régies par la case
// (retirées à la confirmation seulement par qui a Planning en modifier). Joué à DEUX personnes (A : Planning ; B : Interventions, Planning en Voir seul), contre-épreuves :
//   c1  B confirme puis ANNULE le formulaire : rien ne bouge (3 options) ; B confirme puis crée : 3 → 2, ce sont les deux AUTRES créneaux qui restent, plus rien sur le créneau choisi ;
//       « Annuler » (le geste de la barre) rend l'option avec l'intervention retirée.
//   c2  A confirme : les deux autres options partent (3 → 1, toast « libérées »), l'option du créneau choisi part à la création (→ 0).
//   c4  A confirme puis abandonne (il ne reste que l'option du créneau choisi), B confirme : le toast ne parle d'aucune option « tenue par un collègue » (il n'en reste aucune d'AUTRE), B crée : plus rien.
//   c3  une personne seule SANS Planning, aucune option tenue : rien à retirer, pas d'erreur, aucun mot sur les options.
// Usage : timeout 580 node …/restes-entreprise-tour6-creneau.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes6/';
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

async function c1(profil, nuit) {
  const nom = `c1 ${profil}${nuit ? ' nuit' : ''}`;
  const c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
  await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p);
  const b = await CONFIRMER(c.p, 'zb');
  // contre-épreuve : B abandonne le formulaire, l'option du créneau n'a pas à disparaître
  const ab = await c.p.evaluate(() => { try { fermerCreation(); } catch (e) { try { CREA = null; } catch (f) {} } return BUREAU.filter(o => o.option && o.optMail === window.__orig).length; });
  const b2 = await CONFIRMER(c.p, null); const cr = await CREER(c.p);
  const pil = await c.p.evaluate(async () => { const n = pile.length; annuler(); await new Promise(z => setTimeout(z, 400)); return { n, apresAnnuler:BUREAU.filter(o => o.option && o.optMail === window.__orig).length, ints:INTS.filter(i => i.id !== 'brouillon').length - window.__n0 }; });
  console.log('  mesure', nom, JSON.stringify({ pr, b, ab, b2, cr, pil }));
  v(`${nom} : population (3 options tenues par A, créneau choisi connu, B sans Planning)`, pr.opt === 3 && pr.tenus === true && !!pr.choix && b.avant === 3 && !b.erreur, { pr, b });
  v(`${nom} : B confirme : 3 → 3 (rien ne part à la confirmation), le toast dit que les autres restent`, b.apres === 3 && /restent au planning/.test(b.texte) && !/libérées/.test(b.texte) && b.crea, b);
  v(`${nom} : contre-épreuve, B abandonne le formulaire : l'option du créneau est toujours là (3)`, ab === 3, ab);
  v(`${nom} : B crée l'intervention : l'option du créneau choisi disparaît (3 → 2), plus rien sur ce créneau, les deux AUTRES restent`, !!cr.id && cr.cree === 1 && cr.opts.length === 2 && cr.surChoix === 0, cr);
  v(`${nom} : l'intervention créée est bien au créneau choisi`, cr.d === pr.choix.d && cr.h === pr.choix.h && cr.tech === pr.choix.t, { cr, choix:pr.choix });
  v(`${nom} : « Annuler » rend l'option avec l'intervention retirée (2 → 3, une intervention de moins)`, pil.apresAnnuler === 3 && pil.ints === 0, pil);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
async function c2(profil, nuit) {
  const nom = `c2 ${profil}${nuit ? ' nuit' : ''}`;
  const c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); const a = await CONFIRMER(c.p, 'za'); const cr = await CREER(c.p);
  console.log('  mesure', nom, JSON.stringify({ pr, a, cr }));
  v(`${nom} : population (3 options, A avec Planning)`, pr.opt === 3 && a.avant === 3 && !a.erreur, { pr, a });
  v(`${nom} : A confirme : les deux AUTRES partent (3 → 1), toast « libérées »`, a.apres === 1 && /autres options sont libérées/.test(a.texte), a);
  v(`${nom} : A crée : l'option du créneau choisi part aussi (→ 0)`, !!cr.id && cr.opts.length === 0 && cr.surChoix === 0, cr);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
async function c3(profil, nuit) {
  const nom = `c3 ${profil}${nuit ? ' nuit' : ''}`;
  const c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
  await c.p.evaluate(D.INJECTER, { k:'zs', prenom:'Sam', nom:'Seul', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  // personne seule : on pose la réponse du client SANS option (comme si la proposition était partie sans la case Planning)
  const pr = await PROPOSER(c.p);
  await c.p.evaluate(() => { for (let k = BUREAU.length - 1; k >= 0; k--) if (BUREAU[k].option) BUREAU.splice(k, 1); const r = MAILS.find(x => x.id === window.__rep); r.cren.tenus = false; });
  const s = await CONFIRMER(c.p, 'zs'); const cr = await CREER(c.p);
  console.log('  mesure', nom, JSON.stringify({ pr, s, cr }));
  v(`${nom} : population (aucune option tenue)`, s.avant === 0 && !s.erreur && s.crea, { pr, s });
  v(`${nom} : aucun mot sur les options dans le toast`, !/option/.test(s.texte) && /Vérifie et crée/.test(s.texte), s.texte);
  v(`${nom} : la création passe, rien à retirer, aucune option fantôme`, !!cr.id && cr.opts.length === 0, cr);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
async function c4(profil, nuit) {
  const nom = `c4 ${profil}${nuit ? ' nuit' : ''}`;
  const c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
  await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
  await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
  await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
  const pr = await PROPOSER(c.p); const a = await CONFIRMER(c.p, 'za');   /* A libère les deux autres, puis abandonne le formulaire (CONFIRMER le referme) */
  const b = await CONFIRMER(c.p, 'zb'); const cr = await CREER(c.p);
  console.log('  mesure', nom, JSON.stringify({ pr, a, b, cr }));
  v(`${nom} : population (A a libéré les deux autres : 3 → 1, B arrive avec une seule option restante, celle du créneau)`, pr.opt === 3 && a.apres === 1 && b.avant === 1 && !b.erreur && b.crea, { pr, a, b });
  v(`${nom} : le toast de B ne dit PAS que des options d'un collègue restent (il ne reste que celle que l'intervention remplace)`, !/option/.test(b.texte) && /Vérifie et crée/.test(b.texte), b.texte);
  v(`${nom} : B crée : l'option du créneau part, plus rien au planning pour cette proposition`, !!cr.id && cr.opts.length === 0 && cr.surChoix === 0, cr);
  v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);
}
(async () => {
  await c1('mac', false); await c1('iphone', true); await c2('mac', false); await c2('android', true); await c3('mac', false); await c4('mac', false);
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
