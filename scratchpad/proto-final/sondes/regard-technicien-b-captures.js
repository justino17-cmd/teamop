// LE REGARD — technicienne (sm) puis chef d'équipe (kb), rubrique « Mon camion ».
// Prend, pour UN profil et UN mode (jour/nuit), les captures de chaque écran, fenêtre (plein, compteur, souci, utilisé, pris, manque, messages),
// état VIDE (sans camion, sans liste, camion complet, rien trouvé) et état PLEIN à valeurs longues. L'œil (outil Read) les juge, pas cette sonde.
//   node regard-technicien-b-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png ; qui = sm (c…, e…, y…) ou kb (k…) ou marc (r… : les écrans validés, en référence)
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-technicien-b/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`, MAXDEFIL = parseInt(process.env.MAXDEFIL || '3', 10);
const fait = [], manque = [], erreurs = [];

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 », message de 120 signes
const longues = () => {
  const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
  window.__camSauve = JSON.stringify({ P: PRODUITS.map(x => [x.id, x.nom, x.loc && { ...x.loc }]), I: INTS.map(i => [i.id, i.titre]), N: NOTIFS.map(o => [o.txt]), V: VEHICULES.map(v => [v.id, v.marque, v.modele, v.plaque, v.km]), C: Object.entries(CLIENTS).map(([k, c]) => [k, c.nom]) });
  PRODUITS.forEach((x, n) => { x.nom = n % 2 ? 'Cassette murale réversible de 5 kW avec liaisons frigorifiques préformées et télécommande filaire' : 'Raccord flare laiton chromé 1/4 pouce à écrou tournant et joint de cuivre recuit'; });
  INTS.forEach(i => { i.titre = 'Remplacement complet du groupe extérieur et reprise des liaisons'; });
  Object.values(CLIENTS).forEach(c => { c.nom = LONG60; });
  NOTIFS.forEach(o => { if (o.txt) o.txt = 'Passe à l’atelier avant 17 h pour récupérer le lot de filtres et le fluide commandés pour la résidence du port.'; });
  VEHICULES.forEach(v => { v.km = 123456; });
  const L1 = sxMonLieu(); lieuManques(L1.id).forEach(o => { o.x.loc = o.x.loc || {}; o.x.loc[L1.id] = 12345.67; });
};
const rendreEtat = () => { const s = JSON.parse(window.__camSauve); s.P.forEach(([id, nom, loc]) => { const x = PRODUITS.find(p => p.id === id); if (x) { x.nom = nom; if (loc) x.loc = loc; } }); s.I.forEach(([id, t]) => { const i = INTS.find(o => o.id === id); if (i) i.titre = t; });
  s.C.forEach(([k, n]) => { if (CLIENTS[k]) CLIENTS[k].nom = n; }); const N = NOTIFS.filter(o => o.txt); s.N.forEach(([t], n) => { if (N[n]) N[n].txt = t; }); s.V.forEach(([id, m, mo, pl, km]) => { const v = vehDe(id); if (v) v.km = km; }); };
const rendre = async p => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} rendre(); }); await L.calme(p, 500); };

async function ouvrirQui(qui) {
  const c = await L.ouvrir({ profil, qui, nuit, calme: true }), p = c.p;
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  async function prendre(nom) {
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
  const scene = async (nom, fn) => { if (filtre && !nom.includes(filtre)) return; try { const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 250); };
  return { c, p, clic, scene, va: h => async () => { await L.aller(p, h); } };
}

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  // ── 1. LA TECHNICIENNE (Sophie) ─────────────────────────────────────────────────────────────────────
  { const { c, p, clic, scene, va } = await ouvrirQui('sm');
    const cam = async () => { await L.aller(p, 'moncamion'); };
    await scene('c01-haut', cam);
    await scene('c02-recherche', async () => { await cam(); await p.fill('#mc-q', 'filtre'); await L.calme(p, 500); });
    await scene('c03-recherche-vide', async () => { await cam(); await p.fill('#mc-q', 'zzzz'); await L.calme(p, 500); });
    await scene('c04-utilise', async () => { await cam(); return clic('[data-mat=usage]', 700); });
    await scene('c05-pris', async () => { await cam(); return clic('[data-mat=prise]', 700); });
    await scene('c06-manque', async () => { await cam(); return clic('.mc-duo [data-mat=manque]', 700); });
    await scene('c07-plein', async () => { await cam(); return clic('.vh-cam-b[data-vx^=plein]', 700); });
    await scene('c08-compteur', async () => { await cam(); return clic('.vh-cam-b[data-vx^=km]', 700); });
    await scene('c09-souci', async () => { await cam(); return clic('.vh-cam-b[data-vx^=souci]', 700); });
    await scene('c10-abord', async () => { await cam(); return clic('[data-mat=bord]', 600); });
    // les états du camion : la phrase d'état et la carte suivent le véhicule
    for (const [n, f] of [['e01-ct-retard', () => { vehDe('veh1').ct = jour(-3); }], ['e02-souci', () => { const x = vehDe('veh1'); x.ct = jour(205); x.souci = { type: 'Pneu', txt: '', qui: 'sm', d: AUJ }; }],
      ['e03-garage', () => { const x = vehDe('veh1'); x.souci = null; x.statut = 'atelier'; x.immo = { motif: 'Entretien', garage: 'Renault Pro', du: jour(-2), retour: jour(2), remplacement: 'Citroën Berlingo' }; }],
      ['e04-hs', () => { const x = vehDe('veh1'); x.statut = 'hs'; x.immo = null; }], ['e05-papiers-manquants', () => { const x = vehDe('veh1'); x.statut = 'service'; x.assur.fin = null; x.ct = null; }]]) {
      await scene(n, async () => { await p.evaluate(f); await cam(); await rendre(p); }); }
    await p.evaluate(() => { const x = vehDe('veh1'); x.statut = 'service'; x.immo = null; x.souci = null; x.assur.fin = jour(41); x.ct = jour(205); });
    // vide : camion complet, camion sans liste, aucun camion
    await scene('e06-complet', async () => { await p.evaluate(() => { const L1 = sxMonLieu(); window.__loc = JSON.stringify(PRODUITS.map(x => [x.id, x.loc])); lieuManques(L1.id).forEach(o => { o.x.loc = o.x.loc || {}; o.x.loc[L1.id] = o.cible; }); }); await cam(); await rendre(p); });
    await p.evaluate(() => { JSON.parse(window.__loc).forEach(([id, l]) => { const x = PRODUITS.find(q => q.id === id); if (x) x.loc = l; }); });
    await scene('e07-sans-liste', async () => { await p.evaluate(() => { const L1 = sxMonLieu(); window.__dot = L1.dot; L1.dot = null; }); await cam(); await rendre(p); });
    await p.evaluate(() => { sxMonLieu().dot = window.__dot; });
    await scene('e08-sans-camion', async () => { await p.evaluate(() => { window.__lx = LIEUX.slice(); for (let i = LIEUX.length - 1; i >= 0; i--) if (LIEUX[i].type === 'vehicule') LIEUX.splice(i, 1); }); await cam(); await rendre(p); });
    await p.evaluate(() => { LIEUX.length = 0; window.__lx.forEach(l => LIEUX.push(l)); });
    // plein : valeurs longues
    await p.evaluate(longues);
    await scene('y01-long-haut', async () => { await cam(); await rendre(p); });
    await scene('y02-long-recherche', async () => { await cam(); await p.fill('#mc-q', 'a'); await L.calme(p, 500); });
    await scene('y03-long-utilise', async () => { await cam(); return clic('[data-mat=usage]', 700); });
    await scene('y04-long-abord', async () => { await cam(); return clic('[data-mat=bord]', 600); });
    await scene('y05-long-compteur', async () => { await cam(); return clic('.vh-cam-b[data-vx^=km]', 700); });
    await p.evaluate(rendreEtat);
    // le voisin de la rubrique : Ma journée (pour comparer les titres, les marges, les pastilles)
    await scene('v01-ma-journee', va('majournee'));
    await scene('z01-toutpris', async () => { await cam(); return clic('[data-mat=toutpris]', 700); });
    if (c.err.length) erreurs.push('sm : ' + c.err.slice(0, 4).join(' | '));
    await L.fin(c); }
  // ── 2. LE CHEF D'ÉQUIPE (Karim) ─────────────────────────────────────────────────────────────────────
  { const { c, p, clic, scene } = await ouvrirQui('kb');
    const cam = async () => { await L.aller(p, 'moncamion'); };
    await scene('k01-haut', cam);
    await scene('k02-messages', async () => { await cam(); return clic('[data-mat=messages]', 700); });
    await scene('k03-utilise', async () => { await cam(); return clic('[data-mat=usage]', 700); });
    await scene('k04-plein', async () => { await cam(); return clic('.vh-cam-b[data-vx^=plein]', 700); });
    await scene('k05-abord', async () => { await cam(); return clic('[data-mat=bord]', 600); });
    if (c.err.length) erreurs.push('kb : ' + c.err.slice(0, 4).join(' | '));
    await L.fin(c); }
  // ── 3. LES ÉCRANS VALIDÉS, EN RÉFÉRENCE (gérant) ───────────────────────────────────────────────────
  { const { c, p, scene, va } = await ouvrirQui('marc');
    await scene('r01-accueil', va('accueil')); await scene('r02-clients', va('clients')); await scene('r03-equipe', va('equipe')); await scene('r04-boxes', va('boxes'));
    await L.fin(c); }
  console.log(`[${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (erreurs.length ? ' · ERREURS : ' + erreurs.join(' || ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify({ fait, manque, erreurs }));
  await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
