// Dernière retouche du 18/11 : AUCUN exemple des trois tables (MET_EXEMPLES, MET_EX_FAM, MET_EX_CLIM) ne dépasse son champ à 320 px.
// Mesure : largeur du texte (police et taille CALCULÉES d'un vrai champ de saisie du prototype) contre la plus petite place d'indication
// relevée à 320 px (238 px : le champ de « Enregistrer la vue »). Une table vide ou introuvable est un ✗ (population comptée avant).
// Usage : node metier-3d-exemples-320.js     Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
const SRC = require('fs').readFileSync(require('path').join(__dirname, '../../../../apercu/prototype-op-gestion.html'), 'utf8');
// un champ de plusieurs lignes (textarea) coupe l'indication à la ligne : il n'est pas mesuré à la largeur d'une ligne ; tout le reste (input, ou clé introuvable) l'est
const champMulti = cle => { for (let i = SRC.indexOf(cle); i >= 0; i = SRC.indexOf(cle, i + 1)) { const a = SRC.lastIndexOf('<', i), seg = SRC.slice(a, i); if (/^<textarea/i.test(seg) && seg.includes('placeholder')) return true; if (/^<input/i.test(seg) && seg.includes('placeholder')) return false; } return false; };
const PLACE = 238; let ok = 0, ko = 0; const v = (n, c, d) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };
(async () => {
  const c = await O.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', packs: O.METIERS.d3 }), p = c.p;
  await L.aller(p, 'clients'); await L.calme(p, 400);
  const r = await p.evaluate(() => {
    const e = [...document.querySelectorAll('input[placeholder]')].find(x => x.offsetParent) || document.querySelector('input'); const cs = getComputedStyle(e || document.body);
    const ctx = document.createElement('canvas').getContext('2d'); ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const tables = { MET_EXEMPLES: typeof MET_EXEMPLES !== 'undefined' ? MET_EXEMPLES : null, MET_EX_CLIM: typeof MET_EX_CLIM !== 'undefined' ? MET_EX_CLIM : null };
    const fam = typeof MET_EX_FAM !== 'undefined' ? MET_EX_FAM : null; if (fam) for (const k of Object.keys(fam)) tables['MET_EX_FAM.' + k] = fam[k];
    const sortie = []; for (const [n, t] of Object.entries(tables)) { if (!t) { sortie.push({ n, absent: true }); continue; } for (const [cle, val] of Object.entries(t)) if (/^ex\./i.test(val)) sortie.push({ n, cle, val, w: Math.round(ctx.measureText(val).width) }); }
    return { font: ctx.font, sortie };
  });
  console.log('police mesurée : ' + r.font);
  const vals = r.sortie.filter(x => !x.absent), multi = vals.filter(x => champMulti(x.cle)); vals.forEach(x => { x.multi = champMulti(x.cle); }); v('population : les trois tables sont trouvées', r.sortie.every(x => !x.absent), r.sortie.filter(x => x.absent).map(x => x.n).join(', '));
  v('population : plus de 40 exemples mesurés', vals.length > 40, String(vals.length));
  v('population : des champs de plusieurs lignes sont reconnus (et exemptés)', multi.length > 3, String(multi.length));
  for (const x of vals.filter(x => !x.multi)) v(x.n + ' « ' + x.val + ' » tient (' + x.w + '/' + PLACE + ')', x.w <= PLACE, x.cle);
  await c.fermer?.(); process.exit(O.bilan('exemples à 320 px', ok, ko, [vals.length + ' exemples, dont ' + multi.length + ' en champ multiligne exemptés']));
})().catch(e => { console.log('ERREUR ' + e.message); process.exit(2); });
