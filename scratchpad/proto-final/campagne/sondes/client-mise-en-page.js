// Espace client : mise en page sur un profil, jour ou nuit, avec ou sans valeurs LONGUES.
// node client-mise-en-page.js <profil> [jour|nuit] [longs] [app]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe ; captures à REGARDER dans le dossier temporaire.
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', longs = process.argv.includes('longs'), app = process.argv.includes('app');
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}${longs ? '-longs' : ''}${app ? '-app' : ''}`;
const contraste = p => p.evaluate(() => { const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const lire = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { c: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 }; };
  const fond = e => { let n = e; const pile = []; while (n && n.nodeType === 1) { const b = lire(getComputedStyle(n).backgroundColor); if (b && b.a > 0) { pile.push(b); if (b.a >= .99) break; } n = n.parentElement; } let base = [255, 255, 255]; if (document.documentElement.dataset.mode === 'nuit') base = [11, 20, 38];
    for (const b of pile.reverse()) base = base.map((x, i) => Math.round(b.c[i] * b.a + x * (1 - b.a))); return base; };
  const bas = [], zone = document.querySelector('.ec') || document.body;
  for (const e of zone.querySelectorAll('*')) { if (e.children.length || !e.offsetParent) continue; const t = (e.textContent || '').trim(); if (!t) continue; const cs = getComputedStyle(e), c = lire(cs.color); if (!c) continue;
    const bg = fond(e), L1 = lum(c.c) + .05, L2 = lum(bg) + .05, r = Math.max(L1, L2) / Math.min(L1, L2), fs = parseFloat(cs.fontSize), gras = parseInt(cs.fontWeight) >= 700, seuil = (fs >= 24 || (fs >= 18.66 && gras)) ? 3 : 4.5;
    if (r < seuil) bas.push(`${t.slice(0, 30)} ${r.toFixed(2)}:1 (${fs}px)`); }
  return { n: zone.querySelectorAll('*').length, bas: [...new Set(bas)].slice(0, 12) }; });
(async () => {
  const c = app ? await O.clientApp({ profil, nuit, cli: 'md' }) : await O.client({ profil, nuit, cli: 'md' }); const p = c.p;
  if (longs) await p.evaluate(() => { const k = CLIENTS.md; k.nom = 'Société civile immobilière de la Résidence des Mouettes et des Goélands de La Rochelle'; k.contact = 'Maître Jean-Baptiste de la Villardière-Montaigu, gérant'; k.adr = '123 bis boulevard du Maréchal de Lattre de Tassigny, Résidence Les Hauts de Lagord, bâtiment C, 17140 Lagord';
    const f = FACTURES.find(x => x.id === 'f128'); f.objet = 'Installation complète d’une pompe à chaleur air/eau haute température avec ballon tampon et régulation'; f.lignes = [{ d: 'Pompe à chaleur', q: '1', pu: 10288.06 }]; f.ht = 0;
    const d = DV.find(x => x.num === 'D-2026-031'); d.objet = 'Remplacement complet de la pompe de relevage des eaux usées du sous-sol avec remise aux normes du tableau électrique'; d.lignes = [['Pompe de relevage grand débit', 1, 10288.06]];
    ENTREPRISE.nom = 'Clim Services 17 — Climatisation, chauffage, pompes à chaleur et entretien'; rendre(); }), await L.calme(p, 400);
  const pr = await p.evaluate(() => ({ cm: typeof CONTRATS }));
  const ecrans = [['accueil', 'Accueil'], ['factures', 'Factures'], ['interventions', 'Interventions'], ['devis', 'Devis'], ['contrats', 'Contrat']];
  for (const [t, nom] of ecrans) {
    await p.evaluate(x => { EC.tab = x; rendre(); scrollTo(0, 0); }, t); await L.calme(p, 450);
    const dep = await L.deborde(c); v(`${tag} · ${nom} : la page ne glisse pas de côté`, dep.bouge === 0, JSON.stringify(dep));
    const dg = await L.doigts(p, 'body'); if (c.doigt) { v(`${tag} · ${nom} : cibles au doigt ≥ 44 px`, dg.petits.length === 0, dg.petits.join(' ; ')); v(`${tag} · ${nom} : champs ≥ 16 px`, dg.champs.length === 0, dg.champs.join(' ; ')); }
    v(`${tag} · ${nom} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases.join(' ; '));
    const ct = await contraste(p); v(`${tag} · ${nom} : contraste des textes ≥ seuil (${ct.n} éléments)`, ct.bas.length === 0, ct.bas.join(' ; '));
    // le dernier contenu n'est pas caché par la barre du bas
    if (c.doigt) { const oc = await p.evaluate(() => { const b = document.querySelector('.opg-tabs, #barre, nav.opg-barre, .opg-tab') && document.querySelector('.opg-tab').parentElement; if (!b || !b.offsetParent) return { barre: false }; scrollTo(0, 99999); const rb = b.getBoundingClientRect(), z = document.querySelector('.ec-pied') || document.querySelector('.ec'), rz = z.getBoundingClientRect(); const r = { barre: true, hautBarre: Math.round(rb.top), basPied: Math.round(rz.bottom), h: innerHeight }; scrollTo(0, 0); return r; });
      if (oc.barre) v(`${tag} · ${nom} : le pied de page se lit entier au-dessus de la barre du bas`, oc.basPied <= oc.hautBarre + 1, JSON.stringify(oc)); }
    await L.capture(c, O.CAP + `mep-${tag}-${t}.png`); }
  // les fenêtres
  await p.evaluate(() => { EC.tab = 'factures'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-ec^="payer|"]'); await L.capture(c, O.CAP + `mep-${tag}-payer.png`); let dp = await L.doigts(p, '#calque'); v(`${tag} · fenêtre de paiement : champs ≥ 16 px et cibles ≥ 44 px`, !c.doigt || (dp.champs.length === 0 && dp.petits.length === 0), JSON.stringify(dp)); let dep = await L.deborde(c); v(`${tag} · fenêtre de paiement : pas de glissement latéral`, dep.bouge === 0, JSON.stringify(dep)); await O.nettoyer(p);
  await p.evaluate(() => { EC.tab = 'devis'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-ec^="signer|"]'); await L.capture(c, O.CAP + `mep-${tag}-devis-signer.png`); dp = await L.doigts(p, '#calque'); v(`${tag} · fenêtre du devis : champs ≥ 16 px et cibles ≥ 44 px`, !c.doigt || (dp.champs.length === 0 && dp.petits.length === 0), JSON.stringify(dp)); dep = await L.deborde(c); v(`${tag} · fenêtre du devis : pas de glissement latéral`, dep.bouge === 0, JSON.stringify(dep));
  await p.evaluate(() => { const q = document.querySelector('.panneau'); q && (q.scrollTop = 99999); }); await L.capture(c, O.CAP + `mep-${tag}-devis-signer-bas.png`); await O.nettoyer(p);
  await p.evaluate(() => { EC.tab = 'accueil'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-ec="demande"]'); await L.capture(c, O.CAP + `mep-${tag}-demande.png`); dp = await L.doigts(p, '#calque'); v(`${tag} · fenêtre de demande : champs ≥ 16 px et cibles ≥ 44 px`, !c.doigt || (dp.champs.length === 0 && dp.petits.length === 0), JSON.stringify(dp)); await O.nettoyer(p);
  await p.evaluate(() => { RL_CLI.cli = 'cm'; EC.tab = 'contrats'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-go^="signer-x-"]'); await L.calme(p, 400); await L.capture(c, O.CAP + `mep-${tag}-contrat-signer.png`); dep = await L.deborde(c); v(`${tag} · page de signature du contrat : pas de glissement latéral`, dep.bouge === 0, JSON.stringify(dep)); dp = await L.doigts(p, 'body'); v(`${tag} · page de signature : cibles ≥ 44 px`, !c.doigt || dp.petits.filter(x => !/Tester|Patron|Gestion|Technicien|Client|Métiers|Apprendre|De A/.test(x)).length === 0, dp.petits.join(' ; '));
  v(`${tag} · aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
