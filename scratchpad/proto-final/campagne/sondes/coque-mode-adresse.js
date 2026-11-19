// Campagne « coque » (17 novembre 2026) — Jour / Nuit / Auto (et s'ils sont RETENUS), les ADRESSES inconnues tapées à la main, le bouton
// RETOUR du navigateur d'écran en écran (et « en avant »), le bouton « ‹ Retour » des fiches.
// Usage : PROFIL=mac|iphone|… QUI=marc|julie|sm NUIT=1 node coque-mode-adresse.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc';
const TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
const mode = p => p.evaluate(() => document.documentElement.dataset.mode);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
(async () => {
  let c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p;
  // ---- Jour / Nuit / Auto
  const choisir = async m => { if (await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; })) { await p.locator('[data-cpsys="retour"]').first().click(); await L.calme(p, 700); }   // l'écran d'ouverture de la secrétaire est la Comptabilité plein écran : le pied du menu est derrière, on en sort comme elle le fait
    if (TEL) { await L.toucher(c, '.tt-menu'); await L.toucher(c, `#calque [data-modetheme="${m}"]`); await L.ranger(p); } else await L.toucher(c, `#menu [data-modetheme="${m}"]`); await L.calme(p, 400); };
  await p.emulateMedia({ colorScheme: 'light' });
  await choisir('nuit'); v('Nuit : l’écran passe en nuit', (await mode(p)) === 'nuit');
  v('Nuit : le bouton « Nuit » est marqué choisi (aria-pressed) dans le menu', await p.evaluate(t => { if (t) return true; return document.querySelector('#menu [data-modetheme="nuit"]').getAttribute('aria-pressed') === 'true'; }, TEL));
  await p.screenshot({ path: CAP + `mode-nuit-${PROFIL}-${QUI}.png` });
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  v('Nuit est RETENU après rechargement', (await mode(p)) === 'nuit', await mode(p));
  await choisir('jour'); v('Jour : l’écran passe en jour', (await mode(p)) === 'jour');
  await p.emulateMedia({ colorScheme: 'dark' }); await L.calme(p, 300);
  v('Jour : reste en jour même si l’appareil est sombre', (await mode(p)) === 'jour');
  await choisir('auto'); v('Auto : suit l’appareil sombre → nuit', (await mode(p)) === 'nuit', await mode(p));
  await p.emulateMedia({ colorScheme: 'light' }); await L.calme(p, 400);
  v('Auto : l’appareil repasse en clair → jour, sans recharger', (await mode(p)) === 'jour', await mode(p));
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  v('Auto est RETENU après rechargement (ne retombe pas sur jour ou nuit figé)', await p.evaluate(() => localStorage.getItem('opg_proto_mode')) === 'auto');
  // se déconnecter puis revenir : l'écran de connexion suit le mode
  await choisir('nuit');
  await p.evaluate(() => sessionFermer()); await p.waitForTimeout(900);
  v('l’écran de connexion respecte la nuit choisie', await p.evaluate(() => getComputedStyle(document.getElementById('cnx')).backgroundColor) !== 'rgb(238, 242, 248)', await p.evaluate(() => getComputedStyle(document.getElementById('cnx')).backgroundColor));
  await p.screenshot({ path: CAP + `mode-connexion-nuit-${PROFIL}.png` });
  await L.fin(c); c = await L.ouvrir({ profil: PROFIL, qui: QUI }); p = c.p;
  // ---- adresses inconnues
  const adresses = ['nimportequoi', 'constructor', '__proto__', 'toString', 'client-x-inexistant', 'inter-x-zzz', 'facture-x-zzz', 'devis-x-zzz', 'contrat-x-zzz', 'planning-x-1', 'accueil-x-', '%E0%A4%A', '<img src=x onerror=alert(1)>', 'a'.repeat(400), 'equipe', 'comptabilite-x-1', 'mesheures', 'majournee', 'espaceclient'];
  let toastDit = 0;
  for (const a of adresses) {
    const err0 = c.err.length;
    await p.evaluate(h => { try { location.hash = h; } catch (e) { } }, a); await L.calme(p, 700);
    const e = await p.evaluate(() => ({ h: location.hash, h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim().slice(0, 40), toast: (document.getElementById('toast') || {}).textContent || '', corps: document.getElementById('contenu').innerText.slice(0, 4000), vide: document.getElementById('contenu').innerText.trim().length < 20 }));
    const mauvais = /undefined|\[object|NaN|null/.test(e.corps) ;
    const ok = !e.vide && !mauvais && c.err.length === err0 && !!e.h1;
    v('adresse « #' + a.slice(0, 28) + ' » (' + QUI + ') : un écran lisible (« ' + e.h1 + ' »), pas de texte cassé, pas d’erreur' + (e.toast ? ', toast « ' + e.toast.trim().slice(0, 50) + ' »' : ''), ok, { h1: e.h1, vide: e.vide, mauvais: mauvais && (e.corps.match(/.{20}(undefined|\[object|NaN|null).{20}/) || [''])[0], err: c.err.slice(err0) });
    if (/existe pas|fermée|pas dans ton/.test(e.toast)) toastDit++;
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) { } });
  }
  console.log('  · adresses qui ont reçu une phrase d’explication :', toastDit, '/', adresses.length);
  // ---- Retour du navigateur
  const clic = async s => { const l = p.locator(s).first(); await l.scrollIntoViewIfNeeded().catch(() => { }); return L.toucher(c, l); };
  await L.aller(p, 'accueil'); const pile = [];
  const va = async (hash, motif) => { await p.evaluate(h => { location.hash = h; }, hash); await L.calme(p, 600); pile.push(hash); };
  await va('planning'); await va('clients'); await va('interventions'); await va('stock');
  const attendu = ['interventions', 'clients', 'planning', 'accueil'];
  const noms = { interventions: /Interventions/, clients: /Clients/, planning: /Planning/, accueil: /Bonjour|Accueil|Ma journée/, stock: /Stock/ };
  const roles = QUI === 'julie' ? null : 1;
  for (const a of attendu) {
    await p.goBack(); await L.calme(p, 700);
    const t = await h1(p), hh = await p.evaluate(() => location.hash);
    const actif = await p.evaluate(() => { const a = document.querySelector('#menu a.on .m-n') || document.querySelector('#barre-bas .opg-tab.on .t-n'); return a ? a.textContent.trim() : ''; });
    if (QUI === 'marc') v('Retour du navigateur › « ' + a + ' » : écran « ' + t + ' », adresse ' + hh + ', rubrique allumée « ' + actif + ' »', noms[a].test(t) && hh === '#' + a);
  }
  await p.goForward(); await L.calme(p, 600); const tf = await h1(p);
  if (QUI === 'marc') v('En avant du navigateur ramène Planning (« ' + tf + ' »)', /Planning/.test(tf));
  // ‹ Retour d'une fiche
  if (QUI === 'marc') {
    await L.aller(p, 'clients'); await L.calme(p, 500);
    const ok = await clic('#contenu [data-go^="client-x-"]'); await L.calme(p, 600);
    const fiche = await h1(p); v('une ligne client ouvre une fiche (« ' + fiche.slice(0, 40) + ' ») et son adresse est client-x-…', ok && /client-x-/.test(await p.evaluate(() => location.hash)));
    await p.screenshot({ path: CAP + `retour-fiche-client-${PROFIL}.png` });
    const bt = await p.evaluate(() => { const b = document.querySelector('#contenu .rl-retour, #contenu .lien.retour, #contenu [data-retour], #contenu [data-go="clients"].retour'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
    v('la fiche porte un bouton pour revenir à la liste (« ' + bt + ' »)', !!bt, bt);
    if (bt) { await clic('#contenu .rl-retour, #contenu .lien.retour, #contenu [data-retour]'); await L.calme(p, 600); v('« ‹ Retour » ramène à la liste Clients', /Clients/.test(await h1(p)), await h1(p)); }
  }
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
