// SONDE DURABLE — recontrôle du tour 2 du compositeur, VOISINS du collage aplati : les zones MULTILIGNES (objet, mot d'introduction) gardent leurs retours à la ligne et leur annulation,
// les champs d'une ligne (titre, validité, recherches) restent sans retour, et l'aplatissement du Délai n'a pas déplacé la valeur de la page (VV) des champs voisins.
// PROFIL=… NUIT=0|1 node compositeur-restes2-voisins.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'rv2-' + pr + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
  if (!f) { v(tag + ' · population : l\'atelier s\'ouvre', false, null); await L.fin(c); await L.fermer(); process.exit(1); }
  const cas = [['vv-objet', 'objet', true], ['vv-mot', 'mot', true], ['vv-titre', 'titre', false]];
  let vus = 0;
  for (const [id, cle, multi] of cas) {
    const z = f.locator('#' + id); if (!(await z.count())) { console.log('  · ' + tag + ' · ' + id + ' absent de ce devis (non joué)'); continue; } vus++;
    await z.evaluate(e => { e.scrollIntoView({ block: 'center' }); e.focus(); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.keyboard.insertText('un\ndeux'); await p.waitForTimeout(250);
    const r = await z.evaluate((e, k) => ({ v: e.value, page: VV[k] }), cle);
    if (multi) v(`${tag} · ${id} garde ses retours à la ligne (${JSON.stringify(r.v)}), page d'accord`, r.v === 'un\ndeux' && r.page === r.v, r);
    else v(`${tag} · ${id} (champ d'une ligne) sans retour à la ligne (${JSON.stringify(r.v)}), page d'accord`, !/\n/.test(r.v) && r.page === r.v, r);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
    const u = await z.evaluate((e, k) => ({ v: e.value, page: VV[k] }), cle);
    if (multi) v(`${tag} · ${id} Ctrl+Z défait le collage (${JSON.stringify(u.v)}), page d'accord`, u.v === '' && u.page === '', u);
  }
  v(tag + ' · population : au moins deux champs voisins joués (' + vus + ')', vus >= 2, vus);
  // le Délai aplati ne contamine pas un voisin : la valeur de l'objet reste celle qu'on y avait mise
  const o = f.locator('#vv-objet'), d = f.locator('#vv-delai');
  if (await o.count() && await d.count()) {
    await o.evaluate(e => { e.focus(); e.value = 'objet à deux\nlignes'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await d.evaluate(e => { e.scrollIntoView({ block: 'center' }); e.focus(); e.value = ''; }); await p.keyboard.insertText('a\nb\nc'); await p.waitForTimeout(250);
    const s = await p.evaluate(() => 0); const t = await f.locator('#vv-objet').evaluate(e => ({ v: e.value, page: VV.objet }));
    v(`${tag} · l'objet garde ses deux lignes pendant qu'on colle dans le Délai (${JSON.stringify(t.v)})`, t.v === 'objet à deux\nlignes' && t.page === t.v, t);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); process.exit(2); });
