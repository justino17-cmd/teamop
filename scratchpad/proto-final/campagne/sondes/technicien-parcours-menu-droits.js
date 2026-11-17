// Parcours « menu, barre du bas, ce que le technicien ne voit pas » (campagne du 17 novembre 2026).
// Usage : node technicien-parcours-menu-droits.js [profil] [nuit=0|1] [qui=sm|kb]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', qui = process.argv[4] || 'sm', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui, nuit, hash: 'majournee' }), p = c.p, tel = c.doigt || c.largeur < 800;
  await L.calme(p, 400);
  // ── M : le menu ──
  const AT = ['Ma journée', 'Mes tâches', 'Mes frais', 'Mes heures', 'Mon camion', 'Mes congés'];
  if (tel) { await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(p, 400); }
  const zone = tel ? '#calque .panneau' : 'body';
  const g = await L.gestes(p, zone); const noms = g.map(x => x.lib);
  console.log('   gestes du menu :', JSON.stringify(noms));
  for (const a of AT) v(`M1 le menu propose « ${a} »`, noms.some(n => n.includes(a)), noms.slice(0, 30));
  for (const x of ['Comptabilité', 'Clients', 'Devis', 'Équipe', 'Statistiques', 'Contrats', 'Achats', 'Historique', 'Planning', 'Mon entreprise', 'Fournisseurs', 'Stock', 'Temps de travail', 'Véhicules'])
    v(`M2 le menu du technicien ne propose pas « ${x} »`, !noms.some(n => n.trim() === x || n.startsWith(x + ' ') && !/Mes |Mon /.test(n)), noms.filter(n => n.includes(x)));
  v('M3 le pied du menu : Jour/Nuit/Auto, Nouveautés, Se déconnecter', ['Nouveautés', 'Se déconnecter'].every(a => noms.some(n => n.includes(a))), noms.slice(-8));
  await L.capture(c, CAP + `menu-${qui}-${profil}-${J}.png`);
  const dm = await L.doigts(p, zone); v('M4 menu : cibles ≥ 44 px au doigt', !c.doigt || dm.petits.length === 0, dm.petits.slice(0, 6));
  // chaque ligne du menu mène au bon écran
  const TITRE = { 'Ma journée': /Bonjour/, 'Mes tâches': /Mes tâches/, 'Mes frais': /Mes frais/, 'Mes heures': /Mes heures/, 'Mon camion': /Mon camion/, 'Mes congés': /Mes congés/ };
  for (const a of AT) {
    if (tel) { await L.aller(p, 'majournee'); await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(p, 300); }
    const ok = await p.evaluate(a => { const e = [...document.querySelectorAll((window.innerWidth < 800 ? '#calque .panneau' : 'body') + ' button, ' + (window.innerWidth < 800 ? '#calque .panneau' : 'body') + ' a')].find(b => b.textContent.replace(/\s+/g, ' ').trim().startsWith(a)); if (!e) return false; e.click(); return true; }, a);
    await L.calme(p, 500); const h = await txt(p, '#contenu h1');
    v(`M5 « ${a} » du menu mène à l’écran qui porte ce nom`, ok && TITRE[a].test(h), { h, ok });
    v(`M5b après « ${a} », le menu est refermé`, !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  }
  // ── A : Jour / Nuit / Auto et Nouveautés (le pied du menu) ──
  const ouvrirMenu = async () => { if (tel) { await L.aller(p, 'majournee'); await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(p, 300); } };
  for (const [lib, attendu] of [['Nuit', 'nuit'], ['Jour', 'jour']]) {
    await ouvrirMenu();
    await p.evaluate(l => { const e = [...document.querySelectorAll('[data-modetheme]')].find(b => b.textContent.trim() === l); e && e.click(); }, lib); await L.calme(p, 400);
    v(`A1 « ${lib} » dans le pied du menu change l’apparence (data-mode = ${attendu})`, (await p.evaluate(() => document.documentElement.dataset.mode)) === attendu, await p.evaluate(() => document.documentElement.dataset.mode));
  }
  await ouvrirMenu(); await p.evaluate(() => { const e = [...document.querySelectorAll('[data-modetheme]')].find(b => b.textContent.trim() === 'Auto'); e && e.click(); }); await L.calme(p, 300);
  v('A2 « Auto » est coché ensuite (aria-pressed)', await p.evaluate(() => { const e = [...document.querySelectorAll('[data-modetheme]')].find(b => b.textContent.trim() === 'Auto'); return !!e && e.getAttribute('aria-pressed') === 'true'; }));
  await ouvrirMenu();
  await p.evaluate(() => { const e = [...document.querySelectorAll('button, a')].find(b => b.textContent.replace(/\s+/g, ' ').trim().startsWith('Nouveautés')); e && e.click(); }); await L.calme(p, 600);
  v('A3 « Nouveautés » ouvre le guide des nouveautés', await p.evaluate(() => { const e = document.getElementById('nv'); return !!e && e.offsetParent !== null || (!!e && getComputedStyle(e).display !== 'none'); }), await txt(p, '#nv'));
  await L.capture(c, CAP + `nouveautes-${qui}-${profil}-${J}.png`);
  await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(p, 300);
  // ── B : la barre du bas ──
  if (tel) {
    await L.aller(p, 'majournee');
    const barre = await p.evaluate(() => [...document.querySelectorAll('[data-tab]')].map(b => ({ k: b.dataset.tab, t: b.textContent.replace(/\s+/g, ' ').trim(), a: b.getAttribute('aria-label'), cur: b.getAttribute('aria-current') || b.getAttribute('aria-selected'), l: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), coupe: b.scrollWidth > b.clientWidth + 1 })));
    console.log('   barre :', JSON.stringify(barre));
    v('B1 la barre a 5 onglets : Journée · Frais · Heures · Tâches · Camion', barre.map(b => b.t.replace(/\d+$/, '').trim()).join('|') === 'Journée|Frais|Heures|Tâches|Camion', barre.map(b => b.t));
    v('B2 chaque onglet porte son nom entier en aria-label', barre.every(b => b.a && b.a.length >= b.t.replace(/\d+$/, '').trim().length), barre.map(b => b.a));
    v('B3 aucun mot de la barre n’est coupé', barre.every(b => !b.coupe), barre.filter(b => b.coupe));
    v('B4 chaque onglet fait ≥ 44 px de haut', barre.every(b => b.h >= 44), barre.map(b => b.h));
    for (const b of barre) { await L.toucher(c, `[data-tab="${b.k}"]`); await L.calme(p, 500); v(`B5 onglet « ${b.t.replace(/\d+$/, '').trim()} » mène à ${b.k}`, (await p.evaluate(() => location.hash)).includes(b.k), await p.evaluate(() => location.hash)); }
    // l'onglet actif est marqué
    const cur = await p.evaluate(() => [...document.querySelectorAll('[data-tab]')].filter(b => b.getAttribute('aria-current') === 'page' || b.classList.contains('actif') || b.getAttribute('aria-selected') === 'true').length);
    v('B6 exactement un onglet est marqué actif', cur === 1, cur);
  }
  // ── D : ce que le technicien ne voit pas — par l'adresse ──
  const INTERDITES = ['comptabilite', 'factures', 'facture-x-f1', 'devis', 'clients', 'client-x-md', 'contrats', 'statistiques', 'equipe', 'achats', 'historique', 'entreprise', 'planning', 'interventions', 'encaissements', 'boiteMail', 'stock', 'produits', 'vehicules', 'pointage', 'carteBox', 'boxes'];
  const rep = {};
  for (const r of INTERDITES) {
    await p.evaluate(h => { location.hash = h; }, r); await L.calme(p, 500);
    const h = await p.evaluate(() => location.hash), t = await txt(p, '#contenu'), h1 = await txt(p, '#contenu h1'), toast = await txt(p, '#toast');
    rep[r] = { h, h1, toast: toast.slice(0, 70), argent: /€|TTC|HT\b/.test(t), long: t.length };
    const refuse = h.replace('#', '') !== r || /n’existe pas|pas ouvert|Cette page|réservé|accès/i.test(toast + t.slice(0, 200));
    v(`D1 « ${r} » tapé à la main : le technicien n’y entre pas`, refuse, rep[r]);
  }
  console.log('   adresses interdites :', JSON.stringify(rep));
  // une intervention d'un AUTRE technicien
  const autre = await p.evaluate(() => (INTS.find(i => i.tech && i.tech !== rlQui() && i.st !== 'annulee') || {}).id);
  await p.evaluate(h => { location.hash = h; }, 'inter-x-' + autre); await L.calme(p, 500);
  v('D2 l’intervention d’un autre technicien n’est pas ouverte', !/inter-x-/.test(await p.evaluate(() => location.hash)) || /pas|refus|réservé/i.test(await txt(p, '#toast')), await p.evaluate(() => location.hash));
  // la fiche d'une de SES interventions : pas de prix de devis ni de facture
  const miens = await p.evaluate(() => rlMesInts().filter(i => i.st !== 'fait').map(i => i.id));
  for (const id of miens.slice(0, 3)) {
    await L.aller(p, 'inter-x-' + id); const t = await txt(p, '#contenu'), h1 = await txt(p, '#contenu h1');
    const sigs = (t.match(/[\d  ]+[,.]?\d*\s?€|TTC|Devis n°|DEV-\d+|FAC-\d+|Marge|Coût/g) || []).slice(0, 8);
    console.log(`   fiche ${id} « ${h1} » : ${t.length} signes ; repères d’argent :`, JSON.stringify(sigs));
    v(`D3 fiche ${id} : ni numéro de devis, ni de facture, ni marge`, !/DEV-\d+|FAC-\d+|Marge|Coût de revient/.test(t), sigs);
    await L.capture(c, CAP + `fiche-${id}-${qui}-${profil}-${J}.png`);
    v(`D3b fiche ${id} : pas de glissement latéral`, (await L.deborde(c)).bouge === 0);
  }
  // ── J : « Ma journée » — commencer sa journée, les messages du bureau, itinéraire, appel ──
  await L.aller(p, 'majournee');
  const avantMsg = await txt(p, '#contenu');
  const pasCommence = /Tu n’as pas encore commencé/.test(avantMsg);   // Sophie n'a pas commencé, Karim si : on ne rejoue « commencer » que pour qui n'a pas commencé
  if (pasCommence) {
    v('J1 avant de commencer : un message du bureau rappelle de commencer', /pas encore commencé ta journée/.test(avantMsg), avantMsg.slice(0, 200));
    await L.toucher(c, '[data-ptx^="debut"]'); await L.calme(p, 500);
    const apresMsg = await txt(p, '#contenu');
    console.log('   après « Je commence ma journée » :', apresMsg.slice(0, 380));
    v('J2 après « Je commence ma journée » : la carte dit « commencée à … »', /commenc[ée]+e? à \d/i.test(apresMsg) || /Journée en cours|en cours depuis/i.test(apresMsg), apresMsg.slice(0, 200));
    v('J3 après avoir commencé, le rappel « tu n’as pas encore commencé ta journée » ne reste pas affiché (message périmé)', !/pas encore commencé/.test(apresMsg), apresMsg.slice(0, 260));
    await L.capture(c, CAP + `journee-commencee-${qui}-${profil}-${J}.png`);
  } else console.log('   (journée déjà commencée : J1 à J3 ne se jouent pas pour', qui + ')');
  const liens = await p.evaluate(() => [...document.querySelectorAll('#contenu .rl-int a')].map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href') })));
  v('J4 chaque intervention a « Y aller » avec une adresse non vide', liens.filter(l => l.t === 'Y aller').length >= 1 && liens.filter(l => l.t === 'Y aller').every(l => !/destination=$/.test(l.h)), liens);
  v('J5 « Appeler » est un lien tel: valide', liens.filter(l => l.t === 'Appeler').every(l => /^tel:\+?[\d]{6,}/.test(l.h.replace(/[\s.]/g, ''))), liens.filter(l => l.t === 'Appeler'));
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
