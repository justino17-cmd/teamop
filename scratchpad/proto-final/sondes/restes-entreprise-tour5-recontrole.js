// RECONTRÔLE ADVERSE des restes « entreprise », tour 5 (19 novembre 2026). Ce que le correcteur a joué à Mac et iPhone nuit, on le rejoue AILLEURS et on cherche ce que ses corrections ont cassé à côté :
//  s1  « Confirmer le créneau » : les trois phrases du toast (options libérées / laissées à un collègue / aucune option) sur petit 320, android et iPad, jour et nuit — le toast doit TENIR dans l'écran
//      (rectangle dans la fenêtre, texte non coupé) et dire vrai ; la fenêtre « Nouvelle intervention » reste ouverte derrière.
//  s2  les quatre gestes d'écriture nouvellement nommés (rembourseNote, transfertok, trfannul, pdx|piece) joués par les VRAIES personnes de la démonstration (marc, julie, sm, kb) : l'administrateur n'est
//      jamais refusé, et chaque refus d'une autre personne tombe sur une case qu'elle n'a vraiment pas (rien de refusé « en trop » : un refus sans case manquante est un défaut).
//  s3  le planning après le geste de B : l'option d'A reste dessinée sur le créneau où B vient de créer l'intervention — on regarde ce que ça donne à l'écran (capture), jour et nuit.
//  s4  « Voir seul » partout : tous les verbes de lecture déclarés (sortie, rangc, secv, v, reglages) passent, et AUCUN verbe d'écriture connu de la table n'a glissé en lecture (population comptée).
// Usage : PARTIE=s1|s2|s3|s4 timeout 580 node …/restes-entreprise-tour5-recontrole.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes5-recontrole/';
require('fs').mkdirSync(CAP, { recursive:true });
const PARTIE = process.env.PARTIE || process.argv[2] || 's1';
const FERMEES = { planif:'1000', inter:'1100', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', achats:'1000', temps:'1000' };
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});

/* propose trois créneaux depuis le premier message qui l'offre, laisse le client répondre, rend l'id de la réponse (même geste que la sonde du correcteur, pour comparer ce qui est comparable) */
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
  window.__rep = rep.id; window.__orig = m.id; return { cible, rep:rep.id, orig:m.id, tenus:rep.cren.tenus, opt:BUREAU.filter(b => b.option && b.optMail === m.id).length }; });
const CONFIRMER = async (p, qui) => p.evaluate(async (qui) => { if (typeof CREA !== 'undefined' && CREA) { try { fermerCreation(); } catch (e) { try { CREA = null; } catch (f) {} } }
  if (qui) { sessionOuvrir(qui); await new Promise(z => setTimeout(z, 600)); }
  const opt = () => BUREAU.filter(b => b.option && b.optMail === window.__orig).length, a0 = opt(); const t0 = document.getElementById('toast'); if (t0) t0.classList.remove('on');
  try { courrierAgir('mbx:confcren|' + window.__rep, { id:window.__rep }); } catch (e) { return { erreur:String(e) }; }
  await new Promise(z => setTimeout(z, 500)); const t = document.getElementById('toast');
  return { qui:acteur(), avant:a0, apres:opt(), texte:t ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : '', on:!!(t && t.classList.contains('on')), crea:typeof CREA !== 'undefined' && !!CREA }; }, qui);
const GEOM = async (p) => p.evaluate(() => { const t = document.getElementById('toast'); if (!t) return null; const r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const cache = [...t.querySelectorAll('*'), t].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').length;
  return { g:Math.round(r.left), d:Math.round(r.right), h:Math.round(r.top), b:Math.round(r.bottom), vw, vh, dedans:r.left >= -0.5 && r.right <= vw + 0.5 && r.top >= -0.5 && r.bottom <= vh + 0.5, coupe:cache, lignes:Math.round(r.height / (parseFloat(getComputedStyle(t).lineHeight) || 18)) }; });

async function s1() {
  for (const [profil, nuit] of [['petit', true], ['android', false], ['ipad', true], ['iphone', false]]) {
    const nom = `s1 ${profil}${nuit ? ' nuit' : ''}`;
    // 1) deux personnes : A tient, B confirme (options laissées), puis A confirme (options libérées)
    let c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
    await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
    await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
    await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
    const pr = await PROPOSER(c.p);
    const b = await CONFIRMER(c.p, 'zb'); const gb = await GEOM(c.p);
    await L.capture(c, CAP + `s1-B-laisse-${profil}${nuit ? '-nuit' : ''}.png`, false);
    const a = await CONFIRMER(c.p, 'za'); const ga = await GEOM(c.p);
    await L.capture(c, CAP + `s1-A-libere-${profil}${nuit ? '-nuit' : ''}.png`, false);
    console.log('  mesure', nom, JSON.stringify({ pr, b, gb, a, ga }));
    v(`${nom} : population (3 options tenues par A avant, deux personnes distinctes)`, pr.opt === 3 && pr.tenus === true && b.qui !== a.qui && !b.erreur && !a.erreur, { pr, b, a });
    v(`${nom} : B (sans Planning) : 3 → 3, toast « restent au planning », intervention ouverte`, b.avant === 3 && b.apres === 3 && /restent au planning/.test(b.texte) && !/libérées/.test(b.texte) && b.crea, b);
    v(`${nom} : le toast de B tient dans l'écran (${JSON.stringify(gb && { g:gb.g, d:gb.d, vw:gb.vw, lignes:gb.lignes })}) et n'est pas coupé`, !!gb && gb.dedans && gb.coupe === 0, gb);
    v(`${nom} : A (avec Planning) : 3 → 0, toast « libérées »`, a.avant === 3 && a.apres === 0 && /options sont libérées/.test(a.texte), a);
    v(`${nom} : le toast d'A tient dans l'écran et n'est pas coupé`, !!ga && ga.dedans && ga.coupe === 0, ga);
    v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
    // 2) personne seule, SANS la case Planning, aucune option jamais tenue : aucun mot sur les options
    c = await D.ouvrirComme({ qui:'marc', appareil:profil, nuit });
    await c.p.evaluate(D.INJECTER, { k:'zc', prenom:'Cora', nom:'Charlie', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) }); await L.calme(c.p, 600);
    await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
    const pr2 = await PROPOSER(c.p); const s = await CONFIRMER(c.p, null); const gs = await GEOM(c.p);
    await L.capture(c, CAP + `s1-seule-${profil}${nuit ? '-nuit' : ''}.png`, false);
    console.log('  mesure', nom, 'seule', JSON.stringify({ pr2, s, gs }));
    v(`${nom} seule : population (aucune option tenue sans la case Planning)`, pr2.opt === 0 && pr2.tenus === false && !s.erreur, { pr2, s });
    v(`${nom} seule : le toast ne parle d'aucune option, il dit de vérifier et créer`, !/option/.test(s.texte) && /Vérifie et crée/.test(s.texte) && s.crea, s.texte);
    v(`${nom} seule : le toast tient dans l'écran`, !!gs && gs.dedans && gs.coupe === 0, gs);
    await L.fin(c);
  }
}

async function s2() {
  const sortie = {};
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    const c = await D.ouvrirComme({ qui });
    const r = await c.p.evaluate(async () => { window.__w = 0; window.addEventListener('click', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.essaiDroits) { window.__w++; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
      const p = eqDe(acteur()), o = { qui:acteur(), admin:!!droitAdmin(p), forme:droitForme(p), g:[] };
      const toucher = (fam, verbe) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + fam, verbe + '|essai'); b.dataset.essaiDroits = '1'; document.body.appendChild(b); const w0 = __w, r0 = DROITS_REFUS.length; b.click(); b.remove(); return { fire:__w - w0, refus:DROITS_REFUS.length - r0 }; };
      for (const [fam, verbe, cat] of [['action', 'rembourseNote', 'ventes'], ['ac', 'transfertok', 'achats'], ['axa', 'trfannul', 'achats'], ['pdx', 'piece', 'stock']]) { const t = toucher(fam, verbe); const caseM = !!peut(cat, 'm', p); const g = geste(fam, verbe);
        o.g.push({ fam, verbe, cat, caseM, fire:t.fire, refus:t.refus, geste:g ? { cat:g.cat, x:g.x } : null }); }
      return o; });
    sortie[qui] = r; console.log('  mesure', JSON.stringify(r));
    v(`s2 ${qui} : population (4 gestes joués, personne identifiée)`, r.g.length === 4 && !!r.qui, r);
    if (r.admin) v(`s2 ${qui} (administrateur) : jamais refusé`, r.g.every(x => x.refus === 0 && x.fire === 1), r.g);
    else v(`s2 ${qui} (${r.forme}) : chaque refus tombe sur une case manquante (ou sur un geste réservé au bureau pour un terrain), chaque passage sur une case ouverte`, r.g.every(x => (x.refus === 1) === (!x.caseM || (x.geste && x.geste.x === 'b'))), r.g);
    v(`s2 ${qui} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
}

async function s3() {
  for (const nuit of [false, true]) {
    const c = await D.ouvrirComme({ qui:'marc', appareil:'mac', nuit });
    await c.p.evaluate(D.INJECTER, { k:'zb', prenom:'Basile', nom:'Bis', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110' }) });
    await c.p.evaluate(D.INJECTER, { k:'za', prenom:'Aline', nom:'Alpha', pd:'secr', terrain:false, cases:cases({ ...FERMEES, com:'1110', planif:'1110' }) }); await L.calme(c.p, 600);
    await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 3000);
    const pr = await PROPOSER(c.p); const b = await CONFIRMER(c.p, 'zb');
    // la création est ouverte au créneau choisi : on la valide par le vrai bouton, puis on regarde le planning de ce jour-là
    const cr = await c.p.evaluate(async () => { const f = document.getElementById('fenetre'); if (!f) return { sansFenetre:true };
      const bt = f.querySelector('[data-action="cCreer"]'); if (!bt || bt.disabled) return { pasPret:true, disabled:!!(bt && bt.disabled) };
      const n0 = INTS.length; bt.click(); await new Promise(z => setTimeout(z, 800));
      const nouv = INTS.filter(i => i.id !== 'brouillon').slice(-1)[0]; return { cree:INTS.length - n0, id:nouv && nouv.id, d:nouv && nouv.d, h:nouv && nouv.h, tech:nouv && nouv.tech, opts:BUREAU.filter(b => b.option).map(b => ({ tech:b.tech, d:b.d, h:b.h, exp:b.optExp })) }; });
    console.log('  création :', JSON.stringify(cr));
    await L.aller(c.p, 'planning'); await L.calme(c.p, 1500);
    const pl = await c.p.evaluate(async () => { const ct = document.getElementById('contenu'); const tous = [...ct.querySelectorAll('*')];
      const opt = tous.filter(e => e.children.length < 4 && /Option ·/.test(e.textContent) && e.textContent.length < 160);
      const nv = tous.filter(e => e.children.length < 6 && /Demande de devis climatisation/.test(e.textContent) && e.textContent.length < 160 && getComputedStyle(e).position === 'absolute');
      const r = e => { const b = e.getBoundingClientRect(); return { g:Math.round(b.left), h:Math.round(b.top), w:Math.round(b.width), ht:Math.round(b.height) }; };
      const cible = opt.find(e => /Claire/.test(e.textContent)); if (cible) cible.scrollIntoView({ block:'center', inline:'center' }); await new Promise(z => setTimeout(z, 400));
      return { nOpt:opt.length, nNv:nv.length, opt:opt.slice(0, 4).map(e => ({ t:e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), ...r(e) })), nv:nv.slice(0, 2).map(e => ({ t:e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), ...r(e) })) }; });
    console.log('  planning :', JSON.stringify(pl));
    await L.capture(c, CAP + `s3-planning-apres-B${nuit ? '-nuit' : ''}.png`, false);
    v(`s3${nuit ? ' nuit' : ''} : population (B a confirmé, 3 options d'A restent, l'intervention est créée)`, pr.opt === 3 && b.apres === 3 && b.crea === true && !!cr.id && cr.id !== 'brouillon' && cr.d === '2026-10-31' && cr.h === '16:00', { pr, b, cr });
    await L.fin(c);
  }
}

async function s4() {
  const c = await D.ouvrirComme({ qui:'marc' });
  const r = await c.p.evaluate(() => { const o = { lectureFams:[], ecritureEnLecture:[], n:0, nLecture:0 };
    // 1) une famille déclarée « lecture entière » (d:'l', sans liste d'écriture) ne doit porter AUCUN verbe qui écrit
    Object.entries(GESTES).forEach(([fam, E]) => { if (E.d === 'l' && !E.m && !E.c && !E.s) o.lectureFams.push(fam); });
    // 2) un verbe classé « l » dont le nom a la forme d'une écriture (GESTE_ECRITURE) : à regarder un par un
    Object.entries(GESTES_TJ).forEach(([fam, T]) => { Object.keys(T.l).forEach(verbe => { o.nLecture++; if (GESTE_ECRITURE.test(verbe)) o.ecritureEnLecture.push(fam + '|' + verbe); }); });
    o.n = Object.keys(GESTES).length; return o; });
  console.log('  mesure', JSON.stringify(r));
  v('s4 : population (la table compte des familles et des verbes de lecture)', r.n > 50 && r.nLecture > 20, r);
  v('s4 : familles « lecture entière » (sortie, rangc, secv, v attendues)', ['sortie', 'rangc', 'secv', 'v'].every(f => r.lectureFams.includes(f)), r.lectureFams);
  console.log('  verbes classés lecture à la forme d\'écriture :', r.ecritureEnLecture.join(' ') || '(aucun)');
  await L.fin(c);
}

(async () => {
  await ({ s1, s2, s3, s4 }[PARTIE])();
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
