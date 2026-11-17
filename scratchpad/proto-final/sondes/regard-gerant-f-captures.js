// LE REGARD — gérant, rubriques Registre sanitaire · Carte des box · Devis xylophage (l'entreprise prend le pack 3D pour l'occasion).
// Prend, pour UN profil et UN mode (jour/nuit), les captures de chaque écran, onglet, fiche, fenêtre de création, état VIDE et
// état PLEIN à valeurs longues. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui les juge, pas cette sonde.
//   node regard-gerant-f-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png (n = position de défilement : 0 = haut, puis une fenêtre plus bas…)
const fs = require('fs'), path = require('path');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-f/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '3', 10);   // positions de défilement par scène (haut + MAXDEFIL-1 plus bas)

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  const fait = [], manque = [];
  async function prendre(nom) {
    if (filtre && !nom.includes(filtre)) return;
    // une fenêtre ouverte (panneau) défile dans SON conteneur ; sinon c'est la page
    const mesure = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const ouvert = pan && pan.offsetParent !== null || (pan && getComputedStyle(pan).display !== 'none');
      const el = ouvert ? pan : document.scrollingElement; return { panneau: !!ouvert, sh: el.scrollHeight, ch: ouvert ? el.clientHeight : innerHeight, st: el.scrollTop }; });
    let m = await mesure(), n = 0;
    for (let i = 0; i < MAXDEFIL; i++) {
      await L.capture(c, `${CAP}${nom}-${tag}-s${i}.png`, false); n++;
      m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
      await p.evaluate(({ pan, dy }) => { const el = pan ? document.querySelector('#calque .panneau') : document.scrollingElement; el.scrollTop = el.scrollTop + dy; }, { pan: m.panneau, dy: Math.round(m.ch * 0.85) }); await L.calme(p, 350);
    }
    await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = 0; scrollTo(0, 0); }); await L.calme(p, 200);
    fait.push(nom);
  }
  const scene = async (nom, fn) => { if (filtre && !nom.includes(filtre)) return; try { const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); } try { await L.ranger(p); } catch (e) {} };
  // l'état des trois écrans (client choisi, mode, filtre, relevé en cours, devis en préparation) survit d'une scène à l'autre : on le remet à neuf avant chacune
  const a3 = async h => { await p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; cbFiltre = 'tout'; cbZone = ''; rgTous = true; rgQ = ''; rgSaisie = null; DX = null; } catch (e) {} }); await L.aller(p, h); };
  const va = h => async () => { await a3(h); };

  // Le gérant d'une entreprise du métier 3D : les trois écrans n'existent que si le pack est pris (réglage de la Tour).
  await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);
  const site = async (h, k) => { await L.aller(p, h); if (k) await clic(`[data-rg="cli|${k}"]`, 600); };
  // ── 1. REGISTRE SANITAIRE ───────────────────────────────────────────────────────────────────────────────
  await scene('f01-reg-tous', va('registre'));
  await scene('f02-reg-site', async () => { await a3('registre'); return clic('[data-rg="cli|t1"]', 600); });
  await scene('f03-reg-site-t2', async () => { await a3('registre'); return clic('[data-rg="cli|t2"]', 600); });
  await scene('f04-reg-passage-ouvert', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-d3^="voir|"]', 600); });
  await scene('f05-reg-saisir', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg="passage"]', 800); });
  await scene('f06-reg-pdf', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg^="pdf|"]', 800); });
  await scene('f07-reg-reco', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg^="reco|attente"]', 800); });
  await scene('f08-reg-planifier', async () => { await a3('registre'); return clic('[data-rg^="planifier|"]', 800); });
  await scene('f09-reg-lien-duree', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg="lien|duree|7 jours"]', 600); });
  await scene('f10-reg-recherche-lot', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); await p.fill('#rg-q', 'zzz'); await L.calme(p, 500); });
  // ── 2. CARTE DES BOX ────────────────────────────────────────────────────────────────────────────────────
  await scene('g01-cb', va('carteBox'));
  await scene('g02-cb-t2', async () => { await a3('carteBox'); return clic('[data-d3="cli|t2"]', 600); });
  await scene('g03-cb-fiche-box', async () => { await a3('carteBox'); return clic('[data-d3="box|P1"]', 600); });
  await scene('g04-cb-fiche-box-alerte', async () => { await a3('carteBox'); return clic('[data-d3="box|P3"]', 600); });
  await scene('g05-cb-filtre-regarder', async () => { await a3('carteBox'); return clic('[data-cbx="filtre|regarder"]', 600); });
  await scene('g06-cb-releve', async () => { await a3('carteBox'); return clic('[data-cbx="rel"]', 800); });
  await scene('g07-cb-ajout', async () => { await a3('carteBox'); return clic('[data-d3="ajout"]', 700); });
  await scene('g08-cb-plus', async () => { await a3('carteBox'); return clic('.cb-plus summary', 500); });
  await scene('g09-cb-pdf', async () => { await a3('carteBox'); await clic('.cb-plus summary', 400); return clic('[data-cbx="pdf"]', 800); });
  await scene('g10-cb-envoi', async () => { await a3('carteBox'); await clic('.cb-plus summary', 400); return clic('[data-cbx="envoi"]', 800); });
  await scene('g11-cb-etiquettes', async () => { await a3('carteBox'); await clic('.cb-plus summary', 400); return clic('[data-cbx="etiq"]', 800); });
  await scene('g12-cb-modifier-plan', async () => { await a3('carteBox'); await clic('.cb-plus summary', 400); return clic('[data-cbx="edit"]', 800); });
  // ── 3. DEVIS XYLOPHAGE ──────────────────────────────────────────────────────────────────────────────────
  await scene('h01-dx', va('devisXylo'));
  await scene('h02-dx-client-zone', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await L.calme(p, 500); await clic('[data-dxb="zadd|Combles|bois"]', 500); await p.fill('[data-dx="zm|z1"]', '45').catch(() => {}); await L.calme(p, 500); });
  await scene('h03-dx-preventif', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic('[data-dxb="zadd|Charpente|bois"]', 400); await clic('[data-dxb="mode|preventif"]', 600); });
  await scene('h04-dx-termites', async () => { await a3('devisXylo'); await clic('[data-dxb="insecte|termites"]', 600); });
  await scene('h05-dx-merule', async () => { await a3('devisXylo'); await clic('[data-dxb="insecte|merule"]', 600); });
  await scene('h06-dx-reglages', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic('[data-dxb="zadd|Combles|bois"]', 400); await clic('.xy-reg summary', 500); });
  await scene('h07-dx-nouveau-client', async () => { await a3('devisXylo'); await p.evaluate(() => { const s = document.querySelector('[data-dx="cli"]'); const o = [...s.options].find(x => /nouveau|__nv/i.test(x.value + x.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }); await L.calme(p, 600); });
  await scene('h08-dx-zones-rempli', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); for (const z of ['Combles', 'Plancher', 'Cave']) await clic(`[data-dxb="zadd|${z}|bois"]`, 300); await p.evaluate(() => { document.querySelectorAll('[data-dx^="zm|"]').forEach((e, i) => { e.value = String(30 + i * 20); e.dispatchEvent(new Event('input', { bubbles: true })); }); }); await L.calme(p, 600); });
  await scene('h09-dx-creer', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic('[data-dxb="zadd|Combles|bois"]', 400); await p.evaluate(() => { const e = document.querySelector('[data-dx^="zm|"]'); e.value = '60'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.calme(p, 500); return clic('[data-dxb="creer"]', 900); });
  // ── 4. ÉTAT VIDE ────────────────────────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { window.__sv = { C: { ...D3_CLI }, Q: JSON.stringify(D3_POSTES) }; });
  await scene('z01-vide-cb-sans-box', async () => { await p.evaluate(() => { D3_POSTES = Object.fromEntries(Object.keys(D3_POSTES).map(k => [k, []])); }); await a3('carteBox'); });
  await p.evaluate(() => { D3_POSTES = JSON.parse(window.__sv.Q); });
  // aucun site au registre (une entreprise qui prend le métier 3D et n'a encore aucun client suivi)
  await p.evaluate(() => { Object.keys(D3_CLI).forEach(k => delete D3_CLI[k]); });
  await scene('z02-vide-reg-aucun-site', va('registre'));
  await scene('z03-vide-cb-aucun-site', va('carteBox'));
  await p.evaluate(() => { Object.assign(D3_CLI, window.__sv.C); }); await a3('registre');
  // ── 5. ÉTAT PLEIN : valeurs longues ─────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { window.__nm = Object.fromEntries(Object.entries(D3_CLI).map(([k, v]) => [k, [v.nom, v.adr]])); const NOMS = ['Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA', 'Résidence Les Terrasses de la Grande Plage et du Vieux Port', 'Société Coopérative Agricole des Producteurs Réunis de la Vallée']; Object.keys(D3_CLI).forEach((k, i) => { D3_CLI[k].nom = NOMS[i % 3]; D3_CLI[k].adr = '1523 avenue du Maréchal de Lattre de Tassigny, Zone industrielle des Grands Marais, 17000 La Rochelle'; if (CLIENTS[RG_SITES[k]]) CLIENTS[RG_SITES[k]].nom = NOMS[i % 3]; }); rendre(); });
  await scene('y01-long-reg-tous', va('registre'));
  await scene('y02-long-reg-site', async () => { await a3('registre'); return clic('[data-rg="cli|t1"]', 600); });
  await scene('y03-long-reg-saisir', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg="passage"]', 800); });
  await scene('y04-long-cb', va('carteBox'));
  await scene('y05-long-cb-fiche', async () => { await a3('carteBox'); return clic('[data-d3="box|P1"]', 600); });
  await scene('y06-long-dx', async () => { await a3('devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic('[data-dxb="zadd|Combles|bois"]', 400); await p.evaluate(() => { const e = document.querySelector('[data-dx^="zm|"]'); e.value = '12345'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.calme(p, 500); });
  console.log(`[${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 5).join(' | ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify({ fait, manque, err: c.err }));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
