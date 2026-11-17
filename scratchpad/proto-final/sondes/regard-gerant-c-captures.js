// LE REGARD — gérant, rubriques Stock · Fournisseurs, matériel & produits · Dépôts et camions (17 novembre 2026).
// Prend, pour UN profil et UN mode (jour/nuit), les captures de chaque écran, onglet, fiche, fenêtre de création, état VIDE et
// état PLEIN à valeurs longues. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui les juge, pas cette sonde.
//   node regard-gerant-c-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png (n = position de défilement : 0 = haut, puis une fenêtre plus bas…)
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-c/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '3', 10);

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 € », quantité à quatre chiffres
const longues = () => { const N60 = 'Raccord à compression en laiton chromé pour tube multicouche 20';
  window.__sauve = JSON.stringify({ P: PRODUITS, F: MES_FOURN, Lx: LIEUX.map(l => l.nom) });
  PRODUITS.forEach((x, n) => { if (n % 2 === 0) { x.nom = N60 + ' ' + n; x.pa = 12345.67; x.pv = 12345.67 + 100; x.q = 1523.5; } });
  MES_FOURN.forEach((f, n) => { f.nom = n % 2 ? 'Établissements Réunis de Distribution Thermique et Sanitaire du Littoral' : f.nom; });
  LIEUX.forEach((l, n) => { if (n % 2 === 0 && l.id !== 'atelier') l.nom = 'Camion de Jean-Baptiste de la Roche-Saint-Aubin-sur-Mer'; });
};
const rendre = async p => { await p.evaluate(() => { rendre(); }); await L.calme(p, 500); };

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  const fait = [], manque = [];
  async function prendre(nom) {
    if (filtre && !nom.includes(filtre)) return;
    const mesure = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const ouvert = pan && (pan.offsetParent !== null || getComputedStyle(pan).display !== 'none');
      const el = ouvert ? pan : document.scrollingElement; return { panneau: !!ouvert, sh: el.scrollHeight, ch: ouvert ? el.clientHeight : innerHeight, st: el.scrollTop }; });
    let m = await mesure();
    for (let i = 0; i < MAXDEFIL; i++) {
      await L.capture(c, `${CAP}${nom}-${tag}-s${i}.png`, false);
      m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
      await p.evaluate(({ pan, dy }) => { const el = pan ? document.querySelector('#calque .panneau') : document.scrollingElement; el.scrollTop = el.scrollTop + dy; }, { pan: m.panneau, dy: Math.round(m.ch * 0.85) }); await L.calme(p, 350);
    }
    await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = 0; scrollTo(0, 0); }); await L.calme(p, 200);
    fait.push(nom);
  }
  const scene = async (nom, fn) => { if (filtre && !nom.includes(filtre)) return; try { const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); } try { await L.ranger(p); } catch (e) {} };
  const va = h => async () => { await L.aller(p, h); };
  const ev = (f, a) => async () => { await p.evaluate(f, a); await L.calme(p, 600); };

  // ── 1. STOCK ────────────────────────────────────────────────────────────────────────────────────────────
  await scene('c01-stock-articles', va('stock'));
  await scene('c02-stock-bouge', async () => { await L.aller(p, 'stock'); return clic('[data-ms="onglet|mvts"]'); });
  await scene('c03-stock-maj', async () => { await L.aller(p, 'stock'); return clic('[data-ms=maj]'); });
  await scene('c04-stock-plus', async () => { await L.aller(p, 'stock'); return clic('[data-ms=plus]'); });
  await scene('c05-stock-fiche', async () => { await L.aller(p, 'stock'); await p.evaluate(() => prFiche('p1')); await L.calme(p, 600); });
  await scene('c06-stock-fiche-rupture', async () => { await L.aller(p, 'stock'); await p.evaluate(() => prFiche('p3')); await L.calme(p, 600); });
  await scene('c07-stock-envois', async () => { await L.aller(p, 'stock'); await p.evaluate(() => msEnvois()); await L.calme(p, 600); });
  await scene('c08-stock-filtrer', async () => { await L.aller(p, 'stock'); await p.evaluate(() => { stkOnglet = 'mvts'; }); await rendre(p); await p.evaluate(() => msFiltrer()); await L.calme(p, 600); });
  await p.evaluate(() => { stkOnglet = 'ensemble'; });
  await scene('c08b-stock-ou', async () => { await L.aller(p, 'stock'); return clic('[data-ms=ou]'); });
  await scene('c09-stock-compter', async () => { await L.aller(p, 'stock'); await p.evaluate(() => matCompter()); await L.calme(p, 600); });
  await scene('c10-stock-compter-atelier', async () => { await L.aller(p, 'stock'); await p.evaluate(() => matCompter('atelier')); await L.calme(p, 600); });
  await scene('c11-stock-recherche', async () => { await L.aller(p, 'stock'); await p.evaluate(() => { stkQ = 'filtre'; }); await rendre(p); });
  await scene('c12-stock-recherche-vide', async () => { await L.aller(p, 'stock'); await p.evaluate(() => { stkQ = 'zzzzzzz'; }); await rendre(p); await p.evaluate(() => { stkQ = ''; }); });
  await scene('c13-stock-vide', async () => { await p.evaluate(() => { window.__s = JSON.stringify({ P: PRODUITS, M: MVTS, A: MVTS_ATT }); PRODUITS.length = 0; MVTS.length = 0; MVTS_ATT.length = 0; }); await L.aller(p, 'stock'); });
  await scene('c14-stock-bouge-vide', async () => { await p.evaluate(() => { stkOnglet = 'mvts'; }); await L.aller(p, 'stock'); });
  await p.evaluate(() => { stkOnglet = 'ensemble'; }); await scene('c14b-stock-vide-articles', va('stock'));
  await p.evaluate(() => { stkOnglet = 'ensemble'; if (window.__s) { const s = JSON.parse(window.__s); [[PRODUITS, s.P], [MVTS, s.M], [MVTS_ATT, s.A]].forEach(([a, b]) => { a.length = 0; b.forEach(x => a.push(x)); }); } });
  await scene('c15-stock-plein-long', async () => { await p.evaluate(longues); await L.aller(p, 'stock'); });
  await scene('c16-stock-bouge-long', async () => { await p.evaluate(() => { stkOnglet = 'mvts'; }); await L.aller(p, 'stock'); });
  await p.evaluate(() => { stkOnglet = 'ensemble'; });

  // ── 2. FOURNISSEURS, MATÉRIEL & PRODUITS (plein long encore actif : les scènes « plein » d'abord) ───────────
  await scene('f01-four-commandes-long', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); });
  await scene('f02-four-articles-long', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); });
  await scene('f03-four-fournisseurs-long', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); });
  // retour aux valeurs normales
  await p.evaluate(() => { if (window.__sauve) { const s = JSON.parse(window.__sauve); PRODUITS.length = 0; s.P.forEach(x => PRODUITS.push(x)); MES_FOURN.length = 0; s.F.forEach(x => MES_FOURN.push(x)); LIEUX.forEach((l, i) => { l.nom = s.Lx[i]; }); } });
  await scene('f10-four-commandes', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); });
  await scene('f11-four-articles', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); });
  await scene('f12-four-fournisseurs', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); });
  await scene('f13-four-plus', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); return clic('[data-fx=plus]'); });
  await scene('f14-four-tri', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); await clic('[data-fx=plus]'); return p.evaluate(() => { const b = [...document.querySelectorAll('.ctx button[data-k]')].find(x => /Trier/.test(x.textContent)); if (!b) return false; b.click(); return true; }).then(async ok => { await L.calme(p, 500); return ok; }); });
  await scene('f15-four-article-fiche', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); await p.evaluate(() => prFiche('p4')); await L.calme(p, 600); });
  await scene('f16-four-article-nouveau', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); return clic('[data-pr^="nouveau"]'); });
  await scene('f17-four-fournisseur-fiche', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); await p.evaluate(() => fournFiche('cpa')); await L.calme(p, 600); });
  await scene('f18-four-fournisseur-fiche2', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); await p.evaluate(() => fournFiche('sp17')); await L.calme(p, 600); });
  await scene('f19-four-fournisseur-ajouter', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); return clic('[data-fo=liste]'); });
  await scene('f20-four-commande-nouvelle', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); return clic('[data-ce=nouvelle]'); });
  await scene('f21-four-commande-voir', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); return clic('[data-cm^="voir"]'); });
  await scene('f22-four-photo-facture', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); return clic('[data-fo^="facture"]'); });
  await scene('f23-four-importer-prix', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); await p.evaluate(() => fournTarifs('')); await L.calme(p, 600); });
  await scene('f24-four-habituels', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); await p.evaluate(() => fxHabituels()); await L.calme(p, 600); });
  await scene('f25-four-rangement', async () => { await p.evaluate(() => { prVue = 'commandes'; }); await L.aller(p, 'produits'); await p.evaluate(() => prRangement(PACKS_ENT[0])); await L.calme(p, 600); });
  await scene('f26-four-articles-recherche-vide', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); });
  await scene('f30-four-vide-commandes', async () => { await p.evaluate(() => { window.__s2 = JSON.stringify({ P: PRODUITS, F: MES_FOURN, C: COMMANDES }); PRODUITS.length = 0; MES_FOURN.length = 0; COMMANDES.length = 0; prVue = 'commandes'; }); await L.aller(p, 'produits'); });
  await scene('f31-four-vide-articles', async () => { await p.evaluate(() => { prVue = 'articles'; }); await L.aller(p, 'produits'); });
  await scene('f32-four-vide-fournisseurs', async () => { await p.evaluate(() => { prVue = 'fournisseurs'; }); await L.aller(p, 'produits'); });
  await p.evaluate(() => { if (window.__s2) { const s = JSON.parse(window.__s2); [[PRODUITS, s.P], [MES_FOURN, s.F], [COMMANDES, s.C]].forEach(([a, b]) => { a.length = 0; b.forEach(x => a.push(x)); }); } prVue = 'commandes'; });

  // ── 3. DÉPÔTS ET CAMIONS ─────────────────────────────────────────────────────────────────────────────────
  await scene('d01-depots', va('boxes'));
  await scene('d02-depots-plus', async () => { await L.aller(p, 'boxes'); return clic('[data-md=plus]'); });
  await scene('d03-depots-remplir', async () => { await L.aller(p, 'boxes'); return clic('[data-md=remplir]'); });
  await scene('d04-depots-nouvelle', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => bxNouveau('')); await L.calme(p, 600); });
  await scene('d05-depots-fiche-camion', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => bxFiche('v1')); await L.calme(p, 600); });
  await scene('d06-depots-fiche-camion2', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => bxFiche('v3')); await L.calme(p, 600); });
  await scene('d07-depots-fiche-atelier', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => bxFiche('atelier')); await L.calme(p, 600); });
  await scene('d08-depots-fiche-reserve', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => bxFiche('d-hp')); await L.calme(p, 600); });
  await scene('d09-depots-fermes', async () => { await L.aller(p, 'boxes'); await p.evaluate(() => mdFermes()); await L.calme(p, 600); });
  await scene('d10-depots-long', async () => { await p.evaluate(longues); await L.aller(p, 'boxes'); });
  await scene('d11-depots-fiche-long', async () => { await p.evaluate(() => bxFiche('v1')); await L.calme(p, 600); });
  await p.evaluate(() => { if (window.__sauve) { const s = JSON.parse(window.__sauve); PRODUITS.length = 0; s.P.forEach(x => PRODUITS.push(x)); MES_FOURN.length = 0; s.F.forEach(x => MES_FOURN.push(x)); LIEUX.forEach((l, i) => { l.nom = s.Lx[i]; }); } });
  await scene('d12-depots-vide', async () => { await p.evaluate(() => { window.__s3 = JSON.stringify(LIEUX); LIEUX.length = 0; }); await L.aller(p, 'boxes'); });
  await p.evaluate(() => { if (window.__s3) { LIEUX.length = 0; JSON.parse(window.__s3).forEach(x => LIEUX.push(x)); } });

  console.log(`${tag} : ${fait.length} scènes prises ; manquées : ${manque.length ? '\n  ' + manque.join('\n  ') : 'aucune'} ; erreurs page : ${c.err.length ? '\n  ' + c.err.slice(0, 6).join('\n  ') : 'aucune'}`);
  await L.fin(c); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
