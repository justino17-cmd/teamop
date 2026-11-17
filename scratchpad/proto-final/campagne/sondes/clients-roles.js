// Campagne « clients » (17 novembre 2026) — LES DROITS : ce que voit et peut faire chaque personne de l'entreprise dans « Clients » (gérant, secrétariat, technicienne, chef d'équipe).
// Usage : PROFIL=… NUIT=1 node clients-roles.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
(async () => {
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    const c = await L.ouvrir({ profil: PROFIL, qui, nuit: NUIT }), p = c.p;
    const D = await p.evaluate(() => ({ voir: droitVoit('clients'), role: ROLE, qui: acteur(), menu: [...document.querySelectorAll('#menu a, #menu button')].map(e => e.textContent.trim()).filter(Boolean), barre: [...document.querySelectorAll('#barre-bas .t-n')].map(e => e.textContent.trim()),
      creer: typeof droitFaire === 'function' ? { c: droitFaire('crm', 'c'), m: droitFaire('crm', 'm'), s: droitFaire('crm', 's') } : null }));
    console.log(`  · ${qui} (${D.role}) : voir « clients » = ${D.voir}, droits ${JSON.stringify(D.creer)}`);
    await L.aller(p, 'clients'); let s = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, toast: ((document.querySelector('#toast') || {}).textContent || '').trim(), nouveau: !!document.querySelector('[data-action="clientNouveau"]'), cartes: document.querySelectorAll('.client-carte').length }));
    const menuClients = D.menu.some(t => /^Clients/.test(t)) || D.barre.includes('Clients');
    if (D.voir) {
      v(`[${qui}] a la case « voir les clients » : la rubrique Clients s’ouvre (${s.cartes} clients) et figure à son menu`, s.h1 === 'Clients' && menuClients && s.cartes === 8, { s, menu: D.menu.slice(0, 12), barre: D.barre });
      // création : le bouton suit la case « créer »
      if (D.creer) v(`[${qui}] « ＋ Nouveau client » n’apparaît que si la case « créer un client » est cochée (case ${D.creer.c}, bouton ${s.nouveau})`, s.nouveau === !!D.creer.c, { s, creer: D.creer });
      await L.toucher(c, '.client-carte'); const f = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, infos: !!document.querySelector('[data-oc="infos"]'), devis: !!document.querySelector('[data-action="clientDevis"]'), atelierD: !!document.querySelector('[data-opd="devis"]'), atelierC: !!document.querySelector('[data-opd="contrat"]'), creer: !!document.querySelector('[data-creer]'), tel: !!document.querySelector('.tete-client a[href^="tel:"]'), mail: !!document.querySelector('.tete-client a[href^="mailto:"]') }));
      await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); const inf = await p.evaluate(() => ({ champs: document.querySelectorAll('[data-ci]').length, enreg: !!document.querySelector('[data-action="clientEnreg"]') }));
      if (D.creer) v(`[${qui}] l’onglet Infos ne propose d’« Enregistrer » que si la case « changer un client » est cochée (case ${D.creer.m}, bouton ${inf.enreg})`, inf.enreg === !!D.creer.m, { inf, creer: D.creer });
      console.log('  · gestes de la fiche pour ' + qui + ' : ' + JSON.stringify(f));
      if (D.creer && !D.creer.m && inf.enreg) {}
      await L.capture(c, CAP + `roles-fiche-${qui}-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
    } else {
      v(`[${qui}] sans la case « voir les clients » : l’adresse #clients est refusée avec une phrase (« ${s.toast} ») et la rubrique n’est pas au menu`, s.h1 !== 'Clients' && !menuClients && /rubrique|espace|fermée|accès/i.test(s.toast), { s, menu: D.menu.slice(0, 14), barre: D.barre });
      // fiche client par adresse directe
      await L.aller(p, 'client-x-vp'); const s2 = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, toast: ((document.querySelector('#toast') || {}).textContent || '').trim() })); v(`[${qui}] la fiche d’un client par son adresse directe est refusée aussi`, s2.h1 !== 'Restaurant Le Vieux Port', s2);
    }
    // la technicienne et le chef d'équipe : depuis leur intervention, que voient-ils du client ?
    if (!D.voir) { await L.aller(p, 'majournee'); const j = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, liens: [...document.querySelectorAll('#contenu [data-go*="client-x"]')].length, tel: [...document.querySelectorAll('#contenu a[href^="tel:"]')].length })); console.log('  · ' + qui + ' « Ma journée » : ' + JSON.stringify(j)); }
    const d = await L.deborde(c); v(`[${qui}] aucun glissement latéral`, d.bouge === 0, d);
    v(`[${qui}] aucune erreur de console`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── les cases de la catégorie « Clients » agissent : chaque case ne commande QUE sa phrase (créer / changer) ──
  const c2 = await L.ouvrir({ profil: PROFIL, qui: 'julie', nuit: NUIT }), q = c2.p;
  console.log('  · cases de Julie pour « Clients » au départ : ' + await q.evaluate(() => JSON.stringify(eqDe('julie').droits.cats.crm)));
  const essais = [['voir seulement', { v: true }, false, false], ['voir + créer', { v: true, c: true }, true, false], ['voir + changer', { v: true, m: true }, false, true]];
  let n = 0; for (const [nom, cats, peutCreer, peutChanger] of essais) {
    n++; await q.evaluate(x => { eqDe('julie').droits.cats.crm = x; }, cats); await L.aller(q, 'clients');
    const r0 = await q.evaluate(() => DROITS_REFUS.length); const bouton = await q.evaluate(() => !!document.querySelector('[data-action="clientNouveau"]'));
    if (bouton) await L.toucher(c2, '[data-action="clientNouveau"]'); const ouvert = await q.evaluate(() => !!document.querySelector('#calque .panneau')); const rc = await q.evaluate(a => DROITS_REFUS.slice(a).map(x => x.cat + '.' + x.x), r0); await L.ranger(q);
    v(`[julie : ${nom}] « ＋ Nouveau client » ${peutCreer ? 's’ouvre' : 'est absent ou refusé'} (bouton ${bouton}, ouvert ${ouvert}, refus ${JSON.stringify(rc)})`, peutCreer ? ouvert : !ouvert, { bouton, ouvert, rc });
    await L.aller(q, 'client-x-mr'); await L.toucher(c2, '#contenu [role=tab][data-oc="infos"]'); const tel = '06 00 00 00 0' + n, avant = await q.evaluate(() => CLIENTS.mr.tel); const r1 = await q.evaluate(() => DROITS_REFUS.length);
    if (await q.evaluate(() => !!document.querySelector('[data-action="clientEnreg"]'))) { await q.fill('[data-ci="tel"]', tel); await L.toucher(c2, '[data-action="clientEnreg"]'); await L.calme(q, 300); }
    const apres = await q.evaluate(() => CLIENTS.mr.tel), changé = apres !== avant, rm = await q.evaluate(a => DROITS_REFUS.slice(a).map(x => x.cat + '.' + x.x), r1);
    v(`[julie : ${nom}] « Enregistrer » la fiche d’un client ${peutChanger ? 'enregistre' : 'est refusé'} (téléphone ${changé ? 'changé' : 'inchangé'}, refus ${JSON.stringify(rm)}) — droits-01 : la case qui commande ce geste est « changer un client », pas « créer un client »`, changé === peutChanger, { avant, apres, rm });
    if (!peutChanger && !changé) { const dit = await q.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '')); }
  }
  v('[julie] aucune erreur de console', c2.err.length === 0, c2.err.slice(0, 3));
  await L.fin(c2);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
