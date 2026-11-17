// Recontrôle adverse des restes du technicien, tour 1 : d'où vient le débordement de 437 px sur iPad quand un message du bureau porte un mot de 90 signes sans espace ?
// (coupable nommé : la sonde du recontrôle le rendait vide). Usage : node restes-technicien-recontrole-mot.js [profil] [mot=90|0]
const L = require('../../lib.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'ipad', long = process.argv[3] !== '0';
  const c = await L.ouvrir({ profil, qui: 'sm', hash: 'majournee' }), p = c.p; await L.calme(p, 600);
  await p.evaluate(l => { const k = rlQui(); NOTIFS.push({ k, txt: 'Voir ' + (l ? 'https://exemple.fr/une/adresse/tres/longue/sans/aucune/espace/ni/tiret/qui/ne/se/coupe/pas/du/tout/jamais/ABCDEFGH' : 'le chantier'), d: AUJ, h: '10:00' }); rendre(); }, long); await L.calme(p, 500);
  const r = await p.evaluate(() => { const W = innerWidth, c = [...document.querySelectorAll('#contenu *')].filter(e => e.getBoundingClientRect().right > W + 1).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right) + ' | ' + getComputedStyle(e).overflowWrap + ' | ' + (e.textContent || '').slice(0, 40)); return { W, sw: document.documentElement.scrollWidth, c }; });
  console.log(JSON.stringify(r, null, 1));
  v(`[${profil}] population : le message est dans la page`, await p.evaluate(() => /Voir /.test(document.getElementById('mj-messages').textContent)));
  v(`[${profil}] mot ${long ? 'très long' : 'court'} : la page ne glisse pas de côté`, r.sw <= r.W + 1, r);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
