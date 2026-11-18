// RECONTRÔLE du regard « technicien a », volet CALENDRIER de Mes congés (second regard, 18 novembre 2026).
// Le premier passage n'a capturé que le haut de la page : le calendrier vit plus bas. Ici on AMÈNE le calendrier à l'écran
// (période d'une quinzaine, un mois, trois, six) pour la technicienne et le chef d'équipe, puis pour le gérant et le secrétariat
// qui ouvrent le calendrier d'UNE personne (même fabrique, aCalMois, mêmes règles .acm / .acm-etroit).
//   node regard-technicien-a-recontrole-calendrier.js <profil> [nuit]
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-technicien-a-recontrole/';
const args = process.argv.slice(2), profil = args[0] || 'iphone', nuit = args.includes('nuit');
const tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const journal = { tag, mesures: {} };
  for (const qui of ['sm', 'kb', 'marc', 'julie']) {
    const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
    const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 500); return ok; };
    const mesure = () => p.evaluate(() => { const cartes = [...document.querySelectorAll('#contenu .acm')]; let tetes = 0, trop = 0, hors = 0, feries = 0, coupes = 0, bandes = 0, bcoupees = 0;
      cartes.forEach(k => { const kr = k.getBoundingClientRect(); k.querySelectorAll('.acm-tete span').forEach(e => { tetes++; if (e.scrollWidth > e.clientWidth + 1) trop++; if (e.getBoundingClientRect().right > kr.right + 1) hors++; });
        k.querySelectorAll('.acm-f').forEach(e => { feries++; const lh = parseFloat(getComputedStyle(e).lineHeight) || 12; if (e.getBoundingClientRect().height > lh * 1.6 || e.scrollWidth > e.clientWidth + 1) coupes++; });
        k.querySelectorAll('[class*=acm-x], .acm-sem > [data-avoir], .acm-sem .abande').forEach(e => { bandes++; if (e.scrollWidth > e.clientWidth + 1) bcoupees++; }); });
      scrollTo(9999, scrollY); const gl = scrollX; scrollTo(0, scrollY); return { cartes: cartes.length, tetes, trop, hors, feries, coupes, bandes, bcoupees, glisse: gl }; });
    const prendre = async (nom, n) => { const ok = await p.evaluate(() => { const e = document.querySelector('#contenu .acm'); if (!e) return false; const r = e.getBoundingClientRect(); scrollBy(0, r.top - 70); return true; });
      if (!ok) { journal.mesures[`${qui}-${nom}`] = 'aucun calendrier à l’écran'; return; } await L.calme(p, 300);
      journal.mesures[`${qui}-${nom}`] = await mesure();
      for (let i = 0; i < n; i++) { await L.capture(c, `${CAP}${qui}-cal-${nom}-${tag}-s${i}.png`, false); await p.evaluate(() => scrollBy(0, Math.round(innerHeight * 0.8))); await L.calme(p, 250); } await p.evaluate(() => scrollTo(0, 0)); };
    if (['sm', 'kb'].includes(qui)) {
      await L.aller(p, 'absences');
      for (const [per, n] of [['0.5', 2], ['1', 2], ['3', 3], ['6', 2]]) { await L.ranger(p); await L.aller(p, 'absences'); await clic(`[data-aper="${per}"]`, 700); await prendre('p' + per, n); }
    } else {
      await L.aller(p, 'absences'); await clic('[data-aonglet="calendrier"]', 700);
      const ok = await clic('[data-aqui-v]', 800);   // le calendrier d'UNE personne
      if (!ok) journal.mesures[`${qui}-personne`] = 'aucun bouton « voir seul »';
      else { for (const [per, n] of [['0.5', 2], ['1', 2], ['3', 2]]) { await clic(`[data-aper="${per}"]`, 700); await prendre('p' + per, n); } }
    }
    journal.mesures[qui + '-erreurs'] = c.err.slice(0, 3);
    await L.fin(c);
  }
  fs.writeFileSync(`${CAP}journal-cal-${tag}.json`, JSON.stringify(journal));
  console.log(tag, JSON.stringify(journal.mesures).slice(0, 1800)); await L.fermer(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
