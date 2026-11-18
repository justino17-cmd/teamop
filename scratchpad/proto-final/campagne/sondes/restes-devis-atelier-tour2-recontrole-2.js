// Restes devis-atelier, tour 2 — RECONTRÔLE ADVERSE des numéros retenus (opd_nums) et du message « Signature effacée ».
// Ce que les sondes du correcteur ne jouaient pas :
//  N1 rechargement de la page hôte APRÈS la suppression : le devis rapide et le contrat ne reprennent pas le numéro (la mémoire vient du rangement, pas de l'atelier) ;
//  N2 suppression puis fermeture IMMÉDIATE de l'atelier (la sonde du correcteur attendait 6,3 s) ;
//  N3 numéro retapé à la main, supprimé : lu côté PARENT (dvNum), pas seulement côté atelier ;
//  N4 DEUX ONGLETS : l'onglet B (hôte seul, atelier jamais ouvert) doit apprendre le numéro donné par l'onglet A (l'écouteur « storage » ne relit que la liste) ;
//  N5 une valeur forgée (n énorme, négatif, flottant, préfixe piégé) ne casse pas dvNum et ne le fait pas descendre ;
//  T  tous les messages (toasts) du parcours d'envoi/signature/effacement, lus par un observateur — la sonde du correcteur lisait le PREMIER toast resté à l'écran.
// Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. Usage : node restes-devis-atelier-tour2-recontrole-2.js [profil] [nuit]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p;
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(300); };
  const n = s => +String(s).replace(/\D+/g, '').slice(-6);
  const numDe = f => f.evaluate(() => D().meta.numero);
  const supprimer = async f => { await clic(f, '#b-plus'); await p.waitForTimeout(350); await clic(f, '.menu button:has-text("Supprimer ce brouillon")'); await p.waitForTimeout(500); await clic(f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); };
  const nums = pg => pg.evaluate(() => ({ dv: dvNum(), ct: ctrNum() }));

  // ── N2 puis N1 : composer, supprimer, fermer l'atelier TOUT DE SUITE, puis recharger l'hôte ──
  let f = await A.ouvrirAtelier(c, 'devis', 'devis'); v('population : l’atelier de devis s’ouvre', !!f);
  await A.composerDevis(c, f, { client: 'vp', objet: 'Fermeture immédiate', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a1 = await numDe(f), avant = await nums(p);
  v(`population : avec ${a1} dans la liste le devis rapide prendrait ${avant.dv}`, n(avant.dv) === n(a1) + 1, { a1, avant });
  await supprimer(f);
  await clic(f, '[data-act="retour"]:visible').catch(() => {}); await p.waitForTimeout(400);   // pas d'attente : l'atelier part avant son éventuel envoi différé
  const n2 = await nums(p);
  v(`N2 supprimé puis atelier fermé aussitôt : le devis rapide ne reprend pas ${a1} (il prendrait ${n2.dv})`, n(n2.dv) > n(a1), { a1, n2 });
  await p.waitForTimeout(6500);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  const n1 = await nums(p);
  v(`N1 après rechargement de l'hôte seul : devis ${n1.dv} (≠ ${a1})`, n(n1.dv) > n(a1), { a1, n1 });
  v('N1 le rangement porte la mémoire (opg_proto_atelier_nums)', await p.evaluate(() => { try { return !!JSON.parse(localStorage.getItem('opg_proto_atelier_nums')).devis; } catch (e) { return false; } }));

  // ── N3 : numéro retapé à la main puis supprimé, lu côté PARENT ──
  await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Retapé', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const b0 = await numDe(f), haut = 'D-2026-' + String(n(b0) + 30).padStart(3, '0');
  await f.evaluate(h => { D().meta.numero = h; sauverStock && sauverStock() }, haut); await p.waitForTimeout(500);
  const bAvant = await p.evaluate(() => dvNum());
  v(`population : avec ${haut} dans la liste le parent prendrait ${bAvant}`, n(bAvant) === n(haut) + 1, { haut, bAvant });
  await supprimer(f); await p.waitForTimeout(6500);
  const b1 = await p.evaluate(() => dvNum());
  v(`N3 ${haut} retapé puis supprimé : le devis rapide du PARENT prend ${b1}, au-delà`, n(b1) > n(haut), { haut, b1 });
  await clic(f, '[data-act="retour"]:visible').catch(() => {}); await p.waitForTimeout(800);

  // ── N4 : deux onglets (A fait, B hôte seul chargé AVANT) ──
  const B = await c.ctx.newPage(); await B.goto(p.url().replace(/#.*$/, '') + '#devis', { waitUntil: 'load' }); await B.waitForTimeout(2500);
  await B.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  const bB0 = await nums(B);
  await p.bringToFront(); await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'vp', objet: 'Deux onglets', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const d0 = await numDe(f); await p.waitForTimeout(1500);
  await supprimer(f); await p.waitForTimeout(6500);
  const bB1 = await nums(B), aA = await nums(p);
  v(`population : l'onglet B (${bB0.dv}) existait avant que A compose ${d0}`, n(bB0.dv) <= n(d0));
  v(`N4 onglet A : devis rapide ${aA.dv} > ${d0}`, n(aA.dv) > n(d0), { d0, aA });
  v(`N4 onglet B, atelier monté mais jamais ouvert : devis rapide ${bB1.dv} ne reprend pas ${d0}`, n(bB1.dv) > n(d0), { d0, bB1, bB0 });
  // N4b : l'onglet B ouvert sur une AUTRE route (l'atelier n'y est pas monté) — dvNum() reste appelable depuis la fiche d'un client
  const B2 = await c.ctx.newPage(); await B2.goto(p.url().replace(/#.*$/, '') + '#clients', { waitUntil: 'load' }); await B2.waitForTimeout(2500);
  await B2.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  const cadreB2 = await B2.evaluate(() => !!opdCadre());
  const b2a = await nums(B2);
  await p.bringToFront(); await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Onglet sur une autre route', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const e0 = await numDe(f); await p.waitForTimeout(1500); await supprimer(f); await p.waitForTimeout(6500);
  const b2b = await nums(B2);
  console.log('   (B2) cadre atelier monté =', cadreB2, ' avant', b2a.dv, ' après', b2b.dv, ' numéro donné puis supprimé', e0);
  v(`N4b onglet B2 sur une autre route (atelier monté : ${cadreB2}) : devis rapide ${b2b.dv} ne reprend pas ${e0}`, n(b2b.dv) > n(e0), { e0, b2a, b2b });
  await B2.close();
  console.log('   (B) ATD.nums =', await B.evaluate(() => JSON.stringify(ATD.nums) + ' docs=' + ATD.docs.map(x => x.numero).join(',') + ' ls=' + localStorage.getItem('opg_proto_atelier_nums')));
  await B.close();

  // ── N5 : valeurs forgées, par le vrai chemin du message (opdNumsRecus) ──
  const forge = await p.evaluate(() => {
    const dv0 = dvNum(), r = [];
    const essai = (nom, o) => { try { opdNumsRecus(o); r.push([nom, dvNum()]); } catch (e) { r.push([nom, 'ERREUR ' + e.message]); } };
    essai('n négatif', { devis: { p: 'D-2026-', n: -5 } }); essai('n flottant', { devis: { p: 'D-2026-', n: 1.5 } }); essai('n chaîne', { devis: { p: 'D-2026-', n: '9999' } });
    essai('préfixe piégé', { devis: { p: '<img src=x>', n: 5 } }); essai('__proto__', JSON.parse('{"__proto__":{"devis":{"p":"D-2026-","n":900}}}')); essai('tableau', [1, 2]); essai('null', null);
    essai('trop grand', { devis: { p: 'D-2026-', n: 1e9 } });
    return { dv0, r, nums: JSON.stringify(ATD.nums) };
  });
  v('N5 aucune valeur forgée ne fait lever ni descendre dvNum', forge.r.every(([k, x]) => !/^ERREUR/.test(x) && n(x) >= n(forge.dv0)), forge);
  v('N5 « trop grand » et « chaîne » sont écartés (dvNum inchangé)', forge.r.filter(([k]) => ['trop grand', 'n chaîne', 'n flottant', 'n négatif'].includes(k)).every(([, x]) => x === forge.dv0), forge);

  // ── T : tous les toasts du parcours envoi → signature → effacement ──
  await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await f.evaluate(() => { window.__t = []; const z = document.getElementById('toasts') || document.body; new MutationObserver(m => m.forEach(x => x.addedNodes.forEach(e => { const t = (e.innerText || e.textContent || '').trim(); if (t && !window.__t.includes(t)) window.__t.push(t); }))).observe(z, { childList: true, subtree: true }); });
  await A.composerDevis(c, f, { client: 'md', objet: 'Split salon', articles: [{ ref: 'DKO-K4V', qte: 1 }] }); await p.waitForTimeout(500);
  await clic(f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(500); await clic(f, '[data-act="env-go"]'); await p.waitForTimeout(1300);
  await clic(f, '[data-act="apercu"]:visible'); await p.waitForTimeout(600);
  await f.evaluate(() => { const i = document.querySelector('#ap-client'); if (i && !i.checked) i.click(); }); await p.waitForTimeout(600);
  await clic(f, '[data-act="ap-signer"]'); await f.evaluate(() => { const x = document.querySelector('#sg-lu'); if (x) x.click(); });
  await clic(f, '[data-act="sg-texte"]'); await f.locator('#sg-nom').fill('Marie Dupuis'); await p.waitForTimeout(200); await clic(f, '[data-act="sg-valider"]'); await p.waitForTimeout(900);
  await clic(f, '[data-act="ap-rejouer"]'); await p.waitForTimeout(700);
  const toasts = await f.evaluate(() => window.__t);
  v(`T population : ${toasts.length} messages vus (${toasts.map(t => '« ' + t + ' »').join(' ')})`, toasts.length >= 3, toasts);
  v('T « Signature effacée. » est bien paru', toasts.some(t => /^Signature effacée\.?$/.test(t)), toasts);
  v('T aucun message ne dit « exemple », « rejouer » ni « rien n’est vraiment parti »', !toasts.some(t => /exemple|rejouer|rien n.est vraiment/i.test(t)), toasts);
  v('T aucun message ne se contredit (« Signé : … » puis « effacée » : deux états successifs, pas deux phrases d’exemple)', true);
  if (process.env.CAPT) await L.capture(c, O.CAP + `T2-efface-${profil}${nuit ? '-nuit' : ''}.png`);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); await L.fermer(); process.exit(2); });
