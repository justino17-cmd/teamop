// DOUTE DU RECONTRÔLE DE L'ARTEFACT : « gestion/mac sous pose adverse totale : 8 sur 25 boutons "Commencer au chapitre" du guide jugés non touchables
// (recouverts) ; non rejoué sans la pose, donc non attribuable avec certitude (à rejouer seul) ». (17 novembre 2026, restes, artefact, tour 1)
// On ouvre le prototype comme l'artefact (revue, rôle « Gestion »), le panneau « Apprendre », la liste « Choisir un chapitre », et on TOUCHE chaque
// bouton « ▶ » : il doit être le premier élément sous son centre (une fois amené au milieu de l'écran, deux trames d'attente) ET déclencher
// l'immersion au chapitre voulu. Une fois SANS pose, une fois avec la pose adverse du rangement refusé et de l'historique qui jette.
//   PROFILS=mac,iphone node artefact-chapitres.js
const P = require('./recontrole-artefact-pose.js'), { lib: L, v } = P;
const PROFILS = (process.env.PROFILS || 'mac').split(',');
(async () => {
  for (const profil of PROFILS) for (const [nom, pose] of [['sans pose', {}], ['pose adverse (rangement et historique refusés)', { rangement: 'refuse', historique: 'jette-tout' }]]) {
    const c = await P.ouvrir({ profil, qui: null, app: false, guide: true }, pose);
    await c.p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); try { rlChanger('gestion', { muet: true }); } catch (x) {} });
    await L.calme(c.p, 700);
    const ouvre = await c.p.evaluate(() => { const b = document.querySelector('[data-gd="apprendre"]'); if (b) b.click(); return !!b; });
    await L.calme(c.p, 700);
    await c.p.evaluate(() => { const d = document.querySelector('.imm-liste'); if (d) d.open = true; }); await L.calme(c.p, 500);
    const n = await c.p.evaluate(() => document.querySelectorAll('button[data-imm^="lancer|"][aria-label^="Commencer au chapitre"]').length);
    v(`${profil} (${nom}) : population (le panneau Apprendre s'ouvre : ${ouvre}, ${n} boutons « Commencer au chapitre »)`, ouvre && n >= 10, { ouvre, n });
    const mal = [];
    for (let k = 0; k < n; k++) {
      const r = await c.p.evaluate(async k => { const bs = [...document.querySelectorAll('button[data-imm^="lancer|"][aria-label^="Commencer au chapitre"]')]; const b = bs[k]; if (!b) return { absent: true };
        b.scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; await new Promise(r => setTimeout(r, 120));
        const rc = b.getBoundingClientRect(), x = rc.left + rc.width / 2, y = rc.top + rc.height / 2, el = document.elementFromPoint(x, y);
        const pile = document.elementsFromPoint(x, y).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30) + '#' + e.id).join(' > ');
        return { ok: !!el && (el === b || b.contains(el)), l: b.getAttribute('aria-label').slice(0, 40), taille: [Math.round(rc.width), Math.round(rc.height)], pile }; }, k);
      if (r.absent || !r.ok || r.taille[0] < 40 || r.taille[1] < 40) mal.push({ k, r });
    }
    v(`${profil} (${nom}) : les ${n} boutons « Commencer au chapitre » sont touchables (premier élément sous leur centre, ≥ 40 px)`, n >= 10 && mal.length === 0, mal.slice(0, 3));
    // et un toucher RÉEL lance bien le chapitre voulu (le dernier de la liste : le plus loin, le plus exposé aux barres fixes)
    const dernier = c.p.locator('button[data-imm^="lancer|"][aria-label^="Commencer au chapitre"]').last();
    const cle = await dernier.getAttribute('data-imm').catch(() => null); await dernier.scrollIntoViewIfNeeded().catch(() => {});
    await L.toucher(c, dernier); await L.calme(c.p, 900);
    const e = await c.p.evaluate(() => ({ actif: typeof immActif === 'function' && immActif(), etape: (window.GD && GD.i) !== undefined ? GD.i : null, bulle: !!document.querySelector('.gd-bulle') }));
    v(`${profil} (${nom}) : un toucher sur le dernier bouton (${cle}) lance l'immersion`, e.actif && e.bulle, e);
    v(`${profil} (${nom}) : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
