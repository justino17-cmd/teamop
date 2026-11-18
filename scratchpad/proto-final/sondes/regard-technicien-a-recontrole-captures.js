// RECONTRÔLE du regard « technicien a » (second regard, 18 novembre 2026) : recapture les écrans que le premier agent dit corrigés
// ET leurs voisins (les autres rôles qui partagent les mêmes règles : .tkx-pill, .a-dem-t, .acm, .t-vide, .eqx-moi-l).
//   node regard-technicien-a-recontrole-captures.js <profil> [nuit]
// Fichiers : <CAP>/<qui>-<scène>-<profil>-<jour|nuit>-s<n>.png ; journal : <CAP>/journal-<profil>-<jour|nuit>.json
// Chaque scène compte aussi ce qu'on peut mesurer (la page glisse de côté ? texte coupé ?) : l'œil juge, la mesure complète.
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-technicien-a-recontrole/';
const args = process.argv.slice(2), profil = args[0] || 'iphone', nuit = args.includes('nuit');
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const MAXDEFIL = parseInt(process.env.MAXDEFIL || '2', 10);
const QUI = (process.env.QUI || 'sm,kb,marc,julie').split(',');

const vider = () => { window.__sauve = JSON.stringify({ INTS, TACHES, ABSENCES }); INTS.length = 0; TACHES.length = 0; ABSENCES.length = 0; };
const rendreEtat = () => { const s = JSON.parse(window.__sauve); for (const k of ['INTS', 'TACHES', 'ABSENCES']) { const a = eval(k); a.length = 0; s[k].forEach(x => a.push(x)); } };

(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const journal = { tag, scenes: {} };
  for (const qui of QUI) {
    const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
    const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
    const fait = [], manque = [], mesures = {};
    async function prendre(nom) {
      const mesure = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const ouvert = pan && (pan.offsetParent !== null || getComputedStyle(pan).display !== 'none');
        const el = ouvert ? pan : document.scrollingElement; return { panneau: !!ouvert, sh: el.scrollHeight, ch: ouvert ? el.clientHeight : innerHeight, st: el.scrollTop }; });
      let m = await mesure();
      // la page glisse-t-elle de côté ? (contre la largeur POSÉE du profil)
      const dep = await p.evaluate(() => { const sw = document.documentElement.scrollWidth; const y = scrollY; scrollTo(9999, y); const b = scrollX; scrollTo(0, y); return { sw, bouge: b }; });
      mesures[nom] = { largeur: c.largeur, sw: dep.sw, bouge: dep.bouge };
      for (let i = 0; i < MAXDEFIL; i++) {
        await L.capture(c, `${CAP}${qui}-${nom}-${tag}-s${i}.png`, false);
        m = await mesure(); if (m.st + m.ch >= m.sh - 4) break;
        await p.evaluate(({ pan, dy }) => { const el = pan ? document.querySelector('#calque .panneau') : document.scrollingElement; el.scrollTop = el.scrollTop + dy; }, { pan: m.panneau, dy: Math.round(m.ch * 0.85) }); await L.calme(p, 350);
      }
      await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = 0; scrollTo(0, 0); }); await L.calme(p, 200);
      fait.push(nom);
    }
    const scene = async (nom, fn) => { try { await L.ranger(p); const ok = await fn(); if (ok === false) { manque.push(nom + ' (geste sans cible)'); return; } await prendre(nom); } catch (e) { manque.push(nom + ' : ' + e.message.split('\n')[0]); } };
    const va = h => async () => { await L.aller(p, h); };

    if (['sm', 'kb'].includes(qui)) {
      await scene('a01-journee', va('majournee'));
      await scene('d01-taches-aujourdhui', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
      await scene('d04-taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); });
      await scene('d07-taches-retard', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tkxfiltre=retard]'); });
      await L.aller(p, 'taches'); await clic('[data-tkxfiltre=retard]');
      await scene('e01-conges', va('absences'));
      await scene('e02-conges-demande', async () => { await L.aller(p, 'absences'); return clic('[data-atdem]', 700); });
      await scene('e03-conges-3mois', async () => { await L.aller(p, 'absences'); return clic('[data-aper="3"]', 700); });
      await scene('e06-conges-6mois', async () => { await L.aller(p, 'absences'); return clic('[data-aper="6"]', 700); });
      await clic('[data-aper="0.5"]');
      // vides : journée, Faites, congés
      await p.evaluate(vider);
      await scene('z01-vide-journee', va('majournee'));
      await scene('z02-vide-faites', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=faites]'); });
      await scene('z03-vide-auj', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
      await scene('z04-vide-conges', va('absences'));
      await p.evaluate(rendreEtat); await L.calme(p, 300);
    }
    if (qui === 'marc') {
      await scene('g01-absences-valider', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet="valider"]'); });
      await scene('g02-absences-calendrier', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet="calendrier"]', 700); });
      await scene('g03-absences-soldes', async () => { await L.aller(p, 'absences'); return clic('[data-aonglet="soldes"]', 700); });
      await scene('g04-taches', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
      await scene('g05-taches-faites', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=faites]'); });
      await scene('g06-journee', va('majournee'));
    }
    if (qui === 'julie') {
      await scene('j01-taches', async () => { await L.aller(p, 'taches'); return clic('[data-tonglet=auj]'); });
      await scene('j02-absences', va('absences'));
      await scene('j03-journee', va('majournee'));
    }
    journal.scenes[qui] = { fait, manque, mesures, err: c.err.slice(0, 5) };
    console.log(`[${qui} ${tag}] ${fait.length} scènes` + (manque.length ? ' · non prises : ' + manque.join(' ; ') : '') + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 3).join(' | ') : ' · aucune erreur JS'));
    await L.fin(c);
  }
  fs.writeFileSync(`${CAP}journal-${tag}.json`, JSON.stringify(journal));
  await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
