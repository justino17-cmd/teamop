// RECONTRÔLE ADVERSE du tour 5 bis — N3 : la POPULATION des signes qui ne s'écrivent pas, énumérée par le navigateur (pas par une liste écrite à la main).
// Chaque point de code assigné est dessiné sur un canevas (police du prototype) : sans aucun pixel, il est invisible. On compte ceux que INVISIBLES ne reconnaît pas.
// ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v, fs = require('fs');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  const R = await p.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.font = '32px sans-serif'; cx.textBaseline = 'top';
    const vide = ch => { cx.clearRect(0, 0, 64, 64); cx.fillStyle = '#000'; cx.fillText('x' + ch + 'x', 4, 8); const A = cx.getImageData(0, 0, 64, 64).data; const B0 = (() => { cx.clearRect(0, 0, 64, 64); cx.fillText('xx', 4, 8); return cx.getImageData(0, 0, 64, 64).data; })(); for (let i = 3; i < A.length; i += 4) if (A[i] !== B0[i]) return false; return true; };
    const fffc = () => accesLignes('Code 4821\n\ufffc\nSonner\n\ufffc\ufffc').length;
    const ligne = ch => accesLignes('Code 4821\n' + ch + '\nSonner\n' + ch + ch).length;
    const blancs = [], vus = [], nonCouverts = []; let n = 0;
    for (let cp = 0x20; cp <= 0x10ffff; cp++) { if (cp >= 0xd800 && cp <= 0xdfff) continue; const ch = String.fromCodePoint(cp); if (/[\p{Cn}\p{Co}\p{Cc}]/u.test(ch) && cp > 0x9f) continue; if (cp >= 0x20 && cp < 0x7f) continue; n++;
      if (/\p{M}/u.test(ch) && !/\p{Cf}/u.test(ch)) continue;   // un signe combinant seul se voit (cercle pointillé)
      if (vide(ch)) { blancs.push(cp); if (ligne(ch) !== 2 && cp !== 0xfffc) nonCouverts.push(cp); } }
    return { fffc: fffc(), n, blancs: blancs.length, nonCouverts: nonCouverts.length, ex: nonCouverts.slice(0, 40).map(x => 'U+' + x.toString(16).toUpperCase()) };
  });
  v('N3 population : points de code assignés dessinés', R.n > 100000, R.n);
  v('N3 population : points de code sans aucun pixel dans la police du navigateur', R.blancs > 20, R.blancs);
  v('N3 aucun point de code SANS ENCRE ne compte comme ligne d’accès (« 3 lignes au plus » ne se contourne pas par une ligne invisible)', R.nonCouverts === 0, { nonCouverts: R.nonCouverts, ex: R.ex });
  console.log('  · doute : U+FFFC (caractère de remplacement d’objet) est blanc dans la police de ce conteneur, mais un « boîte » sur Mac/Windows : lignes comptées = ' + R.fffc + ' (4 = compté comme ligne, 2 = ignoré)');
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });
