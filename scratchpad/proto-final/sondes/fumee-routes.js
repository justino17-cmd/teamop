// CONTRÔLE DE FUMÉE (chef de chantier, 17 novembre 2026) : chaque rubrique du menu de chaque rôle S'OUVRE, sur ordinateur et
// sur téléphone — un titre, du contenu, aucune erreur JavaScript, aucun glissement latéral. Ce n'est pas un test de la
// rubrique (les sondes de chaque lot le font) : c'est le filet qui dit « rien n'est cassé au point de ne plus s'ouvrir »,
// à jouer avant toute publication de l'artefact, quand des lots encore en chantier sont déjà fusionnés.
//   node scratchpad/proto-final/sondes/fumee-routes.js            # gérant, bureau, technicienne × mac, iphone (jour)
//   QUI=marc PROFILS=mac,android NUIT=1 CAP=/dossier node …       # un sous-ensemble ; CAP = dossier de captures (hors dépôt)
// ⛔ 127.0.0.1 seulement. La population se compte d'abord : un menu vide ferait passer tous les contrôles.
const path = require('path'), L = require('../lib.js'), v = L.v;
const QUI = (process.env.QUI || 'marc,julie,sm').split(','), PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');
const NUIT = process.env.NUIT === '1', CAP = process.env.CAP || '';
(async () => {
  for (const qui of QUI) for (const profil of PROFILS) {
    const c = await L.ouvrir({ profil, qui, nuit: NUIT }), tag = `${qui} ${profil}${NUIT ? ' nuit' : ''}`;
    const lignes = await c.p.evaluate(() => rlLignes().map(l => ({ k: l.k, l: l.l, g: l.g })));
    v(`${tag} : population — le menu a des rubriques (${lignes.length})`, lignes.length >= 4, lignes.map(l => l.k).join(' '));
    for (const li of lignes) {
      const avant = c.err.length;
      await L.aller(c.p, li.k); await L.calme(c.p, 400);
      const e = await c.p.evaluate(() => { const z = document.getElementById('contenu'), cadre = document.querySelector('#cmpt:not([hidden]) iframe, #opdz:not([hidden]) iframe');
        const h1 = (document.querySelector('#contenu h1') || {}).textContent || '';
        return { route, hash: location.hash, h1: h1.trim().slice(0, 60), texte: z ? z.innerText.trim().length : 0, indefini: z ? (z.innerText.match(/undefined|\[object Object\]|NaN(?![a-zà-ÿ])/g) || []).slice(0, 3) : [], plein: !!cadre }; });
      // Une rubrique peut s'ouvrir dans une fenêtre plein écran (la Comptabilité) : son contenu est alors dans un cadre.
      const cadre = e.plein ? L.cadre(c.p) : null;
      const dansCadre = cadre ? await cadre.evaluate(() => document.body.innerText.trim().length).catch(() => 0) : 0;
      v(`${tag} · ${li.l} (#${li.k}) : s'ouvre — un titre ou une fenêtre, du contenu`, (e.h1.length > 1 && e.texte > 40) || dansCadre > 40, e);
      v(`${tag} · ${li.l} : aucun « undefined », « [object Object] » ni « NaN » affiché`, !e.indefini.length, e.indefini);
      v(`${tag} · ${li.l} : aucune erreur JavaScript`, c.err.length === avant, c.err.slice(avant, avant + 2));
      const d = await L.deborde(c);
      v(`${tag} · ${li.l} : la page ne glisse pas de côté`, !d || !(d.bouge > 0), d);
      if (CAP) { await c.p.waitForTimeout(800); await L.capture(c, path.join(CAP, `${qui}-${profil}${NUIT ? '-nuit' : ''}-${li.k}.png`)); }
      if (e.plein) { await L.ranger(c.p); await c.p.evaluate(() => { try { if (typeof cmptFermer === 'function') cmptFermer(); } catch (x) {} }); await L.calme(c.p, 300); }
    }
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a jeté :', e.message); await L.fermer(); process.exit(1); });
