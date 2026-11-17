// LE REGARD — technicienne (sm) puis chef d'équipe (kb), rubriques Ma journée · Mes tâches · Mes congés.
// Prend, pour UN profil, UN mode (jour/nuit) et UNE personne, les captures de chaque écran, onglet, fiche, fenêtre de création,
// état VIDE et état PLEIN à valeurs longues. Les captures vont hors dépôt ; c'est l'œil (outil Read) qui les juge, pas cette sonde.
//   node regard-technicien-a-captures.js <profil> [nuit] [sm|kb] [filtre-de-scène]
// Fichiers : <CAP>/<qui>-<scène>-<profil>-<jour|nuit>-s<n>.png
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-technicien-a/';
const args = process.argv.slice(2), profil = args[0] || 'iphone', nuit = args.includes('nuit');
const qui = args.includes('kb') ? 'kb' : 'sm', filtre = args.slice(1).find(a => !['nuit', 'sm', 'kb'].includes(a)) || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`, pref = qui + '-';
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '4', 10);

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 € », 1523 h 30
const longues = () => { const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
  window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES, CL: Object.fromEntries(Object.entries(CLIENTS).map(([k, v]) => [k, v.nom])) });
  INTS.forEach((i, n) => { i.titre = n % 2 ? 'Remplacement complet du groupe extérieur et reprise des liaisons' : 'Dépannage urgent — fuite de fluide frigorigène sur la cassette du 1er étage'; });
  Object.values(CLIENTS).forEach((c, n) => { c.nom = n % 2 ? LONG60 : 'Résidence Les Terrasses de la Grande Plage et du Vieux Port'; });
  TACHES.forEach(t => { t.t = 'Rappeler la responsable des achats de la copropriété pour le devis des cassettes du premier étage'; });
};
const vider = () => { window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES }); INTS.length = 0; TACHES.length = 0; ABSENCES.length = 0; };
const rendreEtat = () => { const s = JSON.parse(window.__sauve); for (const k of ['INTS', 'TACHES', 'ABSENCES']) { const a = eval(k); a.length = 0; s[k].forEach(x => a.push(x)); } if (s.CL) Object.entries(s.CL).forEach(([k, n]) => { CLIENTS[k].nom = n; }); };

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  const fait = [], manque = [];
  async function prendre(nom) {
    const mesure = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const ouvert = pan && (pan.offsetParent !== null || getComputedStyle(pan).display !== 'none');
      const el = ouvert ? pan : document.scrollingElement; return { panneau: !!ouvert, sh: el.scrollHeight, ch: ouvert ? el.clientHeight : innerHeight, st: el.scrollTop }; });
    let m = await mesure();
    for (let i = 0; i < MAXDEFIL; i++) {
      await L.capture(c, `${CAP}${pref}${nom}-${tag}-s${i}.png`, false);
      m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
      await p.evaluate(({ pan, dy }) => { const el = pan ? document.querySelector('#calque .panneau') : document.scrollingElement; el.scrollTop = el.scrollTop + dy; }, { pan: m.panneau, dy: Math.round(m.ch * 0.85) }); await L.calme(p, 350);
    }
    await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = 0; scrollTo(0, 0); }); await L.calme(p, 200);
    fait.push(nom);
  }
  const scene = async (nom, fn) => { if (filtre && !nom.includes(filtre)) return; try { await L.ranger(p); const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); } };
  const va = h => async () => { await L.aller(p, h); };
  const mesInts = () => p.evaluate(q => INTS.filter(i => i.tech === q).map(i => i.id), qui);

  // ── 1. MA JOURNÉE ──────────────────────────────────────────────────────────────────────────────────────
  await scene('a01-journee', va('majournee'));
  await scene('a03-journee-plus-tot', async () => { await L.aller(p, 'majournee'); return clic(`[data-ptx="plustot|${qui}"]`, 700); });
  await scene('a04-journee-message', async () => { await L.aller(p, 'majournee'); return clic('[data-mjmsg]', 700); });
  await scene('a05-journee-tache', async () => { await L.aller(p, 'majournee'); return clic('[data-tmodif]', 700); });
  const ids = await mesInts();
  const ep = await p.evaluate(q => { const r = { enc: null, pl: null, fait: null }; INTS.filter(i => i.tech === q).forEach(i => { if (i.st === 'encours' && !r.enc) r.enc = i.id; if (['planifiee', 'retard'].includes(i.st) && !r.pl) r.pl = i.id; if (i.st === 'fait' && !r.fait) r.fait = i.id; }); return r; }, qui);
  if (ep.enc) await scene('b01-fiche-encours', va('inter-x-' + ep.enc));
  if (ep.pl) await scene('b02-fiche-planifiee', va('inter-x-' + ep.pl));
  if (ep.fait) await scene('b03-fiche-terminee', va('inter-x-' + ep.fait));
  // ── 2. MES TÂCHES ──────────────────────────────────────────────────────────────────────────────────────
  for (const [o, n] of [['auj', 'd01-taches-aujourdhui'], ['avenir', 'd02-taches-avenir'], ['faites', 'd03-taches-faites']])
    await scene(n, async () => { await L.aller(p, 'taches'); return clic(`[data-tonglet=${o}]`); });
  await scene('d04-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
  await scene('d05-taches-fiche', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tmodif]', 700); });
  await scene('d06-taches-plus', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxplus]', 700); });
  await scene('d07-taches-retard', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxfiltre=retard]'); });
  await L.aller(p, 'taches'); await clic('[data-tkxfiltre=retard]');   // le filtre se défait : les scènes suivantes repartent d'une liste entière
  // ── 3. MES CONGÉS ──────────────────────────────────────────────────────────────────────────────────────
  await scene('e01-conges', va('absences'));
  await scene('e02-conges-demande', async () => { await L.aller(p, 'absences'); return clic('[data-atdem]', 700); });
  await scene('e05-conges-retirer', async () => { await L.aller(p, 'absences'); return clic('[data-atretire]', 700); });
  await scene('e06-conges-fiche', async () => { await L.aller(p, 'absences'); return clic('[data-atvoir]', 700); });
  await scene('e03-conges-6mois', async () => { await L.aller(p, 'absences'); return clic('[data-aper="6"]', 700); });
  await scene('e04-conges-mois-suivant', async () => { await L.aller(p, 'absences'); return clic('[data-amois="1"]', 700); });
  await clic('[data-aper="0.5"]'); await clic('[data-amois="-1"]');
  // ── 4. ÉTAT VIDE ───────────────────────────────────────────────────────────────────────────────────────
  await p.evaluate(vider);
  for (const [h, n] of [['majournee', 'z01-vide-journee'], ['taches', 'z02-vide-taches'], ['absences', 'z03-vide-conges']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'taches') await clic('[data-tonglet=auj]'); });
  await scene('z04-vide-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
  await scene('z05-vide-conges-demande', async () => { await L.aller(p, 'absences'); return clic('[data-atdem]', 700); });
  await p.evaluate(rendreEtat); await L.calme(p, 300);
  // ── 5. ÉTAT PLEIN, VALEURS LONGUES ─────────────────────────────────────────────────────────────────────
  await p.evaluate(longues);
  for (const [h, n] of [['majournee', 'y01-long-journee'], ['taches', 'y02-long-taches'], ['absences', 'y03-long-conges']])
    await scene(n, async () => { await L.aller(p, h); if (h === 'taches') await clic('[data-tonglet=auj]'); });
  if (ep.enc) await scene('y04-long-fiche', va('inter-x-' + ep.enc));
  await scene('y05-long-tache-fiche', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tmodif]', 700); });
  await p.evaluate(rendreEtat); await L.calme(p, 300);
  await scene('a02-journee-pointage', async () => { await L.aller(p, 'majournee'); return clic(`[data-ptx="debut|${qui}"]`, 700); });

  console.log(`[${qui} ${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 5).join(' | ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${qui}-${tag}.json`, JSON.stringify({ fait, manque, err: c.err }));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
