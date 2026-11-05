/* Sonde des longues listes par pages (tests/test-3291.js) — au navigateur, bêta locale 127.0.0.1, base lourde SYNTHÉTIQUE.
   Usage : BASE=/tmp/base-lourde.json [SORTIE=/tmp/captures] [APPAREIL=mobile|bureau] [MODE=light|dark] node scratchpad/sonde-listes.js
   Joue, pour Clients, Devis, Factures et Interventions (en liste) : 60 lignes à l'ouverture, le bouton dit le reste, un clic en ajoute 100
   SANS faire sauter la page, une vraie navigation remet à 60 ; et prend une capture du bas de liste (à regarder à l'œil, jour ET nuit). */
const fs = require('fs'), path = require('path');
const H = require('./perf-nuit-harnais.js');
let ok = 0, ko = 0; const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + ' ' + (d === undefined ? '' : JSON.stringify(d))); } };
(async () => {
  const { s, port } = await H.serveur(null); const br = await H.lancer();
  const base = fs.readFileSync(process.env.BASE, 'utf8'); const OUT = process.env.SORTIE; if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const mob = (process.env.APPAREIL || 'mobile') === 'mobile', mode = process.env.MODE || 'light';
  const ctx = await br.newContext({ viewport: mob ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob, colorScheme: mode, serviceWorkers: 'block' });
  const page = await ctx.newPage(); await page.addInitScript(H.INIT);
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.goto('http://127.0.0.1:' + port + '/beta.html', { waitUntil: 'load' }); await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0'); localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  await page.evaluate(() => { window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {} intView = 'liste'; });
  const cas = [
    ['clients', '#content .tf-rangee', 'clients'],
    ['devis', '#content table tbody tr', 'devis'],
    ['factures', '#content .pl-row.lga', 'factures'],
    ['interventions', '#content .pl-row.int-l', 'interventions'],
  ];
  for (const [vue, sel, nom] of cas) {
    console.log('— ' + nom);
    await page.evaluate(vv => { go(vv); }, vue); await H.dormir(1500);
    /* Factures : la carte « À facturer » porte aussi des .pl-row.lga — on compte ceux de la carte de la LISTE (la dernière carte de l'écran). */
    const compte = () => page.evaluate(([s, v]) => { if (v === 'factures') { const cs = [...document.querySelectorAll('#content .card')]; const c = cs[cs.length - 1]; return c ? c.querySelectorAll('.pl-row.lga').length : -1; } return document.querySelectorAll(s).length; }, [sel, vue]);
    const bouton = () => page.evaluate(() => { const b = document.querySelector('#content .liste-suite button'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
    const tot = await page.evaluate(vv => ({ clients: db.clients.length, devis: db.devis.filter(d => !d.xylo).length, factures: db.factures.length, interventions: db.interventions.length })[vv], vue);
    const n0 = await compte(), b0 = await bouton();
    if (vue === 'interventions') { const act = await page.evaluate(() => db.interventions.filter(i => i.statut !== 'terminee' && i.statut !== 'annulee').length);
      v('à l\'ouverture : toute l\'activité (' + act + ' à faire) + 60 de l\'historique', n0 === act + 60, [n0, act]); }
    else v('à l\'ouverture : 60 lignes sur ' + tot, n0 === 60, n0);
    v('le bouton dit le reste', !!b0 && /Afficher 100 de plus/.test(b0), b0);
    if (OUT) { await page.evaluate(() => { try { closeModal(); } catch (e) {} const b = document.querySelector('#content .liste-suite'); if (b) b.scrollIntoView({ block: 'center' }); }); await H.dormir(500); await page.screenshot({ path: path.join(OUT, nom + '-' + (mob ? 'mobile' : 'bureau') + '-' + mode + '.png') }); }
    const y0 = await page.evaluate(() => { const b = document.querySelector('#content .liste-suite button'); if (!b) return null; b.scrollIntoView({ block: 'center' }); return Math.round(b.getBoundingClientRect().top); });
    /* des fenêtres s'ouvrent seules dans un bocal (rappels, bienvenue) : on les ferme, c'est la sonde qui les subit, pas la liste */
    await page.evaluate(() => { try { closeModal(); } catch (e) {} });
    await page.click('#content .liste-suite button'); await H.dormir(900);
    const n1 = await compte();
    v('un clic : 100 lignes de plus', n1 === n0 + 100, [n0, n1]);
    const sy = await page.evaluate(() => Math.round(window.scrollY) + Math.round((document.getElementById('content') || {}).scrollTop || 0));
    v('la page ne saute pas en haut (on reste au bas de ce qu\'on lisait)', sy > 600, sy);
    await page.evaluate(vv => { go('dashboard'); }, vue); await H.dormir(700);
    await page.evaluate(vv => { go(vv); }, vue); await H.dormir(1500);
    v('une vraie navigation remet à la première page', (await compte()) === n0, await compte());
  }
  /* la recherche des clients s'applique avant la coupe */
  await page.evaluate(() => { go('clients'); }); await H.dormir(1200);
  const trouve = await page.evaluate(() => { const c = db.clients[790]; const q = document.getElementById('cli-recherche'); q.value = c.nom; q.dispatchEvent(new Event('input', { bubbles: true })); return c.nom; });
  await H.dormir(700);
  v('chercher un client du fond de la liste le trouve sans « Afficher la suite »', await page.evaluate(n => document.getElementById('cli-liste').innerText.includes(n) && !document.querySelector('#cli-liste .liste-suite'), trouve));
  v('aucune erreur JavaScript', errs.length === 0, errs);
  console.log(ok + ' ✓ ' + ko + ' ✗'); await br.close(); s.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
