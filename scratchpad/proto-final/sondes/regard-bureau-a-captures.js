// LE REGARD — bureau (Julie, gestion des factures), rubriques Mes tâches · Interventions · Clients · Devis · Contrats · Comptabilité.
// Prend, pour UN profil et UN mode (jour/nuit), les captures de chaque écran, onglet, fiche, fenêtre de création, état VIDE et
// état PLEIN à valeurs longues. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui les juge, pas cette sonde.
//   node regard-bureau-a-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png (n = position de défilement : 0 = haut, puis une fenêtre plus bas…)
const fs = require('fs'), path = require('path');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-bureau-a/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '3', 10);   // positions de défilement par scène (haut + MAXDEFIL-1 plus bas)

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 € », 1523 h 30
// Les originaux se gardent par RÉFÉRENCE (copie des objets), jamais par JSON : un objet qui porte une fonction ne survit pas à un aller-retour.
const longues = () => { const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
  const cp = a => a.map(x => Object.assign({}, x));
  window.__orig = { INTS: cp(INTS), TACHES: cp(TACHES), FACTURES: cp(FACTURES), CONTRATS: cp(CONTRATS), DV: cp(DV), CL: Object.fromEntries(Object.entries(CLIENTS).map(([k, v]) => [k, v.nom])) };
  INTS.forEach((i, n) => { i.titre = (n % 2 ? 'Remplacement complet du groupe extérieur et reprise des liaisons' : 'Dépannage urgent — fuite de fluide frigorigène sur la cassette du 1er étage').slice(0, 64); });
  Object.values(CLIENTS).forEach((c, n) => { c.nom = n % 2 ? LONG60 : 'Résidence Les Terrasses de la Grande Plage et du Vieux Port'; });
  TACHES.forEach(t => { t.t = 'Rappeler la responsable des achats de la copropriété pour le devis des cassettes du premier étage'; });
  FACTURES.forEach((f, n) => { f.ht = 12345.67 + n; f.objet = 'Remplacement complet du groupe extérieur et reprise des liaisons · 30/10'; });
  CONTRATS.forEach((c, n) => { c.prix = 12345.67 + n; c.titre = 'Entretien annuel de la climatisation et de la ventilation · 48 appareils sur trois sites'; });
  DV.forEach(x => { x.objet = 'Remplacement complet du groupe extérieur et reprise des liaisons frigorifiques'; });
};
const rendre = async p => { await p.evaluate(() => { rendre(); }); await L.calme(p, 500); };
const vider = () => { dvInit(); window.__vide = { INTS: INTS.slice(), TACHES: TACHES.slice(), FACTURES: FACTURES.slice(), CONTRATS: CONTRATS.slice(), DV: DV.slice(), CL: Object.assign({}, CLIENTS) };
  INTS.length = 0; TACHES.length = 0; FACTURES.length = 0; CONTRATS.length = 0; DV.length = 0; };
// les clients se vident À PART : une facture ou un contrat orphelin ferait jeter la page, ce qui n'est pas un état que l'application produit
const viderClients = () => { window.__cl = Object.assign({}, CLIENTS); Object.keys(CLIENTS).forEach(k => delete CLIENTS[k]); };
const rendreClients = () => { if (window.__cl) { Object.assign(CLIENTS, window.__cl); window.__cl = null; } };
const rendreEtat = () => { if (window.__vide) { const s = window.__vide; for (const k of ['INTS', 'TACHES', 'FACTURES', 'CONTRATS', 'DV']) { const a = eval(k); a.length = 0; s[k].forEach(x => a.push(x)); } Object.assign(CLIENTS, s.CL); window.__vide = null; }
  if (window.__orig) { const o = window.__orig; for (const k of ['INTS', 'TACHES', 'FACTURES', 'CONTRATS', 'DV']) { const a = eval(k); o[k].forEach((x, n) => { if (a[n]) Object.assign(a[n], x); }); } Object.entries(o.CL).forEach(([k, n]) => { if (CLIENTS[k]) CLIENTS[k].nom = n; }); window.__orig = null; } };

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: 'julie', nuit }), p = c.p;
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
  const va = h => async () => { await L.aller(p, h); };
  const cx = o => async () => { await p.evaluate(x => { cxAller(x); }, o); await L.calme(p, 700); };
  const TABS = ['ensemble', 'cloture', 'dossiers', 'fventes', 'clients', 'contrats', 'fachats', 'ndf', 'fournisseurs', 'paiements', 'banque', 'caisse', 'enligne', 'tva', 'ecritures', 'balance', 'grandlivre', 'resultat', 'envoi', 'normes', 'archives'];

  // ── 1. MES TÂCHES ───────────────────────────────────────────────────────────────────────────────────────
  for (const [o, n] of [['auj', 'a01-taches-aujourdhui'], ['avenir', 'a02-taches-avenir'], ['faites', 'a03-taches-faites']])
    await scene(n, async () => { await L.aller(p, 'taches'); return clic(`[data-tonglet=${o}]`); });
  await scene('a04-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
  await scene('a05-taches-fiche', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tmodif=t1]', 700); });
  await scene('a06-taches-suggestions', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tsuggs]', 700); });
  await scene('a07-taches-retard', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxfiltre=retard]'); });
  // ── 2. INTERVENTIONS ────────────────────────────────────────────────────────────────────────────────────
  for (const [f, n] of [['auj', 'b01-inter-aujourdhui'], ['avenir', 'b02-inter-avenir'], ['plan', 'b03-inter-aplanifier'], ['fait', 'b04-inter-terminees'], ['tout', 'b05-inter-toutes']])
    await scene(n, async () => { await L.aller(p, 'interventions'); return clic(`[data-filtreint=${f}]`); });
  await scene('b06-inter-fiche-encours', va('inter-x-i1'));
  await scene('b07-inter-fiche-aplanifier', va('inter-x-i5'));
  await scene('b08-inter-fiche-terminee', va('inter-x-i6'));
  await scene('b09-inter-creer', async () => { await L.aller(p, 'interventions'); return clic('[data-creer]', 700); });
  // ── 3. CLIENTS ──────────────────────────────────────────────────────────────────────────────────────────
  for (const [r, n] of [['tous', 'c01-clients-tous'], ['semaine', 'c02-clients-semaine'], ['mois', 'c03-clients-mois']])
    await scene(n, async () => { await L.aller(p, 'clients'); return clic(`[data-rangc=${r}]`); });
  await scene('c04-clients-nouveau', async () => { await L.aller(p, 'clients'); return clic('[data-action=clientNouveau]', 700); });
  let onglets = ['histo', 'factures', 'docs'];
  try { await L.aller(p, 'client-x-cm'); onglets = await p.evaluate(() => [...document.querySelectorAll('[data-oc]')].map(b => b.dataset.oc)); } catch (e) {}
  let k = 0;
  for (const o of onglets) await scene('c05' + String.fromCharCode(97 + k++) + '-client-' + o, async () => { await L.aller(p, 'client-x-cm'); return clic(`[data-oc=${o}]`, 600); });
  await scene('c06-client-fiche-mi', async () => { await L.aller(p, 'client-x-mi'); });
  await scene('c07-client-fiche-vp', async () => { await L.aller(p, 'client-x-vp'); });
  // ── 4. DEVIS ────────────────────────────────────────────────────────────────────────────────────────────
  for (const [f, n] of [['tous', 'd01-devis-tous'], ['aenvoyer', 'd02-devis-afinir'], ['attente', 'd03-devis-attente'], ['accepte', 'd04-devis-acceptes'], ['perdu', 'd05-devis-perdus']])
    await scene(n, async () => { await L.aller(p, 'devis'); return clic(`[data-dvf=${f}]`, 600); });
  const idsDevis = await p.evaluate(() => { dvInit(); return DV.map(x => [dvCle(x), x.e]); }).catch(() => []);
  const un = e => (idsDevis.find(x => x[1] === e) || [])[0];
  for (const [e, n] of [['brouillon', 'd06-devis-fiche-brouillon'], ['attente', 'd07-devis-fiche-attente'], ['accepte', 'd08-devis-fiche-accepte'], ['refuse', 'd09-devis-fiche-refuse']])
    await scene(n, async () => { const id = un(e); if (!id) return false; await L.aller(p, 'devis-x-' + id); });
  await scene('d10-devis-dicter', async () => { await L.aller(p, 'devis'); return clic('[data-dv=dicter]', 900); });
  await scene('d11-devis-rapide', async () => { await L.aller(p, 'devis'); return clic('[data-dv=nouveau]', 900); });
  await scene('d12-devis-composer', async () => { await L.aller(p, 'devis'); const ok = await clic('[data-opd=devis]', 4500); return ok; });
  // ── 5. CONTRATS ─────────────────────────────────────────────────────────────────────────────────────────
  await scene('e01-contrats-liste', va('contrats'));
  await scene('e02-contrat-fiche-signe', va('contrat-x-c1'));
  await scene('e03-contrat-fiche-envoye', va('contrat-x-c3'));
  await scene('e04-contrat-nouveau', va('contrat-nouveau'));
  await scene('e05-contrat-modele', async () => { await L.aller(p, 'contrats'); return clic('[data-modele=clim]', 700); });
  await scene('e06-contrat-composer', async () => { await L.aller(p, 'contrats'); return clic('[data-opd=contrat]', 4500); });
  // ── 6. COMPTABILITÉ ─────────────────────────────────────────────────────────────────────────────────────
  await scene('f00-compta-accueil', va('comptabilite'));
  let k2 = 1;
  for (const o of TABS) await scene('f' + String(k2++).padStart(2, '0') + '-compta-' + o, cx(o));
  await scene('f30-compta-facture-payee', va('facture-x-f145'));
  await scene('f31-compta-facture-retard', va('facture-x-f128'));
  await scene('f32-compta-facture-envoyee', va('facture-x-f144'));
  // ── 7. ÉTAT VIDE : aucun élément ────────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { rangClients = 'tous'; dvFiltre = 'tous'; filtreInt = 'tout'; ongletClient = 'histo'; });   // les filtres d'une scène ne doivent pas coller à la suivante (un état vide « Refusés » n'est pas l'état vide des devis)
  await p.evaluate(vider);
  for (const [h, n] of [['taches', 'z01-vide-taches'], ['interventions', 'z02-vide-inter'], ['devis', 'z04-vide-devis'], ['contrats', 'z05-vide-contrats'], ['comptabilite', 'z06-vide-compta']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'taches') await clic('[data-tonglet=auj]'); if (h === 'interventions') await clic('[data-filtreint=tout]'); });
  for (const o of ['fventes', 'fachats', 'paiements', 'banque']) await scene('z07-vide-compta-' + o, cx(o));
  await p.evaluate(viderClients);
  for (const r of ['tous', 'semaine', 'mois']) await scene('z03-vide-clients-' + r, async () => { await L.aller(p, 'clients'); return clic(`[data-rangc=${r}]`); });
  await scene('z09-vide-clients-nouveau', async () => { await L.aller(p, 'clients'); return clic('[data-action=clientNouveau]', 700); });
  await p.evaluate(rendreClients); await L.calme(p, 300);
  await scene('z08-vide-devis-creer', async () => { await L.aller(p, 'devis'); return clic('[data-dv=nouveau]', 900); });
  await scene('z10-vide-contrat-nouveau', va('contrat-nouveau'));
  await p.evaluate(rendreEtat); await L.calme(p, 300);
  // ── 8. ÉTAT PLEIN : valeurs longues ─────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { rangClients = 'tous'; dvFiltre = 'tous'; filtreInt = 'tout'; });
  await p.evaluate(longues);
  for (const [h, n] of [['taches', 'y01-long-taches'], ['interventions', 'y02-long-inter'], ['clients', 'y03-long-clients'], ['devis', 'y04-long-devis'], ['contrats', 'y05-long-contrats'], ['comptabilite', 'y06-long-compta']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'taches') await clic('[data-tonglet=auj]'); if (h === 'interventions') await clic('[data-filtreint=tout]'); if (h === 'devis') await clic('[data-dvf=tous]'); });
  for (const o of ['fventes', 'dossiers', 'clients', 'contrats', 'paiements', 'tva']) await scene('y07-long-compta-' + o, cx(o));
  await scene('y08-long-inter-fiche', va('inter-x-i1'));
  await scene('y09-long-client-fiche', va('client-x-cm'));
  await scene('y10-long-contrat-fiche', va('contrat-x-c1'));
  await scene('y11-long-facture-fiche', va('facture-x-f128'));
  await scene('y12-long-devis-fiche', async () => { const id = un('attente'); if (!id) return false; await L.aller(p, 'devis-x-' + id); });
  await p.evaluate(rendreEtat);

  console.log(`[${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 5).join(' | ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify({ fait, manque, err: c.err }));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
