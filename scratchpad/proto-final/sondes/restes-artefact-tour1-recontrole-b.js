// RECONTRÔLE ADVERSE des restes « artefact », tour 1 — partie B (17 novembre 2026). Ne modifie aucune page.
// La fiche du correcteur dit : le bouton « Voir comme l'application » n'existe « jamais en mode application ni pendant la visite parlée ».
// On joue la visite parlée (panneau « Apprendre » → « Commencer au chapitre ») en mode REVUE et on regarde si le bouton est encore atteignable :
// un toucher dessus au milieu de la visite RECHARGERAIT la page et ferait perdre la visite sans un mot.
// Population d'abord (la visite est bien lancée) ; 127.0.0.1 seulement.   PROFILS=mac,iphone
const P = require('./recontrole-artefact-pose.js'), { lib: L, v } = P;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
(async () => {
  for (const profil of PROFILS) {
    const c = await P.ouvrir({ profil, qui: null, app: false, guide: true }, {});
    await c.p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); try { rlChanger('gestion', { muet: true }); } catch (x) {} });
    await L.calme(c.p, 700);
    const av = await c.p.evaluate(() => { const b = document.querySelector('.rl-bande [data-apv]'); return !!b && b.getBoundingClientRect().width > 4; });
    v(`${profil} : population (revue, le bouton est là avant la visite)`, av);
    await c.p.evaluate(() => { const b = document.querySelector('[data-gd="apprendre"]'); if (b) b.click(); }); await L.calme(c.p, 700);
    await c.p.evaluate(() => { const d = document.querySelector('.imm-liste'); if (d) d.open = true; }); await L.calme(c.p, 500);
    const prem = c.p.locator('button[data-imm^="lancer|"][aria-label^="Commencer au chapitre"]').first(); await prem.scrollIntoViewIfNeeded().catch(() => {});
    await L.toucher(c, prem); await L.calme(c.p, 1200);
    const e = await c.p.evaluate(() => { const b = document.querySelector('.rl-bande [data-apv]'); let tx = null, recouvert = null;
      if (b && b.getBoundingClientRect().width > 4) { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), p = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); recouvert = !(p && (p === b || b.contains(p))); tx = p ? (p.tagName + '.' + String(p.className).slice(0, 30)) : null; }
      return { actif: typeof immActif === 'function' && immActif(), bulle: !!document.querySelector('.gd-bulle'), bandeVisible: !!document.querySelector('.rl-bande') && document.querySelector('.rl-bande').getBoundingClientRect().width > 4, boutonPresent: !!b, boutonVisible: !!b && b.getBoundingClientRect().width > 4, recouvert, sous: tx,
        inerte: !!(b && b.closest('[inert]')) }; });
    v(`${profil} : population (la visite parlée est lancée : immersion ${e.actif}, bulle ${e.bulle})`, e.actif && e.bulle, e);
    // le contrat annoncé : pas de bouton qui recharge pendant la visite — absent, caché, recouvert ou inerte
    v(`${profil} : pendant la visite parlée le bouton « Voir comme l'application » n'est pas atteignable (absent, caché, recouvert ou inerte)`, !e.boutonVisible || e.recouvert || e.inerte, e);
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
