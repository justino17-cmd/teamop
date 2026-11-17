// SECOND REGARD du gérant, rubriques Clients · Devis · Contrats · Boîte mail · Comptabilité · Achats et frais (17 novembre 2026).
// Recapture, pour UN profil et UN mode, les écrans que le premier regard dit corrigés, leurs voisins (qui partagent la même règle)
// et dix écrans qu'il dit sans défaut. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui juge.
//   node regard-gerant-b-recontrole-captures.js <profil> [nuit] [qui] [filtre]
const fs = require('fs'), path = require('path');
const L = require('../lib.js');
const CAP = process.env.CAP_REC || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rec-b/';
const args = process.argv.slice(2), profil = args[0] || 'mac', nuit = args.includes('nuit');
const QUI = ['marc', 'julie', 'sm', 'kb'].find(q => args.includes(q)) || 'marc';
const filtre = args.slice(1).find(a => a !== 'nuit' && !['marc', 'julie', 'sm', 'kb'].includes(a)) || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}${QUI === 'marc' ? '' : '-' + QUI}`;
const LONG60 = 'Société Générale de Climatisation, de Chauffage et de Plomberie Atlantique SARL';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: QUI, nuit }), p = c.p, fait = [], manque = [];
  const mesure = () => p.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, ch: innerHeight, st: document.scrollingElement.scrollTop }));
  async function prendre(nom, max) {
    for (let i = 0; i < (max || 2); i++) {
      await L.capture(c, `${CAP}${nom}-${tag}-s${i}.png`, false);
      const m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
      await p.evaluate(dy => { const e = document.scrollingElement; e.scrollTop += dy; }, Math.round(m.ch * 0.85)); await L.calme(p, 300);
    }
    await p.evaluate(() => scrollTo(0, 0)); await L.calme(p, 150); fait.push(nom);
  }
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  const scene = async (nom, fn, max) => { if (filtre && !nom.includes(filtre)) return;
    try { const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom, max); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); }
    try { await L.ranger(p); } catch (e) {} };
  const va = h => async () => { await L.aller(p, h); };
  const sauve = () => p.evaluate(() => { window.__s = { cl: Object.fromEntries(Object.entries(CLIENTS).map(([k, v]) => [k, v.nom])), dv: JSON.stringify(typeof DV !== 'undefined' ? DV : null) }; });
  // ── les écrans dits corrigés ──
  await scene('cl-liste', va('clients'));
  await scene('cl-fiche', va('client-x-vp'));
  await scene('cl-nouveau', async () => { await L.aller(p, 'clients'); return clic('[data-action=clientNouveau]', 700); });
  await scene('cl-recherche', async () => { await L.aller(p, 'clients'); await p.evaluate(() => { chercheClient = 'zzzzzz'; rendre(); }); await L.calme(p, 400); await p.evaluate(() => { chercheClient = ''; }); });
  await scene('dv-tous', async () => { await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await L.calme(p, 400); });
  await scene('dv-aenvoyer', async () => { await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'aenvoyer'; rendre(); }); await L.calme(p, 400); });
  await scene('dv-fiche-long', async () => { await p.evaluate(n => { dvInit(); CLIENTS.vp.nom = n; }, LONG60); await L.aller(p, 'devis-x-D-2026-041'); });
  await scene('ct-liste', va('contrats'));
  await scene('ct-nouveau', async () => { await L.aller(p, 'contrats'); return clic('[data-go=contrat-nouveau]', 600); });
  await scene('ac-demandes', async () => { await p.evaluate(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); });
  await scene('ac-notes', async () => { await p.evaluate(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); });
  await scene('cp-fiche-facture-long', async () => { await L.aller(p, 'facture-x-f145'); });
  // ── états vides (modifient la mémoire : en dernier) ──
  await scene('cl-vide', async () => { await p.evaluate(() => { for (const k of Object.keys(CLIENTS)) delete CLIENTS[k]; }); await L.aller(p, 'clients'); });
  await scene('ct-vide', async () => { await p.evaluate(() => { CONTRATS.length = 0; }); await L.aller(p, 'contrats'); });
  await scene('dv-vide', async () => { await p.evaluate(() => { try { for (const k of Object.keys(DEVIS_REG)) delete DEVIS_REG[k]; DV.length = 0; dvFiltre = 'aenvoyer'; } catch (e) {} }); await L.aller(p, 'devis'); });
  console.log(`${tag} : ${fait.length} scènes` + (manque.length ? ' · manque : ' + manque.join(' ; ') : ''));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ERREUR', e.message); process.exit(1); });
