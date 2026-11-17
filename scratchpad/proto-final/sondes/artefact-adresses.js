// L'ADRESSE (règle l du cadre de l'artefact) : seul un « #nom » simple (lettres sans accent, chiffres, tirets) passe entre le lien de l'artefact et la page ;
// settings, sidebar, customize, upgrade, downloads et comment-… sont réservés. On RECENSE (depuis la table des écrans de la page, pas d'une liste écrite
// à la main) chaque route et l'adresse qu'elle écrit, pour chaque rôle, et on exige la forme simple et aucune collision. Contre-épreuve : une adresse
// inconnue ou réservée ne casse rien.
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const RESERVES = ['settings', 'sidebar', 'customize', 'upgrade', 'downloads'];
(async () => {
  for (const qui of ['marc', 'julie', 'sm']) {
    const c = await bac.ouvrir({ profil: 'mac', qui }, {}); await A.calmer(c.p);
    const routes = await c.p.evaluate(() => Object.keys(vues())); v(`${qui} : population (routes de la table des écrans : ${routes.length})`, routes.length > 30, routes.length);
    const mauvaises = routes.filter(r => !/^[a-zA-Z0-9-]+$/.test(r) || RESERVES.includes(r) || /^comment-/.test(r));
    v(`${qui} : aucune route n'a un nom hors forme simple ou réservé`, mauvaises.length === 0, mauvaises);
    // les adresses ÉCRITES quand on visite : menu, barre, une fiche
    const vus = []; const menu = await c.p.evaluate(() => [...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)));
    for (const r of menu) { await L.aller(c.p, r); vus.push(await c.p.evaluate(() => location.hash)); }
    const hors = vus.filter(h => !/^#[a-zA-Z0-9-]+$/.test(h) || RESERVES.includes(h.slice(1)) || /^#comment-/.test(h));
    v(`${qui} : ${vus.length} adresses écrites en visitant le menu, toutes simples`, vus.length >= 3 && hors.length === 0, hors.length ? hors : vus.length);
    // des fiches : le paramètre se joint par « -x- » (lettres, chiffres, tirets)
    if (qui === 'marc') { for (const h of ['client-x-cm', 'devis-x-D1', 'inter-x-i1']) { await c.p.evaluate(x => { location.hash = x; }, h); await L.calme(c.p, 400); const w = await c.p.evaluate(() => location.hash); v(`${qui} : fiche ${h} → adresse ${w}`, /^#[a-zA-Z0-9-]+$/.test(w), w); } }
    // l'ouverture par adresse : une route réservée ou inconnue ne casse rien
    for (const bidon of ['settings', 'comment-123', 'upgrade']) { await c.p.evaluate(x => { location.hash = x; }, bidon); await L.calme(c.p, 400); const e = await c.p.evaluate(() => ({ h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), n: document.getElementById('contenu').innerText.length })); v(`${qui} : #${bidon} : un écran du rôle s'affiche, pas de page vide`, e.n > 100, e); }
    v(`${qui} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
