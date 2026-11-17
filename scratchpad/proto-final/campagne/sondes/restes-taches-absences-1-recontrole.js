// Recontrôle adverse des restes « Tâches · Absences · Menu » (tour 1, 17 novembre 2026) : ce que les corrections de la demande du technicien
// ont laissé en place à côté — les TROIS autres formulaires de dates du gérant (« Nouvelle absence » an-, « Proposer d'autres dates » am-,
// « Modifier les dates » ax-) partagent la même règle que la demande (ad-) : « Au » suit « Du », rien un week-end, rien par-dessus une demande
// en attente de la même personne. Les corrections n'ont touché que `ad-` et `an-` (week-end, demande en attente).
// Chaque contrôle dit l'attendu ; un ✗ est un défaut RÉEL qui reste. usage : node restes-taches-absences-1-recontrole.js — « N ✓ · M ✗ », sort en 1.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil:'mac', nuit:false, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 800);
  const err = []; p.on('pageerror', e => err.push(e.message));
  const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); }, [id, x]);
  const ferme = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} const t = document.getElementById('toast'); if (t) t.classList.remove('on'); });
  const pop = await p.evaluate(() => { const we = []; for (let n = 3; n < 40; n++) { const d = new Date(jour(n) + 'T12:00:00'); if (d.getDay() === 6) { we.push(jour(n), jour(n + 1)); break; } }
    return { we, abs:ABSENCES.filter(a => a.statut === 'validee' || !a.statut).length, dem:DEMANDES_ABS.length, jours:aJours({ tech:ABSENCES[0].tech, du:we[0], au:we[1] }) }; });
  v('population : un week-end, des absences et des demandes existent, et le week-end compte 0 jour ouvré', pop.we.length === 2 && pop.abs > 0 && pop.dem > 0 && pop.jours === 0, pop);
  // 1 — « Nouvelle absence » : « Au » suit « Du »
  await p.evaluate(() => aPanneauNouveau()); await L.calme(p, 300);
  await set('an-du', await p.evaluate(() => jour(30)));
  const n1 = await p.evaluate(() => ({ du:document.getElementById('an-du').value, au:document.getElementById('an-au').value, ap:document.getElementById('an-apercu').innerText, btn:document.querySelector('[data-anouvok]').disabled }));
  v('Nouvelle absence : « Du » après la fin par défaut → « Au » suit (comme la demande du technicien)', n1.au === n1.du && !/date de fin est avant/.test(n1.ap), n1);
  await ferme();
  // 2 — « Modifier les dates » d'une absence validée : un week-end seul, et par-dessus une demande en attente
  const ab = await p.evaluate(() => { const a = ABSENCES.find(x => DEMANDES_ABS.length && x.tech !== DEMANDES_ABS[0].tech) || ABSENCES[0]; return a.id; });
  await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), ab); await L.calme(p, 300);
  await set('ax-du', pop.we[0]); await set('ax-au', pop.we[1]);
  const x1 = await p.evaluate(() => ({ ap:document.getElementById('ax-apercu').innerText, ok:!document.querySelector('[data-axok]').disabled }));
  v('Modifier les dates : un week-end seul dit « Ces jours ne sont pas travaillés » et grise « Enregistrer »', /pas travaill/.test(x1.ap) && !x1.ok, x1);
  await p.evaluate(() => document.querySelector('[data-axok]').click()); await L.calme(p, 400);
  const x2 = await p.evaluate(id => { const a = ABSENCES.find(x => x.id === id); return { du:a.du, au:a.au, jours:aJours(a) }; }, ab);
  v('Modifier les dates : forcer le geste ne laisse pas une absence de 0 jour ouvré', x2.jours > 0, x2);
  await ferme();
  const dm = await p.evaluate(() => { const d = DEMANDES_ABS.find(x => x.etat === 'attente') || DEMANDES_ABS[0]; const a = ABSENCES.find(x => x.tech === d.tech); return { demande:d.id, tech:d.tech, abs:a && a.id, du:d.du, au:d.au }; });
  v('population : une demande en attente et une absence validée de la MÊME personne existent', !!dm.abs, dm);
  if (dm.abs) {
    await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), dm.abs); await L.calme(p, 300);
    await set('ax-du', dm.du); await set('ax-au', dm.au);
    const y1 = await p.evaluate(() => ({ ap:document.getElementById('ax-apercu').innerText, ok:!document.querySelector('[data-axok]').disabled }));
    await p.evaluate(() => document.querySelector('[data-axok]').click()); await L.calme(p, 400);
    const y2 = await p.evaluate(([id, did]) => { const a = ABSENCES.find(x => x.id === id), d = DEMANDES_ABS.find(x => x.id === did); return { absDu:a.du, absAu:a.au, demandeToujours:!!d }; }, [dm.abs, dm.demande]);
    v('Modifier les dates : déplacer une absence sur les jours d\'une demande en attente de la même personne est refusé (sinon accorder la demande double l\'absence)', !(y2.absDu === dm.du && y2.absAu === dm.au && y2.demandeToujours), { y1, y2 });
    await ferme(); }
  // 3 — « Proposer d'autres dates » : un week-end seul, « Au » qui suit « Du »
  const dd = await p.evaluate(() => (DEMANDES_ABS.find(x => x.etat === 'attente') || {}).id);
  v('population : une demande en attente à laquelle proposer d\'autres dates', !!dd, dd);
  if (dd) {
    await p.evaluate(id => aPanneauModif(DEMANDES_ABS.find(x => x.id === id)), dd); await L.calme(p, 300);
    await set('am-du', pop.we[0]); await set('am-au', pop.we[1]);
    const z1 = await p.evaluate(() => ({ ap:document.getElementById('am-apercu').innerText }));
    v('Proposer d\'autres dates : un week-end seul est signalé (« pas travaillés »)', /pas travaill/.test(z1.ap), z1);
    await p.evaluate(() => document.querySelector('[data-amodifok]').click()); await L.calme(p, 400);
    const z2 = await p.evaluate(id => { const d = DEMANDES_ABS.find(x => x.id === id); return { etat:d.etat, prop:d.prop && aJours({ tech:d.tech, ...d.prop }) }; }, dd);
    v('Proposer d\'autres dates : forcer le geste ne propose pas 0 jour ouvré', !(z2.etat === 'proposee' && z2.prop === 0), z2);
    await ferme();
    await p.evaluate(id => aPanneauModif(DEMANDES_ABS.find(x => x.id === id)), dd); await L.calme(p, 300);
    const lim = await p.evaluate(() => jour(60)); await set('am-du', lim);
    const z3 = await p.evaluate(() => ({ du:document.getElementById('am-du').value, au:document.getElementById('am-au').value, ap:document.getElementById('am-apercu').innerText }));
    v('Proposer d\'autres dates : « Du » après la fin → « Au » suit (comme la demande)', z3.au === z3.du && !/date de fin est avant/.test(z3.ap), z3);
    await ferme(); }
  v('aucune erreur JavaScript', err.length === 0, err);
  // 4 — le bureau au téléphone, Comptabilité plein écran (z-index 9000) : un message posé depuis la page (« Annuler ») reste lisible et touchable
  await L.fin(c);
  const t = await L.ouvrir({ profil:'iphone', nuit:false, qui:'julie' }); const q = t.p; await L.calme(q, 900);
  const T = await q.evaluate(() => { const z = document.getElementById('cpsys'); if (!z || z.hidden) return { ouvert:false }; toast('Essai : message posé pendant la Comptabilité', { lib:'Annuler', fn:() => {} });
    return new Promise(r => setTimeout(() => { const el = document.getElementById('toast'), b = el.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); r({ ouvert:true, on:el.classList.contains('on'), visible:!!e && (el === e || el.contains(e)), pile:e && (e.id || e.className || e.tagName) }); }, 600)); });
  v('population : le bureau au téléphone ouvre sur la Comptabilité plein écran', T.ouvert, T);
  if (T.ouvert) console.log('  · DOUTE (pas un contrôle : aucun geste réel ne pose de message de la page pendant la Comptabilité) : un message de la page posé pendant la Comptabilité plein écran est sous elle (' + JSON.stringify(T) + ')');
  await L.fin(t);

  // 5 — l'appui long dont le doigt est ANNULÉ par le système (touchcancel : l'iPhone le fait quand il prend la main) : le premier toucher d'après n'est pas avalé
  const g = await L.ouvrir({ profil:'iphone', nuit:false, qui:'marc', hash:'taches' }); const h = g.p; await L.calme(h, 800);
  const G = await h.evaluate(async () => {
    const dorm = ms => new Promise(r => setTimeout(r, ms)), bar = document.querySelector('.opg-barre'); if (!bar) return { err:'pas de barre' };
    const cible = bar.querySelector('button, a'); const r = cible.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const T = el => new Touch({ identifier:7, target:el, clientX:x, clientY:y });
    cible.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true, touches:[T(cible)], targetTouches:[T(cible)], changedTouches:[T(cible)] }));
    await dorm(700); const ouverte = !!document.querySelector('#calque .panneau');
    document.dispatchEvent(new TouchEvent('touchcancel', { bubbles:true, changedTouches:[T(cible)] }));   // le système reprend le doigt : pas de touchend
    await dorm(900); fermerPanneau();
    let recu = 0; cible.addEventListener('click', ev => { recu++; ev.preventDefault(); ev.stopPropagation(); });
    document.dispatchEvent(new TouchEvent('touchend', { bubbles:true, changedTouches:[T(cible)] }));   // un toucher ordinaire, un peu plus tard : son clic arrive juste derrière
    cible.click(); await dorm(100);
    return { ouverte, recu }; });
  v('population : l\'appui long a ouvert « Ma barre »', G.ouverte === true, G);
  v('touchcancel : le premier toucher ordinaire d\'après (0,9 s plus tard) n\'est pas avalé', G.recu === 1, G);
  await L.fin(g);

  // 6 — le bouton « Menu » de la barre de la Comptabilité n'existe qu'au téléphone : ordinateur et tablette ne le voient pas
  for (const profil of ['mac', 'ipad']) { const m = await L.ouvrir({ profil, nuit:false, qui:'julie' }); await L.calme(m.p, 700);
    const M = await m.p.evaluate(() => { const z = document.getElementById('cpsys'), b = z && z.querySelector('.cpsys-menu'); return { cpsys:!!z && !z.hidden, bouton:!!b, largeur:b ? Math.round(b.getBoundingClientRect().width) : 0, W:innerWidth }; });
    v(`${profil} : le bouton « Menu » de la barre de la Comptabilité n'est pas affiché (la page a déjà son menu) — population : ${M.cpsys ? 'Comptabilité ouverte' : 'Comptabilité fermée'}`, M.largeur === 0, M); await L.fin(m); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
