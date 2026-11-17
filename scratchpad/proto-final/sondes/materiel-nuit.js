// Matériel, étape 5 (lot 6) — JOUR ET NUIT, MESURÉS AU PIXEL (spec § 2.3 et § 13) : chaque pastille d'état (orange, rouge, bleu, verte, grise) posée sur sa carte atteint 4,5:1 (le texte contre son fond, lus
// sur la capture de l'élément — jamais recalculés), et les cartes se détachent du fond de la page (le filet ou l'ombre : les tuiles de lieux s'y fondaient). Population comptée d'abord : une classe qu'aucune
// pastille ne porte à l'écran est dite, pas passée au vert. Usage : node materiel-nuit.js [profil…] → « N ✓ · M ✗ »   (défaut : mac iphone)
const L = require('../lib.js'), PNG = require('../../png.js');
const profils = process.argv.slice(2).length ? process.argv.slice(2) : ['mac', 'iphone'];
const contraste = async (loc) => { const buf = await loc.screenshot(), img = PNG.decoder(buf), n = img.w * img.h, freq = new Map();
  for (let i = 0; i < n; i++) { const k = (img.data[i * 4] << 16) | (img.data[i * 4 + 1] << 8) | img.data[i * 4 + 2]; freq.set(k, (freq.get(k) || 0) + 1); }
  const fond = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0], F = [fond >> 16, (fond >> 8) & 255, fond & 255]; let pire = 1;
  for (let i = 0; i < n; i++) { const p = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]], r = PNG.contraste(F, p); if (r > pire) pire = r; }
  return pire; };
(async () => {
  for (const profil of profils) for (const nuit of [false, true]) {
    const tag = profil + (nuit ? ' · nuit' : ' · jour'), c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, v = L.v, R = (f, a) => p.evaluate(f, a);
    // les classes de pastille à trouver, avec l'écran et le sélecteur où on les cherche
    const ecrans = [
      ['stock', () => R(() => { stkOnglet = 'ensemble'; rendre(); }), [['st-o', '.ms-l .st-o'], ['st-r', '.ms-l .st-r'], ['st-b', '.ms-l .st-b']]],
      ['boxes', () => Promise.resolve(), [['st-o', '.md-c .st-o'], ['st-g', '.md-c .st-g, .md-c .st-b']]],
      ['inter-x-i2', async () => { await R(() => { const x = PRODUITS.find(o => !o.retire && !(o.seuil > 0) && enCommande(o) === 0); window.__x = x.id; window.__q = x.q; x.q = 0; x.loc = {}; INTS.find(o => o.id === 'i2').prevues.push({ nom:x.nom, q:2, pid:x.id }); rendre(); }); }, [['st-v', '.pp-e .st-v'], ['st-o', '.pp-e .st-o']]],
      ['accueil', () => Promise.resolve(), [['carte', '[data-vis="accueil-materiel"]']]],
    ];
    for (const [route, avant, sels] of ecrans) {
      await L.aller(p, route); await avant(); await L.calme(p, 500);
      for (const [cls, sel] of sels) {
        const n = await R(s => document.querySelectorAll(s).length, sel);
        if (cls === 'carte') { // la carte se détache du fond : trois pixels en travers de son bord gauche
          const r = await R(s => { const e = document.querySelector(s); e.scrollIntoView({ block:'center' }); const b = e.getBoundingClientRect(); return { x:b.left, y:b.top + b.height / 2 }; }, sel); await L.calme(p, 250);
          const r2 = await R(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x:b.left, y:b.top + b.height / 2 }; }, sel);
          const buf = await p.screenshot({ clip:{ x:Math.max(0, r2.x - 14), y:r2.y, width:28, height:2 } }), img = PNG.decoder(buf), at = x => PNG.px(img, x, 0), dehors = at(2), bord = at(13), dedans = at(24);
          const rr = Math.max(PNG.contraste(dehors, dedans), PNG.contraste(bord, dedans), PNG.contraste(bord, dehors));
          v(tag + ' · ' + route + ' : la carte se détache du fond de la page (' + rr + ':1 entre le dehors, le filet et le dedans)', n >= 1 && rr >= 1.08, { n, dehors, bord, dedans });
          continue; }
        if (n === 0) { v(tag + ' · ' + route + ' : population de pastilles ' + cls + ' (' + sel + ')', false, 'aucune pastille de cette classe à l\'écran : on ne peut pas mesurer ce qu\'on ne voit pas'); continue; }
        let pire = 99, qui = ''; for (let k = 0; k < Math.min(n, 3); k++) { const loc = p.locator(sel).nth(k); await loc.scrollIntoViewIfNeeded(); await L.calme(p, 120); const r = await contraste(loc); if (r < pire) { pire = r; qui = (await loc.textContent()).trim(); } }
        v(tag + ' · ' + route + ' : pastille ' + cls + ' lisible au pixel (' + pire + ':1, « ' + qui + ' », ' + Math.min(n, 3) + ' mesurées sur ' + n + ')', pire >= 4.5, { pire, qui });
      }
      if (route === 'inter-x-i2') await R(() => { const x = PRODUITS.find(o => o.id === window.__x); x.q = window.__q; INTS.find(o => o.id === 'i2').prevues.pop(); rendre(); });
    }
    v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
