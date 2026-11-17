// Recontrôle adverse du lot « materiel » — BALAYAGE : ce que les corrections ont pu casser à côté.
// Pour un rôle, un profil et un mode (jour/nuit), visite chaque écran du groupe Matériel et ses feuilles, puis relève :
// erreurs de page, débordement latéral (contre la largeur posée), texte coupé (ellipse, mot coupé), cibles sous 44 px
// (au doigt), textes écrasés — et prend une capture de la fenêtre visible, à REGARDER.
// Usage : node materiel-recontrole-balayage.js <qui> <profil> <0|1 nuit>
const L = require('../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-recontrole/';
(async () => {
  const qui = process.argv[2] || 'marc', profil = process.argv[3] || 'mac', nuit = process.argv[4] === '1';
  const c = await L.ouvrir({ profil, nuit, qui }), p = c.p, v = L.v, R = (f, a) => p.evaluate(f, a);
  const tag = qui + '-' + profil + '-' + (nuit ? 'n' : 'j');
  const tel = !!c.doigt;
  const coupes = () => R(() => { const out = [];
    for (const e of document.querySelectorAll('#contenu *, #calque *')) {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue; if (e.children.length) continue;
      const t = (e.textContent || '').trim(); if (t.length < 3) continue; const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      // coupé par une ellipse ou un overflow caché : le contenu est plus large que la boîte
      if ((cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 1 && cs.display !== 'inline') out.push('ellipse « ' + t.slice(0, 40) + ' » ' + e.clientWidth + '/' + e.scrollWidth);
      // un mot plus large que sa boîte est coupé en pleine lettre (overflow-wrap) : une ligne finit par un bout de mot
      if (cs.display !== 'inline' && e.scrollWidth > e.clientWidth + 1 && cs.overflow === 'visible') out.push('mot trop large « ' + t.slice(0, 40) + ' » ' + e.clientWidth + '/' + e.scrollWidth);
    } return [...new Set(out)].slice(0, 12); });
  const visite = async (nom, ouvrir) => {
    try { await ouvrir(); } catch (e) { v(tag + ' ' + nom + ' : le geste s\'est joué (' + String(e.message).split('\n')[0].slice(0, 80) + ')', false); return; }
    await L.calme(p, 450);
    const d = await L.deborde(c), co = await coupes();
    const h = await R(() => (document.querySelector('#calque .panneau h2, #calque .panneau .surtitre') || document.querySelector('#contenu h1') || {}).textContent || '');
    v(tag + ' ' + nom + ' (« ' + h.trim().slice(0, 40) + ' ») : aucun débordement latéral (' + d.seconde + '/' + d.largeur + ')', d.bouge === 0, d);
    v(tag + ' ' + nom + ' : aucun texte coupé', co.length === 0, co);
    if (tel) { const dg = await L.doigts(p, '#calque .panneau') ; const dc = await L.doigts(p, '#contenu'); const z = (await R(() => !!document.querySelector('#calque .panneau'))) ? dg : dc;
      v(tag + ' ' + nom + ' : cibles au doigt ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', z.petits.length === 0 && z.champs.length === 0 && z.ecrases.length === 0, z); }
    await L.capture(c, CAP + 'bal-' + tag + '-' + nom.replace(/[^a-z0-9]+/gi, '_') + '.png');
  };
  const fermer = async () => { await L.ranger(p); };
  if (qui === 'sm') {
    await visite('majournee', () => L.aller(p, 'majournee'));
    await visite('moncamion', () => L.aller(p, 'moncamion'));
    await visite('manque', async () => { await R(() => document.querySelector('[data-mat="manque"]').click()); });  await fermer();
    await visite('usage', async () => { await R(() => document.querySelector('[data-mat="usage"]').click()); }); await fermer();
    await visite('prise', async () => { await R(() => document.querySelector('[data-mat="prise"]').click()); }); await fermer();
    await visite('fiche-i1', () => L.aller(p, 'inter-x-i1'));
  } else {
    await visite('stock', () => L.aller(p, 'stock'));
    if (qui !== 'kb') {
      await visite('stock-plus', async () => { await R(() => document.querySelector('[data-ms="plus"]').click()); }); await fermer();
      await visite('stock-fiche', async () => { await R(() => prFiche('p3')); }); await fermer();
      await visite('stock-maj', async () => { await R(() => document.querySelector('[data-ms="maj"]').click()); }); await fermer();
      await visite('produits-commandes', async () => { await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); }); });
      await visite('produits-articles', async () => { await R(() => { prVue = 'articles'; rendre(); }); });
      await visite('produits-fournisseurs', async () => { await R(() => { prVue = 'fournisseurs'; rendre(); }); });
      await visite('article-ajout', async () => { await R(() => { const b = document.querySelector('[data-pr^="nouv"], [data-vis="four-ajout-article"], [data-pr="ajout"]'); if (b) b.click(); else if (typeof prNouveau === 'function') prNouveau(); }); });  await fermer();
      if (qui === 'marc') {
        await visite('depots', () => L.aller(p, 'boxes'));
        await visite('depot-atelier', async () => { await R(() => document.querySelector('[data-md="fiche|atelier"]').click()); }); await fermer();
        await visite('achats', () => L.aller(p, 'achats'));
      }
    }
  }
  v(tag + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le balayage s\'est joué jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
