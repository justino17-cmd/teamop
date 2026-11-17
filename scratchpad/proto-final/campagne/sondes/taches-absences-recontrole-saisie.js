// Recontrôle adverse (17 novembre 2026) : trois parcours de bout en bout d'« Absences et congés », jouées par les VRAIS gestes.
//  1. Sophie demande (vrai sélecteur de date), la retrouve, retire une demande ; Marc la voit arriver dans « À valider », l'accorde ; Sophie le lit et son solde baisse.
//  2. Marc pose une absence « difficile » : samedi-dimanche seulement (0 jour ouvré), puis sur les jours d'une demande en attente de la même personne.
//  3. Marc refuse une demande : sans motif on le lui demande, avec motif la personne le lit.
// usage : node taches-absences-recontrole-saisie.js [profil] [nuit]   — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', tag = `${profil}${nuit ? ' nuit' : ''}`;
const pick = async (c, champ, iso) => { await L.toucher(c, `#calque label:has(#${champ}) [data-dtpour]`); await L.calme(c.p, 300); const ok = await L.toucher(c, `[data-dtj="${iso}"]`); await L.calme(c.p, 300); return ok; };
const poser = async (c, o) => { const p = c.p; await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.toucher(c, '[data-anouv]'); await L.calme(p, 400);
  await p.selectOption('#an-t', o.t); await p.selectOption('#an-ty', o.ty);
  await p.evaluate(o => { const set = (id, x) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles: true }))); }; set('an-du', o.du); set('an-au', o.au); }, o); await L.calme(p, 300);
  const apercu = await p.evaluate(() => document.getElementById('an-apercu').innerText.replace(/\s+/g, ' ')), n0 = await p.evaluate(() => ABSENCES.length);
  await L.toucher(c, '[data-anouvok]'); await L.calme(p, 500);
  return { apercu, ajoutee: (await p.evaluate(() => ABSENCES.length)) === n0 + 1, toast: await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '') }; };
(async () => {
  // — parcours 1 : Sophie → Marc → Sophie —
  { const c = await L.ouvrir({ profil, nuit, qui: 'sm', hash: 'absences' }); const p = c.p; await L.calme(p, 700);
    const s0 = await p.evaluate(() => aSolde('sm', 'RTT').reste);
    await L.toucher(c, '[data-atdem]'); await L.calme(p, 400); await p.selectOption('#ad-ty', 'RTT');
    v(`${tag} · 1 : « Du » 25 nov. par le sélecteur`, await pick(c, 'ad-du', '2026-11-25')); v(`${tag} · 1 : « Au » 26 nov. par le sélecteur`, await pick(c, 'ad-au', '2026-11-26'));
    await p.evaluate(() => { const e = document.getElementById('ad-m'); e.value = 'Déménagement de ma sœur, il faut deux jours pour tout porter.'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 600);
    const d = await p.evaluate(() => JSON.parse(JSON.stringify(DEMANDES_ABS[DEMANDES_ABS.length - 1])));
    v(`${tag} · 1 : la demande part (RTT, 25 → 26 nov.)`, d.tech === 'sm' && d.du === '2026-11-25' && d.au === '2026-11-26' && d.type === 'RTT', d);
    v(`${tag} · 1 : elle se retrouve dans « Mes congés »`, /attente/i.test(await p.evaluate(() => document.getElementById('contenu').innerText)));
    await p.evaluate(() => { sessionFermer(); sessionOuvrir('marc'); aller('absences'); const t = document.getElementById('toast'); if (t) t.remove(); }); await L.calme(p, 700);
    v(`${tag} · 1 : Marc la voit dans « À valider », avec le motif`, await p.evaluate(id => { const k = document.querySelector(`[data-aok="${id}"]`); const car = k && k.closest('.a-dem'); return !!car && /Déménagement/.test(car.innerText); }, d.id));
    await p.evaluate(id => document.querySelector(`[data-aok="${id}"]`).click(), d.id); await L.calme(p, 600);
    v(`${tag} · 1 : l'accord pose l'absence de Sophie`, await p.evaluate(() => ABSENCES.some(a => a.tech === 'sm' && a.du === '2026-11-25' && a.au === '2026-11-26')));
    await p.evaluate(() => { sessionFermer(); sessionOuvrir('sm'); aller('absences'); const t = document.getElementById('toast'); if (t) t.remove(); }); await L.calme(p, 700);
    const s1 = await p.evaluate(() => aSolde('sm', 'RTT').reste); v(`${tag} · 1 : son solde RTT baisse de 2 jours (${s0} → ${s1})`, Math.abs(s0 - s1 - 2) < 0.01, [s0, s1]);
    v(`${tag} · 1 : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  // — parcours 2 : saisies difficiles du gérant —
  { const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'absences' }); const p = c.p; await L.calme(p, 700);
    const r = await poser(c, { t: 'tl', ty: 'Congé payé', du: '2026-11-14', au: '2026-11-15' });
    v(`${tag} · 2 : une absence de samedi-dimanche (0 jour ouvré) n'est pas enregistrée sans un mot — la demande du technicien la refuse déjà`, !r.ajoutee || /week|travaill|rien à poser/i.test(r.apercu + r.toast), r);
    const dem = await p.evaluate(() => JSON.parse(JSON.stringify(DEMANDES_ABS.find(x => x.tech === 'tl' && x.etat === 'attente'))));
    v(`${tag} · 2 : population : Tom a une demande en attente`, !!dem);
    if (dem) { const r2 = await poser(c, { t: 'tl', ty: 'Maladie', du: dem.du, au: dem.au });
      v(`${tag} · 2 : poser une absence sur les jours d'une demande en attente de la même personne est dit ou refusé (sinon la demande, une fois accordée, double l'absence)`, !r2.ajoutee || /demande/i.test(r2.apercu + r2.toast), r2); }
    v(`${tag} · 2 : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  // — parcours 3 : refuser —
  { const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'absences' }); const p = c.p; await L.calme(p, 700);
    const d = await p.evaluate(() => JSON.parse(JSON.stringify(DEMANDES_ABS.find(x => x.etat === 'attente' && x.tech === 'kb'))));
    await p.evaluate(id => document.querySelector(`[data-anon="${id}"]`).click(), d.id); await L.calme(p, 400);
    await L.toucher(c, '[data-anouvok], [data-anonok]'); await L.calme(p, 400);
    v(`${tag} · 3 : refuser sans motif demande le motif (la demande reste)`, await p.evaluate(id => DEMANDES_ABS.some(x => x.id === id) && !!document.querySelector('#calque .panneau'), d.id));
    await p.fill('#calque textarea', 'Trop de monde absent cette semaine-là, on en reparle ?'); await L.toucher(c, '[data-anonok]'); await L.calme(p, 500);
    v(`${tag} · 3 : avec un motif, la demande est refusée`, await p.evaluate(id => !DEMANDES_ABS.some(x => x.id === id && x.etat === 'attente'), d.id));
    await p.evaluate(() => { sessionFermer(); sessionOuvrir('kb'); aller('absences'); const t = document.getElementById('toast'); if (t) t.remove(); }); await L.calme(p, 700);
    v(`${tag} · 3 : Karim lit le refus et son motif`, await p.evaluate(() => /refus/i.test(document.getElementById('contenu').innerText) && /Trop de monde/.test(document.getElementById('contenu').innerText)));
    v(`${tag} · 3 : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
