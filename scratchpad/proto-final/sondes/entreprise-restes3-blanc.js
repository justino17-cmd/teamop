// RESTES ENTREPRISE, TOUR 3 — Boîte mail en « Voir seul » : plus de blanc de ~26 px entre le suivi (ou le bandeau) et la rangée « Catégorie ». La rangée « Réponse rapide » n'a plus un seul bouton à offrir
// (ils lisent « Modifier ») : elle gardait sa marge de 26 px et ses deux écarts de flex (à la hauteur de 0), et au bureau son libellé restait seul. On mesure sur chaque message : aucune rangée
// de hauteur 0 n'est affichée dans la lecture ; contre-épreuve : avec « Modifier », la rangée « Réponse rapide » est là, avec ses boutons.
// Usage : timeout 580 node …/entreprise-restes3-blanc.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes3-blanc/';
const cases = (com) => ({ planif:'1000', inter:'1000', crm:'1000', ventes:'1000', compta:'1000', stock:'1000', temps:'1000', com, achats:'1000', admin:'1000' });
const RELEVE = async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; const out = [];
  for (const m of [...o.querySelectorAll('.msg[data-id]')]) { m.click(); await new Promise(z => setTimeout(z, 220)); const body = o.querySelector('.rcat') ? o.querySelector('.rcat').parentElement : null; if (!body) continue;
    const kids = [...body.children].map(k => { const q = k.getBoundingClientRect(), cs = getComputedStyle(k); return { cl:k.className.toString().slice(0, 30), h:q.height, top:q.top, bas:q.bottom, disp:cs.display }; }).filter(k => k.disp !== 'none');
    const rq = body.querySelector('.rquick'); const rc = kids.find(k => /^rcat( |$)/.test(k.cl) && !/rsuivi/.test(k.cl)), av = kids.filter(k => rc && k.bas <= rc.top + 1 && k.h > 0).sort((a, b) => b.bas - a.bas)[0];
    out.push({ id:m.getAttribute('data-id'), vides:kids.filter(k => k.h < 1).map(k => k.cl), quick:rq ? { disp:getComputedStyle(rq).display, boutons:rq.querySelectorAll('button').length } : null, ecart:rc && av ? Math.round(rc.top - av.bas) : null }); }
  return out; };
(async () => {
  for (const [appareil, nuit] of [['iphone', false], ['petit', true], ['android', false], ['ipad', true], ['mac', false], ['mac720', true]]) {
    for (const [com, nom] of [['1000', 'Voir seul'], ['1010', 'Voir + Modifier']]) {
      const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); const p = c.p;
      await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases(com) }); await L.calme(p, 500);
      await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
      const r = await p.evaluate(RELEVE); const N = `${appareil}${nuit ? ' nuit' : ''} ${nom}`;
      v(`${N} : population (${r.length} messages lus, ${r.filter(x => x.ecart != null).length} avec un écart mesuré)`, r.length >= 8 && r.filter(x => x.ecart != null).length >= 5, r.map(x => x.id + ':' + x.ecart).join(' '));
      if (com === '1000') {
        v(`${N} : aucune rangée de hauteur 0 n'est affichée (la rangée « Réponse rapide » est retirée entière)`, r.every(x => x.vides.length === 0), r.filter(x => x.vides.length).map(x => x.id + ' ' + x.vides));
        v(`${N} : l'écart avant « Catégorie » ne dépasse pas l'écart ordinaire (≤ 24 px)`, r.every(x => x.ecart == null || x.ecart <= 24), r.filter(x => x.ecart > 24).map(x => x.id + ':' + x.ecart));
        if (appareil === 'iphone' || appareil === 'mac') { await p.evaluate(async () => { const o = [...document.querySelectorAll('*')].find(e => e.shadowRoot).shadowRoot; for (const m of o.querySelectorAll('.msg[data-id]')) { m.click(); await new Promise(z => setTimeout(z, 200)); if (o.querySelector('.rsuivi')) break; } const b = o.querySelector('.rsuivi'); if (b) b.scrollIntoView({ block:'center' }); });
          await L.calme(p, 400); await L.capture(c, CAP + `blanc-${appareil}.png`, false); }
      } else v(`${N} : la rangée « Réponse rapide » est là, avec ses boutons (contre-épreuve)`, r.some(x => x.quick && x.quick.disp !== 'none' && x.quick.boutons >= 1), r.map(x => x.quick && x.quick.disp + '/' + x.quick.boutons).join(' '));
      await L.fin(c);
    }
  }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
