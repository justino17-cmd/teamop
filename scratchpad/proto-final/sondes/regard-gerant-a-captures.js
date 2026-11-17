// LE REGARD — gérant, rubriques Accueil · Statistiques · Historique · Planning · Interventions · Tâches · Absences et congés.
// Prend, pour UN profil et UN mode (jour/nuit), les captures de chaque écran, onglet, fiche, fenêtre de création, état VIDE et
// état PLEIN à valeurs longues. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui les juge, pas cette sonde.
//   node regard-gerant-a-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png (n = position de défilement : 0 = haut, puis une fenêtre plus bas…)
const fs = require('fs'), path = require('path');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-a/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '3', 10);   // positions de défilement par scène (haut + MAXDEFIL-1 plus bas)

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 € », 1523 h 30
const longues = () => { const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
  window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES, JOURNAL, CL: Object.fromEntries(Object.entries(CLIENTS).map(([k, v]) => [k, v.nom])), FACTURES });
  INTS.forEach((i, n) => { i.titre = (n % 2 ? 'Remplacement complet du groupe extérieur et reprise des liaisons' : 'Dépannage urgent — fuite de fluide frigorigène sur la cassette du 1er étage').slice(0, 64); });
  Object.values(CLIENTS).forEach((c, n) => { c.nom = n % 2 ? LONG60 : 'Résidence Les Terrasses de la Grande Plage et du Vieux Port'; });
  TACHES.forEach(t => { t.t = 'Rappeler la responsable des achats de la copropriété pour le devis des cassettes du premier étage'; });
  FACTURES.forEach((f, n) => { f.ht = 12345.67 + n; });
  JOURNAL.forEach(j => { if (j.el) j.el.lib = 'Remplacement complet du groupe extérieur et reprise des liaisons frigorifiques'; });
};
const rendre = async p => { await p.evaluate(() => { rendre(); }); await L.calme(p, 500); };
const vider = () => { window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES, JOURNAL }); INTS.length = 0; TACHES.length = 0; ABSENCES.length = 0; JOURNAL.length = 0; };
const rendreEtat = () => { const s = JSON.parse(window.__sauve); for (const k of ['INTS', 'TACHES', 'ABSENCES', 'JOURNAL']) { const a = eval(k); a.length = 0; s[k].forEach(x => a.push(x)); } if (s.CL) Object.entries(s.CL).forEach(([k, n]) => { CLIENTS[k].nom = n; }); if (s.FACTURES) { FACTURES.length = 0; s.FACTURES.forEach(x => FACTURES.push(x)); } };

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
  const va = h => async () => { await L.aller(p, h); };

  // ── 1. ACCUEIL, STATISTIQUES, HISTORIQUE ────────────────────────────────────────────────────────────────
  await scene('a01-accueil', va('accueil'));
  await scene('a02-stats-mois', async () => { await L.aller(p, 'statistiques'); await clic('[data-stper=mois]'); });
  await scene('a03-stats-annee', async () => { await L.aller(p, 'statistiques'); await clic('[data-stper=annee]'); });
  await scene('a04-stats-detail-fac', async () => { await L.aller(p, 'statistiques'); return clic('[data-stdet=fac]', 700); });
  await scene('a05-stats-detail-tech', async () => { await L.aller(p, 'statistiques'); return clic('[data-stdet=tech-kb]', 700); });
  await scene('a06-histo', va('historique'));
  await scene('a07-histo-filtre', async () => { await L.aller(p, 'historique'); return clic('[data-htype=inter]'); });
  await scene('a08-histo-jour', async () => { await L.aller(p, 'historique'); await clic('[data-hjour="2026-10-29"]', 600); });
  // ── 2. PLANNING ─────────────────────────────────────────────────────────────────────────────────────────
  for (const [v, n] of [['jour', 'b01-plan-jour'], ['semaine', 'b02-plan-semaine'], ['mois', 'b03-plan-mois'], ['general', 'b04-plan-general'], ['multi', 'b05-plan-surmesure'], ['carte', 'b06-plan-carte']])
    await scene(n, async () => { await L.aller(p, 'planning'); return clic(`[data-plvue=${v}]`, v === 'carte' ? 1500 : 700); });
  await scene('b07-plan-creer', async () => { await L.aller(p, 'planning'); return clic('[data-creer]', 700); });
  await scene('b08-plan-rdv-en-ligne', async () => { await L.aller(p, 'planning'); return clic('[data-rrouvrir]', 700); });
  await scene('b09-plan-intervention', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=semaine]', 700); return clic('[data-int=i1]', 700); });
  // ── 3. INTERVENTIONS ────────────────────────────────────────────────────────────────────────────────────
  for (const [f, n] of [['auj', 'c01-inter-aujourdhui'], ['avenir', 'c02-inter-avenir'], ['plan', 'c03-inter-aplanifier'], ['fait', 'c04-inter-terminees'], ['tout', 'c05-inter-toutes']])
    await scene(n, async () => { await L.aller(p, 'interventions'); return clic(`[data-filtreint=${f}]`); });
  await scene('c06-inter-fiche-encours', va('inter-x-i1'));
  await scene('c07-inter-fiche-aplanifier', va('inter-x-i5'));
  await scene('c08-inter-fiche-terminee', va('inter-x-i6'));
  await scene('c09-inter-creer', async () => { await L.aller(p, 'interventions'); return clic('[data-creer]', 700); });
  // ── 4. TÂCHES ───────────────────────────────────────────────────────────────────────────────────────────
  for (const [o, n] of [['auj', 'd01-taches-aujourdhui'], ['avenir', 'd02-taches-avenir'], ['faites', 'd03-taches-faites']])
    await scene(n, async () => { await L.aller(p, 'taches'); return clic(`[data-tonglet=${o}]`); });
  await scene('d04-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
  await scene('d05-taches-fiche', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tmodif=t1]', 700); });
  await scene('d06-taches-suggestions', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tsuggs]', 700); });
  await scene('d07-taches-retard', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxfiltre=retard]'); });
  // ── 5. ABSENCES ET CONGÉS ───────────────────────────────────────────────────────────────────────────────
  for (const [o, n] of [['valider', 'e01-abs-avalider'], ['calendrier', 'e02-abs-calendrier'], ['soldes', 'e03-abs-soldes']])
    await scene(n, async () => { await L.aller(p, 'absences'); return clic(`[data-aonglet=${o}]`, 600); });
  await scene('e04-abs-nouvelle', async () => { await L.aller(p, 'absences'); return clic('[data-anouv]', 700); });
  await scene('e05-abs-proposer', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]'); return clic('[data-amodif=d3]', 700); });
  await scene('e06-abs-refuser', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]'); return clic('[data-anon=d3]', 700); });
  // ── 6. ÉTAT VIDE : aucun élément ────────────────────────────────────────────────────────────────────────
  await p.evaluate(vider);
  for (const [h, n] of [['accueil', 'z01-vide-accueil'], ['statistiques', 'z02-vide-stats'], ['historique', 'z03-vide-histo'], ['planning', 'z04-vide-planning'], ['interventions', 'z05-vide-inter'], ['taches', 'z06-vide-taches'], ['absences', 'z07-vide-absences']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'planning') await clic('[data-plvue=semaine]', 600); if (h === 'taches') await clic('[data-tonglet=auj]'); if (h === 'interventions') await clic('[data-filtreint=tout]'); });
  await scene('z09-vide-planning-jour', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=jour]', 600); });
  await scene('z08-vide-planning-creer', async () => { await L.aller(p, 'planning'); return clic('[data-creer]', 700); });
  await p.evaluate(rendreEtat); await L.calme(p, 300);
  // ── 7. ÉTAT PLEIN : valeurs longues ─────────────────────────────────────────────────────────────────────
  await p.evaluate(longues);
  for (const [h, n] of [['accueil', 'y01-long-accueil'], ['statistiques', 'y02-long-stats'], ['historique', 'y03-long-histo'], ['planning', 'y04-long-planning'], ['interventions', 'y05-long-inter'], ['taches', 'y06-long-taches'], ['absences', 'y07-long-absences']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'planning') await clic('[data-plvue=jour]', 600); if (h === 'taches') await clic('[data-tonglet=auj]'); if (h === 'interventions') await clic('[data-filtreint=auj]'); if (h === 'absences') await clic('[data-aonglet=valider]'); });
  await scene('y08-long-plan-semaine', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=semaine]', 700); });
  await scene('y09-long-inter-fiche', va('inter-x-i1'));
  await scene('y10-long-inter-toutes', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=tout]'); });
  await scene('y11-long-taches-avenir', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=avenir]'); });
  await p.evaluate(rendreEtat);

  console.log(`[${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 5).join(' | ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify({ fait, manque, err: c.err }));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
