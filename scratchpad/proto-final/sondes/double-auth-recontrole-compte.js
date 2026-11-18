// Sonde « double-auth-recontrole-compte » (étape 6, recontrôle adverse) : ce que la correction tout-08 (un seul « ‹ Retour » dans Mon compte) a pu casser à côté.
// Pour chaque profil : Karim (chef d'équipe, téléphone activé) ouvre Mon compte par le VRAI menu, on compte les moyens de fermer, on entre dans « Changer mon mot de passe »
// et on cherche comment REVENIR (un panneau sans retour = une impasse), puis on revient et on relit Mon compte. Population : chaque profil doit avoir rendu la feuille.
// Les captures vont dans le dossier du recontrôle (hors dépôt) et se regardent.
const D = require('./double-auth-commun.js'), S = D, L = D.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth-recontrole/';
const profils = (process.env.PROFILS || 'iphone:1,android:0,petit:1,ipad:0,mac:1,windows:0').split(',').map(x => x.split(':'));
const vis = (c, sel) => c.p.evaluate(s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }).map(e => ({ t:e.textContent.trim().slice(0, 30), h:Math.round(e.getBoundingClientRect().height), top:Math.round(e.getBoundingClientRect().top), cls:e.className })), sel);
(async () => {
  for (const [profil, nuit] of profils) {
    const etiq = profil + (nuit === '1' ? ' nuit' : ' jour');
    const c = await S.ouvrir({ profil, nuit:nuit === '1' }); await S.tous(c);
    const rg = await S.entrer(c, 'kb'); v(etiq + ' : Karim est connecté', rg.ok);
    await c.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="revenir"], #opsec [data-ops="cacher"]'); if (b && b.offsetParent) b.click(); });
    if (!(await c.p.$('[data-cnx="moncompte"] >> visible=true'))) { const m = await c.p.$('button:has-text("Menu"):visible'); if (m) { await m.click(); await c.p.waitForTimeout(500); } }
    const mc = await c.p.$('[data-cnx="moncompte"] >> visible=true'); v(etiq + ' : « Mon compte » est atteignable par le vrai menu', !!mc); if (!mc) { await L.fermer(); continue; }
    await mc.scrollIntoViewIfNeeded(); await mc.click(); await c.p.waitForTimeout(800);
    const retours = await vis(c, '#calque button, #calque a'); const ret = retours.filter(b => /Retour/.test(b.t)), croix = retours.filter(b => /^[✕×x]$|Fermer/.test(b.t));
    v(etiq + ' : Mon compte porte exactement UN « Retour » visible (' + ret.map(b => b.h + 'px').join(',') + ')', ret.length === 1 || (profil === 'ipad' || profil === 'mac' || profil === 'windows') && ret.length <= 1, JSON.stringify(ret));
    if (['iphone', 'android', 'petit'].includes(profil)) v(etiq + ' : ce « Retour » fait 44 px au moins', ret.length === 1 && ret[0].h >= 44, JSON.stringify(ret));
    v(etiq + ' : une façon de fermer existe (Retour ou croix)', ret.length + croix.length >= 1, JSON.stringify(retours.slice(0, 6)));
    await L.capture(c, CAP + 'compte-' + profil + (nuit === '1' ? '-nuit' : '-jour') + '.png');
    // « Changer mon mot de passe » : la porte de sortie du panneau
    await c.p.evaluate(() => { const b = document.querySelector('[data-sec2="mdp"]'); b && b.scrollIntoView({ block:'center' }); });
    await c.p.click('[data-sec2="mdp"]'); await c.p.waitForTimeout(700);
    const pan = await c.p.evaluate(() => { const z = document.querySelector('#calque'); return z ? z.innerText.replace(/\s+/g, ' ').slice(0, 160) : null; });
    v(etiq + ' : le panneau « Changer mon mot de passe » s\'ouvre', /Changer mon mot de passe/.test(pan || ''), pan);
    const r2 = await vis(c, '#calque button, #calque a'); const sortie = r2.filter(b => /Retour|Annuler|Fermer|^[✕×]$/.test(b.t));
    v(etiq + ' : ce panneau a une porte de sortie visible (' + sortie.map(b => b.t + ' ' + b.h + 'px').join(', ') + ')', sortie.length >= 1, JSON.stringify(r2.slice(0, 8)));
    await L.capture(c, CAP + 'mdp-' + profil + (nuit === '1' ? '-nuit' : '-jour') + '.png');
    const retour2 = r2.find(b => /Retour/.test(b.t)); if (retour2) { await c.p.click('#calque >> text=/Retour/ >> visible=true'); await c.p.waitForTimeout(700);
      const ec = await c.p.evaluate(() => (document.querySelector('#calque') || {}).innerText || ''); v(etiq + ' : « Retour » du panneau ramène à Mon compte (pas dans le vide)', /Historique de mes connexions/i.test(ec), ec.slice(0, 80)); }
    await L.fermer();
  }
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('EXC', e.message.slice(0, 700)); process.exit(1); });
