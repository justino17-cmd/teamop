/* ══ LA LENTEUR, MESURÉE — ouvrir, enregistrer, ouvrir et clore une intervention, les écrans ══════════
   Justin, 26 septembre 2026 : « fais-le » (la lenteur sur une grosse base, avec un téléphone lent).
   Remplace perf-geste.js / perf-ecrans.js / profil-cpu.js, qui dépendaient de Playwright (absent de
   l'image) : même chose, par le pilote CDP maison, sans dépendance.
   Ce qu'on mesure, processeur ralenti (×4 par défaut, un téléphone de terrain) :
   A. l'OUVERTURE à froid, base déjà rangée et session mémorisée : de la navigation au premier écran
      dessiné, décomposée par une trace (analyse du HTML, compilation et exécution du script, mise en
      page, ramasse-miettes) ;
   B. save() — ce que paie CHAQUE geste — et chacune de ses étapes : estampiller, JSON.stringify,
      l'écriture synchrone dans le rangement, les pastilles du menu, la cloche (computeNotifs) ;
   C. ouvrir la fiche d'une intervention, la fermer, la CLORE (statut « terminée », save compris) ;
   D. les écrans principaux (rendreVueSure — jamais go(), qui rend plus tard : leçon de la v690) ;
   E. un profil processeur de save() et de la clôture : les fonctions qui coûtent, nommées.
   ⛔ Bêta locale (copie de beta.html, préfixe elanB_), 127.0.0.1, base SYNTHÉTIQUE (base-elan-like.js) —
   jamais app.html, jamais une donnée de client. Le réseau vers l'API est simulé (réponse immédiate) :
   on mesure le processeur, pas la 4G.
   Usage : node scratchpad/perf-lenteur.js <base.json> [ralenti=4] [étiquette]   (SOURCE=<bêta> pour une autre page) */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const BASE = process.argv[2], RALENTI = +(process.argv[3] || 4), ETIQ = process.argv[4] || '';
if (!BASE) { console.error('usage : node perf-lenteur.js <base.json> [ralenti] [étiquette]'); process.exit(2); }
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
const ms = x => (x == null || isNaN(x)) ? '—' : (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10) + ' ms';

/* Ce qui s'exécute AVANT la page, à chaque chargement : l'API répond tout de suite (sinon l'écran « connexion
   requise » et les attentes réseau brouillent la mesure), les boîtes natives disent oui, et deux repères — le
   début du document et le premier écran écrit dans #content. */
const INIT = `(() => { window.__t0 = performance.now();
  const f0 = window.fetch; window.fetch = function (u, o) { const s = String((u && u.url) || u);
    if (/api\\.teamop\\.fr|\\/api\\//.test(s)) return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    return f0.apply(this, arguments); };
  window.confirm = () => true; window.alert = () => {}; window.prompt = (q, d) => d || '';
  /* #content peut être REcréé au démarrage (l'écran de connexion puis l'application) : on guette tout le
     document, et on relit #content à chaque lot de changements, jusqu'au premier écran d'une personne connectée */
  const mo = new MutationObserver(() => { if (window.__tRendu != null) return; const c = document.getElementById('content');
    let u = null; try { u = (0, eval)('typeof currentUser!=="undefined"&&currentUser'); } catch (e) {}
    if (c && c.children.length && u) { window.__tRendu = performance.now(); mo.disconnect(); } });
  mo.observe(document, { childList: true, subtree: true });
})();`;

(async () => {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const R = { version: S.version, ralenti: RALENTI, baseKo: Math.round(Buffer.byteLength(base) / 1024), etiquette: ETIQ };
  console.log(`page mesurée : ${S.version} · base ${R.baseKo} Ko · processeur ×${RALENTI}`);
  /* la base, la session mémorisée de l'administrateur (u0), la synchro éteinte (pas de réseau) */
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    /* un appareil qui travaille a choisi sa langue : sans ça, la fenêtre « Langue » s'ouvre au démarrage et la mesure
       compte un geste qu'aucun technicien ne fait (repéré au premier profil du démarrage : openLangPicker, 60 ms) */
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  await S.c.envoyer('Emulation.setCPUThrottlingRate', { rate: RALENTI });

  /* ── A. l'ouverture à froid, tracée ── */
  const evts = []; let fini = null; const finiP = new Promise(r => { fini = r; });
  S.c.sur(m => { if (m.method === 'Tracing.dataCollected') evts.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') fini(); });
  const PROFIL_OUVERTURE = !!process.env.PROFIL_OUVERTURE;
  if (PROFIL_OUVERTURE) { await S.c.envoyer('Profiler.enable'); await S.c.envoyer('Profiler.setSamplingInterval', { interval: 200 }); await S.c.envoyer('Profiler.start'); }
  else await S.c.envoyer('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'v8', 'v8.execute', 'disabled-by-default-v8.compile', 'blink.user_timing', 'loading'] } });
  await S.c.envoyer('Page.reload', { ignoreCache: false });
  let rendu = null;
  for (let i = 0; i < 600; i++) { await dormir(200);
    try { rendu = await S.ev('return (window.__tRendu!=null && typeof currentUser!=="undefined" && currentUser) ? window.__tRendu : null'); } catch (e) {}
    if (rendu != null) break; }
  await dormir(1500);   // ce qui suit le premier écran (minuteries de démarrage) compte aussi dans la trace
  if (PROFIL_OUVERTURE) { const { profile } = await S.c.envoyer('Profiler.stop');
    const dt = {}; for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] || 0) + (profile.timeDeltas[i] || 0);
    /* temps PROPRE et temps TOTAL (propre + appelés) par fonction : le total nomme le coupable, le propre nomme l'endroit */
    const parId = new Map(profile.nodes.map(n => [n.id, n])); const parent = new Map();
    for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
    const nom = n => { const f = n.callFrame; return (f.functionName || '(anonyme)') + (f.lineNumber >= 0 && f.url ? ':' + (f.lineNumber + 1) : ''); };
    const propre = {}, total = {}; let tout = 0;
    for (const n of profile.nodes) { const t = (dt[n.id] || 0) / 1000; if (!t) continue; tout += t; propre[nom(n)] = (propre[nom(n)] || 0) + t;
      const vus = new Set(); let id = n.id; while (id != null) { const k = nom(parId.get(id)); if (!vus.has(k)) { vus.add(k); total[k] = (total[k] || 0) + t; } id = parent.get(id); } }
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 30);
    console.log(`\n── A′. profil du démarrage (${ms(tout)} échantillonnés) — temps TOTAL (appelés compris) ──`);
    for (const [k, v] of top(total)) console.log(`  ${(Math.round(v / tout * 1000) / 10 + ' %').padStart(7)}  ${ms(v).padStart(9)}  ${k}`);
    console.log(`\n── A″. profil du démarrage — temps PROPRE ──`);
    for (const [k, v] of top(propre).slice(0, 20)) console.log(`  ${(Math.round(v / tout * 1000) / 10 + ' %').padStart(7)}  ${ms(v).padStart(9)}  ${k}`);
    /* l'ARBRE, du haut vers le bas, élagué sous SEUIL_ARBRE ms : qui appelle qui — un total à plat ne dit pas où
       tombe le temps d'une fonction appelée de plusieurs endroits */
    const SEUIL = +(process.env.SEUIL_ARBRE || 20); const tot = new Map();
    const totNoeud = id => { if (tot.has(id)) return tot.get(id); const n = parId.get(id); let t = (dt[id] || 0) / 1000;
      for (const c of (n.children || [])) t += totNoeud(c); tot.set(id, t); return t; };
    const racine = profile.nodes.find(n => !parent.has(n.id)); totNoeud(racine.id);
    const arbre = []; const desc = (id, prof) => { const n = parId.get(id); const t = tot.get(id);
      if (t < SEUIL || prof > 16) return; arbre.push('  '.repeat(prof) + ms(t).padStart(9) + '  ' + nom(n) + '  (propre ' + ms((dt[id] || 0) / 1000) + ')');
      for (const c of (n.children || []).slice().sort((x, y) => tot.get(y) - tot.get(x))) desc(c, prof + 1); };
    desc(racine.id, 0);
    console.log(`\n── A‴. arbre du démarrage (nœuds ≥ ${SEUIL} ms) ──`); console.log(arbre.join('\n'));
    R.profilOuverture = { tout, total: top(total), propre: top(propre), arbre }; fini(); }
  else await S.c.envoyer('Tracing.end');
  await finiP;
  const nav = await S.ev(`const n=performance.getEntriesByType('navigation')[0]||{}; return {dcl:n.domContentLoadedEventEnd, charge:n.loadEventEnd, interactif:n.domInteractive, t0:window.__t0, rendu:window.__tRendu};`);
  /* le fil principal de la page : celui qui porte ParseHTML */
  const tidP = (evts.find(e => e.name === 'ParseHTML') || {}).tid;
  const surFil = evts.filter(e => e.tid === tidP && e.ph === 'X' && typeof e.dur === 'number');
  const somme = re => surFil.filter(e => re.test(e.name)).reduce((s, e) => s + e.dur, 0) / 1000;
  const plusLong = re => surFil.filter(e => re.test(e.name)).reduce((m, e) => Math.max(m, e.dur), 0) / 1000;
  R.ouverture = { premierEcran: rendu, dcl: nav.dcl, charge: nav.charge,
    analyseHTML: somme(/^ParseHTML$/), scriptEval: somme(/^EvaluateScript$/), scriptPlusLong: plusLong(/^EvaluateScript$/),
    compilation: somme(/^v8\.compile$/), appels: somme(/^FunctionCall$/), minuteries: somme(/^TimerFire$/),
    miseEnPage: somme(/^Layout$/), styles: somme(/^(UpdateLayoutTree|RecalculateStyles)$/), peinture: somme(/^Paint$/),
    ramasse: somme(/^(MinorGC|MajorGC|V8\.GC.*|BlinkGC.*)$/) };
  /* chaque mise en page / recalcul de styles de l'ouverture, avec la ligne de script qui l'a FORCÉE (la trace porte
     la pile quand c'est le script qui a lu une géométrie avant que la page ait fini de se ranger) */
  const forcees = [];
  for (const e of surFil) { if (!/^(Layout|UpdateLayoutTree)$/.test(e.name) || e.dur < 3000) continue;
    const bd = (e.args && (e.args.beginData || e.args.data)) || {}; const pile = bd.stackTrace || [];
    forcees.push({ quoi: e.name === 'Layout' ? 'mise en page' : 'styles', ms: Math.round(e.dur / 100) / 10, t: Math.round((e.ts - (evts.find(x => x.name === 'ParseHTML') || e).ts) / 1000),
      noeuds: bd.dirtyObjects || bd.elementCount || '', par: pile.slice(0, 3).map(f => (f.functionName || '(anonyme)') + ':' + f.lineNumber).join(' ← ') }); }
  R.forcees = forcees;
  if (forcees.length) { console.log('\n── A‴. mises en page et styles de l’ouverture (≥ 3 ms) — t = ms depuis le début de l’analyse ──');
    for (const f of forcees) console.log(`  t=${String(f.t).padStart(5)}  ${f.quoi.padEnd(13)} ${ms(f.ms).padStart(8)}  ${f.par ? 'FORCÉE par ' + f.par : '(la page elle-même)'}`); }
  console.log('\n── A. ouvrir l’application (base rangée, session mémorisée) ──');
  const o = R.ouverture;
  console.log(`  premier écran dessiné : ${ms(o.premierEcran)} après le début de la navigation (DOMContentLoaded ${ms(o.dcl)}, chargé ${ms(o.charge)})`);
  console.log(`  dont : analyse du HTML ${ms(o.analyseHTML)} · script (compilation + exécution) ${ms(o.scriptEval)} (le plus long d’un tenant ${ms(o.scriptPlusLong)}, compilation ${ms(o.compilation)})`);
  console.log(`         rappels et minuteries ${ms(o.appels + o.minuteries)} · styles ${ms(o.styles)} · mise en page ${ms(o.miseEnPage)} · peinture ${ms(o.peinture)} · ramasse-miettes ${ms(o.ramasse)}`);

  /* après l'ouverture : la page est à nous, on neutralise ce qui pourrait couvrir l'écran.
     ⛔ Et on passe en « animations réduites » (un vrai réglage d'utilisateur) : detailIntervention() dessine
     DANS une transition de vue, donc plus tard, hors de l'appel — chronométrée telle quelle, l'ouverture de la
     fiche rendait 0,4 ms (la moitié synchrone d'un geste). Sans transition, le rendu est dans l'appel. */
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){} return 1;`);
  /* SANS_HAS=1 : le PLAFOND du gain, pas un correctif — toutes les règles qui portent :has( sont neutralisées dans la
     page de mesure (CSSOM, en mémoire), ce qui casse l'apparence ; ça dit ce que la réécriture de ces règles peut rendre */
  if (process.env.SANS_HAS) { const n = await S.ev(`let n=0; const tour=l=>{ for(const r of [...l]){ if(r.cssRules&&!r.selectorText){ tour(r.cssRules); continue; }
      if(r.selectorText&&r.selectorText.indexOf(':has(')>=0){ r.selectorText='.__jamais__'; n++; } } };
    for(const sh of document.styleSheets){ try{ tour(sh.cssRules); }catch(e){} } return n;`); console.log(`  ⚠ SANS_HAS : ${n} règles :has() neutralisées (plafond du gain, apparence cassée)`); R.sansHas = n; }
  const pop = await S.ev(`return {u: currentUser && currentUser.id, ints: db.interventions.length, box: db.boxes.length, mvts: (db.mouvements||[]).length, journal: db.journal.length, octets: JSON.stringify(db).length};`);
  console.log(`  population : connecté ${pop.u}, ${pop.ints} interventions, ${pop.box} box, ${pop.mvts} mouvements, ${pop.journal} lignes de journal, base ${Math.round(pop.octets / 1024)} Ko en mémoire`);
  R.population = pop;

  /* ── B. save(), et chacune de ses étapes ── */
  /* ⛔ estampiller() sort par la porte du haut quand la synchro est éteinte (leçon de la v717 : 0 ms partout).
     On la dit allumée pour la mesure — syncPush, lui, sort seul (pas de document d'équipe ouvert). */
  const B = await S.ev(`window.syncEnabled = () => true;
    const T = f => { const t = performance.now(); f(); return performance.now() - t; };
    const touche = i => { const c = db.clients[i % db.clients.length]; c.notes = (c.notes||'') + ' .'; };
    const r = { save: [], estampiller: [], stringify: [], rangement: [], badges: [], cloche: [], notifs: [], tampons: 0 };
    for (let i = 0; i < 7; i++) { touche(i); const m0 = db.clients[i % db.clients.length]._m; r.save.push(T(() => save())); if (db.clients[i % db.clients.length]._m !== m0) r.tampons++; }
    for (let i = 0; i < 7; i++) { touche(i + 20); r.estampiller.push(T(() => estampiller())); }
    let j = ''; for (let i = 0; i < 7; i++) r.stringify.push(T(() => { j = JSON.stringify(db); }));
    for (let i = 0; i < 7; i++) r.rangement.push(T(() => localStorage.setItem(STORE_KEY, j)));
    for (let i = 0; i < 7; i++) r.badges.push(T(() => refreshBadges()));
    for (let i = 0; i < 7; i++) r.cloche.push(T(() => updateBell()));
    let n = 0; for (let i = 0; i < 7; i++) r.notifs.push(T(() => { n = computeNotifs().length; }));
    r.nbNotifs = n; return r;`);
  R.save = Object.fromEntries(Object.entries(B).map(([k, v]) => [k, Array.isArray(v) ? med(v) : v]));
  console.log('\n── B. enregistrer (save), à chaque geste — médianes de 7 ──');
  console.log(`  save() entier : ${ms(R.save.save)}   (population : ${B.tampons}/7 enregistrements réellement tamponnés — estampiller est bien entré)`);
  console.log(`  dont estampiller ${ms(R.save.estampiller)} · JSON.stringify ${ms(R.save.stringify)} · écriture dans le rangement ${ms(R.save.rangement)} · pastilles du menu ${ms(R.save.badges)} · cloche ${ms(R.save.cloche)} (computeNotifs seul ${ms(R.save.notifs)}, ${B.nbNotifs} notifications)`);

  /* ── C. une intervention : ouvrir, fermer, clore ── */
  const C = await S.ev(`const T = f => { const t = performance.now(); f(); void document.body.offsetHeight; return performance.now() - t; };
    const ids = db.interventions.filter(i => i.statut !== 'terminee' && i.statut !== 'annulee').slice(0, 7).map(i => i.id);
    const r = { ouvrir: [], fermer: [], clore: [], rendu: [], n: ids.length, closes: 0, dessinees: 0 };
    /* population : la fiche est-elle VRAIMENT à l'écran après l'appel ? (le titre de l'intervention dans #content) */
    for (const id of ids) { const it = db.interventions.find(x => x.id === id);
      r.ouvrir.push(T(() => detailIntervention(id)));
      if (window._curIntId === id && it && document.getElementById('content').textContent.includes(it.titre)) r.dessinees++;
      r.rendu.push(T(() => renderIntDetail(id)));
      r.fermer.push(T(() => closeModal(true))); }
    for (const id of ids) { const avant = (db.interventions.find(x => x.id === id) || {}).statut;
      r.clore.push(T(() => intTerminerPrevu(id))); try{ closeModal(true); }catch(e){}
      if ((db.interventions.find(x => x.id === id) || {}).statut === 'terminee' && avant !== 'terminee') r.closes++; }
    return r;`);
  R.intervention = { ouvrir: med(C.ouvrir), rendu: med(C.rendu), fermer: med(C.fermer), clore: med(C.clore), n: C.n, closes: C.closes, dessinees: C.dessinees };
  console.log('\n── C. une intervention — médianes ──');
  console.log(`  ouvrir sa fiche ${ms(R.intervention.ouvrir)} (dont la redessiner seule ${ms(R.intervention.rendu)}) · la fermer ${ms(R.intervention.fermer)} · la clore (terminée, enregistrement compris) ${ms(R.intervention.clore)}`);
  console.log(`  (population : ${C.n} essayées, ${C.dessinees} fiches réellement à l'écran après l'appel, ${C.closes} réellement closes)`);

  /* ── D. les écrans ── */
  const VUES = ['dashboard', 'interventions', 'planning', 'clients', 'produits', 'boxes', 'mouvements', 'historique', 'factures', 'devis', 'validations', 'utilisateurs'];
  const D = await S.ev(`const T = f => { const t = performance.now(); f(); void document.body.offsetHeight; return performance.now() - t; };
    const r = {}; for (const v of ${JSON.stringify(VUES)}) { if (!views[v]) continue; const a = [];
      for (let i = 0; i < 3; i++) { current = v; a.push(T(() => rendreVueSure(v))); }
      a.sort((x, y) => x - y); r[v] = { t: a[1], noeuds: document.getElementById('content').getElementsByTagName('*').length }; }
    return r;`);
  R.ecrans = D;
  console.log('\n── D. dessiner un écran (rendreVueSure, médiane de 3, mise en page forcée comprise) ──');
  for (const [v, x] of Object.entries(D).sort((a, b) => b[1].t - a[1].t)) console.log(`  ${v.padEnd(14)} ${ms(x.t).padStart(9)} · ${x.noeuds} nœuds`);

  /* ── E. profils processeur : qui coûte, dans save() et dans la clôture ── */
  const profil = async (code) => {
    await S.c.envoyer('Profiler.enable'); await S.c.envoyer('Profiler.setSamplingInterval', { interval: 100 });
    await S.c.envoyer('Profiler.start'); await S.ev(code); const { profile } = await S.c.envoyer('Profiler.stop');
    const dt = {}; const ids = profile.samples, d = profile.timeDeltas; for (let i = 0; i < ids.length; i++) dt[ids[i]] = (dt[ids[i]] || 0) + (d[i] || 0);
    const par = {}; let total = 0;
    for (const n of profile.nodes) { const t = (dt[n.id] || 0) / 1000; total += t; const f = n.callFrame;
      const k = (f.functionName || '(anonyme)') + (f.lineNumber >= 0 && f.url ? ':' + (f.lineNumber + 1) : ''); par[k] = (par[k] || 0) + t; }
    return { total, top: Object.entries(par).sort((a, b) => b[1] - a[1]).slice(0, 14) }; };
  const Ps = await profil(`for (let i = 0; i < 10; i++) { const c = db.clients[i]; c.notes += ' .'; save(); } return 1;`);
  const ouvertes = await S.ev(`return db.interventions.filter(i => i.statut !== 'terminee' && i.statut !== 'annulee').slice(0, 8).map(i => i.id);`);
  const Pc = await profil(`for (const id of ${JSON.stringify(ouvertes)}) { intTerminerPrevu(id); try{ closeModal(true); }catch(e){} } return 1;`);
  R.profils = { save: Ps, clore: Pc };
  const aff = (t, P) => { console.log(`\n── E. profil : ${t} (${ms(P.total)} échantillonnés) ──`);
    for (const [k, v] of P.top) console.log(`  ${(Math.round(v / P.total * 1000) / 10 + ' %').padStart(7)}  ${ms(v).padStart(9)}  ${k}`); };
  aff('10 enregistrements (save)', Ps); aff('clore 8 interventions', Pc);

  R.exceptions = S.exceptions.slice(0, 5);
  console.log(`\n  exceptions dans la page : ${S.exceptions.length}${S.exceptions.length ? ' — ' + S.exceptions.slice(0, 2).join(' / ') : ''}`);
  const out = path.join(path.dirname(BASE), `resultat-${S.version}-x${RALENTI}${ETIQ ? '-' + ETIQ : ''}.json`);
  fs.writeFileSync(out, JSON.stringify(R, null, 1)); console.log('  → ' + out);
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
