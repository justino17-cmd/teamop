// Campagne « clients » (17 novembre 2026) — LA LISTE : recherche, rangements (tous / par semaine / par mois), ouverture d'une fiche, retour.
// Usage : PROFIL=mac|iphone|… QUI=marc|julie NUIT=1 node clients-liste.js   ·   « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
const lire = p => p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', hash: location.hash, cartes: document.querySelectorAll('#contenu .client-carte').length,
  vide: ((document.querySelector('#contenu .carte.gris') || {}).textContent || '').trim(), noms: [...document.querySelectorAll('#contenu .client-carte > span:first-child b')].map(b => b.textContent) }));
const chercher = async (p, t) => { await p.fill('[data-cherche]', t); await L.calme(p, 250); };
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await L.aller(p, 'clients');
  const base = await p.evaluate(() => ({ n: Object.keys(CLIENTS).filter(k => k !== '__nv').length, cles: Object.keys(CLIENTS).filter(k => k !== '__nv'), orphelins: [...new Set([...FACTURES.map(f => f.cli), ...INTS.map(i => i.cli), ...CONTRATS.map(x => x.cli), ...DV.map(d => d.cli)])].filter(k => !CLIENTS[k]),
    tel: Object.fromEntries(Object.entries(CLIENTS).filter(([k]) => k !== '__nv').map(([k, x]) => [k, x.tel])) }));
  const s0 = await lire(p);
  v('population : la liste montre autant de cartes que de clients (' + base.n + ')', s0.cartes === base.n && base.n >= 7, { cartes: s0.cartes, base: base.n });
  v('aucune facture, intervention, contrat ni devis ne vise un client absent (sinon « Par mois » plante) : orphelins ' + JSON.stringify(base.orphelins), base.orphelins.length === 0, base.orphelins);
  v('les cartes sont rangées par nom (ordre alphabétique français)', JSON.stringify(s0.noms) === JSON.stringify([...s0.noms].sort((a, b) => a.localeCompare(b))), s0.noms);
  await L.capture(c, CAP + `liste-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // ── recherche ──
  const essais = [['roux', ['Mme Roux']], ['ROUX', ['Mme Roux']], ['  roux  ', ['Mme Roux']], ['mimosa', ['Copropriété Les Mimosas']], ['foncia', ['Copropriété Les Mimosas']], ['aytre', ['Camping Les Pins', 'Mme Roux']], ['Aytré', ['Camping Les Pins', 'Mme Roux']],
    ['hotel', ['Hôtel de la Plage']], ['hôtel plage', ['Hôtel de la Plage']], ['0655443', ['Mme Roux']], ['06 55 44', ['Mme Roux']], ['05 46', ['Cabinet dentaire Martin', 'Hôtel de la Plage', 'Copropriété Les Mimosas']], ['contrat', ['Copropriété Les Mimosas', 'Hôtel de la Plage']], ['mimosas@syndic', ['Copropriété Les Mimosas']], ['rue gambetta', ['Mme Roux']]];
  for (const [q, att] of essais) { await chercher(p, q); const s = await lire(p); const ok = att.every(n => s.noms.includes(n)) && (s.noms.length === att.length || ['05 46', 'contrat'].includes(q));
    v(`recherche « ${q} » → ${s.noms.join(' · ') || s.vide}`, ok, { att, vu: s.noms }); }
  await chercher(p, 'zzzz'); let s = await lire(p); v('recherche sans résultat : le message le dit et propose quoi faire', /Aucun client/.test(s.vide) && s.cartes === 0, s.vide);
  v('… et il dit comment s’en sortir (effacer la recherche ou créer le client) — constat de compréhension', /efface|essaie|crée|nouveau/i.test(s.vide), s.vide);
  await chercher(p, 'x'.repeat(220)); let d = await L.deborde(c); v('recherche de 220 caractères sans espace : la page ne glisse pas de côté', d.bouge === 0, d);
  await chercher(p, '<b>gras</b><img src=x onerror=window.__xss=1>'); await p.waitForTimeout(200); v('recherche avec du HTML : rien n’est interprété', await p.evaluate(() => !window.__xss && !document.querySelector('#contenu .carte.gris b')), null);
  for (const q of ['(', '[', '\\', '+', '.*', '$']) { await chercher(p, q); const e = await p.evaluate(() => !!document.querySelector('#contenu h1')); v(`recherche « ${q} » : l’écran tient`, e); }
  await chercher(p, ''); s = await lire(p); v('recherche effacée : tous les clients reviennent', s.cartes === base.n, s);
  // ── la recherche survit-elle à l'ouverture d'une fiche puis « Retour » ? ──
  await chercher(p, 'roux'); await L.toucher(c, '.client-carte'); await L.calme(p, 400); s = await lire(p); v('une carte filtrée ouvre la bonne fiche (Mme Roux)', s.h1 === 'Mme Roux' && s.hash.includes('client-x-mr'), s);
  await L.toucher(c, '.rl-retour, [data-retour]'); await L.calme(p, 400); s = await lire(p);
  v('« Retour » ramène à la liste', s.h1 === 'Clients', s); const garde = await p.evaluate(() => (document.querySelector('[data-cherche]') || {}).value);
  console.log('  · après Retour, la recherche contient : « ' + garde + ' » (' + s.cartes + ' carte(s))');
  v('« Retour » rend la liste dans l’état où on l’a quittée (recherche gardée) ou entière — jamais vide ni incohérente', (garde === 'roux' && s.cartes === 1) || (garde === '' && s.cartes === base.n), { garde, s });
  await chercher(p, ''); 
  // ── ouvrir chaque fiche, revenir ──
  let ok = 0; for (const k of base.cles) { await L.aller(p, 'clients'); const nom = await p.evaluate(k => CLIENTS[k].nom, k); const b = p.locator(`.client-carte[data-go="client-x-${k}"]`); const touche = await L.toucher(c, b);
    const s2 = await lire(p); const bon = touche && s2.h1 === nom && s2.hash.endsWith('client-x-' + k); if (bon) ok++; else v(`la carte « ${nom} » ouvre sa fiche`, false, { touche, s2 }); }
  v(`chaque carte (${ok}/${base.cles.length}) ouvre la fiche du bon client`, ok === base.cles.length);
  // ── rangements ──
  await L.aller(p, 'clients');
  await L.toucher(c, '[data-rangc="semaine"]'); const sem = await p.evaluate(() => ({ nav: (document.querySelector('.pl-nav b') || {}).textContent, lignes: document.querySelectorAll('#contenu .cs-l').length, vide: !!document.querySelector('#contenu .carte.gris'), pressed: document.querySelector('[data-rangc="semaine"]').getAttribute('aria-pressed') }));
  v('« Par semaine » : la semaine du jour s’affiche (« ' + sem.nav + ' ») avec ses passages', /Semaine du/.test(sem.nav) && sem.pressed === 'true' && (sem.lignes > 0 || sem.vide), sem);
  const avantNav = sem.nav; await L.toucher(c, '[data-semc="1"]'); const apres = await p.evaluate(() => (document.querySelector('.pl-nav b') || {}).textContent); v('« › » passe à la semaine suivante', apres !== avantNav, { avantNav, apres });
  await L.toucher(c, '[data-semc="-1"]'); await L.toucher(c, '[data-semc="-1"]'); const av2 = await p.evaluate(() => (document.querySelector('.pl-nav b') || {}).textContent); v('« ‹ » remonte d’une semaine (deux fois : encore valide)', av2 !== avantNav && /Semaine du/.test(av2), av2);
  for (let i = 0; i < 60; i++) { await p.evaluate(() => { semClients = ajoute(semClients, -7); rendre(); }); }
  const lointain = await p.evaluate(() => ({ nav: (document.querySelector('.pl-nav b') || {}).textContent, vide: (document.querySelector('#contenu .carte.gris') || {}).textContent })); v('une semaine très ancienne (60 semaines avant) : message clair, pas d’écran cassé', /Semaine du/.test(lointain.nav) && /Aucune intervention/.test(lointain.vide || ''), lointain);
  await p.evaluate(() => { semClients = AUJ; rendre(); }); await L.calme(p, 300);
  const ls = await p.locator('#contenu .cs-l').count(); if (ls) { const nom = await p.locator('#contenu .cs-l b').nth(1).textContent(); await L.toucher(c, '#contenu .cs-l'); const s3 = await lire(p); v('un passage de la semaine ouvre la fiche de son client (« ' + s3.h1 + ' »)', s3.hash.includes('client-x-'), s3); await L.toucher(c, '.rl-retour, [data-retour]'); const s4 = await lire(p); console.log('  · « Retour » depuis la semaine → ' + s4.h1 + ' / ' + (await p.evaluate(() => rangClients))); v('« Retour » depuis un passage de la semaine rend la liste', s4.h1 === 'Clients', s4); }
  await L.toucher(c, '[data-rangc="mois"]'); const mois = await p.evaluate(() => { const A = parMois(); return { n: document.querySelectorAll('#contenu details.mois').length, attendu: A.length, titres: [...document.querySelectorAll('#contenu details.mois summary b')].map(b => b.textContent),
      ecart: A.map(([mk, x]) => { const brut = FACTURES.filter(f => (isoFac(f) || '').slice(0, 7) === mk && f.st !== 'avoir').reduce((s, f) => s + ttcDe(f), 0); return { mk, ecart: Math.round((brut - x.payes - x.apayer) * 100) / 100 }; }).filter(e => Math.abs(e.ecart) > 0.01) }; });
  v('« Par mois » : un bloc par mois (' + mois.n + ')', mois.n === mois.attendu && mois.n >= 2, mois);
  v('« Par mois » : « payé » + « à payer » égale le total des factures du mois (sinon un règlement partiel disparaît du total) ' + JSON.stringify(mois.ecart), mois.ecart.length === 0, mois.ecart);
  await p.evaluate(() => document.querySelectorAll('#contenu details.mois').forEach(d => d.open = true)); await L.calme(p, 300);
  const lm = await p.locator('#contenu .cm-l').count(); v('« Par mois » : les lignes client sont là (' + lm + ')', lm > 3);
  if (lm) { await L.toucher(c, '#contenu .cm-l'); const s5 = await lire(p); v('une ligne d’un mois ouvre la fiche d’un client', s5.hash.includes('client-x-') && !!s5.h1, s5); }
  // totaux : la carte de la liste dit la même chose que la fiche
  await L.aller(p, 'clients'); await L.toucher(c, '[data-rangc="tous"]');
  const coh = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').map(k => { const du = FACTURES.filter(f => f.cli === k && ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0); return { k, paye: Math.round(payeClient(k) * 100) / 100, du: Math.round(du * 100) / 100 }; }));
  const cartes = await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte')].map(e => ({ k: e.dataset.go.replace('client-x-', ''), t: [...e.querySelectorAll('.client-chiffres b')].map(b => b.textContent) })));
  let bad = []; const cents = L.cents; for (const x of coh) { const ca = cartes.find(q => q.k === x.k); if (!ca || cents(ca.t[0]) !== Math.round(x.paye * 100) || cents(ca.t[1]) !== Math.round(x.du * 100)) bad.push({ x, ca }); }
  v('chaque carte affiche le payé et le reste à recevoir que donnent les factures et les encaissements', bad.length === 0, bad.slice(0, 2));
  // la fiche dit les mêmes chiffres que la carte (au centime)
  let incoh = []; for (const x of coh.slice(0, 8)) { await L.aller(p, 'client-x-' + x.k); const k = await p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi b')].slice(0, 2).map(b => b.textContent)); if (cents(k[0]) !== Math.round(x.paye * 100) || cents(k[1]) !== Math.round(x.du * 100)) incoh.push({ k: x.k, kpi: k, x }); }
  v('la fiche de chaque client dit le même « payé » et le même « à recevoir » que sa carte', incoh.length === 0, incoh.slice(0, 2));
  // mise en page
  await L.aller(p, 'clients'); d = await L.deborde(c); v('liste : aucun glissement latéral (largeur ' + c.largeur + ')', d.bouge === 0, d);
  if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('liste : cibles au doigt ≥ 44 px', g.petits.length === 0, g.petits); v('liste : champs ≥ 16 px', g.champs.length === 0, g.champs); v('liste : aucun texte écrasé', g.ecrases.length === 0, g.ecrases); }
  await L.toucher(c, '[data-rangc="mois"]'); await p.evaluate(() => document.querySelectorAll('#contenu details.mois').forEach(d => d.open = true)); d = await L.deborde(c); v('par mois (tout ouvert) : aucun glissement latéral', d.bouge === 0, d);
  await L.capture(c, CAP + `liste-mois-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await L.toucher(c, '[data-rangc="semaine"]'); await L.capture(c, CAP + `liste-semaine-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
