// PLANCHES DE VIGNETTES (chef de chantier, 17 novembre 2026) : REGARDER beaucoup de captures sans les lire une à une.
// Pourquoi : un « regard » prend des centaines de captures (six appareils, jour et nuit) ; les lire une par une avec l'outil
// Read coûte une image par capture — c'est ce qui consomme le plus du forfait de Justin. Une planche en montre huit (téléphone)
// ou six (ordinateur, tablette) d'un coup, assez grandes pour voir ce qui est coupé, écrasé, mal aligné ou illisible ; on
// n'ouvre ensuite en grand que les écrans douteux et ceux qu'on corrige (avant, après).
//   node scratchpad/proto-final/planches.js <dossier de captures> [motif]      # ex. … cap/regard 'nuit'
// Sortie : <dossier>/planches/planche-001.png … et index.txt (quelle capture est sur quelle planche) ; « N capture(s) · M planche(s) ».
// Les captures sont rangées par nom ; les planches d'un autre passage sont remplacées. Aucune dépendance : la taille d'un PNG se
// lit dans son en-tête, et c'est le navigateur de lib.js (une place sur la machine, comme toute sonde) qui assemble.
const fs = require('fs'), path = require('path'), L = require('./lib.js');
const dir = process.argv[2], motif = new RegExp(process.argv[3] || '.');
if (!dir || !fs.existsSync(dir)) { console.log('✗ dossier de captures absent : ' + dir); process.exit(1); }
const taille = f => { const b = Buffer.alloc(24), d = fs.openSync(f, 'r'); fs.readSync(d, b, 0, 24, 0); fs.closeSync(d); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const tous = fs.readdirSync(dir).filter(x => /\.png$/i.test(x) && motif.test(x)).sort().map(x => ({ nom: x, ...taille(path.join(dir, x)) }));
if (!tous.length) { console.log('✗ aucune capture .png pour ce motif dans ' + dir); process.exit(1); }
// Deux familles, jamais mêlées sur une planche : étroites (téléphone : quatre par rangée, presque à taille réelle) et larges
// (ordinateur, tablette : deux par rangée, à demi-taille — assez pour juger une mise en page, pas pour lire un petit texte).
const lots = [];
for (const [etroit, par, larg] of [[true, 8, 330], [false, 6, 690]]) {
  const f = tous.filter(c => (c.w <= 800) === etroit);
  for (let i = 0; i < f.length; i += par) lots.push({ larg, cols: etroit ? 4 : 2, caps: f.slice(i, i + par) });
}
(async () => {
  const sortie = path.join(dir, 'planches'); fs.rmSync(sortie, { recursive: true, force: true }); fs.mkdirSync(sortie, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac' }), p = await c.ctx.newPage(), index = [];
  for (let n = 0; n < lots.length; n++) {
    const lot = lots[n], nom = 'planche-' + String(n + 1).padStart(3, '0') + '.png';
    // Une capture très haute (page entière) est bornée : la vignette montre son haut, le nom dit qu'elle est coupée.
    const cases = lot.caps.map(k => { const haut = Math.round(k.h * lot.larg / k.w), coupe = haut > 760;
      return `<figure><figcaption>${k.nom.replace(/\.png$/i, '')}${coupe ? ' (haut seulement)' : ''}</figcaption><div style="height:${Math.min(haut, 760)}px"><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, k.nom)).toString('base64')}"></div></figure>`; }).join('');
    await p.setViewportSize({ width: lot.cols * (lot.larg + 14) + 14, height: 900 });
    await p.setContent(`<style>body{margin:0;padding:14px 0 0 14px;background:#fff;font:600 13px/1.2 -apple-system,Helvetica,Arial,sans-serif;color:#111}
      .g{display:grid;grid-template-columns:repeat(${lot.cols},${lot.larg}px);gap:14px}figure{margin:0 0 14px}figcaption{height:18px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      figure div{overflow:hidden;outline:1px solid #999}img{display:block;width:${lot.larg}px}</style><div class="g">${cases}</div>`, { waitUntil: 'load' });
    await p.screenshot({ path: path.join(sortie, nom), fullPage: true });
    index.push(nom + ' : ' + lot.caps.map(k => k.nom).join(', '));
  }
  fs.writeFileSync(path.join(sortie, 'index.txt'), index.join('\n') + '\n');
  await L.fin(c); await L.fermer();
  console.log(`${tous.length} capture(s) · ${lots.length} planche(s) dans ${sortie}`);
})().catch(async e => { console.log('✗ planches : ' + e.message); await L.fermer(); process.exit(1); });
