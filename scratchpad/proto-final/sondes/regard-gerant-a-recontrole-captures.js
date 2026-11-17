// RECONTRÔLE du regard gérant A (second regard, 17 novembre 2026) : recapture les écrans que le premier agent dit corrigés,
// leurs voisins (mêmes règles) en gérant ET sous d'autres rôles, et des écrans qu'il déclare sans défaut.
//   node regard-gerant-a-recontrole-captures.js <profil> [nuit] [filtre-de-scène]
// Fichiers (hors dépôt) : <CAP>/<scène>-<profil>-<jour|nuit>-s<n>.png ; l'œil (outil Read) juge, pas cette sonde.
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-a-recontrole/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), filtre = process.argv.slice(3).find(a => a !== 'nuit') || '';
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '2', 10);

// valeurs LONGUES plausibles : nom de 60 caractères, « 12 345,67 € »
const longues = () => { const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
  window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES, JOURNAL, CL: Object.fromEntries(Object.entries(CLIENTS).map(([k, v]) => [k, v.nom])), FACTURES });
  INTS.forEach((i, n) => { i.titre = (n % 2 ? 'Remplacement complet du groupe extérieur et reprise des liaisons' : 'Dépannage urgent — fuite de fluide frigorigène sur la cassette du 1er étage').slice(0, 64); });
  Object.values(CLIENTS).forEach((c, n) => { c.nom = n % 2 ? LONG60 : 'Résidence Les Terrasses de la Grande Plage et du Vieux Port'; });
  TACHES.forEach(t => { t.t = 'Rappeler la responsable des achats de la copropriété pour le devis des cassettes du premier étage'; });
  FACTURES.forEach((f, n) => { f.ht = 12345.67 + n; });
};
const vider = () => { window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES, JOURNAL }); INTS.length = 0; TACHES.length = 0; ABSENCES.length = 0; JOURNAL.length = 0; };
const rendreEtat = () => { const s = JSON.parse(window.__sauve); for (const k of ['INTS', 'TACHES', 'ABSENCES', 'JOURNAL']) { const a = eval(k); a.length = 0; s[k].forEach(x => a.push(x)); } if (s.CL) Object.entries(s.CL).forEach(([k, n]) => { CLIENTS[k].nom = n; }); if (s.FACTURES) { FACTURES.length = 0; s.FACTURES.forEach(x => FACTURES.push(x)); } };

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const fait = [], manque = [], erreurs = [];
  async function passe(qui, scenes) {
    const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
    const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
    async function prendre(nom) {
      const mesure = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const ouvert = pan && getComputedStyle(pan).display !== 'none' && pan.offsetParent !== null;
        const el = ouvert ? pan : document.scrollingElement; return { panneau: !!ouvert, sh: el.scrollHeight, ch: ouvert ? el.clientHeight : innerHeight, st: el.scrollTop }; });
      let m = await mesure();
      for (let i = 0; i < MAXDEFIL; i++) {
        await L.capture(c, `${CAP}${nom}-${tag}-s${i}.png`, false);
        m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
        await p.evaluate(({ pan, dy }) => { const el = pan ? document.querySelector('#calque .panneau') : document.scrollingElement; el.scrollTop = el.scrollTop + dy; }, { pan: m.panneau, dy: Math.round(m.ch * 0.85) }); await L.calme(p, 300);
      }
      await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = 0; scrollTo(0, 0); }); await L.calme(p, 150);
      fait.push(nom);
    }
    const scene = async (nom, fn) => { if (filtre && !nom.includes(filtre)) return; try { await L.ranger(p); const ok = await fn(p, clic); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + String(e.message).slice(0, 80)); } };
    await scenes(scene, p, clic);
    c.err.forEach(e => erreurs.push(qui + ' : ' + e));
    await L.fin(c);
  }
  const va = h => async p => { await L.aller(p, h); };

  // ── gérant : les écrans corrigés et des écrans « sans défaut » ──
  await passe('marc', async (scene, p, clic) => {
    await scene('r01-plan-jour', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=jour]', 600); });
    await scene('r02-plan-semaine', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=semaine]', 700); });
    await scene('r03-plan-mois', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=mois]', 700); });
    await scene('r04-plan-general', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=general]', 700); });
    await scene('r05-plan-carte', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=carte]', 1500); });
    await scene('r06-plan-creer', async () => { await L.aller(p, 'planning'); return clic('[data-creer]', 700); });
    await scene('r07-taches-auj', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
    await scene('r08-taches-retard', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxfiltre=retard]'); });
    await scene('r09-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
    await scene('r10-taches-faites', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=faites]'); });
    await scene('r11-abs-avalider', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet=valider]', 600); });
    await scene('r12-abs-calendrier', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet=calendrier]', 600); });
    await scene('r13-abs-soldes', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet=soldes]', 600); });
    await scene('r14-abs-nouvelle', async () => { await L.aller(p, 'absences'); return clic('[data-anouv]', 700); });
    await scene('r15-inter-auj', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=auj]'); });
    await scene('r16-inter-toutes', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=tout]'); });
    await scene('r17-inter-fiche-i1', va('inter-x-i1'));
    await scene('r18-inter-fiche-i6', va('inter-x-i6'));
    await scene('r19-accueil', va('accueil'));
    await scene('r20-stats-mois', async () => { await L.aller(p, 'statistiques'); return clic('[data-stper=mois]'); });
    await scene('r21-stats-detail', async () => { await L.aller(p, 'statistiques'); return clic('[data-stdet=fac]', 700); });
    await scene('r22-histo', va('historique'));
    // voisins des règles partagées (jeton --alerte-fond, plancher 44 px des toasts, fiche client)
    await scene('v01-entreprise', va('entreprise'));
    await scene('v02-equipe', va('equipe'));
    await scene('v03-client-fiche', va('client-x-hp'));
    // états vides, puis valeurs longues
    await p.evaluate(vider);
    await scene('z01-vide-inter-tout', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=tout]'); });
    await scene('z02-vide-inter-auj', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=auj]'); });
    await scene('z03-vide-taches', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
    await scene('z04-vide-planning', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=semaine]', 600); });
    await scene('z05-vide-accueil', va('accueil'));
    await p.evaluate(rendreEtat); await L.calme(p, 300);
    await p.evaluate(longues);
    await scene('y01-long-plan-jour', async () => { await L.aller(p, 'planning'); return clic('[data-plvue=jour]', 600); });
    await scene('y02-long-inter-fiche', va('inter-x-i1'));
    await scene('y03-long-inter-auj', async () => { await L.aller(p, 'interventions'); return clic('[data-filtreint=auj]'); });
    await scene('y04-long-taches', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
    await scene('y05-long-stats', va('statistiques'));
    await p.evaluate(rendreEtat);
  });
  // ── autres rôles : les mêmes règles ne doivent rien abîmer chez eux ──
  if (!filtre || filtre.startsWith('o')) for (const qui of ['julie', 'sm', 'kb']) {
    await passe(qui, async (scene, p, clic) => {
      await scene(`o-${qui}-planning`, async () => { await L.aller(p, 'planning'); });
      await scene(`o-${qui}-inter`, async () => { await L.aller(p, 'interventions'); });
      await scene(`o-${qui}-taches`, async () => { await L.aller(p, 'taches'); });
      await scene(`o-${qui}-fiche`, va('inter-x-i1'));
      await p.evaluate(vider);
      await scene(`o-${qui}-vide-inter`, async () => { await L.aller(p, 'interventions'); });
      await scene(`o-${qui}-vide-taches`, async () => { await L.aller(p, 'taches'); });
    });
  }
  console.log(`[${tag}] ${fait.length} scènes prises` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (erreurs.length ? ' · ERREURS : ' + erreurs.slice(0, 6).join(' | ') : ' · aucune erreur JS'));
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify({ fait, manque, erreurs }));
  await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
