// Sonde « montage » : la rubrique Boîte mail s'ouvre sur six profils d'appareils, jour ET nuit, sans erreur JavaScript, l'hôte tient dans la largeur POSÉE du profil
// (jamais innerWidth : une page qui s'élargit l'emporte avec elle), et il n'y a qu'UN module monté. Captures dans cap/mail/, à REGARDER.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
(async () => {
  let n = 0;
  for (const profil of ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit']) for (const nuit of [false, true]) {
    const c = await entrer({ profil, nuit }), p = c.p, nom = profil + (nuit ? ' nuit' : ' jour'); n++;
    const e = await p.evaluate(() => { const h = document.getElementById('courrier-hote'), r = h.getBoundingClientRect(), R = window.R();
      return { montes:document.querySelectorAll('[data-opcourrier]').length, lignes:R ? R.querySelectorAll('.msg').length : 0, w:Math.round(r.width), h:Math.round(r.height), g:Math.round(r.left), d:Math.round(r.right), b:Math.round(r.bottom), ih:innerHeight,
        theme:getComputedStyle(R.querySelector('.opc')).colorScheme, mode:document.documentElement.dataset.mode, fmt:R.querySelector('.opc').getAttribute('data-fmt') }; });
    v(nom + ' : un seul module monté, avec des messages', e.montes === 1 && e.lignes >= 5, e);
    v(nom + ' : l\'hôte tient dans la largeur posée du profil', e.g >= 0 && e.d <= c.largeur + 1, e);
    v(nom + ' : l\'hôte a une hauteur utile (≥ 360 px) et ne sort pas de l\'écran par le bas', e.h >= 360 && e.b <= e.ih + 1, e);
    v(nom + ' : le thème du module suit le Jour / Nuit du prototype', e.theme === (nuit ? 'dark' : 'light') && e.mode === (nuit ? 'nuit' : 'jour'), e);
    const d = await lib.deborde(c); v(nom + ' : la page ne glisse pas de côté', d.bouge === 0, d);
    v(nom + ' : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await cap(c, 'montage-' + profil + (nuit ? '-nuit' : '-jour')); await fin(c);
  }
  v('population : 14 ouvertures jouées', n === 14, n);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message); process.exit(1); });
